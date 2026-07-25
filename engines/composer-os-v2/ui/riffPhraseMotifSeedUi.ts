/**
 * Browser-safe phrase-motif-seed UI helpers (no fs / corpus load).
 * Mirrors STYLE_PAIRINGS in riffStylePairings.ts — keep in sync.
 */

export type RiffPhraseMotifSeedUiPairing = {
  /** Composite PairingId */
  id: string;
  /** Human-readable label (settings / checkbox). */
  label: string;
  /** Profile / VRB id. */
  vrbId: string;
  /** Phrase motif category. */
  motifCategory: string;
  /** Manifest default; UI resolves override ?? defaultEnabled. */
  defaultEnabled: boolean;
  /** @deprecated alias of vrbId */
  profileId: string;
  /** @deprecated alias of motifCategory */
  categoryId: string;
  /** Short lick label for checkbox copy. */
  lickLabel: string;
};

/**
 * Proven pairings shown in RiffGen checkbox + Style Pairings settings.
 * defaultEnabled mirrors STYLE_PAIRINGS (Phase 2 full rollout: all 12 true).
 */
export const RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS: readonly RiffPhraseMotifSeedUiPairing[] = [
  {
    id: 'sax_inspired::weather_report',
    label: 'Weather Report / sax-inspired',
    vrbId: 'weather_report',
    motifCategory: 'sax_inspired',
    defaultEnabled: true,
    profileId: 'weather_report',
    categoryId: 'sax_inspired',
    lickLabel: 'sax',
  },
  {
    id: 'jazz_rock::mahavishnu',
    label: 'Mahavishnu / jazz-rock',
    vrbId: 'mahavishnu',
    motifCategory: 'jazz_rock',
    defaultEnabled: true,
    profileId: 'mahavishnu',
    categoryId: 'jazz_rock',
    lickLabel: 'jazz-rock',
  },
  {
    id: 'diminished_lines::fripp',
    label: 'Fripp / diminished lines',
    vrbId: 'fripp',
    motifCategory: 'diminished_lines',
    defaultEnabled: true,
    profileId: 'fripp',
    categoryId: 'diminished_lines',
    lickLabel: 'diminished',
  },
  {
    id: 'white_rock_funk::iommi',
    label: 'Iommi / white rock funk',
    vrbId: 'iommi',
    motifCategory: 'white_rock_funk',
    defaultEnabled: true,
    profileId: 'iommi',
    categoryId: 'white_rock_funk',
    lickLabel: 'white rock funk',
  },
  {
    id: 'black_soul_funk::nile_rodgers',
    label: 'Nile Rodgers / black soul funk',
    vrbId: 'nile_rodgers',
    motifCategory: 'black_soul_funk',
    defaultEnabled: true,
    profileId: 'nile_rodgers',
    categoryId: 'black_soul_funk',
    lickLabel: 'black soul funk',
  },
  {
    id: 'bebop_jazz_blues::bill_evans_sax',
    label: 'Bill Evans sax / bebop jazz blues',
    vrbId: 'bill_evans_sax',
    motifCategory: 'bebop_jazz_blues',
    defaultEnabled: true,
    profileId: 'bill_evans_sax',
    categoryId: 'bebop_jazz_blues',
    lickLabel: 'bebop jazz blues',
  },
  {
    id: 'blues_rock::hendrix',
    label: 'Hendrix / blues-rock',
    vrbId: 'hendrix',
    motifCategory: 'blues_rock',
    defaultEnabled: true,
    profileId: 'hendrix',
    categoryId: 'blues_rock',
    lickLabel: 'blues-rock',
  },
  {
    id: 'blues_rock::led_zeppelin',
    label: 'Led Zeppelin / blues-rock',
    vrbId: 'led_zeppelin',
    motifCategory: 'blues_rock',
    defaultEnabled: true,
    profileId: 'led_zeppelin',
    categoryId: 'blues_rock',
    lickLabel: 'blues-rock',
  },
  {
    id: 'progressive_blues::david_gilmour',
    label: 'Gilmour / progressive blues',
    vrbId: 'david_gilmour',
    motifCategory: 'progressive_blues',
    defaultEnabled: true,
    profileId: 'david_gilmour',
    categoryId: 'progressive_blues',
    lickLabel: 'progressive blues',
  },
  {
    id: 'modern_rock::morello',
    label: 'Morello / modern rock',
    vrbId: 'morello',
    motifCategory: 'modern_rock',
    defaultEnabled: true,
    profileId: 'morello',
    categoryId: 'modern_rock',
    lickLabel: 'modern rock',
  },
  {
    id: 'virtuoso_technique::eddie_van_halen',
    label: 'EVH / virtuoso technique',
    vrbId: 'eddie_van_halen',
    motifCategory: 'virtuoso_technique',
    defaultEnabled: true,
    profileId: 'eddie_van_halen',
    categoryId: 'virtuoso_technique',
    lickLabel: 'virtuoso technique',
  },
  {
    id: 'southern_rock::jimmy_herring',
    label: 'Jimmy Herring / southern rock',
    vrbId: 'jimmy_herring',
    motifCategory: 'southern_rock',
    defaultEnabled: true,
    profileId: 'jimmy_herring',
    categoryId: 'southern_rock',
    lickLabel: 'southern rock',
  },
] as const;

export function getUiPairingsForProfile(profileId: string | undefined): readonly RiffPhraseMotifSeedUiPairing[] {
  if (!profileId) return [];
  return RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS.filter((p) => p.profileId === profileId);
}

export function getUiPairingsForCategory(categoryId: string | undefined): readonly RiffPhraseMotifSeedUiPairing[] {
  if (!categoryId) return [];
  return RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS.filter((p) => p.categoryId === categoryId);
}

export function profileHasPhraseMotifSeedPairing(profileId: string | undefined): boolean {
  return getUiPairingsForProfile(profileId).length > 0;
}

/** @deprecated use profileHasPhraseMotifSeedPairing */
export function vrbHasPhraseMotifSeedPairing(vrbId: string | undefined): boolean {
  return profileHasPhraseMotifSeedPairing(vrbId);
}

/** e.g. "Seed motif from real sax licks" — null when profile unpaired. */
export function phraseMotifSeedCheckboxLabel(profileId: string | undefined): string | null {
  const pairings = getUiPairingsForProfile(profileId);
  if (pairings.length === 0) return null;
  const pairing =
    pairings.length === 1
      ? pairings[0]!
      : pairings.slice().sort((a, b) => a.id.localeCompare(b.id))[0]!;
  return 'Seed motif from real ' + pairing.lickLabel + ' licks';
}
