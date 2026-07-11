/**
 * Pat Metheny — ECM / PMG modal–Lydian Song Mode / duo golden-path slice.
 * Lydian maj colour, pedal shimmer, diatonic planing, sus floats — layered on locked harmony.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { coarseSectionRoleFromBar, inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';
import { SONG_MODE_MOTIF_BAR_17, SONG_MODE_MOTIF_BAR_9 } from '../motif/motifEngineTypes';

/** Target stochastic fire rates among eligible bars (seeded). */
const D2_PEDAL_SHIMMER_RATE = 0.39;
const D4_SUS_FLOAT_RATE = 0.43;
const D5_MODAL_SIDE_SLIP_RATE = 0.22;
const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

type PatMethenySectionTag =
  | 'intro'
  | 'outro'
  | 'solo'
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'pre_chorus'
  | 'other';

type PhrasePositionTag = 'phraseStart' | 'phraseMiddle' | 'phraseFinal';

/** Structural pool for modal side-slip (d5): verse + chorus cover ABAB duo forms; solo/bridge when labelled. */
const D5_MODAL_SIDE_SLIP_SECTIONS = new Set<PatMethenySectionTag>(['solo', 'bridge', 'verse', 'chorus']);

function patMethenySectionTag(bar: number, context: CompositionContext): PatMethenySectionTag {
  const sec = context.form.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
  const raw = (sec?.label ?? '').trim().toLowerCase();
  if (raw.startsWith('intro')) return 'intro';
  if (raw.startsWith('outro') || raw.startsWith('coda')) return 'outro';
  if (raw.startsWith('solo')) return 'solo';
  if (raw.startsWith('instrumental')) return 'solo';
  if (raw.startsWith('verse')) return 'verse';
  if (raw.startsWith('chorus')) return 'chorus';
  if (raw.startsWith('bridge')) return 'bridge';
  if (raw.startsWith('pre')) return 'pre_chorus';
  const L = (sec?.label ?? 'A').trim();
  const u = L.toUpperCase();
  // Duo long-form labels: A, A', A'', A-2 — must not fall through to `other`.
  if (u.startsWith('A')) return 'verse';
  if (u.startsWith('B')) return 'chorus';
  if (u === 'C' || /^C_\d+$/i.test(L)) return 'bridge';
  return 'other';
}

function phrasePositionFromBar(bar: number): PhrasePositionTag {
  const k = (bar - 1) % 4;
  if (k === 0) return 'phraseStart';
  if (k === 3) return 'phraseFinal';
  return 'phraseMiddle';
}

function isPatMethenyHookBar(bar: number, context: CompositionContext): boolean {
  return (
    isProtectedBar(bar, context) || bar === SONG_MODE_MOTIF_BAR_9 || bar === SONG_MODE_MOTIF_BAR_17
  );
}

/** Explicit chromatic / colour-outside-diatonic palette — excluded from pedal_shimmer. */
function chordSymbolExcludedChromatically(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /\bdim|°|ø|aug\b|m7b5|half\s*-?\s*dim|alt\b|7#9|7b9|7\(.*#9/i.test(tl);
}

/**
 * Broad pedal_shimmer chord gate: maj / min / maj7 / min7 / dom7 / sus / add9 / quartal;
 * excludes explicitly chromatic harmony only.
 */
