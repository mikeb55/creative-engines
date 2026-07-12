/**
 * Frank Zappa — polytonal clash, metric bass displacement, xenochrony-like pitch offset,
 * style juxtaposition (doo-wop ↔ altered), through-composed sectional cuts — Song Mode / duo harmony slice.
 * Receipts **`fz:d{1–5}:<device>@bar{N}#v1`**.
 */

import type {
  CompositionContext,
  FrankZappaContextMode,
  GenerationMetadata,
  ZappaStyleMode,
} from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import type { HarmonyContext } from '../harmony/harmonyContext';
import { computeHarmonyChecksum } from '../harmony/harmonyContext';
import { normalizeSongwriterStyleKey } from './songwriterStyleProfiles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { SONG_MODE_MOTIF_BAR_17, SONG_MODE_MOTIF_BAR_9 } from '../motif/motifEngineTypes';
import { getEffectiveContextForBar } from '../section-architecture/effectiveContextForBar';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

/** Stable device ids for receipts + diagnostics (spec labels). */
export const FRANK_ZAPPA_DEVICE_POLYTONAL_SUPERIMPOSITION = 'polytonal_superimposition' as const;
export const FRANK_ZAPPA_DEVICE_METRIC_DISPLACEMENT = 'metric_displacement' as const;
export const FRANK_ZAPPA_DEVICE_XENOCHRONY_PITCH_OFFSET = 'xenochrony_pitch_offset' as const;
export const FRANK_ZAPPA_DEVICE_STYLE_JUXTAPOSITION = 'style_juxtaposition' as const;
export const FRANK_ZAPPA_DEVICE_THROUGH_COMPOSED_CUT = 'through_composed_cut' as const;

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Elevated vs baseline so polytonal + altered juxtaposition fire before xenochrony; floors enforce ≥50% non–vanilla-maj7 + per-section altered presence. */
const D1_POLYTONAL_RATE = 0.55;
const D2_METRIC_DISPLACEMENT_RATE = 0.32;
const D3_XENOCHRONY_RATE = 0.2;
const D4_STYLE_JUXTAPOSITION_RATE = 0.5;
const D5_THROUGH_COMPOSED_CUT_RATE = 0.22;
const FRANK_ZAPPA_DIFF_RECEIPT_IDS_RUNTIME = ['FZ_DIFF_01', 'FZ_DIFF_02'] as const;

/** Bernoulli targets per device (Song Mode Frank Zappa slice + string-quartet variant). */
export const FRANK_ZAPPA_DEVICE_TARGET_RATES = {
  d1: D1_POLYTONAL_RATE,
  d2: D2_METRIC_DISPLACEMENT_RATE,
  d3: D3_XENOCHRONY_RATE,
  d4: D4_STYLE_JUXTAPOSITION_RATE,
  d5: D5_THROUGH_COMPOSED_CUT_RATE,
} as const;

/** Plain maj7 / maj9 / Δ without altered extensions — counts against “enough colour” quotas. */
function isVanillaMaj7Family(symbol: string): boolean {
  if (looksAlteredOrJazzDense(symbol)) return false;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase().replace(/\s/g, '');
  return /\bmaj7\b|maj9|maj11|mmaj|Δ/.test(tl);
}

function nudgeChordTowardAltered(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  const root = m?.[1];
  const slash = slashTail(symbol);
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 908401);
  if (u < 0.45) return mergeSlashFromSourceIfLost(symbol, `${root}7alt${slash}`);
  if (u < 0.78) return mergeSlashFromSourceIfLost(symbol, `${root}maj7#11${slash}`);
  return mergeSlashFromSourceIfLost(symbol, `${root}m7b5${slash}`);
}

/**
 * At least 50% of bars must not be vanilla maj7-family; each form section must contain at least one altered/jazz-dense bar.
 */
