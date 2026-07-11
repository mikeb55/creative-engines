/**
 * Herbie Hancock — quartal / sus9 modal pedals, side-slip chromaticism, fusion upper-structure — receipts **`hh:*`**.
 *
 * **Evans distinction:** parent-scale / quartal tops (not tertian formula voicings); engineered for **side-slip** not smooth ii–V resolution.
 * Phases: **`modal`** (Maiden Voyage sus pedal), **`funk`** (Headhunters static groove + upper triads), **`vsop`** (post-bop + quartal overlay).
 */

import type { CompositionContext, GenerationMetadata, HancockPhase } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

/** Research-backed defaults — align `buildReharmLensConfig('herbie_hancock')` + diagnostics. */
export const HANCOCK_SLICE_PARAMETERS = {
  tritoneRate: 0.15,
  susBias: 0.85,
  chromaticMediantBias: 0.6,
  staticDominantBias: 0.6,
  sideSlipRate: 0.4,
  /** `'modal'` = quartal/sus pedal · `'funk'` = groove + upper-structure · `'vsop'` = changes + quartal overlay */
  defaultPhase: 'modal' as HancockPhase,
  voicingNotes:
    'Quartal/sus9 over pedals; Lydian/acoustic maj colour; Lydian dom sus-shapes — not strict ii–V; 5th omitted unless altered',
  innerVoiceComment: '// Hancock chromatic breathing — Clare Fischer influence (inner-voice semitone toward nearest scale tone)',
} as const;

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

function phrasePositionFromBar(bar: number): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const k = (bar - 1) % 4;
  if (k === 0) return 'phraseStart';
  if (k === 3) return 'phraseFinal';
  return 'phraseMiddle';
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

export function isSongwriterHerbieHancock(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'herbie_hancock' } {
  return genMeta?.songwriterStyleId === 'herbie_hancock';
}

/**
 * Primary songwriter or harmonicVoice selects Herbie Hancock harmony authority.
 * Single-gate (no styleProfile) — bill_evans HV pattern.
 */
export function isHerbieHancockHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'herbie_hancock' || voice === 'herbie_hancock';
}

function resolveHancockPhase(genMeta: GenerationMetadata & Record<string, unknown>, _seed: number): HancockPhase {
  const p = genMeta.hancockPhase;
  if (p === 'modal' || p === 'funk' || p === 'vsop') return p;
  return HANCOCK_SLICE_PARAMETERS.defaultPhase;
}

export type { HancockPhase } from '../compositionContext';

export interface HerbieHancockHarmonyAccumulator {
  barsConsidered: number;
  susFieldTouches: number;
  alteredDominantTouches: number;
  colourTonicTouches: number;
}

export function createHerbieHancockHarmonyAccumulator(): HerbieHancockHarmonyAccumulator {
  return {
    barsConsidered: 0,
    susFieldTouches: 0,
    alteredDominantTouches: 0,
    colourTonicTouches: 0,
  };
}

export interface HerbieHancockAntiElaborationGuards {
  quartalThrottleHits: number;
  orthodoxTurnaroundSoftened: number;
}

