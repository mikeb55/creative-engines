/**
 * Performance Composer — write one new voice into a copy of the source, then prove the locks held.
 * The source text is never rewritten: only the lane measures gain a <backup> plus the new voice.
 */

import { spellForChord } from './pcChord';
import {
  chooseLane,
  chooseLaneLoose,
  chordAt,
  elementChildren,
  ensureExplicitVoice,
  loadScore,
  measureViews,
  parseScoreDocument,
  partById,
  partElements,
  resolveSpan,
  scalePartDivisions,
  serializeNode,
  type PcBarRef,
  type PcLane,
  type PcSpan,
} from './pcScore';

export interface PcLaneEvent {
  /** Bar, document order, 1-based. */
  bar: number;
  /** Onset in quarter notes from the start of the bar. */
  onsetQuarters: number;
  quarters: number;
  /** Sounding MIDI pitches; one = single note, several = dyad/chord. */
  midis: number[];
}

/** Every note Composer OS writes is red, so new material is visible at a glance. */
export const NEW_NOTE_COLOR = '#E0201B';

export interface PcLaneRequest {
  span: PcSpan;
  events: readonly PcLaneEvent[];
  /** Part to write into; default first guitar part, else the first part. */
  partId?: string;
  /** Voice to write; default the first free voice in the span. Bars already using it must get no events. */
  voice?: string;
}

export interface PcLaneResult {
  xml: string;
  lane: PcLane;
  bars: PcBarRef[];
  barsWritten: number;
  notesWritten: number;
}

const TYPES: Array<[string, number]> = [
  ['whole', 4],
  ['half', 2],
  ['quarter', 1],
  ['eighth', 0.5],
  ['16th', 0.25],
  ['32nd', 0.125],
];

/** Split a duration (in divisions) into notatable values, largest first. Throws if impossible. */
export function notateTicks(ticks: number, divisions: number): Array<{ ticks: number; type: string; dots: number }> {
  const values: Array<{ ticks: number; type: string; dots: number }> = [];
  for (const [type, q] of TYPES) {
    for (const dots of [1, 0]) {
      const t = q * divisions * (dots ? 1.5 : 1);
      if (Number.isInteger(t) && t > 0) values.push({ ticks: t, type, dots });
    }
  }
  values.sort((a, b) => b.ticks - a.ticks);
  const out: Array<{ ticks: number; type: string; dots: number }> = [];
  let left = ticks;
  while (left > 0) {
    const v = values.find((x) => x.ticks <= left);
    if (!v) throw new Error(`cannot notate ${ticks} divisions at divisions=${divisions}`);
    out.push(v);
    left -= v.ticks;
  }
  return out;
}

function el(doc: Document, name: string, text?: string, attrs?: Record<string, string>): Element {
  const e = doc.createElement(name);
  if (text !== undefined) e.appendChild(doc.createTextNode(text));
  for (const [k, v] of Object.entries(attrs ?? {})) e.setAttribute(k, v);
  return e;
}

/** Smallest exact regrid factor so every event and gap in the lane can be notated on the part's grid. */
export function regridFactor(views: ReturnType<typeof measureViews>, events: readonly PcLaneEvent[]): number {
  const fits = (k: number) =>
    events.every((e) => {
      const v = views[e.bar - 1];
      if (!v) return true;
      const q = v.divisions * k;
      const start = e.onsetQuarters * q;
      const ticks = e.quarters * q;
      if (!Number.isInteger(start) || !Number.isInteger(ticks)) return false;
      try {
        if (start > 0) notateTicks(start, q);
        notateTicks(ticks, q);
        return true;
      } catch {
        return false;
      }
    });
  for (let k = 1; k <= 96; k++) if (fits(k)) return k;
  throw new Error('events cannot be placed on any exact regrid of this part');
}

