/**
 * Regression: written MusicXML bar math (parsed string), not only internal ScoreModel.
 * Progression: Am9 | C13 | Fmaj9 | B7alt | Em9 | G13 | Cmaj9 | F#7alt
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { validateWrittenMusicXmlComplete } from '../core/export/validateMusicXmlWrittenStrict';

const PROGRESSION = 'Am9 | C13 | Fmaj9 | B7alt | Em9 | G13 | Cmaj9 | F#7alt';

export function runMusicXmlWrittenBarRegressionTests(): { name: string; ok: boolean }[] {
  const tests: { name: string; ok: boolean }[] = [];

  tests.push({
    name: 'Written XML validateWrittenMusicXmlComplete (linear + per-voice + parity) — 8-bar progression',
    ok: (() => {
      const r = runGoldenPath(90001, {
        chordProgressionText: PROGRESSION,
        harmonyMode: 'custom',
      });
      if (!r.success || !r.xml) return false;
      return validateWrittenMusicXmlComplete(r.score, r.xml).valid;
    })(),
  });

  tests.push({
    name: 'Golden path exportRoundTrip passes strict written validation for same progression',
    ok: (() => {
      const r = runGoldenPath(90002, {
        chordProgressionText: PROGRESSION,
        harmonyMode: 'custom',
      });
      return r.success && r.exportRoundTripPassed;
    })(),
  });

  return tests;
}
