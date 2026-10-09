/**
 * Performance Composer Phase 3 — INSERT.
 *
 * Four new bars written into the form just before the return of the head (the REPLACE span start;
 * Black Aura: between bars 31 and 32). Everything before and after is untouched.
 *
 *   Bass, harmony and every other part: QUOTED, never generated — the two bars before the insertion
 *   point, played twice as a vamp (a–b–a–b).
 *   Guitar: new, from the head's own opening motif, with deliberate silence, ending a step from the
 *   return's first note so the head arrives as a resolution.
 *
 *   N1 · Insert Anticipation  motif — rest — motif fragment a step away — held approach note
 *   N2 · Insert Space         rest — motif fragment — rest — held approach note
 *   N3 · Insert Echo          the last phrase's tail echoed — lower fragment — rest — approach note
 *
 * Every guitar pitch: in the quoted bar's own chord, no unison / minor 2nd / major 7th against any
 * sounding note, above the bass, inside the piece's melody register.
 */

import { seededRandom, spellForChord } from './pcChord';
import { NEW_NOTE_COLOR } from './pcLane';
import { chordAtTime, fieldAt, laneSetup, soundingBetween, type Timeline } from './pcRespond';
import { findReplaceSpan } from './pcReplace';
import { elementChildren, measureViews, parseScoreDocument, partElements, serializeNode } from './pcScore';

export const INSERT_ENGINE = 'pc-insert-3.1';
export const INSERT_BARS = 4;
export type InsertVariant = 'anticipation' | 'space' | 'echo';
export const INSERT_VARIANTS: ReadonlyArray<{ id: InsertVariant; label: string }> = [
  { id: 'anticipation', label: 'N1 · Insert Anticipation' },
  { id: 'space', label: 'N2 · Insert Space' },
  { id: 'echo', label: 'N3 · Insert Echo' },
];

export interface InsertPlan {
  variant: InsertVariant;
  label: string;
  seed: number;
  partId: string;
  /** New bars sit before this source bar. */
  before: number;
  /** Source bars quoted, in order, for the inserted bars. */
  quoted: number[];
  /** Inserted guitar notes: inserted bar index (1..4), onset quarters, length, sounding MIDI or null. */
  guitar: Array<{ bar: number; onset: number; quarters: number; midi: number | null }>;
}

interface Cell { onset: number; quarters: number; midi: number }

const TYPES: Array<[number, string, number]> = [
  [4, 'whole', 0], [3, 'half', 1], [2, 'half', 0], [1.5, 'quarter', 1], [1, 'quarter', 0], [0.75, 'eighth', 1], [0.5, 'eighth', 0], [0.25, '16th', 0],
];

/** Split a length into notatable pieces that never cross a beat in an awkward way. */
function pieces(q: number): number[] {
  const out: number[] = [];
  let left = q;
  while (left > 1e-9) {
    const t = TYPES.find(([len]) => len <= left + 1e-9)!;
    out.push(t[0]);
    left -= t[0];
  }
  return out;
}

/** The return's opening motif: up to four tones from the first bar of the span. */
function headCell(tl: Timeline, bar: number): Cell[] {
  const s = tl.barStart[bar - 1]!;
  const e = s + tl.barLen[bar - 1]!;
  return tl.melody
    .filter((m) => m.midi !== null && m.start >= s - 1e-9 && m.start < e - 1e-9)
    .slice(0, 4)
    .map((m) => ({ onset: m.start - s, quarters: Math.min(m.dur, e - m.start), midi: m.midi! }));
}

/** The last tones before the insertion point (for Echo). */
function tailCell(tl: Timeline, before: number): Cell[] {
  const end = tl.barStart[before - 1]!;
  const tones = tl.melody.filter((m) => m.midi !== null && m.start < end - 1e-9).slice(-3);
  if (!tones.length) return [];
  const t0 = tones[0]!.start;
  return tones.map((m) => ({ onset: m.start - t0, quarters: Math.min(m.dur, 1.5), midi: m.midi! }));
}

