/**
 * Song-specific brief for WWH Performance Synthesis V1.2.
 * One JSON file per song. The checker does not branch on the title.
 * Narrative length is whatever the song needs. Nothing here assumes seven stages or eight-bar blocks.
 *
 * V1.1 remains the frozen snapshot in `baseline/v1.1/`. This module is V1.4.
 * Song specs written for V1.2 and V1.3 stay valid. Optional guitar-role fields are V1.3.
 * Bryant signature gates are V1.4. They fail the run when the spec version is 1.4.
 */

export const WPS_VERSION = '1.4' as const;

/** Live checker accepts a V1.2 or V1.3 spec. V1.4 adds Bryant gates as run failures. */
export const WPS_ACCEPTED_SPEC_VERSIONS = ['1.2', '1.3', '1.4'] as const;

export type WpsSpecVersion = (typeof WPS_ACCEPTED_SPEC_VERSIONS)[number];

/** One automatic compositional refinement. Further passes need a named defect or an audition note. */
export const WPS_MAX_DCR_REFINEMENTS = 1;

/** Controlled bass proposals may cover at most this share of source measures. */
export const WPS_CBV_MAX_MEASURE_SHARE = 0.1;

export interface WpsArrangementRef {
  /** A–H label, or another short source id. */
  id: string;
  path: string;
}

export interface WpsTempoSpan {
  fromBar: number;
  quartersPerMinute: number;
}

/** Musical Continuity & Innovation. Printed for the compositional agent. Not a score. */
export interface WpsMci {
  continuity: string;
  innovation: string;
}

/**
 * Controlled Bass Variation.
 * Proposals only. The principal performance score keeps strict bass LOCK.
 * `incorporated` stays false: WPS does not write these into the score.
 */
export interface WpsCbvProposal {
  bars: string;
  change: string;
  reversible: true;
}

export interface WpsCbv {
  decision: 'no-change' | 'proposals';
  incorporated: false;
  proposals: WpsCbvProposal[];
  note: string;
}

/**
 * Radical WWH listening heuristic.
 * Default starting profile is 65 melody / 20 harmony / 40 rhythm.
 * A song may record a different profile. The numbers are not a note count.
 */
export interface WpsRadicalProfile {
  melodyPercent: number;
  harmonyPercent: number;
  rhythmPercent: number;
  note: string;
}

/**
 * Musical blueprint. Written before a performance score.
 * Song-specific observations from the leadsheet and the A–H inventory.
 * Not a licence to reuse another song's form.
 */
export interface WpsBlueprint {
  authoritativeLeadsheet: string;
  melodicFingerprints: string[];
  protectedLandmarks: string[];
  originalBassIdentity: string;
  /** Observable passages. A listening rank is stated only when someone has listened. */
  strongestPassages: string[];
  harmonicJourney: string;
  contrapuntalOpportunities: string;
  dramaticClimax: string;
  thematicReturn: string;
  expectedPerformanceDuration: string;
}

/** Evidence record. WPS does not run the official evaluator and does not run runDcrProtocol. */
export interface WpsGceRecord {
  officialNumeric: false;
  /** Performance checks require exactly one recorded refinement. Planning runs use 0. */
  dcrRefinements: number;
  weakest: string;
}

/** One span, one job. No percentage and no required comping chorus. */
export type WpsGuitarRole = 'melody' | 'comping' | 'chord-melody' | 'counterpoint' | 'bass-led' | 'silence';

export type WpsVaultTechnique = 'shell-triad' | 'triad-pair' | 'liquid' | 'reduction' | 'line' | 'rest';

export interface WpsGuitarRoleSpan {
  bars: string;
  role: WpsGuitarRole;
  technique?: WpsVaultTechnique;
  /** Id from the 16-volume WPS record. Absent when the span is a line or a rest. */
  tonalityId?: string;
  note?: string;
}

/** Pointer to a candidate a person may copy. The checker does not play it. */
export interface WpsVaultCandidateRef {
  bars: string;
  tonalityId: string;
  technique: WpsVaultTechnique;
  provenance: string;
}

export interface WpsSongSpec {
  wpsVersion: WpsSpecVersion;
  id: string;
  title: string;
  leadsheet: string;
  /** Up to eight source arrangements. Read for phrase discovery. Not spliced into the score. */
  arrangements?: WpsArrangementRef[];
  /**
   * When set, `arrangements` must carry these ids in this order.
   * Impossible Metaphysics uses A, B, C, D, E-V3.0, F, G, H.
   */
  arrangementIds?: string[];
  /** Existing performance edition to lock-check. Omit on a planning-only run. */
  performanceEdition?: string;
  /** Token that must appear in the performance filename, e.g. V1.3. */
  performanceEditionId?: string;
  /**
   * Album-track folder for this song. `wpsPerformanceOutputDir` resolves it from
   * the spec id and title. The two-digit prefix on a MusicXML name is not the folder.
   */
  outputDir: string;
  blueprint: WpsBlueprint;
  motif: {
    name: string;
    /** Written or sounding names, as the spec author uses them. The script does not generate from this list. */
    pitches: string[];
    note: string;
  };
  landmarks: Array<{ bars: string; role: string }>;
  /** Compositional plan for this song only. */
  narrative: Array<{ name: string; bars: string; job: string }>;
  /** Joins where continuity work is expected. */
  seams: Array<{ bars: string; job: string }>;
  mci: WpsMci;
  cbv: WpsCbv;
  radicalProfile: WpsRadicalProfile;
  /** Whole-passage splicing is outside this workflow. */
  selectiveSynthesis: true;
  gce: WpsGceRecord;
  protectedGuitarSilences: number[];
  rehearsal: Array<{ mark: string; bar: number }>;
  expectedBars: number;
  targetDurationSeconds: { min: number; max: number };
  /** Intended slow–fast–slow (or other) printed law. Used for the duration check. */
  tempoPlan: WpsTempoSpan[];
  /**
   * Optional V1.3 spans. Empty or absent is valid, including on a V1.2 spec.
   * A span keeps one role. It is not a quota.
   */
  guitarRoles?: WpsGuitarRoleSpan[];
  /** Optional record that candidates were considered. The checker does not sound them. */
  vaultCandidates?: WpsVaultCandidateRef[];
  /**
   * Optional catalogue roles this song requires: HEAD_IN, SOLO_1, SOLO_2, BASS_SOLO, HEAD_OUT.
   * Omitted means none of those choruses are required. A MusicXML word or rehearsal mark can still declare one.
   * Do not add this field just to reach spec version 1.4.
   */
  requiredChoruses?: Array<'HEAD_IN' | 'SOLO_1' | 'SOLO_2' | 'BASS_SOLO' | 'HEAD_OUT'>;
}
