/**
 * Frank Zappa — polytonal clash, metric bass displacement, xenochrony-like pitch offset,
 * style juxtaposition (doo-wop ↔ altered), through-composed sectional cuts — Song Mode / duo harmony slice.
 * Receipts **`fz:d{1–5}:<device>@bar{N}#v1`**.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { HarmonyContext } from '../harmony/harmonyContext';
import { computeHarmonyChecksum } from '../harmony/harmonyContext';
import { getChordForBar } from '../harmony/harmonyResolution';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { SONG_MODE_MOTIF_BAR_17, SONG_MODE_MOTIF_BAR_9 } from '../motif/motifEngineTypes';

/** Stable device ids for receipts + diagnostics (spec labels). */
export const FRANK_ZAPPA_DEVICE_POLYTONAL_SUPERIMPOSITION = 'polytonal_superimposition' as const;
export const FRANK_ZAPPA_DEVICE_METRIC_DISPLACEMENT = 'metric_displacement' as const;
export const FRANK_ZAPPA_DEVICE_XENOCHRONY_PITCH_OFFSET = 'xenochrony_pitch_offset' as const;
export const FRANK_ZAPPA_DEVICE_STYLE_JUXTAPOSITION = 'style_juxtaposition' as const;
export const FRANK_ZAPPA_DEVICE_THROUGH_COMPOSED_CUT = 'through_composed_cut' as const;

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const D1_POLYTONAL_RATE = 0.38;
const D2_METRIC_DISPLACEMENT_RATE = 0.32;
const D3_XENOCHRONY_RATE = 0.28;
const D4_STYLE_JUXTAPOSITION_RATE = 0.26;
const D5_THROUGH_COMPOSED_CUT_RATE = 0.22;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = h.indexOf('/');
  const head = slashIdx >= 0 ? h.slice(0, slashIdx) : h;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

/**
 * If the source symbol had a slash bass and a transform dropped it (only upper structure left),
 * reattach the original `/bass` tail. Intentional slash *replacement* (polytonal/metric) already includes `/`
 * in the candidate — no double slash.
 */
