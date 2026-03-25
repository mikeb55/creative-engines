/**
 * String quartet — instrument ids (Prompt 6/7).
 */

export type QuartetInstrument = 'violin_1' | 'violin_2' | 'viola' | 'cello';

export const QUARTET_INSTRUMENTS: readonly QuartetInstrument[] = ['violin_1', 'violin_2', 'viola', 'cello'];

/** Shared orchestration part ids (string quartet family). */
export const SQ_PART_V1 = 'sq_violin_1';
export const SQ_PART_V2 = 'sq_violin_2';
export const SQ_PART_VA = 'sq_viola';
export const SQ_PART_VC = 'sq_cello';

export function partIdForQuartetInstrument(i: QuartetInstrument): string {
  switch (i) {
    case 'violin_1':
      return SQ_PART_V1;
    case 'violin_2':
      return SQ_PART_V2;
    case 'viola':
      return SQ_PART_VA;
    case 'cello':
      return SQ_PART_VC;
  }
}
