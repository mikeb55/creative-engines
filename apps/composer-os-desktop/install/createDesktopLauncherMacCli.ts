/**
 * npm run desktop:create-launcher:mac — write ~/Desktop/Composer OS.app
 */
import * as path from 'path';
import { createDesktopLauncherMac } from './createDesktopLauncherMac';

function main(): void {
  const root = path.resolve(__dirname, '..');
  const r = createDesktopLauncherMac(root);
  console.log('');
  console.log('========================================');
  console.log('Composer OS — macOS Desktop launcher');
  console.log('========================================');
  console.log('Bundle:  ', r.bundlePath);
  console.log('Node:    ', r.nodePath);
  console.log('npm:     ', r.npmPath);
  console.log('Repo:    ', r.repoRoot);
  console.log('Electron:', r.electronPath);
  console.log('Icon:    ', r.icnsPath);
  console.log('========================================');
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
