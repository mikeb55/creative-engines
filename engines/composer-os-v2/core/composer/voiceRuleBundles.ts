/**
 * Compiled VoiceRuleBundle tables — seven deep harmonic voices + neutral default.
 */

import type { VoiceRuleBundle } from './voiceRuleBundle';

/** Interval-class seeds aligned with Threadgill / IntervalSetSystem posture (engine-local). */
const THREADGILL_INTERVAL_CLASS_SEEDS = [1, 2, 3, 5, 6, 7, 8, 10];

export const NEUTRAL_VOICE_RULE_BUNDLE: VoiceRuleBundle = {
  voiceId: 'neutral',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 8,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 4,
    maxSpreadSemitones: 24,
    clusterSizeNotes: [3, 6],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'diatonic-step',
    maxLeapSemitones: 12,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
  },
  formPolicy: {
    narrativeArc: 'continuous-curve',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: {
    antiMetric: false,
  },
  repairPolicy: {
    resolveParallels: false,
    maxVoiceOverlap: 4,
  },
};

const GIL_EVANS: VoiceRuleBundle = {
  voiceId: 'gil_evans',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 2,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'melodic-counterline',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 10,
    maxSpreadSemitones: 20,
    clusterSizeNotes: [4, 6],
    forbidParallelFifths: true,
    forbidOctaveDoubling: true,
  },
  melodicPolicy: {
    contour: 'descending-arc',
    maxLeapSemitones: 7,
  },
  orchestrationPolicy: {
    anchorToneCount: 0,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
  },
  formPolicy: {
    narrativeArc: 'continuous-curve',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 2,
  },
};

const MARIA_SCHNEIDER: VoiceRuleBundle = {
  voiceId: 'maria_schneider',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 1,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 5,
    maxSpreadSemitones: 22,
    clusterSizeNotes: [3, 5],
    forbidParallelFifths: true,
    forbidOctaveDoubling: true,
  },
  melodicPolicy: {
    contour: 'descending-arc',
    maxLeapSemitones: 9,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: false,
  },
  formPolicy: {
    narrativeArc: 'continuous-curve',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 3,
  },
};

const JOHN_COLTRANE: VoiceRuleBundle = {
  voiceId: 'john_coltrane',
  harmonicRhythm: {
    minChordDurationBars: 0,
    maxChordDurationBars: 1,
    allowMidBarChange: true,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 6,
    maxSpreadSemitones: 36,
    clusterSizeNotes: [4, 8],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
    augmentedTriadLatticeBasis: true,
  },
  melodicPolicy: {
    contour: 'pentatonic-cell',
    maxLeapSemitones: 12,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
  },
  formPolicy: {
    narrativeArc: 'free',
    sectionRecallEnforced: false,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: false,
    maxVoiceOverlap: 5,
  },
};

const WAYNE_SHORTER: VoiceRuleBundle = {
  voiceId: 'wayne_shorter',
  harmonicRhythm: {
    minChordDurationBars: 2,
    maxChordDurationBars: 8,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'axis-root',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 8,
    maxSpreadSemitones: 30,
    clusterSizeNotes: [3, 7],
    forbidParallelFifths: true,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'orbiting',
    maxLeapSemitones: 9,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: false,
  },
  formPolicy: {
    narrativeArc: 'free',
    sectionRecallEnforced: false,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 3,
  },
};

const PAT_METHENY: VoiceRuleBundle = {
  voiceId: 'pat_metheny',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 1,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'diatonic-step-third',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 10,
    maxSpreadSemitones: 28,
    clusterSizeNotes: [4, 6],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
    lydianMaj7Sharp11Default: true,
  },
  melodicPolicy: {
    contour: 'diatonic-step',
    maxLeapSemitones: 8,
    flatTwoMaj7Approach: true,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
  },
  formPolicy: {
    narrativeArc: 'continuous-curve',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 3,
  },
};

