/**
 * Riff-family VRB stubs — funk grid (James Brown, Nile Rodgers) + rock riff (Iommi, Hendrix).
 * Additive; does not alter existing fingerprint receipt lines on JAMES_BROWN.
 */

import type { DissonanceProfile } from '../counterpoint/abstractLineSet';
import type { RiffProfile, RiffSubdivisionGrid } from './riffProfileTypes';
import { fillReceipts } from './fillVrbReceipts';
import type { VoiceRuleBundle } from './voiceRuleBundle';
import { riffProfileSliceFromFunkGrid } from '../rhythm/funkGridPolicy';
import { getFunkGridPolicy } from '../rhythm/funkGridPolicy';
import { riffProfileSliceFromOddMeter } from '../rhythm/oddMeterEngine';
import { riffProfileSliceFromRockRiff } from '../rhythm/rockRiffPolicy';

const DIS_LOW: DissonanceProfile = {
  allowedIntervals: [0, 3, 4, 5, 7, 9, 10],
  forbiddenIntervals: [],
  parallelFifthsAllowed: false,
  parallelOctavesAllowed: false,
  resolveByStep: true,
};

/** Register-band MIDI anchors (Weather Report / Mahavishnu ensemble). */
const RB = {
  E1: 28,
  A2: 45,
  C3: 48,
  E3: 52,
  G3: 55,
  C6: 84,
  E6: 88,
  F6: 89,
  A6: 93,
} as const;

const DIS_RIFF_MOD: DissonanceProfile = {
  allowedIntervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  forbiddenIntervals: [],
  parallelFifthsAllowed: true,
  parallelOctavesAllowed: false,
  resolveByStep: false,
};

const DIS_ROCK_MOD: DissonanceProfile = {
  allowedIntervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  forbiddenIntervals: [],
  parallelFifthsAllowed: true,
  parallelOctavesAllowed: false,
  resolveByStep: false,
};

const NR_BASE = [
  'NR_HARM_01 — Top-note line drives harmony; chord quality changes under static bass pedal.',
  'NR_MELO_01 — Single-note funk line on upper strings; 3rd/7th/9th chord-fragment cells.',
  'NR_RHY_01 — 16th grid; hit-chuck-hit-chuck; ghost notes into target slots.',
  'NR_GTR_01 — Clean chord fragments max 7 semitone span; string sets [4,3,2] and [3,2,1].',
  'NR_FORM_01 — 2-bar harmonic colour cycle; maj7/min7/dom colour rotation.',
  'NR_DIS_01 — Low dissonance; lush extensions without tritone anchors.',
] as const;

const IM_BASE = [
  'IM_HARM_01 — Power5 / minor / dim riff harmony; tritone structural in Aeolian cells.',
  'IM_RHY_01 — 8th-note grid; straight feel; pedal-tone upper motion over low string anchor.',
  'IM_GTR_01 — Low register anchor E1–A4; open-string bias; C#/C/B detuning options.',
  'IM_REP_01 — Exact loop identity; pitch-streak allowed; min 2-bar repetition before variation.',
] as const;

const WR_BASE = [
  'WR_HARM_01 — Modal fusion colour: m9/m11/sus extensions over static or cycling harmony.',
  'WR_RHY_01 — Layered ostinati on 16th grid; internal 3+3+2 / 2+2+3 grouping over 4/4.',
  'WR_MELO_01 — Interval-cell lines (0,2,5,7); low chromatic budget; Dorian/Mixolydian pool.',
  'WR_ORCH_01 — Register bands: bass/keysLeft low, keysRight/sax mid-high; pedal bias moderate.',
] as const;

const MV_BASE = [
  'MV_HARM_01 — Quartal/power5 cells; high chromatic budget; odd-meter catalog (7–20/8).',
  'MV_RHY_01 — odd_grouped 7/8 default; polyGroupingMode; unison riff + drum polyrhythm.',
  'MV_MELO_01 — Chromatic interval cell [1,3,-2]; cross-instrument unison probability high.',
] as const;

const VL_BASE = [
  'VL_HARM_01 — min7/sus/add9 art-rock harmony; Aeolian/Dorian pool; low chromatic budget.',
  'VL_RHY_01 — Staggered counterpart lines; switching harmony role; no exact-loop default.',
  'VL_MELO_01 — Ascending [2,2,3] diatonic cells; mid-register guitar focus.',
] as const;

const MO_BASE = [
  'MO_HARM_01 — power5/min/sus2 riff harmony; minor pentatonic + Aeolian pool.',
  'MO_RHY_01 — Kill-switch 16th gate pattern; whammy slot events; call-response interlock.',
  'MO_MELO_01 — Low-string anchor; pedal-heavy power intervals; pitch-streak loops allowed.',
] as const;

const FP_RIFF_BASE = [
  'FP_RIFF_HARM_01 — Quartal/min7/maj7#11; process-cell modal usage; moderate chromatic budget.',
  'FP_RIFF_RHY_01 — 5/4 odd_grouped; phase-offset loop policy; 8-bar cell repetition.',
  'FP_RIFF_MELO_01 — Chromatic interval cell [1,2,-1,4]; swell dynamic process loop.',
] as const;

