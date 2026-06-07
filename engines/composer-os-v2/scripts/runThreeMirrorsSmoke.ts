/**
 * Three Mirrors mosaic smoke — melody-bass-chords + lead-sheet export with 5/4 intro.
 * Run: npx ts-node engines/composer-os-v2/scripts/runThreeMirrorsSmoke.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import type { GoldenPathResult } from '../core/goldenPath/runGoldenPath';

const SEED = 77002;
const TOTAL_BARS = 64;
const BPM = 120;
const OUTPUT_MELODY_BASS = 'C:/Dev/composer-os/Mike Composer Combi Songs/Three-Mirrors-v3.6.musicxml';
const OUTPUT_LEAD_SHEET =
  'C:/Dev/composer-os/Mike Composer Combi Songs/Three-Mirrors-v3.6-leadsheet.musicxml';

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

function resolveXml(
  result: GoldenPathResult,
  outputPath: string,
): string | undefined {
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
      console.warn(`[export] ${outputPath} fallback errors:`, fallback.errors.join('; '));
    }
  }
  return xml;
}

function runMosaicSmoke(
  mosaicOutputFormat: 'melody-bass-chords' | 'lead-sheet',
  outputPath: string,
): GoldenPathResult {
  const locked = lockedHarmony64();
  const progressionText = locked.join(' | ');

  console.log(`\n--- ${mosaicOutputFormat} ---`);
  console.log(`seed: ${SEED}`);
  console.log(
    'sections:',
    MOSAIC_SECTION_PLAN.map(
      (s) =>
        `${s.sectionLabel} bars ${s.startBar}-${s.endBar} (${s.songwriterStyleId})${
          s.timeSignature ? ` ${s.timeSignature.numerator}/${s.timeSignature.denominator}` : ''
        }`,
    ).join('; '),
  );
  console.log(`output: ${outputPath}`);

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
    mosaicOutputFormat,
  });

  const evalResults = result.context?.generationMetadata?.mosaicSectionEvalResults ?? [];
  for (const section of evalResults) {
    if (!section.passed) {
      console.warn(
        `[eval] section ${section.sectionLabel} failed GCE (${section.failures.join('; ') || 'no detail'})`,
      );
    }
  }
  if (evalResults.length === 0) {
    console.warn('[eval] no mosaicSectionEvalResults on context');
  }

  const xml = resolveXml(result, outputPath);
  if (!xml) {
    console.error('generation failed:', result.errors.slice(0, 5).join('; '));
    process.exit(1);
  }

  if (!result.success) {
    console.warn(`[gates] runGoldenPathOnce success=false (${result.errors.length} errors)`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`wrote ${outputPath} (${xml.length} bytes)`);

  return result;
}

function reportLeadSheetChecks(result: GoldenPathResult, xml: string): void {
  const parts = result.score?.parts ?? [];
  const onePart = parts.length === 1;
  const partName = parts[0]?.name ?? '';
  const hasBass = parts.some(
    (p) => p.id === 'bass' || p.instrumentIdentity === 'acoustic_upright_bass',
  );
  const melody = parts[0];
  const chordAt = (bar: number) => melody?.measures.find((m) => m.index === bar)?.chord;
  const bar1 = chordAt(1);
  const bar17 = chordAt(17);
  const bar33 = chordAt(33);
  const xmlPartCount = (xml.match(/<score-part id="/g) ?? []).length;
  const xmlHasBass = /<part-name>Upright Bass<\/part-name>/.test(xml) || xml.includes('id="bass"');

  console.log('[lead-sheet] checks:');
  console.log(`  1. one part only: ${onePart} (score.parts=${parts.length}, xml score-parts=${xmlPartCount})`);
  console.log(`  2. part name Lead: ${partName === 'Lead'}`);
  console.log(`  3. chords bar1=${bar1 ?? 'MISSING'} bar17=${bar17 ?? 'MISSING'} bar33=${bar33 ?? 'MISSING'}`);
  console.log(`  4. no bass staff: ${!hasBass && !xmlHasBass}`);
}

function main(): void {
  runMosaicSmoke('melody-bass-chords', OUTPUT_MELODY_BASS);

  const leadResult = runMosaicSmoke('lead-sheet', OUTPUT_LEAD_SHEET);
  const leadXml = fs.readFileSync(OUTPUT_LEAD_SHEET, 'utf8');
  reportLeadSheetChecks(leadResult, leadXml);
}

main();
