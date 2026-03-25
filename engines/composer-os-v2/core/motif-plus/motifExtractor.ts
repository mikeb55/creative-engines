/**
 * Extract motif assets from internal motif structures.
 */

import type { BaseMotif, MotifNote } from '../motif/motifTypes';
import type { MotifAsset, MotifRhythmPattern } from './motifAssetTypes';

function contourFromNotes(notes: MotifNote[]): number[] {
  if (notes.length === 0) return [];
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  const out: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    out.push(sorted[i].pitch - sorted[i - 1].pitch);
  }
  return out;
}

function rhythmFromNotes(notes: MotifNote[]): MotifRhythmPattern {
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  const durations = sorted.map((n) => n.duration);
  return { durations };
}

export function motifAssetFromBaseMotif(m: BaseMotif, source: MotifAsset['source'] = 'internal'): MotifAsset {
  return {
    id: m.id,
    source,
    intervalContour: contourFromNotes(m.notes),
    rhythmPattern: rhythmFromNotes(m.notes),
    repetitionProfile: m.notes.length >= 4 ? 'medium' : 'low',
    sectionPlacement: [],
    barCount: m.barCount,
  };
}

export function extractMotifAssetsFromBaseMotifs(motifs: BaseMotif[], source: MotifAsset['source'] = 'generated'): MotifAsset[] {
  return motifs.map((m) => motifAssetFromBaseMotif(m, source));
}
