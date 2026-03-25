/**
 * ECM Chamber texture roles per bar — space-first, staggered activity, anti–constant duo density.
 * Consumed by generateGoldenPathDuoScore for Metheny / Schneider shaping (not MusicXML structure).
 */

import type { EcmChamberMode } from './ecmChamberTypes';

export type EcmTextureRole =
  | 'lead'
  | 'shadow'
  | 'sustain_pad'
  | 'inner_motion'
  | 'silence';

export interface EcmBarTexture {
  bar: number;
  guitarRole: EcmTextureRole;
  bassRole: EcmTextureRole;
}

function hash01(seed: number, bar: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + bar * 78.233 + salt * 43.758) * 43758.5453;
  return x - Math.floor(x);
}

/** Plan one texture row per bar for the full ECM form. */
export function planEcmTextureBars(
  totalBars: number,
  mode: EcmChamberMode,
  seed: number
): EcmBarTexture[] {
  const out: EcmBarTexture[] = [];
  for (let b = 1; b <= totalBars; b++) {
    const phase = ((b - 1) % 8) + 1;
    const h = hash01(seed, b, 1);
    const h2 = hash01(seed, b, 2);

    if (mode === 'ECM_METHENY_QUARTET') {
      let g: EcmTextureRole = 'lead';
      let bass: EcmTextureRole = 'sustain_pad';
      if (phase <= 2) {
        g = h < 0.35 ? 'silence' : 'lead';
        bass = 'sustain_pad';
      } else if (phase === 4 || phase === 8) {
        g = 'lead';
        bass = h2 < 0.45 ? 'shadow' : 'sustain_pad';
      } else if (phase >= 5 && phase <= 7) {
        g = h < 0.4 ? 'shadow' : 'lead';
        bass = 'sustain_pad';
      } else {
        g = 'inner_motion';
        bass = 'sustain_pad';
      }
      if (h < 0.12 && phase !== 4) g = 'silence';
      out.push({ bar: b, guitarRole: g, bassRole: bass });
      continue;
    }

    // Schneider: waves — sparse / layered / thinning
    const wave = b <= 8 ? 0 : b <= 16 ? 1 : 2;
    let g: EcmTextureRole = 'lead';
    let bass: EcmTextureRole = 'inner_motion';
    if (wave === 0) {
      g = h < 0.45 ? 'shadow' : 'lead';
      bass = h2 < 0.5 ? 'sustain_pad' : 'inner_motion';
    } else if (wave === 1) {
      g = h < 0.35 ? 'sustain_pad' : 'lead';
      bass = h2 < 0.4 ? 'lead' : 'inner_motion';
    } else {
      g = h < 0.4 ? 'silence' : 'shadow';
      bass = 'sustain_pad';
    }
    out.push({ bar: b, guitarRole: g, bassRole: bass });
  }
  return out;
}
