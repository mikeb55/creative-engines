/**
 * Andrew Hill — post-bop avant-garde angular non-functional harmony Song Mode / duo golden-path **harmony** slice.
 * Open cadences, sus/cluster stripping, tritone harmonic fields, pedal centres — receipts **`ah:*`**.
 *
 * Symbol-level harmony only for primary `andrew_hill` (research brief — no external engine bridge).
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

export function isSongwriterAndrewHill(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'andrew_hill' } {
  return genMeta?.songwriterStyleId === 'andrew_hill';
}

export interface AndrewHillHarmonyAccumulator {
  barsConsidered: number;
  susClusterTouches: number;
  tritoneFieldTouches: number;
  nonfunctionalMinorTouches: number;
}

export function createAndrewHillHarmonyAccumulator(): AndrewHillHarmonyAccumulator {
  return {
    barsConsidered: 0,
    susClusterTouches: 0,
    tritoneFieldTouches: 0,
    nonfunctionalMinorTouches: 0,
  };
}

export interface AndrewHillAntiElaborationGuards {
  lushExtensionStripped: number;
  twoFiveChainMuted: number;
}

function scanChordForDiagnostics(chord: string, acc: AndrewHillHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/sus|quartal|add9|m11|\bm7\b|#11/.test(t)) acc.susClusterTouches++;
  if (/ø|m7b5|b5/.test(t)) acc.tritoneFieldTouches++;
  if (/\bm7\b|\bm11\b/.test(t)) acc.nonfunctionalMinorTouches++;
}

export function accumulateAndrewHillHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: AndrewHillHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

function isPlainDominantSeventh(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|dim|ø|m(?!aj)|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (/\b9\b|11|13|b9|#9|#11|b13|alt/.test(rest)) return false;
  return /^7([^a-z]|$)|^7\(/.test(rest) || rest === '7';
}

function isTonicAtPc(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  return harmonyRootPc(symbol) === tonicPc;
}

/** Functional major-key V7: dominant root a fifth above tonic pitch-class. */
function isFunctionalV7ToTonic(domSym: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const r = harmonyRootPc(domSym);
  if (r === undefined) return false;
  const expectedV = (tonicPc + 7) % 12;
  return r === expectedV && isPlainDominantSeventh(domSym);
}

function stripLushSweetness(
  symbol: string,
  seed: number,
  bar: number,
  guards: AndrewHillAntiElaborationGuards
): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  const slash = slashTail(symbol);
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  if (/\bmaj9\b|\bmaj13\b|\bm13\b|\bmaj11\b/.test(tl)) {
    guards.lushExtensionStripped++;
    return seededUnit(seed, bar, 887010) < 0.5 ? `${root}maj7(#11)${slash}` : `${root}m7${slash}`;
  }
  if (/\b13\b/.test(tl) && /7|9/.test(tl) && !/sus/.test(tl)) {
    guards.lushExtensionStripped++;
    return `${root}7sus4${slash}`;
  }
  return symbol;
}

function enrichBareTertian(symbol: string, seed: number, bar: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = slashTail(symbol);
  const tl = hp.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/sus|maj7|mmaj|dim|ø|\bm7\b|\bm11\b|add|quartal/.test(tl)) return symbol;
  if (/m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    const u = seededUnit(seed, bar, 887020);
    if (u < 0.34) return `${root}m11${slash}`;
    if (u < 0.7) return `${root}m7${slash}`;
    return `${root}m(add9)${slash}`;
  }
  if (rest === '' || rest === 'major' || rest === 'maj') {
    const u = seededUnit(seed, bar, 887021);
    if (u < 0.4) return `${root}maj7(#11)${slash}`;
    if (u < 0.72) return `${root}maj7${slash}`;
    return `${root}sus2${slash}`;
  }
  if (isPlainDominantSeventh(symbol)) {
    return seededUnit(seed, bar, 887022) < 0.65 ? `${root}7sus4${slash}` : `${root}sus4${slash}`;
  }
  return symbol;
}

