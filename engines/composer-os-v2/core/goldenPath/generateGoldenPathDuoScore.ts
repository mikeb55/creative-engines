/**
 * Composer OS V2 — Golden path duo score generator
 * Motif-driven melody, style-influenced, section-aware.
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel, PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { createMeasure, createNote, createRest, addEvent, createScore } from '../score-model/scoreEventBuilder';
import type { GuitarProfile, BassProfile } from '../instrument-profiles/instrumentProfileTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { GUITAR_BASS_DUO_BASS_PART_NAME } from '../instrument-profiles/guitarBassDuoExportNames';
import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import type { DensityCurvePlan } from '../density/densityCurveTypes';
import type { GuitarBehaviourPlan, BassBehaviourPlan } from '../instrument-behaviours/behaviourTypes';
import type { RhythmicConstraints } from '../rhythm-engine/rhythmTypes';
import type { MotifTrackerState, PlacedMotif } from '../motif/motifTypes';
import { getDensityForBar } from '../density/densityCurvePlanner';
import { applyStyleStack } from '../style-modules/styleModuleRegistry';
import type { StyleStack } from '../style-modules/styleModuleTypes';
import type { InteractionPlan } from '../interaction/interactionTypes';
import { getInteractionForBar } from '../interaction/interactionPlanner';
import { applyPerformancePass } from '../performance/performancePass';

/** Min guitar pitch to maintain register separation from bass (bass typically to 55). */
const GUITAR_FLOOR_FOR_SEPARATION = 60;

