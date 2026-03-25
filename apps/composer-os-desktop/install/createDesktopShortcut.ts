/**
 * Back-compat re-exports; prefer installComposerOsDesktopIcon from installDesktopIcon.ts.
 */
import { installComposerOsDesktopIcon } from './installDesktopIcon';

export {
  SHORTCUT_CANONICAL_NAME,
  SHORTCUT_FILE_NAME,
  LEGACY_SHORTCUT_FILE_NAME,
  installComposerOsDesktopIcon,
} from './installDesktopIcon';

export function createOrUpdateComposerOsDesktopShortcut(desktopAppRoot: string): {
  portableExe: string;
  shortcutPath: string;
} {
  const r = installComposerOsDesktopIcon(desktopAppRoot, { skipLaunch: true });
  return { portableExe: r.portableExe, shortcutPath: r.shortcutPath };
}
