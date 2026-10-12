/**
 * WPS V1.3 guitar candidates from the 16-volume record.
 * Returns pitched events. Does not write a performance edition and does not rewrite a bass part.
 * `realizeTriadPair` is used for a resolution/tension pair when that search can place the triads.
 * A solver pass is technical feasibility. Human playability stays unverified.
 */

import { assessGuitarFeasibility, GUITAR_OPEN_STRING_MIDIS } from '../../barry-harris/guitarVoicingFeasibility';
import { realizeTriadPair, type LiquidSlot, type ParentTriadInput } from '../wwhTriadPair';
import {
  pitchClassOf,
  spellName,
  transposeVaultTonality,
  wpsVaultTonality,
  type Spelled,
  type VaultTriad,
  type WpsVaultTonality,
} from './wpsTonalityVaultRecord';
import type { WpsVaultTechnique } from './wpsTypes';

export const WPS_STRING_GROUPS = {
  '6-5-4': [6, 5, 4],
  '5-4-3': [5, 4, 3],
  '4-3-2': [4, 3, 2],
  '3-2-1': [3, 2, 1],
} as const;

export type WpsStringGroup = keyof typeof WPS_STRING_GROUPS;

export interface WpsVaultPitch {
  step: string;
  alter: number;
  /** Octave stored in MusicXML when `writtenOctaveShift` is applied. */
  octave: number;
  /** Sounding MIDI after the duo's octave-change. The fret solver uses this. */
  midi: number;
  stringNumber: number;
  fret: number;
}

export interface WpsVaultEvent {
  bar: number;
  onsetQuarters: number;
  durationQuarters: number;
  pitches: WpsVaultPitch[];
  technique: WpsVaultTechnique;
  movingFrom?: string;
  movingTo?: string;
  held: string[];
}

export interface WpsVaultCandidateSet {
  tonalityId: string;
  volume: number;
  root: string;
  technique: WpsVaultTechnique;
  events: WpsVaultEvent[];
  provenance: string;
  technicalFeasible: boolean;
  humanPlayability: 'NOT VERIFIED';
  fretSpan: number;
  bassPitchClassesOmitted: number[];
  pairEngine: 'realizeTriadPair' | 'reduction' | 'none';
  note: string;
}

export interface WpsVaultRequest {
  tonalityId: string;
  root: Spelled;
  technique: WpsVaultTechnique;
  fromBar: number;
  /** Bass pitch classes already sounding. Those classes are dropped from the guitar when they are shell tones. */
  bassPitchClasses?: number[];
  stringGroup?: WpsStringGroup;
  /** Guitar MusicXML octave-change. The Mirror is -1. Sounding MIDI is written MIDI plus this times 12. */
  octaveChange?: number;
  direction?: 'resolve' | 'depart';
  seed?: number;
}

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

function openMidi(stringNumber: number): number {
  const midi = GUITAR_OPEN_STRING_MIDIS[6 - stringNumber];
  if (midi === undefined) throw new Error(`string ${stringNumber}`);
  return midi;
}

function writtenOctave(soundingMidi: number, note: Spelled, octaveChange: number): number {
  const writtenMidi = soundingMidi - octaveChange * 12;
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[note.step]!;
  const raw = writtenMidi - natural - note.alter;
  if (raw % 12 !== 0) throw new Error(`${spellName(note)} is not written midi ${writtenMidi}`);
  return raw / 12 - 1;
}

interface FretPoint {
  note: Spelled;
  midi: number;
  stringNumber: number;
  fret: number;
}

function assignGroup(notes: Spelled[], midis: number[], group: readonly number[]): FretPoint[] | null {
  if (notes.length !== midis.length || notes.length > group.length) return null;
  const strings = [...group].sort((a, b) => b - a);
  const order = midis.map((midi, index) => ({ midi, index })).sort((a, b) => a.midi - b.midi);
  for (let start = 0; start + order.length <= strings.length; start += 1) {
    const chosen = strings.slice(start, start + order.length);
    const points: FretPoint[] = [];
    let ok = true;
    for (let i = 0; i < order.length; i += 1) {
      const item = order[i]!;
      const stringNumber = chosen[i]!;
      const fret = item.midi - openMidi(stringNumber);
      if (fret < 0 || fret > 15) {
        ok = false;
        break;
      }
      points.push({ note: notes[item.index]!, midi: item.midi, stringNumber, fret });
    }
    if (!ok) continue;
    const frets = points.map((point) => point.fret);
    if (Math.max(...frets) - Math.min(...frets) > 4) continue;
    return points;
  }
  return null;
}

