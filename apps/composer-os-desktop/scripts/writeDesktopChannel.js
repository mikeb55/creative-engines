/**
 * afterPack: write Contents/Resources/desktop-channel.json.
 * Default channel is stable. COMPOSER_OS_PACK_CHANNEL=dev writes the isolated DEV channel.
 * Does not change appId or productName; those stay on the electron-builder config.
 */
const fs = require('fs');
const path = require('path');

function resourcesDir(appOutDir) {
  const mac = path.join(appOutDir, 'Contents', 'Resources');
  if (fs.existsSync(mac)) return mac;
  if (fs.existsSync(appOutDir)) {
    for (const name of fs.readdirSync(appOutDir)) {
      if (!name.endsWith('.app')) continue;
      const nested = path.join(appOutDir, name, 'Contents', 'Resources');
      if (fs.existsSync(nested)) return nested;
    }
  }
  return path.join(appOutDir, 'resources');
}

async function afterPack(context) {
  const channel = process.env.COMPOSER_OS_PACK_CHANNEL === 'dev' ? 'dev' : 'stable';
  const dest = path.join(resourcesDir(context.appOutDir), 'desktop-channel.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify({ channel })}\n`);
  console.log('[desktop-channel] wrote', dest, channel);
}

module.exports = afterPack;
module.exports.default = afterPack;

if (require.main === module) {
  const appArg = process.argv[2];
  if (!appArg) {
    console.error('usage: node scripts/writeDesktopChannel.js <App.app|appOutDir>');
    process.exit(1);
  }
  afterPack({ appOutDir: path.resolve(appArg) }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
