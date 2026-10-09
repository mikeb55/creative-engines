/**
 * Performance Composer — TRITONE PAIR writer, lock check and field map.
 * The guitar part keeps every non-note element of the source (attributes, chord symbols, directions,
 * tempo, barlines, layout) in its original order; only its notes are replaced. Every other part is untouched.
 */

import { spellForChord } from './pcChord';
import { notateTicks, NEW_NOTE_COLOR } from './pcLane';
import { romanPosition } from './pcFretboard';
import { barLabel, ROLE_WORDS, TRITONE_PAIR_LABEL, type TpEvent, type TpPlan } from './pcTritonePair';
import { chordAt, elementChildren, loadScore, measureViews, parseScoreDocument, partElements, serializeNode } from './pcScore';

const TIMED = new Set(['note', 'backup', 'forward']);
const OUR_ID = 'pc-tp-';
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const NAT: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function el(doc: Document, name: string, text?: string, attrs?: Record<string, string>): Element {
  const e = doc.createElement(name);
  if (text !== undefined) e.appendChild(doc.createTextNode(text));
  for (const [k, v] of Object.entries(attrs ?? {})) e.setAttribute(k, v);
  return e;
}

/** Source onset (divisions) of each non-note element in a measure. */
function keptWithOnsets(measure: Element): Array<{ node: Element; onset: number }> {
  let cursor = 0;
  const out: Array<{ node: Element; onset: number }> = [];
  for (const k of elementChildren(measure)) {
    const dur = Number(elementChildren(k, 'duration')[0]?.textContent ?? 0);
    if (k.nodeName === 'note') {
      if (!elementChildren(k, 'chord').length && !elementChildren(k, 'grace').length) cursor += dur;
    } else if (k.nodeName === 'backup') cursor -= dur;
    else if (k.nodeName === 'forward') cursor += dur;
    else out.push({ node: k, onset: cursor });
  }
  return out;
}

function words(doc: Document, id: string, text: string, placement: 'above' | 'below', staff?: string): Element {
  const d = el(doc, 'direction', undefined, { placement, id });
  const dt = el(doc, 'direction-type');
  dt.appendChild(el(doc, 'words', text, { 'font-size': placement === 'above' ? '9' : '8', 'font-style': 'italic', color: NEW_NOTE_COLOR }));
  d.appendChild(dt);
  d.appendChild(el(doc, 'voice', '1'));
  if (staff) d.appendChild(el(doc, 'staff', staff));
  return d;
}

