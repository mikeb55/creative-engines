/**
 * While We're Here — manual Dev 2 fixtures.
 * Impossible Metaphysics is track 7. The Mirror is track 3.
 * Orbit remains in orbitPassages.ts and is not redefined here.
 *
 * Rows were copied from the duo leadsheets. This file does not read MusicXML.
 * A printed chord symbol is held until the next printed symbol.
 * Phrase boundaries follow rehearsal marks and scored section text.
 * HOME is one reading of each opening. It was not chosen by searching centres.
 */

import type { PentatonicPassage, PentatonicPassageEvent } from './pathTypes';

function event(partial: PentatonicPassageEvent): PentatonicPassageEvent {
  return partial;
}

const imFrame = {
  tonalCentre: { root: 'A', mode: 'major' as const },
  home: { archetypeId: 'major_pentatonic', referenceNote: 'A' },
  depth: 'chromatic' as const,
  evidenceProfile: 'wwh-duo-1.0' as const,
  purpose: 'colour' as const,
};

const mirrorFrame = {
  tonalCentre: { root: 'C', mode: 'minor' as const },
  home: { archetypeId: 'minor_pentatonic', referenceNote: 'C' },
  depth: 'chromatic' as const,
  evidenceProfile: 'wwh-duo-1.0' as const,
  purpose: 'colour' as const,
};

/**
 * Impossible Metaphysics, measures 1–16.
 * Letter A "The Impossible Object" through the first Bb colour.
 * Bar 1 is A(add9) with melody A. Bar 2 states C# B E F#.
 * Together with A that is the A major pentatonic, restated as a chord at bar 48.
 * Boundaries: bar 9 starts rehearsal B "Refractions"; bar 11 starts M3;
 * bar 17 starts the scored text "only the room".
 */
export function impossibleMetaphysicsObjectPassage(): PentatonicPassage {
  return {
    ...imFrame,
    events: [
      event({ id: 'im-object-1', sourceLabel: '1', chordSymbol: 'A(add9)', melodyNotes: ['A'], bassRest: true }),
      event({ id: 'im-object-2', sourceLabel: '2', chordSymbol: 'A(add9)', melodyNotes: ['C#', 'B', 'E', 'F#'], bassRest: true }),
      event({ id: 'im-object-3', sourceLabel: '3', chordSymbol: 'A5/E', melodyNotes: ['A', 'E'], bassNotes: ['E'] }),
      event({ id: 'im-object-4', sourceLabel: '4', chordSymbol: 'A/E', melodyNotes: ['A', 'C#', 'E'], bassNotes: ['E'] }),
      event({ id: 'im-object-5', sourceLabel: '5', chordSymbol: 'Dsus2/E', melodyNotes: ['D', 'A', 'E'], bassNotes: ['E', 'A'] }),
      event({ id: 'im-object-6', sourceLabel: '6', chordSymbol: 'Dsus2/A', melodyNotes: ['D', 'A', 'E'], bassNotes: ['A'] }),
      event({ id: 'im-object-7', sourceLabel: '7', chordSymbol: 'Dsus2/A', melodyNotes: ['F#'], bassNotes: ['C#'] }),
      event({ id: 'im-object-8', sourceLabel: '8', chordSymbol: 'A(add9)/E', melodyNotes: ['C#', 'B', 'E', 'A'], bassNotes: ['E'], phraseBoundaryAfter: true }),
      event({ id: 'im-object-9', sourceLabel: '9', chordSymbol: 'A(add9)/E', melodyNotes: ['C#', 'B', 'E', 'F#'], bassNotes: ['E'] }),
      event({ id: 'im-object-10', sourceLabel: '10', chordSymbol: 'A6', melodyNotes: ['F#', 'E', 'A', 'C#'], bassNotes: ['E', 'A'], phraseBoundaryAfter: true }),
      event({ id: 'im-object-11', sourceLabel: '11', chordSymbol: 'A/C#', melodyNotes: ['E', 'C#', 'A'], bassNotes: ['C#'] }),
      event({ id: 'im-object-12', sourceLabel: '12', chordSymbol: 'C#m(b6)', melodyNotes: ['G#', 'E', 'A'], bassNotes: ['C#'] }),
      event({ id: 'im-object-13', sourceLabel: '13', chordSymbol: 'Gm/D', melodyNotes: ['G', 'D', 'Bb'], bassNotes: ['D'] }),
      event({ id: 'im-object-14', sourceLabel: '14', chordSymbol: 'Bb/D', melodyNotes: ['Bb', 'D'], bassNotes: ['D'] }),
      event({ id: 'im-object-15', sourceLabel: '15', chordSymbol: 'Bb/D', melodyNotes: ['F', 'Bb'], bassNotes: ['D'] }),
      event({ id: 'im-object-16', sourceLabel: '16', chordSymbol: 'D5/Bb', melodyNotes: ['D', 'A'], bassNotes: ['Bb'], phraseBoundaryAfter: true }),
    ],
  };
}

