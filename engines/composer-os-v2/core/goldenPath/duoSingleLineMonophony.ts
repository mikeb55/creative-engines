/**
 * Guitar–Bass Duo (Single-Line): strip auxiliary guitar voices and enforce one sounding pitch at a time per part.
 */

import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

const DUO_SINGLE_TARGETS = new Set(['clean_electric_guitar', 'acoustic_upright_bass']);

function overlaps(aStart: number, aDur: number, bStart: number, bDur: number): boolean {
  const aEnd = aStart + aDur;
  const bEnd = bStart + bDur;
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Within one measure / one voice: remove quieter overlapping notes (keeps a single melodic thread).
 */
function collapseOverlappingNotesInMeasure(m: MeasureModel, voice: number): void {
  let guard = 0;
  while (guard++ < 64) {
    const indexed = m.events
      .map((e, i) => ({ e, i }))
      .filter((x) => x.e.kind === 'note' && ((x.e as NoteEvent).voice ?? 1) === voice);
    let drop: number | undefined;
    outer: for (let i = 0; i < indexed.length; i++) {
      const a = indexed[i].e as NoteEvent;
      for (let j = i + 1; j < indexed.length; j++) {
        const b = indexed[j].e as NoteEvent;
        if (overlaps(a.startBeat, a.duration, b.startBeat, b.duration)) {
          drop = a.startBeat <= b.startBeat ? indexed[j].i : indexed[i].i;
          break outer;
        }
      }
    }
    if (drop === undefined) return;
    m.events = m.events.filter((_, k) => k !== drop);
  }
}

/**
 * Drops voice≠1 guitar harmony layer; removes rare same-voice overlaps after other passes.
 */
export function applyDuoSingleLineMonophony(score: ScoreModel): void {
  for (const part of score.parts) {
    if (!DUO_SINGLE_TARGETS.has(part.instrumentIdentity)) continue;
    for (const m of part.measures) {
      m.events = m.events.filter((e) => {
        if (e.kind !== 'note') return true;
        const n = e as NoteEvent;
        return (n.voice ?? 1) === 1;
      });
      collapseOverlappingNotesInMeasure(m, 1);
    }
  }
}

export function assertDuoSingleLineNoChordalGuitarVoicings(guitar: PartModel): string[] {
  const errors: string[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if (((e as NoteEvent).voice ?? 1) !== 1) {
        errors.push(`Bar ${m.index}: expected guitar voice 1 only in single-line mode`);
      }
    }
    const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        if (overlaps(notes[i].startBeat, notes[i].duration, notes[j].startBeat, notes[j].duration)) {
          errors.push(`Bar ${m.index}: overlapping guitar notes in single-line mode`);
        }
      }
    }
  }
  return errors;
}