const HX_BASE = [
  'HX_HARM_01 — dom7#9 home colour; minor pentatonic + blues fills over chord-lead blend.',
  'HX_RHY_01 — 16th shuffle; thumb bass on 6; double-stop 3rds/6ths upper strings.',
  'HX_MELO_01 — Chord-driven modal usage; target-tone shifts between bars.',
  'HX_ORN_01 — Slides, grace attacks, bends; no ghost dead-note clutter default.',
] as const;

const LZ_BASE = [
  'LZ_TUN_01 — Multi-tuning palette: standard, DADGAD, open G, open D family (MIDI register bands).',
  'LZ_RHY_01 — 8th-primary rock feel; straight / shuffle / dotted-3-over-4 profiles; slightly behind grid on heavy riffs.',
  'LZ_TEX_01 — Single-note, power-chord, and hybrid riff textures; open-string drone bias.',
  'LZ_ODD_01 — 5/4 [3,2] and 7/8-or-15/8 [4,3] grouping catalog (non-superimposed).',
  'LZ_SPC_01 — Call-response space: riff bar then rest or minimal answer bar.',
  'LZ_MOD_01 — blues_rock / folk_modal / epic_modal_heavy style mode pools.',
] as const;

function straightAccentTopology(slots: RiffSubdivisionGrid): number[] {
  const out = new Array<number>(slots).fill(0.22);
  out[0] = 1;
  if (slots >= 8) out[slots >> 1] = 0.68;
  if (slots >= 16) out[(slots * 3) >> 2] = 0.55;
  return out;
}

function riffProfileShell(
  profile: Partial<RiffProfile> &
    Pick<
      RiffProfile,
      | 'meterPolicy'
      | 'subdivisionGrid'
      | 'repetitionPolicy'
      | 'registerAnchor'
      | 'riffRegisterFloor'
      | 'riffRegisterCeiling'
      | 'pedalBias'
      | 'octaveDisplacementTolerance'
      | 'allowPitchStreak'
      | 'ornamentPolicy'
    >
): RiffProfile {
  const slots = profile.subdivisionGrid;
  return {
    accentTopology: profile.accentTopology ?? straightAccentTopology(slots),
    silencePolicy: profile.silencePolicy ?? {
      restProbabilityBySlot: new Array(slots).fill(0.1),
      styleClass: 'riff_vrb_stub',
    },
    attackPolicy: profile.attackPolicy ?? 'sustain',
    riffContourPolicy: profile.riffContourPolicy ?? {
      rangeCeiling: 14,
      apexTiming: 0.5,
      returnTendency: 0.4,
    },
    powerIntervalPolicy: profile.powerIntervalPolicy ?? {
      fifthWeight: 0.45,
      octaveWeight: 0.35,
      pedalWeight: 0.35,
    },
    swingStyle: profile.swingStyle ?? 'straight',
    ...profile,
  };
}

