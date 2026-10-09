/**
 * Performance Composer Phase 2 — second resource, mixture, reduce.
 *
 *   W · WYBLE          Resource B alone: the Jimmy Wyble engine's lower voice (its own voice-leading:
 *                      contrary motion, sustains under busy upper motion, phrase-start gestures,
 *                      call–response after phrase ends), placed under the locked melody.
 *   M · SPACE + WYBLE  One integrated line: Wyble's lower voice thinned to structural moments, and
 *                      Space's gap dyads voice-led out of the last Wyble note; the next phrase's
 *                      Wyble line starts from the dyad's lower note. Shared pitches, one voice.
 *   R · REDUCE         The melody cut back to its structural notes (phrase starts and ends, peaks,
 *                      downbeats, long notes). The rest become rests. Nothing is added.
 *
 * Every lane note is checked against the score's own chord at that moment, against every sounding
 * note (no unison, minor 2nd or major 7th), and as one guitar grip with the melody note above it.
 * A note that fails becomes silence.
 */

import { generateLowerVoice, type PhraseDirection } from '../../../jimmy-wyble-engine/wybleGenerator';
import type { WybleParameters } from '../../../jimmy-wyble-engine/wybleTypes';
import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { seededRandom } from './pcChord';
import { type PcLaneEvent } from './pcLane';
import {
  barAt,
  chordAtTime,
  clashes,
  composeRespond,
  fieldAt,
  laneSetup,
  snap,
  soundingBetween,
  LOW,
  type Timeline,
} from './pcRespond';
import { elementChildren, parseScoreDocument, partById, serializeNode, measureViews } from './pcScore';

export const PHASE2_ENGINE = 'pc-phase2.1';

export type Phase2Character = 'wyble' | 'mixture' | 'reduce';
export const PHASE2_CHARACTERS: ReadonlyArray<{ id: Phase2Character; label: string }> = [
  { id: 'wyble', label: 'W · Wyble' },
  { id: 'mixture', label: 'M · Space + Wyble' },
  { id: 'reduce', label: 'R · Reduce' },
];

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

interface LaneNote {
  start: number;
  dur: number;
  midis: number[];
  source: 'wyble' | 'space';
}

export interface Phase2LanePlan {
  character: 'wyble' | 'mixture';
  label: string;
  seed: number;
  partId: string;
  voice: string;
  notes: LaneNote[];
  events: PcLaneEvent[];
  /** Wyble beats proposed vs kept after the score's own checks. */
  wybleProposed: number;
  wybleKept: number;
  spaceAnswers: number;
  /** Mixture only: gap dyads whose lower note is within a tone of the Wyble note before it. */
  voiceLedJoins: number;
  joins: number;
}

const melodyAt = (tl: Timeline, a: number, b: number) =>
  tl.melodyAll.filter((m) => m.start < b - 1e-9 && m.end > a + 1e-9).map((m) => m.midi);

/** Can the guitar sound p (plus any extra lane notes) together with the melody notes in [a, b)? */
function laneNoteOk(tl: Timeline, p: number, a: number, b: number, inPhrase: boolean): boolean {
  const mel = melodyAt(tl, a, b);
  const others = soundingBetween(tl.others, a, b);
  const bassTop = Math.max(LOW - 3, ...soundingBetween(tl.bass, a, b));
  if (p < Math.max(LOW, bassTop + 3)) return false;
  if (mel.length && p > Math.min(...mel) - 3) return false;
  if (!inPhrase && p > 72) return false;
  if (!fieldAt(tl, a).field.includes(((p % 12) + 12) % 12)) return false;
  if (clashes(p, [], others)) return false;
  if (!assessGuitarFeasibility([p, ...mel]).feasible) return false;
  return true;
}

/** Nearest acceptable field tone to Wyble's `want` (within a fourth), else null (silence). */
function settle(tl: Timeline, want: number, a: number, b: number, inPhrase: boolean): number | null {
  for (const d of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5]) if (laneNoteOk(tl, want + d, a, b, inPhrase)) return want + d;
  return null;
}

function wybleQuality(tl: Timeline, t: number): { root: string; quality: string } {
  const chord = chordAtTime(tl, t);
  if (!chord) {
    const fifths = tl.fifths[barAt(tl, t)] ?? 0;
    return { root: NAMES[(((fifths * 7) % 12) + 12) % 12]!, quality: 'maj' };
  }
  const rel = chord.chordPcs.map((pc) => (pc - chord.rootPc + 12) % 12);
  const quality = rel.includes(3) ? 'min' : rel.includes(10) && rel.includes(4) ? 'dom' : 'maj';
  return { root: NAMES[chord.rootPc]!, quality };
}

