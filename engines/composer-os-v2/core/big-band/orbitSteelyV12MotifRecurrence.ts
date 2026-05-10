/**
 * Steely Orbit V1.2 — structural motif returns on alto (lead bars 5–8 → varied reappearances) for GCE thematic recall.
 */

import type { LeadSheet, LeadSheetMelodyNoteEvent } from '../lead-sheet/leadSheetTypes';
import { orbitMelodyEventsForBar } from './orbitBbV3MelodyAuthority';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';
import { chordSymbolRootPc, snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { BB_PART_SAXES } from './buildBigBandOrchestrationPlan';

function chordAtBar(score: ScoreModel, bar1: number): string {
  for (const p of score.parts) {
    const m = p.measures[bar1 - 1];
    const c = m?.chord?.trim();
    if (c) return c;
  }
  return '';
}

function snapAlto(midi: number): number {
  return snapMidiToRange(midi, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
}

/** Lead-sheet quarter-note span per bar (fall back to realised measure length). */
function sourceQuarterSpan(lead: LeadSheet, effectiveBeats: number): number {
  const b = lead.timeSignature?.beats;
  if (typeof b === 'number' && Number.isFinite(b) && b > 0) return b;
  return effectiveBeats;
}

type Seg = { s: number; d: number; midi: number };

function replaceAltoBarFromLeadEvents(
  measure: MeasureModel,
  events: LeadSheetMelodyNoteEvent[],
  effectiveBeats: number,
  lead: LeadSheet,
  transpose: number,
  beatShiftEff: number,
  velocity: number
): void {
  measure.events = [];
  const sorted = [...events].sort((a, b) => a.beat - b.beat);
  if (sorted.length === 0 || effectiveBeats <= 0) {
    addEvent(measure, createRest(0, effectiveBeats, 1));
    return;
  }

  const srcQ = sourceQuarterSpan(lead, effectiveBeats);
  const scale = effectiveBeats / srcQ;

  const raw: Seg[] = [];
  for (const ev of sorted) {
    let s = ev.beat * scale + beatShiftEff;
    s = ((s % effectiveBeats) + effectiveBeats) % effectiveBeats;
    let d = ev.durationBeats * scale;
    d = Math.min(d, effectiveBeats - s);
    if (d < 1 / 64) continue;
    raw.push({ s, d, midi: snapAlto(ev.midi + transpose) });
  }

  const byTick = new Map<number, Seg>();
  for (const seg of raw) {
    const key = Math.round(seg.s * 64) / 64;
    const ex = byTick.get(key);
    if (!ex || seg.d > ex.d) byTick.set(key, seg);
  }
  const merged = [...byTick.values()].sort((a, b) => a.s - b.s);

  const trimmed: Seg[] = [];
  for (let i = 0; i < merged.length; i++) {
    const cur = merged[i]!;
    let s = Math.min(Math.max(0, cur.s), effectiveBeats - 1e-3);
    const nextStart =
      i + 1 < merged.length ? Math.min(merged[i + 1]!.s, effectiveBeats) : effectiveBeats;
    let d = Math.min(cur.d, nextStart - s);
    if (d < 1 / 64) continue;
    trimmed.push({ s, d, midi: cur.midi });
  }

  let t = 0;
  for (const seg of trimmed) {
    if (seg.s > t + 1e-6) {
      addEvent(measure, createRest(t, seg.s - t, 1));
    }
    addEvent(measure, createNote(seg.midi, seg.s, seg.d, 1, undefined, undefined, velocity));
    t = Math.max(t, seg.s + seg.d);
  }
  if (t < effectiveBeats - 1e-6) {
    addEvent(measure, createRest(t, effectiveBeats - t, 1));
  }
}

/**
 * Overwrites alto bars with returns of the Orbit reveal cell (lead bars 5–8). Deterministic; scales lead rhythms into each bar’s metre.
 */
export function applySteelyOrbitV12MotifRecurrence(score: ScoreModel, lead: LeadSheet): void {
  const alto = score.parts.find((p) => p.id === 'bb_alto_sax');
  if (!alto) return;

  const headPairs: Array<{ src: number; dst: number; transpose: number; beatShiftEff: number; vel: number }> = [
    { src: 5, dst: 21, transpose: 12, beatShiftEff: 0, vel: 86 },
    { src: 6, dst: 22, transpose: 12, beatShiftEff: 0, vel: 86 },
    { src: 7, dst: 23, transpose: 12, beatShiftEff: 0, vel: 86 },
    { src: 8, dst: 24, transpose: 12, beatShiftEff: 0, vel: 86 },
  ];

  for (const { src, dst, transpose, beatShiftEff, vel } of headPairs) {
    const m = alto.measures[dst - 1];
    if (!m) continue;
    const eff = score.barMeterMap ? resolveMeasureBeatSpanQuarters(dst, score.barMeterMap) : 4;
    const evs = orbitMelodyEventsForBar(lead, src);
    if (evs.length === 0) continue;
    const disp = eff / 6;
    replaceAltoBarFromLeadEvents(m, evs, eff, lead, transpose, beatShiftEff + disp, vel);
  }

  for (const { src, dst } of [
    { src: 5, dst: 42 },
    { src: 6, dst: 43 },
    { src: 7, dst: 44 },
  ]) {
    const m = alto.measures[dst - 1];
    if (!m) continue;
    const eff = score.barMeterMap ? resolveMeasureBeatSpanQuarters(dst, score.barMeterMap) : 4;
    const evs = orbitMelodyEventsForBar(lead, src);
    if (evs.length === 0) continue;
    const chSrc = chordAtBar(score, src);
    const chDst = chordAtBar(score, dst);
    const rpcS = chordSymbolRootPc(chSrc) ?? 0;
    const rpcD = chordSymbolRootPc(chDst) ?? 0;
    const delta = (((rpcD - rpcS) % 12) + 12) % 12;
    replaceAltoBarFromLeadEvents(m, evs, eff, lead, delta, 0, 85);
  }

  const m57 = alto.measures[56];
  if (m57) {
    const eff57 = score.barMeterMap ? resolveMeasureBeatSpanQuarters(57, score.barMeterMap) : 4;
    const ev5 = orbitMelodyEventsForBar(lead, 5);
    if (ev5.length > 0) {
      replaceAltoBarFromLeadEvents(m57, ev5, eff57, lead, -13, 0, 76);
    }
  }
}
