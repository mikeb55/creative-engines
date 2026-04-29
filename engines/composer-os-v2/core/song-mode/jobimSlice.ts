/**
 * Antônio Carlos Jobim — Brazilian jazz / bossa harmony Song Mode / duo golden-path **harmony** slice.
 * Line-led extensions: rich tonic colours (6/9, maj6, m6), altered dominants with voice-leading motivation,
 * tritone subs + backdoor cadences, passing diminished — receipts **`aj:*`**.
 *
 * **Prefix note:** James Brown harmony receipts already use **`jb:*`** — Jobim uses **`aj:*`** (Antônio Jobim) to avoid collisions.
 *
 * No `core/style-modules/jobim/` package; symbol-level harmony lives here for primary `antonio_carlos_jobim`.
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

export function isSongwriterJobim(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'antonio_carlos_jobim' } {
  return genMeta?.songwriterStyleId === 'antonio_carlos_jobim';
}

export interface JobimHarmonyAccumulator {
  barsConsidered: number;
  bossaTonicTouches: number;
  dominantColourTouches: number;
  subVOrBackdoorTouches: number;
}

export function createJobimHarmonyAccumulator(): JobimHarmonyAccumulator {
  return {
    barsConsidered: 0,
    bossaTonicTouches: 0,
    dominantColourTouches: 0,
    subVOrBackdoorTouches: 0,
  };
}

export interface JobimAntiElaborationGuards {
  bluntMaj7Softened: number;
  alteredDominantReduced: number;
}

function scanChordForDiagnostics(chord: string, acc: JobimHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/6\/9|maj6|\bm6\b|m6\/9/.test(t)) acc.bossaTonicTouches++;
  if (/\b9\b|\b13\b|b9|#9/.test(t) && /7|13|9/.test(t)) acc.dominantColourTouches++;
  if (/sub|bii|biii|bvi|bvii|tritone/i.test(c) || /b5|#11/.test(t)) acc.subVOrBackdoorTouches++;
}

export function accumulateJobimHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: JobimHarmonyAccumulator
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
  if (/\b9\b|11|13|b9|#9|#11|b13|b5|#5|alt/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7';
}

function looksStrongDominant(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return /^7/.test(rest) || /^9/.test(rest) || /^13/.test(rest);
}

function isTonicMajorFamily(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|min|dim|ø/.test(tl)) return false;
  if (/\b7\b/.test(tl) && !/maj7|maj9|mmaj7|Δ|6\/9|maj6|m6/.test(tl)) return false;
  return true;
}

function isTonicMinorFamily(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /m(?!aj)|min/.test(tl);
}

/** Major tonic: never bare triad — 6/9 > maj9 > maj7 > maj6 preference. */
function enrichMajorTonicBare(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  const tl = hp.toLowerCase();
  if (/m(?!aj)|dim|ø|sus|6\/9|maj9|maj7|maj6|6\b/.test(tl)) return symbol;
  if (rest !== '' && rest !== 'major' && rest !== 'maj') return symbol;
  const u = seededUnit(seed, bar, 882010);
  if (u < 0.34) return `${root}6/9${slash}`;
  if (u < 0.58) return `${root}maj9${slash}`;
  if (u < 0.82) return `${root}maj7${slash}`;
  return `${root}maj6${slash}`;
}

/** Minor tonic: m6/9 > m6 > m9 > m7 — preserve m6 ambiguity. */
function enrichMinorTonicBare(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  if (!/m(?!aj)|min/.test(tl)) return symbol;
  if (/m6\/9|m69|m6\b|m9|m7\b|maj/.test(tl)) return symbol;
  const u = seededUnit(seed, bar, 882020);
  if (u < 0.3) return `${root}m6/9${slash}`;
  if (u < 0.48) return `${root}m6${slash}`;
  if (u < 0.74) return `${root}m9${slash}`;
  return `${root}m7${slash}`;
}

