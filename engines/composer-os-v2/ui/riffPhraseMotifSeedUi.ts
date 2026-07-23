/**
 * Browser-safe phrase-motif-seed UI helpers (no fs / corpus load).
 * Mirrors STYLE_PAIRINGS in riffStylePairings.ts — keep in sync.
 */

export type RiffPhraseMotifSeedUiPairing = {
  profileId: string;
  categoryId: string;
  lickLabel: string;
  /** Composite PairingId */
  id: string;
};

/** Proven pairings shown in RiffGen checkbox (default unchecked). */
export const RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS: readonly RiffPhraseMotifSeedUiPairing[] = [
  { id: 'sax_inspired::weather_report', profileId: 'weather_report', categoryId: 'sax_inspired', lickLabel: 'sax' },
  { id: 'jazz_rock::mahavishnu', profileId: 'mahavishnu', categoryId: 'jazz_rock', lickLabel: 'jazz-rock' },
  { id: 'diminished_lines::fripp', profileId: 'fripp', categoryId: 'diminished_lines', lickLabel: 'diminished' },
  { id: 'white_rock_funk::iommi', profileId: 'iommi', categoryId: 'white_rock_funk', lickLabel: 'white rock funk' },
  { id: 'black_soul_funk::nile_rodgers', profileId: 'nile_rodgers', categoryId: 'black_soul_funk', lickLabel: 'black soul funk' },
  { id: 'bebop_jazz_blues::bill_evans_sax', profileId: 'bill_evans_sax', categoryId: 'bebop_jazz_blues', lickLabel: 'bebop jazz blues' },
  { id: 'blues_rock::hendrix', profileId: 'hendrix', categoryId: 'blues_rock', lickLabel: 'blues-rock' },
  { id: 'blues_rock::led_zeppelin', profileId: 'led_zeppelin', categoryId: 'blues_rock', lickLabel: 'blues-rock' },
  { id: 'progressive_blues::david_gilmour', profileId: 'david_gilmour', categoryId: 'progressive_blues', lickLabel: 'progressive blues' },
  { id: 'modern_rock::morello', profileId: 'morello', categoryId: 'modern_rock', lickLabel: 'modern rock' },
  { id: 'virtuoso_technique::eddie_van_halen', profileId: 'eddie_van_halen', categoryId: 'virtuoso_technique', lickLabel: 'virtuoso technique' },
  { id: 'southern_rock::jimmy_herring', profileId: 'jimmy_herring', categoryId: 'southern_rock', lickLabel: 'southern rock' },
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