export function writeLane(sourceXml: string, request: PcLaneRequest): PcLaneResult {
  const doc = parseScoreDocument(sourceXml);
  const bars = resolveSpan(doc, request.span);
  const chosen = request.voice
    ? { ...chooseLaneLoose(doc, request.partId), voice: request.voice }
    : chooseLane(doc, request.partId, request.span);
  const lane: PcLane = { ...chosen, regrid: 1 };
  const part = partById(doc, lane.partId);
  const k = regridFactor(measureViews(part), request.events);
  scalePartDivisions(part, k);
  lane.regrid = k;
  const views = measureViews(part);
  let barsWritten = 0;
  let notesWritten = 0;

  for (const event of request.events) {
    if (event.bar < request.span.from || event.bar > request.span.to) {
      throw new Error(`event in bar ${event.bar} is outside span ${request.span.from}–${request.span.to}`);
    }
  }

  for (const ref of bars) {
    const events = request.events.filter((e) => e.bar === ref.order).sort((a, b) => a.onsetQuarters - b.onsetQuarters);
    if (!events.length) continue;
    const view = views[ref.order - 1]!;
    if (view.notes.some((n) => n.voice === lane.voice)) {
      throw new Error(`bar ${ref.order} already uses voice ${lane.voice}`);
    }
    const q = view.divisions;
    const segments: Array<{ start: number; ticks: number; midis: number[] }> = [];
    let at = 0;
    for (const e of events) {
      const start = e.onsetQuarters * q;
      const ticks = e.quarters * q;
      if (!Number.isInteger(start) || !Number.isInteger(ticks) || ticks <= 0) {
        throw new Error(`bar ${ref.order}: event ${e.onsetQuarters}+${e.quarters} not on the divisions grid (${q})`);
      }
      if (start < at) throw new Error(`bar ${ref.order}: events overlap at ${e.onsetQuarters}`);
      if (start + ticks > view.length) throw new Error(`bar ${ref.order}: event runs past the bar end`);
      if (!e.midis.length) throw new Error(`bar ${ref.order}: event has no pitches`);
      if (start > at) segments.push({ start: at, ticks: start - at, midis: [] });
      segments.push({ start, ticks, midis: [...e.midis].sort((a, b) => a - b) });
      at = start + ticks;
    }
    if (at < view.length) segments.push({ start: at, ticks: view.length - at, midis: [] });

    // Insert before a right barline if present, else at the end of the measure.
    const measure = view.element;
    const kids = elementChildren(measure);
    // Only a trailing barline (nothing timed after it); mid-bar barlines stay where they are.
    let lastTimed = -1;
    kids.forEach((k, i) => {
      if (k.nodeName === 'note' || k.nodeName === 'backup' || k.nodeName === 'forward') lastTimed = i;
    });
    const insertBefore = kids.slice(lastTimed + 1).find((k) => k.nodeName === 'barline') ?? null;
    let cursor = 0;
    for (const k of kids) {
      if (k === insertBefore) break;
      if (k.nodeName === 'note' && !elementChildren(k, 'chord').length && !elementChildren(k, 'grace').length) {
        cursor += Number(elementChildren(k, 'duration')[0]?.textContent ?? 0);
      } else if (k.nodeName === 'backup') cursor -= Number(elementChildren(k, 'duration')[0]?.textContent ?? 0);
      else if (k.nodeName === 'forward') cursor += Number(elementChildren(k, 'duration')[0]?.textContent ?? 0);
    }
    const nodes: Element[] = [];
    if (cursor > 0) {
      const backup = el(doc, 'backup');
      backup.appendChild(el(doc, 'duration', String(cursor)));
      nodes.push(backup);
    }
    for (const seg of segments) {
      const pieces = notateTicks(seg.ticks, q);
      let offset = seg.start;
      pieces.forEach((piece, pi) => {
        const chord = chordAt(views, ref.order, offset);
        const pitches = seg.midis.length ? seg.midis : [null];
        pitches.forEach((midi, ni) => {
          const note = el(doc, 'note');
          if (ni > 0) note.appendChild(el(doc, 'chord'));
          if (midi === null) {
            note.appendChild(el(doc, 'rest'));
          } else {
            const written = midi - 12 * view.transposeOctave;
            const sp = spellForChord(written, chord, view.fifths);
            const pitch = el(doc, 'pitch');
            pitch.appendChild(el(doc, 'step', sp.step));
            if (sp.alter) pitch.appendChild(el(doc, 'alter', String(sp.alter)));
            pitch.appendChild(el(doc, 'octave', String(sp.octave)));
            note.appendChild(pitch);
            note.setAttribute('color', NEW_NOTE_COLOR);
          }
          note.appendChild(el(doc, 'duration', String(piece.ticks)));
          const tieStop = midi !== null && pi > 0;
          const tieStart = midi !== null && pi < pieces.length - 1;
          if (tieStop) note.appendChild(el(doc, 'tie', undefined, { type: 'stop' }));
          if (tieStart) note.appendChild(el(doc, 'tie', undefined, { type: 'start' }));
          note.appendChild(el(doc, 'voice', lane.voice));
          note.appendChild(el(doc, 'type', piece.type));
          for (let d = 0; d < piece.dots; d++) note.appendChild(el(doc, 'dot'));
          if (midi !== null) note.appendChild(el(doc, 'stem', 'down'));
          if (lane.staff) note.appendChild(el(doc, 'staff', lane.staff));
          if (tieStop || tieStart) {
            const notations = el(doc, 'notations');
            if (tieStop) notations.appendChild(el(doc, 'tied', undefined, { type: 'stop' }));
            if (tieStart) notations.appendChild(el(doc, 'tied', undefined, { type: 'start' }));
            note.appendChild(notations);
          }
          nodes.push(note);
          if (midi !== null) notesWritten += 1;
        });
        offset += piece.ticks;
      });
    }
    ensureExplicitVoice(measure);
    for (const n of nodes) measure.insertBefore(n, insertBefore);
    barsWritten += 1;
  }

  return { xml: serializeNode(doc), lane, bars, barsWritten, notesWritten };
}