function closeStack(notes: Spelled[], bottomMidi: number): { notes: Spelled[]; midis: number[] } | null {
  if (!notes.length) return null;
  if (mod12(bottomMidi) !== pitchClassOf(notes[0]!)) return null;
  const midis = [bottomMidi];
  const used = [notes[0]!];
  let cursor = bottomMidi;
  for (const note of notes.slice(1)) {
    const pc = pitchClassOf(note);
    let midi = cursor + mod12(pc - mod12(cursor));
    if (midi <= cursor) midi += 12;
    if (midi === cursor) continue;
    midis.push(midi);
    used.push(note);
    cursor = midi;
  }
  return { notes: used, midis };
}

function placeNotes(
  notes: Spelled[],
  group: WpsStringGroup,
  lowFloor: number,
  lowCeiling: number
): FretPoint[] | null {
  const strings = WPS_STRING_GROUPS[group];
  for (let bottom = lowFloor; bottom <= lowCeiling; bottom += 1) {
    if (mod12(bottom) !== pitchClassOf(notes[0]!)) continue;
    const stacked = closeStack(notes, bottom);
    if (!stacked) continue;
    const placed = assignGroup(stacked.notes, stacked.midis, strings);
    if (placed) return placed;
  }
  return null;
}

function toPitches(points: FretPoint[], octaveChange: number): WpsVaultPitch[] {
  return points
    .slice()
    .sort((a, b) => b.stringNumber - a.stringNumber)
    .map((point) => ({
      step: point.note.step,
      alter: point.note.alter,
      octave: writtenOctave(point.midi, point.note, octaveChange),
      midi: point.midi,
      stringNumber: point.stringNumber,
      fret: point.fret,
    }));
}

function spanOf(pitches: WpsVaultPitch[]): number {
  if (!pitches.length) return 0;
  const frets = pitches.map((pitch) => pitch.fret);
  return Math.max(...frets) - Math.min(...frets);
}

function feasible(events: WpsVaultEvent[]): boolean {
  return events.every((event) => {
    if (event.pitches.length < 2) return false;
    const check = assessGuitarFeasibility(event.pitches.map((pitch) => pitch.midi));
    return check.feasible && spanOf(event.pitches) <= 4;
  });
}

function omitBass(notes: Spelled[], bass: readonly number[], alwaysKeep: ReadonlySet<number>): Spelled[] {
  const dropped = new Set(bass.map((pc) => mod12(pc)));
  return notes.filter((note) => alwaysKeep.has(pitchClassOf(note)) || !dropped.has(pitchClassOf(note)));
}

function nearestTriadTone(triad: readonly Spelled[], tension: Spelled): Spelled {
  const tensionPc = pitchClassOf(tension);
  let best = triad[0]!;
  let bestDist = 99;
  let bestDown = 99;
  for (const tone of triad) {
    const down = mod12(tensionPc - pitchClassOf(tone));
    const dist = Math.min(down, 12 - down);
    if (dist === 0) continue;
    if (dist < bestDist || (dist === bestDist && down < bestDown)) {
      best = tone;
      bestDist = dist;
      bestDown = down;
    }
  }
  return best;
}

function event(
  bar: number,
  onset: number,
  duration: number,
  pitches: WpsVaultPitch[],
  technique: WpsVaultTechnique,
  held: string[],
  movingFrom?: string,
  movingTo?: string
): WpsVaultEvent {
  return { bar, onsetQuarters: onset, durationQuarters: duration, pitches, technique, held, movingFrom, movingTo };
}

function provenance(row: WpsVaultTonality): string {
  return `vol ${row.volume} ${row.symbol} theory ${row.pages.theory} guitar ${row.pages.guitar} pair ${row.pages.pair}`;
}

function requireRow(id: string): WpsVaultTonality {
  const row = wpsVaultTonality(id);
  if (!row) throw new Error(`unknown WPS vault tonality ${id}`);
  return row;
}

