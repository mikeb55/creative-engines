/**
 * Read `songModeSectionShapingDiagnostics` from Song Mode run manifests (eval / batch A/B only).
 * Tolerates missing or partial payloads — never throws from manifest shape alone.
 */

import type { SongModeReturnVariationType } from '../../core/song-mode/songModeSectionTypes';

const RETURN_VARIATION_TYPES: readonly SongModeReturnVariationType[] = [
  'none',
  'lighter_texture',
  'harmonic_recolour',
  'delayed_reentry',
  'evolved_comp',
];

function isReturnVariationType(s: string): s is SongModeReturnVariationType {
  return (RETURN_VARIATION_TYPES as readonly string[]).includes(s);
}

/** Flat snapshot for CSV / scoring (null = absent or unparsable). */
export interface SongModeSectionShapingDiagnosticsEvalSnapshot {
  densityDeltaBMinusA: number | null;
  colourDeltaBMinusA: number | null;
  openingVsReturnDelta: number | null;
  returnVariationType: SongModeReturnVariationType | null;
  returnVariationSummary: string | null;
  contributingSliceCount: number | null;
  totalBars: number | null;
  version: number | null;
}

function nullSnapshot(): SongModeSectionShapingDiagnosticsEvalSnapshot {
  return {
    densityDeltaBMinusA: null,
    colourDeltaBMinusA: null,
    openingVsReturnDelta: null,
    returnVariationType: null,
    returnVariationSummary: null,
    contributingSliceCount: null,
    totalBars: null,
    version: null,
  };
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  return null;
}

function strOrNull(v: unknown): string | null {
  if (typeof v === 'string') return v;
  return null;
}

/**
 * Extract section-shaping diagnostics from an already-parsed manifest root object.
 */
export function readSongModeSectionShapingDiagnosticsFromManifestRoot(
  j: Record<string, unknown>
): SongModeSectionShapingDiagnosticsEvalSnapshot {
  try {
    const raw = j.songModeSectionShapingDiagnostics;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return nullSnapshot();
    }
    const o = raw as Record<string, unknown>;
    const contributing = o.contributingSlices;
    const contributingSliceCount = Array.isArray(contributing)
      ? contributing.filter((x): x is string => typeof x === 'string').length
      : null;

    const rtRaw = o.returnVariationType;
    const returnVariationType =
      typeof rtRaw === 'string' && isReturnVariationType(rtRaw) ? rtRaw : null;

    return {
      densityDeltaBMinusA: numOrNull(o.densityDeltaBMinusA),
      colourDeltaBMinusA: numOrNull(o.colourDeltaBMinusA),
      openingVsReturnDelta: numOrNull(o.openingVsReturnDelta),
      returnVariationType,
      returnVariationSummary: strOrNull(o.returnVariationSummary),
      contributingSliceCount,
      totalBars: numOrNull(o.totalBars),
      version: numOrNull(o.version),
    };
  } catch {
    return nullSnapshot();
  }
}

/** Parse JSON then read diagnostics; invalid JSON → all nulls. */
export function readSongModeSectionShapingDiagnosticsFromManifestJson(
  raw: string
): SongModeSectionShapingDiagnosticsEvalSnapshot {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    return readSongModeSectionShapingDiagnosticsFromManifestRoot(j);
  } catch {
    return nullSnapshot();
  }
}