const CHORD_ROOTS: Record<string, number> = {
  'Dmin9': 38, 'Dm9': 38, 'D-9': 38,
  'G13': 43, 'G7': 43,
  'Cmaj9': 36, 'Cmaj7': 36, 'C': 36,
  'A7alt': 45, 'A7': 45,
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

/** Build guitar part: motif-driven where placed, filler elsewhere. Enforces register separation. */
function buildGuitarPart(
  guitarPlan: GuitarBehaviourPlan,
  guitarMap: InstrumentRegisterMap,
  densityPlan: DensityCurvePlan,
  rhythm: RhythmicConstraints,
  motifState: MotifTrackerState,
  interactionPlan?: InteractionPlan
): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is GuitarProfile => p.instrumentIdentity === 'clean_electric_guitar'
  ) ?? CLEAN_ELECTRIC_GUITAR;

  const measures: MeasureModel[] = [];
  const [baseLow] = profile.preferredMelodicZone;
  const effectiveLow = Math.max(baseLow, GUITAR_FLOOR_FOR_SEPARATION);

  for (let b = 1; b <= 8; b++) {
    const m = createMeasure(b, chordForBar(b), rehearsalForBar(b));
    const placements = getPlacementsForBar(motifState.placements, b);
    const density = getDensityForBar(densityPlan, b);
    const interaction = interactionPlan ? getInteractionForBar(interactionPlan, b) : undefined;
    const reduceAttack = interaction?.coupling?.guitarReduceAttack;
    const useOffbeat = (rhythm.offbeatWeight > 0.2 && (b === 2 || b === 4 || b === 6 || b === 8)) || !!reduceAttack;

    if (placements.length > 0) {
      const raw: { pitch: number; start: number; dur: number }[] = [];
      for (const pl of placements) {
        for (const n of pl.notes) {
          const pitch = Math.max(effectiveLow, Math.min(79, n.pitch));
          const dur = Math.min(n.duration, Math.max(0, 4 - n.startBeat));
          if (dur > 0 && n.startBeat < 4) {
            raw.push({ pitch, start: n.startBeat, dur });
          }
        }
      }
      raw.sort((a, b) => a.start - b.start);
      let cursor = 0;
      for (const e of raw) {
        const start = Math.max(e.start, cursor);
        if (start > cursor) {
          addEvent(m, createRest(cursor, start - cursor));
        }
        const dur = Math.min(e.dur, 4 - start);
        if (dur <= 0) continue;
        addEvent(m, createNote(e.pitch, start, dur));
        cursor = start + dur;
      }
      if (cursor < 4 - 1e-4) {
        addEvent(m, createNote(effectiveLow + 5, cursor, 4 - cursor));
      }
    } else {
      if (density === 'sparse') {
        if (useOffbeat) {
          addEvent(m, createRest(0, 0.5));
          addEvent(m, createNote(effectiveLow + 5, 0.5, 1.5));
          addEvent(m, createNote(effectiveLow + 7, 2, 2));
        } else {
          addEvent(m, createNote(effectiveLow + 7, 0, 2));
          addEvent(m, createNote(effectiveLow + 9, 2, 2));
        }
      } else if (density === 'medium') {
        addEvent(m, createNote(effectiveLow + 5, 0, 4));
      } else {
        addEvent(m, createNote(effectiveLow + 7, 0, 2));
        addEvent(m, createNote(effectiveLow + 4, 2, 2));
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

/** Build bass part: anchor + light motif echoes. Staggered entries in call_response. */
function buildBassPart(
  bassPlan: BassBehaviourPlan,
  bassMap: InstrumentRegisterMap,
  motifState: MotifTrackerState,
  interactionPlan?: InteractionPlan
): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is BassProfile => p.instrumentIdentity === 'acoustic_upright_bass'
  ) ?? ACOUSTIC_UPRIGHT_BASS;

  const [walkLow, walkHigh] = profile.preferredWalkingZone;
  const bassCeiling = Math.min(walkHigh, 52);
  const measures: MeasureModel[] = [];

  for (let b = 1; b <= 8; b++) {
    const chord = chordForBar(b);
    const root = CHORD_ROOTS[chord] ?? 48;
    const m = createMeasure(b, chord, rehearsalForBar(b));
    const [low, high] = getBassRegisterForBar(bassMap, b);
    const effectiveHigh = Math.min(high, bassCeiling);
    const rootClamped = Math.max(walkLow, Math.min(effectiveHigh, Math.max(low, Math.min(high, root))));

    const interaction = interactionPlan ? getInteractionForBar(interactionPlan, b) : undefined;
    const simplify = interaction?.coupling?.bassSimplify;
    const isCallResponse = interaction?.mode === 'call_response';

    const placements = getPlacementsForBar(motifState.placements, b);
    if (placements.length > 0 && placements[0].notes.length > 0 && !simplify) {
      const first = placements[0].notes[0].pitch;
      const bassEcho = Math.max(walkLow, Math.min(effectiveHigh, first - 12));
      const beatOffset = isCallResponse && (b === 6 || b === 8) ? 0.5 : 0;
      if (beatOffset > 0) {
        addEvent(m, createRest(0, 0.5));
        addEvent(m, createNote(rootClamped, 0.5, 0.5));
        addEvent(m, createNote(bassEcho, 1, 1));
        addEvent(m, createNote(rootClamped, 2, 1));
        addEvent(m, createNote(rootClamped + 5, 3, 1));
      } else {
        addEvent(m, createNote(rootClamped, 0, 1));
        addEvent(m, createNote(bassEcho, 1, 1));
        addEvent(m, createNote(rootClamped, 2, 1));
        addEvent(m, createNote(rootClamped + 5, 3, 1));
      }
    } else if (simplify) {
      const fifth = Math.min(effectiveHigh, rootClamped + 5);
      addEvent(m, createNote(rootClamped, 0, 2));
      addEvent(m, createNote(fifth, 2, 2));
    } else {
      const beatOffset = isCallResponse && (b === 6 || b === 8) ? 0.5 : 0;
      if (beatOffset > 0) {
        addEvent(m, createRest(0, 0.5));
        addEvent(m, createNote(rootClamped, 0.5, 0.5));
        addEvent(m, createNote(rootClamped + 7, 1, 1));
        addEvent(m, createNote(rootClamped, 2, 1));
        addEvent(m, createNote(rootClamped + 5, 3, 1));
      } else {
        addEvent(m, createNote(rootClamped, 0, 1));
        addEvent(m, createNote(rootClamped + 7, 1, 1));
        addEvent(m, createNote(rootClamped, 2, 1));
        addEvent(m, createNote(rootClamped + 5, 3, 1));
      }
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
  sections: SectionWithRole[];
  guitarMap: InstrumentRegisterMap;
  bassMap: InstrumentRegisterMap;
  densityPlan: DensityCurvePlan;
  guitarBehaviour: GuitarBehaviourPlan;
  bassBehaviour: BassBehaviourPlan;
  rhythmConstraints: RhythmicConstraints;
  motifState: MotifTrackerState;
  styleStack?: StyleStack;
  interactionPlan?: InteractionPlan;
}

/**
 * Generate golden path duo score.
 */
export function generateGoldenPathDuoScore(context: CompositionContext, plans: GoldenPathPlans): ScoreModel {
  const styleContext = plans.styleStack
    ? applyStyleStack(context, plans.styleStack)
    : context;

  const guitarPart = buildGuitarPart(
    plans.guitarBehaviour,
    plans.guitarMap,
    plans.densityPlan,
    plans.rhythmConstraints,
    plans.motifState,
    plans.interactionPlan
  );
  const bassPart = buildBassPart(plans.bassBehaviour, plans.bassMap, plans.motifState, plans.interactionPlan);
  const rawScore = createScore('Golden Path Duo', [guitarPart, bassPart], { tempo: 120 });
  return applyPerformancePass(rawScore);
}