export interface PcLockReport {
  ok: boolean;
  errors: string[];
  checks: {
    header: boolean;
    partsAndBars: boolean;
    lockedOutsideLane: boolean;
    lockedInsideLane: boolean;
    laneInsideSpan: boolean;
    laneBarFill: boolean;
    reimports: boolean;
  };
  barsCompared: number;
}

function stripLane(measure: Element, voice: string): string {
  const clone = measure.cloneNode(true) as Element;
  const kids = elementChildren(clone);
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i]!;
    const isLaneNote = k.nodeName === 'note' && (elementChildren(k, 'voice')[0]?.textContent?.trim() ?? '1') === voice;
    const next = kids[i + 1];
    const backupBeforeLane =
      k.nodeName === 'backup' && next?.nodeName === 'note' && (elementChildren(next, 'voice')[0]?.textContent?.trim() ?? '1') === voice;
    if (isLaneNote || backupBeforeLane) clone.removeChild(k);
  }
  return serializeNode(clone);
}

function headerOf(doc: Document): string {
  const clone = doc.documentElement.cloneNode(true) as Element;
  for (const p of elementChildren(clone, 'part')) clone.removeChild(p);
  return serializeNode(clone);
}

/** Prove that only the lane voice changed, only inside the span, and that its bars are full. */
export function verifyLockedCopy(sourceXml: string, outXml: string, span: PcSpan, lane: PcLane): PcLockReport {
  const errors: string[] = [];
  const src = parseScoreDocument(sourceXml);
  const out = parseScoreDocument(outXml);
  const checks = {
    header: headerOf(src) === headerOf(out),
    partsAndBars: true,
    lockedOutsideLane: true,
    lockedInsideLane: true,
    laneInsideSpan: true,
    laneBarFill: true,
    reimports: true,
  };
  if (!checks.header) errors.push('score header or part list changed');
  const sp = partElements(src);
  const lanePart = sp.find((p) => p.getAttribute('id') === lane.partId);
  if (lanePart) scalePartDivisions(lanePart, lane.regrid ?? 1);
  const op = partElements(out);
  if (sp.length !== op.length) {
    checks.partsAndBars = false;
    errors.push(`part count ${op.length} != ${sp.length}`);
  }
  let barsCompared = 0;
  for (let pi = 0; pi < Math.min(sp.length, op.length); pi++) {
    const id = sp[pi]!.getAttribute('id') ?? '';
    if (op[pi]!.getAttribute('id') !== id) {
      checks.partsAndBars = false;
      errors.push(`part ${pi + 1} id changed`);
    }
    const sm = elementChildren(sp[pi]!, 'measure');
    const om = elementChildren(op[pi]!, 'measure');
    if (sm.length !== om.length) {
      checks.partsAndBars = false;
      errors.push(`part ${id}: bar count ${om.length} != ${sm.length}`);
      continue;
    }
    const isLanePart = id === lane.partId;
    const srcViews = isLanePart ? measureViews(sp[pi]!) : [];
    const outViews = isLanePart ? measureViews(op[pi]!) : [];
    for (let m = 0; m < sm.length; m++) {
      barsCompared += 1;
      const order = m + 1;
      const inSpan = order >= span.from && order <= span.to;
      if (!isLanePart || !inSpan) {
        if (serializeNode(sm[m]!) !== serializeNode(om[m]!)) {
          if (isLanePart) checks.laneInsideSpan = false;
          else checks.lockedOutsideLane = false;
          errors.push(`part ${id} bar ${order}: changed outside the lane`);
        }
        continue;
      }
      if (serializeNode(om[m]!) === serializeNode(sm[m]!)) continue;
      const srcNormal = sm[m]!.cloneNode(true) as Element;
      const outHasLane = elementChildren(om[m]!, 'note').some((n) => elementChildren(n, 'voice')[0]?.textContent?.trim() === lane.voice);
      if (outHasLane) ensureExplicitVoice(srcNormal);
      if (stripLane(om[m]!, lane.voice) !== serializeNode(srcNormal)) {
        checks.lockedInsideLane = false;
        errors.push(`part ${id} bar ${order}: locked material changed inside the span`);
      }
      const laneNotes = outViews[m]!.notes.filter((n) => n.voice === lane.voice);
      if (laneNotes.length) {
        const sum = laneNotes.reduce((a, n) => a + n.ticks, 0);
        if (sum !== srcViews[m]!.length || laneNotes[0]!.onset !== 0) {
          checks.laneBarFill = false;
          errors.push(`part ${id} bar ${order}: lane fills ${sum}/${srcViews[m]!.length} from ${laneNotes[0]!.onset}`);
        }
        if (outViews[m]!.length !== srcViews[m]!.length) {
          checks.laneBarFill = false;
          errors.push(`part ${id} bar ${order}: bar length changed`);
        }
      }
    }
  }
  try {
    loadScore(outXml);
  } catch (error) {
    checks.reimports = false;
    errors.push(`output does not re-import: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { ok: errors.length === 0, errors, checks, barsCompared };
}
