/**
 * Vocal–guitar call-response rest windows from compiled {@link RiffProfile.spacePolicy}.
 */

import type { RiffProfile } from '../composer/riffProfileTypes';
import type { GuitarRestWindow } from './riffMultiVoiceTypes';

function patternImpliesCallResponse(pattern: string | undefined): boolean {
  if (!pattern) return false;
  const p = pattern.toLowerCase();
  return (
    p.includes('call') ||
    p.includes('vocal') ||
    p.includes('drop') ||
    p.includes('rest_window')
  );
}

function windowsForPattern(pattern: string, bars: number): GuitarRestWindow[] {
  const p = pattern.toLowerCase();
  const out: GuitarRestWindow[] = [];
  for (let b = 0; b < bars; b++) {
    if (p.includes('rest_window') || p.includes('higher')) {
      out.push({ bar: b, startBeat: 0, endBeat: 1, ghostOnly: true });
      continue;
    }
    out.push({ bar: b, startBeat: 0, endBeat: 2, ghostOnly: true });
  }
  return out;
}

/**
 * Per-bar guitar rest windows (full hits dropped; muted ghosts continue).
 */
export function computeGuitarRestWindows(
  profile: RiffProfile | undefined,
  bars: number,
  vrbId?: string
): GuitarRestWindow[] {
  const pattern = profile?.spacePolicy?.callResponsePattern;
  if (!patternImpliesCallResponse(pattern)) {
    if (vrbId === 'sly_stone' || vrbId === 'sly' || vrbId === 'family_stone') {
      return windowsForPattern('drop_full_hits_under_vocal', bars);
    }
    return [];
  }
  return windowsForPattern(pattern!, bars);
}

/** True when bar beat falls inside a rest window. */
export function isInGuitarRestWindow(
  windows: GuitarRestWindow[] | undefined,
  barIndex: number,
  startBeat: number
): boolean {
  if (!windows?.length) return false;
  for (const w of windows) {
    if (w.bar !== barIndex) continue;
    if (startBeat >= w.startBeat - 0.02 && startBeat < w.endBeat - 0.02) return true;
  }
  return false;
}
