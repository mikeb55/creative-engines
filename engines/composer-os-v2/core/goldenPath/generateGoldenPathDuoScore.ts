/**
 * Composer OS V2 — Golden path duo score generator
 * Motif-driven melody, style-influenced, section-aware (Guitar–Bass Duo).
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel, PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { createMeasure, createNote, createRest, addEvent, createScore } from '../score-model/scoreEventBuilder';
import type { GuitarProfile, BassProfile } from '../instrument-profiles/instrumentProfileTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { GUITAR_BASS_DUO_BASS_PART_NAME } from '../instrument-profiles/guitarBassDuoExportNames';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import type { DensityCurvePlan } from '../density/densityCurveTypes';
import type { GuitarBehaviourPlan, BassBehaviourPlan } from '../instrument-behaviours/behaviourTypes';
import type { RhythmicConstraints } from '../rhythm-engine/rhythmTypes';
import type { MotifTrackerState, PlacedMotif } from '../motif/motifTypes';
import { getDensityForBar } from '../density/densityCurvePlanner';
import type { StyleStack } from '../style-modules/styleModuleTypes';
import type { InteractionPlan } from '../interaction/interactionTypes';
import { getInteractionForBar } from '../interaction/interactionPlanner';
import { applyPerformancePass } from '../performance/performancePass';
import {
  chordTonesForGoldenChord,
  pickGuideTone,
  approachFromBelow,
  clampPitch,
  seededUnit,
} from './guitarBassDuoHarmony';

const GUITAR_FLOOR_FOR_SEPARATION = 60;

const CHORD_ROOTS: Record<string, number> = {
  Dmin9: 38,
  Dm9: 38,
  'D-9': 38,
  G13: 43,
  G7: 43,
  Cmaj9: 36,
  Cmaj7: 36,
  C: 36,
  A7alt: 45,
  A7: 45,
};

function chordForBar(barIndex: number): string {
  if (barIndex <= 2) return 'Dmin9';
  if (barIndex <= 4) return 'G13';
  if (barIndex <= 6) return 'Cmaj9';
  return 'A7alt';
}

function rehearsalForBar(barIndex: number): string | undefined {
  if (barIndex === 1) return 'A';
  if (barIndex === 5) return 'B';
  return undefined;
}

function getRegisterForBar(guitarMap: InstrumentRegisterMap, bar: number): [number, number] {
  const section = bar <= 4 ? 'A' : 'B';
  const plan = guitarMap.sections.find((s) => s.sectionLabel === section);
  return plan?.preferredZone ?? [55, 79];
}

function getBassRegisterForBar(bassMap: InstrumentRegisterMap, bar: number): [number, number] {
  const section = bar <= 4 ? 'A' : 'B';
  const plan = bassMap.sections.find((s) => s.sectionLabel === section);
  return plan?.preferredZone ?? [36, 55];
}

function getPlacementsForBar(placements: PlacedMotif[], bar: number): PlacedMotif[] {
  return placements.filter((p) => p.startBar === bar);
}

/** Conversational stagger: seed-driven call/response; avoids both on beat 1. */
function staggerForBar(bar: number, seed: number): { guitar: number; bass: number } {
  if (bar <= 4) {
    const aPatterns = [
      { guitar: 0, bass: 0.5 },
      { guitar: 0.5, bass: 0 },
      { guitar: 0.25, bass: 0.75 },
      { guitar: 0.75, bass: 0.25 },
    ];
    return aPatterns[(bar + seed * 3) % 4];
  }
  const bPatterns = [
    { guitar: 0, bass: 0.5 },
    { guitar: 0.5, bass: 0 },
    { guitar: 0, bass: 0.25 },
    { guitar: 0.25, bass: 0.5 },
    { guitar: 0.5, bass: 0.25 },
  ];
  return bPatterns[(bar + seed * 2) % 5];
}

interface StyleHints {
  metheny?: { attackDensityReduced?: boolean; lyricalMotif?: boolean };
  bacharach?: { phraseAsymmetry?: boolean; chromaticPassingWeight?: number };
}

function readStyleHints(context: CompositionContext): StyleHints {
  const so = (context as { styleOverrides?: Record<string, unknown> }).styleOverrides;
  return {
    metheny: so?.metheny as StyleHints['metheny'],
    bacharach: so?.bacharach as StyleHints['bacharach'],
  };
}

/** Quarter-beat grid — keeps MusicXML division sums stable. */
function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

