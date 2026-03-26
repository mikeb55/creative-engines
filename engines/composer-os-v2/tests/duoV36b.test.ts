/**
 * V3.6b — Duo custom-run labeling + exact bar math / Sibelius-safe exports.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import { validateExportedMusicXmlBarMath } from '../core/export/validateMusicXmlBarMath';
import { BEATS_PER_MEASURE } from '../core/score-model/scoreModelTypes';
import { validateBarryHarrisConformance } from '../core/style-modules/barry-harris/moduleValidation';

const CUSTOM_8 = 'Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt';

export function runDuoV36bTests(): { name: string; ok: boolean }[] {
  const tests: { name: string; ok: boolean }[] = [];

  tests.push({
    name: 'V3.6b custom harmony receipt: harmonySource + styleGrammar + explicit primary flag',
    ok: (() => {
      const r = runGoldenPath(43, {
        chordProgressionText: CUSTOM_8,
        harmonyMode: 'custom',
      });
      if (!r.success) return false;
      const m = r.context.generationMetadata;
      return (
        m.harmonySource === 'custom' &&
        m.harmonySourceUsed === 'custom' &&
        !!m.styleGrammarLabel?.includes('Barry Harris') &&
        !!m.styleGrammarLabel?.includes('Duo') &&
        m.userExplicitPrimaryStyle === false &&
        m.styleStackPrimaryModuleId === 'barry_harris' &&
        Array.isArray(m.userSelectedStyleDisplayNames) &&
        m.userSelectedStyleDisplayNames.length >= 1
      );
    })(),
  });

  tests.push({
    name: 'V3.6b run manifest echoes style grammar + harmony source',
    ok: (() => {
      const r = runGoldenPath(43, {
        chordProgressionText: CUSTOM_8,
        harmonyMode: 'custom',
      });
      if (!r.success) return false;
      const man = r.runManifest;
      return (
        man.harmonySourceUsed === 'custom' &&
        !!man.styleGrammarLabel?.includes('Duo') &&
        man.styleStackPrimaryModuleId === 'barry_harris' &&
        man.userExplicitPrimaryStyle === false
      );
    })(),
  });

  tests.push({
    name: 'V3.6b strict bar math on every duo measure (custom chords)',
    ok: (() => {
      const r = runGoldenPath(43, { chordProgressionText: CUSTOM_8, harmonyMode: 'custom' });
      return r.success && validateStrictBarMath(r.score).valid;
    })(),
  });

  tests.push({
    name: 'V3.6b exported MusicXML bar math (voice sums)',
    ok: (() => {
      const r = runGoldenPath(43, { chordProgressionText: CUSTOM_8, harmonyMode: 'custom' });
      if (!r.success || !r.xml) return false;
      return validateExportedMusicXmlBarMath(r.xml).valid;
    })(),
  });

  tests.push({
    name: 'V3.6b bass bar 2 duration sum equals 4 beats',
    ok: (() => {
      const r = runGoldenPath(43, { chordProgressionText: CUSTOM_8, harmonyMode: 'custom' });
      if (!r.success) return false;
      const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
      const m2 = bass?.measures.find((m) => m.index === 2);
      if (!m2) return false;
      let sum = 0;
      for (const e of m2.events) {
        if (e.kind === 'note' || e.kind === 'rest') sum += e.duration;
      }
      return Math.abs(sum - BEATS_PER_MEASURE) < 1e-3;
    })(),
  });

  tests.push({
    name: 'V3.6b BH module validation strings are neutral (no Barry Harris name)',
    ok: (() => {
      const r = runGoldenPath(43, { chordProgressionText: CUSTOM_8, harmonyMode: 'custom' });
      if (!r.success) return false;
      const bh = validateBarryHarrisConformance(r.score);
      return !bh.errors.some((e) => e.includes('Barry Harris'));
    })(),
  });

  return tests;
}
