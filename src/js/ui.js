// StormShelter - menus, HUD, save slots, parents' report, credits
// Copyright (C) 2026 Shawn Rapaz. Licensed under the GNU GPL v3.0.
(function (G) {
  const SS = G.SS;
  const A = SS.Audio, Save = SS.Save, Game = SS.Game, R = SS.Render;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RELEASE_DATE = 'November 8, 2026';
  const I = SS.icon;
  const SI = (id) => I(SS.STORM_ICON[id]);
  const KID_REASON = {
    noShelter: ['home', 'Build a house around the kids!'],
    noWall: ['wind', 'The wind blew on the kids! Build a wall on the windy side.'],
    noRoof: ['umbrella', 'The kids got wet! Put a roof on top.'],
    roofBlew: ['roofFly', 'The roof blew away! Rest it on two walls.'],
    wallFell: ['brick', 'The walls fell down! Try bigger, heavier pieces.'],
    weak: ['straw', 'Straw is too weak for this storm. Try stronger pieces!']
  };

  const UI = {
    current: 'title', levelTab: 0,

    init() {
      SS.applyIcons();
      const st = Save.settings;
      A.bgmOn = st.bgm; A.sfxOn = st.sfx;
      this.refreshToggles();
      this.refreshDiff();
      // first user gesture starts audio
      const kick = () => { A.resume(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
      window.addEventListener('pointerdown', kick); window.addEventListener('keydown', kick);

      document.querySelectorAll('.btn, .seg button').forEach((b) => b.addEventListener('pointerenter', () => A.sfx.hover()));
      $('btnPlay').onclick = () => { A.sfx.click(); this.show('slots'); };
      $('diffSeg').onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        Save.settings.difficulty = b.dataset.diff; Save.saveSettings(); this.refreshDiff(); A.sfx.click();
      };
      $('btnBgm').onclick = () => { Save.settings.bgm = !Save.settings.bgm; Save.saveSettings(); A.resume(); A.setBgm(Save.settings.bgm); this.refreshToggles(); A.sfx.click(); };
      $('btnSfx').onclick = () => { Save.settings.sfx = !Save.settings.sfx; Save.saveSettings(); A.resume(); A.setSfx(Save.settings.sfx); this.refreshToggles(); A.sfx.click(); };
      $('btnParents').onclick = () => { A.sfx.click(); this.parentGate(() => this.showParents(Save.settings.lastSlot || 0)); };
      $('btnCredits').onclick = () => { A.sfx.click(); this.showCredits(); };
      $('btnFull').onclick = () => { A.sfx.click(); this.fullscreen(); };
      $('btnQuit').onclick = () => { A.sfx.click(); this.confirm('Quit StormShelter?', 'See you next time!', () => { if (window.ssNative) window.ssNative.quit(); else window.close(); }); };
      document.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => { A.sfx.click(); this.show(b.dataset.go); });
      $('btnPause').onclick = () => { A.sfx.click(); this.pause(); };
      $('btnUndo').onclick = () => Game.undo();
      $('btnClear').onclick = () => Game.clearAll();
      $('btnDone').onclick = () => { A.sfx.click(); Game.done(); };
      $('btnHintClose').onclick = () => this.hideHint();
      $('btnSpeak').onclick = () => this.speak($('hintText').textContent);
      $('btnResume').onclick = () => {
        const slot = Save.load(this.slotIdx);
        if (slot && slot.inProgress) { A.sfx.click(); Save.settings.difficulty = slot.inProgress.diff; Save.saveSettings(); Game.startLevel(slot.inProgress.n, slot.inProgress.diff, this.slotIdx, slot.inProgress); }
      };
    },

    refreshToggles() {
      const st = Save.settings;
      $('btnBgm').innerHTML = `${I(st.bgm ? 'music' : 'musicOff')} Music: <b>${st.bgm ? 'On' : 'Off'}</b>`; $('btnBgm').classList.toggle('off', !st.bgm);
      $('btnSfx').innerHTML = `${I(st.sfx ? 'soundOn' : 'soundMute')} Sounds: <b>${st.sfx ? 'On' : 'Off'}</b>`; $('btnSfx').classList.toggle('off', !st.sfx);
    },
    refreshDiff() {
      document.querySelectorAll('#diffSeg button').forEach((b) => b.classList.toggle('on', b.dataset.diff === Save.settings.difficulty));
    },

    show(id) {
      document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
      this.current = id;
      this.closeModal();
      if (id === 'title') { Game.quitToTitle(false); }
      if (id === 'slots') this.renderSlots();
      if (id === 'levels') this.renderLevels();
    },

    // ---------------- save slots ----------------
    renderSlots() {
      const diff = Save.settings.difficulty;
      $('slotsDiff').innerHTML = `Difficulty: <b>${SS.DIFFICULTY[diff].name}</b>`;
      const list = $('slotList'); list.innerHTML = '';
      Save.all().forEach((slot, i) => {
        const el = document.createElement('div');
        if (!slot) {
          el.className = 'slot empty';
          el.innerHTML = `<h3>Save ${i + 1}</h3>${avatar(i, true)}<div class="meta">Empty</div><div class="actions"><button class="btn green">${I('plus')} New Game</button></div>`;
          el.querySelector('.btn').onclick = () => { A.sfx.click(); this.newGame(i); };
        } else {
          const stars = totalStars(slot), done = levelsDone(slot);
          el.className = 'slot';
          el.innerHTML = `<button class="btn round tiny del" title="Delete save">${I('trash')}</button><h3>${esc(slot.name)}</h3>${avatar(i)}
            <div class="meta"><div class="stars-big">${I('star')} ${stars}</div>
            Levels done: <b>${done.easy + done.medium + done.hard}</b><br>
            Next level (${SS.DIFFICULTY[diff].name}): <b>${slot.unlocked[diff]}</b><br>
            Score: <b>${slot.totalScore.toLocaleString()}</b><br>
            <small>Last played ${new Date(slot.updated).toLocaleDateString()}</small>
            ${slot.inProgress ? `<br><b style="color:#2f9a3e">${I('pause')} Game in progress</b>` : ''}</div>
            <div class="actions"><button class="btn green play">${I('play')} Continue</button></div>`;
          el.querySelector('.play').onclick = () => { A.sfx.click(); this.openSlot(i); };
          el.querySelector('.del').onclick = () => { A.sfx.click(); this.confirm(`Delete ${esc(slot.name)}?`, 'All stars and progress in this save will be lost.', () => { Save.remove(i); this.renderSlots(); }, 'Delete', 'red'); };
        }
        list.appendChild(el);
      });
    },
    newGame(i) {
      this.modal(`<h2>New Game</h2><p>What's your name?</p><input class="name" id="nameIn" maxlength="16" value="Player ${i + 1}"><div class="btns"><button class="btn" id="ngCancel">Back</button><button class="btn green" id="ngOk">${I('play')} Start</button></div>`);
      const inp = $('nameIn'); inp.focus(); inp.select();
      const go = () => { const s = Save.newSlot(inp.value.trim() || `Player ${i + 1}`); Save.store(i, s); A.sfx.click(); this.openSlot(i); };
      $('ngOk').onclick = go; inp.onkeydown = (e) => { if (e.key === 'Enter') go(); e.stopPropagation(); };
      $('ngCancel').onclick = () => this.closeModal();
    },
    openSlot(i) {
      this.slotIdx = i; Save.settings.lastSlot = i; Save.saveSettings();
      const slot = Save.load(i);
      const diff = Save.settings.difficulty;
      this.levelTab = Math.max(0, SS.STORMS.findIndex((s) => slot.unlocked[diff] >= s.from && slot.unlocked[diff] <= s.to));
      this.show('levels');
    },

    // ---------------- level select ----------------
    renderLevels() {
      const slot = Save.load(this.slotIdx); if (!slot) return this.show('slots');
      const diff = Save.settings.difficulty;
      $('levelsTitle').textContent = `${slot.name} · ${SS.DIFFICULTY[diff].name}`;
      const stars = Object.values(slot.levels[diff]).reduce((a, r) => a + (r.stars || 0), 0);
      $('levelsStats').innerHTML = `${I('star')} ${stars} / 300 &nbsp; · &nbsp; ${slot.totalScore.toLocaleString()} pts`;
      if (slot.inProgress) {
        $('resumeBar').classList.remove('hidden');
        $('resumeText').innerHTML = `${I('pause')} Level ${slot.inProgress.n} (${SS.DIFFICULTY[slot.inProgress.diff].name}) · ${slot.inProgress.timeLeft}s left`;
      } else $('resumeBar').classList.add('hidden');
      const tabs = $('stormTabs'); tabs.innerHTML = '';
      SS.STORMS.forEach((s, i) => {
        const b = document.createElement('button');
        b.innerHTML = `${SI(s.id)} ${s.name} ${s.from}-${s.to}`;
        b.className = i === this.levelTab ? 'on' : '';
        b.onclick = () => { A.sfx.click(); this.levelTab = i; this.renderLevels(); };
        tabs.appendChild(b);
      });
      const grid = $('levelGrid'); grid.innerHTML = '';
      const S = SS.STORMS[this.levelTab];
      for (let n = S.from; n <= S.to; n++) {
        const rec = slot.levels[diff][n];
        const locked = n > slot.unlocked[diff];
        const b = document.createElement('button');
        b.className = `lvl s-${S.id}${locked ? ' locked' : ''}${n === slot.unlocked[diff] && !(rec && rec.wins) ? ' current' : ''}`;
        b.innerHTML = locked ? `${I('lock', 'lock')}<small></small>` : `${n}<small>${rec && rec.stars ? I('star').repeat(rec.stars) + I('starEmpty').repeat(3 - rec.stars) : ''}</small>`;
        if (!locked) b.onclick = () => { A.sfx.click(); Game.startLevel(n, diff, this.slotIdx); };
        grid.appendChild(b);
      }
      grid.style.gridTemplateColumns = `repeat(${Math.min(11, S.to - S.from + 1 > 20 ? 11 : 10)}, 1fr)`;
    },

    // ---------------- HUD ----------------
    showHud(game) {
      document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'hud'));
      this.current = 'hud'; this.closeModal();
      const L = game.level, storm = SS.stormFor(L.n);
      $('hudLevel').textContent = `Level ${L.n}`;
      $('hudStorm').innerHTML = `${SI(storm.id)} ${storm.name}`;
      const w = I('warning');
      $('warnText').innerHTML = `${w} WEATHER WARNING ${w} &nbsp;${storm.name.toUpperCase()} with high winds${L.rain ? ' and heavy rain' : ''} is on the way! Build a strong shelter to keep the kids safe! &nbsp; ${w} WEATHER WARNING ${w} &nbsp;${storm.name.toUpperCase()} approaching!`;
      $('warning').classList.remove('storm');
      this.windDir(L.dir, L);
      $('tray').classList.remove('disabled');
      $('stormCount').classList.add('hidden');
      $('stormBanner').classList.add('hidden');
      this.updateTimer(game.timeLeft);
      if (L.hint) { $('hintText').textContent = L.hint; $('hint').classList.remove('hidden'); clearTimeout(this.hintT); this.hintT = setTimeout(() => this.hideHint(), 14000); }
      else this.hideHint();
    },
    hideHint() { $('hint').classList.add('hidden'); },
    windDir(dir, L) {
      const chip = $('windChip');
      chip.classList.toggle('left', dir < 0);
      $('windLabel').textContent = L && L.flip ? 'Twisting!' : 'Wind';
    },
    updateTimer(t) {
      const s = Math.max(0, Math.ceil(t));
      $('timerText').textContent = s;
      $('timerRing').style.strokeDashoffset = String(276.46 * (1 - t / SS.BUILD_TIME));
      $('timer').classList.toggle('low', s <= 30 && s > 10);
      $('timer').classList.toggle('critical', s <= 10);
    },
    renderTray(game, bumpKey) {
      const wrap = $('trayItems'); wrap.innerHTML = '';
      const keys = Object.keys(game.level.supplies).sort((a, b) => {
        const [ta, ma] = a.split(':'), [tb, mb] = b.split(':');
        return SS.MATERIAL_ORDER.indexOf(ma) - SS.MATERIAL_ORDER.indexOf(mb) || SS.PIECE_ORDER.indexOf(ta) - SS.PIECE_ORDER.indexOf(tb);
      });
      for (const k of keys) {
        const [type, mat] = k.split(':');
        const n = game.supplies[k] || 0;
        const it = document.createElement('div');
        it.className = 'item' + (n ? '' : ' empty') + (k === bumpKey ? ' bump' : '');
        it.title = `${SS.MATERIALS[mat].name} ${SS.PIECES[type].name}`;
        const cv = document.createElement('canvas'); cv.width = 168; cv.height = 144;
        it.appendChild(cv);
        it.insertAdjacentHTML('beforeend', `<span class="lbl">${SS.MATERIALS[mat].name}</span><span class="count">${n}</span>`);
        R.preview(cv, type, mat);
        it.addEventListener('pointerdown', (e) => {
          if (game.phase !== 'build') return;
          if (!game.supplies[k]) { A.sfx.deny(); return; }
          e.preventDefault();
          game.supplies[k]--;
          this.renderTray(game);
          game.beginDrag(type, mat, 'tray', e, (type === 'post' || type === 'block' || type === 'roof') ? 0 : 0);
        });
        wrap.appendChild(it);
      }
    },
    dragging(on) { document.body.style.cursor = on ? 'grabbing' : ''; },

    stormBegins(game) {
      this.hideHint();
      $('tray').classList.add('disabled');
      $('warning').classList.add('storm');
      const storm = SS.stormFor(game.level.n);
      $('warnText').innerHTML = `${SI(storm.id)} THE ${storm.name.toUpperCase()} IS HERE! &nbsp;Hold on tight for 5 seconds! &nbsp; ${SI(storm.id)} THE ${storm.name.toUpperCase()} IS HERE!`;
      const b = $('stormBanner'); b.innerHTML = `${SI(storm.id)} Here comes the ${storm.name.toLowerCase()}!`; b.classList.remove('hidden');
      $('timerText').innerHTML = I('bolt');
    },
    stormCount(c) {
      const el = $('stormCount');
      if (!c) { el.classList.add('hidden'); return; }
      $('stormBanner').classList.add('hidden');
      el.textContent = c; el.classList.remove('hidden', 'tick'); void el.offsetWidth; el.classList.add('tick');
    },

    showResult(game, res) {
      $('stormCount').classList.add('hidden');
      const L = game.level;
      const kidNames = game.sim.kids.map((k) => SS.KID_LOOKS[k.look % 4].name);
      let html;
      if (res.win) {
        const b = res.breakdown;
        html = `<h2>${I('party')} Hooray! Everyone is safe! ${I('party')}</h2>
          <div class="stars">${[0, 1, 2].map((i) => `<span class="s" data-i="${i}">${I('star')}</span>`).join('')}</div>
          <div class="score-line">Score: ${res.score.toLocaleString()}</div>
          <div class="score-break">Safe ${b.safe} · Time left ${b.time} · Sturdy house ${b.sturdy} · Spare pieces ${b.spare}${game.diff !== 'easy' ? ` · ×${game.diff === 'hard' ? 2 : 1.5} ${SS.DIFFICULTY[game.diff].name}` : ''}</div>
          <div class="btns"><button class="btn" id="rLevels">${I('list')} Levels</button><button class="btn orange" id="rRetry">${I('restart')} Again</button>${L.n < 100 ? `<button class="btn green" id="rNext">Next ${I('play')}</button>` : ''}</div>`;
      } else {
        const reason = res.reasons[0] || (res.firstFail && res.firstFail.why === 'rain' ? 'noRoof' : 'noWall');
        const [ico, txt] = KID_REASON[reason] || KID_REASON.noShelter;
        const who = res.firstFail ? kidNames[res.firstFail.kid] : 'The kids';
        const extra = res.reasons.slice(1).map((r) => KID_REASON[r] ? `<div class="why"><span class="big">${I(KID_REASON[r][0])}</span><span>${KID_REASON[r][1]}</span></div>` : '').join('');
        html = `<h2>Oh no! ${esc(who)} ${res.firstFail && res.firstFail.why === 'rain' ? 'got wet' : 'got blown about'}!</h2>
          <div class="why"><span class="big">${I(ico)}</span><span>${txt}</span><button class="btn round tiny" id="rSpeak">${I('speaker')}</button></div>${extra}
          <p>Let's try again - you can do it! ${I('heart')}</p>
          <div class="btns"><button class="btn" id="rLevels">${I('list')} Levels</button><button class="btn green" id="rRetry">${I('restart')} Try Again</button></div>`;
      }
      this.modal(html);
      if (res.win) {
        document.querySelectorAll('.panel .stars .s').forEach((s, i) => setTimeout(() => {
          s.classList.add('shown'); if (i < res.stars) { s.classList.add('on'); A.sfx.star(i); }
        }, 300 + i * 380));
      }
      const sp = $('rSpeak'); if (sp) sp.onclick = () => this.speak(sp.previousElementSibling.textContent);
      $('rLevels').onclick = () => { A.sfx.click(); this.show('levels'); Game.makeTitleScene(); };
      $('rRetry').onclick = () => { A.sfx.click(); Game.startLevel(L.n, game.diff, game.slotIdx); };
      const nx = $('rNext'); if (nx) nx.onclick = () => { A.sfx.click(); Game.startLevel(L.n + 1, game.diff, game.slotIdx); };
    },

    // ---------------- pause ----------------
    pause() {
      if (Game.phase !== 'build') return;
      if (Game.drag) Game.cancelDrag();
      Game.phase = 'paused';
      this.modal(`<h2>${I('pause')} Paused</h2>
        <div class="btns" style="flex-direction:column;align-items:center">
          <button class="btn green" id="pResume" style="width:320px">${I('play')} Keep Building</button>
          <button class="btn blue" id="pSave" style="width:320px">${I('save')} Save Game</button>
          <button class="btn orange" id="pRestart" style="width:320px">${I('restart')} Start Over</button>
          <button class="btn purple" id="pLevels" style="width:320px">${I('list')} Save &amp; Levels</button>
          <button class="btn red" id="pTitle" style="width:320px">${I('home')} Save &amp; Title</button>
        </div>`);
      const resume = () => { this.closeModal(); Game.phase = 'build'; };
      $('pResume').onclick = () => { A.sfx.click(); resume(); };
      $('pSave').onclick = () => { A.sfx.click(); const ok = Game.saveProgress(); this.toast(ok ? `${I('save')} Game saved!` : 'Could not save'); };
      $('pRestart').onclick = () => { A.sfx.click(); Game.startLevel(Game.level.n, Game.diff, Game.slotIdx); };
      $('pLevels').onclick = () => { A.sfx.click(); Game.saveProgress(); Game.quitToTitle(false); this.slotIdx = Game.slotIdx; this.show('levels'); };
      $('pTitle').onclick = () => { A.sfx.click(); Game.saveProgress(); this.show('title'); };
    },
    escape(game) {
      if (this.modalOpen()) { if (game.phase === 'paused') { this.closeModal(); game.phase = 'build'; } else if (this.current !== 'hud') this.closeModal(); return; }
      if (this.current === 'hud' && game.phase === 'build') this.pause();
      else if (this.current === 'levels') this.show('slots');
      else if (this.current === 'slots') this.show('title');
    },

    // ---------------- parents ----------------
    parentGate(onPass) {
      const a = 6 + Math.floor(Math.random() * 9), b = 5 + Math.floor(Math.random() * 9), ans = a + b;
      const opts = new Set([ans]); while (opts.size < 4) opts.add(ans + Math.floor(Math.random() * 11) - 5);
      const list = [...opts].sort(() => Math.random() - 0.5);
      this.modal(`<h2>${I('family')} Grown-ups Only</h2><p>Please answer to continue:</p><div class="gate-q">${a} + ${b} = ?</div>
        <div class="gate-a">${list.map((v) => `<button class="btn blue" data-v="${v}">${v}</button>`).join('')}</div>
        <div class="btns"><button class="btn" id="gBack">Back</button></div>`);
      document.querySelectorAll('.gate-a .btn').forEach((btn) => btn.onclick = () => {
        if (+btn.dataset.v === ans) { A.sfx.click(); onPass(); } else { A.sfx.deny(); this.closeModal(); }
      });
      $('gBack').onclick = () => this.closeModal();
    },
    showParents(i) {
      const slot = Save.load(i);
      const tabs = [0, 1, 2].map((k) => { const s = Save.load(k); return `<button data-s="${k}" class="${k === i ? 'on' : ''}">${s ? esc(s.name) : 'Save ' + (k + 1)}</button>`; }).join('');
      let body;
      if (!slot) body = `<p style="text-align:center">This save slot is empty. Progress will appear here once a game is started.</p>`;
      else {
        const done = levelsDone(slot), stars = totalStars(slot);
        const rate = slot.attempts ? Math.round(100 * slot.wins / slot.attempts) : 0;
        const mins = Math.round(slot.playTime / 60);
        const mistakes = Object.entries(slot.mistakes).sort((a, b) => b[1] - a[1]);
        const failsByLevel = {};
        for (const h of slot.history) if (!h.win) failsByLevel[`${h.diff}:${h.n}`] = (failsByLevel[`${h.diff}:${h.n}`] || 0) + 1;
        const tough = Object.entries(failsByLevel).sort((a, b) => b[1] - a[1]).slice(0, 4);
        body = `<div class="grid2">
          <div class="card"><h3>${I('chart')} Progress</h3>
            ${['easy', 'medium', 'hard'].map((d) => `<div class="stat-row"><span>${SS.DIFFICULTY[d].name}</span><b>${done[d]} / 100 levels</b></div><div class="bar ${d[0] === 'm' ? 'm' : d[0] === 'h' ? 'h' : ''}"><div style="width:${done[d]}%"></div></div>`).join('')}
            <div class="stat-row"><span>Stars earned</span><b>${I('star')} ${stars} / 900</b></div>
            <div class="stat-row"><span>Total score</span><b>${slot.totalScore.toLocaleString()}</b></div>
            <div class="stat-row"><span>Attempts / successes</span><b>${slot.attempts} / ${slot.wins} (${rate}%)</b></div>
            <div class="stat-row"><span>Time played</span><b>${mins < 1 ? 'under 1' : mins} min</b></div>
            <div class="stat-row"><span>Save started</span><b>${new Date(slot.created).toLocaleDateString()}</b></div>
          </div>
          <div class="card"><h3>${I('puzzle')} What to practise (things that went wrong)</h3>
            ${mistakes.length ? mistakes.map(([k, n]) => `<div class="mistake"><div class="n">${n}×</div><div><b>${esc(SS.MISTAKES[k] ? SS.MISTAKES[k].label : k)}</b><div class="tip">${esc(SS.MISTAKES[k] ? SS.MISTAKES[k].tip : '')}</div></div></div>`).join('') : `<p>Nothing yet - great job! ${I('party')}</p>`}
            ${tough.length ? `<div style="margin-top:8px;font-size:16px"><b>Trickiest levels:</b> ${tough.map(([k, n]) => { const [d, lv] = k.split(':'); return `Level ${lv} (${SS.DIFFICULTY[d].name}, ${n} tries)`; }).join(', ')}</div>` : ''}
          </div>
        </div>
        <div class="card" style="margin-top:18px"><h3>${I('clock')} Recent attempts</h3>
          ${slot.history.length ? `<table class="hist"><tr><th>When</th><th>Difficulty</th><th>Level</th><th>Storm</th><th>Result</th><th>What went wrong</th><th>Build time</th><th>Score</th></tr>
          ${slot.history.slice(0, 15).map((h) => `<tr><td>${new Date(h.t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>${SS.DIFFICULTY[h.diff].name}</td><td>${h.n}</td><td>${esc(h.storm || '')}</td>
            <td class="${h.win ? 'ok' : 'bad'}">${h.win ? 'Passed ' + I('star').repeat(h.stars) : 'Not yet'}</td>
            <td>${h.win ? '-' : h.reasons.map((r) => esc(SS.MISTAKES[r] ? SS.MISTAKES[r].label : r)).join(', ') || '-'}</td><td>${h.timeUsed != null ? h.timeUsed + 's' : '-'}</td><td>${h.score ? h.score.toLocaleString() : '-'}</td></tr>`).join('')}</table>` : '<p>No attempts yet.</p>'}
        </div>`;
      }
      this.modal(`<h2>${I('family')} For Parents</h2><div class="tabs">${tabs}</div>${body}
        <p style="font-size:16px;text-align:center">StormShelter is designed for ages 3+. Children learn cause and effect, shapes, balance and how materials differ in strength. Sit with younger players and talk about why a shelter stood up or fell down.</p>
        <div class="btns">${slot ? '<button class="btn red" id="parReset">Reset this save</button>' : ''}<button class="btn green" id="parClose">Close</button></div>`, 'wide');
      document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => { A.sfx.click(); this.showParents(+b.dataset.s); });
      $('parClose').onclick = () => { A.sfx.click(); this.closeModal(); };
      const rs = $('parReset');
      if (rs) rs.onclick = () => this.confirm(`Reset ${esc(slot.name)}?`, 'This deletes all progress, scores and history for this save.', () => { Save.remove(i); this.showParents(i); }, 'Reset', 'red');
    },

    // ---------------- credits ----------------
    showCredits() {
      this.modal(`<h2>${I('star')} Credits</h2><div class="credits">
        <div class="name" style="font-size:34px">StormShelter <small style="font-size:18px;color:#4b5d78">v${SS.VERSION}</small></div>
        <div>${RELEASE_DATE}</div>
        <div class="role">Created by</div><div class="name">Shawn Rapaz</div>
        <div class="role">Developed with</div><div class="name">Claude Code</div>
        <div class="role">Website &amp; Contact</div>
        <div><a data-url="https://shoukugames.org/">https://shoukugames.org/</a></div>
        <div><a data-url="mailto:info@shoukugames.org">info@shoukugames.org</a></div>
        <div class="role">License</div>
        <div style="font-size:17px;max-width:720px;margin:0 auto">Copyright © 2026 Shawn Rapaz. This program is free software: you can redistribute it and/or modify it under the terms of the <b>GNU General Public License v3.0</b> as published by the Free Software Foundation. It is distributed WITHOUT ANY WARRANTY.</div>
        <div class="role">Also using</div>
        <div style="font-size:16px">planck.js physics (MIT) · Fredoka font (SIL OFL 1.1) · Electron (MIT)</div>
        <div style="font-size:16px;margin-top:8px">Recommended for ages <b>3+</b></div>
      </div><div class="btns"><button class="btn purple" id="cLic">${I('scroll')} Read GPL-3.0</button><button class="btn green" id="cClose">Close</button></div>`);
      document.querySelectorAll('.credits a[data-url]').forEach((a) => a.onclick = () => openUrl(a.dataset.url));
      $('cClose').onclick = () => { A.sfx.click(); this.closeModal(); };
      $('cLic').onclick = () => { A.sfx.click(); this.showLicense(); };
    },
    showLicense() {
      const done = (text) => {
        this.modal(`<h2>GNU GPL v3.0</h2><div class="license-box" id="licBox"></div><div class="btns"><button class="btn" id="lBack">${I('back')} Back</button><button class="btn blue" id="lWeb">gnu.org</button></div>`, 'wide');
        $('licBox').textContent = text;
        $('lBack').onclick = () => this.showCredits();
        $('lWeb').onclick = () => openUrl('https://www.gnu.org/licenses/gpl-3.0.html');
      };
      try {
        const x = new XMLHttpRequest();
        x.open('GET', 'LICENSE.txt');
        x.onload = () => done(x.responseText || 'See https://www.gnu.org/licenses/gpl-3.0.html');
        x.onerror = () => done('The full license text is available at https://www.gnu.org/licenses/gpl-3.0.html');
        x.send();
      } catch (e) { done('The full license text is available at https://www.gnu.org/licenses/gpl-3.0.html'); }
    },

    // ---------------- helpers ----------------
    modal(html, cls = '') {
      const p = $('panel'); p.className = 'panel ' + cls; p.innerHTML = html;
      $('modal').classList.remove('hidden');
      p.querySelectorAll('.btn').forEach((b) => b.addEventListener('pointerenter', () => A.sfx.hover()));
    },
    closeModal() { $('modal').classList.add('hidden'); },
    modalOpen() { return !$('modal').classList.contains('hidden'); },
    confirm(title, text, onYes, yes = 'Yes', cls = 'green') {
      this.modal(`<h2>${title}</h2><p>${text}</p><div class="btns"><button class="btn" id="cfNo">No</button><button class="btn ${cls}" id="cfYes">${yes}</button></div>`);
      $('cfNo').onclick = () => { A.sfx.click(); this.closeModal(); };
      $('cfYes').onclick = () => { A.sfx.click(); this.closeModal(); onYes(); };
    },
    toast(msg) {
      const t = $('toast'); t.innerHTML = msg; t.classList.add('show');
      clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('show'), 1800);
    },
    speak(text) {
      try {
        if (!('speechSynthesis' in window)) return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/[^\w\s.,!?'-]/g, ''));
        u.rate = 0.9; u.pitch = 1.15;
        speechSynthesis.speak(u);
      } catch (e) { /* no voices */ }
    },
    fullscreen() {
      if (window.ssNative) window.ssNative.toggleFullscreen();
      else if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen();
    }
  };

  function openUrl(u) { if (window.ssNative) window.ssNative.openExternal(u); else window.open(u, '_blank'); }
  function totalStars(slot) { let s = 0; for (const d of ['easy', 'medium', 'hard']) for (const r of Object.values(slot.levels[d])) s += r.stars || 0; return s; }
  function levelsDone(slot) { const o = {}; for (const d of ['easy', 'medium', 'hard']) o[d] = Object.values(slot.levels[d]).filter((r) => r.wins > 0).length; return o; }
  function avatar(i, faded) {
    const L = SS.KID_LOOKS[i % 4];
    return `<svg class="avatar" viewBox="0 0 100 100" style="${faded ? 'opacity:.35' : ''}">
      <circle cx="50" cy="50" r="48" fill="#dff0ff"/><rect x="28" y="66" width="44" height="34" rx="14" fill="${L.shirt}"/>
      <circle cx="50" cy="46" r="24" fill="${L.skin}"/><path d="M26 44 Q28 18 50 20 Q72 18 74 44 Q66 30 50 30 Q34 30 26 44Z" fill="${L.hair}"/>
      <circle cx="41" cy="48" r="3.5" fill="#2b2233"/><circle cx="59" cy="48" r="3.5" fill="#2b2233"/>
      <circle cx="35" cy="56" r="4" fill="#ff9a9a" opacity=".6"/><circle cx="65" cy="56" r="4" fill="#ff9a9a" opacity=".6"/>
      <path d="M42 57 Q50 64 58 57" stroke="#7a2f3a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  }

  SS.UI = UI;
  window.addEventListener('DOMContentLoaded', () => { UI.init(); Game.init(); });
})(window);
