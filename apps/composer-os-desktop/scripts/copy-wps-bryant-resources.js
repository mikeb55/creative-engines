/**
 * Copy WPS Bryant runtime resources next to the packaged IPC bundle.
 * Source: engines/composer-os-v2/core/wwh/wps/
 * Dest:   resources/wps-bryant/
 * electron-builder extraResources ships that folder to process.resourcesPath/wps-bryant.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const srcDir = path.join(repoRoot, 'engines', 'composer-os-v2', 'core', 'wwh', 'wps');
const defaultDest = path.join(__dirname, '..', 'resources', 'wps-bryant');

const FILES = ['wps-bryant-signature.json', 'wps-bryant-preferences.md'];

function copyWpsBryantResources(destDir = defaultDest) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of FILES) {
    const from = path.join(srcDir, name);
    if (!fs.existsSync(from)) throw new Error(`[copy-wps-bryant] missing ${from}`);
    const to = path.join(destDir, name);
    fs.copyFileSync(from, to);
    console.log('[copy-wps-bryant] ' + from + ' -> ' + to);
  }
  return destDir;
}

module.exports = { copyWpsBryantResources, WPS_BRYANT_FILES: FILES };

if (require.main === module) {
  try {
    copyWpsBryantResources();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
