/**
 * Piano V1 product constraints. These are not a claim of universal physical playability.
 */

import type { NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import { DIVISIONS } from '../score-model/scoreModelTypes';
import type { PianoLockedEvent } from './pianoTypes';
import {
  PIANO_KEYBOARD_RANGE,
  PIANO_LH_WINDOW,
  PIANO_MAX_HAND_SPAN,
  PIANO_MAX_KEYS_COMBINED,
  PIANO_MAX_KEYS_PER_HAND,
  PIANO_V11_POLYCHORD_COMBINED_KEYS,
  PIANO_V11_POLYCHORD_KEYS_PER_HAND,
  PIANO_RELOCATION_SECONDS,
  PIANO_RELOCATION_SEMITONES,
  PIANO_RH_WINDOW,
  pianoHandForVoice,
} from './pianoTypes';

export interface PianoCheckResult {
  ok: boolean;
  errors: string[];
}

function isNote(event: ScoreEvent): event is NoteEvent {
  return event.kind === 'note';
}

function notePitches(note: NoteEvent): number[] {
  const extra = (note.pitches ?? []).filter((pitch) => pitch !== note.pitch);
  const listed = note.pitches && note.pitches.length > 1 ? note.pitches.slice(1) : extra;
  return [note.pitch, ...listed.filter((pitch) => pitch !== note.pitch)];
}

interface Sounding {
  hand: 'RH' | 'LH';
  voice: number;
  pitch: number;
  start: number;
  end: number;
}

function measureOrigin(score: ScoreModel, index: number): number {
  if (!score.pianoV11StageA?.enabled) return (index - 1) * 4;
  const part = score.parts.find((item) => item.pianoGrandStaff) ?? score.parts[0];
  let acc = 0;
  for (const measure of [...(part?.measures ?? [])].sort((a, b) => a.index - b.index)) {
    if (measure.index === index) return acc;
    acc += measureBeatSpanQuartersOf(measure);
  }
  return acc;
}

function soundingNotes(score: ScoreModel): Sounding[] {
  const out: Sounding[] = [];
  const part = score.parts.find((item) => item.pianoGrandStaff);
  if (!part) return out;
  for (const measure of part.measures) {
    const origin = measureOrigin(score, measure.index);
    for (const event of measure.events) {
      if (!isNote(event)) continue;
      const voice = event.voice ?? 1;
      const hand = pianoHandForVoice(voice);
      for (const pitch of notePitches(event)) {
        out.push({
          hand,
          voice,
          pitch,
          start: origin + event.startBeat,
          end: origin + event.startBeat + event.duration,
        });
      }
    }
  }
  return out;
}

export function validatePianoPlayability(
  score: ScoreModel,
  tempo = 64,
  profile: 'legacy' | 'v11-polychord' = 'legacy',
): PianoCheckResult {
  const errors: string[] = [];
  const part = score.parts.find((item) => item.pianoGrandStaff);
  if (!part) return { ok: false, errors: ['Piano playability requires pianoGrandStaff'] };
  const notes = soundingNotes(score);
  for (const note of notes) {
    const window = note.hand === 'RH' ? PIANO_RH_WINDOW : PIANO_LH_WINDOW;
    if (note.pitch < PIANO_KEYBOARD_RANGE.low || note.pitch > PIANO_KEYBOARD_RANGE.high) {
      errors.push(`pitch ${note.pitch} is outside the keyboard`);
    }
    if (note.pitch < window.low || note.pitch > window.high) {
      errors.push(`${note.hand} pitch ${note.pitch} is outside the V1 writing window ${window.low}-${window.high}`);
    }
  }

  const bounds = new Set<number>();
  for (const note of notes) {
    bounds.add(note.start);
    bounds.add(note.end);
  }
  for (const time of [...bounds].sort((a, b) => a - b)) {
    const active = notes.filter((note) => note.start <= time + 1e-6 && note.end > time + 1e-6);
    for (const hand of ['RH', 'LH'] as const) {
      const pitches = [...new Set(active.filter((note) => note.hand === hand).map((note) => note.pitch))].sort((a, b) => a - b);
      const handLimit = profile === 'v11-polychord' ? PIANO_V11_POLYCHORD_KEYS_PER_HAND : PIANO_MAX_KEYS_PER_HAND;
      if (pitches.length > handLimit) {
        errors.push(`${hand} holds ${pitches.length} keys at beat ${time}`);
      }
      if (pitches.length > 1 && pitches[pitches.length - 1]! - pitches[0]! > PIANO_MAX_HAND_SPAN) {
        errors.push(`${hand} span ${pitches[pitches.length - 1]! - pitches[0]!} at beat ${time}`);
      }
    }
    const rh = new Set(active.filter((note) => note.hand === 'RH').map((note) => note.pitch));
    const lh = new Set(active.filter((note) => note.hand === 'LH').map((note) => note.pitch));
    const combined = new Set([...rh, ...lh]);
    const combinedLimit = profile === 'v11-polychord' ? PIANO_V11_POLYCHORD_COMBINED_KEYS : PIANO_MAX_KEYS_COMBINED;
    if (combined.size > combinedLimit) {
      errors.push(`combined held keys ${combined.size} at beat ${time}`);
    }
    for (const pitch of rh) {
      if (lh.has(pitch)) errors.push(`both hands own MIDI ${pitch} at beat ${time}`);
    }
  }

  const quarterSeconds = 60 / tempo;
  for (const hand of ['RH', 'LH'] as const) {
    const attacks = new Map<number, number[]>();
    for (const note of notes.filter((item) => item.hand === hand)) {
      const list = attacks.get(note.start) ?? [];
      list.push(note.pitch);
      attacks.set(note.start, list);
    }
    const times = [...attacks.keys()].sort((a, b) => a - b);
    for (let i = 1; i < times.length; i += 1) {
      const dt = (times[i]! - times[i - 1]!) * quarterSeconds;
      if (dt >= PIANO_RELOCATION_SECONDS) continue;
      const previous = attacks.get(times[i - 1]!) ?? [];
      const next = attacks.get(times[i]!) ?? [];
      for (const pitch of next) {
        const nearest = previous.reduce((best, item) => Math.min(best, Math.abs(item - pitch)), Infinity);
        if (nearest > PIANO_RELOCATION_SEMITONES) {
          errors.push(`${hand} relocates ${nearest} semitones in ${dt.toFixed(3)}s`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export interface HandAttack {
  onset: number;
  duration: number;
  pitches: number[];
}

export function handAttacks(score: ScoreModel, hand: 'RH' | 'LH'): HandAttack[] {
  const part = score.parts.find((item) => item.pianoGrandStaff);
  if (!part) return [];
  const attacks: HandAttack[] = [];
  for (const measure of part.measures) {
    const origin = measureOrigin(score, measure.index);
    for (const event of measure.events) {
      if (!isNote(event)) continue;
      if (pianoHandForVoice(event.voice ?? 1) !== hand) continue;
      if ((event.voice ?? 1) === 2) continue;
      attacks.push({
        onset: origin + event.startBeat,
        duration: event.duration,
        pitches: notePitches(event),
      });
    }
  }
  return attacks.sort((a, b) => a.onset - b.onset);
}

export function validateLhDevelopment(score: ScoreModel): PianoCheckResult {
  const part = score.parts.find((item) => item.pianoGrandStaff);
  if (!part) return { ok: false, errors: ['piano part missing'] };
  const signatures = part.measures.map((measure) => measure.events
    .filter((event) => event.kind === 'note' && (event.voice ?? 1) === 3)
    .map((event) => event.kind === 'note' ? `${event.startBeat}:${event.duration}:${event.pitch}` : '')
    .join(','));
  let run = 1;
  for (let i = 1; i < signatures.length; i += 1) {
    run = signatures[i] === signatures[i - 1] ? run + 1 : 1;
    if (run > 4) return { ok: false, errors: ['LH accompaniment repeats without a planned change'] };
  }
  return { ok: true, errors: [] };
}

export function validatePianoIndependence(score: ScoreModel): PianoCheckResult {
  const errors: string[] = [];
  const rh = handAttacks(score, 'RH');
  const lh = handAttacks(score, 'LH');
  const sig = (attacks: HandAttack[]) => attacks.map((attack) => `${attack.onset}:${attack.duration}:${attack.pitches.join('+')}`).join('|');
  if (sig(rh) === sig(lh)) errors.push('hands are identical');
  if (
    rh.length === lh.length &&
    rh.every((attack, index) => {
      const other = lh[index]!;
      return attack.onset === other.onset
        && attack.duration === other.duration
        && attack.pitches.every((pitch, pitchIndex) => pitch - 12 === other.pitches[pitchIndex]);
    })
  ) {
    errors.push('melody is doubled in octaves');
  }
  const rhTimes = new Set(rh.map((attack) => attack.onset));
  const lhTimes = new Set(lh.map((attack) => attack.onset));
  let rhOnly = 0;
  let lhOnly = 0;
  for (const time of rhTimes) if (!lhTimes.has(time)) rhOnly += 1;
  for (const time of lhTimes) if (!rhTimes.has(time)) lhOnly += 1;
  if (rhOnly < 1 || lhOnly < 1) errors.push('hands never move independently');
  return { ok: errors.length === 0, errors };
}

export function validateLockedEventsPresent(score: ScoreModel, locks: readonly PianoLockedEvent[]): PianoCheckResult {
  const errors: string[] = [];
  const part = score.parts.find((item) => item.id === 'piano');
  if (!part) return { ok: false, errors: ['piano part missing'] };
  for (const lock of locks) {
    const measure = part.measures.find((item) => item.index === lock.bar);
    const found = measure?.events.find((event) => {
      if (event.kind !== 'note') return false;
      return (event.voice ?? 1) === lock.voice
        && Math.abs(event.startBeat - lock.startBeat) < 1e-6
        && Math.abs(event.duration - lock.duration) < 1e-6
        && event.pitch === lock.pitch
        && (lock.tie ?? undefined) === (event.notation?.tie ?? undefined);
    });
    if (!found) {
      errors.push(
        `unsupported locked material: bar ${lock.bar} voice ${lock.voice} pitch ${lock.pitch} was not kept`,
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

export function validateLockedEventPlayable(lock: PianoLockedEvent): PianoCheckResult {
  const hand = pianoHandForVoice(lock.voice);
  const window = hand === 'RH' ? PIANO_RH_WINDOW : PIANO_LH_WINDOW;
  const pitches = [lock.pitch, ...(lock.pitches ?? []).filter((pitch) => pitch !== lock.pitch)];
  const errors: string[] = [];
  for (const pitch of pitches) {
    if (pitch < PIANO_KEYBOARD_RANGE.low || pitch > PIANO_KEYBOARD_RANGE.high) {
      errors.push(`locked pitch ${pitch} is outside the keyboard`);
    } else if (pitch < window.low || pitch > window.high) {
      errors.push(`locked ${hand} pitch ${pitch} is outside the V1 writing window`);
    }
  }
  if (pitches.length > 1 && Math.max(...pitches) - Math.min(...pitches) > PIANO_MAX_HAND_SPAN) {
    errors.push('locked stack exceeds the hand span');
  }
  if (!Number.isFinite(lock.duration) || lock.duration <= 0) errors.push('locked duration is unusable');
  return { ok: errors.length === 0, errors };
}

export function quarterTicks(): number {
  return DIVISIONS;
}

/**
 * Tie grammar for piano voices.
 * A continuation needs the attack that started it.
 * Two attacks of the same voice and pitch at one onset are a duplicated attack.
 */
export function validatePianoTies(score: ScoreModel): PianoCheckResult {
  const errors: string[] = [];
  const part = score.parts.find((item) => item.pianoGrandStaff);
  if (!part) return { ok: false, errors: ['piano part missing'] };
  interface Atom {
    onset: number;
    end: number;
    tie?: 'start' | 'stop' | 'continue';
    pitch: number;
    voice: number;
  }
  const atoms: Atom[] = [];
  for (const measure of part.measures) {
    const origin = measureOrigin(score, measure.index);
    for (const event of measure.events) {
      if (!isNote(event)) continue;
      for (const pitch of notePitches(event)) {
        atoms.push({
          onset: origin + event.startBeat,
          end: origin + event.startBeat + event.duration,
          tie: event.notation?.tie,
          pitch,
          voice: event.voice ?? 1,
        });
      }
    }
  }
  const groups = new Map<string, Atom[]>();
  for (const atom of atoms) {
    const key = `${atom.voice}|${atom.pitch}`;
    const list = groups.get(key) ?? [];
    list.push(atom);
    groups.set(key, list);
  }
  for (const [key, list] of groups) {
    list.sort((a, b) => a.onset - b.onset || a.end - b.end);
    const seen = new Set<number>();
    for (const atom of list) {
      if (atom.tie === 'stop' || atom.tie === 'continue') continue;
      const stamp = Math.round(atom.onset * 1000);
      if (seen.has(stamp)) errors.push(`duplicated tie attack ${key} at beat ${atom.onset}`);
      seen.add(stamp);
    }
    for (let index = 0; index < list.length; index += 1) {
      const atom = list[index]!;
      if (atom.tie === 'stop' || atom.tie === 'continue') {
        const prev = list[index - 1];
        const joined = Boolean(
          prev
          && Math.abs(prev.end - atom.onset) < 1e-4
          && (prev.tie === 'start' || prev.tie === 'continue'),
        );
        if (!joined) errors.push(`missing tie attack before ${key} at beat ${atom.onset}`);
      }
      if (atom.tie === 'start' || atom.tie === 'continue') {
        const next = list[index + 1];
        const joined = Boolean(
          next
          && Math.abs(atom.end - next.onset) < 1e-4
          && (next.tie === 'stop' || next.tie === 'continue'),
        );
        if (!joined) errors.push(`missing tie continuation after ${key} at beat ${atom.onset}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