function chordSymbolPedalShimmerBroadEligible(symbol: string): boolean {
  if (!symbol.trim()) return false;
  if (chordSymbolExcludedChromatically(symbol)) return false;
  const hp = parseChordSymbol(symbol).harmonyPart.trim();
  const tl = hp.toLowerCase();
  if (/quartal|\bsus|add9|add2/.test(tl)) return true;
  if (/maj|Δ|mmaj/.test(tl)) return true;
  if (/^[a-g][#b]?m(?!aj)/i.test(hp)) return true;
  if (/\b(m7|m9|m11|min7)\b/.test(tl)) return true;
  if (looksPlainDominantSeventh(symbol)) return true;
  if (symbol.includes('/')) return true;
  const compact = hp.replace(/\s/g, '');
  if (/^[a-g][#b]?$/i.test(compact)) return true;
  if (/^[a-g][#b]?\d+$/.test(compact)) return true;
  return false;
}

function chordSupportsSuspensionFloat(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/\/[a-g]/i.test(symbol)) return true;
  return (
    /sus|7sus|13sus|add9|maj9|min9|m9|min11|m11|quartal|sus4/.test(tl) ||
    /maj9|maj7#11/.test(tl)
  );
}

/** Bar `barIndex` lands on tonic after a dominant-like prior bar (cadence arrival). */
function isStrongCadenceArrivalBar(barIndex: number, out: string[], tonicPc: number | undefined): boolean {
  if (barIndex < 2 || tonicPc === undefined) return false;
  const prev = out[barIndex - 2]!;
  const cur = out[barIndex - 1]!;
  if (harmonyRootPc(cur) !== tonicPc) return false;
  return looksPlainDominantSeventh(prev);
}

function isCadenceArrivalBar(bar: number, out: string[], tonicPc: number | undefined): boolean {
  if (tonicPc === undefined || bar < 2) return false;
  if (phrasePositionFromBar(bar) !== 'phraseFinal') return false;
  const prev = out[bar - 2]!;
  const cur = out[bar - 1]!;
  return looksPlainDominantSeventh(prev) && harmonyRootPc(cur) === tonicPc;
}

/** Non-rng d5 gates on harmony before modal-slip mutations (independent per bar). */
function d5StructuralEligibleBar(
  bar: number,
  context: CompositionContext,
  preModalOut: string[],
  tonicPc: number | undefined
): boolean {
  if (tonicPc === undefined) return false;
  const secTag = patMethenySectionTag(bar, context);
  if (!D5_MODAL_SIDE_SLIP_SECTIONS.has(secTag)) return false;
  const phrasePos = phrasePositionFromBar(bar);
  if (phrasePos !== 'phraseMiddle') return false;
  if (isPatMethenyHookBar(bar, context)) return false;
  if (isCadenceArrivalBar(bar, preModalOut, tonicPc)) return false;
  return true;
}

function d2BarEligible(
  b: number,
  context: CompositionContext,
  out: string[],
  preHoldOut: string[],
  tonicPc: number | undefined,
  modalSideSlipBars: ReadonlySet<number>
): boolean {
  if (b < 2 || modalSideSlipBars.has(b)) return false;
  const secTag = patMethenySectionTag(b, context);
  const phrasePos = phrasePositionFromBar(b);
  const cur = preHoldOut[b - 1]!;
  const d2Sections = new Set<PatMethenySectionTag>(['intro', 'outro', 'solo', 'verse', 'chorus']);
  const d2PhraseOk =
    phrasePos === 'phraseStart' || phrasePos === 'phraseMiddle' || phrasePos === 'phraseFinal';
  return (
    d2Sections.has(secTag) &&
    d2PhraseOk &&
    chordSymbolPedalShimmerBroadEligible(cur) &&
    d2PedalMotionEligible(b, preHoldOut, out)
  );
}

export interface PatMethenyEligibilityStats {
  totalBars: number;
  d2EligibleBars: number;
  d4EligibleBars: number;
  d5EligibleBars: number;
  /** Expected fires if each eligible bar fired independently at target rate (mean). */
  targetMeanFiresD2: number;
  targetMeanFiresD4: number;
  targetMeanFiresD5: number;
}

/** First failing gate for pedal_shimmer (d2) eligibility — matches `d2BarEligible` short-circuit order. */
export type PatMethenyD2EligibilityRejectReason =
  | 'eligible'
  | 'bar_lt_2'
  | 'modal_side_slip_reserved'
  | 'section_not_allowed'
  | 'phrase_position_not_allowed'
  | 'chord_class_mismatch'
  | 'pedal_motion_check';

/** First failing gate for modal_sideSlip structural pool (d5) — matches `d5StructuralEligibleBar` order. */
export type PatMethenyD5EligibilityRejectReason =
  | 'eligible'
  | 'tonic_unknown'
  | 'section_not_allowed'
  | 'phrase_position_not_middle'
  | 'hook_bar'
  | 'cadence_arrival_bar';

export interface PatMethenyHarmonyPipelineSnapshot {
  tb: number;
  tonicPc: number | undefined;
  seed: number;
  preModalOut: string[];
  preHoldOut: string[];
  outFinal: string[];
  modalBars: ReadonlySet<number>;
  guards: PatMethenyAntiElaborationGuards;
  modalReceipts: PatMethenyDeviceReceipts;
}

/** Raw chord per bar before PM passes: prefers full-form `lockedHarmonyBarsRaw` so probes work after `patMethenyEffectiveHarmonyBars` exists. */
function resolvePatMethenySliceSourceChordForBar(
  bar: number,
  context: CompositionContext,
  guards: PatMethenyAntiElaborationGuards
): string {
  const tb = context.form.totalBars;
  const locked = context.lockedHarmonyBarsRaw;
  if (locked && locked.length === tb && bar >= 1 && bar <= tb) {
    return stripBluesDominantColour(locked[bar - 1]!, guards);
  }
  return stripBluesDominantColour(resolveBarSymbol(context, bar).symbol, guards);
}

export function diagnosePatMethenyD2EligibilityBar(
  bar: number,
  context: CompositionContext,
  snap: PatMethenyHarmonyPipelineSnapshot
): PatMethenyD2EligibilityRejectReason {
  const { outFinal, preHoldOut, modalBars } = snap;
  if (bar < 2) return 'bar_lt_2';
  if (modalBars.has(bar)) return 'modal_side_slip_reserved';
  const secTag = patMethenySectionTag(bar, context);
  const phrasePos = phrasePositionFromBar(bar);
  const cur = preHoldOut[bar - 1]!;
  const d2Sections = new Set<PatMethenySectionTag>(['intro', 'outro', 'solo', 'verse', 'chorus']);
  const d2PhraseOk =
    phrasePos === 'phraseStart' || phrasePos === 'phraseMiddle' || phrasePos === 'phraseFinal';
  if (!d2Sections.has(secTag)) return 'section_not_allowed';
  if (!d2PhraseOk) return 'phrase_position_not_allowed';
  if (!chordSymbolPedalShimmerBroadEligible(cur)) return 'chord_class_mismatch';
  if (!d2PedalMotionEligible(bar, preHoldOut, outFinal)) return 'pedal_motion_check';
  return 'eligible';
}

export function diagnosePatMethenyD5EligibilityBar(
  bar: number,
  context: CompositionContext,
  snap: PatMethenyHarmonyPipelineSnapshot
): PatMethenyD5EligibilityRejectReason {
  const { preModalOut, tonicPc } = snap;
  if (tonicPc === undefined) return 'tonic_unknown';
  const secTag = patMethenySectionTag(bar, context);
  if (!D5_MODAL_SIDE_SLIP_SECTIONS.has(secTag)) return 'section_not_allowed';
  const phrasePos = phrasePositionFromBar(bar);
  if (phrasePos !== 'phraseMiddle') return 'phrase_position_not_middle';
  if (isPatMethenyHookBar(bar, context)) return 'hook_bar';
  if (isCadenceArrivalBar(bar, preModalOut, tonicPc)) return 'cadence_arrival_bar';
  return 'eligible';
}

export function buildPatMethenyHarmonyPipelineSnapshot(context: CompositionContext): PatMethenyHarmonyPipelineSnapshot {
  const tb = context.form.totalBars;
  const guards: PatMethenyAntiElaborationGuards = {
    twoFiveOneFlattened: 0,
    dominantChainFlattened: 0,
    twoBarHoldForced: 0,
    bluesDominantStripped: 0,
  };
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const seed = context.seed;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolvePatMethenySliceSourceChordForBar(b, context, guards));
  }

  const working = [...raw];
  flattenTwoFiveOnePass(working, tonicPc, guards);
  stripDominantChainPass(working, guards);
  const preModalOut = [...working];
  const modalReceipts: PatMethenyDeviceReceipts = { deviceReceipts: [] };
  const modalBars = applyModalSideSlipDevice({
    context,
    out: working,
    receipts: modalReceipts,
    seed,
    tonicPc,
  });
  const preHoldOut = [...working];
  const outFinal = [...working];
  enforceMethenyTwoBarHold(outFinal, guards);

  return {
    tb,
    tonicPc,
    seed,
    preModalOut,
    preHoldOut,
    outFinal,
    modalBars,
    guards,
    modalReceipts,
  };
}

/**
 * Human-readable per-bar d2/d5 rejection audit + aggregate counts.
 * Notes: harmonic rhythm gate is not used for d2 (removed). Cadence for d5 uses pre-modal harmony (`preModalOut`).
 */
export function formatPatMethenyEligibilityDiagnostics(context: CompositionContext): string {
  const snap = buildPatMethenyHarmonyPipelineSnapshot(context);
  const lines: string[] = [
    `Pat Metheny eligibility diagnostics (seed=${snap.seed}, bars=${snap.tb})`,
    `harmonic_rhythm_fast: not_used (removed from d2 gate set)`,
    '',
    'bar\td2_reason\td5_reason',
  ];
  const d2Agg: Partial<Record<PatMethenyD2EligibilityRejectReason, number>> = {};
  const d5Agg: Partial<Record<PatMethenyD5EligibilityRejectReason, number>> = {};

  for (let b = 1; b <= snap.tb; b++) {
    const d2 = diagnosePatMethenyD2EligibilityBar(b, context, snap);
    const d5 = diagnosePatMethenyD5EligibilityBar(b, context, snap);
    lines.push(`${b}\t${d2}\t${d5}`);
    d2Agg[d2] = (d2Agg[d2] ?? 0) + 1;
    d5Agg[d5] = (d5Agg[d5] ?? 0) + 1;
  }

  lines.push('');
  lines.push('d2 aggregate (first-fail counts): ' + JSON.stringify(d2Agg));
  lines.push('d5 aggregate (first-fail counts): ' + JSON.stringify(d5Agg));
  return lines.join('\n');
}

export function isSongwriterPatMetheny(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'pat_metheny' } {
  return genMeta?.songwriterStyleId === 'pat_metheny';
}

/**
 * Primary songwriter, STYLE_PAT_METHENY surface, or harmonicVoice selects Pat Metheny harmony authority.
 */
export function isPatMethenyHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
    styleProfile?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return (
    primary === 'pat_metheny' ||
    voice === 'pat_metheny' ||
    metadata?.styleProfile === 'STYLE_PAT_METHENY'
  );
}

export interface PatMethenyHarmonyAccumulator {
  barsConsidered: number;
  lydianColourTouches: number;
  susFloatTouches: number;
  slashPedalTouches: number;
}

export function createPatMethenyHarmonyAccumulator(): PatMethenyHarmonyAccumulator {
  return {
    barsConsidered: 0,
    lydianColourTouches: 0,
    susFloatTouches: 0,
    slashPedalTouches: 0,
  };
}

export interface PatMethenyAntiElaborationGuards {
  twoFiveOneFlattened: number;
  dominantChainFlattened: number;
  twoBarHoldForced: number;
  bluesDominantStripped: number;
}

export interface PatMethenyDeviceReceipts {
  deviceReceipts: string[];
}

function slashBassNote(symbol: string): string | undefined {
  if (!symbol.includes('/')) return undefined;
  const after = symbol.split('/')[1]?.trim();
  if (!after) return undefined;
  const m = after.match(/^([A-G](?:#|b)?)/);
  return m?.[1];
}

function sameSlashBass(a: string, b: string): boolean {
  const ba = slashBassNote(a);
  const bb = slashBassNote(b);
  return ba !== undefined && ba === bb;
}

/** Harmonic change across the barline (pre-hold progression); duplicates excluded. */
function d2PedalMotionEligible(b: number, preHold: string[], _out: string[]): boolean {
  if (b < 2) return false;
  const prev = preHold[b - 2]!;
  const cur = preHold[b - 1]!;
  return prev !== cur;
}

function scanChordForDiagnostics(chord: string, acc: PatMethenyHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/\/[a-g]/i.test(c)) acc.slashPedalTouches++;
  if (/maj9|#11|maj7#11|6\/9/.test(t) || /Δ/.test(t)) acc.lydianColourTouches++;
  if (/sus|7sus|13sus/.test(t)) acc.susFloatTouches++;
}

export function accumulatePatMethenyHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: PatMethenyHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

/** Rough ii–V–I in major — flatten middle bar (non-functional palette). */
function isTwoFiveOne(a: string, b: string, c: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const ii = (tonicPc + 2) % 12;
  const v = (tonicPc + 7) % 12;
  const ia = harmonyRootPc(a);
  const ib = harmonyRootPc(b);
  const ic = harmonyRootPc(c);
  if (ia !== ii || ib !== v) return false;
  return ic === tonicPc;
}

function flattenTwoFiveOnePass(out: string[], tonicPc: number | undefined, guards: PatMethenyAntiElaborationGuards): void {
  for (let i = 2; i < out.length; i++) {
    const a = out[i - 2]!;
    const b = out[i - 1]!;
    const c = out[i]!;
    if (!isTwoFiveOne(a, b, c, tonicPc)) continue;
    guards.twoFiveOneFlattened++;
    out[i - 1] = out[i - 2]!;
  }
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
}

function stripDominantChainPass(out: string[], guards: PatMethenyAntiElaborationGuards): void {
  for (let i = 2; i < out.length; i++) {
    if (
      !looksPlainDominantSeventh(out[i - 2]!) ||
      !looksPlainDominantSeventh(out[i - 1]!) ||
      !looksPlainDominantSeventh(out[i]!)
    ) {
      continue;
    }
    guards.dominantChainFlattened++;
    const r = harmonyRootPc(out[i - 1]!);
    if (r !== undefined) {
      out[i - 1] = `${pitchClassToSharpName(r)}maj9`;
    }
  }
}

function stripBluesDominantColour(symbol: string, guards: PatMethenyAntiElaborationGuards): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/13sus|sus/.test(tl)) return symbol;
  if (/7#9|7b9|7\(.*#9/.test(tl)) {
    guards.bluesDominantStripped++;
    const r = harmonyRootPc(symbol);
    if (r === undefined) return symbol;
    return `${pitchClassToSharpName(r)}maj9`;
  }
  return symbol;
}

function enforceMethenyTwoBarHold(out: string[], guards: PatMethenyAntiElaborationGuards): void {
  const tb = out.length;
  for (let start = 1; start <= tb; start += 2) {
    const i0 = start - 1;
    const i1 = start;
    if (i1 >= tb) break;
    if (out[i0] === out[i1]) continue;
    if (sameSlashBass(out[i0]!, out[i1]!)) continue;
    guards.twoBarHoldForced++;
    out[i1] = out[i0]!;
  }
}

function looksMajorTonicColour(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø/.test(tl)) return false;
  return true;
}

function hasLydianHomeColour(symbol: string): boolean {
  const s = symbol.toLowerCase();
  return /maj9|#11|maj7#11|6\/9/.test(s);
}

function looksMajExtensionFamily(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /maj7|maj9|maj7#11|add9|6\/9/.test(tl);
}

function emitLydianHomeReceipts(
  context: CompositionContext,
  out: string[],
  tonicPc: number | undefined,
  receipts: PatMethenyDeviceReceipts
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= out.length; b++) {
    const sym = out[b - 1]!;
    if (!looksMajorTonicColour(sym, tonicPc)) continue;
    if (!hasLydianHomeColour(sym)) continue;
    receipts.deviceReceipts.push(`pm:lydian_home@bar${b}`);
  }
}

function emitPedalShimmerAndSusFloatReceipts(
  context: CompositionContext,
  /** Final harmony after two-bar hold (d4 / pairing uses this). */
  out: string[],
  /** Harmony before `enforceMethenyTwoBarHold` — slash pedal pairs survive here. */
  preHoldOut: string[],
  receipts: PatMethenyDeviceReceipts,
  tonicPc: number | undefined,
  modalSideSlipBars: ReadonlySet<number>,
  seed: number
): void {
  const tb = out.length;

  for (let b = 1; b <= tb; b++) {
    const curChord = out[b - 1]!;

    const d2Elig = b >= 2 && d2BarEligible(b, context, out, preHoldOut, tonicPc, modalSideSlipBars);

    const d2Roll = d2Elig && seededUnit(seed, b, 503101) < D2_PEDAL_SHIMMER_RATE;
    const d4Elig = d4BarEligible(b, context, out, tonicPc, modalSideSlipBars);
    const d4Roll = d4Elig && seededUnit(seed, b, 503201) < D4_SUS_FLOAT_RATE;

    let emitD2 = false;
    let emitD4 = false;
    if (d2Roll && d4Roll) {
      const nextD4Elig =
        b < tb && d4BarEligible(b + 1, context, out, tonicPc, modalSideSlipBars);
      const pairOk = !looksPlainDominantSeventh(curChord) && nextD4Elig;
      if (pairOk) {
        emitD2 = true;
        emitD4 = true;
      } else if (seededUnit(seed, b, 503300) < 0.5) {
        emitD2 = true;
      } else {
        emitD4 = true;
      }
    } else {
      if (d2Roll) emitD2 = true;
      if (d4Roll) emitD4 = true;
    }

    if (emitD2) receipts.deviceReceipts.push(`pm:pedal_shimmer@bar${b}`);
    if (emitD4) receipts.deviceReceipts.push(`pm:sus_float@bar${b}`);
  }
}

function d4BarEligible(
  bar: number,
  context: CompositionContext,
  out: string[],
  tonicPc: number | undefined,
  modalSideSlipBars: ReadonlySet<number>
): boolean {
  if (bar < 1 || bar > out.length) return false;
  const secTag = patMethenySectionTag(bar, context);
  const d4Sections = new Set<PatMethenySectionTag>([
    'verse',
    'bridge',
    'intro',
    'solo',
    'chorus',
    'outro',
  ]);
  const phrasePos = phrasePositionFromBar(bar);
  const phraseOk = phrasePos === 'phraseStart' || phrasePos === 'phraseMiddle';
  const sym = out[bar - 1]!;
  if (!d4Sections.has(secTag) || !phraseOk) return false;
  if (!chordSupportsSuspensionFloat(sym)) return false;
  if (bar < out.length && isStrongCadenceArrivalBar(bar + 1, out, tonicPc)) return false;
  if (isPatMethenyHookBar(bar, context)) return false;
  if (modalSideSlipBars.has(bar)) return false;
  return true;
}

function emitDiatonicPlaningReceipts(context: CompositionContext, out: string[], receipts: PatMethenyDeviceReceipts): void {
  for (let b = 2; b <= out.length; b++) {
    const role = coarseSectionRoleFromBar(b, context);
    if (role !== 'verse' && role !== 'bridge') continue;
    const r0 = harmonyRootPc(out[b - 2]!);
    const r1 = harmonyRootPc(out[b - 1]!);
    if (r0 === undefined || r1 === undefined) continue;
    if (!looksMajExtensionFamily(out[b - 2]!) || !looksMajExtensionFamily(out[b - 1]!)) continue;
    const step = (r1 - r0 + 12) % 12;
    if (step === 2 || step === 5 || step === 10 || step === 7) {
      receipts.deviceReceipts.push(`pm:diatonic_planing@bar${b}`);
    }
  }
}

function applyModalSideSlipDevice(params: {
  context: CompositionContext;
  out: string[];
  receipts: PatMethenyDeviceReceipts;
  seed: number;
  tonicPc: number | undefined;
}): Set<number> {
  const modalBars = new Set<number>();
  const { context, out, receipts, seed, tonicPc } = params;
  if (tonicPc === undefined) return modalBars;

  const tb = out.length;
  const slipByPhrase = new Map<number, number>();

  for (let b = 1; b <= tb; b++) {
    const phraseIdx = Math.floor((b - 1) / 4);
    if ((slipByPhrase.get(phraseIdx) ?? 0) >= 1) continue;

    const secTag = patMethenySectionTag(b, context);
    if (!D5_MODAL_SIDE_SLIP_SECTIONS.has(secTag)) continue;

    const phrasePos = phrasePositionFromBar(b);
    if (phrasePos !== 'phraseMiddle') continue;

    if (isPatMethenyHookBar(b, context)) continue;
    if (isCadenceArrivalBar(b, out, tonicPc)) continue;

    if (seededUnit(seed, b, 502100) >= D5_MODAL_SIDE_SLIP_RATE) continue;

    const bII = (tonicPc + 1) % 12;
    const bIII = (tonicPc + 3) % 12;
    const destPc = seededUnit(seed, b, 502101) > 0.45 ? bII : bIII;
    out[b - 1] = `${pitchClassToSharpName(destPc)}maj9`;
    if (b < tb) {
      out[b] = `${pitchClassToSharpName(tonicPc)}maj7#11`;
    }
    receipts.deviceReceipts.push(`pm:modal_sideSlip@bar${b}`);
    modalBars.add(b);
    slipByPhrase.set(phraseIdx, 1);
  }

  return modalBars;
}

/** Longest run of identical slash-bass note across consecutive bars. */
export function maxSlashBassHoldBars(out: string[]): number {
  let best = 0;
  let run = 0;
  let curBass: string | undefined;
  for (const sym of out) {
    const b = slashBassNote(sym);
    if (b && b === curBass) {
      run++;
    } else {
      curBass = b;
      run = b ? 1 : 0;
    }
    best = Math.max(best, run);
  }
  return best;
}

/** @deprecated — use resolveBarSymbol */
export function precomputePatMethenyEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const snap = buildPatMethenyHarmonyPipelineSnapshot(context);
  const { tb, tonicPc, seed, preModalOut, preHoldOut, outFinal, modalBars, guards } = snap;
  const receipts: PatMethenyDeviceReceipts = { deviceReceipts: [...snap.modalReceipts.deviceReceipts] };

  let d2EligibleBars = 0;
  let d4EligibleBars = 0;
  let d5EligibleBars = 0;
  for (let b = 1; b <= tb; b++) {
    if (d2BarEligible(b, context, outFinal, preHoldOut, tonicPc, modalBars)) d2EligibleBars++;
    if (d4BarEligible(b, context, outFinal, tonicPc, modalBars)) d4EligibleBars++;
    if (d5StructuralEligibleBar(b, context, preModalOut, tonicPc)) d5EligibleBars++;
  }

  const eligibility: PatMethenyEligibilityStats = {
    totalBars: tb,
    d2EligibleBars,
    d4EligibleBars,
    d5EligibleBars,
    targetMeanFiresD2: d2EligibleBars * D2_PEDAL_SHIMMER_RATE,
    targetMeanFiresD4: d4EligibleBars * D4_SUS_FLOAT_RATE,
    targetMeanFiresD5: d5EligibleBars * D5_MODAL_SIDE_SLIP_RATE,
  };
  genMeta.patMethenyEligibilityStats = eligibility;

  emitLydianHomeReceipts(context, outFinal, tonicPc, receipts);
  emitPedalShimmerAndSusFloatReceipts(
    context,
    outFinal,
    preHoldOut,
    receipts,
    tonicPc,
    modalBars,
    seed
  );
  emitDiatonicPlaningReceipts(context, outFinal, receipts);

  genMeta.patMethenyEffectiveHarmonyBars = outFinal;
  genMeta.patMethenyDeviceReceipts = receipts.deviceReceipts;
  genMeta.patMethenyAntiElaborationGuards = guards;
  genMeta.patMethenyPedalHoldMaxBars = maxSlashBassHoldBars(outFinal);
}