function atRoot(id: string, root: Spelled): WpsVaultTonality {
  return transposeVaultTonality(requireRow(id), root);
}

/** Three-note quadratonic fragment: tension replaces the nearest triad tone, then moves back. Two notes hold. */
export function liquidHarmonyCandidates(request: WpsVaultRequest): WpsVaultCandidateSet {
  const row = atRoot(request.tonalityId, request.root);
  const octaveChange = request.octaveChange ?? 0;
  const group = request.stringGroup ?? '3-2-1';
  const bass = (request.bassPitchClasses ?? []).map(mod12);
  const triad = row.melodicTriad.notes;
  const tension = row.primaryTension;
  const replaced = nearestTriadTone(triad, tension);
  const heldNotes = triad.filter((note) => pitchClassOf(note) !== pitchClassOf(replaced));
  const tensionStack = [...heldNotes, tension].sort((a, b) => pitchClassOf(a) - pitchClassOf(b));
  const resolvedStack = [...heldNotes, replaced].sort((a, b) => pitchClassOf(a) - pitchClassOf(b));
  const depart = request.direction === 'depart';
  const firstNotes = depart ? resolvedStack : tensionStack;
  const secondNotes = depart ? tensionStack : resolvedStack;
  const first = placeNotes(firstNotes, group, 52, 78);
  const second = placeNotes(secondNotes, group, 52, 78);
  if (!first || !second) {
    return empty(row, request, 'liquid', 'no string-group placement within four frets');
  }
  const held = heldNotes.map(spellName);
  const from = depart ? spellName(replaced) : spellName(tension);
  const to = depart ? spellName(tension) : spellName(replaced);
  const events = [
    event(request.fromBar, 0, 2, toPitches(first, octaveChange), 'liquid', held, from, to),
    event(request.fromBar, 2, 2, toPitches(second, octaveChange), 'liquid', held, from, to),
  ];
  return finish(row, request, 'liquid', events, bass, 'none', 'Two pitches hold. One pitch moves between the primary tension and the triad tone it replaced.');
}

/** Shell under the melodic triad, then the reductions a guitar can hold. */
export function shellAndTriadCandidates(request: WpsVaultRequest): WpsVaultCandidateSet {
  const row = atRoot(request.tonalityId, request.root);
  const octaveChange = request.octaveChange ?? 0;
  const bass = (request.bassPitchClasses ?? []).map(mod12);
  const bassSet = new Set(bass);
  const triadKept = row.melodicTriad.notes.filter((note) => !bassSet.has(pitchClassOf(note)));
  const upperSource = triadKept.length >= 2 ? triadKept : [...row.melodicTriad.notes];
  const shellKept = omitBass(row.shell, bass, new Set(upperSource.map(pitchClassOf)));
  const upper = placeNotes(upperSource, request.stringGroup ?? '3-2-1', 55, 80);
  const events: WpsVaultEvent[] = [];
  if (upper && upper.length >= 2) {
    events.push(event(request.fromBar, 0, 2, toPitches(upper, octaveChange), 'shell-triad', upperSource.map(spellName)));
  }
  const under = row.topDownUnderNote;
  if (under && !bassSet.has(pitchClassOf(under))) {
    const four = placeNotes([under, ...row.melodicTriad.notes], '5-4-3', 48, 72) ?? placeNotes([under, ...upperSource], '4-3-2', 52, 76);
    if (four && four.length >= 3 && four.length <= 4) {
      events.push(event(request.fromBar, 2, 2, toPitches(four, octaveChange), 'shell-triad', [spellName(under)]));
    }
  } else if (shellKept.length >= 2) {
    const partial = placeNotes(shellKept.slice(0, 3), '6-5-4', 40, 64);
    if (partial && partial.length >= 2) {
      events.push(event(request.fromBar, events.length ? 2 : 0, 2, toPitches(partial, octaveChange), 'shell-triad', shellKept.map(spellName)));
    }
  }
  if (!events.length) return empty(row, request, 'shell-triad', 'no shell or triad grip');
  return finish(row, request, 'shell-triad', events, bass, 'none', 'Upper structure is the melodic triad. The shell is not a second triad. Bass pitch classes are left out of the shell.');
}