function riffVrbStub(
  voiceId: string,
  sigma: number,
  family: 'fusion' | 'art_rock',
  riffProfile: RiffProfile,
  receiptPrefix: string,
  receiptLabel: string,
  receiptBase: readonly string[]
): VoiceRuleBundle {
  return {
    voiceId,
    sigma,
    family,
    harmonicRhythm: {
      minChordDurationBars: 1,
      maxChordDurationBars: 8,
      allowMidBarChange: true,
    },
    bassPolicy: { role: 'root', allowOctaveDoubling: true },
    voicingPolicy: {
      minSpreadSemitones: 4,
      maxSpreadSemitones: 22,
      clusterSizeNotes: [2, 6],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    melodicPolicy: { contour: 'angular', maxLeapSemitones: 14 },
    orchestrationPolicy: {
      anchorToneCount: 1,
      mutateSingleVoiceAtTime: false,
      allowCollectiveImprov: false,
      fingerprintReceipts: fillReceipts(receiptPrefix, receiptLabel, receiptBase),
    },
    formPolicy: { narrativeArc: 'free', sectionRecallEnforced: false },
    rhythmPolicy: { antiMetric: family === 'fusion' },
    repairPolicy: { resolveParallels: false, maxVoiceOverlap: 6 },
    contrapuntalLinePolicy: {
      enabled: true,
      dissonanceProfile: DIS_RIFF_MOD,
      preferredImitationTypes: ['free'],
      rhythmicIndependenceRequired: true,
      lineRoleAssignment: 'dynamic',
    },
    duoVoicePolicy: {
      guitarSource: 'soprano_line',
      bassSource: 'bass_line',
      rhythmicIndependenceFloor: 0.75,
      registerInterlock: true,
      intervalPreference: 'chromatic_pedal_modal',
    },
    riffProfile,
  };
}

/** James Brown deepening — funk grid slice + JB research overlays. */
export function buildJamesBrownRiffProfile(): RiffProfile {
  const slice = riffProfileSliceFromFunkGrid('jamesBrown');
  const funk = getFunkGridPolicy('jamesBrown');
  const bassMap = funk.voiceAccentMaps.find((v) => v.voiceId === 'bass');
  const guitarMap = funk.voiceAccentMaps.find((v) => v.voiceId === 'guitar');

  return {
    meterPolicy: 'simple',
    subdivisionGrid: 16,
    accentTopology: slice.accentTopology,
    accentTemplatePerVoice: {
      ...(slice.accentTemplatePerVoice ?? {}),
      ...(bassMap ? { bass: [...bassMap.slotWeights] } : {}),
      ...(guitarMap ? { guitar: [...guitarMap.slotWeights] } : {}),
    },
    antiCoincidenceVoices: [['bass', 'guitar']],
    preferCoincidenceSlots: [0],
    silencePolicy: slice.silencePolicy,
    ghostChainRules: slice.ghostChainRules,
    swingStyle: slice.swingStyle ?? 'funk16th',
    hornStabTopology: [
      { slots: [6, 7], minRestAfter: 4, repeatEveryBars: 1 },
      { slots: [14, 15], minRestAfter: 4, repeatEveryBars: 1 },
    ],
    harmonicColourCycle: {
      baseChord: 'min7',
      variants: ['min7', 'min9', 'dom9', 'dom13'],
      cyclePattern: [0, 1, 0, 2],
    },
    registerBandPerVoice: {
      bass: { min: 28, max: 50 },
      guitar: { min: 57, max: 79 },
      horns: { min: 60, max: 84 },
    },
    allowPitchStreak: true,
    tritoneStable: false,
    homeChordType: 'min7',
    repetitionPolicy: {
      exactLoopAllowed: true,
      pedalToneAllowed: true,
      barIdentityPersistence: 0.85,
      minExactRepetitions: 4,
    },
    attackPolicy: 'choke',
    riffContourPolicy: { rangeCeiling: 10, apexTiming: 0.45, returnTendency: 0.35 },
    registerAnchor: 'mid_register',
    riffRegisterFloor: 28,
    riffRegisterCeiling: 79,
    pedalBias: 0.55,
    octaveDisplacementTolerance: 0.35,
    powerIntervalPolicy: { fifthWeight: 0.45, octaveWeight: 0.3, pedalWeight: 0.5 },
    ornamentPolicy: { slides: false, ghosts: true, graceAttacks: false, bends: false, deadNotes: true },
  };
}

export const NILE_RODGERS: VoiceRuleBundle = {
  voiceId: 'nile_rodgers',
  sigma: 22,
  family: 'funk',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 4,
    allowMidBarChange: true,
  },
  bassPolicy: { role: 'root', allowOctaveDoubling: true },
  voicingPolicy: {
    minSpreadSemitones: 3,
    maxSpreadSemitones: 14,
    clusterSizeNotes: [2, 5],
    forbidParallelFifths: true,
    forbidOctaveDoubling: true,
  },
  melodicPolicy: { contour: 'stepwise-arc', maxLeapSemitones: 9 },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('NR', 'Nile Rodgers', NR_BASE),
  },
  formPolicy: { narrativeArc: 'blues-backbone', sectionRecallEnforced: true },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: { resolveParallels: true, maxVoiceOverlap: 4 },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_LOW,
    preferredImitationTypes: ['free'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.75,
    registerInterlock: true,
    intervalPreference: 'pentatonic_diatonic',
    textureTagType: 'funk_grid',
  },
  riffProfile: {
    ...riffProfileSliceFromFunkGrid('nileRodgers'),
    meterPolicy: 'simple',
    subdivisionGrid: 16,
    allowPitchStreak: false,
    homeChordType: 'maj7',
    chordQualitySet: ['maj7', 'min7', 'dom9', 'dom13', '6/9', 'sus2', 'sus4', 'add9'],
    chordFragmentVocabulary: {
      intervalRoles: ['3rd', '7th', '9th', '6th'],
      preferredStringSets: [
        [4, 3, 2],
        [3, 2, 1],
      ],
      maxSpanSemitones: 7,
    },
    topNoteLinePolicy: true,
    riffHarmonicCycleLengthBars: 2,
    registerAnchor: 'upper_register',
    registerBandPerVoice: { guitar: { min: 57, max: 74 } },
    riffRegisterFloor: 57,
    riffRegisterCeiling: 74,
    tritoneStable: false,
    variationOperators: ['articulationSwap', 'targetToneShift'],
    modalUsage: 'chord-driven',
    swingStyle: 'funk16th',
    repetitionPolicy: {
      exactLoopAllowed: false,
      pedalToneAllowed: false,
      barIdentityPersistence: 0.3,
      minExactRepetitions: 1,
    },
    attackPolicy: 'staccato',
    riffContourPolicy: { rangeCeiling: 9, apexTiming: 0.55, returnTendency: 0.5 },
    pedalBias: 0.4,
    octaveDisplacementTolerance: 0.45,
    powerIntervalPolicy: { fifthWeight: 0.35, octaveWeight: 0.25, pedalWeight: 0.2 },
    ornamentPolicy: { slides: false, ghosts: true, graceAttacks: false, bends: false, deadNotes: false },
  },
};

