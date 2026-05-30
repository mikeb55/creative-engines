/**
 * Post-copy verification: requires compiled dist/uiBundleVerify.js (run after tsc).
 */
const fs = require('fs');
const path = require('path');
const { verifyUiBundleAtPath } = require('../dist/uiBundleVerify');

const uiDir = path.join(__dirname, '..', 'resources', 'ui');
const r = verifyUiBundleAtPath(uiDir);
if (!r.ok) {
  console.error('resources/ui verification failed:', r.reason);
  console.error('Path:', r.resolvedPath);
  process.exit(1);
}
console.log('Verified Composer OS UI stamp at resources/ui:', r.stamp.productId, r.stamp.buildTimestamp);

const assetsDir = path.join(uiDir, 'assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
  let found = false;
  for (const f of files) {
    const s = fs.readFileSync(path.join(assetsDir, f), 'utf8');
    if (s.includes('riff_generator') && s.includes('Riff Generator')) {
      found = true;
      break;
    }
  }
  if (!found) {
    console.error(
      'UI JS bundle missing Riff Generator exposure (rebuild composer-os-app, then copy-ui)'
    );
    process.exit(1);
  }
}
