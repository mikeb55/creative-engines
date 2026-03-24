/**
 * Composer OS V2 — App API tests
 */

import * as path from 'path';
import * as fs from 'fs';
import { getPresets } from '../app-api/getPresets';
import { getStyleModules } from '../app-api/getStyleModules';
import { generateComposition } from '../app-api/generateComposition';
import { listOutputs } from '../app-api/listOutputs';
import { buildDiagnostics } from '../app-api/buildDiagnostics';
import { friendlyGenerateError } from '../app-api/apiErrorMessages';
import {
  getOutputDirectoryForPreset,
  expectedPresetFolderName,
  manifestPathForMusicXml,
} from '../app-api/composerOsOutputPaths';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'outputs', 'composer-os-v2-test');

type TestResult = { name: string; ok: boolean };

export function runAppApiTests(): TestResult[] {
  const results: TestResult[] = [];
  const pass = (name: string) => results.push({ name, ok: true });
  const fail = (name: string) => results.push({ name, ok: false });

  const prevEnv = process.env.COMPOSER_OS_OUTPUT_DIR;
  process.env.COMPOSER_OS_OUTPUT_DIR = TEST_OUTPUT_DIR;
  const TEST_GBD_DIR = getOutputDirectoryForPreset('guitar_bass_duo');

  try {
    const presets = getPresets();
    if (presets.length < 1) fail('Preset loading: non-empty list');
    else if (!presets.some((p) => p.id === 'guitar_bass_duo')) fail('Preset loading: guitar_bass_duo exists');
    else if (!presets.some((p) => p.supported)) fail('Preset loading: at least one supported');
    else pass('Preset loading');
  } catch (e) {
    fail(`Preset loading: ${e}`);
  }

  try {
    const modules = getStyleModules();
    if (modules.length < 4) fail('Style module loading: four modules from registry');
    else if (!modules.every((m) => m.enabled)) fail('Style module loading: enabled');
    else if (
      !['barry_harris', 'metheny', 'triad_pairs', 'bacharach'].every((id) => modules.some((m) => m.id === id))
    )
      fail('Style module loading: barry_harris, metheny, triad_pairs, bacharach');
    else pass('Style module loading');
  } catch (e) {
    fail(`Style module loading: ${e}`);
  }

  try {
    if (expectedPresetFolderName('guitar_bass_duo') !== 'Guitar-Bass Duos') fail('Preset folder mapping');
    else pass('Preset folder mapping');
  } catch (e) {
    fail(`Preset folder mapping: ${e}`);
  }

  try {
    fs.mkdirSync(TEST_GBD_DIR, { recursive: true });
    const result = generateComposition(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 999,
      },
      TEST_GBD_DIR
    );
    if (!result.success) fail('Generation request: success');
    else if (!result.validation) fail('Generation request: validation present');
    else if (!result.manifestPath?.endsWith('.manifest.json')) fail('Generation request: manifest path');
    else if (!result.manifestPath?.includes('_meta')) fail('Generation request: manifest under _meta');
    else if (result.manifestPath !== manifestPathForMusicXml(result.filepath!)) fail('Generation request: manifest path helper');
    else if (!fs.existsSync(result.manifestPath)) fail('Generation request: manifest on disk');
    else if (!result.filepath?.includes('Guitar-Bass Duos')) fail('Generation request: file under preset folder');
    else pass('Generation request');
  } catch (e) {
    fail(`Generation request: ${e}`);
  }

  try {
    const outputs = listOutputs(TEST_OUTPUT_DIR);
    if (outputs.length < 1) fail('Output listing: at least one output');
    else if (!outputs[0].filename?.endsWith('.musicxml')) fail('Output listing: musicxml suffix');
    else if (!outputs[0].presetFolderLabel) fail('Output listing: preset folder label');
    else if (outputs.some((o) => o.filepath.includes('_meta'))) fail('Output listing: no paths inside _meta');
    else pass('Output listing');
  } catch (e) {
    fail(`Output listing: ${e}`);
  }

  try {
    const result = generateComposition(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 888,
      },
      TEST_GBD_DIR
    );
    const v = result.validation;
    if (!v) fail('Validation summary: present');
    else if (typeof v.readiness?.release !== 'number') fail('Validation summary: readiness.release');
    else pass('Validation summary');
  } catch (e) {
    fail(`Validation summary: ${e}`);
  }

  try {
    const result = generateComposition(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'metheny', weights: { primary: 1 } },
        seed: 5555,
      },
      TEST_GBD_DIR
    );
    const am = result.runManifest?.activeModules ?? [];
    if (am[0] !== 'metheny' || am.length !== 1) fail('Generation: requested primary in manifest');
    else pass('Generation: style stack from request');
  } catch (e) {
    fail(`Generation: style stack from request: ${e}`);
  }

  try {
    const diagDir = path.join(REPO_ROOT, 'outputs', 'composer-os-v2-test-diag');
    fs.mkdirSync(diagDir, { recursive: true });
    const d = buildDiagnostics(diagDir, 3001);
    if (d.appName !== 'Composer OS') fail('Diagnostics payload: app name');
    else if (d.activePort !== 3001) fail('Diagnostics payload: port');
    else if (!path.isAbsolute(d.outputDirectory)) fail('Diagnostics payload: canonical output');
    else if (!d.styleModules?.length || d.styleModules.length < 3) fail('Diagnostics payload: styleModules');
    else pass('Diagnostics payload');
    fs.rmSync(diagDir, { recursive: true, force: true });
  } catch (e) {
    fail(`Diagnostics payload: ${e}`);
  }

  try {
    fs.mkdirSync(TEST_GBD_DIR, { recursive: true });
    const runs = 5;
    for (let i = 0; i < runs; i++) {
      const result = generateComposition(
        {
          presetId: 'guitar_bass_duo',
          styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
          seed: 7000 + i,
        },
        TEST_GBD_DIR
      );
      if (!result.success) fail(`Multi-run smoke: success run ${i}`);
      else if (!result.filepath) fail(`Multi-run smoke: filepath run ${i}`);
      else if (typeof result.validation?.readiness?.release !== 'number')
        fail(`Multi-run smoke: readiness run ${i}`);
      else {
        const manifestPath = result.manifestPath ?? manifestPathForMusicXml(result.filepath);
        if (!fs.existsSync(manifestPath)) fail(`Multi-run smoke: manifest run ${i}`);
      }
    }
    pass('Multi-run smoke (5)');
  } catch (e) {
    fail(`Multi-run smoke: ${e}`);
  }

  try {
    fs.mkdirSync(TEST_GBD_DIR, { recursive: true });
    const a = generateComposition(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 111_111_111,
      },
      TEST_GBD_DIR
    );
    const b = generateComposition(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 222_222_222,
      },
      TEST_GBD_DIR
    );
    if (!a.filepath || !b.filepath) fail('Try Another filenames: paths present');
    else if (a.filepath === b.filepath) fail('Try Another filenames: different seed → different file');
    else if (!b.filename?.includes('222222222')) fail('Try Another filenames: seed in filename');
    else pass('Try Another filenames: distinct paths per seed');
  } catch (e) {
    fail(`Try Another filenames: ${e}`);
  }

  try {
    const msg = friendlyGenerateError(new Error('EACCES: permission denied'));
    if (msg.length < 10 || !msg.toLowerCase().includes('folder')) fail('Friendly error: message');
    else pass('Friendly error messages');
  } catch (e) {
    fail(`Friendly error messages: ${e}`);
  }

  // Cleanup test outputs
  try {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }

  if (prevEnv !== undefined) process.env.COMPOSER_OS_OUTPUT_DIR = prevEnv;
  else delete process.env.COMPOSER_OS_OUTPUT_DIR;

  return results;
}
