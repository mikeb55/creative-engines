/**
 * DTE V1.1 — bass-only dual-part mode.
 * Rewrites upright bass only. Guitar + harmony locked when requested.
 * Does not call harmonic/contrapuntal/rhythmic dual-part guitar paths.
 */

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export type BassOnlyProfile = 'lyrical' | 'contrapuntal' | 'rhythmic';

export type BassOnlyTransformOpts = {
  profile: BassOnlyProfile;
  title: string;
  movement: string;
  bassMidi: { min: number; max: number };
  seed?: number;
  lockGuitar: boolean;
  preserveHarmony: boolean;
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

const KIND_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7, 11],
  minor: [0, 3, 7, 10],
  'major-minor': [0, 4, 7, 10],
  'suspended-second': [0, 2, 7],
  'suspended-fourth': [0, 5, 7],
  diminished: [0, 3, 6, 9],
  other: [0, 3, 6, 8],
};

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

function parseDoc(xml: string): Document {
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

function setTitle(doc: Document, title: string, movement: string): void {
  const wt = doc.getElementsByTagName('work-title')[0];
  if (wt) wt.textContent = title;
  const mt = doc.getElementsByTagName('movement-title')[0];
  if (mt) mt.textContent = movement;
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

function harmonyKind(measure: Element): string | null {
  const harm = elementChildren(measure, 'harmony')[0];
  if (!harm) return null;
  const kind = elementChildren(harm, 'kind')[0]?.textContent?.trim();
  return kind || null;
}

function chordPcs(rootPc: number | null, kind: string | null): number[] {
  const ints = KIND_INTERVALS[kind ?? ''] ?? KIND_INTERVALS.other!;
  if (rootPc == null) return [...ints];
  return ints.map((i) => (rootPc + i) % 12);
}

function nearestInPcs(
  prefer: number,
  pcs: number[],
  lo: number,
  hi: number,
  avoid?: number | null,
): number {
  let best = clamp(prefer - ((prefer % 12) - pcs[0]!), lo, hi);
  let bestScore = Infinity;
  for (let midi = lo; midi <= hi; midi++) {
    if (!pcs.includes(((midi % 12) + 12) % 12)) continue;
    if (avoid != null && midi === avoid) continue;
    const score = Math.abs(midi - prefer) + (avoid != null && Math.abs(midi - avoid) < 3 ? 2 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = midi;
    }
  }
  return best;
}

function soundingNotes(measure: Element): Element[] {
  return elementChildren(measure, 'note').filter(
    (n) => noteMidi(n) != null && !elementChildren(n, 'chord').length,
  );
}

function guitarMidisAtBar(gtr: Element[], idx: number): number[] {
  return soundingNotes(gtr[idx]!).map((n) => noteMidi(n)!);
}

function noteEventSig(note: Element): string {
  const bits: string[] = [];
  if (elementChildren(note, 'rest').length) bits.push('R');
  const pitch = elementChildren(note, 'pitch')[0];
  if (pitch) {
    bits.push(
      `P:${textOf(pitch, 'step')}:${textOf(pitch, 'alter') || '0'}:${textOf(pitch, 'octave')}`,
    );
  }
  bits.push(`d:${textOf(note, 'duration') || '0'}`);
  bits.push(`t:${textOf(note, 'type') || ''}`);
  bits.push(`v:${textOf(note, 'voice') || ''}`);
  bits.push(`s:${textOf(note, 'staff') || ''}`);
  bits.push(`dots:${elementChildren(note, 'dot').length}`);
  bits.push(`chord:${elementChildren(note, 'chord').length}`);
  for (const tie of elementChildren(note, 'tie')) {
    bits.push(`tie:${tie.getAttribute('type') || ''}`);
  }
  const notations = elementChildren(note, 'notations')[0];
  if (notations) bits.push(`not:${new XMLSerializer().serializeToString(notations)}`);
  for (const name of ['beam', 'lyric', 'accidental', 'time-modification', 'stem']) {
    for (const el of elementChildren(note, name)) {
      bits.push(`${name}:${new XMLSerializer().serializeToString(el)}`);
    }
  }
  return bits.join(';');
}

function measureNonHarmonySig(measure: Element): string {
  const parts: string[] = [];
  for (let i = 0; i < measure.childNodes.length; i++) {
    const n = measure.childNodes[i];
    if (!n || n.nodeType !== 1) continue;
    const el = n as Element;
    if (el.nodeName === 'harmony') continue;
    if (el.nodeName === 'note') {
      parts.push(noteEventSig(el));
      continue;
    }
    parts.push(`${el.nodeName}:${new XMLSerializer().serializeToString(el)}`);
  }
  return parts.join('||');
}

function harmonySigForDoc(doc: Document): string {
  const parts = doc.getElementsByTagName('part');
  const rows: string[] = [];
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p]!;
    const id = part.getAttribute('id') || `i${p}`;
    for (const m of measuresOf(part)) {
      const bar = barNumber(m);
      for (const h of elementChildren(m, 'harmony')) {
        rows.push(`${id}@${bar}:${new XMLSerializer().serializeToString(h)}`);
      }
    }
  }
  return rows.join('\n');
}

