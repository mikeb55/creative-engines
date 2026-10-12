/**
 * WPS V1.3 — 16-volume Tonality Vault record.
 *
 * Pitch facts follow `docs/WPS_TONALITY_VAULT_16_VOLUME_STUDY.md`, checked against
 * the local manual where a layer-two paragraph disagreed with the triad-pair page.
 * This is not `TONALITY_VAULT_DATABASE`. That table is left as it is.
 *
 * Spellings are for a C root. Transpose with `transposeSpelled`.
 * Page numbers are the matching 567-page PDF.
 */

export type StepName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export interface Spelled {
  step: StepName;
  alter: -2 | -1 | 0 | 1 | 2;
}

export type VaultTriadQuality = 'major' | 'minor' | 'augmented' | 'diminished';

export interface VaultTriad {
  root: Spelled;
  quality: VaultTriadQuality;
  notes: [Spelled, Spelled, Spelled];
}

export interface VaultQuadratonic {
  /** Printed label such as `E / 2` or `D / b7`. */
  label: string;
  notes: Spelled[];
  /** How the book asks the ear to hear the set, when that differs from the tension triad. */
  hearing: string;
}

export interface WpsVaultTonality {
  id: string;
  volume: number;
  /** C-root symbol used in the study. */
  symbol: string;
  family: string;
  harrisLabel: string;
  shell: Spelled[];
  shellDegrees: string[];
  melodicTriad: VaultTriad;
  triadOnDegree: string;
  sharedWithShell: string;
  primaryTension: Spelled;
  primaryTensionRole: string;
  secondaryTension: Spelled;
  secondaryTensionRole: string;
  primaryQuadratonic: VaultQuadratonic;
  resolutionTriad: VaultTriad;
  tensionTriad: VaultTriad;
  tensionQuadratonic: VaultQuadratonic;
  /** Null when the printed sentence does not name the pitch. */
  topDownUnderNote: Spelled | null;
  topDownNote: string;
  /** False when a layer-two boilerplate names a different pair than the triad-pair page. */
  layerTwoAgreesWithPairPage: boolean;
  exceptions: string[];
  chaos: { pitches: string; triads: string } | null;
  pages: { theory: string; guitar: string; pair: string; layers: string };
}

const STEP_PC: Record<StepName, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const STEP_INDEX: Record<StepName, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const INDEX_STEP: StepName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export function pitchClassOf(note: Spelled): number {
  return (STEP_PC[note.step] + note.alter + 120) % 12;
}

export function spellName(note: Spelled): string {
  const marks = note.alter < 0 ? 'b'.repeat(-note.alter) : note.alter > 0 ? '#'.repeat(note.alter) : '';
  return `${note.step}${marks}`;
}

/** Move `note` by the same letter path and semitone path that carries `fromRoot` to `toRoot`. */
export function transposeSpelled(note: Spelled, fromRoot: Spelled, toRoot: Spelled): Spelled {
  const letterDelta = (STEP_INDEX[toRoot.step] - STEP_INDEX[fromRoot.step] + 7) % 7;
  const semiDelta = (pitchClassOf(toRoot) - pitchClassOf(fromRoot) + 12) % 12;
  const newStep = INDEX_STEP[(STEP_INDEX[note.step] + letterDelta) % 7]!;
  const letterSemi = (STEP_PC[newStep] - STEP_PC[note.step] + 12) % 12;
  const alter = note.alter + semiDelta - letterSemi;
  if (alter < -2 || alter > 2) {
    throw new Error(`cannot spell ${spellName(note)} onto ${spellName(toRoot)} (alter ${alter})`);
  }
  return { step: newStep, alter: alter as Spelled['alter'] };
}

export function transposeTriad(triad: VaultTriad, fromRoot: Spelled, toRoot: Spelled): VaultTriad {
  const notes = triad.notes.map((note) => transposeSpelled(note, fromRoot, toRoot)) as [
    Spelled,
    Spelled,
    Spelled,
  ];
  return { root: notes[0], quality: triad.quality, notes };
}

