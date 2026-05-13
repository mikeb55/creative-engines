/**
 * Smoke — Wayne Shorter post-bop songwriter slice (chord vocabulary + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runWayneShorterSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50200, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'wayne_shorter',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.wayneShorterDiagnostics;
  const receipt = md?.wayneShorterSliceReceipt ?? '';
  const eff = md?.wayneShorterEffectiveHarmonyBars;
  const harmFp = md?.wayneShorterHarmFingerprintReceipts;
  const melFp = md?.wayneShorterMelFingerprintReceipts;
  const rhythmFp = md?.wayneShorterRhythmFingerprintReceipts;
  const formFp = md?.wayneShorterFormFingerprintReceipts;
  const fpFp = md?.wayneShorterFpFingerprintReceipts;
  const harmG = md?.wayneShorterHarmonicGrammarReceipts;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'wayne_shorter' &&
      diag?.songwriterId === 'wayne_shorter' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Wayne Shorter (post-bop slice)') &&
      Array.isArray(harmFp) &&
      harmFp.length === 6 &&
      harmFp[0]!.startsWith('WS_HARM_01') &&
      harmFp[5]!.startsWith('WS_HARM_06') &&
      harmFp[4]!.includes('ws:wedge') &&
      Array.isArray(melFp) &&
      melFp.length === 4 &&
      melFp[0]!.startsWith('WS_MEL_01') &&
      melFp[3]!.startsWith('WS_MEL_04') &&
      Array.isArray(rhythmFp) &&
      rhythmFp.length === 3 &&
      rhythmFp[0]!.startsWith('WS_RHYTHM_01') &&
      rhythmFp[2]!.startsWith('WS_RHYTHM_03') &&
      Array.isArray(formFp) &&
      formFp.length === 2 &&
      formFp[0]!.startsWith('WS_FORM_01') &&
      formFp[1]!.startsWith('WS_FORM_02') &&
      Array.isArray(fpFp) &&
      fpFp.length === 3 &&
      fpFp[0]!.startsWith('WS_FP_01') &&
      fpFp[2]!.startsWith('WS_FP_03') &&
      Array.isArray(harmG) &&
      harmG.length >= 1 &&
      (md.wayneShorterFingerprintReceipts === undefined || Array.isArray(md.wayneShorterFingerprintReceipts)),
    name: 'Wayne Shorter slice: golden path + post-bop diagnostics receipt',
  });

  return out;
}
