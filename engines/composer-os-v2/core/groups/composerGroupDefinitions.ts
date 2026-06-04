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
  | 'POST_BOP_CORE';

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
  defaults: GroupParams | null;
  /** Canonical songwriter / arranger ids assigned to this group. */
  members: readonly {
    composerId: string;
    status: ComposerGroupMemberStatus;
  }[];
  /** Placeholder groups expose UI label suffix only — no defaults yet. */
  placeholder?: boolean;
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
  charlie: 'charlie_parker',
  bird: 'charlie_parker',
  monk: 'thelonious_monk',
  coltrane: 'john_coltrane',
  miles: 'miles_davis',
  quincy: 'quincy_jones',
  quincy_jones_film: 'quincy_jones',
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
      { composerId: 'jan_garbarek', status: 'partial_future' },
      { composerId: 'eberhard_weber', status: 'partial_future' },
      { composerId: 'carla_bley', status: 'partial_future' },
      { composerId: 'john_surman', status: 'partial_future' },
      { composerId: 'ralph_towner', status: 'partial_future' },
      { composerId: 'thelonious_monk', status: 'precursor_reserved' },
      { composerId: 'john_coltrane', status: 'precursor_reserved' },
      { composerId: 'miles_davis', status: 'precursor_reserved' },
      { composerId: 'herbie_hancock', status: 'precursor_reserved' },
      { composerId: 'mccoy_tyner', status: 'precursor_reserved' },
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
      { composerId: 'duke_ellington', status: 'fully_implemented' },
      { composerId: 'billy_strayhorn', status: 'fully_implemented' },
      { composerId: 'charles_mingus', status: 'fully_implemented' },
      { composerId: 'claus_ogerman', status: 'partial_future' },
      { composerId: 'bob_james', status: 'partial_future' },
      { composerId: 'johnny_mandel', status: 'partial_future' },
      { composerId: 'lalo_schifrin', status: 'partial_future' },
      { composerId: 'eumir_deodato', status: 'partial_future' },
      { composerId: 'gary_mcfarland', status: 'partial_future' },
    ],
  },
  {
    id: 'POST_BOP_CORE',
    description:
      'Blue Note / post-bop core. Groove-anchored, blues-derived, functional and modal harmony, small-to-medium ensemble. Not ECM-spatial, not CTI-orchestral.',
    defaults: null,
    placeholder: true,
    members: [
      { composerId: 'thelonious_monk', status: 'partial_future' },
      { composerId: 'john_coltrane', status: 'partial_future' },
      { composerId: 'miles_davis', status: 'partial_future' },
      { composerId: 'herbie_hancock', status: 'partial_future' },
      { composerId: 'mccoy_tyner', status: 'partial_future' },
      { composerId: 'wayne_shorter', status: 'partial_future' },
      { composerId: 'charlie_parker', status: 'partial_future' },
      { composerId: 'barry_harris', status: 'partial_future' },
      { composerId: 'andrew_hill', status: 'partial_future' },
      { composerId: 'jim_hall', status: 'partial_future' },
      { composerId: 'pat_martino', status: 'partial_future' },
    ],
  },
] as const;

/** UI-facing labels for production-world optgroups. */
export const COMPOSER_GROUP_DISPLAY_LABELS: Record<ComposerGroupId, string> = {
  ECM_CHAMBER_JAZZ: 'ECM Chamber Jazz',
  STUDIO_ORCHESTRAL_JAZZ: 'Studio Orchestral Jazz',
  POST_BOP_CORE: 'Post-Bop Core (coming soon)',
};

/** Precursors are registered on ECM definition but must not resolve to ECM until Post-Bop ships. */
export const POST_BOP_PRECURSOR_COMPOSER_IDS: ReadonlySet<string> = new Set([
  'thelonious_monk',
  'john_coltrane',
  'miles_davis',
  'herbie_hancock',
  'mccoy_tyner',
]);

/** Active group assignment — precursors and placeholder-only members excluded from lookup. */
const COMPOSER_TO_GROUP = ((): ReadonlyMap<string, ComposerGroupId> => {
  const map = new Map<string, ComposerGroupId>();
  for (const group of COMPOSER_GROUP_DEFINITIONS) {
    if (group.placeholder || !group.defaults) continue;
    for (const member of group.members) {
      if (member.status === 'precursor_reserved') continue;
      if (POST_BOP_PRECURSOR_COMPOSER_IDS.has(member.composerId)) continue;
      map.set(member.composerId, group.id);
    }
  }
  return map;
})();

/** Post-Bop placeholder roster for UI (composers visible under coming-soon label). */
export const POST_BOP_CORE_UI_COMPOSER_IDS: readonly string[] = COMPOSER_GROUP_DEFINITIONS.find(
  (g) => g.id === 'POST_BOP_CORE'
)!.members.map((m) => m.composerId);

export function normalizeComposerId(composerId: string): string {
  const trimmed = composerId.trim();
  if (!trimmed) return trimmed;
  return COMPOSER_ID_ALIASES[trimmed] ?? trimmed;
}

export function getComposerGroupAssignment(composerId: string): ComposerGroupId | null {
  const canonical = normalizeComposerId(composerId);
  return COMPOSER_TO_GROUP.get(canonical) ?? null;
}

export function getGroupDefinition(groupName: ComposerGroupId): ComposerGroupDefinition | undefined {
  return COMPOSER_GROUP_DEFINITIONS.find((g) => g.id === groupName);
}

export type { ComposerProductionParams };
