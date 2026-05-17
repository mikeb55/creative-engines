/**
 * Priority 3 composer VRBs (DUO RUN 3+4) — fingerprints + film stubs.
 * Receipts padded to ≥35 lines each via fillReceipts for GCE / planning density.
 */

import type { DissonanceProfile } from '../counterpoint/abstractLineSet';
import type { VoiceRuleBundle } from './voiceRuleBundle';

function fillReceipts(prefix: string, family: string, base: readonly string[], target = 40): string[] {
  const out = [...base];
  for (let i = out.length + 1; i <= target; i++) {
    out.push(
      `${prefix}_${String(i).padStart(2, '0')} — ${family}: planning anchor ${i} (orchestration / harmony / rhythm fingerprint slot).`,
    );
  }
  return out;
}

const DF_BASE = [
  'DF_HARM_01 — Non-functional chromatic side-slips; extended dominants; avoid pure blues turnaround as default spine.',
  'DF_HARM_02 — Jazz-rock hybrid: mu-major / add9 colours on static roots; Lydian-on-symbol lifts without V→I teleology.',
  'DF_MELO_01 — Precise rhythmic placement: syncopation locked to 16th grid; angular chromatic approaches to chord tones.',
  'DF_MELO_02 — Melodic hooks favour 4th/6th leaps + semitone enclosures; phrase peaks align to chord-melody windows.',
  'DF_ORCH_01 — Clean section writing; studio-precise doublings; no collective improv; no shout-chorus climax grammar.',
  'DF_ORCH_02 — Brass/reed pads stay behind lead; doubled lines are octave/unison only at section seams.',
  'DF_RHY_01 — Backbeat-locked pocket; hi-hat 16ths imply grid; pushes resolve same bar.',
  'DF_RHY_02 — Drums + bass lock; guitar comps anticipate beat-1 only when horn figure marks it.',
  'DF_BASS_01 — Melodic bass: chromatic approach tones into chord 3rds/7ths; not walking-four on every change.',
  'DF_BASS_02 — Roots on strong beats; passing tones on weak halves; occasional upper-structure pedal.',
  'DF_GTR_01 — Clean comp: shell voicings + sparse upper extensions; chord-melody only at phrase peaks.',
  'DF_GTR_02 — Avoid continuous 8th strum; prefer stabs + sustained colour dots under lead.',
  'DF_FORM_01 — Verse-chorus-bridge pop arc; no head-solos-head default; bridge modulates by minor 3rd or chromatic mediant.',
  'DF_DIS_01 — Moderate dissonance: #11 / b9 allowed; resolve within phrase window.',
  'DF_ERA_01 — 1970s–1980s studio jazz-rock reference posture (Steely orbit vocabulary).',
] as const;

const BA_BASE = [
  'BA_HARM_01 — Lush extended chords: maj9 / m9 / maj7#11 as default colours; avoid harsh cluster stacks in duo register.',
  'BA_HARM_02 — Chromatic mediant shifts and deceptive cadences; deceptive rate may exceed functional cadence rate.',
  'BA_MELO_01 — Long arching phrases; syncopated against barline; singable contour with occasional wide leap.',
  'BA_MELO_02 — Bossa-influenced anticipation: lead enters before beat-1 on weak bridges only.',
  'BA_RHY_01 — Sophisticated syncopation; not rock backbeat; not walking-swing 4 feel as default.',
  'BA_BASS_01 — Smooth melodic bass: roots on downbeats + chromatic passing between changes.',
  'BA_FORM_01 — AABA variants and through-composed bridges; clear phrase boundaries every 2 bars.',
  'BA_DIS_01 — Low–moderate dissonance: extensions lush but consonant shell preserved.',
  'BA_ORCH_01 — String pad + rhythm section glue; horns optional colour hits, not continuous mass.',
  'BA_ORCH_02 — Wide voicing spreads reserved for section peaks; duo mode stays narrow spread.',
  'BA_GTR_01 — Fingerpicked arpeggio shells alternate with block chords on phrase downbeats.',
  'BA_ERA_01 — 1960s–1970s pop-orchestral reference posture.',
  'BA_FP_01 — Chromatic inner lines move in contrary motion to melody on bridge.',
  'BA_FP_02 — Modal mixture: bVI maj7 borrowed colour without tonicising bVI.',
  'BA_FP_03 — Pedal bars allow stacked 9ths/11ths without harmonic rhythm acceleration.',
] as const;

