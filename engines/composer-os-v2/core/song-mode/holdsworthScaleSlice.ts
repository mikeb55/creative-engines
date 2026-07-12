/**
 * Allan Holdsworth — scale-derived fusion harmony slice (`AH:*` receipts).
 * Chords as interval subsets of an active pitch collection — not functional root stacks.
 * Receipt prefix **`AH:`** (uppercase) — distinct from Andrew Hill **`ah:*`**.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type HoldsworthScaleFamily =
  | 'wholeTone'
  | 'melodicMinor'
  | 'lydianAugmented'
  | 'altered'
  | 'lydian';

/** Five Holdsworth scale-slice parameters (0–1). */
export interface HoldsworthSliceParams {
  scaleMembershipPriority: number;
  functionalRootAvoidance: number;
  chromaticVoiceLeadingRate: number;
  intervalSubsetVoicingBias: number;
  scaleFamilyPersistence: number;
}

export const DEFAULT_HOLDSWORTH_SLICE_PARAMS: HoldsworthSliceParams = {
  scaleMembershipPriority: 0.9,
  functionalRootAvoidance: 0.88,
  chromaticVoiceLeadingRate: 0.84,
  intervalSubsetVoicingBias: 0.86,
  scaleFamilyPersistence: 0.8,
};

export interface HoldsworthScaleSection {
  index: number;
  startBar: number;
  endBar: number;
  scaleFamily: HoldsworthScaleFamily;
  primarySubset: string;
  loopSubsets: readonly string[];
}

export interface HoldsworthScalePlan {
  sections: HoldsworthScaleSection[];
  sliceParams: HoldsworthSliceParams;
  scaleHoldBars: number[];
  chromaticVlBars: number[];
  intervalSubsetBars: number[];
}

