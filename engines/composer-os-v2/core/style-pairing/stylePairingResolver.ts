/**
 * Resolve songwriter + arranger styles into domain weights and confidence (no blocking).
 */

import type { BigBandComposerId, BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { StylePairingInput, StylePairingResult } from './stylePairingTypes';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Known arranger ids for era alignment heuristics. */
const ARRANGERS = new Set<string>(['ellington', 'basie', 'thad', 'schneider']);

function eraComposerAlignment(era: BigBandEraId | string | null | undefined, arranger: string): number {
  if (!era) return 0;
  const e = String(era);
  const a = arranger as BigBandComposerId;
  if (e === 'swing' && a === 'basie') return 0.08;
  if (e === 'bebop' && a === 'ellington') return 0.05;
  if (e === 'post_bop' && (a === 'thad' || a === 'ellington')) return 0.06;
  if (e === 'contemporary' && a === 'schneider') return 0.07;
  if (e === 'swing' && a === 'schneider') return -0.06;
  if (e === 'bebop' && a === 'basie') return -0.05;
  return 0;
}

function songwriterArrangerDistance(sw: string, ar: string): number {
  // Soft heuristics — large lyric narrative vs texture orchestral, etc.
  let d = 0;
  if (sw === 'bob_dylan' && ar === 'schneider') d += 0.14;
  if (sw === 'max_martin' && ar === 'ellington') d += 0.08;
  if (sw === 'paul_simon' && ar === 'thad') d -= 0.04;
  if (sw === 'beatles' && ar === 'ellington') d -= 0.03;
  return d;
}

export function resolveStylePairing(input: StylePairingInput): StylePairingResult {
  const sw = String(input.songwriterStyle);
  const ar = String(input.arrangerStyle);
  const era =
    input.era === undefined || input.era === null
      ? null
      : (input.era as BigBandEraId);

  const songwriterDomain = {
    melody: 0.32,
    harmony: 0.26,
    form: 0.24,
    lyricBehaviour: 0.18,
  };

  const arrangerDomain = {
    orchestration: 0.38,
    density: 0.36,
    sectionInteraction: 0.26,
  };

  let confidence = 0.68 + eraComposerAlignment(era ?? undefined, ar) - songwriterArrangerDistance(sw, ar) * 0.5;
  confidence = clamp01(confidence);

  const notes: string[] = [];
  if (!ARRANGERS.has(ar)) {
    notes.push('arranger style treated as opaque string id');
  }

  const experimentalFlag =
    confidence < 0.52 ||
    (sw === 'bob_dylan' && ar === 'schneider') ||
    (String(era) === 'swing' && sw === 'max_martin');

  if (experimentalFlag) {
    notes.push('experimental pairing — domains remain separated; no combination blocked');
  }

  return {
    songwriterStyle: sw,
    arrangerStyle: ar,
    era,
    songwriterDomain,
    arrangerDomain,
    confidenceScore: confidence,
    experimentalFlag,
    notes,
  };
}
