/**
 * Pin rhythm + expression-enriched melody onto a score part (non-chord-melody composers).
 * Wayne Shorter 2a is the first caller; BH chord-melody uses applyChordMelodyToScore instead.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { PremiumMelodyExpressiveNote } from './enrichMelodyExpression';

export type PinPremiumMelodyExportOptions = {
  /** Defaults to clean_electric_guitar (duo melody lead). */
  instrumentIdentity?: string;
  /** Voice to replace in touched bars. Defaults to 1. */
  voice?: number;
};

export function pinPremiumMelodyExport(
  score: ScoreModel,
  expressiveMelody: readonly PremiumMelodyExpressiveNote[],
  options?: PinPremiumMelodyExportOptions
): ScoreModel {
  const instrumentIdentity = options?.instrumentIdentity ?? 'clean_electric_guitar';
  const voice = options?.voice ?? 1;
  const out = structuredClone(score) as ScoreModel;
  const part = out.parts.find((p) => p.instrumentIdentity === instrumentIdentity);
  if (!part || expressiveMelody.length === 0) return out;

  const barsWithMelody = new Set(expressiveMelody.map((n) => n.bar));
  for (const m of part.measures) {
    if (!barsWithMelody.has(m.index)) continue;
    m.events = m.events.filter((e) => (e.voice ?? 1) !== voice);
  }

  for (const note of expressiveMelody) {
    let measure = part.measures.find((m) => m.index === note.bar);
    if (!measure) {
      measure = { index: note.bar, events: [] };
      part.measures.push(measure);
    }
    measure.events.push({
      kind: 'note',
      pitch: note.midiPitch,
      startBeat: note.onsetBeat,
      duration: note.durationBeats,
      voice,
      ...(note.articulation ? { articulation: note.articulation } : {}),
      ...(note.velocity != null ? { velocity: note.velocity } : {}),
      ...(note.durationAccent === 'stress' ? { durationAccent: 'stress' as const } : {}),
    });
  }

  for (const m of part.measures) {
    m.events.sort((a, b) => a.startBeat - b.startBeat);
  }
  part.measures.sort((a, b) => a.index - b.index);
  return out;
}
