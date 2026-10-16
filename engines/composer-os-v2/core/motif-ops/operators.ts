/**
 * One deterministic implementation of the 19 motivic operators.
 * No randomness. Rests stay. Out-of-field pitches stay and are named.
 */

import {
  lineageSuffix,
  type Motif,
  type MotifNoteEvent,
  type OperatorId,
  type OperatorResult,
  type TransformStep,
} from './types';

export type OperatorParams = Record<string, number | string>;

function num(params: OperatorParams | undefined, key: string, fallback: number): number {
  const value = params?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function copyEvents(events: readonly MotifNoteEvent[]): MotifNoteEvent[] {
  return events.map((event) => ({ onset: event.onset, duration: event.duration, midi: event.midi }));
}

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function normalField(field: readonly number[] | undefined): number[] | null {
  if (!field || field.length === 0) return null;
  const unique = [...new Set(field.map(mod12))].sort((a, b) => a - b);
  return unique.length > 0 ? unique : null;
}

function fieldIndex(midi: number, field: readonly number[]): number | null {
  const degree = field.indexOf(mod12(midi));
  if (degree < 0) return null;
  return Math.floor(midi / 12) * field.length + degree;
}

function midiFromFieldIndex(index: number, field: readonly number[]): number {
  const span = field.length;
  const octave = Math.floor(index / span);
  const degree = index - octave * span;
  return octave * 12 + field[degree]!;
}

function retime(events: readonly MotifNoteEvent[], origin = 0): MotifNoteEvent[] {
  let cursor = origin;
  return events.map((event) => {
    const next = { onset: cursor, duration: event.duration, midi: event.midi };
    cursor += event.duration;
    return next;
  });
}

function sounding(events: readonly MotifNoteEvent[]): MotifNoteEvent[] {
  return events.filter((event) => event.midi !== null);
}

function firstSounding(events: readonly MotifNoteEvent[]): MotifNoteEvent | null {
  return sounding(events)[0] ?? null;
}

function finish(motif: Motif, op: OperatorId, params: OperatorParams, warnings: string[]): OperatorResult {
  const step: TransformStep = {
    op,
    params: { ...params },
    fromId: motif.id,
    toId: `${motif.id}.${lineageSuffix(op)}`,
  };
  return {
    motif: { ...motif, id: step.toId },
    step,
    warnings,
  };
}

function transposeChromatic(motif: Motif, semitones: number): MotifNoteEvent[] {
  return copyEvents(motif.events).map((event) =>
    event.midi === null ? event : { ...event, midi: event.midi + semitones },
  );
}

function transposeField(motif: Motif, degrees: number, warnings: string[]): MotifNoteEvent[] {
  const field = normalField(motif.field);
  if (!field) {
    warnings.push('pitch left field');
    return copyEvents(motif.events);
  }
  return copyEvents(motif.events).map((event) => {
    if (event.midi === null) return event;
    const index = fieldIndex(event.midi, field);
    if (index === null) {
      warnings.push('pitch left field');
      return event;
    }
    return { ...event, midi: midiFromFieldIndex(index + degrees, field) };
  });
}

function invertChromatic(events: readonly MotifNoteEvent[], axis: number): MotifNoteEvent[] {
  return events.map((event) =>
    event.midi === null ? { ...event } : { ...event, midi: axis * 2 - event.midi },
  );
}

function axisMidi(events: readonly MotifNoteEvent[], params: OperatorParams | undefined): number {
  const given = params?.axis;
  if (typeof given === 'number' && Number.isFinite(given)) return given;
  if (typeof given === 'string' && Number.isFinite(Number(given))) return Number(given);
  return firstSounding(events)?.midi ?? 60;
}

function invertInField(motif: Motif, params: OperatorParams | undefined, warnings: string[]): MotifNoteEvent[] {
  const field = normalField(motif.field);
  const events = copyEvents(motif.events);
  if (!field) {
    warnings.push('pitch left field');
    return invertChromatic(events, axisMidi(events, params));
  }
  const axis = axisMidi(events, params);
  const axisIndex = fieldIndex(axis, field);
  if (axisIndex === null) {
    warnings.push('pitch left field');
    return invertChromatic(events, axis);
  }
  return events.map((event) => {
    if (event.midi === null) return event;
    const index = fieldIndex(event.midi, field);
    if (index === null) {
      warnings.push('pitch left field');
      return event;
    }
    return { ...event, midi: midiFromFieldIndex(axisIndex * 2 - index, field) };
  });
}

function retrograde(events: readonly MotifNoteEvent[]): MotifNoteEvent[] {
  return retime([...events].reverse().map((event) => ({ ...event })));
}

function scaleDurations(events: readonly MotifNoteEvent[], factor: number): MotifNoteEvent[] {
  return retime(events.map((event) => ({ ...event, duration: event.duration * factor })));
}

function fragment(events: readonly MotifNoteEvent[], start: number, count: number): MotifNoteEvent[] {
  const safe = Math.max(0, count);
  return retime(copyEvents(events).slice(start, start + safe));
}

function shiftBy(motif: Motif, op: 'sequence-real' | 'sequence-tonal', steps: number, warnings: string[]): Motif {
  if (op === 'sequence-real') {
    return { ...motif, events: transposeChromatic(motif, steps) };
  }
  return { ...motif, events: transposeField(motif, steps, warnings) };
}

function sequence(motif: Motif, op: 'sequence-real' | 'sequence-tonal', params: OperatorParams | undefined, warnings: string[]): MotifNoteEvent[] {
  const steps = num(params, 'steps', op === 'sequence-real' ? 2 : 1);
  const count = Math.max(1, Math.round(num(params, 'count', 1)));
  const pieces: MotifNoteEvent[] = [];
  for (let copy = 1; copy <= count; copy += 1) {
    const shifted = shiftBy(motif, op, steps * copy, warnings);
    pieces.push(...retime(shifted.events));
  }
  return retime(pieces);
}

function expandContract(
  motif: Motif,
  amount: number,
  params: OperatorParams | undefined,
  warnings: string[],
): MotifNoteEvent[] {
  const mode = String(params?.mode ?? 'chromatic');
  const field = normalField(motif.field);
  const events = copyEvents(motif.events);
  const indexes: number[] = [];
  events.forEach((event, index) => {
    if (event.midi !== null) indexes.push(index);
  });
  if (indexes.length < 2) return events;
  if (mode === 'field') {
    if (!field) {
      warnings.push('pitch left field');
      return events;
    }
    const originalIndexes = indexes.map((index) => fieldIndex(events[index]!.midi!, field));
    if (originalIndexes[0] === null) {
      warnings.push('pitch left field');
      return events;
    }
    let cursor = originalIndexes[0]!;
    for (let i = 1; i < indexes.length; i += 1) {
      const here = originalIndexes[i];
      const previous = originalIndexes[i - 1];
      if (here === null || previous === null) {
        warnings.push('pitch left field');
        continue;
      }
      const delta = here - previous;
      const sign = Math.sign(delta);
      const magnitude = Math.abs(delta);
      const nextMagnitude = amount >= 0 ? magnitude + amount : Math.max(0, magnitude + amount);
      if (amount < 0 && magnitude + amount < 0) warnings.push('pitch left field');
      cursor += sign * nextMagnitude;
      events[indexes[i]!]!.midi = midiFromFieldIndex(cursor, field);
    }
    return events;
  }
  const original = indexes.map((index) => events[index]!.midi!);
  for (let i = 1; i < indexes.length; i += 1) {
    const delta = original[i]! - original[i - 1]!;
    const sign = Math.sign(delta);
    const magnitude = Math.abs(delta);
    const nextMagnitude = amount >= 0 ? magnitude + amount : Math.max(0, magnitude + amount);
    if (amount < 0 && magnitude + amount < 0) warnings.push('pitch left field');
    events[indexes[i]!]!.midi = events[indexes[i - 1]!]!.midi! + sign * nextMagnitude;
  }
  return events;
}

function liquidate(motif: Motif, params: OperatorParams | undefined, warnings: string[]): MotifNoteEvent[] {
  const drop = Math.max(1, Math.round(num(params, 'n', 1)));
  const count = Math.max(1, Math.round(num(params, 'count', 3)));
  const pieces: MotifNoteEvent[] = [];
  for (let step = 1; step <= count; step += 1) {
    const keep = motif.events.length - drop * step;
    if (keep <= 0) {
      warnings.push('rest at onset 0');
      const head = motif.events[0];
      if (head) pieces.push({ ...head });
      break;
    }
    pieces.push(...copyEvents(motif.events).slice(0, keep));
  }
  return retime(pieces);
}

export function applyOperator(motif: Motif, op: OperatorId, params?: OperatorParams): OperatorResult {
  const source: Motif = { id: motif.id || 'm1', events: copyEvents(motif.events), field: motif.field };
  const warnings: string[] = [];
  const used: OperatorParams = { ...(params ?? {}) };
  let events: MotifNoteEvent[];
  switch (op) {
    case 'transpose':
      events = transposeChromatic(source, num(params, 'semitones', num(params, 'steps', 0)));
      break;
    case 'transpose-in-field':
      events = transposeField(source, num(params, 'degrees', num(params, 'steps', 1)), warnings);
      break;
    case 'invert':
      events = invertChromatic(copyEvents(source.events), axisMidi(source.events, params));
      break;
    case 'invert-in-field':
      events = invertInField(source, params, warnings);
      break;
    case 'retrograde':
      events = retrograde(source.events);
      break;
    case 'retrograde-inversion':
      events = retrograde(invertChromatic(copyEvents(source.events), axisMidi(source.events, params)));
      break;
    case 'augment':
      events = scaleDurations(source.events, num(params, 'factor', 2));
      break;
    case 'diminish':
      events = scaleDurations(source.events, 1 / num(params, 'factor', 2));
      break;
    case 'fragment-head':
      events = fragment(source.events, 0, Math.round(num(params, 'count', num(params, 'n', 2))));
      break;
    case 'fragment-tail': {
      const count = Math.round(num(params, 'count', num(params, 'n', 2)));
      events = fragment(source.events, Math.max(0, source.events.length - count), count);
      break;
    }
    case 'fragment-inner': {
      const edge = Math.round(num(params, 'edge', 1));
      const count = params?.count != null ? Math.round(num(params, 'count', 1)) : source.events.length - edge * 2;
      const start = params?.count != null ? Math.max(0, Math.floor((source.events.length - count) / 2)) : edge;
      events = fragment(source.events, start, Math.max(0, count));
      break;
    }
    case 'sequence-real':
    case 'sequence-tonal':
      events = sequence(source, op, params, warnings);
      break;
    case 'expand-intervals':
      events = expandContract(source, num(params, 'amount', 1), params, warnings);
      break;
    case 'contract-intervals':
      events = expandContract(source, -num(params, 'amount', 1), params, warnings);
      break;
    case 'displace': {
      const shift = num(params, 'beats', num(params, 'amount', 0.5));
      events = copyEvents(source.events).map((event) => ({ ...event, onset: event.onset + shift }));
      if (events.some((event) => event.onset < 0)) warnings.push('rest at onset 0');
      break;
    }
    case 'insert-rest': {
      const index = Math.max(0, Math.round(num(params, 'index', 1)));
      const duration = num(params, 'duration', 1);
      const next = copyEvents(source.events);
      next.splice(index, 0, { onset: 0, duration, midi: null });
      events = retime(next);
      warnings.push('rest at onset 0');
      break;
    }
    case 'register-lift': {
      const octaves = num(params, 'octaves', 1);
      events = copyEvents(source.events).map((event) =>
        event.midi === null ? event : { ...event, midi: event.midi + 12 * octaves },
      );
      break;
    }
    case 'liquidate':
      events = liquidate(source, params, warnings);
      break;
    default:
      events = copyEvents(source.events);
      warnings.push('pitch left field');
  }
  return finish({ ...source, events }, op, used, warnings);
}
