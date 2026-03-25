/**
 * Prompt 6.5/7 — Author overlay resolver
 */

import { resolveAuthorOverlay } from '../core/song-mode/authorOverlayResolver';

export function runAuthorOverlayResolverTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const webb = resolveAuthorOverlay('jimmy_webb');
  const pat = resolveAuthorOverlay('pat_pattison');
  const jack = resolveAuthorOverlay('jack_perricone');
  out.push({
    ok:
      webb != null &&
      pat != null &&
      jack != null &&
      webb.melodyHarmonicCraftEmphasis > pat.melodyHarmonicCraftEmphasis &&
      pat.prosodyStructureEmphasis > webb.prosodyStructureEmphasis,
    name: 'author overlays differ in emphasis axes',
  });

  out.push({
    ok: resolveAuthorOverlay(null) === null && resolveAuthorOverlay(undefined) === null,
    name: 'null/undefined author returns null overlay',
  });

  return out;
}
