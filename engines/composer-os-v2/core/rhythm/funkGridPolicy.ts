/**
 * Funk 16th-grid policy primitive — extends {@link ../counterpoint/abstractLineSet}'s `funk_grid`
 * texture tag and golden-path overlay timing without replacing them.
 *
 * Aligns beat quantum with `GRID_16TH = 0.25` in `jamesBrownFunkOverlay` / song-mode overlays.
 */

import type {
  RiffChordFragmentVocabulary,
  RiffGhostChainRule,
  RiffHarmonicColourCycle,
  RiffHornStabTopology,
  RiffProfile,
  RiffRegisterBand,
  RiffSilencePolicy,
} from '../composer/riffProfileTypes';

/** Sixteenth slots per 4/4 bar — matches {@link AbstractLineTextureTag} `gridUnit: '16th'`. */
export const FUNK_GRID_SLOTS_PER_BAR = 16 as const;

/** Quarter-beat duration of one 16th slot (same constant family as golden-path overlays). */
export const FUNK_GRID_16TH_BEAT = 0.25 as const;

export type FunkGridPolicyStyle = 'jamesBrown' | 'nileRodgers' | 'generic';

export type FunkGridRightHandGrammar = 'hit-chuck-hit-chuck' | 'ghost-chain' | 'mixed';

export interface FunkGridMicrotimingStdMs {
  kick: number;
  snare: number;
  hihat: number;
  bass: number;
  guitar: number;
}

export interface FunkGridGhostChainRule {
  voiceId: string;
  intoSlot: number;
  pattern: number[];
  probability: number;
}

export interface FunkGridVoiceAccentMap {
  voiceId: string;
  slotWeights: number[];
  avoidCoincidenceWith?: string[];
  preferCoincidenceOn?: number[];
}

export interface FunkGridHornStabCell {
  slots: number[];
  minRestAfter: number;
  repeatEveryBars: 1 | 2 | 4;
}

export interface FunkGridChordFragmentVocabulary {
  intervalRoles: string[];
  preferredStringSets: number[][];
  maxSpanSemitones: number;
}

export interface FunkGridHarmonicColourCycle {
  baseChord: string;
  variants: string[];
  cyclePattern: number[];
}

/**
 * Declarative 16th-slot funk grid — research passes 1 (grid theory), 3 (James Brown), 4 (Nile Rodgers).
 * Consumers: riff VRB profiles, future riff generator, duo groove planners (read-only).
 */
export interface FunkGridPolicy {
  styleId: FunkGridPolicyStyle;
  /** Locked near 1.0 for straight funk (not jazz swing). */
  swingRatio16: number;
  microtimingStdMs: FunkGridMicrotimingStdMs;
  /** Length {@link FUNK_GRID_SLOTS_PER_BAR} — per-slot base accent weight. */
  accentMap: number[];
  /** Extra weight on slot 0 and phrase-start anchors. */
  oneWeight: number;
  ghostProbMap: number[];
  restProbMap: number[];
  stabSlots: number[];
  ghostChainRules: FunkGridGhostChainRule[];
  voiceAccentMaps: FunkGridVoiceAccentMap[];
  hornStabTopology?: FunkGridHornStabCell[];
  chordFragmentVocabulary?: FunkGridChordFragmentVocabulary;
  topNoteLinePolicy?: boolean;
  rightHandGrammar?: FunkGridRightHandGrammar;
  harmonicColourCycle?: FunkGridHarmonicColourCycle;
  riffHarmonicCycleLengthBars?: number;
  registerBandPerVoice?: Record<string, RiffRegisterBand>;
  chordFragmentMaxSpan?: number;
}

/** MIDI register anchors (layered funk ensemble). */
const MIDI = {
  E1: 28,
  D3: 50,
  A3: 57,
  C4: 60,
  D5: 74,
  G5: 79,
  C6: 84,
} as const;

function assertLen16(name: string, arr: readonly number[]): void {
  if (arr.length !== FUNK_GRID_SLOTS_PER_BAR) {
    throw new Error(`funkGridPolicy: ${name} must have length ${FUNK_GRID_SLOTS_PER_BAR}, got ${arr.length}`);
  }
}

