/**
 * Duke Ellington — big-band / jungle timbre Song Mode / duo golden-path **harmony** slice.
 * Lead-sheet symbols only — receipts `de:*`.
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
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

/** Phrase lengths 4 / 8 / 2 / 6 bars at 60% / 22% / 13% / 5%. */
function ellingtonPhraseLength(seed: number, phraseIndex: number): number {
  const u = seededUnit(seed, phraseIndex, 887011);
  if (u < 0.6) return 4;
  if (u < 0.82) return 8;
  if (u < 0.95) return 2;
  return 6;
}

export function computeEllingtonPhrasePositions(
  totalBars: number,
  seed: number
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = ellingtonPhraseLength(seed, phraseIdx);
    const end = Math.min(bar + len - 1, totalBars);
    const span = end - bar + 1;
    for (let i = 0; i < span; i++) {
      const globalBar = bar + i;
      if (span <= 1) {
        out.push('phraseFinal');
      } else if (globalBar === bar) {
        out.push('phraseStart');
      } else if (globalBar === end) {
        out.push('phraseFinal');
      } else {
        out.push('phraseMiddle');
      }
    }
    bar = end + 1;
    phraseIdx++;
  }
  while (out.length < totalBars) out.push('phraseMiddle');
  return out.slice(0, totalBars);
}

function phraseRoleAtBar(
  bar: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = bar - 1;
  if (idx < 0 || idx >= positions.length) return 'phraseMiddle';
  return positions[idx]!;
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

function looksBareMajorOnTonic(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  if (/maj9|maj13|maj6|6\/9|#11/.test(tl)) return false;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return rest === '' || /^maj7?$/i.test(rest) || /^M7?$/i.test(rest) || rest === 'maj';
}

function looksBareMinor(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|Δ|dim|ø|aug|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (!/^m/.test(rest)) return false;
  return !/[79]|11|13|maj/.test(rest);
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function enrichEllingtonTonic(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (!looksBareMajorOnTonic(symbol, tonicPc)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 887101);
  if (u < 0.35) return `${root}maj9(#11)${slash}`;
  if (u < 0.6) return `${root}maj13(#11)${slash}`;
  if (u < 0.85) return `${root}maj6${slash}`;
  return `${root}maj9${slash}`;
}

function enrichEllingtonDominant(symbol: string, seed: number, bar: number): string {
  if (!looksPlainDominantSeventh(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 887102);
  if (u < 0.4) return `${root}9${slash}`;
  if (u < 0.65) return `${root}13${slash}`;
  if (u < 0.85) return `${root}7(b9)${slash}`;
  return `${root}7(#9,b13)${slash}`;
}

function enrichEllingtonMinor(symbol: string, seed: number, bar: number): string {
  if (!looksBareMinor(symbol)) return symbol;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const root = hp.match(ROOT_AT_START)?.[1];
  if (!root) return symbol;
  const slash = slashTail(symbol);
  const u = seededUnit(seed, bar, 887103);
  if (u < 0.35) return `${root}m6(9)${slash}`;
  if (u < 0.65) return `${root}m9${slash}`;
  if (u < 0.9) return `${root}m7${slash}`;
  return `${root}m6${slash}`;
}

function computeShoutStartBar(tb: number): number {
  let span: number;
  if (tb >= 32) span = 16;
  else if (tb >= 16) span = 8;
  else span = Math.max(4, Math.min(8, Math.floor(tb / 2)));
  span = Math.min(span, tb);
  return tb - span + 1;
}

function applyJungleGrowlPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseStart') continue;
    if (seededUnit(seed, b, 887201) >= 0.22) continue;
    const sym = out[b - 1]!;
    const dom = looksPlainDominantSeventh(sym) || /\b7\b/.test(parseChordSymbol(sym).harmonyPart);
    const min = isMinorishChord(sym) && !dom;
    if (!dom && !min) continue;
    const root = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!root) continue;
    const slash = slashTail(sym);
    const u = seededUnit(seed, b, 887202);
    if (min) {
      out[b - 1] = `${root}m6(9)${slash}`;
    } else {
      if (u < 0.4) out[b - 1] = `${root}7(b9#5)${slash}`;
      else if (u < 0.75) out[b - 1] = `${root}7(b9b5)${slash}`;
      else out[b - 1] = `${root}7(b9#5)${slash}`;
    }
    receipts.push(`de:jungle_growl@bar${b}`);
  }
}

function applyChromaticDiminishedPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  for (let cadBar = 2; cadBar <= tb; cadBar++) {
    if (phraseRoleAtBar(cadBar, positions) !== 'phraseFinal') continue;
    const cadSym = out[cadBar - 1]!;
    if (!looksMajorTonicColour(cadSym, tonicPc) && !isMinorishChord(cadSym)) continue;
    const approachBar = cadBar - 1;
    if (approachBar < 1 || isProtectedBar(approachBar, context)) continue;
    if (seededUnit(seed, cadBar, 887301) >= 0.25) continue;
    const targetPc = harmonyRootPc(cadSym);
    if (targetPc === undefined) continue;
    const dimPc = (targetPc + 1) % 12;
    out[approachBar - 1] = `${pitchClassToSharpName(dimPc)}dim7`;
    receipts.push(`de:chrom_dim@bar${approachBar}`);
  }
}