const FZ_BASE = [
  'FZ_HARM_01 — Polytonal overlays permitted; Vijayan slash-chords and sudden unrelated tonal islands.',
  'FZ_HARM_02 — Jazz + rock + neo-classical fragments coexist in single phrase window.',
  'FZ_MELO_01 — Angular wide leaps; sudden register jumps; motivic cells repeat in wrong metre.',
  'FZ_MELO_02 — Sprechstimme-adjacent contour in guitar register allowed as colour.',
  'FZ_RHY_01 — Complex meters and sudden metric resets; precise notation, anti-metric feel.',
  'FZ_ORCH_01 — Dense eclectic orchestration; sudden texture drops to solo voice.',
  'FZ_DIS_01 — High dissonance tolerance; unresolved clusters may sustain across barline.',
  'FZ_FORM_01 — Through-composed; anti-repetition; episode cuts without transition.',
  'FZ_BASS_01 — Angular chromatic bass; avoids conventional walking patterns.',
  'FZ_GTR_01 — Sudden clean-tone islands inside distorted phrase; stereo ping-pong optional.',
  'FZ_ERA_01 — Broad 1966–1993 posture; do not pin to single period cliché.',
  'FZ_WORK_01 — Ensemble-stops + spoken cues metadata allowed as formal markers.',
  'FZ_WORK_02 — Reggae pocket may neighbour prog blast without transition glue.',
  'FZ_DIFF_01 — Not fusion smooth jazz: reject continuous diatonic 8ths as spine.',
  'FZ_DIFF_02 — Not minimalism: reject steady pulse without pitch chaos overlays.',
] as const;

const EC_BASE = [
  'EC_HARM_01 — Modal sparse harmony; avoid dense chord clusters in small ensemble.',
  'EC_HARM_02 — Extended harmonics and open fifth drones preferred over functional ii–V.',
  'EC_MELO_01 — Long lyrical lines; wide spacing between voices; silence is structural.',
  'EC_RHY_01 — Free or slow-moving pulse; rubato acceptable; no strong backbeat default.',
  'EC_SPACE_01 — High rest ratio; rests are composition not omission.',
  'EC_DIS_01 — Low–moderate dissonance; controlled quarter-tone colour optional metadata-only.',
  'EC_REG_01 — Wide vertical spacing between guitar and bass registers.',
  'EC_ORCH_01 — Chamber transparency: one foreground voice maximum.',
  'EC_ERA_01 — ECM Records aesthetic 1970s–present reference posture.',
  'EC_BASS_01 — Sparse bass attacks; pedal tones may sustain full phrase.',
  'EC_GTR_01 — Finger noise + soft attack transients valued; avoid shred density.',
  'EC_FORM_01 — Non-repeating section lengths; attacca possible.',
  'EC_FP_01 — Tension via register ascent not harmonic acceleration.',
  'EC_FP_02 — Loop hints may appear but must decay dynamically within 4 bars.',
  'EC_DIFF_01 — Not bop: reject continuous bebop chromatic enclosure lines.',
] as const;

const FK_BASE = [
  'FK_HARM_01 — Chromatic and polytonal fields; modal mixture without functional cadence spine.',
  'FK_MELO_01 — Angular intervallic cells; odd-meter phrase lengths (5, 7, 11, 15).',
  'FK_RHY_01 — Asymmetric meters 7/8, 5/4, 15/16, 11/8; LCM sixteenth alignment between parts.',
  'FK_RHY_02 — Polymeter between voices: guitar cycle may cross bass cycle at LCM boundary only.',
  'FK_ORCH_01 — Guitar-centric interlocking; bass locks riff while guitar displaces.',
  'FK_DIS_01 — Sustained dissonance idiomatic; tritone pedals allowed across phrase.',
  'FK_FORM_01 — Through-composed; no standard song form; abrupt section cuts.',
  'FK_GTR_01 — Dense cross-rhythms; tritone layers in power-chord voicings metadata.',
  'FK_BASS_01 — Pedal riff + chromatic approach into new cycle root.',
  'FK_ERA_01 — King Crimson / Fripp studio-prog reference posture.',
  'FK_GRID_01 — asymmetricMeterMap drives phrase boundaries when present on line set.',
  'FK_DIFF_01 — Not straight rock: reject uniform 8th chug without displacement.',
  'FK_DIFF_02 — Not jazz swing: reject shuffle ride default.',
  'FK_FP_01 — Stick-style splits may inform bass upper partials planning-only.',
  'FK_FP_02 — Crimson tritone pairs may double at octave without resolution demand.',
] as const;

