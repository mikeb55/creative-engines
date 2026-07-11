/**
 * Robert Fripp — era-dependent process systems Song Mode harmony slice (`rf:*` receipts).
 * Three compositional modes: Red (tritone/octatonic pressure), Discipline (gamelan interlock),
 * Loop (Frippertronics additive decay). Harmony as interval-field relations, not chord-function.
 *
 * Receipt prefix **`rf:*`** — distinct from Fripp/KC slice **`fk:*`**.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;
const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type FrippEraSystemMode = 'red' | 'discipline' | 'loop';

/** Six Fripp systems slice parameters (0–1) plus era mode. */
export interface FrippSliceParams {
  eraSystemMode: FrippEraSystemMode;
  intervalFieldPriority: number;
  interlockPatternRate: number;
  dissonanceManagement: number;
  loopAccumulationLogic: number;
  asymmetricGroupingRate: number;
}

export const DEFAULT_FRIPP_SLICE_PARAMS: FrippSliceParams = {
  eraSystemMode: 'discipline',
  intervalFieldPriority: 0.88,
  interlockPatternRate: 0.85,
  dissonanceManagement: 0.82,
  loopAccumulationLogic: 0.8,
  asymmetricGroupingRate: 0.83,
};

export interface FrippInterlockCell {
  guitarId: 'a' | 'b';
  pitchCell: string;
  rhythmBeats: number;
  registerOffset: number;
  attackOffset: number;
}

export interface FrippLoopLayer {
  layerIndex: number;
  pitchCenter: string;
  densityClass: 'skeleton' | 'color' | 'friction';
}

export interface FrippSystemsSection {
  index: number;
  startBar: number;
  endBar: number;
  eraMode: FrippEraSystemMode;
  pitchCenter: string;
  primaryField: string;
  secondaryField: string;
  groupingBeats: number;
  interlockCells: FrippInterlockCell[];
  loopLayers: FrippLoopLayer[];
}

export interface FrippSystemsPlan {
  sections: FrippSystemsSection[];
  sliceParams: FrippSliceParams;
  crossAccentBars: number[];
  offBarPhraseStarts: number[];
  tritoneBars: number[];
  interlockBars: number[];
  loopLayerBars: number[];
}

const RED_FIELD_PALETTE: Readonly<Record<string, readonly string[]>> = {
  E: ['E5', 'F#dim/E', 'G#5', 'B5/E', 'Cdim/E', 'F#/E', 'A5/E', 'Bb5/E'],
  G: ['G5', 'C#dim/G', 'F#5/G', 'Bb5/G', 'Db5/G', 'E5/G', 'Ab5/G'],
  D: ['D5', 'F#dim/D', 'G5/D', 'Bb5/D', 'C#dim/D', 'A5/D', 'Eb5/D'],
  A: ['A5', 'C#dim/A', 'D5/A', 'F#5/A', 'Bb5/A', 'E5/A', 'G#5/A'],
  C: ['C5', 'F#dim/C', 'G5/C', 'Bb5/C', 'D#dim/C', 'Ab5/C', 'E5/C'],
};

const DISCIPLINE_PENTATONIC: Readonly<Record<string, readonly string[]>> = {
  C: ['C5', 'Gsus4/C', 'D5', 'F5/C', 'G5', 'A5/C', 'Dsus2/C', 'F/C'],
  G: ['G5', 'Dsus4/G', 'A5', 'C5/G', 'D5', 'E5/G', 'Asus2/G'],
  D: ['D5', 'Asus4/D', 'E5', 'G5/D', 'A5', 'B5/D', 'Esus2/D'],
  E: ['E5', 'Bsus4/E', 'F#5', 'A5/E', 'B5', 'C#5/E', 'F#sus2/E'],
  A: ['A5', 'Esus4/A', 'B5', 'D5/A', 'E5', 'F#5/A', 'Bsus2/A'],
};

