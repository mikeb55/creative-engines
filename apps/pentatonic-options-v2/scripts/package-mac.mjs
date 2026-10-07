import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronDist = path.resolve(root, '../composer-os-desktop/node_modules/electron/dist');
const electronLink = path.join(root, 'node_modules/electron');
fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true });
if (!fs.existsSync(electronLink)) fs.symlinkSync(path.resolve(root, '../composer-os-desktop/node_modules/electron'), electronLink, 'dir');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const builder = path.resolve(root, '../composer-os-desktop/node_modules/electron-builder/cli.js');
const result = spawnSync(
  process.execPath,
  [
    builder,
    '--mac',
    'dir',
    '--config.directories.output=dist',
    `--config.electronDist=${electronDist}`,
    '--config.mac.identity=null',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
  }
);
if (result.status !== 0) process.exit(result.status ?? 1);

const matches = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name.endsWith('.app')) matches.push(full);
    else if (entry.isDirectory() && entry.name !== 'node_modules') walk(full);
  }
}
walk(out);
const sourceApp = matches.find((item) => item.endsWith('Pentatonic Options V2.app') && !item.startsWith(path.join(out, 'Pentatonic Options V2.app')));
if (!sourceApp) throw new Error(`Packaged app not found under ${out}`);
const finalApp = path.join(out, 'Pentatonic Options V2.app');
fs.rmSync(finalApp, { recursive: true, force: true });
fs.cpSync(sourceApp, finalApp, { recursive: true });
spawnSync('codesign', ['--force', '--deep', '--sign', '-', finalApp], { stdio: 'inherit' });
const desktop = path.join(process.env.HOME ?? '', 'Desktop', 'Pentatonic Options V2.app');
fs.rmSync(desktop, { recursive: true, force: true });
fs.cpSync(finalApp, desktop, { recursive: true });
spawnSync('codesign', ['--force', '--deep', '--sign', '-', desktop], { stdio: 'inherit' });
console.log(finalApp);
console.log(desktop);
