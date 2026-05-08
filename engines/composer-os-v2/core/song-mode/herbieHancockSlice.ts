/**
 * Herbie Hancock — Blue Note post-bop / fusion harmony Song Mode / duo golden-path **harmony** slice.
 * Suspended fields, altered dominants, tritone colour-regions, ambiguous tonic rests — receipts **`hh:*`**.
 *
 * Modelled as Maiden Voyage / Dolphin Dance zone: engineered ambiguity + structural control (not random side-slipping).
 * No `core/style-modules/herbie-hancock/` package; symbol-level harmony lives here for primary `herbie_hancock`.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

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

/** Bare major / minor tertians → Hancock palette (never naked triads / plain shells). */
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

  if (/m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    const u = seededUnit(seed, bar, 883010);
    if (u < 0.28) return `${root}m(maj7)${slash}`;
    if (u < 0.55) return `${root}m11${slash}`;
    if (u < 0.82) return `${root}m9${slash}`;
    return `${root}m13${slash}`;
  }
  if (rest === '' || rest === 'major' || rest === 'maj') {
    const u = seededUnit(seed, bar, 883011);
    if (u < 0.22) return `${root}sus9${slash}`;
    if (u < 0.44) return `${root}sus13${slash}`;
    if (u < 0.66) return `${root}maj7#11${slash}`;
    if (u < 0.88) return `${root}maj9${slash}`;
    return `${root}maj13#11${slash}`;
  }
  return symbol;
}

/** Plain V7 → altered / sus-dominant colour (underweight literal resolution spelling). */
function colourPlainDominant(symbol: string, seed: number, bar: number): string {
  if (!isPlainDominantSeventh(symbol)) return symbol;
  const slash = slashTail(symbol);
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 883020);
  if (u < 0.18) return `${root}7alt${slash}`;
  if (u < 0.32) return `${root}7b9#11${slash}`;
  if (u < 0.46) return `${root}7#11${slash}`;
  if (u < 0.62) return `${root}7b9${slash}`;
  if (u < 0.78) return `${root}7#9${slash}`;
  if (u < 0.9) return `${root}9${slash}`;
  return `${root}13${slash}`;
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
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseStart') continue;
    const sym = out[b - 1]!;
    if (!isTonicAtPc(sym, tonicPc)) continue;
    if (seededUnit(seed, b, 883101) >= 0.42) continue;
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
    if (seededUnit(seed, b + 1, 883201) >= 0.36) continue;
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
    if (mode < 0.4) {
      out[b - 2] = `${root}7sus4${slash}`;
    } else if (mode < 0.75) {
      out[b - 2] = `${root}7alt${slash}`;
    } else {
      out[b - 2] = `${root}7#11${slash}`;
    }
    guards.orthodoxTurnaroundSoftened++;
    receipts.push(`hh:seam_soft@bar${b - 1}`);
  }
}

/**
 * Precompute effective one chord per bar after Hancock slice devices (primary `herbie_hancock` only).
 */
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

  applyPhraseStartTonicField(out, tonicPc, seed, receipts, tb, context);
  applyCadentialSubVPass(out, tonicPc, seed, receipts, tb, context);
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
  const d = {
    songwriterId: 'herbie_hancock' as const,
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
    `Herbie Hancock (Blue Note harmony slice): sus≈${acc.susFieldTouches}`,
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
