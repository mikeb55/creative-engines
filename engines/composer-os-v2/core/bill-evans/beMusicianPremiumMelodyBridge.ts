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
import type { GenerationMetadata } from '../compositionContext';
import type { ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';

const BAR_MATH_EPS = 1e-4;

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
  beMusicianPremiumMelodyBridge: true;
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
    beMusicianPremiumMelodyBridge: true,
  };
}

/** Evans Musician 32-bar bridge — behaviour-gate warning demotion (not for native 8-bar oracle). */
export function isBeMusicianPremiumMelodyBridgeActive(
  md: GenerationMetadata | undefined
): boolean {
  return md?.beMusicianPremiumMelodyBridge === true;
}

/**
 * Premium-melody pin on tiled benchmark can emit co-onset v1 grace pairs (e.g. bars 18/24).
 * Collapse to one note per onset so strict bar-math passes without changing native paths.
 */
export function repairBeMusicianBridgeMelodyCoOnsetBarMath(score: ScoreModel): ScoreModel {
  const out = structuredClone(score) as ScoreModel;
  const part = out.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!part) return out;

  for (const m of part.measures) {
    const other = m.events.filter((e) => (e.voice ?? 1) !== 1);
    const v1Notes = m.events.filter(
      (e): e is ScoreEvent & { kind: 'note'; pitch: number } =>
        (e.voice ?? 1) === 1 && e.kind === 'note'
    );
    if (v1Notes.length < 2) continue;

    const sorted = [...v1Notes].sort((a, b) => a.startBeat - b.startBeat);
    const kept: ScoreEvent[] = [];
    let i = 0;
    while (i < sorted.length) {
      const startBeat = sorted[i]!.startBeat;
      const group: (ScoreEvent & { kind: 'note'; pitch: number })[] = [sorted[i]!];
      while (
        i + 1 < sorted.length &&
        Math.abs(sorted[i + 1]!.startBeat - startBeat) <= BAR_MATH_EPS
      ) {
        i++;
        group.push(sorted[i]!);
      }
      if (group.length === 1) {
        kept.push({ ...group[0]!, voice: 1 });
      } else {
        const best = group.reduce((a, b) => (a.pitch >= b.pitch ? a : b));
        kept.push({ ...best, voice: 1 });
      }
      i++;
    }

    const v1Rests = m.events.filter((e) => (e.voice ?? 1) === 1 && e.kind === 'rest');
    m.events = [...other, ...v1Rests, ...kept].sort((a, b) => a.startBeat - b.startBeat);
  }

  return out;
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