const LOOP_SKELETON: Readonly<Record<string, readonly string[]>> = {
  C: ['C5', 'G5/C', 'Csus2', 'F5', 'Gsus4/C', 'Dsus2/C', 'Am/C'],
  G: ['G5', 'D5/G', 'Gsus2', 'C5', 'Dsus4/G', 'Asus2/G'],
  D: ['D5', 'A5/D', 'Dsus2', 'G5', 'Asus4/D', 'Esus2/D'],
  E: ['E5', 'B5/E', 'Esus2', 'A5', 'Bsus4/E', 'F#sus2/E'],
  A: ['A5', 'E5/A', 'Asus2', 'D5', 'Esus4/A', 'Bsus2/A'],
};

const ASYMMETRIC_GROUPING_BEATS = [5, 7, 9, 11] as const;

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

function looksFunctionalDominantTonic(out: string[], bar: number, tonicPc: number): boolean {
  if (bar + 1 > out.length) return false;
  const rV = harmonyRootPc(stemOnly(out[bar - 1]!));
  const rI = harmonyRootPc(stemOnly(out[bar]!));
  if (rV === undefined || rI === undefined) return false;
  return rV === (tonicPc + 7) % 12 && rI === tonicPc;
}

function looksBluesTurnaround(out: string[], bar: number, tonicPc: number): boolean {
  if (bar + 3 > out.length) return false;
  const roots = [bar, bar + 1, bar + 2, bar + 3].map((b) => harmonyRootPc(stemOnly(out[b - 1]!)));
  if (roots.some((r) => r === undefined)) return false;
  const [a, b, c, d] = roots as number[];
  const iv = (tonicPc + 5) % 12;
  const v = (tonicPc + 7) % 12;
  return a === v && (b === iv || b === tonicPc) && (c === tonicPc || c === v) && d === tonicPc;
}

function looksHoldsworthRibbon(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /maj9|maj13|m9|m11|13|11|alt|add9/.test(tl) && !/sus|5\b|dim/.test(tl);
}

function looksVerlaineSuspended(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /sus2|sus4|add9|6\/9|6-9/.test(tl) && !/dim|#/.test(tl);
}

function looksMarrShimmer(symbol: string): boolean {
  const tl = parseChordSymbol(stemOnly(symbol)).harmonyPart.toLowerCase();
  return /add9|maj7|6\/9|sus2/.test(tl) && !/dim|5\b/.test(tl);
}

function pickPitchCenter(seed: number, sectionIndex: number, tonicPc: number): string {
  const centers = ['E', 'G', 'D', 'A', 'C'];
  const u = seededUnit(seed, sectionIndex, 991101);
  const tonicName = pitchClassToSharpName(tonicPc);
  if (centers.includes(tonicName) && u < 0.35) return tonicName;
  return centers[Math.floor(u * centers.length) % centers.length]!;
}

function pickEraMode(
  seed: number,
  sectionIndex: number,
  defaultMode: FrippEraSystemMode,
  allowBlend: boolean
): FrippEraSystemMode {
  if (sectionIndex === 0) return defaultMode;
  const u = seededUnit(seed, sectionIndex, 991102);
  if (!allowBlend || u > 0.38) return defaultMode;
  const modes: FrippEraSystemMode[] = ['red', 'discipline', 'loop'];
  const others = modes.filter((m) => m !== defaultMode);
  return others[Math.floor(u * others.length * 3) % others.length]!;
}

function paletteForEra(era: FrippEraSystemMode, center: string): readonly string[] {
  if (era === 'red') return RED_FIELD_PALETTE[center] ?? RED_FIELD_PALETTE.E!;
  if (era === 'loop') return LOOP_SKELETON[center] ?? LOOP_SKELETON.C!;
  return DISCIPLINE_PENTATONIC[center] ?? DISCIPLINE_PENTATONIC.C!;
}

function anchorBassToCenter(symbol: string, center: string): string {
  const stem = stemOnly(symbol);
  return `${stem}/${center}`;
}

