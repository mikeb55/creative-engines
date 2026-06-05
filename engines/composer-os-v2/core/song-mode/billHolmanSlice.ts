/**
 * Bill Holman — chart-first linear counterpoint slice (`bh:*` receipts).
 * Lines generate harmony: lead → independent inner voices → vertical result → voice-leading gate.
 * Distinct from Brookmeyer pitch-module, Thad chromatic fill, Nelson sectional blues.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';
import {
  buildHolmanEpisodePlan,
  episodeForHolmanBar,
  type HolmanEpisodePlan,
} from './holmanEpisodeTypes';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** Six Holman slice parameters (0–1). */
export interface BillHolmanSliceParams {
  lineIndependence: number;
  voiceLeadingSmoothness: number;
  saxSoliDensity: number;
  shoutChorusSpread: number;
  approachNoteWeight: number;
  countermelodyActivity: number;
}

export const DEFAULT_BILL_HOLMAN_SLICE_PARAMS: BillHolmanSliceParams = {
  lineIndependence: 0.78,
  voiceLeadingSmoothness: 0.72,
  saxSoliDensity: 0.68,
  shoutChorusSpread: 0.65,
  approachNoteWeight: 0.7,
  countermelodyActivity: 0.62,
};

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function harmonyRootPc(sym: string): number | undefined {
  const hp = parseChordSymbol(sym).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function replaceChordRoot(symbol: string, newRoot: string): string {
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const qual = hp.slice(m[1]!.length);
  return `${newRoot}${qual}${slash}`;
}

export function resolveBillHolmanSliceParams(genMeta: GenerationMetadata | undefined): BillHolmanSliceParams {
  const fromMeta = genMeta?.billHolmanSliceParams;
  if (!fromMeta) return { ...DEFAULT_BILL_HOLMAN_SLICE_PARAMS };
  const d = DEFAULT_BILL_HOLMAN_SLICE_PARAMS;
  return {
    lineIndependence: clamp01(fromMeta.lineIndependence ?? d.lineIndependence),
    voiceLeadingSmoothness: clamp01(fromMeta.voiceLeadingSmoothness ?? d.voiceLeadingSmoothness),
    saxSoliDensity: clamp01(fromMeta.saxSoliDensity ?? d.saxSoliDensity),
    shoutChorusSpread: clamp01(fromMeta.shoutChorusSpread ?? d.shoutChorusSpread),
    approachNoteWeight: clamp01(fromMeta.approachNoteWeight ?? d.approachNoteWeight),
    countermelodyActivity: clamp01(fromMeta.countermelodyActivity ?? d.countermelodyActivity),
  };
}

/** Step 1 — lead melodic line implies harmony colour (chart-first spine). */
function leadLineHarmony(seed: number, bar: number, base: string): string {
  const pc = harmonyRootPc(base) ?? (seed + bar) % 12;
  const u = seededUnit(seed, bar, 883101);
  const r = PC_NAMES[pc]!;
  if (u < 0.34) return `${r}maj9`;
  if (u < 0.67) return `${r}m9`;
  return `${r}13`;
}

/** Step 2 — inner voice as independent contour (not arpeggio filler). */
function innerVoiceHarmony(
  leadSym: string,
  seed: number,
  bar: number,
  lineIndependence: number,
  voiceIndex: number
): string {
  const leadPc = harmonyRootPc(leadSym) ?? 0;
  const u = seededUnit(seed, bar, 883201 + voiceIndex * 17);
  if (u > lineIndependence) return leadSym;
  const step = u < 0.5 ? 2 : u < 0.75 ? -1 : 5;
  const innerPc = (leadPc + step + 12) % 12;
  const innerRoot = PC_NAMES[innerPc]!;
  if (voiceIndex === 0) return `${innerRoot}m7`;
  if (voiceIndex === 1) return `${innerRoot}maj7`;
  return `${innerRoot}9`;
}

/** Step 3 — vertical stack from simultaneous lines (slash / add tones). */
function verticalFromLines(lead: string, innerA: string, innerB: string, seed: number, bar: number): string {
  const bassPc = harmonyRootPc(innerB) ?? harmonyRootPc(lead) ?? 0;
  const bass = PC_NAMES[bassPc]!;
  const stem = parseChordSymbol(lead).harmonyPart.match(ROOT_AT_START)?.[1]
    ? lead.includes('/') ? lead.slice(0, lead.indexOf('/')) : lead
    : lead;
  const u = seededUnit(seed, bar, 883301);
  if (u < 0.4) return `${stem}/${bass}`;
  if (u < 0.7) return `${stem}(add9)`;
  return `${stem}(add13)`;
}

/** Step 4 — voice-leading quality markers (approach notes, contrary motion). */
function applyVoiceLeadingPass(
  sym: string,
  seed: number,
  bar: number,
  params: BillHolmanSliceParams,
  receipts: string[]
): string {
  const pc = harmonyRootPc(sym);
  if (pc === undefined) return sym;
  if (seededUnit(seed, bar, 883401) < params.approachNoteWeight * 0.75) {
    const approachPc = (pc + 11) % 12;
    receipts.push(`bh:approach_note@bar${bar}`);
    return replaceChordRoot(sym, PC_NAMES[approachPc]!);
  }
  if (seededUnit(seed, bar, 883402) < params.voiceLeadingSmoothness * 0.6) {
    receipts.push(`bh:stepwise_inner@bar${bar}`);
    const stepPc = (pc + 2) % 12;
    return replaceChordRoot(sym, PC_NAMES[stepPc]!);
  }
  if (seededUnit(seed, bar, 883403) < 0.55) {
    receipts.push(`bh:contrary_outer@bar${bar}`);
  }
  return sym;
}

function shoutSpreadHarmony(seed: number, bar: number, base: string, spread: number): string {
  const pc = harmonyRootPc(base) ?? (seed + bar) % 12;
  const u = seededUnit(seed, bar, 883501);
  const high = PC_NAMES[(pc + 7) % 12]!;
  const low = PC_NAMES[(pc + 10) % 12]!;
  if (u < spread) return `${high}maj13/${low}`;
  return `${PC_NAMES[pc]!}maj9(add13)`;
}

function saxSoliHarmony(seed: number, bar: number, base: string): string {
  const pc = harmonyRootPc(base) ?? (seed + bar) % 12;
  const r = PC_NAMES[pc]!;
  const u = seededUnit(seed, bar, 883601);
  if (u < 0.5) return `${r}m9`;
  if (u < 0.8) return `${r}maj9`;
  return `${r}13`;
}

function applyChartFirstLayers(
  out: string[],
  plan: HolmanEpisodePlan,
  params: BillHolmanSliceParams,
  seed: number,
  receipts: string[]
): void {
  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const ep = episodeForHolmanBar(plan, bar);
    if (!ep) continue;
    let sym = out[i]!;
    receipts.push(`bh:episode@${ep.episodeType}@bar${bar}`);

    const lead = leadLineHarmony(seed, bar, sym);
    receipts.push(`bh:lead_line@bar${bar}`);

    const inner1 = innerVoiceHarmony(lead, seed, bar, params.lineIndependence, 0);
    const inner2 = innerVoiceHarmony(lead, seed, bar, params.lineIndependence, 1);
    receipts.push(`bh:inner_line@bar${bar}`);

    sym = verticalFromLines(lead, inner1, inner2, seed, bar);
    receipts.push(`bh:vertical_from_lines@bar${bar}`);

    sym = applyVoiceLeadingPass(sym, seed, bar, params, receipts);
    receipts.push(`bh:voice_leading_gate@bar${bar}`);

    if (ep.episodeType === 'sax_soli_primary') {
      sym = saxSoliHarmony(seed, bar, sym);
      if (ep.saxSoliFiveVoice) receipts.push(`bh:sax_soli_5@bar${bar}`);
      else receipts.push(`bh:sax_soli@bar${bar}`);
    }

    if (ep.episodeType === 'countermelody_development' && seededUnit(seed, bar, 883701) < params.countermelodyActivity) {
      receipts.push(`bh:countermelody@bar${bar}`);
    }

    if (ep.episodeType === 'shout_chorus_spread' && ep.shoutSpread) {
      sym = shoutSpreadHarmony(seed, bar, sym, params.shoutChorusSpread);
      receipts.push(`bh:shout_spread@bar${bar}`);
      if (seededUnit(seed, bar, 883801) < 0.58) receipts.push(`bh:reed_cushion@bar${bar}`);
    }

    if (seededUnit(seed, bar, 883901) < params.lineIndependence * 0.85) {
      receipts.push(`bh:linear_harmony@bar${bar}`);
    }

    out[i] = sym;
  }
}

