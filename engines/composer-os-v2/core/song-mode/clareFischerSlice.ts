/**
 * Clare Fischer — dense voicing grammar / Latin coupling (`cf:*` receipts).
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

function enrichDenseMajor(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const tl = hp.toLowerCase();
  if (/m(?!aj)|dim|ø/.test(tl)) return symbol;
  const slash = slashTail(symbol);
  if (seededUnit(seed, bar, 883101) >= 0.34) return symbol;
  return `${root}maj13(#11)${slash}`;
}

export function isSongwriterClareFischer(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'clare_fischer' } {
  return genMeta?.songwriterStyleId === 'clare_fischer';
}

export interface ClareFischerHarmonyAccumulator {
  barsConsidered: number;
  clusterTouches: number;
  latinGrooveHints: number;
}

export function createClareFischerHarmonyAccumulator(): ClareFischerHarmonyAccumulator {
  return { barsConsidered: 0, clusterTouches: 0, latinGrooveHints: 0 };
}

function scanChord(chord: string, acc: ClareFischerHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj13|#11|add|11|13/.test(t)) acc.clusterTouches++;
  if (/m9|m11|13/.test(t)) acc.latinGrooveHints++;
}

export function accumulateClareFischerHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: ClareFischerHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

export function finalizeClareFischerMetadata(metadata: GenerationMetadata, acc: ClareFischerHarmonyAccumulator): void {
  const flat = [...(metadata.clareFischerDeviceReceipts ?? [])];
  metadata.clareFischerDiagnostics = {
    songwriterId: 'clare_fischer',
    barsConsidered: acc.barsConsidered,
    clusterTouches: acc.clusterTouches,
    latinGrooveHints: acc.latinGrooveHints,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.clareFischerSliceReceipt = [
    `Fischer (slice): cluster≈${acc.clusterTouches}`,
    `latin≈${acc.latinGrooveHints}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function precomputeClareFischerEffectiveHarmonyBars(context: CompositionContext): void {
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
    const after = enrichDenseMajor(before, seed, bar);
    if (after !== before) {
      out[i] = after;
      receipts.push(`cf:dense_voicing@bar${bar}`);
    }
  }

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 883201) < 0.25) receipts.push(`cf:latin_coupling@bar${b}`);
    if (seededUnit(seed, b, 883301) < 0.2) receipts.push(`cf:inner_voice_lead@bar${b}`);
  }

  genMeta.clareFischerEffectiveHarmonyBars = out;
  genMeta.clareFischerDeviceReceipts = receipts;
}
