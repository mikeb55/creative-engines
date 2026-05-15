/**
 * ContrapuntalLineEngine — shared IR (line-first SATB abstraction).
 * Spec only; generation logic lives in ContrapuntalLineEngine (future).
 */

export type LineRole = 'soprano' | 'alto' | 'tenor' | 'bass';

export type LineRoleTag =
  | 'melodic_lead'
  | 'counter_melody'
  | 'harmonic_fill'
  | 'bass_anchor'
  | 'canonic_follower'
  | 'rhythmic_anchor';

/** One note in an abstract line (bar-offset space; not score-model NoteEvent). */
export type NoteEvent = {
  pitchMidi: number;
  durationBars: number;
  offsetBars: number;
  dynamic?: 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
  articulationTag?: string;
};

export type CadenceTag = {
  positionBars: number;
  type: 'authentic' | 'half' | 'deceptive' | 'plagal' | 'modal';
  strength: 'strong' | 'medium' | 'weak';
};

export type DensityEnvelope = {
  segments: Array<{
    startBar: number;
    endBar: number;
    density: 'sparse' | 'medium' | 'dense';
  }>;
};

export type ImitationEvent = {
  sourceVoice: LineRole;
  imitatingVoice: LineRole;
  delayBars: number;
  intervalSemitones: number;
  type: 'strict' | 'free' | 'invertible';
};

export type DissonanceProfile = {
  /** Semitone interval classes permitted between voices (0–11). */
  allowedIntervals: number[];
  /** Interval classes forbidden (e.g. [6] tritone outer-voice ban). */
  forbiddenIntervals: number[];
  parallelFifthsAllowed: boolean;
  parallelOctavesAllowed: boolean;
  /** When true, unprepared dissonances should resolve by step (future enforcement). */
  resolveByStep: boolean;
};

export type AbstractLineSet = {
  voices: Array<{
    role: LineRole;
    notes: NoteEvent[];
    tags: LineRoleTag[];
  }>;
  cadenceTags: CadenceTag[];
  densityEnvelope: DensityEnvelope;
  imitationMap?: ImitationEvent[];
  dissonanceProfile: DissonanceProfile;
  sourceMode: 'melody_only' | 'chords_only' | 'melody_plus_chords';
  lengthBars: number;
  /** VRB id that shaped policy (e.g. `bartok`, `bob_brookmeyer`). */
  styleSourceVrbId: string;
};
