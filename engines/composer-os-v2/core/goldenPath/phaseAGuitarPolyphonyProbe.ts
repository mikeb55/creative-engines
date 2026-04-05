/**
 * Roadmap 18.2 Phase A — pipeline integrity: guitar voice-2 injection for polyphony preset.
 * Phase 18.2B delegates to Wyble-style inner voice (see guitarVoice2WybleLayer).
 */

import type { CompositionContext } from '../compositionContext';
import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import {
  injectGuitarVoice2WybleLayer,
  stabiliseGuitarVoice2Wyble18_2B_1,
  stabiliseGuitarVoice2Wyble18_2B_2,
  stabiliseGuitarVoice2Wyble18_2B_3,
} from './guitarVoice2WybleLayer';
import {
  computeGuitarVoice2PolyphonyDiagnostics,
  logGuitarVoice2PolyphonyDiagnosticReport,
} from './guitarVoice2PolyphonyDiagnostics';

const LOG_ENV = 'COMPOSER_OS_PHASEA_POLYPHONY_LOG';

function shouldLog(): boolean {
  return typeof process !== 'undefined' && process.env?.[LOG_ENV] === '1';
}

export function countVoice2InMeasure(m: { events: { kind: string; voice?: number }[] }): number {
  return m.events.filter((e) => (e.kind === 'note' || e.kind === 'rest') && (e.voice ?? 1) === 2).length;
}

/** Per-measure metrics for guitar polyphony tracing. */
export function guitarVoice2Metrics(guitar: PartModel): Array<{ bar: number; total: number; v2: number }> {
  return [...guitar.measures]
    .sort((a, b) => a.index - b.index)
    .map((m) => ({
      bar: m.index,
      total: m.events.length,
      v2: countVoice2InMeasure(m),
    }));
}

export function logGuitarVoice2Checkpoint(label: string, guitar: PartModel): void {
  if (!shouldLog()) return;
  const rows = guitarVoice2Metrics(guitar);
  const totalV2 = rows.reduce((s, r) => s + r.v2, 0);
  console.log(`[phaseA-voice2][checkpoint-${label}] part=guitar totalV2Events=${totalV2}`);
  for (const r of rows) {
    if (r.v2 > 0) {
      console.log(`[phaseA-voice2][checkpoint-${label}] bar=${r.bar} events=${r.total} voice2=${r.v2}`);
    }
  }
}

export function logGuitarVoice2CheckpointFromScore(label: string, score: ScoreModel): void {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) {
    if (shouldLog()) console.log(`[phaseA-voice2][checkpoint-${label}] no guitar part`);
    return;
  }
  logGuitarVoice2Checkpoint(label, guitar);
}

/** @returns how many measures received a voice-2 layer */
export function injectPhaseAGuitarVoice2Probe(guitar: PartModel, context: CompositionContext): number {
  const n = injectGuitarVoice2WybleLayer(guitar, context);
  if (context.presetId === 'guitar_bass_duo') {
    stabiliseGuitarVoice2Wyble18_2B_1(guitar, context);
    stabiliseGuitarVoice2Wyble18_2B_2(guitar, context);
    stabiliseGuitarVoice2Wyble18_2B_3(guitar, context);
    const tb = context.form.totalBars;
    const diag = computeGuitarVoice2PolyphonyDiagnostics(guitar, tb);
    context.generationMetadata.voice2PolyphonyDiagnostics = diag;
    logGuitarVoice2PolyphonyDiagnosticReport(diag, tb);
  }
  return n;
}

/** Fail fast when injection ran but no voice-2 events are present (set COMPOSER_OS_PHASEA_POLYPHONY_STRICT=0 to disable). */
export function assertPhaseACheckpointA(guitar: PartModel, barsInjected: number): void {
  if (barsInjected === 0) return;
  if (typeof process !== 'undefined' && process.env?.COMPOSER_OS_PHASEA_POLYPHONY_STRICT === '0') return;
  const totalV2 = guitarVoice2Metrics(guitar).reduce((s, r) => s + r.v2, 0);
  if (totalV2 === 0) {
    throw new Error('Phase A checkpoint A: expected voice-2 events after inject, got 0');
  }
}
