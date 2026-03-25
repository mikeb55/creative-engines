/**
 * Motif reuse planner.
 */

import { motifAssetFromBaseMotif } from '../core/motif-plus/motifExtractor';
import { planMotifReuse } from '../core/motif-plus/motifReusePlanner';

export function runMotifReusePlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const asset = motifAssetFromBaseMotif(
    {
      id: 'reuse1',
      notes: [{ pitch: 60, startBeat: 0, duration: 1 }],
      barCount: 1,
    },
    'internal'
  );

  const song = planMotifReuse(asset, 'song_mode');
  const bb = planMotifReuse(asset, 'big_band');
  out.push({
    ok: song.some((s) => s.role === 'hook') && bb.some((s) => s.role === 'riff_seed'),
    name: 'reuse planner returns mode-specific roles',
  });

  return out;
}