function isContrastOrReturnBar(bar: number, context: CompositionContext): boolean {
  const secs = context.form?.sections ?? [];
  for (const sec of secs) {
    const L = (sec.label ?? '').toUpperCase();
    if (L === 'B' || L.includes('BRIDGE') || L.includes('CONTRAST') || L.includes('RETURN')) {
      const end = sec.startBar + sec.length - 1;
      if (bar >= sec.startBar && bar <= end) return true;
    }
  }
  return false;
}

/** d3 — Non-resolving dominant suppression (V7→I intercepted). */
function applyDomSuppress(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  guards: AndrewHillAntiElaborationGuards
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b < tb; b++) {
    if (isProtectedBar(b, context) || isProtectedBar(b + 1, context)) continue;
    const domSym = out[b - 1]!;
    const nextSym = out[b]!;
    if (!isFunctionalV7ToTonic(domSym, tonicPc)) continue;
    if (!isTonicAtPc(nextSym, tonicPc)) continue;
    if (seededUnit(seed, b, 887101) >= 0.55) continue;
    const slash = slashTail(domSym);
    const root = parseChordSymbol(domSym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    guards.twoFiveChainMuted++;
    if (seededUnit(seed, b, 887102) < 0.5) {
      out[b - 1] = `${root}7sus4${slash}`;
    } else {
      const r = harmonyRootPc(domSym)!;
      const subPc = (r + 6) % 12;
      const subRoot = pitchClassToSharpName(subPc);
      out[b - 1] = `${subRoot}7sus4${slash}`;
    }
    receipts.push(`ah:dom_suppress@bar${b}`);
  }
}

/** d2 — Sus/cluster substitution (remove tertian closure). */
function applySusClusterSubstitution(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 887201) >= 0.34) continue;
    const sym = out[b - 1]!;
    const hp = parseChordSymbol(sym).harmonyPart;
    const tl = hp.toLowerCase();
    if (/quartal|sus2|sus4/.test(tl) && !/\bmaj7\b/.test(tl)) continue;
    const slash = slashTail(sym);
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    if (isPlainDominantSeventh(sym)) {
      out[b - 1] = `${root}7sus4${slash}`;
      receipts.push(`ah:sus_cluster@bar${b}`);
      continue;
    }
    if (/dim|ø/.test(tl)) continue;
    if (/m7|m11/.test(tl) && !/maj/.test(tl)) continue;
    const u = seededUnit(seed, b, 887202);
    if (/m(?!aj)/.test(tl) || /\bm/.test(tl) && !/maj/.test(tl)) {
      out[b - 1] = u < 0.45 ? `${root}m11${slash}` : `${root}m7${slash}`;
    } else if (!/\b7\b/.test(tl)) {
      out[b - 1] = u < 0.33 ? `${root}sus4${slash}` : u < 0.66 ? `${root}sus2${slash}` : `${root}sus4${slash}`;
    } else {
      continue;
    }
    receipts.push(`ah:sus_cluster@bar${b}`);
  }
}

/** d1 — Tritone root motion on non-dominant chords. */
function applyTritoneRootMotion(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 887301) >= 0.28) continue;
    const sym = out[b - 1]!;
    if (isPlainDominantSeventh(sym)) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/dim|ø/.test(tl)) continue;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const slash = slashTail(sym);
    const newPc = (r + 6) % 12;
    const nr = pitchClassToSharpName(newPc);
    const u = seededUnit(seed, b, 887302);
    const qual = u < 0.38 ? `${nr}m7` : u < 0.72 ? `${nr}maj7(#11)` : `${nr}7sus4`;
    out[b - 1] = `${qual}${slash}`;
    receipts.push(`ah:tritone_root@bar${b}`);
  }
}

