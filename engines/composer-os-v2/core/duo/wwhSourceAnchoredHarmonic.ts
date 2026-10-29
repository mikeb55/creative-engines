/**
 * Experimental MORPH M1 source-anchored harmonic edit.
 * Starts from original guitar events; nudges pitch classes into a BHL world field.
 * Does not replace bars or invent phrases. Opt-in only — legacy transformHarmonic stays default.
 * Bounded phrase-develop: one motif-ops transpose on a source motif inside bars 17–24.
 * Progressive liquidation: buildChain displace→fragment→insert-rest→fragment on bars 13–16
 * from a bars 9–12 motif cell (identity bars left untouched).
 */

import fs from 'node:fs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { ingestBhlSource } from '../bhl/bhlIngest';
import { deriveBhlPhrasePlan } from '../bhl/bhlPhrase';
import { readBassBars } from '../bhl/bhlRhythm';
import { midiNear } from '../bhl/bhlRealise';
import { buildBhlWorldField, type BhlWorldId } from '../bhl/bhlWorlds';
import { buildChain, type ChainPlanStep } from '../motif-ops/developmentChain';
import type { MotifNoteEvent } from '../motif-ops/types';

type BarRange = { from: number; to: number };

/** Mirror of dual-part defaultFormWindows — local copy avoids import cycle. */
function formWindows(barCount: number): {
  phraseAccentBars: BarRange;
  displaceTailBars: BarRange;
} {
  const s = (n: number) => Math.max(1, Math.min(barCount, Math.round((n * barCount) / 40)));
  const phraseFrom = Math.min(Math.max(3, s(17)), barCount);
  const phraseTo = Math.max(phraseFrom, s(24));
  const tailFrom = Math.min(Math.max(3, s(37)), barCount);
  return {
    phraseAccentBars: { from: phraseFrom, to: phraseTo },
    displaceTailBars: { from: tailFrom, to: barCount },
  };
}

const STEP_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const PC_SPELL: Array<[string, number]> = [
  ['C', 0],
  ['D', -1],
  ['D', 0],
  ['E', -1],
  ['E', 0],
  ['F', 0],
  ['G', -1],
  ['G', 0],
  ['A', -1],
  ['A', 0],
  ['B', -1],
  ['B', 0],
];

const MAX_SHIFT = 3;

export type SourceAnchoredHarmonicOpts = {
  sourcePath: string;
  motifBars: Set<number>;
  protectedGuitarBars?: Set<number>;
  title: string;
  movement: string;
  barCount: number;
  seed: number;
  bhlWorld: BhlWorldId;
};

export type PhraseDevelopEdit = { from: number; to: number };

export type SourceAnchoredHarmonicResult = {
  xml: string;
  world: BhlWorldId;
  editedNotes: number;
  unchangedNotes: number;
  lockedBars: number[];
  maxAbsShift: number;
  /** One motif-ops transpose inside the phrase window (bars 17–24). */
  phraseDevelop?: {
    bar: number;
    op: 'transpose';
    semitones: number;
    edits: PhraseDevelopEdit[];
  };
  /** Progressive liquidation of motif into bars 13–16 (displace / fragment / rests). */
  phraseLiquidate?: {
    sourceBar: number;
    bars: number[];
    ops: string[];
  };
};

/** Motif identity statement — pitch/rhythm frozen (Black Aura M2 cell). */
export const MOTIF_IDENTITY_BARS: BarRange = { from: 9, to: 12 };
/** Progressive liquidation target (developing variation of identity motif). */
export const PHRASE_LIQUIDATE_BARS: BarRange = { from: 13, to: 16 };
/** Phrase window for the bounded M1 develop experiment (Black Aura 39-bar form). */
export const PHRASE_DEVELOP_BARS: BarRange = { from: 17, to: 24 };
/** Single source motif bar inside that window (no chords/ties; C-boundary safe for ±1). */
export const PHRASE_DEVELOP_MOTIF_BAR = 22;
export const PHRASE_DEVELOP_SEMITONES = 1;

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function elementChildren(parent: Element, name?: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const n = parent.childNodes[i];
    if (n?.nodeType === 1 && (!name || (n as Element).nodeName === name)) {
      out.push(n as Element);
    }
  }
  return out;
}

function textOf(el: Element | undefined, name: string): string {
  if (!el) return '';
  return elementChildren(el, name)[0]?.textContent?.trim() ?? '';
}