export function reduceShellVersusTriad(request: WpsVaultRequest): WpsVaultCandidateSet {
  const row = atRoot(request.tonalityId, request.root);
  const octaveChange = request.octaveChange ?? 0;
  const bass = (request.bassPitchClasses ?? []).map(mod12);
  const bassSet = new Set(bass);
  const triad = row.melodicTriad.notes.filter((note) => !bassSet.has(pitchClassOf(note)));
  const source = triad.length >= 2 ? triad : [...row.melodicTriad.notes];
  const groups: WpsStringGroup[] = ['3-2-1', '4-3-2', '5-4-3', '6-5-4'];
  const events: WpsVaultEvent[] = [];
  const dyad = source.slice(0, 2);
  const triadTry = source.slice(0, 3);
  for (const group of groups) {
    const placed = placeNotes(triadTry.length >= 3 ? triadTry : dyad, group, 52, 80);
    if (placed && placed.length >= 2) {
      events.push(event(request.fromBar, events.length ? 2 : 0, 2, toPitches(placed, octaveChange), 'reduction', placed.map((point) => spellName(point.note))));
      break;
    }
  }
  if (dyad.length === 2) {
    const dyadPlace = placeNotes(dyad, '4-3-2', 52, 80) ?? placeNotes(dyad, '3-2-1', 52, 80);
    if (dyadPlace) {
      events.push(event(request.fromBar, events.length ? 2 : 0, 2, toPitches(dyadPlace, octaveChange), 'reduction', dyad.map(spellName)));
    }
  }
  if (!events.length) return empty(row, request, 'reduction', 'no dyad or triad on the four string groups');
  return finish(row, request, 'reduction', events.slice(0, 2), bass, 'reduction', 'Guitar keeps triad tones the bass is not already playing.');
}

function parentInput(item: VaultTriad, id: string): ParentTriadInput {
  return {
    id,
    rootSpelling: spellName(item.root),
    quality: item.quality,
    notes: item.notes.map(spellName) as [string, string, string],
    pitchClasses: item.notes.map(pitchClassOf) as [number, number, number],
    provenance: 'Vault',
  };
}

/** Resolution triad against the tension triad. Uses `realizeTriadPair` when that fret window can hold them. */
export function resolutionTensionCandidates(request: WpsVaultRequest): WpsVaultCandidateSet {
  const row = atRoot(request.tonalityId, request.root);
  const octaveChange = request.octaveChange ?? 0;
  const bass = (request.bassPitchClasses ?? []).map(mod12);
  const slots: LiquidSlot[] = [
    { bar: request.fromBar, duration: 'half', rest: false, kind: 'resolution' },
    { bar: request.fromBar, duration: 'half', rest: false, kind: 'move' },
  ];
  try {
    const realized = realizeTriadPair(
      parentInput(row.resolutionTriad, `${row.id}-resolution`),
      parentInput(row.tensionTriad, `${row.id}-tension`),
      request.seed ?? 13033,
      slots
    );
    const events: WpsVaultEvent[] = [];
    let onset = 0;
    for (const item of realized.events) {
      if (!item.voicing || item.voicing.points.length < 2) continue;
      const duration = item.duration === 'whole' ? 4 : item.duration === 'half' ? 2 : item.duration === 'quarter' ? 1 : 2;
      const pitches: WpsVaultPitch[] = item.voicing.points.map((point) => ({
        step: point.step,
        alter: point.alter,
        octave: point.octave - octaveChange,
        midi: point.midi,
        stringNumber: point.stringNumber,
        fret: point.fret,
      }));
      const movement = realized.movements[0];
      events.push(
        event(
          item.bar,
          onset,
          duration,
          pitches,
          'triad-pair',
          movement?.held.map((held) => held.name) ?? [],
          movement?.moved[0]?.from,
          movement?.moved[0]?.to
        )
      );
      onset += duration;
    }
    if (events.length >= 2 && events.every((item) => item.pitches.length >= 2)) {
      return finish(
        row,
        request,
        'triad-pair',
        events,
        bass,
        'realizeTriadPair',
        'Resolution triad is the right-hand triad. Tension triad is the bebop passing-tone triad. The shell is not either of them.'
      );
    }
  } catch {
    // The pair search is limited to fret 7 and span 3. Fall through to a fretted reduction.
  }
  const resolution = placeNotes([...row.resolutionTriad.notes], '3-2-1', 52, 80);
  const tension = placeNotes([...row.tensionTriad.notes], '3-2-1', 52, 80);
  if (!resolution || !tension) return empty(row, request, 'triad-pair', 'pair could not be fretted on strings 3-2-1');
  const events = [
    event(request.fromBar, 0, 2, toPitches(resolution, octaveChange), 'triad-pair', []),
    event(request.fromBar, 2, 2, toPitches(tension, octaveChange), 'triad-pair', []),
  ];
  return finish(row, request, 'triad-pair', events, bass, 'reduction', 'realizeTriadPair declined this register. These are still simultaneous triad attacks, not an arpeggio.');
}

