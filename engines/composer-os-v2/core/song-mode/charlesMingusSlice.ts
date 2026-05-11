/**
 * Charles Mingus — blues-rooted / episodic big-band harmony slice (`cm:*` receipts).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';

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

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function replaceChordRoot(symbol: string, newRoot: string): string {
  const slash = slashTail(symbol);
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const qual = hp.slice(m[1]!.length);
  return `${newRoot}${qual}${slash}`;
}

function looksDominantFamily(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  return /7|9|11|13/.test(tl) && !/maj/.test(tl);
}

function enrichBluesDominant(symbol: string, seed: number, bar: number): string {
  if (!looksDominantFamily(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 661001);
  if (u < 0.35) return `${root}13(#9)${slash}`;
  if (u < 0.65) return `${root}7#9${slash}`;
  if (u < 0.85) return `${root}9(b13)${slash}`;
  return `${root}13${slash}`;
}

function maybeChromSlash(symbol: string, seed: number, bar: number): string {
  const u = seededUnit(seed, bar, 661002);
  if (u > 0.28) return symbol;
  const r = harmonyRootPc(symbol);
  if (r === undefined) return symbol;
  const bassPc = (r + (u < 0.14 ? -1 : 1) + 12) % 12;
  if (symbol.includes('/')) return symbol;
  return `${symbol}/${pitchClassToSharpName(bassPc)}`;
}

function applyRhythmDisplaceSideStep(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number
): void {
  for (let i = 1; i < out.length; i++) {
    const bar = i + 1;
    if (bar % 6 !== 0 || bar >= tb) continue;
    const u = seededUnit(seed, bar, 661003);
    if (u > 0.34) continue;
    const sym = out[i]!;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const nr = (r + 5 + 12) % 12;
    out[i] = replaceChordRoot(sym, pitchClassToSharpName(nr));
    receipts.push(`cm:sidestep@${bar}`);
  }
}

export function isSongwriterCharlesMingus(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'charles_mingus' } {
  return genMeta?.songwriterStyleId === 'charles_mingus';
}

export interface CharlesMingusHarmonyAccumulator {
  barsConsidered: number;
  bluesDominantTouches: number;
  slashTouches: number;
  sideStepTouches: number;
}

export function createCharlesMingusHarmonyAccumulator(): CharlesMingusHarmonyAccumulator {
  return { barsConsidered: 0, bluesDominantTouches: 0, slashTouches: 0, sideStepTouches: 0 };
}

function scanChordForDiagnostics(chord: string, acc: CharlesMingusHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const tl = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/#9|b13/.test(tl)) acc.bluesDominantTouches++;
  if (/\//.test(c)) acc.slashTouches++;
}

export function accumulateCharlesMingusHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: CharlesMingusHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function precomputeCharlesMingusEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  inferTonicPitchClassFromBar1(context);

  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    let sym = out[i]!;
    const before = sym;
    sym = enrichBluesDominant(sym, seed, bar);
    sym = maybeChromSlash(sym, seed, bar);
    if (sym !== before) receipts.push(`cm:blues@${bar}`);
    out[i] = sym;
  }

  applyRhythmDisplaceSideStep(out, seed, receipts, tb);

  genMeta.charlesMingusEffectiveHarmonyBars = out;
  genMeta.charlesMingusDeviceReceipts = receipts;
}

export function finalizeCharlesMingusMetadata(metadata: GenerationMetadata, acc: CharlesMingusHarmonyAccumulator): void {
  const flat = [...(metadata.charlesMingusDeviceReceipts ?? [])];
  const step = flat.filter((r) => r.startsWith('cm:sidestep@')).length;
  metadata.charlesMingusDiagnostics = {
    songwriterId: 'charles_mingus',
    barsConsidered: acc.barsConsidered,
    bluesDominantTouches: acc.bluesDominantTouches,
    slashTouches: acc.slashTouches,
    sideStepTouches: step,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.charlesMingusSliceReceipt = [
    `Charles Mingus (blues-episodic slice): bluesDom≈${acc.bluesDominantTouches}`,
    `slash≈${acc.slashTouches}`,
    `sidestep=${step}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
