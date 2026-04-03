/**
 * Roadmap 18.2 Phase A — pipeline integrity: minimal guitar voice-2 probe (Wyble-aligned polyphony path).
 * Sparse, deterministic; not full Wyble logic.
 */

import type { CompositionContext } from '../compositionContext';
import type { NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { addEvent, createNote, createRest } from '../score-model/scoreEventBuilder';

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

/**
 * Inject a minimal inner line: voice 2, every 4th bar, one quarter at beat 2; rests fill voice 2 to 4 beats.
 * Pitch: 3 semitones below highest voice-1 note in the measure (deterministic).
 */
/** @returns how many measures received a voice-2 layer */
export function injectPhaseAGuitarVoice2Probe(guitar: PartModel, context: CompositionContext): number {
  if (context.presetId !== 'guitar_bass_duo') {
    return 0;
  }
  let injected = 0;
  const tb = context.form.totalBars;
  for (let b = 4; b <= tb; b += 4) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    const v1notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1notes.length === 0) continue;
    let top = v1notes[0]!;
    for (const n of v1notes) {
      if (n.pitch > top.pitch) top = n;
    }
    const pitch2 = Math.max(40, top.pitch - 3);
    addEvent(m, createRest(0, 2, 2));
    addEvent(m, createNote(pitch2, 2, 1, 2));
    addEvent(m, createRest(3, 1, 2));
    m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
    injected += 1;
  }
  return injected;
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