function slotMap16(
  strong: readonly number[],
  medium: readonly number[],
  weak = 0.12,
  strongWeight = 1,
  mediumWeight = 0.55
): number[] {
  const out = new Array<number>(FUNK_GRID_SLOTS_PER_BAR).fill(weak);
  for (const s of medium) out[s] = Math.max(out[s]!, mediumWeight);
  for (const s of strong) out[s] = Math.max(out[s]!, strongWeight);
  return out;
}

function probMap16(entries: Array<{ slots: readonly number[]; prob: number }>, fallback = 0.08): number[] {
  const out = new Array<number>(FUNK_GRID_SLOTS_PER_BAR).fill(fallback);
  for (const { slots, prob } of entries) {
    for (const s of slots) out[s] = Math.max(out[s]!, prob);
  }
  return out;
}

function validatePolicy(p: FunkGridPolicy): void {
  assertLen16('accentMap', p.accentMap);
  assertLen16('ghostProbMap', p.ghostProbMap);
  assertLen16('restProbMap', p.restProbMap);
  for (const v of p.voiceAccentMaps) assertLen16(`voiceAccentMaps.${v.voiceId}`, v.slotWeights);
}

function jbGhostChains(): FunkGridGhostChainRule[] {
  return [4, 8].map((intoSlot) => ({
    voiceId: 'guitar',
    intoSlot,
    pattern: [-3, -2, -1],
    probability: 0.7,
  }));
}

function nileGhostChains(): FunkGridGhostChainRule[] {
  return [
    { voiceId: 'guitar', intoSlot: 4, pattern: [-1], probability: 0.45 },
    { voiceId: 'guitar', intoSlot: 8, pattern: [-1], probability: 0.45 },
    { voiceId: 'guitar', intoSlot: 12, pattern: [-1], probability: 0.4 },
    { voiceId: 'guitar', intoSlot: 6, pattern: [-1], probability: 0.35 },
    { voiceId: 'guitar', intoSlot: 14, pattern: [-1], probability: 0.35 },
  ];
}

function genericGhostChains(): FunkGridGhostChainRule[] {
  return [
    { voiceId: 'guitar', intoSlot: 4, pattern: [-2, -1], probability: 0.5 },
    { voiceId: 'guitar', intoSlot: 8, pattern: [-2, -1], probability: 0.5 },
  ];
}

function jamesBrownPolicy(): FunkGridPolicy {
  const beatSlots = [0, 4, 8, 12] as const;
  const eighthUp = [2, 6, 10, 14] as const;
  const policy: FunkGridPolicy = {
    styleId: 'jamesBrown',
    swingRatio16: 1,
    microtimingStdMs: { kick: 8, snare: 12, hihat: 6, bass: 10, guitar: 10 },
    accentMap: slotMap16(beatSlots, eighthUp),
    oneWeight: 2,
    ghostProbMap: probMap16(
      [
        { slots: [3, 5, 7, 9], prob: 0.72 },
        { slots: [1, 11, 13, 15], prob: 0.28 },
      ],
      0.18
    ),
    restProbMap: probMap16(
      [
        { slots: beatSlots, prob: 0.04 },
        { slots: [3, 5, 7, 9], prob: 0.12 },
        { slots: [1, 2, 6, 10, 11, 13, 14, 15], prob: 0.22 },
      ],
      0.15
    ),
    stabSlots: [6, 7, 14, 15],
    ghostChainRules: jbGhostChains(),
    voiceAccentMaps: [
      {
        voiceId: 'bass',
        slotWeights: slotMap16([0], [2, 6, 10, 14], 0.2, 1.1, 0.65),
        avoidCoincidenceWith: ['guitar'],
      },
      {
        voiceId: 'guitar',
        slotWeights: slotMap16([4, 8, 12], [2, 6, 10, 14], 0.15, 1, 0.5).map((w, i) =>
          i === 0 ? w * 0.35 : w
        ),
        avoidCoincidenceWith: ['bass'],
      },
    ],
    hornStabTopology: [
      { slots: [6, 7], minRestAfter: 4, repeatEveryBars: 2 },
      { slots: [14, 15], minRestAfter: 4, repeatEveryBars: 2 },
    ],
    rightHandGrammar: 'ghost-chain',
    riffHarmonicCycleLengthBars: 16,
    registerBandPerVoice: {
      bass: { min: MIDI.E1, max: MIDI.D3 },
      guitar: { min: MIDI.A3, max: MIDI.G5 },
      horns: { min: MIDI.C4, max: MIDI.C6 },
    },
    chordFragmentMaxSpan: 12,
  };
  validatePolicy(policy);
  return policy;
}

