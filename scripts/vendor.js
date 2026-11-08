// Copies third-party runtime files into src/ so the game works fully offline:
//  - planck.js physics engine  -> src/lib/planck.min.js
//  - Fredoka web font (OFL)    -> src/fonts/
//  - GPL-3.0 license text      -> src/LICENSE.txt (shown in the Credits screen)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nm = path.join(root, 'node_modules');
fs.mkdirSync(path.join(root, 'src', 'lib'), { recursive: true });
fs.copyFileSync(path.join(nm, 'planck', 'dist', 'planck.min.js'), path.join(root, 'src', 'lib', 'planck.min.js'));
fs.copyFileSync(path.join(nm, 'planck', 'LICENSE.txt'), path.join(root, 'src', 'lib', 'planck-LICENSE.txt'));

const pkg = path.join(nm, '@fontsource', 'fredoka');
const outDir = path.join(root, 'src', 'fonts');
const filesOut = path.join(outDir, 'files');
fs.mkdirSync(filesOut, { recursive: true });
let css = '/* Fredoka - SIL Open Font License 1.1 (via @fontsource) */\n';
for (const w of ['400', '500', '600', '700']) {
  let src = fs.readFileSync(path.join(pkg, `${w}.css`), 'utf8');
  src = src.replace(/,\s*url\([^)]*\.woff\) format\('woff'\)/g, '');
  // keep latin + latin-ext only
  src = src.split('/*').filter((blk) => !blk.trim() || /latin/.test(blk.split('*/')[0]) ).map((b) => b ? '/*' + b : b).join('');
  src.replace(/url\(\.\/files\/([^)]+\.woff2)\)/g, (m, f) => { fs.copyFileSync(path.join(pkg, 'files', f), path.join(filesOut, f)); return m; });
  css += src + '\n';
}
fs.writeFileSync(path.join(outDir, 'fonts.css'), css);
const lic = path.join(pkg, 'LICENSE');
if (fs.existsSync(lic)) fs.copyFileSync(lic, path.join(outDir, 'OFL-LICENSE.txt'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(root, 'src', 'LICENSE.txt'));
console.log('vendored planck, fonts (' + fs.readdirSync(filesOut).length + ' files), license');

