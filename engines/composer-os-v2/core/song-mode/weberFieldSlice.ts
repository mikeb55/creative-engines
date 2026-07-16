/**
 * Eberhard Weber — bass-led harmonic field Song Mode / duo golden-path slice.
 * Upper color clusters over sustained bass axis — receipts `ew:*`.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

export const EBERHARD_WEBER_HARMONIC_VOICE_IDS = ['eberhard_weber', 'weber_field'] as const;

export function isEberhardWeberHarmonicVoiceId(raw: string | null | undefined): boolean {
  const id = normalizeHarmonicVoiceId(String(raw ?? ''));
  return id === 'eberhard_weber' || id === 'weber_field';
}

/**
 * Exact `eberhard_weber` or VRB twin `weber_field` only.
 * Soft `weber` / `ew` songwriter-normalize only — never engage HV.
 * Never matches `webern` / `anton_webern` (separate SQ/film Webern stub).
 * Field-plan / surface holdbacks stay primary-only.
 */
export function isEberhardWeberHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  return (
    isEberhardWeberHarmonicVoiceId(metadata?.songwriterStyleId) ||
    isEberhardWeberHarmonicVoiceId(metadata?.harmonicVoice)
  );
}

/**
 * Phase 2 widen — BB/SQ non-mosaic harmony-bridge wall (final ROI #5 after Threadgill).
 * Activates only when `harmonicVoice` is exact `eberhard_weber` (not primary||HV).
 * Twin `weber_field` and soft `weber` / `ew` never open. Never `webern`.
 * `frank_zappa` primary excluded (dedicated FZ batches).
 */
export function isEberhardWeberHvOnlyEnsembleWall(opts: {
  harmonicVoice?: string | null;
  songwriterStyleId?: string | null;
}): boolean {
  const voice = normalizeHarmonicVoiceId(String(opts.harmonicVoice ?? ''));
  if (voice !== 'eberhard_weber') return false;
  const primary = normalizeHarmonicVoiceId(String(opts.songwriterStyleId ?? ''));
  return primary !== 'frank_zappa';
}

/** Minimal context for `precomputeEberhardWeberEffectiveHarmonyBars` on BB/SQ chordBars bridge. */
export function buildEberhardWeberEnsemblePrecomputeContext(args: {
  seed: number;
  chordBars: string[];
  sections: Array<{ label: string; startBar: number; length: number }>;
  presetId: string;
  songwriterStyleId?: string;
}): CompositionContext {
  const tb = args.chordBars.length;
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    harmonicVoice: 'eberhard_weber',
    ...(args.songwriterStyleId
      ? { songwriterStyleId: args.songwriterStyleId }
      : {}),
  };
  return {
    systemVersion: '2.0.0',
    presetId: args.presetId,
    seed: args.seed,
    form: { totalBars: tb, sections: args.sections },
    lockedHarmonyBarsRaw: [...args.chordBars],
    generationMetadata,
  } as unknown as CompositionContext;
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Five Weber slice parameters (0–1). */
export interface EberhardWeberSliceParams {
  pedalPersistence: number;
  upperChordRefreshRate: number;
  functionalCadenceRate: number;
  revoicingInsteadOfResolution: number;
  bassAsHarmonySource: number;
}

export const DEFAULT_EBERHARD_WEBER_SLICE_PARAMS: EberhardWeberSliceParams = {
  pedalPersistence: 0.78,
  upperChordRefreshRate: 0.3,
  functionalCadenceRate: 0.2,
  revoicingInsteadOfResolution: 0.65,
  bassAsHarmonySource: 0.85,
};

export interface WeberPedalUnit {
  index: number;
  startBar: number;
  endBar: number;
  pedalPc: number;
  pedalName: string;
}

export interface WeberFieldPlan {
  units: WeberPedalUnit[];
  sliceParams: EberhardWeberSliceParams;
  phraseArcLengths: number[];
}

const UPPER_FIELD_PALETTE: Readonly<Record<string, readonly string[]>> = {
  D: ['Gmaj7(add9)/D', 'Cmaj7/D', 'Em9/D', 'G/D'],
  A: ['Fmaj7(#11)/A', 'Dadd9/A', 'Cmaj7/A'],
  E: ['F/E', 'Am9/E', 'Cmaj7/E', 'Esus(add9)/E'],
};

