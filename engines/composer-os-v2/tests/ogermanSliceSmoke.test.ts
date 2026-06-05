/**
 * Smoke — Claus Ogerman orchestral continuum songwriter slice.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countDominantTonicPairs,
  countMajorTwoFiveOneChains,
  harmonicSuspensionReceiptCount,
  hasInnerVoiceMotion,
  hasOrchestralRotation,
  hasStringContinuumLayers,
} from '../core/song-mode/clausOgermanSlice';

function tonicPcFromBars(bars: readonly string[] | undefined): number {
  if (!bars?.[0]) return 0;
  const hp = parseChordSymbol(bars[0]).harmonyPart;
  const m = hp.match(/^([A-G](?:#|b)?)/);
  if (!m?.[1]) return 0;
  return noteNameToPitchClass(m[1]) ?? 0;
}

export function runOgermanSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(91001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'claus_ogerman',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.clausOgermanDiagnostics;
  const receipt = md?.clausOgermanSliceReceipt ?? '';
  const eff = md?.clausOgermanEffectiveHarmonyBars;
  const devices = md?.clausOgermanDeviceReceipts ?? [];
  const tonicPc = tonicPcFromBars(eff);
  const suspensionCount = harmonicSuspensionReceiptCount(devices);
  const minSuspension = Math.floor(32 * 0.68 * 0.5);

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'claus_ogerman' &&
      diag?.songwriterId === 'claus_ogerman' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Claus Ogerman (orchestral continuum slice)') &&
      devices.some((d) => d.startsWith('co:')),
    name: 'Claus Ogerman slice: golden path + continuum diagnostics receipt',
  });

  out.push({
    ok: suspensionCount >= minSuspension && (diag?.suspensionTouches ?? 0) >= minSuspension,
    name: 'Claus Ogerman slice: harmonicSuspension fires (co:harmonic_suspension receipts)',
  });

  out.push({
    ok:
      eff != null &&
      countMajorTwoFiveOneChains(eff, tonicPc) === 0 &&
      countDominantTonicPairs(eff, tonicPc) === 0,
    name: 'Claus Ogerman slice: no V–I / ii–V–I cadence chains as primary resolution',
  });

  out.push({
    ok: hasInnerVoiceMotion(devices) && (diag?.innerVoiceTouches ?? 0) >= 8,
    name: 'Claus Ogerman slice: inner voice motion present',
  });

  out.push({
    ok: hasStringContinuumLayers(devices) && (diag?.stringLayerTouches ?? 0) >= 8,
    name: 'Claus Ogerman slice: string continuum layers present',
  });

  out.push({
    ok: hasOrchestralRotation(devices) && (diag?.orchestralModeTouches ?? 0) >= 8,
    name: 'Claus Ogerman slice: orchestral veil/echo/commentary rotation present',
  });

  return out;
}
