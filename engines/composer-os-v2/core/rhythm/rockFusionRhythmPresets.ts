/**
 * Rock / fusion rhythm presets — Style Panel + song-form context keys.
 * Grid legend: X=accent (100), x=ghost (40), O=open hi-hat (70), -=rest (0).
 */

export type RockFusionEngineId =
  | 'straight_rock'
  | 'shuffle_blues_rock'
  | 'funk_rock'
  | 'half_time_hip_hop'
  | 'reggae_family'
  | 'hard_rock_metal'
  | 'prog_5_4'
  | 'prog_7_8'
  | 'prog_7_4'
  | 'jazz_rock_fusion'
  | 'afrobeat_rock';

export type RockFusionSubdivisionMode = 'straight' | 'shuffle_timing_transform';

export type ReggaeSubFeelId = 'one_drop' | 'rockers' | 'steppers' | 'ska';

export interface RockFusionMeter {
  signature: string;
  gridSteps: number;
  groups: number[];
  baseUnit: 'sixteenth' | 'eighth';
}

export interface RockFusionFeelProfile {
  subdivisionMode: RockFusionSubdivisionMode;
  swingRatio?: number;
  shuffleTimingTransform?: boolean;
  bpmRange: [number, number];
  bassLockRatio: number;
  downbeatWeight: number;
}

export interface ReggaeSubFeelPattern {
  id: ReggaeSubFeelId;
  label: string;
  lanes: { kick: number[]; snare: number[]; hiHat: number[] };
}

export interface RockFusionRhythmPreset {
  id: string;
  engineId: RockFusionEngineId;
  label: string;
  meter: RockFusionMeter;
  lanes: { kick: number[]; snare: number[]; hiHat: number[] };
  feel: RockFusionFeelProfile;
  groupingVector?: readonly number[];
  subFeels?: readonly ReggaeSubFeelPattern[];
  gmNoteMap: { kick: number; snare: number; hiHat: number; openHiHat: number };
}

const ACCENT = 100;
const GHOST = 40;
const OPEN_HAT = 70;

function laneFromPattern(
  pattern: string,
  map: { X: number; x: number; O: number; '-': number }
): number[] {
  return [...pattern].map((ch) => map[ch as keyof typeof map] ?? 0);
}

function straight16KickSnareHi(
  kick: string,
  snare: string,
  hi: string
): { kick: number[]; snare: number[]; hiHat: number[] } {
  const map = { X: ACCENT, x: GHOST, O: OPEN_HAT, '-': 0 };
  return {
    kick: laneFromPattern(kick, map),
    snare: laneFromPattern(snare, map),
    hiHat: laneFromPattern(hi, map),
  };
}

export const DEFAULT_ROCK_FUSION_GM_MAP = {
  kick: 36,
  snare: 38,
  hiHat: 42,
  openHiHat: 46,
} as const;