const SCALE_FAMILY_PALETTES: Readonly<Record<HoldsworthScaleFamily, readonly string[]>> = {
  wholeTone: [
    'Cmaj7#11',
    'Dmaj9',
    'E7alt',
    'F#maj7#11',
    'G7#5',
    'A7alt',
    'Bbmaj9#11',
    'Ebmaj7#11',
  ],
  melodicMinor: [
    'Cm(maj7)',
    'Cm9',
    'Dm7',
    'Ebmaj7#11',
    'F7alt',
    'G7',
    'Am7b5',
    'Bm7b5',
    'F#m7b5',
  ],
  lydianAugmented: [
    'Cmaj7#5',
    'Dmaj9#11',
    'E7#5',
    'F#maj7#5',
    'G7alt',
    'Amaj7#11',
    'Bbmaj7#5',
  ],
  altered: ['C7alt', 'Db7#9', 'Eb7alt', 'F#7alt', 'G7b9#5', 'Ab7alt', 'B7alt', 'E7alt'],
  lydian: [
    'Cmaj7#11',
    'Dmaj9',
    'Emaj7#11',
    'F#maj9',
    'Gmaj7#11',
    'Amaj9',
    'B7alt',
    'Fmaj7#11',
  ],
};

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function stemOnly(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(0, symbol.indexOf('/')).trim() : symbol.trim();
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(stemOnly(symbol)).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function looksScaleDerivedSurface(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return (
    /#11|#5|alt|maj9|min9|m9|maj7|m\(maj7\)|m7b5|ø|7#5|7b9|7#9|add9|add#11/.test(tl) &&
    !/^([a-g][#b]?)(m(?!aj)|dim|sus2|sus4)$/.test(tl)
  );
}

function looksPlainFunctionalTriad(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/7|9|11|13|alt|#|add|ø|dim|sus|maj/.test(tl)) return false;
  return /^[a-g][#b]?m?$/.test(tl);
}

function looksFunctionalTwoFive(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bm7\b|\bm9\b|ø|m7b5/.test(tl) && !/maj|#11|alt|\(maj7\)/.test(tl);
}

function looksDominantSeventhPlain(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|mmaj|Δ|dim|ø|m(?!aj)|alt|#/.test(tl)) return false;
  return /7|9|11|13/.test(tl);
}

function pickScaleFamily(seed: number, sectionIndex: number, tonicPc: number): HoldsworthScaleFamily {
  const u = seededUnit(seed, sectionIndex, 981101);
  const families: HoldsworthScaleFamily[] = [
    'melodicMinor',
    'lydian',
    'wholeTone',
    'lydianAugmented',
    'altered',
  ];
  if (u < 0.24) return 'melodicMinor';
  if (u < 0.46) return 'lydian';
  if (u < 0.62) return 'wholeTone';
  if (u < 0.78) return 'lydianAugmented';
  if (u < 0.9) return 'altered';
  const tonicName = pitchClassToSharpName(tonicPc);
  if (tonicName.includes('#') || tonicPc % 2 === 0) return 'wholeTone';
  return families[sectionIndex % families.length]!;
}

function sectionSpanBars(seed: number, sectionIndex: number, scaleFamilyPersistence: number): number {
  const u = seededUnit(seed, sectionIndex, 981201);
  if (scaleFamilyPersistence >= 0.78) {
    if (u < 0.2) return 12;
    if (u < 0.4) return 8;
    if (u < 0.65) return 6;
    if (u < 0.85) return 4;
    return 10;
  }
  if (u < 0.45) return 4;
  return 2;
}

function pickPrimarySubset(
  family: HoldsworthScaleFamily,
  seed: number,
  sectionIndex: number,
  tonicPc: number
): string {
  const palette = SCALE_FAMILY_PALETTES[family];
  const tonicName = pitchClassToSharpName(tonicPc);
  const tonicMatch = palette.find((c) => {
    const root = harmonyRootPc(c);
    return root === tonicPc || stemOnly(c).startsWith(tonicName);
  });
  if (tonicMatch && seededUnit(seed, sectionIndex, 981301) < 0.55) return tonicMatch;
  const u = seededUnit(seed, sectionIndex, 981302);
  return palette[Math.floor(u * palette.length) % palette.length]!;
}

function loopSubsetsForSection(
  family: HoldsworthScaleFamily,
  primary: string,
  seed: number,
  sectionIndex: number
): string[] {
  const palette = SCALE_FAMILY_PALETTES[family];
  const u = seededUnit(seed, sectionIndex, 981303);
  const count = u < 0.4 ? 2 : u < 0.75 ? 3 : 1;
  const loop: string[] = [primary];
  for (let i = 1; i < count; i++) {
    const alt = palette[(palette.indexOf(primary) + i + 2) % palette.length]!;
    if (!loop.includes(alt)) loop.push(alt);
  }
  return loop;
}

function chromaticRecolorWithinFamily(
  held: string,
  family: HoldsworthScaleFamily,
  seed: number,
  bar: number
): string {
  const palette = SCALE_FAMILY_PALETTES[family];
  const idx = palette.indexOf(held);
  if (idx >= 0) return palette[(idx + 1) % palette.length]!;
  const u = seededUnit(seed, bar, 981401);
  return palette[Math.floor(u * palette.length) % palette.length]!;
}

function transposeSubsetToTonic(subset: string, tonicPc: number, bar: number): string {
  const rootPc = harmonyRootPc(subset);
  if (rootPc === undefined) return subset;
  const delta = (tonicPc - rootPc + 12) % 12;
  if (delta === 0) return subset;
  const stem = stemOnly(subset);
  const qual = stem.replace(ROOT_AT_START, '');
  const newRoot = pitchClassToSharpName((rootPc + delta) % 12);
  return `${newRoot}${qual}`;
}

function matchesMajorTwoFiveOne(
  out: string[],
  iiBar: number,
  tonicPc: number,
  tb: number
): boolean {
  if (iiBar + 2 > tb) return false;
  const rIi = harmonyRootPc(stemOnly(out[iiBar - 1]!));
  const rV = harmonyRootPc(stemOnly(out[iiBar]!));
  const rI = harmonyRootPc(stemOnly(out[iiBar + 1]!));
  if (rIi === undefined || rV === undefined || rI === undefined) return false;
  const iiPc = (tonicPc + 2) % 12;
  const vPc = (tonicPc + 7) % 12;
  return rIi === iiPc && rV === vPc && rI === tonicPc;
}

export function resolveHoldsworthSliceParams(genMeta: GenerationMetadata | undefined): HoldsworthSliceParams {
  const fromMeta = genMeta?.holdsworthSliceParams;
  if (!fromMeta) return { ...DEFAULT_HOLDSWORTH_SLICE_PARAMS };
  const d = DEFAULT_HOLDSWORTH_SLICE_PARAMS;
  return {
    scaleMembershipPriority: clamp01(fromMeta.scaleMembershipPriority ?? d.scaleMembershipPriority),
    functionalRootAvoidance: clamp01(fromMeta.functionalRootAvoidance ?? d.functionalRootAvoidance),
    chromaticVoiceLeadingRate: clamp01(fromMeta.chromaticVoiceLeadingRate ?? d.chromaticVoiceLeadingRate),
    intervalSubsetVoicingBias: clamp01(fromMeta.intervalSubsetVoicingBias ?? d.intervalSubsetVoicingBias),
    scaleFamilyPersistence: clamp01(fromMeta.scaleFamilyPersistence ?? d.scaleFamilyPersistence),
  };
}

export function buildHoldsworthScalePlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: HoldsworthSliceParams = DEFAULT_HOLDSWORTH_SLICE_PARAMS
): HoldsworthScalePlan {
  const sections: HoldsworthScaleSection[] = [];
  const scaleHoldBars: number[] = [];
  const chromaticVlBars: number[] = [];
  const intervalSubsetBars: number[] = [];
  let bar = 1;
  let idx = 0;

  while (bar <= totalBars) {
    const remaining = totalBars - bar + 1;
    let span = Math.min(sectionSpanBars(seed, idx, params.scaleFamilyPersistence), remaining);
    if (remaining - span > 0 && remaining - span < 2 && span + (remaining - span) <= 12) {
      span = remaining;
    }
    const endBar = bar + span - 1;
    const scaleFamily = pickScaleFamily(seed, idx, tonicPc);
    const primarySubset = pickPrimarySubset(scaleFamily, seed, idx, tonicPc);
    const loopSubsets = loopSubsetsForSection(scaleFamily, primarySubset, seed, idx);

    sections.push({
      index: idx,
      startBar: bar,
      endBar,
      scaleFamily,
      primarySubset,
      loopSubsets,
    });

    for (let b = bar; b <= endBar; b++) {
      if (seededUnit(seed, b, 981601) < params.scaleFamilyPersistence * 0.72) {
        scaleHoldBars.push(b);
      }
      if (seededUnit(seed, b, 981602) < params.chromaticVoiceLeadingRate * 0.58) {
        chromaticVlBars.push(b);
      }
      if (seededUnit(seed, b, 981603) < params.intervalSubsetVoicingBias * 0.65) {
        intervalSubsetBars.push(b);
      }
    }

    bar = endBar + 1;
    idx++;
  }

  return {
    sections,
    sliceParams: params,
    scaleHoldBars,
    chromaticVlBars,
    intervalSubsetBars,
  };
}

export function sectionForBar(plan: HoldsworthScalePlan, bar: number): HoldsworthScaleSection | undefined {
  return plan.sections.find((s) => bar >= s.startBar && bar <= s.endBar);
}

function loopSubsetAtBar(sec: HoldsworthScaleSection, bar: number): string {
  const rel = bar - sec.startBar;
  if (sec.loopSubsets.length <= 1) return sec.primarySubset;
  return sec.loopSubsets[rel % sec.loopSubsets.length]!;
}

function applyHoldsworthScaleLayers(
  out: string[],
  plan: HoldsworthScalePlan,
  seed: number,
  receipts: string[],
  tonicPc: number | undefined,
  context: CompositionContext
): void {
  const p = plan.sliceParams;
  const tb = out.length;

  for (const sec of plan.sections) {
    receipts.push(
      `AH:section@${sec.startBar}-${sec.endBar}:family=${sec.scaleFamily};subset=${sec.primarySubset};loop=${sec.loopSubsets.length}`
    );
    let held = sec.primarySubset;

    for (let bar = sec.startBar; bar <= sec.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = loopSubsetAtBar(sec, bar);

      if (bar === sec.startBar) {
        sym = sec.primarySubset;
        held = sym;
        receipts.push(`AH:scale_family@${bar}:${sec.scaleFamily}`);
      }

      if (
        seededUnit(seed, bar, 981701) < p.scaleMembershipPriority * 0.82 ||
        !looksScaleDerivedSurface(sym)
      ) {
        sym = loopSubsetAtBar(sec, bar);
        if (!looksScaleDerivedSurface(sym)) sym = sec.primarySubset;
        receipts.push(`AH:scale_membership@${bar}`);
      }

      if (seededUnit(seed, bar, 981702) < p.scaleFamilyPersistence * 0.76) {
        sym = held;
        receipts.push(`AH:scale_hold@${bar}`);
      }

      if (looksPlainFunctionalTriad(sym) || looksFunctionalTwoFive(sym)) {
        sym = sec.primarySubset;
        receipts.push(`AH:strip_functional@${bar}`);
      }

      if (looksDominantSeventhPlain(sym) && seededUnit(seed, bar, 981703) < p.functionalRootAvoidance) {
        sym = chromaticRecolorWithinFamily(held, sec.scaleFamily, seed, bar);
        receipts.push(`AH:root_avoid@${bar}`);
      }

      if (
        plan.intervalSubsetBars.includes(bar) ||
        seededUnit(seed, bar, 981704) < p.intervalSubsetVoicingBias * 0.68
      ) {
        if (!looksScaleDerivedSurface(sym)) {
          sym = sec.primarySubset;
          receipts.push(`AH:interval_subset@${bar}`);
        }
      }

      if (
        plan.chromaticVlBars.includes(bar) ||
        seededUnit(seed, bar, 981705) < p.chromaticVoiceLeadingRate * 0.55
      ) {
        const recolored = chromaticRecolorWithinFamily(held, sec.scaleFamily, seed, bar);
        if (recolored !== sym) {
          sym = recolored;
          receipts.push(`AH:chromatic_vl@${bar}`);
        }
      }

      if (tonicPc !== undefined && seededUnit(seed, bar, 981706) < 0.35) {
        sym = transposeSubsetToTonic(sym, tonicPc, bar);
      }

      if (sym !== held && seededUnit(seed, bar, 981707) < p.scaleMembershipPriority * 0.42) {
        held = sym;
      }

      out[i] = sym;
    }
  }

  if (tonicPc !== undefined) {
    for (let iiBar = 1; iiBar <= tb - 2; iiBar++) {
      if (!matchesMajorTwoFiveOne(out, iiBar, tonicPc, tb)) continue;
      if (
        isProtectedBar(iiBar, context) ||
        isProtectedBar(iiBar + 1, context) ||
        isProtectedBar(iiBar + 2, context)
      ) {
        continue;
      }
      const sec = sectionForBar(plan, iiBar);
      if (!sec) continue;
      for (let k = 0; k < 3; k++) {
        out[iiBar + k - 1] = sec.loopSubsets[k % sec.loopSubsets.length] ?? sec.primarySubset;
      }
      receipts.push(`AH:defunctional@${iiBar}`);
    }
  }

  /* Piece-final only: bias toward AH non-functional subsets that already pass fBT. */
  biasHoldsworthFinalBarIdiomaticOpen(out, plan, seed, receipts, tonicPc, context);
}

/**
 * Dominant-family proxy for finalBarTension (mirrors verlaineGbdWriterEvalCore
 * `isDominantFamilyChord`) — mid-piece scale/defunctional devices untouched.
 * Note: m7 / 7alt / plain 7 trip via digit `7` even when mid-piece idiomatic.
 */
function chordLooksDominantFamilyForFbtHoldsworth(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return false;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return false;
  if (/^[^/]*min9/i.test(s)) return false;
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

/** FBT-safe Holdsworth interval-subset spellings (no alt / plain-7 / m7 digit trap). */
function isHoldsworthFbtSafeSubset(symbol: string): boolean {
  if (!looksScaleDerivedSurface(symbol)) return false;
  return !chordLooksDominantFamilyForFbtHoldsworth(symbol);
}

function fbtSafeSubsetsFromFamily(family: HoldsworthScaleFamily): string[] {
  return SCALE_FAMILY_PALETTES[family].filter(isHoldsworthFbtSafeSubset);
}

/**
 * Bias piece-final bar toward Holdsworth pool landings that already pass fBT
 * (Cm(maj7) · maj7#11 · maj9 · maj7#5 — scale-derived, not functional root stacks).
 * Never leave 7alt / plain 7 / m7 on the final bar (digit-`7` FBT trap).
 */
function biasHoldsworthFinalBarIdiomaticOpen(
  out: string[],
  plan: HoldsworthScalePlan,
  seed: number,
  receipts: string[],
  tonicPc: number | undefined,
  context: CompositionContext
): void {
  const totalBars = out.length;
  if (totalBars < 1) return;
  if (isProtectedBar(totalBars, context)) return;
  const idx = totalBars - 1;
  const sym = out[idx];
  if (!sym || !chordLooksDominantFamilyForFbtHoldsworth(sym)) return;

  const sec = sectionForBar(plan, totalBars) ?? plan.sections[plan.sections.length - 1];
  if (!sec) return;

  const safe = fbtSafeSubsetsFromFamily(sec.scaleFamily);
  const u = seededUnit(seed, totalBars, 981801);
  let next: string;
  if (safe.length > 0) {
    next = safe[Math.floor(u * safe.length) % safe.length]!;
  } else {
    // Altered family is all dominant-family — fall back to melodic-minor FBT-pass pool.
    const fallback = fbtSafeSubsetsFromFamily('melodicMinor');
    next = fallback[Math.floor(u * fallback.length) % fallback.length] ?? 'Cm(maj7)';
  }

  if (tonicPc !== undefined && seededUnit(seed, totalBars, 981802) < 0.62) {
    next = transposeSubsetToTonic(next, tonicPc, totalBars);
  }

  out[idx] = next;
  receipts.push(`AH:final_open_bias@${totalBars}`);
}

export interface HoldsworthHarmonyAccumulator {
  barsConsidered: number;
  scaleDerivedTouches: number;
  scaleHoldTouches: number;
  chromaticVlTouches: number;
  intervalSubsetTouches: number;
  functionalStripTouches: number;
}

export function createHoldsworthHarmonyAccumulator(): HoldsworthHarmonyAccumulator {
  return {
    barsConsidered: 0,
    scaleDerivedTouches: 0,
    scaleHoldTouches: 0,
    chromaticVlTouches: 0,
    intervalSubsetTouches: 0,
    functionalStripTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: HoldsworthHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  if (looksScaleDerivedSurface(c)) acc.scaleDerivedTouches++;
}

export function accumulateHoldsworthHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: HoldsworthHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function countMajorTwoFiveOneChains(bars: readonly string[], tonicPc: number): number {
  let count = 0;
  for (let iiBar = 1; iiBar <= bars.length - 2; iiBar++) {
    if (matchesMajorTwoFiveOne([...bars], iiBar, tonicPc, bars.length)) count++;
  }
  return count;
}

export function scaleDerivedSurfaceRate(bars: readonly string[]): number {
  if (!bars.length) return 0;
  return bars.filter((b) => looksScaleDerivedSurface(b)).length / bars.length;
}

export function minHoldsworthSectionSpan(plan: HoldsworthScalePlan | undefined): number {
  if (!plan?.sections.length) return 0;
  const spans = plan.sections.map((s) => s.endBar - s.startBar + 1).filter((span) => span >= 2);
  if (!spans.length) return Math.min(...plan.sections.map((s) => s.endBar - s.startBar + 1));
  return Math.min(...spans);
}

/** Primary songwriter or harmonicVoice selects Allan Holdsworth harmony authority (scale-derived slice). */
export function isHoldsworthHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'allan_holdsworth' || voice === 'allan_holdsworth' || voice === 'holdsworth';
}

export function precomputeHoldsworthEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 4;
  const params = resolveHoldsworthSliceParams(genMeta);
  genMeta.holdsworthSliceParams = params;

  const plan = buildHoldsworthScalePlan(seed, tb, tonicPc, params);
  genMeta.holdsworthScalePlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `AH:params=smp:${params.scaleMembershipPriority.toFixed(2)};fra:${params.functionalRootAvoidance.toFixed(2)};cvl:${params.chromaticVoiceLeadingRate.toFixed(2)};isv:${params.intervalSubsetVoicingBias.toFixed(2)};sfp:${params.scaleFamilyPersistence.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyHoldsworthScaleLayers(out, plan, seed, receipts, tonicPc, context);

  genMeta.holdsworthEffectiveHarmonyBars = out;
  genMeta.holdsworthDeviceReceipts = receipts;
}

export function finalizeHoldsworthMetadata(
  metadata: GenerationMetadata,
  acc: HoldsworthHarmonyAccumulator,
  deviceReceipts?: string[]
): void {
  const flat = deviceReceipts ?? [...(metadata.holdsworthDeviceReceipts ?? [])];
  const plan = metadata.holdsworthScalePlan;
  const params = metadata.holdsworthSliceParams ?? DEFAULT_HOLDSWORTH_SLICE_PARAMS;

  acc.scaleHoldTouches = flat.filter((r) => r.startsWith('AH:scale_hold@')).length;
  acc.chromaticVlTouches = flat.filter((r) => r.startsWith('AH:chromatic_vl@')).length;
  acc.intervalSubsetTouches = flat.filter((r) => r.startsWith('AH:interval_subset@')).length;
  acc.functionalStripTouches = flat.filter((r) => r.startsWith('AH:strip_functional@')).length;
  acc.scaleDerivedTouches = flat.filter((r) => r.startsWith('AH:scale_membership@')).length;

  metadata.holdsworthDiagnostics = {
    songwriterId: 'allan_holdsworth',
    barsConsidered: acc.barsConsidered,
    scaleDerivedTouches: acc.scaleDerivedTouches,
    scaleHoldTouches: acc.scaleHoldTouches,
    chromaticVlTouches: acc.chromaticVlTouches,
    intervalSubsetTouches: acc.intervalSubsetTouches,
    functionalStripTouches: acc.functionalStripTouches,
    minSectionSpan: minHoldsworthSectionSpan(plan),
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.holdsworthSliceReceipt = [
    'Allan Holdsworth (scale-derived fusion slice)',
    `sections=${plan?.sections.length ?? 0}`,
    `smp=${params.scaleMembershipPriority.toFixed(2)}`,
    `sfp=${params.scaleFamilyPersistence.toFixed(2)}`,
    `scaleDerived≈${acc.scaleDerivedTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
