// StormShelter - game controller: building, storm, scoring, input
// Copyright (C) 2026 Shawn Rapaz. Licensed under the GNU GPL v3.0.
(function (G) {
  const SS = G.SS;
  const R = SS.Render, A = SS.Audio;
  const $ = (id) => document.getElementById(id);
  const W = 1280, H = 720;
  const TRAY_Y = 574;

  const Game = {
    phase: 'title',   // title | build | storm | result | paused
    sim: null, level: null, diff: 'easy', slotIdx: 0, slot: null,
    supplies: {}, placed: [], timeLeft: SS.BUILD_TIME, acc: 0,
    drag: null, pending: null, result: null, failAt: null, lastTick: null, played: 0,
    view: { windVis: 0.05, windDir: 1, rain: 0, gloom: 0, tornado: 0, rainbow: 0 },

    init() {
      this.canvas = $('game');
      R.init(this.canvas);
      this.fit();
      window.addEventListener('resize', () => this.fit());
      this.bindInput();
      this.makeTitleScene();
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        this.update(dt);
        R.draw(this.renderState(), dt);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    fit() {
      const s = Math.min(window.innerWidth / W, window.innerHeight / H);
      const stage = $('stage');
      stage.style.transform = `translate(${(window.innerWidth - W * s) / 2}px, ${(window.innerHeight - H * s) / 2}px) scale(${s})`;
      const dpr = window.devicePixelRatio || 1;
      R.resize(Math.round(W * s * dpr), Math.round(H * s * dpr));
      this.scale = s;
    },

    // world <-> stage coordinates
    toStage(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    },
    toWorld(p) { return { x: p.x / SS.SCALE + SS.CAM_X0, y: (SS.GROUND_Y - p.y) / SS.SCALE }; },

    renderState() {
      return Object.assign({}, this.view, {
        sim: this.sim, phase: this.phase, ghost: this.drag && this.drag.ghost, dragging: !!this.drag,
        storm: this.level ? SS.stormFor(this.level.n) : null, result: this.result
      });
    },

    // ---------- title backdrop ----------
    makeTitleScene() {
      const L = SS.LEVELS.easy[5];
      this.level = null;
      this.sim = new SS.Sim({ ...L, kids: L.kids.map((k, i) => ({ x: 6 + i * 0.75 + 0.2, look: i })), rocks: [] }, { difficulty: 'easy' });
      // a cosy little demo house on the right
      const demo = [
        { type: 'block', mat: 'brick', x: 17.0, y: 0.405 }, { type: 'block', mat: 'brick', x: 17.0, y: 1.21 },
        { type: 'block', mat: 'brick', x: 19.6, y: 0.405 }, { type: 'block', mat: 'brick', x: 19.6, y: 1.21 },
        { type: 'beam', mat: 'wood', x: 18.3, y: 1.765 }, { type: 'roof', mat: 'straw', x: 18.3, y: 2.23 }
      ];
      for (const d of demo) this.sim.addPiece(d.type, d.mat, d.x, d.y, 0);
      this.phase = 'title'; this.result = null;
      Object.assign(this.view, { windVis: 0.08, windDir: 1, rain: 0, gloom: 0, tornado: 0, rainbow: 0 });
    },

    // ---------- level lifecycle ----------
    startLevel(n, diff, slotIdx, resume) {
      const L = SS.LEVELS[diff][n - 1];
      this.level = L; this.diff = diff; this.slotIdx = slotIdx; this.slot = SS.Save.load(slotIdx);
      this.sim = new SS.Sim(L, { difficulty: diff });
      this.sim.world.on('post-solve', (c, imp) => this.onImpact(c, imp));
      this.supplies = Object.assign({}, L.supplies);
      this.placed = []; this.result = null; this.failAt = null; this.drag = null; this.pending = null;
      this.timeLeft = SS.BUILD_TIME; this.acc = 0; this.lastTick = null; this.firstFail = null; this.timeLeftAtDone = 0;
      if (resume && resume.pieces) {
        this.supplies = Object.assign({}, resume.supplies);
        this.timeLeft = Math.max(10, resume.timeLeft);
        for (const p of resume.pieces) { const pc = this.sim.addPiece(p.type, p.mat, p.x, p.y, p.angle); this.placed.push(pc.id); }
      }
      if (this.slot && this.slot.inProgress) { this.slot.inProgress = null; SS.Save.store(slotIdx, this.slot); }
      this.phase = 'build';
      Object.assign(this.view, { windVis: 0.06, windDir: L.dir, rain: 0, gloom: 0.1, tornado: 0, rainbow: 0 });
      R.particles.length = 0;
      SS.UI.showHud(this);
      A.setDuck(1); A.setWind(0.05); A.setRain(0);
      A.sfx.siren();
      this.buildTray();
    },

    snapshot() {
      return {
        diff: this.diff, n: this.level.n, timeLeft: Math.ceil(this.timeLeft), supplies: Object.assign({}, this.supplies),
        pieces: this.sim.pieces.map((p) => ({ type: p.type, mat: p.mat, x: +p.body.getPosition().x.toFixed(3), y: +p.body.getPosition().y.toFixed(3), angle: +p.body.getAngle().toFixed(4) })),
        t: Date.now()
      };
    },
    saveProgress() {
      if (!this.level || (this.phase !== 'build' && this.phase !== 'paused')) return false;
      const slot = SS.Save.load(this.slotIdx) || SS.Save.newSlot();
      if (this.drag) this.cancelDrag();
      slot.inProgress = this.snapshot();
      slot.playTime += this.played; this.played = 0;
      return SS.Save.store(this.slotIdx, slot);
    },

    startStorm() {
      if (this.phase !== 'build') return;
      if (this.drag) this.cancelDrag();
      this.phase = 'storm';
      this.timeUsed = Math.round(SS.BUILD_TIME - this.timeLeft);
      this.sim.startStorm();
      this.sim.lastDir = this.sim.windDir;
      SS.UI.stormBegins(this);
      A.sfx.whoosh(); A.setDuck(0.35);
      this.nextBolt = 1 + Math.random() * 2;
      this.lastCount = null;
    },

    endStorm() {
      const res = this.sim.evaluate(this.supplies);
      const D = { easy: 1, medium: 1.5, hard: 2 }[this.diff];
      const unused = Object.values(this.supplies).reduce((a, b) => a + b, 0);
      res.storm = this.level.stormName; res.timeUsed = this.timeUsed;
      if (res.win) {
        res.stars = 1 + (res.intactPct >= 0.7 ? 1 : 0) + (res.intactPct >= 0.95 ? 1 : 0);
        res.breakdown = { safe: 1000, time: Math.round(this.timeLeftAtDone * 10), sturdy: Math.round(res.intactPct * 500), spare: unused * 20 };
        res.score = Math.round((res.breakdown.safe + res.breakdown.time + res.breakdown.sturdy + res.breakdown.spare) * D);
      } else { res.stars = 0; res.score = 0; }
      res.firstFail = this.firstFail;
      this.result = res;
      this.phase = 'result';
      // weather clears up
      Object.assign(this.view, res.win ? { windVis: 0.05, rain: 0, gloom: 0.05, tornado: 0, rainbow: 1 } : { windVis: 0.15, rain: 0.15, gloom: 0.45, tornado: 0 });
      A.setWind(res.win ? 0.03 : 0.12); A.setRain(res.win ? 0 : 0.1); A.setDuck(1);
      // save
      const slot = SS.Save.load(this.slotIdx) || SS.Save.newSlot();
      SS.Save.recordAttempt(slot, this.diff, this.level.n, res);
      slot.playTime += this.played; this.played = 0;
      slot.inProgress = null;
      SS.Save.store(this.slotIdx, slot);
      this.slot = slot;
      if (res.win) { A.sfx.win(); R.confetti(); setTimeout(() => A.sfx.cheer(), 600); } else A.sfx.lose();
      setTimeout(() => SS.UI.showResult(this, res), res.win ? 1100 : 900);
    },

    quitToTitle(save = true) {
      if (save && (this.phase === 'build' || this.phase === 'paused')) this.saveProgress();
      A.setWind(0.05); A.setRain(0); A.setDuck(1);
      this.makeTitleScene();
    },

    // ---------- update ----------
    update(dt) {
      if (this.phase === 'title') {
        this.view.windVis = 0.08 + Math.sin(R.t * 0.2) * 0.04;
        return;
      }
      if (this.phase === 'paused' || !this.sim) return;
      if (this.phase === 'build' || this.phase === 'storm') this.played += dt;

      if (this.phase === 'build') {
        this.timeLeft -= dt;
        const k = 1 - this.timeLeft / SS.BUILD_TIME;
        this.view.gloom = 0.08 + k * 0.5;
        this.view.windVis = 0.06 + k * 0.3;
        A.setWind(0.05 + k * 0.3);
        const sec = Math.ceil(this.timeLeft);
        if (sec !== this.lastTick) {
          this.lastTick = sec;
          if (sec <= 10 && sec > 0) A.sfx.tick(sec <= 5);
          SS.UI.updateTimer(this.timeLeft);
        }
        this.acc += dt;
        while (this.acc >= SS.DT) { this.sim.stepBuild(SS.DT); this.acc -= SS.DT; }
        for (const e of this.sim.popEvents()) if (e.type === 'lost') { this.placed = this.placed.filter((id) => id !== e.piece.id); }
        for (const p of this.sim.pieces) if (p.flash > 0) p.flash -= dt * 3;
        if (this.timeLeft <= 0) { this.timeLeft = 0; this.timeLeftAtDone = 0; this.startStorm(); }
      } else if (this.phase === 'storm') {
        this.acc += dt;
        let done = false;
        while (this.acc >= SS.DT) { done = this.sim.stepStorm(SS.DT) || done; this.acc -= SS.DT; }
        const sim = this.sim, L = this.level, storm = SS.stormFor(L.n);
        const q = sim.windQ || 0;
        this.view.windVis = Math.min(1.25, 0.25 + q / 14);
        this.view.windDir = sim.windDir;
        this.view.gloom = Math.min(1, 0.6 + q / 30);
        this.view.rain = L.rain ? (storm.id === 'hurricane' ? 1.4 : storm.id === 'wind' ? 0.6 : 1) * Math.min(1, sim.stormT / SS.RAMP_TIME) : 0;
        this.view.tornado = storm.id === 'tornado' ? Math.min(1, sim.stormT / SS.RAMP_TIME) : 0;
        this.view.tornadoSide = L.dir;
        A.setWind(Math.min(1.1, 0.35 + q / 18), true); A.setRain(this.view.rain);
        if (storm.id === 'thunder' || storm.id === 'hurricane' || storm.id === 'tornado') {
          this.nextBolt -= dt;
          if (this.nextBolt <= 0) { R.lightning(); setTimeout(() => A.sfx.thunder(), 150 + Math.random() * 400); R.shake = 0.4; this.nextBolt = 1.5 + Math.random() * 2.5; }
        }
        for (const e of sim.popEvents()) {
          if (e.type === 'break') { R.chips(e.x, e.y, e.mats[0] || e.mats[1], 10); A.sfx.break(e.mats[0] || e.mats[1]); }
          else if (e.type === 'kidfail') {
            if (!this.firstFail) this.firstFail = { why: e.why, kid: e.kid.i };
            if (this.failAt == null) { this.failAt = sim.stormT; A.sfx.oops(); }
          } else if (e.type === 'windflip') SS.UI.windDir(e.dir, L);
        }
        // countdown 5..1
        const left = SS.RAMP_TIME + SS.SURVIVE_TIME - sim.stormT;
        const c = sim.stormT < SS.RAMP_TIME ? null : Math.max(1, Math.ceil(left));
        if (c !== this.lastCount) { this.lastCount = c; SS.UI.stormCount(c); if (c) A.sfx.tick(true); }
        if (done || (this.failAt != null && sim.stormT - this.failAt > 1.6)) this.endStorm();
      } else if (this.phase === 'result') {
        if (this.sim.phase === 'storm' && this.result && !this.result.win) {
          // let things settle gently after a failure
          this.acc += dt;
          while (this.acc >= SS.DT) { this.sim.world.step(SS.DT, 8, 4); this.acc -= SS.DT; }
        }
      }
    },

    onImpact(contact, imp) {
      if (this.phase !== 'build') return;
      const n = imp.normalImpulses[0] || 0;
      if (n < 0.6) return;
      const now = performance.now();
      if (this.lastImpact && now - this.lastImpact < 70) return;
      this.lastImpact = now;
      const ud = contact.getFixtureA().getBody().getUserData();
      const ud2 = contact.getFixtureB().getBody().getUserData();
      const p = (ud && ud.piece) || (ud2 && ud2.piece);
      if (p) A.sfx.land(p.mat, Math.min(4, n));
    },

    // ---------- supplies / tray ----------
    buildTray() { SS.UI.renderTray(this); },
    trayKeyAt(stagePt) {
      const el = document.elementFromPoint(stagePt.cx, stagePt.cy);
      return el && el.closest && el.closest('#tray');
    },
    giveBack(type, mat) {
      const k = type + ':' + mat;
      this.supplies[k] = (this.supplies[k] || 0) + 1;
      SS.UI.renderTray(this, k);
    },
    undo() {
      if (this.phase !== 'build') return;
      while (this.placed.length) {
        const id = this.placed.pop();
        const p = this.sim.pieces.find((q) => q.id === id);
        if (p) { const pos = p.body.getPosition(); R.puff(pos.x, pos.y, 'rgba(255,255,255,A)', 8); this.sim.removePiece(p); this.giveBack(p.type, p.mat); A.sfx.remove(); return; }
      }
      A.sfx.deny();
    },
    clearAll() {
      if (this.phase !== 'build') return;
      if (!this.sim.pieces.length) { A.sfx.deny(); return; }
      for (const p of this.sim.pieces.slice()) { const pos = p.body.getPosition(); R.puff(pos.x, pos.y, 'rgba(255,255,255,A)', 5); this.sim.removePiece(p); this.giveBack(p.type, p.mat); }
      this.placed = []; A.sfx.remove();
    },
    done() {
      if (this.phase !== 'build') return;
      if (!this.sim.pieces.length) SS.UI.toast(`Build something first! ${SS.icon('brick')}`);
      this.timeLeftAtDone = Math.max(0, this.timeLeft);
      this.startStorm();
    },

    // ---------- dragging ----------
    beginDrag(type, mat, from, e, angle = 0, id) {
      A.resume();
      const sp = this.toStage(e);
      this.drag = { type, mat, from, id, angle, ghost: { type, mat, angle, x: 0, y: 0, ok: true, landY: null } };
      A.sfx.pick(mat);
      this.moveDrag(e);
      SS.UI.dragging(true);
    },
    moveDrag(e) {
      const d = this.drag; if (!d) return;
      const sp = this.toStage(e);
      const w = this.toWorld(sp);
      const gh = d.ghost;
      gh.x = w.x; gh.y = Math.max(w.y, -this.sim.lowestY(d.type, d.angle) + 0.01); gh.angle = d.angle;
      gh.overTray = sp.y > TRAY_Y;
      if (gh.overTray) { gh.landY = null; gh.ok = true; return; }
      const spot = this.sim.findFreeSpot(d.type, w.x, w.y, d.angle);
      if (!spot) { gh.ok = false; gh.landY = null; return; }
      gh.ok = true; gh.x = spot.x;
      gh.landY = this.landingY(d.type, spot.x, spot.y, d.angle);
      if (gh.landY > gh.y) gh.y = gh.landY;
    },
    landingY(type, x, y, angle) {
      const minY = -this.sim.lowestY(type, angle) + 0.004;
      let ly = y;
      while (ly - 0.05 >= minY && !this.sim.overlaps(type, x, ly - 0.05, angle)) ly -= 0.05;
      // fine adjust
      while (ly - 0.01 >= minY && !this.sim.overlaps(type, x, ly - 0.01, angle)) ly -= 0.01;
      return ly;
    },
    rotateDrag() {
      if (!this.drag) return;
      this.drag.angle = (this.drag.angle + Math.PI / 2) % (Math.PI * 2);
      A.sfx.rotate();
      if (this.lastPointer) this.moveDrag(this.lastPointer);
    },
    endDrag(e) {
      const d = this.drag; if (!d) return;
      this.drag = null; SS.UI.dragging(false);
      const gh = d.ghost;
      if (this.phase !== 'build' || gh.overTray || !gh.ok || gh.landY == null) {
        if (gh.overTray || this.phase !== 'build') { this.giveBack(d.type, d.mat); A.sfx.remove(); }
        else { this.giveBack(d.type, d.mat); A.sfx.deny(); }
        return;
      }
      const p = this.sim.addPiece(d.type, d.mat, gh.x, gh.landY + 0.003, d.angle);
      p.flash = 0.8;
      this.placed.push(p.id);
      A.sfx.place(d.mat);
      const lowY = gh.landY + this.sim.lowestY(d.type, d.angle);
      R.puff(gh.x, lowY, 'rgba(235,220,190,A)', 8, 0.7);
      SS.UI.hideHint();
    },
    cancelDrag() {
      const d = this.drag; if (!d) return;
      this.drag = null; SS.UI.dragging(false);
      this.giveBack(d.type, d.mat);
    },

    bindInput() {
      const cv = this.canvas;
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      cv.addEventListener('pointerdown', (e) => {
        A.resume();
        if (this.phase !== 'build') return;
        if (e.button === 2) { if (this.drag) this.rotateDrag(); return; }
        const w = this.toWorld(this.toStage(e));
        const p = this.sim.pieceAt(w.x, w.y);
        if (p) { this.pending = { piece: p, x: e.clientX, y: e.clientY, pid: e.pointerId }; cv.setPointerCapture(e.pointerId); }
      });
      window.addEventListener('pointermove', (e) => {
        this.lastPointer = { clientX: e.clientX, clientY: e.clientY };
        if (this.pending && !this.drag) {
          const dx = e.clientX - this.pending.x, dy = e.clientY - this.pending.y;
          if (Math.hypot(dx, dy) > 8 * (this.scale || 1)) {
            const p = this.pending.piece; this.pending = null;
            if (this.sim.pieces.includes(p)) {
              const ang = snapAngle(p.body.getAngle());
              this.sim.removePiece(p);
              this.placed = this.placed.filter((id) => id !== p.id);
              this.supplies[p.type + ':' + p.mat] = (this.supplies[p.type + ':' + p.mat] || 0);
              this.beginDrag(p.type, p.mat, 'world', e, ang, p.id);
            }
          }
        }
        if (this.drag) this.moveDrag(e);
      });
      window.addEventListener('pointerup', (e) => {
        if (this.pending) {                      // a tap on a placed piece rotates it
          const p = this.pending.piece; this.pending = null;
          if (this.phase === 'build' && this.sim.pieces.includes(p)) this.rotatePlaced(p);
          return;
        }
        if (this.drag) this.endDrag(e);
      });
      window.addEventListener('pointercancel', () => { this.pending = null; if (this.drag) this.cancelDrag(); });
      window.addEventListener('wheel', (e) => { if (this.drag) { e.preventDefault(); this.rotateDrag(); } }, { passive: false });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R' || e.key === ' ') { if (this.drag) { e.preventDefault(); this.rotateDrag(); } }
        else if (e.key === 'Escape') { if (this.drag) this.cancelDrag(); else SS.UI.escape(this); }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'z') this.undo();
        else if (e.key === 'Enter' && this.phase === 'build' && !SS.UI.modalOpen()) this.done();
        else if (e.key === 'F11') { e.preventDefault(); SS.UI.fullscreen(); }
      });
      window.addEventListener('beforeunload', () => { if (this.phase === 'build' || this.phase === 'paused') this.saveProgress(); });
    },

    rotatePlaced(p) {
      const pos = p.body.getPosition();
      const ang = (snapAngle(p.body.getAngle()) + Math.PI / 2) % (Math.PI * 2);
      const id = p.id, type = p.type, mat = p.mat;
      this.sim.removePiece(p);
      const spot = this.sim.findFreeSpot(type, pos.x, pos.y, ang);
      const y = spot ? this.landingY(type, spot.x, spot.y, ang) : pos.y;
      const np = this.sim.addPiece(type, mat, spot ? spot.x : pos.x, y + 0.003, ang, { id });
      np.flash = 0.6;
      A.sfx.rotate();
    }
  };
  function snapAngle(a) { const q = Math.PI / 2; let s = Math.round(a / q) * q; s = ((s % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return s; }

  SS.Game = Game;
})(window);
