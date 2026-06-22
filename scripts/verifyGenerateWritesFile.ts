/**
 * Direct proof: apiGenerate -> runAppGeneration -> generateComposition writes MusicXML to disk.
 * No Electron, no Playwright, no UI.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/verifyGenerateWritesFile.ts
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { apiGenerate } from '../engines/composer-os-v2/app-api/composerOsApiCore';
import {
  ensureOutputDirectoryForPreset,
  expectedPresetFolderName,
  getComposerFilesRoot,
} from '../engines/composer-os-v2/app-api/composerOsOutputPaths';
import type { GenerateResult } from '../engines/composer-os-v2/app-api/generateComposition';

const PRESET_ID = 'guitar_bass_duo';
const SEED = 424242;
const OUTPUT_LABEL = 'verify_generate_writes_file';

function isGenerateResult(value: unknown): value is GenerateResult {
  return !!value && typeof value === 'object' && 'success' in value;
}

function assertMusicXml(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('<?xml') && !trimmed.includes('<score-partwise')) {
    return 'content does not look like XML/MusicXML';
  }
  if (!/<score-partwise[\s>]/i.test(trimmed)) {
    return 'missing <score-partwise> root';
  }
  if (trimmed.length < 200) {
    return 'content too short to be valid MusicXML';
  }
  return null;
}

function main(): void {
  const useRealLibrary = process.argv.includes('--real-library');
  const libraryRoot = useRealLibrary
    ? getComposerFilesRoot()
    : fs.mkdtempSync(path.join(os.tmpdir(), 'co-verify-generate-'));

  const presetDir = ensureOutputDirectoryForPreset(PRESET_ID, libraryRoot);
  const presetFolder = expectedPresetFolderName(PRESET_ID);

  console.log('[verify] preset:', PRESET_ID);
  console.log('[verify] seed:', SEED);
  console.log('[verify] library root:', libraryRoot);
  console.log('[verify] preset subfolder:', presetFolder);
  console.log('[verify] resolved output dir:', presetDir);
  if (useRealLibrary) {
    console.log('[verify] mode: real Documents library root');
  } else {
    console.log('[verify] mode: isolated temp library root');
  }

  let result: GenerateResult | { success: false; error: string; detail?: string };
  try {
    result = apiGenerate(
      {
        presetId: PRESET_ID,
        styleStack: {
          primary: 'barry_harris',
          styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
        },
        seed: SEED,
        outputLabel: OUTPUT_LABEL,
      },
      libraryRoot
    ) as GenerateResult | { success: false; error: string; detail?: string };
  } catch (err) {
    console.error('FAIL: apiGenerate threw');
    console.error(err instanceof Error ? err.stack ?? err.message : String(err));
    process.exit(1);
  }

  if (!isGenerateResult(result)) {
    console.error('FAIL: apiGenerate returned unexpected shape');
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  if (!result.success) {
    console.error('FAIL: generation reported success=false');
    console.error('error:', result.error ?? '(none)');
    if (result.validation?.errors?.length) {
      console.error('validation errors:', result.validation.errors.join(' | '));
    }
    process.exit(1);
  }

  const checkedPath = result.filepath?.trim() ?? '';
  console.log('[verify] result.filepath:', checkedPath || '(missing)');

  if (!checkedPath) {
    console.error('FAIL: no filepath on result');
    process.exit(1);
  }

  if (!fs.existsSync(checkedPath)) {
    console.error('FAIL: file does not exist on disk');
    console.error('checked path:', checkedPath);
    process.exit(1);
  }

  const stat = fs.statSync(checkedPath);
  if (stat.size <= 0) {
    console.error('FAIL: file size is 0');
    console.error('checked path:', checkedPath);
    process.exit(1);
  }

  const xml = fs.readFileSync(checkedPath, 'utf8');
  const xmlProblem = assertMusicXml(xml);
  if (xmlProblem) {
    console.error('FAIL: invalid MusicXML -', xmlProblem);
    console.error('checked path:', checkedPath);
    process.exit(1);
  }

  const normalizedChecked = path.resolve(checkedPath);
  const normalizedPresetDir = path.resolve(presetDir);
  if (!normalizedChecked.startsWith(normalizedPresetDir)) {
    console.error('FAIL: filepath is outside expected preset output dir');
    console.error('expected prefix:', normalizedPresetDir);
    console.error('checked path:', normalizedChecked);
    process.exit(1);
  }

  console.log('PASS: wrote file');
  console.log('checked path:', checkedPath);
  console.log('bytes:', stat.size);
}

main();