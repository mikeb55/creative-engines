/**
 * Black Aura V8B piece-specific liquid-harmony recipe.
 * Option B only: D minor resolution parent, Ab major tension parent.
 * Not a Tonality Vault row and not a BHL rule.
 */

export const V8B_SEED = 80082;

export const V8B_PARENTS = {
  resolution: {
    id: 'D_minor' as const,
    spelling: 'D F A',
    pitchClasses: [2, 5, 9] as const,
  },
  tension: {
    id: 'Ab_major' as const,
    spelling: 'Ab C Eb',
    pitchClasses: [8, 0, 3] as const,
  },
};

/** Standard tuning, sounding MIDI of open strings. Index 0 is string 1 (high E). */
export const V8B_OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40] as const;

export const V8B_MAX_FRET = 7;
export const V8B_MAX_STOPPED_SPAN = 3;

const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export type V8bParentId = 'D_minor' | 'Ab_major';
export type V8bDuration = 'whole' | 'half' | 'quarter' | 'quarter.' | 'eighth';

export interface V8bPitch {
  name: string;
  step: string;
  alter: number;
  /** Sounding octave. The leadsheet writes guitar one octave higher. */
  octave: number;
  midi: number;
  parents: V8bParentId[];
}

export interface V8bFretPoint {
  pitch: V8bPitch;
  stringNumber: number;
  fret: number;
}

export interface V8bGrip {
  id: string;
  role: 'D_minor_fragment' | 'Ab_major_fragment' | 'mixed_fragment' | 'single';
  points: V8bFretPoint[];
  stoppedSpan: number;
  proposed: boolean;
  corrected: boolean;
}

export interface V8bTimelineEvent {
  bar: number;
  duration: V8bDuration;
  rest: boolean;
  gripId?: string;
  /** Source-cell development tag. Empty when the event is only liquid colour. */
  motif?: 'F-Ab' | 'Eb-D' | 'F-Eb';
}

export interface V8bVoiceMovement {
  id: string;
  fromGripId: string;
  toGripId: string;
  held: string;
  movedFrom: string;
  movedTo: string;
  semitones: number;
  movedString: number;
  fromFret: number;
  toFret: number;
  heldString: number;
  heldFret: number;
}

interface ProposedGrip {
  id: string;
  intended: string[];
  points: Array<{ stringNumber: number; fret: number }>;
  proposed: boolean;
}

export function midiOf(step: string, alter: number, octave: number): number {
  const natural = NATURAL[step];
  if (natural === undefined) throw new Error(`bad step ${step}`);
  return (octave + 1) * 12 + natural + alter;
}

export function pitchName(step: string, alter: number, octave: number): string {
  const accidental = alter < 0 ? 'b'.repeat(-alter) : alter > 0 ? '#'.repeat(alter) : '';
  return `${step}${accidental}${octave}`;
}

export function soundingFromStringFret(stringNumber: number, fret: number): { step: string; alter: number; octave: number; midi: number; name: string } {
  if (stringNumber < 1 || stringNumber > 6) throw new Error(`string ${stringNumber} out of range`);
  if (fret < 0 || fret > V8B_MAX_FRET) throw new Error(`fret ${fret} outside 0–${V8B_MAX_FRET}`);
  const open = V8B_OPEN_STRING_MIDI[stringNumber - 1];
  if (open === undefined) throw new Error(`no open pitch for string ${stringNumber}`);
  const midi = open + fret;
  const pc = ((midi % 12) + 12) % 12;
  const spell: ReadonlyArray<readonly [string, number]> = [
    ['C', 0],
    ['Db', -1],
    ['D', 0],
    ['Eb', -1],
    ['E', 0],
    ['F', 0],
    ['F#', 1],
    ['G', 0],
    ['Ab', -1],
    ['A', 0],
    ['Bb', -1],
    ['B', 0],
  ];
  const row = spell[pc];
  if (!row) throw new Error(`no spelling for ${midi}`);
  const step = row[0].slice(0, 1);
  const alter = row[1];
  const octave = Math.floor(midi / 12) - 1;
  return { step, alter, octave, midi, name: pitchName(step, alter, octave) };
}

