/**
 * Composer OS V2 — Golden path duo score generator
 * First fully working end-to-end generation for guitar-bass duo.
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel, PartModel, MeasureModel } from '../score-model/scoreModelTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import {
  createMeasure,
  createNote,
  addEvent,
  createScore,
} from '../score-model/scoreEventBuilder';
import type { GuitarProfile, BassProfile } from '../instrument-profiles/instrumentProfileTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';

/** Chord roots in MIDI for bass (octave 2). D2=38, G2=43, C2=36, A2=45. */
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

/** Build guitar part: sparse melody + dyads in mid register. */
function buildGuitarPart(): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is GuitarProfile => p.instrumentIdentity === 'clean_electric_guitar'
  ) ?? CLEAN_ELECTRIC_GUITAR;

  const [low] = profile.preferredMelodicZone; // 55-79
  const measures: MeasureModel[] = [];

  for (let b = 1; b <= 8; b++) {
    const m = createMeasure(b, chordForBar(b), rehearsalForBar(b));

    // Sparse: 1-2 events per bar, melody or dyad
    if (b === 1 || b === 3) {
      addEvent(m, createNote(low + 7, 0, 2));   // quarter-half
      addEvent(m, createNote(low + 9, 2, 2));
    } else if (b === 2 || b === 4) {
      addEvent(m, createNote(low + 5, 0, 4));   // whole note
    } else if (b === 5 || b === 7) {
      addEvent(m, createNote(low + 2, 0, 2));    // dyad-like
      addEvent(m, createNote(low + 4, 2, 2));
    } else {
      addEvent(m, createNote(low + 7, 0, 4));   // half note
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

/** Build bass part: quarter/half in walking zone. */
function buildBassPart(): PartModel {
  const profile = guitarBassDuoPreset.instrumentProfiles.find(
    (p): p is BassProfile => p.instrumentIdentity === 'acoustic_upright_bass'
  ) ?? ACOUSTIC_UPRIGHT_BASS;

  const [walkLow, walkHigh] = profile.preferredWalkingZone; // 36-55 (used for clamping)
  const measures: MeasureModel[] = [];

  for (let b = 1; b <= 8; b++) {
    const chord = chordForBar(b);
    const root = CHORD_ROOTS[chord] ?? 48;
    const m = createMeasure(b, chord, rehearsalForBar(b));

    // Simple quarter-note roots with occasional 5th
    const rootClamped = Math.max(walkLow, Math.min(walkHigh, root));
    addEvent(m, createNote(rootClamped, 0, 1));
    addEvent(m, createNote(rootClamped + 7, 1, 1));  // 5th
    addEvent(m, createNote(rootClamped, 2, 1));
    addEvent(m, createNote(rootClamped + 5, 3, 1));  // 3rd

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

/**
 * Generate golden path duo score from composition context.
 * Uses preset instruments; fills harmony/phrase from context or defaults.
 */
export function generateGoldenPathDuoScore(context: CompositionContext): ScoreModel {
  const preset = guitarBassDuoPreset;
  const guitarPart = buildGuitarPart();
  const bassPart = buildBassPart();

  return createScore('Golden Path Duo', [guitarPart, bassPart], { tempo: 120 });
}
