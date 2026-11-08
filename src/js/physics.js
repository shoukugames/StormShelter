// StormShelter - physics simulation (planck.js / Box2D) and storm model
// Copyright (C) 2026 Shawn Rapaz. Licensed under the GNU GPL v3.0.
(function (G) {
  const SS = G.SS;
  const pl = G.planck || (typeof require !== 'undefined' ? require('planck') : null);
  const V = (x, y) => new pl.Vec2(x, y);
  const DT = 1 / 60;

  let nextId = 1;

  class Sim {
    // level: { kids:[{x}], rocks:[{x,w,h}], q, dir, lift, flip, gust, rain }
    // opts: { difficulty }
    constructor(level, opts = {}) {
      this.level = level;
      this.diff = SS.DIFFICULTY[opts.difficulty || 'medium'];
      this.world = new pl.World({ gravity: V(0, -10) });
      this.pieces = [];
      this.kids = [];
      this.rocks = [];
      this.joints = [];
      this.events = [];          // sound/particle events for the renderer: {type, x, y, ...}
      this.phase = 'build';
      this.t = 0;
      this.stormT = 0;

      const g = this.world.createBody({ type: 'static', position: V(0, 0) });
      g.createFixture(new pl.Box(60, 2, V(12.8, -2), 0), { friction: 0.9 });
      g.setUserData({ kind: 'ground' });
      this.ground = g;

      for (const r of level.rocks || []) {
        const b = this.world.createBody({ type: 'static', position: V(r.x, r.h / 2) });
        b.createFixture(new pl.Box(r.w / 2, r.h / 2), { friction: 0.9 });
        b.setUserData({ kind: 'rock', rock: r });
        this.rocks.push({ ...r, body: b });
      }
      level.kids.forEach((k, i) => {
        const K = SS.KID;
        const b = this.world.createBody({ type: 'static', position: V(k.x, K.h / 2 + 0.002), fixedRotation: true });
        b.createFixture(new pl.Box(K.w / 2, K.h / 2), { density: K.density, friction: K.friction });
        const kid = { i, look: k.look != null ? k.look : i, x0: k.x, body: b, windExp: 0, rainExp: 0,
          blown: false, wet: false, exposedNow: 0, uncoveredNow: 0, shelteredStart: 1, coveredStart: true };
        b.setUserData({ kind: 'kid', kid });
        this.kids.push(kid);
      });
    }

    // ---------- building ----------
    makeShape(type, inset = 0) {
      const P = SS.PIECES[type];
      const verts = P.verts.map(([x, y]) => {
        if (!inset) return V(x, y);
        const len = Math.hypot(x, y) || 1;
        return V(x - (x / len) * inset, y - (y / len) * inset);
      });
      return new pl.Polygon(verts);
    }

    addPiece(type, mat, x, y, angle = 0, extra = {}) {
      const M = SS.MATERIALS[mat];
      const b = this.world.createBody({ type: 'dynamic', position: V(x, y), angle, angularDamping: 0.15, linearDamping: 0.02 });
      b.createFixture(this.makeShape(type), { density: M.density, friction: M.friction, restitution: 0.02 });
      const piece = { id: extra.id || nextId++, type, mat, body: b, broken: false };
      b.setUserData({ kind: 'piece', piece });
      this.pieces.push(piece);
      return piece;
    }

    removePiece(piece) {
      const i = this.pieces.indexOf(piece);
      if (i >= 0) this.pieces.splice(i, 1);
      this.world.destroyBody(piece.body);
    }

    lowestY(type, angle) {
      const c = Math.cos(angle), s = Math.sin(angle);
      let m = Infinity;
      for (const [x, y] of SS.PIECES[type].verts) m = Math.min(m, x * s + y * c);
      return m;
    }

    overlaps(type, x, y, angle, ignore) {
      const shape = this.makeShape(type, 0.03);
      const xf = new pl.Transform(V(x, y), angle);
      for (let b = this.world.getBodyList(); b; b = b.getNext()) {
        if (b === ignore || b === this.ground) continue;
        for (let f = b.getFixtureList(); f; f = f.getNext()) {
          if (pl.testOverlap(shape, 0, f.getShape(), 0, xf, b.getTransform())) return true;
        }
      }
      return false;
    }

    // Find the nearest free spot at or above (x, y) for a piece.
    findFreeSpot(type, x, y, angle) {
      const P = SS.PIECES[type];
      const half = Math.max(P.w, P.h) / 2;
      x = Math.max(SS.BUILD_MIN_X + half * 0.5, Math.min(SS.BUILD_MAX_X - half * 0.5, x));
      const minY = -this.lowestY(type, angle) + 0.004;
      y = Math.max(minY, Math.min(SS.BUILD_MAX_Y, y));
      for (let k = 0; k < 240; k++) {
        if (!this.overlaps(type, x, y, angle)) return { x, y };
        y += 0.05;
      }
      return null;
    }

    pieceAt(x, y) {
      let found = null;
      const p = V(x, y);
      this.world.queryAABB(new pl.AABB(V(x - 0.01, y - 0.01), V(x + 0.01, y + 0.01)), (f) => {
        const ud = f.getBody().getUserData();
        if (ud && ud.kind === 'piece' && f.testPoint(p)) { found = ud.piece; return false; }
        return true;
      });
      return found;
    }

    stepBuild(dt = DT) {
      this.world.step(dt, 8, 4);
      this.t += dt;
      // pieces knocked off-screen are lost
      for (const p of this.pieces.slice()) {
        const pos = p.body.getPosition();
        if (pos.y < -3 || pos.x < -4 || pos.x > SS.WORLD_W + 4) { this.removePiece(p); this.events.push({ type: 'lost', piece: p }); }
      }
    }

    // ---------- storm ----------
    startStorm() {
      // let freshly placed pieces settle into contact so they can be glued
      for (let i = 0; i < 30; i++) this.world.step(DT, 8, 4);
      this.phase = 'storm';
      this.stormT = 0;
      // record starting state
      for (const p of this.pieces) {
        p.x0 = p.body.getPosition().x; p.y0 = p.body.getPosition().y; p.a0 = p.body.getAngle();
        p.body.setAwake(true);
      }
      // glue everything that touches
      const seen = new Set();
      for (let c = this.world.getContactList(); c; c = c.getNext()) {
        if (!c.isTouching()) continue;
        const bA = c.getFixtureA().getBody(), bB = c.getFixtureB().getBody();
        const uA = bA.getUserData(), uB = bB.getUserData();
        if (!uA || !uB) continue;
        if (uA.kind === 'kid' || uB.kind === 'kid') continue;
        if (uA.kind !== 'piece' && uB.kind !== 'piece') continue;
        const key = bA === bB ? null : [Math.min(idOf(uA), idOf(uB)), Math.max(idOf(uA), idOf(uB))].join(':');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const wm = c.getWorldManifold(null);
        const n = c.getManifold().pointCount;
        if (!wm || !n) continue;
        let ax = 0, ay = 0;
        for (let i = 0; i < n; i++) { ax += wm.points[i].x; ay += wm.points[i].y; }
        ax /= n; ay /= n;
        const gA = uA.kind === 'piece' ? SS.MATERIALS[uA.piece.mat].glue : Infinity;
        const gB = uB.kind === 'piece' ? SS.MATERIALS[uB.piece.mat].glue : Infinity;
        const strength = Math.min(gA, gB) * this.diff.glue * (n >= 2 ? 1 : 0.6);
        const j = this.world.createJoint(new pl.WeldJoint({ frequencyHz: 0, dampingRatio: 0 }, bA, bB, V(ax, ay)));
        this.joints.push({ joint: j, strength, x: ax, y: ay, bA, bB, mats: [uA.piece && uA.piece.mat, uB.piece && uB.piece.mat], broken: false, load: 0 });
      }
      // kids become real bodies that can be pushed around
      for (const k of this.kids) {
        k.body.setType('dynamic');
        k.body.setFixedRotation(true);
        k.body.resetMassData();
        k.body.setAwake(true);
      }
      // what was the shelter like at the start? (for the parents' report)
      this.windDir = this.dirAt(0);
      for (const k of this.kids) {
        k.shelteredStart = 1 - this.kidWindExposure(k, this.windDir).fraction;
        k.coveredStart = this.kidRainExposure(k, this.windDir) < 0.34;
      }
      this.startedWithPieces = this.pieces.length;
    }

    dirAt(t) {
      const L = this.level;
      if (L.flip) return (Math.floor(t / L.flip) % 2 === 0 ? 1 : -1) * L.dir;
      return L.dir;
    }

    qAt(t) {
      const L = this.level;
      const ramp = Math.min(1, t / SS.RAMP_TIME);
      const e = ramp * ramp * (3 - 2 * ramp);
      const gust = 1 + L.gust * (0.6 * Math.sin(2.1 * t + 0.3) + 0.4 * Math.sin(5.3 * t + 1.1));
      return L.q * this.diff.wind * e * gust;
    }

    // Cast horizontal wind rays; returns hits per body
    castWind(dir, cb) {
      const x0 = dir > 0 ? -6 : SS.WORLD_W + 6, x1 = dir > 0 ? SS.WORLD_W + 6 : -6;
      for (let h = 0.05; h < 8; h += 0.1) {
        let best = null, bestF = 1;
        this.world.rayCast(V(x0, h), V(x1, h), (f, point, normal, fraction) => {
          const ud = f.getBody().getUserData();
          if (!ud || ud.kind === 'ground') return -1;
          if (fraction < bestF) { bestF = fraction; best = { f, x: point.x, y: point.y }; }
          return fraction;
        });
        if (best) cb(best.f.getBody(), best.x, best.y, h);
      }
    }

    kidWindExposure(kid, dir) {
      let hits = 0, total = 0;
      const pos = kid.body.getPosition();
      const x0 = dir > 0 ? -6 : SS.WORLD_W + 6;
      for (let h = pos.y - SS.KID.h / 2 + 0.05; h < pos.y + SS.KID.h / 2; h += 0.1) {
        total++;
        let first = null, bestF = 1;
        this.world.rayCast(V(x0, h), V(pos.x, h), (f, point, normal, fraction) => {
          const ud = f.getBody().getUserData();
          if (!ud || ud.kind === 'ground') return -1;
          if (fraction < bestF) { bestF = fraction; first = ud; }
          return fraction;
        });
        if (!first || first.kind === 'kid') hits++;
      }
      return { fraction: total ? hits / total : 0 };
    }

    kidRainExposure(kid, dir) {
      const pos = kid.body.getPosition();
      const top = pos.y + SS.KID.h / 2 + 0.02;
      let open = 0;
      const offs = [-0.2, 0, 0.2];
      for (const o of offs) {
        const sx = pos.x + o;
        let blocked = false;
        const ex = sx - dir * 0.3 * 14, ey = top + 14;
        this.world.rayCast(V(sx, top), V(ex, ey), (f) => {
          const ud = f.getBody().getUserData();
          if (!ud || ud.kind === 'kid' || ud.kind === 'ground') return -1;
          blocked = true; return 0;
        });
        if (!blocked) open++;
      }
      return open / offs.length;
    }

    stepStorm(dt = DT) {
      const L = this.level;
      const t = this.stormT;
      const q = this.qAt(t);
      const dir = this.dirAt(t);
      this.windDir = dir; this.windQ = q;
      if (dir !== this.lastDir) { this.events.push({ type: 'windflip', dir }); this.lastDir = dir; }

      // wind pressure
      for (const k of this.kids) k.hitsNow = 0;
      this.castWind(dir, (body, x, y) => {
        const ud = body.getUserData();
        if (ud.kind === 'rock') return;
        let f = q * 0.1;
        if (ud.kind === 'kid') { ud.kid.hitsNow++; f *= 1.6; }
        body.applyForce(V(dir * f, f * 0.05), V(x, y), true);
      });
      // roof lift (suction)
      if (L.lift > 0) {
        for (let x = 0; x < SS.WORLD_W; x += 0.2) {
          let best = null, bestF = 1;
          this.world.rayCast(V(x, 12), V(x, 0.01), (f, point, normal, fraction) => {
            const ud = f.getBody().getUserData();
            if (!ud || ud.kind === 'ground') return -1;
            if (fraction < bestF) { bestF = fraction; best = { b: f.getBody(), x: point.x, y: point.y, ud }; }
            return fraction;
          });
          if (best && best.ud.kind === 'piece') best.b.applyForce(V(0, L.lift * q * 0.2), V(best.x, best.y), true);
        }
      }

      this.world.step(dt, 10, 5);
      this.stormT += dt;

      // joint breaking
      const inv = 1 / dt;
      for (const J of this.joints) {
        if (J.broken) continue;
        const load = J.joint.getReactionForce(inv).length() + Math.abs(J.joint.getReactionTorque(inv)) * 2.5;
        J.load = load;
        if (load > J.strength) {
          J.broken = true;
          const a = J.joint.getAnchorA();
          this.world.destroyJoint(J.joint);
          this.events.push({ type: 'break', x: a.x, y: a.y, mats: J.mats });
        }
      }

      // kid exposure
      const counting = t > SS.RAMP_TIME * 0.5;
      for (const k of this.kids) {
        const total = Math.round(SS.KID.h / 0.1);
        k.exposedNow = Math.min(1, k.hitsNow / total);
        k.uncoveredNow = L.rain ? this.kidRainExposure(k, dir) : 0;
        if (counting) {
          k.windExp += k.exposedNow * dt;
          k.rainExp += (k.uncoveredNow > 0.34 ? k.uncoveredNow : 0) * dt;
        }
        const pos = k.body.getPosition();
        if (!k.blown && (k.windExp > 0.9 || Math.abs(pos.x - k.x0) > 1.4 || pos.y < -0.5)) {
          k.blown = true; this.events.push({ type: 'kidfail', kid: k, why: 'wind' });
        }
        if (!k.wet && k.rainExp > 1.1) { k.wet = true; this.events.push({ type: 'kidfail', kid: k, why: 'rain' }); }
      }
      // lost pieces
      for (const p of this.pieces) {
        const pos = p.body.getPosition();
        if (!p.lost && (pos.y < -3 || pos.x < -5 || pos.x > SS.WORLD_W + 5)) { p.lost = true; p.body.setActive(false); }
      }
      return this.stormT >= SS.RAMP_TIME + SS.SURVIVE_TIME;
    }

    get stormDone() { return this.stormT >= SS.RAMP_TIME + SS.SURVIVE_TIME; }
    get failed() { return this.kids.some((k) => k.blown || k.wet); }

    evaluate(supplies) {
      const pieces = this.pieces;
      let intact = 0;
      for (const p of pieces) {
        const pos = p.body.getPosition();
        const moved = Math.hypot(pos.x - p.x0, pos.y - p.y0);
        const turned = Math.abs(p.body.getAngle() - p.a0);
        p.intact = !p.lost && moved < 0.35 && turned < 0.35;
        if (p.intact) intact++;
      }
      const intactPct = pieces.length ? intact / pieces.length : 0;
      const broken = this.joints.filter((j) => j.broken);
      const win = !this.failed;
      const reasons = [];
      if (!win) {
        const near = pieces.filter((p) => this.kids.some((k) => Math.abs(p.x0 - k.x0) < 3.5));
        if (near.length < 2) reasons.push('noShelter');
        else {
          const blown = this.kids.filter((k) => k.blown), wet = this.kids.filter((k) => k.wet);
          if (blown.length) {
            if (blown.some((k) => k.shelteredStart < 0.5)) reasons.push('noWall');
            else reasons.push('wallFell');
          }
          if (wet.length) {
            if (wet.some((k) => !k.coveredStart)) reasons.push('noRoof');
            else reasons.push('roofBlew');
          }
          // weak material: lots of straw breaks while stronger pieces stayed in the tray
          const strawBreaks = broken.filter((j) => j.mats.includes('straw')).length;
          const strongerLeft = supplies && Object.entries(supplies).some(([key, n]) => n > 0 && !key.endsWith(':straw'));
          if (broken.length && strawBreaks / broken.length >= 0.5 && strongerLeft) reasons.push('weak');
        }
      }
      return { win, reasons, intactPct, brokenJoints: broken.length, totalJoints: this.joints.length, pieces: pieces.length };
    }

    popEvents() { const e = this.events; this.events = []; return e; }

    // Run a complete headless test with the given design (array of {type, mat, x, y, angle})
    runDesign(design, supplies) {
      for (const d of design) this.addPiece(d.type, d.mat, d.x, d.y, d.angle || 0);
      for (let i = 0; i < 150; i++) this.stepBuild();
      this.startStorm();
      while (!this.stepStorm()) { /* run */ }
      return this.evaluate(supplies);
    }
  }

  function idOf(ud) { return ud.kind === 'piece' ? ud.piece.id : ud.kind === 'rock' ? -2 - (ud.rock.i || 0) : -1; }

  SS.Sim = Sim;
  SS.DT = DT;
})(typeof window !== 'undefined' ? window : globalThis);