function scanChordForDiagnostics(chord: string, acc: HerbieHancockHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/sus/.test(t)) acc.susFieldTouches++;
  if (/alt|b9|#9|#11|b13/.test(t) && /7|13|9/.test(t)) acc.alteredDominantTouches++;
  if (/maj7#11|maj9|maj13|sus9|sus13|m\(maj7\)|m11|m13/.test(t)) acc.colourTonicTouches++;
}

export function accumulateHerbieHancockHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: HerbieHancockHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

function isPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|dim|ø|m(?!aj)/.test(tl)) return false;
  if (/sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (/\b9\b|11|13|b9|#9|#11|b13|alt/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7';
}

function tritoneSubChord(symbol: string): string {
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const subPc = (r + 6) % 12;
  const slash = slashTail(symbol);
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/alt|b9|#11/.test(tl)) return `${pitchClassToSharpName(subPc)}7alt${slash}`;
  if (/\b13\b/.test(tl)) return `${pitchClassToSharpName(subPc)}13${slash}`;
  return `${pitchClassToSharpName(subPc)}7${slash}`;
}

/** Bare major / minor tertians → Hancock palette — quartal/sus-first (never naked triads / plain shells). */
function colourBareTertian(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/sus|maj|m7|m9|m11|m13|dim|ø|add|6\/9|alt|mmaj|maj7|#11|13|11\(/.test(tl)) return symbol;
  if (/[79]|maj/.test(rest)) return symbol;

  const susW = HANCOCK_SLICE_PARAMETERS.susBias;

  if (/m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    const u = seededUnit(seed, bar, 883010);
    if (u < 0.42) return `${root}m11${slash}`;
    if (u < 0.68) return `${root}m9${slash}`;
    if (u < 0.88) return `${root}m13${slash}`;
    if (u < 0.96) return `${root}m(maj7)${slash}`;
    return `${root}m11${slash}`;
  }
  if (rest === '' || rest === 'major' || rest === 'maj') {
    const u = seededUnit(seed, bar, 883011);
    if (u < susW * 0.38) return `${root}sus9${slash}`;
    if (u < susW * 0.58) return `${root}sus13${slash}`;
    if (u < susW * 0.72) return `${root}maj7#11${slash}`;
    if (u < susW * 0.86) return `${root}maj9#11${slash}`;
    if (u < susW) return `${root}maj13#11${slash}`;
    return `${root}maj9${slash}`;
  }
  return symbol;
}

/** Plain V7 → Lydian-dominant sus-shapes / sparse colour — rare altered (`staticDominantBias`). */
function colourPlainDominant(symbol: string, seed: number, bar: number): string {
  if (!isPlainDominantSeventh(symbol)) return symbol;
  const slash = slashTail(symbol);
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 883020);
  const sb = HANCOCK_SLICE_PARAMETERS.staticDominantBias;
  if (u < sb * 0.45) return `${root}9sus4${slash}`;
  if (u < sb * 0.78) return `${root}13sus4${slash}`;
  if (u < 0.82) return `${root}7#11${slash}`;
  if (u < 0.9) return `${root}9${slash}`;
  if (u < 0.96) return `${root}13${slash}`;
  return `${root}7b9${slash}`;
}

function isTonicAtPc(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  return harmonyRootPc(symbol) === tonicPc;
}

/** Phrase starts on tonic: long-duration ambiguous rest — sus / Lydian maj / rich minor. */
function applyPhraseStartTonicField(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  phase: HancockPhase
): void {
  if (tonicPc === undefined) return;
  const skipThreshold = phase === 'vsop' ? 0.35 : 0.42;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseStart') continue;
    const sym = out[b - 1]!;
    if (!isTonicAtPc(sym, tonicPc)) continue;
    if (seededUnit(seed, b, 883101) >= skipThreshold) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/sus|maj7#11|mmaj|m\(maj7\)/.test(tl)) continue;
    const u = seededUnit(seed, b, 883102);
    if (/m(?!aj)|min/.test(tl)) {
      out[b - 1] = u < 0.5 ? `${root}m9${slash}` : `${root}m11${slash}`;
    } else {
      out[b - 1] = u < 0.34 ? `${root}sus9${slash}` : u < 0.67 ? `${root}sus13${slash}` : `${root}maj7#11${slash}`;
    }
    receipts.push(`hh:tonic_field@bar${b}`);
  }
}

function looksDominantFunction(symbol: string): boolean {
  if (isPlainDominantSeventh(symbol)) return true;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/maj7|mmaj7|Δ|dim|ø|m7\b|min7/.test(tl)) return false;
  return /\b7alt\b|\b7sus|7sus4|7\(|\b9\b|\b13\b/.test(tl);
}

/** Cadential dominant → tritone colour-region shift before tonic arrival (bar `b+1` carries tonic centre). */
function applyCadentialSubVPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b < tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const dom = out[b - 1]!;
    const next = out[b]!;
    if (harmonyRootPc(next) !== tonicPc) continue;
    if (!looksDominantFunction(dom)) continue;
    if (seededUnit(seed, b + 1, 883201) >= HANCOCK_SLICE_PARAMETERS.tritoneRate) continue;
    out[b - 1] = tritoneSubChord(dom);
    receipts.push(`hh:tri_colour@bar${b}`);
  }
}

