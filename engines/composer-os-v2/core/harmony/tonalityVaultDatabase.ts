/**
 * Tonality Vault chord-type reference rows.
 *
 * Interval numbers use chord-root scale degrees: 1 3 5 7 9 11 13.
 * Alterations (# b) live on the chord symbol; same degree slot still uses the base number.
 */

export type MelodicTriadQuality = 'major' | 'minor' | 'diminished';

export type TonalityVaultChordRow = {
  chordType: string;
  displayName: string;
  leftHandShell: number[];
  melodicTriadRoot: string;
  melodicTriadQuality: MelodicTriadQuality;
  primaryTensionNote: number;
  tensionHierarchy: number[];
};

export const TONALITY_VAULT_DATABASE: readonly TonalityVaultChordRow[] = [
  {
    chordType: 'Maj7#5',
    displayName: 'Major seventh sharp five (augmented major seventh)',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T3',
    melodicTriadQuality: 'major',
    primaryTensionNote: 5,
    tensionHierarchy: [3, 7, 5, 1],
  },
  {
    chordType: 'sus-b9',
    displayName: 'Suspended fourth with flat ninth',
    leftHandShell: [1, 4, 7],
    melodicTriadRoot: 'T4',
    melodicTriadQuality: 'minor',
    primaryTensionNote: 9,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
  {
    chordType: 'minMaj13#11#9',
    displayName: 'Minor–major thirteenth, sharp eleventh and sharp ninth',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T7',
    melodicTriadQuality: 'minor',
    primaryTensionNote: 11,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
  {
    chordType: 'Maj7#11#9',
    displayName: 'Major seventh sharp eleventh and sharp ninth',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T3',
    melodicTriadQuality: 'major',
    primaryTensionNote: 11,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
  {
    chordType: 'sus9',
    displayName: 'Suspended ninth',
    leftHandShell: [1, 4, 9],
    melodicTriadRoot: 'T4',
    melodicTriadQuality: 'major',
    primaryTensionNote: 9,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
  {
    chordType: 'min9',
    displayName: 'Minor ninth',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T7',
    melodicTriadQuality: 'minor',
    primaryTensionNote: 9,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
  {
    chordType: 'Maj7',
    displayName: 'Major seventh',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T3',
    melodicTriadQuality: 'major',
    primaryTensionNote: 7,
    tensionHierarchy: [3, 7, 5, 1],
  },
  {
    chordType: 'Maj6',
    displayName: 'Major sixth',
    leftHandShell: [1, 3, 6],
    melodicTriadRoot: 'T3',
    melodicTriadQuality: 'major',
    primaryTensionNote: 9,
    tensionHierarchy: [3, 6, 5, 9, 1],
  },
  {
    chordType: 'dim7b13',
    displayName: 'Diminished seventh flat thirteen',
    leftHandShell: [1, 3, 5, 7],
    melodicTriadRoot: 'T7',
    melodicTriadQuality: 'diminished',
    primaryTensionNote: 13,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
  {
    chordType: '13#11#9',
    displayName: 'Thirteenth sharp eleventh sharp ninth',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T3',
    melodicTriadQuality: 'major',
    primaryTensionNote: 13,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
  {
    chordType: 'Maj7#11',
    displayName: 'Major seventh sharp eleventh',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T3',
    melodicTriadQuality: 'major',
    primaryTensionNote: 11,
    tensionHierarchy: [3, 7, 5, 11, 1],
  },
  {
    chordType: 'minMaj9',
    displayName: 'Minor–major ninth',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T7',
    melodicTriadQuality: 'minor',
    primaryTensionNote: 9,
    tensionHierarchy: [3, 7, 5, 9, 1],
  },
  {
    chordType: 'min7b5',
    displayName: 'Minor seventh flat five (half-diminished)',
    leftHandShell: [1, 3, 5, 7],
    melodicTriadRoot: 'T7',
    melodicTriadQuality: 'diminished',
    primaryTensionNote: 5,
    tensionHierarchy: [3, 7, 5, 1],
  },
  {
    chordType: '7#9#5',
    displayName: 'Seventh sharp ninth sharp five',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T3',
    melodicTriadQuality: 'major',
    primaryTensionNote: 9,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
  {
    chordType: '13b9',
    displayName: 'Thirteenth flat ninth',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T3',
    melodicTriadQuality: 'major',
    primaryTensionNote: 9,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
  {
    chordType: 'Maj9',
    displayName: 'Major ninth',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T3',
    melodicTriadQuality: 'major',
    primaryTensionNote: 9,
    tensionHierarchy: [3, 7, 5, 9, 1],
  },
  {
    chordType: 'min11',
    displayName: 'Minor eleventh',
    leftHandShell: [1, 3, 7],
    melodicTriadRoot: 'T7',
    melodicTriadQuality: 'minor',
    primaryTensionNote: 11,
    tensionHierarchy: [3, 7, 5, 9, 11, 13, 1],
  },
] as const;
