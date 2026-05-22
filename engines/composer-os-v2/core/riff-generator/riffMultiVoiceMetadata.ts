/**
 * Assemble riff generationMetadata + UI bar indicators from multi-voice tracks.
 */

import type { RiffProfile } from '../composer/riffProfileTypes';
import type {
  FxMarkerTrack,
  GuitarRestWindow,
  HornStabTrack,
  RiffBarPartIndicator,
  RiffGenerationMetadata,
} from './riffMultiVoiceTypes';

export function buildRiffGenerationMetadata(input: {
  hornStabTrack?: HornStabTrack;
  fxMarkerTrack?: FxMarkerTrack;
  guitarRestWindows?: GuitarRestWindow[];
  profile?: RiffProfile;
  vrbId?: string;
  bars: number;
  hasBassPart: boolean;
  hasSoloPart?: boolean;
}): RiffGenerationMetadata {
  const { hornStabTrack, fxMarkerTrack, guitarRestWindows, profile, vrbId, bars, hasBassPart, hasSoloPart } =
    input;
  const horns = (hornStabTrack?.length ?? 0) > 0;
  const bassInterlock = !!profile?.bassContourPolicy || profile?.pedalRigid === true;
  const fxMarkers = (fxMarkerTrack?.length ?? 0) > 0;
  const showFx = fxMarkers && !!vrbId && /led_zeppelin|zeppelin|jimmy_page|page/.test(vrbId);
  const solo = !!hasSoloPart;

  const barPartIndicators: RiffBarPartIndicator[] = [];
  for (let b = 0; b < bars; b++) {
    const parts: RiffBarPartIndicator['parts'] = ['guitar'];
    if (horns && hornStabTrack?.some((e) => e.bar === b)) parts.push('horns');
    if (hasBassPart) parts.push('bass');
    if (solo) parts.push('solo');
    if (showFx && fxMarkerTrack?.some((m) => m.bar === b)) parts.push('fx');
    barPartIndicators.push({ bar: b, parts });
  }

  return {
    hornStabTrack,
    fxMarkerTrack: showFx ? fxMarkerTrack : undefined,
    guitarRestWindows,
    barPartIndicators,
    multiVoiceBadges: {
      horns,
      bassInterlock: bassInterlock && hasBassPart,
      fxMarkers: showFx,
      solo,
    },
  };
}
