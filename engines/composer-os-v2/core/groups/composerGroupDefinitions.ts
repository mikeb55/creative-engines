/**
 * Composer OS — production-world group definitions (Group Mode architecture).
 * Composers inherit group defaults and override only where genuinely distinct.
 */

import type {
  CadentialResolution,
  ComposerProductionParams,
  EnsembleDensityCurve,
  MelodyFraming,
  SectionalContrastMode,
  SilenceWeighting,
} from './composerProductionParams';

export type ComposerGroupId =
  | 'ECM_CHAMBER_JAZZ'
  | 'STUDIO_ORCHESTRAL_JAZZ'
  | 'POST_BOP_CORE'
  | 'FILM_SOUNDTRACK'
  | 'ART_ROCK_POST_PUNK';

/** Full default parameter object for an active production group. */
export interface GroupParams {
  groovePersistence: number;
  registralPorosity: number;
  stringProminence: number;
  cadentialResolution: CadentialResolution;
  ensembleDensityCurve: EnsembleDensityCurve;
  silenceWeighting: SilenceWeighting;
  productionGloss: number;
  melodyFraming: MelodyFraming;
  soloistSpotlight: number;
  sectionalContrastMode: SectionalContrastMode;
}

export type ComposerGroupMemberStatus = 'fully_implemented' | 'partial_future' | 'precursor_reserved';

export interface ComposerGroupDefinition {
  id: ComposerGroupId;
  description: string;
  defaults: GroupParams;
  /** Canonical songwriter / arranger ids assigned to this group. */
  members: readonly {
    composerId: string;
    status: ComposerGroupMemberStatus;
  }[];
}

/** Dual-group composers appear in one UI optgroup (defaultTo) but may resolve via groupOverride. */
export interface ComposerGroupAssignment {
  primary: ComposerGroupId;
  secondary?: ComposerGroupId;
  defaultTo: ComposerGroupId;
}

/** Normalize arranger short ids and aliases to canonical composer ids for group lookup. */
export const COMPOSER_ID_ALIASES: Readonly<Record<string, string>> = {
  schneider: 'maria_schneider',
  wheeler: 'kenny_wheeler',
  thad: 'thad_jones',
  basie: 'count_basie',
  ellington: 'duke_ellington',
  strayhorn: 'billy_strayhorn',
  sebesky: 'don_sebesky',
  mingus: 'charles_mingus',
  threadgill: 'henry_threadgill',
  garbarek: 'jan_garbarek',
  jg: 'jan_garbarek',
  bley: 'carla_bley',
  carla_bley: 'carla_bley',
  weber: 'eberhard_weber',
  eberhard_weber: 'eberhard_weber',
  ew: 'eberhard_weber',
  ogerman: 'claus_ogerman',
  claus_ogerman: 'claus_ogerman',
  co: 'claus_ogerman',
  mandel: 'johnny_mandel',
  johnny_mandel: 'johnny_mandel',
  jmd: 'johnny_mandel',
  mandel_lyric_warmth: 'johnny_mandel',
  barry: 'john_barry',
  john_barry: 'john_barry',
  jbr: 'john_barry',
  barry_thematic_monolith: 'john_barry',
  schifrin: 'lalo_schifrin',
  lalo_schifrin: 'lalo_schifrin',
  ls: 'lalo_schifrin',
  surman: 'john_surman',
  john_surman: 'john_surman',
  js: 'john_surman',
  surman_folk_modal: 'john_surman',
  towner: 'ralph_towner',
  ralph_towner: 'ralph_towner',
  rt: 'ralph_towner',
  towner_guitar_polyphony: 'ralph_towner',
  verlaine: 'verlaine',
  tom_verlaine: 'verlaine',
  television: 'verlaine',
  tv: 'verlaine',
  verlaine_suspended_field: 'verlaine',
  fripp: 'fripp_king_crimson',
  morello: 'morello',
  holman: 'bill_holman',
  bill_holman: 'bill_holman',
  charlie: 'charlie_parker',
  bird: 'charlie_parker',
  monk: 'thelonious_monk',
  coltrane: 'john_coltrane',
  miles: 'miles_davis',
  quincy: 'quincy_jones',
  quincy_jones_film: 'quincy_jones',
};

export const DUAL_GROUP_COMPOSER_ASSIGNMENTS: Readonly<Record<string, ComposerGroupAssignment>> = {
  wayne_shorter: {
    primary: 'POST_BOP_CORE',
    secondary: 'ECM_CHAMBER_JAZZ',
    defaultTo: 'POST_BOP_CORE',
  },
  bill_evans: {
    primary: 'ECM_CHAMBER_JAZZ',
    secondary: 'POST_BOP_CORE',
    defaultTo: 'ECM_CHAMBER_JAZZ',
  },
};

const ECM_CHAMBER_JAZZ_DEFAULTS: GroupParams = {
  groovePersistence: 0.25,
  registralPorosity: 0.8,
  stringProminence: 0.15,
  cadentialResolution: 'suspended',
  ensembleDensityCurve: 'slow_bloom',
  silenceWeighting: 'structural',
  productionGloss: 0.2,
  melodyFraming: 'integrated',
  soloistSpotlight: 0.45,
  sectionalContrastMode: 'gradual',
};