export function enforceZappaHarmonyLanguageFloors(params: {
  out: string[];
  receipts: string[];
  context: CompositionContext;
  seed: number;
}): void {
  const { out, receipts, context, seed } = params;
  const tb = out.length;
  if (tb < 1) return;

  const sectionsToScan =
    context.form.sections.length > 0
      ? context.form.sections
      : [{ label: 'form', startBar: 1, length: tb }];

  for (const sec of sectionsToScan) {
    const lo = sec.startBar;
    const hi = Math.min(tb, sec.startBar + sec.length - 1);
    if (lo > hi) continue;
    let hasAltered = false;
    for (let b = lo; b <= hi; b++) {
      const sym = out[b - 1];
      if (sym && looksAlteredOrJazzDense(sym)) {
        hasAltered = true;
        break;
      }
    }
    if (hasAltered) continue;
    const candidates: number[] = [];
    for (let b = lo; b <= hi; b++) {
      if (!isFrankZappaHookBar(b, context)) candidates.push(b);
    }
    candidates.sort((a, bb) => seededUnit(seed, a * 991, 908202) - seededUnit(seed, bb * 991, 908202));
    for (const pick of candidates) {
      const before = out[pick - 1]!;
      const nudged = nudgeChordTowardAltered(before, seed, pick);
      if (nudged !== before) {
        out[pick - 1] = nudged;
        receipts.push(`fz:enforce:section_altered@bar${pick}#v1`);
        break;
      }
    }
  }

  let vanilla = 0;
  for (let b = 1; b <= tb; b++) {
    const sym = out[b - 1];
    if (sym && isVanillaMaj7Family(sym)) vanilla++;
  }
  const maxVanilla = Math.floor(tb * 0.5);
  if (vanilla <= maxVanilla) return;

  const toFix = vanilla - maxVanilla;
  const candidates: number[] = [];
  for (let b = 1; b <= tb; b++) {
    const sym = out[b - 1];
    if (sym && isVanillaMaj7Family(sym) && !isFrankZappaHookBar(b, context)) candidates.push(b);
  }
  candidates.sort((a, bb) => seededUnit(seed, a, 908301) - seededUnit(seed, bb, 908301));
  let fixed = 0;
  for (const bar of candidates) {
    if (fixed >= toFix) break;
    const before = out[bar - 1]!;
    const nudged = nudgeChordTowardAltered(before, seed, bar + fixed * 17);
    if (nudged !== before) {
      out[bar - 1] = nudged;
      receipts.push(`fz:enforce:non_maj7_floor@bar${bar}#v1`);
      fixed++;
    }
  }
}

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

export function resolveFrankZappaSliceSourceChordForBar(bar: number, context: CompositionContext): string {
  const tb = context.form.totalBars;
  const locked = context.lockedHarmonyBarsRaw;
  if (locked && locked.length === tb && bar >= 1 && bar <= tb) {
    return locked[bar - 1]!;
  }
  return resolveBarSymbol(context, bar).symbol;
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

/** Six-zone density arc time shares: intro / build1 / peak1 / drop / peak2 / outro. */
const ZAPPA_ZONE_SHARES = [0.12, 0.22, 0.12, 0.18, 0.28, 0.08] as const;
const ZAPPA_ZONE_DENSITY = [0.3, 0.55, 0.85, 0.25, 0.95, 0.35] as const;

/**
 * Map each bar (1..tb) to a density bias (0–1) using fixed zone shares along the piece span.
 */
export function computeZappaDensityArc(tb: number): number[] {
  const out: number[] = [];
  if (tb < 1) return out;
  let cum = 0;
  const boundaries = ZAPPA_ZONE_SHARES.map((s) => {
    cum += s;
    return cum;
  });
  for (let b = 1; b <= tb; b++) {
    const u = (b - 0.5) / tb;
    let zi = 0;
    for (; zi < 6; zi++) {
      if (u <= boundaries[zi]!) break;
    }
    out.push(ZAPPA_ZONE_DENSITY[Math.min(5, zi)]!);
  }
  return out;
}

export function resolveFrankZappaSyntheticScaleBias(mode: FrankZappaContextMode): Record<string, number> {
  switch (mode) {
    case 'big_band':
      return { Lydian: 0.5, Mixolydian: 0.25, Dorian: 0.25 };
    case 'futuristic_jazz':
      return { Lydian: 0.35, 'Lydian dominant': 0.2, diminished: 0.15, 'whole-tone': 0.1, custom: 0.2 };
    case 'avant_rock':
    default:
      return { Lydian: 0.4, Dorian: 0.3, Mixolydian: 0.2, synthetic: 0.1 };
  }
}

function densityArcTailReset(density: number[], tb: number, resetBar: number): number[] {
  const tailLen = tb - resetBar + 1;
  if (tailLen < 1) return density;
  const tail = computeZappaDensityArc(tailLen);
  const out = [...density];
  for (let i = 0; i < tailLen; i++) {
    out[resetBar - 1 + i] = tail[i]!;
  }
  return out;
}

function meanDensity(density: readonly number[]): number {
  if (density.length === 0) return 0.55;
  return density.reduce((a, x) => a + x, 0) / density.length;
}

export interface ZappaSectionBehaviorOverride {
  bar: number;
  sectionLabel: string;
  densityScalar: number;
  densityDelta: number;
  registerShiftSemitones: number;
  structuralContrast: boolean;
  styleBoundary: boolean;
  receipts: string[];
}

function densityScalarForZappaBehavior(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(1, value));
  if (value === 'sparse') return 0.25;
  if (value === 'dense') return 0.85;
  if (value === 'moderate') return 0.55;
  return 0.5;
}

