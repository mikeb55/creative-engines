/**
 * Prince — Minneapolis funk/soul extended-harmony Song Mode / duo golden-path slice.
 * Lead-sheet symbols only — receipts **`pr:*`** (`d1`–`d5`). Default chord colours: m9, dom9/13, maj9 / 6·9, sus9 (no plain triads).
 */

import type { CompositionContext, GenerationMetadata, PrinceContextMode } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

/**
 * Exact id `prince` only — no soft HV twins.
 */
export function isPrinceHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'prince' || voice === 'prince';
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

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

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function transposeChordRoot(symbol: string, deltaPc: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const rootPc = noteNameToPitchClass(m[1]);
  if (rootPc === undefined) return symbol;
  const rest = head.slice(m[1].length);
  const newRoot = pitchClassToSharpName((rootPc + deltaPc + 12) % 12);
  const slash = slashTail(symbol);
  return `${newRoot}${rest}${slash}`;
}

function sectionLabelForBar(bar: number, context: CompositionContext): string {
  const s = context.form.sections.find((sec) => bar >= sec.startBar && bar < sec.startBar + sec.length);
  return s?.label ?? 'A';
}

function isMinorishChord(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/maj|Δ|sus|dim|ø|aug/.test(tl)) return false;
  return /\bm(?!aj)|min|m7|m9|m11/.test(tl) || /^[a-g][#b]?m([^a]|$)/i.test(parseChordSymbol(symbol).harmonyPart.replace(/\s/g, ''));
}

function looksPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1].length);
  return /^7([^a-z]|$)|^7\(/.test(rest) || /^9([^a-z]|$)/.test(rest) || /^13([^a-z]|$)/.test(rest);
}

/** Bare triad / simple tertian without 7th/9th/sus extensions — targets for enrichment. */
function looksBareTriadOrPlain(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const head = hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
  const tl = head.toLowerCase().replace(/\s/g, '');
  if (/maj7|mmaj|dim|ø|sus|add|m7|m11|m9|\b9\b|11|13|7alt|7\(|\b7\b|6\/9|maj9|13/.test(tl)) return false;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = head.slice(m[1].length).replace(/\s/g, '');
  return rest === '' || rest === 'm' || /^maj$|^M?$/.test(rest);
}

function enrichPrinceCore(symbol: string, seed: number, bar: number, tonicPc: number | undefined): string {
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;

  if (isMinorishChord(symbol)) {
    const u = seededUnit(seed, bar, 994101);
    if (u < 0.45) return `${root}m9${slash}`;
    if (u < 0.78) return `${root}m11${slash}`;
    return `${root}m9${slash}`;
  }

  if (looksPlainDominantSeventh(symbol)) {
    const u = seededUnit(seed, bar, 994102);
    if (u < 0.55) return `${root}13${slash}`;
    if (u < 0.85) return `${root}9${slash}`;
    return `${root}13${slash}`;
  }

  const rpc = harmonyRootPc(symbol);
  if (rpc !== undefined && tonicPc !== undefined && rpc === tonicPc && !isMinorishChord(symbol)) {
    const u = seededUnit(seed, bar, 994103);
    if (u < 0.38) return `${root}maj9${slash}`;
    if (u < 0.72) return `${root}6/9${slash}`;
    return `${root}maj9${slash}`;
  }

  const tl = hp.toLowerCase();
  if (/sus/.test(tl) && !/9|13/.test(tl)) {
    return `${root}9sus4${slash}`;
  }

  if (looksBareTriadOrPlain(symbol)) {
    const u = seededUnit(seed, bar, 994104);
    if (isMinorishChord(symbol)) return `${root}m9${slash}`;
    if (u < 0.5) return `${root}maj9${slash}`;
    return `${root}6/9${slash}`;
  }

  return symbol;
}

/** pr:d1_minor_vamp — lock a minor-colour vamp window (longer for purple_rain). */
function applyMinorVampPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: PrinceContextMode
): void {
  if (tb < 8) return;
  const span =
    ctx === 'purple_rain'
      ? 12 + Math.floor(seededUnit(seed, 2, 994201) * 5)
      : ctx === 'sign_o_times'
        ? 8 + Math.floor(seededUnit(seed, 2, 994202) * 4)
        : 8;
  if (seededUnit(seed, 3, 994203) >= 0.72) return;

  let anchorIdx = -1;
  for (let i = 0; i < Math.min(tb, 8); i++) {
    if (isMinorishChord(out[i]!)) {
      anchorIdx = i;
      break;
    }
  }
  if (anchorIdx < 0) return;
  const anchor = out[anchorIdx]!;
  const root = parseChordSymbol(anchor).harmonyPart.match(ROOT_AT_START)?.[1];
  if (!root) return;
  const slash = slashTail(anchor);
  const vamp = `${root}m9${slash}`;
  const start = anchorIdx + 1;
  const end = Math.min(tb - 1, start + span - 1);
  for (let i = start; i <= end; i++) {
    const b = i + 1;
    if (isProtectedBar(b, context)) continue;
    out[i] = vamp;
    receipts.push(`pr:d1_minor_vamp@bar${b}`);
  }
}

