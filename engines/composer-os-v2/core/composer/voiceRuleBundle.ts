/**
 * Phase 2+3a — compiled harmonic voice policy bundle (engine-only).
 * Reference vocabulary only — no imports from donor repos.
 */

export type BassPolicyRole =
  | 'root'
  | 'melodic-counterline'
  | 'chromatic-first'
  /** Wayne Shorter axis / pedal bass motion */
  | 'axis-root'
  /** Pat Metheny diatonic step / third root pathways */
  | 'diatonic-step-third';

export type MelodicContourPolicy =
  | 'descending-arc'
  | 'orbiting'
  | 'angular'
  | 'pentatonic-cell'
  | 'diatonic-step';

export type NarrativeArcPolicy = 'continuous-curve' | 'suite' | 'blues-backbone' | 'free';

export interface VoiceRuleBundle {
  voiceId: string;

  harmonicRhythm: {
    /** Minimum bars to hold one chord symbol before allowing a change (0 = no bar-level minimum). */
    minChordDurationBars: number;
    /** Maximum bars the same symbol may be held before a refresh is encouraged (large = relaxed). */
    maxChordDurationBars: number;
    allowMidBarChange: boolean;
  };

  bassPolicy: {
    role: BassPolicyRole;
    allowOctaveDoubling: boolean;
  };

  voicingPolicy: {
    minSpreadSemitones: number;
    maxSpreadSemitones: number;
    clusterSizeNotes: [number, number];
    forbidParallelFifths: boolean;
    forbidOctaveDoubling: boolean;
    /** Coltrane lattice emphasis — informational / Phase 3b */
    augmentedTriadLatticeBasis?: boolean;
    /** Pat Metheny colour hint — informational */
    lydianMaj7Sharp11Default?: boolean;
  };

  melodicPolicy: {
    contour: MelodicContourPolicy;
    maxLeapSemitones: number;
    preferredIntervalSets?: number[];
    /** Pat Metheny — informational */
    flatTwoMaj7Approach?: boolean;
  };

  orchestrationPolicy: {
    anchorToneCount: number;
    mutateSingleVoiceAtTime: boolean;
    allowCollectiveImprov: boolean;
  };

  formPolicy: {
    narrativeArc: NarrativeArcPolicy;
    sectionRecallEnforced: boolean;
  };

  rhythmPolicy: {
    antiMetric: boolean;
    gospelShoutThreshold?: number;
  };

  repairPolicy: {
    resolveParallels: boolean;
    maxVoiceOverlap: number;
  };
}
