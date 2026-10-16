/**
 * Standard-tuning pitch-class dots for the studio fretboard.
 * String 0 is the low E, matching GUITAR_OPEN_STRING_MIDIS and FretboardPanel.
 * Every sounding fret in 0–12 is marked. This is not a fingering.
 */

import { GUITAR_OPEN_STRING_MIDIS } from '@composer-os/core/barry-harris/guitarVoicingFeasibility';
import type { FretboardNote } from '../components/music/FretboardPanel';

export const STANDARD_TUNING_LABEL = 'E2 A2 D3 G3 B3 E4';
export const SCALE_FRET_WINDOW = { from: 0, to: 12 } as const;

/** Marker colour only. primaryTension is the panel swatch, not a harmonic role. */
export const SCALE_MARKER_ROLE = 'primaryTension' as const;

export function standardTuningPitchClassMarkers(pitchClasses: readonly number[]): FretboardNote[] {
  const wanted = new Set(pitchClasses.map((pitchClass) => ((pitchClass % 12) + 12) % 12));
  const notes: FretboardNote[] = [];
  GUITAR_OPEN_STRING_MIDIS.forEach((open, stringIndex) => {
    for (let fret = SCALE_FRET_WINDOW.from; fret <= SCALE_FRET_WINDOW.to; fret += 1) {
      if (!wanted.has((open + fret) % 12)) continue;
      notes.push({ stringIndex, fret, role: SCALE_MARKER_ROLE });
    }
  });
  return notes;
}
