/**
 * Practice Studio fretboard binding.
 * Pitch classes come from the Scale Explorer. Open-string MIDI comes from the
 * guitar grip library. Standard-tuning fingering checks call pcFretboard.
 * Alternate tunings never call that solver.
 */

import { GUITAR_OPEN_STRING_MIDIS } from '@composer-os/core/barry-harris/guitarVoicingFeasibility';
import { openStringMidisForTuning } from '@composer-os/core/guitar/guitarGripLibrary';
import { inGuitarRange } from '@composer-os/core/pentatonic/motifTransform';
import {
  PENTATONIC_NOTE_CHOICES,
  canonicalPitchSet,
  canonicalPitchSetId,
  mod12,
} from '@composer-os/core/pentatonic/pitch';
import {
  FRET_MAX,
  OPEN_STRINGS,
  SPAN_MAX,
  fingeringOptions,
  romanPosition,
  type Fingering,
} from '@composer-os/core/performance-composer/pcFretboard';
import {
  ALTERNATE_GUITAR_TUNING_PRESETS,
  ROADMAP_ZONE_TUNING_PRESET_IDS,
  getAlternateGuitarTuningPreset,
  getPresetsByZone,
  type AlternateGuitarTuningZone,
} from '@composer-os/core/song-mode/alternateGuitarTunings';
import type { FretboardCell, FretboardNote } from '../components/music/FretboardPanel';

export const STANDARD_TUNING_ID = 'standard';
export const STANDARD_TUNING_LABEL = 'E2 A2 D3 G3 B3 E4';
export const SCALE_FRET_WINDOW = { from: 0, to: 12 } as const;
export const PRACTICE_FRET_MIN = 0;
export const PRACTICE_FRET_MAX_VISIBLE = 24;
export const SCALE_MARKER_ROLE = 'primaryTension' as const;
export const TONIC_MARKER_ROLE = 'triadRoot' as const;

const FINGERING_NOT_SOLVED = 'Fingering: not solved.';
const STANDARD_ONLY = 'pcFretboard uses standard open strings only.';

export type FretLabelMode = 'pitch' | 'interval';

export interface PracticeTuningChoice {
  id: string;
  label: string;
  zone: AlternateGuitarTuningZone | 'other';
  stringsLabel: string;
}

export interface ResolvedPracticeTuning {
  requestedId: string;
  tuningId: string;
  label: string;
  strings: readonly string[];
  openMidi: readonly number[];
  fallback: 'none' | 'unknown-id' | 'custom-preset';
  limitation: string | null;
  standardSolver: boolean;
}

export interface PracticeFretboardQuery {
  pitchClasses: readonly number[];
  rootPc: number;
  tuningId: string;
  fretFrom: number;
  fretTo: number;
  position: number | null;
  labelMode: FretLabelMode;
}

export interface FretLocation {
  stringIndex: number;
  fret: number;
  midi: number;
  pitchClass: number;
  spelling: string;
  intervalSemitones: number;
  tonic: boolean;
  inGuitarRange: boolean;
  aboveSolverFret: boolean;
  /** Pitch-class location, or a location that also sits in the position window. */
  place: 'pitch-class-location' | 'position-window';
}

export interface FretInspection {
  stringIndex: number;
  fret: number;
  midi: number;
  pitchClass: number;
  spelling: string;
  scientific: string;
  intervalSemitones: number;
  inSelectedSet: boolean;
  inGuitarRange: boolean;
  visible: boolean;
  possiblePositions: readonly number[];
  fingering: string;
}

export interface PracticeFretboardModel {
  tuning: ResolvedPracticeTuning;
  rootPc: number;
  rootSpelling: string;
  soundingPitchClasses: readonly number[];
  soundingPitchClassId: string;
  fretFrom: number;
  fretTo: number;
  fretWindowValid: boolean;
  notes: FretboardNote[];
  locations: readonly FretLocation[];
  limitation: string | null;
  positionStatus: string;
  fingeringStatus: string;
}

const ZONE_ORDER: readonly AlternateGuitarTuningZone[] = [
  'jazz_sophisticated',
  'sonic_youth_noise',
  'joni_mitchell',
  'hybrid_harmonic',
];

export function practiceTuningChoices(): PracticeTuningChoice[] {
  const choices: PracticeTuningChoice[] = [];
  for (const zone of ZONE_ORDER) {
    for (const preset of getPresetsByZone(zone)) {
      if (preset.id === 'custom') continue;
      choices.push({
        id: preset.id,
        label: preset.label,
        zone,
        stringsLabel: preset.strings.join(' '),
      });
    }
  }
  for (const preset of ALTERNATE_GUITAR_TUNING_PRESETS) {
    if (preset.zone || preset.id === 'custom') continue;
    choices.push({
      id: preset.id,
      label: preset.label,
      zone: 'other',
      stringsLabel: preset.strings.join(' '),
    });
  }
  return choices;
}