/** Avoid back-to-back quartal-heavy spellings (anti–pure Tyner sprint). */
function throttleAdjacentQuartal(out: string[], guards: HerbieHancockAntiElaborationGuards): void {
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1]!;
    const b = out[i]!;
    const ta = parseChordSymbol(a).harmonyPart.toLowerCase();
    const tb = parseChordSymbol(b).harmonyPart.toLowerCase();
    if (/m11|quartal|sus4/.test(ta) && /m11|quartal|sus4/.test(tb)) {
      const root = parseChordSymbol(b).harmonyPart.match(ROOT_AT_START)?.[1];
      if (!root) continue;
      const slash = slashTail(b);
      out[i] = `${root}m9${slash}`;
      guards.quartalThrottleHits++;
    }
  }
}

/** Phrase-final seam: dominant at bar `b-1` → tonic at phrase-final bar `b` — soften plain V7 spelling. */
function softenPhraseFinalCadence(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  guards: HerbieHancockAntiElaborationGuards
): void {
  if (tonicPc === undefined) return;
  for (let b = 2; b <= tb; b++) {
    if (phrasePositionFromBar(b) !== 'phraseFinal') continue;
    if (isProtectedBar(b - 1, context) || isProtectedBar(b, context)) continue;
    const domSym = out[b - 2]!;
    const tonSym = out[b - 1]!;
    if (!isTonicAtPc(tonSym, tonicPc)) continue;
    if (!isPlainDominantSeventh(domSym)) continue;
    if (seededUnit(seed, b, 883301) >= 0.45) continue;
    const root = parseChordSymbol(domSym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(domSym);
    const mode = seededUnit(seed, b, 883302);
    if (mode < 0.55) {
      out[b - 2] = `${root}9sus4${slash}`;
    } else if (mode < 0.82) {
      out[b - 2] = `${root}13sus4${slash}`;
    } else {
      out[b - 2] = `${root}7#11${slash}`;
    }
    guards.orthodoxTurnaroundSoftened++;
    receipts.push(`hh:seam_soft@bar${b - 1}`);
  }
}

/** ±1 semitone or chromatic-mediant block side-slip (one bar in coarse harmony grid). */
function applySideSlipPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  const rate = HANCOCK_SLICE_PARAMETERS.sideSlipRate;
  const cm = HANCOCK_SLICE_PARAMETERS.chromaticMediantBias;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 883501) >= rate) continue;
    const sym = out[b - 1]!;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const slash = slashTail(sym);
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    const u2 = seededUnit(seed, b, 883503);
    let newPc: number;
    if (u2 < cm) {
      const delta = seededUnit(seed, b, 883504) < 0.5 ? 4 : -4;
      newPc = (r + delta + 12) % 12;
    } else {
      const dir = seededUnit(seed, b, 883504) < 0.5 ? -1 : 1;
      newPc = (r + dir + 12) % 12;
    }
    const newRoot = pitchClassToSharpName(newPc);
    let coloured: string;
    if (/m(?!aj)|min/.test(tl)) {
      coloured = `${newRoot}m11${slash}`;
    } else if (/sus|maj7|maj|Δ/.test(tl)) {
      coloured = `${newRoot}sus9${slash}`;
    } else {
      coloured = `${newRoot}9sus4${slash}`;
    }
    out[b - 1] = coloured;
    receipts.push(`hh:side_slip@bar${b}`);
  }
}

/** `funk` phase: static slash bass; upper harmony shifts by major 3rd or semitone. */
function applyFunkUpperStructurePass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  phase: HancockPhase
): void {
  if (phase !== 'funk') return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 883601) >= 0.35) continue;
    const sym = out[b - 1]!;
    const slash = slashTail(sym);
    if (!slash) continue;
    const hp = parseChordSymbol(sym).harmonyPart;
    const m = hp.match(ROOT_AT_START);
    if (!m?.[1]) continue;
    const root = m[1];
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const u = seededUnit(seed, b, 883602);
    const delta = u < 0.55 ? 4 : u < 0.78 ? 1 : -1;
    const newPc = (r + delta + 12) % 12;
    const newRoot = pitchClassToSharpName(newPc);
    const rest = hp.slice(root.length);
    out[b - 1] = `${newRoot}${rest}${slash}`;
    receipts.push(`hh:funk_upper@bar${b}`);
  }
}

