/**
 * Composer OS V2 — Golden path duo score generator
 * Uses section roles, density, register maps, instrument behaviours, rhythm.
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel, PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { createMeasure, createNote, addEvent, createScore } from '../score-model/scoreEventBuilder';
import type { GuitarProfile, BassProfile } from '../instrument-profiles/instrumentProfileTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import type { InstrumentRegisterMap } from '../register-map/registerMapTypes';
import type { DensityCurvePlan } from '../density/densityCurveTypes';
import type { GuitarBehaviourPlan, BassBehaviourPlan } from '../instrument-behaviours/behaviourTypes';
import type { RhythmicConstraints } from '../rhythm-engine/rhythmTypes';
import { getDensityForBar } from '../density/densityCurvePlanner';

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

/** Build guitar part using behaviour plan, register map, density, rhythm. */
function buildGuitarPart(
  guitarPlan: GuitarBehaviourPlan,
  guitarMap: InstrumentRegisterMap,
  densityPlan: DensityCurvePlan,
  rhythm: RhythmicConstraints
): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is GuitarProfile => p.instrumentIdentity === 'clean_electric_guitar'
  ) ?? CLEAN_ELECTRIC_GUITAR;

  const measures: MeasureModel[] = [];
  const [baseLow] = profile.preferredMelodicZone;

  for (let b = 1; b <= 8; b++) {
    const m = createMeasure(b, chordForBar(b), rehearsalForBar(b));
    const beh = guitarPlan.perBar.find((x) => x.bar === b)!;
    const [low, high] = getRegisterForBar(guitarMap, b);
    const density = getDensityForBar(densityPlan, b);

    const eventCount = Math.min(beh.eventCount, 3);
    const useOffbeat = rhythm.offbeatWeight > 0.2 && (b === 2 || b === 4 || b === 6 || b === 8);

    if (density === 'sparse') {
      if (useOffbeat) {
        addEvent(m, createNote(baseLow + 5, 0.5, 2));
        addEvent(m, createNote(baseLow + 7, 2.5, 2));
      } else {
        addEvent(m, createNote(baseLow + 7, 0, 2));
        addEvent(m, createNote(baseLow + 9, 2, 2));
      }
    } else if (density === 'medium') {
      if (b <= 4) {
        addEvent(m, createNote(baseLow + 5, 0, 4));
      } else {
        addEvent(m, createNote(baseLow + 2, 0, 2));
        addEvent(m, createNote(baseLow + 4, 2, 2));
      }
    } else {
      addEvent(m, createNote(baseLow + 7, 0, 2));
      addEvent(m, createNote(baseLow + 4, 2, 2));
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

/** Build bass part using behaviour plan and register map. */
function buildBassPart(bassPlan: BassBehaviourPlan, bassMap: InstrumentRegisterMap): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is BassProfile => p.instrumentIdentity === 'acoustic_upright_bass'
  ) ?? ACOUSTIC_UPRIGHT_BASS;

  const [walkLow, walkHigh] = profile.preferredWalkingZone;
  const measures: MeasureModel[] = [];

  for (let b = 1; b <= 8; b++) {
    const chord = chordForBar(b);
    const root = CHORD_ROOTS[chord] ?? 48;
    const m = createMeasure(b, chord, rehearsalForBar(b));
    const [low, high] = getBassRegisterForBar(bassMap, b);
    const rootClamped = Math.max(walkLow, Math.min(walkHigh, Math.max(low, Math.min(high, root))));

    addEvent(m, createNote(rootClamped, 0, 1));
    addEvent(m, createNote(rootClamped + 7, 1, 1));
    addEvent(m, createNote(rootClamped, 2, 1));
    addEvent(m, createNote(rootClamped + 5, 3, 1));

    measures.push(m);
  }

  return {
    id: 'bass',
    name: 'Acoustic Upright Bass',
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
}

/**
 * Generate golden path duo score from plans.
 */
export function generateGoldenPathDuoScore(context: CompositionContext, plans: GoldenPathPlans): ScoreModel {
  const guitarPart = buildGuitarPart(
    plans.guitarBehaviour,
    plans.guitarMap,
    plans.densityPlan,
    plans.rhythmConstraints
  );
  const bassPart = buildBassPart(plans.bassBehaviour, plans.bassMap);
  return createScore('Golden Path Duo', [guitarPart, bassPart], { tempo: 120 });
}