function parseMusicXml(xml: string): Document {
  const errors: string[] = [];
  const doc = new DOMParser({
    onError: (level: string, message: string) => {
      if (level !== 'warning') errors.push(message);
    },
  }).parseFromString(xml, 'text/xml') as unknown as Document;
  if (errors.length) throw new Error(`MusicXML parse failed: ${errors[0]}`);
  return doc;
}

function serialize(doc: Document): string {
  return new XMLSerializer().serializeToString(doc);
}

function partById(doc: Document, id: string): Element {
  const parts = doc.getElementsByTagName('part');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (p.getAttribute('id') === id) return p;
  }
  throw new Error(`missing part ${id}`);
}

function measuresOf(part: Element): Element[] {
  return elementChildren(part, 'measure');
}

function barNumber(measure: Element): number {
  return Number(measure.getAttribute('number'));
}

function midiOf(step: string, alter: number, octave: number): number {
  return 12 * (octave + 1) + STEP_PC[step]! + alter;
}

function noteMidi(note: Element): number | null {
  if (elementChildren(note, 'rest').length) return null;
  const pitch = elementChildren(note, 'pitch')[0];
  if (!pitch) return null;
  const step = textOf(pitch, 'step');
  const alter = Number(textOf(pitch, 'alter') || 0);
  const octave = Number(textOf(pitch, 'octave'));
  if (!step || !Number.isFinite(octave)) return null;
  return midiOf(step, alter, octave);
}

function noteOctave(note: Element): number | null {
  const pitch = elementChildren(note, 'pitch')[0];
  if (!pitch) return null;
  const octave = Number(textOf(pitch, 'octave'));
  return Number.isFinite(octave) ? octave : null;
}

/** Change step/alter only — octave element untouched. */
function setPitchKeepOctave(note: Element, midi: number, forcedOctave: number): void {
  const pitch = elementChildren(note, 'pitch')[0];
  if (!pitch) return;
  const pc = mod12(midi);
  const [stepName, alterVal] = PC_SPELL[pc]!;
  const step = elementChildren(pitch, 'step')[0];
  if (step) step.textContent = stepName;
  let alter = elementChildren(pitch, 'alter')[0];
  if (alterVal) {
    if (!alter) {
      alter = note.ownerDocument!.createElement('alter');
      pitch.insertBefore(alter, elementChildren(pitch, 'octave')[0] ?? null);
    }
    alter.textContent = String(alterVal);
  } else if (alter) {
    pitch.removeChild(alter);
  }
  const octave = elementChildren(pitch, 'octave')[0];
  if (octave) octave.textContent = String(forcedOctave);
}

function setTitle(doc: Document, title: string, movement: string): void {
  const wt = doc.getElementsByTagName('work-title')[0];
  if (wt) wt.textContent = title;
  const mt = doc.getElementsByTagName('movement-title')[0];
  if (mt) mt.textContent = movement;
}

function barsInRange(range: BarRange): number[] {
  const out: number[] = [];
  for (let b = range.from; b <= range.to; b++) out.push(b);
  return out;
}

/** Opening / ending gesture bars — left pitch-identical. Phrase window 17–24 is develop target. */
export function gestureLockBars(barCount: number): Set<number> {
  const form = formWindows(barCount);
  const locked = new Set<number>();
  // Opening gesture: bars 1–4 when form allows.
  for (let b = 1; b <= Math.min(4, barCount); b++) locked.add(b);
  for (const b of barsInRange(form.displaceTailBars)) locked.add(b);
  return locked;
}

function clipRange(range: BarRange, barCount: number): BarRange {
  const from = Math.min(range.from, barCount);
  const to = Math.min(range.to, barCount);
  return { from, to: Math.max(from, to) };
}

function motifIdentityBars(barCount: number): Set<number> {
  return new Set(barsInRange(clipRange(MOTIF_IDENTITY_BARS, barCount)));
}

function phraseLiquidateBars(barCount: number): Set<number> {
  return new Set(barsInRange(clipRange(PHRASE_LIQUIDATE_BARS, barCount)));
}

function phraseWindowBars(barCount: number): Set<number> {
  return new Set(barsInRange(clipRange(PHRASE_DEVELOP_BARS, barCount)));
}