/** Hancock chromatic breathing — see Clare Fischer influence (sparse receipt only). */
function stampInnerBreathReceipts(seed: number, receipts: string[], tb: number): void {
  for (let b = 1; b <= tb; b++) {
    if (seededUnit(seed, b, 883701) < 0.14) {
      receipts.push(`hh:inner_breath@bar${b}`);
    }
  }
}

/**
 * Precompute effective one chord per bar after Hancock slice devices (primary `herbie_hancock` only).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeHerbieHancockEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: HerbieHancockAntiElaborationGuards = {
    quartalThrottleHits: 0,
    orthodoxTurnaroundSoftened: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    sym = colourBareTertian(sym, seed, b);
    sym = colourPlainDominant(sym, seed, b);
    raw.push(sym);
  }

  const out = [...raw];

  const phase = resolveHancockPhase(genMeta, seed);
  genMeta.hancockResolvedPhase = phase;

  applyPhraseStartTonicField(out, tonicPc, seed, receipts, tb, context, phase);
  applyCadentialSubVPass(out, tonicPc, seed, receipts, tb, context);
  applySideSlipPass(out, seed, receipts, tb, context);
  applyFunkUpperStructurePass(out, seed, receipts, tb, context, phase);
  stampInnerBreathReceipts(seed, receipts, tb);
  softenPhraseFinalCadence(out, tonicPc, seed, receipts, tb, context, guards);
  throttleAdjacentQuartal(out, guards);

  genMeta.herbieHancockEffectiveHarmonyBars = out;
  genMeta.herbieHancockDeviceReceipts = receipts;
  genMeta.herbieHancockAntiElaborationGuards = guards;
}

export function finalizeHerbieHancockMetadata(
  metadata: GenerationMetadata,
  acc: HerbieHancockHarmonyAccumulator
): void {
  const flat = [...(metadata.herbieHancockDeviceReceipts ?? [])];
  const g = metadata.herbieHancockAntiElaborationGuards ?? {
    quartalThrottleHits: 0,
    orthodoxTurnaroundSoftened: 0,
  };
  const guardTotal = g.quartalThrottleHits + g.orthodoxTurnaroundSoftened;
  const tri = flat.filter((r) => r.includes('hh:tri_colour')).length;
  const phase = metadata.hancockResolvedPhase ?? HANCOCK_SLICE_PARAMETERS.defaultPhase;
  const d = {
    songwriterId: 'herbie_hancock' as const,
    hancockResolvedPhase: phase,
    sliceParameters: {
      tritoneRate: HANCOCK_SLICE_PARAMETERS.tritoneRate,
      susBias: HANCOCK_SLICE_PARAMETERS.susBias,
      chromaticMediantBias: HANCOCK_SLICE_PARAMETERS.chromaticMediantBias,
      staticDominantBias: HANCOCK_SLICE_PARAMETERS.staticDominantBias,
      sideSlipRate: HANCOCK_SLICE_PARAMETERS.sideSlipRate,
      defaultPhase: HANCOCK_SLICE_PARAMETERS.defaultPhase,
    },
    barsConsidered: acc.barsConsidered,
    susFieldTouches: acc.susFieldTouches,
    alteredDominantTouches: acc.alteredDominantTouches,
    colourTonicTouches: acc.colourTonicTouches,
    subVColourTouches: tri,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Herbie Hancock (quartal/modal slice · phase=${phase}): sus≈${acc.susFieldTouches}`,
    `altDom≈${acc.alteredDominantTouches}`,
    `colour≈${acc.colourTonicTouches}`,
    `tri=${tri}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.herbieHancockDiagnostics = { ...d };
  metadata.herbieHancockSliceReceipt = receipt;
}