/** pr:d2_gospel_cadence — IV→V→I colour lift on cadential anchors (every 4 bars in non-bridge). */
function applyGospelCadencePass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  tonicPc: number | undefined
): void {
  if (tonicPc === undefined) return;
  const ivPc = (tonicPc + 5) % 12;
  const vPc = (tonicPc + 7) % 12;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (sectionLabelForBar(b, context) === 'B') continue;
    if (b % 4 !== 0) continue;
    if (seededUnit(seed, b, 994301) >= 0.55) continue;
    const sym = out[b - 1]!;
    const rpc = harmonyRootPc(sym);
    if (rpc === undefined) continue;
    const hp = parseChordSymbol(sym).harmonyPart;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    if (rpc === ivPc) {
      out[b - 1] = `${root}6/9${slash}`;
      receipts.push(`pr:d2_gospel_cadence@bar${b}`);
    } else if (rpc === vPc && looksPlainDominantSeventh(sym)) {
      out[b - 1] = `${root}13${slash}`;
      receipts.push(`pr:d2_gospel_cadence@bar${b}`);
    } else if (rpc === tonicPc && !isMinorishChord(sym)) {
      out[b - 1] = `${root}maj9${slash}`;
      receipts.push(`pr:d2_gospel_cadence@bar${b}`);
    }
  }
}

/** pr:d3_chromatic_bass — chromatic passing diminished connector between selected bar pairs. */
function applyChromaticBassPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 2; b < tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 994401) >= 0.22) continue;
    const hp = parseChordSymbol(out[b - 1]!).harmonyPart;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(out[b - 1]!);
    out[b - 1] = `${root}dim7${slash}`;
    receipts.push(`pr:d3_chromatic_bass@bar${b}`);
  }
}

/** pr:d4_stop_time — phrase-boundary hit receipts (harmony already lush; annotate cadence pockets). */
function applyStopTimeReceiptPass(seed: number, receipts: string[], tb: number, context: CompositionContext): void {
  for (let b = 1; b <= tb; b++) {
    if (b % 4 !== 0) continue;
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 994501) >= 0.65) continue;
    receipts.push(`pr:d4_stop_time@bar${b}`);
  }
}

/** pr:d5_bridge_modulation — tritone subs on dominant-function chords in bridge (`B`) only. */
function applyBridgeTritonePass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (sectionLabelForBar(b, context) !== 'B') continue;
    if (isProtectedBar(b, context)) continue;
    const sym = out[b - 1]!;
    if (!looksPlainDominantSeventh(sym)) continue;
    if (seededUnit(seed, b, 994601) >= 0.48) continue;
    out[b - 1] = transposeChordRoot(sym, 6);
    receipts.push(`pr:d5_bridge_modulation@bar${b}`);
  }
}

/** Borrowed ♭VII / ♭III colour hits (non-bridge bars; capped). */
function applyBorrowedFlatColoursPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  tonicPc: number | undefined
): void {
  if (tonicPc === undefined) return;
  const bViiPc = (tonicPc + 10) % 12;
  const bIiiPc = (tonicPc + 3) % 12;
  const bViiName = pitchClassToSharpName(bViiPc);
  const bIiiName = pitchClassToSharpName(bIiiPc);

  let hits = 0;
  for (let b = 1; b <= tb; b++) {
    if (hits >= 4) break;
    if (isProtectedBar(b, context)) continue;
    if (sectionLabelForBar(b, context) === 'B') continue;
    if (seededUnit(seed, b, 994701) >= 0.06) continue;
    const slash = '';
    const u = seededUnit(seed, b, 994702);
    out[b - 1] = u < 0.55 ? `${bViiName}maj9${slash}` : `${bIiiName}m9${slash}`;
    receipts.push(`pr:borrow_flat_colour@bar${b}`);
    hits++;
  }
}

