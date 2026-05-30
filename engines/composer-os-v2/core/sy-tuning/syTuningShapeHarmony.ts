/**
 * SY shape-resonance harmony (V106p3) — tuning-native shapes, not tertian cadences.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { mulberry32 } from '../remix/vaultSeedMix';
import { resolveDualGuitarTuningPair } from './syTuningPresetCatalog';
import type {
  SYDualGuitarArchetype,
  SYShapeBarPlan,
  SYTuningDefinition,
  SYTuningPresetId,
} from './syTuningTypes';

const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const DEFAULT_BAR_COUNT = 8;

function pcName(pc: number): string {
  return PC_NAMES[((pc % 12) + 12) % 12]!;
}

function openPcs(strings: readonly number[]): number[] {
  return strings.map((m) => ((m % 12) + 12) % 12);
}

function inferWybleRootPc(symbol: string): number {
  const trimmed = String(symbol || '').trim();
  if (!trimmed) return 0;
  const slashIdx = trimmed.indexOf('/');
  const harmony = slashIdx >= 0 ? trimmed.slice(0, slashIdx) : trimmed;
  const m = harmony.match(/^([A-G][#b]?)/i);
  const root = m?.[1] ?? 'C';
  return noteNameToPitchClass(root) ?? 0;
}

/** Adjacent open-string interval classes (unison / 2nd / 4th / 5th blocks). */
export function adjacentStringBlocks(strings: readonly number[]): { interval: number; count: number }[] {
  const pcs = openPcs(strings);
  const tally = new Map<number, number>();
  for (let i = 0; i < pcs.length - 1; i++) {
    const iv = Math.abs(pcs[i]! - pcs[i + 1]!) % 12;
    const cls = iv === 0 ? 0 : iv <= 2 ? iv : iv === 5 || iv === 7 ? 7 : iv;
    tally.set(cls, (tally.get(cls) ?? 0) + 1);
  }
  return [...tally.entries()].map(([interval, count]) => ({ interval, count }));
}

export function ringingStringMask(
  tuning: SYTuningDefinition,
  fretOffset: number,
  stagger: boolean,
): readonly boolean[] {
  const blocks = adjacentStringBlocks(tuning.strings);
  const hasUnison = blocks.some((b) => b.interval === 0);
  const mask = tuning.strings.map((_, i) => {
    if (stagger && i % 2 === 1) return false;
    if (hasUnison) return i % 2 === 0 || i === tuning.strings.length - 1;
    return true;
  });
  if (fretOffset % 3 === 0) {
    return mask.map((on, i) => (i === 0 ? true : on));
  }
  return mask;
}

function soundingMidis(
  tuning: SYTuningDefinition,
  fretOffset: number,
  mask: readonly boolean[],
): number[] {
  const out: number[] = [];
  for (let i = 0; i < tuning.strings.length; i++) {
    if (!mask[i]) continue;
    const fret = fretOffset + (i % 2 === 0 ? 0 : 1);
    out.push(tuning.strings[i]! + Math.max(0, fret));
  }
  return out.sort((a, b) => a - b);
}

/** Non-tertian export symbol from sounding cluster — sus / power / add colour only. */
export function shapeClusterToExportSymbol(
  midis: readonly number[],
  wybleAnchor?: string,
): string {
  if (midis.length === 0) {
    return wybleAnchor?.trim() ? wybleAnchor : 'Fsus2';
  }
  const pcs = [...new Set(midis.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b);
  const rootPc = wybleAnchor ? inferWybleRootPc(wybleAnchor) : pcs[0] ?? 0;
  const root = pcName(rootPc);
  const hasMinorSecond = pcs.some((p) => (p - rootPc + 12) % 12 === 1);
  const hasTritone = pcs.some((p) => (p - rootPc + 12) % 12 === 6);
  const hasFourth = pcs.some((p) => (p - rootPc + 12) % 12 === 5);
  if (hasMinorSecond || hasTritone) return `${root}sus4`;
  if (hasFourth) return `${root}sus4`;
  if (pcs.length <= 2) return `${root}5`;
  return `${root}sus2`;
}

function wybleAnchorForBar(
  anchors: readonly string[] | undefined,
  barIndex: number,
  barCount: number,
): string | undefined {
  if (!anchors?.length) return undefined;
  const idx = Math.min(anchors.length - 1, Math.floor((barIndex / barCount) * anchors.length));
  return anchors[idx];
}

function shapeFretOffset(seed: number, barIndex: number, tuning: SYTuningDefinition): number {
  const rng = mulberry32((seed ^ (barIndex * 0x9e3779b1)) >>> 0);
  const blocks = adjacentStringBlocks(tuning.strings);
  const friction = blocks.some((b) => b.interval === 1 || b.interval === 2) ? 2 : 0;
  const base = Math.floor(rng() * 4);
  return base + friction;
}

export function generateSYShapeHarmony(params: {
  tuningId: SYTuningPresetId;
  archetype: SYDualGuitarArchetype;
  seed: number;
  totalBars?: number;
  wybleAnchorBars?: readonly string[];
}): {
  plans: SYShapeBarPlan[];
  harmonyBars: string[];
  guitar1: SYTuningDefinition;
  guitar2: SYTuningDefinition;
} {
  const barCount = params.totalBars ?? DEFAULT_BAR_COUNT;
  const { guitar1, guitar2 } = resolveDualGuitarTuningPair(params.archetype, params.tuningId);
  const stagger = params.archetype === 'mass_mass';
  const plans: SYShapeBarPlan[] = [];
  const harmonyBars: string[] = [];

  for (let i = 0; i < barCount; i++) {
    const wybleAnchor = wybleAnchorForBar(params.wybleAnchorBars, i, barCount);
    const fret1 = shapeFretOffset(params.seed, i, guitar1);
    const fret2 =
      params.archetype === 'mass_mass'
        ? fret1 + (i % 2 === 0 ? 0 : 1)
        : shapeFretOffset(params.seed ^ 0x51, i, guitar2);
    const mask1 = ringingStringMask(guitar1, fret1, stagger && i % 2 === 1);
    const mask2 = ringingStringMask(guitar2, fret2, stagger && i % 2 === 0);
    const g1Midis = soundingMidis(guitar1, fret1, mask1);
    const g2Midis = soundingMidis(guitar2, fret2, mask2);
    const combined = [...g1Midis, ...g2Midis];
    const exportSymbol = shapeClusterToExportSymbol(combined, wybleAnchor);
    plans.push({
      barIndex: i,
      fretOffset: fret1,
      ringingMask: mask1,
      guitar1Midis: g1Midis,
      guitar2Midis: g2Midis,
      exportSymbol,
      wybleAnchor,
    });
    harmonyBars.push(exportSymbol);
  }

  return { plans, harmonyBars, guitar1, guitar2 };
}

/** Movable fret shape that preserves tuning friction (same adjacent block profile). */
export function preservesTuningFriction(
  tuning: SYTuningDefinition,
  fromFret: number,
  toFret: number,
): boolean {
  const before = adjacentStringBlocks(tuning.strings.map((m) => m + fromFret));
  const after = adjacentStringBlocks(tuning.strings.map((m) => m + toFret));
  if (before.length !== after.length) return false;
  return before.every((b, i) => after[i]?.interval === b.interval);
}

export function parseShapeRootPc(symbol: string): number {
  const parsed = parseChordSymbol(symbol);
  const m = parsed.harmonyPart.match(/^([A-G][#b]?)/i);
  return noteNameToPitchClass(m?.[1] ?? 'C') ?? 0;
}
