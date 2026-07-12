/**
 * Oliver Nelson — pedal modal head + minor blues solo layer (`on:*` receipts).
 */

import type {
  CompositionContext,
  GenerationMetadata,
  NelsonBluesFormVariant,
  NelsonPeriodMode,
} from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';
import { buildNelsonEpisodePlan, episodeForNelsonBar } from './nelsonEpisodeTypes';

export type { NelsonPeriodMode, NelsonBluesFormVariant } from '../compositionContext';

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

const MINOR_BLUES_12 = [
  'Cm7',
  'Cm7',
  'Cm7',
  'Cm7',
  'Fm7',
  'Fm7',
  'Cm7',
  'Cm7',
  'Ab7(9,13)',
  'G7(9,13)',
  'Cm7',
  'G7',
] as const;

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

export function resolveNelsonPeriodMode(
  context: CompositionContext,
  genMeta: GenerationMetadata & Record<string, unknown>
): NelsonPeriodMode {
  const ctx = context.nelsonPeriodMode;
  if (ctx === 'early_nelson' || ctx === 'middle_nelson' || ctx === 'late_nelson') return ctx;
  const meta = genMeta.nelsonPeriodMode as NelsonPeriodMode | undefined;
  if (meta === 'early_nelson' || meta === 'middle_nelson' || meta === 'late_nelson') return meta;
  const r = Math.abs(context.seed) % 3;
  return r === 0 ? 'early_nelson' : r === 1 ? 'middle_nelson' : 'late_nelson';
}

export function resolveNelsonBluesFormVariant(
  context: CompositionContext,
  genMeta: GenerationMetadata & Record<string, unknown>
): NelsonBluesFormVariant {
  const ctx = context.nelsonBluesFormVariant;
  if (ctx === 'twelve_bar' || ctx === 'sixteen_bar') return ctx;
  const meta = genMeta.nelsonBluesFormVariant as NelsonBluesFormVariant | undefined;
  if (meta === 'twelve_bar' || meta === 'sixteen_bar') return meta;
  return Math.abs(context.seed) % 5 === 0 ? 'sixteen_bar' : 'twelve_bar';
}

function pedalTwoLayer(localBar: number, seed: number): string {
  const u = seededUnit(seed, localBar, 501);
  if (localBar <= 2) return u < 0.5 ? 'Ebmaj7/C' : 'Fmaj7/C';
  return u < 0.5 ? 'Fmaj7/C' : 'Ebmaj7/C';
}

function modalHeadChord(
  rb: number,
  period: NelsonPeriodMode,
  seed: number,
  bluesVariant: NelsonBluesFormVariant
): string {
  const span = bluesVariant === 'sixteen_bar' ? 16 : 13;
  const effectiveRb = ((rb - 1) % span) + 1;
  if (effectiveRb <= 3) return seededUnit(seed, effectiveRb, 601) < 0.5 ? 'Ebmaj7/C' : 'Fmaj7/C';
  if (effectiveRb === 4) return period === 'early_nelson' ? 'Cm9' : 'Cmaj7(9)';
  if (effectiveRb <= 8) return 'Cm11';
  if (effectiveRb <= 12) {
    const q = ['Cm11', 'Dm11', 'Ebm11', 'Fm11'] as const;
    return q[(effectiveRb + seed) % 4]!;
  }
  return ['Dm11', 'Ebdim7', 'C7/E', 'Fm7'][(effectiveRb - 1) % 4]!;
}

function orchestralChord(bar: number, seed: number): string {
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F'];
  const r = roots[(bar + seed * 3) % roots.length]!;
  return `${r}m11`;
}

function minorBluesAt(rel: number, seed: number, bar: number): string {
  const i = (rel - 1) % 12;
  if (i === 11 && seededUnit(seed, bar, 901) < 0.35) return 'Dø7';
  return MINOR_BLUES_12[i]!;
}

export function isSongwriterOliverNelson(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'oliver_nelson' } {
  return genMeta?.songwriterStyleId === 'oliver_nelson';
}

export interface OliverNelsonHarmonyAccumulator {
  barsConsidered: number;
  bluesTouches: number;
  modalTouches: number;
}

export function createOliverNelsonHarmonyAccumulator(): OliverNelsonHarmonyAccumulator {
  return { barsConsidered: 0, bluesTouches: 0, modalTouches: 0 };
}

function scanChord(chord: string, acc: OliverNelsonHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/m7|blues|9\(9,13\)|\(9,13\)/.test(t) || /b13|b9/.test(t)) acc.bluesTouches++;
  if (/m11|maj7\/|dim|ø|maj7\(9\)/.test(t)) acc.modalTouches++;
}

export function accumulateOliverNelsonHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: OliverNelsonHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

