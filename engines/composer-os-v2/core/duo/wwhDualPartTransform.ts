/**
 * WWH dual-part MusicXML transform — guitar + upright bass.
 * Motif-preserving profiles: harmonic | contrapuntal | rhythmic.
 * DTE V1.1 bass-only mode: lyrical | contrapuntal | rhythmic with lockGuitar + preserveHarmony.
 * No hard-coded score paths. Callers pass source/out/options.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { composeBhlGuitar } from '../bhl/bhlCompose';
import type { BhlWorldId } from '../bhl/bhlWorlds';
import {
  transformBassOnly,
  verifyBassOnlyLocks,
  type BassOnlyProfile,
} from './wwhBassOnlyTransform';

export type DualPartProfile = 'harmonic' | 'contrapuntal' | 'rhythmic';
export type DualPartMode = 'dual' | 'bassOnly';
export type { BassOnlyProfile };

export type BarRange = { from: number; to: number };

export type DualPartTransformOptions = {
  sourcePath: string;
  outDir: string;
  /** Default dual-part profiles. Ignored when mode is bassOnly. */
  profiles?: DualPartProfile[];
  /** bassOnly profiles (default: lyrical, contrapuntal, rhythmic). */
  bassOnlyProfiles?: BassOnlyProfile[];
  /** dual (default) rewrites guitar+bass; bassOnly rewrites bass only. */
  mode?: DualPartMode;
  /** Required true when mode=bassOnly. */
  lockGuitar?: boolean;
  /** Required true when mode=bassOnly. */
  preserveHarmony?: boolean;
  /**
   * When true, harmonic profile keeps source bass pitches/rhythms (skips bass counterpoint rewrite).
   * Default false. Incompatible with mode=bassOnly.
   */
  lockBass?: boolean;
  /** Guitar bars left pitch-identical (dual mode). Default: [1, 2]. */
  motifBars?: number[];
  /** Optional SHA-256 gate on source. */
  expectedSha256?: string;
  title?: string;
  /** Filename stem for outputs (default: basename of source without ext). */
  stem?: string;
  seed?: number;
  bhlWorld?: BhlWorldId;
  exchangeBars?: BarRange;
  displaceBars?: BarRange;
  displaceTailBars?: BarRange;
  phraseAccentBars?: BarRange;
  /** Soft range checks. */
  guitarMidi?: { min: number; max: number };
  bassMidi?: { min: number; max: number };
  inversionAxisMidi?: number;
  /** Minimum chord-symbol count before validation warns (default: half of bars). */
  minHarmonyCount?: number;
};

export type DualPartOutput = {
  id: string;
  profile: DualPartProfile | BassOnlyProfile;
  file: string;
  path: string;
  xml: string;
  note: string;
  sha256: string;
};

export type DualPartTransformResult = {
  sourcePath: string;
  sourceSha256: string;
  barCount: number;
  outDir: string;
  outputs: DualPartOutput[];
  validation: string[];
  motifOk: boolean;
};

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

const DEFAULT_GUITAR = { min: 40, max: 76 };
const DEFAULT_BASS = { min: 28, max: 55 };