export const IOMMI: VoiceRuleBundle = {
  voiceId: 'iommi',
  sigma: 26,
  family: 'rock',
  harmonicRhythm: {
    minChordDurationBars: 2,
    maxChordDurationBars: 16,
    allowMidBarChange: false,
  },
  bassPolicy: { role: 'root', allowOctaveDoubling: true },
  voicingPolicy: {
    minSpreadSemitones: 5,
    maxSpreadSemitones: 22,
    clusterSizeNotes: [2, 4],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: { contour: 'angular', maxLeapSemitones: 12 },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('IM', 'Tony Iommi', IM_BASE),
  },
  formPolicy: { narrativeArc: 'blues-backbone', sectionRecallEnforced: false },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: { resolveParallels: false, maxVoiceOverlap: 5 },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_ROCK_MOD,
    preferredImitationTypes: ['free'],
    rhythmicIndependenceRequired: false,
    lineRoleAssignment: 'fixed',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.55,
    registerInterlock: true,
    intervalPreference: 'chromatic_pedal_modal',
  },
  riffProfile: {
    ...riffProfileSliceFromRockRiff('iommi'),
    meterPolicy: 'simple',
    subdivisionGrid: 8,
    allowPitchStreak: true,
    tritoneStable: true,
    homeChordType: 'power5',
    chordQualitySet: ['power5', 'min', 'dim'],
    intervalCell: { steps: [0, 6, 7], transpositionMode: 'chromatic' },
    scalePool: { Aeolian: 0.8, harmonicMinor: 0.7, Phrygian: 0.4 },
    registerAnchor: 'low_string',
    riffRegisterFloor: 28,
    riffRegisterCeiling: 69,
    pedalBias: 0.8,
    octaveDisplacementTolerance: 0.2,
    powerIntervalPolicy: { fifthWeight: 0.9, octaveWeight: 0.5, pedalWeight: 0.8 },
    repetitionPolicy: {
      exactLoopAllowed: true,
      pedalToneAllowed: true,
      barIdentityPersistence: 0.85,
      minExactRepetitions: 2,
    },
    variationOperators: ['tailFill', 'chromaticTag', 'finalChordSubstitution'],
    modalUsage: 'linear-melodic',
    swingStyle: 'straight',
    ornamentPolicy: { slides: false, ghosts: false, graceAttacks: false, bends: false, deadNotes: false },
    attackPolicy: 'sustain',
    riffContourPolicy: { rangeCeiling: 14, apexTiming: 0.4, returnTendency: 0.3 },
  },
};

export const HENDRIX: VoiceRuleBundle = {
  voiceId: 'hendrix',
  sigma: 28,
  family: 'rock',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 8,
    allowMidBarChange: true,
  },
  bassPolicy: { role: 'root', allowOctaveDoubling: true },
  voicingPolicy: {
    minSpreadSemitones: 4,
    maxSpreadSemitones: 18,
    clusterSizeNotes: [2, 6],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: { contour: 'blues-field-free', maxLeapSemitones: 14 },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('HX', 'Jimi Hendrix', HX_BASE),
  },
  formPolicy: { narrativeArc: 'blues-backbone', sectionRecallEnforced: false },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: { resolveParallels: true, maxVoiceOverlap: 5 },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_ROCK_MOD,
    preferredImitationTypes: ['free'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.7,
    registerInterlock: true,
    intervalPreference: 'blues_chromatic',
  },
  riffProfile: {
    ...riffProfileSliceFromRockRiff('hendrix'),
    meterPolicy: 'simple',
    subdivisionGrid: 16,
    allowPitchStreak: false,
    tritoneStable: false,
    homeChordType: 'dom7#9',
    chordQualitySet: ['dom7#9', 'min7', 'maj', '6/9', 'sus2', 'sus4', 'add9'],
    intervalCell: { steps: [0, 3, 5, 10], transpositionMode: 'diatonic' },
    scalePool: { minorPentatonic: 0.9, bluesScale: 0.8, Mixolydian: 0.6, Dorian: 0.4 },
    registerAnchor: 'mid_register',
    riffRegisterFloor: 45,
    riffRegisterCeiling: 74,
    pedalBias: 0.5,
    octaveDisplacementTolerance: 0.5,
    powerIntervalPolicy: { fifthWeight: 0.3, octaveWeight: 0.4, pedalWeight: 0.3 },
    repetitionPolicy: {
      exactLoopAllowed: false,
      pedalToneAllowed: true,
      barIdentityPersistence: 0.4,
      minExactRepetitions: 1,
    },
    variationOperators: ['articulationSwap', 'targetToneShift', 'startOffsetShift'],
    modalUsage: 'chord-driven',
    swingStyle: 'shuffle',
    thumbBassPolicy: { rootString: 6, upperVoiceStrings: [4, 3, 2], embellishmentAllowed: true },
    rhythmLeadBlendPolicy: {
      minChordsPerBar: 1,
      minFillsPerBar: 1,
      fillCellTypes: ['pentatonic', 'blues', 'chromatic-enclosure'],
    },
    doubleStopPolicy: {
      intervalsAllowed: [3, 4, 9],
      stringPairs: [
        [3, 2],
        [2, 1],
      ],
    },
    ornamentPolicy: { slides: true, ghosts: false, graceAttacks: true, bends: true, deadNotes: false },
    attackPolicy: 'sustain',
    riffContourPolicy: { rangeCeiling: 16, apexTiming: 0.6, returnTendency: 0.45 },
  },
};

