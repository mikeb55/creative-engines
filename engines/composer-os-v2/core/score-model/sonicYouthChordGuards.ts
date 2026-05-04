/**
 * Sonic Youth — type guards and preset helpers for ChordEvent extensions.
 *
 * PIPELINE: Call sites that branch on Sonic Youth should also verify songwriter/profile
 * (e.g. primary style id) so default duo / export paths ignore `sonicYouth` unless intended.
 */

import type { ChordEvent } from './scoreModelTypes';
import type { SonicYouthExtension, SYTextureState } from './sonicYouthChordTypes';

export { getSYDissonancePreset } from './sonicYouthChordTypes';

export function isSonicYouthEvent(
  event: ChordEvent
): event is ChordEvent & { sonicYouth: SonicYouthExtension } {
  return event.sonicYouth !== undefined && event.sonicYouth !== null;
}

export function getSYTextureState(event: ChordEvent): SYTextureState | undefined {
  return event.sonicYouth?.textureState;
}