/**
 * Impossible Metaphysics, measures 46–54.
 * M6 dyad, a full silence, then "the theme is a chord", an outside Edim/Bb,
 * a return to the A field, and C6 "the floor is C".
 * Bars 46–47 still carry the symbol printed at bar 44, A(add9)/E.
 * Boundaries: bar 48 is M8; bar 55 is rehearsal E "Beautiful Impossibility".
 */
export function impossibleMetaphysicsThemePassage(): PentatonicPassage {
  return {
    ...imFrame,
    events: [
      event({ id: 'im-theme-46', sourceLabel: '46', chordSymbol: 'A(add9)/E', melodyNotes: ['G#', 'D'], bassRest: true }),
      event({ id: 'im-theme-47', sourceLabel: '47', chordSymbol: 'A(add9)/E', melodyRest: true, bassRest: true, phraseBoundaryAfter: true }),
      event({ id: 'im-theme-48', sourceLabel: '48', chordSymbol: 'A(add9)', melodyNotes: ['E', 'A', 'C#'], bassNotes: ['E', 'A', 'C#'], heldNotes: ['A', 'C#', 'F#', 'B'] }),
      event({ id: 'im-theme-49', sourceLabel: '49', chordSymbol: 'Edim/Bb', melodyNotes: ['E'], bassNotes: ['Bb'], heldNotes: ['G', 'Bb'] }),
      event({ id: 'im-theme-50', sourceLabel: '50', chordSymbol: 'D/F#', melodyNotes: ['F#', 'A'], bassNotes: ['F#'], heldNotes: ['D'] }),
      event({ id: 'im-theme-51', sourceLabel: '51', chordSymbol: 'D/F#', melodyNotes: ['C#', 'B', 'E', 'F#'], bassRest: true }),
      event({ id: 'im-theme-52', sourceLabel: '52', chordSymbol: 'A5', melodyNotes: ['E'], bassRest: true, heldNotes: ['A'] }),
      event({ id: 'im-theme-53', sourceLabel: '53', chordSymbol: 'A5', melodyNotes: ['E'], bassRest: true, heldNotes: ['A'] }),
      event({ id: 'im-theme-54', sourceLabel: '54', chordSymbol: 'C6', melodyNotes: ['E'], bassNotes: ['C'], heldNotes: ['A'], phraseBoundaryAfter: true }),
    ],
  };
}

/**
 * The Mirror, measures 1–16.
 * Letter A M1 and rehearsal B "M1 colour": the same Cm6 / Abmaj7 frame twice.
 * Tonal centre C minor because bar 1 is Cm6.
 * HOME C minor pentatonic because the first-phrase bass moves C, G, Eb, Bb.
 * Melody D and A stay in the evidence. They did not move HOME.
 * Boundaries: bar 9 is rehearsal B; bar 17 is rehearsal C M2.
 */
