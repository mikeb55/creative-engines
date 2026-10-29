/**
 * Experimental MORPH M1 source-anchored harmonic edit.
 * Starts from original guitar events; nudges pitch classes into a BHL world field.
 * Does not replace bars or invent phrases. Opt-in only — legacy transformHarmonic stays default.
 */

import fs from 'node:fs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { ingestBhlSource } from '../bhl/bhlIngest';
import { deriveBhlPhrasePlan } from '../bhl/bhlPhrase';
import { readBassBars } from '../bhl/bhlRhythm';
import { midiNear } from '../bhl/bhlRealise';
import { buildBhlWorldField, type BhlWorldId } from '../bhl/bhlWorlds';

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

export type SourceAnchoredHarmonicResult = {
  xml: string;
  world: BhlWorldId;
  editedNotes: number;
  unchangedNotes: number;
  lockedBars: number[];
  maxAbsShift: number;
};

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

/** Opening / climax / ending gesture bars — left pitch-identical. */
export function gestureLockBars(barCount: number): Set<number> {
  const form = formWindows(barCount);
  const locked = new Set<number>();
  // Opening gesture: bars 1–4 when form allows.
  for (let b = 1; b <= Math.min(4, barCount); b++) locked.add(b);
  for (const b of barsInRange(form.phraseAccentBars)) locked.add(b);
  for (const b of barsInRange(form.displaceTailBars)) locked.add(b);
  return locked;
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

  const locked = new Set<number>([
    ...opts.motifBars,
    ...(opts.protectedGuitarBars ? [...opts.protectedGuitarBars] : []),
    ...gestureLockBars(opts.barCount),
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

  return {
    xml: serialize(doc),
    world: opts.bhlWorld,
    editedNotes,
    unchangedNotes,
    lockedBars: [...locked].sort((a, b) => a - b),
    maxAbsShift,
  };
}