/** Led Zeppelin / Jimmy Page riff stub (σ27) — NILE_RODGERS bundle shape, rock research profile. */
export const LED_ZEPPELIN: VoiceRuleBundle = {
  voiceId: 'led_zeppelin',
  sigma: 27,
  family: 'rock',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 8,
    allowMidBarChange: true,
  },
  bassPolicy: { role: 'root', allowOctaveDoubling: true },
  voicingPolicy: {
    minSpreadSemitones: 4,
    maxSpreadSemitones: 20,
    clusterSizeNotes: [2, 5],
    forbidParallelFifths: false,
    forbidOctaveDoubling: false,
  },
  melodicPolicy: { contour: 'angular', maxLeapSemitones: 12 },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('LZ', 'Led Zeppelin', LZ_BASE),
  },
  formPolicy: { narrativeArc: 'blues-backbone', sectionRecallEnforced: true },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: { resolveParallels: false, maxVoiceOverlap: 5 },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_ROCK_MOD,
    preferredImitationTypes: ['free'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.65,
    registerInterlock: true,
    intervalPreference: 'pentatonic_diatonic',
  },
  riffProfile: (() => {
    const rockSlice = riffProfileSliceFromRockRiff('generic');
    const slots = 8;
    const accent = straightAccentTopology(slots);
    accent[0] = 0.92;
    if (slots >= 4) accent[2] = 0.78;
    return riffProfileShell({
      ...rockSlice,
      meterPolicy: 'simple',
      subdivisionGrid: 8,
      accentTopology: accent,
      allowPitchStreak: false,
      tritoneStable: true,
      homeChordType: 'power5',
      chordQualitySet: ['power5', 'sus4', 'maj', 'min', 'dom7', 'sus2'],
      registerAnchor: 'low_string',
      riffRegisterFloor: 38,
      riffRegisterCeiling: 88,
      registerBandPerVoice: {
        guitar: { min: 40, max: 88 },
        riff_low: { min: 40, max: 55 },
        riff_mid: { min: 52, max: 69 },
      },
      silencePolicy: {
        ...rockSlice.silencePolicy,
        styleClass: 'Medium',
        rockRiffPreset: 'generic',
      },
      tuningPolicy: {
        tuningOptions: { standard: 0.6, DADGAD: 0.15, openG: 0.15, openD_family: 0.1 },
        midiFloor: 38,
        midiCeiling: 88,
        riffLowBand: [40, 55],
        riffMidBand: [52, 69],
      },
      rhythmFeel: {
        primarySubdivision: '8th',
        feelProfiles: ['straight_rock', 'shuffle_blues', 'dotted_3_over_4'],
        swingRatio: { straight: 1.0, shuffle: 1.3 },
        beatPlacement: 'slightly_behind',
      },
      intervalWeights: {
        m3: 1.0,
        P5: 1.0,
        P4: 0.9,
        M3: 0.7,
        M2: 0.4,
        tritone: 0.3,
        m2: 0.2,
      },
      intervalCell: { steps: [3, 5, 4], transpositionMode: 'diatonic' },
      textureMix: {
        singleNoteRiff: 0.4,
        powerChordRiff: 0.3,
        hybridSinglePlusChord: 0.3,
        openStringDroneProb: 0.45,
      },
      oddMeterUsage: {
        meters: [
          { label: '5/4_four_sticks', groups: [3, 2] },
          { label: '7/8_or_15/8_the_ocean', groups: [4, 3] },
        ],
        isSuperimposed: false,
      },
      groupingPatterns: [
        [3, 2],
        [4, 3],
      ],
      spacePolicy: {
        internalRestProb: 0.2,
        phraseEndRestBeats: [0.5, 1.0],
        callResponsePattern: 'riff_bar -> rest_or_minimal_bar',
      },
      phraseLengthBeats: [4, 8],
      cadenceTypes: {
        tail_fill: 0.4,
        sustained_sus_chord: 0.35,
        hard_stop_rest: 0.25,
      },
      styleModes: {
        blues_rock: { scales: ['minor_pentatonic', 'major_pentatonic', 'blues'] },
        folk_modal: { scales: ['Dorian', 'Mixolydian', 'Aeolian'], droneUsage: 'high' },
        epic_modal_heavy: {
          scales: ['DADGAD_Dorian', 'Phrygian_flavor'],
          droneUsage: 'very_high',
        },
      },
      contourPreferences: {
        heavyRiffs: { descending: 0.6, ascending: 0.2, arched: 0.2 },
        folkModal: { oscillating: 0.5, ascending: 0.25, descending: 0.25 },
      },
      pedalPoint: { enabled: true, targets: 'tonic_low_string' },
      chromaticApproachRules: [
        { degrees: [5, 6, 7], chordContext: 'I_chord', probability: 0.4 },
        { degrees: [3, 4, 5], chordContext: 'I_or_IV', probability: 0.3 },
      ],
      scalePool: {
        minor_pentatonic: 0.85,
        major_pentatonic: 0.7,
        blues: 0.75,
        Dorian: 0.65,
        Mixolydian: 0.6,
        Aeolian: 0.55,
      },
      pedalBias: 0.45,
      octaveDisplacementTolerance: 0.35,
      powerIntervalPolicy: { fifthWeight: 1.0, octaveWeight: 0.9, pedalWeight: 0.45 },
      repetitionPolicy: {
        exactLoopAllowed: true,
        pedalToneAllowed: true,
        barIdentityPersistence: 0.75,
        minExactRepetitions: 2,
      },
      variationOperators: ['tailFill', 'chromaticTag', 'registerShift', 'finalChordSubstitution'],
      modalUsage: 'linear-melodic',
      swingStyle: 'straight',
      attackPolicy: 'sustain',
      riffContourPolicy: { rangeCeiling: 15, apexTiming: 0.45, returnTendency: 0.35 },
      ornamentPolicy: { slides: true, ghosts: false, graceAttacks: false, bends: false, deadNotes: false },
    });
  })(),
};