/**
 * One bar of guaranteed Bacharach signal: chromatic neighbour + 3+5 beat asymmetry, off-grid onsets.
 * Used on bar 2 (section A) and bar 6 (section B) when Bacharach is active — matches bacharachSignal / moduleValidation.
 */
function buildBacharachAnchorMeasure(
  barIndex: number,
  chord: string,
  rehearsal: string | undefined,
  low: number,
  high: number
): MeasureModel {
  const m = createMeasure(barIndex, chord, rehearsal);
  const tones = chordTonesForGoldenChord(chord);
  const target = clampPitch(tones.third, low, high);
  const pass = target - 1;
  const fifth = clampPitch(tones.fifth, low, high);
  addEvent(m, createRest(0, 0.5));
  addEvent(m, createNote(pass, 0.5, 0.25));
  addEvent(m, createNote(target, 0.75, 1.25));
  addEvent(m, createRest(2, 0.5));
  addEvent(m, createNote(fifth, 2.5, 1.5));
  return m;
}

function buildGuitarPart(
  context: CompositionContext,
  _guitarPlan: GuitarBehaviourPlan,
  guitarMap: InstrumentRegisterMap,
  densityPlan: DensityCurvePlan,
  rhythm: RhythmicConstraints,
  motifState: MotifTrackerState,
  interactionPlan?: InteractionPlan
): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is GuitarProfile => p.instrumentIdentity === 'clean_electric_guitar'
  ) ?? CLEAN_ELECTRIC_GUITAR;

  const seed = context.seed;
  const hints = readStyleHints(context);
  const measures: MeasureModel[] = [];
  const [baseLow] = profile.preferredMelodicZone;
  const effectiveBase = Math.max(baseLow, GUITAR_FLOOR_FOR_SEPARATION);

  for (let b = 1; b <= 8; b++) {
    const m = createMeasure(b, chordForBar(b), rehearsalForBar(b));
    const placements = getPlacementsForBar(motifState.placements, b);
    const density = getDensityForBar(densityPlan, b);
    const interaction = interactionPlan ? getInteractionForBar(interactionPlan, b) : undefined;
    const reduceAttack = interaction?.coupling?.guitarReduceAttack;
    const stagger = staggerForBar(b, seed);
    const [zLow, zHigh] = getRegisterForBar(guitarMap, b);
    const sectionBump = b > 4 ? 5 : 0;
    const effectiveLow = Math.max(zLow, effectiveBase) + sectionBump;
    const effectiveHigh = Math.min(79, zHigh + sectionBump);
    const useOffbeat = (rhythm.offbeatWeight > 0.2 && (b === 2 || b === 4 || b === 6 || b === 8)) || !!reduceAttack;
    const meth = hints.metheny;
    const bach = hints.bacharach;

    if (bach && (b === 2 || b === 6)) {
      measures.push(
        buildBacharachAnchorMeasure(b, chordForBar(b), rehearsalForBar(b), effectiveLow, effectiveHigh)
      );
      continue;
    }

    if (placements.length > 0) {
      const raw: { pitch: number; start: number; dur: number }[] = [];
      for (const pl of placements) {
        for (const n of pl.notes) {
          let pitch = Math.max(effectiveLow, Math.min(effectiveHigh, n.pitch));
          const dur = Math.min(n.duration, Math.max(0, 4 - n.startBeat));
          if (dur > 0 && n.startBeat < 4) {
            raw.push({ pitch, start: n.startBeat + stagger.guitar, dur });
          }
        }
      }
      raw.sort((a, b2) => a.start - b2.start);
      let cursor = 0;
      for (const e of raw) {
        const start = Math.max(qBeat(e.start), cursor);
        if (start > cursor) {
          addEvent(m, createRest(cursor, start - cursor));
        }
        let dur = qBeat(Math.min(e.dur, 4 - start));
        if (meth?.attackDensityReduced && dur > 0.5) {
          dur = Math.min(dur, 1.25);
        }
        dur = qBeat(Math.min(dur, 4 - start));
        if (dur <= 0) continue;
        addEvent(m, createNote(e.pitch, start, dur));
        cursor = start + dur;
        if (cursor >= 4 - 1e-6) break;
      }
      if (reduceAttack && cursor < 3) {
        addEvent(m, createRest(cursor, 4 - cursor));
      } else if (cursor < 4 - 1e-4) {
        const tail = 4 - cursor;
        if (tail >= 1.5 && seededUnit(seed, b, 5) < 0.35) {
          addEvent(m, createRest(cursor, 0.5));
          addEvent(m, createNote(effectiveLow + 7, cursor + 0.5, tail - 0.5));
        } else {
          addEvent(m, createNote(effectiveLow + (b % 3 === 0 ? 9 : 5), cursor, tail));
        }
      }
    } else {
      const dyadBar = b === 4 || b === 8;
      if (density === 'sparse') {
        if (useOffbeat) {
          const g = stagger.guitar;
          const head = 0.5 + g * 0.5;
          addEvent(m, createRest(0, head));
          addEvent(m, createNote(effectiveLow + 5, head, 1.25));
          const t1 = head + 1.25;
          addEvent(m, createRest(t1, 1));
          const t2 = t1 + 1;
          addEvent(m, createNote(effectiveLow + 9, t2, 4 - t2));
        } else {
          const g = stagger.guitar;
          const t0 = 0.75 + g;
          addEvent(m, createRest(0, t0));
          addEvent(m, createNote(effectiveLow + 7, t0, 2));
          const t2 = t0 + 2;
          addEvent(m, createNote(effectiveLow + 4, t2, 4 - t2));
        }
      } else if (density === 'medium') {
        if (dyadBar) {
          addEvent(m, createRest(0, 0.5));
          addEvent(m, createNote(effectiveLow + 4, 0.5, 1));
          addEvent(m, createNote(effectiveLow + 7, 1.5, 1));
          addEvent(m, createRest(2.5, 0.5));
          addEvent(m, createNote(effectiveLow + 9, 3, 1));
        } else {
          const g = stagger.guitar;
          if (g > 0) {
            addEvent(m, createRest(0, g));
          }
          addEvent(m, createNote(effectiveLow + 5, g, 1.5));
          addEvent(m, createRest(1.5 + g, 1));
          const tLast = 2.5 + g;
          addEvent(m, createNote(effectiveLow + 8, tLast, 4 - tLast));
        }
      } else {
        const g = stagger.guitar;
        if (g > 0) {
          addEvent(m, createRest(0, g));
        }
        addEvent(m, createNote(effectiveLow + 7, g, 1));
        addEvent(m, createNote(effectiveLow + 5, g + 1, 1));
        addEvent(m, createRest(g + 2, 0.5));
        const tLast = g + 2.5;
        addEvent(m, createNote(effectiveLow + 9, tLast, 4 - tLast));
      }
    }

    measures.push(m);
  }

  return {
    id: 'guitar',
    name: 'Clean Electric Guitar',
    instrumentIdentity: profile.instrumentIdentity,
    midiProgram: profile.midiProgram,
    clef: 'treble',
    measures,
  };
}

