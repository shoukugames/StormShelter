// Dev helper: drives the game in a hidden window and captures screenshots.
// Usage: xvfb-run electron scripts/shot.js <outDir> <stepsJsonFile>
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(-2);
const out = args[0];
const steps = JSON.parse(fs.readFileSync(args[1], 'utf8'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: +(process.env.SHOT_W || 1280), height: +(process.env.SHOT_H || 760), useContentSize: true, show: true, webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: true } });
  win.webContents.on('console-message', (e, level, msg, line, src) => console.log('[console]', level, msg, src ? src.split('/').pop() + ':' + line : ''));
  win.webContents.on('render-process-gone', (e, d) => console.log('CRASH', d));
  if (process.env.SHOT_URL) await win.loadURL(process.env.SHOT_URL);
  else await win.loadFile(process.env.SHOT_PAGE || path.join(__dirname, '..', 'src', 'index.html'));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const s of steps) {
    if (s.js) { try { const r = await win.webContents.executeJavaScript(s.js); if (r !== undefined) console.log('[js]', JSON.stringify(r)); } catch (e) { console.log('[js-error]', e.message); } }
    if (s.mouse) for (const ev of s.mouse) { if (ev.pause) { await sleep(ev.pause); continue; } win.webContents.sendInputEvent(Object.assign({ button: 'left', clickCount: 1 }, ev)); await sleep(30); }
    if (s.wait) await sleep(s.wait);
    if (s.shot) { const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(out, s.shot + '.png'), img.toPNG()); console.log('shot', s.shot); }
  }
  app.quit();
});
