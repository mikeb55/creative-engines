/**
 * Melody V2 — late-form cadenza (2 bars) for long-form duo; excluded on ecm_chamber.
 */

import type { CompositionContext } from '../compositionContext';
import type { NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { createNote, createRest } from '../score-model/scoreEventBuilder';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';

export function cadenzaStartBar(totalBars: number): number | undefined {
  if (totalBars <= 16) return undefined;
  return Math.ceil(totalBars * 0.85);
}

export function isBarInCadenza(bar: number, totalBars: number): boolean {
  const start = cadenzaStartBar(totalBars);
  if (start === undefined) return false;
  return bar >= start && bar < start + 2;
}

export function applyCadenzaPass(score: ScoreModel, context: CompositionContext, seed: number): void {
  if (context.presetId === 'ecm_chamber') return;
  const tb = context.form.totalBars;
  const start = cadenzaStartBar(tb);
  if (start === undefined) return;

  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar) return;

  for (let b = start; b < start + 2 && b <= tb; b++) {
    const gm = guitar.measures.find((m) => m.index === b);
    if (!gm) continue;
    const low = 55;
    const high = 83;
    const contour = [0, 2, -1, 3, -2, 1];
    const events = gm.events.filter((e) => e.kind === 'note' && (e as NoteEvent).voice === 1) as NoteEvent[];
    let pitch = events[0]?.pitch ?? 64;
    const newEvents: NoteEvent[] = [];
    let beat = 0;
    for (let i = 0; i < contour.length && beat < 3.5; i++) {
      pitch = clampPitch(pitch + contour[i]!, low, high);
      const dur = seededUnit(seed, b * 10 + i, 74001) < 0.5 ? 0.5 : 0.75;
      newEvents.push(createNote(pitch, beat, dur, 1));
      beat += dur;
    }
    gm.events = [
      ...gm.events.filter((e) => e.kind !== 'note' || (e as NoteEvent).voice !== 1),
      ...newEvents,
    ];

    if (bass) {
      const bm = bass.measures.find((m) => m.index === b);
      if (bm) {
        const root = 40;
        bm.events = [createNote(root, 0, 4, 1)];
      }
    }
  }
}

export function applyCadenzaBassPedalOnly(bass: PartModel, bar: number, rootMidi = 40): void {
  const bm = bass.measures.find((m) => m.index === bar);
  if (!bm) return;
  bm.events = [createNote(rootMidi, 0, 4, 1)];
}
