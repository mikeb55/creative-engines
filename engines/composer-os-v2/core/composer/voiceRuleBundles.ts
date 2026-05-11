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

const SAMMY_NESTICO: VoiceRuleBundle = {
  voiceId: 'sammy_nestico',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 2,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 6,
    maxSpreadSemitones: 22,
    clusterSizeNotes: [4, 7],
    forbidParallelFifths: true,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'diatonic-step',
    maxLeapSemitones: 9,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: [
      'Kick figures: brass accents locked to rhythm-section pushes on beat 1 / &-of beats',
      'Chart hygiene: phrase corners tidy — minimal conflicting extensions on weak beats',
      'Density via riff punches vs pads — avoid continuous tutti wash',
      'Functional backbone: dominants resolve cleanly unless shout lift approaching',
      'Section purity: reeds on interior harmony; brass on rhythmic punctuation',
      'Bridge strips texture before chorus shout recap — staged dynamics',
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

const BOB_BROOKMEYER: VoiceRuleBundle = {
  voiceId: 'bob_brookmeyer',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 3,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'chromatic-first',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 7,
    maxSpreadSemitones: 26,
    clusterSizeNotes: [4, 8],
    forbidParallelFifths: true,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 11,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: false,
    fingerprintReceipts: [
      'Quartal/quintal harmonic stacks as structural colour fields — not passing ornament',
      'Counter-lines at simultaneous thirds/fifths avoided — prefer contrary motion',
      'Metric displacement hooks arrive mid-phrase — never random beat-one resets',
      'Section takeover: lead transfers sax→bone→full ensemble without doubling creep',
      'Dense passes anchor outer voices — interior clusters spell alterations explicitly',
      'Swing bounce restored after quartal plateaus via ii–V pocket before shout',
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

const CLARE_FISCHER: VoiceRuleBundle = {
  voiceId: 'clare_fischer',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 2,
    allowMidBarChange: true,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 8,
    maxSpreadSemitones: 24,
    clusterSizeNotes: [5, 9],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'descending-arc',
    maxLeapSemitones: 10,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: false,
    fingerprintReceipts: [
      'Dense tertian layers — upper-structure clusters voiced compact mid-register',
      'Latin groove coupling: harmonic rhythm aligns with clave-sidekick ostinati',
      'Inner voices carry alterations — top line sings consonant melodic anchors',
      'Section turns pivot via slash chords / bass pedal rather than wholesale modulation',
      'Ballad mode favours maj9 / m11 pillars — avoid abrupt brightness spikes',
      'Controlled orchestral density — fewer simultaneous doubles on shout peaks',
    ],
  },
  formPolicy: {
    narrativeArc: 'continuous-curve',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 4,
  },
};

const QUINCY_JONES: VoiceRuleBundle = {
  voiceId: 'quincy_jones',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 2,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 6,
    maxSpreadSemitones: 24,
    clusterSizeNotes: [4, 8],
    forbidParallelFifths: true,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'diatonic-step',
    maxLeapSemitones: 10,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: [
      'Tight brass: kicks and punches aligned to bass/drum backbeat — no vague wash',
      'Pop–jazz crossover: hook-friendly tops over altered dominants and sus resolutions',
      'Rhythm-section precision: articulation matches hat/kick language bar to bar',
      'Call-and-response: antiphonal brass/reed vs rhythm or guitar comp figures',
      'Shout staging: partial ensemble → layered brass stacks → drop to rhythm bed',
      'Orchestral lifts: dominant prolongation / pad builds before recap or tag',
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

const OLIVER_NELSON: VoiceRuleBundle = {
  voiceId: 'oliver_nelson',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 2,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 6,
    maxSpreadSemitones: 22,
    clusterSizeNotes: [4, 7],
    forbidParallelFifths: true,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 10,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: [
      'Blues-functional backbone with arranged extensions — shout lifts recycle blues degrees',
      'Section contrast via register orchestration — thin reed choir vs brass punches',
      'Chart economy: punches breathe — rests between hits clarify phrase seams',
      'Swing authority: phrase articulation matches rhythm-section hat/kick language',
      'Head–solos–shout arc explicit — mid-piece modal plateau bridges transitions',
      'Modal centres voiced open-voiced stacks — avoid muddy clusters low brass',
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

const BERG: VoiceRuleBundle = {
  voiceId: 'berg',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 6,
    allowMidBarChange: true,
  },
  bassPolicy: {
    role: 'chromatic-first',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 3,
    maxSpreadSemitones: 28,
    clusterSizeNotes: [3, 8],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 12,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: [
      'Four planes: melodic / contrapuntal / harmonic-pad / rhythmic',
      'Foreground row: allow octave doublings; background: wide registral spread',
      'Brass: muted pads vs open structural peaks; strings: clarity vs density divisi',
      'Extended techniques: sul ponticello (tension), col legno (brutality), Sprechstimme (raw speech)',
    ],
  },
  formPolicy: {
    narrativeArc: 'suite',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 7,
  },
  bergVoiceLeading: {
    rowClarityLevel: 'balanced',
    contrapuntalStrandTarget: 6,
  },
};

const COUNT_BASIE: VoiceRuleBundle = {
  voiceId: 'count_basie',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 2,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 4,
    maxSpreadSemitones: 18,
    clusterSizeNotes: [2, 4],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'diatonic-step',
    maxLeapSemitones: 9,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: [
      'Sparse piano comp: 2–4 note voicings, offbeat syncopation, reactive density to horn lead',
      'Background riff: static blues-based motif in 2–4 bar loops — does not track changes note-for-note',
      'Sax soli: four-way close voicing, drop-2 spreads, dim7 passing tones on phrase corners',
      'Call-response: equal phrase duration; affirmation vs imitation; response density ≤ call density',
      'Shout: gradual dynamic build pp→ff; sections drop sequentially into cadence',
      'Brass: lead trumpet top on melody; muted pads in backgrounds; open unmuted brass on shout peaks',
      'Intro: pedal send-off or drum break hook — 2–3 bars before head entry',
      'Old vs New Testament: compositionContext.basieTestamentMode gates riff-forward KC vs Ne‑He‑Hi orchestral precision',
    ],
  },
  formPolicy: {
    narrativeArc: 'suite',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 4,
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
    fingerprintReceipts: [
      'Orchestration: avoid fixed sax choir vs brass choir — mix trumpet + alto + trombone + bari freely',
      'Shout voicings: adjacent seconds in inner voices; heavy low brass; mid-register crunch — not constant high trumpet lead',
      'Dirge: bass trombone + bari sax + bass + low piano; upper horns enter as cries/shrieks',
      'Bass lines: wide-interval leaps (6ths, 7ths, 9ths) alternating with chromatic runs; register shifts at tension peaks',
      'Shout rhythm: horn accents on 2&, 3&, 4e, 4& — bass locked to straight quarters (walk) or riff',
      'Dynamic shout contour: partial ensemble → ff tutti clusters → drop to solo/small group → final restatement',
      'Blues/pentatonic tones anchor formal arrivals despite intermediate chromatic harmony',
      'Raise probability: bII7→I, side-slipped ii–V pairs, I7/IV7 colour in blues contexts',
      'Melody: occasional wide leaps then compensating stepwise motion',
      'Minor: ♭13 as linear tension over minor harmony (stepwise)',
      'Tonic areas: substitute dominants a tritone or minor third away while melody outlines blues scale',
    ],
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
  count_basie: COUNT_BASIE,
  sammy_nestico: SAMMY_NESTICO,
  bob_brookmeyer: BOB_BROOKMEYER,
  clare_fischer: CLARE_FISCHER,
  oliver_nelson: OLIVER_NELSON,
  quincy_jones: QUINCY_JONES,
  berg: BERG,
  alban_berg: BERG,
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
