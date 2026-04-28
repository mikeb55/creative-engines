/**
 * Pat Metheny — ECM / PMG modal–Lydian Song Mode / duo golden-path slice.
 * Lydian maj colour, pedal shimmer, diatonic planing, sus floats — layered on locked harmony.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { getChordForBar } from '../harmony/harmonyResolution';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { coarseSectionRoleFromBar, inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

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

export function isSongwriterPatMetheny(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'pat_metheny' } {
  return genMeta?.songwriterStyleId === 'pat_metheny';
}

export interface PatMethenyHarmonyAccumulator {
  barsConsidered: number;
  lydianColourTouches: number;
  susFloatTouches: number;
  slashPedalTouches: number;
}

export function createPatMethenyHarmonyAccumulator(): PatMethenyHarmonyAccumulator {
  return {
    barsConsidered: 0,
    lydianColourTouches: 0,
    susFloatTouches: 0,
    slashPedalTouches: 0,
  };
}

export interface PatMethenyAntiElaborationGuards {
  twoFiveOneFlattened: number;
  dominantChainFlattened: number;
  twoBarHoldForced: number;
  bluesDominantStripped: number;
}

export interface PatMethenyDeviceReceipts {
  deviceReceipts: string[];
}

function slashBassNote(symbol: string): string | undefined {
  if (!symbol.includes('/')) return undefined;
  const after = symbol.split('/')[1]?.trim();
  if (!after) return undefined;
  const m = after.match(/^([A-G](?:#|b)?)/);
  return m?.[1];
}

function sameSlashBass(a: string, b: string): boolean {
  const ba = slashBassNote(a);
  const bb = slashBassNote(b);
  return ba !== undefined && ba === bb;
}

function scanChordForDiagnostics(chord: string, acc: PatMethenyHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/\/[a-g]/i.test(c)) acc.slashPedalTouches++;
  if (/maj9|#11|maj7#11|6\/9/.test(t) || /Δ/.test(t)) acc.lydianColourTouches++;
  if (/sus|7sus|13sus/.test(t)) acc.susFloatTouches++;
}

export function accumulatePatMethenyHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: PatMethenyHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

/** Rough ii–V–I in major — flatten middle bar (non-functional palette). */
function isTwoFiveOne(a: string, b: string, c: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const ii = (tonicPc + 2) % 12;
  const v = (tonicPc + 7) % 12;
  const ia = harmonyRootPc(a);
  const ib = harmonyRootPc(b);
  const ic = harmonyRootPc(c);
  if (ia !== ii || ib !== v) return false;
  return ic === tonicPc;
}

function flattenTwoFiveOnePass(out: string[], tonicPc: number | undefined, guards: PatMethenyAntiElaborationGuards): void {
  for (let i = 2; i < out.length; i++) {
    const a = out[i - 2]!;
    const b = out[i - 1]!;
    const c = out[i]!;
    if (!isTwoFiveOne(a, b, c, tonicPc)) continue;
    guards.twoFiveOneFlattened++;
    out[i - 1] = out[i - 2]!;
  }
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

function stripDominantChainPass(out: string[], guards: PatMethenyAntiElaborationGuards): void {
  for (let i = 2; i < out.length; i++) {
    if (
      !looksPlainDominantSeventh(out[i - 2]!) ||
      !looksPlainDominantSeventh(out[i - 1]!) ||
      !looksPlainDominantSeventh(out[i]!)
    ) {
      continue;
    }
    guards.dominantChainFlattened++;
    const r = harmonyRootPc(out[i - 1]!);
    if (r !== undefined) {
      out[i - 1] = `${pitchClassToSharpName(r)}maj9`;
    }
  }
}

function stripBluesDominantColour(symbol: string, guards: PatMethenyAntiElaborationGuards): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/13sus|sus/.test(tl)) return symbol;
  if (/7#9|7b9|7\(.*#9/.test(tl)) {
    guards.bluesDominantStripped++;
    const r = harmonyRootPc(symbol);
    if (r === undefined) return symbol;
    return `${pitchClassToSharpName(r)}maj9`;
  }
  return symbol;
}

