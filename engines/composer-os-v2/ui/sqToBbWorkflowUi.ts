/**
 * SQ→BB composer picker options — labels, descriptions, family, σ from registry.
 */

import { getSqVrbProfile } from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';
import { getVrbFamily, type VrbFamily } from '../core/counterpoint/vrbProfiles/vrbFamilies';
import type { MessiaenModeId } from '../core/harmony/pitchFieldSpineTypes';

export type SqToBbSqComposerId =
  | 'arvo_part'
  | 'sq_vrb_bartok'
  | 'ravel'
  | 'herrmann'
  | 'morricone'
  | 'williams'
  | 'rota'
  | 'goldsmith'
  | 'glass'
  | 'zimmer'
  | 'badalamenti'
  | 'shostakovich'
  | 'webern'
  | 'joni_mitchell'
  | 'ligeti'
  | 'satie'
  | 'cole_porter'
  | 'gershwin'
  | 'debussy'
  | 'ornette_coleman'
  | 'coltrane'
  | 'messiaen';

export type SqToBbSqComposer = SqToBbSqComposerId | null;

export type MessiaenModeOption = {
  modeId: MessiaenModeId;
  label: string;
};

export const MESSIAEN_MODE_OPTIONS: readonly MessiaenModeOption[] = [
  { modeId: 1, label: 'M1 · Floating (Whole Tone)' },
  { modeId: 2, label: 'M2 · Shadowed (Octatonic)' },
  { modeId: 3, label: 'M3 · Luminous' },
  { modeId: 4, label: 'M4 · Austere' },
  { modeId: 5, label: 'M5 · Sparse' },
  { modeId: 6, label: 'M6 · Veiled' },
  { modeId: 7, label: 'M7 · Dense' },
] as const;

export type SqComposerOption = {
  vrbId: string;
  /** Select value — null row uses empty id */
  id: SqToBbSqComposer;
  label: string;
  description: string;
  family: VrbFamily | null;
  sigma: number;
  enabled: boolean;
  /** Messiaen-only — secondary mode picker options */
  modeOptions?: readonly MessiaenModeOption[];
};

export const SQ_TO_BB_SQ_COMPOSER_SELECT_NULL = '';

const COMPOSER_DESCRIPTIONS: Record<SqToBbSqComposerId, { label: string; description: string }> = {
  arvo_part: {
    label: 'Pärt',
    description: 'Tintinnabuli stillness. Open fifths, pedal bass, silence as structure.',
  },
  glass: {
    label: 'Glass',
    description: 'Additive arpeggios. Cycling diatonic cells, minimal harmonic movement.',
  },
  debussy: {
    label: 'Debussy',
    description: 'Impressionist colour. Parallel planing, whole-tone chords, unresolved dominants.',
  },
  ravel: {
    label: 'Ravel',
    description: 'Refined impressionism. Clear voice-leading, added ninths, modal cadences.',
  },
  satie: {
    label: 'Satie',
    description: 'Ironic detachment. Parallel triads, non-functional harmony, dry texture.',
  },
  rota: {
    label: 'Rota',
    description: 'Italian lyricism. Warm triads, functional harmony, melodic top voice.',
  },
  badalamenti: {
    label: 'Badalamenti',
    description: 'Twin Peaks noir. Slow jazz harmony, chromatic inner voices, cinematic space.',
  },
  morricone: {
    label: 'Morricone',
    description: 'Spaghetti Western epic. Pedal points, modal drama, lyrical melody.',
  },
  goldsmith: {
    label: 'Goldsmith',
    description: 'Hollywood tension. Chromatic lines, dense inner voices, dramatic scoring.',
  },
  williams: {
    label: 'Williams',
    description: 'Orchestral narrative. Strong melody, functional harmony, cinematic sweep.',
  },
  zimmer: {
    label: 'Zimmer',
    description: 'Modern epic. Ostinato-driven, layered pads, slow harmonic rhythm.',
  },
  herrmann: {
    label: 'Herrmann',
    description: 'Hitchcock unease. Chromatic clusters, tritone motion, unresolved suspense.',
  },
  joni_mitchell: {
    label: 'Joni Mitchell',
    description: 'Open-tuning folk-jazz. Quartal chords, non-functional colour, melodic freedom.',
  },
  cole_porter: {
    label: 'Cole Porter',
    description: 'Broadway sophistication. Chromatic voice-leading, ii–V–I, swing feel.',
  },
  gershwin: {
    label: 'Gershwin',
    description: 'American jazz-classical. Bluesy thirds, syncopated swing, Broadway colour.',
  },
  shostakovich: {
    label: 'Shostakovich',
    description: 'Soviet modernism. Displaced downbeats, hemiola, dark modal harmony.',
  },
  sq_vrb_bartok: {
    label: 'Bartók',
    description: 'Folk-chromatic. Clusters, tritones, angular melody, high independence.',
  },
  ligeti: {
    label: 'Ligeti',
    description:
      'Micropolyphony pitch-field. Chromatic cluster band, high overlap, slow 8–32 bar morph, near-stepwise strands.',
  },
  webern: {
    label: 'Webern',
    description: 'Serial pointillism. Maximum chromatic range, extreme register spread.',
  },
  ornette_coleman: {
    label: 'Ornette Coleman',
    description: 'Harmolodic free jazz. Pitch-field spine, democratic lines, blues inflection.',
  },
  coltrane: {
    label: 'Coltrane (Late)',
    description: 'Interval-cell fields. Sheets of sound, modal pedal, pivot trichord transitions.',
  },
  messiaen: {
    label: 'Messiaen',
    description: 'Modes of limited transposition. Block harmony, pedal bass, symmetric colour fields.',
  },
};

function sigmaForVrbId(vrbId: string): number {
  return getSqVrbProfile(vrbId)?.gceScorerAdjustments.registerCohesionStdevCeilingSt ?? 0;
}

function buildComposerOption(vrbId: SqToBbSqComposerId): SqComposerOption {
  const meta = COMPOSER_DESCRIPTIONS[vrbId];
  return {
    vrbId,
    id: vrbId,
    label: meta.label,
    description: meta.description,
    family: getVrbFamily(vrbId),
    sigma: sigmaForVrbId(vrbId),
    enabled: true,
    ...(vrbId === 'messiaen' ? { modeOptions: MESSIAEN_MODE_OPTIONS } : {}),
  };
}

const COMPOSER_VRB_IDS = Object.keys(COMPOSER_DESCRIPTIONS) as SqToBbSqComposerId[];

export const SQ_TO_BB_SQ_COMPOSER_OPTIONS: ReadonlyArray<SqComposerOption> = [
  {
    vrbId: '',
    id: null,
    label: '— None (default) —',
    description: '',
    family: null,
    sigma: 0,
    enabled: true,
  },
  ...COMPOSER_VRB_IDS.map(buildComposerOption),
];

export function sqComposerOptionByVrbId(vrbId: string | null | undefined): SqComposerOption | undefined {
  if (!vrbId) return SQ_TO_BB_SQ_COMPOSER_OPTIONS[0];
  return SQ_TO_BB_SQ_COMPOSER_OPTIONS.find((o) => o.id === vrbId);
}

export const SQ_TO_BB_SQ_COMPOSER_VRB_IDS: readonly SqToBbSqComposerId[] = COMPOSER_VRB_IDS;
