import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { validateMusicXmlFile } from '../tests/outputValidation/musicXmlOutputValidator';

const outRoot = path.resolve(__dirname, '../_v65_p3_sibelius_qa');
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });

const chords = 'Cmaj7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bb7 | Ebmaj7 | Ab7';

type QaRequest = Partial<GenerateRequest> & Pick<GenerateRequest, 'presetId' | 'seed'>;

const cases: Array<{ mode: string; req: QaRequest; expectedParts?: number }> = [
  {
    mode: 'Song Mode (guitar_bass_duo)',
    expectedParts: 2,
    req: {
      presetId: 'guitar_bass_duo',
      seed: 83001,
      totalBars: 8,
      title: 'V65 P3 QA Song Mode',
      primarySongwriterStyle: 'barry_harris',
      styleProfile: 'STYLE_ECM',
      harmonyMode: 'custom_locked',
      chordProgressionText: chords,
      skipDrumGuide: true,
    },
  },
  {
    mode: 'GBD',
    expectedParts: 2,
    req: {
      presetId: 'guitar_bass_duo',
      seed: 83002,
      totalBars: 8,
      title: 'V65 P3 QA GBD',
      harmonyMode: 'custom_locked',
      chordProgressionText: chords,
      skipDrumGuide: true,
    },
  },
  {
    mode: 'ECM chamber',
    expectedParts: 2,
    req: {
      presetId: 'ecm_chamber',
      seed: 83003,
      totalBars: 8,
      title: 'V65 P3 QA ECM',
      skipDrumGuide: true,
    },
  },
  {
    mode: 'String Quartet',
    expectedParts: 5,
    req: {
      presetId: 'string_quartet',
      seed: 83004,
      totalBars: 8,
      title: 'V65 P3 QA SQ',
      chordProgressionText: chords,
    },
  },
  {
    mode: 'Big Band',
    req: {
      presetId: 'big_band',
      seed: 83005,
      totalBars: 8,
      title: 'V65 P3 QA BB',
      chordProgressionText: chords,
      ensembleConfigId: 'full_band',
      stylePairing: { songwriterStyle: 'barry_harris', arrangerStyle: 'thad', era: 'swing' },
    },
  },
  {
    mode: 'Riff generator',
    req: {
      presetId: 'riff_generator',
      seed: 83006,
      totalBars: 8,
      title: 'V65 P3 QA Riff',
      chordProgressionText: chords,
      riffLineMode: 'guitar_bass',
      riffBass: true,
    },
  },
  {
    mode: 'Wyble etude',
    expectedParts: 1,
    req: {
      presetId: 'wyble_etude',
      seed: 83007,
      totalBars: 8,
      title: 'V65 P3 QA Wyble',
      chordProgressionText: chords,
    },
  },
  {
    mode: 'Slonimsky etude',
    expectedParts: 1,
    req: {
      presetId: 'slonimsky_etude',
      seed: 83008,
      totalBars: 8,
      title: 'V65 P3 QA Slonimsky',
      chordProgressionText: chords,
      slonimskyPatternId: 'p_wholeTone',
    },
  },
];

for (const c of cases) {
  const dir = path.join(outRoot, c.mode.replace(/[^\w]+/g, '_'));
  fs.mkdirSync(dir, { recursive: true });
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => undefined;
  console.warn = () => undefined;
  const reqWithStyle = {
    ...c.req,
    styleStack: c.req.styleStack ?? { primary: 'barry_harris' },
  } as GenerateRequest;
  const res = runAppGeneration(reqWithStyle, dir);
  console.log = originalLog;
  console.warn = originalWarn;
  const xmlPath = res.ensembleMusicXmlFilepath ?? res.filepath;
  if (!res.success || !xmlPath || !fs.existsSync(xmlPath)) {
    console.log(`FAIL\t${c.mode}\tgenerated=${res.success}\t${res.error ?? 'no MusicXML filepath'}`);
    continue;
  }
  const validation = validateMusicXmlFile(xmlPath, {
    expectedPartCount: c.expectedParts,
    expectHarmony: c.mode.includes('Slonimsky') || c.mode.includes('Wyble') ? false : true,
  });
  console.log(
    `${validation.passed ? 'PASS' : 'FAIL'}\t${c.mode}\tparts=${validation.stats.partCount}\tmeasures=${validation.stats.measureCount}\tharmony=${validation.stats.harmonyCount}\tfile=${path.relative(process.cwd(), xmlPath)}`
  );
  if (validation.failures.length) console.log(`  failures: ${validation.failures.join(' | ')}`);
  const hardWarnings = validation.warnings.filter((w) => !/^xsd skipped/i.test(w) && !/^xsd ok/i.test(w));
  if (hardWarnings.length) console.log(`  warnings: ${hardWarnings.join(' | ')}`);
}
