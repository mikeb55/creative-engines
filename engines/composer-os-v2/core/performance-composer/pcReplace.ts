/**
 * Performance Composer Phase 3 — REPLACE.
 *
 * New melody pitches for one span of the guitar melody. Rhythm, rests, ties, harmony, bass, form and
 * every other bar stay locked. The new line is the source phrase's own intervals transformed:
 *
 *   P1 · Mirror      the phrase inverted around its own centre (each step goes the other way)
 *   P2 · Retrograde  the phrase's pitches backwards over the original rhythm
 *   P3 · Shifted     the same shape moved a third up or down
 *
 * Each pitch is drawn to the nearest tone of the score's own chord at that moment (colour tones
 * welcome, roots avoided), never clashes (unison, minor 2nd, major 7th) with any other sounding note,
 * keeps above the bass, stays in the phrase's register, and each phrase ends on a chord tone.
 *
 * Default span (until bar selection, Phase 4): the return of an earlier bar in the second half of the
 * piece (Black Aura: the head's return at bar 32) — REPLACE writes a variation on the return.
 */

import { seededRandom } from './pcChord';
import { NEW_NOTE_COLOR } from './pcLane';
import { melodyGroups, type MelodyGroup } from './pcPhase2';
import { chordAtTime, fieldAt, laneSetup, soundingBetween, type Timeline } from './pcRespond';
import { spellForChord } from './pcChord';
import { elementChildren, measureViews, parseScoreDocument, partById, serializeNode } from './pcScore';

export const REPLACE_ENGINE = 'pc-replace-3.1';
export type ReplaceVariant = 'mirror' | 'retrograde' | 'shifted';
export const REPLACE_VARIANTS: ReadonlyArray<{ id: ReplaceVariant; label: string }> = [
  { id: 'mirror', label: 'P1 · Replace Mirror' },
  { id: 'retrograde', label: 'P2 · Replace Retrograde' },
  { id: 'shifted', label: 'P3 · Replace Shifted' },
];

export interface ReplacePlan {
  variant: ReplaceVariant;
  label: string;
  seed: number;
  partId: string;
  from: number;
  to: number;
  notes: Array<{ bar: number; onset: number; was: number; now: number }>;
  changed: number;
}

const barMelody = (tl: Timeline, b: number) => {
  const s = tl.barStart[b - 1]!;
  const e = s + tl.barLen[b - 1]!;
  return tl.melody.filter((x) => x.start >= s - 1e-9 && x.start < e - 1e-9 && x.midi !== null).map((x) => x.midi!);
};

/** The default span: a return of earlier material in the second half, to the end of that phrase. */
export function findReplaceSpan(tl: Timeline): { from: number; to: number } {
  const n = tl.barStart.length;
  const half = Math.ceil(n / 2);
  const last = n - 2; // leave the final bars alone
  let from = -1;
  for (let b = half; b <= last && from < 0; b++) {
    const m = barMelody(tl, b);
    if (m.length < 2) continue;
    for (let a = 1; a <= b - 4; a++) if (barMelody(tl, a).join() === m.join()) { from = b; break; }
  }
  if (from < 0) for (let b = half; b <= last; b++) if (barMelody(tl, b).length >= 2) { from = b; break; }
  if (from < 0) from = 1;
  let to = from;
  while (to + 1 <= last && to - from < 5 && barMelody(tl, to + 1).length > 0) to++;
  return { from, to };
}

