import fs from 'fs';
import path from 'path';
import { apiGenerate, getComposerFilesRoot } from '../engines/composer-os-v2/app-api/composerOsApiCore';
import type { GenerateRequest } from '../engines/composer-os-v2/app-api/appApiTypes';

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

const preset = argValue('--preset') ?? 'guitar_bass_duo';
const bars = Number(argValue('--bars') ?? '64');
const seed = Number(argValue('--seed') ?? '77001');
const bpm = Number(argValue('--bpm') ?? '120');
const chords = argValue('--chords') ?? '';
const outputDir = argValue('--output') ?? '';
const sectionsRaw = argValue('--sections') ?? '[]';

if (!outputDir.trim()) {
  console.error('Missing required --output path.');
  process.exit(1);
}
if (!chords.trim()) {
  console.error('Missing required --chords progression.');
  process.exit(1);
}

let duoSongModeSectionPlan: GenerateRequest['duoSongModeSectionPlan'];
try {
  duoSongModeSectionPlan = JSON.parse(sectionsRaw) as GenerateRequest['duoSongModeSectionPlan'];
} catch (e) {
  console.error('Invalid --sections JSON:', e instanceof Error ? e.message : String(e));
  process.exit(1);
}

const request: GenerateRequest = {
  presetId: preset,
  totalBars: bars,
  seed,
  bpm,
  harmonyMode: 'custom_locked',
  longFormEnabled: true,
  styleStack: {
    primary: 'barry_harris',
    styleBlend: {
      primary: 'strong',
      secondary: 'off',
      colour: 'off',
    },
  },
  chordProgressionText: chords,
  duoSongModeSectionPlan,
};

const result = apiGenerate(request, getComposerFilesRoot());

if (!result.success || !result.filepath) {
  const errors: string[] = [];
  if (result.error) errors.push(result.error);
  if ('validation' in result && result.validation?.errors?.length) {
    errors.push(...result.validation.errors);
  }
  if (errors.length === 0) errors.push('Generation failed without error detail.');
  for (const err of errors) {
    console.error(err);
  }
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
const destPath = path.join(outputDir, path.basename(result.filepath));
fs.copyFileSync(result.filepath, destPath);
console.log(`Generated: ${destPath}`);
