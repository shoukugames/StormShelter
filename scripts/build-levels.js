// Generates and verifies all 100 levels for each difficulty.
// Every level ships with a known-good "reference shelter" that was simulated
// (with a safety margin) using the real game physics. Output: src/js/levels-data.js
// Usage: node scripts/build-levels.js
global.planck = require('planck');
require('../src/js/data.js');
require('../src/js/physics.js');
const fs = require('fs');
const path = require('path');
const SS = globalThis.SS;

function rngFrom(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r2 = (v) => Math.round(v * 100) / 100;

const COMBOS = [
  { wall: 'blocks', wm: 'straw', rm: 'straw' },
  { wall: 'posts', wm: 'wood', rm: 'wood' },
  { wall: 'blocks', wm: 'wood', rm: 'wood' },
  { wall: 'blocks', wm: 'brick', rm: 'wood' },
  { wall: 'blocks', wm: 'brick', rm: 'brick' },
  { wall: 'blocks', wm: 'stone', rm: 'brick' },
  { wall: 'blocks', wm: 'stone', rm: 'stone' },
  { wall: 'posts', wm: 'stone', rm: 'stone' }
];

function shelterFor(group, combo, rain, dir) {
  const K = SS.KID;
  const L = Math.min(...group) - K.w / 2 - 0.12, R = Math.max(...group) + K.w / 2 + 0.12;
  const w = combo.wall === 'blocks' ? 0.8 : 0.4;
  const d = [];
  const sides = rain ? [L - w / 2, R + w / 2] : [dir > 0 ? L - w / 2 : R + w / 2];
  for (const xc of sides) {
    if (combo.wall === 'blocks') {
      d.push({ type: 'block', mat: combo.wm, x: r2(xc), y: 0.405 });
      d.push({ type: 'block', mat: combo.wm, x: r2(xc), y: 1.21 });
    } else d.push({ type: 'post', mat: combo.wm, x: r2(xc), y: 0.805 });
  }
  if (rain) {
    const len = R - L + 2 * w;
    d.push({ type: len <= 2.4 ? 'plank' : 'beam', mat: combo.rm, x: r2((L + R) / 2), y: 1.765 });
  }
  return d;
}

function layout(n) {
  const rnd = rngFrom(n * 7919 + 17);
  const storm = SS.stormFor(n);
  const rain = n >= 4;
  const dir = n <= 10 ? 1 : (rnd() < 0.4 ? -1 : 1);
  let count = n <= 5 ? 1 : n <= 15 ? 2 : (rnd() < 0.2 ? 2 : 3);
  const split = n >= 40 && n % 5 === 0;
  const groups = [];
  const looks = [0, 1, 2, 3].sort(() => rnd() - 0.5);
  if (split) {
    count = 3;
    const a = rnd() < 0.5 ? 1 : 2;
    const c1 = 12.8 - 2.9 + (rnd() - 0.5) * 1.2, c2 = 12.8 + 2.9 + (rnd() - 0.5) * 1.2;
    groups.push(spread(c1, a), spread(c2, 3 - a));
  } else {
    groups.push(spread(12.8 + (rnd() - 0.5) * 6, count));
  }
  const kids = [];
  let li = 0;
  for (const g of groups) for (const x of g) kids.push({ x: r2(x), look: looks[li++ % 4] });
  const rocks = [];
  if (n >= 25 && !split && rnd() < 0.3) {
    const g = groups[0];
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side < 0 ? Math.min(...g) - 3.2 - rnd() : Math.max(...g) + 3.2 + rnd();
    rocks.push({ x: r2(x), w: r2(0.7 + rnd() * 0.5), h: r2(0.45 + rnd() * 0.3), i: 0 });
  }
  return { n, storm: storm.id, stormName: storm.name, rain, dir, groups, kids, rocks, rnd,
    q: r2(2.5 + (n - 1) * 0.2), lift: storm.lift, flip: storm.flip, gust: storm.gust };
}
function spread(c, k) { const out = []; for (let i = 0; i < k; i++) out.push(c + (i - (k - 1) / 2) * 0.65); return out; }

function test(lv, design, diff, qMul) {
  const sim = new SS.Sim({ ...lv, q: lv.q * qMul }, { difficulty: diff });
  return sim.runDesign(design);
}

function hintFor(n, lv) {
  const H = {
    1: 'Tap a piece in the box, then tap where it goes. Build a wall to block the wind!',
    2: 'Use the turn button to spin a piece you are holding. Make the wall taller than the kids!',
    4: 'Rain is coming! Put a roof on top of the kids.',
    6: 'Two friends this time. Make the house big enough!',
    11: 'Look at the arrow - the wind can blow from the other side!',
    13: 'A gale is coming! Light straw blows away. Try stronger pieces.',
    16: 'Three friends! Use a long plank for the roof.',
    25: 'Big rocks cannot move. You can build next to them!',
    33: 'Thunderstorm! Build strong walls and a heavy roof.',
    40: 'The kids are in two groups. Build two houses!',
    55: 'Tornado! The wind will change direction. Walls on both sides!',
    77: 'Hurricane! The strongest storm. Bricks and stone are best!'
  };
  return H[n] || null;
}

const out = {};
const report = [];
for (const diff of ['easy', 'medium', 'hard']) {
  const D = SS.DIFFICULTY[diff];
  out[diff] = [];
  for (let n = 1; n <= 100; n++) {
    const L = layout(n);
    const lv = { kids: L.kids, rocks: L.rocks, q: L.q, dir: L.dir, lift: L.lift, flip: L.flip, gust: L.gust, rain: L.rain };
    let chosen = null, design = null, eased = 1;
    const minCombo = n <= 3 ? 0 : 0;
    while (!chosen) {
      for (let ci = minCombo; ci < COMBOS.length; ci++) {
        const d = [].concat(...L.groups.map((g) => shelterFor(g, COMBOS[ci], L.rain, L.dir)));
        const lvE = { ...lv, q: lv.q * eased };
        if (test(lvE, d, diff, 1.15).win && test(lvE, d, diff, 1.0).win) { chosen = COMBOS[ci]; design = d; break; }
      }
      if (!chosen) eased *= 0.92;
    }
    lv.q = r2(lv.q * eased);
    // ---- supplies ----
    const rnd = rngFrom(n * 104729 + diff.length * 31);
    const sup = {};
    const add = (type, mat, k) => { if (k > 0) sup[type + ':' + mat] = (sup[type + ':' + mat] || 0) + k; };
    for (const p of design) add(p.type, p.mat, 1);
    for (const key of Object.keys(sup)) { const [t, m] = key.split(':'); add(t, m, Math.round(D.extras * (1 + rnd() * 2))); }
    const wi = SS.MATERIAL_ORDER.indexOf(chosen.wm);
    if (wi > 0) {                         // weaker decoy pieces - the puzzle is choosing well
      const weak = SS.MATERIAL_ORDER[Math.floor(rnd() * wi)];
      add('block', weak, 2 + Math.round(rnd() * 3));
      if (L.rain) add(rnd() < 0.5 ? 'plank' : 'beam', weak, 1);
    }
    if (n >= 8 && rnd() < 0.6) add('roof', SS.MATERIAL_ORDER[Math.floor(rnd() * (wi + 1))], 1 + Math.round(rnd()));
    if (n >= 3 && rnd() < 0.5 && chosen.wall === 'blocks') add('post', chosen.wm, 1 + Math.round(rnd() * D.extras));
    if (L.rain && !design.some((p) => p.type === 'beam') && rnd() < 0.35) add('beam', chosen.rm, 1);
    // keep the supply tray small enough for little hands
    const keys = Object.keys(sup);
    if (keys.length > 8) {
      const need = new Set(design.map((p) => p.type + ':' + p.mat));
      for (const k of keys) if (Object.keys(sup).length > 8 && !need.has(k)) delete sup[k];
    }
    out[diff].push({
      n, storm: L.storm, stormName: L.stormName, ...lv, supplies: sup, combo: chosen,
      solution: design, eased: r2(eased), hint: hintFor(n, L)
    });
    report.push(`${diff} ${String(n).padStart(3)} ${L.storm.padEnd(9)} q=${lv.q.toFixed(2).padStart(5)} kids=${L.kids.length} ${chosen.wall}/${chosen.wm}/${chosen.rm} eased=${r2(eased)} sup=${JSON.stringify(sup)}`);
  }
  console.log(`${diff}: done`);
}
fs.writeFileSync(path.join(__dirname, '..', 'src', 'js', 'levels-data.js'),
  '// AUTO-GENERATED by scripts/build-levels.js - do not edit by hand.\n' +
  '// Copyright (C) 2026 Shawn Rapaz. Licensed under the GNU GPL v3.0.\n' +
  '(function (G) { (G.SS || (G.SS = {})).LEVELS = ' + JSON.stringify(out) + '; })(typeof window !== "undefined" ? window : globalThis);\n');
fs.writeFileSync(path.join(__dirname, 'levels-report.txt'), report.join('\n') + '\n');
console.log('wrote src/js/levels-data.js');
