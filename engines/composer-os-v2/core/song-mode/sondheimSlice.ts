/**
 * Stephen Sondheim — dramatic musical theatre harmony Song Mode / duo golden-path **harmony** slice.
 * Dissonant tonality: added-note tertians, chromatic surface over tonal centre, pedal cohesion — receipts **`sh:*`**.
 *
 * Default colour bias: Company / Sunday (urban, associative, effect-chord surface — not Golden Age cadence packs).
 * No `core/style-modules/sondheim/` package; symbol-level harmony lives here for primary `stephen_sondheim`.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

/**
 * Exact id `stephen_sondheim` only — soft `sondheim` stays songwriter-normalize;
 * does **not** engage HV. Receipt `sh:*` ≠ Shostakovich VRB `SH_*`.
 */
export function isStephenSondheimHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'stephen_sondheim' || voice === 'stephen_sondheim';
}

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

export function isSongwriterSondheim(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'stephen_sondheim' } {
  return genMeta?.songwriterStyleId === 'stephen_sondheim';
}

export interface SondheimHarmonyAccumulator {
  barsConsidered: number;
  addedNoteTouches: number;
  chromaticSurfaceTouches: number;
  pedalSlashTouches: number;
}

export function createSondheimHarmonyAccumulator(): SondheimHarmonyAccumulator {
  return {
    barsConsidered: 0,
    addedNoteTouches: 0,
    chromaticSurfaceTouches: 0,
    pedalSlashTouches: 0,
  };
}

export interface SondheimAntiElaborationGuards {
  goldenAgeChainBroken: number;
  lushJazzSweetReduced: number;
}

function scanChordForDiagnostics(chord: string, acc: SondheimHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/add2|add4|add6|add9|\(add|maj7\(add|m\(add/.test(t)) acc.addedNoteTouches++;
  if (/b9|#9|#11|b5|#5|maj7#11|ø|m7b5|dim/.test(t)) acc.chromaticSurfaceTouches++;
  if (c.includes('/')) acc.pedalSlashTouches++;
}

export function accumulateSondheimHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: SondheimHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

function isPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (/\b9\b|11|13|b9|#9|#11|b13|alt/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7';
}

/** Bare major / minor tertians → added-note theatre tertians (never naked triads). */
function neverBareTertian(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/dim|ø|sus|add|maj7|mmaj|m7|m9|m11|6\/9|69|\(maj/.test(tl)) return symbol;
  if (/[459]|11|13/.test(rest)) return symbol;

  if (/m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    const u = seededUnit(seed, bar, 884010);
    if (u < 0.28) return `${root}m(add9)${slash}`;
    if (u < 0.52) return `${root}m7${slash}`;
    if (u < 0.76) return `${root}m(maj7)${slash}`;
    return `${root}m6${slash}`;
  }
  if (rest === '' || rest === 'major' || rest === 'maj') {
    const u = seededUnit(seed, bar, 884011);
    if (u < 0.26) return `${root}maj7(add2)${slash}`;
    if (u < 0.48) return `${root}add9${slash}`;
    if (u < 0.72) return `${root}maj7${slash}`;
    return `${root}add6${slash}`;
  }
  return symbol;
}

/** Anti–lush jazz sweetness: maj9 / maj13 clusters → biting maj7(add2) / add9(#11). */
function biteLushJazzSweetness(
  symbol: string,
  seed: number,
  bar: number,
  guards: SondheimAntiElaborationGuards
): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  const slash = slashTail(symbol);
  if (!/\bmaj9\b|\bmaj13\b/.test(tl)) return symbol;
  if (seededUnit(seed, bar, 884020) >= 0.42) return symbol;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  guards.lushJazzSweetReduced++;
  if (seededUnit(seed, bar, 884021) < 0.55) return `${root}maj7(add2)${slash}`;
  return `${root}add9(#11)${slash}`;
}

/** Dominant as dramatic trigger — colour with b9 / #11 / sus(b9); avoid routine V7 spelling. */
function dramaticDominantColour(symbol: string, seed: number, bar: number): string {
  if (!isPlainDominantSeventh(symbol)) return symbol;
  const slash = slashTail(symbol);
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 884030);
  if (u < 0.22) return `${root}7sus4(b9)${slash}`;
  if (u < 0.44) return `${root}7(b9)${slash}`;
  if (u < 0.66) return `${root}7#11${slash}`;
  if (u < 0.85) return `${root}13(b9)${slash}`;
  return `${root}7(b9)${slash}`;
}

function isTonicAtPc(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  return harmonyRootPc(symbol) === tonicPc;
}

function relativeToTonic(rootPc: number | undefined, tonicPc: number): number {
  if (rootPc === undefined) return -999;
  return (((rootPc - tonicPc) % 12) + 12) % 12;
}

function rootsMatchGoldenAgeMajorWindow(
  tonicPc: number,
  r0: number | undefined,
  r1: number | undefined,
  r2: number | undefined,
  r3: number | undefined
): boolean {
  return (
    relativeToTonic(r0, tonicPc) === 0 &&
    relativeToTonic(r1, tonicPc) === 9 &&
    relativeToTonic(r2, tonicPc) === 2 &&
    relativeToTonic(r3, tonicPc) === 7
  );
}

/** Break orthodox I–vi–ii–V surface when four consecutive roots match that cycle (anti–Golden Age chain). */
function applyGoldenAgeChainGuard(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  guards: SondheimAntiElaborationGuards
): void {
  if (tonicPc === undefined) return;
  for (let start = 1; start <= tb - 3; start++) {
    if (isProtectedBar(start, context)) continue;
    const r0 = harmonyRootPc(out[start - 1]!);
    const r1 = harmonyRootPc(out[start]!);
    const r2 = harmonyRootPc(out[start + 1]!);
    const r3 = harmonyRootPc(out[start + 2]!);
    if (!rootsMatchGoldenAgeMajorWindow(tonicPc, r0, r1, r2, r3)) continue;
    if (seededUnit(seed, start, 884101) >= 0.52) continue;
    const pickV = seededUnit(seed, start, 884102) < 0.52;
    /** I @ start, vi @ start+1, ii @ start+2, V @ start+3 */
    const targetIdx = pickV ? start + 3 : start + 2;
    const sym = out[targetIdx - 1]!;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    const alter = seededUnit(seed, start, 884103);
    if (pickV) {
      out[targetIdx - 1] = alter < 0.45 ? `${root}7sus4(b9)${slash}` : `${root}13(b9)${slash}`;
    } else {
      out[targetIdx - 1] = alter < 0.5 ? `${root}m7b5${slash}` : `${root}m9${slash}`;
    }
    guards.goldenAgeChainBroken++;
    receipts.push(`sh:golden_age_break@bar${targetIdx}`);
  }
}

/** Phrase-final tonic: residue of unease — avoid clean triadic closure. */
function applyPhraseFinalTonicResidue(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (phrasePositionFromBar(b) !== 'phraseFinal') continue;
    if (isProtectedBar(b, context)) continue;
    const sym = out[b - 1]!;
    if (!isTonicAtPc(sym, tonicPc)) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/add|maj7|mmaj|m\(maj|sus|ø|dim/.test(tl)) continue;
    if (seededUnit(seed, b, 884201) >= 0.48) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    if (/m(?!aj)|min/.test(tl)) {
      out[b - 1] = seededUnit(seed, b, 884202) < 0.55 ? `${root}m(add9)${slash}` : `${root}m(maj7)${slash}`;
    } else {
      out[b - 1] = seededUnit(seed, b, 884203) < 0.5 ? `${root}maj7(add2)${slash}` : `${root}add9${slash}`;
    }
    receipts.push(`sh:phrase_residue@bar${b}`);
  }
}

