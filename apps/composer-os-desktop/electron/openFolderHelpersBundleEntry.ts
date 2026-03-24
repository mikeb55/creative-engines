/**
 * esbuild entry — bundled to resources/open-folder-helpers.cjs for packaged Electron.
 * Do not import Electron here; main loads this bundle from disk.
 */
export { resolveOpenFolderTarget } from '../../../engines/composer-os-v2/app-api/composerOsOutputPaths';
export { ensureFolderForOpen } from '../../../engines/composer-os-v2/app-api/openOutputFolder';