const PEDAL_CENTERS = ['D', 'A', 'E'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function slashBassPc(symbol: string): number | undefined {
  if (!symbol.includes('/')) return undefined;
  const tail = symbol.slice(symbol.indexOf('/') + 1).trim();
  const m = tail.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

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

export function resolveEberhardWeberSliceParams(
  genMeta: GenerationMetadata | undefined
): EberhardWeberSliceParams {
  const fromMeta = genMeta?.eberhardWeberSliceParams;
  if (!fromMeta) return { ...DEFAULT_EBERHARD_WEBER_SLICE_PARAMS };
  const d = DEFAULT_EBERHARD_WEBER_SLICE_PARAMS;
  return {
    pedalPersistence: clamp01(fromMeta.pedalPersistence ?? d.pedalPersistence),
    upperChordRefreshRate: clamp01(fromMeta.upperChordRefreshRate ?? d.upperChordRefreshRate),
    functionalCadenceRate: clamp01(fromMeta.functionalCadenceRate ?? d.functionalCadenceRate),
    revoicingInsteadOfResolution: clamp01(
      fromMeta.revoicingInsteadOfResolution ?? d.revoicingInsteadOfResolution
    ),
    bassAsHarmonySource: clamp01(fromMeta.bassAsHarmonySource ?? d.bassAsHarmonySource),
  };
}

function pedalUnitLength(seed: number, unitIndex: number, pedalPersistence: number): number {
  const u = seededUnit(seed, unitIndex, 880101);
  if (pedalPersistence >= 0.75) {
    if (u < 0.28) return 8;
    if (u < 0.55) return 6;
    if (u < 0.82) return 10;
    return 12;
  }
  if (u < 0.35) return 4;
  if (u < 0.7) return 6;
  return 8;
}

function pickPedalCenter(seed: number, unitIndex: number, tonicPc: number): string {
  const u = seededUnit(seed, unitIndex, 880102);
  if (u < 0.34) return PEDAL_CENTERS[0]!;
  if (u < 0.67) return PEDAL_CENTERS[1]!;
  const tonicName = pitchClassToSharpName(tonicPc);
  if (PEDAL_CENTERS.includes(tonicName as (typeof PEDAL_CENTERS)[number])) return tonicName;
  return PEDAL_CENTERS[2]!;
}

/** Layer 1 — pedal phrase units (4–12 bars) with bass axis. */
export function buildWeberFieldPlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: EberhardWeberSliceParams = DEFAULT_EBERHARD_WEBER_SLICE_PARAMS
): WeberFieldPlan {
  const units: WeberPedalUnit[] = [];
  const phraseArcLengths: number[] = [];
  let bar = 1;
  let idx = 0;
  while (bar <= totalBars) {
    const span = Math.min(pedalUnitLength(seed, idx, params.pedalPersistence), totalBars - bar + 1);
    const endBar = bar + span - 1;
    const pedalName = pickPedalCenter(seed, idx, tonicPc);
    units.push({
      index: idx,
      startBar: bar,
      endBar,
      pedalPc: noteNameToPitchClass(pedalName) ?? 2,
      pedalName,
    });
    phraseArcLengths.push(span);
    bar = endBar + 1;
    idx++;
  }
  return { units, sliceParams: params, phraseArcLengths };
}

export function pedalUnitForBar(plan: WeberFieldPlan, bar: number): WeberPedalUnit | undefined {
  return plan.units.find((u) => bar >= u.startBar && bar <= u.endBar);
}

function paletteChordForBar(unit: WeberPedalUnit, seed: number, bar: number, refreshIndex: number): string {
  const palette = UPPER_FIELD_PALETTE[unit.pedalName] ?? UPPER_FIELD_PALETTE.D!;
  const u = seededUnit(seed, bar, 880201 + refreshIndex);
  return palette[Math.floor(u * palette.length) % palette.length]!;
}

function looksFunctionalTwoFive(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bm7\b|\bm9\b|ø|m7b5/.test(tl) && !/maj|sus|dim|aug/.test(tl);
}

function looksDominantSeventh(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  return /7|9|11|13|alt/.test(tl);
}

function matchesMajorTwoFiveOne(
  out: string[],
  iiBar: number,
  tonicPc: number,
  tb: number
): boolean {
  if (iiBar + 2 > tb) return false;
  const rIi = harmonyRootPc(stemOnly(out[iiBar - 1]!));
  const rV = harmonyRootPc(stemOnly(out[iiBar]!));
  const rI = harmonyRootPc(stemOnly(out[iiBar + 1]!));
  if (rIi === undefined || rV === undefined || rI === undefined) return false;
  const iiPc = (tonicPc + 2) % 12;
  const vPc = (tonicPc + 7) % 12;
  return rIi === iiPc && rV === vPc && rI === tonicPc;
}

function revoicingRelease(unit: WeberPedalUnit, seed: number, bar: number): string {
  const u = seededUnit(seed, bar, 880301);
  const palette = UPPER_FIELD_PALETTE[unit.pedalName] ?? UPPER_FIELD_PALETTE.D!;
  const idx = Math.floor(u * palette.length) % palette.length;
  const alt = palette[(idx + 1) % palette.length]!;
  if (u < 0.5) return alt;
  const base = palette[idx]!;
  const st = stemOnly(base);
  const hp = parseChordSymbol(st).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return alt;
  const qual = hp.slice(root.length);
  return `${root}${qual}(add9)/${unit.pedalName}`;
}

function applyWeberFieldLayers(
  out: string[],
  plan: WeberFieldPlan,
  seed: number,
  receipts: string[],
  tonicPc: number | undefined,
  context: CompositionContext
): void {
  const p = plan.sliceParams;
  const tb = out.length;

  for (const unit of plan.units) {
    receipts.push(`ew:phrase_unit@${unit.startBar}-${unit.endBar}:pedal=${unit.pedalName}`);
    let lastUpper = paletteChordForBar(unit, seed, unit.startBar, 0);
    let barsSinceRefresh = 0;

    for (let bar = unit.startBar; bar <= unit.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = out[i]!;

      if (seededUnit(seed, bar, 880401) < p.pedalPersistence) {
        if (barsSinceRefresh >= 2 && seededUnit(seed, bar, 880402) < p.upperChordRefreshRate + 0.35) {
          lastUpper = paletteChordForBar(unit, seed, bar, barsSinceRefresh);
          barsSinceRefresh = 0;
          receipts.push(`ew:upper_refresh@${bar}`);
        } else if (bar === unit.startBar) {
          lastUpper = paletteChordForBar(unit, seed, bar, 0);
          receipts.push(`ew:upper_refresh@${bar}`);
        }
        sym = lastUpper;
        barsSinceRefresh++;
        receipts.push(`ew:pedal@${bar}`);
      }

      if (seededUnit(seed, bar, 880403) < p.bassAsHarmonySource) {
        if (!sym.includes('/')) {
          sym = `${stemOnly(sym)}/${unit.pedalName}`;
        }
        receipts.push(`ew:bass_led@${bar}`);
      }

      if (looksFunctionalTwoFive(sym) || looksDominantSeventh(sym)) {
        if (seededUnit(seed, bar, 880404) < 1 - p.functionalCadenceRate) {
          sym = paletteChordForBar(unit, seed, bar, bar);
          receipts.push(`ew:defunctional@${bar}`);
        }
      }

      if (bar === unit.endBar && seededUnit(seed, bar, 880405) < p.revoicingInsteadOfResolution) {
        sym = revoicingRelease(unit, seed, bar);
        receipts.push(`ew:revoicing@${bar}`);
      }

      if (seededUnit(seed, bar, 880406) < 0.22) {
        receipts.push(`ew:resonant_space@${bar}`);
      }

      out[i] = sym;
    }
  }

  if (tonicPc !== undefined) {
    for (let iiBar = 1; iiBar <= tb - 2; iiBar++) {
      if (!matchesMajorTwoFiveOne(out, iiBar, tonicPc, tb)) continue;
      if (
        isProtectedBar(iiBar, context) ||
        isProtectedBar(iiBar + 1, context) ||
        isProtectedBar(iiBar + 2, context)
      ) {
        continue;
      }
      const unit = pedalUnitForBar(plan, iiBar);
      if (!unit) continue;
      for (let k = 0; k < 3; k++) {
        const bar = iiBar + k;
        out[bar - 1] = paletteChordForBar(unit, seed, bar, k + 9);
      }
      receipts.push(`ew:defunctional@${iiBar}`);
    }
  }
}

export interface EberhardWeberHarmonyAccumulator {
  barsConsidered: number;
  pedalTouches: number;
  upperRefreshTouches: number;
  bassLedTouches: number;
  revoicingTouches: number;
  resonantTouches: number;
}

export function createEberhardWeberHarmonyAccumulator(): EberhardWeberHarmonyAccumulator {
  return {
    barsConsidered: 0,
    pedalTouches: 0,
    upperRefreshTouches: 0,
    bassLedTouches: 0,
    revoicingTouches: 0,
    resonantTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: EberhardWeberHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  if (/\//.test(c)) {
    acc.pedalTouches++;
    acc.bassLedTouches++;
  }
  if (/add9|#11|maj7|sus/.test(parseChordSymbol(c).harmonyPart.toLowerCase())) {
    acc.upperRefreshTouches++;
  }
}

export function accumulateEberhardWeberHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: EberhardWeberHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

/** Smoke helpers — ii–V–I chain count in effective bars. */
export function countMajorTwoFiveOneChains(bars: readonly string[], tonicPc: number): number {
  let count = 0;
  for (let iiBar = 1; iiBar <= bars.length - 2; iiBar++) {
    if (matchesMajorTwoFiveOne([...bars], iiBar, tonicPc, bars.length)) count++;
  }
  return count;
}

export function maxWeberPhraseArcLength(plan: WeberFieldPlan | undefined): number {
  if (!plan?.phraseArcLengths.length) return 0;
  return Math.max(...plan.phraseArcLengths);
}

export function precomputeEberhardWeberEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 2;
  const params = resolveEberhardWeberSliceParams(genMeta);
  genMeta.eberhardWeberSliceParams = params;

  const plan = buildWeberFieldPlan(seed, tb, tonicPc, params);
  genMeta.eberhardWeberFieldPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `ew:params=pp:${params.pedalPersistence.toFixed(2)};ucr:${params.upperChordRefreshRate.toFixed(2)};fcr:${params.functionalCadenceRate.toFixed(2)};rir:${params.revoicingInsteadOfResolution.toFixed(2)};bah:${params.bassAsHarmonySource.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyWeberFieldLayers(out, plan, seed, receipts, tonicPc, context);

  genMeta.eberhardWeberEffectiveHarmonyBars = out;
  genMeta.eberhardWeberDeviceReceipts = receipts;
}

export function finalizeEberhardWeberMetadata(
  metadata: GenerationMetadata,
  acc: EberhardWeberHarmonyAccumulator
): void {
  const flat = [...(metadata.eberhardWeberDeviceReceipts ?? [])];
  const plan = metadata.eberhardWeberFieldPlan;
  const params = metadata.eberhardWeberSliceParams ?? DEFAULT_EBERHARD_WEBER_SLICE_PARAMS;
  const pedalReceipts = flat.filter((r) => r.startsWith('ew:pedal@')).length;
  const revoicingReceipts = flat.filter((r) => r.startsWith('ew:revoicing@')).length;

  metadata.eberhardWeberDiagnostics = {
    songwriterId: 'eberhard_weber',
    barsConsidered: acc.barsConsidered,
    pedalTouches: pedalReceipts,
    upperRefreshTouches: flat.filter((r) => r.startsWith('ew:upper_refresh@')).length,
    bassLedTouches: flat.filter((r) => r.startsWith('ew:bass_led@')).length,
    revoicingTouches: revoicingReceipts,
    resonantTouches: flat.filter((r) => r.startsWith('ew:resonant_space@')).length,
    maxPhraseArcLength: maxWeberPhraseArcLength(plan),
    unitCount: plan?.units.length,
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.eberhardWeberSliceReceipt = [
    'Eberhard Weber (bass-led harmonic field slice)',
    `units=${plan?.units.length ?? 0}`,
    `pp=${params.pedalPersistence.toFixed(2)}`,
    `bah=${params.bassAsHarmonySource.toFixed(2)}`,
    `pedal≈${pedalReceipts}`,
    `revoice≈${revoicingReceipts}`,
    `arcMax=${maxWeberPhraseArcLength(plan)}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