function nileRodgersPolicy(): FunkGridPolicy {
  const beatSlots = [0, 4, 8, 12] as const;
  const eighthUp = [2, 6, 10, 14] as const;
  const ghostSlots = [1, 3, 5, 7, 9, 11, 13, 15] as const;
  const policy: FunkGridPolicy = {
    styleId: 'nileRodgers',
    swingRatio16: 1,
    microtimingStdMs: { kick: 5, snare: 5, hihat: 4, bass: 8, guitar: 6 },
    accentMap: slotMap16(beatSlots, eighthUp, 0.1, 1, 0.5).map((w, i) =>
      ghostSlots.includes(i as (typeof ghostSlots)[number]) ? w * 0.35 : w
    ),
    oneWeight: 1.2,
    ghostProbMap: probMap16(
      [
        { slots: ghostSlots, prob: 0.38 },
        { slots: [3, 7, 11, 15], prob: 0.48 },
      ],
      0.12
    ),
    restProbMap: probMap16(
      [
        { slots: beatSlots, prob: 0.06 },
        { slots: ghostSlots, prob: 0.14 },
      ],
      0.1
    ),
    stabSlots: [0, 4, 8, 12, 6, 14],
    ghostChainRules: nileGhostChains(),
    voiceAccentMaps: [
      {
        voiceId: 'guitar',
        slotWeights: slotMap16([6, 14], [0, 4, 8, 12], 0.2, 1, 0.7),
        preferCoincidenceOn: [6, 14],
        avoidCoincidenceWith: ['bass'],
      },
      {
        voiceId: 'bass',
        slotWeights: slotMap16([0, 4, 8, 12], [2, 6, 10, 14], 0.18, 0.95, 0.55),
        preferCoincidenceOn: [6, 14],
        avoidCoincidenceWith: ['guitar'],
      },
    ],
    rightHandGrammar: 'hit-chuck-hit-chuck',
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
    harmonicColourCycle: {
      baseChord: 'C',
      variants: ['maj7', 'min7', 'dom9', '13sus', '6/9', 'sus2', 'sus4', 'add9'],
      cyclePattern: [0, 1, 0, 2],
    },
    registerBandPerVoice: {
      guitar: { min: MIDI.A3, max: MIDI.D5 },
    },
    chordFragmentMaxSpan: 7,
  };
  validatePolicy(policy);
  return policy;
}

function genericPolicy(): FunkGridPolicy {
  const beatSlots = [0, 4, 8, 12] as const;
  const eighthUp = [2, 6, 10, 14] as const;
  const policy: FunkGridPolicy = {
    styleId: 'generic',
    swingRatio16: 1,
    microtimingStdMs: { kick: 7, snare: 8, hihat: 5, bass: 9, guitar: 8 },
    accentMap: slotMap16(beatSlots, eighthUp),
    oneWeight: 1.5,
    ghostProbMap: probMap16(
      [
        { slots: [3, 5, 7, 9], prob: 0.45 },
        { slots: [1, 11, 13, 15], prob: 0.25 },
      ],
      0.14
    ),
    restProbMap: probMap16(
      [
        { slots: beatSlots, prob: 0.05 },
        { slots: [3, 5, 7, 9], prob: 0.16 },
      ],
      0.12
    ),
    stabSlots: [4, 8, 12],
    ghostChainRules: genericGhostChains(),
    voiceAccentMaps: [
      {
        voiceId: 'bass',
        slotWeights: slotMap16([0, 4, 8, 12], [2, 6, 10, 14], 0.18),
      },
      {
        voiceId: 'guitar',
        slotWeights: slotMap16([4, 8, 12], [2, 6, 10, 14], 0.16),
      },
    ],
    rightHandGrammar: 'mixed',
    riffHarmonicCycleLengthBars: 8,
    chordFragmentMaxSpan: 10,
  };
  validatePolicy(policy);
  return policy;
}