/** Stratified pedal: tonic bass under non-tonic harmony (local bitonality in service of drama). */
function applyPedalTonicBass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const bassName = pitchClassToSharpName(tonicPc);
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 884301) >= 0.1) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    const r = harmonyRootPc(sym);
    if (r === undefined || r === tonicPc) continue;
    out[b - 1] = `${sym}/${bassName}`;
    receipts.push(`sh:pedal_bass@bar${b}`);
  }
}

/**
 * GCE tonic-family check aligned with finalBarTension gate (`isTonicFamilyChord`).
 * Piece-final force / safety net only — mid-piece Sondheim devices untouched.
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

/** Piece-final tonic: maj7(add2) (Sondheim vocabulary; passes finalBarTension tonic-family). */
function spellSondheimTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj7(add2)`,
    receipt: `sh:final_tonic_cadence@bar${bar}`,
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
  const { symbol, receipt } = spellSondheimTonicCadence(totalBars, tonicPc);
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
  const { symbol, receipt } = spellSondheimTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

/**
 * Precompute effective one chord per bar after Sondheim slice devices (primary `stephen_sondheim` only).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeSondheimEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: SondheimAntiElaborationGuards = {
    goldenAgeChainBroken: 0,
    lushJazzSweetReduced: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    sym = neverBareTertian(sym, seed, b);
    sym = biteLushJazzSweetness(sym, seed, b, guards);
    sym = dramaticDominantColour(sym, seed, b);
    raw.push(sym);
  }

  const out = [...raw];

  applyGoldenAgeChainGuard(out, tonicPc, seed, receipts, tb, context, guards);
  applyPhraseFinalTonicResidue(out, tonicPc, seed, receipts, tb, context);
  applyPedalTonicBass(out, tonicPc, seed, receipts, tb, context);

  /* Piece-final only: force tonic-family + safety net (Wayne fBT pattern; mid-piece unchanged). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.sondheimEffectiveHarmonyBars = out;
  genMeta.sondheimDeviceReceipts = receipts;
  genMeta.sondheimAntiElaborationGuards = guards;
}

export function finalizeSondheimMetadata(metadata: GenerationMetadata, acc: SondheimHarmonyAccumulator): void {
  const flat = [...(metadata.sondheimDeviceReceipts ?? [])];
  const g = metadata.sondheimAntiElaborationGuards ?? {
    goldenAgeChainBroken: 0,
    lushJazzSweetReduced: 0,
  };
  const guardTotal = g.goldenAgeChainBroken + g.lushJazzSweetReduced;
  const ga = flat.filter((r) => r.includes('sh:golden_age_break')).length;
  const d = {
    songwriterId: 'stephen_sondheim' as const,
    barsConsidered: acc.barsConsidered,
    addedNoteTouches: acc.addedNoteTouches,
    chromaticSurfaceTouches: acc.chromaticSurfaceTouches,
    pedalSlashTouches: acc.pedalSlashTouches,
    goldenAgeBreakTouches: ga,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Stephen Sondheim (dramatic tonality slice): add≈${acc.addedNoteTouches}`,
    `chrom≈${acc.chromaticSurfaceTouches}`,
    `pedal≈${acc.pedalSlashTouches}`,
    `ga=${ga}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.sondheimDiagnostics = { ...d };
  metadata.sondheimSliceReceipt = receipt;
}