export const ROCK_FUSION_RHYTHM_PRESETS: readonly RockFusionRhythmPreset[] = [
  {
    id: 'straight-rock-basic',
    engineId: 'straight_rock',
    label: 'Straight Rock',
    meter: { signature: '4/4', gridSteps: 16, groups: [8, 8], baseUnit: 'sixteenth' },
    ...straight16KickSnareHi('X-------X-------', '----X-------X---', 'x-x-x-x-x-x-x-x'),
    feel: { subdivisionMode: 'straight', bpmRange: [88, 152], bassLockRatio: 0.85, downbeatWeight: 0.9 },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'shuffle-blues-basic',
    engineId: 'shuffle_blues_rock',
    label: 'Shuffle / Blues Rock',
    meter: { signature: '4/4', gridSteps: 16, groups: [8, 8], baseUnit: 'sixteenth' },
    ...straight16KickSnareHi('X-------X---X---', '----X-------X---', 'x-x-x-x-x-x-x-x'),
    feel: {
      subdivisionMode: 'shuffle_timing_transform',
      swingRatio: 0.67,
      shuffleTimingTransform: true,
      bpmRange: [76, 138],
      bassLockRatio: 0.82,
      downbeatWeight: 0.88,
    },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'funk-rock-basic',
    engineId: 'funk_rock',
    label: 'Funk Rock',
    meter: { signature: '4/4', gridSteps: 16, groups: [8, 8], baseUnit: 'sixteenth' },
    ...straight16KickSnareHi('X---X-X-----X---', '--x-X---x---X-x-', 'xxxxxxxxxxxxxxxx'),
    feel: { subdivisionMode: 'straight', bpmRange: [84, 116], bassLockRatio: 0.78, downbeatWeight: 0.75 },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'half-time-hip-hop-basic',
    engineId: 'half_time_hip_hop',
    label: 'Half-Time / Hip-Hop',
    meter: { signature: '4/4', gridSteps: 16, groups: [8, 8], baseUnit: 'sixteenth' },
    ...straight16KickSnareHi('X-----X---X-----', '--------X-------', 'x-x-x-x-O-x-x-x-'),
    feel: { subdivisionMode: 'straight', bpmRange: [66, 96], bassLockRatio: 0.92, downbeatWeight: 0.95 },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'reggae-one-drop',
    engineId: 'reggae_family',
    label: 'Reggae Family — One Drop',
    meter: { signature: '4/4', gridSteps: 16, groups: [8, 8], baseUnit: 'sixteenth' },
    ...straight16KickSnareHi('--------X-------', '--------X-------', '-x-x-x-x-x-x-x-x'),
    feel: { subdivisionMode: 'straight', bpmRange: [68, 108], bassLockRatio: 0.88, downbeatWeight: 0.7 },
    subFeels: [
      { id: 'one_drop', label: 'One Drop', lanes: straight16KickSnareHi('--------X-------', '--------X-------', '-x-x-x-x-x-x-x-x') },
      { id: 'rockers', label: 'Rockers', lanes: straight16KickSnareHi('X-------X-------', '--------X-------', '-x-x-x-x-x-x-x-x') },
      { id: 'steppers', label: 'Steppers', lanes: straight16KickSnareHi('X---X---X---X---', '----X-------X---', '-x-x-x-x-x-x-x-x') },
      { id: 'ska', label: 'Ska', lanes: straight16KickSnareHi('----X-------X---', '--X---X---X-X---', 'x-x-x-x-x-x-x-x-') },
    ],
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'hard-rock-metal-basic',
    engineId: 'hard_rock_metal',
    label: 'Hard Rock / Metal',
    meter: { signature: '4/4', gridSteps: 16, groups: [8, 8], baseUnit: 'sixteenth' },
    ...straight16KickSnareHi('X-X-X-X-X-X-X-X-', '----X-------X---', 'x-x-x-x-x-x-x-x-'),
    feel: { subdivisionMode: 'straight', bpmRange: [110, 190], bassLockRatio: 0.8, downbeatWeight: 0.92 },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'prog-5-4-basic',
    engineId: 'prog_5_4',
    label: '5/4 Prog Rock',
    meter: { signature: '5/4', gridSteps: 20, groups: [12, 8], baseUnit: 'sixteenth' },
    groupingVector: [3, 2],
    ...straight16KickSnareHi('X-------X---X-------', '----X-------X-------', 'x-x-x-x-x-x-x-x-x-x'),
    feel: { subdivisionMode: 'straight', bpmRange: [92, 148], bassLockRatio: 0.86, downbeatWeight: 0.88 },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'prog-7-8-basic',
    engineId: 'prog_7_8',
    label: '7/8 Prog Rock',
    meter: { signature: '7/8', gridSteps: 14, groups: [8, 6], baseUnit: 'sixteenth' },
    groupingVector: [2, 2, 3],
    ...straight16KickSnareHi('X---X---X-----', '--X---X---X---', 'x-x-x-x-x-x-x-'),
    feel: { subdivisionMode: 'straight', bpmRange: [108, 176], bassLockRatio: 0.84, downbeatWeight: 0.86 },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'prog-7-4-basic',
    engineId: 'prog_7_4',
    label: '7/4 Prog Rock',
    meter: { signature: '7/4', gridSteps: 28, groups: [16, 12], baseUnit: 'sixteenth' },
    groupingVector: [2, 2, 3, 2, 2, 3],
    ...straight16KickSnareHi('X---X---X-----X---X---X-----', '----X---------X-----------', 'x-x-x-x-x-x-x-x-x-x-x-x-x-x'),
    feel: { subdivisionMode: 'straight', bpmRange: [80, 138], bassLockRatio: 0.83, downbeatWeight: 0.87 },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'jazz-rock-fusion-basic',
    engineId: 'jazz_rock_fusion',
    label: 'Jazz-Rock Fusion',
    meter: { signature: '4/4', gridSteps: 16, groups: [8, 8], baseUnit: 'sixteenth' },
    ...straight16KickSnareHi('X---X---X-X---X-', '--x-X---x---X---', 'x-x-xxxx-x-xxxx-'),
    feel: { subdivisionMode: 'straight', bpmRange: [96, 156], bassLockRatio: 0.72, downbeatWeight: 0.78 },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
  {
    id: 'afrobeat-rock-basic',
    engineId: 'afrobeat_rock',
    label: 'Afrobeat Rock',
    meter: { signature: '4/4', gridSteps: 16, groups: [8, 8], baseUnit: 'sixteenth' },
    ...straight16KickSnareHi('X---X-X-X---X---', '----X---x---X---', 'x-xx-xx-xx-xx-xx'),
    feel: { subdivisionMode: 'straight', bpmRange: [94, 122], bassLockRatio: 0.76, downbeatWeight: 0.8 },
    gmNoteMap: { ...DEFAULT_ROCK_FUSION_GM_MAP },
  },
];

export const DEFAULT_ROCK_FUSION_PRESET_BY_ENGINE: Record<RockFusionEngineId, string> = {
  straight_rock: 'straight-rock-basic',
  shuffle_blues_rock: 'shuffle-blues-basic',
  funk_rock: 'funk-rock-basic',
  half_time_hip_hop: 'half-time-hip-hop-basic',
  reggae_family: 'reggae-one-drop',
  hard_rock_metal: 'hard-rock-metal-basic',
  prog_5_4: 'prog-5-4-basic',
  prog_7_8: 'prog-7-8-basic',
  prog_7_4: 'prog-7-4-basic',
  jazz_rock_fusion: 'jazz-rock-fusion-basic',
  afrobeat_rock: 'afrobeat-rock-basic',
};

export const SHIPPED_ROCK_FUSION_RHYTHM_ENGINE_IDS: readonly RockFusionEngineId[] = [
  'straight_rock',
  'shuffle_blues_rock',
  'funk_rock',
  'half_time_hip_hop',
  'reggae_family',
  'hard_rock_metal',
  'prog_5_4',
  'prog_7_8',
  'prog_7_4',
  'jazz_rock_fusion',
  'afrobeat_rock',
];

export const ROCK_FUSION_CONTEXT_PREFIX_BY_ENGINE: Record<RockFusionEngineId, string> = {
  straight_rock: 'sr',
  shuffle_blues_rock: 'sb',
  funk_rock: 'fn',
  half_time_hip_hop: 'ht',
  reggae_family: 'rg',
  hard_rock_metal: 'hr',
  prog_5_4: 'p5',
  prog_7_8: 'p8',
  prog_7_4: 'p4',
  jazz_rock_fusion: 'jf',
  afrobeat_rock: 'ar',
};

export function getRockFusionPresetById(id: string): RockFusionRhythmPreset | undefined {
  return ROCK_FUSION_RHYTHM_PRESETS.find((p) => p.id === id);
}

export function getRockFusionPresetByEngineId(engineId: RockFusionEngineId): RockFusionRhythmPreset {
  const presetId = DEFAULT_ROCK_FUSION_PRESET_BY_ENGINE[engineId];
  const preset = getRockFusionPresetById(presetId);
  if (!preset) throw new Error(`getRockFusionPresetByEngineId: missing default preset for ${engineId}`);
  return preset;
}

export function isShippedRockFusionRhythmEngineId(id: string): id is RockFusionEngineId {
  return (SHIPPED_ROCK_FUSION_RHYTHM_ENGINE_IDS as readonly string[]).includes(id);
}

export function rockFusionRhythmReceiptsForPreset(preset: RockFusionRhythmPreset): readonly string[] {
  const feel = preset.feel;
  const lines: string[] = [
    `RF_RHYTHM_POLICY:engineId=${preset.engineId}`,
    `RF_RHYTHM_POLICY:presetId=${preset.id}`,
    `RF_RHYTHM_POLICY:meter=${preset.meter.signature}`,
    `RF_RHYTHM_POLICY:gridSteps=${preset.meter.gridSteps}`,
    `RF_RHYTHM_POLICY:subdivisionMode=${feel.subdivisionMode}`,
    `RF_RHYTHM_POLICY:bpmRange=${feel.bpmRange[0]}-${feel.bpmRange[1]}`,
    `RF_RHYTHM_POLICY:bassLockRatio=${feel.bassLockRatio}`,
    `RF_RHYTHM_POLICY:downbeatWeight=${feel.downbeatWeight}`,
  ];
  if (feel.swingRatio !== undefined) lines.push(`RF_RHYTHM_POLICY:swingRatio=${feel.swingRatio}`);
  if (feel.shuffleTimingTransform) lines.push('RF_RHYTHM_POLICY:shuffleTimingTransform=true');
  if (preset.groupingVector?.length) lines.push(`RF_RHYTHM_POLICY:groupingVector=${preset.groupingVector.join('+')}`);
  if (preset.subFeels?.length) lines.push(`RF_RHYTHM_POLICY:subFeels=${preset.subFeels.map((s) => s.id).join('|')}`);
  return lines;
}