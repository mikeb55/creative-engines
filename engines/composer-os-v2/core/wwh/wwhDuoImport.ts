/**
 * Read both guitar and bass parts from a partwise MusicXML score.
 * Does not write the source file. Odd bar counts and meter changes stay intact.
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { WWH_DIVISIONS } from './wwhPerformanceTypes';
import {
  durationAgreement,
  resolveDivisions,
  wwhBarTicksExact,
  type WwhTempoMark,
  type WwhTimeModification,
} from './wwhTiming';

export interface WwhTimingRepair {
  /** Replacement for this measure's divisions element. Null when the element already matches. */
  divisions: number | null;
  /** Musical duration for that note index. Null leaves the stored duration. */
  noteDurations: Array<number | null>;
}

const timingRepairs = new WeakMap<Element, WwhTimingRepair>();

export function timingRepairFor(element: Element): WwhTimingRepair | undefined {
  return timingRepairs.get(element);
}

export interface WwhImportedNote {
  rest: boolean;
  chord: boolean;
  /** Duration used for grid, compare, and generated context. */
  duration: number;
  /** Duration text in the file before a chord-tone alignment. */
  storedDuration: number;
  step?: string;
  alter?: number;
  octave?: number;
  voice: string;
  type?: string;
  dots: number;
  tieStart: boolean;
  tieStop: boolean;
  timeModification?: WwhTimeModification;
}

export interface WwhImportedMeasure {
  order: number;
  number: string;
  beats: number;
  beatType: number;
  /** Grid used for agreement and for generated bars. */
  divisions: number;
  /** Divisions element inherited from the file, before a unanimous type-implied correction. */
  statedDivisions: number;
  timingRepairs: string[];
  fifths: number;
  mode: string;
  clefSign: string;
  clefLine: number;
  transposeOctave: number;
  tempo: WwhTempoMark;
  rehearsal: string[];
  words: string[];
  harmony: string[];
  notes: WwhImportedNote[];
  element: Element;
  implicit: boolean;
  hasRepeat: boolean;
  hasEnding: boolean;
  hasTuplet: boolean;
  hasBackup: boolean;
  openTieOut: boolean;
  gridAgrees: boolean;
  roundedTuplet: boolean;
  specTicks: number | null;
}

export interface WwhImportedPart {
  id: string;
  name: string;
  measures: WwhImportedMeasure[];
}

export interface WwhDuoScore {
  title: string;
  movementTitle: string;
  composer: string;
  guitar: WwhImportedPart;
  bass: WwhImportedPart;
}

function localName(el: Element): string {
  return el.localName || el.tagName || '';
}

function children(parent: Element, name?: string): Element[] {
  const out: Element[] = [];
  const list = parent.childNodes;
  for (let i = 0; i < list.length; i++) {
    const node = list[i];
    if (!node || node.nodeType !== 1) continue;
    const el = node as Element;
    if (!name || localName(el) === name) out.push(el);
  }
  return out;
}

function textOf(parent: Element | null, name: string): string {
  if (!parent) return '';
  for (const child of children(parent, name)) {
    const text = child.textContent?.trim();
    if (text) return text;
  }
  return '';
}

function allByName(root: Element, name: string): Element[] {
  const out: Element[] = [];
  const walk = (el: Element) => {
    if (localName(el) === name) out.push(el);
    for (const child of children(el)) walk(child);
  };
  walk(root);
  return out;
}

function harmonyLabel(harmony: Element): string {
  const root = children(harmony, 'root')[0];
  const step = textOf(root ?? null, 'root-step');
  const alter = textOf(root ?? null, 'root-alter');
  const kind = children(harmony, 'kind')[0];
  const kindText = kind?.getAttribute('text') || kind?.textContent?.trim() || '';
  const alt = alter === '-1' ? 'b' : alter === '1' ? '#' : '';
  const bass = children(harmony, 'bass')[0];
  const bassStep = textOf(bass ?? null, 'bass-step');
  const bassAlter = textOf(bass ?? null, 'bass-alter');
  const bassBit = bassStep
    ? `/${bassAlter === '-1' ? 'b' : bassAlter === '1' ? '#' : ''}${bassStep}`
    : '';
  return `${step}${alt}${kindText}${bassBit}`.trim();
}