const STUDIO_ORCHESTRAL_JAZZ_DEFAULTS: GroupParams = {
  groovePersistence: 0.78,
  registralPorosity: 0.2,
  stringProminence: 0.65,
  cadentialResolution: 'arrived',
  ensembleDensityCurve: 'tiered_lift',
  silenceWeighting: 'minimal',
  productionGloss: 0.82,
  melodyFraming: 'spotlighted',
  soloistSpotlight: 0.75,
  sectionalContrastMode: 'discrete',
};

const POST_BOP_CORE_DEFAULTS: GroupParams = {
  groovePersistence: 0.72,
  registralPorosity: 0.45,
  stringProminence: 0.05,
  cadentialResolution: 'functional_modal',
  ensembleDensityCurve: 'blowing_arc',
  silenceWeighting: 'rhythmic',
  productionGloss: 0.3,
  melodyFraming: 'head_based',
  soloistSpotlight: 0.6,
  sectionalContrastMode: 'blowing_sections',
};

const FILM_SOUNDTRACK_DEFAULTS: GroupParams = {
  groovePersistence: 0.85,
  registralPorosity: 0.32,
  stringProminence: 0.42,
  cadentialResolution: 'suspended',
  ensembleDensityCurve: 'tiered_lift',
  silenceWeighting: 'rhythmic',
  productionGloss: 0.58,
  melodyFraming: 'spotlighted',
  soloistSpotlight: 0.52,
  sectionalContrastMode: 'discrete',
};

const ART_ROCK_POST_PUNK_DEFAULTS: GroupParams = {
  groovePersistence: 0.55,
  registralPorosity: 0.55,
  stringProminence: 0.05,
  cadentialResolution: 'suspended',
  ensembleDensityCurve: 'slow_bloom',
  silenceWeighting: 'structural',
  productionGloss: 0.25,
  melodyFraming: 'integrated',
  soloistSpotlight: 0.55,
  sectionalContrastMode: 'gradual',
};

export const COMPOSER_GROUP_DEFINITIONS: readonly ComposerGroupDefinition[] = [
  {
    id: 'ECM_CHAMBER_JAZZ',
    description:
      'Chamber-space production logic. Spacious, suspended, porous, unresolved. Silence is structural. Groove can dissolve.',
    defaults: ECM_CHAMBER_JAZZ_DEFAULTS,
    members: [
      { composerId: 'maria_schneider', status: 'fully_implemented' },
      { composerId: 'kenny_wheeler', status: 'fully_implemented' },
      { composerId: 'gil_evans', status: 'fully_implemented' },
      { composerId: 'henry_threadgill', status: 'fully_implemented' },
      { composerId: 'bill_evans', status: 'fully_implemented' },
      { composerId: 'pat_metheny', status: 'fully_implemented' },
      { composerId: 'wayne_shorter', status: 'fully_implemented' },
      { composerId: 'bob_brookmeyer', status: 'fully_implemented' },
      { composerId: 'ecm_chamber', status: 'fully_implemented' },
      { composerId: 'jan_garbarek', status: 'fully_implemented' },
      { composerId: 'carla_bley', status: 'fully_implemented' },
      { composerId: 'eberhard_weber', status: 'fully_implemented' },
      { composerId: 'john_surman', status: 'fully_implemented' },
      { composerId: 'ralph_towner', status: 'fully_implemented' },
    ],
  },
  {
    id: 'STUDIO_ORCHESTRAL_JAZZ',
    description:
      'Studio-orchestral production logic. Groove-driven, melody-legible, lush, immediate. Production-shaped sectional architecture. Record producer mindset.',
    defaults: STUDIO_ORCHESTRAL_JAZZ_DEFAULTS,
    members: [
      { composerId: 'don_sebesky', status: 'fully_implemented' },
      { composerId: 'quincy_jones', status: 'fully_implemented' },
      { composerId: 'oliver_nelson', status: 'fully_implemented' },
      { composerId: 'sammy_nestico', status: 'fully_implemented' },
      { composerId: 'clare_fischer', status: 'fully_implemented' },
      { composerId: 'count_basie', status: 'fully_implemented' },
      { composerId: 'thad_jones', status: 'fully_implemented' },
      { composerId: 'bill_holman', status: 'fully_implemented' },
      { composerId: 'duke_ellington', status: 'fully_implemented' },
      { composerId: 'billy_strayhorn', status: 'fully_implemented' },
      { composerId: 'charles_mingus', status: 'fully_implemented' },
      { composerId: 'claus_ogerman', status: 'fully_implemented' },
      { composerId: 'johnny_mandel', status: 'fully_implemented' },
      { composerId: 'bob_james', status: 'partial_future' },
      { composerId: 'eumir_deodato', status: 'partial_future' },
      { composerId: 'gary_mcfarland', status: 'partial_future' },
    ],
  },
  {
    id: 'FILM_SOUNDTRACK',
    description:
      'Film scoring production logic. Groove-native motor energy, layered strata entry, modal vamps locked to percussion grid — not pastoral mood painting or classical cadential closure.',
    defaults: FILM_SOUNDTRACK_DEFAULTS,
    members: [
      { composerId: 'bernard_herrmann', status: 'fully_implemented' },
      { composerId: 'ennio_morricone', status: 'fully_implemented' },
      { composerId: 'jerry_goldsmith', status: 'fully_implemented' },
      { composerId: 'lalo_schifrin', status: 'fully_implemented' },
      { composerId: 'john_barry', status: 'fully_implemented' },
    ],
  },
  {
    id: 'POST_BOP_CORE',
    description:
      'Blue Note / Impulse / Prestige world. Groove-anchored, blues-derived, functional and modal harmony, small-to-medium ensemble. Not ECM-spatial, not CTI-orchestral.',
    defaults: POST_BOP_CORE_DEFAULTS,
    members: [
      { composerId: 'thelonious_monk', status: 'fully_implemented' },
      { composerId: 'john_coltrane', status: 'fully_implemented' },
      { composerId: 'charlie_parker', status: 'fully_implemented' },
      { composerId: 'miles_davis', status: 'fully_implemented' },
      { composerId: 'herbie_hancock', status: 'fully_implemented' },
      { composerId: 'mccoy_tyner', status: 'fully_implemented' },
      { composerId: 'barry_harris', status: 'fully_implemented' },
      { composerId: 'andrew_hill', status: 'fully_implemented' },
      { composerId: 'jim_hall', status: 'fully_implemented' },
      { composerId: 'pat_martino', status: 'fully_implemented' },
      { composerId: 'wayne_shorter', status: 'fully_implemented' },
      { composerId: 'bill_evans', status: 'fully_implemented' },
      { composerId: 'joe_henderson', status: 'partial_future' },
      { composerId: 'bobby_hutcherson', status: 'partial_future' },
      { composerId: 'lee_morgan', status: 'partial_future' },
      { composerId: 'hank_mobley', status: 'partial_future' },
      { composerId: 'horace_silver', status: 'partial_future' },
    ],
  },
  {
    id: 'ART_ROCK_POST_PUNK',
    description:
      'Art-rock / post-punk production logic. Line-first guitar fields, suspended harmony, bass displacement, low studio gloss — Television, Sonic Youth, Fripp process, Morello cells.',
    defaults: ART_ROCK_POST_PUNK_DEFAULTS,
    members: [
      { composerId: 'verlaine', status: 'fully_implemented' },
      { composerId: 'sonic_youth', status: 'fully_implemented' },
      { composerId: 'fripp_king_crimson', status: 'fully_implemented' },
      { composerId: 'morello', status: 'fully_implemented' },
    ],
  },
] as const;

