/**
 * Ralph Towner — guitar-born polyphonic ECM Song Mode harmony slice (`rt:*` receipts).
 * Fingerstyle voicing logic, melody-from-arpeggio, resonance architecture,
 * slow harmonic fields, classical counterpoint — distinct from Garbarek / Wheeler / Weber / Surman / Bley.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Five Towner slice parameters (0–1). */
export interface RalphTownerSliceParams {
  guitarBornVoicing: number;
  melodyFromVoicing: number;
  resonanceAndSilence: number;
  slowHarmonicRhythm: number;
  classicalCounterpoint: number;
}

export const DEFAULT_RALPH_TOWNER_SLICE_PARAMS: RalphTownerSliceParams = {
  guitarBornVoicing: 0.78,
  melodyFromVoicing: 0.72,
  resonanceAndSilence: 0.7,
  slowHarmonicRhythm: 0.72,
  classicalCounterpoint: 0.68,
};

export interface TownerFieldSection {
  index: number;
  startBar: number;
  endBar: number;
  openStringDrone: 'E' | 'A' | 'D';
  primaryVoicing: string;
  phraseArcBars: number;
  twelveStringMode: boolean;
}

export interface TownerPolyphonicPlan {
  sections: TownerFieldSection[];
  sliceParams: RalphTownerSliceParams;
  silenceBars: number[];
  arpeggioMotorBars: number[];
  openStringBars: number[];
}

const OPEN_STRING_DRONES = ['E', 'A', 'D'] as const;

const GUITAR_VOICING_PALETTE: Readonly<Record<string, readonly string[]>> = {
  E: ['Emaj9', 'Eadd9', 'E6/9', 'Cmaj7/E', 'Gmaj9/E', 'Am9/E', 'Fmaj7/E'],
  A: ['Amaj9', 'Aadd9', 'A6/9', 'Dsus2/A', 'Fmaj7/A', 'Gmaj9/A', 'Cmaj7/A'],
  D: ['Dmaj9', 'Dadd9', 'D6/9', 'Dsus2/A', 'Gmaj7/D', 'Bm9/D', 'Fmaj7/D'],
  G: ['Gmaj9', 'Gadd9', 'G6/9', 'Gmaj9/B', 'Em9/G', 'Dsus2/G', 'Cmaj7/G'],
  C: ['Cmaj9', 'Cadd9', 'C6/9', 'Cmaj7/E', 'Fmaj7/A', 'Gmaj9/B', 'Dsus2/A'],
};