function tieFlags(note: Element): { tieStart: boolean; tieStop: boolean } {
  let tieStart = false;
  let tieStop = false;
  for (const tie of [...allByName(note, 'tie'), ...allByName(note, 'tied')]) {
    const type = tie.getAttribute('type');
    if (type === 'start') tieStart = true;
    if (type === 'stop') tieStop = true;
  }
  return { tieStart, tieStop };
}

function timeModificationOf(note: Element): WwhTimeModification | undefined {
  const mod = children(note, 'time-modification')[0];
  if (!mod) return undefined;
  const actualNotes = Number(textOf(mod, 'actual-notes') || '0');
  const normalNotes = Number(textOf(mod, 'normal-notes') || '0');
  const normalType = textOf(mod, 'normal-type') || 'eighth';
  if (!actualNotes || !normalNotes) return undefined;
  return { actualNotes, normalNotes, normalType };
}

function sameModification(left?: WwhTimeModification, right?: WwhTimeModification): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.actualNotes === right.actualNotes && left.normalNotes === right.normalNotes && left.normalType === right.normalType;
}

function parseNotes(measure: Element): WwhImportedNote[] {
  return children(measure, 'note').map((note) => {
    const pitch = children(note, 'pitch')[0];
    const alterRaw = textOf(pitch ?? null, 'alter');
    const type = textOf(note, 'type');
    const duration = Number(textOf(note, 'duration') || '0');
    return {
      rest: children(note, 'rest').length > 0 || !pitch,
      chord: children(note, 'chord').length > 0,
      duration,
      storedDuration: duration,
      step: textOf(pitch ?? null, 'step') || undefined,
      alter: alterRaw === '' ? 0 : Number(alterRaw),
      octave: textOf(pitch ?? null, 'octave') ? Number(textOf(pitch ?? null, 'octave')) : undefined,
      voice: textOf(note, 'voice') || '1',
      type: type || undefined,
      dots: children(note, 'dot').length,
      ...tieFlags(note),
      timeModification: timeModificationOf(note),
    };
  });
}

function metronomeOf(measure: Element): WwhTempoMark | null {
  const metro = allByName(measure, 'metronome')[0];
  if (!metro) return null;
  const beatUnit = textOf(metro, 'beat-unit') || null;
  const perMinute = textOf(metro, 'per-minute') || null;
  return { beatUnit, dots: children(metro, 'beat-unit-dot').length, perMinute, soundTempo: null };
}

function soundTempoOf(measure: Element): string | null {
  for (const sound of allByName(measure, 'sound')) {
    const tempo = sound.getAttribute('tempo');
    if (tempo) return tempo;
  }
  return null;
}

/**
 * A chord tone with the same type, dots, and tuplet as its attack sounds for the
 * attack's duration. Sibelius sometimes stores the undotted duration on the chord
 * tones while copying the dot. The file element is not changed here.
 */
function alignChordDurations(notes: WwhImportedNote[], barNumber: string): { overlay: Array<number | null>; repairs: string[] } {
  const overlay: Array<number | null> = notes.map(() => null);
  const repairs: string[] = [];
  let attack: WwhImportedNote | null = null;
  for (let index = 0; index < notes.length; index++) {
    const note = notes[index]!;
    if (!note.chord) {
      attack = note;
      continue;
    }
    if (!attack?.type || !note.type) continue;
    if (note.type !== attack.type || note.dots !== attack.dots) continue;
    if (!sameModification(note.timeModification, attack.timeModification)) continue;
    if (note.storedDuration === attack.duration) continue;
    note.duration = attack.duration;
    overlay[index] = attack.duration;
    const name = note.step ? `${note.step}${note.octave ?? ''}` : 'chord';
    repairs.push(`bar ${barNumber} chord ${name} duration ${note.storedDuration} aligned to ${attack.duration}`);
  }
  return { overlay, repairs };
}

function openTieOut(notes: readonly WwhImportedNote[]): boolean {
  const open = new Map<string, number>();
  for (const note of notes) {
    if (note.rest) continue;
    const key = `${note.voice}|${note.step}|${note.alter ?? 0}|${note.octave}`;
    if (note.tieStop) open.set(key, (open.get(key) ?? 0) - 1);
    if (note.tieStart) open.set(key, (open.get(key) ?? 0) + 1);
  }
  for (const count of open.values()) {
    if (count > 0) return true;
  }
  return false;
}