export function proposeWpsVaultPassage(request: WpsVaultRequest): WpsVaultCandidateSet {
  if (request.technique === 'liquid') return liquidHarmonyCandidates(request);
  if (request.technique === 'triad-pair') return resolutionTensionCandidates(request);
  if (request.technique === 'reduction') return reduceShellVersusTriad(request);
  if (request.technique === 'shell-triad') return shellAndTriadCandidates(request);
  return empty(requireRow(request.tonalityId), request, request.technique, 'line and rest spans do not ask the vault for chords');
}

function empty(
  row: WpsVaultTonality,
  request: WpsVaultRequest,
  technique: WpsVaultTechnique,
  note: string
): WpsVaultCandidateSet {
  return {
    tonalityId: row.id,
    volume: row.volume,
    root: spellName(request.root),
    technique,
    events: [],
    provenance: provenance(row),
    technicalFeasible: false,
    humanPlayability: 'NOT VERIFIED',
    fretSpan: 0,
    bassPitchClassesOmitted: (request.bassPitchClasses ?? []).map(mod12),
    pairEngine: 'none',
    note,
  };
}

function finish(
  row: WpsVaultTonality,
  request: WpsVaultRequest,
  technique: WpsVaultTechnique,
  events: WpsVaultEvent[],
  bass: number[],
  pairEngine: WpsVaultCandidateSet['pairEngine'],
  note: string
): WpsVaultCandidateSet {
  const spans = events.map(spanOf);
  return {
    tonalityId: row.id,
    volume: row.volume,
    root: spellName(request.root),
    technique,
    events,
    provenance: provenance(row),
    technicalFeasible: feasible(events),
    humanPlayability: 'NOT VERIFIED',
    fretSpan: spans.length ? Math.max(...spans) : 0,
    bassPitchClassesOmitted: bass,
    pairEngine,
    note,
  };
}

/**
 * The Mirror, bars 30–33. Bass pitch class B. Volume 7 maj7 on B.
 * Not a performance edition. Bar 34 is not generated.
 */
export function proposeMirrorBars30to33(bassPitchClass: number): WpsVaultCandidateSet {
  const root: Spelled = { step: 'B', alter: 0 };
  if (mod12(bassPitchClass) !== pitchClassOf(root)) {
    const row = requireRow('maj7');
    return empty(row, { tonalityId: 'maj7', root, technique: 'liquid', fromBar: 30 }, 'liquid', 'bass pitch class is not B');
  }
  const liquid = liquidHarmonyCandidates({
    tonalityId: 'maj7',
    root,
    technique: 'liquid',
    fromBar: 30,
    bassPitchClasses: [bassPitchClass],
    stringGroup: '3-2-1',
    octaveChange: -1,
    direction: 'resolve',
  });
  const reverse = liquidHarmonyCandidates({
    tonalityId: 'maj7',
    root,
    technique: 'liquid',
    fromBar: 33,
    bassPitchClasses: [bassPitchClass],
    stringGroup: '3-2-1',
    octaveChange: -1,
    direction: 'depart',
  });
  const attack = liquid.events[0];
  const resolution = liquid.events[1];
  const depart = reverse.events[0];
  const departLand = reverse.events[1];
  if (!attack || !resolution || !depart || !departLand) {
    return { ...liquid, events: [], technicalFeasible: false, note: 'liquid placement failed for bars 30-33' };
  }
  const token = (pitch: WpsVaultPitch) =>
    `${pitch.step}${pitch.alter < 0 ? 'b'.repeat(-pitch.alter) : pitch.alter > 0 ? '#'.repeat(pitch.alter) : ''}`;
  const dyad = resolution.pitches.filter((pitch) => resolution.held.includes(token(pitch)));
  const events: WpsVaultEvent[] = [
    attack,
    resolution,
    { ...resolution, bar: 31, onsetQuarters: 0, durationQuarters: 4 },
    {
      ...resolution,
      bar: 32,
      onsetQuarters: 0,
      durationQuarters: 4,
      pitches: dyad.length >= 2 ? dyad : resolution.pitches,
      technique: 'reduction',
    },
    { ...depart, bar: 33, onsetQuarters: 0, durationQuarters: 2 },
    { ...departLand, bar: 33, onsetQuarters: 2, durationQuarters: 2 },
  ];
  return {
    ...liquid,
    events,
    technicalFeasible: feasible(events),
    note: 'Bars 30-33 only. Bmaj7, melodic triad D# minor, primary tension G#. Bass B is not doubled. Bar 34 is not written.',
    pairEngine: 'none',
  };
}

