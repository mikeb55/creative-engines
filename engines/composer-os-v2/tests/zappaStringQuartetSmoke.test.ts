/**
 * Smoke — Frank Zappa string quartet: SQ harmony slice receipts, export, parallel-motion guard.
 */

import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import {
  extractQuartetBarsFromStringParts,
  quartetBarsHaveParallelMotionViolation,
} from '../core/string-quartet/quartetVoiceLeadingGuard';

/** Zappa Classic: odd bars 7/8, even bars 4/4 (16 measures). */
function zappaClassic16BarMeterMap(): BarMeterMap {
  const m: BarMeterMap = {};
  for (let b = 1; b <= 16; b++) {
    m[b] = b % 2 === 1 ? { numerator: 7, denominator: 8 } : { numerator: 4, denominator: 4 };
  }
  return m;
}

const CHORDS_16: string[] = [
  'Dm7',
  'G7',
  'Cmaj7',
  'Cmaj7',
  'Dm7',
  'G7',
  'Cmaj7',
  'Cmaj7',
  'Dm7',
  'G7',
  'Cmaj7',
  'Cmaj7',
  'Dm7',
  'G7',
  'Cmaj7',
  'Cmaj7',
];

export function runZappaStringQuartetSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];
  const map = zappaClassic16BarMeterMap();
  const progression = CHORDS_16.join(' | ');
  const r = runQuartetRealisation({
    seed: 90917,
    title: 'Zappa String Quartet smoke',
    totalBars: 16,
    chordProgressionText: progression,
    barMeterMap: map,
    songwriterStyleId: 'frank_zappa',
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      songwriterStyleId: 'frank_zappa',
      zappaSQHarmonySlice: true,
      frankZappaEffectiveHarmonyBars: [...CHORDS_16],
      barMeterMap: map,
      parsedCustomProgressionBars: [...CHORDS_16],
      harmonySource: 'custom',
    },
  });

  const meta = r.ensembleHarmonyMetadata as { zappaSQDeviceReceipts?: string[] } | undefined;
  const sqReceipts = meta?.zappaSQDeviceReceipts ?? [];
  const fzSqOk = sqReceipts.some((x) => x.includes('fz:sq:'));

  const stringParts = r.score?.parts.slice(0, 4) ?? [];
  const tb = r.planning.formPlan.totalBars;
  const bars = extractQuartetBarsFromStringParts(stringParts, tb);
  const parallelOk = !quartetBarsHaveParallelMotionViolation(bars);

  out.push({
    name: 'Zappa String Quartet: export + fz:sq receipts + parallel guard (16 bars, 7/8+4/4)',
    ok:
      r.planning.validation.ok &&
      r.score != null &&
      r.score.parts.length >= 4 &&
      r.exportPipeline.ok === true &&
      fzSqOk &&
      parallelOk &&
      (r.exportPipeline.xml?.includes('Violin') ?? false),
  });
  return out;
}