export function isSongwriterPrince(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'prince' } {
  return genMeta?.songwriterStyleId === 'prince';
}

export interface PrinceHarmonyAccumulator {
  barsConsidered: number;
  extensionTouches: number;
}

export function createPrinceHarmonyAccumulator(): PrinceHarmonyAccumulator {
  return {
    barsConsidered: 0,
    extensionTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: PrinceHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/m9|m11|maj9|6\/9|13|\b9\b|sus|69/.test(t)) acc.extensionTouches++;
}

export function accumulatePrinceHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: PrinceHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface PrinceAntiElaborationGuards {
  noopEnrich: number;
}

/** @deprecated — use resolveBarSymbol */
export function precomputePrinceEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const prCtx: PrinceContextMode = genMeta.princeContext ?? 'purple_rain';
  genMeta.princeContext = prCtx;

  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: PrinceAntiElaborationGuards = {
    noopEnrich: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    const before = sym;
    sym = enrichPrinceCore(sym, seed, b, tonicPc);
    if (sym === before && looksBareTriadOrPlain(before)) guards.noopEnrich++;
    raw.push(sym);
  }

  const out = [...raw];

  applyGospelCadencePass(out, seed, receipts, tb, context, tonicPc);
  applyChromaticBassPass(out, seed, receipts, tb, context);
  applyBorrowedFlatColoursPass(out, seed, receipts, tb, context, tonicPc);
  applyMinorVampPass(out, seed, receipts, tb, context, prCtx);
  applyBridgeTritonePass(out, seed, receipts, tb, context);
  applyStopTimeReceiptPass(seed, receipts, tb, context);

  /* Piece-final only: force Prince gospel tonic maj9 + safety net (mid-piece unchanged). */
  forceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);
  enforceFinalBarTonicResolution(out, tonicPc, tb, receipts, context);

  genMeta.princeEffectiveHarmonyBars = out;
  genMeta.princeDeviceReceipts = receipts;
  genMeta.princeAntiElaborationGuards = guards;
}

/**
 * GCE / FBT landing check for piece-final force.
 * Prince gospel tonic maj9 (pr:d2) — not bare maj7, not dom9/13 (digit-`7`/`13` FBT traps).
 */
function chordLooksTonicFamily(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/6\/9|69/.test(q) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  const hp = parseChordSymbol(s).harmonyPart;
  if (/^[A-G](?:#|b)?9$/i.test(hp)) return true;
  return false;
}

/** Piece-final tonic: maj9 — Prince d2_gospel_cadence / enrichPrinceCore tonic colour. */
function spellPrinceTonicCadence(
  bar: number,
  tonicPc: number
): { symbol: string; receipt: string } {
  const nm = pitchClassToSharpName(tonicPc);
  return {
    symbol: `${nm}maj9`,
    receipt: `pr:final_tonic_cadence@bar${bar}`,
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
  const { symbol, receipt } = spellPrinceTonicCadence(totalBars, tonicPc);
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
  const { symbol, receipt } = spellPrinceTonicCadence(totalBars, tonicPc);
  out[idx] = symbol;
  receipts.push(`${receipt}|final_bar_guardrail`);
}

export function finalizePrinceMetadata(metadata: GenerationMetadata, acc: PrinceHarmonyAccumulator): void {
  const flat = [...(metadata.princeDeviceReceipts ?? [])];
  const g = metadata.princeAntiElaborationGuards ?? { noopEnrich: 0 };
  const vampN = flat.filter((r) => r.includes('pr:d1_minor_vamp')).length;
  const bridgeN = flat.filter((r) => r.includes('pr:d5_bridge_modulation')).length;
  const borrowN = flat.filter((r) => r.includes('pr:borrow_flat_colour')).length;

  const d = {
    songwriterId: 'prince' as const,
    barsConsidered: acc.barsConsidered,
    extensionTouches: acc.extensionTouches,
    borrowedTouches: borrowN,
    vampTouches: vampN,
    bridgeColourTouches: bridgeN,
    antiElaborationGuardTriggers: g.noopEnrich,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Prince (slice): ext≈${acc.extensionTouches}`,
    `borrow≈${borrowN}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.princeDiagnostics = { ...d };
  metadata.princeSliceReceipt = receipt;
}
