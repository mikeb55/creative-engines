/**
 * Quantise MusicXML lead: keep pitch + note/rest order; proportional snap to 64-div grid (256 = quarter).
 * Splits a duration into tied atomic notes (same pitch/rest) when needed. Strips tuplets/beams; re-beams by beat.
 *
 * Usage: npx ts-node --project tsconfig.json scripts/quantizeOrbitLeadMusicXml.ts [input] [output]
 */

import * as fs from 'fs';
import * as path from 'path';
import { xml2js, js2xml } from 'xml-js';
import { validateMusicXml } from '../src/utils/musicXmlValidator';

const SNAP = 64;
const TARGET = 768;
const ATOMIC = [512, 384, 256, 192, 128, 64];

type XmlEl = {
  type?: string;
  name?: string;
  elements?: XmlEl[];
  attributes?: Record<string, { name: string; value: string }>;
  text?: string;
};

function isEl(x: XmlEl | undefined): x is XmlEl {
  return x?.type === 'element';
}

function ch(el: XmlEl): XmlEl[] {
  return (el.elements ?? []).filter((c): c is XmlEl => isEl(c));
}

function getDuration(note: XmlEl): number {
  const d = ch(note).find((c) => c.name === 'duration');
  const te = d?.elements?.find((x) => x.type === 'text') as XmlEl | undefined;
  const raw = typeof te?.text === 'string' ? te.text : '';
  return parseInt(raw, 10);
}

function setDuration(note: XmlEl, dur: number): void {
  const kids = ch(note);
  let d = kids.find((c) => c.name === 'duration');
  if (!d) {
    d = { type: 'element', name: 'duration', elements: [{ type: 'text', text: String(dur) }] };
    note.elements = [...kids, d];
  } else {
    d.elements = [{ type: 'text', text: String(dur) }];
  }
}

function removeNamed(note: XmlEl, names: Set<string>): void {
  note.elements = ch(note).filter((c) => !names.has(c.name ?? ''));
}

function stripNoteArtifacts(note: XmlEl): void {
  removeNamed(note, new Set(['beam', 'time-modification', 'tie']));
  const notations = ch(note).find((c) => c.name === 'notations');
  if (notations) {
    notations.elements = ch(notations).filter((c) => c.name !== 'tied' && c.name !== 'tuplet');
    if (ch(notations).length === 0) note.elements = ch(note).filter((c) => c.name !== 'notations');
  }
}

function insertAfter(note: XmlEl, afterName: string, el: XmlEl): void {
  const kids = ch(note);
  const idx = kids.findIndex((c) => c.name === afterName);
  const pos = idx >= 0 ? idx + 1 : kids.length;
  const next = [...kids];
  next.splice(pos, 0, el);
  note.elements = next;
}

function setTypeDot(note: XmlEl, dur: number): void {
  removeNamed(note, new Set(['dot']));
  let typeName = 'quarter';
  let dot = false;
  if (dur === 64) typeName = '16th';
  else if (dur === 128) typeName = 'eighth';
  else if (dur === 192) {
    typeName = 'eighth';
    dot = true;
  } else if (dur === 256) typeName = 'quarter';
  else if (dur === 384) {
    typeName = 'quarter';
    dot = true;
  } else if (dur === 512) typeName = 'half';
  else if (dur === 768) typeName = 'whole';
  else throw new Error(`Bad atomic dur ${dur}`);

  let typeEl = ch(note).find((c) => c.name === 'type');
  if (!typeEl) {
    typeEl = { type: 'element', name: 'type', elements: [{ type: 'text', text: typeName }] };
    insertAfter(note, 'duration', typeEl);
  } else {
    typeEl.elements = [{ type: 'text', text: typeName }];
  }
  if (dot) {
    const dotEl: XmlEl = { type: 'element', name: 'dot' };
    insertAfter(note, 'type', dotEl);
  }
}

function decompose(d: number): number[] {
  const out: number[] = [];
  let r = d;
  for (const u of ATOMIC) {
    while (r >= u) {
      out.push(u);
      r -= u;
    }
  }
  if (r !== 0) throw new Error(`decompose failed ${d}`);
  return out;
}

function quantizeLengths(raw: number[]): number[] {
  const n = raw.length;
  if (n === 0) return [];
  if (n === 1) return [TARGET];
  const sumRaw = raw.reduce((a, b) => a + b, 0);
  if (sumRaw <= 0) throw new Error('bad sum');

  const q: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const v = Math.round(((raw[i]! / sumRaw) * TARGET) / SNAP) * SNAP;
    q.push(Math.max(SNAP, v));
  }
  let last = TARGET - q.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (last < SNAP && guard++ < 1000) {
    const j = q.reduce((best, _, idx, arr) => (arr[idx]! > arr[best]! ? idx : best), 0);
    if (q[j]! <= SNAP) throw new Error('cannot lift last');
    q[j]! -= SNAP;
    last += SNAP;
  }
  q.push(last);
  if (q.reduce((a, b) => a + b, 0) !== TARGET) throw new Error('sum');
  return q;
}

function clone(note: XmlEl): XmlEl {
  return JSON.parse(JSON.stringify(note)) as XmlEl;
}