function fallbackZappaSectionDensity(sectionIndex: number): number {
  return sectionIndex % 2 === 0 ? 0.36 : 0.82;
}

function fallbackZappaSectionRegisterShift(sectionIndex: number): number {
  return sectionIndex % 2 === 0 ? -2 : 5;
}

function sectionIndexForBar(bar: number, context: CompositionContext): number {
  return context.form.sections.findIndex(
    (s) => bar >= s.startBar && bar < s.startBar + s.length
  );
}

/**
 * V65 P5: per-bar Zappa structural behavior from Song section architecture, with FormMap fallback.
 * Harmony receipts stay `fz:d1-d5:*`; this helper only biases density/register/style-boundary behavior.
 */
export function resolveZappaSectionBehaviorForBar(
  bar: number,
  context: CompositionContext
): ZappaSectionBehaviorOverride | undefined {
  const idx = sectionIndexForBar(bar, context);
  if (idx < 0) return undefined;
  const section = context.form.sections[idx]!;
  const eff = getEffectiveContextForBar(bar, context);
  const densityScalar = densityScalarForZappaBehavior(eff?.density ?? fallbackZappaSectionDensity(idx));
  const pitchMid =
    typeof eff?.pitch?.registerFloor === 'number' && typeof eff?.pitch?.registerCeiling === 'number'
      ? (eff.pitch.registerFloor + eff.pitch.registerCeiling) / 2
      : undefined;
  const registerShiftSemitones = Math.max(
    -7,
    Math.min(9, Math.round(pitchMid !== undefined ? (pitchMid - 60) / 2 : fallbackZappaSectionRegisterShift(idx)))
  );
  const styleBoundary = bar === section.startBar && idx > 0;
  const structuralContrast =
    styleBoundary ||
    Math.abs(densityScalar - 0.5) >= 0.25 ||
    Math.abs(registerShiftSemitones) >= 4 ||
    eff?.rhythm?.antiMetric === true;
  const receipts = [
    ...(structuralContrast ? ['FZ_DIFF_01'] : []),
    ...(styleBoundary || eff?.rhythm?.antiMetric === true || (eff?.pitch?.chromaticBudget ?? 0) >= 0.55
      ? ['FZ_DIFF_02']
      : []),
  ];
  return {
    bar,
    sectionLabel: section.label,
    densityScalar,
    densityDelta: densityScalar - 0.5,
    registerShiftSemitones,
    structuralContrast,
    styleBoundary,
    receipts,
  };
}