export function roadmapTuningIdsInChoices(): string[] {
  const ids = new Set(practiceTuningChoices().map((choice) => choice.id));
  return ROADMAP_ZONE_TUNING_PRESET_IDS.filter((id) => ids.has(id));
}

export function standardOpenMidiMatchesSolver(): boolean {
  const solverLowToHigh = [...OPEN_STRINGS].reverse();
  return GUITAR_OPEN_STRING_MIDIS.every((midi, index) => midi === solverLowToHigh[index]);
}

export function resolvePracticeTuning(tuningId: string): ResolvedPracticeTuning {
  const requestedId = tuningId.trim();
  const standard = getAlternateGuitarTuningPreset(STANDARD_TUNING_ID);
  const standardStrings = standard?.strings ?? ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
  const standardMidi = openStringMidisForTuning(STANDARD_TUNING_ID);
  const solverOk = standardOpenMidiMatchesSolver();

  if (!requestedId || requestedId === STANDARD_TUNING_ID) {
    return {
      requestedId: requestedId || STANDARD_TUNING_ID,
      tuningId: STANDARD_TUNING_ID,
      label: standard?.label ?? 'Standard',
      strings: standardStrings,
      openMidi: standardMidi,
      fallback: 'none',
      limitation: solverOk ? null : `${FINGERING_NOT_SOLVED} Standard open MIDI does not match pcFretboard.`,
      standardSolver: solverOk,
    };
  }

  const preset = getAlternateGuitarTuningPreset(requestedId);
  if (!preset) {
    return {
      requestedId,
      tuningId: STANDARD_TUNING_ID,
      label: standard?.label ?? 'Standard',
      strings: standardStrings,
      openMidi: standardMidi,
      fallback: 'unknown-id',
      limitation: `Unknown tuning "${requestedId}". Open strings stay standard ${STANDARD_TUNING_LABEL}.`,
      standardSolver: solverOk,
    };
  }

  if (preset.id === 'custom') {
    return {
      requestedId,
      tuningId: STANDARD_TUNING_ID,
      label: preset.label,
      strings: standardStrings,
      openMidi: standardMidi,
      fallback: 'custom-preset',
      limitation: 'Custom has no stored open-string pitches. Open strings stay standard. Fingering: not solved.',
      standardSolver: false,
    };
  }

  return {
    requestedId,
    tuningId: preset.id,
    label: preset.label,
    strings: preset.strings,
    openMidi: openStringMidisForTuning(preset.id),
    fallback: 'none',
    limitation: null,
    standardSolver: false,
  };
}

/** Rotate a collection so its written tonic (pitch class 0, or the lowest class) sounds as `rootPc`. */
export function transposeCollection(pitchClasses: readonly number[], rootPc: number): number[] {
  const source = canonicalPitchSet(pitchClasses);
  if (source.length === 0) return [];
  const origin = source.includes(0) ? 0 : source[0]!;
  const delta = mod12(rootPc - origin);
  return canonicalPitchSet(source.map((pitchClass) => mod12(pitchClass + delta)));
}

export function intervalsFromRoot(pitchClasses: readonly number[], rootPc: number): number[] {
  const root = mod12(rootPc);
  return canonicalPitchSet(pitchClasses)
    .map((pitchClass) => mod12(pitchClass - root))
    .sort((left, right) => left - right);
}

export function collectionOrigin(pitchClasses: readonly number[]): number | null {
  const source = canonicalPitchSet(pitchClasses);
  if (source.length === 0) return null;
  return source.includes(0) ? 0 : source[0]!;
}

function spellingFor(pitchClass: number): string {
  return PENTATONIC_NOTE_CHOICES[mod12(pitchClass)] ?? String(mod12(pitchClass));
}

function scientificPitch(midi: number, spelling: string): string {
  return `${spelling}${Math.floor(midi / 12) - 1}`;
}

function fretWindow(fretFrom: number, fretTo: number): { from: number; to: number } | null {
  if (!Number.isInteger(fretFrom) || !Number.isInteger(fretTo)) return null;
  if (fretFrom < PRACTICE_FRET_MIN || fretTo > PRACTICE_FRET_MAX_VISIBLE || fretFrom > fretTo) return null;
  return { from: fretFrom, to: fretTo };
}