export function finalizeOliverNelsonMetadata(metadata: GenerationMetadata, acc: OliverNelsonHarmonyAccumulator): void {
  const flat = [...(metadata.oliverNelsonDeviceReceipts ?? [])];
  metadata.oliverNelsonDiagnostics = {
    songwriterId: 'oliver_nelson',
    barsConsidered: acc.barsConsidered,
    bluesTouches: acc.bluesTouches,
    modalTouches: acc.modalTouches,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.oliverNelsonSliceReceipt = [
    `Nelson (slice): pedal-modal + minor blues; blues≈${acc.bluesTouches}`,
    `modal≈${acc.modalTouches}`,
    `period=${String(metadata.nelsonPeriodModeResolved ?? metadata.nelsonPeriodMode ?? '?')}`,
    flat.length ? `on_devices=${flat.length}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function precomputeOliverNelsonEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;

  const periodResolved = resolveNelsonPeriodMode(context, genMeta);
  const bluesVariantResolved = resolveNelsonBluesFormVariant(context, genMeta);
  genMeta.nelsonPeriodModeResolved = periodResolved;
  genMeta.nelsonBluesFormVariantResolved = bluesVariantResolved;
  if (
    genMeta.nelsonPeriodMode !== 'early_nelson' &&
    genMeta.nelsonPeriodMode !== 'middle_nelson' &&
    genMeta.nelsonPeriodMode !== 'late_nelson'
  ) {
    genMeta.nelsonPeriodMode = periodResolved;
  }
  if (genMeta.nelsonBluesFormVariant !== 'twelve_bar' && genMeta.nelsonBluesFormVariant !== 'sixteen_bar') {
    genMeta.nelsonBluesFormVariant = bluesVariantResolved;
  }
  context.nelsonPeriodMode = periodResolved;
  context.nelsonBluesFormVariant = bluesVariantResolved;

  genMeta.activePedal = 0;
  genMeta.upperModalChords = ['Ebmaj7', 'Fmaj7'];
  genMeta.nelsonTwoLayerForm = periodResolved !== 'early_nelson';

  const plan = buildNelsonEpisodePlan(tb, periodResolved === 'late_nelson');
  genMeta.oliverNelsonEpisodePlanSummary = plan.episodes.map((e) => `${e.episodeType}:${e.startBar}-${e.endBar}`).join('|');

  const receipts: string[] = [];
  receipts.push(`on:period@${periodResolved}`);
  receipts.push(`on:blues_form@${bluesVariantResolved}`);
  receipts.push('on:two_layer_engine');

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const ep = episodeForNelsonBar(plan, b);
    if (!ep) continue;
    receipts.push(`on:episode@${ep.episodeType}@bar${b}`);
    if (ep.episodeType === 'minor_blues_solo') {
      const rb = b - ep.startBar + 1;
      out[b - 1] = minorBluesAt(rb, seed, b);
      receipts.push(`on:minor_blues_cycle@${((rb - 1) % 12) + 1}@bar${b}`);
    } else if (ep.episodeType === 'turnaround') {
      const pos = b - ep.startBar + 1;
      out[b - 1] = pos === 1 ? 'Ab7(9,13)' : pos === 2 ? 'G7(9,13)' : 'Cm7';
      receipts.push(`on:bVI_V_i@bar${b}`);
    } else if (ep.episodeType === 'pedal_field') {
      out[b - 1] = pedalTwoLayer(b - ep.startBar + 1, seed);
      receipts.push(`on:pedal_two_layer@bar${b}`);
    } else if (ep.episodeType === 'modal_head') {
      const rb = b - ep.startBar + 1;
      out[b - 1] = modalHeadChord(rb, periodResolved, seed, bluesVariantResolved);
      if (rb === 4 && periodResolved !== 'early_nelson') receipts.push(`on:pivot_Cmaj9@bar${b}`);
      receipts.push(`on:modal_head_rb${rb}@bar${b}`);
    } else if (ep.episodeType === 'orchestral_build') {
      out[b - 1] = orchestralChord(b, seed);
      receipts.push(`on:orchestral_build@bar${b}`);
    }
  }

  for (let b = 1; b <= tb; b++) {
    const sym = out[b - 1] ?? '';
    if (/Ebmaj7|Cmaj7\(9\)|Ebmaj7\/C/.test(sym)) receipts.push(`on:rub_9_b3@bar${b}`);
  }

  const minPedal = 4;
  for (const ep of plan.episodes) {
    if (ep.episodeType !== 'pedal_field' && ep.episodeType !== 'modal_head') continue;
    const segLen = ep.endBar - ep.startBar + 1;
    if (segLen < minPedal) continue;
    for (let k = ep.startBar + 1; k <= Math.min(ep.endBar, ep.startBar + minPedal - 1); k++) {
      if (!isProtectedBar(k, context)) receipts.push(`on:pedal_sustain@${minPedal}b@bar${k}`);
    }
  }

  /* Piece-final only: force tonic maj7(9) + safety net (Wayne fBT pattern; mid-piece unchanged). */
  const tonicPc = inferTonicPitchClassFromBar1(context);
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.oliverNelsonEffectiveHarmonyBars = out;
  genMeta.oliverNelsonDeviceReceipts = receipts;
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece pedal/blues/modal devices untouched.
 */
function chordLooksTonicFamily(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  return false;
}

/**
 * Piece-final tonic: maj7(9) — Nelson modal-head pivot spelling (`Cmaj7(9)`).
 * Avoid bare m7 / G7 / ø7 blues leftovers (FBT `7` dominant proxy).
 */
function spellOliverNelsonTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj7(9)`,
    receipt: `on:final_tonic_cadence@bar${bar}`,
  };
}

function forceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const { symbol, receipt } = spellOliverNelsonTonicCadence(totalBars, tonicPc);
  out[totalBars - 1] = symbol;
  receipts.push(`${receipt}|final_bar`);
}

function enforceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || chordLooksTonicFamily(sym)) return;
  const { symbol, receipt } = spellOliverNelsonTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}