/** Run the Wyble engine's lower voice once over the whole span, one pitch per beat. */
function wybleLine(tl: Timeline, from: number, to: number, seed: number): { beats: number; t0: number; line: number[]; active: boolean[] } {
  const t0 = tl.barStart[from - 1]!;
  const t1 = tl.barStart[to - 1]! + tl.barLen[to - 1]!;
  const beats = Math.floor(t1 - t0 + 1e-9);
  const upper: number[] = [];
  const active: boolean[] = [];
  let last = 64;
  for (let b = 0; b < beats; b++) {
    const t = t0 + b;
    const m = tl.melody.find((x) => x.midi !== null && x.start <= t + 1e-9 && x.start + x.dur > t + 1e-9);
    if (m) last = m.midi!;
    upper.push(last);
    active.push(!!m);
  }
  // Phrases for Wyble's phrase logic: split at melody rests of a beat or more.
  const lengths: number[] = [];
  const nets: number[] = [];
  const dirs: PhraseDirection[] = [];
  const targets: number[] = [];
  let startB = 0;
  const close = (endB: number) => {
    if (endB <= startB) return;
    const seg = upper.slice(startB, endB);
    const net = seg[seg.length - 1]! - seg[0]!;
    const peak = seg.indexOf(Math.max(...seg));
    lengths.push(endB - startB);
    nets.push(net);
    dirs.push(peak > 0 && peak < seg.length - 1 ? 'arch' : net >= 0 ? 'ascending' : 'descending');
    targets.push(seg[seg.length - 1]!);
    startB = endB;
  };
  for (let b = 1; b < beats; b++) if (!active[b] && active[b - 1]) close(b + 1);
  close(beats);
  // Wyble reads one chord per 4-beat block; the real chord at every beat is re-checked afterwards.
  const blocks = Math.ceil(beats / 4);
  const canonicalChords = Array.from({ length: blocks }, (_, i) => {
    const q = wybleQuality(tl, t0 + i * 4);
    return { root: q.root, quality: q.quality, extensions: [], alterations: [], bass: null, raw: `${q.root}${q.quality}` };
  });
  const params = {
    harmonicContext: { chords: canonicalChords.map((c) => c.raw), canonicalChords },
    motifSeed: [upper[0] ?? 64, Math.max(48, (upper[0] ?? 64) - 12)],
    pedalToneEnabled: false,
  } as unknown as WybleParameters;
  const line = generateLowerVoice(beats, params.harmonicContext, upper, params, seed, lengths, nets, dirs, targets);
  return { beats, t0, line, active };
}

/** Merge repeated pitches into sustained notes; never across a barline. */
function mergeSustains(tl: Timeline, notes: LaneNote[]): LaneNote[] {
  const out: LaneNote[] = [];
  for (const n of notes) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.source === n.source &&
      prev.midis.join() === n.midis.join() &&
      Math.abs(prev.start + prev.dur - n.start) < 1e-9 &&
      barAt(tl, prev.start) === barAt(tl, n.start)
    ) {
      prev.dur += n.dur;
    } else out.push({ ...n, midis: [...n.midis] });
  }
  return out;
}

function toLaneEvents(tl: Timeline, notes: readonly LaneNote[]): PcLaneEvent[] {
  const out: PcLaneEvent[] = [];
  for (const n of notes) {
    const bi = barAt(tl, n.start);
    const barEnd = tl.barStart[bi]! + tl.barLen[bi]!;
    const dur = snap(Math.min(n.dur, barEnd - n.start));
    if (dur < 0.25 - 1e-9) continue;
    out.push({ bar: bi + 1, onsetQuarters: snap(n.start - tl.barStart[bi]!), quarters: dur, midis: [...new Set(n.midis)].sort((a, b) => a - b) });
  }
  return out;
}

