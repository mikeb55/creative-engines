/**
 * Bill Evans — impressionist / modal jazz Song Mode / duo golden-path **harmony** slice.
 * Layered on locked harmony: extension-rich spellings (rootless-style voicing **symbols**),
 * sus/quartal colour on dominants, delayed tonic colours, gentle ii–V preparation — receipts `be:*`.
 *
 * Left-hand voicing motion / quartal stacks at note level are **post-score** concerns unless a
 * `style-modules/bill-evans/` module lands; this slice reshapes **chord symbols** only.
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

export function isSongwriterBillEvans(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'bill_evans' } {
  return genMeta?.songwriterStyleId === 'bill_evans';
}

export interface BillEvansHarmonyAccumulator {
  barsConsidered: number;
  extensionTouches: number;
  susModalTouches: number;
  quartalColourTouches: number;
  delayedResolutionTouches: number;
}

export function createBillEvansHarmonyAccumulator(): BillEvansHarmonyAccumulator {
  return {
    barsConsidered: 0,
    extensionTouches: 0,
    susModalTouches: 0,
    quartalColourTouches: 0,
    delayedResolutionTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BillEvansHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/\bmaj9\b|\bmaj7\b|maj\(9\)|add9|\b6\/9\b|m9\b|\b13\b/.test(t)) acc.extensionTouches++;
  if (/sus/.test(t)) acc.susModalTouches++;
  if (/11|quartal/.test(t)) acc.quartalColourTouches++;
  if (/maj9|6\/9|maj7/.test(t) && /delay|soft/i.test(t)) acc.delayedResolutionTouches++;
}

export function accumulateBillEvansHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BillEvansHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface BillEvansAntiElaborationGuards {
  bareTriadRaised: number;
  strongCadenceSoftened: number;
}

/** Plain triad / bare tertian spellings → extensions (avoid hard root-position triads in symbols). */
function sanitizeBareTriads(symbol: string, guards: BillEvansAntiElaborationGuards): string {
  let s = symbol.trim();
  if (!s) return s;
  const hp = parseChordSymbol(s).harmonyPart;
  const slash = s.includes('/') ? s.slice(s.indexOf('/')) : '';
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return s;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  // Already extended / coloured
  if (/[79]|maj|m7|m9|sus|dim|ø|add|6\/9|11|13/.test(rest)) return s;
  if (/m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    guards.bareTriadRaised++;
    return `${root}m9${slash}`;
  }
  if (rest === '' || rest === 'major') {
    guards.bareTriadRaised++;
    return `${root}maj9${slash}`;
  }
  return s;
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
}

function looksMajorTonicColour(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const r = harmonyRootPc(symbol);
  if (r !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  return true;
}

function applyRichHarmonyExtensionPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    let sym = out[b - 1]!;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (looksPlainDominantSeventh(sym) && !/b9|#11|alt|13/.test(tl)) {
      if (seededUnit(seed, b, 884101) < 0.4) {
        const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
        if (root) {
          const slash = sym.includes('/') ? sym.slice(sym.indexOf('/')) : '';
          out[b - 1] = `${root}13${slash}`;
          receipts.push(`be:dom_extension@bar${b}`);
        }
      }
    }
    sym = out[b - 1]!;
    const tl2 = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/\bmaj7\b|maj9|\bΔ\b/.test(tl2) && !/maj9|maj7\(9\)/.test(tl2)) {
      if (seededUnit(seed, b, 884102) < 0.32) {
        const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
        if (root) {
          const slash = sym.includes('/') ? sym.slice(sym.indexOf('/')) : '';
          out[b - 1] = `${root}maj9${slash}`;
          receipts.push(`be:maj_colour@bar${b}`);
        }
      }
    }
  }
}

/** Quartal / quintal hint on modal minor sonorities — `m11` / sus-family on eligible bars. */
function applyQuartalModalPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseMiddle') continue;
    const sym = out[b - 1]!;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (!/\bm7\b|min7|m\(7\)/.test(tl)) continue;
    if (seededUnit(seed, b, 884201) >= 0.28) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = sym.includes('/') ? sym.slice(sym.indexOf('/')) : '';
    out[b - 1] = `${root}m11${slash}`;
    receipts.push(`be:quartal_m11@bar${b}`);
  }
}