function pickFieldSymbol(
  palette: readonly string[],
  center: string,
  seed: number,
  sectionIndex: number,
  destabilize: boolean,
  era: FrippEraSystemMode
): string {
  const u = seededUnit(seed, sectionIndex, destabilize ? 991201 : 991200);
  const pick = destabilize ? palette.filter((_, i) => i % 2 === 1) : palette.filter((_, i) => i % 2 === 0);
  const from = pick.length >= 2 ? pick : palette;
  const raw = from[Math.floor(u * from.length) % from.length]!;
  if (era === 'discipline' || era === 'loop') {
    return raw.includes('/') ? raw : anchorBassToCenter(raw, center);
  }
  return raw;
}

function buildInterlockCells(seed: number, sectionIndex: number, center: string): FrippInterlockCell[] {
  const palette = DISCIPLINE_PENTATONIC[center] ?? DISCIPLINE_PENTATONIC.C!;
  const uA = seededUnit(seed, sectionIndex, 991301);
  const uB = seededUnit(seed, sectionIndex, 991302);
  return [
    {
      guitarId: 'a',
      pitchCell: palette[Math.floor(uA * palette.length) % palette.length]!,
      rhythmBeats: [5, 7][Math.floor(uA * 2) % 2]!,
      registerOffset: 0,
      attackOffset: 0,
    },
    {
      guitarId: 'b',
      pitchCell: palette[(Math.floor(uB * palette.length) + 2) % palette.length]!,
      rhythmBeats: [7, 9][Math.floor(uB * 2) % 2]!,
      registerOffset: 12,
      attackOffset: 2,
    },
  ];
}

function buildLoopLayers(seed: number, sectionIndex: number, center: string): FrippLoopLayer[] {
  const palette = LOOP_SKELETON[center] ?? LOOP_SKELETON.C!;
  const layers: FrippLoopLayer[] = [];
  for (let i = 0; i < 5; i++) {
    const u = seededUnit(seed, sectionIndex * 10 + i, 991401);
    const densityClass: FrippLoopLayer['densityClass'] =
      i < 2 ? 'skeleton' : i < 4 ? 'color' : 'friction';
    layers.push({
      layerIndex: i + 1,
      pitchCenter: palette[Math.floor(u * palette.length) % palette.length]!,
      densityClass,
    });
  }
  return layers;
}

function sectionSpanBars(seed: number, sectionIndex: number, groupingBeats: number): number {
  const u = seededUnit(seed, sectionIndex, 991103);
  const moduleBars = Math.max(1, Math.ceil(groupingBeats / 4));
  if (u < 0.3) return moduleBars * 5;
  if (u < 0.55) return moduleBars * 7;
  if (u < 0.78) return moduleBars * 4;
  return moduleBars * 9;
}

export function resolveFrippSliceParams(genMeta: GenerationMetadata | undefined): FrippSliceParams {
  const fromMeta = genMeta?.frippSliceParams;
  const eraFromMeta = genMeta?.frippEraSystemMode;
  const d = DEFAULT_FRIPP_SLICE_PARAMS;
  const era: FrippEraSystemMode =
    eraFromMeta === 'red' || eraFromMeta === 'discipline' || eraFromMeta === 'loop'
      ? eraFromMeta
      : fromMeta?.eraSystemMode ?? d.eraSystemMode;
  if (!fromMeta) return { ...d, eraSystemMode: era };
  return {
    eraSystemMode: era,
    intervalFieldPriority: clamp01(fromMeta.intervalFieldPriority ?? d.intervalFieldPriority),
    interlockPatternRate: clamp01(fromMeta.interlockPatternRate ?? d.interlockPatternRate),
    dissonanceManagement: clamp01(fromMeta.dissonanceManagement ?? d.dissonanceManagement),
    loopAccumulationLogic: clamp01(fromMeta.loopAccumulationLogic ?? d.loopAccumulationLogic),
    asymmetricGroupingRate: clamp01(fromMeta.asymmetricGroupingRate ?? d.asymmetricGroupingRate),
  };
}