/** Four quarter-style bass slices: three full beats + remainder — avoids MusicXML rounding drift. */
function addBassQuarterLine(m: MeasureModel, start: number, p: [number, number, number, number]): void {
  if (start > 0) {
    addEvent(m, createRest(0, start));
  }
  let t = start;
  for (let i = 0; i < 3; i++) {
    addEvent(m, createNote(p[i], t, 1));
    t += 1;
  }
  addEvent(m, createNote(p[3], t, 4 - t));
}

function buildBassPart(
  context: CompositionContext,
  _bassPlan: BassBehaviourPlan,
  bassMap: InstrumentRegisterMap,
  motifState: MotifTrackerState,
  interactionPlan?: InteractionPlan
): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is BassProfile => p.instrumentIdentity === 'acoustic_upright_bass'
  ) ?? ACOUSTIC_UPRIGHT_BASS;

  const [walkLow, walkHigh] = profile.preferredWalkingZone;
  const bassCeiling = Math.min(walkHigh, 52);
  const seed = context.seed;
  const measures: MeasureModel[] = [];

  for (let b = 1; b <= 8; b++) {
    const chord = chordForBar(b);
    const tones = chordTonesForGoldenChord(chord);
    const root = CHORD_ROOTS[chord] ?? tones.root;
    const m = createMeasure(b, chord, rehearsalForBar(b));
    const [low, high] = getBassRegisterForBar(bassMap, b);
    const effectiveHigh = Math.min(high, bassCeiling);
    const rootClamped = clampPitch(root, Math.max(walkLow, low), Math.min(effectiveHigh, high));
    const guide = clampPitch(pickGuideTone(tones, b, seed), walkLow, effectiveHigh);
    const fifth = clampPitch(rootClamped + 5, walkLow, effectiveHigh);
    const third = clampPitch(tones.third, walkLow, effectiveHigh);
    const seventh = clampPitch(tones.seventh, walkLow, effectiveHigh);

    const interaction = interactionPlan ? getInteractionForBar(interactionPlan, b) : undefined;
    const simplify = interaction?.coupling?.bassSimplify;
    const stagger = staggerForBar(b, seed);
    const placements = getPlacementsForBar(motifState.placements, b);
    const u = seededUnit(seed, b, 13);
    const uFirst = seededUnit(seed, b, 17);

    const startNonRoot = u < 0.66 && !simplify;
    let firstPitch = rootClamped;
    if (startNonRoot) {
      if (uFirst < 0.38) firstPitch = third;
      else if (uFirst < 0.78) firstPitch = guide;
      else firstPitch = fifth;
    }
    const firstStart = stagger.bass;

    if (placements.length > 0 && placements[0].notes.length > 0 && !simplify) {
      const first = placements[0].notes[0].pitch;
      const bassEcho = clampPitch(first - 12, walkLow, effectiveHigh);
      const landM = seededUnit(seed, b, 47) < 0.72 ? fifth : rootClamped;
      const line: [number, number, number, number] =
        seededUnit(seed, b, 19) < 0.5
          ? [firstPitch, guide, bassEcho, fifth]
          : [firstPitch, seventh, guide, landM];
      addBassQuarterLine(m, firstStart, line);
    } else if (simplify) {
      if (firstStart > 0) {
        addEvent(m, createRest(0, firstStart));
      }
      const t0 = firstStart;
      const span = 4 - firstStart;
      const half = Math.round((span / 2) * 4) / 4;
      const half2 = span - half;
      addEvent(m, createNote(rootClamped, t0, half));
      addEvent(m, createNote(fifth, t0 + half, half2));
    } else if (u < 0.82) {
      const ap = approachFromBelow(rootClamped, walkLow, effectiveHigh);
      if (firstStart > 0) {
        addEvent(m, createRest(0, firstStart));
      }
      const t0 = firstStart;
      addEvent(m, createNote(ap, t0, 0.25));
      addEvent(m, createNote(rootClamped, t0 + 0.25, 0.75));
      addEvent(m, createNote(guide, t0 + 1, 1));
      addEvent(m, createNote(fifth, t0 + 2, 1));
      const lastDur = 4 - (t0 + 3);
      const lastPitch = seededUnit(seed, b, 43) < 0.62 ? fifth : rootClamped;
      addEvent(m, createNote(lastPitch, t0 + 3, lastDur));
    } else {
      const uLine = seededUnit(seed, b, 31);
      const land = seededUnit(seed, b, 41) < 0.72 ? fifth : rootClamped;
      const line: [number, number, number, number] =
        uLine < 0.34
          ? [firstPitch, seventh, guide, land]
          : uLine < 0.67
            ? [third, fifth, guide, land]
            : [firstPitch, guide, fifth, land];
      addBassQuarterLine(m, firstStart, line);
    }

    measures.push(m);
  }

  return {
    id: 'bass',
    name: GUITAR_BASS_DUO_BASS_PART_NAME,
    instrumentIdentity: profile.instrumentIdentity,
    midiProgram: profile.midiProgram,
    clef: 'bass',
    measures,
  };
}