function applyCallResponseFlagPass(
  genMeta: GenerationMetadata & Record<string, unknown>,
  tb: number,
  seed: number,
  receipts: string[]
): void {
  const map: Record<number, 'call' | 'response'> = {};
  for (let b = 1; b <= tb; b++) {
    const role: 'call' | 'response' = b % 2 === 1 ? 'call' : 'response';
    map[b] = role;
    if (seededUnit(seed, b, 887401) < 0.6) {
      receipts.push(role === 'call' ? `de:call@bar${b}` : `de:response@bar${b}`);
    }
  }
  genMeta.ellingtonCallResponseMap = map;
}

function applyParallelPlaningPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 887501) >= 0.2) continue;
    if (harmonyRootPc(out[b - 1]!) !== tonicPc || harmonyRootPc(out[b - 2]!) !== tonicPc) continue;
    const sym = out[b - 1]!;
    const stemOnly = sym.includes('/') ? sym.slice(0, sym.indexOf('/')).trim() : sym.trim();
    const hp = parseChordSymbol(stemOnly).harmonyPart;
    const m = hp.match(ROOT_AT_START);
    if (!m?.[1]) continue;
    const rootName = m[1];
    const rootPc = harmonyRootPc(stemOnly);
    if (rootPc === undefined) continue;
    const dir = seededUnit(seed, b, 887502) < 0.5 ? 1 : -1;
    const upperPc = (rootPc + dir + 12) % 12;
    const upperName = pitchClassToSharpName(upperPc);
    const qualRest = hp.slice(rootName.length).trim();
    const upperStem = qualRest ? `${upperName}${qualRest}` : `${upperName}maj9`;
    const bassName = pitchClassToSharpName(rootPc);
    out[b - 1] = `${upperStem}/${bassName}`;
    receipts.push(`de:planing@bar${b}`);
  }
}

function applyShoutChorusPass(
  out: string[],
  tonicPc: number | undefined,
  _seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  shoutBarsOut: number[]
): void {
  const start = computeShoutStartBar(tb);
  for (let b = start; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    shoutBarsOut.push(b);
    const sym = out[b - 1]!;
    const stemOnly = sym.includes('/') ? sym.slice(0, sym.indexOf('/')).trim() : sym.trim();
    const root = parseChordSymbol(stemOnly).harmonyPart.match(ROOT_AT_START)?.[1];
    const slash = slashTail(sym);
    if (!root) continue;
    const tl = parseChordSymbol(stemOnly).harmonyPart.toLowerCase();
    const rpc = harmonyRootPc(stemOnly);
    const onTonic = tonicPc !== undefined && rpc === tonicPc;
    const isTonicMajorColour = onTonic && looksMajorTonicColour(stemOnly, tonicPc);
    const isTonicMinorColour = onTonic && isMinorishChord(stemOnly);
    const isDom =
      looksPlainDominantSeventh(stemOnly) ||
      (tonicPc !== undefined && rpc !== undefined && rpc !== tonicPc && /\b7\b|13|9|alt/.test(tl));
    if (isDom && !isTonicMajorColour && !isTonicMinorColour) {
      out[b - 1] = `${root}13${slash}`;
    } else if (isTonicMinorColour) {
      out[b - 1] = `${root}m9${slash}`;
    } else {
      out[b - 1] = `${root}maj9(#11)${slash}`;
    }
    receipts.push(`de:shout@bar${b}`);
  }
}