/** Named preset factories (research-backed). */
export const funkGridPolicy = {
  jamesBrown: jamesBrownPolicy,
  nileRodgers: nileRodgersPolicy,
  generic: genericPolicy,
} as const;

export function getFunkGridPolicy(style: FunkGridPolicyStyle): FunkGridPolicy {
  switch (style) {
    case 'jamesBrown':
      return funkGridPolicy.jamesBrown();
    case 'nileRodgers':
      return funkGridPolicy.nileRodgers();
    case 'generic':
      return funkGridPolicy.generic();
    default: {
      const _exhaustive: never = style;
      return _exhaustive;
    }
  }
}

function toRiffGhostChains(rules: FunkGridGhostChainRule[]): RiffGhostChainRule[] {
  return rules.map((r) => ({ ...r }));
}

function toRiffHornStabs(cells: FunkGridHornStabCell[] | undefined): RiffHornStabTopology[] | undefined {
  if (!cells?.length) return undefined;
  return cells.map((c) => ({ ...c }));
}

function toRiffChordFragment(v: FunkGridChordFragmentVocabulary | undefined): RiffChordFragmentVocabulary | undefined {
  if (!v) return undefined;
  return { ...v, preferredStringSets: v.preferredStringSets.map((s) => [...s]) };
}

function toRiffColourCycle(c: FunkGridHarmonicColourCycle | undefined): RiffHarmonicColourCycle | undefined {
  if (!c) return undefined;
  return { ...c, variants: [...c.variants], cyclePattern: [...c.cyclePattern] };
}

/**
 * Maps a {@link FunkGridPolicy} preset into {@link RiffProfile} silence/ghost/accent fields
 * so riff generator and VRB builders can reference `funkGridPreset` by name.
 */
export function riffProfileSliceFromFunkGrid(style: FunkGridPolicyStyle): Pick<
  RiffProfile,
  | 'accentTopology'
  | 'accentTemplatePerVoice'
  | 'silencePolicy'
  | 'ghostChainRules'
  | 'preferCoincidenceSlots'
  | 'hornStabTopology'
  | 'chordFragmentVocabulary'
  | 'topNoteLinePolicy'
  | 'harmonicColourCycle'
  | 'registerBandPerVoice'
  | 'subdivisionGrid'
  | 'swingStyle'
> {
  const p = getFunkGridPolicy(style);
  const accentTemplatePerVoice: Record<string, number[]> = {};
  for (const v of p.voiceAccentMaps) {
    accentTemplatePerVoice[v.voiceId] = [...v.slotWeights];
  }
  const preferCoincidenceSlots = [
    ...new Set(p.voiceAccentMaps.flatMap((v) => v.preferCoincidenceOn ?? [])),
  ].sort((a, b) => a - b);

  const silencePolicy: RiffSilencePolicy = {
    restProbabilityBySlot: [...p.restProbMap],
    styleClass: `funk_grid:${p.styleId}`,
    funkGridPreset: p.styleId,
  };

  return {
    subdivisionGrid: 16,
    swingStyle: 'funk16th',
    accentTopology: [...p.accentMap],
    accentTemplatePerVoice,
    preferCoincidenceSlots: preferCoincidenceSlots.length ? preferCoincidenceSlots : undefined,
    silencePolicy,
    ghostChainRules: toRiffGhostChains(p.ghostChainRules),
    hornStabTopology: toRiffHornStabs(p.hornStabTopology),
    chordFragmentVocabulary: toRiffChordFragment(p.chordFragmentVocabulary),
    topNoteLinePolicy: p.topNoteLinePolicy,
    harmonicColourCycle: toRiffColourCycle(p.harmonicColourCycle),
    registerBandPerVoice: p.registerBandPerVoice ? { ...p.registerBandPerVoice } : undefined,
  };
}

/** Slot index → beat position in quarter-note space (0..4). */
export function funkGridSlotToBeat(slot: number): number {
  return slot * FUNK_GRID_16TH_BEAT;
}

/** Effective accent weight for a slot including `oneWeight` on downbeat 1. */
export function funkGridAccentAtSlot(policy: FunkGridPolicy, slot: number, phraseStart = false): number {
  const base = policy.accentMap[slot] ?? 0;
  const onOne = slot === 0 || phraseStart;
  return base + (onOne ? policy.oneWeight - 1 : 0);
}