export const WEATHER_REPORT = riffVrbStub(
  'weather_report',
  30,
  'fusion',
  riffProfileShell({
    ...riffProfileSliceFromOddMeter('weatherReport'),
    meterPolicy: 'simple',
    subdivisionGrid: 16,
    allowPitchStreak: false,
    tritoneStable: false,
    homeChordType: 'min7',
    chordQualitySet: ['m9', 'm11', 'm13', '7sus4', '9sus4', '13sus', 'maj7#11', 'maj9', 'maj13'],
    scalePool: { Dorian: 0.8, Mixolydian: 0.7, Lydian: 0.5, Phrygian: 0.2 },
    chromaticBudget: 0.15,
    intervalCell: { steps: [0, 2, 5, 7], transpositionMode: 'diatonic' },
    shorterCellLibrary: [
      [1, 2, 5],
      [5, 10, 9],
      [3, 6, 5],
    ],
    registerAnchor: 'mid_register',
    riffRegisterFloor: 28,
    riffRegisterCeiling: 84,
    registerBandPerVoice: {
      bass: { min: RB.E1, max: RB.C3 },
      keysLeft: { min: RB.E1, max: RB.A2 },
      keysRight: { min: RB.C3, max: RB.C6 },
      sax: { min: RB.G3, max: RB.F6 },
    },
    pedalBias: 0.3,
    octaveDisplacementTolerance: 0.4,
    repetitionPolicy: {
      exactLoopAllowed: true,
      pedalToneAllowed: true,
      barIdentityPersistence: 0.7,
      minExactRepetitions: 8,
    },
    variationOperators: ['targetToneShift', 'startOffsetShift', 'registerShift'],
    modalUsage: 'linear-melodic',
    ensembleInterlockMode: 'layeredOstinati',
    ornamentPolicy: {
      slides: true,
      ghosts: false,
      graceAttacks: true,
      bends: false,
      deadNotes: false,
    },
  }),
  'WR',
  'Weather Report',
  WR_BASE
);

export const MAHAVISHNU = riffVrbStub(
  'mahavishnu',
  32,
  'fusion',
  riffProfileShell({
    ...riffProfileSliceFromOddMeter('mahavishnu'),
    meterPolicy: 'odd_grouped',
    subdivisionGrid: 8,
    allowPitchStreak: false,
    tritoneStable: false,
    homeChordType: 'quartal',
    chordQualitySet: ['power5', 'quartal', 'min7', 'maj7'],
    scalePool: { Dorian: 0.6, Aeolian: 0.5, chromatic: 0.4, Phrygian: 0.3 },
    chromaticBudget: 0.5,
    intervalCell: { steps: [1, 3, -2], transpositionMode: 'chromatic' },
    registerAnchor: 'mid_register',
    riffRegisterFloor: 28,
    riffRegisterCeiling: 88,
    registerBandPerVoice: {
      bass: { min: RB.E1, max: RB.C3 },
      guitar: { min: RB.E3, max: RB.E6 },
      violin: { min: RB.G3, max: RB.A6 },
      keysLeft: { min: RB.E1, max: RB.A2 },
      keysRight: { min: RB.C3, max: RB.C6 },
    },
    pedalBias: 0.2,
    octaveDisplacementTolerance: 0.8,
    crossInstrumentUnisonProb: 0.7,
    powerIntervalPolicy: { fifthWeight: 0.5, octaveWeight: 0.7, pedalWeight: 0.2 },
    repetitionPolicy: {
      exactLoopAllowed: true,
      pedalToneAllowed: false,
      barIdentityPersistence: 0.5,
      minExactRepetitions: 2,
    },
    variationOperators: ['rhythmicWarp', 'truncateOrExtend', 'registerShift', 'cellTransposition'],
    modalUsage: 'process-cell',
    ensembleInterlockMode: 'unisonRiff+drumPolyrhythm',
    polyGroupingMode: true,
    ornamentPolicy: {
      slides: false,
      ghosts: false,
      graceAttacks: false,
      bends: false,
      deadNotes: false,
    },
  }),
  'MV',
  'Mahavishnu Orchestra',
  MV_BASE
);

