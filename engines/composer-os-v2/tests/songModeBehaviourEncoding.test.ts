/**
 * Prompt 6.5/7 — Song Mode behaviour metadata encoding + regressions
 */

import { runBigBandMode } from '../core/big-band/runBigBandMode';
import { runStringQuartetMode } from '../core/string-quartet/runStringQuartetMode';
import { runSongMode } from '../core/song-mode/runSongMode';

export function runSongModeBehaviourEncodingTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const base = runSongMode({ seed: 42_001, title: 'Behaviour A' });
  const bach = runSongMode({ seed: 42_001, title: 'Behaviour B', primarySongwriterStyle: 'bacharach' });
  out.push({
    ok:
      base.validation.valid &&
      bach.validation.valid &&
      base.manifestHints.songwritingFingerprint !== bach.manifestHints.songwritingFingerprint &&
      base.compiledSong.songwriting?.melodyBehaviour.phraseAsymmetryTendency !==
        bach.compiledSong.songwriting?.melodyBehaviour.phraseAsymmetryTendency,
    name: 'songwriter style materially affects planning metadata',
  });

  const overlay = runSongMode({
    seed: 42_002,
    title: 'Overlay',
    primarySongwriterStyle: 'beatles',
    authorOverlay: 'pat_pattison',
  });
  const noOverlay = runSongMode({ seed: 42_002, title: 'No Overlay', primarySongwriterStyle: 'beatles' });
  out.push({
    ok:
      overlay.validation.valid &&
      overlay.compiledSong.songwriting?.lyricProsody.stableUnstableTagging === true &&
      overlay.manifestHints.songwritingFingerprint !== noOverlay.manifestHints.songwritingFingerprint,
    name: 'author overlay materially affects lyric prosody metadata',
  });

  const nullStyle = runSongMode({ seed: 1, title: 'Null', primarySongwriterStyle: null });
  out.push({
    ok: !nullStyle.validation.valid && nullStyle.validation.errors.some((e) => e.includes('cannot be null')),
    name: 'negative: explicit null primary style fails validation',
  });

  const bb = runBigBandMode({ seed: 12 });
  const sq = runStringQuartetMode({ seed: 12 });
  out.push({
    ok: bb.validation.ok && sq.validation.ok,
    name: 'no regressions: Big Band + Quartet still validate',
  });

  return out;
}