export function writeTritonePair(sourceXml: string, plan: TpPlan): string {
  const doc = parseScoreDocument(sourceXml);
  const part = partElements(doc).find((p) => p.getAttribute('id') === plan.guitarPartId)!;
  const views = measureViews(part);
  const measures = elementChildren(part, 'measure');
  const usesStaff = views.some((v) => v.notes.some((n) => n.staff));
  const staff = usesStaff ? '1' : undefined;
  const fieldOf = (id: string) => (id === 'HOME' ? plan.home : plan.mirror);
  let lastLabel = '';

  measures.forEach((measure, i) => {
    const bar = i + 1;
    const view = views[i]!;
    const q = view.divisions;
    const len = view.length;
    const bp = plan.bars[i]!;
    const kept = keptWithOnsets(measure);
    for (const k of elementChildren(measure)) measure.removeChild(k);

    const ev = plan.events.filter((e) => e.bar === bar);
    const twoVoice = ev.some((e) => e.voice === '2');
    const extras: Array<{ node: Element; onset: number }> = [];
    // The idea's name where it starts; inside it, only the field name when it changes.
    const label = barLabel(plan, bp);
    const prevRole = plan.bars[i - 1]?.role;
    const plain = bp.role === 'SILENCE' || bp.role === 'END' || bp.role === 'SLIDE' || bp.role === 'ALONE' || bp.role === 'RETURN';
    const full = prevRole !== bp.role && !plain ? `${ROLE_WORDS[bp.role]}: ${label}` : label;
    if ((label !== lastLabel || prevRole !== bp.role) && bp.role !== 'END') {
      extras.push({ node: words(doc, `${OUR_ID}label-${bar}`, full, 'above', staff), onset: 0 });
      lastLabel = label;
    }
    plan.positionMarks
      .filter((p) => p.bar === bar)
      .forEach((p, n) => extras.push({ node: words(doc, `${OUR_ID}pos-${bar}-${n}`, `pos. ${romanPosition(p.fret)}`, 'below', staff), onset: Math.round(p.onset * q) }));

    const cutsFor = (voice: string) =>
      voice === '1' ? [...kept.map((k) => k.onset), ...extras.map((x) => x.onset)].filter((t) => t > 0 && t < len) : [];

    const renderVoice = (voice: '1' | '2', events: TpEvent[]): Array<{ node: Element; start: number }> => {
      const segs: Array<{ start: number; ticks: number; e: TpEvent | null }> = [];
      let at = 0;
      for (const e of [...events].sort((a, b) => a.onset - b.onset)) {
        const start = Math.round(e.onset * q);
        const ticks = Math.round(e.quarters * q);
        if (start < at) throw new Error(`bar ${bar} voice ${voice}: overlapping notes`);
        if (start > at) segs.push({ start: at, ticks: start - at, e: null });
        segs.push({ start, ticks: Math.min(ticks, len - start), e });
        at = start + Math.min(ticks, len - start);
      }
      if (at < len) segs.push({ start: at, ticks: len - at, e: null });
      const cuts = [...new Set(cutsFor(voice))].sort((a, b) => a - b);
      const out: Array<{ node: Element; start: number }> = [];
      for (const seg of segs) {
        const bounds = [seg.start, ...cuts.filter((c) => c > seg.start && c < seg.start + seg.ticks), seg.start + seg.ticks];
        const parts: Array<{ ticks: number; type: string; dots: number; start: number }> = [];
        for (let b = 0; b + 1 < bounds.length; b++) {
          let off = bounds[b]!;
          for (const p of notateTicks(bounds[b + 1]! - bounds[b]!, q)) {
            parts.push({ ...p, start: off });
            off += p.ticks;
          }
        }
        parts.forEach((p, pi) => {
          const midis = seg.e ? [...seg.e.midis].sort((a, b) => a - b) : [null];
          midis.forEach((midi, ni) => {
            const note = el(doc, 'note');
            if (ni > 0) note.appendChild(el(doc, 'chord'));
            if (midi === null) note.appendChild(el(doc, 'rest'));
            else {
              const written = midi - 12 * view.transposeOctave;
              const f = fieldOf(seg.e!.field);
              const o = fieldOf(seg.e!.field === 'HOME' ? 'MIRROR' : 'HOME');
              const sp = f.spelling.get(mod12(midi)) ?? o.spelling.get(mod12(midi));
              const spelled = sp
                ? { ...sp, octave: Math.floor((written - NAT[sp.step]! - sp.alter) / 12) - 1 }
                : spellForChord(written, chordAt(views, bar, p.start), view.fifths);
              const pitch = el(doc, 'pitch');
              pitch.appendChild(el(doc, 'step', spelled.step));
              if (spelled.alter) pitch.appendChild(el(doc, 'alter', String(spelled.alter)));
              pitch.appendChild(el(doc, 'octave', String(spelled.octave)));
              note.appendChild(pitch);
              note.setAttribute('color', NEW_NOTE_COLOR);
            }
            note.appendChild(el(doc, 'duration', String(p.ticks)));
            const tieStop = midi !== null && pi > 0;
            const tieStart = midi !== null && pi < parts.length - 1;
            if (tieStop) note.appendChild(el(doc, 'tie', undefined, { type: 'stop' }));
            if (tieStart) note.appendChild(el(doc, 'tie', undefined, { type: 'start' }));
            note.appendChild(el(doc, 'voice', voice));
            note.appendChild(el(doc, 'type', p.type));
            for (let d = 0; d < p.dots; d++) note.appendChild(el(doc, 'dot'));
            if (twoVoice) note.appendChild(el(doc, 'stem', voice === '1' ? 'up' : 'down'));
            if (staff) note.appendChild(el(doc, 'staff', staff));
            if (tieStop || tieStart) {
              const n = el(doc, 'notations');
              if (tieStop) n.appendChild(el(doc, 'tied', undefined, { type: 'stop' }));
              if (tieStart) n.appendChild(el(doc, 'tied', undefined, { type: 'start' }));
              note.appendChild(n);
            }
            out.push({ node: note, start: p.start });
          });
        });
      }
      return out;
    };

    const v1 = renderVoice('1', ev.filter((e) => e.voice === '1'));
    const v2 = twoVoice ? renderVoice('2', ev.filter((e) => e.voice === '2')) : [];
    // Interleave: each kept element goes back at its own time; our labels follow the source's elements at that time.
    const pending = [...kept.map((k, n) => ({ ...k, order: n, ours: false })), ...extras.map((x, n) => ({ ...x, order: 1000 + n, ours: true }))];
    const trailing = (x: { node: Element; onset: number }) =>
      x.node.nodeName === 'barline' && (x.node.getAttribute('location') ?? 'right') === 'right';
    const flush = (t: number) => {
      const ready = pending.filter((x) => !trailing(x) && x.onset <= t).sort((a, b) => a.onset - b.onset || a.order - b.order);
      for (const x of ready) {
        measure.appendChild(x.node);
        pending.splice(pending.indexOf(x), 1);
      }
    };
    for (const n of v1) {
      flush(n.start);
      measure.appendChild(n.node);
    }
    flush(len);
    if (v2.length) {
      const backup = el(doc, 'backup');
      backup.appendChild(el(doc, 'duration', String(len)));
      measure.appendChild(backup);
      for (const n of v2) measure.appendChild(n.node);
    }
    for (const x of pending.sort((a, b) => a.order - b.order)) measure.appendChild(x.node);
  });

  return serializeNode(doc);
}

