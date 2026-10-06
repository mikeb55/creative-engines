/**
 * While We're Here, track 5 — Orbit.
 * Manually entered from 05-Orbit-Duo-Leadsheet-V2.1.musicxml.
 * SHA-256 911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db
 * This file does not read MusicXML.
 *
 * HOME and tonal centre: F minor, F minor pentatonic.
 * Bar 1 melody C and bar 2 melody F Eb G# Bb sit in F Ab Bb C Eb.
 * G# is the score spelling of Ab. Chromatic depth keeps remote collections available.
 * Evidence profile `wwh-duo-1.1` weights melody and bass above chord symbols.
 * The HOME choice is this reading of the opening. It is not a search over centres.
 *
 * Phrase boundaries follow the score: A′ starts at 10, B′ at 22, C at 26.
 */

import type { PentatonicPassage, PentatonicPassageEvent } from './pathTypes';

function event(partial: PentatonicPassageEvent): PentatonicPassageEvent {
  return partial;
}

const orbitFrame = {
  tonalCentre: { root: 'F', mode: 'minor' as const },
  home: { archetypeId: 'minor_pentatonic', referenceNote: 'F' },
  depth: 'chromatic' as const,
  evidenceProfile: 'wwh-duo-1.1' as const,
  purpose: 'colour' as const,
};

export function orbitAPassage(): PentatonicPassage {
  const rows: PentatonicPassageEvent[] = [
    event({ id: 'orbit-a-1', sourceLabel: '1', melodyNotes: ['C'], bassRest: true }),
    event({ id: 'orbit-a-2', sourceLabel: '2', chordSymbol: 'Fmaj7#11', melodyNotes: ['F', 'Eb', 'G#', 'Bb'], bassNotes: ['F'] }),
    event({ id: 'orbit-a-3', sourceLabel: '3', chordSymbol: 'Ebmaj7#5', melodyNotes: ['C#', 'C'], bassNotes: ['Eb'] }),
    event({ id: 'orbit-a-4', sourceLabel: '4', chordSymbol: 'Dbmaj7', melodyNotes: ['C#', 'F', 'C', 'Eb'], bassNotes: ['Ab'] }),
    event({ id: 'orbit-a-5', sourceLabel: '5', chordSymbol: 'Bmaj7', melodyNotes: ['Bb'], bassNotes: ['B'] }),
    event({ id: 'orbit-a-6', sourceLabel: '6', chordSymbol: 'Bbm9', melodyNotes: ['C', 'C#', 'Bb'], bassNotes: ['F'] }),
    event({ id: 'orbit-a-7', sourceLabel: '7', chordSymbol: 'Abmaj7', melodyNotes: ['F', 'C', 'C#'], bassNotes: ['Eb'] }),
    event({ id: 'orbit-a-8', sourceLabel: '8', chordSymbol: 'Gbmaj7', melodyNotes: ['F#', 'Bb', 'C', 'C#'], bassNotes: ['Db'] }),
    event({ id: 'orbit-a-9', sourceLabel: '9', chordSymbol: 'Emaj7', melodyNotes: ['F#'], bassNotes: ['E'], phraseBoundaryAfter: true }),
  ];
  return { ...orbitFrame, events: rows };
}

export function orbitBPassage(): PentatonicPassage {
  const rows: PentatonicPassageEvent[] = [
    event({ id: 'orbit-b-18', sourceLabel: '18', chordSymbol: 'Gmaj7/F', melodyNotes: ['F', 'A', 'C'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-19', sourceLabel: '19', chordSymbol: 'Gmaj7/F', melodyNotes: ['D', 'B', 'G'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-20', sourceLabel: '20', chordSymbol: 'Ebmaj7/F', melodyNotes: ['G', 'B', 'D', 'Eb'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-21', sourceLabel: '21', chordSymbol: 'Ebmaj7/F', melodyNotes: ['C'], bassRest: true, phraseBoundaryAfter: true }),
    event({ id: 'orbit-b-22', sourceLabel: '22', chordSymbol: 'Gmaj7/F', melodyNotes: ['C', 'G', 'Eb'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-23', sourceLabel: '23', chordSymbol: 'Gmaj7/F', melodyNotes: ['D', 'G'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-24', sourceLabel: '24', chordSymbol: 'Ebmaj7/F', melodyNotes: ['D', 'Bb'], bassNotes: ['F'] }),
    event({ id: 'orbit-b-25', sourceLabel: '25', chordSymbol: 'Ebmaj7/F', melodyNotes: ['Bb'], bassRest: true, phraseBoundaryAfter: true }),
  ];
  return { ...orbitFrame, events: rows };
}

export const ORBIT_FIXTURE_NOTE =
  "While We're Here, track 5 Orbit, leadsheet V2.1. Tonal centre F minor. HOME F minor pentatonic. Profile wwh-duo-1.1.";
