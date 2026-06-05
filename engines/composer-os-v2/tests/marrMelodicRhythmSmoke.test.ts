/**
 * Smoke — Johnny Marr melodic rhythm guitar songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  addNoteHarmonyRate,
  fullBarreBlockRate,
  openStringResonanceRate,
  partialVoicingRateFromBars,
} from '../core/song-mode/marrMelodicSlice';
import { evaluateMarrHardFails } from '../core/evaluation/marrStyleProfile';

export function runMarrMelodicRhythmSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(55001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'marr',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.marrDiagnostics;
  const receipt = md?.marrSliceReceipt ?? '';
  const eff = md?.marrEffectiveHarmonyBars;
  const devices = md?.marrDeviceReceipts ?? [];
  const params = md?.marrSliceParams;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'marr' &&
      diag?.songwriterId === 'marr' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Johnny Marr (melodic rhythm guitar slice)') &&
      devices.some((d) => d.startsWith('jma:')),
    name: 'Marr slice: golden path + melodic-rhythm diagnostics receipt',
  });

  out.push({
    ok:
      (params?.partialVoicingRate ?? 0) >= 0.85 &&
      devices.some((d) => d.startsWith('jma:partial_voicing@')) &&
      (diag?.partialVoicingRate ?? 0) >= 0.75,
    name: 'Marr slice: partialVoicingRate fires (jma:partial_voicing receipts)',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('jma:top_note_melody@')) &&
      (diag?.topNoteMelody ?? 0) >= 0.72 &&
      partialVoicingRateFromBars(eff ?? []) >= 0.55,
    name: 'Marr slice: topNoteMelody — upper voice contour active across bars',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('jma:open_string@')) &&
      (diag?.openStringResonance ?? 0) >= 0.68 &&
      openStringResonanceRate(eff ?? []) >= 0.15,
    name: 'Marr slice: openStringResonance receipts present',
  });

  out.push({
    ok:
      addNoteHarmonyRate(eff ?? []) >= 0.45 &&
      devices.some((d) => d.startsWith('jma:add_note_harm@')) &&
      (diag?.addNoteHarmony ?? 0) >= 0.7,
    name: 'Marr slice: addNoteHarmony — add9/sus2/maj7/6 surface dominant',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('jma:pendulum_sub@')) &&
      (diag?.pendulumSubdivision ?? 0) >= 0.65,
    name: 'Marr slice: pendulumSubdivision — 16th-note motion present',
  });

  out.push({
    ok: fullBarreBlockRate(eff ?? []) <= 0.25,
    name: 'Marr slice: no full barre block strumming dominant',
  });

  out.push({
    ok: (diag?.negEdgeTouches ?? 0) <= 4,
    name: 'Marr slice: no delay-grid atmosphere dominant',
  });

  const hardFails = evaluateMarrHardFails({}, {
    partialVoicingRate: diag?.partialVoicingRate,
    topNoteMelody: diag?.topNoteMelody,
    openStringResonance: diag?.openStringResonance,
    addNoteHarmony: diag?.addNoteHarmony,
    pendulumSubdivision: diag?.pendulumSubdivision,
    modalAmbiguity: diag?.modalAmbiguity,
  });
  out.push({
    ok:
      (diag?.partialVoicingRate ?? 0) >= 0.75 &&
      (diag?.topNoteMelody ?? 0) >= 0.72 &&
      (diag?.openStringResonance ?? 0) >= 0.68 &&
      (diag?.addNoteHarmony ?? 0) >= 0.7 &&
      (diag?.pendulumSubdivision ?? 0) >= 0.65 &&
      (diag?.modalAmbiguity ?? 0) >= 0.62 &&
      !hardFails.includes('partial_voicing_fail') &&
      !hardFails.includes('top_note_melody_fail'),
    name: 'Marr slice: style profile PASS thresholds',
  });

  return out;
}

if (require.main === module) {
  const results = runMarrMelodicRhythmSmokeTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
