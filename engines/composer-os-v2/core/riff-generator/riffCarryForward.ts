/**
 * Riff bar snapshots for lock / regen / mutate (echoed on GenerateResult, no parallel state store).
 */

import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { createMeasure, createNote, createRest, createScore } from '../score-model/scoreEventBuilder';
import { generateRiffCoreMotif } from '../motif/songModeMotifEngine';
import type { BuiltRiffScore } from './buildRiffScoreModel';
import type { RiffGeneratorParams, RiffRhythmSegment } from './riffTypes';

export type RiffBarNoteSnapshot = {
  pitch: number;
  startBeat: number;
  duration: number;
  voice?: number;
};

export type RiffBarSnapshot = {
  rhythm: RiffRhythmSegment[];
  guitarNotes: RiffBarNoteSnapshot[];
  bassNotes?: RiffBarNoteSnapshot[];
  chord?: string;
};

export type RiffCarryForward = {
  bars: RiffBarSnapshot[];
};

export function normalizeRiffBarLocks(locks: boolean[] | undefined, bars: number): boolean[] {
  const out = new Array<boolean>(bars).fill(false);
  if (!locks?.length) return out;
  for (let i = 0; i < bars; i++) out[i] = locks[i] === true;
  return out;
}

function notesFromMeasureEvents(
  events: import('../score-model/scoreModelTypes').ScoreEvent[]
): RiffBarNoteSnapshot[] {
  const out: RiffBarNoteSnapshot[] = [];
  for (const ev of events) {
    if (ev.kind !== 'note') continue;
    out.push({
      pitch: ev.pitch,
      startBeat: ev.startBeat,
      duration: ev.duration,
      voice: ev.voice,
    });
  }
  return out;
}

export function snapshotRiffCarryForward(
  score: ScoreModel,
  perBarRhythm: RiffRhythmSegment[][]
): RiffCarryForward {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const bass = score.parts.find((p) => p.id === 'bass');
  const n = Math.max(guitar?.measures.length ?? 0, perBarRhythm.length);
  const bars: RiffBarSnapshot[] = [];
  for (let b = 0; b < n; b++) {
    const gm = guitar?.measures[b];
    const bm = bass?.measures[b];
    bars.push({
      rhythm: (perBarRhythm[b] ?? []).map((r) => ({ ...r })),
      guitarNotes: notesFromMeasureEvents(gm?.events ?? []),
      bassNotes: bm ? notesFromMeasureEvents(bm.events) : undefined,
      chord: gm?.chord,
    });
  }
  return { bars };
}

function eventsFromNotes(notes: RiffBarNoteSnapshot[], doubleOct: boolean): import('../score-model/scoreModelTypes').ScoreEvent[] {
  const ev: import('../score-model/scoreModelTypes').ScoreEvent[] = [];
  for (const ln of notes) {
    ev.push(createNote(ln.pitch, ln.startBeat, ln.duration, ln.voice ?? 1, 'riff_core'));
    if (doubleOct) {
      ev.push(createNote(ln.pitch + 12, ln.startBeat, ln.duration, 2, 'riff_core'));
    }
  }
  return ev.length ? ev : [createRest(0, 4, 1)];
}

export function writeRiffBarSnapshotToParts(
  parts: PartModel[],
  barIndex: number,
  snap: RiffBarSnapshot,
  doubleOct: boolean
): void {
  const guitar = parts.find((p) => p.id === 'guitar');
  const bass = parts.find((p) => p.id === 'bass');
  if (guitar?.measures[barIndex]) {
    const gm = guitar.measures[barIndex]!;
    if (snap.chord) gm.chord = snap.chord;
    gm.events = eventsFromNotes(snap.guitarNotes, doubleOct);
  }
  if (bass?.measures[barIndex] && snap.bassNotes) {
    bass.measures[barIndex]!.events = snap.bassNotes.map((n) =>
      createNote(n.pitch, n.startBeat, n.duration, n.voice ?? 1)
    );
  }
}

export function applyRiffBarLocksToBuilt(
  built: BuiltRiffScore,
  carryForward: RiffCarryForward | undefined,
  locks: boolean[]
): BuiltRiffScore {
  if (!carryForward?.bars.length || !locks.some(Boolean)) return built;
  const doubleOct = built.score.parts[0]?.id === 'guitar' && built.score.parts.some((p) => p.id === 'guitar');
  const lineDouble = built.score.parts[0]?.measures[0]?.events.some((e) => e.kind === 'note' && e.voice === 2);
  for (let b = 0; b < built.score.parts[0]!.measures.length; b++) {
    if (!locks[b]) continue;
    const snap = carryForward.bars[b];
    if (!snap) continue;
    writeRiffBarSnapshotToParts(built.score.parts, b, snap, Boolean(lineDouble));
    if (snap.rhythm.length) built.perBarRhythm[b] = snap.rhythm.map((r) => ({ ...r }));
  }
  return built;
}

export function buildRiffScoreFromBarSnapshots(
  params: RiffGeneratorParams,
  snapshots: RiffBarSnapshot[],
  chords: string[]
): BuiltRiffScore {
  const wantBass = params.bassEnabled && params.lineMode === 'guitar_bass';
  const doubleOct = params.lineMode === 'octave_double';
  const guitarMeasures = snapshots.map((s, i) => {
    const m = createMeasure(i + 1, s.chord ?? chords[i] ?? chords[0] ?? 'Am7');
    if (i === 0) m.rehearsalMark = 'Riff';
    m.events = eventsFromNotes(s.guitarNotes, doubleOct);
    return m;
  });
  const bassMeasures = wantBass
    ? snapshots.map((s, i) => {
        const m = createMeasure(i + 1, s.chord ?? chords[i] ?? chords[0] ?? 'Am7');
        m.events = (s.bassNotes ?? []).length
          ? s.bassNotes!.map((n) => createNote(n.pitch, n.startBeat, n.duration, n.voice ?? 1))
          : [createRest(0, 4, 1)];
        return m;
      })
    : null;

  const parts: PartModel[] = [
    {
      id: 'guitar',
      name: 'Clean Electric Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures: guitarMeasures,
    },
  ];
  if (bassMeasures) {
    parts.push({
      id: 'bass',
      name: 'Acoustic Upright Bass',
      instrumentIdentity: 'acoustic_upright_bass',
      midiProgram: 32,
      clef: 'bass',
      measures: bassMeasures,
    });
  }

  const perBarRhythm = snapshots.map((s) => s.rhythm.map((r) => ({ ...r })));
  const score = createScore(params.title?.trim() || 'Riff', parts, { tempo: params.bpm });
  return {
    score,
    perBarRhythm,
    coreMotif: generateRiffCoreMotif(params.seed),
  };
}