function enrichDominantJobim(symbol: string, seed: number, bar: number): string {
  if (!isPlainDominantSeventh(symbol)) return symbol;
  const slash = slashTail(symbol);
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const u = seededUnit(seed, bar, 882030);
  if (u < 0.28) return `${root}13${slash}`;
  if (u < 0.52) return `${root}9${slash}`;
  if (u < 0.76) return `${root}7b9${slash}`;
  return `${root}7#9${slash}`;
}

function tritoneSubOfDominant(symbol: string): string {
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const subPc = (r + 6) % 12;
  const slash = slashTail(symbol);
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/\b13\b/.test(tl)) return `${pitchClassToSharpName(subPc)}13${slash}`;
  if (/\b9\b/.test(tl)) return `${pitchClassToSharpName(subPc)}9${slash}`;
  if (/b9|#9/.test(tl)) return `${pitchClassToSharpName(subPc)}7b9${slash}`;
  return `${pitchClassToSharpName(subPc)}7${slash}`;
}

function phraseFinalSoftenHardMaj7(
  symbol: string,
  tonicPc: number | undefined,
  seed: number,
  bar: number,
  guards: JobimAntiElaborationGuards
): string {
  if (!isTonicMajorFamily(symbol, tonicPc)) return symbol;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (!/\bmaj7\b|Δ/.test(tl)) return symbol;
  if (phrasePositionFromBar(bar) !== 'phraseFinal') return symbol;
  guards.bluntMaj7Softened++;
  const slash = slashTail(symbol);
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  return seededUnit(seed, bar, 882040) < 0.55 ? `${root}6/9${slash}` : `${root}maj6${slash}`;
}

function maybeReduceRelentlessAlt(symbol: string, guards: JobimAntiElaborationGuards): string {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (!/\balt\b|7\(.*alt/.test(tl)) return symbol;
  guards.alteredDominantReduced++;
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  return `${root}13${slash}`;
}

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
    const v = out[b - 1]!;
    const i = out[b]!;
    if (!looksStrongDominant(v)) continue;
    if (!isTonicMajorFamily(i, tonicPc) && !isTonicMinorFamily(i, tonicPc)) continue;
    const lo = 0.32;
    const hi = 0.48;
    const u = seededUnit(seed, b, 882101);
    if (u < lo || u > hi) continue;
    out[b - 1] = tritoneSubOfDominant(v);
    receipts.push(`aj:tri_sub@bar${b}`);
  }
}

function applyBackdoorPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const bViiPc = (tonicPc + 10) % 12;
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phrasePositionFromBar(b) !== 'phraseStart') continue;
    if (seededUnit(seed, b, 882201) >= 0.28) continue;
    const prev = out[b - 2]!;
    const cur = out[b - 1]!;
    if (!looksStrongDominant(prev)) continue;
    if (!isTonicMajorFamily(cur, tonicPc)) continue;
    const slash = slashTail(prev);
    out[b - 2] = `${pitchClassToSharpName(bViiPc)}13${slash}`;
    receipts.push(`aj:backdoor@bar${b - 1}`);
  }
}

function applyPhraseFinalSixNineOnTonic(
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
    if (!isTonicMajorFamily(sym, tonicPc)) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/6\/9|maj6/.test(tl)) continue;
    if (/\bmaj7\b|Δ/.test(tl)) continue;
    const slash = slashTail(sym);
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    if (seededUnit(seed, b, 882301) < 0.45) {
      out[b - 1] = `${root}6/9${slash}`;
      receipts.push(`aj:terminal_69@bar${b}`);
    } else {
      out[b - 1] = `${root}maj6${slash}`;
      receipts.push(`aj:terminal_maj6@bar${b}`);
    }
  }
}

function applyPassingDiminishedPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 882401) >= 0.16) continue;
    const p = out[b - 2]!;
    const c = out[b - 1]!;
    const rp = harmonyRootPc(p);
    const rc = harmonyRootPc(c);
    if (rp === undefined || rc === undefined) continue;
    const d = (rc - rp + 12) % 12;
    if (d !== 1 && d !== 11) continue;
    const slash = slashTail(c);
    const dimRoot = pitchClassToSharpName((rc + 11) % 12);
    out[b - 2] = `${dimRoot}dim7${slash}`;
    receipts.push(`aj:pass_dim@bar${b - 1}`);
  }
}

function applyBrightII7HintPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  const iiPc = (tonicPc + 2) % 12;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 882501) >= 0.22) continue;
    const sym = out[b - 1]!;
    if (harmonyRootPc(sym) !== iiPc) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (!/m7|min7|m9/.test(tl)) continue;
    const slash = slashTail(sym);
    const rootName = pitchClassToSharpName(iiPc);
    out[b - 1] = `${rootName}7${slash}`;
    receipts.push(`aj:II7_colour@bar${b}`);
  }
}

/** Bossa default is tertian colour — avoid naked quartal sus as primary grammar. */
function avoidQuartalAsDefault(symbol: string, seed: number, bar: number): string {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (!/sus4|sus\(4\)/.test(tl)) return symbol;
  if (seededUnit(seed, bar, 882601) >= 0.15) return symbol;
  const root = parseChordSymbol(symbol).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  return `${root}maj9${slash}`;
}

/**
 * Precompute effective one chord per bar after Jobim slice devices (primary `antonio_carlos_jobim` only).
 */
export function precomputeJobimEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: JobimAntiElaborationGuards = {
    bluntMaj7Softened: 0,
    alteredDominantReduced: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = getChordForBar(b, context);
    sym = enrichMajorTonicBare(sym, seed, b);
    sym = enrichMinorTonicBare(sym, seed, b);
    sym = enrichDominantJobim(sym, seed, b);
    sym = phraseFinalSoftenHardMaj7(sym, tonicPc, seed, b, guards);
    sym = maybeReduceRelentlessAlt(sym, guards);
    sym = avoidQuartalAsDefault(sym, seed, b);
    raw.push(sym);
  }

  const out = [...raw];

  applyCadentialSubVPass(out, tonicPc, seed, receipts, tb, context);
  applyBackdoorPass(out, tonicPc, seed, receipts, tb, context);
  applyPhraseFinalSixNineOnTonic(out, tonicPc, seed, receipts, tb, context);
  applyBrightII7HintPass(out, tonicPc, seed, receipts, tb, context);
  applyPassingDiminishedPass(out, tonicPc, seed, receipts, tb, context);

  genMeta.jobimEffectiveHarmonyBars = out;
  genMeta.jobimDeviceReceipts = receipts;
  genMeta.jobimAntiElaborationGuards = guards;
}

export function finalizeJobimMetadata(metadata: GenerationMetadata, acc: JobimHarmonyAccumulator): void {
  const flat = [...(metadata.jobimDeviceReceipts ?? [])];
  const g = metadata.jobimAntiElaborationGuards ?? {
    bluntMaj7Softened: 0,
    alteredDominantReduced: 0,
  };
  const guardTotal = g.bluntMaj7Softened + g.alteredDominantReduced;
  const tri = flat.filter((r) => r.includes('aj:tri_sub')).length;
  const back = flat.filter((r) => r.includes('aj:backdoor')).length;
  const d = {
    songwriterId: 'antonio_carlos_jobim' as const,
    barsConsidered: acc.barsConsidered,
    bossaTonicTouches: acc.bossaTonicTouches,
    dominantColourTouches: acc.dominantColourTouches,
    subVOrBackdoorTouches: Math.max(acc.subVOrBackdoorTouches, tri + back),
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Jobim (bossa harmony slice): tonicColour≈${acc.bossaTonicTouches}`,
    `domExt≈${acc.dominantColourTouches}`,
    `subOrBack≈${d.subVOrBackdoorTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.jobimDiagnostics = { ...d };
  metadata.jobimSliceReceipt = receipt;
}