export function findInsertPoint(tl: Timeline, views: ReturnType<typeof measureViews>[]): { before: number; quoted: number[] } {
  const n = tl.barStart.length;
  const crosses = (b: number) => views.some((vs) => {
    const v = vs[b - 1];
    if (!v) return false;
    const len = v.length;
    return v.notes.some((x) => (x.tieStart && x.onset + x.ticks >= len) || (x.tieStop && x.onset === 0));
  });
  let before = findReplaceSpan(tl).from;
  // Never cut a tie: move earlier until the barline before `before` is free in every part.
  while (before > 3 && (crosses(before) || crosses(before - 1))) before--;
  before = Math.max(3, Math.min(before, n));
  return { before, quoted: [before - 2, before - 1, before - 2, before - 1] };
}

export function composeInsert(sourceXml: string, seed: number, variant: InsertVariant): { xml: string; plan: InsertPlan } {
  const { doc, partId, tl } = laneSetup(sourceXml);
  const parts = partElements(doc);
  const allViews = parts.map((p) => measureViews(p));
  const { before, quoted } = findInsertPoint(tl, allViews);
  const rand = seededRandom(seed * 11 + INSERT_VARIANTS.findIndex((v) => v.id === variant) * 37);

  // Guitar register: the piece's own melody range.
  const melMidis = tl.melody.filter((m) => m.midi !== null).map((m) => m.midi!);
  const lo = Math.min(...melMidis);
  const hi = Math.max(...melMidis);
  const head = headCell(tl, before);
  const tail = tailCell(tl, before);
  const target = head[0]?.midi ?? Math.round((lo + hi) / 2);

  // Timeline of the quoted bars (for checks): source time of each inserted bar's model bar.
  const modelStart = (k: number) => tl.barStart[quoted[k]! - 1]!;
  const barLen = (k: number) => tl.barLen[quoted[k]! - 1]!;

  /** Choose a pitch near `want` for the quoted bar k at onset o..o+q. */
  const choose = (k: number, o: number, q: number, want: number, chordTone = false): number | null => {
    const t0 = modelStart(k) + o;
    const t1 = t0 + q;
    const { field, chord } = fieldAt(tl, t0);
    const ct = chordAtTime(tl, t0)?.chordPcs ?? field;
    // Other parts as quoted (the guitar's own source notes are replaced, so they don't count).
    const others = tl.others.filter((x) => !tl.melodyAll.some((m) => m.start === x.start && m.end === x.end && m.midi === x.midi));
    const sounding = soundingBetween(others, t0, t1);
    const bassTop = Math.max(0, ...soundingBetween(tl.bass, t0, t1));
    let best: number | null = null;
    let bestScore = Infinity;
    for (let c = want - 5; c <= want + 5; c++) {
      const pc = ((c % 12) + 12) % 12;
      if (c < lo - 2 || c > hi + 2 || c < bassTop + 3) continue;
      if (!field.includes(pc) || (chordTone && !ct.includes(pc))) continue;
      if (sounding.some((s) => { const d = Math.abs(c - s) % 12; return c === s || d === 1 || d === 11; })) continue;
      let score = Math.abs(c - want);
      if (chord && pc === chord.rootPc) score += 0.6;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  };

  const bars: Array<Array<{ onset: number; quarters: number; midi: number | null }>> = [[], [], [], []];
  const place = (k: number, cell: Cell[], shift: number, maxTones = 4) => {
    let prev: number | null = null;
    for (const c of cell.slice(0, maxTones)) {
      if (c.onset >= barLen(k) - 1e-9) break;
      const q = Math.min(c.quarters, barLen(k) - c.onset);
      const want = prev !== null ? prev + (c.midi - (cell[cell.indexOf(c) - 1]?.midi ?? c.midi)) : c.midi + shift;
      const p = choose(k, c.onset, q, want);
      if (p === null) continue;
      bars[k]!.push({ onset: c.onset, quarters: q, midi: p });
      prev = p;
    }
  };
  const step = rand() < 0.5 ? 2 : -2;
  // The approach: a held note a step (1–2 semitones) from the return's first pitch, beats 1–2 of the last bar.
  const approach = () => {
    for (const d of rand() < 0.5 ? [2, 1, -1, -2] : [-1, -2, 2, 1]) {
      const p = choose(3, 0, 2, target + d);
      if (p !== null && Math.abs(p - target) <= 2 && p !== target) return bars[3]!.push({ onset: 0, quarters: 2, midi: p });
    }
    const p = choose(3, 0, 2, target, true);
    if (p !== null) bars[3]!.push({ onset: 0, quarters: 2, midi: p });
  };
  if (variant === 'anticipation') {
    place(0, head, 0);
    place(2, head, step, 2);
    approach();
  } else if (variant === 'space') {
    place(1, head, step, 2);
    approach();
  } else {
    const src = tail.length ? tail : head;
    place(0, src.map((c) => ({ ...c, onset: c.onset + 1 })), 0, 3);
    place(1, src, -3, 2);
    approach();
  }

  // ---- write: clone quoted bars in every part, guitar notes replaced ----
  const plan: InsertPlan = { variant, label: INSERT_VARIANTS.find((v) => v.id === variant)!.label, seed, partId, before, quoted, guitar: [] };
  parts.forEach((part, pi) => {
    const measures = elementChildren(part, 'measure');
    const anchor = measures[before - 1] ?? null;
    const isLane = part.getAttribute('id') === partId;
    const view0 = allViews[pi]![quoted[0]! - 1]!;
    quoted.forEach((qb, k) => {
      const clone = measures[qb - 1]!.cloneNode(true) as Element;
      for (const c of elementChildren(clone)) {
        if (['print', 'barline', 'attributes', 'direction', 'sound'].includes(c.nodeName)) clone.removeChild(c);
      }
      for (const n of elementChildren(clone, 'note')) {
        for (const t of elementChildren(n, 'tie')) n.removeChild(t);
        for (const no of elementChildren(n, 'notations')) for (const t of elementChildren(no, 'tied')) no.removeChild(t);
      }
      if (isLane) {
        // Keep chord symbols (harmony) at their places; replace every note with the new line.
        const view = allViews[pi]![qb - 1]!;
        const div = view.divisions;
        const staff = elementChildren(measures[qb - 1]!, 'note')[0] ? elementChildren(elementChildren(measures[qb - 1]!, 'note')[0]!, 'staff')[0]?.textContent : null;
        for (const c of elementChildren(clone)) if (['note', 'backup', 'forward'].includes(c.nodeName)) clone.removeChild(c);
        const harmonies = elementChildren(clone, 'harmony');
        for (const h of harmonies) clone.removeChild(h);
        const events: Array<{ onset: number; quarters: number; midi: number | null }> = [];
        let cur = 0;
        const len = view.length / div;
        for (const e of [...bars[k]!].sort((a, b) => a.onset - b.onset)) {
          if (e.onset < cur - 1e-9) continue;
          if (e.onset > cur + 1e-9) events.push({ onset: cur, quarters: e.onset - cur, midi: null });
          events.push(e);
          cur = e.onset + e.quarters;
        }
        if (cur < len - 1e-9) events.push({ onset: cur, quarters: len - cur, midi: null });
        // Harmony goes back in front of the note sounding at its onset.
        const hOn = harmonies.map((h, i) => ({ h, onset: (view.harmony[i]?.onset ?? 0) / div }));
        for (const e of events) {
          let t = e.onset;
          const parts2 = pieces(e.quarters);
          parts2.forEach((pq, j) => {
            for (const ho of hOn.filter((x) => x.onset >= t - 1e-9 && x.onset < t + pq - 1e-9)) clone.appendChild(ho.h);
            const note = doc.createElement('note');
            if (e.midi === null) note.appendChild(doc.createElement('rest'));
            else {
              const chord = chordAtTime(tl, modelStart(k) + t);
              const w = spellForChord(e.midi - 12 * view.transposeOctave, chord, view.fifths);
              const pitch = doc.createElement('pitch');
              const add = (name: string, v: string) => { const x = doc.createElement(name); x.textContent = v; pitch.appendChild(x); };
              add('step', w.step);
              if (w.alter) add('alter', String(w.alter));
              add('octave', String(w.octave));
              note.appendChild(pitch);
              note.setAttribute('color', NEW_NOTE_COLOR);
            }
            const d = doc.createElement('duration');
            d.textContent = String(Math.round(pq * div));
            note.appendChild(d);
            if (e.midi !== null && parts2.length > 1) {
              if (j > 0) { const tie = doc.createElement('tie'); tie.setAttribute('type', 'stop'); note.appendChild(tie); }
              if (j < parts2.length - 1) { const tie = doc.createElement('tie'); tie.setAttribute('type', 'start'); note.appendChild(tie); }
            }
            const v = doc.createElement('voice');
            v.textContent = '1';
            note.appendChild(v);
            const ty = TYPES.find(([l]) => Math.abs(l - pq) < 1e-9)!;
            const type = doc.createElement('type');
            type.textContent = ty[1];
            note.appendChild(type);
            if (ty[2]) note.appendChild(doc.createElement('dot'));
            if (staff) { const st = doc.createElement('staff'); st.textContent = staff; note.appendChild(st); }
            if (e.midi !== null && parts2.length > 1) {
              const nots = doc.createElement('notations');
              if (j > 0) { const x = doc.createElement('tied'); x.setAttribute('type', 'stop'); nots.appendChild(x); }
              if (j < parts2.length - 1) { const x = doc.createElement('tied'); x.setAttribute('type', 'start'); nots.appendChild(x); }
              note.appendChild(nots);
            }
            clone.appendChild(note);
            t += pq;
          });
          plan.guitar.push({ bar: k + 1, onset: e.onset, quarters: e.quarters, midi: e.midi });
        }
        for (const ho of hOn) if (!ho.h.parentNode) clone.appendChild(ho.h);
        void view0;
      }
      clone.setAttribute('number', `${before - 1}${String.fromCharCode(97 + k)}`);
      clone.removeAttribute('width');
      part.insertBefore(clone, anchor);
    });
  });
  return { xml: serializeNode(doc), plan };
}

/** Prove INSERT: source bars untouched and in order around the new bars; quoted parts exact; guitar bars full. */
export function verifyInsert(sourceXml: string, outXml: string, plan: InsertPlan): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const src = parseScoreDocument(sourceXml);
  const out = parseScoreDocument(outXml);
  const sp = partElements(src);
  const op = partElements(out);
  if (sp.length !== op.length) errors.push('part count changed');
  const ser = (m: Element) => serializeNode(m);
  const noteText = (m: Element) => elementChildren(m, 'note').map((n) => {
    const c = n.cloneNode(true) as Element;
    for (const t of elementChildren(c, 'tie')) c.removeChild(t);
    for (const no of elementChildren(c, 'notations')) for (const t of elementChildren(no, 'tied')) no.removeChild(t);
    return serializeNode(c);
  }).join('');
  sp.forEach((part, pi) => {
    const a = elementChildren(part, 'measure');
    const b = elementChildren(op[pi]!, 'measure');
    if (b.length !== a.length + INSERT_BARS) { errors.push(`part ${pi + 1}: bar count is not source + ${INSERT_BARS}`); return; }
    for (let i = 0; i < a.length; i++) {
      const j = i < plan.before - 1 ? i : i + INSERT_BARS;
      if (ser(a[i]!) !== ser(b[j]!)) errors.push(`part ${pi + 1}: source bar ${i + 1} changed`);
    }
    const isLane = part.getAttribute('id') === plan.partId;
    const views = measureViews(op[pi]!);
    plan.quoted.forEach((qb, k) => {
      const ins = b[plan.before - 1 + k]!;
      const v = views[plan.before - 1 + k]!;
      const total = v.notes.filter((n) => n.voice === '1').reduce((s, n) => s + n.ticks, 0);
      if (!isLane && noteText(ins) !== noteText(a[qb - 1]!)) errors.push(`part ${pi + 1}: inserted bar ${k + 1} is not a quote of bar ${qb}`);
      if (isLane) {
        if (total !== v.length) errors.push(`inserted guitar bar ${k + 1} does not fill the bar`);
        const srcH = elementChildren(a[qb - 1]!, 'harmony').map(ser).join('');
        const insH = elementChildren(ins, 'harmony').map(ser).join('');
        if (srcH !== insH) errors.push(`inserted guitar bar ${k + 1}: chord symbols are not those of bar ${qb}`);
      }
    });
  });
  if (!plan.guitar.some((g) => g.midi !== null)) errors.push('inserted guitar has no notes');
  return { ok: errors.length === 0, errors };
}