export function composeReplace(sourceXml: string, seed: number, variant: ReplaceVariant, span?: { from: number; to: number }): { xml: string; plan: ReplacePlan } {
  const { doc, partId, melodyVoice, tl } = laneSetup(sourceXml);
  const { from, to } = span ?? findReplaceSpan(tl);
  const part = partById(doc, partId);
  const views = measureViews(part);
  const groups = melodyGroups(part, melodyVoice).filter((g) => g.bar >= from && g.bar <= to);
  const tones: MelodyGroup[][] = [];
  for (const g of groups) {
    const last = tones[tones.length - 1];
    if (last && g.tieStop && last[last.length - 1]!.tieStart && last[last.length - 1]!.top === g.top) last.push(g);
    else tones.push([g]);
  }
  const at = (tone: MelodyGroup[]) => tl.barStart[tone[0]!.bar - 1]! + tone[0]!.onset;
  const startOf = (g: MelodyGroup) => tl.barStart[g.bar - 1]! + g.onset;
  /** Tone length from its first onset to the end of its last tied piece. */
  const len = (tone: MelodyGroup[]) => startOf(tone[tone.length - 1]!) + tone[tone.length - 1]!.dur - startOf(tone[0]!);
  const P = tones.map((t) => t[0]!.top);
  // Phrase ends inside the span: a gap of a beat or more, or the span's last tone.
  const phraseEnd = tones.map((t, i) => i === tones.length - 1 || at(tones[i + 1]!) - (at(t) + len(t)) >= 1 - 1e-9);
  // Other sounding notes: everything except this span's melody voice.
  const mine = new Set(
    tl.melodyAll.filter((m) => m.start >= tl.barStart[from - 1]! - 1e-9 && m.start < tl.barStart[to - 1]! + tl.barLen[to - 1]! - 1e-9).map((m) => `${m.start}:${m.end}:${m.midi}`)
  );
  const others = tl.others.filter((o) => !mine.has(`${o.start}:${o.end}:${o.midi}`));
  const lo = Math.min(...P) - 2;
  const hi = Math.max(...P) + 2;
  const axis = Math.min(...P) + Math.max(...P);
  const rand = seededRandom(seed * 7 + REPLACE_VARIANTS.findIndex((v) => v.id === variant) * 101);
  const shift = rand() < 0.5 ? (rand() < 0.5 ? 3 : 4) : rand() < 0.5 ? -3 : -4;
  const Q: number[] = [];
  for (let i = 0; i < tones.length; i++) {
    const t0 = at(tones[i]!);
    const t1 = t0 + len(tones[i]!);
    // Drift-free: each target is computed from the source pitch, so the line keeps its register.
    let target: number;
    if (variant === 'retrograde') target = P[P.length - 1 - i]!;
    else if (variant === 'mirror') target = axis - P[i]!; // inverted around the phrase's own centre
    else target = P[i]! + shift;
    while (target > hi) target -= 12;
    while (target < lo) target += 12;
    const { field, chord } = fieldAt(tl, t0);
    const chordTones = chordAtTime(tl, t0)?.chordPcs ?? field;
    const sounding = soundingBetween(others, t0, t1);
    const bassTop = Math.max(0, ...soundingBetween(tl.bass, t0, t1));
    let best: number | null = null;
    let bestScore = Infinity;
    for (let c = target - 4; c <= target + 4; c++) {
      const pc = ((c % 12) + 12) % 12;
      if (c < lo || c > hi || c < bassTop + 3) continue;
      if (!field.includes(pc)) continue;
      if (sounding.some((o) => { const d = Math.abs(c - o) % 12; return c === o || d === 1 || d === 11; })) continue;
      if (phraseEnd[i] && !chordTones.includes(pc)) continue;
      let score = Math.abs(c - target);
      if (chord && pc === chord.rootPc) score += 0.6; // colour over root
      if (i > 0 && Math.abs(c - Q[i - 1]!) > 7) score += 2;
      if (i > 0 && c === Q[i - 1]! && P[i] !== P[i - 1]) score += 1.5; // keep the line moving
      if (score < bestScore) { bestScore = score; best = c; }
    }
    // Ties across the span's edges keep their pitch; with no acceptable new pitch, keep the source's.
    const edgeTie = (i === 0 && tones[0]![0]!.tieStop) || (i === tones.length - 1 && tones[i]![tones[i]!.length - 1]!.tieStart);
    Q.push(edgeTie ? P[i]! : best ?? P[i]!);
  }
  // Write: one pitch per tone (melody chords become the new single line), rhythm untouched.
  const notes: ReplacePlan['notes'] = [];
  tones.forEach((tone, i) => {
    for (const g of tone) {
      const primary = g.elements[0]!;
      for (const el of g.elements.slice(1)) el.parentNode!.removeChild(el);
      const view = views[g.bar - 1]!;
      const chord = chordAtTime(tl, tl.barStart[g.bar - 1]! + g.onset);
      const sp = spellForChord(Q[i]!, chord, view.fifths);
      const written = spellForChord(Q[i]! - 12 * view.transposeOctave, chord, view.fifths);
      const pitch = elementChildren(primary, 'pitch')[0]!;
      for (const k of elementChildren(pitch)) pitch.removeChild(k);
      const add = (name: string, value: string) => { const e = doc.createElement(name); e.textContent = value; pitch.appendChild(e); };
      add('step', written.step);
      if (written.alter) add('alter', String(written.alter));
      add('octave', String(written.octave));
      void sp;
      const acc = elementChildren(primary, 'accidental')[0];
      if (acc) primary.removeChild(acc);
      if (Q[i] !== P[i]) primary.setAttribute('color', NEW_NOTE_COLOR);
      notes.push({ bar: g.bar, onset: g.onset, was: g.top, now: Q[i]! });
    }
  });
  return {
    xml: serializeNode(doc),
    plan: {
      variant,
      label: REPLACE_VARIANTS.find((v) => v.id === variant)!.label,
      seed,
      partId,
      from,
      to,
      notes,
      changed: tones.filter((_, i) => Q[i] !== P[i]).length,
    },
  };
}

/** Prove REPLACE: outside the span nothing changed; inside, only melody pitches changed, rhythm identical. */
export function verifyReplace(sourceXml: string, outXml: string, plan: ReplacePlan, melodyVoice = '1'): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const src = parseScoreDocument(sourceXml);
  const out = parseScoreDocument(outXml);
  const strip = (doc: Document) => {
    const c = doc.documentElement.cloneNode(true) as Element;
    for (const p of elementChildren(c, 'part')) {
      if (p.getAttribute('id') !== plan.partId) continue;
      elementChildren(p, 'measure').forEach((m, i) => {
        if (i + 1 < plan.from || i + 1 > plan.to) return;
        for (const n of elementChildren(m, 'note'))
          if ((elementChildren(n, 'voice')[0]?.textContent?.trim() ?? '1') === melodyVoice && !elementChildren(n, 'rest').length) m.removeChild(n);
      });
    }
    return serializeNode(c);
  };
  if (strip(src) !== strip(out)) errors.push('something other than span melody pitches changed');
  const sv = measureViews(partById(src, plan.partId));
  const ov = measureViews(partById(out, plan.partId));
  for (let b = plan.from; b <= plan.to; b++) {
    const a = sv[b - 1]!.notes.filter((n) => n.voice === melodyVoice);
    const c = ov[b - 1]!.notes.filter((n) => n.voice === melodyVoice);
    if (a.length !== c.length) { errors.push(`bar ${b}: event count changed`); continue; }
    a.forEach((x, k) => {
      const y = c[k]!;
      if (x.onset !== y.onset || x.ticks !== y.ticks || x.rest !== y.rest) errors.push(`bar ${b}: rhythm changed`);
      if (!y.rest && y.midis.length !== 1) errors.push(`bar ${b}: not a single line`);
    });
  }
  return { ok: errors.length === 0, errors };
}
