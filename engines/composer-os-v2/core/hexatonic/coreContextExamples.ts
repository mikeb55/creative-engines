/**
 * Four short audition clips for each provisional Core pair.
 * Quarter = 80 and four bars of 4/4 last 12 seconds.
 * No common-tone ties. The pairs have no common tones.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import type { ScoreEvent } from '../score-model/scoreModelTypes';
import { parseSpelledPitch } from '../wwh/wwhTriadPair';
import { CORE_CANDIDATES, getCoreCandidate, type CoreCandidate } from './coreLaboratory';

export const CORE_CONTEXT_IDS = ['root-pedal', 'ambiguous', 'moving-bass', 'motif-return'] as const;
export type CoreContextId = (typeof CORE_CONTEXT_IDS)[number];
export const CORE_CONTEXT_TEMPO = 80;
export const CORE_CONTEXT_BARS = 4;
export const CORE_CONTEXT_SECONDS = (CORE_CONTEXT_BARS * 4 * 60) / CORE_CONTEXT_TEMPO;

interface SpelledMidi {
  midi: number;
  step: string;
  alter: number;
}

function mod12(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function midiOf(token: string, octave: number): number {
  return (octave + 1) * 12 + parseSpelledPitch(token).pc;
}

function spelled(token: string, octave: number): SpelledMidi {
  const parsed = parseSpelledPitch(token);
  return { midi: midiOf(token, octave), step: parsed.step, alter: parsed.alter };
}

function stack(tokens: readonly string[], octave: number): SpelledMidi[] {
  const notes: SpelledMidi[] = [];
  for (const token of tokens) {
    const parsed = parseSpelledPitch(token);
    let midi = midiOf(token, octave);
    const previous = notes[notes.length - 1]?.midi ?? 0;
    while (midi <= previous) midi += 12;
    notes.push({ midi, step: parsed.step, alter: parsed.alter });
  }
  return notes;
}

function arpeggio(tokens: readonly string[], octave: number): SpelledMidi[] {
  const cell = [...tokens, tokens[0]!].map((token) => spelled(token, octave));
  let floor = cell[0]!.midi - 1;
  return cell.map((note) => {
    let midi = note.midi;
    while (midi <= floor) midi += 12;
    floor = midi;
    return { ...note, midi };
  });
}

function circular(left: number, right: number): number {
  const distance = Math.abs(left - right) % 12;
  return Math.min(distance, 12 - distance);
}

function assign(left: readonly number[], right: readonly number[]): number[] {
  const permutations = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  let best = permutations[0]!;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const permutation of permutations) {
    const cost = permutation.reduce((sum, target, index) => sum + circular(left[index]!, right[target]!), 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = permutation;
    }
  }
  return best.map((index) => right[index]!);
}

function nearestMidi(midi: number, pitchClass: number): number {
  let best = midi;
  let bestDistance = 99;
  for (let delta = -6; delta <= 6; delta += 1) {
    const candidate = midi + delta;
    if (mod12(candidate) !== pitchClass) continue;
    const distance = Math.abs(delta);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  if (mod12(best) === mod12(midi)) throw new Error('voice leading held a common tone');
  return best;
}

function moveChord(notes: readonly SpelledMidi[], tokens: readonly string[]): SpelledMidi[] {
  const targets = assign(notes.map((note) => mod12(note.midi)), tokens.map((token) => parseSpelledPitch(token).pc));
  return notes.map((note, index) => {
    const midi = nearestMidi(note.midi, targets[index]!);
    const token = tokens.find((spelling) => parseSpelledPitch(spelling).pc === targets[index]);
    const parsed = parseSpelledPitch(token ?? tokens[0]!);
    return { midi, step: parsed.step, alter: parsed.alter };
  });
}

function addChord(events: ScoreEvent[], notes: readonly SpelledMidi[], startBeat: number, duration: number): void {
  for (const note of notes) {
    const event = createNote(note.midi, startBeat, duration, 1);
    event.spelling = { step: note.step, alter: note.alter };
    events.push(event);
  }
}

function addLine(events: ScoreEvent[], notes: readonly SpelledMidi[], startBeat = 0): void {
  notes.forEach((note, index) => {
    const event = createNote(note.midi, startBeat + index, 1, 1);
    event.spelling = { step: note.step, alter: note.alter };
    events.push(event);
  });
}

function addBass(events: ScoreEvent[], token: string, startBeat: number, duration: number): void {
  const note = spelled(token, 2);
  const event = createNote(note.midi, startBeat, duration, 1);
  event.spelling = { step: note.step, alter: note.alter };
  events.push(event);
}

function guitarPlan(candidate: CoreCandidate, context: CoreContextId): ScoreEvent[][] {
  const left = stack(candidate.leftSpelling, 4);
  const right = stack(candidate.rightSpelling, 4);
  const bars: ScoreEvent[][] = [[], [], [], []];
  if (context === 'root-pedal' || context === 'ambiguous') {
    addChord(bars[0]!, left, 0, 4);
    addChord(bars[1]!, right, 0, 4);
    addChord(bars[2]!, left, 0, 2);
    addChord(bars[2]!, right, 2, 2);
    addChord(bars[3]!, right, 0, 2);
    addChord(bars[3]!, left, 2, 2);
    return bars;
  }
  if (context === 'moving-bass') {
    const returned = moveChord(right, candidate.leftSpelling);
    const departed = moveChord(left, candidate.rightSpelling);
    addChord(bars[0]!, left, 0, 2);
    addChord(bars[0]!, departed, 2, 2);
    addChord(bars[1]!, right, 0, 2);
    addChord(bars[1]!, returned, 2, 2);
    addChord(bars[2]!, left, 0, 2);
    addChord(bars[2]!, departed, 2, 2);
    addChord(bars[3]!, right, 0, 2);
    addChord(bars[3]!, returned, 2, 2);
    return bars;
  }
  const cell = arpeggio(candidate.leftSpelling, 4);
  const variation = [...cell].reverse();
  const outside = arpeggio(candidate.rightSpelling, 4);
  addLine(bars[0]!, cell);
  addLine(bars[1]!, variation);
  addLine(bars[2]!, outside);
  addLine(bars[3]!, cell);
  return bars;
}

function bassPlan(candidate: CoreCandidate, context: CoreContextId): ScoreEvent[][] {
  const bars: ScoreEvent[][] = [[], [], [], []];
  if (context === 'ambiguous') {
    for (const bar of bars) bar.push(createRest(0, 4, 1));
    return bars;
  }
  if (context === 'root-pedal') {
    for (const bar of bars) addBass(bar, candidate.leftSpelling[0]!, 0, 4);
    return bars;
  }
  const moving = [
    candidate.leftSpelling[0]!,
    candidate.leftSpelling[1]!,
    candidate.rightSpelling[0]!,
    candidate.rightSpelling[2]!,
  ];
  if (context === 'moving-bass') {
    bars.forEach((bar, index) => {
      for (let beat = 0; beat < 4; beat += 1) addBass(bar, moving[(index + beat) % moving.length]!, beat, 1);
    });
    return bars;
  }
  addBass(bars[0]!, candidate.leftSpelling[0]!, 0, 2);
  addBass(bars[0]!, candidate.leftSpelling[1]!, 2, 2);
  addBass(bars[1]!, candidate.leftSpelling[2]!, 0, 2);
  addBass(bars[1]!, candidate.leftSpelling[0]!, 2, 2);
  addBass(bars[2]!, candidate.rightSpelling[0]!, 0, 2);
  addBass(bars[2]!, candidate.rightSpelling[1]!, 2, 2);
  addBass(bars[3]!, candidate.leftSpelling[0]!, 0, 4);
  return bars;
}

export function coreContextExampleMusicXml(candidateId: string, context: CoreContextId): string {
  const candidate = getCoreCandidate(candidateId);
  if (!candidate) throw new Error(`unknown core candidate ${candidateId}`);
  if (!CORE_CONTEXT_IDS.includes(context)) throw new Error(`unknown core context ${context}`);
  const noChord = () => undefined;
  const guitar = createPart('guitar', 'Electric Guitar', CLEAN_ELECTRIC_GUITAR.instrumentIdentity, CLEAN_ELECTRIC_GUITAR.midiProgram, 'treble', CORE_CONTEXT_BARS, noChord, noChord);
  const bass = createPart('bass', 'Upright Bass', ACOUSTIC_UPRIGHT_BASS.instrumentIdentity, ACOUSTIC_UPRIGHT_BASS.midiProgram, 'bass', CORE_CONTEXT_BARS, noChord, noChord);
  const guitarBars = guitarPlan(candidate, context);
  const bassBars = bassPlan(candidate, context);
  for (let bar = 0; bar < CORE_CONTEXT_BARS; bar += 1) {
    guitar.measures[bar]!.measureBeatSpanQuarters = 4;
    bass.measures[bar]!.measureBeatSpanQuarters = 4;
    guitar.measures[bar]!.events = guitarBars[bar]!;
    bass.measures[bar]!.events = bassBars[bar]!;
  }
  const score = createScore(`provisional ${candidate.id} ${context}`, [guitar, bass], { tempo: CORE_CONTEXT_TEMPO });
  score.timeSignature = { beats: 4, beatType: 4 };
  score.barMeterMap = {
    1: { numerator: 4, denominator: 4 },
    2: { numerator: 4, denominator: 4 },
    3: { numerator: 4, denominator: 4 },
    4: { numerator: 4, denominator: 4 },
  };
  score.keySignature = { fifths: 0, mode: 'major', hideKeySignature: false };
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) throw new Error(exported.errors.join(' ') || 'context export failed');
  if (/<staff-type>\s*tab\s*<\/staff-type>/i.test(exported.xml)) throw new Error('context clip wrote TAB');
  if (/<tie[\s>]/.test(exported.xml)) throw new Error('context clip wrote a tie');
  if (/<harmony[\s>]/.test(exported.xml)) throw new Error('context clip wrote a chord symbol');
  return exported.xml;
}

export function listCoreContextExamples(): readonly { candidateId: string; context: CoreContextId; musicXml: string }[] {
  return CORE_CANDIDATES.flatMap((candidate) =>
    CORE_CONTEXT_IDS.map((context) => ({
      candidateId: candidate.id,
      context,
      musicXml: coreContextExampleMusicXml(candidate.id, context),
    })),
  );
}