export function mirrorFramePassage(): PentatonicPassage {
  return {
    ...mirrorFrame,
    events: [
      event({ id: 'mirror-frame-1', sourceLabel: '1', chordSymbol: 'Cm6', melodyNotes: ['C'], bassRest: true }),
      event({ id: 'mirror-frame-2', sourceLabel: '2', chordSymbol: 'Cm6', melodyNotes: ['Eb', 'D'], bassNotes: ['C'] }),
      event({ id: 'mirror-frame-3', sourceLabel: '3', chordSymbol: 'Cm6', melodyNotes: ['C'], bassNotes: ['G'] }),
      event({ id: 'mirror-frame-4', sourceLabel: '4', chordSymbol: 'Cm6', melodyNotes: ['A'], bassNotes: ['G'] }),
      event({ id: 'mirror-frame-5', sourceLabel: '5', chordSymbol: 'Abmaj7', melodyNotes: ['G'], bassNotes: ['Eb'] }),
      event({ id: 'mirror-frame-6', sourceLabel: '6', chordSymbol: 'Abmaj7', melodyNotes: ['F', 'Eb'], bassNotes: ['Eb', 'C'] }),
      event({ id: 'mirror-frame-7', sourceLabel: '7', chordSymbol: 'Abmaj7', melodyNotes: ['C', 'Eb'], bassNotes: ['F', 'G'] }),
      event({ id: 'mirror-frame-8', sourceLabel: '8', chordSymbol: 'Abmaj7', melodyNotes: ['Eb'], bassNotes: ['Bb'], phraseBoundaryAfter: true }),
      event({ id: 'mirror-frame-9', sourceLabel: '9', chordSymbol: 'Cm6', melodyNotes: ['G', 'Eb', 'A', 'E'], bassRest: true }),
      event({ id: 'mirror-frame-10', sourceLabel: '10', chordSymbol: 'Cm6', melodyNotes: ['G', 'E', 'A', 'Eb', 'Bb'], bassNotes: ['C'] }),
      event({ id: 'mirror-frame-11', sourceLabel: '11', chordSymbol: 'Cm6', melodyNotes: ['G', 'Eb', 'A'], bassNotes: ['G'] }),
      event({ id: 'mirror-frame-12', sourceLabel: '12', chordSymbol: 'Cm6', melodyRest: true, bassNotes: ['G'] }),
      event({ id: 'mirror-frame-13', sourceLabel: '13', chordSymbol: 'Abmaj7', melodyNotes: ['G', 'Eb', 'C', 'F'], bassNotes: ['Eb'] }),
      event({ id: 'mirror-frame-14', sourceLabel: '14', chordSymbol: 'Abmaj7', melodyNotes: ['G', 'F', 'C', 'D'], bassNotes: ['Eb', 'C'] }),
      event({ id: 'mirror-frame-15', sourceLabel: '15', chordSymbol: 'Abmaj7', melodyRest: true, bassNotes: ['F', 'G'] }),
      event({ id: 'mirror-frame-16', sourceLabel: '16', chordSymbol: 'Abmaj7', melodyNotes: ['Bb', 'C', 'D', 'Eb'], bassNotes: ['Bb'], phraseBoundaryAfter: true }),
    ],
  };
}

/**
 * The Mirror, measures 46–54.
 * Rehearsal I M6 is E° then E°7. Rehearsal J at bar 51 is "M1 dissolved" and returns to Cm6.
 * Boundary after bar 50, where that rehearsal starts.
 */
export function mirrorDiminishedPassage(): PentatonicPassage {
  return {
    ...mirrorFrame,
    events: [
      event({ id: 'mirror-dim-46', sourceLabel: '46', chordSymbol: 'E°', melodyNotes: ['C', 'A'], bassRest: true }),
      event({ id: 'mirror-dim-47', sourceLabel: '47', chordSymbol: 'E°7', melodyNotes: ['Bb', 'C'], bassNotes: ['Db'] }),
      event({ id: 'mirror-dim-48', sourceLabel: '48', chordSymbol: 'E°7', melodyNotes: ['Eb', 'G', 'Bb', 'Db', 'C'], bassRest: true }),
      event({ id: 'mirror-dim-49', sourceLabel: '49', chordSymbol: 'E°7', melodyNotes: ['Bb', 'Db'], bassRest: true }),
      event({ id: 'mirror-dim-50', sourceLabel: '50', chordSymbol: 'E°7', melodyNotes: ['Bb', 'Db'], bassNotes: ['G'], phraseBoundaryAfter: true }),
      event({ id: 'mirror-dim-51', sourceLabel: '51', chordSymbol: 'Cm6', melodyNotes: ['G', 'Eb', 'A', 'E'], bassNotes: ['C'] }),
      event({ id: 'mirror-dim-52', sourceLabel: '52', chordSymbol: 'Cm6', melodyNotes: ['G', 'E', 'A', 'F', 'Bb'], bassNotes: ['G'] }),
      event({ id: 'mirror-dim-53', sourceLabel: '53', chordSymbol: 'Cm6', melodyNotes: ['F', 'E', 'Bb', 'D'], bassNotes: ['Eb'] }),
      event({ id: 'mirror-dim-54', sourceLabel: '54', chordSymbol: 'Cm6', melodyNotes: ['G', 'A', 'Bb', 'C'], bassNotes: ['A'] }),
    ],
  };
}

export const WWH_VALIDATION_NOTE =
  "While We're Here. Impossible Metaphysics and The Mirror are tracks. Orbit is only track 5. Profile wwh-duo-1.0.";