export function isSongwriterDukeEllington(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'duke_ellington' } {
  return genMeta?.songwriterStyleId === 'duke_ellington';
}

export interface DukeEllingtonHarmonyAccumulator {
  barsConsidered: number;
  majExtensionTouches: number;
  domColourTouches: number;
  minorColourTouches: number;
}

export function createDukeEllingtonHarmonyAccumulator(): DukeEllingtonHarmonyAccumulator {
  return {
    barsConsidered: 0,
    majExtensionTouches: 0,
    domColourTouches: 0,
    minorColourTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: DukeEllingtonHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/maj9|maj13|maj6|#11/.test(t)) acc.majExtensionTouches++;
  if (/\b13\b|7\(b9|7\(#9|7\(b9#5|7\(b9b5/.test(t)) acc.domColourTouches++;
  if (/m6\(9\)|m9|m7\b|m6\b/.test(t)) acc.minorColourTouches++;
}

export function accumulateDukeEllingtonHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: DukeEllingtonHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface DukeEllingtonAntiElaborationGuards {
  bareMajorRaised: number;
}

/** @deprecated — use resolveBarSymbol */
export function precomputeDukeEllingtonEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: DukeEllingtonAntiElaborationGuards = {
    bareMajorRaised: 0,
  };

  const positions = computeEllingtonPhrasePositions(tb, seed);
  applyCallResponseFlagPass(genMeta, tb, seed, receipts);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    const rawIn = resolveBarSymbol(context, b).symbol;
    const bareTonicMajor = looksBareMajorOnTonic(rawIn, tonicPc);
    let sym = rawIn;
    sym = enrichEllingtonTonic(sym, tonicPc, seed, b);
    sym = enrichEllingtonDominant(sym, seed, b);
    sym = enrichEllingtonMinor(sym, seed, b);
    if (bareTonicMajor && sym !== rawIn) guards.bareMajorRaised++;
    raw.push(sym);
  }

  const out = [...raw];

  applyJungleGrowlPass(out, seed, receipts, tb, context, positions);
  applyChromaticDiminishedPass(out, tonicPc, seed, receipts, tb, context, positions);
  applyParallelPlaningPass(out, tonicPc, seed, receipts, tb, context);

  const shoutBars: number[] = [];
  applyShoutChorusPass(out, tonicPc, seed, receipts, tb, context, shoutBars);

  genMeta.dukeEllingtonEffectiveHarmonyBars = out;
  genMeta.dukeEllingtonDeviceReceipts = receipts;
  genMeta.dukeEllingtonAntiElaborationGuards = guards;
  genMeta.ellingtonShoutBars = shoutBars;
}

export function finalizeDukeEllingtonMetadata(metadata: GenerationMetadata, acc: DukeEllingtonHarmonyAccumulator): void {
  const flat = [...(metadata.dukeEllingtonDeviceReceipts ?? [])];
  const g = metadata.dukeEllingtonAntiElaborationGuards ?? { bareMajorRaised: 0 };
  const d = {
    songwriterId: 'duke_ellington' as const,
    barsConsidered: acc.barsConsidered,
    majExtensionTouches: acc.majExtensionTouches,
    domColourTouches: acc.domColourTouches,
    minorColourTouches: acc.minorColourTouches,
    antiElaborationGuardTriggers: g.bareMajorRaised,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Duke Ellington (orchestral slice): majExt≈${acc.majExtensionTouches}`,
    `dom≈${acc.domColourTouches}`,
    `min≈${acc.minorColourTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.dukeEllingtonDiagnostics = { ...d };
  metadata.dukeEllingtonSliceReceipt = receipt;
}