function gridOf(divisions: number, beats: number, beatType: number, notes: readonly WwhImportedNote[], implicit: boolean): {
  gridAgrees: boolean;
  roundedTuplet: boolean;
  specTicks: number | null;
} {
  const specTicks = wwhBarTicksExact(beats, beatType, divisions);
  let roundedTuplet = false;
  let mismatch = false;
  const sums = new Map<string, number>();
  for (const note of notes) {
    const agreement = durationAgreement(divisions, note.type, note.dots, note.duration, note.timeModification);
    if (agreement === 'rounded-tuplet') roundedTuplet = true;
    if (agreement === 'mismatch') mismatch = true;
    if (!note.chord) sums.set(note.voice, (sums.get(note.voice) ?? 0) + note.duration);
  }
  const fillOk =
    specTicks !== null &&
    (implicit
      ? [...sums.values()].every((sum) => sum > 0 && sum < specTicks)
      : sums.size > 0 && [...sums.values()].every((sum) => sum === specTicks));
  return { gridAgrees: fillOk && !mismatch, roundedTuplet, specTicks };
}

function partRole(name: string, id: string, index: number, count: number): 'guitar' | 'bass' | 'other' {
  const blob = `${name} ${id}`.toLowerCase();
  if (/bass/.test(blob)) return 'bass';
  if (/guitar|gtr/.test(blob)) return 'guitar';
  if (count === 2 && index === 0) return 'guitar';
  if (count === 2 && index === 1) return 'bass';
  return 'other';
}

export interface WwhPartwiseScore {
  title: string;
  movementTitle: string;
  composer: string;
  parts: WwhImportedPart[];
}