function positionWindow(position: number): { from: number; to: number } | null {
  if (!Number.isInteger(position) || position < 0 || position > FRET_MAX) return null;
  if (position === 0) return { from: 0, to: 0 };
  return { from: position, to: Math.min(position + SPAN_MAX, FRET_MAX) };
}

export function possiblePositionsForFret(fret: number): number[] {
  if (!Number.isInteger(fret) || fret <= 0 || fret > FRET_MAX) return [];
  const positions: number[] = [];
  for (let position = 1; position <= FRET_MAX; position += 1) {
    const high = Math.min(position + SPAN_MAX, FRET_MAX);
    if (fret >= position && fret <= high) positions.push(position);
  }
  return positions;
}

function formatSolverPlace(fingering: Fingering): string {
  const stringIndex = 6 - fingering.string;
  return `string index ${stringIndex}, fret ${fingering.fret}`;
}

function standardSinglePitchStatus(midi: number, stringIndex: number, fret: number): string {
  if (!inGuitarRange(midi)) {
    return `${FINGERING_NOT_SOLVED} This sounding pitch is outside guitarRange().`;
  }
  const options = fingeringOptions([midi]);
  const xmlString = 6 - stringIndex;
  const onThisCell = options.some(
    (option) =>
      option.length === 1 &&
      option[0]?.midi === midi &&
      option[0]?.string === xmlString &&
      option[0]?.fret === fret
  );
  if (onThisCell) {
    return 'Verified pitch location on standard tuning. pcFretboard accepts this string and fret for this one pitch. This is not a scale fingering.';
  }
  if (options.length === 0) {
    return `${FINGERING_NOT_SOLVED} pcFretboard has no place for this pitch within fret ${FRET_MAX}.`;
  }
  const places = options.map((option) => formatSolverPlace(option[0]!)).join('; ');
  return `${FINGERING_NOT_SOLVED} This cell is not a solved place. pcFretboard can put this one pitch at ${places}.`;
}

export function inspectFretCell(
  tuning: ResolvedPracticeTuning,
  cell: FretboardCell,
  rootPc: number,
  soundingPitchClasses: readonly number[],
  visible: { from: number; to: number } | null
): FretInspection | null {
  if (!Number.isInteger(cell.stringIndex) || cell.stringIndex < 0 || cell.stringIndex > 5) return null;
  if (!Number.isInteger(cell.fret) || cell.fret < PRACTICE_FRET_MIN || cell.fret > PRACTICE_FRET_MAX_VISIBLE) {
    return null;
  }
  const open = tuning.openMidi[cell.stringIndex];
  if (open === undefined) return null;
  const midi = open + cell.fret;
  const pitchClass = mod12(midi);
  const spelling = spellingFor(pitchClass);
  const root = mod12(rootPc);
  const inWindow = visible !== null && cell.fret >= visible.from && cell.fret <= visible.to;
  let fingering: string;
  if (!tuning.standardSolver) {
    fingering = `${FINGERING_NOT_SOLVED} ${STANDARD_ONLY}`;
  } else if (cell.fret > FRET_MAX) {
    fingering = `${FINGERING_NOT_SOLVED} pcFretboard stops at fret ${FRET_MAX}.`;
  } else {
    fingering = standardSinglePitchStatus(midi, cell.stringIndex, cell.fret);
  }
  return {
    stringIndex: cell.stringIndex,
    fret: cell.fret,
    midi,
    pitchClass,
    spelling,
    scientific: scientificPitch(midi, spelling),
    intervalSemitones: mod12(pitchClass - root),
    inSelectedSet: soundingPitchClasses.includes(pitchClass),
    inGuitarRange: inGuitarRange(midi),
    visible: inWindow,
    possiblePositions: tuning.standardSolver ? possiblePositionsForFret(cell.fret) : [],
    fingering,
  };
}

function dotLabel(location: FretLocation, mode: FretLabelMode): string {
  if (mode === 'interval') return location.intervalSemitones === 0 ? 'R' : String(location.intervalSemitones);
  return location.spelling;
}

