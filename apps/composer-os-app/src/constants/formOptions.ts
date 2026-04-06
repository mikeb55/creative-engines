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
  | 'through3'
  | 'through4'
  | 'through5'
  | 'through6'
  | 'through7'
  | 'through8'
  | 'aab'
  | 'abcb'
  | 'abacab';

export const FORM_OPTIONS: FormOption[] = [
  { id: 'aaba',     label: 'AABA',              bars: 32, structure: 'A A\' B A\'\'' },
  { id: 'abac',     label: 'ABAC',              bars: 32, structure: 'A B A\' C' },
  { id: 'aba',      label: 'ABA',               bars: 24, structure: 'A B A\'' },
  { id: 'ab',       label: 'AB',                bars: 16, structure: 'A B' },
  { id: 'blues12',  label: 'Blues (12 bars)',   bars: 12, structure: 'A' },
  { id: 'blues24',  label: 'Blues (24 bars)',   bars: 24, structure: 'A A\'' },
  { id: 'through3', label: 'Through-composed 3',bars: 24, structure: 'A B C' },
  { id: 'through4', label: 'Through-composed 4',bars: 32, structure: 'A B C D' },
  { id: 'through5', label: 'Through-composed 5',bars: 40, structure: 'A B C D E' },
  { id: 'through6', label: 'Through-composed 6', bars: 48, structure: 'A B C D E F' },
  { id: 'through7', label: 'Through-composed 7', bars: 56, structure: 'A B C D E F G' },
  { id: 'through8', label: 'Through-composed 8', bars: 64, structure: 'A B C D E F G H' },
  { id: 'aab',      label: 'AAB',               bars: 24, structure: 'A A\' B' },
  { id: 'abcb',     label: 'ABCB',              bars: 32, structure: 'A B C B\'' },
  { id: 'abacab',   label: 'ABACAB',            bars: 48, structure: 'A B A\' C A\'\' B\'' },
];

export const DEFAULT_FORM_ID = '';
