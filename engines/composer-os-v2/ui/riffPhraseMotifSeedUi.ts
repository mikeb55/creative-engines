/**
 * Browser-safe phrase-motif-seed UI helpers (no fs / corpus load).
 * Pairing table mirrors riffPhraseMotifSeed.ts — keep in sync.
 */

export type RiffPhraseMotifSeedUiPairing = {
  vrbId: string;
  category: string;
  lickLabel: string;
};

/** Proven pairings shown in RiffGen checkbox (default unchecked). */
export const RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS: readonly RiffPhraseMotifSeedUiPairing[] = [
  { vrbId: 'weather_report', category: 'sax_inspired', lickLabel: 'sax' },
  { vrbId: 'mahavishnu', category: 'jazz_rock', lickLabel: 'jazz-rock' },
  { vrbId: 'fripp', category: 'diminished_lines', lickLabel: 'diminished' },
  { vrbId: 'iommi', category: 'white_rock_funk', lickLabel: 'white rock funk' },
  { vrbId: 'nile_rodgers', category: 'black_soul_funk', lickLabel: 'black soul funk' },
  { vrbId: 'bill_evans_sax', category: 'bebop_jazz_blues', lickLabel: 'bebop jazz blues' },
  { vrbId: 'hendrix', category: 'blues_rock', lickLabel: 'blues-rock' },
  { vrbId: 'led_zeppelin', category: 'southern_rock', lickLabel: 'southern rock' },
  { vrbId: 'morello', category: 'modern_rock', lickLabel: 'modern rock' },
] as const;

export function vrbHasPhraseMotifSeedPairing(vrbId: string | undefined): boolean {
  if (!vrbId) return false;
  return RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS.some((p) => p.vrbId === vrbId);
}

/** e.g. "Seed motif from real sax licks" — null when VRB unpaired. */
export function phraseMotifSeedCheckboxLabel(vrbId: string | undefined): string | null {
  if (!vrbId) return null;
  const pairing = RIFF_PHRASE_MOTIF_SEED_UI_PAIRINGS.find((p) => p.vrbId === vrbId);
  if (!pairing) return null;
  return 'Seed motif from real ' + pairing.lickLabel + ' licks';
}