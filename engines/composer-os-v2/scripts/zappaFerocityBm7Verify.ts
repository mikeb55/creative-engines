/**
 * Sibelius QA helper — Bm7 x8, frank_zappa, bluesrockFerocious (seed 42001).
 * Writes MusicXML + per-bar guitar density report to _test_outputs/zappa_ferocity_verify/.
 */
import * as fs from 'fs';
import * as path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

const bars = Array(8).fill('Bm7');
const seed = 42001;

const r = runGoldenPathOnce(seed, {
  presetId: 'guitar_bass_duo',
  totalBars: 8,
  primarySongwriterStyle: 'frank_zappa',
  harmonyMode: 'custom_locked',
  chordProgressionText: bars.join('|'),
  parsedChordBars: bars,
  lockedHarmonyBarsRaw: bars,
  zappaStyleMode: 'bluesrockFerocious',
});
const mode = 'custom_locked_bm7' as const;

if (!r.success || !r.score) {
  console.error('generation failed', r.errors);
  process.exit(1);
}

const md = r.context?.generationMetadata;
const ex = exportScoreModelToMusicXml(r.score);
const repoRoot = path.resolve(__dirname, '../../..');
const outDir = path.join(repoRoot, '_test_outputs', 'zappa_ferocity_verify');
fs.mkdirSync(outDir, { recursive: true });
const xmlPath = path.join(outDir, 'bm7_x8_frank_zappa_ferocity.musicxml');
if (!ex.success || !ex.xml) {
  console.error('export failed', ex.errors);
  process.exit(1);
}
fs.writeFileSync(xmlPath, ex.xml);

const guitarPart =
  r.score.parts.find((p) => /guitar|gtr|electric/i.test(`${p.name ?? ''} ${p.id ?? ''}`)) ??
  r.score.parts.find((p) => !/bass/i.test(`${p.name ?? ''} ${p.id ?? ''}`));

const rows = (guitarPart?.measures ?? []).map((m, i) => {
  let notes = 0;
  let rests = 0;
  for (const ev of m.events) {
    if (ev.kind === 'note') notes++;
    if (ev.kind === 'rest') rests++;
  }
  return { bar: i + 1, notes, rests };
});

const noteCounts = rows.map((x) => x.notes);
const maxNotes = Math.max(...noteCounts, 0);
const minNotes = Math.min(...noteCounts, 99);
const burstBars = rows.filter((x) => x.notes >= 8).length;
const sparseBars = rows.filter((x) => x.notes <= 3 || x.rests > 0).length;
const contrastOk = maxNotes >= 8 && sparseBars >= 1 && maxNotes - minNotes >= 4;

const report = {
  harmonyPath: mode,
  xmlPath,
  zappaStyleMode: md?.zappaStyleMode,
  perBar: rows,
  maxNotes,
  minNotes,
  burstBars,
  sparseBars,
  structuralContrastOk: contrastOk,
};

fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(contrastOk ? 0 : 1);
