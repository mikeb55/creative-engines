/**
 * Orbit solo musicality — human-playable monophonic line rules + GCE evaluators.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { SoloExportNote } from './soloMusicContextExport';

/** D4–D6 concert MIDI — melodic hard limit (v1.7p8). */
export const SOLO_MELODIC_MIN_MIDI = 62;
export const SOLO_MELODIC_MAX_MIDI = 86;

export const SOLO_MIN_DURATION_BEATS = 0.5;
export const SOLO_MAX_CONSECUTIVE_EIGHTHS = 4;
export const SOLO_MAX_CONSECUTIVE_NOTES = 8;
export const SOLO_PHRASE_REST_MIN_BEATS = 1;

export type SoloMusicalityEvent = {
  barIndex: number;
  startBeat: number;
  durationBeats: number;
  pitch?: number;
  isRest: boolean;
};

export function clampSoloMelodicMidi(midi: number): number {
  let pitch = Math.round(Number(midi));
  if (!Number.isFinite(pitch)) return SOLO_MELODIC_MIN_MIDI;
  while (pitch < SOLO_MELODIC_MIN_MIDI) pitch += 12;
  while (pitch > SOLO_MELODIC_MAX_MIDI) pitch -= 12;
  return Math.max(SOLO_MELODIC_MIN_MIDI, Math.min(SOLO_MELODIC_MAX_MIDI, pitch));
}

export function soloNotesToEvents(notes: readonly SoloExportNote[]): SoloMusicalityEvent[] {
  return notes.map((n) => ({
    barIndex: n.barIndex,
    startBeat: n.startBeat,
    durationBeats: n.durationBeats,
    pitch: n.pitch,
    isRest: false,
  }));
}

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pitchToMidi(step: string, alter: number | undefined, octave: number): number {
  return (octave + 1) * 12 + (STEP[step.toUpperCase()] ?? 0) + (alter ?? 0);
}

/** Parse first part events from MusicXML (supports multiline pitch). */
export function parseSoloMusicalityFromXml(xml: string): SoloMusicalityEvent[] {
  const part = xml.match(/<part id="[^"]+"[\s\S]*?<\/part>/)?.[0] ?? xml;
  const events: SoloMusicalityEvent[] = [];
  const measures = [...part.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)];
  for (const m of measures) {
    const barIndex = parseInt(m[1]!, 10);
    const body = m[2]!;
    const div = parseInt(body.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '480', 10);
    const beats = parseInt(body.match(/<beats>(\d+)<\/beats>/)?.[1] ?? '4', 10);
    const beatType = parseInt(body.match(/<beat-type>(\d+)<\/beat-type>/)?.[1] ?? '4', 10);
    const barBeats = (beats * 4) / beatType;
    let pos = 0;
    for (const nb of body.matchAll(/<note>([\s\S]*?)<\/note>/g)) {
      const block = nb[1]!;
      if (/<chord\/>/.test(block)) continue;
      const durDiv = parseInt(block.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0', 10);
      const durationBeats = (durDiv / div) * (4 / 4);
      const startBeat = (pos / div) * (4 / 4);
      if (/<rest/.test(block)) {
        events.push({ barIndex, startBeat, durationBeats, isRest: true });
      } else {
        const step = block.match(/<step>([A-G])<\/step>/)?.[1];
        const octave = parseInt(block.match(/<octave>(\d+)<\/octave>/)?.[1] ?? '4', 10);
        const alter = block.match(/<alter>(-?\d+)<\/alter>/)?.[1];
        const pitch = step ? pitchToMidi(step, alter ? parseInt(alter, 10) : undefined, octave) : undefined;
        events.push({ barIndex, startBeat, durationBeats, pitch, isRest: false });
      }
      pos += durDiv;
    }
    if (events.filter((e) => e.barIndex === barIndex).length === 0) {
      events.push({ barIndex, startBeat: 0, durationBeats: barBeats, isRest: true });
    }
  }
  return events.sort((a, b) => a.barIndex - b.barIndex || a.startBeat - b.startBeat);
}

