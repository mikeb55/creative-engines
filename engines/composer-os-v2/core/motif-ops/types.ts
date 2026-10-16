/**
 * Shared motivic operators. Evidence and opt-in chains only.
 * Generators keep their own transform code unless motifOps is explicitly on.
 */

export interface MotifNoteEvent {
  /** Quarter-lengths from the start of the statement. */
  onset: number;
  duration: number;
  /** Null is a rest. */
  midi: number | null;
}

export interface Motif {
  id: string;
  events: readonly MotifNoteEvent[];
  /** Pitch-class collection for in-field operators. */
  field?: readonly number[];
}

export type OperatorId =
  | 'transpose'
  | 'transpose-in-field'
  | 'invert'
  | 'invert-in-field'
  | 'retrograde'
  | 'retrograde-inversion'
  | 'augment'
  | 'diminish'
  | 'fragment-head'
  | 'fragment-tail'
  | 'fragment-inner'
  | 'sequence-real'
  | 'sequence-tonal'
  | 'expand-intervals'
  | 'contract-intervals'
  | 'displace'
  | 'insert-rest'
  | 'register-lift'
  | 'liquidate';

export interface TransformStep {
  op: OperatorId;
  params: Record<string, number | string>;
  fromId: string;
  toId: string;
}

export interface OperatorResult {
  motif: Motif;
  step: TransformStep;
  warnings: string[];
}

export const OPERATOR_IDS: readonly OperatorId[] = [
  'transpose',
  'transpose-in-field',
  'invert',
  'invert-in-field',
  'retrograde',
  'retrograde-inversion',
  'augment',
  'diminish',
  'fragment-head',
  'fragment-tail',
  'fragment-inner',
  'sequence-real',
  'sequence-tonal',
  'expand-intervals',
  'contract-intervals',
  'displace',
  'insert-rest',
  'register-lift',
  'liquidate',
];

export const C_MAJOR_FIELD: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

export function lineageSuffix(op: OperatorId): string {
  switch (op) {
    case 'transpose':
      return 't';
    case 'transpose-in-field':
      return 'tf';
    case 'invert':
      return 'i';
    case 'invert-in-field':
      return 'if';
    case 'retrograde':
      return 'r';
    case 'retrograde-inversion':
      return 'ri';
    case 'augment':
      return 'aug';
    case 'diminish':
      return 'dim';
    case 'fragment-head':
      return 'fh';
    case 'fragment-tail':
      return 'ft';
    case 'fragment-inner':
      return 'fi';
    case 'sequence-real':
      return 'sr';
    case 'sequence-tonal':
      return 'st';
    case 'expand-intervals':
      return 'ex';
    case 'contract-intervals':
      return 'co';
    case 'displace':
      return 'd';
    case 'insert-rest':
      return 'rest';
    case 'register-lift':
      return 'lift';
    case 'liquidate':
      return 'liq';
    default:
      return 'op';
  }
}
