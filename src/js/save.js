// StormShelter - settings and the three save slots (stored in localStorage)
// Copyright (C) 2026 Shawn Rapaz. Licensed under the GNU GPL v3.0.
(function (G) {
  const SS = G.SS;
  const KEY_SET = 'stormshelter.settings';
  const KEY_SLOT = (i) => 'stormshelter.slot' + i;

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }

  const Save = {
    settings: Object.assign({ bgm: true, sfx: true, difficulty: 'easy', lastSlot: 0 }, read(KEY_SET, {})),
    saveSettings() { write(KEY_SET, this.settings); },

    newSlot(name) {
      return {
        version: SS.VERSION, name: name || 'Player', created: Date.now(), updated: Date.now(),
        unlocked: { easy: 1, medium: 1, hard: 1 },
        levels: { easy: {}, medium: {}, hard: {} },  // n -> {stars, score, attempts, wins, best}
        totalScore: 0, playTime: 0, attempts: 0, wins: 0,
        mistakes: {},              // key -> count
        history: [],               // most recent attempts (max 60)
        inProgress: null           // a saved, unfinished build
      };
    },
    load(i) {
      const s = read(KEY_SLOT(i), null);
      if (!s) return null;
      // forward-compatible defaults
      const base = this.newSlot(s.name);
      return Object.assign(base, s, {
        unlocked: Object.assign(base.unlocked, s.unlocked || {}),
        levels: Object.assign(base.levels, s.levels || {})
      });
    },
    store(i, slot) { slot.updated = Date.now(); return write(KEY_SLOT(i), slot); },
    remove(i) { try { localStorage.removeItem(KEY_SLOT(i)); } catch (e) { /* ignore */ } },
    all() { return [0, 1, 2].map((i) => this.load(i)); },

    // record one finished attempt
    recordAttempt(slot, diff, n, res) {
      const L = slot.levels[diff];
      const rec = L[n] || (L[n] = { stars: 0, score: 0, attempts: 0, wins: 0 });
      rec.attempts++; slot.attempts++;
      if (res.win) {
        rec.wins++; slot.wins++;
        if (res.score > rec.score) { slot.totalScore += res.score - rec.score; rec.score = res.score; }
        rec.stars = Math.max(rec.stars, res.stars);
        if (n >= slot.unlocked[diff] && n < 100) slot.unlocked[diff] = n + 1;
      } else {
        for (const m of res.reasons) slot.mistakes[m] = (slot.mistakes[m] || 0) + 1;
      }
      slot.history.unshift({ t: Date.now(), diff, n, win: res.win, stars: res.stars || 0, score: res.score || 0,
        reasons: res.reasons, storm: res.storm, timeUsed: res.timeUsed });
      if (slot.history.length > 60) slot.history.length = 60;
    }
  };
  SS.Save = Save;
})(window);
