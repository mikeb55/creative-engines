/**
 * Smoke — Billy Strayhorn chromatic song-form slice (golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBillyStrayhornSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50202, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'billy_strayhorn',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.billyStrayhornDiagnostics;
  const receipt = md?.billyStrayhornSliceReceipt ?? '';
  const eff = md?.billyStrayhornEffectiveHarmonyBars;
  const devices = md?.billyStrayhornDeviceReceipts ?? [];
  const hasBsReceipt = devices.some((d) => d.startsWith('bs:'));

  const rootOf = (symbol: string): string => {
    const hp = symbol.split('/')[0] ?? symbol;
    return hp.match(/^([A-G](?:#|b)?)/)?.[1] ?? '';
  };
  const pcOf = (name: string): number => {
    const map: Record<string, number> = {
      C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
      G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
    };
    return map[name] ?? -1;
  };
  const fourthOrFifth = (left: string, right: string): boolean => {
    const d = (pcOf(rootOf(right)) - pcOf(rootOf(left)) + 12) % 12;
    return d === 5 || d === 7;
  };
  const minorSeventh = (symbol: string): boolean =>
    /min7|min9|min11|m7|m9|m11/i.test(symbol) && !/maj|m6|dim/i.test(symbol);
  const dominant = (symbol: string): boolean =>
    /^[A-G](?:#|b)?(?:7|9|13)(?!sus)/.test(symbol.split('/')[0] ?? '') && !/maj/i.test(symbol);
  const major = (symbol: string): boolean => /maj|Δ/i.test(symbol) && !/min|m7|m9/i.test(symbol);
  let residualIiVi = 0;
  if (Array.isArray(eff)) {
    for (let i = 0; i <= eff.length - 3; i++) {
      const a = eff[i] ?? '';
      const b = eff[i + 1] ?? '';
      const c = eff[i + 2] ?? '';
      if (minorSeventh(a) && dominant(b) && major(c) && fourthOrFifth(a, b) && fourthOrFifth(b, c)) {
        residualIiVi++;
      }
    }
  }
  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'billy_strayhorn' &&
      diag?.songwriterId === 'billy_strayhorn' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Billy Strayhorn (chromatic song slice)') &&
      hasBsReceipt &&
      devices.some((d) => d.startsWith('bs:iiVI_defused@')) &&
      residualIiVi === 0,
    name: 'Billy Strayhorn slice: golden path + chromatic song diagnostics receipt',
  });

  const locked = Array.from({ length: 32 }, (_, i) =>
    i % 4 === 1 ? 'Dm7' : i % 4 === 2 ? 'G7' : 'Cmaj7'
  );
  const lockedRun = runGoldenPathOnce(76017, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'billy_strayhorn',
    harmonyMode: 'custom_locked',
    chordProgressionText: locked.join('|'),
    lockedHarmonyBarsRaw: locked,
  });
  const lockedEff = lockedRun.context?.generationMetadata?.billyStrayhornEffectiveHarmonyBars ?? [];
  out.push({
    ok:
      lockedEff.length === 32 &&
      lockedEff.every((symbol, i) => symbol === locked[i]) &&
      (lockedRun.context?.generationMetadata?.billyStrayhornDeviceReceipts ?? []).includes('bs:locked_authority'),
    name: 'Billy Strayhorn slice: locked harmony stays on the source roots',
  });

  return out;
}
