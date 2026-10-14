/**
 * BHL iteration 2 — phrase plan.
 * The plan is derived from bass pitch-class fields, metre, and rests.
 * It is the contract the generator obeys. It does not store a finished guitar line.
 */

import { TONALITY_VAULT_DATABASE } from '../harmony/tonalityVaultDatabase';
import { selectQuadratonicMelodySpec } from '../harmony/quadratonicMelodySelector';
import type { TensionState } from '../harmony/layerStateMachine';
import type { BhlSpan } from './bhlTypes';
import {
  detectMechanicalOnsets,
  readBassBars,
  type BhlBassBar,
  type BhlOnsetPlan,
  type BhlRhythmTransform,
} from './bhlRhythm';
import type { BhlSourceEvent, BhlMetreLock } from './bhlTypes';

export type BhlPhraseRole = 'statement' | 'transformation' | 'development' | 'return' | 'continuation';

/** How a continuation region develops. Absent means the region keeps its dialogue and is not rewritten. */
export type BhlContinuationStrategy = 'extend' | 'fragment' | 'sequence' | 'rhythm' | 'converse';

export type BhlPitchTransform =
  | 'neighbor-statement'
  | 'invert-into-field'
  | 'reproject-neighbor'
  | 'recall-cell'
  | 'retain-and-admit-bass';

export type { BhlRhythmTransform } from './bhlRhythm';

export type BhlDialogue =
  | 'answer-after-bass'
  | 'counter-motion'
  | 'leave-space'
  | 'handoff-before-bass';

export type BhlDensity = 'dyad' | 'single' | 'alternate' | 'triad' | 'counterline';

/** Vault qualities that would install a maj7 or a dominant cycle. BHL does not plan these. */
export const BHL_EXCLUDED_VAULT_TYPES = new Set([
  'Maj7#5',
  'Maj7#11#9',
  'Maj7',
  'Maj6',
  '13#11#9',
  'Maj7#11',
  '7#9#5',
  '13b9',
  'Maj9',
  'minMaj13#11#9',
]);

export interface BhlPhraseRegion {
  id: string;
  from: number;
  to: number;
  /** Document-order bars this region actually governs. May be a subset of from–to. */
  bars: number[];
  role: BhlPhraseRole;
  pitchClasses: number[];
  vaultChordType: string;
  vaultRootPc: number;
  tensionState: TensionState;
  motifSourceId: string;
  pitchTransform: BhlPitchTransform;
  transposeSemitones: number;
  rhythmTransform: BhlRhythmTransform;
  displacementQuarters: number;
  /** Used only when `rhythmTransform` is `ostinato`. */
  ostinatoOnsets: number[] | null;
  dialogue: BhlDialogue;
  registerLow: number;
  registerHigh: number;
  density: BhlDensity;
  ostinatoJustified: boolean;
  retainPitchClass: number | null;
  predicates: string[];
  /** Declared only when this continuation region should develop. Silence, handoff, and leave-space still block it. */
  continuation?: BhlContinuationStrategy;
  /** One explicit pitch outside the selected field. Accidental leakage stays snapped. */
  outsideColour?: boolean;
}

export interface BhlMotifSource {
  id: string;
  /** Ordered pitch classes of the neighbor cell. */
  pitchClasses: number[];
  /** Signed shortest steps between those pitch classes. */
  intervals: number[];
}

export interface BhlPhrasePlan {
  seed: number;
  span: BhlSpan;
  motif: BhlMotifSource;
  regions: BhlPhraseRegion[];
}

export interface BhlGuitarEvent {
  bar: number;
  regionId: string;
  onsetQuarters: number;
  quarters: number;
  midis: number[];
  pitchClasses: number[];
  /** Independent guitar voice. Omitted notes are voice 1. */
  voice?: '1' | '2';
}

export interface BhlFieldSnap {
  bar: number;
  onsetQuarters: number;
  fromPc: number;
  toPc: number;
  reason: 'vault-layer' | 'invert-or-transpose' | 'partner-dropped';
}

export interface BhlPredicateResult {
  id: string;
  ok: boolean;
  detail: string;
}

const TENSION_BY_ROLE: Record<BhlPhraseRole, TensionState> = {
  statement: 'primary',
  transformation: 'tension',
  development: 'chaos',
  return: 'resolve',
  continuation: 'recover',
};

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function signedInterval(from: number, to: number): number {
  let step = mod12(to - from);
  if (step > 6) step -= 12;
  return step;
}

