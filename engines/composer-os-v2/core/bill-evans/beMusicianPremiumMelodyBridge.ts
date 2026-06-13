/**
 * Evans-only Musician shell bridge — bundled lyrical benchmark → style-transfer + premium-melody pin.
 * Not used by web Song Mode, slice smoke, or beGoldenMaster (direct runGoldenPathOnce).
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ImportHarmonyBar,
  ImportMelodyNote,
  MosaicImportTimeline,
} from '../import/mosaicImportTimeline';
import { importTimelineToLockedHarmony } from '../import/importTimelineAdapters';
import { musicXmlToImportTimeline } from '../import/musicXmlToImportTimeline';
import type { RunGoldenPathOptions } from '../goldenPath/runGoldenPath';

export const BE_MUSICIAN_BENCHMARK_FIXTURE_NAME = 'BE_Benchmark_LyricalBallad.musicxml';

function resolveBeBenchmarkFixturePath(): string {
  return path.join(__dirname, 'test-fixtures', BE_MUSICIAN_BENCHMARK_FIXTURE_NAME);
}

/**
 * Modulo-repeat import IR to `targetBars` (Evans Musician prototype only).
 */
export function tileMosaicImportTimelineForBars(
  ir: MosaicImportTimeline,
  targetBars: number
): MosaicImportTimeline {
  const sourceBars = Math.max(1, ir.bars);
  const totalBars = Math.max(1, Math.floor(targetBars));

  if (totalBars <= sourceBars) {
    return {
      ...ir,
      bars: totalBars,
      harmonyByBar: ir.harmonyByBar.filter((h) => h.bar <= totalBars),
      melodyLine: ir.melodyLine.filter((n) => n.bar <= totalBars),
    };
  }

  const sourceHarmonyByBar = [...ir.harmonyByBar].sort((a, b) => a.bar - b.bar);
  const harmonyByBar: ImportHarmonyBar[] = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const src = sourceHarmonyByBar[(bar - 1) % sourceBars];
    if (src) {
      harmonyByBar.push({ ...src, bar });
    }
  }

  const melodyLine: ImportMelodyNote[] = [];
  for (const note of ir.melodyLine) {
    if (note.bar < 1 || note.bar > sourceBars) continue;
    for (let cycle = 0; cycle * sourceBars < totalBars; cycle++) {
      const bar = note.bar + cycle * sourceBars;
      if (bar > totalBars) break;
      melodyLine.push({ ...note, bar });
    }
  }

  return {
    ...ir,
    bars: totalBars,
    harmonyByBar,
    melodyLine,
    parseDiagnostics: [
      ...(ir.parseDiagnostics ?? []),
      `beMusicianPremiumMelodyBridge: tiled ${sourceBars} bars → ${totalBars} (modulo-repeat).`,
    ],
  };
}

export interface BeMusicianPremiumMelodyBridgeExtras {
  importTimeline: MosaicImportTimeline;
  styleTransfer: true;
  targetComposer: 'bill_evans';
  styleTransferStrength: 1;
  preserveMelody: true;
  reorchestrate: false;
  harmonyMode: 'custom_locked';
  lockedHarmonyBarsRaw: string[];
  parsedChordBars: string[];
  chordProgressionText: string;
}

export function buildBeMusicianPremiumMelodyBridgeExtras(
  totalBars: number
): BeMusicianPremiumMelodyBridgeExtras {
  const fixturePath = resolveBeBenchmarkFixturePath();
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Bill Evans Musician bridge: benchmark fixture missing: ${fixturePath}`);
  }
  const baseIr = musicXmlToImportTimeline(fs.readFileSync(fixturePath, 'utf8'));
  const importTimeline = tileMosaicImportTimelineForBars(baseIr, totalBars);
  const locked = importTimelineToLockedHarmony(importTimeline);

  return {
    importTimeline,
    styleTransfer: true,
    targetComposer: 'bill_evans',
    styleTransferStrength: 1,
    preserveMelody: true,
    reorchestrate: false,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: [...locked],
    parsedChordBars: [...locked],
    chordProgressionText: locked.join('|'),
  };
}

export function shouldApplyBeMusicianPremiumMelodyBridge(
  primarySongwriterStyle: string | undefined,
  musicianPremiumMelody: boolean | undefined,
  hasUserImportTimeline: boolean
): boolean {
  return (
    musicianPremiumMelody === true &&
    !hasUserImportTimeline &&
    typeof primarySongwriterStyle === 'string' &&
    primarySongwriterStyle.trim().toLowerCase() === 'bill_evans'
  );
}

export function mergeBeMusicianPremiumMelodyIntoGoldenPathOptions(
  options: RunGoldenPathOptions,
  totalBars: number
): RunGoldenPathOptions {
  const extras = buildBeMusicianPremiumMelodyBridgeExtras(totalBars);
  return {
    ...options,
    ...extras,
    songModeHookFirstIdentity: false,
  };
}
