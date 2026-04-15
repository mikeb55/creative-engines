export interface FormOption {
  id: string;
  label: string;
  bars: number;
  structure: string;
}

export type FormId =
  | 'aaba'
  | 'abac'
  | 'aba'
  | 'ab'
  | 'blues12'
  | 'blues24'
  /** Big Band only: 42-bar chart (Intro 2 + Head 12 + Solo 12 + Shout 12 + Rideout 4). See `planBigBandBlues12Form`. */
  | 'big_band_blues12'
  | 'through3'
  | 'through4'
  | 'aab'
  | 'abcb';

export const FORM_OPTIONS: FormOption[] = [
  { id: 'aaba',     label: 'AABA',              bars: 32, structure: 'A A\' B A\'\'' },
  { id: 'abac',     label: 'ABAC',              bars: 32, structure: 'A B A\' C' },
  { id: 'aba',      label: 'ABA',               bars: 24, structure: 'A B A\'' },
  { id: 'ab',       label: 'AB',                bars: 16, structure: 'A B' },
  { id: 'blues12',  label: 'Blues (12 bars)',   bars: 12, structure: 'A' },
  {
    id: 'big_band_blues12',
    label: 'Big Band: Blues chart',
    bars: 42,
    structure: 'Intro 2 + Head 12 + Solo 12 + Shout 12 + Rideout 4',
  },
  { id: 'blues24',  label: 'Blues (24 bars)',   bars: 24, structure: 'A A\'' },
  { id: 'through3', label: 'Through-composed 3',bars: 24, structure: 'A B C' },
  { id: 'through4', label: 'Through-composed 4',bars: 32, structure: 'A B C D' },
  { id: 'aab',      label: 'AAB',               bars: 24, structure: 'A A\' B' },
  { id: 'abcb',     label: 'ABCB',              bars: 32, structure: 'A B C B\'' },
];

export const DEFAULT_FORM_ID = '';
