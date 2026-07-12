/**
 * Steve Reich — pitch-field process harmony slice (`sr:*` receipts).
 * Harmony emerges from phasing/additive process inside a static diatonic field — not functional chord streams.
 * // Glass = more chord changes + modular sequences; Reich = one field + process
 * // Pärt: no tintinnabuli voice / silence grid — Reich stays rhythm-busy under static harmony.
 */

import type { CompositionContext, GenerationMetadata, SteveReichProcessMode } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';

export type { SteveReichProcessMode } from '../compositionContext';

/** Research defaults — `buildReharmLensConfig('steve_reich')`, additive segment grammar. */
export const STEVE_REICH_SLICE_PARAMETERS = {
  coreDevice: 'pitch_field_process' as const,
  defaultProcess: 'phasing' as SteveReichProcessMode,
  processComment:
    "'phasing' = rhythmic displacement of identical cells creating emergent harmony | 'additive' = gradual note addition/subtraction within static field | 'cycle' = slow chord cycle with internal process (Music for 18 Musicians style)",
  pitchFields: ['major', 'mixolydian', 'dorian', 'major_pentatonic'] as const,
  chromaticAlterationRate: 0.02,
  tritoneRate: 0.02,
  susBias: 0.4,
  chromaticMediantBias: 0.05,
  staticDominantBias: 0.95,
  additiveExpansionRate: 0.1,
  harmonicRhythmBars: 16,
  pulseGridDensity: 'high' as const,
  distinctionGlassComment:
    '// Glass = more chord changes + modular sequences; Reich = one field + process',
  distinctionPartComment:
    '// Pärt tintinnabuli / silence as structure — not Reich; Reich keeps pulse density high under one field',
  phraseTemplatesComment: 'additive_build | phase_drift | drone_field — no functional / chromatic rows',
} as const;

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function resolveSteveReichProcess(genMeta: GenerationMetadata & Record<string, unknown>): SteveReichProcessMode {
  const raw = genMeta.reichProcess as SteveReichProcessMode | undefined;
  if (raw === 'phasing' || raw === 'additive' || raw === 'cycle') return raw;
  return STEVE_REICH_SLICE_PARAMETERS.defaultProcess;
}

/** Strip dense altered spellings toward diatonic-friendly labels when roll exceeds chromatic budget. */
function softenChromaticSurface(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (seededUnit(seed, bar, 98201) < STEVE_REICH_SLICE_PARAMETERS.chromaticAlterationRate) return symbol;
  if (!/b9|#9|#11|b13|alt/.test(hp)) return symbol;
  const m = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START);
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  if (!m?.[1]) return symbol;
  const root = m[1];
  if (/maj|Δ|mmaj|dim|ø/.test(hp)) return symbol;
  if (/m7|min7/.test(hp)) return `${root}m7${slash}`;
  return `${root}7${slash}`;
}

/** Quartal / sus colour — pitch-field bias (`susBias`). */
function maybeQuartalSusColour(symbol: string, seed: number, bar: number): string {
  if (seededUnit(seed, bar, 98202) >= STEVE_REICH_SLICE_PARAMETERS.susBias * 0.45) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/dim|ø|maj7|mmaj|Δ/.test(tl)) return symbol;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (rest === '' || /^maj/.test(rest)) return `${root}sus2${slash}`;
  if (/^m7|^m(?!aj)/.test(rest) || /\bm7\b/.test(tl)) return `${root}m7${slash}`;
  if (/^7|^9|^13/.test(rest) || /\b7\b/.test(tl)) return `${root}7sus4${slash}`;
  return symbol;
}

/** Slow additive upper-structure nudge (maj7→maj9, m7→m9) — `additiveExpansionRate`. */
function maybeAdditiveExpand(symbol: string, seed: number, bar: number, segmentIndex: number): string {
  const sp = STEVE_REICH_SLICE_PARAMETERS;
  if (seededUnit(seed, bar, 98203) >= sp.additiveExpansionRate * 0.35) return symbol;
  if (segmentIndex % 2 === 0) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  if (/maj7|Δ/.test(tl) && !/maj9/.test(tl)) return `${root}maj9${slash}`;
  if (/\bm7\b|^m7/.test(tl) && !/m9/.test(tl)) return `${root}m9${slash}`;
  if (/\b7\b/.test(tl) && !/9|11|13/.test(tl)) return `${root}9${slash}`;
  return symbol;
}

export function isSongwriterSteveReich(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'steve_reich' } {
  return genMeta?.songwriterStyleId === 'steve_reich';
}

export interface SteveReichHarmonyAccumulator {
  barsConsidered: number;
  fieldHoldTouches: number;
  susQuartalTouches: number;
  additiveTouches: number;
}

export function createSteveReichHarmonyAccumulator(): SteveReichHarmonyAccumulator {
  return {
    barsConsidered: 0,
    fieldHoldTouches: 0,
    susQuartalTouches: 0,
    additiveTouches: 0,
  };
}

export function accumulateSteveReichHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: SteveReichHarmonyAccumulator
): void {
  const c = currentChord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/sus|add9|add2|quartal/.test(t)) acc.susQuartalTouches++;
}

/**
 * Precompute effective harmony — long static fields + additive/sus process — **`sr:*`** receipts.
 */
