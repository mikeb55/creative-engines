/**
 * Motif plus — extract + library.
 */

import { extractMotifAssetsFromBaseMotifs, motifAssetFromBaseMotif } from '../core/motif-plus/motifExtractor';
import { motifLibraryClear, motifLibraryGet, motifLibraryPut } from '../core/motif-plus/motifLibrary';

export function runMotifExtractorPlusTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const base = {
    id: 'm1',
    notes: [
      { pitch: 60, startBeat: 0, duration: 1 },
      { pitch: 64, startBeat: 1, duration: 1 },
    ],
    barCount: 1,
  };
  const a = motifAssetFromBaseMotif(base, 'generated');
  out.push({
    ok: a.intervalContour.length === 1 && a.rhythmPattern.durations.length === 2,
    name: 'motif extractor builds contour and rhythm',
  });

  const list = extractMotifAssetsFromBaseMotifs([base]);
  out.push({
    ok: list.length === 1 && list[0].id === 'm1',
    name: 'extractMotifAssetsFromBaseMotifs lists assets',
  });

  motifLibraryClear();
  motifLibraryPut(a);
  out.push({
    ok: motifLibraryGet('m1')?.id === 'm1',
    name: 'motif library stores by id',
  });

  out.push({
    ok: motifLibraryGet('missing_xyz') === undefined,
    name: 'negative: missing motif asset id',
  });

  return out;
}
