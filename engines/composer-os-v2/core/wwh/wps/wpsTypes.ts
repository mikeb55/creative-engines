/**
 * Song-specific brief for WWH Performance Synthesis V1.2.
 * One JSON file per song. The checker does not branch on the title.
 * Narrative length is whatever the song needs. Nothing here assumes seven stages or eight-bar blocks.
 *
 * V1.1 remains the frozen snapshot in `baseline/v1.1/`. This module is V1.2.
 */

export const WPS_VERSION = '1.2' as const;

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

export interface WpsSongSpec {
  wpsVersion: typeof WPS_VERSION;
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
}