/** Sus / floating dominant colour — modal ambiguity vs tight V7 resolution. */
function applySusDominantPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    const sym = out[b - 1]!;
    if (!looksPlainDominantSeventh(sym)) continue;
    if (phrasePositionFromBar(b) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 884301) >= 0.22) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = sym.includes('/') ? sym.slice(sym.indexOf('/')) : '';
    out[b - 1] = `${root}7sus4${slash}`;
    receipts.push(`be:sus_dom@bar${b}`);
  }
}

/** Delay strong tonic resolution — phrase-final tonic majors → maj9 / 6/9 (impressionist landing). */
function applyDelayedTonicColourPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  guards: BillEvansAntiElaborationGuards
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseFinal') continue;
    const sym = out[b - 1]!;
    if (!looksMajorTonicColour(sym, tonicPc)) continue;
    if (seededUnit(seed, b, 884401) >= 0.35) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = sym.includes('/') ? sym.slice(sym.indexOf('/')) : '';
    const mode = seededUnit(seed, b, 884402) < 0.5 ? 'maj9' : '6/9';
    out[b - 1] = mode === 'maj9' ? `${root}maj9${slash}` : `${root}6/9${slash}`;
    guards.strongCadenceSoftened++;
    receipts.push(`be:delayed_tonic@bar${b}`);
  }
}

/** Gentle ii–V prep before tonic arrival (bebop-adjacent but softer voice-leading budget). */
function applyGentleTwoFivePrepPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const iiPc = (tonicPc + 2) % 12;
  for (let b = 3; b <= tb; b++) {
    const prevTonicBar = b - 2;
    if (isProtectedBar(prevTonicBar, context)) continue;
    const a = out[b - 3]!;
    const v = out[b - 2]!;
    const iCh = out[b - 1]!;
    if (harmonyRootPc(iCh) !== tonicPc) continue;
    if (!looksPlainDominantSeventh(v)) continue;
    if (harmonyRootPc(a) !== tonicPc) continue;
    const aHp = parseChordSymbol(a).harmonyPart.toLowerCase();
    if (/\bm7\b|min7|m9|m11/.test(aHp) && harmonyRootPc(a) === iiPc) continue;
    if (seededUnit(seed, b, 884501) >= 0.38) continue;
    out[b - 3] = `${pitchClassToSharpName(iiPc)}m9`;
    receipts.push(`be:gentle_ii_V@bar${b - 2}`);
  }
}

/**
 * Precompute effective one chord per bar after Bill Evans slice devices (primary `bill_evans` only).
 */
export function precomputeBillEvansEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: BillEvansAntiElaborationGuards = {
    bareTriadRaised: 0,
    strongCadenceSoftened: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = sanitizeBareTriads(getChordForBar(b, context), guards);
    raw.push(sym);
  }

  const out = [...raw];

  applyRichHarmonyExtensionPass(out, seed, receipts, tb, context);
  applyQuartalModalPass(out, seed, receipts, tb, context);
  applySusDominantPass(out, seed, receipts, tb, context);
  applyDelayedTonicColourPass(out, tonicPc, seed, receipts, tb, context, guards);
  applyGentleTwoFivePrepPass(out, tonicPc, seed, receipts, tb, context);

  genMeta.billEvansEffectiveHarmonyBars = out;
  genMeta.billEvansDeviceReceipts = receipts;
  genMeta.billEvansAntiElaborationGuards = guards;
}

export function finalizeBillEvansMetadata(metadata: GenerationMetadata, acc: BillEvansHarmonyAccumulator): void {
  const flat = [...(metadata.billEvansDeviceReceipts ?? [])];
  const g = metadata.billEvansAntiElaborationGuards ?? {
    bareTriadRaised: 0,
    strongCadenceSoftened: 0,
  };
  const guardTotal = g.bareTriadRaised + g.strongCadenceSoftened;
  const delayedTouches = Math.max(acc.delayedResolutionTouches, g.strongCadenceSoftened);
  const d = {
    songwriterId: 'bill_evans' as const,
    barsConsidered: acc.barsConsidered,
    extensionTouches: acc.extensionTouches,
    susModalTouches: acc.susModalTouches,
    quartalColourTouches: acc.quartalColourTouches,
    delayedResolutionTouches: delayedTouches,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Bill Evans (rootless / modal slice): ext≈${acc.extensionTouches}`,
    `sus≈${acc.susModalTouches}`,
    `quart≈${acc.quartalColourTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.billEvansDiagnostics = { ...d };
  metadata.billEvansSliceReceipt = receipt;
}