export const VERLAINE = riffVrbStub(
  'verlaine',
  25,
  'art_rock',
  riffProfileShell({
    meterPolicy: 'simple',
    subdivisionGrid: 8,
    allowPitchStreak: false,
    tritoneStable: false,
    homeChordType: 'min7',
    chordQualitySet: ['min7', 'min9', 'maj', 'sus4', 'add9'],
    scalePool: { Aeolian: 0.8, Dorian: 0.5, naturalMajor: 0.2 },
    chromaticBudget: 0.1,
    intervalCell: { steps: [2, 2, 3], transpositionMode: 'diatonic' },
    registerAnchor: 'mid_register',
    riffRegisterFloor: 43,
    riffRegisterCeiling: 88,
    pedalBias: 0.1,
    octaveDisplacementTolerance: 0.3,
    repetitionPolicy: {
      exactLoopAllowed: false,
      pedalToneAllowed: false,
      barIdentityPersistence: 0.2,
      minExactRepetitions: 1,
    },
    variationOperators: ['targetToneShift', 'startOffsetShift', 'articulationSwap'],
    modalUsage: 'linear-melodic',
    counterpartVoicePolicy: {
      primaryVoice: 'verlaine',
      registerSeparation: 5,
      rhythmicOffsetBias: 'staggered',
      harmonyRole: 'switching',
      collisionAvoidance: 'no-unison-non-cadence',
    },
    ensembleInterlockMode: 'independent',
    silencePolicy: { restProbabilityBySlot: [], styleClass: 'art_rock_breath' },
    ornamentPolicy: {
      slides: true,
      ghosts: false,
      graceAttacks: false,
      bends: false,
      deadNotes: false,
    },
  }),
  'VL',
  'Tom Verlaine / Television',
  VL_BASE
);

export const MORELLO = riffVrbStub(
  'morello',
  25,
  'art_rock',
  riffProfileShell({
    meterPolicy: 'simple',
    subdivisionGrid: 16,
    allowPitchStreak: true,
    tritoneStable: false,
    homeChordType: 'power5',
    chordQualitySet: ['power5', 'min', 'sus2'],
    scalePool: { minorPentatonic: 0.8, Aeolian: 0.7, Dorian: 0.4 },
    chromaticBudget: 0.2,
    registerAnchor: 'low_string',
    riffRegisterFloor: 28,
    riffRegisterCeiling: 76,
    pedalBias: 0.6,
    octaveDisplacementTolerance: 0.4,
    powerIntervalPolicy: { fifthWeight: 0.7, octaveWeight: 0.5, pedalWeight: 0.6 },
    repetitionPolicy: {
      exactLoopAllowed: true,
      pedalToneAllowed: true,
      barIdentityPersistence: 0.8,
      minExactRepetitions: 4,
    },
    variationOperators: ['startOffsetShift'],
    modalUsage: 'linear-melodic',
    killSwitchPattern: {
      subdivision: '16th',
      gate: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
      loopLength: 16,
    },
    whammyEvents: [
      { slot: 4, mode: '+12', durationPulses: 2 },
      { slot: 12, mode: 'sweepUp', durationPulses: 4 },
    ],
    ensembleInterlockMode: 'callResponse',
    attackPolicy: 'staccato',
    ornamentPolicy: {
      slides: false,
      ghosts: false,
      graceAttacks: false,
      bends: false,
      deadNotes: true,
    },
  }),
  'MO',
  'Tom Morello',
  MO_BASE
);

const SS_BASE = [
  'SS_HARM_01 — Funky minor-dom colour; short cycle; rhythm-section interlock.',
  'SS_RHY_01 — Busy 16th grid; syncopated accent map; tight rest slots.',
  'SS_MELO_01 — Minor-third + whole-step cells; mid-register guitar focus.',
  'SS_FORM_01 — 2-bar loop identity; bar-to-bar variation budget moderate.',
] as const;

