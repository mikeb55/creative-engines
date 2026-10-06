/**
 * While We're Here, track 5 — Orbit.
 * Manually entered fixtures. No MusicXML.
 *
 * HOME and tonal centre: F minor, F minor pentatonic.
 * Bar 1 melody C and bar 2 melody F Eb Ab Bb sit in F Ab Bb C Eb.
 * Chromatic depth keeps remote collections available.
 * Evidence profile `wwh-duo-1.0` weights melody and bass above chord symbols.
 * The HOME choice is this reading of the opening. It is not a search over centres.
 */

import type { PentatonicPassage, PentatonicPassageEvent } from './pathTypes';

function event(partial: PentatonicPassageEvent): PentatonicPassageEvent {
  return partial;
}

const orbitFrame = {
  tonalCentre: { root: 'F', mode: 'minor' as const },
  home: { archetypeId: 'minor_pentatonic', referenceNote: 'F' },
  depth: 'chromatic' as const,
  evidenceProfile: 'wwh-duo-1.0' as const,
  purpose: 'colour' as const,
};

export function orbitAPassage(): PentatonicPassage {
  const rows: PentatonicPassageEvent[] = [
    event({ id: 'orbit-a-1', sourceLabel: '1', melodyNotes: ['C'] }),
    event({ id: 'orbit-a-2', sourceLabel: '2', chordSymbol: 'Fmaj7#11', melodyNotes: ['F', 'Eb', 'Ab', 'Bb'], bassNotes: ['F'] }),
    event({ id: 'orbit-a-3', sourceLabel: '3', chordSymbol: 'Ebmaj7#5', melodyNotes: ['Db', 'C'], bassNotes: ['Eb'] }),
    event({ id: 'orbit-a-4', sourceLabel: '4', chordSymbol: 'Dbmaj7', melodyNotes: ['Db', 'F', 'C', 'Eb'], bassNotes: ['Ab'] }),
    event({ id: 'orbit-a-5', sourceLabel: '5', chordSymbol: 'Bmaj7', melodyNotes: ['Bb'], bassNotes: ['B'] }),
    event({ id: 'orbit-a-6', sourceLabel: '6', chordSymbol: 'Bbm9', melodyNotes: ['C', 'Db', 'Bb'], bassNotes: ['F'] }),
    event({ id: 'orbit-a-7', sourceLabel: '7', chordSymbol: 'Gbmaj7', melodyNotes: ['F', 'C', 'Db'], bassNotes: ['Gb'] }),
    event({ id: 'orbit-a-8', sourceLabel: '8', chordSymbol: 'Abmaj7', melodyNotes: ['Gb', 'Bb', 'C', 'Db'], bassNotes: ['Eb'] }),
    event({ id: 'orbit-a-9', sourceLabel: '9', chordSymbol: 'Emaj7', melodyNotes: ['Gb'], bassNotes: ['E'], phraseBoundaryAfter: true }),
  ];
  return { ...orbitFrame, events: rows };
}

export function orbitBPassage(): PentatonicPassage {
  const rows: PentatonicPassageEvent[] = [
    event({ id: 'orbit-b-18', sourceLabel: '18', chordSymbol: 'G/F', melodyNotes: ['F', 'A', 'C'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-19', sourceLabel: '19', chordSymbol: 'G/F', melodyNotes: ['D', 'B', 'G'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-20', sourceLabel: '20', chordSymbol: 'Eb/F', melodyNotes: ['G', 'B', 'D', 'Eb'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-21', sourceLabel: '21', chordSymbol: 'Eb/F', melodyNotes: ['C'], bassNotes: ['F'], phraseBoundaryAfter: true }),
    event({ id: 'orbit-b-22', sourceLabel: '22', chordSymbol: 'G/F', melodyNotes: ['C', 'G', 'Eb'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-23', sourceLabel: '23', chordSymbol: 'G/F', melodyNotes: ['D', 'G'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-24', sourceLabel: '24', chordSymbol: 'Eb/F', melodyNotes: ['D', 'Bb'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-25', sourceLabel: '25', chordSymbol: 'Eb/F', melodyNotes: ['Bb'], bassNotes: ['F'], phraseBoundaryAfter: true }),
  ];
  return { ...orbitFrame, events: rows };
}

export const ORBIT_FIXTURE_NOTE =
  "While We're Here, track 5 Orbit. Tonal centre F minor. HOME F minor pentatonic. Profile wwh-duo-1.0.";
