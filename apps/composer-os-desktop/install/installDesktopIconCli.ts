/**
 * npm run desktop:install-icon — latest portable exe, one Desktop shortcut, verify, launch.
 */
import * as path from 'path';
import { getPublicDesktopDir } from './shortcutUtils';
import { installComposerOsDesktopIcon } from './installDesktopIcon';

function main(): void {
  const root = path.resolve(__dirname, '..');
  const pub = getPublicDesktopDir();
  const r = installComposerOsDesktopIcon(root);
  console.log('');
  console.log('User Desktop:', r.desktopDir);
  if (pub) console.log('Public Desktop (not used for shortcut):', pub);
  console.log('Shortcut:', r.shortcutPath);
  console.log('Target:', r.portableExe);
  console.log('Launched:', r.launched ? 'yes' : 'no');
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