/** Sly Stone / Family Stone funk riff stub (σ24). */
export const SLY_STONE: VoiceRuleBundle = {
  voiceId: 'sly_stone',
  sigma: 24,
  family: 'funk',
  harmonicRhythm: {
    minChordDurationBars: 1,
    maxChordDurationBars: 4,
    allowMidBarChange: true,
  },
  bassPolicy: { role: 'root', allowOctaveDoubling: true },
  voicingPolicy: {
    minSpreadSemitones: 3,
    maxSpreadSemitones: 14,
    clusterSizeNotes: [2, 5],
    forbidParallelFifths: true,
    forbidOctaveDoubling: true,
  },
  melodicPolicy: { contour: 'stepwise-arc', maxLeapSemitones: 7 },
  orchestrationPolicy: {
    anchorToneCount: 1,
    mutateSingleVoiceAtTime: false,
    allowCollectiveImprov: false,
    fingerprintReceipts: fillReceipts('SS', 'Sly Stone', SS_BASE),
  },
  formPolicy: { narrativeArc: 'blues-backbone', sectionRecallEnforced: true },
  rhythmPolicy: { antiMetric: false },
  repairPolicy: { resolveParallels: true, maxVoiceOverlap: 4 },
  contrapuntalLinePolicy: {
    enabled: true,
    dissonanceProfile: DIS_LOW,
    preferredImitationTypes: ['free'],
    rhythmicIndependenceRequired: true,
    lineRoleAssignment: 'dynamic',
  },
  duoVoicePolicy: {
    guitarSource: 'soprano_line',
    bassSource: 'bass_line',
    rhythmicIndependenceFloor: 0.7,
    registerInterlock: true,
    intervalPreference: 'pentatonic_diatonic',
    textureTagType: 'funk_grid',
  },
  riffProfile: (() => {
    const slice = riffProfileSliceFromFunkGrid('jamesBrown');
    const slots = 16;
    const syncAccent = new Array<number>(slots).fill(0.5);
    syncAccent[0] = 0.35;
    for (let i = 1; i < slots; i += 2) syncAccent[i] = 0.92;
    if (slots >= 8) syncAccent[4] = 0.88;
    return riffProfileShell({
      ...slice,
      meterPolicy: 'simple',
      subdivisionGrid: 16,
      accentTopology: syncAccent,
      allowPitchStreak: false,
      homeChordType: 'min7',
      intervalCell: { steps: [3, 2], transpositionMode: 'diatonic' },
      silencePolicy: {
        ...slice.silencePolicy,
        styleClass: 'Busy',
        funkGridPreset: 'jamesBrown',
      },
      registerAnchor: 'mid_register',
      registerBandPerVoice: { guitar: { min: 50, max: 76 } },
      riffRegisterFloor: 50,
      riffRegisterCeiling: 76,
      repetitionPolicy: {
        exactLoopAllowed: true,
        pedalToneAllowed: true,
        barIdentityPersistence: 0.72,
        minExactRepetitions: 2,
      },
      variationOperators: ['targetToneShift', 'startOffsetShift', 'rhythmicWarp'],
      modalUsage: 'chord-driven',
      swingStyle: 'funk16th',
      pedalBias: 0.42,
      octaveDisplacementTolerance: 0.4,
      ornamentPolicy: { slides: false, ghosts: true, graceAttacks: false, bends: false, deadNotes: false },
    });
  })(),
};

export const FRIPP = riffVrbStub(
  'fripp',
  27,
  'art_rock',
  riffProfileShell({
    ...riffProfileSliceFromOddMeter('fripp'),
    meterPolicy: 'odd_grouped',
    subdivisionGrid: 8,
    allowPitchStreak: false,
    tritoneStable: false,
    homeChordType: 'quartal',
    chordQualitySet: ['quartal', 'min7', 'maj7#11'],
    scalePool: { Dorian: 0.6, Lydian: 0.5, wholeTone: 0.3, diminished: 0.2 },
    chromaticBudget: 0.35,
    intervalCell: { steps: [1, 2, -1, 4], transpositionMode: 'chromatic' },
    registerAnchor: 'mid_register',
    riffRegisterFloor: 45,
    riffRegisterCeiling: 91,
    pedalBias: 0.1,
    octaveDisplacementTolerance: 0.5,
    repetitionPolicy: {
      exactLoopAllowed: true,
      pedalToneAllowed: false,
      barIdentityPersistence: 0.6,
      minExactRepetitions: 8,
    },
    variationOperators: ['cellTransposition', 'rhythmicWarp'],
    modalUsage: 'process-cell',
    processLoopPolicy: { baseCellRepeatCount: 8, microEditProbPerCycle: 0.1, dynamicCurve: 'swell' },
    ensembleInterlockMode: 'independent',
    ornamentPolicy: {
      slides: false,
      ghosts: false,
      graceAttacks: false,
      bends: false,
      deadNotes: false,
    },
  }),
  'FP',
  'Robert Fripp (riff)',
  FP_RIFF_BASE
);