function soundingNoteCount(measure: Element): number {
  return elementChildren(measure, 'note').filter((n) => noteMidi(n) != null).length;
}

/** Extract monophonic motif events in MusicXML duration ticks (local units). */
function extractMeasureMotifEvents(measure: Element): MotifNoteEvent[] {
  const events: MotifNoteEvent[] = [];
  let onset = 0;
  let lastMelodicOnset = 0;
  for (const n of elementChildren(measure, 'note')) {
    const isChord = elementChildren(n, 'chord').length > 0;
    const durRaw = Number(textOf(n, 'duration') || 0);
    const duration = durRaw > 0 ? durRaw : 1;
    const at = isChord ? lastMelodicOnset : onset;
    if (elementChildren(n, 'rest').length) {
      events.push({ onset: at, duration, midi: null });
      if (!isChord) {
        lastMelodicOnset = onset;
        onset += duration;
      }
      continue;
    }
    const midi = noteMidi(n);
    events.push({ onset: at, duration, midi });
    if (!isChord) {
      lastMelodicOnset = onset;
      onset += duration;
    }
  }
  return events;
}

/**
 * Progressive liquidation: root from bars 9–12 → buildChain steps → write bars 13–16.
 * Identity bars are never rewritten.
 */
function applyPhraseLiquidate(
  gtr: Element[],
  barCount: number,
): NonNullable<SourceAnchoredHarmonicResult['phraseLiquidate']> | undefined {
  const idBars = barsInRange(clipRange(MOTIF_IDENTITY_BARS, barCount));
  const liqBars = barsInRange(clipRange(PHRASE_LIQUIDATE_BARS, barCount));
  if (!liqBars.length) return undefined;

  let sourceBar = 0;
  let rootEvents: MotifNoteEvent[] | undefined;
  let sourceTicks = 0;
  for (let i = idBars.length - 1; i >= 0; i--) {
    const b = idBars[i]!;
    const m = gtr.find((x) => barNumber(x) === b);
    if (!m || measureHasChordsOrTies(m)) continue;
    const events = extractMeasureMotifEvents(m);
    if (events.filter((e) => e.midi != null).length < 2) continue;
    sourceBar = b;
    rootEvents = events;
    sourceTicks = measureSoundingTicks(m);
    break;
  }
  if (!rootEvents || !(sourceTicks > 0)) return undefined;

  const n = rootEvents.length;
  const displaceAmt = Math.max(1, Math.round(sourceTicks / 4));
  const restDur = Math.max(1, Math.round(sourceTicks / 4));
  const frag1 = Math.max(2, Math.ceil(n * 0.75));
  const frag2 = Math.max(1, Math.ceil(n * 0.4));
  const plan: ChainPlanStep[] = [
    { op: 'displace', params: { amount: displaceAmt } },
    { op: 'fragment-head', params: { count: frag1 } },
    { op: 'insert-rest', params: { index: 1, duration: restDur } },
    { op: 'fragment-head', params: { count: frag2 } },
  ];
  const chain = buildChain({ id: 'm1-liq', events: rootEvents }, plan);
  const written: number[] = [];
  const ops: string[] = [];
  for (let i = 0; i < liqBars.length; i++) {
    const bar = liqBars[i]!;
    const developed = chain.results[i];
    const measure = gtr.find((m) => barNumber(m) === bar);
    if (!developed || !measure || measureHasChordsOrTies(measure)) continue;
    writePhraseMeasureEvents(measure, developed.events);
    written.push(bar);
    ops.push(plan[i]!.op);
  }
  if (!written.length) return undefined;
  return { sourceBar, bars: written, ops };
}

function measureHasChordsOrTies(measure: Element): boolean {
  for (const n of elementChildren(measure, 'note')) {
    if (elementChildren(n, 'chord').length) return true;
    if (elementChildren(n, 'tie').length) return true;
    for (const notations of elementChildren(n, 'notations')) {
      if (elementChildren(notations, 'tied').length) return true;
    }
  }
  return false;
}

/** Non-chord note duration sum — authoritative bar length for write-back. */
function measureSoundingTicks(measure: Element): number {
  let ticks = 0;
  for (const n of elementChildren(measure, 'note')) {
    if (elementChildren(n, 'chord').length) continue;
    ticks += Number(textOf(n, 'duration') || 0);
  }
  return ticks;
}