export function buildFrippSystemsPlan(
  seed: number,
  totalBars: number,
  tonicPc: number,
  params: FrippSliceParams = DEFAULT_FRIPP_SLICE_PARAMS
): FrippSystemsPlan {
  const sections: FrippSystemsSection[] = [];
  const crossAccentBars: number[] = [];
  const offBarPhraseStarts: number[] = [];
  const tritoneBars: number[] = [];
  const interlockBars: number[] = [];
  const loopLayerBars: number[] = [];
  const globalPitchCenter = pickPitchCenter(seed, 0, tonicPc);
  let bar = 1;
  let idx = 0;

  while (bar <= totalBars) {
    const remaining = totalBars - bar + 1;
    const pitchCenter = globalPitchCenter;
    const eraMode =
      totalBars <= 32 && idx > 0
        ? params.eraSystemMode
        : pickEraMode(seed, idx, params.eraSystemMode, idx > 0 && totalBars > 32);
    const palette = paletteForEra(eraMode, pitchCenter);
    const u = seededUnit(seed, idx, 991104);
    const groupingBeats = ASYMMETRIC_GROUPING_BEATS[Math.floor(u * ASYMMETRIC_GROUPING_BEATS.length) % ASYMMETRIC_GROUPING_BEATS.length]!;
    let span = Math.min(sectionSpanBars(seed, idx, groupingBeats), remaining);
    if (remaining - span > 0 && remaining - span < 2) span = remaining;
    const endBar = bar + span - 1;

    sections.push({
      index: idx,
      startBar: bar,
      endBar,
      eraMode,
      pitchCenter,
      primaryField: pickFieldSymbol(palette, pitchCenter, seed, idx, false, eraMode),
      secondaryField: pickFieldSymbol(palette, pitchCenter, seed, idx, true, eraMode),
      groupingBeats,
      interlockCells: eraMode === 'discipline' ? buildInterlockCells(seed, idx, pitchCenter) : [],
      loopLayers: eraMode === 'loop' ? buildLoopLayers(seed, idx, pitchCenter) : [],
    });

    if (bar !== 1 && seededUnit(seed, bar, 991501) < params.asymmetricGroupingRate * 0.55) {
      offBarPhraseStarts.push(bar);
    }

    for (let b = bar; b <= endBar; b++) {
      if (seededUnit(seed, b, 991502) < params.asymmetricGroupingRate * 0.62) {
        crossAccentBars.push(b);
      }
      if (eraMode === 'red' && seededUnit(seed, b, 991503) < params.dissonanceManagement * 0.7) {
        tritoneBars.push(b);
      }
      if (eraMode === 'discipline' && seededUnit(seed, b, 991504) < params.interlockPatternRate * 0.65) {
        interlockBars.push(b);
      }
      if (eraMode === 'loop' && seededUnit(seed, b, 991505) < params.loopAccumulationLogic * 0.6) {
        loopLayerBars.push(b);
      }
    }

    bar = endBar + 1;
    idx++;
  }

  return {
    sections,
    sliceParams: params,
    crossAccentBars,
    offBarPhraseStarts,
    tritoneBars,
    interlockBars,
    loopLayerBars,
  };
}

export function sectionForBar(plan: FrippSystemsPlan, bar: number): FrippSystemsSection | undefined {
  return plan.sections.find((s) => bar >= s.startBar && bar <= s.endBar);
}

