/**
 * Big band — minimal consumption of `wybleVoiceLayout` in score building.
 * When the layout matches the static big-band Wyble map, tenor sax (`inner_counter`)
 * is voiced below the alto lead tone so the two saxes are not locked to unison
 * on every bar (Wyble-style inner line separation).
 */

import type { EnsembleWybleRoleMap } from '../wyble/wybleVoiceLayoutTypes';
import { WYBLE_ROLE_MAP_BIG_BAND } from '../wyble/ensembleWybleRoleMaps';
import { nearestOctaveToPrevious } from '../wyble/wybleInnerLineMotion';

/** Semitones below alto lead for `inner_counter` on `bb_tenor_sax` (minor third). */
export const WYBLE_BB_INNER_BELOW_LEAD_SEMITONES = 3;

function isBigBandWybleMap(layout: EnsembleWybleRoleMap): boolean {
  const m = WYBLE_ROLE_MAP_BIG_BAND;
  return (
    layout.lead_line.partId === m.lead_line.partId &&
    layout.inner_counter.partId === m.inner_counter.partId &&
    layout.bass_anchor.partId === m.bass_anchor.partId
  );
}

export function applyBigBandWybleLeadInnerSaxMidis(
  altoMidi: number,
  tenorMidi: number,
  layout: EnsembleWybleRoleMap | undefined,
  snapSax: (midi: number) => number,
  previousTenorMidi?: number
): { altoMidi: number; tenorMidi: number } {
  if (!layout || !isBigBandWybleMap(layout)) {
    return { altoMidi, tenorMidi };
  }
  const baseTenor = altoMidi - WYBLE_BB_INNER_BELOW_LEAD_SEMITONES;
  const smootherTenor = nearestOctaveToPrevious(baseTenor, previousTenorMidi ?? null);
  return {
    altoMidi,
    tenorMidi: snapSax(smootherTenor),
  };
}
