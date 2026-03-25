/**
 * CLI: npm run desktop:create-shortcut — Desktop .lnk → latest Composer-OS-Desktop-*-portable.exe
 */
import * as path from 'path';
import { createOrUpdateComposerOsDesktopShortcut } from './createDesktopShortcut';

function main(): void {
  const root = path.resolve(__dirname, '..');
  const { portableExe, shortcutPath } = createOrUpdateComposerOsDesktopShortcut(root);
  console.log('');
  console.log('Packaged exe:', portableExe);
  console.log('Shortcut:', shortcutPath);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
