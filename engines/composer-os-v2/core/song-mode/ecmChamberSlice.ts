/**
 * ECM Chamber — Nordic / chamber Song Mode / duo golden-path **harmony** slice.
 * Sparse modal spellings: wide intervals at symbol level (maj7, add9, sus2 as resting colours; quartal / sus4;
 * pedal bass; phrase-final **hang** — no tritone sub, no bebop passing idiom). Receipts `ec:*`.
 *
 * No `core/style-modules/ecm-chamber/` package; this file owns symbol-level harmony for primary `ecm_chamber`.
 * (Preset `ecm_chamber` orchestration + Metheny/Schneider modes stay in `runGoldenPath` / duo score — unchanged.)
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { getChordForBar } from '../harmony/harmonyResolution';
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

export function isSongwriterEcmChamber(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'ecm_chamber' } {
  return genMeta?.songwriterStyleId === 'ecm_chamber';
}

export interface EcmChamberHarmonyAccumulator {
  barsConsidered: number;
  modalOpenTouches: number;
  quartalSusTouches: number;
  pedalSlashTouches: number;
}

export function createEcmChamberHarmonyAccumulator(): EcmChamberHarmonyAccumulator {
  return {
    barsConsidered: 0,
    modalOpenTouches: 0,
    quartalSusTouches: 0,
    pedalSlashTouches: 0,
  };
}

export interface EcmChamberAntiElaborationGuards {
  denseClusterReduced: number;
  functionalDominantMuted: number;
}

function scanChordForDiagnostics(chord: string, acc: EcmChamberHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/\bmaj7\b|maj9|add9|sus2|sus4|m9|m\(add9\)/.test(t)) acc.modalOpenTouches++;
  if (/sus4|sus2|quartal|11/.test(t)) acc.quartalSusTouches++;
  if (c.includes('/')) acc.pedalSlashTouches++;
}

export function accumulateEcmChamberHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: EcmChamberHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

/** Strip dense altered / bebop-adjacent spellings toward open modal colours (no tritone-sub moves). */
function sanitizeDenseJazzSymbol(symbol: string, guards: EcmChamberAntiElaborationGuards): string {
  let s = symbol.trim();
  if (!s) return s;
  const hp = parseChordSymbol(s).harmonyPart;
  const tl = hp.toLowerCase();
  const slash = slashTail(s);
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return s;
  const root = m[1];

  if (/\balt\b|7\(alt|7#9#5|7\(.*b9.*#11|7\(.*#9/.test(tl)) {
    guards.denseClusterReduced++;
    return `${root}7sus4${slash}`;
  }
  if (/\b13\(.*#11|maj9\(.*#11|\(13.*11\)/.test(tl)) {
    guards.denseClusterReduced++;
    if (/m(?!aj)/.test(tl)) return `${root}m9${slash}`;
    return `${root}maj9${slash}`;
  }
  return s;
}

function openBareToModalRest(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');

  if (/sus|maj|m7|m9|add|dim|ø|6\/9|11|13|7sus/.test(tl)) return symbol;
  if (/[79]/.test(rest)) return symbol;

  if (/m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    const useAdd9 = seededUnit(seed, bar, 991101) < 0.55;
    return useAdd9 ? `${root}m(add9)${slash}` : `${root}m9${slash}`;
  }
  if (rest === '' || /^major$/i.test(rest) || rest === 'maj') {
    const pick = seededUnit(seed, bar, 991102);
    if (pick < 0.34) return `${root}sus2${slash}`;
    if (pick < 0.67) return `${root}add9${slash}`;
    return `${root}maj7${slash}`;
  }
  return symbol;
}

/** Plain dominant seventh (not sus / maj / half-dim) — target for unresolved sus colour. */
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

function dominantToSusColour(symbol: string, guards: EcmChamberAntiElaborationGuards): string {
  guards.functionalDominantMuted++;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  return `${root}7sus4${slash}`;
}

function isTonicMajorOrMinor(symbol: string, tonicPc: number | undefined): 'major' | 'minor' | null {
  if (tonicPc === undefined) return null;
  if (harmonyRootPc(symbol) !== tonicPc) return null;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/dim|ø|sus/.test(tl)) return null;
  if (/m(?!aj)|min/.test(tl)) return 'minor';
  if (/\b7\b/.test(tl) && !/maj7|mmaj7|Δ|7sus/.test(tl)) return null;
  return 'major';
}

/** Convert phrase-final dominant without mutating anti-guard counters (dominant pass already ran). */
function phraseFinalDominantToSus(symbol: string): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  return `${root}7sus4${slash}`;
}

function applyPhraseFinalHangPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseFinal') continue;
    let sym = out[b - 1]!;
    const ton = isTonicMajorOrMinor(sym, tonicPc);
    if (ton === 'major') {
      const hp = parseChordSymbol(sym).harmonyPart;
      const root = hp.match(ROOT_AT_START)?.[1];
      if (!root) continue;
      const slash = slashTail(sym);
      const tl = hp.toLowerCase();
      if (/maj7|maj9|add9|sus2|6\/9/.test(tl)) continue;
      const pick = seededUnit(seed, b, 991201);
      if (pick < 0.38) out[b - 1] = `${root}maj7${slash}`;
      else if (pick < 0.72) out[b - 1] = `${root}add9${slash}`;
      else out[b - 1] = `${root}sus2${slash}`;
      receipts.push(`ec:hang@bar${b}`);
    } else if (ton === 'minor') {
      const hp = parseChordSymbol(sym).harmonyPart;
      const root = hp.match(ROOT_AT_START)?.[1];
      if (!root) continue;
      const slash = slashTail(sym);
      const tl = hp.toLowerCase();
      if (/m9|m\(add9\)|m11|m7/.test(tl)) continue;
      out[b - 1] = seededUnit(seed, b, 991202) < 0.5 ? `${root}m9${slash}` : `${root}m(add9)${slash}`;
      receipts.push(`ec:hang@bar${b}`);
    } else if (isPlainDominantSeventh(sym)) {
      out[b - 1] = phraseFinalDominantToSus(sym);
      receipts.push(`ec:hang_dom@bar${b}`);
    }
  }
}

function applyDominantSusPass(
  out: string[],
  guards: EcmChamberAntiElaborationGuards,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const sym = out[b - 1]!;
    if (!isPlainDominantSeventh(sym)) continue;
    if (/sus/.test(parseChordSymbol(sym).harmonyPart.toLowerCase())) continue;
    out[b - 1] = dominantToSusColour(sym, guards);
    receipts.push(`ec:dom_sus@bar${b}`);
  }
}

/** Quartal / quintal hint: occasional sus4 on phrase-middle major or neutral chords. */
function applyQuartalSusPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 991301) >= 0.38) continue;
    const sym = out[b - 1]!;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/sus|dim|ø|m(?!aj)/.test(tl)) continue;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const slash = slashTail(sym);
    const useSus4 = seededUnit(seed, b, 991302) < 0.65;
    out[b - 1] = useSus4 ? `${pitchClassToSharpName(r)}sus4${slash}` : `${pitchClassToSharpName(r)}sus2${slash}`;
    receipts.push(`ec:quartal@bar${b}`);
  }
}

/** Pedal bass in the bass register — carry prior slash bass under shifting harmony when absent. */
function applyPedalBassPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 991401) >= 0.42) continue;
    const prev = out[b - 2]!;
    const cur = out[b - 1]!;
    if (cur.includes('/')) continue;
    const idx = prev.indexOf('/');
    if (idx < 0) continue;
    const pedal = prev.slice(idx);
    const hp = parseChordSymbol(cur).harmonyPart;
    const rootName = hp.match(ROOT_AT_START)?.[1];
    if (!rootName) continue;
    const tail = hp.slice(rootName.length);
    out[b - 1] = `${rootName}${tail}${pedal}`;
    receipts.push(`ec:pedal@bar${b}`);
  }
}

/**
 * Precompute effective one chord per bar after ECM Chamber slice devices (primary `ecm_chamber` only).
 */
export function precomputeEcmChamberEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: EcmChamberAntiElaborationGuards = {
    denseClusterReduced: 0,
    functionalDominantMuted: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = sanitizeDenseJazzSymbol(getChordForBar(b, context), guards);
    sym = openBareToModalRest(sym, seed, b);
    sym = sanitizeDenseJazzSymbol(sym, guards);
    raw.push(sym);
  }

  const out = [...raw];

  applyDominantSusPass(out, guards, receipts, tb, context);
  applyPhraseFinalHangPass(out, tonicPc, seed, receipts, tb, context);
  applyQuartalSusPass(out, seed, receipts, tb, context);
  applyPedalBassPass(out, seed, receipts, tb, context);

  genMeta.ecmChamberEffectiveHarmonyBars = out;
  genMeta.ecmChamberDeviceReceipts = receipts;
  genMeta.ecmChamberAntiElaborationGuards = guards;
}

export function finalizeEcmChamberMetadata(metadata: GenerationMetadata, acc: EcmChamberHarmonyAccumulator): void {
  const flat = [...(metadata.ecmChamberDeviceReceipts ?? [])];
  const g = metadata.ecmChamberAntiElaborationGuards ?? {
    denseClusterReduced: 0,
    functionalDominantMuted: 0,
  };
  const guardTotal = g.denseClusterReduced + g.functionalDominantMuted;
  const hang = flat.filter((r) => r.includes('ec:hang')).length;
  const quart = flat.filter((r) => r.includes('ec:quartal')).length;
  const pedal = flat.filter((r) => r.includes('ec:pedal')).length;
  const d = {
    songwriterId: 'ecm_chamber' as const,
    barsConsidered: acc.barsConsidered,
    modalOpenTouches: acc.modalOpenTouches,
    quartalSusTouches: Math.max(acc.quartalSusTouches, quart),
    pedalSlashTouches: Math.max(acc.pedalSlashTouches, pedal),
    phraseHangTouches: hang,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `ECM Chamber (modal sparse harmony slice): modalOpen≈${acc.modalOpenTouches}`,
    `quartal≈${d.quartalSusTouches}`,
    `pedal≈${d.pedalSlashTouches}`,
    `hangs≈${d.phraseHangTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.ecmChamberDiagnostics = { ...d };
  metadata.ecmChamberSliceReceipt = receipt;
}
