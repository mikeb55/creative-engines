/**
 * Bacharach — theatre-pop / studio-orchestra Song Mode / duo golden-path **harmony** slice.
 * Chromatic side-doors, lush tertian extensions (avoid bare triads), deceptive cadences, descending slash bass,
 * parallel-minor mixture touches — receipts `ba:*`.
 *
 * Melodic chromatic / cadential-ambiguity nudges remain in `generateGoldenPathDuoScore.applyBacharachGuitarBarPasses`.
 * No `core/style-modules/bacharach/` package exists; this slice owns symbol-level harmony for `bacharach` primary.
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

/** Weighted phrase lengths: 3-bar 25%, 4-bar 20%, 5-bar 25%, 7-bar 20%, 10-bar 8%, 14-bar 2%. */
function bacharachPhraseLength(seed: number, phraseIndex: number): number {
  const u = seededUnit(seed, phraseIndex, 991011);
  if (u < 0.25) return 3;
  if (u < 0.45) return 4;
  if (u < 0.7) return 5;
  if (u < 0.9) return 7;
  if (u < 0.98) return 10;
  return 14;
}

/**
 * Phrase role per bar using variable-length phrases (seeded). Same layout pattern as {@link computeEcmPhrasePositions}.
 */
export function computeBacharachPhrasePositions(
  totalBars: number,
  seed: number
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = bacharachPhraseLength(seed, phraseIdx);
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

export function isSongwriterBacharach(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'bacharach' } {
  return genMeta?.songwriterStyleId === 'bacharach';
}

export interface BacharachHarmonyAccumulator {
  barsConsidered: number;
  chromaticSideTouches: number;
  extensionTouches: number;
  deceptiveTouches: number;
  slashBassTouches: number;
}

export function createBacharachHarmonyAccumulator(): BacharachHarmonyAccumulator {
  return {
    barsConsidered: 0,
    chromaticSideTouches: 0,
    extensionTouches: 0,
    deceptiveTouches: 0,
    slashBassTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BacharachHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/maj9|add9|maj7|m9|m11|\b6\/9\b/.test(t)) acc.extensionTouches++;
  if (/\//.test(c)) acc.slashBassTouches++;
  if (/^[a-g][#b]?[^\/]*$/i.test(hp.replace(/\s/g, '')) && !/[79]|maj|min|m7|sus|dim/.test(t)) {
    /* bare-ish — counted elsewhere */
  }
}

export function accumulateBacharachHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BacharachHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export interface BacharachAntiElaborationGuards {
  clusterVoicingReduced: number;
  denseAlterationReduced: number;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

/** Lush but clean: avoid dense cluster spellings; target ≤4 functional chord tones in symbols. */
function sanitizeLushClean(symbol: string, guards: BacharachAntiElaborationGuards): string {
  let s = symbol.trim();
  if (!s) return s;
  const hp = parseChordSymbol(s).harmonyPart;
  const tl = hp.toLowerCase();
  const slash = slashTail(s);

  if (/add11|#11.*13|13.*\(.*#11|maj9\(.*#11|\(13.*11\)/.test(tl)) {
    guards.clusterVoicingReduced++;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) return s;
    const tail = hp.slice(root!.length).replace(/\s/g, '');
    if (/m(?!aj)/.test(tail)) return `${root}m9${slash}`;
    return `${root}maj9${slash}`;
  }

  if (/\balt\b|7\(.*alt|7\(.*b13.*#9/.test(tl)) {
    guards.denseAlterationReduced++;
    const root = hp.match(ROOT_AT_START)?.[1];
    if (!root) return s;
    return `${root}7b9${slash}`;
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

/** Dominant or broad major triad / maj colour (for bVII9 connector eligibility). */
function isBvii9EligibleChord(symbol: string): boolean {
  if (looksPlainDominantSeventh(symbol)) return true;
  if (isMinorishSymbol(symbol)) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/dim|ø|aug|sus/.test(tl)) return false;
  return true;
}

function isMinorishSymbol(symbol: string): boolean {
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/maj|Δ|sus|dim|ø|aug/.test(tl)) return false;
  return /\bm(?!aj)|min|m7|m9|m11|m6\b/.test(tl) || /^[a-g][#b]?m([^a]|$)/i.test(parseChordSymbol(symbol).harmonyPart.replace(/\s/g, ''));
}

/** Bare triads / plain major → rich extensions (maj9 / add9 / m9). */
function enrichBareTertian(symbol: string, guards: BacharachAntiElaborationGuards): string {
  let s = symbol.trim();
  if (!s) return s;
  const hp = parseChordSymbol(s).harmonyPart;
  const slash = slashTail(s);
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return sanitizeLushClean(s, guards);
  const root = m[1];
  const rest = hp.slice(root.length).replace(/\s/g, '');
  if (/[79]|maj|sus|dim|ø|add|6\/9|11|13|m7|m9/.test(rest)) return sanitizeLushClean(s, guards);
  if (rest === '' || /^major$/i.test(rest)) {
    return sanitizeLushClean(`${root}maj9${slash}`, guards);
  }
  if (/^m$/i.test(rest) || /^m[^a]/i.test(rest)) {
    return sanitizeLushClean(`${root}m9${slash}`, guards);
  }
  return sanitizeLushClean(s, guards);
}

/** bVII9 chromatic connector (e.g. Bb9 in C major) — phrase-middle bars. */
function applyBvii9ConnectorPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  const bviiPc = (tonicPc + 10 + 12) % 12;
  const bviiName = pitchClassToSharpName(bviiPc);
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 991095) >= 0.28) continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    if (!isBvii9EligibleChord(sym)) continue;
    out[b - 1] = `${bviiName}9`;
    receipts.push(`ba:bvii9_connector@bar${b}`);
  }
}

/** Phrase-final tonic major → maj9 or 6/9 (upper-structure landing colour). */
function applySoftExtensionLandingPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseFinal') continue;
    const sym = out[b - 1]!;
    const r = harmonyRootPc(sym);
    if (r !== tonicPc) continue;
    if (isMinorishSymbol(sym)) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/sus/.test(tl)) continue;
    if (/maj9|6\/9/.test(tl)) continue;
    const slash = slashTail(sym);
    const rootName = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!rootName) continue;
    const use69 = seededUnit(seed, b, 991096) < 0.42;
    out[b - 1] = use69 ? `${rootName}6/9${slash}` : `${rootName}maj9${slash}`;
    receipts.push(`ba:soft_ext_landing@bar${b}`);
  }
}