function enforceMethenyTwoBarHold(out: string[], guards: PatMethenyAntiElaborationGuards): void {
  const tb = out.length;
  for (let start = 1; start <= tb; start += 2) {
    const i0 = start - 1;
    const i1 = start;
    if (i1 >= tb) break;
    if (out[i0] === out[i1]) continue;
    if (sameSlashBass(out[i0]!, out[i1]!)) continue;
    guards.twoBarHoldForced++;
    out[i1] = out[i0]!;
  }
}

function looksMajorTonicColour(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø/.test(tl)) return false;
  return true;
}

function hasLydianHomeColour(symbol: string): boolean {
  const s = symbol.toLowerCase();
  return /maj9|#11|maj7#11|6\/9/.test(s);
}

function looksMajExtensionFamily(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  return /maj7|maj9|maj7#11|add9|6\/9/.test(tl);
}

function barIsPreChorusLike(bar: number, context: CompositionContext): boolean {
  const sec = context.form.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
  const L = (sec?.label ?? '').trim().toLowerCase();
  return L.startsWith('pre');
}

function emitLydianHomeReceipts(
  context: CompositionContext,
  out: string[],
  tonicPc: number | undefined,
  receipts: PatMethenyDeviceReceipts
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= out.length; b++) {
    const sym = out[b - 1]!;
    if (!looksMajorTonicColour(sym, tonicPc)) continue;
    if (!hasLydianHomeColour(sym)) continue;
    receipts.deviceReceipts.push(`pm:lydian_home@bar${b}`);
  }
}

function emitPedalShimmerReceipts(context: CompositionContext, out: string[], receipts: PatMethenyDeviceReceipts): void {
  for (let b = 2; b <= out.length; b++) {
    const role = coarseSectionRoleFromBar(b, context);
    if (role !== 'verse' && role !== 'chorus') continue;
    const prev = out[b - 2]!;
    const cur = out[b - 1]!;
    if (prev === cur) continue;
    if (!sameSlashBass(prev, cur)) continue;
    receipts.deviceReceipts.push(`pm:pedal_shimmer@bar${b}`);
  }
}

function emitDiatonicPlaningReceipts(context: CompositionContext, out: string[], receipts: PatMethenyDeviceReceipts): void {
  for (let b = 2; b <= out.length; b++) {
    const role = coarseSectionRoleFromBar(b, context);
    if (role !== 'verse' && role !== 'bridge') continue;
    const r0 = harmonyRootPc(out[b - 2]!);
    const r1 = harmonyRootPc(out[b - 1]!);
    if (r0 === undefined || r1 === undefined) continue;
    if (!looksMajExtensionFamily(out[b - 2]!) || !looksMajExtensionFamily(out[b - 1]!)) continue;
    const step = (r1 - r0 + 12) % 12;
    if (step === 2 || step === 5 || step === 10 || step === 7) {
      receipts.deviceReceipts.push(`pm:diatonic_planing@bar${b}`);
    }
  }
}

function emitSusFloatReceipts(context: CompositionContext, out: string[], receipts: PatMethenyDeviceReceipts): void {
  for (let b = 1; b <= out.length; b++) {
    const role = coarseSectionRoleFromBar(b, context);
    const pre = barIsPreChorusLike(b, context);
    if (role !== 'bridge' && !pre) continue;
    const tl = parseChordSymbol(out[b - 1]!).harmonyPart.toLowerCase();
    if (!/sus2|sus4|7sus|13sus/.test(tl)) continue;
    receipts.deviceReceipts.push(`pm:sus_float@bar${b}`);
  }
}

