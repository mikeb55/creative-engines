/**
 * Read-only catalog: final-bar hard-gate fix approach per songwriter id.
 *
 * Non-authoritative browse metadata only — does not drive generation.
 * Entries are keyed by HomeGenerate SONGWRITER_OPTIONS ids.
 *
 * Internal keys stay code-only. UI labels live in FIX_CATEGORY_LABEL.
 *
 *   standard-force  → forceFinalBarTonicResolution / enforceFinalBarTonicResolution
 *   idiomatic-bias  → bias*FinalBar*Open / bias*FinalBarIdiomatic*
 *   custom          → syncBacharachFinalBarAuthority (+ dual-surface final-bar sync)
 *   already-clear   → reviewed; FBT clean on gen-ok; no closing-fix code change
 * Unlisted ids resolve to unclassified (not yet reviewed in this catalog).
 */

export type ComposerFixCategory =
  | 'standard-force'
  | 'already-clear'
  | 'idiomatic-bias'
  | 'custom'
  | 'unclassified';

/** Explicit classifications only. Missing keys → unclassified. */
export const COMPOSER_FIX_CATEGORY_BY_ID: Readonly<Record<string, Exclude<ComposerFixCategory, 'unclassified'>>> = {
  // --- custom (dual-surface / non-template final-bar sync) ---
  bacharach: 'custom',

  // --- already-clear (reviewed; endings already land cleanly) ---
  beefheart: 'already-clear',
  eberhard_weber: 'already-clear',
  jan_garbarek: 'already-clear',
  joni_mitchell: 'already-clear',
  marr: 'already-clear',
  messiaen: 'already-clear',
  pat_metheny: 'already-clear',
  ralph_towner: 'already-clear',

  // --- standard-force ---
  barry_harris: 'standard-force',
  beatles: 'standard-force',
  bill_evans: 'standard-force',
  bill_holman: 'standard-force',
  brian_wilson: 'standard-force',
  charlie_parker: 'standard-force',
  clare_fischer: 'standard-force',
  claus_ogerman: 'standard-force',
  cole_porter: 'standard-force',
  donald_fagen: 'standard-force',
  don_sebesky: 'standard-force',
  duke_ellington: 'standard-force',
  ecm_chamber: 'standard-force',
  frank_zappa: 'standard-force',
  gershwin: 'standard-force',
  gil_evans: 'standard-force',
  herbie_hancock: 'standard-force',
  james_brown: 'standard-force',
  antonio_carlos_jobim: 'standard-force',
  jim_hall: 'standard-force',
  john_barry: 'standard-force',
  john_coltrane: 'standard-force',
  john_williams: 'standard-force',
  kate_bush: 'standard-force',
  miles_davis: 'standard-force',
  nino_rota: 'standard-force',
  oliver_nelson: 'standard-force',
  prince: 'standard-force',
  quincy_jones_film: 'standard-force',
  stephen_sondheim: 'standard-force',
  thad_jones: 'standard-force',
  thelonious_monk: 'standard-force',
  wayne_shorter: 'standard-force',

  // --- idiomatic-bias (24) ---
  allan_holdsworth: 'idiomatic-bias',
  andrew_hill: 'idiomatic-bias',
  angelo_badalamenti: 'idiomatic-bias',
  bartok: 'idiomatic-bias',
  berg: 'idiomatic-bias',
  bernard_herrmann: 'idiomatic-bias',
  billy_strayhorn: 'idiomatic-bias',
  bob_brookmeyer: 'idiomatic-bias',
  carla_bley: 'idiomatic-bias',
  charles_mingus: 'idiomatic-bias',
  debussy: 'idiomatic-bias',
  ennio_morricone: 'idiomatic-bias',
  fripp_king_crimson: 'idiomatic-bias',
  hans_zimmer: 'idiomatic-bias',
  henry_threadgill: 'idiomatic-bias',
  jerry_goldsmith: 'idiomatic-bias',
  john_surman: 'idiomatic-bias',
  kenny_wheeler: 'idiomatic-bias',
  lalo_schifrin: 'idiomatic-bias',
  maria_schneider: 'idiomatic-bias',
  mccoy_tyner: 'idiomatic-bias',
  philip_glass: 'idiomatic-bias',
  sonic_youth: 'idiomatic-bias',
  steve_reich: 'idiomatic-bias',
};

export const FIX_CATEGORY_ORDER: readonly ComposerFixCategory[] = [
  'standard-force',
  'already-clear',
  'idiomatic-bias',
  'custom',
  'unclassified',
];

/** Musician-facing labels only — never surface internal keys in UI. */
export const FIX_CATEGORY_LABEL: Record<ComposerFixCategory, string> = {
  'standard-force': 'Resolved',
  'already-clear': 'Confirmed clean',
  'idiomatic-bias': 'Open',
  custom: 'Special handling',
  unclassified: 'Not tagged yet',
};

export const FIX_CATEGORY_SUBTITLE =
  "A quick look at how each composer's music tends to close — clearly, openly, or in a more individual way.";

export const FIX_CATEGORY_INFO_TOOLTIP =
  "Resolved pieces end on a clear home chord. Confirmed clean means endings already land cleanly — reviewed with no closing fix needed. Open pieces finish in a less settled way on purpose — that is part of the composer's style. Special handling means this composer uses its own ending method. Not tagged yet means this composer has not been reviewed in this catalog yet.";

export const FIX_CATEGORY_EMPTY_STATE = 'Nothing here yet — this group is empty for now.';

export function resolveComposerFixCategory(id: string): ComposerFixCategory {
  return COMPOSER_FIX_CATEGORY_BY_ID[id] ?? 'unclassified';
}