export function finalizePatMethenyMetadata(metadata: GenerationMetadata, acc: PatMethenyHarmonyAccumulator): void {
  const flat = [...(metadata.patMethenyDeviceReceipts ?? [])];
  const g = metadata.patMethenyAntiElaborationGuards ?? {
    twoFiveOneFlattened: 0,
    dominantChainFlattened: 0,
    twoBarHoldForced: 0,
    bluesDominantStripped: 0,
  };
  const guardTotal =
    g.twoFiveOneFlattened + g.dominantChainFlattened + g.twoBarHoldForced + g.bluesDominantStripped;
  const tb = Math.max(1, acc.barsConsidered);
  const lydianRate = acc.lydianColourTouches / tb;
  const susRate = acc.susFloatTouches / tb;
  const d = {
    songwriterId: 'pat_metheny' as const,
    barsConsidered: acc.barsConsidered,
    lydianColourHitRate: lydianRate,
    susFloatHitRate: susRate,
    slashPedalTouches: acc.slashPedalTouches,
    pedalHoldMaxBars: metadata.patMethenyPedalHoldMaxBars ?? 0,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Pat Metheny (ECM/PMG slice): Lydian-colour≈${acc.lydianColourTouches}`,
    `sus≈${acc.susFloatTouches}`,
    `slash≈${acc.slashPedalTouches}`,
    `pedalMax=${metadata.patMethenyPedalHoldMaxBars ?? 0}bars`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.patMethenyDiagnostics = { ...d };
  metadata.patMethenySliceReceipt = receipt;
}