function addTie(note: XmlEl, kind: 'start' | 'stop'): void {
  const tieEl: XmlEl = {
    type: 'element',
    name: 'tie',
    attributes: { type: { name: 'type', value: kind } },
  };
  insertAfter(note, 'duration', tieEl);
  let notations = ch(note).find((c) => c.name === 'notations');
  if (!notations) {
    notations = { type: 'element', name: 'notations', elements: [] };
    note.elements = [...ch(note), notations];
  }
  const tiedEl: XmlEl = {
    type: 'element',
    name: 'tied',
    attributes: { type: { name: 'type', value: kind } },
  };
  notations.elements = [...ch(notations), tiedEl];
}

function expand(note: XmlEl, total: number): XmlEl[] {
  const parts = decompose(total);
  if (parts.length === 1) {
    const n = clone(note);
    stripNoteArtifacts(n);
    setDuration(n, parts[0]!);
    setTypeDot(n, parts[0]!);
    return [n];
  }
  return parts.map((dur, idx) => {
    const n = clone(note);
    stripNoteArtifacts(n);
    removeNamed(n, new Set(['default-x', 'default-y']));
    setDuration(n, dur);
    setTypeDot(n, dur);
    if (idx < parts.length - 1) addTie(n, 'start');
    if (idx > 0) addTie(n, 'stop');
    return n;
  });
}

function applyBeamsBeatWise(notes: XmlEl[]): void {
  type Seg = { n: XmlEl; start: number; dur: number; short: boolean };
  const segs: Seg[] = [];
  let off = 0;
  for (const n of notes) {
    const dur = getDuration(n);
    const rest = ch(n).some((c) => c.name === 'rest');
    const typ = ch(n).find((c) => c.name === 'type');
    const ty =
      typeof typ?.elements?.[0]?.text === 'string' ? String(typ.elements[0].text) : '';
    const short = !rest && (ty === 'eighth' || ty === '16th' || dur === 128 || dur === 64);
    if (short) segs.push({ n, start: off, dur, short: true });
    off += dur;
  }

  let i = 0;
  while (i < segs.length) {
    const b = Math.floor(segs[i]!.start / 256);
    const group: Seg[] = [];
    while (i < segs.length && Math.floor(segs[i]!.start / 256) === b) {
      group.push(segs[i]!);
      i++;
    }
    if (group.length >= 2) {
      group.forEach((s, idx) => {
        const txt =
          idx === 0 ? 'begin' : idx === group.length - 1 ? 'end' : 'continue';
        removeNamed(s.n, new Set(['beam']));
        const beam: XmlEl = {
          type: 'element',
          name: 'beam',
          attributes: { number: { name: 'number', value: '1' } },
          elements: [{ type: 'text', text: txt }],
        };
        const stemIdx = ch(s.n).findIndex((c) => c.name === 'stem');
        const arr = [...ch(s.n)];
        arr.splice(stemIdx >= 0 ? stemIdx + 1 : arr.length, 0, beam);
        s.n.elements = arr;
      });
    }
  }
}

function rebuildMeasure(measure: XmlEl): void {
  const els = ch(measure);
  const rawNotes = els.filter((c) => c.name === 'note');
  if (rawNotes.length === 0) return;
  const raw = rawNotes.map(getDuration);
  const q = quantizeLengths(raw);

  const out: XmlEl[] = [];
  let qi = 0;
  for (const c of els) {
    if (c.name !== 'note') {
      out.push(c);
      continue;
    }
    stripNoteArtifacts(c);
    out.push(...expand(c, q[qi]!));
    qi++;
  }
  measure.elements = out;
  applyBeamsBeatWise(ch(measure).filter((c) => c.name === 'note'));
}

function patchSoftware(score: XmlEl): void {
  const ident = ch(score).find((c) => c.name === 'identification');
  const enc = ident && ch(ident).find((c) => c.name === 'encoding');
  const soft = enc && ch(enc).filter((c) => c.name === 'software');
  if (soft?.length) {
    const last = soft[soft.length - 1]!;
    last.elements = [{ type: 'text', text: 'Quantised lead — rhythm only (Composer OS script)' }];
  }
}

function main(): void {
  const rootDir = path.join(__dirname, '..');
  const input =
    process.argv[2] ??
    path.join(rootDir, 'projects', 'Orbit', 'ORBIT lead unquantised.musicxml');
  const output =
    process.argv[3] ??
    path.join(rootDir, 'projects', 'Orbit', 'V2.0-orbit-quantised.musicxml');

  const xmlIn = fs.readFileSync(input, 'utf-8');
  const doc = xml2js(xmlIn, { compact: false, trim: false }) as XmlEl;
  const score = ch(doc).find((c) => c.name === 'score-partwise');
  if (!score) throw new Error('no score-partwise');
  patchSoftware(score);

  const part = ch(score).find(
    (c) => c.name === 'part' && (c.attributes as { id?: string } | undefined)?.id === 'P1'
  );
  if (!part) throw new Error('no P1');

  for (const m of ch(part)) {
    if (m.name === 'measure') rebuildMeasure(m);
  }

  const xmlOut = js2xml(doc, { compact: false, spaces: 1 });
  const v = validateMusicXml(xmlOut);
  if (!v.valid) {
    console.error(v.errors);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, xmlOut, 'utf-8');
  console.log('Wrote', output);
}

main();
