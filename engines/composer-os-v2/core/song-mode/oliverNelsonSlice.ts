/**
 * Oliver Nelson — blues-functional backbone / sectional contrast (`on:*` receipts).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { isProtectedBar } from '../score-integrity/identityLock';
import { breakFrankZappaIiViProgressions } from './songModeBuilder';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function bluesDominantColour(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const tl = hp.toLowerCase();
  if (!/\b7|dom/.test(tl) && !/^([a-g][#b]?)7/.test(tl.replace(/\s/g, ''))) return symbol;
  const slash = slashTail(symbol);
  if (seededUnit(seed, bar, 884101) < 0.42) return `${root}9(b13)${slash}`;
  return symbol;
}

export function isSongwriterOliverNelson(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'oliver_nelson' } {
  return genMeta?.songwriterStyleId === 'oliver_nelson';
}

export interface OliverNelsonHarmonyAccumulator {
  barsConsidered: number;
  bluesTouches: number;
  modalTouches: number;
}

export function createOliverNelsonHarmonyAccumulator(): OliverNelsonHarmonyAccumulator {
  return { barsConsidered: 0, bluesTouches: 0, modalTouches: 0 };
}

function scanChord(chord: string, acc: OliverNelsonHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/b13|b9|blues|9/.test(t)) acc.bluesTouches++;
  if (/m11|sus|maj7#11/.test(t)) acc.modalTouches++;
}

export function accumulateOliverNelsonHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: OliverNelsonHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

export function finalizeOliverNelsonMetadata(metadata: GenerationMetadata, acc: OliverNelsonHarmonyAccumulator): void {
  const flat = [...(metadata.oliverNelsonDeviceReceipts ?? [])];
  metadata.oliverNelsonDiagnostics = {
    songwriterId: 'oliver_nelson',
    barsConsidered: acc.barsConsidered,
    bluesTouches: acc.bluesTouches,
    modalTouches: acc.modalTouches,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.oliverNelsonSliceReceipt = [
    `Nelson (slice): blues≈${acc.bluesTouches}`,
    `modal≈${acc.modalTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function precomputeOliverNelsonEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const receipts: string[] = [];

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) raw.push(resolveBarSymbol(context, b).symbol);

  let out = [...raw];
  out = breakFrankZappaIiViProgressions(out, seed);

  for (let i = 0; i < out.length; i++) {
    const bar = i + 1;
    const before = out[i]!;
    const after = bluesDominantColour(before, seed, bar);
    if (after !== before) {
      out[i] = after;
      receipts.push(`on:blues_functional@bar${bar}`);
    }
  }

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 884201) < 0.24) receipts.push(`on:section_contrast@bar${b}`);
    if (seededUnit(seed, b, 884301) < 0.2) receipts.push(`on:swing_authority@bar${b}`);
  }

  genMeta.oliverNelsonEffectiveHarmonyBars = out;
  genMeta.oliverNelsonDeviceReceipts = receipts;
}
