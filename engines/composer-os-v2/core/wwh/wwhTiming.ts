/**
 * Quarter-note timing for WWH MusicXML.
 * Generated durations are rational fractions of a quarter, then scaled to the
 * score's divisions. 256 is only the curated Black Aura grid.
 */

import type { WwhAtom } from './wwhPerformanceTypes';

export interface WwhRational {
  n: number;
  d: number;
}

export interface WwhTempoMark {
  beatUnit: string | null;
  dots: number;
  perMinute: string | null;
  soundTempo: string | null;
}

export interface WwhTimeModification {
  actualNotes: number;
  normalNotes: number;
  normalType: string;
}

const TYPE_QUARTERS: Record<string, WwhRational> = {
  maxima: { n: 32, d: 1 },
  long: { n: 16, d: 1 },
  breve: { n: 8, d: 1 },
  whole: { n: 4, d: 1 },
  half: { n: 2, d: 1 },
  quarter: { n: 1, d: 1 },
  eighth: { n: 1, d: 2 },
  '16th': { n: 1, d: 4 },
  '32nd': { n: 1, d: 8 },
  '64th': { n: 1, d: 16 },
};

const FILL_LADDER: Array<{ quarters: WwhRational; type: string; dots: number }> = [
  { quarters: { n: 4, d: 1 }, type: 'whole', dots: 0 },
  { quarters: { n: 3, d: 1 }, type: 'half', dots: 1 },
  { quarters: { n: 2, d: 1 }, type: 'half', dots: 0 },
  { quarters: { n: 3, d: 2 }, type: 'quarter', dots: 1 },
  { quarters: { n: 1, d: 1 }, type: 'quarter', dots: 0 },
  { quarters: { n: 3, d: 4 }, type: 'eighth', dots: 1 },
  { quarters: { n: 1, d: 2 }, type: 'eighth', dots: 0 },
  { quarters: { n: 3, d: 8 }, type: '16th', dots: 1 },
  { quarters: { n: 1, d: 4 }, type: '16th', dots: 0 },
];

export function wwhReduce(n: number, d: number): WwhRational {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = wwhGcd(Math.abs(n), Math.abs(d));
  return { n: n / g, d: d / g };
}

export function wwhGcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

