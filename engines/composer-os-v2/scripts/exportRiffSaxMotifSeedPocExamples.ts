/**
 * Export A/B MusicXML for Phase 2 sax motif-seed POC (weather_report).
 *
 *   npx tsx --tsconfig ../../tsconfig.json scripts/exportRiffSaxMotifSeedPocExamples.ts
 *
 * Writes flag OFF + ON pairs under output/riff-sax-motif-seed-poc/
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_SAX_MOTIF_SEED_POC_ENV,
  RIFF_SAX_MOTIF_SEED_POC_VRB,
  resetRiffSaxMotifSeedPocCacheForTests,
  resolveRiffCoreMotif,
} from '../core/riff-generator/riffSaxMotifSeedPoc';

const SEEDS = [424242, 777001, 1307, 90210];

const OUT_DIR = path.resolve(__dirname, '../../../output/riff-sax-motif-seed-poc');

function sha(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function xmlOf(score: Parameters<typeof exportScoreModelToMusicXml>[0]): string {
  const exp = exportScoreModelToMusicXml(score);
  if (!exp.success || !exp.xml) {
    throw new Error(exp.errors.join('; ') || 'MusicXML export failed');
  }
  return exp.xml;
}

function build(seed: number) {
  const style = 'metheny' as const;
  const profile = resolveRiffGeneratorProfile({
    vrbId: RIFF_SAX_MOTIF_SEED_POC_VRB,
    style,
    grid: 'sixteenth',
    density: 'dense',
  });
  return buildRiffScoreModel({
    seed,
    bars: 8,
    density: 'dense',
    style,
    grid: 'sixteenth',
    lineMode: 'single_line',
    bassEnabled: false,
    vrbId: RIFF_SAX_MOTIF_SEED_POC_VRB,
    chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
    bpm: 112,
    title: 'WR sax-motif POC seed ' + seed,
    riffProfile: profile,
  });
}

function setFlag(on: boolean): void {
  if (on) process.env[RIFF_SAX_MOTIF_SEED_POC_ENV] = '1';
  else delete process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
  resetRiffSaxMotifSeedPocCacheForTests();
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const lines: string[] = [
    'Phase 2 POC — sax_inspired → CoreMotif for weather_report',
    'Flag: ' + RIFF_SAX_MOTIF_SEED_POC_ENV,
    'Out: ' + OUT_DIR,
    '',
  ];

  // Parity: two OFF builds same seed
  setFlag(false);
  const paritySeed = SEEDS[0]!;
  const offA = xmlOf(build(paritySeed).score);
  const offB = xmlOf(build(paritySeed).score);
  const parityOk = sha(offA) === sha(offB);
  lines.push('flag-off self-parity seed ' + paritySeed + ': ' + (parityOk ? 'PASS' : 'FAIL') + ' ' + sha(offA).slice(0, 16));

  for (const seed of SEEDS) {
    setFlag(false);
    const offBuilt = build(seed);
    const offXml = xmlOf(offBuilt.score);
    const offMotif = resolveRiffCoreMotif(seed, RIFF_SAX_MOTIF_SEED_POC_VRB);

    setFlag(true);
    const onBuilt = build(seed);
    const onXml = xmlOf(onBuilt.score);
    const onMotif = resolveRiffCoreMotif(seed, RIFF_SAX_MOTIF_SEED_POC_VRB);

    const offPath = path.join(OUT_DIR, 'weather_report_OFF_seed' + seed + '.musicxml');
    const onPath = path.join(OUT_DIR, 'weather_report_ON_seed' + seed + '.musicxml');
    fs.writeFileSync(offPath, offXml, 'utf8');
    fs.writeFileSync(onPath, onXml, 'utf8');

    lines.push(
      [
        'seed=' + seed,
        'OFF motif=' + offMotif.id,
        'ON motif=' + onMotif.id,
        'xmlDiffer=' + (sha(offXml) !== sha(onXml)),
        'files:',
        path.basename(offPath),
        path.basename(onPath),
      ].join(' | ')
    );
  }

  setFlag(false);
  const summaryPath = path.join(OUT_DIR, 'README.txt');
  fs.writeFileSync(summaryPath, lines.join('\n') + '\n', 'utf8');
  console.log(lines.join('\n'));
  console.log('Wrote', summaryPath);
}

main();
