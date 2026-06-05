/**
 * Smoke — Eberhard Weber bass-led harmonic field ECM songwriter slice.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countMajorTwoFiveOneChains,
  maxWeberPhraseArcLength,
} from '../core/song-mode/weberFieldSlice';

function tonicPcFromBars(bars: readonly string[] | undefined): number {
  if (!bars?.[0]) return 2;
  const hp = parseChordSymbol(bars[0]).harmonyPart;
  const m = hp.match(/^([A-G](?:#|b)?)/);
  if (!m?.[1]) return 2;
  return noteNameToPitchClass(m[1]) ?? 2;
}

export function runWeberFieldSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(88001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'eberhard_weber',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.eberhardWeberDiagnostics;
  const receipt = md?.eberhardWeberSliceReceipt ?? '';
  const eff = md?.eberhardWeberEffectiveHarmonyBars;
  const devices = md?.eberhardWeberDeviceReceipts ?? [];
  const plan = md?.eberhardWeberFieldPlan;
  const tonicPc = tonicPcFromBars(eff);

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'eberhard_weber' &&
      diag?.songwriterId === 'eberhard_weber' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Eberhard Weber (bass-led harmonic field slice)') &&
      devices.some((d) => d.startsWith('ew:')),
    name: 'Eberhard Weber slice: golden path + bass-led field diagnostics receipt',
  });

  out.push({
    ok: devices.some((d) => d.startsWith('ew:pedal@')) && (diag?.pedalTouches ?? 0) >= 8,
    name: 'Eberhard Weber slice: pedalPersistence fires (ew:pedal receipts)',
  });

  out.push({
    ok: eff != null && countMajorTwoFiveOneChains(eff, tonicPc) === 0,
    name: 'Eberhard Weber slice: no ii–V–I cadence chains',
  });

  out.push({
    ok: maxWeberPhraseArcLength(plan) > 4,
    name: 'Eberhard Weber slice: phrase arcs extend beyond 4 bars',
  });

  out.push({
    ok: devices.some((d) => d.startsWith('ew:bass_led@')) && devices.some((d) => d.startsWith('ew:upper_refresh@')),
    name: 'Eberhard Weber slice: bass-led + slow upper refresh receipts',
  });

  return out;
}