function mergeSlashFromSourceIfLost(source: string, candidate: string): string {
  if (!source.includes('/')) return candidate;
  if (candidate.includes('/')) return candidate;
  const tail = slashTail(source);
  return tail ? `${candidate.trim()}${tail}` : candidate;
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function transposeChordRoot(symbol: string, deltaPc: number): string {
  const p = parseChordSymbol(symbol);
  const hp = p.harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const rootPc = noteNameToPitchClass(m[1]);
  if (rootPc === undefined) return symbol;
  const rest = hp.slice(m[1].length);
  const newRoot = pitchClassToSharpName((rootPc + deltaPc + 12) % 12);
  const slash = slashTail(symbol);
  const out = `${newRoot}${rest}${slash}`;
  return mergeSlashFromSourceIfLost(symbol, out);
}

function resolveFrankZappaSliceSourceChordForBar(bar: number, context: CompositionContext): string {
  const tb = context.form.totalBars;
  const locked = context.lockedHarmonyBarsRaw;
  if (locked && locked.length === tb && bar >= 1 && bar <= tb) {
    return locked[bar - 1]!;
  }
  return getChordForBar(bar, context);
}

function isFrankZappaHookBar(bar: number, context: CompositionContext): boolean {
  return isProtectedBar(bar, context) || bar === SONG_MODE_MOTIF_BAR_9 || bar === SONG_MODE_MOTIF_BAR_17;
}

function isSectionStartBar(bar: number, context: CompositionContext): boolean {
  return context.form.sections.some((s) => s.startBar === bar);
}

function fzReceipt(device: 'd1' | 'd2' | 'd3' | 'd4' | 'd5', label: string, bar: number): string {
  return `fz:${device}:${label}@bar${bar}#v1`;
}

/** Polytonal clash: slash bass at tritone of chord root (upper keeps existing quality when possible). */
function applyPolytonalSlash(symbol: string, seed: number, bar: number): string {
  const rootPc = harmonyRootPc(symbol);
  if (rootPc === undefined) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const rest = head.replace(ROOT_AT_START, '').trim();
  const m = head.match(ROOT_AT_START);
  const letter = m?.[1];
  if (!letter) return symbol;
  const bassPc = (rootPc + 6) % 12;
  const slash = `/${pitchClassToSharpName(bassPc)}`;
  const qual =
    rest.length > 0
      ? rest
      : seededUnit(seed, bar, 906103) < 0.5
        ? '7alt'
        : 'm7b5';
  const out = `${letter}${qual}${slash}`;
  return mergeSlashFromSourceIfLost(symbol, out);
}

function applyMetricDisplacement(symbol: string, seed: number, bar: number): string {
  const rootPc = harmonyRootPc(symbol);
  if (rootPc === undefined) return symbol;
  const step = seededUnit(seed, bar, 906201) < 0.5 ? 3 : 4;
  const sign = seededUnit(seed, bar, 906202) < 0.5 ? 1 : -1;
  const bassPc = (rootPc + sign * step + 12) % 12;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const out = `${head}/${pitchClassToSharpName(bassPc)}`;
  return mergeSlashFromSourceIfLost(symbol, out);
}

function applyXenochronyOffset(symbol: string, seed: number, bar: number): string {
  const delta = seededUnit(seed, bar, 906301) < 0.5 ? 1 : -1;
  return transposeChordRoot(symbol, delta);
}

function looksBareTriadOrSimpleMajorMinor(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const tl = head.toLowerCase().replace(/\s/g, '');
  if (/maj7|mmaj|dim|ø|sus|add|m7|m11|7alt|\b7\b|9|11|13|#|b[0-9]/.test(tl)) return false;
  return /^[a-g][#b]?$/i.test(head.trim()) || /^[a-g][#b]?m$/i.test(head.trim());
}

function looksAlteredOrJazzDense(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return (
    /alt|7#11|maj7#11|m7b5|ø|#9|b13|7\(b9|7\(b13/.test(tl) ||
    (/7/.test(tl) && /#|b9|b13|#11/.test(tl))
  );
}

function applyStyleJuxtaposition(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const m = head.match(ROOT_AT_START);
  const root = m?.[1];
  const slash = slashTail(symbol);
  if (!root) return symbol;
  if (looksAlteredOrJazzDense(symbol)) {
    /**
     * Do not strip quality/extensions (e.g. `F#7alt/C` → `F#/C`). Effective harmony must stay aligned with
     * `lockedHarmonyBarsRaw` for authority routing; juxtaposition colour is carried in receipts, not by deleting
     * encoded altered/dominant spelling.
     */
    return symbol;
  }
  if (looksBareTriadOrSimpleMajorMinor(symbol)) {
    const out =
      seededUnit(seed, bar, 906402) < 0.5 ? `${root}7alt${slash}` : `${root}maj7#11${slash}`;
    return mergeSlashFromSourceIfLost(symbol, out);
  }
  return symbol;
}

function applyThroughComposedCut(symbol: string, seed: number, bar: number): string {
  const choices = [5, 6, 7, -5] as const;
  const delta = choices[Math.floor(seededUnit(seed, bar, 906501) * choices.length)]!;
  return transposeChordRoot(symbol, delta);
}

export function isSongwriterFrankZappa(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'frank_zappa' } {
  return genMeta?.songwriterStyleId === 'frank_zappa';
}

export interface FrankZappaHarmonyAccumulator {
  barsConsidered: number;
  polytonalSlashTouches: number;
  alteredColourTouches: number;
  triadClashTouches: number;
}

export function createFrankZappaHarmonyAccumulator(): FrankZappaHarmonyAccumulator {
  return {
    barsConsidered: 0,
    polytonalSlashTouches: 0,
    alteredColourTouches: 0,
    triadClashTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: FrankZappaHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const tl = hp.toLowerCase();
  if (/\/[a-g]/i.test(c)) acc.polytonalSlashTouches++;
  if (/alt|#11|m7b5|ø/.test(tl)) acc.alteredColourTouches++;
  if (looksBareTriadOrSimpleMajorMinor(c)) acc.triadClashTouches++;
}

export function accumulateFrankZappaHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: FrankZappaHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface FrankZappaAntiElaborationGuards {
  polytonalNoop: number;
  xenochronyNoop: number;
}

export interface FrankZappaEligibilityStats {
  totalBars: number;
  d1EligibleBars: number;
  d2EligibleBars: number;
  d3EligibleBars: number;
  d4EligibleBars: number;
  d5EligibleBars: number;
  targetMeanFiresD1: number;
  targetMeanFiresD2: number;
  targetMeanFiresD3: number;
  targetMeanFiresD4: number;
  targetMeanFiresD5: number;
}

export function countFrankZappaDeviceFiresFromReceipts(receipts: readonly string[]): {
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
} {
  const out = { d1: 0, d2: 0, d3: 0, d4: 0, d5: 0 };
  for (const r of receipts) {
    if (r.includes(':d1:')) out.d1++;
    else if (r.includes(':d2:')) out.d2++;
    else if (r.includes(':d3:')) out.d3++;
    else if (r.includes(':d4:')) out.d4++;
    else if (r.includes(':d5:')) out.d5++;
  }
  return out;
}

type FrankZappaDevicePlan = 'd1' | 'd2' | 'd3' | 'd4' | 'd5';

function pickDeviceForBar(
  b: number,
  seed: number,
  context: CompositionContext,
  _raw: string[],
  eligible: {
    d1: boolean;
    d2: boolean;
    d3: boolean;
    d4: boolean;
    d5: boolean;
  }
): FrankZappaDevicePlan | undefined {
  const secStart = isSectionStartBar(b, context);
  if (eligible.d5 && secStart && b > 1 && seededUnit(seed, b, 907501) < D5_THROUGH_COMPOSED_CUT_RATE) {
    return 'd5';
  }
  if (eligible.d3 && seededUnit(seed, b, 907301) < D3_XENOCHRONY_RATE) {
    return 'd3';
  }
  if (eligible.d1 && seededUnit(seed, b, 907101) < D1_POLYTONAL_RATE) {
    return 'd1';
  }
  if (eligible.d4 && seededUnit(seed, b, 907401) < D4_STYLE_JUXTAPOSITION_RATE) {
    return 'd4';
  }
  if (eligible.d2 && seededUnit(seed, b, 907201) < D2_METRIC_DISPLACEMENT_RATE) {
    return 'd2';
  }
  return undefined;
}

export function precomputeFrankZappaEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const guards: FrankZappaAntiElaborationGuards = { polytonalNoop: 0, xenochronyNoop: 0 };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveFrankZappaSliceSourceChordForBar(b, context));
  }

  let d1E = 0;
  let d2E = 0;
  let d3E = 0;
  let d4E = 0;
  let d5E = 0;

  for (let b = 1; b <= tb; b++) {
    const hook = isFrankZappaHookBar(b, context);
    const sym = raw[b - 1]!;
    const rootOk = harmonyRootPc(sym) !== undefined;
    if (!hook && rootOk) {
      d1E++;
      d2E++;
      d3E++;
      d4E++;
    }
    if (!hook && rootOk && isSectionStartBar(b, context) && b > 1) d5E++;
  }

  const out = [...raw];

  for (let b = 1; b <= tb; b++) {
    if (isFrankZappaHookBar(b, context)) continue;
    const sym0 = out[b - 1]!;
    const rootOk = harmonyRootPc(sym0) !== undefined;
    const eligible = {
      d1: rootOk,
      d2: rootOk && !sym0.includes('/'),
      d3: rootOk,
      d4: rootOk,
      d5: rootOk && isSectionStartBar(b, context) && b > 1,
    };
    const device = pickDeviceForBar(b, seed, context, raw, eligible);
    if (!device) continue;

    if (device === 'd5') {
      const next = applyThroughComposedCut(sym0, seed, b);
      if (next !== sym0) {
        out[b - 1] = next;
        receipts.push(fzReceipt('d5', FRANK_ZAPPA_DEVICE_THROUGH_COMPOSED_CUT, b));
      }
      continue;
    }
    if (device === 'd3') {
      const next = applyXenochronyOffset(sym0, seed, b);
      if (next !== sym0) {
        out[b - 1] = next;
        receipts.push(fzReceipt('d3', FRANK_ZAPPA_DEVICE_XENOCHRONY_PITCH_OFFSET, b));
      } else {
        guards.xenochronyNoop++;
      }
      continue;
    }
    if (device === 'd1') {
      const next = applyPolytonalSlash(sym0, seed, b);
      if (next !== sym0) {
        out[b - 1] = next;
        receipts.push(fzReceipt('d1', FRANK_ZAPPA_DEVICE_POLYTONAL_SUPERIMPOSITION, b));
      } else {
        guards.polytonalNoop++;
      }
      continue;
    }
    if (device === 'd4') {
      const next = applyStyleJuxtaposition(sym0, seed, b);
      if (next !== sym0) {
        out[b - 1] = next;
        receipts.push(fzReceipt('d4', FRANK_ZAPPA_DEVICE_STYLE_JUXTAPOSITION, b));
      }
      continue;
    }
    if (device === 'd2') {
      const next = applyMetricDisplacement(sym0, seed, b);
      if (next !== sym0) {
        out[b - 1] = next;
        receipts.push(fzReceipt('d2', FRANK_ZAPPA_DEVICE_METRIC_DISPLACEMENT, b));
      }
    }
  }

  genMeta.frankZappaEffectiveHarmonyBars = out;
  genMeta.frankZappaDeviceReceipts = receipts;
  genMeta.frankZappaAntiElaborationGuards = guards;
  genMeta.frankZappaEligibilityStats = {
    totalBars: tb,
    d1EligibleBars: d1E,
    d2EligibleBars: d2E,
    d3EligibleBars: d3E,
    d4EligibleBars: d4E,
    d5EligibleBars: d5E,
    targetMeanFiresD1: d1E * D1_POLYTONAL_RATE,
    targetMeanFiresD2: d2E * D2_METRIC_DISPLACEMENT_RATE,
    targetMeanFiresD3: d3E * D3_XENOCHRONY_RATE,
    targetMeanFiresD4: d4E * D4_STYLE_JUXTAPOSITION_RATE,
    targetMeanFiresD5: d5E * D5_THROUGH_COMPOSED_CUT_RATE,
  };
}

export function finalizeFrankZappaMetadata(metadata: GenerationMetadata, acc: FrankZappaHarmonyAccumulator): void {
  const flat = [...(metadata.frankZappaDeviceReceipts ?? [])];
  const g = metadata.frankZappaAntiElaborationGuards ?? { polytonalNoop: 0, xenochronyNoop: 0 };
  const guardTotal = g.polytonalNoop + g.xenochronyNoop;
  const tb = Math.max(1, acc.barsConsidered);
  const fires = countFrankZappaDeviceFiresFromReceipts(flat);
  const d = {
    songwriterId: 'frank_zappa' as const,
    barsConsidered: acc.barsConsidered,
    polytonalSlashHitRate: acc.polytonalSlashTouches / tb,
    alteredColourHitRate: acc.alteredColourTouches / tb,
    triadClashHitRate: acc.triadClashTouches / tb,
    deviceFireCounts: fires,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Frank Zappa (slice): slash≈${acc.polytonalSlashTouches}`,
    `altColour≈${acc.alteredColourTouches}`,
    `triadClash≈${acc.triadClashTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.frankZappaDiagnostics = { ...d };
  metadata.frankZappaSliceReceipt = receipt;
}

/**
 * Sole wiring entry for Frank Zappa canonical harmony: runs `precomputeFrankZappaEffectiveHarmonyBars` once,
 * then freezes bars + checksum on `context.harmonyContext`.
 */
export function attachFrankZappaHarmonyContext(context: CompositionContext): HarmonyContext {
  if (context.generationMetadata?.songwriterStyleId !== 'frank_zappa') {
    throw new Error('attachFrankZappaHarmonyContext: songwriterStyleId must be frank_zappa');
  }
  const tb = context.form.totalBars;
  precomputeFrankZappaEffectiveHarmonyBars(context);
  const raw = context.generationMetadata?.frankZappaEffectiveHarmonyBars;
  if (!Array.isArray(raw) || raw.length !== tb) {
    throw new Error(
      `attachFrankZappaHarmonyContext: expected frankZappaEffectiveHarmonyBars length ${tb}, got ${raw?.length ?? 0}`
    );
  }
  const bars = Object.freeze(raw.map((s) => String(s))) as readonly string[];
  const checksum = computeHarmonyChecksum(bars);
  const hc: HarmonyContext = Object.freeze({
    styleId: 'frank_zappa',
    source: 'frank_zappa_effective',
    bars,
    checksum,
  });
  context.harmonyContext = hc;
  return hc;
}
