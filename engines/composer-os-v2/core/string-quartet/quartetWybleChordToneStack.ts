/**
 * String quartet — minimal consumption of `wybleVoiceLayout` in score building.
 * When the layout matches the static string-quartet Wyble map, swap chord tones
 * between violin II (inner_counter) and viola so inner-line assignment is not
 * identical to the legacy per-instrument stack order.
 */

import type { EnsembleWybleRoleMap } from '../wyble/wybleVoiceLayoutTypes';
import { WYBLE_ROLE_MAP_STRING_QUARTET } from '../wyble/ensembleWybleRoleMaps';
import { nearestOctavePreferContrary, nearestOctaveToPrevious } from '../wyble/wybleInnerLineMotion';

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
  layout: EnsembleWybleRoleMap | undefined,
  previousInner?: { violin1?: number; violin2?: number; viola?: number }
): [number, number, number, number] {
  const v1 = nearestOctaveToPrevious(stack[0]!, previousInner?.violin1 ?? null);
  if (!layout || !isStringQuartetWybleMap(layout)) {
    return [v1, stack[1]!, stack[2]!, stack[3]!];
  }
  const raw = [v1, stack[2]!, stack[1]!, stack[3]!] as [number, number, number, number];
  const v2 = nearestOctaveToPrevious(raw[1], previousInner?.violin2 ?? null);
  const va = nearestOctavePreferContrary({
    targetMidi: raw[2],
    previousMidi: previousInner?.viola ?? null,
    outerDelta:
      typeof previousInner?.violin2 === 'number'
        ? v2 - previousInner.violin2
        : null,
  });
  return [raw[0], v2, va, raw[3]];
}