function spellMidi(midi: number): { step: string; alter: number; octave: number } {
  const pc = mod12(midi);
  const [stepName, alterVal] = PC_SPELL[pc]!;
  return { step: stepName, alter: alterVal, octave: Math.floor(midi / 12) - 1 };
}

function clearMeasureNotes(measure: Element): void {
  for (const n of elementChildren(measure, 'note')) {
    measure.removeChild(n);
  }
}

function appendMotifNote(
  doc: Document,
  measure: Element,
  event: { duration: number; midi: number | null },
  voice: string,
): void {
  const note = doc.createElement('note');
  if (event.midi == null) {
    note.appendChild(doc.createElement('rest'));
  } else {
    const sp = spellMidi(event.midi);
    const pitch = doc.createElement('pitch');
    const step = doc.createElement('step');
    step.textContent = sp.step;
    pitch.appendChild(step);
    if (sp.alter) {
      const alter = doc.createElement('alter');
      alter.textContent = String(sp.alter);
      pitch.appendChild(alter);
    }
    const octave = doc.createElement('octave');
    octave.textContent = String(sp.octave);
    pitch.appendChild(octave);
    note.appendChild(pitch);
  }
  const dur = doc.createElement('duration');
  dur.textContent = String(event.duration);
  note.appendChild(dur);
  const voiceEl = doc.createElement('voice');
  voiceEl.textContent = voice;
  note.appendChild(voiceEl);
  measure.appendChild(note);
}

export type PhraseMeasureWriteResult = {
  writtenEvents: number;
  paddedRestTicks: number;
  totalTicks: number;
};

/**
 * Rhythmic phrase write-back: replace a guitar measure note stream with
 * buildChain MotifNoteEvent output (onsets / durations / rests / count may change).
 * Preserves measure duration, non-note children (attributes, harmony), refuses chords/ties.
 * Units match local extract (MusicXML duration ticks). Not wired into pitch-only transpose.
 */
export function writePhraseMeasureEvents(
  measure: Element,
  events: readonly MotifNoteEvent[],
): PhraseMeasureWriteResult {
  if (measureHasChordsOrTies(measure)) {
    throw new Error('phrase write-back refuses measures with chords or ties');
  }
  const totalTicks = measureSoundingTicks(measure);
  if (!(totalTicks > 0)) {
    throw new Error('phrase write-back requires positive measure duration');
  }
  const doc = measure.ownerDocument!;
  const firstNote = elementChildren(measure, 'note')[0];
  const voice = firstNote ? textOf(firstNote, 'voice') || '1' : '1';

  const sorted = [...events]
    .map((e) => ({
      onset: Math.max(0, e.onset),
      duration: Math.max(0, e.duration),
      midi: e.midi,
    }))
    .filter((e) => e.duration > 0)
    .sort((a, b) => a.onset - b.onset || (a.midi == null ? 1 : 0) - (b.midi == null ? 1 : 0));

  clearMeasureNotes(measure);

  let cursor = 0;
  let writtenEvents = 0;
  for (const ev of sorted) {
    if (cursor >= totalTicks) break;
    if (ev.onset > cursor) {
      const gap = Math.min(ev.onset, totalTicks) - cursor;
      if (gap > 0) {
        appendMotifNote(doc, measure, { duration: gap, midi: null }, voice);
        writtenEvents += 1;
        cursor += gap;
      }
    }
    if (cursor >= totalTicks) break;
    if (ev.onset < cursor) continue; // overlap — skip
    const dur = Math.min(ev.duration, totalTicks - cursor);
    if (dur <= 0) continue;
    appendMotifNote(doc, measure, { duration: dur, midi: ev.midi }, voice);
    writtenEvents += 1;
    cursor += dur;
  }

  let paddedRestTicks = 0;
  if (cursor < totalTicks) {
    paddedRestTicks = totalTicks - cursor;
    appendMotifNote(doc, measure, { duration: paddedRestTicks, midi: null }, voice);
    writtenEvents += 1;
  }

  return { writtenEvents, paddedRestTicks, totalTicks };
}

/**
 * Pitch-only motif-ops transpose on one source-derived bar motif.
 * Preserves note count, timing, rests; writes via setPitchKeepOctave.
 */