function formMetaSig(doc: Document): string {
  const rows: string[] = [];
  const parts = doc.getElementsByTagName('part');
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p]!;
    const id = part.getAttribute('id') || `i${p}`;
    rows.push(`part:${id}:bars:${measuresOf(part).length}`);
    for (const m of measuresOf(part)) {
      const bar = barNumber(m);
      for (const attributes of elementChildren(m, 'attributes')) {
        const time = elementChildren(attributes, 'time')[0];
        if (time) {
          rows.push(`${id}@${bar}:time:${textOf(time, 'beats')}/${textOf(time, 'beat-type')}`);
        }
        const div = textOf(attributes, 'divisions');
        if (div) rows.push(`${id}@${bar}:div:${div}`);
      }
      for (const direction of elementChildren(m, 'direction')) {
        const dt = elementChildren(direction, 'direction-type')[0];
        if (!dt) continue;
        const reh = elementChildren(dt, 'rehearsal')[0];
        if (reh) rows.push(`${id}@${bar}:reh:${reh.textContent?.trim() || ''}`);
        const metro = elementChildren(dt, 'metronome')[0];
        if (metro) {
          rows.push(
            `${id}@${bar}:tempo:${textOf(metro, 'beat-unit')}=${textOf(metro, 'per-minute')}`,
          );
        }
      }
    }
  }
  rows.push(`parts:${parts.length}`);
  return rows.join('\n');
}

