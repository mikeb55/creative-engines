/**
 * Stand-in Mosaic dispatch aliases — composer ids without a dedicated slice.
 * Values must resolve to an existing SLICE_ROWS composerId (directly or via COMPOSER_ID_ALIASES).
 * Full-song generation must reject these keys; they are not truthful native dispatch.
 */

export const DISPATCH_STUB_ALIASES: Readonly<Record<string, string>> = {
  // rc19 — ornette_coleman remapped from andrew_hill stub to wayne_shorter; full ornette profile planned
  ornette_coleman: 'wayne_shorter',
  ornette: 'wayne_shorter',
  harmolodics: 'wayne_shorter',
  free_jazz: 'wayne_shorter',
  lonely_woman: 'wayne_shorter',
  /** Guitar ids with VRB/stub only — nearest ROCK_FUSION / ART_ROCK / JAZZ_GUITAR dispatch fit. */
  morello: 'fripp',
  eddie_van_halen: 'allan_holdsworth',
  jimmy_herring: 'allan_holdsworth',
  wes_montgomery: 'jim_hall',
  joe_pass: 'jim_hall',
  scott_henderson: 'allan_holdsworth',
  /** Leadsheet-input art-rock contrast voice — harmony via Verlaine field slice; texture via PopArtRock pass. */
  art_rock: 'verlaine',
  /** V20 FULL_SONG TunePainter styles — no dedicated mosaic slice yet; nearest SLICE_ROWS peer. */
  carole_king: 'beatles',
  paul_simon: 'joni_mitchell',
  max_martin: 'prince',
  nile_rodgers: 'james_brown',
  david_gilmour: 'radiohead',
};

export const DISPATCH_STUB_ALIAS_IDS: ReadonlySet<string> = new Set(
  Object.keys(DISPATCH_STUB_ALIASES)
);
