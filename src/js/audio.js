// StormShelter - procedural audio: ambient music + sound effects (Web Audio)
// Copyright (C) 2026 Shawn Rapaz. Licensed under the GNU GPL v3.0.
(function (G) {
  const SS = G.SS;
  const A = {
    ctx: null, master: null, musicBus: null, sfxBus: null, reverb: null,
    bgmOn: true, sfxOn: true, musicTimer: null, nextBar: 0, bar: 0,
    windNode: null, rainNode: null, duck: 1
  };

  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // gentle progression: Cmaj9 - Am9 - Fmaj9 - G6sus  (midi notes)
  const CHORDS = [
    [48, 55, 60, 64, 67, 71, 74],
    [45, 52, 57, 60, 64, 67, 71],
    [41, 48, 53, 57, 60, 64, 67],
    [43, 50, 55, 60, 62, 64, 69]
  ];
  const PENTA = [72, 74, 76, 79, 81, 84, 86, 88];

  A.init = function () {
    if (A.ctx) return;
    const AC = G.AudioContext || G.webkitAudioContext;
    if (!AC) return;
    const ctx = A.ctx = new AC();
    A.master = ctx.createGain(); A.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3;
    A.master.connect(comp).connect(ctx.destination);
    A.musicBus = ctx.createGain(); A.musicBus.gain.value = A.bgmOn ? 0.55 : 0;
    A.sfxBus = ctx.createGain(); A.sfxBus.gain.value = A.sfxOn ? 0.9 : 0;
    A.reverb = ctx.createConvolver(); A.reverb.buffer = impulse(ctx, 3.2, 2.4);
    const revGain = ctx.createGain(); revGain.gain.value = 0.55;
    A.reverb.connect(revGain).connect(A.master);
    A.musicBus.connect(A.master);
    A.sfxBus.connect(A.master);
    A.noiseBuf = noiseBuffer(ctx, 2);
    A.nextBar = ctx.currentTime + 0.2;
    A.musicTimer = setInterval(scheduleMusic, 200);
  };

  A.resume = function () { A.init(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };

  A.setBgm = function (on) {
    A.bgmOn = on;
    if (A.ctx) A.musicBus.gain.setTargetAtTime(on ? 0.55 * A.duck : 0, A.ctx.currentTime, 0.4);
  };
  A.setSfx = function (on) {
    A.sfxOn = on;
    if (A.ctx) A.sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, A.ctx.currentTime, 0.05);
    if (!on) { A.setWind(0); A.setRain(0); }
  };
  A.setDuck = function (d) {
    A.duck = d;
    if (A.ctx && A.bgmOn) A.musicBus.gain.setTargetAtTime(0.55 * d, A.ctx.currentTime, 0.6);
  };

  function impulse(ctx, secs, decay) {
    const len = Math.floor(ctx.sampleRate * secs);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function noiseBuffer(ctx, secs) {
    const len = Math.floor(ctx.sampleRate * secs);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {        // soft pinkish noise
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
    return buf;
  }

  // ---------------- music ----------------
  const BAR = 6.4; // seconds per chord (slow + calm)
  function scheduleMusic() {
    const ctx = A.ctx;
    if (!ctx) return;
    while (A.nextBar < ctx.currentTime + 1.0) {
      const t = A.nextBar;
      const chord = CHORDS[A.bar % CHORDS.length];
      // warm pad
      chord.slice(1, 5).forEach((n, i) => pad(NOTE(n), t + i * 0.08, BAR + 1.5));
      // soft bass
      pad(NOTE(chord[0] - 12), t, BAR, 0.11, 'sine', 300);
      // kalimba-like twinkles from the pentatonic scale
      const count = 3 + Math.floor(Math.random() * 4);
      let tt = t + 0.4;
      for (let i = 0; i < count; i++) {
        tt += 0.5 + Math.random() * 1.2;
        if (tt > t + BAR - 0.2) break;
        const pool = PENTA.filter((p) => chord.some((c) => (p - c) % 12 === 0) || Math.random() < 0.4);
        bell(NOTE(pool[Math.floor(Math.random() * pool.length)]), tt, 0.07 + Math.random() * 0.04);
      }
      A.bar++;
      A.nextBar += BAR;
    }
  }
  function pad(freq, t, dur, vol = 0.05, type = 'triangle', cutoff = 1100) {
    const ctx = A.ctx;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.3;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 2.2);
    g.gain.setValueAtTime(vol, t + dur - 2);
    g.gain.linearRampToValueAtTime(0, t + dur);
    [-6, 6].forEach((det) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.1);
    });
    f.connect(g); g.connect(A.musicBus); g.connect(A.reverb);
  }
  function bell(freq, t, vol) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    m.type = 'sine'; m.frequency.value = freq * 3.01; mg.gain.setValueAtTime(freq * 0.6, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.8);
    m.connect(mg).connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g); g.connect(A.musicBus); g.connect(A.reverb);
    o.start(t); m.start(t); o.stop(t + 2.5); m.stop(t + 2.5);
  }

  // ---------------- sound effects ----------------
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(freq, dur, vol = 0.2, type = 'sine', when = 0, slide = 0) {
    const ctx = A.ctx; if (!ctx || !A.sfxOn) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    env(g, t, 0.008, vol, dur);
    o.connect(g).connect(A.sfxBus); g.connect(A.reverb);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, q = 1, type = 'bandpass', when = 0, toFreq) {
    const ctx = A.ctx; if (!ctx || !A.sfxOn) return;
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, vol, dur);
    s.connect(f).connect(g).connect(A.sfxBus);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  const MAT_PITCH = { straw: 1.6, wood: 1.0, brick: 0.7, stone: 0.55 };
  A.sfx = {
    click() { tone(880, 0.08, 0.12, 'sine'); tone(1320, 0.06, 0.06, 'sine', 0.03); },
    hover() { tone(1200, 0.04, 0.03, 'sine'); },
    pick(mat) { const p = MAT_PITCH[mat] || 1; tone(520 * p, 0.12, 0.12, 'triangle', 0, 1.5); },
    place(mat) {
      const p = MAT_PITCH[mat] || 1;
      if (mat === 'straw') noise(0.18, 0.25, 2500, 0.8);
      else { noise(0.12, 0.35, 900 * p, 2); tone(180 * p, 0.15, 0.25, 'sine', 0, 0.6); }
    },
    land(mat, v) {
      const p = MAT_PITCH[mat] || 1; const vol = Math.min(0.3, 0.05 + v * 0.05);
      noise(0.08, vol, 700 * p, 2.5); tone(140 * p, 0.1, vol * 0.8, 'sine', 0, 0.7);
    },
    rotate() { tone(660, 0.06, 0.1, 'square'); tone(990, 0.06, 0.06, 'square', 0.05); },
    remove() { tone(600, 0.15, 0.12, 'sine', 0, 0.5); },
    deny() { tone(220, 0.12, 0.12, 'triangle'); tone(180, 0.15, 0.12, 'triangle', 0.1); },
    tick(urgent) { tone(urgent ? 1046 : 784, 0.07, urgent ? 0.14 : 0.08, 'sine'); },
    siren() {
      for (let i = 0; i < 3; i++) { tone(660, 0.35, 0.09, 'triangle', i * 0.8, 1.25); tone(825, 0.35, 0.09, 'triangle', i * 0.8 + 0.4, 0.8); }
    },
    whoosh() { noise(1.2, 0.35, 300, 0.8, 'bandpass', 0, 1800); },
    break(mat) { const p = MAT_PITCH[mat] || 1; noise(0.25, 0.4, 1800 * p, 1.2); tone(320 * p, 0.12, 0.15, 'sawtooth', 0, 0.4); },
    thunder() {
      noise(2.6, 0.55, 120, 0.6, 'lowpass', 0, 60);
      noise(0.5, 0.35, 900, 0.5, 'lowpass', 0.05, 200);
    },
    oops() { tone(392, 0.25, 0.12, 'triangle', 0, 0.9); tone(330, 0.35, 0.12, 'triangle', 0.25, 0.85); },
    win() {
      const seq = [72, 76, 79, 84, 88];
      seq.forEach((n, i) => { tone(NOTE(n), 0.35, 0.13, 'triangle', i * 0.11); tone(NOTE(n + 12), 0.25, 0.04, 'sine', i * 0.11); });
      tone(NOTE(84), 1.2, 0.08, 'sine', 0.6); tone(NOTE(88), 1.2, 0.06, 'sine', 0.6); tone(NOTE(91), 1.2, 0.05, 'sine', 0.6);
    },
    lose() { [67, 64, 60, 55].forEach((n, i) => tone(NOTE(n), 0.4, 0.1, 'triangle', i * 0.22)); },
    star(i) { tone(NOTE(84 + i * 4), 0.4, 0.13, 'sine'); tone(NOTE(96 + i * 4), 0.3, 0.05, 'sine', 0.02); },
    cheer() { for (let i = 0; i < 6; i++) tone(NOTE(79 + Math.floor(Math.random() * 12)), 0.12, 0.05, 'sine', i * 0.07); }
  };

  // ---------------- continuous ambience ----------------
  function loopNoise(filterType, freq, q) {
    const ctx = A.ctx;
    const s = ctx.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f).connect(g).connect(A.sfxBus);
    s.start();
    return { s, f, g };
  }
  A.setWind = function (level, dirty) {   // level 0..1+
    if (!A.ctx) return;
    if (!A.windNode) A.windNode = loopNoise('bandpass', 400, 0.7);
    const t = A.ctx.currentTime, w = A.windNode;
    const lv = A.sfxOn ? Math.min(1.2, level) : 0;
    w.g.gain.setTargetAtTime(lv * 0.65, t, 0.25);
    w.f.frequency.setTargetAtTime(250 + lv * 650 + (dirty ? Math.random() * 200 : 0), t, 0.3);
  };
  A.setRain = function (level) {
    if (!A.ctx) return;
    if (!A.rainNode) A.rainNode = loopNoise('highpass', 2500, 0.4);
    A.rainNode.g.gain.setTargetAtTime(A.sfxOn ? level * 0.28 : 0, A.ctx.currentTime, 0.4);
  };

  SS.Audio = A;
})(window);