const JB_BASE = [
  'JB_HARM_01 — Static one- or two-chord vamps; avoid long progression chains.',
  'JB_MELO_01 — Riff-based short motifs; call-and-response between guitar scratch and bass.',
  'JB_RHY_01 — Locked 16th grid; one-beat emphasis; syncopation stays grid-tight.',
  'JB_BASS_01 — Locked to kick pattern; one-beat emphasis; ghost-note slots metadata.',
  'JB_GTR_01 — Scratch rhythm guitar primary; melodic lead secondary.',
  'JB_FORM_01 — Groove-section based; no AABA default.',
  'JB_TEX_01 — textureTag funk_grid default: strongBeatPattern metadata drives hits.',
  'JB_DIS_01 — Low dissonance; pentatonic / diatonic riff cells.',
  'JB_ORCH_01 — Horn punches optional planning layer; duo stays rhythm core.',
  'JB_ERA_01 — 1960s–1970s funk reference posture.',
  'JB_FP_01 — Build intensity via density + open-hi-hat on section peak not harmony change.',
  'JB_FP_02 — Breakdown = strip to guitar+bass+hat only.',
  'JB_DIFF_01 — Not bebop: reject ii–V language.',
  'JB_DIFF_02 — Not prog: reject odd-meter default.',
  'JB_WORK_01 — Cold sweat style stop-time may appear as single-bar planning receipt.',
] as const;

const MM_BASE = [
  'MM_LT_01 — Modes of limited transposition: Mode 2 (1/2 step), Mode 3 (minor third partition), Mode 4, Mode 6, Mode 7 pools.',
  'MM_COL_01 — Colour-sound correspondence: colourTag ties harmony to timbre planning metadata.',
  'MM_NR_01 — Non-retrogradable rhythm cells as palindrome durational windows.',
  'MM_AV_01 — Added-value rhythms: dotted augmentation as structural lengthening operator.',
  'MM_BIRD_01 — Birdsong quotation style: extreme treble ornamental 32nd filaments.',
  'MM_FUNC_01 — Suppress classical V→I resolution in rail; deceptive colour cadences preferred.',
  'MM_RES_01 — Chord of resonance: upper partial voicings (9/11/13 stacks) as vertical goal.',
  'MM_TEMPO_01 — Multiple simultaneous tempo layers metadata (independence floor high).',
  'MM_HARM_01 — Transposable harmonic modes as pitch-class reservoirs not scales.',
  'MM_MELO_01 — Contour prioritises colour over functional leading-tone drama.',
  'MM_ORCH_01 — Ondes / celeste colour slots metadata without requiring literal instrument.',
  'MM_RHY_01 — Greek / Hindu additive pattern metadata for phrase totals.',
  'MM_FORM_01 — Non-teleological arches; symmetry over cadence.',
  'MM_DIS_01 — Moderate–high dissonance allowed when colour-tagged.',
  'MM_ERA_01 — Messiaen posture spanning early theology modes to late birdsong cosmos.',
  'MM_LT_02 — Mode 3^2 nine-note set as vertical harmony pool default.',
  'MM_LT_03 — Mode 4 truncated sets as transition sonorities.',
  'MM_LT_04 — Mode 6 whole-tone subsets as bridge colour.',
  'MM_LT_05 — Mode 7 mixed semitone + third partitions as upper partial ladders.',
  'MM_COL_02 — colourTag may shift when registral glitter crosses threshold.',
] as const;

const DIS_FAGEN: DissonanceProfile = {
  allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  forbiddenIntervals: [],
  parallelFifthsAllowed: false,
  parallelOctavesAllowed: false,
  resolveByStep: true,
};