export function composeWyble(sourceXml: string, seed: number): Phase2LanePlan {
  const { partId, voice, blocked, tl, from, to } = laneSetup(sourceXml);
  const { beats, t0, line, active } = wybleLine(tl, from, to, seed);
  const notes: LaneNote[] = [];
  let kept = 0;
  let proposed = 0;
  for (let b = 0; b < beats; b++) {
    const t = t0 + b;
    if (!active[b] || blocked.has(barAt(tl, t) + 1)) continue;
    proposed++;
    const p = settle(tl, line[b]!, t, t + 1, true);
    if (p === null) {
      // Wyble's own device: hold the lower note under the moving melody when the new note won't fit.
      const prev = notes[notes.length - 1];
      if (prev && Math.abs(prev.start + prev.dur - t) < 1e-9 && laneNoteOk(tl, prev.midis[0]!, t, t + 1, true)) {
        notes.push({ start: t, dur: 1, midis: [...prev.midis], source: 'wyble' });
      }
      continue;
    }
    kept++;
    notes.push({ start: t, dur: 1, midis: [p], source: 'wyble' });
  }
  const merged = mergeSustains(tl, notes);
  return {
    character: 'wyble',
    label: 'W · Wyble',
    seed,
    partId,
    voice,
    notes: merged,
    events: toLaneEvents(tl, merged),
    wybleProposed: proposed,
    wybleKept: kept,
    spaceAnswers: 0,
    voiceLedJoins: 0,
    joins: 0,
  };
}

/**
 * Space + Wyble as one line. Wyble keeps only structural beats (phrase start, held melody notes,
 * the beat before a gap). Space's gap dyads are re-voiced so their lower note continues the Wyble
 * line; the next phrase's first Wyble note is drawn toward that dyad.
 */
export function composeMixture(sourceXml: string, seed: number): Phase2LanePlan {
  const { partId, voice, blocked, tl, from, to } = laneSetup(sourceXml);
  const { beats, t0, line, active } = wybleLine(tl, from, to, seed);
  const space = composeRespond({ sourceXml, character: 'space', seed });
  const rand = seededRandom(seed * 17 + 5);
  const isStructural = (b: number) => {
    const t = t0 + b;
    const m = tl.melody.find((x) => x.midi !== null && x.start <= t + 1e-9 && x.start + x.dur > t + 1e-9);
    const phraseStart = active[b] && (b === 0 || !active[b - 1]);
    const beforeGap = active[b] && b + 1 < beats && !active[b + 1];
    const held = !!m && m.dur >= 1.5 && m.start < t - 1e-9;
    return phraseStart || beforeGap || held;
  };
  const wyble: LaneNote[] = [];
  let proposed = 0;
  let kept = 0;
  for (let b = 0; b < beats; b++) {
    const t = t0 + b;
    if (!active[b] || blocked.has(barAt(tl, t) + 1) || !isStructural(b)) continue;
    proposed++;
    const p = settle(tl, line[b]!, t, t + 1, true);
    if (p === null) continue;
    kept++;
    wyble.push({ start: t, dur: 1, midis: [p], source: 'wyble' });
  }
  // Re-voice Space's answers out of the Wyble line.
  const gapNotes: LaneNote[] = [];
  let joins = 0;
  let voiceLed = 0;
  for (const a of space.answers) {
    for (const n of a.notes) {
      const before = [...wyble].reverse().find((w) => w.start + w.dur <= n.start + 1e-9);
      const from0 = before ? before.midis[0]! : n.midis[0]!;
      const interval = n.midis.length > 1 ? n.midis[n.midis.length - 1]! - n.midis[0]! : 0;
      let placed: number[] | null = null;
      for (const d of [0, -1, 1, -2, 2, -3, 3]) {
        const low = from0 + d;
        if (!laneNoteOk(tl, low, n.start, n.start + n.dur, false)) continue;
        if (interval) {
          for (const iv of [interval, 7, 5, 9, 8]) {
            const top = low + iv;
            if (laneNoteOk(tl, top, n.start, n.start + n.dur, false) && assessGuitarFeasibility([low, top]).feasible) {
              placed = [low, top];
              break;
            }
          }
          if (!placed) continue;
        } else placed = [low];
        break;
      }
      if (!placed) placed = n.midis; // Space's own choice already passed its checks
      if (before) {
        joins++;
        if (Math.abs(placed[0]! - before.midis[0]!) <= 2) voiceLed++;
      }
      gapNotes.push({ start: n.start, dur: n.dur, midis: placed, source: 'space' });
    }
  }
  // Draw the first Wyble note after each gap toward the dyad's lower note.
  for (const g of gapNotes) {
    const next = wyble.find((w) => w.start >= g.start + g.dur - 1e-9);
    if (!next || Math.abs(next.midis[0]! - g.midis[0]!) <= 2) continue;
    const p = settle(tl, g.midis[0]! + (rand() < 0.5 ? -1 : 1), next.start, next.start + next.dur, true);
    if (p !== null && Math.abs(p - g.midis[0]!) <= 2) next.midis = [p];
  }
  const all = mergeSustains(tl, [...wyble, ...gapNotes].sort((x, y) => x.start - y.start));
  // Never overlap within the lane voice.
  const clean: LaneNote[] = [];
  for (const n of all) {
    const prev = clean[clean.length - 1];
    if (prev && prev.start + prev.dur > n.start + 1e-9) prev.dur = n.start - prev.start;
    if (prev && prev.dur < 0.25 - 1e-9) clean.pop();
    clean.push(n);
  }
  return {
    character: 'mixture',
    label: 'M · Space + Wyble',
    seed,
    partId,
    voice,
    notes: clean,
    events: toLaneEvents(tl, clean),
    wybleProposed: proposed,
    wybleKept: kept,
    spaceAnswers: space.answers.length,
    voiceLedJoins: voiceLed,
    joins,
  };
}

