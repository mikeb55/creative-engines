/**
 * String quartet — minimal consumption of `wybleVoiceLayout` in score building.
 * When the layout matches the static string-quartet Wyble map, swap chord tones
 * between violin II (inner_counter) and viola so inner-line assignment is not
 * identical to the legacy per-instrument stack order.
 */

import type { EnsembleWybleRoleMap } from '../wyble/wybleVoiceLayoutTypes';
import { WYBLE_ROLE_MAP_STRING_QUARTET } from '../wyble/ensembleWybleRoleMaps';

/** Order matches `QUARTET_INSTRUMENTS`: violin_1, violin_2, viola, cello. */
export type QuartetChordToneStack = readonly [number, number, number, number];

function isStringQuartetWybleMap(layout: EnsembleWybleRoleMap): boolean {
  const m = WYBLE_ROLE_MAP_STRING_QUARTET;
  return (
    layout.lead_line.partId === m.lead_line.partId &&
    layout.inner_counter.partId === m.inner_counter.partId &&
    layout.bass_anchor.partId === m.bass_anchor.partId
  );
}

/**
 * @returns Pitch stack in the same instrument order as `pitchesQuartetString` output.
 */
export function applyQuartetWybleChordToneStack(
  stack: QuartetChordToneStack,
  layout: EnsembleWybleRoleMap | undefined
): [number, number, number, number] {
  if (!layout || !isStringQuartetWybleMap(layout)) {
    return [stack[0]!, stack[1]!, stack[2]!, stack[3]!];
  }
  return [stack[0]!, stack[2]!, stack[1]!, stack[3]!];
}