export interface GoldenPathPlans {
  sections: import('../section-roles/sectionRoleTypes').SectionWithRole[];
  guitarMap: InstrumentRegisterMap;
  bassMap: InstrumentRegisterMap;
  densityPlan: DensityCurvePlan;
  guitarBehaviour: GuitarBehaviourPlan;
  bassBehaviour: BassBehaviourPlan;
  rhythmConstraints: RhythmicConstraints;
  motifState: MotifTrackerState;
  styleStack?: StyleStack;
  interactionPlan?: InteractionPlan;
  scoreTitle: string;
}

/**
 * Generate golden path duo score. `context` must already include any `applyStyleStack` transforms.
 */
export function generateGoldenPathDuoScore(context: CompositionContext, plans: GoldenPathPlans): ScoreModel {
  const guitarPart = buildGuitarPart(
    context,
    plans.guitarBehaviour,
    plans.guitarMap,
    plans.densityPlan,
    plans.rhythmConstraints,
    plans.motifState,
    plans.interactionPlan
  );
  const bassPart = buildBassPart(
    context,
    plans.bassBehaviour,
    plans.bassMap,
    plans.motifState,
    plans.interactionPlan
  );
  const rawScore = createScore(plans.scoreTitle, [guitarPart, bassPart], { tempo: 120 });
  return applyPerformancePass(rawScore);
}
