import fs from 'fs';
import path from 'path';
import { apiGenerate, getComposerFilesRoot } from '../engines/composer-os-v2/app-api/composerOsApiCore';
import type { GenerateRequest } from '../engines/composer-os-v2/app-api/appApiTypes';

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

const COMPOSER_REHEARSAL_DISPLAY: Record<string, string> = {
  fripp: 'FRIPP',
  jack_white: 'JACK WHITE',
  wayne_shorter: 'W. SHORTER',
  verlaine: 'VERLAINE',
  beefheart: 'BEEFHEART',
  holdsworth: 'HOLDSWORTH',
  marr: 'MARR',
  brian_wilson: 'BRIAN WILSON',
  stevie_wonder: 'STEVIE WONDER',
  radiohead: 'RADIOHEAD',
  james_brown: 'JAMES BROWN',
  joni_mitchell: 'JONI MITCHELL',
  sonic_youth: 'SONIC YOUTH',
  pat_metheny: 'PAT METHENY',
  frank_zappa: 'FRANK ZAPPA',
  barry_harris: 'BARRY HARRIS',
  bill_evans: 'BILL EVANS',
};

function rehearsalDisplayName(songwriterStyleId: string): string {
  return (
    COMPOSER_REHEARSAL_DISPLAY[songwriterStyleId] ??
    songwriterStyleId.replace(/_/g, ' ').toUpperCase()
  );
}

function addRehearsalMarksToMusicXml(
  xml: string,
  plan: NonNullable<GenerateRequest['mosaicSectionPlan']>
): string {
  let out = xml;
  for (const section of plan) {
    const label = rehearsalDisplayName(section.songwriterStyleId);
    const rehearsal = `<direction placement="above"><direction-type><rehearsal font-weight="bold" font-size="14">${label}</rehearsal></direction-type></direction>`;
    const measurePattern = new RegExp(
      `(<measure[^>]*\\bnumber="${section.startBar}"[^>]*>)([\\s\\S]*?)(<note)`,
      'g'
    );
    out = out.replace(measurePattern, `$1$2${rehearsal}$3`);
  }
  return out;
}

const preset = argValue('--preset') ?? 'guitar_bass_duo';
const bars = Number(argValue('--bars') ?? '64');
const seed = Number(argValue('--seed') ?? '77001');
const bpm = Number(argValue('--bpm') ?? '120');
const chords = argValue('--chords') ?? '';
const outputArg = argValue('--output') ?? '';
const sectionsRaw = argValue('--sections') ?? '[]';

if (!outputArg.trim()) {
  console.error('Missing required --output path.');
  process.exit(1);
}
if (!chords.trim()) {
  console.error('Missing required --chords progression.');
  process.exit(1);
}

let mosaicSectionPlan: GenerateRequest['mosaicSectionPlan'];
try {
  mosaicSectionPlan = JSON.parse(sectionsRaw) as GenerateRequest['mosaicSectionPlan'];
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
  mosaicSectionPlan,
};

const result = apiGenerate(request, getComposerFilesRoot());

if (!result.success || !('filepath' in result) || !result.filepath) {
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

if (result.filepath && outputArg) {
  const filename = path.basename(result.filepath);
  const dest = path.join(outputArg, filename);
  fs.mkdirSync(outputArg, { recursive: true });
  fs.copyFileSync(result.filepath, dest);
  console.log('Output:', dest);
  console.log('Size:', fs.statSync(dest).size, 'bytes');
  if (mosaicSectionPlan && mosaicSectionPlan.length > 0) {
    const marked = addRehearsalMarksToMusicXml(fs.readFileSync(dest, 'utf8'), mosaicSectionPlan);
    fs.writeFileSync(dest, marked, 'utf8');
    console.log('Size:', fs.statSync(dest).size, 'bytes');
  }
  if (!result.success) {
    console.log('Validation warnings:');
    const resultErrors = (result as { errors?: string[] }).errors ?? result.validation?.errors ?? [];
    resultErrors.forEach((e: string) => console.log(' -', e));
    console.log('File written.', 'Open in Sibelius for review.');
  }
}
