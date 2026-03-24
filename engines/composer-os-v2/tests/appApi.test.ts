/**
 * Composer OS V2 — App API tests
 */

import * as path from 'path';
import * as fs from 'fs';
import { getPresets } from '../app-api/getPresets';
import { getStyleModules } from '../app-api/getStyleModules';
import { generateComposition } from '../app-api/generateComposition';
import { listOutputs } from '../app-api/listOutputs';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'outputs', 'composer-os-v2-test');

type TestResult = { name: string; ok: boolean };

export function runAppApiTests(): TestResult[] {
  const results: TestResult[] = [];
  const pass = (name: string) => results.push({ name, ok: true });
  const fail = (name: string) => results.push({ name, ok: false });

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
    if (modules.length < 1) fail('Style module loading: non-empty list');
    else if (!modules.some((m) => m.id === 'barry_harris')) fail('Style module loading: barry_harris exists');
    else pass('Style module loading');
  } catch (e) {
    fail(`Style module loading: ${e}`);
  }

  try {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    const result = generateComposition(
      {
        presetId: 'guitar_bass_duo',
        styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
        seed: 999,
      },
      TEST_OUTPUT_DIR
    );
    if (!result.success) fail('Generation request: success');
    else if (!result.validation) fail('Generation request: validation present');
    else pass('Generation request');
  } catch (e) {
    fail(`Generation request: ${e}`);
  }

  try {
    const outputs = listOutputs(TEST_OUTPUT_DIR);
    if (outputs.length < 1) fail('Output listing: at least one output');
    else if (!outputs[0].filename?.endsWith('.musicxml')) fail('Output listing: musicxml suffix');
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
      TEST_OUTPUT_DIR
    );
    const v = result.validation;
    if (!v) fail('Validation summary: present');
    else if (typeof v.readiness?.release !== 'number') fail('Validation summary: readiness.release');
    else pass('Validation summary');
  } catch (e) {
    fail(`Validation summary: ${e}`);
  }

  // Cleanup test outputs
  try {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      for (const f of fs.readdirSync(TEST_OUTPUT_DIR)) {
        fs.unlinkSync(path.join(TEST_OUTPUT_DIR, f));
      }
      fs.rmdirSync(TEST_OUTPUT_DIR);
    }
  } catch {
    // ignore
  }

  return results;
}

