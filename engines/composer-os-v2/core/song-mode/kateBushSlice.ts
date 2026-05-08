/**
 * Kate Bush — tonal-modal / drone-aware texture harmony Song Mode / duo golden-path **harmony** slice.
 * Add-note prolongations, sus colours, slash pedals, modal mixture — receipts **`kb:*`**.
 *
 * Modelled as Hounds of Love / The Dreaming zone: modal centres, chromatic mediants, minimal cadential hammer — not jazz reharm streams.
 * No `core/style-modules/kate-bush/` package; symbol-level harmony lives here for primary `kate_bush`.
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

export function isSongwriterKateBush(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'kate_bush' } {
  return genMeta?.songwriterStyleId === 'kate_bush';
}

export interface KateBushHarmonyAccumulator {
  barsConsidered: number;
  addOrSusTouches: number;
  modalMixtureTouches: number;
  pedalSlashTouches: number;
}

export function createKateBushHarmonyAccumulator(): KateBushHarmonyAccumulator {
  return {
    barsConsidered: 0,
    addOrSusTouches: 0,
    modalMixtureTouches: 0,
    pedalSlashTouches: 0,
  };
}

export interface KateBushAntiElaborationGuards {
  jazzStackReduced: number;
}

function scanChordForDiagnostics(chord: string, acc: KateBushHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/add2|add4|add6|add9|sus2|sus4|6\b|maj6|m6\b/.test(t)) acc.addOrSusTouches++;
  if (/bvii|bvi|biii|bii|ø/.test(t) || /♭/.test(c)) acc.modalMixtureTouches++;
  if (c.includes('/')) acc.pedalSlashTouches++;
}

export function accumulateKateBushHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: KateBushHarmonyAccumulator
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

/** Never naked triads — add2 / add9 / 6 / sus as prolonged Kate Bush palette. */
function modalColourBareTertian(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/sus|add|maj7|mmaj|dim|ø|m7|m9|m11|6\/9/.test(tl)) return symbol;
  if (/\b9\b|\b11\b|\b13\b|maj9|maj13|m13/.test(tl)) return symbol;

  if (/m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    const u = seededUnit(seed, bar, 885010);
    if (u < 0.3) return `${root}m(add9)${slash}`;
    if (u < 0.55) return `${root}madd9${slash}`;
    if (u < 0.78) return `${root}m6${slash}`;
    return `${root}m7${slash}`;
  }
  if (rest === '' || rest === 'major' || rest === 'maj') {
    const u = seededUnit(seed, bar, 885011);
    if (u < 0.26) return `${root}add9${slash}`;
    if (u < 0.48) return `${root}add2${slash}`;
    if (u < 0.7) return `${root}6${slash}`;
    if (u < 0.86) return `${root}sus2${slash}`;
    return `${root}sus4${slash}`;
  }
  return symbol;
}

/** Anti–dense jazz stream: trim 9/11/13 stacks toward add-note / sus spellings. */
function stripDenseJazzStacks(
  symbol: string,
  seed: number,
  bar: number,
  guards: KateBushAntiElaborationGuards
): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  const slash = slashTail(symbol);
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;

  if (/\bmaj13\b|\bmaj11\b|\bm11\b|\b13\b/.test(tl) && !/sus/.test(tl)) {
    guards.jazzStackReduced++;
    const u = seededUnit(seed, bar, 885020);
    if (u < 0.45) return `${root}add9${slash}`;
    if (u < 0.78) return `${root}sus4${slash}`;
    return `${root}6${slash}`;
  }
  if (/\bmaj9\b/.test(tl)) {
    guards.jazzStackReduced++;
    return seededUnit(seed, bar, 885021) < 0.55 ? `${root}add9${slash}` : `${root}maj7(add2)${slash}`;
  }
  return symbol;
}

/** Functional V7 → sus / thirdless dominant colour — modal grammar, not jazz turnaround stream. */
function colourPlainDominantKate(symbol: string, seed: number, bar: number): string {
  if (!isPlainDominantSeventh(symbol)) return symbol;
  const slash = slashTail(symbol);
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 885030);
  if (u < 0.38) return `${root}7sus4${slash}`;
  if (u < 0.72) return `${root}sus4${slash}`;
  return `${root}7sus2${slash}`;
}

function isTonicAtPc(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  return harmonyRootPc(symbol) === tonicPc;
}

/** Phrase-final tonic: prolonged colour field — never bare closure. */
function phraseFinalTonicTexture(
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
    if (/add|sus|6\b|maj7/.test(tl)) continue;
    if (seededUnit(seed, b, 885101) >= 0.42) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    out[b - 1] =
      seededUnit(seed, b, 885102) < 0.55 ? `${root}add9${slash}` : `${root}sus2${slash}`;
    receipts.push(`kb:tonic_field@bar${b}`);
  }
}

/** Drone/pedal: tonic bass under shifting harmony — stratified modal colour. */
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
    if (seededUnit(seed, b, 885301) >= 0.09) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    const r = harmonyRootPc(sym);
    if (r === undefined || r === tonicPc) continue;
    out[b - 1] = `${sym}/${bassName}`;
    receipts.push(`kb:pedal@bar${b}`);
  }
}

/**
 * Precompute effective one chord per bar after Kate Bush slice devices (primary `kate_bush` only).
 */
/** @deprecated — use resolveBarSymbol */
export function precomputeKateBushEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: KateBushAntiElaborationGuards = {
    jazzStackReduced: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    sym = modalColourBareTertian(sym, seed, b);
    sym = stripDenseJazzStacks(sym, seed, b, guards);
    sym = colourPlainDominantKate(sym, seed, b);
    raw.push(sym);
  }

  const out = [...raw];

  phraseFinalTonicTexture(out, tonicPc, seed, receipts, tb, context);
  applyPedalTonicBass(out, tonicPc, seed, receipts, tb, context);

  genMeta.kateBushEffectiveHarmonyBars = out;
  genMeta.kateBushDeviceReceipts = receipts;
  genMeta.kateBushAntiElaborationGuards = guards;
}

export function finalizeKateBushMetadata(metadata: GenerationMetadata, acc: KateBushHarmonyAccumulator): void {
  const flat = [...(metadata.kateBushDeviceReceipts ?? [])];
  const g = metadata.kateBushAntiElaborationGuards ?? {
    jazzStackReduced: 0,
  };
  const guardTotal = g.jazzStackReduced;
  const pedal = flat.filter((r) => r.includes('kb:pedal')).length;
  const d = {
    songwriterId: 'kate_bush' as const,
    barsConsidered: acc.barsConsidered,
    addOrSusTouches: acc.addOrSusTouches,
    modalMixtureTouches: acc.modalMixtureTouches,
    pedalSlashTouches: acc.pedalSlashTouches,
    pedalReceiptTouches: pedal,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Kate Bush (modal texture slice): addSus≈${acc.addOrSusTouches}`,
    `mix≈${acc.modalMixtureTouches}`,
    `pedal≈${acc.pedalSlashTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.kateBushDiagnostics = { ...d };
  metadata.kateBushSliceReceipt = receipt;
}
