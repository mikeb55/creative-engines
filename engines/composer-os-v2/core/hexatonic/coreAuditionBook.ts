/**
 * H6-A4 audition scores for the 12 provisional Core pairs.
 * Original guitar and bass examples. A render is not musical approval.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { parseSpelledPitch } from '../wwh/wwhTriadPair';
import { createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import type { NoteEvent, RestEvent } from '../score-model/scoreModelTypes';
import { classifyPitchClassSet } from './setClass';
import { getHexatonicScalar } from './collections';
import { getHexatonicWpsPair } from './triadPairs';
import { CORE_CANDIDATES, CORE_LABORATORY_STATUS, analyzeCoreCandidate, type CoreCandidate } from './coreLaboratory';

const BARS = 20;
const INTERVALS = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th'];

interface SpelledMidi {
  midi: number;
  step: string;
  alter: number;
}

export interface NearestCatalogueReading {
  id: string;
  kind: 'wps-pair' | 'scalar' | 'unknown';
  forte: string;
  pitchClasses: readonly number[];
  spelling: readonly string[];
  left: readonly string[];
  right: readonly string[];
  leftRole: string;
  rightRole: string;
  tiedIds: readonly string[];
}

export interface CoreAuditionBookEntry {
  index: number;
  id: string;
  label: string;
  status: typeof CORE_LABORATORY_STATUS;
  identity: string;
  mathematicalDifference: string;
  audibleClaim: 'No audible difference is claimed before human review.';
  decisionPrompts: readonly string[];
}

function spelled(token: string): { step: string; alter: number; pc: number } {
  const parsed = parseSpelledPitch(token);
  return { step: parsed.step, alter: parsed.alter, pc: parsed.pc };
}

function closePosition(tokens: readonly string[], octave: number, rotation = 0): SpelledMidi[] {
  const turned = [...tokens.slice(rotation), ...tokens.slice(0, rotation)];
  const notes: SpelledMidi[] = [];
  let previous = (octave + 1) * 12 - 1;
  for (const token of turned) {
    const note = spelled(token);
    let midi = (octave + 1) * 12 + note.pc;
    while (midi <= previous) midi += 12;
    notes.push({ midi, step: note.step, alter: note.alter });
    previous = midi;
  }
  return notes;
}

function dropTwo(tokens: readonly string[], octave: number): SpelledMidi[] {
  const close = closePosition(tokens, octave, 0);
  const second = close[close.length - 2];
  if (!second) return close;
  const spread = close.map((note, index) => (index === close.length - 2 ? { ...note, midi: note.midi - 12 } : note));
  spread.sort((left, right) => left.midi - right.midi);
  const lowest = spread[0]?.midi ?? 48;
  if (lowest < 48) return spread.map((note) => ({ ...note, midi: note.midi + 12 }));
  return spread;
}

function dyad(tokens: readonly string[], pair: readonly [number, number], octave: number): SpelledMidi[] {
  return closePosition([tokens[pair[0]]!, tokens[pair[1]]!], octave, 0);
}

function intervalClass(tokens: readonly string[], pair: readonly [number, number]): number {
  const left = spelled(tokens[pair[0]]!).pc;
  const right = spelled(tokens[pair[1]]!).pc;
  const distance = (right - left + 12) % 12;
  return Math.min(distance, 12 - distance);
}

function contrastingDyadPairs(left: readonly string[], right: readonly string[]): { left: [number, number]; right: [number, number] } {
  const pairs: [number, number][] = [[0, 1], [1, 2], [0, 2]];
  const leftPair: [number, number] = [0, 1];
  const leftInterval = intervalClass(left, leftPair);
  const rightPair = pairs.find((pair) => intervalClass(right, pair) !== leftInterval) ?? [0, 2];
  return { left: leftPair, right: rightPair };
}

function voiceLead(source: readonly SpelledMidi[], target: readonly SpelledMidi[]): SpelledMidi[] {
  const orders = permutations(target);
  let best: SpelledMidi[] = [];
  let bestCost = Number.POSITIVE_INFINITY;
  for (const order of orders) {
    let cost = 0;
    const placed: SpelledMidi[] = [];
    for (let index = 0; index < source.length; index += 1) {
      const from = source[index]!;
      const to = order[index]!;
      let choice = to.midi;
      let distance = Math.abs(choice - from.midi);
      for (const shift of [-12, 12]) {
        const next = to.midi + shift;
        const nextDistance = Math.abs(next - from.midi);
        if (nextDistance < distance && next >= 48 && next <= 84) {
          distance = nextDistance;
          choice = next;
        }
      }
      cost += distance;
      placed.push({ midi: choice, step: to.step, alter: to.alter });
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = placed;
    }
  }
  return best;
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const found: T[][] = [];
  items.forEach((item, index) => {
    const rest = items.filter((_, at) => at !== index);
    for (const tail of permutations(rest)) found.push([item, ...tail]);
  });
  return found;
}

function noteEvent(note: SpelledMidi, startBeat: number, duration: number): NoteEvent {
  const event = createNote(note.midi, startBeat, duration, 1);
  event.spelling = { step: note.step, alter: note.alter };
  return event;
}

function chordEvents(notes: readonly SpelledMidi[], startBeat: number, duration: number): NoteEvent[] {
  return notes.map((note) => noteEvent(note, startBeat, duration));
}

export function nearestCatalogueReading(candidateId: string): NearestCatalogueReading {
  const analysis = analyzeCoreCandidate(candidateId);
  const tiedIds = analysis.nearestCatalogueIds;
  const id = tiedIds[0] ?? 'hex_major_omit_seventh';
  const pair = getHexatonicWpsPair(id);
  if (pair) {
    const setClass = classifyPitchClassSet(pair.pitchClasses);
    return {
      id,
      kind: 'wps-pair',
      forte: setClass.forte,
      pitchClasses: pair.pitchClasses,
      spelling: [...pair.resolution.spelling, ...pair.tension.spelling],
      left: pair.resolution.spelling,
      right: pair.tension.spelling,
      leftRole: 'resolution triad',
      rightRole: 'tension triad',
      tiedIds,
    };
  }
  const scalar = getHexatonicScalar(id);
  if (!scalar) {
    return {
      id,
      kind: 'unknown',
      forte: 'unknown',
      pitchClasses: [],
      spelling: [],
      left: ['C', 'D', 'E'],
      right: ['F', 'G', 'A'],
      leftRole: 'missing',
      rightRole: 'missing',
      tiedIds,
    };
  }
  const setClass = classifyPitchClassSet(scalar.pitchClasses);
  const reading = scalar.triadReading;
  if (reading && reading.length >= 2) {
    return {
      id,
      kind: 'scalar',
      forte: setClass.forte,
      pitchClasses: scalar.pitchClasses,
      spelling: scalar.referenceSpelling,
      left: reading[0]!.spelling,
      right: reading[1]!.spelling,
      leftRole: reading[0]!.role,
      rightRole: reading[1]!.role,
      tiedIds,
    };
  }
  return {
    id,
    kind: 'scalar',
    forte: setClass.forte,
    pitchClasses: scalar.pitchClasses,
    spelling: scalar.referenceSpelling,
    left: scalar.referenceSpelling.slice(0, 3),
    right: scalar.referenceSpelling.slice(3, 6),
    leftRole: 'collection slice',
    rightRole: 'collection slice',
    tiedIds,
  };
}

function names(pitchClasses: readonly number[], spelling: readonly string[]): string {
  const byPc = new Map<number, string>();
  for (const token of spelling) {
    const pitchClass = spelled(token).pc;
    if (!byPc.has(pitchClass)) byPc.set(pitchClass, token);
  }
  return pitchClasses.map((pitchClass) => byPc.get(pitchClass) ?? String(pitchClass)).join(' ');
}

function rootedSentence(candidate: CoreCandidate): string {
  const left = spelled(candidate.leftSpelling[0]!).pc;
  const right = spelled(candidate.rightSpelling[0]!).pc;
  const up = (right - left + 12) % 12;
  const gap = up <= 6 ? `a ${INTERVALS[up]} above` : `a ${INTERVALS[12 - up]} below`;
  return `${candidate.leftQuality} triad on ${candidate.leftSpelling[0]} beside a ${candidate.rightQuality} triad on ${candidate.rightSpelling[0]}. The second root sits ${gap} the first. The two triads share no pitch class. This is a colour pairing, not a cadence.`;
}

export function coreAuditionBookEntry(candidateId: string): CoreAuditionBookEntry {
  const candidate = CORE_CANDIDATES.find((row) => row.id === candidateId);
  if (!candidate) throw new Error(`unknown core candidate ${candidateId}`);
  const analysis = analyzeCoreCandidate(candidate.id);
  const nearest = nearestCatalogueReading(candidate.id);
  const index = CORE_CANDIDATES.findIndex((row) => row.id === candidate.id) + 1;
  const onlyCandidate = analysis.union.filter((pitchClass) => !nearest.pitchClasses.includes(pitchClass));
  const onlyNearest = nearest.pitchClasses.filter((pitchClass) => !analysis.union.includes(pitchClass));
  const shared = analysis.union.filter((pitchClass) => nearest.pitchClasses.includes(pitchClass));
  const tie = nearest.tiedIds.length > 1 ? ` Tied with ${nearest.tiedIds.slice(1).join(', ')}.` : '';
  const identity = [
    `${index}. ${candidate.label}. Status: ${CORE_LABORATORY_STATUS}.`,
    `Pitch classes: ${analysis.unionSpelling.join(' ')}. Forte ${analysis.forte}. Normal form ${analysis.normalForm.join(' ')}.`,
    rootedSentence(candidate),
    `Tonality Vault / BHL: ${candidate.vaultNote ?? 'No Vault pair is claimed.'} ${analysis.bhlNote}`,
    `Provenance: ${candidate.provenance}. Minimum voice-leading ${analysis.minVoiceLeading} semitones. Other disjoint tertian splits of this union: ${analysis.alternateConstructions}.`,
    `Open-string count is highest at T${analysis.guitarTranspositions[0]?.semitones ?? 0} (${analysis.guitarTranspositions[0]?.openStrings ?? 0} open). The audition stays on the named roots.`,
  ].join(' ');
  const mathematicalDifference = [
    `Nearest existing collection: ${nearest.id} (${nearest.kind}, Forte ${nearest.forte}), shared pitch classes ${shared.length}.${tie}`,
    `Nearest spelling: ${nearest.spelling.join(' ')}. Comparison material uses its ${nearest.leftRole} ${nearest.left.join(' ')} and its ${nearest.rightRole} ${nearest.right.join(' ')}.`,
    `Only in this candidate: ${names(onlyCandidate, analysis.unionSpelling) || 'none'}. Only in the nearest collection: ${names(onlyNearest, nearest.spelling) || 'none'}. Shared: ${names(shared, [...analysis.unionSpelling, ...nearest.spelling]) || 'none'}.`,
    'The difference is this pitch-class mismatch. No audible difference is claimed before human review.',
  ].join(' ');
  return {
    index,
    id: candidate.id,
    label: candidate.label,
    status: CORE_LABORATORY_STATUS,
    identity,
    mathematicalDifference,
    audibleClaim: 'No audible difference is claimed before human review.',
    decisionPrompts: [
      'Distinct: YES / NO / UNDECIDED',
      'Useful: YES / NO / UNDECIDED',
      'Playable: YES / NO / UNDECIDED',
      'KEEP / REFINE / REJECT',
      'Musical character and comments:',
    ],
  };
}

export function listCoreAuditionBookEntries(): readonly CoreAuditionBookEntry[] {
  return CORE_CANDIDATES.map((row) => coreAuditionBookEntry(row.id));
}

function bassNote(token: string): NoteEvent {
  const note = spelled(token);
  const event = createNote((2 + 1) * 12 + note.pc, 0, 4, 1);
  event.spelling = { step: note.step, alter: note.alter };
  return event;
}

export function coreAuditionBookMusicXml(candidateId: string): string {
  const candidate = CORE_CANDIDATES.find((row) => row.id === candidateId);
  if (!candidate) throw new Error(`unknown core candidate ${candidateId}`);
  const nearest = nearestCatalogueReading(candidateId);
  const entry = coreAuditionBookEntry(candidateId);
  const leftClose = closePosition(candidate.leftSpelling, 4, 0);
  const rightClose = closePosition(candidate.rightSpelling, 4, 0);
  const leftLead = voiceLead(leftClose, rightClose);
  const dyads = contrastingDyadPairs(candidate.leftSpelling, candidate.rightSpelling);
  const words: Record<number, string> = {
    1: 'Triad 1 close',
    2: 'Triad 2 close',
    3: 'Inversions',
    4: 'Spread',
    5: 'Exchange',
    7: 'Dyads',
    9: 'Bass pedal',
    11: 'Second pedal',
    13: 'Candidate',
    15: 'Nearest',
    17: 'Distinct?',
    18: 'Useful?',
    19: 'Playable?',
    20: 'Keep / refine / reject',
  };
  const noChord = () => undefined;
  const guitar = createPart('guitar', 'Electric Guitar', CLEAN_ELECTRIC_GUITAR.instrumentIdentity, CLEAN_ELECTRIC_GUITAR.midiProgram, 'treble', BARS, noChord, (bar) => {
    if (bar === 1) return 'A';
    if (bar === 9) return 'B';
    if (bar === 13) return 'C';
    if (bar === 17) return 'D';
    return undefined;
  });
  const bass = createPart('bass', 'Upright Bass', ACOUSTIC_UPRIGHT_BASS.instrumentIdentity, ACOUSTIC_UPRIGHT_BASS.midiProgram, 'bass', BARS, noChord, noChord);
  const guitarBars: (NoteEvent | RestEvent)[][] = [
    chordEvents(leftClose, 0, 4),
    chordEvents(rightClose, 0, 4),
    [...chordEvents(closePosition(candidate.leftSpelling, 4, 1), 0, 2), ...chordEvents(closePosition(candidate.rightSpelling, 4, 2), 2, 2)],
    [...chordEvents(dropTwo(candidate.leftSpelling, 4), 0, 2), ...chordEvents(dropTwo(candidate.rightSpelling, 4), 2, 2)],
    [...chordEvents(leftClose, 0, 2), ...chordEvents(leftLead, 2, 2)],
    [createRest(0, 1), ...chordEvents(leftClose, 1, 1), createRest(2, 1), ...chordEvents(leftLead, 3, 1)],
    [...chordEvents(dyad(candidate.leftSpelling, dyads.left, 4), 0, 2), ...chordEvents(dyad(candidate.rightSpelling, dyads.right, 4), 2, 2)],
    [createRest(0, 4)],
    chordEvents(leftClose, 0, 4),
    chordEvents(rightClose, 0, 4),
    chordEvents(leftClose, 0, 4),
    chordEvents(rightClose, 0, 4),
    [createRest(0, 1), ...chordEvents(dyad(candidate.leftSpelling, [0, 1], 4), 1, 1), ...chordEvents(leftClose, 2, 2)],
    [createRest(0, 1), ...chordEvents(dyad(candidate.rightSpelling, [0, 1], 4), 1, 1), ...chordEvents(rightClose, 2, 2)],
    [createRest(0, 1), ...chordEvents(dyad(nearest.left, [0, 1], 4), 1, 1), ...chordEvents(closePosition(nearest.left, 4, 0), 2, 2)],
    [createRest(0, 1), ...chordEvents(dyad(nearest.right, [0, 1], 4), 1, 1), ...chordEvents(closePosition(nearest.right, 4, 0), 2, 2)],
    [createRest(0, 4)],
    [createRest(0, 4)],
    [createRest(0, 4)],
    [createRest(0, 4)],
  ];
  const leftBass = bassNote(candidate.leftSpelling[0]!);
  const rightBass = bassNote(candidate.rightSpelling[0]!);
  const meter: Record<number, { numerator: number; denominator: number }> = {};
  for (let bar = 1; bar <= BARS; bar += 1) {
    meter[bar] = { numerator: 4, denominator: 4 };
    const guitarMeasure = guitar.measures[bar - 1]!;
    const bassMeasure = bass.measures[bar - 1]!;
    guitarMeasure.measureBeatSpanQuarters = 4;
    bassMeasure.measureBeatSpanQuarters = 4;
    guitarMeasure.events = guitarBars[bar - 1] ?? [createRest(0, 4)];
    if (bar >= 9 && bar <= 10) bassMeasure.events = [leftBass];
    else if (bar >= 11 && bar <= 12) bassMeasure.events = [rightBass];
    else bassMeasure.events = [createRest(0, 4)];
  }
  const score = createScore(`${entry.index}. ${candidate.label} provisional`, [guitar, bass], { tempo: 66 });
  score.timeSignature = { beats: 4, beatType: 4 };
  score.barMeterMap = meter;
  score.keySignature = { fifths: 0, mode: 'major', hideKeySignature: false };
  score.measureWordsMarkings = words;
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) throw new Error(exported.errors.join(' ') || 'audition book export failed');
  if (/<staff-type>\s*tab\s*<\/staff-type>/i.test(exported.xml)) throw new Error('audition book wrote TAB');
  return engraveBook(exported.xml);
}

function engraveBook(xml: string): string {
  const lifted = xml.replace(/<words font-style="italic">/g, '<words default-y="42" font-style="italic">');
  const triadOne = lifted.replace(
    '<direction placement="above"><direction-type><words default-y="42" font-style="italic">Triad 1 close</words></direction-type></direction>',
    '<direction placement="below"><direction-type><words default-y="-12" font-style="italic">Triad 1 close</words></direction-type></direction>',
  );
  return triadOne.replace(/<measure number="(9|13|17)">/g, '<measure number="$1">\n    <print new-system="yes"/>');
}