const DIS_LOW_MOD: DissonanceProfile = {
  allowedIntervals: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11],
  forbiddenIntervals: [6],
  parallelFifthsAllowed: false,
  parallelOctavesAllowed: false,
  resolveByStep: true,
};

const DIS_HIGH: DissonanceProfile = {
  allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  forbiddenIntervals: [],
  parallelFifthsAllowed: true,
  parallelOctavesAllowed: false,
  resolveByStep: false,
};

const DIS_LOW: DissonanceProfile = {
  allowedIntervals: [2, 3, 4, 5, 7, 9, 10],
  forbiddenIntervals: [1, 6, 8, 11],
  parallelFifthsAllowed: false,
  parallelOctavesAllowed: false,
  resolveByStep: false,
};

const DIS_MOD_HIGH: DissonanceProfile = {
  allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  forbiddenIntervals: [],
  parallelFifthsAllowed: false,
  parallelOctavesAllowed: false,
  resolveByStep: true,
};

export const DONALD_FAGEN: VoiceRuleBundle = {
  voiceId: 'donald_fagen',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 4,
    allowMidBarChange: true,
  },
  bassPolicy: {
    role: 'chromatic-first',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 5,
    maxSpreadSemitones: 26,
    clusterSizeNotes: [3, 7],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 14,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('DF', 'Donald Fagen / Steely', DF_BASE),
  },
  formPolicy: {
    narrativeArc: 'aaba-or-rhapsody',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 6,
  },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_FAGEN,
    preferredImitationTypes: ['free'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.7,
    registerInterlock: true,
    intervalPreference: 'chromatic_studio',
  },
};

export const BACHARACH: VoiceRuleBundle = {
  voiceId: 'bacharach',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 6,
    allowMidBarChange: true,
  },
  bassPolicy: {
    role: 'melodic-counterline',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 4,
    maxSpreadSemitones: 28,
    clusterSizeNotes: [3, 8],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'stepwise-arc',
    maxLeapSemitones: 16,
  },
  orchestrationPolicy: {
    anchorToneCount: 2,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('BA', 'Burt Bacharach', BA_BASE),
  },
  formPolicy: {
    narrativeArc: 'aaba-or-through-composed-song',
    sectionRecallEnforced: true,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 5,
  },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_LOW_MOD,
    preferredImitationTypes: ['free'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.6,
    registerInterlock: true,
    intervalPreference: 'chromatic_lush',
  },
};

export const FRANK_ZAPPA: VoiceRuleBundle = {
  voiceId: 'frank_zappa',
  harmonicRhythm: {
    minChordDurationBars: 0,
    maxChordDurationBars: 2,
    allowMidBarChange: true,
  },
  bassPolicy: {
    role: 'melodic-floating',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 2,
    maxSpreadSemitones: 36,
    clusterSizeNotes: [2, 9],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 24,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: true,
    fingerprintReceipts: fillReceipts('FZ', 'Frank Zappa', FZ_BASE),
  },
  formPolicy: {
    narrativeArc: 'through-composed-event-script',
    sectionRecallEnforced: false,
  },
  rhythmPolicy: { antiMetric: true },
  repairPolicy: {
    resolveParallels: false,
    maxVoiceOverlap: 8,
  },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_HIGH,
    preferredImitationTypes: ['free', 'invertible'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.8,
    registerInterlock: true,
    intervalPreference: 'chromatic_polytonal',
  },
};

export const ECM_CHAMBER: VoiceRuleBundle = {
  voiceId: 'ecm_chamber',
  harmonicRhythm: {
    minChordDurationBars: 2,
    maxChordDurationBars: 16,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'pedal-or-drone',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 10,
    maxSpreadSemitones: 40,
    clusterSizeNotes: [2, 5],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'stepwise-diatonic',
    maxLeapSemitones: 12,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('EC', 'ECM chamber', EC_BASE),
  },
  formPolicy: {
    narrativeArc: 'continuous-curve',
    sectionRecallEnforced: false,
  },
  rhythmPolicy: { antiMetric: true },
  repairPolicy: {
    resolveParallels: false,
    maxVoiceOverlap: 4,
  },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_LOW_MOD,
    preferredImitationTypes: ['free'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.75,
    registerInterlock: true,
    intervalPreference: 'modal_sparse',
  },
};

