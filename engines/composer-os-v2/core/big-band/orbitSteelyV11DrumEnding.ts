/**
 * Steely Orbit V1.1 — drum staff bars 61–64 were full tacet in V1.0; add minimal pulse for handoff/clarity.
 */

import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';
/** GM mappings — voice 1 only may use brush/hat/ride (see `musicxmlExporter.bigBandDrumsEventsToXml`). */
const DRUM_BRUSH = 40;
const DRUM_HH = 42;

function findPart(score: ScoreModel, id: string): PartModel | undefined {
  return score.parts.find((p) => p.id === id);
}

function effBeats(score: ScoreModel, bar1: number): number {
  return score.barMeterMap ? resolveMeasureBeatSpanQuarters(bar1, score.barMeterMap) : 4;
}

/** Voice 1: brush beat 1 + hi-hat tap beat 3 (light); voice 2: full-bar rest (kick layer tacet). */
export function applySteelyOrbitV11DrumEnding(score: ScoreModel): void {
  const drums = findPart(score, 'bb_drums');
  if (!drums) return;

  for (let b = 61; b <= 64; b++) {
    const len = effBeats(score, b);
    const m = drums.measures[b - 1]!;
    m.events = [];
    addEvent(m, createNote(DRUM_BRUSH, 0, 1, 1));
    addEvent(m, createRest(1, 1, 1));
    addEvent(m, createNote(DRUM_HH, 2, 0.5, 1));
    addEvent(m, createRest(2.5, len - 2.5, 1));
    addEvent(m, createRest(0, len, 2));
  }
}
