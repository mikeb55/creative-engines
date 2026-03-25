/**
 * ECM Chamber texture roles per bar — space-first, staggered activity, anti–constant duo density.
 * Layering: one voice sustains while the other fragments; occasional overlap; softened transitions.
 * Consumed by generateGoldenPathDuoScore for Metheny / Schneider shaping (not MusicXML structure).
 */

import type { EcmChamberMode } from './ecmChamberTypes';

export type EcmTextureRole =
  | 'lead'
  | 'shadow'
  | 'sustain_pad'
  | 'inner_motion'
  | 'silence';

export type EcmLayeringMode = 'balanced' | 'guitar_sustains' | 'bass_sustains';

export interface EcmBarTexture {
  bar: number;
  guitarRole: EcmTextureRole;
  bassRole: EcmTextureRole;
  /** True when both should sound together (controlled overlap). */
  overlapHint?: boolean;
  /** Who holds while the other moves. */
  layeringMode?: EcmLayeringMode;
  /** 0–1 Schneider density blend (smoothed across bars). */
  densityBlend?: number;
}

function hash01(seed: number, bar: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + bar * 78.233 + salt * 43.758) * 43758.5453;
  return x - Math.floor(x);
}

function smooth3(prev: number, cur: number, next: number): number {
  return 0.25 * prev + 0.5 * cur + 0.25 * next;
}

/** Plan one texture row per bar for the full ECM form. */
export function planEcmTextureBars(
  totalBars: number,
  mode: EcmChamberMode,
  seed: number
): EcmBarTexture[] {
  const raw: EcmBarTexture[] = [];
  for (let b = 1; b <= totalBars; b++) {
    const phase = ((b - 1) % 8) + 1;
    const h = hash01(seed, b, 1);
    const h2 = hash01(seed, b, 2);
    const h3 = hash01(seed, b, 3);

    if (mode === 'ECM_METHENY_QUARTET') {
      let g: EcmTextureRole = 'lead';
      let bass: EcmTextureRole = 'sustain_pad';
      let overlapHint = false;
      let layeringMode: EcmLayeringMode = 'balanced';

      if (phase <= 2) {
        g = h < 0.35 ? 'silence' : 'lead';
        bass = 'sustain_pad';
      } else if (phase === 4 || phase === 8) {
        g = 'lead';
        bass = h2 < 0.45 ? 'shadow' : 'sustain_pad';
      } else if (phase >= 5 && phase <= 7) {
        g = h < 0.38 ? 'shadow' : 'lead';
        bass = 'sustain_pad';
      } else {
        g = 'inner_motion';
        bass = 'sustain_pad';
      }

      if (h < 0.12 && phase !== 4) g = 'silence';

      // Arc: bars 3–5 sustain guitar harmony while bass anchors; 6–7 inner motion / contrary fragments
      if (phase >= 3 && phase <= 5) {
        g = h3 < 0.55 ? 'sustain_pad' : g === 'silence' ? 'shadow' : g;
        bass = h2 < 0.42 ? 'inner_motion' : 'sustain_pad';
        layeringMode = g === 'sustain_pad' && bass === 'inner_motion' ? 'guitar_sustains' : 'balanced';
      }
      if (phase === 6 || phase === 7) {
        bass = h2 < 0.48 ? 'inner_motion' : 'sustain_pad';
        g = h < 0.4 ? 'inner_motion' : 'sustain_pad';
        overlapHint = h3 > 0.62;
        layeringMode = g === 'sustain_pad' ? 'guitar_sustains' : 'bass_sustains';
      }
      if (phase === 8) {
        overlapHint = h3 > 0.55;
      }

      raw.push({
        bar: b,
        guitarRole: g,
        bassRole: bass,
        overlapHint,
        layeringMode,
        densityBlend: undefined,
      });
      continue;
    }

    // Schneider: waves — sparse / layered / thinning; A2 suspended (last third)
    const third = Math.max(1, Math.floor(totalBars / 3));
    const inA2 = b > 2 * third;
    const wave = b <= third ? 0 : b <= 2 * third ? 1 : 2;
    let g: EcmTextureRole = 'lead';
    let bass: EcmTextureRole = 'inner_motion';
    let overlapHint = false;
    let layeringMode: EcmLayeringMode = 'balanced';

    if (wave === 0) {
      g = h < 0.45 ? 'shadow' : 'lead';
      bass = h2 < 0.5 ? 'sustain_pad' : 'inner_motion';
      layeringMode = g === 'lead' && bass === 'sustain_pad' ? 'bass_sustains' : 'balanced';
    } else if (wave === 1) {
      g = h < 0.35 ? 'sustain_pad' : 'lead';
      bass = h2 < 0.4 ? 'lead' : 'inner_motion';
      overlapHint = h3 > 0.58;
      layeringMode = g === 'sustain_pad' ? 'guitar_sustains' : 'bass_sustains';
    } else {
      g = h < 0.45 ? 'silence' : 'shadow';
      bass = 'sustain_pad';
      if (inA2) {
        g = h < 0.5 ? 'sustain_pad' : 'shadow';
        bass = h2 < 0.55 ? 'inner_motion' : 'sustain_pad';
        layeringMode = 'guitar_sustains';
      }
      overlapHint = inA2 && h3 > 0.4;
    }
    const blend = wave * 0.35 + (h + h2) * 0.25;
    raw.push({
      bar: b,
      guitarRole: g,
      bassRole: bass,
      overlapHint,
      layeringMode,
      densityBlend: blend,
    });
  }

  // Soften density blend (no sharp jumps bar-to-bar)
  const blends = raw.map((r) => r.densityBlend ?? 0.5);
  for (let i = 0; i < raw.length; i++) {
    const prev = blends[i - 1] ?? blends[i];
    const cur = blends[i];
    const next = blends[i + 1] ?? blends[i];
    raw[i].densityBlend = smooth3(prev, cur, next);
  }

  return raw;
}