/** Mid-phrase chromatic side-door: neighbour root with tertian spelling. */
function applyChromaticSideDoorPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 991101) >= 0.22) continue;
    const sym = out[b - 1]!;
    const r = harmonyRootPc(sym);
    if (r === undefined) continue;
    const dir = seededUnit(seed, b, 991102) < 0.5 ? 1 : -1;
    const newPc = (r + dir + 12) % 12;
    const slash = slashTail(sym);
    const minor = isMinorishSymbol(sym);
    out[b - 1] = minor
      ? `${pitchClassToSharpName(newPc)}m7${slash}`
      : `${pitchClassToSharpName(newPc)}maj7${slash}`;
    receipts.push(`ba:chromatic_side@bar${b}`);
  }
}

/** Descending chromatic bass via slash (walk-down colour). */
function applyDescendingSlashPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) === 'phraseFinal') continue;
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    if (seededUnit(seed, b, 991201) >= 0.26) continue;
    const root = harmonyRootPc(sym);
    if (root === undefined) continue;
    const bassPc = (root + 11 + 12) % 12;
    const bassName = pitchClassToSharpName(bassPc);
    const rootName = parseChordSymbol(sym).harmonyPart.match(ROOT_AT_START)?.[1];
    if (!rootName) continue;
    const tail = parseChordSymbol(sym).harmonyPart.slice(rootName.length);
    out[b - 1] = `${rootName}${tail}/${bassName}`;
    receipts.push(`ba:desc_bass@bar${b}`);
  }
}

/** Deceptive cadence: dominant → unexpected resolution (vi or IV) on phrase-final tonic arrival. */
function applyDeceptiveCadencePass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  const viPc = (tonicPc + 9) % 12;
  const ivPc = (tonicPc + 5) % 12;
  for (let b = 2; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseFinal') continue;
    const prev = out[b - 2]!;
    const cur = out[b - 1]!;
    if (!looksPlainDominantSeventh(prev)) continue;
    if (harmonyRootPc(cur) !== tonicPc) continue;
    if (seededUnit(seed, b, 991301) >= 0.34) continue;
    const useVi = seededUnit(seed, b, 991302) < 0.52;
    out[b - 1] = useVi ? `${pitchClassToSharpName(viPc)}m7` : `${pitchClassToSharpName(ivPc)}maj7`;
    receipts.push(`ba:deceptive@bar${b}`);
  }
}