/* ------------------------------------------------------------------------------------------------
 * REDUCE — the melody cut back to its structural notes. Only melody-voice notes of the guitar part
 * may change, and each may only become a rest of the same length at the same place.
 * --------------------------------------------------------------------------------------------- */

export interface ReducePlan {
  label: 'R · Reduce';
  seed: number;
  partId: string;
  melodyNotes: number;
  kept: number;
  removed: number;
  /** Removed melody notes by bar (document order) and onset (quarters). */
  removedAt: Array<{ bar: number; onset: number }>;
}

interface MelodyGroup {
  bar: number;
  onset: number;
  dur: number;
  top: number;
  elements: Element[];
  tieStart: boolean;
  tieStop: boolean;
}

function melodyGroups(part: Element, melodyVoice: string): MelodyGroup[] {
  const views = measureViews(part);
  const out: MelodyGroup[] = [];
  views.forEach((v, bi) => {
    // Pair DOM note elements with the timeline (same order, rests included).
    const els = elementChildren(v.element, 'note').filter(
      (n) => (elementChildren(n, 'voice')[0]?.textContent?.trim() ?? '1') === melodyVoice && !elementChildren(n, 'grace').length && !elementChildren(n, 'cue').length
    );
    const timed = v.notes.filter((n) => n.voice === melodyVoice);
    let ti = 0;
    for (let i = 0; i < els.length; i++) {
      const el = els[i]!;
      if (elementChildren(el, 'chord').length) {
        out[out.length - 1]?.elements.push(el);
        continue;
      }
      const tn = timed[ti++];
      if (!tn || tn.rest || elementChildren(el, 'rest').length) continue;
      out.push({
        bar: bi + 1,
        onset: tn.onset / v.divisions,
        dur: tn.ticks / v.divisions,
        top: Math.max(...tn.midis),
        elements: [el],
        tieStart: tn.tieStart,
        tieStop: tn.tieStop,
      });
    }
  });
  return out;
}

function toRest(doc: Document, el: Element): void {
  for (const k of elementChildren(el)) {
    if (['pitch', 'unpitched', 'tie', 'notations', 'lyric', 'accidental', 'stem', 'beam', 'notehead', 'play', 'instrument'].includes(k.nodeName)) el.removeChild(k);
  }
  const rest = doc.createElement('rest');
  el.insertBefore(rest, elementChildren(el)[0] ?? null);
}

