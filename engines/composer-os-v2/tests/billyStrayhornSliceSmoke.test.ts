/**
 * Smoke — Billy Strayhorn chromatic song-form slice (golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { frankZappaIiViRollingTriplePresent, isMajorKeyIiViTriple } from '../core/song-mode/songModeBuilder';
import { listStrayhornIsfahanDriftRows } from '../core/song-mode/strayhornIsfahanDriftChordPool';

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

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'billy_strayhorn' &&
      diag?.songwriterId === 'billy_strayhorn' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Billy Strayhorn (chromatic song slice)') &&
      hasBsReceipt,
    name: 'Billy Strayhorn slice: golden path + chromatic song diagnostics receipt',
  });

  const isfahanHits = listStrayhornIsfahanDriftRows().filter((row) => {
    if (frankZappaIiViRollingTriplePresent(row.chords)) return true;
    for (let i = 0; i <= row.chords.length - 3; i++) {
      if (isMajorKeyIiViTriple(row.chords[i]!, row.chords[i + 1]!, row.chords[i + 2]!)) return true;
    }
    return false;
  });
  out.push({
    ok: isfahanHits.length === 0 && listStrayhornIsfahanDriftRows().length === 21,
    name: 'Billy Strayhorn isfahan_drift: 21 tagged rows, 0 major-key ii–V–I triples',
  });

  const isfahanSeed = 3; // Math.abs(3) % 4 === 3 → strayhorn_isfahan_drift
  const r2 = runGoldenPathOnce(isfahanSeed, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'billy_strayhorn',
  });
  const eff2 = r2.context?.generationMetadata?.billyStrayhornEffectiveHarmonyBars ?? [];
  out.push({
    ok:
      r2.success &&
      Array.isArray(eff2) &&
      eff2.length === 32 &&
      !frankZappaIiViRollingTriplePresent(eff2),
    name: 'Billy Strayhorn isfahan_drift seed 3: effective bars have no rolling ii–V–I triple',
  });

  return out;
}