/** Read every part of a partwise MusicXML score. Any instrumentation; does not assign roles. */
export function importPartwiseMusicXml(xml: string): WwhPartwiseScore {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement;
  if (!root || localName(root) !== 'score-partwise') {
    throw new Error('WWH import expects score-partwise MusicXML');
  }
  const parserError = allByName(root, 'parsererror');
  if (parserError.length) throw new Error('MusicXML parse failed');

  const names = new Map<string, string>();
  for (const scorePart of children(root, 'part-list').flatMap((list) => children(list, 'score-part'))) {
    names.set(scorePart.getAttribute('id') || '', textOf(scorePart, 'part-name'));
  }

  const parts: WwhImportedPart[] = children(root, 'part').map((part) => {
    let divisions = WWH_DIVISIONS;
    let beats = 4;
    let beatType = 4;
    let fifths = 0;
    let mode = 'major';
    let clefSign = 'G';
    let clefLine = 2;
    let transposeOctave = 0;
    let tempo: WwhTempoMark = { beatUnit: null, dots: 0, perMinute: null, soundTempo: null };
    const measures = children(part, 'measure').map((measure, order) => {
      const attributes = children(measure, 'attributes')[0];
      if (attributes) {
        const nextDiv = Number(textOf(attributes, 'divisions'));
        if (Number.isFinite(nextDiv) && nextDiv > 0) divisions = nextDiv;
        const time = children(attributes, 'time')[0];
        if (time) {
          const nextBeats = Number(textOf(time, 'beats'));
          const nextType = Number(textOf(time, 'beat-type'));
          if (nextBeats > 0) beats = nextBeats;
          if (nextType > 0) beatType = nextType;
        }
        const key = children(attributes, 'key')[0];
        if (key) {
          const nextFifths = textOf(key, 'fifths');
          if (nextFifths !== '') fifths = Number(nextFifths);
          const nextMode = textOf(key, 'mode');
          if (nextMode) mode = nextMode;
        }
        const clef = children(attributes, 'clef')[0];
        if (clef) {
          const sign = textOf(clef, 'sign');
          const line = textOf(clef, 'line');
          if (sign) clefSign = sign;
          if (line) clefLine = Number(line);
        }
        const transpose = children(attributes, 'transpose')[0];
        if (transpose) {
          const octave = textOf(transpose, 'octave-change');
          if (octave !== '') transposeOctave = Number(octave);
        }
      }
      const metro = metronomeOf(measure);
      const sound = soundTempoOf(measure);
      if (metro || sound) {
        tempo = {
          beatUnit: metro?.beatUnit ?? tempo.beatUnit,
          dots: metro ? metro.dots : tempo.dots,
          perMinute: metro?.perMinute ?? tempo.perMinute,
          soundTempo: sound ?? tempo.soundTempo,
        };
      }
      const notes = parseNotes(measure);
      const barNumber = measure.getAttribute('number') || String(order + 1);
      const aligned = alignChordDurations(notes, barNumber);
      const statedDivisions = divisions;
      const resolved = resolveDivisions(statedDivisions, notes);
      if (resolved.normalized) divisions = resolved.divisions;
      const elementDivisions = attributes ? Number(textOf(attributes, 'divisions')) : NaN;
      const repairDivisions =
        Number.isFinite(elementDivisions) && elementDivisions > 0 && elementDivisions !== divisions ? divisions : null;
      const repairs = [...aligned.repairs];
      if (repairDivisions !== null) repairs.push(`divisions ${elementDivisions} read as ${repairDivisions}`);
      if (repairDivisions !== null || aligned.overlay.some((value) => value !== null)) {
        timingRepairs.set(measure, { divisions: repairDivisions, noteDurations: aligned.overlay });
      }
      const implicit = measure.getAttribute('implicit') === 'yes';
      const grid = gridOf(divisions, beats, beatType, notes, implicit);
      return {
        order,
        number: barNumber,
        beats,
        beatType,
        divisions,
        statedDivisions,
        timingRepairs: repairs,
        fifths,
        mode,
        clefSign,
        clefLine,
        transposeOctave,
        tempo: { ...tempo },
        rehearsal: allByName(measure, 'rehearsal')
          .map((el) => el.textContent?.trim() || '')
          .filter(Boolean),
        words: allByName(measure, 'words')
          .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean),
        harmony: allByName(measure, 'harmony').map(harmonyLabel),
        notes,
        element: measure,
        implicit,
        hasRepeat: allByName(measure, 'repeat').length > 0,
        hasEnding: allByName(measure, 'ending').length > 0,
        hasTuplet: allByName(measure, 'tuplet').length > 0 || allByName(measure, 'time-modification').length > 0,
        hasBackup: children(measure, 'backup').length > 0,
        openTieOut: openTieOut(notes),
        gridAgrees: grid.gridAgrees,
        roundedTuplet: grid.roundedTuplet,
        specTicks: grid.specTicks,
      };
    });
    const id = part.getAttribute('id') || '';
    return { id, name: names.get(id) || id, measures };
  });

  if (!parts.length) throw new Error('MusicXML score has no parts');
  return {
    title: textOf(children(root, 'work')[0] ?? null, 'work-title') || 'Untitled',
    movementTitle: textOf(root, 'movement-title'),
    composer: (() => {
      const creators = allByName(root, 'creator');
      return creators.map((el) => el.textContent?.trim() || '').find(Boolean) || '';
    })(),
    parts,
  };
}

export function importWwhDuoMusicXml(xml: string): WwhDuoScore {
  const { title, movementTitle, composer, parts } = importPartwiseMusicXml(xml);
  if (parts.length < 2) throw new Error(`WWH duo import needs two parts, found ${parts.length}`);
  const guitar = parts.find((part, index) => partRole(part.name, part.id, index, parts.length) === 'guitar');
  const bass = parts.find((part, index) => partRole(part.name, part.id, index, parts.length) === 'bass');
  if (!guitar || !bass) throw new Error('WWH duo import could not assign guitar and bass parts');
  if (guitar.measures.length !== bass.measures.length) {
    throw new Error(
      `guitar/bass bar count mismatch ${guitar.measures.length} vs ${bass.measures.length}`
    );
  }
  return { title, movementTitle, composer, guitar, bass };
}

export function serializeMeasure(measure: Element): string {
  return new XMLSerializer().serializeToString(measure);
}

export function pitchFingerprint(measures: readonly WwhImportedMeasure[]): string {
  return measures
    .map((measure) =>
      measure.notes
        .filter((note) => !note.rest)
        .map((note) => `${note.step}${note.alter ?? 0}${note.octave}`)
        .join('.')
    )
    .join('|');
}