function n(step: StepName, alter: Spelled['alter'] = 0): Spelled {
  return { step, alter };
}

function triad(root: Spelled, quality: VaultTriadQuality, third: Spelled, fifth: Spelled): VaultTriad {
  return { root, quality, notes: [root, third, fifth] };
}

const C = n('C');

export const WPS_VAULT_C_ROOT: Spelled = C;

export const WPS_VAULT_TONALITIES: readonly WpsVaultTonality[] = [
  {
    id: 'maj7-sharp5',
    volume: 1,
    symbol: 'Cmaj7#5',
    family: 'major-seventh sharp five',
    harrisLabel: 'T3',
    shell: [n('C'), n('E'), n('B')],
    shellDegrees: ['1', '3', '7'],
    melodicTriad: triad(n('E'), 'major', n('G', 1), n('B')),
    triadOnDegree: '3',
    sharedWithShell: 'E, B',
    primaryTension: n('F', 1),
    primaryTensionRole: '2 of E. The 9th D is skipped as b7 of E',
    secondaryTension: n('A'),
    secondaryTensionRole: '4 of E',
    primaryQuadratonic: { label: 'E / 2', notes: [n('E'), n('F', 1), n('G', 1), n('B')], hearing: 'E major plus its 2nd' },
    resolutionTriad: triad(n('E'), 'major', n('G', 1), n('B')),
    tensionTriad: triad(n('F', 1), 'diminished', n('A'), n('C')),
    tensionQuadratonic: {
      label: 'D / b7',
      notes: [n('D'), n('F', 1), n('A'), n('C')],
      hearing: 'F# diminished plus D is heard as D major with a b7',
    },
    topDownUnderNote: n('C'),
    topDownNote: 'Root. 3, #5, and 7 are already in the triad',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['Guitar may drop 3 and 7 from the shell when the triad already has them, and may put 5, 6, or #11 underneath.'],
    chaos: null,
    pages: { theory: '8-9', guitar: '10', pair: '29', layers: '27-33' },
  },
  {
    id: 'sus-b9',
    volume: 2,
    symbol: 'Csusb9',
    family: 'suspended flat nine',
    harrisLabel: 'tb7',
    shell: [n('C'), n('F'), n('B')],
    shellDegrees: ['1', '4', '7'],
    melodicTriad: triad(n('B', -1), 'minor', n('D', -1), n('F')),
    triadOnDegree: 'b7',
    sharedWithShell: 'F; Bb is shared on the root-5 guitar shape',
    primaryTension: n('C'),
    primaryTensionRole: 'chord root, by the b9 rule, heard as 2 of Bb minor',
    secondaryTension: n('G'),
    secondaryTensionRole: '6 of Bb minor',
    primaryQuadratonic: {
      label: 'Bb- / 2',
      notes: [n('B', -1), n('C'), n('D', -1), n('F')],
      hearing: 'Bb minor plus its 2nd',
    },
    resolutionTriad: triad(n('B', -1), 'minor', n('D', -1), n('F')),
    tensionTriad: triad(n('C'), 'minor', n('E', -1), n('G')),
    tensionQuadratonic: {
      label: 'C- / 6',
      notes: [n('C'), n('E', -1), n('G'), n('A')],
      hearing: 'C minor plus its 6th. Natural 13, not b13',
    },
    topDownUnderNote: n('G'),
    topDownNote: '5th under Bb minor. 4 and b7 are already in the triad',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['If a triad tone is the chord b9, the first added note is the chord root, unless that resolution would weaken the triad.'],
    chaos: null,
    pages: { theory: '42-43', guitar: '43-44', pair: '62', layers: '64-65' },
  },
  {
    id: 'minmaj13-sharp11',
    volume: 3,
    symbol: 'CminMaj13#11(9)',
    family: 'minor-major thirteenth',
    harrisLabel: 'T2',
    shell: [n('C'), n('E', -1), n('B')],
    shellDegrees: ['1', 'b3', '7'],
    melodicTriad: triad(n('D'), 'major', n('F', 1), n('A')),
    triadOnDegree: '2',
    sharedWithShell: 'none',
    primaryTension: n('E', -1),
    primaryTensionRole: 'b2 of D',
    secondaryTension: n('B'),
    secondaryTensionRole: '6 of D. One question line names the wrong chord; the answer is against the D triad',
    primaryQuadratonic: {
      label: 'D / b2',
      notes: [n('D'), n('E', -1), n('F', 1), n('A')],
      hearing: 'D major plus its b2',
    },
    resolutionTriad: triad(n('D'), 'major', n('F', 1), n('A')),
    tensionTriad: triad(n('G'), 'augmented', n('B'), n('D', 1)),
    tensionQuadratonic: {
      label: 'G+ / 4',
      notes: [n('G'), n('B'), n('D', 1), n('C')],
      hearing: 'G augmented plus C. The manual also prints that augmented fifth as Eb',
    },
    topDownUnderNote: n('E', -1),
    topDownNote: 'b3 under D major',
    layerTwoAgreesWithPairPage: false,
    exceptions: ['Page 97 names B major / C. Page 95 and the pitch calculation on page 98 use D / G+.'],
    chaos: null,
    pages: { theory: '75-76', guitar: '76-77', pair: '95', layers: '97-98' },
  },
  {
    id: 'maj7-sharp11-sharp9',
    volume: 4,
    symbol: 'Cmaj7#11#9',
    family: 'major-seventh sharp eleven sharp nine',
    harrisLabel: 'T7',
    shell: [n('C'), n('E'), n('B')],
    shellDegrees: ['1', '3', '7'],
    melodicTriad: triad(n('B'), 'major', n('D', 1), n('F', 1)),
    triadOnDegree: '7',
    sharedWithShell: 'B',
    primaryTension: n('E'),
    primaryTensionRole: '4 of B',
    secondaryTension: n('G'),
    secondaryTensionRole: 'b6 of B',
    primaryQuadratonic: {
      label: 'B / 4',
      notes: [n('B'), n('D', 1), n('E'), n('F', 1)],
      hearing: 'B major plus its 4th',
    },
    resolutionTriad: triad(n('B'), 'major', n('D', 1), n('F', 1)),
    tensionTriad: triad(n('C'), 'major', n('E'), n('G')),
    tensionQuadratonic: {
      label: 'C / 6',
      notes: [n('C'), n('E'), n('G'), n('A')],
      hearing: 'C major plus its 6th',
    },
    topDownUnderNote: n('E'),
    topDownNote: '3rd under B major',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['The theory header says sus9 while defining this chord. The pitches are this volume.'],
    chaos: null,
    pages: { theory: '108-109', guitar: '109-110', pair: '128', layers: '130-131' },
  },
  {
    id: 'sus9',
    volume: 5,
    symbol: 'Csus9',
    family: 'suspended nine',
    harrisLabel: 'Tb7',
    shell: [n('C'), n('F'), n('B', -1)],
    shellDegrees: ['1', '4', 'b7'],
    melodicTriad: triad(n('B', -1), 'major', n('D'), n('F')),
    triadOnDegree: 'b7',
    sharedWithShell: 'F, Bb',
    primaryTension: n('G'),
    primaryTensionRole: '6 of Bb. For sus, the 4th counts as the 3rd in the hierarchy',
    secondaryTension: n('C'),
    secondaryTensionRole: '2 of Bb. A as 13 is skipped because it is a 7th of Bb',
    primaryQuadratonic: {
      label: 'Bb / 6',
      notes: [n('B', -1), n('D'), n('F'), n('G')],
      hearing: 'Bb major plus its 6th',
    },
    resolutionTriad: triad(n('B', -1), 'major', n('D'), n('F')),
    tensionTriad: triad(n('C'), 'major', n('E'), n('G')),
    tensionQuadratonic: {
      label: 'C / 6',
      notes: [n('C'), n('E'), n('G'), n('A')],
      hearing: 'C major plus its 6th',
    },
    topDownUnderNote: n('G'),
    topDownNote: '5th, and the root is also allowed',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['One sentence prints Bbb for a note the same paragraph calls Bb.'],
    chaos: null,
    pages: { theory: '141-142', guitar: '142-143', pair: '162', layers: '164-165' },
  },
  {
    id: 'min9',
    volume: 6,
    symbol: 'Cmin9',
    family: 'minor nine',
    harrisLabel: 't5',
    shell: [n('C'), n('E', -1), n('B', -1)],
    shellDegrees: ['1', 'b3', 'b7'],
    melodicTriad: triad(n('G'), 'minor', n('B', -1), n('D')),
    triadOnDegree: '5',
    sharedWithShell: 'Bb',
    primaryTension: n('A'),
    primaryTensionRole: '2 of G. Eb is skipped because it builds Eb major. F is skipped because it builds Bb major',
    secondaryTension: n('C'),
    secondaryTensionRole: '4 of G, the chord root',
    primaryQuadratonic: {
      label: 'G- / 2',
      notes: [n('G'), n('A'), n('B', -1), n('D')],
      hearing: 'G minor plus its 2nd',
    },
    resolutionTriad: triad(n('G'), 'minor', n('B', -1), n('D')),
    tensionTriad: triad(n('A'), 'diminished', n('C'), n('E', -1)),
    tensionQuadratonic: {
      label: 'F / b7',
      notes: [n('F'), n('A'), n('C'), n('E', -1)],
      hearing: 'A diminished plus F is heard as F major with a b7',
    },
    topDownUnderNote: n('E', -1),
    topDownNote: 'chord 3rd. The triad is already 5, b7, 9',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['Five-note guitar grips share Bb on string 3.'],
    chaos: null,
    pages: { theory: '176-177', guitar: '177-178', pair: '197', layers: '199-200' },
  },
  {
    id: 'maj7',
    volume: 7,
    symbol: 'Cmaj7',
    family: 'major seventh',
    harrisLabel: 't3',
    shell: [n('C'), n('E'), n('B')],
    shellDegrees: ['1', '3', '7'],
    melodicTriad: triad(n('E'), 'minor', n('G'), n('B')),
    triadOnDegree: '3',
    sharedWithShell: 'E, B',
    primaryTension: n('A'),
    primaryTensionRole: '4 of E. F is skipped as a G7 sound. D is skipped as b7 and as G major',
    secondaryTension: n('C'),
    secondaryTensionRole: 'b6 of E minor, taken because the hierarchy is otherwise exhausted',
    primaryQuadratonic: {
      label: 'E- / 4',
      notes: [n('E'), n('G'), n('A'), n('B')],
      hearing: 'E minor plus its 4th',
    },
    resolutionTriad: triad(n('E'), 'minor', n('G'), n('B')),
    tensionTriad: triad(n('F'), 'major', n('A'), n('C')),
    tensionQuadratonic: {
      label: 'F / 6',
      notes: [n('F'), n('A'), n('C'), n('D')],
      hearing: 'F major plus its 6th',
    },
    topDownUnderNote: n('C'),
    topDownNote: 'Root. The triad is already 3, 5, 7',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['One guitar inversion puts the shell on strings 3-6 and the triad on strings 1-3.'],
    chaos: null,
    pages: { theory: '211-212', guitar: '212-213', pair: '232', layers: '233-234' },
  },
  {
    id: 'dim7-b13',
    volume: 8,
    symbol: 'Cdim7b13',
    family: 'diminished seventh flat thirteen',
    harrisLabel: 'Tb6',
    shell: [n('C'), n('E', -1), n('G', -1), n('A')],
    shellDegrees: ['1', 'b3', 'b5', 'bb7'],
    melodicTriad: triad(n('A', -1), 'major', n('C'), n('E', -1)),
    triadOnDegree: 'b6',
    sharedWithShell: 'C, Eb',
    primaryTension: n('A'),
    primaryTensionRole: 'b2 of Ab, the same pitch as the diminished 7th',
    secondaryTension: n('G', -1),
    secondaryTensionRole: 'b7 of Ab',
    primaryQuadratonic: {
      label: 'Ab / b2',
      notes: [n('A', -1), n('A'), n('C'), n('E', -1)],
      hearing: 'Ab major plus its b2',
    },
    resolutionTriad: triad(n('A', -1), 'major', n('C'), n('E', -1)),
    tensionTriad: triad(n('D'), 'major', n('F', 1), n('A')),
    tensionQuadratonic: {
      label: 'D / #2',
      notes: [n('D'), n('F'), n('F', 1), n('A')],
      hearing: 'The added pitch is F, the 11th. The book calls that b3 of D and also #2',
    },
    topDownUnderNote: n('A'),
    topDownNote: 'Printed result is bb7, b3, b13, and root. The note outside the triad is A',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['The b5 stays in the shell because it defines the diminished chord. The right hand is Ab major, not a diminished triad.'],
    chaos: null,
    pages: { theory: '245-246', guitar: '246-247', pair: '265', layers: '267-268' },
  },
  {
    id: '13-sharp11',
    volume: 9,
    symbol: 'C13#11(9)',
    family: 'thirteenth sharp eleven',
    harrisLabel: 'T2',
    shell: [n('C'), n('E'), n('B', -1)],
    shellDegrees: ['1', '3', 'b7'],
    melodicTriad: triad(n('D'), 'major', n('F', 1), n('A')),
    triadOnDegree: '2',
    sharedWithShell: 'none',
    primaryTension: n('E'),
    primaryTensionRole: '2 of D',
    secondaryTension: n('B', -1),
    secondaryTensionRole: 'b7 of the chord, not in D major',
    primaryQuadratonic: {
      label: 'D / 2',
      notes: [n('D'), n('E'), n('F', 1), n('A')],
      hearing: 'D major plus its 2nd',
    },
    resolutionTriad: triad(n('D'), 'major', n('F', 1), n('A')),
    tensionTriad: triad(n('E'), 'diminished', n('G'), n('B', -1)),
    tensionQuadratonic: {
      label: 'C / b7',
      notes: [n('C'), n('E'), n('G'), n('B', -1)],
      hearing: 'E diminished plus C is heard as C major with a b7. One sentence calls the root F; the added pitch and the set are C',
    },
    topDownUnderNote: n('B', -1),
    topDownNote: 'b7. E under D is rejected as a sus voicing. Result: b7, 9, #11, 13',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['Root and b7 often will not fit together. The book prefers the b7, or the root attacked first.'],
    chaos: null,
    pages: { theory: '279-280', guitar: '280-281', pair: '299', layers: '301-302' },
  },
  {
    id: 'maj7-sharp11',
    volume: 10,
    symbol: 'Cmaj7#11',
    family: 'major-seventh sharp eleven',
    harrisLabel: 't3',
    shell: [n('C'), n('E'), n('B')],
    shellDegrees: ['1', '3', '7'],
    melodicTriad: triad(n('E'), 'minor', n('G'), n('B')),
    triadOnDegree: '3',
    sharedWithShell: 'E, B',
    primaryTension: n('F', 1),
    primaryTensionRole: '2 of E minor',
    secondaryTension: n('A'),
    secondaryTensionRole: '4 of E minor. A #4 may join as a blues colour',
    primaryQuadratonic: {
      label: 'E- / 2',
      notes: [n('E'), n('F', 1), n('G'), n('B')],
      hearing: 'E minor plus its 2nd',
    },
    resolutionTriad: triad(n('E'), 'minor', n('G'), n('B')),
    tensionTriad: triad(n('F', 1), 'diminished', n('A'), n('C')),
    tensionQuadratonic: {
      label: 'D / b7',
      notes: [n('D'), n('F', 1), n('A'), n('C')],
      hearing: 'F# diminished plus D is heard as D major with a b7',
    },
    topDownUnderNote: null,
    topDownNote: 'The sentence begins the same root argument as volume 7 and does not name the pitch in the following text',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['Same physical pattern as plain maj7: shared B, shell reachable on strings 3-6.'],
    chaos: null,
    pages: { theory: '313-314', guitar: '314-315', pair: '334', layers: '336-337' },
  },
  {
    id: 'minmaj9',
    volume: 11,
    symbol: 'CminMaj9',
    family: 'minor-major ninth',
    harrisLabel: 'T5',
    shell: [n('C'), n('E', -1), n('B')],
    shellDegrees: ['1', 'b3', '7'],
    melodicTriad: triad(n('G'), 'major', n('B'), n('D')),
    triadOnDegree: '5',
    sharedWithShell: 'B',
    primaryTension: n('E', -1),
    primaryTensionRole: 'b6 of G',
    secondaryTension: n('A'),
    secondaryTensionRole: '2 of G. F is skipped because it makes a G7',
    primaryQuadratonic: {
      label: 'G / b6',
      notes: [n('G'), n('B'), n('D'), n('E', -1)],
      hearing: 'G major plus its b6',
    },
    resolutionTriad: triad(n('G'), 'major', n('B'), n('D')),
    tensionTriad: triad(n('A'), 'diminished', n('C'), n('E', -1)),
    tensionQuadratonic: {
      label: 'F / b7',
      notes: [n('F'), n('A'), n('C'), n('E', -1)],
      hearing: 'A diminished plus F is heard as F major with a b7',
    },
    topDownUnderNote: n('E', -1),
    topDownNote: 'b3. Printed result: b3, 5, 7, 9',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['The major 7th is already in the triad and is hard to reach. A 6th may stand in the shell.'],
    chaos: null,
    pages: { theory: '346-347', guitar: '347-348', pair: '368', layers: '370-371' },
  },
  {
    id: 'min7b5',
    volume: 12,
    symbol: 'Cmin7b5',
    family: 'half-diminished',
    harrisLabel: 'tb3',
    shell: [n('C'), n('E', -1), n('B', -1)],
    shellDegrees: ['1', 'b3', 'b7'],
    melodicTriad: triad(n('E', -1), 'minor', n('G', -1), n('B', -1)),
    triadOnDegree: 'b3',
    sharedWithShell: 'Eb, Bb',
    primaryTension: n('F'),
    primaryTensionRole: '2 of Eb minor',
    secondaryTension: n('A', -1),
    secondaryTensionRole: '4 of Eb minor. A #4 may join as a blues colour',
    primaryQuadratonic: {
      label: 'Eb- / 2',
      notes: [n('E', -1), n('F'), n('G', -1), n('B', -1)],
      hearing: 'Eb minor plus its 2nd',
    },
    resolutionTriad: triad(n('E', -1), 'minor', n('G', -1), n('B', -1)),
    tensionTriad: triad(n('F'), 'minor', n('A', -1), n('C')),
    tensionQuadratonic: {
      label: 'F- / b6',
      notes: [n('F'), n('A', -1), n('C'), n('D', -1)],
      hearing: 'Db added to F minor. The major triad on Db can overpower F minor',
    },
    topDownUnderNote: n('C'),
    topDownNote: 'Root. 3, b5, and b7 are already in the Eb minor triad. The b5 is not repeated in this shell',
    layerTwoAgreesWithPairPage: false,
    exceptions: ['Page 404 names Ab major / Bb diminished. Page 401 and the pitch calculation on page 405 use Eb minor / F minor.'],
    chaos: null,
    pages: { theory: '380-381', guitar: '381-382', pair: '401', layers: '404-405' },
  },
  {
    id: '7-sharp9-sharp5',
    volume: 13,
    symbol: 'C7#9#5',
    family: 'dominant sharp nine sharp five',
    harrisLabel: 'Tb6',
    shell: [n('C'), n('E'), n('B', -1)],
    shellDegrees: ['1', '3', 'b7'],
    melodicTriad: triad(n('A', -1), 'major', n('C'), n('E', -1)),
    triadOnDegree: 'b6',
    sharedWithShell: 'C',
    primaryTension: n('E'),
    primaryTensionRole: 'b6 of Ab',
    secondaryTension: n('B', -1),
    secondaryTensionRole: '2 of Ab',
    primaryQuadratonic: {
      label: 'Ab / b6',
      notes: [n('A', -1), n('C'), n('E', -1), n('E')],
      hearing: 'Ab major plus its b6',
    },
    resolutionTriad: triad(n('A', -1), 'major', n('C'), n('E', -1)),
    tensionTriad: triad(n('B', -1), 'diminished', n('D', -1), n('F', -1)),
    tensionQuadratonic: {
      label: 'Gb / b7',
      notes: [n('G', -1), n('B', -1), n('D', -1), n('F', -1)],
      hearing: 'F# is heard as the root of Gb major, not as a colour that resolves into Bb diminished',
    },
    topDownUnderNote: n('E'),
    topDownNote: '3rd under Ab major',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['Root is often parenthetical so the b7 can stay.'],
    chaos: null,
    pages: { theory: '414-415', guitar: '415-416', pair: '437', layers: '439-440' },
  },
  {
    id: '13b9',
    volume: 14,
    symbol: 'C13b9',
    family: 'thirteenth flat nine',
    harrisLabel: 'T6',
    shell: [n('C'), n('E'), n('B', -1)],
    shellDegrees: ['1', '3', 'b7'],
    melodicTriad: triad(n('A'), 'major', n('C', 1), n('E')),
    triadOnDegree: '6',
    sharedWithShell: 'E',
    primaryTension: n('B', -1),
    primaryTensionRole: 'b2 of A',
    secondaryTension: n('G'),
    secondaryTensionRole: 'b7 of A',
    primaryQuadratonic: {
      label: 'A / b2',
      notes: [n('A'), n('B', -1), n('C', 1), n('E')],
      hearing: 'A major plus its b2',
    },
    resolutionTriad: triad(n('A'), 'major', n('C', 1), n('E')),
    tensionTriad: triad(n('E', -1), 'major', n('G'), n('B', -1)),
    tensionQuadratonic: {
      label: 'Eb / #2',
      notes: [n('E', -1), n('G'), n('B', -1), n('F', 1)],
      hearing: 'F# , the #11, added to Eb major',
    },
    topDownUnderNote: n('B', -1),
    topDownNote: 'b7 under A major. The 3rd is already in the triad',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['This pair is a tritone apart because of the passing tones, not because a substitution engine chose it.'],
    chaos: { pitches: 'B C D F Ab', triads: 'F minor is the triad named inside the leftover notes' },
    pages: { theory: '449-450', guitar: '450-451', pair: '469', layers: '478-483' },
  },
  {
    id: 'min11',
    volume: 15,
    symbol: 'Cmin11(9)',
    family: 'minor eleventh',
    harrisLabel: 'Tb7',
    shell: [n('C'), n('E', -1), n('B', -1)],
    shellDegrees: ['1', 'b3', 'b7'],
    melodicTriad: triad(n('B', -1), 'major', n('D'), n('F')),
    triadOnDegree: 'b7',
    sharedWithShell: 'Bb',
    primaryTension: n('E', -1),
    primaryTensionRole: '4 of Bb',
    secondaryTension: n('G'),
    secondaryTensionRole: '6 of Bb',
    primaryQuadratonic: {
      label: 'Bb / 4',
      notes: [n('B', -1), n('D'), n('E', -1), n('F')],
      hearing: 'Bb major plus its 4th',
    },
    resolutionTriad: triad(n('B', -1), 'major', n('D'), n('F')),
    tensionTriad: triad(n('C'), 'minor', n('E', -1), n('G')),
    tensionQuadratonic: {
      label: 'C- / 6',
      notes: [n('C'), n('E', -1), n('G'), n('A')],
      hearing: 'A, the 13th, added to C minor',
    },
    topDownUnderNote: n('E', -1),
    topDownNote: 'b3 under Bb major',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['Measure 1 keeps the root and drops the b7, which is already in the triad.'],
    chaos: {
      pitches: 'B C# E F# G#',
      triads: 'E major and C# minor. Quadratonics printed E / 2, 6 and C#- / 4',
    },
    pages: { theory: '492-493', guitar: '493-494', pair: '512', layers: '520-524' },
  },
  {
    id: 'maj9',
    volume: 16,
    symbol: 'Cmaj9',
    family: 'major ninth',
    harrisLabel: 'T5',
    shell: [n('C'), n('E'), n('B')],
    shellDegrees: ['1', '3', '7'],
    melodicTriad: triad(n('G'), 'major', n('B'), n('D')),
    triadOnDegree: '5',
    sharedWithShell: 'B',
    primaryTension: n('E'),
    primaryTensionRole: '6 of G',
    secondaryTension: n('A'),
    secondaryTensionRole: '2 of G. Natural 11 is skipped here because it is a 7th of G',
    primaryQuadratonic: {
      label: 'G / 6',
      notes: [n('G'), n('B'), n('D'), n('E')],
      hearing: 'G major plus its 6th. Every-other dyads are G-D and B-E',
    },
    resolutionTriad: triad(n('G'), 'major', n('B'), n('D')),
    tensionTriad: triad(n('A'), 'minor', n('C'), n('E')),
    tensionQuadratonic: {
      label: 'A- / b6',
      notes: [n('A'), n('C'), n('E'), n('F')],
      hearing: 'Natural 11 F on A minor. Lydian F# is declined for this ionian major',
    },
    topDownUnderNote: n('E'),
    topDownNote: '3rd under G major',
    layerTwoAgreesWithPairPage: true,
    exceptions: ['One inversion drops a triad tone an octave so one triad note sits with the shell.'],
    chaos: null,
    pages: { theory: '533-534', guitar: '534-535', pair: '559', layers: '560-563' },
  },
] as const;

const BY_ID = new Map(WPS_VAULT_TONALITIES.map((row) => [row.id, row]));

export function wpsVaultTonality(id: string): WpsVaultTonality | undefined {
  return BY_ID.get(id);
}

export function transposeVaultTonality(row: WpsVaultTonality, root: Spelled): WpsVaultTonality {
  const move = (note: Spelled) => transposeSpelled(note, C, root);
  const moveTriad = (item: VaultTriad) => transposeTriad(item, C, root);
  const moveQuad = (item: VaultQuadratonic): VaultQuadratonic => ({
    ...item,
    notes: item.notes.map(move),
  });
  return {
    ...row,
    shell: row.shell.map(move),
    melodicTriad: moveTriad(row.melodicTriad),
    primaryTension: move(row.primaryTension),
    secondaryTension: move(row.secondaryTension),
    primaryQuadratonic: moveQuad(row.primaryQuadratonic),
    resolutionTriad: moveTriad(row.resolutionTriad),
    tensionTriad: moveTriad(row.tensionTriad),
    tensionQuadratonic: moveQuad(row.tensionQuadratonic),
    topDownUnderNote: row.topDownUnderNote ? move(row.topDownUnderNote) : null,
  };
}
