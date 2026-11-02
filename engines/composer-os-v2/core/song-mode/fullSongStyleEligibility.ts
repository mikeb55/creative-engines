/**
 * Truthful full-song style eligibility.
 * Native Mosaic dispatch (SLICE_ROWS) only — stand-in DISPATCH_STUB_ALIASES rejected.
 * Library-only / unwired profiles stay available for non-full-song features.
 */

import composerCoverageManifest from '../../../../composerCoverageManifest.json';
import {
  DISPATCH_STUB_ALIASES,
  DISPATCH_STUB_ALIAS_IDS,
} from '../mosaic-mode/mosaicDispatchStubAliases';
import { DUO_COMPOSER_ROSTER_IDS } from '../mosaic-mode/mosaicComposerSliceRows';
import { normalizeSongwriterStyleKey } from './songwriterStyleProfiles';

type ManifestComposer = {
  id: string;
  wired?: boolean;
  shipped?: boolean;
  sliceFile?: string | null;
  status?: string | null;
};

const NATIVE_MOSAIC_IDS: ReadonlySet<string> = new Set(DUO_COMPOSER_ROSTER_IDS);

const MANIFEST_BY_ID = new Map<string, ManifestComposer>(
  ((composerCoverageManifest as { composers?: ManifestComposer[] }).composers ?? [])
    .filter((c) => typeof c?.id === 'string' && c.id.length > 0)
    .map((c) => [c.id, c] as const)
);

/** Example native ids for actionable errors (stable order from roster). */
const EXAMPLE_NATIVE_STYLES = DUO_COMPOSER_ROSTER_IDS.filter((id) =>
  ['beatles', 'radiohead', 'brian_wilson', 'stevie_wonder', 'joni_mitchell'].includes(id)
).slice(0, 5);

export type FullSongStyleEligibility = {
  eligible: boolean;
  /** Canonical songwriter id after alias normalize (or trimmed input). */
  styleId: string;
  reason?: string;
};

/**
 * Resolve raw API style to a canonical id for eligibility checks.
 * Soft songwriter aliases (e.g. miles → miles_davis) normalize; unknown raw kept trimmed.
 */
export function resolveFullSongStyleId(raw: string | undefined | null): string {
  if (raw == null) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  return normalizeSongwriterStyleKey(trimmed) ?? trimmed.toLowerCase();
}

/**
 * Native Mosaic full-song styles — SLICE_ROWS ids only (excludes stand-in stubs).
 * Coverage `wired` + `sliceFile` confirm when present; missing manifest rows still pass if native.
 */
export function listFullSongSupportedStyleIds(): readonly string[] {
  return DUO_COMPOSER_ROSTER_IDS.filter((id) => {
    if (DISPATCH_STUB_ALIAS_IDS.has(id)) return false;
    const row = MANIFEST_BY_ID.get(id);
    if (!row) return true;
    // Reliable reject: explicitly unwired with no slice — should not happen for roster ids.
    if (row.wired === false && !row.sliceFile) return false;
    return true;
  });
}

export function isFullSongStyleEligible(raw: string | undefined | null): boolean {
  return evaluateFullSongStyleEligibility(raw).eligible;
}

export function evaluateFullSongStyleEligibility(
  raw: string | undefined | null
): FullSongStyleEligibility {
  const styleId = resolveFullSongStyleId(raw);
  if (!styleId) {
    return { eligible: false, styleId: '', reason: 'empty style id' };
  }

  if (DISPATCH_STUB_ALIAS_IDS.has(styleId)) {
    const standIn = DISPATCH_STUB_ALIASES[styleId];
    return {
      eligible: false,
      styleId,
      reason: `stand-in Mosaic dispatch only (maps to "${standIn}"); not native full-song`,
    };
  }

  if (!NATIVE_MOSAIC_IDS.has(styleId)) {
    const row = MANIFEST_BY_ID.get(styleId);
    const status = row?.status?.trim();
    const cover =
      status && status.length > 0
        ? `coverage status "${status}"`
        : 'no native Mosaic SLICE_ROWS entry';
    return {
      eligible: false,
      styleId,
      reason: `${cover}; library/other features unchanged`,
    };
  }

  const row = MANIFEST_BY_ID.get(styleId);
  if (row && row.wired === false && !row.sliceFile) {
    return {
      eligible: false,
      styleId,
      reason: 'coverage marks unwired with no sliceFile',
    };
  }

  return { eligible: true, styleId };
}

/**
 * Throw before Song Mode / golden-path work when style lacks native Mosaic dispatch.
 */
export function assertFullSongStyleEligible(raw: string | undefined | null): string {
  const result = evaluateFullSongStyleEligibility(raw);
  if (result.eligible) return result.styleId;

  const examples =
    EXAMPLE_NATIVE_STYLES.length > 0
      ? EXAMPLE_NATIVE_STYLES.join(', ')
      : DUO_COMPOSER_ROSTER_IDS.slice(0, 5).join(', ');
  const supported = listFullSongSupportedStyleIds().length;
  const detail = result.reason ? ` — ${result.reason}` : '';
  const label = result.styleId || String(raw ?? '').trim() || '(empty)';

  throw new Error(
    `generateFullSongMusicXml: unsupported primarySongwriterStyle "${label}"${detail}. ` +
      `Full-song requires native Mosaic dispatch (${supported} supported; e.g. ${examples}). ` +
      `Pick a supported style, or use this profile outside full-song generation.`
  );
}