export function samePitchSet(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) return false;
  const b = [...right].sort((x, y) => x - y);
  return [...left].sort((x, y) => x - y).every((pc, index) => pc === b[index]);
}

function hasTritone(pcs: readonly number[]): boolean {
  for (const left of pcs) {
    for (const right of pcs) {
      if (mod12(right - left) === 6) return true;
    }
  }
  return false;
}

/** Three-note neighbor cell: step up, then fall to the remaining tone. Avoids a bare fifth. */
export function neighborCell(pitchClasses: readonly number[]): number[] {
  const uniq = [...new Set(pitchClasses.map(mod12))].sort((a, b) => a - b);
  if (uniq.length <= 2) return uniq;
  let best: number[] = uniq.slice(0, 3);
  let bestScore = -Infinity;
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      for (let k = j + 1; k < uniq.length; k++) {
        const cell = [uniq[i]!, uniq[j]!, uniq[k]!];
        const steps = [mod12(cell[1]! - cell[0]!), mod12(cell[2]! - cell[1]!), mod12(cell[2]! - cell[0]!)];
        const stepCount = steps.filter((step) => step === 1 || step === 2 || step === 10 || step === 11).length;
        const thirdCount = steps.filter((step) => step === 3 || step === 4 || step === 8 || step === 9).length;
        const onlyFifths = steps.every((step) => step === 0 || step === 7 || step === 5);
        const containsEG = cell.includes(4) && cell.includes(7) && cell.every((pc) => pc === 4 || pc === 7);
        let score = stepCount * 4 + thirdCount * 2 + (onlyFifths ? -8 : 0) + (containsEG ? -6 : 0);
        if (score > bestScore || (score === bestScore && cell.join() < best.join())) {
          bestScore = score;
          best = cell;
        }
      }
    }
  }
  if (best.length < 3) return best;
  return [best[1]!, best[2]!, best[0]!];
}

export function motifIntervals(pitchClasses: readonly number[]): number[] {
  const out: number[] = [];
  for (let index = 1; index < pitchClasses.length; index++) out.push(signedInterval(pitchClasses[index - 1]!, pitchClasses[index]!));
  return out;
}

export interface BhlVaultChoice {
  chordType: string;
  rootPc: number;
  overlap: number;
}

export function chooseVaultChord(field: readonly number[], rootPc: number): BhlVaultChoice {
  let best: BhlVaultChoice = { chordType: 'min11', rootPc, overlap: -1 };
  for (const row of TONALITY_VAULT_DATABASE) {
    if (BHL_EXCLUDED_VAULT_TYPES.has(row.chordType)) continue;
    const spec = selectQuadratonicMelodySpec(row.chordType);
    if (!spec) continue;
    const absolute = spec.quadratonicPitchClassesFromRoot.map((rel) => mod12(rootPc + rel));
    const overlap = absolute.filter((pc) => field.includes(pc)).length;
    const tritoneBias = hasTritone(field) && row.chordType === 'min7b5' ? 0.1 : 0;
    if (overlap + tritoneBias > best.overlap) best = { chordType: row.chordType, rootPc, overlap };
  }
  return best;
}

const PC_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export function bhlPitchClassName(pitchClass: number): string {
  return PC_NAMES[mod12(pitchClass)] ?? String(pitchClass);
}

export interface BhlFieldChoice {
  id: string;
  label: string;
  pitchClasses: number[];
  vaultChordType: string;
  vaultRootPc: number;
  /** `bass` is the locked field the planner already chose. `vault` replaces that field. */
  source: 'bass' | 'vault';
}