/** Parallel-minor mixture colour (e.g. bVI maj7) mid-phrase. */
function applyMixtureBorrowPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  if (tonicPc === undefined) return;
  const bViPc = (tonicPc + 8) % 12;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 991401) >= 0.14) continue;
    const sym = out[b - 1]!;
    if (harmonyRootPc(sym) !== tonicPc) continue;
    const tl = parseChordSymbol(sym).harmonyPart.toLowerCase();
    if (/m(?!aj)|min/.test(tl)) continue;
    out[b - 1] = `${pitchClassToSharpName(bViPc)}maj7`;
    receipts.push(`ba:mixture_bVI@bar${b}`);
  }
}

/** Counter-melody hint: inner-voice slash (chordal 3rd in bass) on selected phrase starts. */
function applyInnerVoiceSlashPass(
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
    const sym = out[b - 1]!;
    if (sym.includes('/')) continue;
    if (seededUnit(seed, b, 991501) >= 0.18) continue;
    const root = harmonyRootPc(sym);
    if (root === undefined) continue;
    const thirdPc = (root + 4) % 12;
    const hp = parseChordSymbol(sym).harmonyPart;
    const m = hp.match(ROOT_AT_START);
    if (!m?.[1]) continue;
    const rootName = m[1];
    const tail = hp.slice(rootName.length);
    out[b - 1] = `${rootName}${tail}/${pitchClassToSharpName(thirdPc)}`;
    receipts.push(`ba:inner_slash@bar${b}`);
  }
}

/**
 * Precompute effective one chord per bar after Bacharach slice devices (primary `bacharach` only).
 */
export function precomputeBacharachEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: BacharachAntiElaborationGuards = {
    clusterVoicingReduced: 0,
    denseAlterationReduced: 0,
  };

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = enrichBareTertian(getChordForBar(b, context), guards);
    sym = sanitizeLushClean(sym, guards);
    raw.push(sym);
  }

  const out = [...raw];
  const positions = computeBacharachPhrasePositions(tb, seed);

  applyChromaticSideDoorPass(out, seed, receipts, tb, context, positions);
  applyDescendingSlashPass(out, seed, receipts, tb, context, positions);
  applyBvii9ConnectorPass(out, tonicPc, seed, receipts, tb, context, positions);
  applyDeceptiveCadencePass(out, tonicPc, seed, receipts, tb, context, positions);
  applyMixtureBorrowPass(out, tonicPc, seed, receipts, tb, context, positions);
  applyInnerVoiceSlashPass(out, seed, receipts, tb, context, positions);
  applySoftExtensionLandingPass(out, tonicPc, seed, receipts, tb, context, positions);

  genMeta.bacharachEffectiveHarmonyBars = out;
  genMeta.bacharachDeviceReceipts = receipts;
  genMeta.bacharachAntiElaborationGuards = guards;
}

export function finalizeBacharachMetadata(metadata: GenerationMetadata, acc: BacharachHarmonyAccumulator): void {
  const flat = [...(metadata.bacharachDeviceReceipts ?? [])];
  const g = metadata.bacharachAntiElaborationGuards ?? {
    clusterVoicingReduced: 0,
    denseAlterationReduced: 0,
  };
  const guardTotal = g.clusterVoicingReduced + g.denseAlterationReduced;
  const chromaticN = flat.filter((r) => r.includes('ba:chromatic_side')).length;
  const deceptiveN = flat.filter((r) => r.includes('ba:deceptive')).length;
  const descBassN = flat.filter((r) => r.includes('ba:desc_bass')).length;
  const d = {
    songwriterId: 'bacharach' as const,
    barsConsidered: acc.barsConsidered,
    chromaticSideTouches: chromaticN,
    extensionTouches: acc.extensionTouches,
    deceptiveTouches: deceptiveN,
    slashBassTouches: Math.max(acc.slashBassTouches, descBassN + flat.filter((r) => r.includes('ba:inner_slash')).length),
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Bacharach (theatre-pop harmony slice): chrom≈${chromaticN}`,
    `ext≈${acc.extensionTouches}`,
    `dec≈${deceptiveN}`,
    `slash≈${d.slashBassTouches}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.bacharachDiagnostics = { ...d };
  metadata.bacharachSliceReceipt = receipt;
}