const HENRY_THREADGILL: VoiceRuleBundle = {
  voiceId: 'henry_threadgill',
  harmonicRhythm: {
    minChordDurationBars: 0,
    maxChordDurationBars: 64,
    allowMidBarChange: true,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 3,
    maxSpreadSemitones: 14,
    clusterSizeNotes: [3, 5],
    forbidParallelFifths: true,
    forbidOctaveDoubling: true,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 14,
    preferredIntervalSets: THREADGILL_INTERVAL_CLASS_SEEDS,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: false,
  },
  formPolicy: {
    narrativeArc: 'suite',
    sectionRecallEnforced: false,
  },
  rhythmPolicy: {
    antiMetric: true,
  },
  repairPolicy: {
    resolveParallels: false,
    maxVoiceOverlap: 6,
  },
};

/** Thad Jones — research-documented dominants (octatonic colour), Dorian quartal minors, shout polychords (`SONGWRITER_CHORD_POOLS` tiers). */
const THAD_JONES: VoiceRuleBundle = {
  voiceId: 'thad_jones',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 2,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 6,
    maxSpreadSemitones: 26,
    clusterSizeNotes: [5, 8],
    forbidParallelFifths: true,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 11,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: false,
    fingerprintReceipts: [
      'Dominants: octatonic polychord voicings with #11 and altered 9s — not standard bebop altered scale',
      'Minor regions: never plain m7 — always carry 9/11/13 with melodic 13 highlighted',
      'Form: theme + variations; maintain functional resolution after every chromatic/modal departure',
      'Shout: recap motives at higher density, planned dynamic contour, drop one section then re-entry',
      'Texture evolution: sparse (unison) → call/response → solis/riffs → shout → thinning coda',
      'Template A dominant: {1,3,b7,9,#11,13} omit 5',
      'Template B dominant: {1,3,b7,9,5,#11,13} — 5 and #11 in near register',
      'Template C dominant: upper triad (octatonic subset) over {1,3,b7,9}',
      'Dorian minor / quartal So What family: {1,4,b7,3,5,9,13} — 11 directly above bass',
      'Lead trumpet shout: written D–G above staff; sustained lines one to two ledger lines higher',
      'Inner voices: at least two voices stepwise or contrary motion at each change',
      'Voice exchange: trombones carry 3rds/7ths; saxes carry extensions',
    ],
  },
  formPolicy: {
    narrativeArc: 'suite',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 5,
  },
};

const CHARLES_MINGUS: VoiceRuleBundle = {
  voiceId: 'charles_mingus',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 4,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'chromatic-first',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 5,
    maxSpreadSemitones: 22,
    clusterSizeNotes: [3, 6],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 11,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: true,
  },
  formPolicy: {
    narrativeArc: 'suite',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: {
    antiMetric: false,
    gospelShoutThreshold: 24,
  },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 4,
  },
};

const BY_ID: Record<string, VoiceRuleBundle> = {
  gil_evans: GIL_EVANS,
  thad_jones: THAD_JONES,
  maria_schneider: MARIA_SCHNEIDER,
  john_coltrane: JOHN_COLTRANE,
  wayne_shorter: WAYNE_SHORTER,
  pat_metheny: PAT_METHENY,
  henry_threadgill: HENRY_THREADGILL,
  charles_mingus: CHARLES_MINGUS,
};

export function normalizeHarmonicVoiceId(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/^hv:/, '');
  return t.replace(/-/g, '_').replace(/\s+/g, '_');
}

/** Resolve compiled bundle; unknown ids fall back to {@link NEUTRAL_VOICE_RULE_BUNDLE}. */
export function getVoiceRuleBundle(voiceId: string): VoiceRuleBundle {
  const key = normalizeHarmonicVoiceId(voiceId);
  if (!key) return { ...NEUTRAL_VOICE_RULE_BUNDLE };
  return BY_ID[key] ? { ...BY_ID[key] } : { ...NEUTRAL_VOICE_RULE_BUNDLE };
}
