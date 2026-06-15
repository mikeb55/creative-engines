/**
 * Composer display names — single runtime source: composerCoverageManifest.json
 * (built from SONGWRITER_OPTIONS labels via npm run composer:manifest).
 */

import composerCoverageManifest from '../../../composerCoverageManifest.json';
import { normalizeSongwriterStyleKey } from '../core/song-mode/songwriterStyleProfiles';

type ManifestComposer = { id: string; displayName?: string };

const DISPLAY_NAME_BY_ID = new Map<string, string>(
  (composerCoverageManifest.composers as ManifestComposer[])
    .filter((c) => typeof c.id === 'string' && c.id.length > 0)
    .map((c) => [c.id, (c.displayName ?? '').trim()] as const)
    .filter(([, name]) => name.length > 0)
);

/** Title-case fallback when manifest has no label (e.g. sonic_youth → Sonic Youth). */
export function snakeCaseIdToDisplayName(id: string): string {
  return id
    .split('_')
    .filter(Boolean)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/**
 * Resolve a songwriter id (or alias) to a human display name.
 * Manifest label wins; otherwise cleaned id; empty input → "Composer OS".
 */
export function resolveComposerDisplayName(rawId: string | undefined | null): string {
  const trimmed = typeof rawId === 'string' ? rawId.trim().toLowerCase() : '';
  if (!trimmed) return 'Composer OS';
  const canonical = normalizeSongwriterStyleKey(trimmed) ?? trimmed;
  const fromManifest = DISPLAY_NAME_BY_ID.get(canonical);
  if (fromManifest) return fromManifest;
  return snakeCaseIdToDisplayName(canonical);
}
