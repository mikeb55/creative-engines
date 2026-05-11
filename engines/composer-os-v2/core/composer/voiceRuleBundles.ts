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
    fingerprintReceipts: [
      'Voicing: wide-spread open stacks; horns double motives across octaves — registral air, not compact block voicings',
      'Anti-block: avoid uniform section homophony — blend families so single lines double across brass/reeds/strings',
      'Colour primaries: bass clarinet + French horn as timbral anchors alongside pastel muted brass',
      'Harmony: modal / sus centres, slow harmonic rhythm, lateral non-functional root motion over pedals',
      'Melody rides above static or slowly morphing fields — not bar-by-bar chord-tone chasing',
      'Texture layers: flutes + muted brass + low reeds simultaneously — pastel cluster fields',
      'Density discipline: medium-low default; reserve full tutti for single climax windows',
      'Inner parts: independent slow-moving counterlines — not pad filling behind a single lead',
      'Pulse: loose floating grid — rhythm section supports colour washes; backbeat secondary to timbre',
      'Orchestration matches GIL_EVANS_KEYS_COMP: mid cluster gap, m2 inner bite, cello/contrary bass colour',
      'BB/Song Mode: cluster orchestration receipts echo slow-cloud harmonic rhythm + polyrhythm-in-grid-not-harmony posture',
    ],
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
    fingerprintReceipts: [
      'Form: through-composed arcs — continuous development vs repeating chorus templates',
      'Harmony: modal + impressionist stacks; long pedals; tertian–quartal morph with common-tone holds',
      'Orchestration blend: families fuse on colour lines — e.g. flute + muted trumpet + vibraphone as one strand',
      'Density arc: slow accumulation over multi-bar spans — avoid sudden tutti drops except scripted seams',
      'Melody: long-breathed vocal arcs; wide registral span; apex coupled to harmonic rhythm lifts',
      'Rhythm: metric modulation / tempo seams between sections — not locked swing-grid loops throughout',
      'Backgrounds: developmental inner motion — evolving pads rather than static riff loops',
      'Programmatic texture: landscape/nature imagery drives orchestration choices (wind vs brass vs metal)',
      'Brass colour: flutter-tongue, cup / harmon mute colours as timbre — not raw dynamic spikes alone',
      'Align MARIA_SCHNEIDER_KEYS_COMP: cross-section roles, interval-seeded cells, pedal + upper colour shift',
      'Slice authority: ms:pedal / ms:color_stack / ms:nature_arc receipts inform pad vs climax voicing bias',
    ],
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
    fingerprintReceipts: [
      'Harmony: non-functional chromatic motion — lateral roots (thirds, tritones) vs textbook cycles',
      'Melody: compact motivic cells + wide intervallic leaps — penalise long scalar fills',
      'Form: ambiguous / through-composed seams — avoid tidy repeating AABA plates',
      'Rhythm: metric ambiguity; phrases may avoid bar-1 resolution — floating phrase toes',
      'Voicing: quartal / quintal / sus stacks — floating tonal centre, axis bass outlines',
      'Orchestration: instruments enter/exit unpredictably — roles swap phrase-to-phrase',
      'Space: rests and thin textures as structural device — silence between phrases is intentional',
      'Big band: backgrounds deliberately avoid locking kicks to soloist rhythm — commentary not mimicry',
      'Wedge / spine: ws:wedge + chromatic compression toward focal pitch — harmonic telescope receipts',
      'Align WAYNE_SHORTER_KEYS_COMP: axis bass, chromatic mediant brass hits, reed motivic carriers',
      'Colour: neighbour inner voices + compound outer intervals — perfect fourth as structural hinge',
    ],
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

/** Duke Ellington — jungle timbre, call/response, stride piano vs sparse Basie (`dukeEllingtonSlice.ts` `de:*`). */
const DUKE_ELLINGTON: VoiceRuleBundle = {
  voiceId: 'duke_ellington',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 3,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 6,
    maxSpreadSemitones: 26,
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
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: true,
    fingerprintReceipts: [
      'Timbre identity: plunger / growl / wa-wa muted brass as melodic dialogue — not polish-first section blends',
      'Jungle palette: low brass + woodwind colour threads vs tidy sax/brass block homophony',
      'Reeds: close-position sax soli + frequent unison/instrument doubles as structural pillars',
      'Form: AABA-family with Ellington extensions — intros/outros carry compositional weight',
      'Solo frames: featured voices steer the chart — accompaniment reorganises around soloists',
      'Piano: stride / active swing comp fills phrase seams — higher structural duty than sparse Basie pad',
      'Sax choir: warm harmonic pad + recurring soli leads — registers mapped to call/response roles',
      'Brass: antiphonal plunger conversations — effects as pitch/rhythm language',
      'Rhythm feel: early two-beat vs later four-beat swing — era-appropriate quarter pulse staging',
      'Narrative arc: programmatic / suite logic — short charts still imply journey + recap transforms',
      'Locked harmony echo: align `ellingtonCallResponseMap` / `de:call` · `de:response` registral contrast',
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

const MESSIAEN: VoiceRuleBundle = {
  voiceId: 'messiaen',
  harmonicRhythm: {
    minChordDurationBars: 2,
    maxChordDurationBars: 24,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 14,
    maxSpreadSemitones: 38,
    clusterSizeNotes: [4, 10],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 24,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: false,
    fingerprintReceipts: [
      'Harmony: Mode 3² as primary colour — 9-note limited-transposition set; favour this transposition in harmony spine',
      'Melodic posture: modes are harmonic reservoirs — avoid monophonic modal scale runs as structural melody (post-1940 vocabulary)',
      'Colour gate: track ≥3 chord symbols in same mode family before treating registral colour shifts as “loaded”',
      'Chord of Resonance: Mode-3 resonance sonorities anchored in pool rows (`maj9/E` shells) — not tonic resolution',
      'Orchestration: stained-glass CTI voicing — four distinct chord colours over a shared bass anchor across families',
      'Rhythm: non-retrogradable cells — palindrome durational DNA at phrase windows; barlines mark phrases not march beats',
      'Rhythm: additive inserts — sneak +1 sixteenth into ostinati; phrase totals favour primes (17/19/23 sixteenths)',
      'Birdsong: extreme treble ornamental strata — 16th/32nd filament streams independent of harmonic grid',
      'Temporal layering: eternal palindrome layer vs fleeting birdsong layer sounding simultaneously',
      'Voice-leading: colour translation — lateral symmetric moves; ban classical V→I functional discharge in rail',
      'Register: cathedral spacing — keep bass tower ≥3 octaves under birdsong glitter unless texture brief says otherwise',
      'Period posture: early=modes+theology · middle=birdsong-as-architecture + ondes-colour · late=birdsong-dominant colour cosmology',
    ],
  },
  formPolicy: {
    narrativeArc: 'free',
    sectionRecallEnforced: false,
  },
  rhythmPolicy: { antiMetric: true },
  repairPolicy: {
    resolveParallels: false,
    maxVoiceOverlap: 6,
  },
};

const BY_ID: Record<string, VoiceRuleBundle> = {
  gil_evans: GIL_EVANS,
  duke_ellington: DUKE_ELLINGTON,
  ellington: DUKE_ELLINGTON,
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
  messiaen: MESSIAEN,
  olivier_messiaen: MESSIAEN,
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
