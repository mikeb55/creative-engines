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
  manifestPathForMusicXml,
  normalizeLibraryFolderOpenTarget,
  resolveComposerLibraryRoot,
} from '../app-api/composerOsOutputPaths';
import { runRiffGeneratorApp } from '../app-api/riffGeneratorApp';
import type { GenerateRequest } from '../app-api/appApiTypes';

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

    const gbdSl = getOutputDirectoryForPreset('guitar_bass_duo_single_line');
    if (!gbdSl.endsWith(PRESET_OUTPUT_SUBFOLDER.guitar_bass_duo_single_line)) fail('guitar_bass_duo_single_line subfolder');
    else pass('guitar_bass_duo_single_line subfolder');

    const riff = getOutputDirectoryForPreset('riff_generator');
    if (!riff.endsWith(PRESET_OUTPUT_SUBFOLDER.riff_generator)) fail('riff_generator subfolder');
    else pass('riff_generator subfolder');

    const explicitRoot = path.join(tmp, 'ExplicitLibraryRoot');
    const riffExplicit = getOutputDirectoryForPreset('riff_generator', explicitRoot);
    if (path.resolve(riffExplicit) !== path.join(path.resolve(explicitRoot), PRESET_OUTPUT_SUBFOLDER.riff_generator)) {
      fail('getOutputDirectoryForPreset respects explicit library root');
    } else pass('getOutputDirectoryForPreset respects explicit library root');
    if (resolveComposerLibraryRoot(explicitRoot) !== path.resolve(explicitRoot)) fail('resolveComposerLibraryRoot');
    else pass('resolveComposerLibraryRoot');

    const bb = getOutputDirectoryForPreset('big_band');
    if (!bb.endsWith(PRESET_OUTPUT_SUBFOLDER.big_band)) fail('big_band subfolder');
    else pass('big_band subfolder');

    const sq = getOutputDirectoryForPreset('string_quartet');
    if (!sq.endsWith(PRESET_OUTPUT_SUBFOLDER.string_quartet)) fail('string_quartet subfolder');
    else pass('string_quartet subfolder');

    const sm = getOutputDirectoryForPreset('song_mode');
    if (!sm.endsWith(PRESET_OUTPUT_SUBFOLDER.song_mode)) fail('song_mode subfolder');
    else pass('song_mode subfolder');

    ensureOutputDirectoryForPreset('guitar_bass_duo');
    if (!fs.existsSync(gbd)) fail('ensureOutputDirectoryForPreset');
    else pass('ensureOutputDirectoryForPreset creates folder');

    const xml = path.join(gbd, 'composer_os_test.musicxml');
    const mp = manifestPathForMusicXml(xml);
    if (!mp.includes('_meta') || !mp.endsWith('composer_os_test.manifest.json')) fail('manifestPathForMusicXml layout');
    else pass('manifestPathForMusicXml layout');

    const metaDir = path.join(gbd, '_meta');
    fs.mkdirSync(metaDir, { recursive: true });
    const mf = path.join(metaDir, 'x.manifest.json');
    fs.writeFileSync(mf, '{}', 'utf-8');
    const opened = normalizeLibraryFolderOpenTarget(mf);
    if (path.resolve(opened) !== path.resolve(gbd)) fail('normalizeLibraryFolderOpenTarget strips _meta');
    else pass('normalizeLibraryFolderOpenTarget strips _meta');

    const riffDirResolved = ensureOutputDirectoryForPreset('riff_generator');
    const riffReq: GenerateRequest = {
      presetId: 'riff_generator',
      seed: 0,
      styleStack: {
        primary: 'barry_harris',
        styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
      },
      totalBars: 2,
    };
    const riffResult = runRiffGeneratorApp(riffReq, riffDirResolved);
    if (!riffResult.success || !riffResult.filepath) {
      fail('riff_generator wrote file');
    } else if (path.resolve(path.dirname(riffResult.filepath)) !== path.resolve(riffDirResolved)) {
      fail('riff MusicXML path under preset output dir');
    } else if (!fs.existsSync(riffResult.filepath)) {
      fail('riff MusicXML file on disk');
    } else {
      pass('riff_generator writes under ensureOutputDirectoryForPreset');
    }
  } catch (e) {
    fail(`composerOsOutputPaths: ${e}`);
  }

  if (prevEnv !== undefined) process.env.COMPOSER_OS_OUTPUT_DIR = prevEnv;
  else delete process.env.COMPOSER_OS_OUTPUT_DIR;

  return results;
}
