/**
 * Composer OS — output path layout (Mike Composer Files)
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  getComposerFilesRoot,
  getOutputDirectoryForPreset,
  ensureOutputDirectoryForPreset,
  PRESET_OUTPUT_SUBFOLDER,
} from '../app-api/composerOsOutputPaths';

type TestResult = { name: string; ok: boolean };

export function runComposerOsOutputPathsTests(): TestResult[] {
  const results: TestResult[] = [];
  const pass = (name: string) => results.push({ name, ok: true });
  const fail = (name: string) => results.push({ name, ok: false });

  const prevEnv = process.env.COMPOSER_OS_OUTPUT_DIR;

  try {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-mike-files-'));
    process.env.COMPOSER_OS_OUTPUT_DIR = tmp;
    const root = getComposerFilesRoot();
    if (path.resolve(root) !== path.resolve(tmp)) fail('getComposerFilesRoot respects env');
    else pass('getComposerFilesRoot respects env');

    const gbd = getOutputDirectoryForPreset('guitar_bass_duo');
    if (!gbd.endsWith(PRESET_OUTPUT_SUBFOLDER.guitar_bass_duo)) fail('guitar_bass_duo subfolder');
    else pass('guitar_bass_duo subfolder');

    const bb = getOutputDirectoryForPreset('big_band');
    if (!bb.endsWith(PRESET_OUTPUT_SUBFOLDER.big_band)) fail('big_band subfolder');
    else pass('big_band subfolder');

    ensureOutputDirectoryForPreset('guitar_bass_duo');
    if (!fs.existsSync(gbd)) fail('ensureOutputDirectoryForPreset');
    else pass('ensureOutputDirectoryForPreset creates folder');
  } catch (e) {
    fail(`composerOsOutputPaths: ${e}`);
  }

  if (prevEnv !== undefined) process.env.COMPOSER_OS_OUTPUT_DIR = prevEnv;
  else delete process.env.COMPOSER_OS_OUTPUT_DIR;

  return results;
}