function applyPhraseDevelopTranspose(
  measure: Element,
  semitones: number,
): PhraseDevelopEdit[] {
  const notes = elementChildren(measure, 'note');
  const events: MotifNoteEvent[] = [];
  const targets: Array<{ note: Element; octave: number } | null> = [];
  let onset = 0;
  let lastMelodicOnset = 0;
  for (const n of notes) {
    const isChord = elementChildren(n, 'chord').length > 0;
    const durRaw = Number(textOf(n, 'duration') || 0);
    const duration = durRaw > 0 ? durRaw : 1;
    const at = isChord ? lastMelodicOnset : onset;
    if (elementChildren(n, 'rest').length) {
      events.push({ onset: at, duration, midi: null });
      targets.push(null);
      if (!isChord) {
        lastMelodicOnset = onset;
        onset += duration;
      }
      continue;
    }
    const midi = noteMidi(n);
    const octave = noteOctave(n);
    if (midi == null || octave == null) {
      events.push({ onset: at, duration, midi: null });
      targets.push(null);
      if (!isChord) {
        lastMelodicOnset = onset;
        onset += duration;
      }
      continue;
    }
    events.push({ onset: at, duration, midi });
    targets.push({ note: n, octave });
    if (!isChord) {
      lastMelodicOnset = onset;
      onset += duration;
    }
  }
  const chain = buildChain(
    { id: 'm1-phrase', events },
    [{ op: 'transpose', params: { semitones } }],
  );
  const developed = chain.results[0];
  if (!developed || developed.events.length !== events.length) {
    throw new Error('phrase-develop transpose changed event count');
  }
  const edits: PhraseDevelopEdit[] = [];
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const nextMidi = developed.events[i]!.midi;
    const prevMidi = events[i]!.midi;
    if (!target || nextMidi == null || prevMidi == null) continue;
    if (nextMidi === prevMidi) continue;
    setPitchKeepOctave(target.note, nextMidi, target.octave);
    edits.push({ from: prevMidi, to: nextMidi });
  }
  return edits;
}

function pickAnchoredMidi(
  midi: number,
  octave: number,
  field: readonly number[],
  rng: () => number,
): number | null {
  const pc = mod12(midi);
  if (field.includes(pc)) return null; // already legal — leave unchanged
  const low = midi - MAX_SHIFT;
  const high = midi + MAX_SHIFT;
  const options: number[] = [];
  for (const want of field) {
    const near = midiNear(want, low, high, midi);
    if (mod12(near) !== mod12(want)) continue;
    if (Math.abs(near - midi) > MAX_SHIFT || Math.abs(near - midi) < 1) continue;
    const spelledOctave = Math.floor(near / 12) - 1;
    if (spelledOctave !== octave) continue;
    options.push(near);
  }
  if (!options.length) return null;
  options.sort((a, b) => Math.abs(a - midi) - Math.abs(b - midi) || a - b);
  const bestDist = Math.abs(options[0]! - midi);
  const tied = options.filter((m) => Math.abs(m - midi) === bestDist);
  return tied[Math.floor(rng() * tied.length)]!;
}

/**
 * Source-anchored harmonic candidate: clone source XML, nudge editable guitar pitches
 * into BHL world field (±3, same octave). Bass / motif / protected / gestures untouched.
 */