/** Bass field, then vault quadratonics that share at least two pitch classes with it. */
export function listBhlFieldChoices(field: readonly number[], rootPc: number): BhlFieldChoice[] {
  const uniq = [...new Set(field.map(mod12))].sort((a, b) => a - b);
  const chosen = chooseVaultChord(uniq, rootPc);
  const choices: BhlFieldChoice[] = [
    {
      id: 'bass-field',
      label: `Bass field ${uniq.map(bhlPitchClassName).join(' ')} · ${chosen.chordType}`,
      pitchClasses: uniq,
      vaultChordType: chosen.chordType,
      vaultRootPc: rootPc,
      source: 'bass',
    },
  ];
  const ranked: Array<{ chordType: string; absolute: number[]; overlap: number }> = [];
  for (const row of TONALITY_VAULT_DATABASE) {
    if (BHL_EXCLUDED_VAULT_TYPES.has(row.chordType)) continue;
    if (row.chordType === chosen.chordType) continue;
    const spec = selectQuadratonicMelodySpec(row.chordType);
    if (!spec) continue;
    const absolute = spec.quadratonicPitchClassesFromRoot.map((rel) => mod12(rootPc + rel));
    const overlap = absolute.filter((pc) => uniq.includes(pc)).length;
    if (overlap < 2) continue;
    ranked.push({ chordType: row.chordType, absolute: [...absolute].sort((a, b) => a - b), overlap });
  }
  ranked.sort((a, b) => b.overlap - a.overlap || a.chordType.localeCompare(b.chordType));
  for (const row of ranked.slice(0, 6)) {
    choices.push({
      id: `vault:${row.chordType}`,
      label: `${row.chordType} · ${row.absolute.map(bhlPitchClassName).join(' ')}`,
      pitchClasses: row.absolute,
      vaultChordType: row.chordType,
      vaultRootPc: rootPc,
      source: 'vault',
    });
  }
  return choices;
}

function regionBase(
  bars: readonly BhlBassBar[],
  role: BhlPhraseRole,
  rhythm: BhlRhythmTransform,
  pitch: BhlPitchTransform,
  motifId: string,
): BhlPhraseRegion {
  const ordered = bars.map((bar) => bar.bar).sort((a, b) => a - b);
  const from = ordered[0]!;
  const to = ordered[ordered.length - 1]!;
  const pitchClasses = [...new Set(bars.flatMap((bar) => bar.pitchClasses))].sort((a, b) => a - b);
  const rootPc = bars[0]!.rootPc;
  const vault = chooseVaultChord(pitchClasses, rootPc);
  const metreChange = bars.some((bar) => bar.quarters !== 4);
  return {
    id: `${role}-${ordered.join('.')}`,
    from,
    to,
    bars: ordered,
    role,
    pitchClasses,
    vaultChordType: vault.chordType,
    vaultRootPc: rootPc,
    tensionState: TENSION_BY_ROLE[role],
    motifSourceId: motifId,
    pitchTransform: pitch,
    transposeSemitones: 0,
    rhythmTransform: metreChange ? 'metre-compress' : rhythm,
    displacementQuarters: 0.5,
    ostinatoOnsets: null,
    dialogue: metreChange ? 'handoff-before-bass' : role === 'development' ? 'counter-motion' : role === 'continuation' ? 'leave-space' : 'answer-after-bass',
    registerLow: role === 'statement' || role === 'transformation' || role === 'return' ? 64 : 60,
    registerHigh: 74,
    density: role === 'continuation' && !metreChange ? 'single' : role === 'development' && rhythm === 'silence-window' ? 'single' : 'dyad',
    ostinatoJustified: false,
    retainPitchClass: null,
    predicates:
      role === 'development'
        ? ['onset-differs-from-statement', 'interval-differs-from-statement']
        : role === 'transformation'
          ? ['onset-or-duration-differs']
          : role === 'return'
            ? ['motif-interval-returns']
            : role === 'continuation'
              ? ['leaves-at-least-one-beat']
              : ['states-neighbor-cell'],
  };
}