/** Choose structural notes, turn the rest of the melody into rests. Returns the new XML and a plan. */
export function composeReduce(sourceXml: string, seed: number): { xml: string; plan: ReducePlan } {
  const { doc, partId, melodyVoice, views } = laneSetup(sourceXml);
  const part = partById(doc, partId);
  const groups = melodyGroups(part, melodyVoice);
  const rand = seededRandom(seed * 13 + 3);
  // Join tied groups into tones; a tone is kept or removed whole.
  const tones: MelodyGroup[][] = [];
  for (const g of groups) {
    const last = tones[tones.length - 1];
    if (last && g.tieStop && last[last.length - 1]!.tieStart && last[last.length - 1]!.top === g.top) last.push(g);
    else tones.push([g]);
  }
  const barStart: number[] = [];
  let t = 0;
  for (const v of views) {
    barStart.push(t);
    t += v.length / v.divisions;
  }
  const abs = (g: MelodyGroup) => barStart[g.bar - 1]! + g.onset;
  const len = (tone: MelodyGroup[]) => tone.reduce((s, g) => s + g.dur, 0);
  // Phrases: a gap of a beat or more between tones.
  const phrases: MelodyGroup[][][] = [];
  tones.forEach((tone, i) => {
    const prev = tones[i - 1];
    const gap = prev ? abs(tone[0]!) - (abs(prev[0]!) + len(prev)) : Infinity;
    if (!prev || gap >= 1 - 1e-9) phrases.push([tone]);
    else phrases[phrases.length - 1]!.push(tone);
  });
  const keep = new Set<MelodyGroup[]>();
  for (const ph of phrases) {
    keep.add(ph[0]!);
    keep.add(ph[ph.length - 1]!);
    const peak = ph.reduce((a, b) => (b[0]!.top > a[0]!.top ? b : a));
    keep.add(peak);
    for (const tone of ph) {
      if (len(tone) >= 1.5 - 1e-9) keep.add(tone);
      if (Math.abs(tone[0]!.onset) < 1e-9) keep.add(tone);
    }
    for (const tone of ph) if (!keep.has(tone) && rand() < 0.15) keep.add(tone);
  }
  const removedAt: ReducePlan['removedAt'] = [];
  let removed = 0;
  for (const tone of tones) {
    for (const g of tone) {
      if (keep.has(tone)) {
        // Chords in the melody: keep the top note only.
        if (g.elements.length > 1) {
          const tops = g.elements.map((el) => el);
          const midiOf = (el: Element) => {
            const p = elementChildren(el, 'pitch')[0];
            if (!p) return -1;
            const step = elementChildren(p, 'step')[0]?.textContent ?? 'C';
            const alter = Number(elementChildren(p, 'alter')[0]?.textContent ?? 0);
            const oct = Number(elementChildren(p, 'octave')[0]?.textContent ?? 4);
            return (oct + 1) * 12 + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[step]! + alter;
          };
          const best = tops.reduce((a, b) => (midiOf(b) > midiOf(a) ? b : a));
          for (const el of g.elements) {
            if (el === best) continue;
            if (el === g.elements[0]) {
              // The primary note carries the duration; the kept top note takes its place.
              const chordTag = elementChildren(best, 'chord')[0];
              if (chordTag) best.removeChild(chordTag);
              // It also takes the primary's length, so the bar's timing cannot change.
              const pd = elementChildren(el, 'duration')[0];
              const bd = elementChildren(best, 'duration')[0];
              if (pd && bd) bd.textContent = pd.textContent;
              el.parentNode!.insertBefore(best, el);
            }
            el.parentNode!.removeChild(el);
          }
        }
        continue;
      }
      removed++;
      removedAt.push({ bar: g.bar, onset: g.onset });
      for (const el of g.elements.slice(1)) el.parentNode!.removeChild(el);
      toRest(doc, g.elements[0]!);
    }
  }
  return {
    xml: serializeNode(doc),
    plan: { label: 'R · Reduce', seed, partId, melodyNotes: tones.length, kept: tones.length - new Set(tones.filter((x) => !keep.has(x))).size, removed: tones.filter((x) => !keep.has(x)).length, removedAt },
  };
}

/** Prove REDUCE only removed melody notes: everything else identical; each melody event kept or rested. */
export function verifyReduce(sourceXml: string, outXml: string, partId: string, melodyVoice = '1'): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const src = parseScoreDocument(sourceXml);
  const out = parseScoreDocument(outXml);
  const strip = (doc: Document) => {
    const c = doc.documentElement.cloneNode(true) as Element;
    for (const p of elementChildren(c, 'part')) {
      if (p.getAttribute('id') !== partId) continue;
      for (const m of elementChildren(p, 'measure'))
        for (const n of elementChildren(m, 'note'))
          if ((elementChildren(n, 'voice')[0]?.textContent?.trim() ?? '1') === melodyVoice) m.removeChild(n);
    }
    return serializeNode(c);
  };
  if (strip(src) !== strip(out)) errors.push('something other than melody notes changed');
  const sv = measureViews(partById(src, partId));
  const ov = measureViews(partById(out, partId));
  if (sv.length !== ov.length) errors.push('bar count changed');
  sv.forEach((m, i) => {
    const a = m.notes.filter((n) => n.voice === melodyVoice);
    const b = ov[i]!.notes.filter((n) => n.voice === melodyVoice);
    if (a.length !== b.length) {
      errors.push(`bar ${i + 1}: melody event count changed`);
      return;
    }
    a.forEach((x, k) => {
      const y = b[k]!;
      if (x.onset !== y.onset || x.ticks !== y.ticks) errors.push(`bar ${i + 1}: melody rhythm changed`);
      else if (!y.rest && (x.rest || Math.max(...y.midis) !== Math.max(...x.midis) || y.midis.length !== 1)) errors.push(`bar ${i + 1}: kept note is not the source's top note`);
    });
  });
  return { ok: errors.length === 0, errors };
}
