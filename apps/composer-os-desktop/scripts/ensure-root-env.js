/**
 * electron-builder extraResources copies ../../.env. That file is gitignored
 * and often absent — create an empty one so packaging does not fail.
 */
const fs = require('fs');
const path = require('path');

function ensureRootEnv() {
  const envPath = path.resolve(__dirname, '../../..', '.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, '');
    console.log('[ensure-root-env] created empty', envPath);
  }
}

async function beforePack() {
  ensureRootEnv();
}

if (require.main === module) {
  ensureRootEnv();
}

module.exports = beforePack;
module.exports.default = beforePack;
