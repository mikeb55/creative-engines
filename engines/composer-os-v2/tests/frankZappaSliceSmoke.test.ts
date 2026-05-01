/**
 * Smoke — Frank Zappa songwriter slice (golden path + receipts).
 */

import { lockedHarmonyChordSymbolsEquivalent } from '../core/harmony/chordProgressionParser';
import { computeHarmonyChecksum } from '../core/harmony/harmonyContext';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { frankZappaIiViRollingTriplePresent } from '../core/song-mode/songModeBuilder';

export function runFrankZappaSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50200, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    /** Alias resolves to `frank_zappa` via `normalizeSongwriterStyleKey`. */
    primarySongwriterStyle: 'fz',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.frankZappaDiagnostics;
  const sliceReceipt = md?.frankZappaSliceReceipt ?? '';
  const eff = md?.frankZappaEffectiveHarmonyBars;
  const dev = md?.frankZappaDeviceReceipts ?? [];

  const fzDeviceReceiptOk = dev.some((x) => /^fz:d[1-5]:/.test(x));

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'frank_zappa' &&
      diag?.songwriterId === 'frank_zappa' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      fzDeviceReceiptOk &&
      sliceReceipt.includes('Frank Zappa (slice)') &&
      !frankZappaIiViRollingTriplePresent(eff),
    name: 'Frank Zappa slice: golden path + fz receipts + effective bars + no ii–V–I rolling triples',
  });

  const iiViOneCycle = ['Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'];
  const iiVi32 = [...iiViOneCycle, ...iiViOneCycle, ...iiViOneCycle, ...iiViOneCycle];
  const rLocked = runGoldenPathOnce(50221, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'frank_zappa',
    harmonyMode: 'custom_locked',
    chordProgressionText: iiVi32.join('|'),
    parsedChordBars: [...iiVi32],
    lockedHarmonyBarsRaw: [...iiVi32],
  });
  const hc = rLocked.context?.harmonyContext;
  const g = rLocked.score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  let parityOk = false;
  if (hc && hc.bars.length === 32 && g) {
    parityOk =
      hc.checksum === computeHarmonyChecksum(hc.bars) &&
      hc.source === 'frank_zappa_effective' &&
      hc.styleId === 'frank_zappa';
    for (let b = 1; b <= 32; b++) {
      const got = g.measures.find((m) => m.index === b)?.chord ?? '';
      const exp = hc.bars[b - 1] ?? '';
      if (!lockedHarmonyChordSymbolsEquivalent(got, exp)) parityOk = false;
    }
  }
  out.push({
    ok: parityOk,
    name: 'Frank Zappa HarmonyContext: immutable bars checksum + guitar parity (custom_locked ii–V–I 32)',
  });

  const bar5Bb7b9OverE32 = [
    ...Array.from({ length: 4 }, () => 'Cmaj7'),
    'Bb7b9/E',
    ...Array.from({ length: 27 }, () => 'Cmaj7'),
  ];
  const rBar5 = runGoldenPathOnce(50223, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'frank_zappa',
    harmonyMode: 'custom_locked',
    chordProgressionText: bar5Bb7b9OverE32.join('|'),
    parsedChordBars: [...bar5Bb7b9OverE32],
    lockedHarmonyBarsRaw: [...bar5Bb7b9OverE32],
  });
  const hcB = rBar5.context?.harmonyContext;
  const effB = rBar5.context?.generationMetadata?.frankZappaEffectiveHarmonyBars;
  const gB = rBar5.score?.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const eff5 = effB?.[4] ?? '';
  const score5 = gB?.measures.find((m) => m.index === 5)?.chord ?? '';
  const bar5CanonicalOk =
    !!hcB &&
    !!gB &&
    bar5Bb7b9OverE32[4] === 'Bb7b9/E' &&
    lockedHarmonyChordSymbolsEquivalent(eff5, 'Bb7b9/E') &&
    lockedHarmonyChordSymbolsEquivalent(score5, eff5) &&
    lockedHarmonyChordSymbolsEquivalent(hcB.bars[4] ?? '', eff5);
  out.push({
    ok: bar5CanonicalOk,
    name: 'Frank Zappa HarmonyContext: effective bar 5 Bb7b9/E ⇒ score bar 5 matches (validator parity)',
  });

  return out;
}
