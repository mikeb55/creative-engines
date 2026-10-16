/**
 * V80k - Guitar playability pre-filter for Barry Harris chord-melody voicings.
 * The rule lives in guitar/voicingFeasibility.ts. This path re-exports it.
 */

export {
  GUITAR_MAX_FRET_SPAN,
  GUITAR_OPEN_STRING_MIDIS,
  GUITAR_STRETCH_FRET_SPAN,
  assessGuitarFeasibility,
  isGuitarVoicingFeasible,
  type GuitarFeasibilityResult,
} from '../guitar/voicingFeasibility';

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

/** Drop-2 spacing: wide inner gap from dropping 2nd voice from top an octave. */
export function isDrop2InnerSpacing(_melodyMidi: number, innerAsc: readonly number[]): boolean {
  if (innerAsc.length < 2) return false;
  for (let i = 1; i < innerAsc.length; i += 1) {
    if (innerAsc[i]! - innerAsc[i - 1]! >= 8) return true;
  }
  return false;
}

export function pitchClasses(midis: readonly number[]): number[] {
  return [...new Set(midis.map(mod12))].sort((a, b) => a - b);
}