export function deriveBhlPhrasePlan(
  bass: readonly BhlSourceEvent[],
  metres: readonly BhlMetreLock[],
  bassPartId: string,
  span: BhlSpan,
  seed: number,
): BhlPhrasePlan {
  const bars = readBassBars(bass, metres, bassPartId).filter((bar) => bar.bar >= span.from && bar.bar <= span.to);
  if (!bars.length) throw new Error(`no bass bars in ${span.from}–${span.to}`);
  const motifId = 'bhl-cell';
  const opening = bars[0]!.pitchClasses;
  const cell = neighborCell(opening.length ? opening : [bars[0]!.rootPc]);
  const regions: BhlPhraseRegion[] = [];
  let index = 0;
  regions.push(regionBase([bars[index]!], 'statement', 'state-onsets', 'neighbor-statement', motifId));
  index += 1;
  if (index < bars.length && bars[index]!.quarters === bars[0]!.quarters && samePitchSet(bars[index]!.pitchClasses, opening)) {
    regions.push(regionBase([bars[index]!], 'transformation', 'augment', 'invert-into-field', motifId));
    index += 1;
  }
  const dev: BhlBassBar[] = [];
  while (
    index < bars.length &&
    bars[index]!.quarters === bars[0]!.quarters &&
    !samePitchSet(bars[index]!.pitchClasses, opening)
  ) {
    dev.push(bars[index]!);
    index += 1;
  }
  if (dev.length) {
    let silenceAt = -1;
    let best = 0;
    dev.forEach((bar, devIndex) => {
      const longest = Math.max(0, ...bar.rests.map((rest) => rest.quarters));
      if (longest > best + 1e-6) {
        best = longest;
        silenceAt = devIndex;
      }
    });
    const spoken = dev.filter((_, devIndex) => devIndex !== silenceAt);
    if (spoken.length) regions.push(regionBase(spoken, 'development', 'diminish', 'reproject-neighbor', motifId));
    if (silenceAt >= 0 && best >= 1 - 1e-6) {
      regions.push(regionBase([dev[silenceAt]!], 'development', 'silence-window', 'reproject-neighbor', motifId));
    }
  }
  const returning: BhlBassBar[] = [];
  while (index < bars.length && bars[index]!.quarters === bars[0]!.quarters && samePitchSet(bars[index]!.pitchClasses, opening)) {
    returning.push(bars[index]!);
    index += 1;
  }
  if (returning.length) regions.push(regionBase(returning, 'return', 'state-onsets', 'recall-cell', motifId));
  while (index < bars.length) {
    const bar = bars[index]!;
    const group = [bar];
    index += 1;
    const region = regionBase(
      group,
      'continuation',
      bar.quarters === bars[0]!.quarters ? 'augment' : 'metre-compress',
      'retain-and-admit-bass',
      motifId,
    );
    const previous = regions[regions.length - 1];
    const shared = previous?.pitchClasses.filter((pcValue) => cell.includes(pcValue)) ?? [];
    region.retainPitchClass = shared[shared.length - 1] ?? previous?.pitchClasses[0] ?? null;
    if (region.retainPitchClass !== null && !region.pitchClasses.includes(region.retainPitchClass)) {
      region.pitchClasses = [...region.pitchClasses, region.retainPitchClass].sort((a, b) => a - b);
    }
    regions.push(region);
  }
  return {
    seed,
    span,
    motif: { id: motifId, pitchClasses: cell, intervals: motifIntervals(cell) },
    regions,
  };
}

export function topPitchClasses(events: readonly BhlGuitarEvent[]): number[] {
  return events.map((event) => Math.max(...event.midis) % 12);
}

export function evaluateBhlPredicates(
  plan: BhlPhrasePlan,
  events: readonly BhlGuitarEvent[],
  onsetPlans: readonly BhlOnsetPlan[],
): BhlPredicateResult[] {
  const results: BhlPredicateResult[] = [];
  const mechanical = detectMechanicalOnsets(onsetPlans);
  results.push({
    id: 'no-unexplained-mechanical-grid',
    ok: mechanical.length === 0,
    detail: mechanical.length ? mechanical.map((hit) => `${hit.signature} @ ${hit.bars.join('+')}`).join('; ') : 'no repeated attack grid',
  });
  const roots = plan.regions.map((region) => region.vaultRootPc);
  let fifthRun = 1;
  let fifthCycle = false;
  for (let index = 1; index < roots.length; index++) {
    const step = ((roots[index - 1]! - roots[index]!) % 12 + 12) % 12;
    fifthRun = step === 7 ? fifthRun + 1 : 1;
    if (fifthRun >= 3) fifthCycle = true;
  }
  results.push({
    id: 'no-circle-of-fifths',
    ok: !fifthCycle && plan.regions.every((region) => !BHL_EXCLUDED_VAULT_TYPES.has(region.vaultChordType)),
    detail: `roots ${roots.join(',')} vault ${plan.regions.map((region) => region.vaultChordType).join(',')}`,
  });
  const fifthOnly =
    events.length > 0 &&
    events.every((event) => event.midis.length >= 2 && [5, 7].includes(mod12(Math.max(...event.midis) - Math.min(...event.midis))));
  results.push({
    id: 'no-root-fifth-texture',
    ok: !fifthOnly,
    detail: fifthOnly ? 'every guitar stack is a fourth or fifth' : 'dyads use seconds or thirds, or the bar is a single line',
  });
  return results;
}