export function wwhAdd(a: WwhRational, b: WwhRational): WwhRational {
  return wwhReduce(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function wwhSub(a: WwhRational, b: WwhRational): WwhRational {
  return wwhReduce(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function wwhCmp(a: WwhRational, b: WwhRational): number {
  return a.n * b.d - b.n * a.d;
}

export function barQuarters(beats: number, beatType: number): WwhRational {
  return wwhReduce(beats * 4, beatType);
}

/** Integer MusicXML duration, or null when the rational does not land on this grid. */
export function quartersToDivisions(quarters: WwhRational, divisions: number): number | null {
  if (!Number.isInteger(divisions) || divisions <= 0) return null;
  const num = divisions * quarters.n;
  if (num % quarters.d !== 0) return null;
  return num / quarters.d;
}

export function wwhBarTicksExact(beats: number, beatType: number, divisions: number): number | null {
  return quartersToDivisions(barQuarters(beats, beatType), divisions);
}

export function typeQuarters(type: string, dots: number, timeModification?: WwhTimeModification | null): WwhRational | null {
  const base = TYPE_QUARTERS[type];
  if (!base) return null;
  let n = base.n;
  let d = base.d;
  if (dots > 0) {
    const factor = 2 ** (dots + 1) - 1;
    n *= factor;
    d *= 2 ** dots;
  }
  if (timeModification && timeModification.actualNotes > 0 && timeModification.normalNotes > 0) {
    n *= timeModification.normalNotes;
    d *= timeModification.actualNotes;
  }
  return wwhReduce(n, d);
}

export function expectedDuration(
  divisions: number,
  type: string,
  dots: number,
  timeModification?: WwhTimeModification | null
): number | null {
  const quarters = typeQuarters(type, dots, timeModification);
  if (!quarters) return null;
  return quartersToDivisions(quarters, divisions);
}

export type WwhDurationAgreement = 'ok' | 'rounded-tuplet' | 'mismatch' | 'untyped';

export function durationAgreement(
  divisions: number,
  type: string | undefined,
  dots: number,
  duration: number,
  timeModification?: WwhTimeModification | null
): WwhDurationAgreement {
  if (!type) return 'untyped';
  const expected = expectedDuration(divisions, type, dots, timeModification);
  if (expected === null) {
    if (timeModification) {
      const quarters = typeQuarters(type, dots, timeModification);
      if (!quarters) return 'mismatch';
      const nearest = Math.round((divisions * quarters.n) / quarters.d);
      if (Math.abs(duration - nearest) <= 1) return 'rounded-tuplet';
    }
    return 'mismatch';
  }
  if (duration === expected) return 'ok';
  if (timeModification && Math.abs(duration - expected) <= 1) return 'rounded-tuplet';
  return 'mismatch';
}

/** Beat a generated bar should state first: dotted quarter in 6/8 and 12/8, eighth in 7/8, quarter otherwise. */
export function primaryBeat(beats: number, beatType: number): WwhRational {
  if (beatType === 8 && beats % 3 === 0) return { n: 3, d: 2 };
  if (beatType === 8) return { n: 1, d: 2 };
  if (beatType === 2) return { n: 2, d: 1 };
  if (beatType === 1) return { n: 4, d: 1 };
  return { n: 1, d: 1 };
}

export function fillQuarters(total: WwhRational, divisions: number, rest: boolean, pitch?: Pick<WwhAtom, 'step' | 'alter' | 'octave'>): WwhAtom[] | null {
  if (wwhCmp(total, { n: 0, d: 1 }) < 0) return null;
  if (wwhCmp(total, { n: 0, d: 1 }) === 0) return [];
  const out: WwhAtom[] = [];
  let left = total;
  for (const piece of FILL_LADDER) {
    while (wwhCmp(left, piece.quarters) >= 0) {
      const ticks = quartersToDivisions(piece.quarters, divisions);
      if (ticks === null) return null;
      const atom: WwhAtom = {
        rest,
        divisions: ticks,
        type: piece.type,
        dots: piece.dots,
      };
      if (!rest && pitch && out.length === 0) {
        atom.step = pitch.step;
        atom.alter = pitch.alter;
        atom.octave = pitch.octave;
      } else if (!rest && out.length > 0) {
        return null;
      }
      out.push(atom);
      left = wwhSub(left, piece.quarters);
    }
  }
  if (wwhCmp(left, { n: 0, d: 1 }) !== 0) return null;
  if (!rest && out.length > 1) return null;
  return out;
}

export function soundingThenRest(
  bar: WwhRational,
  sounding: WwhRational,
  divisions: number,
  pitch: Pick<WwhAtom, 'step' | 'alter' | 'octave'>
): WwhAtom[] | null {
  if (wwhCmp(sounding, bar) > 0) return null;
  const head = fillQuarters(sounding, divisions, false, pitch);
  if (!head || head.length !== 1) return null;
  const tail = fillQuarters(wwhSub(bar, sounding), divisions, true);
  if (!tail) return null;
  return [...head, ...tail];
}

/** Prefer the metre's beat. Step down the ladder until the bar can be filled. */
export function beatOrSmallerLine(
  beats: number,
  beatType: number,
  divisions: number,
  pitch: Pick<WwhAtom, 'step' | 'alter' | 'octave'> | null
): WwhAtom[] | null {
  const bar = barQuarters(beats, beatType);
  if (quartersToDivisions(bar, divisions) === null) return null;
  if (!pitch) return fillQuarters(bar, divisions, true);
  const beat = primaryBeat(beats, beatType);
  const candidates = [beat, ...FILL_LADDER.map((piece) => piece.quarters)].filter(
    (quarters, index, list) => list.findIndex((item) => item.n === quarters.n && item.d === quarters.d) === index
  );
  for (const sounding of candidates) {
    if (wwhCmp(sounding, bar) > 0) continue;
    const line = soundingThenRest(bar, sounding, divisions, pitch);
    if (line) return line;
  }
  return null;
}

export function beatUnitQuarters(beatUnit: string, dots: number): WwhRational | null {
  return typeQuarters(beatUnit, dots, null);
}

/**
 * MusicXML sound tempo is quarter notes per minute.
 * Dotted-quarter = 78 stays dotted-quarter = 78 on the metronome.
 * The sound value is 117, not 78.
 */
export function quarterPerMinute(mark: WwhTempoMark): string | null {
  if (mark.beatUnit && mark.perMinute) {
    const unit = beatUnitQuarters(mark.beatUnit, mark.dots);
    const pm = Number(mark.perMinute);
    if (!unit || !Number.isFinite(pm)) return mark.soundTempo;
    const qpm = (pm * unit.n) / unit.d;
    if (mark.soundTempo) {
      const stated = Number(mark.soundTempo);
      const naiveCopy = mark.dots > 0 && stated === pm;
      if (!naiveCopy && Number.isFinite(stated)) return trimNumber(stated);
      if (naiveCopy) return trimNumber(qpm);
    }
    return trimNumber(qpm);
  }
  return mark.soundTempo;
}

export function tempoKey(mark: WwhTempoMark | null | undefined): string {
  if (!mark) return '';
  return `${mark.beatUnit ?? ''}|${mark.dots}|${mark.perMinute ?? ''}|${quarterPerMinute(mark) ?? ''}`;
}

export function tempoDirectionXml(mark: WwhTempoMark): string {
  const sound = quarterPerMinute(mark);
  const soundXml = sound ? `<sound tempo="${sound}"/>` : '';
  if (mark.beatUnit && mark.perMinute) {
    const dots = mark.dots > 0 ? '<beat-unit-dot/>'.repeat(mark.dots) : '';
    return `<direction placement="above"><direction-type><metronome><beat-unit>${mark.beatUnit}</beat-unit>${dots}<per-minute>${mark.perMinute}</per-minute></metronome></direction-type>${soundXml}</direction>`;
  }
  if (!sound) return '';
  return `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${sound}</per-minute></metronome></direction-type>${soundXml}</direction>`;
}

function trimNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000);
}
