// StormShelter - procedural graphics (sky, weather, materials, kids, particles)
// Copyright (C) 2026 Shawn Rapaz. Licensed under the GNU GPL v3.0.
(function (G) {
  const SS = G.SS;
  const W = 1280, H = 720;
  const S = () => SS.SCALE;
  const sx = (x) => (x - SS.CAM_X0) * SS.SCALE;
  const sy = (y) => SS.GROUND_Y - y * SS.SCALE;

  // ---------- colour helpers ----------
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
  }
  function shade(c, k) { const A = hex(c); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(A[0])},${f(A[1])},${f(A[2])})`; }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- material textures ----------
  const textures = {};
  function makeTexture(mat) {
    const c = document.createElement('canvas');
    const N = 192; c.width = c.height = N;
    const g = c.getContext('2d');
    const r = rng(mat.length * 999 + 7);
    if (mat === 'straw') {
      g.fillStyle = '#e8c252'; g.fillRect(0, 0, N, N);
      for (let i = 0; i < 520; i++) {
        const y = r() * N, x = r() * N, len = 20 + r() * 50;
        g.strokeStyle = ['#f7dc7a', '#d6a93a', '#c99a2e', '#fbe89a', '#b8862a'][Math.floor(r() * 5)];
        g.lineWidth = 1 + r() * 1.6; g.globalAlpha = 0.75;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (r() - 0.5) * 6); g.stroke();
      }
      g.globalAlpha = 1;
      for (const bx of [48, 144]) {          // twine bands
        g.fillStyle = '#9b6a2a'; g.fillRect(bx - 4, 0, 8, N);
        g.fillStyle = 'rgba(255,230,160,0.35)'; g.fillRect(bx - 4, 0, 2, N);
      }
    } else if (mat === 'wood') {
      g.fillStyle = '#b9773a'; g.fillRect(0, 0, N, N);
      for (let i = 0; i < 46; i++) {
        const y0 = (i / 46) * N + r() * 3;
        g.strokeStyle = r() < 0.5 ? 'rgba(110,60,20,0.35)' : 'rgba(230,170,110,0.25)';
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        for (let x = 0; x <= N; x += 8) g.lineTo(x, y0 + Math.sin(x / 30 + i) * 2.5 + Math.sin(x / 11 + i * 3) * 0.8);
        g.stroke();
      }
      for (let k = 0; k < 3; k++) {          // knots
        const x = r() * N, y = r() * N;
        const grd = g.createRadialGradient(x, y, 1, x, y, 9);
        grd.addColorStop(0, '#5c3416'); grd.addColorStop(0.6, '#8a5428'); grd.addColorStop(1, 'rgba(138,84,40,0)');
        g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, 12, 6, 0, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = 'rgba(80,40,10,0.5)'; g.lineWidth = 2;
      for (const y of [64, 128]) { g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); }
    } else if (mat === 'brick') {
      g.fillStyle = '#d9c8b4'; g.fillRect(0, 0, N, N);
      const bh = 24, bw = 48;
      for (let row = 0; row < N / bh; row++) {
        const off = row % 2 ? bw / 2 : 0;
        for (let col = -1; col < N / bw + 1; col++) {
          const x = col * bw + off + 2, y = row * bh + 2;
          const base = ['#c4533a', '#b84a33', '#cf6044', '#a94430', '#c85a3c'][Math.floor(r() * 5)];
          const grd = g.createLinearGradient(x, y, x, y + bh - 4);
          grd.addColorStop(0, shade(base, 1.15)); grd.addColorStop(1, shade(base, 0.85));
          g.fillStyle = grd;
          roundRect(g, x, y, bw - 4, bh - 4, 3); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.08)';
          for (let k = 0; k < 6; k++) g.fillRect(x + r() * (bw - 6), y + r() * (bh - 6), 2, 2);
        }
      }
    } else {                                  // stone
      g.fillStyle = '#6c7480'; g.fillRect(0, 0, N, N);
      const pts = [];
      for (let i = 0; i < 26; i++) pts.push([r() * N, r() * N, 18 + r() * 16]);
      for (const [x, y, rad] of pts) {
        for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
          const base = ['#9aa3ae', '#8d96a3', '#a7afb9', '#7f8894', '#b1b8c0'][Math.floor((x + y) % 5)];
          const grd = g.createRadialGradient(x + ox - rad * 0.3, y + oy - rad * 0.3, 2, x + ox, y + oy, rad);
          grd.addColorStop(0, shade(base, 1.2)); grd.addColorStop(1, shade(base, 0.8));
          g.fillStyle = grd;
          g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * 0.78, (x % 3), 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(40,45,55,0.5)'; g.lineWidth = 2; g.stroke();
        }
      }
    }
    return c;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---------- clouds ----------
  function makeCloud(seed, w, h, dark) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); const r = rng(seed);
    const puffs = [];
    for (let i = 0; i < 8; i++) puffs.push([w * (0.22 + r() * 0.56), h * (0.52 + r() * 0.1), h * (0.18 + r() * 0.12)]);
    puffs.push([w * 0.42, h * 0.45, h * 0.3], [w * 0.6, h * 0.5, h * 0.26]);
    g.fillStyle = dark ? 'rgba(0,0,0,0.25)' : 'rgba(40,70,110,0.10)';
    for (const [x, y, rad] of puffs) { g.beginPath(); g.arc(x, y + rad * 0.22, rad, 0, Math.PI * 2); g.fill(); }
    for (const [x, y, rad] of puffs) {
      const grd = g.createRadialGradient(x - rad * 0.3, y - rad * 0.4, rad * 0.1, x, y, rad);
      if (dark) { grd.addColorStop(0, '#8a93a3'); grd.addColorStop(1, '#4e5767'); }
      else { grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#dce6f1'); }
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    return c;
  }

  const R = {
    canvas: null, ctx: null, t: 0, particles: [], clouds: [], trees: [], grass: [], flash: 0, bolt: null, shake: 0,
    gloom: 0, windVis: 0, windDir: 1, rain: 0, kidAnim: {},

    init(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      for (const m of SS.MATERIAL_ORDER) textures[m] = makeTexture(m);
      this.patterns = {};
      for (const m of SS.MATERIAL_ORDER) this.patterns[m] = this.ctx.createPattern(textures[m], 'repeat');
      const r = rng(42);
      for (let i = 0; i < 9; i++) {
        const w = 150 + r() * 170;
        this.clouds.push({ img: makeCloud(i * 31 + 5, w, w * 0.6), dark: makeCloud(i * 31 + 5, w, w * 0.6, true), x: r() * (W + 400) - 200, y: 20 + r() * 200, depth: 0.3 + r() * 0.7 });
      }
      for (let i = 0; i < 9; i++) this.trees.push({ x: 40 + i * 150 + r() * 80, s: 0.6 + r() * 0.5, hue: r(), phase: r() * 6, layer: i % 2 });
      for (let i = 0; i < 360; i++) this.grass.push({ x: r() * W, h: 6 + r() * 12, c: r(), p: r() * 6 });
    },

    resize(pxW, pxH) { this.canvas.width = pxW; this.canvas.height = pxH; this.patterns = {};
      for (const m of SS.MATERIAL_ORDER) this.patterns[m] = this.ctx.createPattern(textures[m], 'repeat'); },

    // ---------- particles ----------
    puff(x, y, color, n = 10, spread = 1) {
      for (let i = 0; i < n; i++) this.particles.push({ kind: 'dust', x: sx(x), y: sy(y), vx: (Math.random() - 0.5) * 120 * spread, vy: -Math.random() * 80 * spread, life: 0.6 + Math.random() * 0.5, age: 0, r: 4 + Math.random() * 6, color });
    },
    chips(x, y, mat, n = 12) {
      const M = SS.MATERIALS[mat] || SS.MATERIALS.wood;
      for (let i = 0; i < n; i++) this.particles.push({ kind: 'chip', x: sx(x), y: sy(y), vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 240, life: 1 + Math.random(), age: 0, r: 2 + Math.random() * 4, color: Math.random() < 0.5 ? M.color : M.dark, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    },
    confetti(n = 140) {
      const cols = ['#ff6b8b', '#ffd23f', '#4fc3f7', '#7ed957', '#b388ff', '#ff9f43'];
      for (let i = 0; i < n; i++) this.particles.push({ kind: 'confetti', x: Math.random() * W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, life: 5, age: 0, r: 4 + Math.random() * 4, color: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
    },
    sparkle(x, y) {
      for (let i = 0; i < 8; i++) this.particles.push({ kind: 'spark', x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.5, age: 0, r: 3, color: '#fff6a8' });
    },
    lightning() {
      this.flash = 1;
      const x = 100 + Math.random() * (W - 200);
      const pts = [[x, 0]]; let cx = x, cy = 0;
      while (cy < 380) { cx += (Math.random() - 0.5) * 60; cy += 25 + Math.random() * 30; pts.push([cx, cy]); }
      this.bolt = { pts, life: 0.25 };
    },

    updateParticles(dt, wind) {
      const ps = this.particles;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.age += dt;
        if (p.age > p.life) { ps.splice(i, 1); continue; }
        if (p.kind === 'dust') { p.vx += wind * 30 * dt; p.vy -= 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; }
        else if (p.kind === 'chip') { p.vy += 600 * dt; p.vx += wind * 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.y > SS.GROUND_Y) { p.y = SS.GROUND_Y; p.vy *= -0.3; p.vx *= 0.6; } }
        else if (p.kind === 'confetti') { p.x += (p.vx + Math.sin(p.age * 3 + p.rot) * 40) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
        else if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; }
        else if (p.kind === 'rain') { p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > SS.GROUND_Y + 4) { p.life = 0; if (Math.random() < 0.3) ps.push({ kind: 'splash', x: p.x, y: SS.GROUND_Y + 2, life: 0.25, age: 0, r: 2 }); } }
        else if (p.kind === 'streak') { p.x += p.vx * dt; p.y += Math.sin(p.age * 4 + p.r) * 20 * dt; }
        else if (p.kind === 'leaf') { p.vx += (wind * 380 - p.vx) * dt * 1.5; p.vy += (Math.sin(p.age * 5 + p.r) * 60 - p.vy) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
      }
      if (ps.length > 1600) ps.splice(0, ps.length - 1600);
    },

    spawnWeather(dt) {
      const ps = this.particles;
      // rain
      const rainN = this.rain * 900 * dt;
      for (let i = 0; i < rainN; i++) {
        const vx = this.windDir * this.windVis * 520;
        ps.push({ kind: 'rain', x: Math.random() * (W + 600) - 300 - vx * 0.5, y: -20, vx, vy: 900 + Math.random() * 300, life: 2, age: 0, r: 1 });
      }
      // wind streaks
      const sN = this.windVis * 18 * dt;
      for (let i = 0; i < sN; i++) {
        const d = this.windDir;
        ps.push({ kind: 'streak', x: d > 0 ? -150 : W + 150, y: 40 + Math.random() * (SS.GROUND_Y - 50), vx: d * (700 + Math.random() * 500) * Math.max(0.4, this.windVis), life: 2.5, age: 0, r: Math.random() * 6, len: 60 + Math.random() * 120 });
      }
      // leaves
      if (Math.random() < this.windVis * 6 * dt) {
        const d = this.windDir;
        ps.push({ kind: 'leaf', x: d > 0 ? -20 : W + 20, y: 100 + Math.random() * 400, vx: d * 200, vy: 0, life: 6, age: 0, r: Math.random() * 6, rot: 0, vr: (Math.random() - 0.5) * 14, color: ['#6fbf4a', '#f2a541', '#e0602b', '#9ccc50'][Math.floor(Math.random() * 4)] });
      }
    },

    // ---------- scene ----------
    drawSky(g, storm) {
      const calm = ['#6fb5f0', '#cfe9ff'];
      const sky = storm ? storm.sky : ['#4d6d8f', '#9fb3c7'];
      const k = this.gloom;
      const grd = g.createLinearGradient(0, 0, 0, SS.GROUND_Y);
      grd.addColorStop(0, mix(calm[0], sky[0], k)); grd.addColorStop(1, mix(calm[1], sky[1], k));
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      // sun
      const sunA = Math.max(0, 1 - k * 1.6);
      if (sunA > 0) {
        const x = 1080, y = 110;
        const glow = g.createRadialGradient(x, y, 20, x, y, 160);
        glow.addColorStop(0, `rgba(255,244,190,${0.8 * sunA})`); glow.addColorStop(1, 'rgba(255,244,190,0)');
        g.fillStyle = glow; g.fillRect(x - 160, y - 160, 320, 320);
        g.save(); g.translate(x, y); g.rotate(this.t * 0.1);
        g.strokeStyle = `rgba(255,220,100,${0.5 * sunA})`; g.lineWidth = 5; g.lineCap = 'round';
        for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(56, 0); g.lineTo(72 + Math.sin(this.t * 2 + i) * 5, 0); g.stroke(); }
        g.restore();
        g.fillStyle = `rgba(255,214,80,${sunA})`; g.beginPath(); g.arc(x, y, 44, 0, Math.PI * 2); g.fill();
        g.fillStyle = `rgba(255,236,150,${sunA})`; g.beginPath(); g.arc(x - 10, y - 10, 30, 0, Math.PI * 2); g.fill();
      }
      if (this.rainbow > 0) this.drawRainbow(g, this.rainbow);
    },
    drawRainbow(g, a) {
      const cols = ['#ff5e5e', '#ffa64d', '#ffe14d', '#6fdc6f', '#4dc3ff', '#7a7aff', '#c77dff'];
      g.save(); g.globalAlpha = 0.45 * a; g.lineWidth = 14;
      cols.forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(640, SS.GROUND_Y + 80, 520 - i * 14, Math.PI, 0); g.stroke(); });
      g.restore();
    },
    drawClouds(g, dt) {
      const k = this.gloom;
      for (const c of this.clouds) {
        c.x += (8 + this.windVis * 160) * c.depth * dt * (this.windDir || 1);
        if (c.x > W + 60) c.x = -c.img.width - 40;
        if (c.x < -c.img.width - 60) c.x = W + 40;
        const cy = c.y + Math.sin(this.t * 0.3 + c.depth * 9) * 4;
        if (k < 0.98) { g.globalAlpha = 0.95 * (1 - k); g.drawImage(c.img, c.x, cy); }
        if (k > 0.02) { g.globalAlpha = 0.95 * k; g.drawImage(c.dark, c.x, cy); }
        g.globalAlpha = 1;
      }
      if (k > 0.3) {                          // heavy storm-cloud ceiling
        g.save(); g.globalAlpha = (k - 0.3) * 1.1;
        for (let i = 0; i < 14; i++) {
          const x = ((i * 120 + this.t * 30 * this.windDir) % (W + 240) + W + 240) % (W + 240) - 120;
          const grd = g.createRadialGradient(x, 10, 10, x, 10, 130);
          grd.addColorStop(0, 'rgba(40,46,58,0.9)'); grd.addColorStop(1, 'rgba(40,46,58,0)');
          g.fillStyle = grd; g.beginPath(); g.ellipse(x, 10, 140, 90, 0, 0, Math.PI * 2); g.fill();
        }
        g.restore();
      }
    },
    drawHills(g) {
      const k = this.gloom;
      const layers = [
        { y: 400, amp: 40, f: 0.004, c1: '#9fd38a', c2: '#6aa84f', off: 0 },
        { y: 460, amp: 30, f: 0.007, c1: '#86c96a', c2: '#4f9a3a', off: 2 }
      ];
      for (const L of layers) {
        const grd = g.createLinearGradient(0, L.y - L.amp, 0, SS.GROUND_Y);
        grd.addColorStop(0, mix(L.c1, '#3d4a44', k * 0.7)); grd.addColorStop(1, mix(L.c2, '#28332e', k * 0.7));
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(0, SS.GROUND_Y);
        for (let x = 0; x <= W; x += 16) g.lineTo(x, L.y + Math.sin(x * L.f + L.off) * L.amp + Math.sin(x * L.f * 2.7 + L.off) * L.amp * 0.3);
        g.lineTo(W, SS.GROUND_Y); g.fill();
      }
    },
    drawTrees(g, layer) {
      const k = this.gloom;
      for (const tr of this.trees) {
        if (tr.layer !== layer) continue;
        const baseY = layer === 0 ? 440 : 505;
        const s = tr.s * (layer === 0 ? 0.75 : 1);
        const bend = (Math.sin(this.t * (1.2 + this.windVis * 4) + tr.phase) * (0.03 + this.windVis * 0.08) + this.windDir * this.windVis * 0.22);
        g.save(); g.translate(tr.x, baseY); g.scale(s, s);
        g.fillStyle = mix('#7a4e2c', '#3a2a20', k * 0.6);
        g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(-4 + bend * 40, -50, bend * 90, -90); g.lineTo(bend * 90 + 8, -88); g.quadraticCurveTo(6 + bend * 40, -50, 8, 0); g.fill();
        g.translate(bend * 95, -100);
        g.rotate(bend * 0.6);
        const greens = tr.hue < 0.5 ? ['#3f9b4b', '#58b85c', '#7dd36f'] : ['#2f8a5a', '#47a86e', '#69c58a'];
        const blobs = [[-30, 10, 34], [30, 10, 34], [0, -18, 40], [-18, -40, 26], [20, -38, 28]];
        greens.forEach((c, i) => {
          g.fillStyle = mix(c, '#24382c', k * 0.6);
          for (const [bx, by, br] of blobs) { g.beginPath(); g.arc(bx - i * 3, by - i * 4, br - i * 6, 0, Math.PI * 2); g.fill(); }
        });
        g.restore();
      }
    },
    drawTornado(g, a, dir) {
      if (a <= 0) return;
      const x0 = dir > 0 ? 190 : W - 190;
      const baseY = 470;
      g.save(); g.globalAlpha = a;
      // funnel body: stacked swirling rings, wide at the cloud base, narrow at the ground
      for (let i = 0; i < 30; i++) {
        const k = i / 29;
        const y = 30 + k * (baseY - 30);
        const w = 150 * Math.pow(1 - k, 1.6) + 10;
        const off = Math.sin(this.t * 2.5 + k * 5) * (18 + k * 26) + Math.sin(this.t * 7 + i) * 3;
        const grd = g.createLinearGradient(x0 + off - w, 0, x0 + off + w, 0);
        grd.addColorStop(0, 'rgba(70,72,66,0.0)');
        grd.addColorStop(0.3, 'rgba(120,118,104,0.75)');
        grd.addColorStop(0.55, 'rgba(165,160,140,0.85)');
        grd.addColorStop(1, 'rgba(70,72,66,0.0)');
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(x0 + off, y, w, 10 + (1 - k) * 8, 0, 0, Math.PI * 2); g.fill();
        // swirl streaks
        g.strokeStyle = 'rgba(230,225,205,0.35)'; g.lineWidth = 2;
        const ph = this.t * 9 + i * 0.7;
        g.beginPath(); g.ellipse(x0 + off, y, w * 0.8, 6, 0, ph % (Math.PI * 2), ph % (Math.PI * 2) + 1.2); g.stroke();
      }
      // dust cloud at the bottom + flying debris
      const dust = g.createRadialGradient(x0, baseY, 5, x0, baseY, 90);
      dust.addColorStop(0, 'rgba(140,110,80,0.7)'); dust.addColorStop(1, 'rgba(140,110,80,0)');
      g.fillStyle = dust; g.beginPath(); g.ellipse(x0, baseY, 100, 40, 0, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 26; i++) {
        const ang = this.t * (4 + (i % 3)) + i * 1.7, rr = 30 + (i % 6) * 16;
        const y = baseY - ((i * 37 + this.t * 60) % 260);
        g.fillStyle = i % 3 ? 'rgba(90,70,50,0.9)' : 'rgba(80,130,60,0.9)';
        g.save(); g.translate(x0 + Math.cos(ang) * rr * (1 - (baseY - y) / 400), y + Math.sin(ang) * 6); g.rotate(ang);
        g.fillRect(-3, -2, 6, 4); g.restore();
      }
      g.restore();
    },
    drawGround(g) {
      const k = this.gloom;
      // dirt
      const grd = g.createLinearGradient(0, SS.GROUND_Y, 0, H);
      grd.addColorStop(0, mix('#8a5a34', '#4a3424', k * 0.6)); grd.addColorStop(1, mix('#5e3a20', '#2c1f15', k * 0.6));
      g.fillStyle = grd; g.fillRect(0, SS.GROUND_Y, W, H - SS.GROUND_Y);
      const r = rng(9);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      for (let i = 0; i < 70; i++) { g.beginPath(); g.ellipse(r() * W, SS.GROUND_Y + 22 + r() * 140, 3 + r() * 8, 2 + r() * 4, 0, 0, Math.PI * 2); g.fill(); }
      // grass band
      const gg = g.createLinearGradient(0, SS.GROUND_Y - 6, 0, SS.GROUND_Y + 18);
      gg.addColorStop(0, mix('#78c850', '#3f6b3a', k * 0.6)); gg.addColorStop(1, mix('#4f9a36', '#2c4a28', k * 0.6));
      g.fillStyle = gg; g.beginPath(); g.moveTo(0, SS.GROUND_Y + 18);
      for (let x = 0; x <= W; x += 20) g.lineTo(x, SS.GROUND_Y - 2 + Math.sin(x * 0.05) * 2);
      g.lineTo(W, SS.GROUND_Y + 18); g.fill();
      // blades
      g.lineCap = 'round'; g.lineWidth = 2.2;
      for (const b of this.grass) {
        const sway = Math.sin(this.t * (2 + this.windVis * 6) + b.p + b.x * 0.02) * (2 + this.windVis * 4) + this.windDir * this.windVis * b.h * 0.9;
        g.strokeStyle = mix(b.c < 0.5 ? '#5cb043' : '#89d45c', '#2f5530', k * 0.6);
        g.beginPath(); g.moveTo(b.x, SS.GROUND_Y + 2); g.quadraticCurveTo(b.x + sway * 0.3, SS.GROUND_Y - b.h * 0.5, b.x + sway, SS.GROUND_Y - b.h); g.stroke();
      }
    },
    drawRock(g, r) {
      const x = sx(r.x), y = sy(r.h / 2), w = r.w * S(), h = r.h * S();
      g.save(); g.translate(x, y);
      const grd = g.createLinearGradient(0, -h / 2, 0, h / 2);
      grd.addColorStop(0, '#a7a9ad'); grd.addColorStop(1, '#5d6066');
      g.fillStyle = grd;
      roundRect(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.35); g.fill();
      g.strokeStyle = '#3e4146'; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(-w * 0.18, -h * 0.22, w * 0.18, h * 0.12, -0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6dbb4c'; g.beginPath(); g.ellipse(w * 0.15, -h / 2 + 3, w * 0.2, 5, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    },

    // draw a piece in local px coords (0,0 = centroid)
    pieceShape(g, type, mat, opts = {}) {
      const P = SS.PIECES[type], sc = opts.scale || S();
      g.beginPath();
      P.verts.forEach(([x, y], i) => { const px = x * sc, py = -y * sc; i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.closePath();
      g.save();
      g.fillStyle = this.patterns[mat];
      if (opts.scale && opts.scale !== S()) { const k = opts.scale / S(); g.save(); g.clip(); g.scale(k, k); g.fillRect(-400, -400, 800, 800); g.restore(); }
      else g.fill();
      // soft 3D shading
      const hw = P.w * sc / 2, hh = P.h * sc / 2;
      const sh = g.createLinearGradient(-hw, -hh, hw, hh);
      sh.addColorStop(0, 'rgba(255,255,255,0.28)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
      g.fillStyle = sh; g.fill();
      g.lineJoin = 'round'; g.lineWidth = Math.max(1.5, sc / 24);
      g.strokeStyle = SS.MATERIALS[mat].dark; g.stroke();
      g.restore();
      if (type === 'roof' && mat !== 'stone') {     // roof shingles lines
        g.save(); g.clip();
        g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1.5;
        for (let i = 1; i < 4; i++) { const yy = (-0.6 + i * 0.22) * -sc * -1; g.beginPath(); g.moveTo(-hw, yy); g.lineTo(hw, yy); g.stroke(); }
        g.restore();
      }
    },
    drawPiece(g, p, alpha = 1) {
      const pos = p.body.getPosition();
      g.save(); g.globalAlpha = alpha;
      g.translate(sx(pos.x), sy(pos.y)); g.rotate(-p.body.getAngle());
      this.pieceShape(g, p.type, p.mat);
      if (p.flash > 0) { g.globalAlpha = p.flash; g.fillStyle = '#fff'; g.fill(); }
      g.restore();
    },
    drawGhost(g, gh) {
      g.save();
      g.translate(sx(gh.x), sy(gh.y)); g.rotate(-gh.angle);
      g.globalAlpha = 0.85;
      g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 16; g.shadowOffsetY = 10;
      this.pieceShape(g, gh.type, gh.mat);
      g.restore();
      // drop guide
      if (gh.landY != null) {
        g.save(); g.setLineDash([6, 8]); g.strokeStyle = gh.ok ? 'rgba(255,255,255,0.7)' : 'rgba(255,90,90,0.8)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(sx(gh.x), sy(gh.y)); g.lineTo(sx(gh.x), sy(gh.landY)); g.stroke(); g.restore();
        g.save(); g.translate(sx(gh.x), sy(gh.landY)); g.rotate(-gh.angle); g.globalAlpha = 0.25;
        this.pieceShape(g, gh.type, gh.mat); g.restore();
      }
    },

    // ---------- kids ----------
    drawKid(g, kid, mood, t) {
      const look = SS.KID_LOOKS[kid.look % SS.KID_LOOKS.length];
      const pos = kid.body.getPosition();
      const sc = S() / 60;
      const a = this.kidAnim[kid.i] || (this.kidAnim[kid.i] = { blink: Math.random() * 4, jump: 0 });
      a.blink -= 1 / 60; if (a.blink < -0.12) a.blink = 2 + Math.random() * 3;
      let bob = 0, armUp = 0, shiver = 0;
      if (mood === 'happy') { bob = Math.abs(Math.sin(t * 7 + kid.i)) * 14; armUp = 1; }
      else if (mood === 'scared') { shiver = Math.sin(t * 40 + kid.i) * 1.2; armUp = 0.6; }
      else if (mood === 'idle') { bob = Math.sin(t * 2 + kid.i * 2) * 1.2; }
      g.save();
      g.translate(sx(pos.x) + shiver, sy(pos.y) - bob);
      g.scale(sc, sc);
      // shadow
      g.save(); g.translate(0, 27 + bob / sc); g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2); g.fill(); g.restore();
      // legs
      g.fillStyle = look.pants;
      roundRect(g, -9, 8, 8, 16, 3); g.fill(); roundRect(g, 1, 8, 8, 16, 3); g.fill();
      g.fillStyle = '#3b3b48'; roundRect(g, -11, 22, 11, 5, 2.5); g.fill(); roundRect(g, 0, 22, 11, 5, 2.5); g.fill();
      // arms
      g.strokeStyle = look.skin; g.lineWidth = 5; g.lineCap = 'round';
      const wave = mood === 'idle' && kid.i === Math.floor(t / 3) % 3 ? Math.sin(t * 10) * 0.5 : 0;
      for (const side of [-1, 1]) {
        const ang = armUp ? -2.2 + Math.sin(t * 9 + side) * 0.3 * (mood === 'happy') : 0.25 + (side > 0 ? wave : 0);
        g.save(); g.translate(side * 10, -3); g.rotate(side * ang * (armUp ? -1 : 1) * (armUp ? 1 : 1));
        g.beginPath(); g.moveTo(0, 0); g.lineTo(side * 2, 13); g.stroke(); g.restore();
      }
      // body
      const bg = g.createLinearGradient(0, -6, 0, 12);
      bg.addColorStop(0, shade(look.shirt, 1.1)); bg.addColorStop(1, shade(look.shirt, 0.85));
      g.fillStyle = bg; roundRect(g, -11, -6, 22, 18, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(0, 2, 3, 0, Math.PI * 2); g.fill();
      // head
      const hy = -15;
      g.fillStyle = look.skin; g.beginPath(); g.arc(0, hy, 12.5, 0, Math.PI * 2); g.fill();
      // hair
      g.fillStyle = look.hair;
      if (look.style === 'pigtails') {
        g.beginPath(); g.arc(0, hy - 3, 12.5, Math.PI * 1.05, Math.PI * 1.95); g.fill();
        g.beginPath(); g.arc(-13, hy + 1, 5, 0, Math.PI * 2); g.arc(13, hy + 1, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ff5c8a'; g.fillRect(-11, hy - 3, 3, 4); g.fillRect(8, hy - 3, 3, 4);
      } else if (look.style === 'spiky') {
        g.beginPath(); g.moveTo(-13, hy - 2);
        for (let i = 0; i <= 6; i++) g.lineTo(-13 + i * 4.3, hy - 12 - (i % 2 ? 6 : 0));
        g.lineTo(13, hy - 2); g.closePath(); g.fill();
      } else if (look.style === 'puffs') {
        g.beginPath(); g.arc(0, hy - 6, 11, Math.PI, 0); g.fill();
        g.beginPath(); g.arc(-9, hy - 14, 6.5, 0, Math.PI * 2); g.arc(9, hy - 14, 6.5, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = '#e04f4f'; g.beginPath(); g.arc(0, hy - 4, 12.5, Math.PI, 0); g.fill();
        g.fillRect(0, hy - 6, 18, 4);
        g.fillStyle = look.hair; g.fillRect(-12, hy - 4, 5, 6); g.fillRect(8, hy - 4, 4, 5);
      }
      // face
      const blink = a.blink < 0;
      const ex = this.windDir * (mood === 'scared' ? 1.5 : 0);
      g.fillStyle = '#2b2233';
      if (blink || mood === 'happy') {
        g.strokeStyle = '#2b2233'; g.lineWidth = 1.8;
        for (const s of [-4.5, 4.5]) { g.beginPath(); g.arc(s, hy + 1, 2.4, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      } else {
        for (const s of [-4.5, 4.5]) {
          g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s, hy, 3, mood === 'scared' ? 3.8 : 3.4, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2b2233'; g.beginPath(); g.arc(s + ex * 0.6, hy + 0.5, 1.9, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(s + ex * 0.6 - 0.6, hy - 0.4, 0.7, 0, Math.PI * 2); g.fill();
        }
      }
      g.fillStyle = 'rgba(255,120,120,0.45)';
      g.beginPath(); g.arc(-8, hy + 5, 2.5, 0, Math.PI * 2); g.arc(8, hy + 5, 2.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#7a2f3a'; g.fillStyle = '#7a2f3a'; g.lineWidth = 1.6;
      if (mood === 'happy') { g.beginPath(); g.arc(0, hy + 5, 4.5, 0.1, Math.PI - 0.1); g.closePath(); g.fill(); }
      else if (mood === 'scared') { g.beginPath(); g.ellipse(0, hy + 7, 2.2, 2.8, 0, 0, Math.PI * 2); g.fill(); }
      else if (mood === 'sad') { g.beginPath(); g.arc(0, hy + 9, 3.5, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
      else { g.beginPath(); g.arc(0, hy + 4, 3.5, 0.3, Math.PI - 0.3); g.stroke(); }
      // wet drops / sweat
      if (kid.uncoveredNow > 0.3 || kid.wet) {
        g.fillStyle = 'rgba(120,190,255,0.9)';
        for (let i = 0; i < 3; i++) { const dy = ((t * 60 + i * 9) % 26); g.beginPath(); g.arc(-10 + i * 10, hy - 12 + dy, 1.8, 0, Math.PI * 2); g.fill(); }
      }
      g.restore();
    },

    // ---------- frame ----------
    draw(state, dt) {
      const g = this.ctx;
      this.t += dt;
      const sc = this.canvas.width / W;
      g.setTransform(sc, 0, 0, sc, 0, 0);
      // weather state
      this.windVis += ((state.windVis || 0) - this.windVis) * Math.min(1, dt * 3);
      this.windDir = state.windDir || 1;
      this.rain += ((state.rain || 0) - this.rain) * Math.min(1, dt * 2);
      this.gloom += ((state.gloom || 0) - this.gloom) * Math.min(1, dt * 1.5);
      this.rainbow = state.rainbow || 0;
      this.spawnWeather(dt);
      this.updateParticles(dt, this.windDir * this.windVis);

      let shx = 0, shy = 0;
      if (this.shake > 0) { this.shake -= dt; shx = (Math.random() - 0.5) * 8 * this.shake; shy = (Math.random() - 0.5) * 8 * this.shake; }
      g.save(); g.translate(shx, shy);

      this.drawSky(g, state.storm);
      if (this.bolt) {
        this.bolt.life -= dt;
        g.save(); g.strokeStyle = 'rgba(255,255,230,0.95)'; g.lineWidth = 4; g.shadowColor = '#fff'; g.shadowBlur = 20;
        g.beginPath(); this.bolt.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore();
        if (this.bolt.life <= 0) this.bolt = null;
      }
      this.drawClouds(g, dt);
      this.drawHills(g);
      this.drawTornado(g, state.tornado || 0, state.tornadoSide || 1);
      this.drawTrees(g, 0);
      this.drawTrees(g, 1);
      this.drawGround(g);

      // build zone hint
      if (state.phase === 'build' && state.dragging) {
        g.save(); g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(sx(SS.BUILD_MIN_X), 40, sx(SS.BUILD_MAX_X) - sx(SS.BUILD_MIN_X), SS.GROUND_Y - 40); g.restore();
      }
      if (state.sim) {
        const sim = state.sim;
        for (const r of sim.rocks) this.drawRock(g, r);
        for (const p of sim.pieces) if (!p.lost) this.drawPiece(g, p);
        // glue dots
        if (sim.phase === 'storm') {
          for (const J of sim.joints) {
            if (J.broken) continue;
            const a = J.joint.getAnchorA();
            const stress = Math.min(1, J.load / J.strength);
            g.fillStyle = stress > 0.75 ? '#ff5050' : stress > 0.45 ? '#ffc040' : 'rgba(255,255,255,0.85)';
            g.beginPath(); g.arc(sx(a.x), sy(a.y), 3, 0, Math.PI * 2); g.fill();
            g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.stroke();
          }
        }
        for (const k of sim.kids) {
          let mood = 'idle';
          if (state.result) mood = state.result.win ? 'happy' : 'sad';
          else if (sim.phase === 'storm') mood = (k.exposedNow > 0.15 || k.uncoveredNow > 0.3) ? 'scared' : 'idle';
          else if (state.gloom > 0.55) mood = 'scared';
          this.drawKid(g, k, mood, this.t);
        }
      }
      if (state.ghost) this.drawGhost(g, state.ghost);

      // particles
      for (const p of this.particles) {
        const lifeK = 1 - p.age / p.life;
        if (p.kind === 'rain') { g.strokeStyle = 'rgba(190,215,255,0.55)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02); g.stroke(); }
        else if (p.kind === 'splash') { g.strokeStyle = `rgba(200,225,255,${lifeK})`; g.lineWidth = 1; g.beginPath(); g.ellipse(p.x, p.y, 2 + (1 - lifeK) * 6, 1.5, 0, Math.PI, 0); g.stroke(); }
        else if (p.kind === 'streak') { g.strokeStyle = `rgba(255,255,255,${0.28 * Math.min(1, this.windVis * 1.5)})`; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.quadraticCurveTo(p.x - Math.sign(p.vx) * p.len * 0.5, p.y - 6, p.x - Math.sign(p.vx) * p.len, p.y); g.stroke(); }
        else if (p.kind === 'leaf') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color; g.beginPath(); g.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
        else if (p.kind === 'dust') { g.fillStyle = p.color.replace('A', String(0.5 * lifeK)); g.beginPath(); g.arc(p.x, p.y, p.r * (1.5 - lifeK * 0.5), 0, Math.PI * 2); g.fill(); }
        else if (p.kind === 'chip' || p.kind === 'confetti') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, lifeK * 2); g.fillStyle = p.color; g.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2); g.restore(); }
        else if (p.kind === 'spark') { g.fillStyle = `rgba(255,246,168,${lifeK})`; g.beginPath(); g.arc(p.x, p.y, p.r * lifeK + 1, 0, Math.PI * 2); g.fill(); }
      }
      // storm darkness vignette + flash
      if (this.gloom > 0.2) {
        const v = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 820);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(10,15,30,${(this.gloom - 0.2) * 0.5})`);
        g.fillStyle = v; g.fillRect(0, 0, W, H);
      }
      if (this.flash > 0) { g.fillStyle = `rgba(255,255,255,${this.flash * 0.6})`; g.fillRect(0, 0, W, H); this.flash = Math.max(0, this.flash - dt * 3); }
      g.restore();
    },

    // small preview canvas for tray / UI
    preview(canvas, type, mat) {
      const c = canvas.getContext('2d');
      const P = SS.PIECES[type];
      const box = Math.min(canvas.width, canvas.height) * 0.8;
      const sc = box / Math.max(P.w, P.h);
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.save(); c.translate(canvas.width / 2, canvas.height / 2 + (type === 'roof' ? sc * 0.15 : 0));
      if (!this.patterns) this.patterns = {};
      const old = this.patterns;
      this.patterns = {}; for (const m of SS.MATERIAL_ORDER) this.patterns[m] = c.createPattern(textures[m], 'repeat');
      this.pieceShape(c, type, mat, { scale: sc });
      this.patterns = old;
      c.restore();
    },
    sx, sy
  };
  SS.Render = R;
})(window);