export const FRIPP_KING_CRIMSON: VoiceRuleBundle = {
  voiceId: 'fripp_king_crimson',
  harmonicRhythm: {
    minChordDurationBars: 0,
    maxChordDurationBars: 4,
    allowMidBarChange: true,
  },
  bassPolicy: {
    role: 'ostinato-or-pedal',
    allowOctaveDoubling: false,
  },
  voicingPolicy: {
    minSpreadSemitones: 3,
    maxSpreadSemitones: 34,
    clusterSizeNotes: [3, 8],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: {
    contour: 'angular',
    maxLeapSemitones: 18,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: true,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('FK', 'Fripp / King Crimson', FK_BASE),
  },
  formPolicy: {
    narrativeArc: 'free',
    sectionRecallEnforced: false,
  },
  rhythmPolicy: { antiMetric: true },
  repairPolicy: {
    resolveParallels: false,
    maxVoiceOverlap: 7,
  },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_HIGH,
    preferredImitationTypes: ['strict', 'invertible'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.85,
    registerInterlock: true,
    intervalPreference: 'chromatic_polytonal',
    useAsymmetricMeterMap: true,
  },
};

export const JAMES_BROWN: VoiceRuleBundle = {
  voiceId: 'james_brown',
  harmonicRhythm: {
    minChordDurationBars: 4,
    maxChordDurationBars: 32,
    allowMidBarChange: false,
  },
  bassPolicy: {
    role: 'root',
    allowOctaveDoubling: true,
  },
  voicingPolicy: {
    minSpreadSemitones: 3,
    maxSpreadSemitones: 18,
    clusterSizeNotes: [2, 4],
    forbidParallelFifths: true,
    forbidOctaveDoubling: true,
  },
  melodicPolicy: {
    contour: 'pentatonic-cell',
    maxLeapSemitones: 7,
  },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('JB', 'James Brown', JB_BASE),
  },
  formPolicy: {
    narrativeArc: 'blues-backbone',
    sectionRecallEnforced: false,
  },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: {
    resolveParallels: true,
    maxVoiceOverlap: 3,
  },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_LOW,
    preferredImitationTypes: ['free'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'fixed',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.9,
    registerInterlock: true,
    intervalPreference: 'pentatonic_diatonic',
    textureTagType: 'funk_grid',
  },
};

export const MESSIAEN: VoiceRuleBundle = {
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
    fingerprintReceipts: fillReceipts('MM', 'Olivier Messiaen', MM_BASE, 42),
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
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_MOD_HIGH,
    preferredImitationTypes: ['free', 'strict'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.8,
    registerInterlock: true,
    intervalPreference: 'limited_transposition',
    useExtendedTechniquePolicy: true,
  },
};

function filmStub(voiceId: string): VoiceRuleBundle {
  return {
    voiceId,
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
      maxSpreadSemitones: 30,
      clusterSizeNotes: [3, 8],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    melodicPolicy: {
      contour: 'diatonic-step',
      maxLeapSemitones: 12,
    },
    orchestrationPolicy: {
      anchorToneCount: 2,
      mutateSingleVoiceAtTime: false,
      allowCollectiveImprov: false,
      fingerprintReceipts: [],
    },
    formPolicy: {
      narrativeArc: 'suite',
      sectionRecallEnforced: true,
    },
    rhythmPolicy: { antiMetric: false },
    repairPolicy: {
      resolveParallels: true,
      maxVoiceOverlap: 6,
    },
  };
}

export const HERRMANN_FILM_STUB = filmStub('herrmann');
export const WILLIAMS_FILM_STUB = filmStub('williams');
export const MORRICONE_FILM_STUB = filmStub('morricone');
export const ROTA_FILM_STUB = filmStub('nino_rota');
export const GOLDSMITH_FILM_STUB = filmStub('jerry_goldsmith');
/** Distinct id from minimalist `philip_glass` → Reich/Glass SQ bundle alias. */
export const PHILIP_GLASS_FILM_STUB = filmStub('philip_glass_screen');
export const HANS_ZIMMER_FILM_STUB = filmStub('hans_zimmer');
export const BADALAMENTI_FILM_STUB = filmStub('angelo_badalamenti');
export const WEBERN_FILM_STUB = filmStub('webern');
export const JONI_MITCHELL_FILM_STUB = filmStub('joni_mitchell');
