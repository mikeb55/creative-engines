/** Copies only composer-os-app/dist → resources/ui (Composer OS only; full replace, no merge). */
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', '..', 'composer-os-app', 'dist');
const dst = path.join(__dirname, '..', 'resources', 'ui');
if (!fs.existsSync(src)) {
  console.error('UI build not found:', src);
  process.exit(1);
}
if (fs.existsSync(dst)) {
  fs.rmSync(dst, { recursive: true });
}
fs.mkdirSync(dst, { recursive: true });
const copy = (s, d) => {
  for (const f of fs.readdirSync(s)) {
    const sp = path.join(s, f);
    const dp = path.join(d, f);
    if (fs.statSync(sp).isDirectory()) {
      fs.mkdirSync(dp, { recursive: true });
      copy(sp, dp);
    } else {
      fs.copyFileSync(sp, dp);
    }
  }
};
copy(src, dst);
console.log('Copied UI to resources/ui');