export function parentsForMidi(midi: number): V8bParentId[] {
  const pc = ((midi % 12) + 12) % 12;
  const parents: V8bParentId[] = [];
  if ((V8B_PARENTS.resolution.pitchClasses as readonly number[]).includes(pc)) parents.push('D_minor');
  if ((V8B_PARENTS.tension.pitchClasses as readonly number[]).includes(pc)) parents.push('Ab_major');
  if (!parents.length) throw new Error(`pitch class ${pc} is outside the D minor / Ab major pair`);
  return parents;
}

export function stoppedSpan(frets: readonly number[]): number {
  const stopped = frets.filter((fret) => fret > 0);
  if (stopped.length < 2) return 0;
  return Math.max(...stopped) - Math.min(...stopped);
}

function pitchFromMidi(midi: number): V8bPitch {
  const pc = ((midi % 12) + 12) % 12;
  const spell: ReadonlyArray<readonly [string, number]> = [
    ['C', 0],
    ['D', -1],
    ['D', 0],
    ['E', -1],
    ['E', 0],
    ['F', 0],
    ['F', 1],
    ['G', 0],
    ['A', -1],
    ['A', 0],
    ['B', -1],
    ['B', 0],
  ];
  const row = spell[pc];
  if (!row) throw new Error(`no spelling for ${midi}`);
  const octave = Math.floor(midi / 12) - 1;
  return {
    name: pitchName(row[0], row[1], octave),
    step: row[0],
    alter: row[1],
    octave,
    midi,
    parents: parentsForMidi(midi),
  };
}

function roleFor(points: readonly V8bFretPoint[]): V8bGrip['role'] {
  if (points.length === 1) return 'single';
  const parents = new Set(points.flatMap((point) => point.pitch.parents));
  if (parents.size === 1 && parents.has('D_minor')) return 'D_minor_fragment';
  if (parents.size === 1 && parents.has('Ab_major')) return 'Ab_major_fragment';
  if (parents.has('D_minor') && parents.has('Ab_major')) return 'mixed_fragment';
  throw new Error('dyad provenance is not a parent fragment or a mixed fragment');
}