function accidental(alter: number): string {
  if (alter === 0) return '';
  return `<alter>${alter}</alter>`;
}

function noteXml(pitch: WpsVaultPitch, duration: number, type: string, chord: boolean): string {
  return [
    '<note>',
    chord ? '<chord/>' : '',
    `<pitch><step>${pitch.step}</step>${accidental(pitch.alter)}<octave>${pitch.octave}</octave></pitch>`,
    `<duration>${duration}</duration>`,
    `<type>${type}</type>`,
    '</note>',
  ]
    .filter(Boolean)
    .join('');
}

function typeFor(quarters: number): { duration: number; type: string } {
  if (quarters === 4) return { duration: 1024, type: 'whole' };
  if (quarters === 2) return { duration: 512, type: 'half' };
  if (quarters === 1) return { duration: 256, type: 'quarter' };
  throw new Error(`unsupported duration ${quarters}`);
}

/** Four-bar fixture. Bass is the locked B context. This is not a performance edition. */
export function mirrorBars30to33MusicXml(candidate: WpsVaultCandidateSet): string {
  const byBar = new Map<number, WpsVaultEvent[]>();
  for (const item of candidate.events) {
    const list = byBar.get(item.bar) ?? [];
    list.push(item);
    byBar.set(item.bar, list);
  }
  const guitarMeasures = [30, 31, 32, 33].map((bar, index) => {
    const events = (byBar.get(bar) ?? []).slice().sort((a, b) => a.onsetQuarters - b.onsetQuarters);
    const notes = events
      .map((item) => {
        const kind = typeFor(item.durationQuarters);
        return item.pitches.map((pitch, pitchIndex) => noteXml(pitch, kind.duration, kind.type, pitchIndex > 0)).join('');
      })
      .join('');
    const attributes =
      index === 0
        ? '<attributes><divisions>256</divisions><key><fifths>-3</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef><transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes>'
        : '';
    return `<measure number="${bar}">${attributes}${notes}</measure>`;
  });
  const bass = [
    '<measure number="30"><attributes><divisions>256</divisions><key><fifths>-3</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>F</sign><line>4</line></clef><transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes><note><pitch><step>B</step><octave>2</octave></pitch><duration>1024</duration><type>whole</type></note></measure>',
    '<measure number="31"><note><rest/><duration>1024</duration><type>whole</type></note></measure>',
    '<measure number="32"><note><rest/><duration>512</duration><type>half</type></note><note><pitch><step>B</step><octave>2</octave></pitch><duration>512</duration><type>half</type></note></measure>',
    '<measure number="33"><note><rest/><duration>1024</duration><type>whole</type></note></measure>',
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>The Mirror bars 30-33 WPS V1.3 candidate fixture</work-title></work>
  <identification><creator type="composer">WPS V1.3 candidate. Not a performance edition.</creator></identification>
  <part-list>
    <score-part id="P1"><part-name>Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1">${guitarMeasures.join('')}</part>
  <part id="P2">${bass.join('')}</part>
</score-partwise>
`;
}
