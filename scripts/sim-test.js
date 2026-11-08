// Headless regression test: every shipped level's reference shelter must
// survive its storm, and an empty (no shelter) build must fail.
// Usage: node scripts/sim-test.js
global.planck = require('planck');
require('../src/js/data.js');
require('../src/js/levels-data.js');
require('../src/js/physics.js');
const SS = globalThis.SS;
let bad = 0, total = 0;
const t0 = Date.now();
for (const diff of ['easy', 'medium', 'hard']) {
  for (const L of SS.LEVELS[diff]) {
    total++;
    const ok = new SS.Sim(L, { difficulty: diff }).runDesign(L.solution);
    const empty = new SS.Sim(L, { difficulty: diff }).runDesign([]);
    if (!ok.win || empty.win) { bad++; console.log(`FAIL ${diff} level ${L.n}: reference=${ok.win ? 'ok' : ok.reasons} empty=${empty.win ? 'PASSED?!' : 'fails'}`); }
  }
  console.log(`${diff}: checked 100 levels`);
}
console.log(`${total - bad}/${total} levels OK in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(bad ? 1 : 0);