function zappaSectionDensityLevel(behavior: ZappaSectionBehaviorOverride): 'sparse' | 'medium' | 'dense' {
  if (behavior.densityScalar <= 0.38) return 'sparse';
  if (behavior.densityScalar >= 0.68) return 'dense';
  return 'medium';
}

export function applyZappaSectionRegisterBehavior(
  low: number,
  high: number,
  behavior: ZappaSectionBehaviorOverride | undefined
): [number, number] {
  if (!behavior) return [low, high];
  const shift = behavior.registerShiftSemitones;
  return [Math.max(28, Math.min(96, low + shift)), Math.max(28, Math.min(96, high + shift))];
}

export function applyZappaSectionDensityBehavior(
  current: 'sparse' | 'medium' | 'dense',
  behavior: ZappaSectionBehaviorOverride | undefined
): 'sparse' | 'medium' | 'dense' {
  if (!behavior) return current;
  return zappaSectionDensityLevel(behavior);
}

export function buildZappaSectionBehaviorDiagnostics(
  context: CompositionContext,
  totalBars: number
): GenerationMetadata['zappaSectionBehaviorBySection'] {
  const bySection: NonNullable<GenerationMetadata['zappaSectionBehaviorBySection']> = {};
  for (let b = 1; b <= totalBars; b++) {
    const behavior = resolveZappaSectionBehaviorForBar(b, context);
    if (!behavior) continue;
    const key = behavior.sectionLabel || `section_${sectionIndexForBar(b, context) + 1}`;
    const row =
      bySection[key] ??
      (bySection[key] = {
        label: behavior.sectionLabel,
        bars: [],
        meanDensityScalar: 0,
        meanRegisterShiftSemitones: 0,
        structuralContrastBars: [],
        styleBoundaryBars: [],
        receipts: [],
      });
    row.bars.push(b);
    row.meanDensityScalar += behavior.densityScalar;
    row.meanRegisterShiftSemitones += behavior.registerShiftSemitones;
    if (behavior.structuralContrast) row.structuralContrastBars.push(b);
    if (behavior.styleBoundary) row.styleBoundaryBars.push(b);
    for (const receipt of behavior.receipts) {
      if (!row.receipts.includes(receipt)) row.receipts.push(receipt);
    }
  }
  for (const row of Object.values(bySection)) {
    const n = Math.max(1, row.bars.length);
    row.meanDensityScalar = Number((row.meanDensityScalar / n).toFixed(3));
    row.meanRegisterShiftSemitones = Number((row.meanRegisterShiftSemitones / n).toFixed(3));
  }
  return Object.keys(bySection).length ? bySection : undefined;
}

function isLydianModalField(bar: number, symbol: string, fzCtx: FrankZappaContextMode, seed: number): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  if (/maj7#11|Δ#11|lyd/i.test(hp)) return true;
  const p =
    fzCtx === 'futuristic_jazz' ? 0.62 : fzCtx === 'big_band' ? 0.48 : 0.36;
  return seededUnit(seed, bar, 909100) < p;
}

function isDominantOrMajorForLydianField(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const tl = head.toLowerCase().replace(/\s/g, '');
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  if (/\bmaj7\b|maj9|maj11|Δ|maj\b|\bmaj$/.test(tl)) return true;
  if (/\b7|9|11|13|alt/.test(tl) && !/mmaj/.test(tl)) return true;
  return /^[a-g][#b]?$/i.test(head.trim());
}

function applyLydianDominantFieldPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  fzCtx: FrankZappaContextMode
): void {
  for (let b = 1; b <= tb; b++) {
    if (isFrankZappaHookBar(b, context)) continue;
    if (seededUnit(seed, b, 909111) >= 0.32) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    if (!isLydianModalField(b, sym, fzCtx, seed)) continue;
    if (!isDominantOrMajorForLydianField(sym)) continue;
    const hp = parseChordSymbol(sym).harmonyPart;
    if (/#11|\(#11\)/i.test(hp)) continue;
    const slash = slashTail(sym);
    out[b - 1] = `${hp}(#11)${slash}`;
    receipts.push(`fz:lyd_dominant@bar${b}#v1`);
  }
}

function applyBitonalTriadPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isFrankZappaHookBar(b, context)) continue;
    if (seededUnit(seed, b, 909121) >= 0.24) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const delta = seededUnit(seed, b, 909122) < 0.5 ? 4 : 6;
    const r2 = (r + delta) % 12;
    const slash = slashTail(sym);
    const a = pitchClassToSharpName(r);
    const bName = pitchClassToSharpName(r2);
    out[b - 1] = `${a}maj+${bName}maj${slash}`;
    receipts.push(`fz:bitonal_triad@bar${b}#v1`);
  }
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece devices untouched.
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