/** UI-facing labels for production-world optgroups. */
export const COMPOSER_GROUP_DISPLAY_LABELS: Record<ComposerGroupId, string> = {
  ECM_CHAMBER_JAZZ: 'ECM Chamber Jazz',
  STUDIO_ORCHESTRAL_JAZZ: 'Studio Orchestral Jazz',
  POST_BOP_CORE: 'Post-Bop Core',
  FILM_SOUNDTRACK: 'Film Soundtrack',
  ART_ROCK_POST_PUNK: 'Art Rock / Post-Punk',
};

const DUAL_GROUP_COMPOSER_IDS = new Set<string>(Object.keys(DUAL_GROUP_COMPOSER_ASSIGNMENTS));

/** Single-group assignment map — dual composers excluded (use defaultTo via engine). */
const COMPOSER_TO_GROUP = ((): ReadonlyMap<string, ComposerGroupId> => {
  const map = new Map<string, ComposerGroupId>();
  for (const group of COMPOSER_GROUP_DEFINITIONS) {
    for (const member of group.members) {
      if (member.status === 'precursor_reserved') continue;
      if (DUAL_GROUP_COMPOSER_IDS.has(member.composerId)) continue;
      map.set(member.composerId, group.id);
    }
  }
  for (const [composerId, assignment] of Object.entries(DUAL_GROUP_COMPOSER_ASSIGNMENTS)) {
    map.set(composerId, assignment.defaultTo);
  }
  return map;
})();

export function normalizeComposerId(composerId: string): string {
  const trimmed = composerId.trim();
  if (!trimmed) return trimmed;
  return COMPOSER_ID_ALIASES[trimmed] ?? trimmed;
}

export function getComposerGroupAssignment(composerId: string): ComposerGroupId | null {
  const canonical = normalizeComposerId(composerId);
  return COMPOSER_TO_GROUP.get(canonical) ?? null;
}

export function getDualGroupAssignment(composerId: string): ComposerGroupAssignment | null {
  const canonical = normalizeComposerId(composerId);
  return DUAL_GROUP_COMPOSER_ASSIGNMENTS[canonical] ?? null;
}

export function getGroupDefinition(groupName: ComposerGroupId): ComposerGroupDefinition | undefined {
  return COMPOSER_GROUP_DEFINITIONS.find((g) => g.id === groupName);
}

export type { ComposerProductionParams };