export function sha256File(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function midiOf(step: string, alter: number, octave: number): number {
  return 12 * (octave + 1) + STEP_PC[step]! + alter;
}

function spellMidi(midi: number): { step: string; alter: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12;
  const [step, alter] = PC_SPELL[pc]!;
  const octave = Math.floor(midi / 12) - 1;
  return { step, alter, octave };
}

function clamp(midi: number, lo: number, hi: number): number {
  while (midi < lo) midi += 12;
  while (midi > hi) midi -= 12;
  return midi;
}

function invertMidi(midi: number, axis: number): number {
  return axis - (midi - axis);
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

function setPitch(note: Element, midi: number): void {
  const pitch = elementChildren(note, 'pitch')[0];
  if (!pitch) return;
  const sp = spellMidi(midi);
  const step = elementChildren(pitch, 'step')[0];
  if (step) step.textContent = sp.step;
  let alter = elementChildren(pitch, 'alter')[0];
  if (sp.alter) {
    if (!alter) {
      alter = note.ownerDocument!.createElement('alter');
      pitch.insertBefore(alter, elementChildren(pitch, 'octave')[0] ?? null);
    }
    alter.textContent = String(sp.alter);
  } else if (alter) {
    pitch.removeChild(alter);
  }
  const octave = elementChildren(pitch, 'octave')[0];
  if (octave) octave.textContent = String(sp.octave);
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

export function parseMusicXml(xml: string): Document {
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

export function countBars(xml: string): number {
  const doc = parseMusicXml(xml);
  return measuresOf(partById(doc, 'P1')).length;
}

function harmonyRootPc(measure: Element): number | null {
  const harm = elementChildren(measure, 'harmony')[0];
  if (!harm) return null;
  const root = elementChildren(harm, 'root')[0];
  if (!root) return null;
  const step = textOf(root, 'root-step');
  const alter = Number(textOf(root, 'root-alter') || 0);
  if (!step) return null;
  return (STEP_PC[step]! + alter + 120) % 12;
}

function setTitle(doc: Document, title: string, movement: string): void {
  const wt = doc.getElementsByTagName('work-title')[0];
  if (wt) wt.textContent = title;
  const mt = doc.getElementsByTagName('movement-title')[0];
  if (mt) mt.textContent = movement;
}

function inRange(bar: number, range: BarRange | undefined): boolean {
  if (!range) return false;
  return bar >= range.from && bar <= range.to;
}

/** Scale Mirror-form windows (40-bar reference) to any bar count. */
export function defaultFormWindows(barCount: number): {
  exchangeBars: BarRange;
  displaceBars: BarRange;
  displaceTailBars: BarRange;
  phraseAccentBars: BarRange;
} {
  const s = (n: number) => Math.max(1, Math.min(barCount, Math.round((n * barCount) / 40)));
  // Keep development windows after a typical opening motif (bars 1–2).
  const exchangeFrom = Math.min(Math.max(3, s(9)), barCount);
  const exchangeTo = Math.max(exchangeFrom, s(24));
  const displaceFrom = Math.min(Math.max(3, s(9)), barCount);
  const displaceTo = Math.max(displaceFrom, s(32));
  const phraseFrom = Math.min(Math.max(3, s(17)), barCount);
  const phraseTo = Math.max(phraseFrom, s(24));
  const tailFrom = Math.min(Math.max(3, s(37)), barCount);
  return {
    exchangeBars: { from: exchangeFrom, to: exchangeTo },
    displaceBars: { from: displaceFrom, to: displaceTo },
    displaceTailBars: { from: tailFrom, to: barCount },
    phraseAccentBars: { from: phraseFrom, to: phraseTo },
  };
}

function cloneHarmony(from: Element): Element {
  return from.cloneNode(true) as Element;
}

function setHarmonyRoot(harm: Element, step: string, alter: number, kind: string): void {
  const root = elementChildren(harm, 'root')[0];
  if (root) {
    const rs = elementChildren(root, 'root-step')[0];
    if (rs) rs.textContent = step;
    let ra = elementChildren(root, 'root-alter')[0];
    if (alter) {
      if (!ra) {
        ra = harm.ownerDocument!.createElement('root-alter');
        root.appendChild(ra);
      }
      ra.textContent = String(alter);
    } else if (ra) {
      root.removeChild(ra);
    }
  }
  const kindEl = elementChildren(harm, 'kind')[0];
  if (kindEl) kindEl.textContent = kind;
}

function restoreRadicalHarmony(
  doc: Document,
  sourceXml: string,
  motifBars: Set<number>,
): void {
  const src = parseMusicXml(sourceXml);
  const srcMeasures = measuresOf(partById(src, 'P1'));
  const dstMeasures = measuresOf(partById(doc, 'P1'));
  const shifts = [3, 6, 3, 6];
  for (let i = 0; i < dstMeasures.length; i++) {
    const dst = dstMeasures[i]!;
    const srcM = srcMeasures[i]!;
    const bar = barNumber(dst);
    const srcHarm = elementChildren(srcM, 'harmony')[0];
    if (!srcHarm) continue;
    for (const h of elementChildren(dst, 'harmony')) dst.removeChild(h);
    const cloned = cloneHarmony(srcHarm);
    if (!motifBars.has(bar)) {
      const rootPc = harmonyRootPc(srcM);
      if (rootPc != null) {
        const newPc = (rootPc + shifts[(bar - 1) % shifts.length]!) % 12;
        const [step, alter] = PC_SPELL[newPc]!;
        const kind = bar % 2 === 0 ? 'major-seventh' : 'minor-ninth';
        setHarmonyRoot(cloned, step, alter, kind);
      }
    }
    const firstNote = elementChildren(dst, 'note')[0];
    if (firstNote) dst.insertBefore(cloned, firstNote);
    else dst.appendChild(cloned);
  }
}

function rewriteBassCounterpoint(
  doc: Document,
  writableBars: Set<number>,
  bassMidi: { min: number; max: number },
): void {
  const gtr = measuresOf(partById(doc, 'P1'));
  const bass = measuresOf(partById(doc, 'P2'));
  let prevBass: number | null = null;
  for (let i = 0; i < bass.length; i++) {
    const bm = bass[i]!;
    const gm = gtr[i]!;
    const bar = barNumber(bm);
    if (!writableBars.has(bar)) {
      for (const n of elementChildren(bm, 'note')) {
        const m = noteMidi(n);
        if (m != null) prevBass = m;
      }
      continue;
    }
    const rootPc = harmonyRootPc(gm);
    const gtrNotes = elementChildren(gm, 'note')
      .map(noteMidi)
      .filter((m): m is number => m != null);
    const colour = gtrNotes.length ? gtrNotes[gtrNotes.length - 1]! % 12 : rootPc ?? 0;
    const notes = elementChildren(bm, 'note');
    let attack = 0;
    for (const n of notes) {
      if (elementChildren(n, 'rest').length) continue;
      if (elementChildren(n, 'chord').length) continue;
      const targetPc = attack === 0 ? rootPc ?? colour : (colour + (attack % 2 === 1 ? 7 : 3)) % 12;
      const midi = noteMidi(n);
      if (midi == null) continue;
      let cand = midi - ((midi % 12) - targetPc);
      if (prevBass != null) {
        const retain = prevBass - ((prevBass % 12) - targetPc);
        if (Math.abs(retain - prevBass) <= Math.abs(cand - prevBass)) cand = retain;
      }
      if (gtrNotes.length && prevBass != null) {
        const g = gtrNotes[Math.min(attack, gtrNotes.length - 1)]!;
        if (g > prevBass && cand >= prevBass) cand -= 12;
        if (g < prevBass && cand <= prevBass) cand += 12;
      }
      cand = clamp(cand, bassMidi.min, bassMidi.max);
      setPitch(n, cand);
      prevBass = cand;
      attack += 1;
    }
  }
}

export function transformContrapuntal(
  sourceXml: string,
  opts: {
    motifBars: Set<number>;
    title: string;
    movement: string;
    exchangeBars: BarRange;
    guitarMidi: { min: number; max: number };
    bassMidi: { min: number; max: number };
    axisMidi: number;
  },
): string {
  const doc = parseMusicXml(sourceXml);
  setTitle(doc, opts.title, opts.movement);
  const gtr = measuresOf(partById(doc, 'P1'));
  const bass = measuresOf(partById(doc, 'P2'));

  for (let i = 0; i < gtr.length; i++) {
    const bar = barNumber(gtr[i]!);
    const invert = !opts.motifBars.has(bar);
    for (const n of elementChildren(gtr[i]!, 'note')) {
      const m = noteMidi(n);
      if (m == null) continue;
      if (invert) {
        setPitch(n, clamp(invertMidi(m, opts.axisMidi), opts.guitarMidi.min, opts.guitarMidi.max));
      }
    }
    for (const n of elementChildren(bass[i]!, 'note')) {
      const m = noteMidi(n);
      if (m == null) continue;
      if (!opts.motifBars.has(bar) && inRange(bar, opts.exchangeBars)) {
        setPitch(n, clamp(m + 7, opts.bassMidi.min, opts.bassMidi.max));
      }
    }
  }

  for (let i = 0; i < gtr.length; i++) {
    const bar = barNumber(gtr[i]!);
    if (opts.motifBars.has(bar) || !inRange(bar, opts.exchangeBars)) continue;
    const gNotes = elementChildren(gtr[i]!, 'note').filter(
      (n) => noteMidi(n) != null && !elementChildren(n, 'chord').length,
    );
    const bNotes = elementChildren(bass[i]!, 'note').filter(
      (n) => noteMidi(n) != null && !elementChildren(n, 'chord').length,
    );
    const gMidis = gNotes.map((n) => noteMidi(n)!);
    const bMidis = bNotes.map((n) => noteMidi(n)!);
    const n = Math.min(gNotes.length, bNotes.length);
    for (let k = 0; k < n; k++) {
      setPitch(gNotes[k]!, clamp(bMidis[k]! + 24, opts.guitarMidi.min, opts.guitarMidi.max));
      setPitch(bNotes[k]!, clamp(gMidis[k]! - 24, opts.bassMidi.min, opts.bassMidi.max));
    }
  }

  return serialize(doc);
}

export function transformRhythmic(
  sourceXml: string,
  opts: {
    motifBars: Set<number>;
    title: string;
    movement: string;
    displaceBars: BarRange;
    displaceTailBars: BarRange;
    phraseAccentBars: BarRange;
    guitarMidi: { min: number; max: number };
    bassMidi: { min: number; max: number };
  },
): string {
  const doc = parseMusicXml(sourceXml);
  setTitle(doc, opts.title, opts.movement);
  const gtr = measuresOf(partById(doc, 'P1'));
  const bass = measuresOf(partById(doc, 'P2'));

  for (let i = 0; i < gtr.length; i++) {
    const bar = barNumber(gtr[i]!);
    if (opts.motifBars.has(bar)) continue;
    if (inRange(bar, opts.displaceBars) || inRange(bar, opts.displaceTailBars)) {
      const notes = elementChildren(gtr[i]!, 'note').filter(
        (n) => !elementChildren(n, 'chord').length,
      );
      if (notes.length >= 3) {
        const soundingIdx = notes
          .map((n, idx) => ({ n, idx, rest: elementChildren(n, 'rest').length > 0 }))
          .filter((x) => !x.rest);
        if (soundingIdx.length >= 2) {
          const midis = soundingIdx.map((x) => noteMidi(x.n)!);
          const rotated = [...midis.slice(1), midis[0]!];
          soundingIdx.forEach((x, k) =>
            setPitch(x.n, clamp(rotated[k]!, opts.guitarMidi.min, opts.guitarMidi.max)),
          );
        }
      }
    }
    if (inRange(bar, opts.displaceBars)) {
      const bNotes = elementChildren(bass[i]!, 'note').filter(
        (n) => noteMidi(n) != null && !elementChildren(n, 'chord').length,
      );
      if (bNotes.length >= 2) {
        const a = noteMidi(bNotes[0]!)!;
        const b = noteMidi(bNotes[1]!)!;
        setPitch(bNotes[0]!, clamp(a - 2, opts.bassMidi.min, opts.bassMidi.max));
        setPitch(bNotes[1]!, clamp(b + 5, opts.bassMidi.min, opts.bassMidi.max));
      }
    }
  }

  for (let i = 0; i < gtr.length; i++) {
    const bar = barNumber(gtr[i]!);
    if (!inRange(bar, opts.phraseAccentBars)) continue;
    const notes = elementChildren(gtr[i]!, 'note').filter((n) => noteMidi(n) != null);
    if (notes.length >= 2) {
      const first = noteMidi(notes[0]!)!;
      const last = noteMidi(notes[notes.length - 1]!)!;
      setPitch(notes[0]!, clamp(first + 12, opts.guitarMidi.min, opts.guitarMidi.max));
      setPitch(notes[notes.length - 1]!, clamp(last - 5, opts.guitarMidi.min, opts.guitarMidi.max));
    }
  }

  return serialize(doc);
}

export function transformHarmonic(
  sourcePath: string,
  sourceXml: string,
  opts: {
    motifBars: Set<number>;
    title: string;
    movement: string;
    barCount: number;
    seed: number;
    bhlWorld: BhlWorldId;
    bassMidi: { min: number; max: number };
    /** When true, keep source bass (no rewriteBassCounterpoint). Default false. */
    lockBass?: boolean;
  },
): { xml: string; feasibility: number; world: string | null } {
  const bhl = composeBhlGuitar({
    sourcePath,
    span: { from: 1, to: opts.barCount },
    seed: opts.seed,
    world: opts.bhlWorld,
    protectedGuitarBars: [...opts.motifBars],
  });
  const harmDoc = parseMusicXml(bhl.xml);
  setTitle(harmDoc, opts.title, opts.movement);
  restoreRadicalHarmony(harmDoc, sourceXml, opts.motifBars);
  if (!opts.lockBass) {
    const writableBass = new Set<number>();
    for (let b = 1; b <= opts.barCount; b++) if (!opts.motifBars.has(b)) writableBass.add(b);
    rewriteBassCounterpoint(harmDoc, writableBass, opts.bassMidi);
  }
  return {
    xml: serialize(harmDoc),
    feasibility: bhl.feasibility.length,
    world: bhl.world?.world ?? null,
  };
}

/**
 * MusicXML divisions are per quarter note. Full-bar ticks for the time
 * signature in force: divisions × beats × 4 / beat-type.
 * Preserves prior 4/4 behaviour (expected = 4 × divisions).
 */
export function expectedBarTicks(divisions: number, beats: number, beatType: number): number {
  if (divisions <= 0 || beats <= 0 || beatType <= 0) return NaN;
  const raw = (divisions * beats * 4) / beatType;
  return Number.isInteger(raw) ? raw : NaN;
}

function statedTimeFromMeasure(measure: Element): { beats: number; beatType: number } | null {
  for (const attributes of elementChildren(measure, 'attributes')) {
    const time = elementChildren(attributes, 'time')[0];
    if (!time) continue;
    const beats = Number(textOf(time, 'beats'));
    const beatType = Number(textOf(time, 'beat-type'));
    if (beats > 0 && beatType > 0) return { beats, beatType };
  }
  return null;
}

export function validateDualPartXml(
  label: string,
  xml: string,
  opts: {
    expectedBars: number;
    guitarMidi: { min: number; max: number };
    bassMidi: { min: number; max: number };
    minHarmonyCount: number;
  },
): string[] {
  const issues: string[] = [];
  const doc = parseMusicXml(xml);
  const gtr = measuresOf(partById(doc, 'P1'));
  const bass = measuresOf(partById(doc, 'P2'));
  if (gtr.length !== opts.expectedBars || bass.length !== opts.expectedBars) {
    issues.push(
      `${label}: bar count gtr=${gtr.length} bass=${bass.length} (expected ${opts.expectedBars})`,
    );
  }
  let harm = 0;
  let divisions = 4;
  let beats = 4;
  let beatType = 4;
  for (const m of gtr) {
    const bar = barNumber(m);
    const attrDiv = textOf(elementChildren(m, 'attributes')[0], 'divisions');
    if (attrDiv) divisions = Number(attrDiv);
    const stated = statedTimeFromMeasure(m);
    if (stated) {
      beats = stated.beats;
      beatType = stated.beatType;
    }
    let ticks = 0;
    for (const n of elementChildren(m, 'note')) {
      if (elementChildren(n, 'chord').length) continue;
      ticks += Number(textOf(n, 'duration') || 0);
      const midi = noteMidi(n);
      if (midi != null && (midi < opts.guitarMidi.min - 5 || midi > opts.guitarMidi.max + 5)) {
        issues.push(`${label}: guitar bar ${bar} pitch ${midi} outside soft range`);
      }
    }
    if (!m.getElementsByTagName('backup').length && divisions > 0) {
      const expected = expectedBarTicks(divisions, beats, beatType);
      if (!Number.isFinite(expected)) {
        issues.push(
          `${label}: guitar bar ${bar} cannot derive ticks for ${beats}/${beatType} at divisions ${divisions}`,
        );
      } else if (ticks !== expected) {
        issues.push(
          `${label}: guitar bar ${bar} ticks ${ticks} != ${expected} (${beats}/${beatType})`,
        );
      }
    }
    if (elementChildren(m, 'harmony').length) harm += 1;
  }
  for (const m of bass) {
    const bar = barNumber(m);
    for (const n of elementChildren(m, 'note')) {
      const midi = noteMidi(n);
      if (midi != null && (midi < opts.bassMidi.min - 2 || midi > opts.bassMidi.max + 2)) {
        issues.push(`${label}: bass bar ${bar} pitch ${midi} outside soft range`);
      }
    }
  }
  if (harm < opts.minHarmonyCount) {
    issues.push(`${label}: chord symbols sparse (${harm} < ${opts.minHarmonyCount})`);
  }
  return issues;
}

export function motifIntact(
  sourceXml: string,
  candXml: string,
  motifBars: Iterable<number>,
): boolean {
  const a = parseMusicXml(sourceXml);
  const b = parseMusicXml(candXml);
  for (const bar of motifBars) {
    const ga = measuresOf(partById(a, 'P1')).find((m) => barNumber(m) === bar);
    const gb = measuresOf(partById(b, 'P1')).find((m) => barNumber(m) === bar);
    if (!ga || !gb) return false;
    const sa = elementChildren(ga, 'note').map(noteMidi).join(',');
    const sb = elementChildren(gb, 'note').map(noteMidi).join(',');
    if (sa !== sb) return false;
  }
  return true;
}

function parseRange(raw: string | undefined): BarRange | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) throw new Error(`bad bar range '${raw}' (use FROM-TO)`);
  return { from: Number(m[1]), to: Number(m[2]) };
}

export function parseMotifBars(raw: string | undefined, fallback: number[]): number[] {
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Run one or more dual-part (or bass-only) profiles and write MusicXML to outDir.
 * Does not modify the source file.
 */
export function runDualPartTransform(options: DualPartTransformOptions): DualPartTransformResult {
  const sourcePath = path.resolve(options.sourcePath);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`source missing: ${sourcePath}`);
  }
  const sourceSha256 = sha256File(sourcePath);
  if (options.expectedSha256 && sourceSha256 !== options.expectedSha256) {
    throw new Error(`SHA mismatch: ${sourceSha256} != ${options.expectedSha256}`);
  }

  const sourceXml = fs.readFileSync(sourcePath, 'utf8');
  const barCount = countBars(sourceXml);
  const form = defaultFormWindows(barCount);
  const motifBars = new Set(options.motifBars?.length ? options.motifBars : [1, 2]);
  const mode: DualPartMode = options.mode ?? 'dual';
  const title = options.title ?? 'WWH Duo';
  const stem = options.stem ?? path.basename(sourcePath, path.extname(sourcePath));
  const guitarMidi = options.guitarMidi ?? DEFAULT_GUITAR;
  const bassMidi = options.bassMidi ?? DEFAULT_BASS;
  const axisMidi = options.inversionAxisMidi ?? 60;
  const minHarmonyCount =
    options.minHarmonyCount ?? Math.max(1, Math.floor(barCount / 2));
  const exchangeBars = options.exchangeBars ?? form.exchangeBars;
  const displaceBars = options.displaceBars ?? form.displaceBars;
  const displaceTailBars = options.displaceTailBars ?? form.displaceTailBars;
  const phraseAccentBars = options.phraseAccentBars ?? form.phraseAccentBars;
  const seed = options.seed ?? 24024;
  const bhlWorld = options.bhlWorld ?? 'F';
  const lockBass = options.lockBass === true;

  if (mode === 'bassOnly' && lockBass) {
    throw new Error('conflicting options: bassOnly mode and lockBass cannot both be set');
  }

  if (mode === 'bassOnly') {
    if (options.lockGuitar !== true || options.preserveHarmony !== true) {
      throw new Error('bassOnly mode requires lockGuitar=true and preserveHarmony=true');
    }
  }

  const outDir = path.resolve(options.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const outputs: DualPartOutput[] = [];
  const validation: string[] = [];

  if (mode === 'bassOnly') {
    const bassProfiles: BassOnlyProfile[] = options.bassOnlyProfiles?.length
      ? options.bassOnlyProfiles
      : ['lyrical', 'contrapuntal', 'rhythmic'];
    const meta: Record<
      BassOnlyProfile,
      { id: string; filePrefix: string; label: string; note: string }
    > = {
      lyrical: {
        id: 'A-Lyrical',
        filePrefix: 'A-Lyrical',
        label: 'Lyrical Counterpoint',
        note: 'Bass-only lyrical counterpoint; guitar + harmony locked.',
      },
      contrapuntal: {
        id: 'B-Contrapuntal',
        filePrefix: 'B-Contrapuntal',
        label: 'Contrapuntal Dialogue',
        note: 'Bass-only contrapuntal dialogue; guitar + harmony locked.',
      },
      rhythmic: {
        id: 'C-Rhythmic',
        filePrefix: 'C-Rhythmic',
        label: 'Rhythmic Freedom',
        note: 'Bass-only rhythmic freedom; guitar + harmony locked.',
      },
    };

    for (const profile of bassProfiles) {
      const m = meta[profile];
      const xml = transformBassOnly(sourceXml, {
        profile,
        title,
        movement: `${title} — ${m.label}`,
        bassMidi,
        seed: seed + (profile === 'lyrical' ? 0 : profile === 'contrapuntal' ? 17 : 41),
        lockGuitar: true,
        preserveHarmony: true,
      });
      const lockIssues = verifyBassOnlyLocks(sourceXml, xml, {
        lockGuitar: true,
        preserveHarmony: true,
      });
      for (const issue of lockIssues) validation.push(`${m.id}: ${issue}`);
      const issues = validateDualPartXml(m.id, xml, {
        expectedBars: barCount,
        guitarMidi,
        bassMidi,
        minHarmonyCount,
      });
      validation.push(...issues);

      const file = `${m.filePrefix}-${stem}.musicxml`;
      const outPath = path.join(outDir, file);
      fs.writeFileSync(outPath, xml, 'utf8');
      outputs.push({
        id: m.id,
        profile,
        file,
        path: outPath,
        xml,
        note: m.note,
        sha256: sha256Text(xml),
      });
    }

    return {
      sourcePath,
      sourceSha256,
      barCount,
      outDir,
      outputs,
      validation,
      motifOk: outputs.every(
        (o) =>
          verifyBassOnlyLocks(sourceXml, o.xml, {
            lockGuitar: true,
            preserveHarmony: true,
          }).length === 0,
      ),
    };
  }

  const profiles = options.profiles?.length
    ? options.profiles
    : (['harmonic', 'contrapuntal', 'rhythmic'] as DualPartProfile[]);

  for (const profile of profiles) {
    let xml: string;
    let note: string;
    let id: string;
    let file: string;

    if (profile === 'harmonic') {
      const harm = transformHarmonic(sourcePath, sourceXml, {
        motifBars,
        title,
        movement: `${title} — Harmonic Candidate`,
        barCount,
        seed,
        bhlWorld,
        bassMidi,
        lockBass,
      });
      xml = harm.xml;
      id = 'A-Harmonic';
      file = `A-Harmonic-${stem}.musicxml`;
      note = lockBass
        ? `BHL world ${harm.world ?? bhlWorld} guitar; bass locked to source; motif bars locked.`
        : `BHL world ${harm.world ?? bhlWorld} guitar + dual-part bass counterpoint; motif bars locked.`;
    } else if (profile === 'contrapuntal') {
      xml = transformContrapuntal(sourceXml, {
        motifBars,
        title,
        movement: `${title} — Contrapuntal Candidate`,
        exchangeBars,
        guitarMidi,
        bassMidi,
        axisMidi,
      });
      id = 'B-Contrapuntal';
      file = `B-Contrapuntal-${stem}.musicxml`;
      note = `Guitar inversion; bass register reflection; exchange ${exchangeBars.from}–${exchangeBars.to}; motif locked.`;
    } else {
      xml = transformRhythmic(sourceXml, {
        motifBars,
        title,
        movement: `${title} — Rhythmic Candidate`,
        displaceBars,
        displaceTailBars,
        phraseAccentBars,
        guitarMidi,
        bassMidi,
      });
      id = 'C-Rhythmic';
      file = `C-Rhythmic-${stem}.musicxml`;
      note = `Onset displacement + bass offbeat agency; motif locked.`;
    }

    const issues = validateDualPartXml(id, xml, {
      expectedBars: barCount,
      guitarMidi,
      bassMidi,
      minHarmonyCount,
    });
    validation.push(...issues);
    if (!motifIntact(sourceXml, xml, motifBars)) {
      validation.push(`${id}: MOTIF BARS altered`);
    }

    const outPath = path.join(outDir, file);
    fs.writeFileSync(outPath, xml, 'utf8');
    outputs.push({
      id,
      profile,
      file,
      path: outPath,
      xml,
      note,
      sha256: sha256Text(xml),
    });
  }

  return {
    sourcePath,
    sourceSha256,
    barCount,
    outDir,
    outputs,
    validation,
    motifOk: outputs.every((o) => motifIntact(sourceXml, o.xml, motifBars)),
  };
}

/** CLI arg helpers shared with the entry script. */
export function parseCliArgs(argv: string[]): {
  source?: string;
  out?: string;
  profiles?: DualPartProfile[];
  bassOnlyProfiles?: BassOnlyProfile[];
  mode?: DualPartMode;
  lockGuitar?: boolean;
  preserveHarmony?: boolean;
  motifBars?: number[];
  expectedSha?: string;
  title?: string;
  stem?: string;
  seed?: number;
  bhlWorld?: BhlWorldId;
  exchangeBars?: BarRange;
  displaceBars?: BarRange;
  displaceTailBars?: BarRange;
  phraseAccentBars?: BarRange;
  help?: boolean;
} {
  const arg = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const has = (name: string) => argv.includes(`--${name}`);
  if (has('help') || has('h')) return { help: true };

  const profilesRaw = arg('profiles');
  const profiles = profilesRaw
    ? (profilesRaw.split(',').map((s) => s.trim()) as DualPartProfile[])
    : undefined;
  const bassProfilesRaw = arg('bass-profiles');
  const bassOnlyProfiles = bassProfilesRaw
    ? (bassProfilesRaw.split(',').map((s) => s.trim()) as BassOnlyProfile[])
    : undefined;
  const modeRaw = arg('mode');
  const mode =
    modeRaw === 'bassOnly' || modeRaw === 'dual' ? (modeRaw as DualPartMode) : undefined;

  return {
    source: arg('source'),
    out: arg('out'),
    profiles,
    bassOnlyProfiles,
    mode,
    lockGuitar: has('lock-guitar') ? true : has('no-lock-guitar') ? false : undefined,
    preserveHarmony: has('preserve-harmony')
      ? true
      : has('no-preserve-harmony')
        ? false
        : undefined,
    motifBars: parseMotifBars(arg('motif-bars'), []),
    expectedSha: arg('expected-sha'),
    title: arg('title'),
    stem: arg('stem'),
    seed: arg('seed') !== undefined ? Number(arg('seed')) : undefined,
    bhlWorld: arg('bhl-world') as BhlWorldId | undefined,
    exchangeBars: parseRange(arg('exchange-bars')),
    displaceBars: parseRange(arg('displace-bars')),
    displaceTailBars: parseRange(arg('displace-tail-bars')),
    phraseAccentBars: parseRange(arg('phrase-accent-bars')),
  };
}

export {
  deliberatelyMutateGuitarPitch,
  deliberatelyMutateHarmonyRoot,
  transformBassOnly,
  verifyBassOnlyLocks,
} from './wwhBassOnlyTransform';