const TWELVE_STRING_PALETTE: Readonly<Record<string, readonly string[]>> = {
  E: ['Emaj9', 'E6/9', 'Aadd9/E', 'Cmaj7/E'],
  A: ['Amaj9', 'A6/9', 'Dsus2/A', 'Fmaj7/A'],
  D: ['Dmaj9', 'D6/9', 'Gmaj7/D', 'Bm9/D'],
  G: ['Gmaj9', 'G6/9', 'Em9/G', 'Cmaj7/G'],
  C: ['Cmaj9', 'C6/9', 'Fmaj7/A', 'Gmaj9/B'],
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

function looksAlteredBebop(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /alt|b9|#9|#11|b13|ø|m7b5|dim7/.test(tl);
}

function looksFunctionalTwoFive(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /\bm7\b|\bm9\b|ø|m7b5/.test(tl) && !/maj|sus|add|6/.test(tl);
}

function looksDominantSeventh(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  if (/maj|mmaj|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  return /7|9|11|13|alt/.test(tl);
}

function isGuitarBornVoicing(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /maj9|add9|6\/9|6-9|sus2|sus4|#11|min9|min11|maj7/.test(tl) || symbol.includes('/');
}

function pickOpenDrone(seed: number, sectionIndex: number, tonicPc: number): 'E' | 'A' | 'D' {
  const u = seededUnit(seed, sectionIndex, 981101);
  if (u < 0.34) return 'E';
  if (u < 0.67) return 'A';
  const tonicName = pitchClassToSharpName(tonicPc);
  if (OPEN_STRING_DRONES.includes(tonicName as (typeof OPEN_STRING_DRONES)[number])) {
    return tonicName as 'E' | 'A' | 'D';
  }
  return 'D';
}

function sectionSpanBars(seed: number, sectionIndex: number, slowHarmonicRhythm: number): number {
  const u = seededUnit(seed, sectionIndex, 981201);
  if (slowHarmonicRhythm >= 0.7) {
    if (u < 0.35) return 12;
    if (u < 0.65) return 8;
    if (u < 0.85) return 10;
    return 6;
  }
  if (u < 0.5) return 6;
  return 4;
}

function phraseArcForSection(seed: number, sectionIndex: number): number {
  const u = seededUnit(seed, sectionIndex, 981301);
  if (u < 0.3) return 6;
  if (u < 0.6) return 8;
  if (u < 0.85) return 4;
  return 5;
}

function voicingForSection(
  drone: string,
  seed: number,
  sectionIndex: number,
  twelveString: boolean
): string {
  const palette = twelveString
    ? (TWELVE_STRING_PALETTE[drone] ?? TWELVE_STRING_PALETTE.E!)
    : (GUITAR_VOICING_PALETTE[drone] ?? GUITAR_VOICING_PALETTE.E!);
  const slashed = palette.filter((c) => c.includes('/'));
  const pickFrom = slashed.length >= 2 ? slashed : palette;
  const u = seededUnit(seed, sectionIndex, 981401);
  return pickFrom[Math.floor(u * pickFrom.length) % pickFrom.length]!;
}

function internalRecolor(base: string, drone: string, seed: number, bar: number): string {
  const palette = GUITAR_VOICING_PALETTE[drone] ?? GUITAR_VOICING_PALETTE.E!;
  const u = seededUnit(seed, bar, 981501);
  const idx = palette.indexOf(base);
  if (idx >= 0) return palette[(idx + 1 + Math.floor(u * 2)) % palette.length]!;
  const qual = parseChordSymbol(stemOnly(base)).harmonyPart.match(/maj9|add9|6\/9|sus2|maj7/)?.[0] ?? 'maj9';
  const root = pitchClassToSharpName((harmonyRootPc(base) ?? 4) + (u < 0.5 ? 0 : 2));
  return `${root}${qual}/${drone}`;
}

function bassIndependentSlash(voicing: string, drone: string, seed: number, bar: number): string {
  if (voicing.includes('/')) return voicing;
  const u = seededUnit(seed, bar, 981601);
  const stem = stemOnly(voicing);
  const rootPc = harmonyRootPc(stem) ?? noteNameToPitchClass(drone) ?? 4;
  if (u < 0.28) return `${stem}/${drone}`;
  if (u < 0.55) return `${stem}/${pitchClassToSharpName((rootPc + 4) % 12)}`;
  if (u < 0.78) return `${stem}/${pitchClassToSharpName((rootPc + 7) % 12)}`;
  return `${stem}/${pitchClassToSharpName((rootPc + 2) % 12)}`;
}

export function resolveRalphTownerSliceParams(genMeta: GenerationMetadata | undefined): RalphTownerSliceParams {
  const fromMeta = genMeta?.ralphTownerSliceParams;
  if (!fromMeta) return { ...DEFAULT_RALPH_TOWNER_SLICE_PARAMS };
  const d = DEFAULT_RALPH_TOWNER_SLICE_PARAMS;
  return {
    guitarBornVoicing: clamp01(fromMeta.guitarBornVoicing ?? d.guitarBornVoicing),
    melodyFromVoicing: clamp01(fromMeta.melodyFromVoicing ?? d.melodyFromVoicing),
    resonanceAndSilence: clamp01(fromMeta.resonanceAndSilence ?? d.resonanceAndSilence),
    slowHarmonicRhythm: clamp01(fromMeta.slowHarmonicRhythm ?? d.slowHarmonicRhythm),
    classicalCounterpoint: clamp01(fromMeta.classicalCounterpoint ?? d.classicalCounterpoint),
  };
}

/** Layer 1 — slow harmonic field sections with open-string drone axis. */
export function buildTownerPolyphonicPlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: RalphTownerSliceParams = DEFAULT_RALPH_TOWNER_SLICE_PARAMS
): TownerPolyphonicPlan {
  const sections: TownerFieldSection[] = [];
  const silenceBars: number[] = [];
  const arpeggioMotorBars: number[] = [];
  const openStringBars: number[] = [];
  let bar = 1;
  let idx = 0;

  while (bar <= totalBars) {
    const remaining = totalBars - bar + 1;
    let span = Math.min(sectionSpanBars(seed, idx, params.slowHarmonicRhythm), remaining);
    if (remaining - span > 0 && remaining - span < 6 && span + (remaining - span) <= 12) {
      span = remaining;
    }
    const endBar = bar + span - 1;
    const drone = pickOpenDrone(seed, idx, tonicPc);
    const twelveStringMode = seededUnit(seed, idx, 981701) < 0.28;
    const primaryVoicing = voicingForSection(drone, seed, idx, twelveStringMode);

    sections.push({
      index: idx,
      startBar: bar,
      endBar,
      openStringDrone: drone,
      primaryVoicing,
      phraseArcBars: phraseArcForSection(seed, idx),
      twelveStringMode,
    });

    for (let b = bar; b <= endBar; b++) {
      if (seededUnit(seed, b, 981801) < params.resonanceAndSilence * 0.5) {
        silenceBars.push(b);
      }
      if (seededUnit(seed, b, 981901) < params.melodyFromVoicing * 0.62) {
        arpeggioMotorBars.push(b);
      }
      if (seededUnit(seed, b, 982001) < params.guitarBornVoicing * 0.68) {
        openStringBars.push(b);
      }
    }

    bar = endBar + 1;
    idx++;
  }

  return {
    sections,
    sliceParams: params,
    silenceBars,
    arpeggioMotorBars,
    openStringBars,
  };
}

export function sectionForBar(plan: TownerPolyphonicPlan, bar: number): TownerFieldSection | undefined {
  return plan.sections.find((s) => bar >= s.startBar && bar <= s.endBar);
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

function applyTownerPolyphonicLayers(
  out: string[],
  plan: TownerPolyphonicPlan,
  seed: number,
  receipts: string[],
  tonicPc: number | undefined,
  context: CompositionContext
): void {
  const p = plan.sliceParams;
  const tb = out.length;

  for (const sec of plan.sections) {
    receipts.push(
      `rt:section@${sec.startBar}-${sec.endBar}:drone=${sec.openStringDrone};voicing=${sec.primaryVoicing};twelve=${sec.twelveStringMode ? 1 : 0}`
    );
    let held = sec.primaryVoicing;
    let lastChangeBar = sec.startBar;
    let barsSinceInternalShift = 0;

    for (let bar = sec.startBar; bar <= sec.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = out[i]!;

      if (bar === sec.startBar) {
        sym = sec.primaryVoicing;
        held = sym;
        lastChangeBar = bar;
        receipts.push(`rt:guitar_voicing@${bar}`);
      }

      if (seededUnit(seed, bar, 982101) < p.guitarBornVoicing * 0.75) {
        sym = held;
        if (!isGuitarBornVoicing(sym)) {
          sym = sec.primaryVoicing;
        }
        receipts.push(`rt:guitar_voicing@${bar}`);
      }

      if (looksAlteredBebop(sym) || looksFunctionalTwoFive(sym)) {
        sym = sec.primaryVoicing;
        receipts.push(`rt:strip_bebop@${bar}`);
      }

      if (looksDominantSeventh(sym) && seededUnit(seed, bar, 982201) < 0.82) {
        sym = internalRecolor(held, sec.openStringDrone, seed, bar);
        receipts.push(`rt:non_dominant@${bar}`);
      }

      if (seededUnit(seed, bar, 982301) < p.slowHarmonicRhythm * 0.65) {
        if (bar - lastChangeBar < sec.phraseArcBars && sym !== held) {
          sym = held;
          receipts.push(`rt:slow_field@${bar}`);
        }
      }

      barsSinceInternalShift++;
      if (
        barsSinceInternalShift >= 3 &&
        seededUnit(seed, bar, 982401) < p.slowHarmonicRhythm * 0.45 &&
        bar !== sec.endBar
      ) {
        const recolored = internalRecolor(held, sec.openStringDrone, seed, bar);
        if (recolored !== held) {
          sym = recolored;
          held = recolored;
          lastChangeBar = bar;
          barsSinceInternalShift = 0;
          receipts.push(`rt:internal_recolor@${bar}`);
        }
      }

      if (seededUnit(seed, bar, 982501) < p.resonanceAndSilence * 0.62) {
        receipts.push(`rt:common_tone@${bar}:drone=${sec.openStringDrone}`);
      }

      if (plan.openStringBars.includes(bar) || seededUnit(seed, bar, 982601) < p.guitarBornVoicing * 0.35) {
        if (!sym.includes('/') && seededUnit(seed, bar, 982602) < p.classicalCounterpoint * 0.55) {
          sym = bassIndependentSlash(sym, sec.openStringDrone, seed, bar);
        }
        receipts.push(`rt:open_string@${bar}:drone=${sec.openStringDrone}`);
      }

      if (plan.arpeggioMotorBars.includes(bar) || seededUnit(seed, bar, 982701) < p.melodyFromVoicing * 0.58) {
        receipts.push(`rt:melody_from_voicing@${bar}:arpeggio`);
      }

      if (seededUnit(seed, bar, 982801) < p.classicalCounterpoint * 0.45) {
        sym = bassIndependentSlash(sym, sec.openStringDrone, seed, bar + 17);
        receipts.push(`rt:bass_independence@${bar}`);
      }

      if (plan.arpeggioMotorBars.includes(bar)) {
        receipts.push(`rt:arpeggio_motor@${bar}`);
      }

      if (plan.silenceBars.includes(bar)) {
        receipts.push(`rt:structural_silence@${bar}`);
      }

      if (sec.twelveStringMode && seededUnit(seed, bar, 982901) < 0.42) {
        receipts.push(`rt:twelve_string@${bar}:bloom`);
      }

      if (sym !== held && bar - lastChangeBar >= sec.phraseArcBars) {
        held = sym;
        lastChangeBar = bar;
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
        const bar = iiBar + k;
        out[bar - 1] = internalRecolor(sec.primaryVoicing, sec.openStringDrone, seed, bar + 11);
      }
      receipts.push(`rt:defunctional@${iiBar}`);
    }
  }
}

export interface RalphTownerHarmonyAccumulator {
  barsConsidered: number;
  guitarVoicingTouches: number;
  melodyFromVoicingTouches: number;
  resonanceTouches: number;
  openStringTouches: number;
  bassIndependenceTouches: number;
  arpeggioMotorTouches: number;
}

export function createRalphTownerHarmonyAccumulator(): RalphTownerHarmonyAccumulator {
  return {
    barsConsidered: 0,
    guitarVoicingTouches: 0,
    melodyFromVoicingTouches: 0,
    resonanceTouches: 0,
    openStringTouches: 0,
    bassIndependenceTouches: 0,
    arpeggioMotorTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: RalphTownerHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  if (isGuitarBornVoicing(c)) acc.guitarVoicingTouches++;
  if (/\//.test(c)) acc.bassIndependenceTouches++;
  if (/maj9|add9|6\/9|sus2|sus4|#11/.test(parseChordSymbol(c).harmonyPart.toLowerCase())) {
    acc.resonanceTouches++;
  }
}

export function accumulateRalphTownerHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: RalphTownerHarmonyAccumulator
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

export function minTownerSectionSpan(plan: TownerPolyphonicPlan | undefined): number {
  if (!plan?.sections.length) return 0;
  const spans = plan.sections.map((s) => s.endBar - s.startBar + 1).filter((span) => span >= 4);
  if (!spans.length) return Math.min(...plan.sections.map((s) => s.endBar - s.startBar + 1));
  return Math.min(...spans);
}

export function maxTownerPhraseArcLength(plan: TownerPolyphonicPlan | undefined): number {
  if (!plan?.sections.length) return 0;
  return Math.max(...plan.sections.map((s) => s.phraseArcBars));
}

export function precomputeRalphTownerEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 4;
  const params = resolveRalphTownerSliceParams(genMeta);
  genMeta.ralphTownerSliceParams = params;

  const plan = buildTownerPolyphonicPlan(seed, tb, tonicPc, params);
  genMeta.townerPolyphonicPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `rt:params=gbv:${params.guitarBornVoicing.toFixed(2)};mfv:${params.melodyFromVoicing.toFixed(2)};ras:${params.resonanceAndSilence.toFixed(2)};shr:${params.slowHarmonicRhythm.toFixed(2)};ccp:${params.classicalCounterpoint.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyTownerPolyphonicLayers(out, plan, seed, receipts, tonicPc, context);

  genMeta.ralphTownerEffectiveHarmonyBars = out;
  genMeta.ralphTownerDeviceReceipts = receipts;
}

export function finalizeRalphTownerMetadata(
  metadata: GenerationMetadata,
  acc: RalphTownerHarmonyAccumulator,
  deviceReceipts?: string[]
): void {
  const flat = deviceReceipts ?? [...(metadata.ralphTownerDeviceReceipts ?? [])];
  const plan = metadata.townerPolyphonicPlan;
  const params = metadata.ralphTownerSliceParams ?? DEFAULT_RALPH_TOWNER_SLICE_PARAMS;

  acc.guitarVoicingTouches = flat.filter((r) => r.startsWith('rt:guitar_voicing@')).length;
  acc.melodyFromVoicingTouches = flat.filter((r) => r.startsWith('rt:melody_from_voicing@')).length;
  acc.resonanceTouches = flat.filter((r) => r.startsWith('rt:common_tone@')).length;
  acc.openStringTouches = flat.filter((r) => r.startsWith('rt:open_string@')).length;
  acc.bassIndependenceTouches = flat.filter((r) => r.startsWith('rt:bass_independence@')).length;
  acc.arpeggioMotorTouches = flat.filter((r) => r.startsWith('rt:arpeggio_motor@')).length;

  metadata.ralphTownerDiagnostics = {
    songwriterId: 'ralph_towner',
    barsConsidered: acc.barsConsidered,
    guitarVoicingTouches: acc.guitarVoicingTouches,
    melodyFromVoicingTouches: acc.melodyFromVoicingTouches,
    resonanceTouches: acc.resonanceTouches,
    openStringTouches: acc.openStringTouches,
    bassIndependenceTouches: acc.bassIndependenceTouches,
    arpeggioMotorTouches: acc.arpeggioMotorTouches,
    minSectionSpan: minTownerSectionSpan(plan),
    maxPhraseArcBars: maxTownerPhraseArcLength(plan),
    sliceParams: { ...params },
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.ralphTownerSliceReceipt = [
    'Ralph Towner (guitar-born polyphonic ECM slice)',
    `sections=${plan?.sections.length ?? 0}`,
    `gbv=${params.guitarBornVoicing.toFixed(2)}`,
    `mfv=${params.melodyFromVoicing.toFixed(2)}`,
    `ras=${params.resonanceAndSilence.toFixed(2)}`,
    `guitar≈${acc.guitarVoicingTouches}`,
    `arpeggio≈${acc.arpeggioMotorTouches}`,
    `open≈${acc.openStringTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
