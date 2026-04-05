/**
 * Phase 18.2B.1 — Voice-2 observability for Guitar Polyphony · Bass Duo (guitar_bass_duo).
 * Read-only metrics from the guitar part after Voice-2 injection + stabilise; no generation side effects.
 */

import type { NoteEvent, PartModel } from '../score-model/scoreModelTypes';

const V2_VOICE = 2;
const BEAT_EPS = 1e-4;
/** Minimum note length to count a bar as “active” (eighth note in 4/4). */
const MIN_ACTIVE_NOTE_BEATS = 0.5;

export interface GuitarVoice2PolyphonyDiagnostics {
  v2NoteCountPerBar: number[];
  v2ActiveBars: number;
  v2TotalNotes: number;
  v2BarCoverage: number;
  v2AvgNotesPerActiveBar: number;
  v2LongestRestGap: number;
  v2LongestActiveRun: number;
  v2StrongBeatEntries: number;
  v2OffbeatEntries: number;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < BEAT_EPS;
}

/** Beats 1 and 3 in 4/4 (0- and 2-beat onsets in [0,4)). */
export function isVoice2StrongBeatOnset(startBeat: number): boolean {
  const b = ((startBeat % 4) + 4) % 4;
  return near(b, 0) || near(b, 2);
}

/** Eighth-note “&” positions in 4/4. */
export function isVoice2OffbeatOnset(startBeat: number): boolean {
  const b = ((startBeat % 4) + 4) % 4;
  return near(b, 0.5) || near(b, 1.5) || near(b, 2.5) || near(b, 3.5);
}

/**
 * Collect Voice-2 note metrics for guitar_bass_duo polyphony reporting.
 * @param totalBars expected form length (bars 1..totalBars)
 */
export function computeGuitarVoice2PolyphonyDiagnostics(
  guitar: PartModel,
  totalBars: number
): GuitarVoice2PolyphonyDiagnostics {
  const v2NoteCountPerBar: number[] = Array.from({ length: Math.max(0, totalBars) }, () => 0);
  let v2TotalNotes = 0;
  let v2StrongBeatEntries = 0;
  let v2OffbeatEntries = 0;

  for (const m of guitar.measures) {
    const bi = m.index;
    if (bi < 1 || bi > totalBars) continue;
    const notes = m.events.filter(
      (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE
    );
    const count = notes.length;
    v2NoteCountPerBar[bi - 1] = count;
    v2TotalNotes += count;
    for (const n of notes) {
      if (isVoice2StrongBeatOnset(n.startBeat)) v2StrongBeatEntries++;
      else if (isVoice2OffbeatOnset(n.startBeat)) v2OffbeatEntries++;
    }
  }

  let v2ActiveBars = 0;
  const activeByBar: boolean[] = [];
  for (let i = 0; i < totalBars; i++) {
    const barIndex = i + 1;
    const m = guitar.measures.find((x) => x.index === barIndex);
    let active = false;
    if (m) {
      const longEnough = m.events.some(
        (e) =>
          e.kind === 'note' &&
          (e.voice ?? 1) === V2_VOICE &&
          (e as NoteEvent).duration >= MIN_ACTIVE_NOTE_BEATS - BEAT_EPS
      );
      active = longEnough;
    }
    activeByBar.push(active);
    if (active) v2ActiveBars++;
  }

  let v2LongestRestGap = 0;
  let curRest = 0;
  for (const a of activeByBar) {
    if (!a) {
      curRest++;
      if (curRest > v2LongestRestGap) v2LongestRestGap = curRest;
    } else {
      curRest = 0;
    }
  }

  let v2LongestActiveRun = 0;
  let curAct = 0;
  for (const a of activeByBar) {
    if (a) {
      curAct++;
      if (curAct > v2LongestActiveRun) v2LongestActiveRun = curAct;
    } else {
      curAct = 0;
    }
  }

  const v2BarCoverage = totalBars > 0 ? v2ActiveBars / totalBars : 0;
  const v2AvgNotesPerActiveBar = v2TotalNotes / Math.max(1, v2ActiveBars);

  return {
    v2NoteCountPerBar,
    v2ActiveBars,
    v2TotalNotes,
    v2BarCoverage,
    v2AvgNotesPerActiveBar,
    v2LongestRestGap,
    v2LongestActiveRun,
    v2StrongBeatEntries,
    v2OffbeatEntries,
  };
}

/** Single-block console summary for Guitar Polyphony · Bass Duo (no gates, no rejection). */
export function logGuitarVoice2PolyphonyDiagnosticReport(
  diagnostics: GuitarVoice2PolyphonyDiagnostics,
  totalBars: number
): void {
  const d = diagnostics;
  console.log('VOICE 2 DIAGNOSTIC');
  console.log(`Bars active: ${d.v2ActiveBars} / ${totalBars}`);
  console.log(`Bar coverage: ${d.v2BarCoverage.toFixed(2)}`);
  console.log(`Total notes: ${d.v2TotalNotes}`);
  console.log(`Notes per active bar: ${d.v2AvgNotesPerActiveBar.toFixed(2)}`);
  console.log(`Longest rest gap: ${d.v2LongestRestGap}`);
  console.log(`Longest active run: ${d.v2LongestActiveRun}`);
  console.log(`Strong-beat entries: ${d.v2StrongBeatEntries}`);
  console.log(`Offbeat entries: ${d.v2OffbeatEntries}`);
}