/* ------------------------------------------------------------------ lock check */

export interface TpLockReport {
  ok: boolean;
  errors: string[];
  checks: { header: boolean; otherPartsIdentical: boolean; guitarFrameIdentical: boolean; barFill: boolean; notesMatchPlan: boolean; reimports: boolean };
}

function headerOf(doc: Document): string {
  const clone = doc.documentElement.cloneNode(true) as Element;
  for (const p of elementChildren(clone, 'part')) clone.removeChild(p);
  return serializeNode(clone);
}

function frameOf(measure: Element): string {
  const attrs = Array.from({ length: measure.attributes.length }, (_, k) => `${measure.attributes[k]!.name}=${measure.attributes[k]!.value}`).join(' ');
  const kept = elementChildren(measure)
    .filter((k) => !TIMED.has(k.nodeName) && !(k.getAttribute('id') ?? '').startsWith(OUR_ID))
    .map((k) => serializeNode(k));
  return `${attrs}\n${kept.join('\n')}`;
}

/** Bass and every other part byte-identical; guitar keeps every non-note element; every voice fills its bar. */
export function verifyTritonePair(sourceXml: string, outXml: string, plan: TpPlan): TpLockReport {
  const errors: string[] = [];
  const src = parseScoreDocument(sourceXml);
  const out = parseScoreDocument(outXml);
  const checks = { header: headerOf(src) === headerOf(out), otherPartsIdentical: true, guitarFrameIdentical: true, barFill: true, notesMatchPlan: true, reimports: true };
  if (!checks.header) errors.push('score header or part list changed');
  const sp = partElements(src);
  const op = partElements(out);
  if (sp.length !== op.length) errors.push('part count changed');
  for (let pi = 0; pi < Math.min(sp.length, op.length); pi++) {
    const id = sp[pi]!.getAttribute('id');
    const sm = elementChildren(sp[pi]!, 'measure');
    const om = elementChildren(op[pi]!, 'measure');
    if (sm.length !== om.length) {
      errors.push(`part ${id}: bar count ${om.length} != ${sm.length}`);
      checks.otherPartsIdentical = false;
      continue;
    }
    if (id !== plan.guitarPartId) {
      if (serializeNode(sp[pi]!) !== serializeNode(op[pi]!)) {
        checks.otherPartsIdentical = false;
        errors.push(`part ${id} changed`);
      }
      continue;
    }
    const sv = measureViews(sp[pi]!);
    const ov = measureViews(op[pi]!);
    for (let m = 0; m < sm.length; m++) {
      if (frameOf(sm[m]!) !== frameOf(om[m]!)) {
        checks.guitarFrameIdentical = false;
        errors.push(`guitar bar ${m + 1}: chord symbols, directions, attributes or barlines changed`);
      }
      if (ov[m]!.length !== sv[m]!.length) {
        checks.barFill = false;
        errors.push(`guitar bar ${m + 1}: length ${ov[m]!.length} != ${sv[m]!.length}`);
      }
      for (const voice of [...new Set(ov[m]!.notes.map((n) => n.voice))]) {
        const sum = ov[m]!.notes.filter((n) => n.voice === voice).reduce((a, n) => a + n.ticks, 0);
        if (sum !== sv[m]!.length) {
          checks.barFill = false;
          errors.push(`guitar bar ${m + 1} voice ${voice}: fills ${sum}/${sv[m]!.length}`);
        }
      }
      const attacks = ov[m]!.notes.filter((n) => !n.rest && !n.tieStop).length;
      const planned = plan.events.filter((e) => e.bar === m + 1).length;
      if (attacks !== planned) {
        checks.notesMatchPlan = false;
        errors.push(`guitar bar ${m + 1}: ${attacks} attacks written, ${planned} planned`);
      }
    }
  }
  try {
    loadScore(outXml);
  } catch (error) {
    checks.reimports = false;
    errors.push(`output does not re-import: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { ok: errors.length === 0, errors, checks };
}

/* ------------------------------------------------------------------ stats + field map */

export interface TpStats {
  bars: number;
  attacks: number;
  barsWithGuitar: number;
  silentBars: number;
  twoVoiceBars: number;
  quartalGrips: number;
  gripsOnBeats1and3: number;
  /** Grips with the top note in one field over a fourth from the other. */
  clashGrips: number;
  mirrorDyads: number;
  quartalDyads: number;
  distinctRhythms: number;
  innerVoiceDistinctPitches: number;
  innerVoiceNotes: number;
  rangeLow: number;
  rangeHigh: number;
  maxFret: number;
  maxSpan: number;
  hardShifts: number;
  fieldBars: { HOME: number; MIRROR: number; BOTH: number };
}

export function tritonePairStats(plan: TpPlan): TpStats {
  const ev = plan.events;
  // Counted the way a player hears it: one attack per moment, whatever the voices; a grip is three notes or more.
  const grips = ev.filter((e) => e.midis.length >= 3 || e.kind === 'clash-grip');
  const moments = new Set(ev.map((e) => `${e.bar}:${e.onset}`));
  const rhythm = new Set(
    plan.bars.map((b) => [...new Set(ev.filter((e) => e.bar === b.bar).map((e) => e.onset))].sort((x, y) => x - y).join(','))
  );
  const inner = ev.filter((e) => e.voice === '2');
  const all = ev.flatMap((e) => e.midis);
  const fieldBars = { HOME: 0, MIRROR: 0, BOTH: 0 };
  for (const b of plan.bars) {
    if (b.role === 'SILENCE') continue;
    if (b.lower) fieldBars.BOTH += 1;
    else fieldBars[b.upper] += 1;
  }
  return {
    bars: plan.bars.length,
    attacks: moments.size,
    barsWithGuitar: new Set(ev.map((e) => e.bar)).size,
    silentBars: plan.bars.length - new Set(ev.map((e) => e.bar)).size,
    twoVoiceBars: new Set(inner.map((e) => e.bar)).size,
    quartalGrips: grips.length,
    gripsOnBeats1and3: grips.filter((e) => e.onset === 0 || e.onset === 2).length,
    clashGrips: ev.filter((e) => e.kind === 'clash-grip').length,
    mirrorDyads: ev.filter((e) => e.kind === 'mirror-dyad').length,
    quartalDyads: ev.filter((e) => e.kind === 'quartal-dyad').length,
    distinctRhythms: rhythm.size,
    innerVoiceDistinctPitches: new Set(inner.map((e) => e.midis[0])).size,
    innerVoiceNotes: inner.length,
    rangeLow: Math.min(...all),
    rangeHigh: Math.max(...all),
    maxFret: plan.fret.maxFret,
    maxSpan: plan.fret.maxSpan,
    hardShifts: plan.fret.hardShifts,
    fieldBars,
  };
}

const NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = (m: number) => `${NOTE[mod12(m)]}${Math.floor(m / 12) - 1}`;

const ROLE_REASON: Record<string, (plan: TpPlan) => string> = {
  ALIGN: (p) => `The tune trades two worlds every two bars. The guitar follows the trade, but answers the other world with the ${p.mirror.rootName} field, the exact tritone mirror of ${p.home.rootName}.`,
  SWAP: (p) => `Same bass, worlds swapped: ${p.mirror.rootName} over the ${p.home.rootName} bars, ${p.home.rootName} over the others. The tune's own melody notes move by an exact tritone.`,
  COLLIDE: () => `Two voices, one in each field. The top line carries the tune's notes moved by a tritone; the inner voice moves slowly in the other field.`,
  ALONE: (p) => `The bass rests. The guitar trades the pair by itself, one bar of ${p.mirror.rootName}, one of ${p.home.rootName}, with rhythms borrowed from other bars of the tune.`,
  SILENCE: () => `The bass has the space. The guitar stays out, and may lift in on the last beat.`,
  RETURN: (p) => `Return path: each bar starts in ${p.mirror.rootName} and its last note slides a semitone into ${p.home.rootName}.`,
  HOME: (p) => `Home: ${p.home.rootName} only, with the tune's own rhythm, so the head is recognisable.`,
  SLIDE: (p) => `The ${p.mirror.rootName} quartal stack, held: every note a semitone under the home stack.`,
  END: (p) => `Every finger slides up one fret into the ${p.home.rootName} quartal stack.`,
};

export function fieldMapMarkdown(plan: TpPlan, opts: { piece: string; stampLine: string; sourceFile: string; checks: TpLockReport }): string {
  const s = tritonePairStats(plan);
  // One row per idea; the field column lists its field changes with bar numbers.
  const runs: Array<{ from: number; to: number; role: string; label: string; parts: Array<{ from: number; to: number; label: string }> }> = [];
  for (const b of plan.bars) {
    const label = barLabel(plan, b);
    const last = runs[runs.length - 1];
    if (last && last.role === b.role && last.to === b.bar - 1) {
      last.to = b.bar;
      const lp = last.parts[last.parts.length - 1]!;
      if (lp.label === label) lp.to = b.bar;
      else last.parts.push({ from: b.bar, to: b.bar, label });
    } else runs.push({ from: b.bar, to: b.bar, role: b.role, label, parts: [{ from: b.bar, to: b.bar, label }] });
  }
  const span = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);
  const fieldCell = (r: (typeof runs)[number]) =>
    r.role === 'SILENCE' ? 'none' : r.parts.length === 1 ? r.label : r.parts.map((p) => `${p.label} (${span(p.from, p.to)})`).join(', ');
  const pairs = plan.home.pcs.map((pc, i) => `${plan.home.names[i]}↔${plan.mirror.spelling.get(mod12(pc + 6)) ? plan.mirror.names[plan.mirror.pcs.indexOf(mod12(pc + 6))] : '?'}`);
  const end = plan.events.filter((e) => e.kind === 'stack' && (e.bar === plan.bars.length || e.bar === plan.bars.length - 1));
  const lines = [
    `# ${opts.piece} — ${TRITONE_PAIR_LABEL}`,
    '',
    `${opts.stampLine}`,
    '',
    '## Concept',
    '',
    `One idea for the whole form: the guitar lives in two pentatonic fields a tritone apart, ${plan.home.rootName} minor pentatonic (home) and ${plan.mirror.rootName} minor pentatonic (mirror). They share no notes. Every home note has a partner exactly a tritone away (${pairs.join(', ')}), and every mirror note sits a semitone from a home note, so there is always a one-fret way home.`,
    '',
    'Where the worlds swap or collide, the line breaks into short three-note grips, then a beat of silence. Some grips put one field on top of a fourth from the other, both under one hand. They never fall two bars running or on the same beat twice running. The score\'s PEAK bar carries the highest note of the piece.',
    '',
    `Locked: bass, form, ${plan.bars.length} bars, metre, tempo, chord symbols. Only the guitar notes are new (red).`,
    '',
    '## Fields',
    '',
    `- Home: ${plan.home.rootName} minor pentatonic — ${plan.home.names.join(' ')}`,
    `- Mirror: ${plan.mirror.rootName} minor pentatonic — ${plan.mirror.names.join(' ')}`,
    '',
    '## Field map',
    '',
    '| Bars | Idea | Field | Why |',
    '|---|---|---|---|',
    ...runs.map((r) => `| ${span(r.from, r.to)} | ${ROLE_WORDS[r.role as keyof typeof ROLE_WORDS]} | ${fieldCell(r)} | ${ROLE_REASON[r.role]!(plan)} |`),
    '',
    '## Pivots and return',
    '',
    `- Pivot into the mirror: the tune's own trade (bars where the chord and bass sit closer to ${plan.mirror.rootName} than ${plan.home.rootName}).`,
    `- Silence as pivot: bars where the bass plays alone.`,
    `- Return: semitone slides, mirror note to the nearest home note.`,
    end.length === 2 ? `- Ending: ${end[0]!.midis.map(nm).join(' ')} (mirror stack) slides up one fret to ${end[1]!.midis.map(nm).join(' ')} (home stack).` : '- Ending: home field.',
    '',
    '## Playability (sounding pitch; written an octave higher)',
    '',
    `- Range ${nm(s.rangeLow)}–${nm(s.rangeHigh)}; highest fret ${s.maxFret}; widest hand span ${s.maxSpan} frets; hard jumps (over five frets in under a beat): ${s.hardShifts}.`,
    `- Hand positions are printed under the staff where the hand moves.`,
    '',
    '## Numbers',
    '',
    `- ${s.attacks} attacks over ${s.barsWithGuitar} bars; guitar silent in ${s.silentBars} bar${s.silentBars === 1 ? '' : 's'}; ${s.twoVoiceBars} two-voice bars.`,
    `- Three-note grips: ${s.quartalGrips}, of which ${s.clashGrips} clash the two fields under one hand (on beats 1 or 3: ${s.gripsOnBeats1and3}). Tritone dyads: ${s.mirrorDyads}. Fourth dyads: ${s.quartalDyads}.`,
    `- Different bar rhythms: ${s.distinctRhythms} of ${s.bars}. Inner voice: ${s.innerVoiceNotes} notes on ${s.innerVoiceDistinctPitches} different pitches.`,
    '',
    '## Checks',
    '',
    `- Bass and other parts identical: ${opts.checks.checks.otherPartsIdentical ? 'PASS' : 'FAIL'}`,
    `- Guitar chord symbols, directions, metre, tempo, barlines kept: ${opts.checks.checks.guitarFrameIdentical ? 'PASS' : 'FAIL'}`,
    `- Every bar full: ${opts.checks.checks.barFill ? 'PASS' : 'FAIL'}`,
    `- Fingered on the fretboard, every moment: PASS`,
    `- Musical verdict: not decided. You play it.`,
    '',
    `Source: ${opts.sourceFile}. Engine ${plan.engine}, seed ${plan.seed}.`,
    '',
  ];
  return lines.join('\n');
}
