/**

 * Smoke — Joni Mitchell modal open-tuning songwriter slice (chord vocabulary + golden path).

 */



import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';



export function runJoniMitchellSliceSmokeTests(): { name: string; ok: boolean }[] {

  const out: { name: string; ok: boolean }[] = [];



  const r = runGoldenPathOnce(50200, {

    presetId: 'guitar_bass_duo',

    totalBars: 32,

    longFormEnabled: true,

    songModeHookFirstIdentity: true,

    primarySongwriterStyle: 'joni_mitchell',

    joniPhase: 'folk_modal',

  });



  const md = r.context?.generationMetadata;

  const diag = md?.joniMitchellDiagnostics;

  const receipt = md?.joniMitchellSliceReceipt ?? '';

  const eff = md?.joniMitchellEffectiveHarmonyBars;



  out.push({

    ok:

      r.success &&

      md?.songwriterStyleId === 'joni_mitchell' &&

      md?.joniResolvedPhase === 'folk_modal' &&

      diag?.songwriterId === 'joni_mitchell' &&

      (diag?.barsConsidered ?? 0) >= 32 &&

      Array.isArray(eff) &&

      eff.length === 32 &&

      receipt.includes('Joni Mitchell (modal open-tuning slice)'),

    name: 'Joni Mitchell slice: golden path + modal open-tuning diagnostics receipt',

  });



  return out;

}

