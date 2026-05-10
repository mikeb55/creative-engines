/**
 * Asymmetric rhythm engine — integration spike: preset → cycle → NoteEvent → measure span.
 *
 * Note: {@link ../core/phrase/phraseBuilder.buildPhrase} uses a fixed 4-quarters-per-bar slot grid for phrase
 * density metrics; odd-meter bars rely on {@link ../core/score-model/measureBeatSpan.measureBeatSpanQuartersOf}
 * for per-measure caps elsewhere.
 */

import {
  cycleSpanQuarters,
  generateCycle,
  rhythmicEventsToNoteEvents,
  validateCycle,
} from '../core/rhythm/asymmetricRhythmEngine';
import {
  cycleDefinitionFromPreset,
  getAsymmetricPreset,
} from '../core/rhythm/asymmetricPresets';
import { measureBeatSpanQuartersOf } from '../core/score-model/measureBeatSpan';
import type { MeasureModel, NoteEvent } from '../core/score-model/scoreModelTypes';

function sumNoteDurations(notes: NoteEvent[]): number {
  return notes.reduce((s, n) => s + n.duration, 0);
}

export function runAsymmetricRhythmIntegrationTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  let threw = false;
  try {
    validateCycle({
      pulsesPerCycle: 7,
      grouping: [3, 3],
      accentMap: ['strong', 'weak'],
      pulseUnit: 'eighth',
    });
  } catch {
    threw = true;
  }
  out.push({
    ok: threw,
    name: 'Asymmetric rhythm — validateCycle throws when grouping sum ≠ pulsesPerCycle',
  });

  const preset = getAsymmetricPreset('seven_three');
  const cycleOk =
    preset !== undefined &&
    preset.grouping.reduce((a, b) => a + b, 0) === preset.pulsesPerCycle;

  const cycle = preset ? cycleDefinitionFromPreset(preset) : null;
  const events = cycle ? generateCycle(cycle) : [];
  const notes = cycle ? rhythmicEventsToNoteEvents(events, cycle.pulseUnit) : [];

  const barQuarters = cycle ? cycleSpanQuarters(cycle) : 0;
  const durSum = sumNoteDurations(notes);
  const eps = 1e-9;
  const sumMatchesBar = Math.abs(durSum - barQuarters) < eps;

  const m: MeasureModel = {
    index: 1,
    events: notes,
    measureBeatSpanQuarters: barQuarters,
  };
  const spanFromHelper = measureBeatSpanQuartersOf(m);
  const spanOk = Math.abs(spanFromHelper - barQuarters) < eps;

  /** Last attack + duration should reach end of measure starting at beat 1. */
  const last = notes.length ? notes[notes.length - 1]! : null;
  const coverageOk =
    last === null
      ? false
      : Math.abs(last.startBeat + last.duration - (1 + barQuarters)) < eps;

  out.push({
    ok:
      cycleOk &&
      events.length === 3 &&
      events.reduce((s, e) => s + e.durationPulses, 0) === 7 &&
      notes.length === 3 &&
      sumMatchesBar &&
      spanOk &&
      coverageOk,
    name: 'Asymmetric rhythm — seven_three → NoteEvents fill 7/8 bar (3.5 quarters); measureBeatSpanQuartersOf aligned',
  });

  return out;
}
