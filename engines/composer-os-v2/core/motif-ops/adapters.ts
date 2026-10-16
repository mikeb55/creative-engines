/**
 * Evidence-only notes. BHL and pentatonic generators are not rewritten onto N1.
 * These differences are deliberate.
 */

export interface TransformDifference {
  engine: 'bhl' | 'pentatonic' | 'berg' | 'motif';
  existing: string;
  shared: string;
  difference: string;
}

export const DELIBERATE_TRANSFORM_DIFFERENCES: readonly TransformDifference[] = [
  {
    engine: 'pentatonic',
    existing: 'transformCell rotation',
    shared: 'retrograde',
    difference: 'Pentatonic rotation cycles the cell forward by one note. Retrograde reverses pitch order and duration order.',
  },
  {
    engine: 'pentatonic',
    existing: 'transformCell transposition',
    shared: 'transpose-in-field',
    difference: 'Pentatonic transposition moves by one step of that collection. The shared operator takes an explicit degree count and does not read the pentatonic registry.',
  },
  {
    engine: 'pentatonic',
    existing: 'M-DEG and M-NEAR',
    shared: 'invert-in-field',
    difference: 'M-DEG and M-NEAR map a cell from one pentatonic collection onto another. In-field inversion reflects scale degrees around an axis inside one field.',
  },
  {
    engine: 'bhl',
    existing: 'continuation strategies extend, fragment, sequence, rhythm, converse',
    shared: 'fragment-head, sequence-real, sequence-tonal',
    difference: 'BHL strategies choose a phrase region on the BHL bar grid. The shared operators rewrite one cell and record a TransformStep. They do not plan BHL regions.',
  },
  {
    engine: 'bhl',
    existing: 'invert-into-field region reason',
    shared: 'invert-in-field',
    difference: 'BHL names a transformation region. It does not call the shared degree inversion.',
  },
  {
    engine: 'berg',
    existing: 'bergRowEngine retrograde',
    shared: 'retrograde',
    difference: 'The Berg operator reverses a twelve-tone row. The shared operator reverses a rhythmic cell, including durations and rests.',
  },
  {
    engine: 'motif',
    existing: 'MotifCell2TransformBudget retrograde and sequence flags',
    shared: 'applyBudgetOperators',
    difference: 'The flags stay on the cell. They run through the shared library only when motifOps.enabled is true. With the flag off the cell is returned unchanged.',
  },
];
