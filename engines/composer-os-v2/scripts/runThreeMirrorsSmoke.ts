/**
 * Three Mirrors mosaic smoke — melody-bass-chords export with 5/4 intro.
 * Run: npx ts-node engines/composer-os-v2/scripts/runThreeMirrorsSmoke.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';

const SEED = 77002;
const TOTAL_BARS = 64;
const BPM = 120;
const OUTPUT_PATH = 'C:/Dev/composer-os/Mike Composer Combi Songs/Three-Mirrors-v3.6.musicxml';

const MOSAIC_SECTION_PLAN: NonNullable<RunGoldenPathOptions['mosaicSectionPlan']> = [
  {
    sectionLabel: 'intro',
    startBar: 1,
    endBar: 16,
    songwriterStyleId: 'fripp',
    timeSignature: { numerator: 5, denominator: 4 },
    phraseRole: 'statement',
  },
  {
    sectionLabel: 'verse',
    startBar: 17,
    endBar: 32,
    songwriterStyleId: 'jack_white',
    phraseRole: 'development',
  },
  {
    sectionLabel: 'chorus',
    startBar: 33,
    endBar: 64,
    songwriterStyleId: 'wayne_shorter',
    phraseRole: 'climax',
  },
];

function lockedHarmony64(): string[] {
  const cycle = ['Am', 'Dm', 'G', 'C', 'F', 'E7', 'Am', 'G'];
  return Array.from({ length: TOTAL_BARS }, (_, i) => cycle[i % cycle.length]!);
}

function main(): void {
  const locked = lockedHarmony64();
  const progressionText = locked.join(' | ');

  console.log(`seed: ${SEED}`);
  console.log(
    'sections:',
    MOSAIC_SECTION_PLAN.map(
      (s) =>
        `${s.sectionLabel} bars ${s.startBar}-${s.endBar} (${s.songwriterStyleId})${
          s.timeSignature ? ` ${s.timeSignature.numerator}/${s.timeSignature.denominator}` : ''
        }`
    ).join('; ')
  );
  console.log(`output: ${OUTPUT_PATH}`);

  const result = runGoldenPathOnce(SEED, {
    presetId: 'guitar_bass_duo',
    scoreTitle: 'Three Mirrors',
    bpm: BPM,
    totalBars: TOTAL_BARS,
    longFormEnabled: true,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: locked,
    parsedChordBars: [...locked],
    chordProgressionText: progressionText,
    mosaicSectionPlan: MOSAIC_SECTION_PLAN,
    mosaicOutputFormat: 'melody-bass-chords',
  });

  const evalResults = result.context?.generationMetadata?.mosaicSectionEvalResults ?? [];
  for (const section of evalResults) {
    if (!section.passed) {
      console.warn(
        `[eval] section ${section.sectionLabel} failed GCE (${section.failures.join('; ') || 'no detail'})`
      );
    }
  }
  if (evalResults.length === 0) {
    console.warn('[eval] no mosaicSectionEvalResults on context');
  }

  let xml = result.xml;
  if (!xml && result.score) {
    const barMeter =
      result.context?.barMeterMap ?? result.context?.generationMetadata?.barMeterMap;
    const fallback = exportScoreModelToMusicXml(result.score, {
      bpm: BPM,
      ...(barMeter ? { barMeterMap: barMeter } : {}),
    });
    xml = fallback.xml;
    if (!fallback.success) {
      console.warn('[export] fallback export errors:', fallback.errors.join('; '));
    }
  }

  if (!xml) {
    console.error('generation failed:', result.errors.slice(0, 5).join('; '));
    process.exit(1);
  }

  if (!result.success) {
    console.warn(`[gates] runGoldenPathOnce success=false (${result.errors.length} errors)`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
  console.log(`wrote ${OUTPUT_PATH} (${xml.length} bytes)`);
}

main();
