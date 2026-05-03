/**
 * Smoke — Frank Zappa Big Band: realisation, fz:* device receipts, Zappa Classic barMeterMap (32 bars).
 */

import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';

/**
 * 32 bars with >50% vanilla maj7-family symbols so `enforceZappaHarmonyLanguageFloors`
 * emits `fz:enforce:*` receipts even when stochastic devices no-op for this seed.
 */
function chords32ForZappaBbSmoke(): string[] {
  const tail: string[] = ['Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'];
  return [...Array(20).fill('Cmaj7'), ...tail] as string[];
}

/** Zappa Classic: odd bars 7/8, even bars 4/4 (32 measures). */
function zappaClassic32BarMeterMap(): BarMeterMap {
  const m: BarMeterMap = {};
  for (let b = 1; b <= 32; b++) {
    m[b] = b % 2 === 1 ? { numerator: 7, denominator: 8 } : { numerator: 4, denominator: 4 };
  }
  return m;
}

export function runZappaBigBandSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];
  const map = zappaClassic32BarMeterMap();
  const chords32 = chords32ForZappaBbSmoke();
  const progression = chords32.join(' | ');

  const r = runBigBandRealisation({
    seed: 1673965981,
    title: 'Zappa Big Band smoke',
    totalBars: 32,
    ensembleConfigId: 'full_band',
    stylePairing: {
      songwriterStyle: 'frank_zappa',
      arrangerStyle: 'thad',
      era: 'post_bop',
    },
    era: 'post_bop',
    songwriterStyleId: 'frank_zappa',
    chordProgressionText: progression,
    barMeterMap: map,
  });

  const receipts = r.frankZappaDeviceReceipts ?? [];
  const fzOk = receipts.length > 0 && receipts.some((x) => x.toLowerCase().includes('fz:'));
  const xmlLen = r.exportPipeline.xml?.length ?? 0;

  out.push({
    name: 'Zappa Big Band: export + fz receipts + Zappa Classic 32-bar meter (seed 1673965981)',
    ok:
      r.planning.validation.ok &&
      r.exportPipeline.ok === true &&
      fzOk &&
      xmlLen > 100000,
  });
  return out;
}
