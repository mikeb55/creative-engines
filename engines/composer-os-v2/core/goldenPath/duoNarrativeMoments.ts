/**
 * Duo narrative: moment tags, tension–release soft scoring, phrase call/response, A/B contrast.
 * No hard gates — feeds the golden-path seed lock only.
 */

import type { ScoreModel, PartModel, NoteEvent, MomentTag } from '../score-model/scoreModelTypes';
import { activityScoreForBar } from './activityScore';

export function momentTagForBar(barIndex: number): MomentTag | undefined {
  if (barIndex === 4) return 'peak';
  if (barIndex === 7) return 'handoff';
  if (barIndex === 8) return 'cadence';
  return undefined;
}

function guitarActivityByBar(g: PartModel, bar: number): number {
  return activityScoreForBar(g, bar);
}

function countGuitarOffbeats(g: PartModel, bar: number): number {
  const m = g.measures.find((x) => x.index === bar);
  if (!m) return 0;
  let n = 0;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const s = (e as NoteEvent).startBeat;
    if (Math.abs(s - Math.round(s)) > 0.06) n++;
  }
  return n;
}

/** Soft score: arc shape, peaks, phrase-level dialogue, section contrast. */
export function scoreNarrativeMomentsSoft(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;

  const a1 = [1, 2, 3].reduce((s, bar) => s + guitarActivityByBar(g, bar), 0) / 3;
  const a2 = [4, 5, 6].reduce((s, bar) => s + guitarActivityByBar(g, bar), 0) / 3;
  const a3 = [7, 8].reduce((s, bar) => s + guitarActivityByBar(g, bar), 0) / 2;

  let arc = 0;
  if (a2 > a1 + 0.15) arc += 1.2;
  if (a3 < a2 - 0.1 || a3 <= a1 + 0.4) arc += 1.0;
  const flatPenalty = Math.abs(a2 - a1) < 0.08 && Math.abs(a3 - a2) < 0.08 ? 1.5 : 0;

  const peakBars = [4, 7];
  let peakScore = 0;
  for (const bar of peakBars) {
    const gb = guitarActivityByBar(g, bar);
    const bb = guitarActivityByBar(b, bar);
    if (gb >= 4 || bb >= 4) peakScore += 0.7;
  }
  if (guitarActivityByBar(g, 4) > a1 && guitarActivityByBar(g, 7) >= guitarActivityByBar(g, 5)) {
    peakScore += 0.5;
  }

  const offA = [1, 2, 3, 4].reduce((s, bar) => s + countGuitarOffbeats(g, bar), 0);
  const offB = [5, 6, 7, 8].reduce((s, bar) => s + countGuitarOffbeats(g, bar), 0);
  const contrast = Math.min(2, Math.abs(offB - offA) * 0.25 + Math.abs(a2 - a1) * 0.4);

  const phraseHandoff = scorePhraseCallResponse(g, b);

  let momentPresence = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.momentTag) momentPresence += 0.25;
    }
  }
  momentPresence = Math.min(1.5, momentPresence);

  return arc + peakScore - flatPenalty + contrast + phraseHandoff + momentPresence;
}

/** Time-ordered events: guitar→bass and bass→guitar answer pairs after a short gap. */
function scorePhraseCallResponse(g: PartModel, bass: PartModel): number {
  type Ev = { t: number; part: 'g' | 'b'; pitch: number };
  const evs: Ev[] = [];
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      evs.push({ t: (m.index - 1) * 4 + n.startBeat, part: 'g', pitch: n.pitch });
    }
  }
  for (const m of bass.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      evs.push({ t: (m.index - 1) * 4 + n.startBeat, part: 'b', pitch: n.pitch });
    }
  }
  evs.sort((a, b) => a.t - b.t);

  let g2b = 0;
  let b2g = 0;
  for (let i = 0; i < evs.length - 1; i++) {
    const a = evs[i];
    const c = evs[i + 1];
    const gap = c.t - a.t;
    if (gap < 0.3 || gap > 2.75) continue;
    if (a.part === 'g' && c.part === 'b') g2b += 1;
    if (a.part === 'b' && c.part === 'g') b2g += 1;
  }
  const both = g2b > 0 && b2g > 0;
  return Math.min(2.5, (both ? 1.2 : 0) + Math.min(1, g2b) * 0.35 + Math.min(1, b2g) * 0.35);
}