function redDissonanceGrip(center: string, seed: number, bar: number): string {
  const palette = RED_FIELD_PALETTE[center] ?? RED_FIELD_PALETTE.E!;
  const u = seededUnit(seed, bar, 991601);
  const pick = palette.filter((c) => /dim|#|b/.test(c));
  const from = pick.length >= 2 ? pick : palette;
  return from[Math.floor(u * from.length) % from.length]!;
}

function intervalFieldRecolor(held: string, center: string, era: FrippEraSystemMode, seed: number, bar: number): string {
  const palette = paletteForEra(era, center);
  const idx = palette.indexOf(held);
  if (idx >= 0) return palette[(idx + 1) % palette.length]!;
  const u = seededUnit(seed, bar, 991602);
  return palette[Math.floor(u * palette.length) % palette.length]!;
}

function applyFrippSystemsLayers(
  out: string[],
  plan: FrippSystemsPlan,
  seed: number,
  receipts: string[],
  tonicPc: number | undefined,
  context: CompositionContext
): void {
  const p = plan.sliceParams;
  const tb = out.length;
  let loopLayerActive = 0;
  let loopSaturationReached = false;

  for (const sec of plan.sections) {
    receipts.push(
      `rf:section@${sec.startBar}-${sec.endBar}:era=${sec.eraMode};center=${sec.pitchCenter};group=${sec.groupingBeats}`
    );
    receipts.push(`rf:era_mode@${sec.startBar}:${sec.eraMode}`);

    if (sec.eraMode === 'discipline') {
      for (const cell of sec.interlockCells) {
        receipts.push(
          `rf:interlock@${sec.startBar}:guitar=${cell.guitarId};beats=${cell.rhythmBeats};reg=${cell.registerOffset};attack=${cell.attackOffset}`
        );
      }
    }

    if (sec.eraMode === 'loop') {
      for (const layer of sec.loopLayers) {
        receipts.push(
          `rf:loop_layer@${sec.startBar}:L${layer.layerIndex};class=${layer.densityClass};pitch=${layer.pitchCenter}`
        );
      }
    }

    for (let bar = sec.startBar; bar <= sec.endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const i = bar - 1;
      let sym = sec.primaryField;

      if (seededUnit(seed, bar, 991701) < p.intervalFieldPriority * 0.55) {
        sym = sec.primaryField;
        receipts.push(`rf:interval_field@${bar}`);
      } else if (seededUnit(seed, bar, 991702) < 0.5) {
        sym = sec.secondaryField;
        receipts.push(`rf:interval_field@${bar}:secondary`);
      }

      if (ASYMMETRIC_GROUPING_BEATS.includes(sec.groupingBeats as (typeof ASYMMETRIC_GROUPING_BEATS)[number])) {
        receipts.push(`rf:asym_group@${bar}:beats=${sec.groupingBeats}`);
      }

      if (plan.crossAccentBars.includes(bar) || seededUnit(seed, bar, 991703) < p.asymmetricGroupingRate * 0.58) {
        receipts.push(`rf:cross_accent@${bar}`);
      }

      if (plan.offBarPhraseStarts.includes(bar)) {
        receipts.push(`rf:off_bar_phrase@${bar}`);
      }

      if (sec.eraMode === 'red') {
        if (plan.tritoneBars.includes(bar) || seededUnit(seed, bar, 991704) < p.dissonanceManagement * 0.62) {
          sym = redDissonanceGrip(sec.pitchCenter, seed, bar);
          receipts.push(`rf:tritone@${bar}`);
          receipts.push(`rf:dissonance@${bar}:class=tritone`);
        }
        if (seededUnit(seed, bar, 991705) < p.dissonanceManagement * 0.45) {
          receipts.push(`rf:m2@${bar}`);
          receipts.push(`rf:dissonance@${bar}:class=m2`);
        }
        if (seededUnit(seed, bar, 991706) < 0.42) {
          receipts.push(`rf:unresolved_upper@${bar}`);
        }
      }

      if (sec.eraMode === 'discipline') {
        for (const cell of sec.interlockCells) {
          const beatPos = ((bar - sec.startBar) * 4 + cell.attackOffset) % cell.rhythmBeats;
          if (beatPos === 0) {
            receipts.push(`rf:interlock_guitar_${cell.guitarId}@${bar}:beats=${cell.rhythmBeats};cell=${cell.pitchCell}`);
            receipts.push(`rf:composite_pulse@${bar}`);
          }
        }
        if (plan.interlockBars.includes(bar) || seededUnit(seed, bar, 991707) < p.interlockPatternRate * 0.55) {
          sym = anchorBassToCenter(cellCompositeGrip(sec.interlockCells, seed, bar), sec.pitchCenter);
          receipts.push(`rf:interlock@${bar}`);
        }
        if (seededUnit(seed, bar, 991715) < p.dissonanceManagement * 0.48) {
          receipts.push(`rf:dissonance@${bar}:class=collision`);
        }
      }

      if (sec.eraMode === 'loop') {
        if (!loopSaturationReached && seededUnit(seed, bar, 991708) < p.loopAccumulationLogic * 0.55) {
          loopLayerActive = Math.min(5, loopLayerActive + 1);
          const layer = sec.loopLayers[loopLayerActive - 1];
          if (layer) {
            sym = layer.pitchCenter;
            receipts.push(`rf:loop_layer@${bar}:L${layer.layerIndex};transparent=true`);
            receipts.push(`rf:loop_transparency@${bar}`);
          }
          if (loopLayerActive >= 5) {
            loopSaturationReached = true;
            receipts.push(`rf:loop_saturation@${bar}`);
          }
        } else if (loopSaturationReached && seededUnit(seed, bar, 991709) < 0.55) {
          receipts.push(`rf:loop_decay@${bar}`);
          if (seededUnit(seed, bar, 991710) < 0.35) {
            loopLayerActive = Math.max(1, loopLayerActive - 1);
          }
        }
      }

      if (seededUnit(seed, bar, 991711) < 0.62) {
        receipts.push(`rf:melodic_cell@${bar}:interval=P4|P5|tritone`);
      }

      if (seededUnit(seed, bar, 991712) < 0.68) {
        receipts.push(`rf:process_audible@${bar}`);
      }

      if (looksHoldsworthRibbon(sym)) {
        sym = sec.primaryField;
        receipts.push(`rf:neg_holdsworth@${bar}`);
      }
      if (looksVerlaineSuspended(sym) && sec.eraMode !== 'loop') {
        if (seededUnit(seed, bar, 991713) < 0.55) {
          sym = intervalFieldRecolor(sym, sec.pitchCenter, sec.eraMode, seed, bar);
          receipts.push(`rf:neg_verlaine@${bar}`);
        }
      }
      if (looksMarrShimmer(sym) && sec.eraMode === 'discipline') {
        sym = sec.primaryField;
        receipts.push(`rf:neg_marr@${bar}`);
      }

      if (seededUnit(seed, bar, 991714) < Math.max(0.7, p.intervalFieldPriority * 0.55)) {
        receipts.push(`rf:weak_cadence@${bar}`);
      }

      if (!sym.includes('/')) {
        sym = anchorBassToCenter(sym, sec.pitchCenter);
      }

      out[i] = sym;
    }
  }

  if (tonicPc !== undefined) {
    for (let b = 1; b <= tb - 1; b++) {
      if (looksFunctionalDominantTonic(out, b, tonicPc)) {
        if (isProtectedBar(b, context) || isProtectedBar(b + 1, context)) continue;
        const sec = sectionForBar(plan, b);
        if (!sec) continue;
        out[b - 1] = sec.secondaryField;
        out[b] = sec.primaryField;
        receipts.push(`rf:suppress_vi@${b}`);
      }
    }
    for (let b = 1; b <= tb - 3; b++) {
      if (!looksBluesTurnaround(out, b, tonicPc)) continue;
      if (isProtectedBar(b, context)) continue;
      const sec = sectionForBar(plan, b);
      if (!sec) continue;
      for (let k = 0; k < 4; k++) {
        out[b + k - 1] = k % 2 === 0 ? sec.primaryField : sec.secondaryField;
      }
      receipts.push(`rf:neg_blues_turn@${b}`);
    }
  }
}

function cellCompositeGrip(cells: FrippInterlockCell[], seed: number, bar: number): string {
  const u = seededUnit(seed, bar, 991801);
  const cell = cells[Math.floor(u * cells.length) % cells.length]!;
  return cell.pitchCell;
}

export interface FrippHarmonyAccumulator {
  barsConsidered: number;
  intervalFieldTouches: number;
  interlockTouches: number;
  dissonanceTouches: number;
  melodicCellTouches: number;
  asymGroupTouches: number;
  processAudibleTouches: number;
}

export function createFrippHarmonyAccumulator(): FrippHarmonyAccumulator {
  return {
    barsConsidered: 0,
    intervalFieldTouches: 0,
    interlockTouches: 0,
    dissonanceTouches: 0,
    melodicCellTouches: 0,
    asymGroupTouches: 0,
    processAudibleTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: FrippHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
}

export function accumulateFrippHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: FrippHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function rateFromReceipts(receipts: readonly string[], prefix: string, bars: number): number {
  if (bars <= 0) return 0;
  const touches = receipts.filter((r) => r.startsWith(prefix)).length;
  return Math.min(1, touches / bars);
}

export function hasInterlockReceipts(receipts: readonly string[]): boolean {
  return receipts.some((r) => r.startsWith('rf:interlock@') || r.startsWith('rf:interlock_guitar_'));
}

export function hasAsymmetricGroupingReceipts(receipts: readonly string[]): boolean {
  return receipts.some((r) => r.startsWith('rf:asym_group@') || r.startsWith('rf:cross_accent@'));
}

export function countTritoneM2Receipts(receipts: readonly string[]): number {
  return receipts.filter((r) => r.startsWith('rf:tritone@') || r.startsWith('rf:m2@')).length;
}

export function hasLoopTransparencyReceipts(receipts: readonly string[]): boolean {
  return receipts.some((r) => r.startsWith('rf:loop_transparency@') || r.startsWith('rf:loop_layer@'));
}

export function minFrippSectionSpan(plan: FrippSystemsPlan | undefined): number {
  if (!plan?.sections.length) return 0;
  return Math.min(...plan.sections.map((s) => s.endBar - s.startBar + 1));
}

/** Primary songwriter or harmonicVoice selects Fripp harmony authority (systems slice). */
export function isFrippHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  // Canonical id is fripp; robert_fripp is legacy synonym (local only — no registry alias table).
  return primary === 'fripp' || voice === 'fripp' || voice === 'robert_fripp';
}

export function precomputeFrippEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context) ?? 4;
  const params = resolveFrippSliceParams(genMeta);
  genMeta.frippSliceParams = params;
  genMeta.frippEraSystemMode = params.eraSystemMode;

  const plan = buildFrippSystemsPlan(seed, tb, tonicPc, params);
  genMeta.frippSystemsPlan = plan;

  const receipts: string[] = [];
  receipts.push(
    `rf:params=era:${params.eraSystemMode};ifp:${params.intervalFieldPriority.toFixed(2)};ipr:${params.interlockPatternRate.toFixed(2)};dm:${params.dissonanceManagement.toFixed(2)};lal:${params.loopAccumulationLogic.toFixed(2)};agr:${params.asymmetricGroupingRate.toFixed(2)}`
  );

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    raw.push(resolveBarSymbol(context, b).symbol);
  }

  const out = [...raw];
  applyFrippSystemsLayers(out, plan, seed, receipts, tonicPc, context);

  genMeta.frippEffectiveHarmonyBars = out;
  genMeta.frippDeviceReceipts = receipts;
}