function applyModalSideSlipDevice(params: {
  context: CompositionContext;
  out: string[];
  receipts: PatMethenyDeviceReceipts;
  seed: number;
  tonicPc: number | undefined;
}): void {
  const { context, out, receipts, seed, tonicPc } = params;
  if (tonicPc === undefined) return;
  let fired = false;
  for (const sec of context.form.sections) {
    if (fired) break;
    if (coarseSectionRoleFromBar(sec.startBar, context) !== 'bridge') continue;
    if (seededUnit(seed, sec.startBar, 502001) > 0.78) continue;
    const b0 = sec.startBar;
    const bII = (tonicPc + 1) % 12;
    const bIII = (tonicPc + 3) % 12;
    const destPc = seededUnit(seed, sec.startBar, 502002) > 0.45 ? bII : bIII;
    if (b0 >= 1 && b0 <= out.length) {
      out[b0 - 1] = `${pitchClassToSharpName(destPc)}maj9`;
      receipts.deviceReceipts.push(`pm:modal_sideSlip@bar${b0}`);
      if (b0 < out.length) {
        out[b0] = `${pitchClassToSharpName(tonicPc)}maj7#11`;
      }
      fired = true;
    }
  }
}

/** Longest run of identical slash-bass note across consecutive bars. */
export function maxSlashBassHoldBars(out: string[]): number {
  let best = 0;
  let run = 0;
  let curBass: string | undefined;
  for (const sym of out) {
    const b = slashBassNote(sym);
    if (b && b === curBass) {
      run++;
    } else {
      curBass = b;
      run = b ? 1 : 0;
    }
    best = Math.max(best, run);
  }
  return best;
}

export function precomputePatMethenyEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const receipts: PatMethenyDeviceReceipts = { deviceReceipts: [] };
  const guards: PatMethenyAntiElaborationGuards = {
    twoFiveOneFlattened: 0,
    dominantChainFlattened: 0,
    twoBarHoldForced: 0,
    bluesDominantStripped: 0,
  };
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const seed = context.seed;

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(stripBluesDominantColour(getChordForBar(b, context), guards));
  }

  const out = [...raw];
  flattenTwoFiveOnePass(out, tonicPc, guards);
  stripDominantChainPass(out, guards);
  applyModalSideSlipDevice({ context, out, receipts, seed, tonicPc });
  enforceMethenyTwoBarHold(out, guards);

  emitLydianHomeReceipts(context, out, tonicPc, receipts);
  emitPedalShimmerReceipts(context, out, receipts);
  emitDiatonicPlaningReceipts(context, out, receipts);
  emitSusFloatReceipts(context, out, receipts);

  genMeta.patMethenyEffectiveHarmonyBars = out;
  genMeta.patMethenyDeviceReceipts = receipts.deviceReceipts;
  genMeta.patMethenyAntiElaborationGuards = guards;
  genMeta.patMethenyPedalHoldMaxBars = maxSlashBassHoldBars(out);
}

export function finalizePatMethenyMetadata(metadata: GenerationMetadata, acc: PatMethenyHarmonyAccumulator): void {
  const flat = [...(metadata.patMethenyDeviceReceipts ?? [])];
  const g = metadata.patMethenyAntiElaborationGuards ?? {
    twoFiveOneFlattened: 0,
    dominantChainFlattened: 0,
    twoBarHoldForced: 0,
    bluesDominantStripped: 0,
  };
  const guardTotal =
    g.twoFiveOneFlattened + g.dominantChainFlattened + g.twoBarHoldForced + g.bluesDominantStripped;
  const tb = Math.max(1, acc.barsConsidered);
  const lydianRate = acc.lydianColourTouches / tb;
  const susRate = acc.susFloatTouches / tb;
  const d = {
    songwriterId: 'pat_metheny' as const,
    barsConsidered: acc.barsConsidered,
    lydianColourHitRate: lydianRate,
    susFloatHitRate: susRate,
    slashPedalTouches: acc.slashPedalTouches,
    pedalHoldMaxBars: metadata.patMethenyPedalHoldMaxBars ?? 0,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Pat Metheny (ECM/PMG slice): Lydian-colour≈${acc.lydianColourTouches}`,
    `sus≈${acc.susFloatTouches}`,
    `slash≈${acc.slashPedalTouches}`,
    `pedalMax=${metadata.patMethenyPedalHoldMaxBars ?? 0}bars`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.patMethenyDiagnostics = { ...d };
  metadata.patMethenySliceReceipt = receipt;
}