export function precomputeSteveReichEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];
  const sp = STEVE_REICH_SLICE_PARAMETERS;

  genMeta.reichResolvedProcess = resolveSteveReichProcess(genMeta);
  const rhythm = sp.harmonicRhythmBars;
  genMeta.steveReichHarmonicRhythmBars = rhythm;
  genMeta.steveReichPulseGridDensity = sp.pulseGridDensity;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  const out = [...raw];
  let segmentIdx = 0;

  for (let segStart = 1; segStart <= tb; segStart += rhythm) {
    segmentIdx++;
    const anchorBar = segStart;
    if (anchorBar > tb) break;
    let sym = raw[anchorBar - 1] ?? 'C';
    if (!isProtectedBar(anchorBar, context)) {
      sym = softenChromaticSurface(sym, seed, anchorBar);
      sym = maybeQuartalSusColour(sym, seed, anchorBar);
      sym = maybeAdditiveExpand(sym, seed, anchorBar, segmentIdx);
      receipts.push(`sr:field_anchor@bar${anchorBar}`);
    }
    for (let k = 0; k < rhythm && segStart + k <= tb; k++) {
      const b = segStart + k;
      if (isProtectedBar(b, context)) {
        out[b - 1] = raw[b - 1]!;
        continue;
      }
      out[b - 1] = sym;
      if (k > 0) {
        receipts.push(`sr:phase_hold@bar${b}`);
      }
    }
    if (seededUnit(seed, segStart, 98210) < 0.22) {
      receipts.push(`sr:phase_drift@${genMeta.reichResolvedProcess}@seg${segmentIdx}`);
    }
    if (seededUnit(seed, segStart, 98211) < sp.additiveExpansionRate) {
      receipts.push(`sr:additive_build@seg${segmentIdx}`);
    }
  }

  /* Piece-final only: bias toward Reich drone/phase-hold landings that already pass fBT. */
  biasSteveReichFinalBarIdiomaticOpen(out, seed, tb, receipts, context);

  genMeta.steveReichEffectiveHarmonyBars = out;
  genMeta.steveReichDeviceReceipts = receipts;
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece field/phase/additive devices untouched.
 * Note: m7 / 7sus4 trip via digit `7` even when idiomatic mid-piece.
 */
function chordLooksDominantFamilyForFbtReich(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/**
 * Bias piece-final bar toward Reich pool landings that already pass fBT
 * (Amin9 / Gmin9 drone-field holds; sus2 secondary — never m7 digit trap).
 * Not a forced jazz tonic cadence — phase-hold / drone-field idiom preserved.
 */
function biasSteveReichFinalBarIdiomaticOpen(
  out: string[],
  seed: number,
  totalBars: number,
  receipts: string[],
  context: CompositionContext
): void {
  if (totalBars < 1 || out.length < totalBars) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtReich(sym)) return;

  const hp = parseChordSymbol(sym).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return;
  const root = m[1];
  const slash = sym.includes('/') ? sym.slice(sym.indexOf('/')) : '';
  const u = seededUnit(seed, totalBars, 98212);
  const tl = hp.toLowerCase();

  let next: string;
  // Prefer min9 spelling (proven FBT pass: Amin9 / Gmin9) over m7 digit trap.
  if (/m7|min7|^m(?!aj)/.test(tl) || /\bm7\b/.test(tl)) {
    next = u < 0.78 ? `${root}min9${slash}` : `${root}sus2${slash}`;
  } else if (/7sus|sus4/.test(tl)) {
    next = u < 0.55 ? `${root}sus2${slash}` : `${root}min9${slash}`;
  } else if (/alt|b9|#9/.test(tl)) {
    next = u < 0.5 ? `${root}min9${slash}` : `${root}sus2${slash}`;
  } else {
    // Plain 7 / 9 / 13 leftovers → drone-field min9 / sus2.
    if (u < 0.55) next = `${root}min9${slash}`;
    else if (u < 0.82) next = `${root}sus2${slash}`;
    else next = `${root}add9${slash}`;
  }

  out[idx] = next;
  receipts.push(`sr:final_open_bias@bar${totalBars}`);
}

export function finalizeSteveReichMetadata(metadata: GenerationMetadata, acc: SteveReichHarmonyAccumulator): void {
  const flat = [...(metadata.steveReichDeviceReceipts ?? [])];
  const holdN = flat.filter((r) => r.includes('sr:phase_hold')).length;
  const sp = STEVE_REICH_SLICE_PARAMETERS;
  metadata.steveReichDiagnostics = {
    songwriterId: 'steve_reich',
    reichResolvedProcess: metadata.reichResolvedProcess,
    sliceParameters: {
      tritoneRate: sp.tritoneRate,
      susBias: sp.susBias,
      chromaticMediantBias: sp.chromaticMediantBias,
      staticDominantBias: sp.staticDominantBias,
      chromaticAlterationRate: sp.chromaticAlterationRate,
      harmonicRhythmBars: sp.harmonicRhythmBars,
      defaultProcess: sp.defaultProcess,
    },
    barsConsidered: acc.barsConsidered,
    fieldHoldTouches: holdN,
    susQuartalTouches: acc.susQuartalTouches,
    additiveTouches: flat.filter((r) => r.includes('sr:additive_build')).length,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.steveReichSliceReceipt = [
    `Steve Reich (pitch-field process slice): process=${metadata.reichResolvedProcess ?? sp.defaultProcess}`,
    `holdBars≈${holdN}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.length}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