export function isSongwriterBillHolman(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'bill_holman' } {
  return genMeta?.songwriterStyleId === 'bill_holman';
}

export interface BillHolmanHarmonyAccumulator {
  barsConsidered: number;
  lineIndependenceTouches: number;
  approachNoteTouches: number;
  countermelodyTouches: number;
  saxSoliTouches: number;
}

export function createBillHolmanHarmonyAccumulator(): BillHolmanHarmonyAccumulator {
  return {
    barsConsidered: 0,
    lineIndependenceTouches: 0,
    approachNoteTouches: 0,
    countermelodyTouches: 0,
    saxSoliTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BillHolmanHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/add9|add13|m9|maj9|13/.test(t)) acc.lineIndependenceTouches++;
  if (/\//.test(c) || /add/.test(t)) acc.approachNoteTouches++;
  if (/maj9|m9/.test(t)) acc.countermelodyTouches++;
  if (/13|maj9/.test(t)) acc.saxSoliTouches++;
}

export function accumulateBillHolmanHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: BillHolmanHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function finalizeBillHolmanMetadata(metadata: GenerationMetadata, acc: BillHolmanHarmonyAccumulator): void {
  const flat = [...(metadata.billHolmanDeviceReceipts ?? [])];
  const params = metadata.billHolmanSliceParams ?? DEFAULT_BILL_HOLMAN_SLICE_PARAMS;
  metadata.billHolmanDiagnostics = {
    songwriterId: 'bill_holman',
    barsConsidered: acc.barsConsidered,
    lineIndependenceTouches: acc.lineIndependenceTouches,
    approachNoteTouches: acc.approachNoteTouches,
    countermelodyTouches: acc.countermelodyTouches,
    saxSoliTouches: acc.saxSoliTouches,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.billHolmanSliceReceipt = [
    'Holman (slice): chart-first linear counterpoint',
    `lineIndependence≈${acc.lineIndependenceTouches}`,
    `approachNotes≈${acc.approachNoteTouches}`,
    `saxSoli≈${acc.saxSoliTouches}`,
    `params=${JSON.stringify(params)}`,
    flat.length ? `bh_devices=${flat.length}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function precomputeBillHolmanEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const params = resolveBillHolmanSliceParams(genMeta);
  const receipts: string[] = [];

  genMeta.billHolmanSliceParams = params;
  genMeta.chartFirstLinearHierarchy = true;
  genMeta.lineFirstHierarchy = false;
  context.chartFirstLinearHierarchy = true;

  const plan = buildHolmanEpisodePlan(seed, tb, params.saxSoliDensity);
  genMeta.billHolmanEpisodePlanSummary = plan.episodes
    .map((e) => `${e.episodeType}:${e.startBar}-${e.endBar}`)
    .join('|');
  genMeta.billHolmanShoutStartBar = plan.shoutStartBar;

  receipts.push('bh:chart_first_hierarchy');
  receipts.push(`bh:sax_soli_density@${params.saxSoliDensity.toFixed(2)}`);
  receipts.push(`bh:line_independence@${params.lineIndependence.toFixed(2)}`);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) {
      out[b - 1] = raw[b - 1]!;
    }
  }

  applyChartFirstLayers(out, plan, params, seed, receipts);

  genMeta.billHolmanEffectiveHarmonyBars = out;
  genMeta.billHolmanDeviceReceipts = receipts;
}

export type { HolmanEpisodePlan };