/** Strict lock check — any guitar/harmony drift is a FAIL finding. */
export function verifyBassOnlyLocks(
  sourceXml: string,
  candidateXml: string,
  opts: { lockGuitar: boolean; preserveHarmony: boolean },
): string[] {
  const issues: string[] = [];
  const src = parseDoc(sourceXml);
  const cand = parseDoc(candidateXml);
  const srcParts = src.getElementsByTagName('part').length;
  const candParts = cand.getElementsByTagName('part').length;
  if (srcParts !== candParts) {
    issues.push(`part count ${candParts} != source ${srcParts}`);
  }
  const srcBars = measuresOf(partById(src, 'P1')).length;
  const candBars = measuresOf(partById(cand, 'P1')).length;
  if (srcBars !== candBars) {
    issues.push(`bar count ${candBars} != source ${srcBars}`);
  }
  if (formMetaSig(src) !== formMetaSig(cand)) {
    issues.push('form/metre/tempo/rehearsal metadata changed');
  }
  if (opts.lockGuitar) {
    const sg = measuresOf(partById(src, 'P1'));
    const cg = measuresOf(partById(cand, 'P1'));
    const n = Math.min(sg.length, cg.length);
    for (let i = 0; i < n; i++) {
      if (measureNonHarmonySig(sg[i]!) !== measureNonHarmonySig(cg[i]!)) {
        issues.push(`lockGuitar violated at bar ${barNumber(sg[i]!)}`);
        break;
      }
    }
  }
  if (opts.preserveHarmony) {
    if (harmonySigForDoc(src) !== harmonySigForDoc(cand)) {
      issues.push('preserveHarmony violated (chord symbols differ)');
    }
  }
  return issues;
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

function clearNotes(measure: Element): void {
  for (const n of elementChildren(measure, 'note')) {
    measure.removeChild(n);
  }
}

function appendRest(doc: Document, measure: Element, duration: number, type: string, dots = 0): void {
  const note = doc.createElement('note');
  note.appendChild(doc.createElement('rest'));
  const dur = doc.createElement('duration');
  dur.textContent = String(duration);
  note.appendChild(dur);
  const voice = doc.createElement('voice');
  voice.textContent = '1';
  note.appendChild(voice);
  const typeEl = doc.createElement('type');
  typeEl.textContent = type;
  note.appendChild(typeEl);
  for (let i = 0; i < dots; i++) note.appendChild(doc.createElement('dot'));
  measure.appendChild(note);
}

function appendPitch(
  doc: Document,
  measure: Element,
  midi: number,
  duration: number,
  type: string,
  dots = 0,
): void {
  const sp = spellMidi(midi);
  const note = doc.createElement('note');
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
  const dur = doc.createElement('duration');
  dur.textContent = String(duration);
  note.appendChild(dur);
  const voice = doc.createElement('voice');
  voice.textContent = '1';
  note.appendChild(voice);
  const typeEl = doc.createElement('type');
  typeEl.textContent = type;
  note.appendChild(typeEl);
  for (let i = 0; i < dots; i++) note.appendChild(doc.createElement('dot'));
  const stem = doc.createElement('stem');
  stem.textContent = 'down';
  note.appendChild(stem);
  measure.appendChild(note);
}

function barDivisions(measure: Element, fallback: number): number {
  const attr = elementChildren(measure, 'attributes')[0];
  const div = Number(textOf(attr, 'divisions') || 0);
  return div > 0 ? div : fallback;
}

/** MusicXML octave-change on bass (often -1 for upright). Written MIDI = sounding − 12×change. */
function bassOctaveChange(doc: Document): number {
  const bass = partById(doc, 'P2');
  for (const m of measuresOf(bass)) {
    for (const attributes of elementChildren(m, 'attributes')) {
      const tr = elementChildren(attributes, 'transpose')[0];
      if (!tr) continue;
      const oc = Number(textOf(tr, 'octave-change') || 0);
      if (Number.isFinite(oc)) return oc;
    }
  }
  return 0;
}

/**
 * Keep caller written range, but raise the floor so sounding MIDI stays ≥ 28
 * when upright bass uses octave-change −1 (written = sounding + 12).
 */
export function feasibleWrittenBassMidiRange(
  doc: Document,
  written: { min: number; max: number },
  soundingFloor = 28,
): { min: number; max: number } {
  const oc = bassOctaveChange(doc);
  // sounding = written + 12*oc  ⇒ writtenFloor = soundingFloor − 12*oc
  const minWrittenForSounding = soundingFloor - 12 * oc;
  return {
    min: Math.max(written.min, minWrittenForSounding),
    max: Math.max(written.max, minWrittenForSounding),
  };
}

function expectedTicks(measure: Element, divisions: number): number {
  let beats = 4;
  let beatType = 4;
  for (const attributes of elementChildren(measure, 'attributes')) {
    const time = elementChildren(attributes, 'time')[0];
    if (!time) continue;
    const b = Number(textOf(time, 'beats'));
    const bt = Number(textOf(time, 'beat-type'));
    if (b > 0 && bt > 0) {
      beats = b;
      beatType = bt;
    }
  }
  return (divisions * beats * 4) / beatType;
}

function rewriteBassPitches(
  doc: Document,
  profile: BassOnlyProfile,
  bassMidi: { min: number; max: number },
  seed: number,
): void {
  const gtr = measuresOf(partById(doc, 'P1'));
  const bass = measuresOf(partById(doc, 'P2'));
  const rand = mulberry32(seed);
  let prevBass: number | null = null;
  const motif: number[] = [];

  for (let i = 0; i < Math.min(2, bass.length); i++) {
    for (const n of soundingNotes(bass[i]!)) {
      const m = noteMidi(n);
      if (m != null) motif.push(m % 12);
    }
  }
  if (!motif.length) motif.push(0, 7, 3);

  for (let i = 0; i < bass.length; i++) {
    const gm = gtr[i]!;
    const bm = bass[i]!;
    const rootPc = harmonyRootPc(gm);
    const kind = harmonyKind(gm);
    const pcs = chordPcs(rootPc, kind);
    const gMidis = guitarMidisAtBar(gtr, i);
    const gMean = gMidis.length
      ? gMidis.reduce((a, b) => a + b, 0) / gMidis.length
      : (bassMidi.min + bassMidi.max) / 2;
    const notes = soundingNotes(bm);
    let attack = 0;

    for (const n of notes) {
      const current = noteMidi(n)!;
      let targetPc: number;
      if (profile === 'lyrical') {
        if (attack === 0) targetPc = pcs[0]!;
        else if (attack === 1) targetPc = pcs[Math.min(2, pcs.length - 1)]!;
        else {
          const motifPc = motif[(i + attack) % motif.length]!;
          targetPc = pcs.includes(motifPc)
            ? motifPc
            : pcs[(attack + Math.floor(i / 4)) % pcs.length]!;
        }
      } else {
        // contrapuntal: contrary to guitar contour + independent cell
        const g = gMidis[Math.min(attack, Math.max(0, gMidis.length - 1))];
        if (attack === 0) targetPc = pcs[0]!;
        else if (g != null && prevBass != null) {
          const gPrev = gMidis[Math.min(attack - 1, gMidis.length - 1)] ?? g;
          const gUp = g >= gPrev;
          const want = gUp ? prevBass - 3 : prevBass + 4;
          targetPc = pcs.reduce((best, pc) => {
            const cand = want - ((want % 12) - pc);
            const bestMidi = want - ((want % 12) - best);
            return Math.abs(cand - want) < Math.abs(bestMidi - want) ? pc : best;
          }, pcs[0]!);
        } else {
          targetPc = pcs[(attack + 1) % pcs.length]!;
        }
      }

      let prefer =
        prevBass != null
          ? prevBass - ((prevBass % 12) - targetPc)
          : current - ((current % 12) - targetPc);
      if (profile === 'lyrical' && prevBass != null) {
        // Prefer smooth VL (step/skip ≤ 5)
        const stepCand = nearestInPcs(prevBass + (rand() < 0.5 ? 2 : -1), pcs, bassMidi.min, bassMidi.max);
        if (Math.abs(stepCand - prevBass) <= 5) prefer = stepCand;
      }
      if (profile === 'contrapuntal' && gMidis.length) {
        // Keep below guitar centre when possible
        prefer = Math.min(prefer, Math.round(gMean) - 12);
      }
      const avoidUnison = gMidis[Math.min(attack, gMidis.length - 1)] ?? null;
      let cand = nearestInPcs(prefer, pcs, bassMidi.min, bassMidi.max, avoidUnison);
      if (profile === 'lyrical' && attack > 0 && prevBass != null && Math.abs(cand - prevBass) > 9) {
        cand = nearestInPcs(prevBass + (cand > prevBass ? 4 : -4), pcs, bassMidi.min, bassMidi.max);
      }
      // Phrase-level motif echo every 4 bars (lyrical)
      if (profile === 'lyrical' && i >= 4 && i % 4 === 0 && attack === 0 && motif.length) {
        const echoPc = motif[0]!;
        const mapped = pcs.includes(echoPc) ? echoPc : pcs[0]!;
        cand = nearestInPcs(prevBass ?? cand, [mapped, ...pcs], bassMidi.min, bassMidi.max);
      }
      setPitch(n, clamp(cand, bassMidi.min, bassMidi.max));
      prevBass = noteMidi(n);
      attack += 1;
    }
  }
}

function rewriteBassRhythm(
  doc: Document,
  bassMidi: { min: number; max: number },
  seed: number,
): void {
  const gtr = measuresOf(partById(doc, 'P1'));
  const bass = measuresOf(partById(doc, 'P2'));
  const rand = mulberry32(seed ^ 0x9e3779b9);
  let divisions = 4;
  let prevBass: number | null = null;

  for (let i = 0; i < bass.length; i++) {
    const gm = gtr[i]!;
    const bm = bass[i]!;
    divisions = barDivisions(bm, divisions);
    // Carry time/divisions from guitar if bass measure lacks them
    divisions = barDivisions(gm, divisions);
    const ticks = expectedTicks(gm, divisions);
    if (!Number.isFinite(ticks) || ticks <= 0) continue;

    const rootPc = harmonyRootPc(gm);
    const kind = harmonyKind(gm);
    const pcs = chordPcs(rootPc, kind);
    const gMidis = guitarMidisAtBar(gtr, i);
    const patternRoll = (i + Math.floor(rand() * 3)) % 4;

    clearNotes(bm);

    const place = (midi: number | null, dur: number, type: string, dots = 0) => {
      if (midi == null) appendRest(doc, bm, dur, type, dots);
      else {
        const m = clamp(midi, bassMidi.min, bassMidi.max);
        appendPitch(doc, bm, m, dur, type, dots);
        prevBass = m;
      }
    };

    const root = nearestInPcs(
      prevBass ?? bassMidi.min + 12,
      [pcs[0]!, ...pcs],
      bassMidi.min,
      bassMidi.max,
      gMidis[0] ?? null,
    );
    const colour = nearestInPcs(
      root + 7,
      pcs,
      bassMidi.min,
      bassMidi.max,
      gMidis[Math.min(1, gMidis.length - 1)] ?? null,
    );
    const approach = nearestInPcs(root - 2, pcs, bassMidi.min, bassMidi.max);

    const q = divisions;
    const e = divisions / 2;
    const h = divisions * 2;
    if (e !== Math.floor(e)) {
      // Odd divisions: fall back to pitch-only (should not happen on Black Aura / fixture)
      place(root, ticks, 'whole');
      continue;
    }

    // All patterns must sum to exactly one 4/4 bar (8 eighths / 4 quarters).
    if (patternRoll === 0) {
      // Anticipation: rest–hit–rest–dotted colour–root
      place(null, e, 'eighth');
      place(root, e, 'eighth');
      place(null, e, 'eighth');
      place(colour, q + e, 'quarter', 1);
      place(root, q, 'quarter');
    } else if (patternRoll === 1) {
      // Purposeful silence with late reply
      place(null, h, 'half');
      place(null, q, 'quarter');
      place(root, q, 'quarter');
    } else if (patternRoll === 2) {
      // Offbeat eighth dialogue across the bar
      place(null, e, 'eighth');
      place(root, e, 'eighth');
      place(null, e, 'eighth');
      place(colour, e, 'eighth');
      place(null, e, 'eighth');
      place(approach, e, 'eighth');
      place(root, e, 'eighth');
      place(colour, e, 'eighth');
    } else {
      // Varied placement: short–long–rest–short
      place(root, e, 'eighth');
      place(colour, h, 'half');
      place(null, q, 'quarter');
      place(approach, e, 'eighth');
    }

    // Repair duration sum if pattern over/under-shot (defensive)
    let sum = 0;
    for (const n of elementChildren(bm, 'note')) {
      if (elementChildren(n, 'chord').length) continue;
      sum += Number(textOf(n, 'duration') || 0);
    }
    if (sum !== ticks) {
      clearNotes(bm);
      place(root, ticks, ticks === h * 2 ? 'whole' : ticks === h ? 'half' : 'quarter');
    }
  }
}

/**
 * Compose a bass-only alternative. Throws if locks are requested and violated.
 */
export function transformBassOnly(sourceXml: string, opts: BassOnlyTransformOpts): string {
  if (opts.lockGuitar !== true || opts.preserveHarmony !== true) {
    throw new Error('bassOnly requires lockGuitar=true and preserveHarmony=true');
  }
  const doc = parseDoc(sourceXml);
  setTitle(doc, opts.title, opts.movement);
  const seed = opts.seed ?? 11011;
  const bassMidi = feasibleWrittenBassMidiRange(doc, opts.bassMidi);

  if (opts.profile === 'rhythmic') {
    rewriteBassRhythm(doc, bassMidi, seed);
  } else {
    rewriteBassPitches(doc, opts.profile, bassMidi, seed);
  }

  const xml = serialize(doc);
  const lockIssues = verifyBassOnlyLocks(sourceXml, xml, {
    lockGuitar: true,
    preserveHarmony: true,
  });
  if (lockIssues.length) {
    throw new Error(`bassOnly lock FAIL: ${lockIssues.join('; ')}`);
  }
  return xml;
}

/** Test helper — mutate guitar pitch then verify rejection. */
export function deliberatelyMutateGuitarPitch(xml: string, bar: number, delta = 1): string {
  const doc = parseDoc(xml);
  const m = measuresOf(partById(doc, 'P1')).find((x) => barNumber(x) === bar);
  if (!m) throw new Error(`bar ${bar} missing`);
  const n = soundingNotes(m)[0];
  if (!n) throw new Error(`no sounding guitar note in bar ${bar}`);
  setPitch(n, noteMidi(n)! + delta);
  return serialize(doc);
}

/** Test helper — mutate a chord symbol root. */
export function deliberatelyMutateHarmonyRoot(xml: string, bar: number): string {
  const doc = parseDoc(xml);
  const m = measuresOf(partById(doc, 'P1')).find((x) => barNumber(x) === bar);
  if (!m) throw new Error(`bar ${bar} missing`);
  const harm = elementChildren(m, 'harmony')[0];
  if (!harm) throw new Error(`no harmony in bar ${bar}`);
  const root = elementChildren(harm, 'root')[0];
  const step = elementChildren(root, 'root-step')[0];
  if (!step?.textContent) throw new Error('no root-step');
  step.textContent = step.textContent === 'C' ? 'D' : 'C';
  return serialize(doc);
}
