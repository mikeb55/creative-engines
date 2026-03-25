/**
 * Lightweight reuse suggestions from a motif asset (no search).
 */

import type { MotifAsset, MotifReuseSuggestion, MotifReuseTargetMode } from './motifAssetTypes';

export function planMotifReuse(
  asset: MotifAsset,
  targetMode: MotifReuseTargetMode
): MotifReuseSuggestion[] {
  const out: MotifReuseSuggestion[] = [];
  if (targetMode === 'song_mode') {
    out.push({
      assetId: asset.id,
      targetMode,
      role: 'hook',
      note: 'Reuse contour as hook variant — keep rhythm profile',
    });
  }
  if (targetMode === 'ecm_chamber') {
    out.push({
      assetId: asset.id,
      targetMode,
      role: 'development',
      note: 'Develop intervals across sections — preserve rhythmic cell',
    });
  }
  if (targetMode === 'big_band') {
    out.push({
      assetId: asset.id,
      targetMode,
      role: 'riff_seed',
      note: 'Soli / shout seed from rhythmic shell',
    });
  }
  if (targetMode === 'string_quartet') {
    out.push({
      assetId: asset.id,
      targetMode,
      role: 'quartet_variation',
      note: 'Quartet variation — stagger entries on contour',
    });
  }
  if (targetMode === 'guitar_bass_duo') {
    out.push({
      assetId: asset.id,
      targetMode,
      role: 'development',
      note: 'Comping anchor from motif rhythm',
    });
  }
  return out;
}