export function finalizeFrippMetadata(
  metadata: GenerationMetadata,
  acc: FrippHarmonyAccumulator,
  deviceReceipts?: string[]
): void {
  const flat = deviceReceipts ?? [...(metadata.frippDeviceReceipts ?? [])];
  const plan = metadata.frippSystemsPlan;
  const params = metadata.frippSliceParams ?? DEFAULT_FRIPP_SLICE_PARAMS;
  const bars = metadata.frippEffectiveHarmonyBars?.length ?? (acc.barsConsidered || 32);

  acc.intervalFieldTouches = flat.filter((r) => r.startsWith('rf:interval_field@')).length;
  acc.interlockTouches = flat.filter((r) => r.startsWith('rf:interlock@')).length;
  acc.dissonanceTouches = flat.filter((r) => r.startsWith('rf:dissonance@')).length;
  acc.melodicCellTouches = flat.filter((r) => r.startsWith('rf:melodic_cell@')).length;
  acc.asymGroupTouches = flat.filter((r) => r.startsWith('rf:asym_group@')).length;
  acc.processAudibleTouches = flat.filter((r) => r.startsWith('rf:process_audible@')).length;

  const intervalFieldHarmony = Math.min(
    1,
    params.intervalFieldPriority * 0.85 +
      rateFromReceipts(flat, 'rf:interval_field@', bars) * 0.4 +
      rateFromReceipts(flat, 'rf:weak_cadence@', bars) * 0.15
  );
  const interlockPattern = hasInterlockReceipts(flat)
    ? Math.min(
        1,
        params.interlockPatternRate * 0.82 + rateFromReceipts(flat, 'rf:interlock@', bars) * 0.35
      )
    : params.eraSystemMode === 'discipline'
      ? 0
      : 0.5;
  const dissonanceManagement = Math.min(
    1,
    params.dissonanceManagement * 0.8 +
      countTritoneM2Receipts(flat) / Math.max(1, bars) * 0.5 +
      rateFromReceipts(flat, 'rf:dissonance@', bars) * 0.25
  );
  const melodicIntervalCell = Math.min(
    1,
    rateFromReceipts(flat, 'rf:melodic_cell@', bars) * 0.95 + params.intervalFieldPriority * 0.3
  );
  const asymmetricGrouping = hasAsymmetricGroupingReceipts(flat)
    ? Math.min(
        1,
        params.asymmetricGroupingRate * 0.82 +
          rateFromReceipts(flat, 'rf:asym_group@', bars) * 0.3 +
          rateFromReceipts(flat, 'rf:cross_accent@', bars) * 0.2
      )
    : 0;
  const processAudibility = Math.min(
    1,
    rateFromReceipts(flat, 'rf:process_audible@', bars) * 0.95 + params.intervalFieldPriority * 0.25
  );
  const texturalDensityControl = Math.min(
    1,
    params.dissonanceManagement * 0.7 +
      (flat.some((r) => r.startsWith('rf:loop_saturation@')) ? 0.2 : 0.1)
  );

  const eraMode = params.eraSystemMode;
  const tritoneRetention =
    eraMode === 'red'
      ? Math.min(1, countTritoneM2Receipts(flat) / Math.max(1, bars) + params.dissonanceManagement * 0.5)
      : undefined;
  const compositePulse =
    eraMode === 'discipline'
      ? Math.min(1, rateFromReceipts(flat, 'rf:composite_pulse@', bars) + interlockPattern * 0.5)
      : undefined;
  const layerTransparency =
    eraMode === 'loop'
      ? Math.min(1, hasLoopTransparencyReceipts(flat) ? params.loopAccumulationLogic * 0.9 : 0)
      : undefined;

  metadata.frippDiagnostics = {
    songwriterId: 'fripp',
    barsConsidered: Math.max(acc.barsConsidered, bars),
    intervalFieldTouches: acc.intervalFieldTouches,
    interlockTouches: acc.interlockTouches,
    dissonanceTouches: acc.dissonanceTouches,
    melodicCellTouches: acc.melodicCellTouches,
    asymGroupTouches: acc.asymGroupTouches,
    processAudibleTouches: acc.processAudibleTouches,
    minSectionSpan: minFrippSectionSpan(plan),
    sliceParams: { ...params },
    intervalFieldHarmony,
    interlockPattern,
    dissonanceManagement,
    melodicIntervalCell,
    asymmetricGrouping,
    processAudibility,
    texturalDensityControl,
    tritoneRetention,
    compositePulse,
    layerTransparency,
    eraMode,
    deviceReceipts: flat.length ? flat : undefined,
  };
  metadata.frippSliceReceipt = [
    'Robert Fripp (era-dependent process systems slice)',
    `era=${params.eraSystemMode}`,
    `sections=${plan?.sections.length ?? 0}`,
    `ifp=${params.intervalFieldPriority.toFixed(2)}`,
    `interlock≈${acc.interlockTouches}`,
    `process≈${acc.processAudibleTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.slice(0, 8).join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}
