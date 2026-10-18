/**
 * Harmony Lab adapter.
 * Musician settings become an E2PerformRequest. Pitch, schedule, locks and
 * ensemble allocation stay in the existing E2 modules.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gripMatches, type GuitarGripWitness } from '../ecm/e2EcmDuoAdapter';
import { GUITAR_OPEN_STRING_MIDIS, solveGuitarGrip } from '../guitar/voicingFeasibility';
import { writeScoreMidi } from '../export/midiScoreWriter';
import { midiOfPitch } from '../performance-composer/pcChord';
import { q, qAdd, qCmp, qToNumber, type ExactQuarter } from '../piano/pianoExactTiming';
import { parseSpelledPitch, type TriadQuality } from '../wwh/wwhTriadPair';
import { e2Roster } from './ensembleTemplates';
import {
  defaultHarmonyLabSettings,
  type HarmonyLabDuration,
  type HarmonyLabSettings,
  type PairUse,
  type ParentTransform,
} from './harmonyLabSettings';
import { partsFromRoster } from './e2Placement';
import { resolveCatalogueInstrument } from './ensembleTemplates';
import { performE2, type E2PerformRequest } from './e2Perform';
import {
  contraryDyad,
  dyadPair,
  dyadParent,
  polychord,
  transformTriadParent,
  triadPair,
  triadParent,
  transposeDyad,
} from './harmonicColour';
import type { DyadParent, SpelledRegister, TriadParent } from './harmonicColourTypes';
import type { ScheduledSlot } from './harmonicRealisation';
import { captureSource, type SourceBundle } from './sourceFoundation';
import type { LockPolicy } from './sourceLocks';

const STEPS = 'CDEFGAB';
const QUALITY_SEMITONES: Record<TriadQuality, { third: number; fifth: number }> = {
  major: { third: 4, fifth: 7 },
  minor: { third: 3, fifth: 7 },
  augmented: { third: 4, fifth: 8 },
  diminished: { third: 3, fifth: 6 },
};
const TRANSFORMS: readonly ParentTransform[] = ['none', 'P', 'L', 'R', 'H', 'N', 'S'];

export {
  HARMONY_LAB_VERSION,
  HARMONY_LAB_PRESETS,
  defaultHarmonyLabSettings,
  harmonyLabPreset,
  harmonyLabLockLabel,
  harmonyLabClientIssue,
} from './harmonyLabSettings';
export type {
  HarmonyLabKind,
  HarmonyLabDensity,
  HarmonyLabDuration,
  CommonToneBehaviour,
  PairUse,
  DyadMotion,
  ParentTransform,
  ChordSpec,
  DyadSpec,
  HarmonyLabSettings,
} from './harmonyLabSettings';

export function musicianHarmonyMessage(reason: string): string {
  if (reason.includes('grip witness') || reason.includes('guitar solver')) {
    return 'Guitar cannot finger these notes together. Change the octave or use a thinner density.';
  }
  if (reason.includes('full realisation') || reason.includes('simultaneous realisation')) {
    return 'This ensemble cannot sound every chord tone at the same time.';
  }
  if (reason.includes('refuses sounding MIDI')) {
    return reason.replace('refuses sounding MIDI', 'cannot play MIDI');
  }
  if (reason.includes('double stop')) {
    return 'That string chord needs an open-string double stop. Harmony Lab keeps one note on each string.';
  }
  if (reason.includes('empty selection') || reason.includes('unrestricted')) {
    return 'Choose a region that contains the notes you want to keep.';
  }
  if (reason.includes('still held')) {
    return 'A guitar string is still held. Leave a rest or move the next note.';
  }
  return reason;
}

export function describeHarmonySource(xml: string): HarmonyLabSourceView {
  if (!xml.trim()) {
    return { ok: true, error: null, bars: 0, tempo: null, fourFour: true, parts: [], events: [] };
  }
  try {
    const source = captureSource(xml, 'harmony-lab-source.musicxml');
    const tempo = source.score.directions.find((direction) => direction.playbackBpm !== null)?.playbackBpm ?? null;
    const measures = source.score.measures;
    const fourFour = measures.every((measure) => measure.beats === 4 && measure.beatType === 4 && (measure.beatGroups?.length ?? 0) <= 1);
    const bars = measures.reduce((max, measure) => Math.max(max, measure.bar), 0);
    const counts = new Map<string, number>();
    const events = source.records.map((record) => {
      counts.set(record.canonical.partId, (counts.get(record.canonical.partId) ?? 0) + (record.canonical.rest ? 0 : 1));
      return {
        id: record.canonical.id,
        partId: record.canonical.partId,
        bar: record.canonical.bar,
        midi: record.canonical.soundingMidi,
        rest: record.canonical.rest,
      };
    });
    return {
      ok: true,
      error: null,
      bars,
      tempo,
      fourFour,
      parts: [...counts.entries()].map(([partId, notes]) => ({ partId, notes })),
      events,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      bars: 0,
      tempo: null,
      fourFour: false,
      parts: [],
      events: [],
    };
  }
}

function fail(message: string, unsupported: string[] = []): HarmonyLabCompile {
  return { ok: false, error: message, unsupported };
}

function times(duration: ExactQuarter, factor: number): ExactQuarter {
  return q(duration.n * factor, duration.d);
}

function durationOf(choice: HarmonyLabDuration): ExactQuarter {
  if (choice === 'eighth') return q(1, 2);
  if (choice === 'half') return q(2);
  return q(1);
}

function token(step: string, alter: number, octave: number): string {
  const accidental = alter === 0 ? '' : alter < 0 ? 'b'.repeat(-alter) : '#'.repeat(alter);
  return `${step}${accidental}${octave}`;
}

function spellDegree(rootStep: string, rootAlter: number, rootOctave: number, letters: number, semitones: number): string {
  const index = STEPS.indexOf(rootStep);
  const step = STEPS[(index + letters) % 7]!;
  let octave = rootOctave + Math.floor((index + letters) / 7);
  const wanted = midiOfPitch(rootStep, rootAlter, rootOctave) + semitones;
  let alter = wanted - midiOfPitch(step, 0, octave);
  while (alter > 2) {
    octave += 1;
    alter = wanted - midiOfPitch(step, 0, octave);
  }
  while (alter < -2) {
    octave -= 1;
    alter = wanted - midiOfPitch(step, 0, octave);
  }
  return token(step, alter, octave);
}

function spellChord(spec: ChordSpec): { notes: [string, string, string]; voices: [string, string, string] } {
  const parsed = parseSpelledPitch(spec.root.trim());
  const intervals = QUALITY_SEMITONES[spec.quality];
  const voices: [string, string, string] = [
    spellDegree(parsed.step, parsed.alter, spec.octave, 0, 0),
    spellDegree(parsed.step, parsed.alter, spec.octave, 2, intervals.third),
    spellDegree(parsed.step, parsed.alter, spec.octave, 4, intervals.fifth),
  ];
  const notes = voices.map((voice) => voice.replace(/-?\d+$/, '')) as [string, string, string];
  return { notes, voices };
}

function makeTriad(id: string, spec: ChordSpec, register: readonly [number, number]): TriadParent {
  const spelled = spellChord(spec);
  return triadParent(id, spec.quality, spelled.notes, spelled.voices, register);
}

function retoken(pitch: SpelledRegister): string {
  return token(pitch.step, pitch.alter, pitch.octave);
}

function shiftPitch(spec: string, semitones: number): string {
  const moved = transposeDyad(dyadParent('shift', spec, spec), semitones);
  if ('ok' in moved) throw new Error(moved.reason);
  return retoken(moved.members[1].pitch);
}

interface Planned {
  slotId: string;
  parent: ScheduledSlot['parent'];
  memberId: string;
  midi: number;
  onset: ExactQuarter;
  duration: ExactQuarter;
  arpeggio: boolean;
  memberIds?: readonly string[];
}

interface PartSlot {
  partId: string;
  low: number;
  high: number;
  max: number;
}

function ensembleParts(ensemble: E2EnsembleId): PartSlot[] {
  return partsFromRoster(e2Roster(ensemble), resolveCatalogueInstrument)
    .filter((part) => !part.drums)
    .map((part) => ({
      partId: part.partId,
      low: part.hardRange?.[0] ?? 40,
      high: part.hardRange?.[1] ?? 88,
      max: part.partId === 'guitar' ? 4 : 1,
    }));
}

function fits(onset: ExactQuarter, duration: ExactQuarter): boolean {
  const bar = Math.floor(qToNumber(onset) / 4);
  return qCmp(qAdd(onset, duration), q((bar + 1) * 4)) <= 0;
}

function advance(onset: ExactQuarter, duration: ExactQuarter): ExactQuarter {
  let cursor = onset;
  if (!fits(cursor, duration)) {
    const bar = Math.floor(qToNumber(cursor) / 4) + 1;
    cursor = q(bar * 4);
  }
  if (qToNumber(cursor) >= 16) throw new Error('This rhythm does not fit in four bars. Choose a shorter note length.');
  if (!fits(cursor, duration)) throw new Error('This note crosses a bar. Choose a shorter note length.');
  return cursor;
}

function memberRows(parent: TriadParent | DyadParent, which: ScheduledSlot['parent']): Array<{ memberId: string; midi: number }> {
  if ('voices' in parent) return parent.voices.map((voice) => ({ memberId: voice.ref.memberId, midi: voice.pitch.midi }));
  return parent.members.map((voice) => ({ memberId: voice.ref.memberId, midi: voice.pitch.midi }));
}

function takeMembers(rows: Array<{ memberId: string; midi: number }>, density: HarmonyLabDensity): Array<{ memberId: string; midi: number }> {
  if (density === 'sparse') return rows.filter((row) => row.memberId === 'root' || row.memberId === 'low');
  return rows;
}

function assignPart(
  parts: readonly PartSlot[],
  midi: number,
  onset: ExactQuarter,
  duration: ExactQuarter,
  busy: Map<string, number>,
  holds: Array<{ partId: string; until: ExactQuarter }>,
): string {
  const key = `${qToNumber(onset)}`;
  const candidates = parts.filter((part) => midi >= part.low && midi <= part.high
    && (busy.get(`${part.partId}:${key}`) ?? 0) < part.max
    && !holds.some((hold) => hold.partId === part.partId && qCmp(onset, hold.until) < 0));
  if (!candidates.length) {
    throw new Error(`MIDI ${midi} does not fit a free part in this ensemble.`);
  }
  candidates.sort((left, right) => Math.abs((left.low + left.high) / 2 - midi) - Math.abs((right.low + right.high) / 2 - midi));
  const chosen = candidates[0]!;
  busy.set(`${chosen.partId}:${key}`, (busy.get(`${chosen.partId}:${key}`) ?? 0) + 1);
  holds.push({ partId: chosen.partId, until: qAdd(onset, duration) });
  return chosen.partId;
}

function linePart(parts: readonly PartSlot[], midis: readonly number[]): string | null {
  const hit = parts.find((part) => midis.every((midi) => midi >= part.low && midi <= part.high));
  return hit?.partId ?? null;
}

function scheduleParents(
  regionId: string,
  parents: Array<{ which: ScheduledSlot['parent']; parent: TriadParent | DyadParent }>,
  settings: HarmonyLabSettings,
  duration: ExactQuarter,
): Planned[] {
  const dense = settings.kind === 'polychord'
    ? settings.simultaneous || settings.density === 'dense'
    : settings.density === 'dense' || settings.use === 'superpose';
  const pairUse: PairUse = settings.kind === 'polychord' ? 'alternate' : settings.use;
  const planned: Planned[] = [];
  let cursor = q(0);
  const shared = new Set<number>();
  if (settings.commonTone === 'sustain' && parents.length === 2) {
    const left = new Set(memberRows(parents[0]!.parent, parents[0]!.which).map((row) => ((row.midi % 12) + 12) % 12));
    for (const row of memberRows(parents[1]!.parent, parents[1]!.which)) {
      if (left.has(((row.midi % 12) + 12) % 12)) shared.add(((row.midi % 12) + 12) % 12);
    }
  }
  parents.forEach((entry, index) => {
    const rows = takeMembers(memberRows(entry.parent, entry.which), dense ? 'dense' : settings.density);
    if (!dense && pairUse === 'alternate' && index === 1) {
      cursor = advance(cursor, duration);
    }
    if (!dense && pairUse === 'interlock' && index === 1) {
      const half = settings.duration === 'half' ? q(1) : settings.duration === 'quarter' ? q(1, 2) : q(1, 4);
      cursor = qAdd(parents.length ? q(0) : q(0), half);
      cursor = advance(cursor, duration);
    }
    rows.forEach((row, rowIndex) => {
      const sustained = settings.commonTone === 'sustain' && shared.has(((row.midi % 12) + 12) % 12);
      const noteDuration = sustained && settings.duration !== 'half' ? times(duration, 2) : duration;
      const onset = dense ? q(0) : advance(rowIndex === 0 && index === 0 ? q(0) : cursor, noteDuration);
      if (!fits(onset, noteDuration)) throw new Error('A sustained common tone crosses the bar. Choose a shorter note length.');
      planned.push({
        slotId: `${entry.which}-${row.memberId}`,
        parent: entry.which,
        memberId: row.memberId,
        midi: row.midi,
        onset,
        duration: noteDuration,
        arpeggio: false,
      });
      if (!dense) cursor = qAdd(onset, duration);
    });
  });
  if (settings.phraseReturn && parents[0]) {
    const rows = memberRows(parents[0].parent, parents[0].which);
    const onset = advance(q(8), duration);
    const span = times(duration, rows.length);
    if (!fits(onset, span)) throw new Error('The phrase return does not fit in bar 3. Choose a shorter note length.');
    const host = rows.map((row) => row.midi);
    planned.push({
      slotId: settings.motifDevelopment ? 'return:return' : 'return',
      parent: parents[0].which,
      memberId: rows[0]!.memberId,
      midi: host[0]!,
      onset,
      duration,
      arpeggio: settings.motifDevelopment,
      memberIds: rows.map((row) => row.memberId),
    });
  }
  if (settings.silence) {
    planned.push({
      slotId: 'space',
      parent: parents[0]?.which ?? 'a',
      memberId: 'rest',
      midi: 0,
      onset: advance(q(12), duration),
      duration,
      arpeggio: false,
    });
  }
  return planned;
}

function witnessesFor(slots: ScheduledSlot[], midisBySlot: Map<string, number[]>): GuitarGripWitness[] {
  const groups = new Map<string, { slotIds: string[]; midis: number[] }>();
  for (const slot of slots) {
    if (slot.logicalVoiceId !== 'guitar' || slot.rest) continue;
    const key = `${slot.onset.n}/${slot.onset.d}`;
    const group = groups.get(key) ?? { slotIds: [], midis: [] };
    group.slotIds.push(slot.slotId);
    group.midis.push(...(midisBySlot.get(slot.slotId) ?? []));
    groups.set(key, group);
  }
  const witnesses: GuitarGripWitness[] = [];
  for (const [key, group] of groups) {
    const solved = solveGuitarGrip(group.midis);
    if (!solved.feasible || solved.frets.length !== new Set(group.midis).size) {
      throw new Error('guitar stack has no grip witness');
    }
    const witness: GuitarGripWitness = {
      id: `grip-${key.replace('/', '-')}`,
      slotIds: group.slotIds,
      assignments: solved.frets.map((fret) => ({
        stringNumber: (6 - fret.string) as 1 | 2 | 3 | 4 | 5 | 6,
        fret: fret.fret,
        midi: GUITAR_OPEN_STRING_MIDIS[fret.string]! + fret.fret,
      })),
    };
    if (!gripMatches(witness, group.midis)) throw new Error('guitar stack has no grip witness');
    witnesses.push(witness);
  }
  return witnesses;
}

function lockCopy(settings: HarmonyLabSettings, source: SourceBundle | null): { policy?: LockPolicy; notes: E2PerformRequest['sourceNotes']; status: string; bars: number; tempo: number } {
  const locks: string[] = [];
  if (settings.preserveMelody) locks.push('melody');
  if (settings.preserveBass) locks.push('bass');
  if (settings.preserveRhythm) locks.push('rhythm');
  if (settings.preserveForm) locks.push('form and metre');
  if (settings.preserveTempo) locks.push('tempo');
  if (!source || !settings.sourceXml.trim()) {
    return { notes: [], status: 'Unlocked. No source is loaded.', bars: 4, tempo: settings.tempo };
  }
  if (!locks.length) {
    return { notes: [], status: 'Source loaded. Nothing is locked.', bars: settings.preserveForm ? 4 : 4, tempo: settings.tempo };
  }
  const view = describeHarmonySource(settings.sourceXml);
  if (!view.ok) return { notes: [], status: view.error ?? 'The source could not be read.', bars: 4, tempo: settings.tempo };
  if ((settings.preserveForm || settings.preserveRhythm) && !view.fourFour) {
    throw new Error('Form and rhythm can be locked when every source bar is 4/4.');
  }
  const means = new Map<string, { sum: number; count: number }>();
  for (const event of view.events) {
    if (event.rest || event.midi === null) continue;
    const row = means.get(event.partId) ?? { sum: 0, count: 0 };
    row.sum += event.midi;
    row.count += 1;
    means.set(event.partId, row);
  }
  const ranked = [...means.entries()].sort((left, right) => left[1].sum / left[1].count - right[1].sum / right[1].count);
  const bassPart = ranked[0]?.[0];
  const melodyPart = ranked[ranked.length - 1]?.[0];
  const selected = view.events.filter((event) => {
    if (event.bar < settings.regionStartBar || event.bar > settings.regionEndBar) return false;
    if (settings.preserveMelody && event.partId === melodyPart) return true;
    if (settings.preserveBass && event.partId === bassPart) return true;
    if (!settings.preserveMelody && !settings.preserveBass && (settings.preserveRhythm || settings.preserveForm || settings.preserveTempo)) return true;
    return false;
  });
  if (!selected.length) throw new Error('Choose a region that contains the notes you want to keep.');
  const policy: LockPolicy = {
    selectedSourceEventIds: selected.map((event) => event.id),
    spans: [],
    preserve: {
      pitch: settings.preserveMelody || settings.preserveBass,
      spelling: settings.preserveMelody,
      rhythm: settings.preserveRhythm,
      silence: false,
      harmony: false,
      form: settings.preserveForm,
      tempo: settings.preserveTempo,
    },
    harmonyMeaning: 'declared-intent',
  };
  const notes: NonNullable<E2PerformRequest['sourceNotes']> = [];
  for (const event of selected) {
    if (event.rest || event.midi === null) continue;
    const record = source.records.find((item) => item.canonical.id === event.id);
    const written = record?.canonical.written;
    if (!written) continue;
    notes.push({
      partId: event.partId,
      pitch: { step: written.step, alter: written.alter, octave: written.octave, midi: event.midi },
      onset: record!.canonical.onset,
      duration: record!.canonical.duration,
      sourceId: event.id,
    });
  }
  const tempo = settings.preserveTempo && view.tempo ? view.tempo : settings.tempo;
  const tempoNote = settings.preserveTempo && view.tempo === null ? ' The source has no playback tempo, so the tempo box stays in force.' : '';
  const bars = settings.preserveForm ? Math.max(4, view.bars) : 4;
  return {
    policy,
    notes,
    status: `Locked: ${locks.join(', ')}. Region bars ${settings.regionStartBar}–${settings.regionEndBar}, ${selected.length} source event${selected.length === 1 ? '' : 's'}.${tempoNote}`,
    bars,
    tempo,
  };
}

function unsupportedFor(settings: HarmonyLabSettings): string[] {
  const notes: string[] = [];
  if (settings.kind !== 'polychord' && settings.simultaneous) notes.push('Simultaneous membership belongs to polychords.');
  if (settings.kind !== 'triad-pair' && settings.parentTransform !== 'none') notes.push('Parent transformation belongs to triad pairs.');
  if (settings.parentTransform !== 'none' && (settings.triadB.quality !== 'major' && settings.triadB.quality !== 'minor')) {
    notes.push('Augmented and diminished triads have no P, L, R, H, N or S transform.');
  }
  if (settings.motifDevelopment && !settings.phraseReturn) notes.push('Motif development is the return of the phrase, reversed.');
  if (settings.kind === 'dyad-pair' && settings.use === 'superpose' && settings.density === 'dense') notes.push('A dyad pair can stack, but only on parts that can hold both notes.');
  return notes;
}

export function compileHarmonyLab(input: unknown): HarmonyLabCompile {
  const settings = { ...defaultHarmonyLabSettings(), ...(input && typeof input === 'object' ? input as Partial<HarmonyLabSettings> : {}) };
  const unsupported = unsupportedFor(settings);
  if (!TRANSFORMS.includes(settings.parentTransform)) return fail('That parent transformation is not available.', unsupported);
  if (settings.kind !== 'triad-pair' && settings.parentTransform !== 'none') {
    return fail('Parent transformation belongs to triad pairs.', unsupported);
  }
  if (settings.parentTransform !== 'none' && settings.triadB.quality !== 'major' && settings.triadB.quality !== 'minor') {
    return fail('Augmented and diminished triads have no P, L, R, H, N or S transform.', unsupported);
  }
  if (settings.motifDevelopment && !settings.phraseReturn) {
    return fail('Turn on phrase return to develop the motif. The return is the opening, reversed.', unsupported);
  }
  if (settings.kind !== 'polychord') settings.simultaneous = false;
  const register: [number, number] = [settings.registerLow, settings.registerHigh];
  try {
    let intentParents: Array<{ which: ScheduledSlot['parent']; parent: TriadParent | DyadParent }> = [];
    let intentId = 'lab';
    let regionIntent: E2PerformRequest['regions'][number]['intent'];
    let intervalText = '';
    if (settings.kind === 'polychord') {
      const upper = makeTriad('upper', settings.upper, register);
      const lower = makeTriad('lower', settings.lower, register);
      regionIntent = polychord('lab', upper, lower);
      intentParents = [{ which: 'upper', parent: upper }, { which: 'lower', parent: lower }];
      intervalText = `${settings.upper.root} ${settings.upper.quality} over ${settings.lower.root} ${settings.lower.quality}`;
    } else if (settings.kind === 'triad-pair') {
      const a = makeTriad('A', settings.triadA, register);
      let b = makeTriad('B', settings.triadB, register);
      if (settings.parentTransform !== 'none') {
        const transformed = transformTriadParent(b, settings.parentTransform);
        if (!transformed.ok) return fail(transformed.reason, unsupported);
        b = transformed.parent;
      }
      regionIntent = triadPair('lab', a, b, settings.use);
      intentParents = [{ which: 'a', parent: a }, { which: 'b', parent: b }];
      intervalText = `${settings.triadA.root} ${settings.triadA.quality} ${settings.use} ${b.triad.rootSpelling} ${b.triad.quality}`;
    } else {
      const a = dyadParent('A', settings.dyadA.low, settings.dyadA.high);
      let b: DyadParent;
      if (settings.motion === 'contrary') {
        const moved = contraryDyad(a, settings.contrarySemitones, false);
        if ('ok' in moved) return fail(moved.reason, unsupported);
        b = { ...moved, id: 'B' };
      } else if (settings.motion === 'oblique') {
        b = dyadParent('B', settings.dyadA.low, shiftPitch(settings.dyadA.high, settings.contrarySemitones));
      } else {
        b = dyadParent('B', settings.dyadB.low, settings.dyadB.high);
      }
      for (const dyad of [a, b]) {
        for (const member of dyad.members) {
          if (member.pitch.midi < register[0] || member.pitch.midi > register[1]) {
            return fail(`${retoken(member.pitch)} sits outside the register.`, unsupported);
          }
        }
      }
      regionIntent = dyadPair('lab', a, b, settings.use);
      intentParents = [{ which: 'a', parent: a }, { which: 'b', parent: b }];
      intervalText = `A ${a.interval.directedSemitones} semitones, B ${b.interval.directedSemitones} semitones`;
      intentId = 'lab';
    }
    const source = settings.sourceXml.trim() ? captureSource(settings.sourceXml, 'harmony-lab-source.musicxml') : null;
    const locked = lockCopy(settings, source);
    const duration = durationOf(settings.duration);
    const planned = scheduleParents(intentId, intentParents, settings, duration);
    const parts = ensembleParts(settings.ensemble);
    const busy = new Map<string, number>();
    const holds: Array<{ partId: string; until: ExactQuarter }> = [];
    const schedule: ScheduledSlot[] = [];
    const midisBySlot = new Map<string, number[]>();
    let returnPart: string | null = null;
    for (const note of planned) {
      if (note.memberId === 'rest') {
        schedule.push({
          regionId: 'lab',
          slotId: note.slotId,
          logicalVoiceId: parts[0]?.partId ?? 'vn1',
          onset: note.onset,
          duration: note.duration,
          parent: note.parent,
          rest: true,
          restReason: 'phrase-space',
        });
        continue;
      }
      if (note.arpeggio && note.memberIds) {
        const parent = intentParents.find((item) => item.which === note.parent)?.parent;
        if (!parent) throw new Error('The phrase return lost its parent.');
        const midis = memberRows(parent, note.parent).map((row) => row.midi);
        returnPart = linePart(parts, midis);
        if (!returnPart) return fail('No single part can play the returned phrase in this register.', unsupported);
        schedule.push({
          regionId: 'lab',
          slotId: note.slotId,
          logicalVoiceId: returnPart,
          onset: note.onset,
          duration: note.duration,
          parent: note.parent,
          memberIds: note.memberIds,
          arpeggio: true,
        });
        midisBySlot.set(note.slotId, midis);
        holds.push({ partId: returnPart, until: qAdd(note.onset, times(note.duration, midis.length)) });
        continue;
      }
      const partId = assignPart(parts, note.midi, note.onset, note.duration, busy, holds);
      schedule.push({
        regionId: 'lab',
        slotId: note.slotId,
        logicalVoiceId: partId,
        onset: note.onset,
        duration: note.duration,
        parent: note.parent,
        memberIds: [note.memberId],
      });
      midisBySlot.set(note.slotId, [note.midi]);
    }
    const sourceNotes = (locked.notes ?? []).map((note) => {
      const partId = parts.some((part) => part.partId === note.partId) ? note.partId : assignPart(parts, note.pitch.midi, note.onset, note.duration, busy, holds);
      return { ...note, partId };
    });
    const witnesses = settings.ensemble === 'ecm-duo' ? witnessesFor(schedule, midisBySlot) : [];
    const fullAnchors = settings.kind === 'polychord' && settings.simultaneous
      ? [{ regionId: 'lab', onset: q(0), duration }]
      : undefined;
    const request: E2PerformRequest = {
      ensemble: settings.ensemble,
      regions: [{ span: { onset: q(0), duration: q(16) }, intent: regionIntent! }],
      schedule,
      ...(fullAnchors ? { fullAnchors } : {}),
      ...(witnesses.length ? { witnesses } : {}),
      seed: settings.seed,
      title: settings.title || 'Harmony Lab',
      tempo: locked.tempo,
      bars: locked.bars,
      ...(source ? { source, sourceXml: settings.sourceXml } : {}),
      ...(locked.policy ? { lockPolicy: locked.policy } : {}),
      ...(sourceNotes.length ? { sourceNotes } : {}),
      words: { [schedule.find((slot) => !slot.rest)?.logicalVoiceId ?? parts[0]!.partId]: { 1: intervalText } },
    };
    const summary = `${settings.ensemble}, ${settings.kind}, ${planned.filter((note) => note.memberId !== 'rest').length} written attacks`;
    return { ok: true, request, summary, lockStatus: locked.status, intervalText, unsupported };
  } catch (error) {
    return fail(musicianHarmonyMessage(error instanceof Error ? error.message : String(error)), unsupported);
  }
}

export interface HarmonyLabResult {
  ok: true;
  musicXml: string;
  midiBase64: string;
  partIds: readonly string[];
  noteCount: number;
  summary: string;
  lockStatus: string;
  intervalText: string;
  soundingMidis: number[];
}

export function runHarmonyLab(input: unknown): HarmonyLabResult | { ok: false; error: string } {
  const compiled = compileHarmonyLab(input);
  if (!compiled.ok) return { ok: false, error: compiled.error };
  const performed = performE2(compiled.request);
  if (!performed.ok) return { ok: false, error: musicianHarmonyMessage(performed.reason) };
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'harmony-lab-'));
  const midiPath = writeScoreMidi(performed.score, directory, 'harmony-lab');
  if (!midiPath) return { ok: false, error: 'MIDI export produced no notes.' };
  const midiBase64 = fs.readFileSync(midiPath).toString('base64');
  const soundingMidis = performed.placements.map((placement) => placement.attack.pitch.midi);
  return {
    ok: true,
    musicXml: performed.musicXml,
    midiBase64,
    partIds: performed.score.parts.map((part) => part.id),
    noteCount: soundingMidis.length,
    summary: compiled.summary,
    lockStatus: compiled.lockStatus,
    intervalText: compiled.intervalText,
    soundingMidis,
  };
}