export function transformHarmonicSourceAnchored(
  opts: SourceAnchoredHarmonicOpts,
): SourceAnchoredHarmonicResult {
  const sourceXml = fs.readFileSync(opts.sourcePath, 'utf8');
  const lock = ingestBhlSource({
    sourcePath: opts.sourcePath,
    span: { from: 1, to: opts.barCount },
    protectedGuitarBars: [
      ...opts.motifBars,
      ...(opts.protectedGuitarBars ? [...opts.protectedGuitarBars] : []),
    ],
  });
  const plan = deriveBhlPhrasePlan(lock.bass, lock.metres, lock.bassPartId, { from: 1, to: opts.barCount }, opts.seed);
  const bassBars = readBassBars(lock.bass, lock.metres, lock.bassPartId);
  const bassByBar = new Map(bassBars.map((b) => [b.bar, b]));
  const tensionByBar = new Map<number, (typeof plan.regions)[number]['tensionState']>();
  for (const region of plan.regions) {
    for (const bar of region.bars) tensionByBar.set(bar, region.tensionState);
  }

  const phraseBars = phraseWindowBars(opts.barCount);
  const identityBars = motifIdentityBars(opts.barCount);
  const liquidateBars = phraseLiquidateBars(opts.barCount);
  const locked = new Set<number>([
    ...opts.motifBars,
    ...(opts.protectedGuitarBars ? [...opts.protectedGuitarBars] : []),
    ...gestureLockBars(opts.barCount),
    ...identityBars,
    ...liquidateBars,
    ...phraseBars,
  ]);

  const doc = parseMusicXml(sourceXml);
  setTitle(doc, opts.title, opts.movement);
  const gtr = measuresOf(partById(doc, lock.guitarPartId));
  const rng = mulberry32(opts.seed);
  let editedNotes = 0;
  let unchangedNotes = 0;
  let maxAbsShift = 0;

  for (const measure of gtr) {
    const bar = barNumber(measure);
    const notes = elementChildren(measure, 'note');
    if (locked.has(bar)) {
      for (const n of notes) {
        if (noteMidi(n) != null) unchangedNotes += 1;
      }
      continue;
    }
    const bassBar = bassByBar.get(bar);
    if (!bassBar) {
      for (const n of notes) {
        if (noteMidi(n) != null) unchangedNotes += 1;
      }
      continue;
    }
    const tension = tensionByBar.get(bar) ?? 'primary';
    const field = buildBhlWorldField(opts.bhlWorld, bassBar, tension).pitchClasses;

    for (const n of notes) {
      if (elementChildren(n, 'rest').length) continue;
      const midi = noteMidi(n);
      const octave = noteOctave(n);
      if (midi == null || octave == null) continue;
      const next = pickAnchoredMidi(midi, octave, field, rng);
      if (next == null) {
        unchangedNotes += 1;
        continue;
      }
      setPitchKeepOctave(n, next, octave);
      editedNotes += 1;
      maxAbsShift = Math.max(maxAbsShift, Math.abs(next - midi));
    }
  }

  let phraseDevelop: SourceAnchoredHarmonicResult['phraseDevelop'];
  if (phraseBars.has(PHRASE_DEVELOP_MOTIF_BAR)) {
    const motifMeasure = gtr.find((m) => barNumber(m) === PHRASE_DEVELOP_MOTIF_BAR);
    if (!motifMeasure) {
      throw new Error(`phrase-develop motif bar ${PHRASE_DEVELOP_MOTIF_BAR} missing`);
    }
    const beforeSounding = soundingNoteCount(motifMeasure);
    const edits = applyPhraseDevelopTranspose(motifMeasure, PHRASE_DEVELOP_SEMITONES);
    unchangedNotes -= beforeSounding;
    editedNotes += edits.length;
    unchangedNotes += beforeSounding - edits.length;
    for (const e of edits) {
      maxAbsShift = Math.max(maxAbsShift, Math.abs(e.to - e.from));
    }
    phraseDevelop = {
      bar: PHRASE_DEVELOP_MOTIF_BAR,
      op: 'transpose',
      semitones: PHRASE_DEVELOP_SEMITONES,
      edits,
    };
  }

  let phraseLiquidate: SourceAnchoredHarmonicResult['phraseLiquidate'];
  const liquidateBefore = new Map<number, number>();
  for (const bar of liquidateBars) {
    const measure = gtr.find((m) => barNumber(m) === bar);
    if (measure) liquidateBefore.set(bar, soundingNoteCount(measure));
  }
  const liquidate = applyPhraseLiquidate(gtr, opts.barCount);
  if (liquidate) {
    for (const bar of liquidate.bars) {
      const measure = gtr.find((m) => barNumber(m) === bar);
      if (!measure) continue;
      const before = liquidateBefore.get(bar) ?? 0;
      const after = soundingNoteCount(measure);
      unchangedNotes -= before;
      editedNotes += after;
    }
    phraseLiquidate = liquidate;
  }

  const developedBars = new Set<number>([
    PHRASE_DEVELOP_MOTIF_BAR,
    ...(phraseLiquidate?.bars ?? []),
  ]);
  const lockedForReport = [...locked].filter((b) => !developedBars.has(b));

  return {
    xml: serialize(doc),
    world: opts.bhlWorld,
    editedNotes,
    unchangedNotes,
    lockedBars: lockedForReport.sort((a, b) => a - b),
    maxAbsShift,
    phraseDevelop,
    phraseLiquidate,
  };
}
