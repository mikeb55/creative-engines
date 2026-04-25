/**
 * Prompt 6.5/7 — Style resolution
 */

import { resolveSongwritingStyles } from '../core/song-mode/songwriterStyleResolver';

export function runSongwriterStyleResolverTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const a = resolveSongwritingStyles({ primary: 'beatles' });
  const b = resolveSongwritingStyles({ primary: 'bacharach' });
  out.push({
    ok:
      a.styleFingerprint !== b.styleFingerprint &&
      a.resolvedRuleIds.some((id) => id.startsWith('beatles.')) &&
      b.resolvedRuleIds.some((id) => id.startsWith('bacharach.')),
    name: 'style resolution changes fingerprint and rule ids',
  });

  const duo = resolveSongwritingStyles({ primary: 'max_martin', secondary: 'stevie_wonder' });
  out.push({
    ok: duo.secondaryId === 'stevie_wonder' && duo.blendedProfile.hookRepetitionBias > 0.5,
    name: 'secondary songwriter blends profile',
  });

  const withAuthor = resolveSongwritingStyles({ primary: 'beatles', authorOverlay: 'pat_pattison' });
  out.push({
    ok: withAuthor.authorOverlayId === 'pat_pattison' && withAuthor.resolvedRuleIds.some((id) => id.includes('pattison')),
    name: 'author overlay adds author rule ids',
  });

  return out;
}