/** Search frets 0–7 for the intended sounding notes. Prefer the proposed fingers when they already match. */
function resolveGrip(proposed: ProposedGrip): V8bGrip {
  const intendedMidi = new Map<string, number>();
  for (const name of proposed.intended) {
    const match = /^([A-G])([b#]*)(\d)$/.exec(name);
    if (!match) throw new Error(`bad pitch name ${name}`);
    const alter = match[2] === 'b' ? -match[2].length : match[2] === '#' ? match[2].length : 0;
    intendedMidi.set(name, midiOf(match[1]!, alter, Number(match[3])));
  }
  const proposedSounding = proposed.points.map((point) => soundingFromStringFret(point.stringNumber, point.fret));
  const proposedNames = proposedSounding.map((pitch) => pitch.name);
  const proposedOk =
    proposedNames.length === proposed.intended.length &&
    proposed.intended.every((name, index) => name === proposedNames[index]) &&
    new Set(proposed.points.map((point) => point.stringNumber)).size === proposed.points.length &&
    stoppedSpan(proposed.points.map((point) => point.fret)) <= V8B_MAX_STOPPED_SPAN;

  const chosen = proposedOk
    ? proposed.points.map((point, index) => ({
        pitch: pitchFromMidi(proposedSounding[index]!.midi),
        stringNumber: point.stringNumber,
        fret: point.fret,
      }))
    : findPlayable(proposed.intended.map((name) => intendedMidi.get(name)!));

  if (!proposedOk && !chosen) {
    throw new Error(`no playable grip for ${proposed.id}: ${proposed.intended.join(' / ')}`);
  }
  const points = chosen!;
  if (points.length >= 2 && points[0]!.pitch.midi > points[1]!.pitch.midi) {
    throw new Error(`${proposed.id} is not low-to-high`);
  }
  return {
    id: proposed.id,
    role: roleFor(points),
    points,
    stoppedSpan: stoppedSpan(points.map((point) => point.fret)),
    proposed: proposed.proposed,
    corrected: !proposedOk,
  };
}

function findPlayable(midis: number[]): V8bFretPoint[] | null {
  const choices = midis.map((midi) => {
    const found: V8bFretPoint[] = [];
    for (let stringNumber = 1; stringNumber <= 6; stringNumber += 1) {
      const open = V8B_OPEN_STRING_MIDI[stringNumber - 1]!;
      const fret = midi - open;
      if (fret < 0 || fret > V8B_MAX_FRET) continue;
      found.push({ pitch: pitchFromMidi(midi), stringNumber, fret });
    }
    return found;
  });
  if (choices.some((row) => row.length === 0)) return null;
  const spanLimit = V8B_MAX_STOPPED_SPAN;
  if (midis.length === 1) return [choices[0]![0]!];
  let best: V8bFretPoint[] | null = null;
  for (const low of choices[0]!) {
    for (const high of choices[1]!) {
      if (low.stringNumber === high.stringNumber) continue;
      if (stoppedSpan([low.fret, high.fret]) > spanLimit) continue;
      const pair = low.pitch.midi <= high.pitch.midi ? [low, high] : [high, low];
      if (!best || pair[0]!.stringNumber + pair[1]!.stringNumber < best[0]!.stringNumber + best[1]!.stringNumber) {
        best = pair;
      }
    }
  }
  return best;
}

/**
 * Proposed Option B fingers. Sounding pitch is calculated from string + fret.
 * These are hypotheses until resolveGrip accepts them.
 */
const PROPOSED_GRIPS: ProposedGrip[] = [
  {
    id: 'D4-A4',
    intended: ['D4', 'A4'],
    points: [
      { stringNumber: 2, fret: 3 },
      { stringNumber: 1, fret: 5 },
    ],
    proposed: true,
  },
  {
    id: 'D4-Ab4',
    intended: ['D4', 'Ab4'],
    points: [
      { stringNumber: 2, fret: 3 },
      { stringNumber: 1, fret: 4 },
    ],
    proposed: true,
  },
  {
    id: 'Eb4-Ab4',
    intended: ['Eb4', 'Ab4'],
    points: [
      { stringNumber: 2, fret: 4 },
      { stringNumber: 1, fret: 4 },
    ],
    proposed: true,
  },
  {
    id: 'F4-Ab4',
    intended: ['F4', 'Ab4'],
    points: [
      { stringNumber: 2, fret: 6 },
      { stringNumber: 1, fret: 4 },
    ],
    proposed: false,
  },
  { id: 'F4', intended: ['F4'], points: [{ stringNumber: 2, fret: 6 }], proposed: false },
  { id: 'Ab4', intended: ['Ab4'], points: [{ stringNumber: 1, fret: 4 }], proposed: false },
  { id: 'Eb4', intended: ['Eb4'], points: [{ stringNumber: 2, fret: 4 }], proposed: false },
  { id: 'D4', intended: ['D4'], points: [{ stringNumber: 2, fret: 3 }], proposed: false },
];

export const V8B_GRIPS: V8bGrip[] = PROPOSED_GRIPS.map(resolveGrip);

export function gripById(id: string): V8bGrip {
  const grip = V8B_GRIPS.find((item) => item.id === id);
  if (!grip) throw new Error(`missing grip ${id}`);
  return grip;
}

/** Four bars. Not a loop of the three demonstration grips. */
export const V8B_TIMELINE: V8bTimelineEvent[] = [
  { bar: 1, duration: 'quarter', rest: true },
  { bar: 1, duration: 'eighth', rest: false, gripId: 'D4-A4' },
  { bar: 1, duration: 'quarter.', rest: false, gripId: 'D4-Ab4' },
  { bar: 1, duration: 'quarter', rest: true },
  { bar: 2, duration: 'quarter', rest: true },
  { bar: 2, duration: 'eighth', rest: false, gripId: 'F4', motif: 'F-Ab' },
  { bar: 2, duration: 'eighth', rest: false, gripId: 'Ab4', motif: 'F-Ab' },
  { bar: 2, duration: 'quarter', rest: true },
  { bar: 2, duration: 'eighth', rest: false, gripId: 'Eb4', motif: 'Eb-D' },
  { bar: 2, duration: 'eighth', rest: false, gripId: 'D4', motif: 'Eb-D' },
  { bar: 3, duration: 'half', rest: true },
  { bar: 3, duration: 'eighth', rest: false, gripId: 'D4-Ab4' },
  { bar: 3, duration: 'quarter', rest: false, gripId: 'Eb4-Ab4' },
  { bar: 3, duration: 'eighth', rest: true },
  { bar: 4, duration: 'quarter', rest: true },
  { bar: 4, duration: 'eighth', rest: false, gripId: 'F4-Ab4', motif: 'F-Ab' },
  { bar: 4, duration: 'eighth', rest: true },
  { bar: 4, duration: 'eighth', rest: false, gripId: 'Eb4', motif: 'F-Eb' },
  { bar: 4, duration: 'quarter', rest: true },
  { bar: 4, duration: 'eighth', rest: false, gripId: 'Ab4' },
];

export const V8B_VOICE_MOVEMENTS: V8bVoiceMovement[] = [
  {
    id: 'A4-to-Ab4',
    fromGripId: 'D4-A4',
    toGripId: 'D4-Ab4',
    held: 'D4',
    movedFrom: 'A4',
    movedTo: 'Ab4',
    semitones: -1,
    movedString: 1,
    fromFret: 5,
    toFret: 4,
    heldString: 2,
    heldFret: 3,
  },
  {
    id: 'D4-to-Eb4',
    fromGripId: 'D4-Ab4',
    toGripId: 'Eb4-Ab4',
    held: 'Ab4',
    movedFrom: 'D4',
    movedTo: 'Eb4',
    semitones: 1,
    movedString: 2,
    fromFret: 3,
    toFret: 4,
    heldString: 1,
    heldFret: 4,
  },
];

export function assertParentsDisjoint(): void {
  const left = new Set<number>(V8B_PARENTS.resolution.pitchClasses);
  for (const pc of V8B_PARENTS.tension.pitchClasses) {
    if (left.has(pc)) throw new Error(`shared pitch class ${pc}`);
  }
}

export function assertRecipePlayable(): void {
  assertParentsDisjoint();
  for (const grip of V8B_GRIPS) {
    if (grip.stoppedSpan > V8B_MAX_STOPPED_SPAN) throw new Error(`${grip.id} span ${grip.stoppedSpan}`);
    const strings = new Set<number>();
    for (const point of grip.points) {
      const sounded = soundingFromStringFret(point.stringNumber, point.fret);
      if (sounded.midi !== point.pitch.midi || sounded.name !== point.pitch.name) {
        throw new Error(`${grip.id} fret does not sound ${point.pitch.name}`);
      }
      if (strings.has(point.stringNumber)) throw new Error(`${grip.id} stacks two notes on one string`);
      strings.add(point.stringNumber);
    }
    if (grip.points.length === 2 && grip.role === 'single') throw new Error(`${grip.id} role`);
    if (grip.points.length === 1 && grip.role !== 'single') throw new Error(`${grip.id} role`);
  }
  const attacks = [0, 0, 0, 0];
  for (const event of V8B_TIMELINE) {
    if (!event.rest) attacks[event.bar - 1]! += 1;
  }
  if (attacks.some((count) => count > 4)) throw new Error(`attack counts ${attacks.join(',')}`);
  const pitched = V8B_TIMELINE.filter((event) => !event.rest);
  const pair = (index: number) => pitched[index]?.gripId;
  if (pair(0) !== 'D4-A4' || pair(1) !== 'D4-Ab4') throw new Error('transition 1 is not adjacent');
  if (pair(6) !== 'D4-Ab4' || pair(7) !== 'Eb4-Ab4') throw new Error('transition 2 is not adjacent');
}