export function buildPracticeFretboard(query: PracticeFretboardQuery): PracticeFretboardModel {
  const tuning = resolvePracticeTuning(query.tuningId);
  const rootPc = mod12(query.rootPc);
  const soundingPitchClasses = transposeCollection(query.pitchClasses, rootPc);
  const wanted = new Set(soundingPitchClasses);
  const window = fretWindow(query.fretFrom, query.fretTo);
  const limitations: string[] = [];
  if (tuning.limitation) limitations.push(tuning.limitation);

  let positionStatus = 'Position filter off. Dots are pitch-class locations.';
  let fingeringStatus = tuning.standardSolver
    ? 'No scale fingering is solved. Dots are pitch-class locations. A clicked fret can be checked as one pitch.'
    : `${FINGERING_NOT_SOLVED} ${STANDARD_ONLY}`;
  let activePosition: { from: number; to: number } | null = null;

  if (query.position !== null) {
    if (!tuning.standardSolver) {
      positionStatus = 'Position filter is not applied. pcFretboard is standard tuning only. Dots stay pitch-class locations.';
      limitations.push(positionStatus);
    } else {
      const span = positionWindow(query.position);
      if (!span) {
        positionStatus = `Position ${query.position} is outside pcFretboard frets 0–${FRET_MAX}. The filter is not applied.`;
        limitations.push(positionStatus);
      } else {
        activePosition = span;
        positionStatus =
          span.from === 0
            ? 'Open-string position. These dots are pitch-class locations on open strings, not a verified fingering.'
            : `Position window ${romanPosition(span.from)}–${romanPosition(span.to)} (span ${SPAN_MAX}, fret ceiling ${FRET_MAX}). Dots inside it are pitch-class locations, not a verified fingering.`;
      }
    }
  }

  const locations: FretLocation[] = [];
  if (window) {
    if (window.to > FRET_MAX) {
      limitations.push(
        `Frets ${FRET_MAX + 1}–${window.to} are pitch-class locations only. pcFretboard does not finger them.`
      );
    }
    for (let stringIndex = 0; stringIndex < tuning.openMidi.length; stringIndex += 1) {
      const open = tuning.openMidi[stringIndex]!;
      for (let fret = window.from; fret <= window.to; fret += 1) {
        if (activePosition && (fret < activePosition.from || fret > activePosition.to)) continue;
        const midi = open + fret;
        const pitchClass = mod12(midi);
        if (!wanted.has(pitchClass)) continue;
        const tonic = pitchClass === rootPc;
        locations.push({
          stringIndex,
          fret,
          midi,
          pitchClass,
          spelling: spellingFor(pitchClass),
          intervalSemitones: mod12(pitchClass - rootPc),
          tonic,
          inGuitarRange: inGuitarRange(midi),
          aboveSolverFret: fret > FRET_MAX,
          place: activePosition ? 'position-window' : 'pitch-class-location',
        });
      }
    }
  } else {
    limitations.push(
      `Fret range ${query.fretFrom}–${query.fretTo} is unsupported. Use whole frets from ${PRACTICE_FRET_MIN} to ${PRACTICE_FRET_MAX_VISIBLE}.`
    );
  }

  const outsideRange = locations.filter((location) => !location.inGuitarRange).length;
  if (outsideRange > 0) {
    limitations.push(
      `${outsideRange} location${outsideRange === 1 ? '' : 's'} sit outside guitarRange() and are not playable notes.`
    );
  }

  if (activePosition) {
    const uniqueMidis = new Set(locations.map((location) => location.midi));
    fingeringStatus =
      uniqueMidis.size > 4
        ? `${FINGERING_NOT_SOLVED} This window holds more than four pitches. pcFretboard stops at four sounding pitches.`
        : 'Position window only. A verified fingering is reported on a clicked pitch, not for the whole window.';
  }

  const notes: FretboardNote[] = locations.map((location) => ({
    stringIndex: location.stringIndex,
    fret: location.fret,
    role: location.tonic ? TONIC_MARKER_ROLE : SCALE_MARKER_ROLE,
    label: dotLabel(location, query.labelMode),
  }));

  return {
    tuning,
    rootPc,
    rootSpelling: spellingFor(rootPc),
    soundingPitchClasses,
    soundingPitchClassId: canonicalPitchSetId(soundingPitchClasses),
    fretFrom: window?.from ?? query.fretFrom,
    fretTo: window?.to ?? query.fretTo,
    fretWindowValid: window !== null,
    notes,
    locations,
    limitation: limitations.length ? limitations.join(' ') : null,
    positionStatus,
    fingeringStatus,
  };
}

export { FRET_MAX, romanPosition };

export function standardTuningPitchClassMarkers(pitchClasses: readonly number[]): FretboardNote[] {
  return buildPracticeFretboard({
    pitchClasses,
    rootPc: 0,
    tuningId: STANDARD_TUNING_ID,
    fretFrom: SCALE_FRET_WINDOW.from,
    fretTo: SCALE_FRET_WINDOW.to,
    position: null,
    labelMode: 'pitch',
  }).notes;
}