function chordTonePcs(symbol: string): Set<number> {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const rootM = hp.match(/^([A-G](?:#|b)?)/i);
  const root = rootM?.[1] ? (noteNameToPitchClass(rootM[1]) ?? 0) : 0;
  const pcs = new Set<number>([root]);
  if (/maj/i.test(hp) || /(?<![a-z])M(?![a-z])/i.test(hp) || /Δ/.test(hp)) {
    pcs.add((root + 4) % 12);
    pcs.add((root + 7) % 12);
    if (/maj7|Δ7|ma7/i.test(hp)) pcs.add((root + 11) % 12);
  } else if (/m(?!aj)/i.test(hp) && !/maj/i.test(hp)) {
    pcs.add((root + 3) % 12);
    pcs.add((root + 7) % 12);
  } else if (/7/.test(hp)) {
    pcs.add((root + 4) % 12);
    pcs.add((root + 7) % 12);
    pcs.add((root + 10) % 12);
  } else {
    pcs.add((root + 4) % 12);
    pcs.add((root + 7) % 12);
  }
  return pcs;
}

function pitched(events: SoloMusicalityEvent[]): SoloMusicalityEvent[] {
  return events.filter((e) => !e.isRest && e.pitch != null);
}

function restBeatsInWindow(events: SoloMusicalityEvent[], startBar: number, endBar: number): number {
  let rest = 0;
  for (const e of events) {
    if (e.barIndex >= startBar && e.barIndex <= endBar && e.isRest) rest += e.durationBeats;
  }
  for (const b of new Set(events.map((e) => e.barIndex))) {
    if (b < startBar || b > endBar) continue;
    const barEv = events.filter((ev) => ev.barIndex === b && !ev.isRest).sort((a, c) => a.startBeat - c.startBeat);
    let t = 0;
    for (const ev of barEv) {
      if (ev.startBeat > t + 0.01) rest += ev.startBeat - t;
      t = ev.startBeat + ev.durationBeats;
    }
    if (t < 3.5) rest += 4 - t;
  }
  return rest;
}

export function gcePhraseShape(events: SoloMusicalityEvent[]): boolean {
  const notes = pitched(events);
  if (notes.length < 4) return false;
  for (let start = 0; start + 4 <= notes.length; start += 4) {
    const slice = notes.slice(start, start + 8);
    if (slice.length < 4) break;
    const intervals = slice.slice(1).map((n, i) => n.pitch! - slice[i]!.pitch!);
    const hasUp = intervals.some((iv) => iv > 0);
    const hasDown = intervals.some((iv) => iv < 0);
    const allStep = intervals.every((iv) => Math.abs(iv) <= 2);
    const flat = intervals.every((iv) => iv === 0);
    if (flat) return false;
    if (!(hasUp && hasDown) && allStep) return false;
  }
  return true;
}

export function gceBreathing(events: SoloMusicalityEvent[], totalBars: number): boolean {
  for (let b = 1; b <= totalBars; b += 4) {
    const end = Math.min(totalBars, b + 3);
    if (restBeatsInWindow(events, b, end) < SOLO_PHRASE_REST_MIN_BEATS) return false;
  }
  return true;
}

export function gceRange(events: SoloMusicalityEvent[]): boolean {
  return pitched(events).every(
    (n) => n.pitch! >= SOLO_MELODIC_MIN_MIDI && n.pitch! <= SOLO_MELODIC_MAX_MIDI,
  );
}

export function gceRhythmicVariety(events: SoloMusicalityEvent[]): boolean {
  const durs = new Set(
    pitched(events).map((n) => {
      const d = n.durationBeats;
      if (d <= 0.6) return 'eighth';
      if (d <= 1.1) return 'quarter';
      if (d <= 1.6) return 'dotted-quarter';
      return 'half+';
    }),
  );
  return durs.has('quarter') && durs.has('dotted-quarter') && (durs.has('half+') || durs.has('eighth'));
}

export function gceHarmonicLogic(events: SoloMusicalityEvent[], harmonyBars: readonly string[]): boolean {
  const notes = pitched(events);
  if (notes.length === 0) return false;
  let hits = 0;
  let checks = 0;
  for (let i = 0; i < notes.length; i += 4) {
    const phrase = notes.slice(i, i + 4);
    if (phrase.length === 0) continue;
    const bar = phrase[phrase.length - 1]!.barIndex;
    const sym = harmonyBars[bar - 1] ?? harmonyBars[0] ?? 'C';
    if (/^NC$/i.test(sym)) continue;
    const tones = chordTonePcs(sym);
    const peak = phrase.reduce((best, n) => (n.pitch! > best.pitch! ? n : best), phrase[0]!);
    const landing = phrase[phrase.length - 1]!;
    checks += 2;
    if (tones.has(peak.pitch! % 12)) hits += 1;
    if (tones.has(landing.pitch! % 12)) hits += 1;
  }
  return checks === 0 || hits / checks >= 0.35;
}

export function gceHumanPlayability(
  events: SoloMusicalityEvent[],
  maxConsecutiveEighths = SOLO_MAX_CONSECUTIVE_EIGHTHS,
): boolean {
  const notes = pitched(events);
  let run = 0;
  for (const n of notes) {
    if (Math.abs(n.durationBeats - 0.5) < 0.05) {
      run += 1;
      if (run > maxConsecutiveEighths) return false;
    } else {
      run = 0;
    }
  }
  let noteRun = 0;
  for (let i = 0; i < notes.length; i++) {
    noteRun += 1;
    if (noteRun > SOLO_MAX_CONSECUTIVE_NOTES) return false;
    const next = notes[i + 1];
    if (next && next.barIndex === notes[i]!.barIndex) {
      const gap = next.startBeat - (notes[i]!.startBeat + notes[i]!.durationBeats);
      if (gap >= 0.25) noteRun = 0;
    } else {
      noteRun = 0;
    }
  }
  return true;
}

export function gceSingleLine(events: SoloMusicalityEvent[]): boolean {
  const byBar = new Map<number, SoloMusicalityEvent[]>();
  for (const e of pitched(events)) {
    const list = byBar.get(e.barIndex) ?? [];
    list.push(e);
    byBar.set(e.barIndex, list);
  }
  for (const list of byBar.values()) {
    const starts = list.map((e) => e.startBeat);
    if (new Set(starts.map((s) => s.toFixed(3))).size !== starts.length) return false;
  }
  return true;
}

export function gceHasSimultaneousChordsInXml(xml: string): boolean {
  return !/<chord\s*\/>/.test(xml);
}

export function snapSoloNotesToHarmonyLandings(
  notes: readonly SoloExportNote[],
  harmonyBars: readonly string[],
): SoloExportNote[] {
  if (notes.length === 0) return [];
  const out = notes.map((n) => ({ ...n }));
  for (let i = 0; i < out.length; i += 4) {
    const phrase = out.slice(i, i + 4);
    if (phrase.length === 0) continue;
    const landing = phrase[phrase.length - 1]!;
    const bar = landing.barIndex;
    const sym = harmonyBars[bar - 1] ?? harmonyBars[0] ?? 'C';
    if (/^NC$/i.test(sym)) continue;
    const tones = chordTonePcs(sym);
    const pc = landing.pitch % 12;
    if (tones.has(pc)) continue;
    let best = landing.pitch;
    let bestDist = 99;
    for (const t of tones) {
      for (const oct of [-12, 0, 12]) {
        const candidate = clampSoloMelodicMidi(landing.pitch - pc + t + oct);
        const dist = Math.abs(candidate - landing.pitch);
        if (dist < bestDist) {
          bestDist = dist;
          best = candidate;
        }
      }
    }
    landing.pitch = best;
    const peakIdx = phrase.reduce(
      (bestIdx, n, idx) => (n.pitch > phrase[bestIdx]!.pitch ? idx : bestIdx),
      0,
    );
    const peak = phrase[peakIdx]!;
    const peakPc = peak.pitch % 12;
    if (!tones.has(peakPc)) {
      let peakBest = peak.pitch;
      let peakDist = 99;
      for (const t of tones) {
        for (const oct of [-12, 0, 12]) {
          const candidate = clampSoloMelodicMidi(peak.pitch - peakPc + t + oct);
          const dist = Math.abs(candidate - peak.pitch);
          if (dist < peakDist) {
            peakDist = dist;
            peakBest = candidate;
          }
        }
      }
      peak.pitch = peakBest;
    }
  }
  return out;
}

export function quantizeDurationBeats(d: number): number {
  if (d < 0.75) return 0.5;
  if (d < 1.25) return 1;
  if (d < 1.75) return 1.5;
  if (d < 2.5) return 2;
  return Math.min(4, Math.round(d * 2) / 2);
}

/** Apply global monophonic musicality rules to solo note timeline. */
export function applyMusicalityToSoloNotes(
  notes: readonly SoloExportNote[],
  _harmonyBars: readonly string[],
  _beatsPerBar = 4,
): SoloExportNote[] {
  const sorted = [...notes]
    .filter((n) => n.pitch > 0)
    .sort((a, b) => a.barIndex - b.barIndex || a.startBeat - b.startBeat);

  const out: SoloExportNote[] = [];
  let eighthRun = 0;

  for (const n of sorted) {
    let dur =
      n.durationBeats <= 0.6
        ? 0.5
        : n.durationBeats <= 1.1
          ? 1
          : n.durationBeats <= 1.6
            ? 1.5
            : Math.max(2, Math.round(n.durationBeats * 2) / 2);
    if (dur <= 0.6) {
      eighthRun += 1;
      if (eighthRun > SOLO_MAX_CONSECUTIVE_EIGHTHS) {
        dur = 1;
        eighthRun = 0;
      }
    } else {
      eighthRun = 0;
    }
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.barIndex === n.barIndex &&
      dur <= 0.6 &&
      prev.durationBeats <= 0.6 &&
      eighthRun >= SOLO_MAX_CONSECUTIVE_EIGHTHS
    ) {
      prev.durationBeats = 1;
      dur = 0.5;
      eighthRun = 1;
    }
    out.push({
      barIndex: n.barIndex,
      startBeat: n.startBeat,
      durationBeats: dur,
      pitch: clampSoloMelodicMidi(n.pitch),
    });
  }
  return out;
}

export const GCE_CRITERIA = [
  'PHRASE_SHAPE',
  'BREATHING',
  'RANGE',
  'RHYTHMIC_VARIETY',
  'HARMONIC_LOGIC',
  'HUMAN_PLAYABILITY',
  'SINGLE_LINE',
] as const;

export type GceCriterion = (typeof GCE_CRITERIA)[number];

export function evaluateGce(
  events: SoloMusicalityEvent[],
  harmonyBars: readonly string[],
  totalBars: number,
  xml?: string,
  options?: { maxConsecutiveEighths?: number },
): Record<GceCriterion, boolean> {
  const maxEighths = options?.maxConsecutiveEighths ?? SOLO_MAX_CONSECUTIVE_EIGHTHS;
  return {
    PHRASE_SHAPE: gcePhraseShape(events),
    BREATHING: gceBreathing(events, totalBars),
    RANGE: gceRange(events),
    RHYTHMIC_VARIETY: gceRhythmicVariety(events),
    HARMONIC_LOGIC: gceHarmonicLogic(events, harmonyBars),
    HUMAN_PLAYABILITY: gceHumanPlayability(events, maxEighths),
    SINGLE_LINE: gceSingleLine(events) && (xml == null || gceHasSimultaneousChordsInXml(xml)),
  };
}
