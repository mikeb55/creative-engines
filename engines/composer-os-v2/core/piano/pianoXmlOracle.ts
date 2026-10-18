/**
 * Independent MusicXML walker for piano V1.
 * It does not import the exporter, tick decomposition, or padding helpers.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';

export interface PianoXmlAtom {
  partId: string;
  staff: number;
  voice: number;
  onset: number;
  duration: number;
  rest: boolean;
  midi: number | null;
  tieStart: boolean;
  tieStop: boolean;
  tiedStart: boolean;
  tiedStop: boolean;
  writtenType?: string;
  dots?: number;
  actualNotes?: number;
  normalNotes?: number;
  normalType?: string;
  tupletStart?: boolean;
  tupletStop?: boolean;
}

export interface PianoSoundingEvent {
  partId: string;
  staff: number;
  voice: number;
  onset: number;
  duration: number;
  rest: boolean;
  midi: number | null;
}

export interface PianoOracleResult {
  ok: boolean;
  errors: string[];
  atoms: PianoXmlAtom[];
  sounding: PianoSoundingEvent[];
  elapsedSeconds: number | null;
  soundingAttacks: number;
}

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midiOf(step: string, alter: number, octave: number): number {
  return (octave + 1) * 12 + (STEP[step] ?? 0) + alter;
}

function blockText(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>(-?\\d+)</${tag}>`));
  return match?.[1] ?? null;
}

function parseNotes(partId: string, measureXml: string, measureStart: number, divisions: number): PianoXmlAtom[] {
  const atoms: PianoXmlAtom[] = [];
  const tokens = measureXml.match(/<(?:note|backup|forward)\b[^>]*>[\s\S]*?<\/(?:note|backup|forward)>/g) ?? [];
  let cursor = 0;
  let lastOnset = 0;
  for (const token of tokens) {
    const duration = Number(blockText(token, 'duration') ?? '0') / divisions;
    if (token.startsWith('<backup')) {
      cursor -= duration;
      continue;
    }
    if (token.startsWith('<forward')) {
      cursor += duration;
      continue;
    }
    const chord = /<chord\s*\/>/.test(token);
    const rest = /<rest\s*\/>/.test(token);
    const onset = chord ? lastOnset : cursor;
    if (!chord) {
      lastOnset = cursor;
      cursor += duration;
    }
    const step = token.match(/<step>([A-G])<\/step>/)?.[1] ?? null;
    const alter = Number(token.match(/<alter>(-?\d+)<\/alter>/)?.[1] ?? '0');
    const octave = Number(token.match(/<octave>(-?\d+)<\/octave>/)?.[1] ?? '0');
    const staff = Number(token.match(/<staff>(\d+)<\/staff>/)?.[1] ?? '0');
    const voice = Number(token.match(/<voice>(\d+)<\/voice>/)?.[1] ?? '1');
    const writtenType = token.match(/<type>([^<]+)<\/type>/)?.[1];
    const dots = token.match(/<dot\/>/g)?.length ?? 0;
    const actualNotes = Number(token.match(/<actual-notes>(\d+)<\/actual-notes>/)?.[1] ?? '0') || undefined;
    const normalNotes = Number(token.match(/<normal-notes>(\d+)<\/normal-notes>/)?.[1] ?? '0') || undefined;
    const normalType = token.match(/<normal-type>([^<]+)<\/normal-type>/)?.[1];
    atoms.push({
      partId,
      staff,
      voice,
      onset: measureStart + onset,
      duration,
      rest,
      midi: rest || !step ? null : midiOf(step, alter, octave),
      tieStart: /<tie type="start"\/>/.test(token),
      tieStop: /<tie type="stop"\/>/.test(token),
      tiedStart: /<tied type="start"\/>/.test(token),
      tiedStop: /<tied type="stop"\/>/.test(token),
      ...(writtenType ? { writtenType } : {}),
      ...(dots ? { dots } : {}),
      ...(actualNotes ? { actualNotes } : {}),
      ...(normalNotes ? { normalNotes } : {}),
      ...(normalType ? { normalType } : {}),
      ...( /<tuplet type="start"/.test(token) ? { tupletStart: true } : {}),
      ...( /<tuplet type="stop"/.test(token) ? { tupletStop: true } : {}),
    });
  }
  return atoms;
}

export function parsePianoXmlAtoms(xml: string): { atoms: PianoXmlAtom[]; divisions: number; elapsedSeconds: number | null; errors: string[] } {
  const errors: string[] = [];
  const divisions = Number(xml.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '0');
  const beats = Number(xml.match(/<beats>(\d+)<\/beats>/)?.[1] ?? '0');
  const beatType = Number(xml.match(/<beat-type>(\d+)<\/beat-type>/)?.[1] ?? '0');
  const tempo = Number(xml.match(/<per-minute>(\d+(?:\.\d+)?)<\/per-minute>/)?.[1] ?? xml.match(/<sound tempo="(\d+(?:\.\d+)?)"/)?.[1] ?? '0');
  if (divisions !== 480) errors.push(`divisions ${divisions}`);
  if (!Number.isFinite(beats) || !Number.isFinite(beatType) || beats <= 0 || beatType <= 0) {
    errors.push(`meter ${beats}/${beatType}`);
  }
  const parts = [...xml.matchAll(/<part id="([^"]+)"[\s\S]*?<\/part>/g)];
  const atoms: PianoXmlAtom[] = [];
  let totalQuarters = 0;
  for (const part of parts) {
    const partId = part[1] ?? '';
    const measureBlocks = [...part[0].matchAll(/<measure\b[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)];
    let carriedBeats = beats;
    let carriedType = beatType;
    let origin = 0;
    for (const measure of measureBlocks) {
      const body = measure[2] ?? '';
      const localBeats = Number(body.match(/<beats>(\d+)<\/beats>/)?.[1] ?? '');
      const localType = Number(body.match(/<beat-type>(\d+)<\/beat-type>/)?.[1] ?? '');
      if (Number.isFinite(localBeats) && localBeats > 0 && Number.isFinite(localType) && localType > 0) {
        const groupBeats = [...body.matchAll(/<beats>(\d+)<\/beats>/g)].map((item) => Number(item[1]));
        const groupTypes = [...body.matchAll(/<beat-type>(\d+)<\/beat-type>/g)].map((item) => Number(item[1]));
        if (groupBeats.length > 1 && groupTypes.every((item) => item === groupTypes[0])) {
          carriedBeats = groupBeats.reduce((sum, item) => sum + item, 0);
          carriedType = groupTypes[0]!;
        } else {
          carriedBeats = localBeats;
          carriedType = localType;
        }
      }
      atoms.push(...parseNotes(partId, body, origin, divisions));
      origin += carriedBeats * (4 / carriedType);
    }
    totalQuarters = Math.max(totalQuarters, origin);
  }
  const elapsedSeconds = tempo > 0 && totalQuarters > 0 ? totalQuarters * (60 / tempo) : null;
  return { atoms, divisions, elapsedSeconds, errors };
}

const WRITTEN_QUARTERS: Record<string, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  '16th': 0.25,
  '32nd': 0.125,
  '64th': 0.0625,
  '128th': 0.03125,
};

/** Sounding ticks already include the tuplet ratio. Do not scale them again. */
export function provePianoTupletRatios(xml: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const divisions = Number(xml.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '0');
  const notes = xml.match(/<note\b[^>]*>[\s\S]*?<\/note>/g) ?? [];
  for (const note of notes) {
    const duration = Number(note.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0');
    const type = note.match(/<type>([^<]+)<\/type>/)?.[1];
    const dots = note.match(/<dot\/>/g)?.length ?? 0;
    const actual = Number(note.match(/<actual-notes>(\d+)<\/actual-notes>/)?.[1] ?? '0');
    const normal = Number(note.match(/<normal-notes>(\d+)<\/normal-notes>/)?.[1] ?? '0');
    if (!type || !actual || !normal) continue;
    const baseQuarters = WRITTEN_QUARTERS[type];
    if (baseQuarters === undefined) {
      errors.push(`unsupported written type ${type}`);
      continue;
    }
    let written = baseQuarters * divisions;
    if (dots >= 1) written += written / 2;
    if (dots >= 2) written += baseQuarters * divisions / 4;
    if (!Number.isInteger(written) || written * normal !== duration * actual) {
      errors.push(`tuplet duration ${duration} does not match ${type} ${actual}:${normal}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function mergeSounding(atoms: PianoXmlAtom[]): PianoSoundingEvent[] {
  const pitched = atoms.filter((atom) => !atom.rest && atom.midi !== null);
  const rests = atoms.filter((atom) => atom.rest);
  const groups = new Map<string, PianoXmlAtom[]>();
  for (const atom of pitched) {
    const key = `${atom.partId}|${atom.staff}|${atom.voice}|${atom.midi}`;
    const list = groups.get(key) ?? [];
    list.push(atom);
    groups.set(key, list);
  }
  const sounding: PianoSoundingEvent[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.onset - b.onset || a.duration - b.duration);
    let current: PianoSoundingEvent | null = null;
    let openTie = false;
    for (const atom of list) {
      const continues = current
        && openTie
        && Math.abs(current.onset + current.duration - atom.onset) < 1e-4
        && atom.tieStop
        && atom.tiedStop;
      if (current && continues) {
        current.duration += atom.duration;
        openTie = atom.tieStart && atom.tiedStart;
      } else {
        current = {
          partId: atom.partId,
          staff: atom.staff,
          voice: atom.voice,
          onset: atom.onset,
          duration: atom.duration,
          rest: false,
          midi: atom.midi,
        };
        openTie = atom.tieStart && atom.tiedStart;
        sounding.push(current);
      }
    }
  }
  const restGroups = new Map<string, PianoXmlAtom[]>();
  for (const atom of rests) {
    const key = `${atom.partId}|${atom.staff}|${atom.voice}`;
    const list = restGroups.get(key) ?? [];
    list.push(atom);
    restGroups.set(key, list);
  }
  for (const list of restGroups.values()) {
    list.sort((a, b) => a.onset - b.onset);
    let current: PianoSoundingEvent | null = null;
    for (const atom of list) {
      if (current && Math.abs(current.onset + current.duration - atom.onset) < 1e-4) {
        current.duration += atom.duration;
      } else {
        current = {
          partId: atom.partId,
          staff: atom.staff,
          voice: atom.voice,
          onset: atom.onset,
          duration: atom.duration,
          rest: true,
          midi: null,
        };
        sounding.push(current);
      }
    }
  }
  return sounding.sort((a, b) => a.voice - b.voice || a.onset - b.onset || (a.midi ?? -1) - (b.midi ?? -1));
}

function modelOrigin(score: ScoreModel, partMeasures: { index: number; measureBeatSpanQuarters?: number }[], index: number): number {
  if (!score.pianoV11StageA?.enabled) return (index - 1) * 4;
  let acc = 0;
  for (const measure of [...partMeasures].sort((a, b) => a.index - b.index)) {
    if (measure.index === index) return acc;
    acc += measureBeatSpanQuartersOf(measure);
  }
  return acc;
}

function mergeModelTies(score: ScoreModel): PianoSoundingEvent[] {
  const atoms: PianoXmlAtom[] = [];
  for (const part of score.parts) {
    for (const measure of part.measures) {
      const origin = modelOrigin(score, part.measures, measure.index);
      for (const event of measure.events) {
        const voice = event.voice ?? 1;
        const staff = part.pianoGrandStaff ? (voice === 3 ? 2 : 1) : 1;
        if (event.kind === 'rest') {
          atoms.push({
            partId: part.id,
            staff,
            voice,
            onset: origin + event.startBeat,
            duration: event.duration,
            rest: true,
            midi: null,
            tieStart: false,
            tieStop: false,
            tiedStart: false,
            tiedStop: false,
          });
          continue;
        }
        if (event.kind !== 'note') continue;
        const pitches = [event.pitch, ...((event.pitches && event.pitches.length > 1) ? event.pitches.slice(1) : [])];
        const unique = pitches.filter((pitch, index) => pitches.indexOf(pitch) === index);
        const tie = event.notation?.tie;
        for (const midi of unique) {
          atoms.push({
            partId: part.id,
            staff,
            voice,
            onset: origin + event.startBeat,
            duration: event.duration,
            rest: false,
            midi,
            tieStart: tie === 'start' || tie === 'continue',
            tieStop: tie === 'stop' || tie === 'continue',
            tiedStart: tie === 'start' || tie === 'continue',
            tiedStop: tie === 'stop' || tie === 'continue',
          });
        }
      }
    }
  }
  return mergeSounding(atoms);
}

function keyOf(event: PianoSoundingEvent): string {
  return `${event.partId}|${event.staff}|${event.voice}|${event.rest ? 'r' : event.midi}|${event.onset.toFixed(4)}|${event.duration.toFixed(4)}`;
}

export function comparePianoScoreToXml(score: ScoreModel, xml: string): PianoOracleResult {
  const parsed = parsePianoXmlAtoms(xml);
  const errors = [...parsed.errors];
  if (score.pianoV11StageA?.enabled) {
    const ratios = provePianoTupletRatios(xml);
    errors.push(...ratios.errors);
  }
  const sounding = mergeSounding(parsed.atoms);
  const expected = mergeModelTies(score);
  const actualKeys = sounding.map(keyOf).sort();
  const expectedKeys = expected.map(keyOf).sort();
  if (actualKeys.join('\n') !== expectedKeys.join('\n')) {
    errors.push('sounding event multiset differs from the score');
    const actualSet = new Set(actualKeys);
    const expectedSet = new Set(expectedKeys);
    for (const key of expectedKeys) if (!actualSet.has(key)) errors.push(`missing ${key}`);
    for (const key of actualKeys) if (!expectedSet.has(key)) errors.push(`extra ${key}`);
  }
  const scoreAttacks = expected.filter((event) => !event.rest).length;
  const xmlAttacks = sounding.filter((event) => !event.rest).length;
  if (scoreAttacks !== xmlAttacks) errors.push(`sounding attacks xml ${xmlAttacks} score ${scoreAttacks}`);
  return {
    ok: errors.length === 0,
    errors,
    atoms: parsed.atoms,
    sounding,
    elapsedSeconds: parsed.elapsedSeconds,
    soundingAttacks: xmlAttacks,
  };
}