/** d4 — Pedal centre: locked bass letter with cycling upper qualities. */
function applyPedalCenter(
  out: string[],
  _tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  let b = 1;
  while (b <= tb) {
    if (isProtectedBar(b, context) || seededUnit(seed, b, 887401) >= 0.06) {
      b++;
      continue;
    }
    const span = 2 + Math.floor(seededUnit(seed, b, 887402) * 3);
    const first = out[b - 1]!;
    if (first.includes('/')) {
      b++;
      continue;
    }
    const pedalPc = harmonyRootPc(first);
    if (pedalPc === undefined) {
      b++;
      continue;
    }
    const pedalName = pitchClassToSharpName(pedalPc);
    const end = Math.min(tb, b + span - 1);
    for (let k = b; k <= end; k++) {
      if (isProtectedBar(k, context)) continue;
      const sym = out[k - 1]!;
      if (sym.includes('/')) continue;
      const hp = parseChordSymbol(sym).harmonyPart;
      const root = hp.match(ROOT_AT_START)?.[1];
      if (!root) continue;
      const rel = (k - b) % 3;
      const slash = `/${pedalName}`;
      const variant =
        rel === 0 ? `${root}maj7(#11)` : rel === 1 ? `${root}m7` : `${root}7sus4`;
      out[k - 1] = `${variant}${slash}`;
      receipts.push(`ah:pedal_center@bar${k}`);
    }
    b = end + 1;
  }
}

/** d5 — Non-functional m7 / m11 at chromatic roots (contrast / return). */
function applyNonfunctionalM7M11(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (!isContrastOrReturnBar(b, context)) continue;
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 887501) >= 0.22) continue;
    const sym = out[b - 1]!;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const slash = slashTail(sym);
    const shift = seededUnit(seed, b, 887502) < 0.5 ? 1 : 3;
    const dir = seededUnit(seed, b, 887503) < 0.5 ? 1 : -1;
    const nr = (r + dir * shift + 12) % 12;
    const rootName = pitchClassToSharpName(nr);
    const spell = seededUnit(seed, b, 887504) < 0.55 ? `${rootName}m11` : `${rootName}m7`;
    out[b - 1] = `${spell}${slash}`;
    receipts.push(`ah:nonfunctional_m7@bar${b}`);
  }
}

/**
 * Precompute effective one chord per bar after Andrew Hill slice devices (primary `andrew_hill` only).
 */
export function precomputeAndrewHillEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: AndrewHillAntiElaborationGuards = {
    lushExtensionStripped: 0,
    twoFiveChainMuted: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    sym = stripLushSweetness(sym, seed, b, guards);
    sym = enrichBareTertian(sym, seed, b);
    raw.push(sym);
  }

  const out = [...raw];

  applyDomSuppress(out, tonicPc, seed, receipts, tb, context, guards);
  applySusClusterSubstitution(out, seed, receipts, tb, context);
  applyTritoneRootMotion(out, seed, receipts, tb, context);
  applyPedalCenter(out, tonicPc, seed, receipts, tb, context);
  applyNonfunctionalM7M11(out, tonicPc, seed, receipts, tb, context);

  genMeta.andrewHillEffectiveHarmonyBars = out;
  genMeta.andrewHillDeviceReceipts = receipts;
  genMeta.andrewHillAntiElaborationGuards = guards;
}

export function finalizeAndrewHillMetadata(metadata: GenerationMetadata, acc: AndrewHillHarmonyAccumulator): void {
  const flat = [...(metadata.andrewHillDeviceReceipts ?? [])];
  const g = metadata.andrewHillAntiElaborationGuards ?? {
    lushExtensionStripped: 0,
    twoFiveChainMuted: 0,
  };
  const guardTotal = g.lushExtensionStripped + g.twoFiveChainMuted;
  const tritoneRoots = flat.filter((r) => r.includes('ah:tritone_root')).length;
  const d = {
    songwriterId: 'andrew_hill' as const,
    barsConsidered: acc.barsConsidered,
    susClusterTouches: acc.susClusterTouches,
    tritoneFieldTouches: acc.tritoneFieldTouches,
    nonfunctionalMinorTouches: acc.nonfunctionalMinorTouches,
    tritoneRootReceiptTouches: tritoneRoots,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Andrew Hill (angular non-functional slice): sus≈${acc.susClusterTouches}`,
    `tritoneField≈${acc.tritoneFieldTouches}`,
    `m7m11≈${acc.nonfunctionalMinorTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.andrewHillDiagnostics = { ...d };
  metadata.andrewHillSliceReceipt = receipt;
}
