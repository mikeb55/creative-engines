/**
 * Bob Brookmeyer — quartal counter-lines / metric shifts (`bb:*` receipts).
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

function maybeQuartalColour(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  if (seededUnit(seed, bar, 882101) >= 0.28) return symbol;
  return `${root}quartal${slash}`;
}

export function isSongwriterBobBrookmeyer(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'bob_brookmeyer' } {
  return genMeta?.songwriterStyleId === 'bob_brookmeyer';
}

export interface BobBrookmeyerHarmonyAccumulator {
  barsConsidered: number;
  quartalTouches: number;
  alteredTouches: number;
}

export function createBobBrookmeyerHarmonyAccumulator(): BobBrookmeyerHarmonyAccumulator {
  return { barsConsidered: 0, quartalTouches: 0, alteredTouches: 0 };
}

function scanChord(chord: string, acc: BobBrookmeyerHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/quartal|sus/.test(t)) acc.quartalTouches++;
  if (/alt|#11|ø|m7\(b5\)/.test(t)) acc.alteredTouches++;
}

export function accumulateBobBrookmeyerHarmonyDiagnostics(
  _prev: string | undefined,
  currentChord: string,
  acc: BobBrookmeyerHarmonyAccumulator
): void {
  scanChord(currentChord, acc);
}

export function finalizeBobBrookmeyerMetadata(metadata: GenerationMetadata, acc: BobBrookmeyerHarmonyAccumulator): void {
  const flat = [...(metadata.bobBrookmeyerDeviceReceipts ?? [])];
  metadata.bobBrookmeyerDiagnostics = {
    songwriterId: 'bob_brookmeyer',
    barsConsidered: acc.barsConsidered,
    quartalTouches: acc.quartalTouches,
    alteredTouches: acc.alteredTouches,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.bobBrookmeyerSliceReceipt = [
    `Brookmeyer (slice): quartal≈${acc.quartalTouches}`,
    `alt≈${acc.alteredTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function precomputeBobBrookmeyerEffectiveHarmonyBars(context: CompositionContext): void {
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
    const after = maybeQuartalColour(before, seed, bar);
    if (after !== before) {
      out[i] = after;
      receipts.push(`bb:quartal_stack@bar${bar}`);
    }
  }

  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 882201) < 0.18) receipts.push(`bb:metric_shift_hint@bar${b}`);
  }

  genMeta.bobBrookmeyerEffectiveHarmonyBars = out;
  genMeta.bobBrookmeyerDeviceReceipts = receipts;
}
