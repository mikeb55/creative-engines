/**
 * Post-import performance shaping for LeadSheet melody events (MusicXML expression → playable lengths/velocities).
 * Keeps harmony/chord parsing unchanged; only adjusts imported melody note durations/velocities using parsed markings.
 */

import type { LeadSheet } from './leadSheetTypes';

/** Default blend: balance between engine-neutral defaults and imported markings (tunable via API `leadSheetPerformanceBlend`). */
export const DEFAULT_LEADSHEET_PERFORMANCE_BLEND = 0.55;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface LeadSheetPerformanceRenderingOpts {
  /** 0 = skip imported expression (leave durations/velocities as parsed); 1 = strongest musical pull from articulation/dynamic hints. */
  blendTowardImported?: number;
}

function cloneLeadSheet(s: LeadSheet): LeadSheet {
  return {
    ...s,
    sections: s.sections.map((x) => ({ ...x })),
    chordEvents: s.chordEvents.map((x) => ({ ...x })),
    melodyEvents: s.melodyEvents.map((x) => ({ ...x })),
    repeatMarkers: s.repeatMarkers.map((x) => ({ ...x })),
  };
}

/**
 * Applies duration/velocity shaping from imported articulations and per-note velocities.
 * Does not alter chord events, form, or bar counts.
 */
export function applyLeadSheetPerformanceRendering(
  sheet: LeadSheet,
  opts?: LeadSheetPerformanceRenderingOpts
): LeadSheet {
  const blend = clamp01(opts?.blendTowardImported ?? DEFAULT_LEADSHEET_PERFORMANCE_BLEND);
  const out = cloneLeadSheet(sheet);
  const maxBeatSpan = Math.max(1, out.timeSignature?.beats ?? 4);

  for (const ev of out.melodyEvents) {
    const baseVel = ev.velocityMidi ?? 74;
    let dur = ev.durationBeats;
    let vel = baseVel;

    const art = ev.articulationKind;
    if (art === 'staccato') {
      const staccTargetRatio = 0.5;
      const ratio = lerp(1, staccTargetRatio, blend);
      dur *= ratio;
    } else if (art === 'tenuto') {
      dur *= lerp(1, 1.1, blend);
    } else if (art === 'accent' || art === 'marcato') {
      vel = Math.round(lerp(vel, Math.min(127, vel + 16), blend));
    }

    dur = Math.min(dur, maxBeatSpan * 1.2);
    dur = Math.max(dur, 1 / 32);

    ev.durationBeats = dur;
    ev.velocityMidi = vel;
  }

  return out;
}