/** Bitonal maj+maj already passes fBT (proxy 0.55) — not plain maj7. */
function looksZappaBitonalFinal(symbol: string): boolean {
  return /maj\+[A-G](?:#|b)?maj/i.test(symbol.trim());
}

/**
 * Piece-final: bitonal maj+maj on final-bar root (same shape as applyBitonalTriadPass
 * Amaj+C#maj passers). Falls back to inferred tonic root. No slash.
 */
function spellZappaBitonalFinalCadence(
  bar: number,
  rootPc: number
): { symbol: string; receipt: string } {
  const a = pitchClassToSharpName(rootPc);
  const bName = pitchClassToSharpName((rootPc + 4) % 12);
  return {
    symbol: `${a}maj+${bName}maj`,
    receipt: `fz:final_bitonal_tonic@bar${bar}`,
  };
}

function resolveZappaFinalBitonalRootPc(
  out: string[],
  totalBars: number,
  tonicPc: number | undefined
): number | undefined {
  if (totalBars < 1 || out.length < totalBars) return tonicPc;
  return harmonyRootPc(out[totalBars - 1] ?? '') ?? tonicPc;
}

/**
 * Primary force: piece-final bar → Zappa bitonal tonic shape (Wayne force site;
 * spelling matches applyBitonalTriadPass passers, not plain maj7).
 */
function forceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  const rootPc = resolveZappaFinalBitonalRootPc(out, totalBars, tonicPc);
  if (rootPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const { symbol, receipt } = spellZappaBitonalFinalCadence(totalBars, rootPc);
  out[totalBars - 1] = symbol;
  receipts.push(`${receipt}|final_bar`);
}

/**
 * Safety net: if bar N still dominant-family / non-bitonal-open, rewrite to bitonal maj+maj.
 */
function enforceFinalBarTonicResolution(
  out: string[],
  tonicPc: number | undefined,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  const rootPc = resolveZappaFinalBitonalRootPc(out, totalBars, tonicPc);
  if (rootPc === undefined) return;
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym) return;
  if (looksZappaBitonalFinal(sym) || chordLooksTonicFamily(sym)) return;
  const { symbol, receipt } = spellZappaBitonalFinalCadence(totalBars, rootPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export type FrankZappaMotifRecycleTransform =
  | 'transposition'
  | 'rhythmic_displacement'
  | 'exact_repeat'
  | 'augmentation_diminution'
  | 'inversion'
  | 'combined'
  | 'retrograde';

const MOTIF_RECYCLE_WEIGHTS: readonly number[] = [0.28, 0.22, 0.2, 0.12, 0.08, 0.07, 0.03];

function pickMotifRecycleTransform(seed: number, bar: number): FrankZappaMotifRecycleTransform {
  const order: readonly FrankZappaMotifRecycleTransform[] = [
    'transposition',
    'rhythmic_displacement',
    'exact_repeat',
    'augmentation_diminution',
    'inversion',
    'combined',
    'retrograde',
  ];
  const u = seededUnit(seed, bar, 909131);
  let c = 0;
  for (let i = 0; i < order.length; i++) {
    c += MOTIF_RECYCLE_WEIGHTS[i]!;
    if (u < c) return order[i]!;
  }
  return 'transposition';
}

function applyMotifTransformAtBar(sym: string, t: FrankZappaMotifRecycleTransform): string {
  switch (t) {
    case 'transposition':
      return transposeChordRoot(sym, 2);
    case 'rhythmic_displacement':
      return transposeChordRoot(sym, 1);
    case 'exact_repeat':
      return sym;
    case 'augmentation_diminution':
      return transposeChordRoot(sym, 12);
    case 'inversion':
      return transposeChordRoot(sym, -5);
    case 'combined':
      return transposeChordRoot(sym, 3);
    case 'retrograde':
      return transposeChordRoot(sym, -2);
    default:
      return sym;
  }
}

function applyMotifRecyclingPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  const sections =
    context.form.sections.length > 0
      ? context.form.sections
      : [{ label: 'form', startBar: 1, length: tb }];
  const L = 4;
  for (const sec of sections) {
    const lo = sec.startBar;
    const hi = Math.min(tb, sec.startBar + sec.length - 1);
    let fired = false;
    for (let start = lo; start + 2 * L - 1 <= hi && !fired; start++) {
      const pattern = [0, 1, 2, 3].map((i) => out[start + i - 1]!);
      for (let j = start + L; j + L - 1 <= hi && !fired; j++) {
        const match = [0, 1, 2, 3].every((k) => out[j + k - 1] === pattern[k]);
        if (!match) continue;
        const barApply = j;
        if (isFrankZappaHookBar(barApply, context)) continue;
        const sym = out[barApply - 1]!;
        if (sym.includes('/')) continue;
        const t = pickMotifRecycleTransform(seed, barApply);
        const next = applyMotifTransformAtBar(sym, t);
        if (next !== sym) out[barApply - 1] = next;
        receipts.push(`fz:motif_recycle_${t}@bar${barApply}#v1`);
        fired = true;
      }
    }
  }
}

function applyHardCutTriggerSystem(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  density: number[]
): { density: number[]; triggers: number[] } {
  let d = [...density];
  const triggers: number[] = [];
  const sections =
    context.form.sections.length > 0
      ? context.form.sections
      : [{ label: 'form', startBar: 1, length: tb }];

  for (const sec of sections) {
    if (sec.length <= 24) continue;
    const at = Math.min(tb, sec.startBar + 24);
    const hiDen = (d[at - 1] ?? 0) >= 0.85;
    if (hiDen && seededUnit(seed, at, 909201) < 0.45 && !isFrankZappaHookBar(at, context)) {
      triggers.push(at);
    }
  }

  let runStart = 1;
  for (let b = 2; b <= tb; b++) {
    if (out[b - 2] !== out[b - 1]) {
      const runLen = b - 1 - runStart + 1;
      if (runLen >= 8) {
        const barHit = Math.min(tb, runStart + 7);
        if (!isFrankZappaHookBar(barHit, context) && seededUnit(seed, barHit, 909202) < 0.55) {
          triggers.push(barHit);
        }
      }
      runStart = b;
    }
  }
  {
    const runLen = tb - runStart + 1;
    if (runLen >= 8) {
      const barHit = Math.min(tb, runStart + 7);
      if (!isFrankZappaHookBar(barHit, context) && seededUnit(seed, barHit, 909204) < 0.55) {
        triggers.push(barHit);
      }
    }
  }

  for (let b = 4; b <= tb; b++) {
    if ((d[b - 1] ?? 0) >= 0.92 && (d[b - 2] ?? 0) >= 0.92 && (d[b - 3] ?? 0) >= 0.92) {
      if (seededUnit(seed, b, 909203) < 0.18 && !isFrankZappaHookBar(b, context)) {
        triggers.push(b);
      }
    }
  }

  const uniq = [...new Set(triggers)].sort((a, bb) => a - bb);
  const fired: number[] = [];

  for (const bar of uniq) {
    if (isFrankZappaHookBar(bar, context)) continue;
    const sym = out[bar - 1]!;
    if (sym.includes('/')) continue;
    const cut = applyThroughComposedCut(sym, seed, bar);
    if (cut !== sym) {
      out[bar - 1] = cut;
      receipts.push(`fz:hard_cut_trigger@bar${bar}#v1`);
      receipts.push(fzReceipt('d5', FRANK_ZAPPA_DEVICE_THROUGH_COMPOSED_CUT, bar));
      fired.push(bar);
      d = densityArcTailReset(d, tb, bar);
    }
  }

  return { density: d, triggers: fired };
}

export function isSongwriterFrankZappa(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'frank_zappa' } {
  return genMeta?.songwriterStyleId === 'frank_zappa';
}

/** Duo GCE lane — compositional structural fingerprint vs blues-rock ferocious map. Default **`compositional`**. */
export function resolveZappaStyleMode(
  contextOrMeta?:
    | CompositionContext
    | Pick<GenerationMetadata, 'zappaStyleMode'>
    | { styleMode?: ZappaStyleMode }
): ZappaStyleMode {
  if (contextOrMeta && 'styleMode' in contextOrMeta && contextOrMeta.styleMode === 'bluesrockFerocious') {
    return 'bluesrockFerocious';
  }
  const mode =
    contextOrMeta && 'generationMetadata' in contextOrMeta
      ? contextOrMeta.generationMetadata?.zappaStyleMode
      : contextOrMeta && 'zappaStyleMode' in contextOrMeta
        ? contextOrMeta.zappaStyleMode
        : undefined;
  return mode === 'bluesrockFerocious' ? 'bluesrockFerocious' : 'compositional';
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

export type FrankZappaHarmonyDeviceId = 'd1' | 'd2' | 'd3' | 'd4' | 'd5';

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
): FrankZappaHarmonyDeviceId | undefined {
  const secStart = isSectionStartBar(b, context);
  if (eligible.d5 && secStart && b > 1 && seededUnit(seed, b, 907501) < D5_THROUGH_COMPOSED_CUT_RATE) {
    return 'd5';
  }
  if (eligible.d1 && seededUnit(seed, b, 907101) < D1_POLYTONAL_RATE) {
    return 'd1';
  }
  if (eligible.d4 && seededUnit(seed, b, 907401) < D4_STYLE_JUXTAPOSITION_RATE) {
    return 'd4';
  }
  if (eligible.d3 && seededUnit(seed, b, 907301) < D3_XENOCHRONY_RATE) {
    return 'd3';
  }
  if (eligible.d2 && seededUnit(seed, b, 907201) < D2_METRIC_DISPLACEMENT_RATE) {
    return 'd2';
  }
  return undefined;
}

export interface ApplyFrankZappaHarmonyDeviceResult {
  next: string;
  noopGuard?: 'polytonalNoop' | 'xenochronyNoop';
}

/**
 * Apply one Frank Zappa harmonic device transform (shared by duo precompute and string-quartet slice).
 */
export function applyFrankZappaHarmonyDevice(
  symbol: string,
  device: FrankZappaHarmonyDeviceId,
  seed: number,
  bar: number
): ApplyFrankZappaHarmonyDeviceResult {
  if (device === 'd5') {
    return { next: applyThroughComposedCut(symbol, seed, bar) };
  }
  if (device === 'd3') {
    const next = applyXenochronyOffset(symbol, seed, bar);
    return next === symbol ? { next, noopGuard: 'xenochronyNoop' } : { next };
  }
  if (device === 'd1') {
    const next = applyPolytonalSlash(symbol, seed, bar);
    return next === symbol ? { next, noopGuard: 'polytonalNoop' } : { next };
  }
  if (device === 'd4') {
    return { next: applyStyleJuxtaposition(symbol, seed, bar) };
  }
  if (device === 'd2') {
    return { next: applyMetricDisplacement(symbol, seed, bar) };
  }
  return { next: symbol };
}

function frankZappaDeviceSpecLabel(device: FrankZappaHarmonyDeviceId): string {
  switch (device) {
    case 'd1':
      return FRANK_ZAPPA_DEVICE_POLYTONAL_SUPERIMPOSITION;
    case 'd2':
      return FRANK_ZAPPA_DEVICE_METRIC_DISPLACEMENT;
    case 'd3':
      return FRANK_ZAPPA_DEVICE_XENOCHRONY_PITCH_OFFSET;
    case 'd4':
      return FRANK_ZAPPA_DEVICE_STYLE_JUXTAPOSITION;
    case 'd5':
      return FRANK_ZAPPA_DEVICE_THROUGH_COMPOSED_CUT;
  }
}

/** @deprecated — use resolveBarSymbol */
export function precomputeFrankZappaEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const guards: FrankZappaAntiElaborationGuards = { polytonalNoop: 0, xenochronyNoop: 0 };

  const fzCtx: FrankZappaContextMode = genMeta.frankZappaContext ?? 'avant_rock';
  genMeta.frankZappaContext = fzCtx;
  if (genMeta.frankZappaSyntheticScaleBias == null) {
    genMeta.frankZappaSyntheticScaleBias = resolveFrankZappaSyntheticScaleBias(fzCtx);
  }

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

    const { next, noopGuard } = applyFrankZappaHarmonyDevice(sym0, device, seed, b);
    if (noopGuard === 'polytonalNoop') guards.polytonalNoop++;
    if (noopGuard === 'xenochronyNoop') guards.xenochronyNoop++;
    if (next !== sym0) {
      out[b - 1] = next;
      receipts.push(fzReceipt(device, frankZappaDeviceSpecLabel(device), b));
    }
  }

  applyLydianDominantFieldPass(out, seed, receipts, tb, context, fzCtx);
  applyBitonalTriadPass(out, seed, receipts, tb, context);
  applyMotifRecyclingPass(out, seed, receipts, tb, context);

  enforceZappaHarmonyLanguageFloors({ out, receipts, context, seed });

  let densityArc =
    Array.isArray(genMeta.frankZappaDensityBiasByBar) && (genMeta.frankZappaDensityBiasByBar as number[]).length === tb
      ? ([...(genMeta.frankZappaDensityBiasByBar as number[])] as number[])
      : computeZappaDensityArc(tb);
  for (let b = 1; b <= tb; b++) {
    const behavior = resolveZappaSectionBehaviorForBar(b, context);
    if (!behavior) continue;
    densityArc[b - 1] = Math.max(0, Math.min(1, (densityArc[b - 1] ?? 0.55) + behavior.densityDelta * 0.45));
  }

  const hard = applyHardCutTriggerSystem(out, seed, receipts, tb, context, densityArc);
  densityArc = hard.density;
  genMeta.frankZappaDensityBiasByBar = densityArc;
  genMeta.frankZappaHardCutTriggerBars = hard.triggers.length ? hard.triggers : undefined;
  genMeta.songwriterDensityBias = Math.max(0, Math.min(1, meanDensity(densityArc)));
  genMeta.frankZappaDiffReceipts = [...FRANK_ZAPPA_DIFF_RECEIPT_IDS_RUNTIME];
  genMeta.zappaSectionBehaviorBySection = buildZappaSectionBehaviorDiagnostics(context, tb);

  /* Piece-final only: bitonal tonic force + safety net (Wayne fBT pattern; Zappa spelling). */
  const tonicPc = inferTonicPitchClassFromBar1(context);
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

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

/** Primary songwriter or harmonicVoice selects Frank Zappa harmony authority (HarmonyContext path). */
export function isFrankZappaHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeSongwriterStyleKey(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'frank_zappa' || voice === 'frank_zappa';
}

/**
 * Sole wiring entry for Frank Zappa canonical harmony: runs `precomputeFrankZappaEffectiveHarmonyBars` once,
 * then freezes bars + checksum on `context.harmonyContext`.
 */
export function attachFrankZappaHarmonyContext(context: CompositionContext): HarmonyContext {
  if (!isFrankZappaHarmonicPath(context.generationMetadata)) {
    throw new Error('attachFrankZappaHarmonyContext: frank_zappa harmonic path required');
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
