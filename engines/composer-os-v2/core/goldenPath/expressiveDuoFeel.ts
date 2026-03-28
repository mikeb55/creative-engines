/**
 * Expressive feel layer for Guitar–Bass Duo: articulation, dynamics, feel metadata.
 * Does not change pitches, note counts, or bar math — performance metadata only.
 */

import type { ScoreModel, PartModel, NoteEvent, FeelProfile } from '../score-model/scoreModelTypes';
import { activityScoreForBar } from './activityScore';

const EPS = 1e-4;

/** Default swing ratios by tempo class (long:short eighth feel). */
export const SWING_RATIO = {
  slow: 2.5,
  medium: 2.0,
  fast: 1.5,
} as const;

export function buildFeelProfileFromTempo(bpm: number): FeelProfile {
  const tempoFeel = bpm < 100 ? 'slow' : bpm > 132 ? 'fast' : 'medium';
  const swingRatio = SWING_RATIO[tempoFeel];
  return {
    swingRatio,
    tempoFeel,
    driftTotalBeats: 0.15,
  };
}

function isQuarterish(d: number): boolean {
  return Math.abs(d - 1) < 0.2;
}

function isStrongBeat(s: number): boolean {
  const r = Math.round(s * 4) / 4;
  return Math.abs(r) < EPS || Math.abs(r - 2) < EPS;
}

function isBackbeat(s: number): boolean {
  const r = Math.round(s * 4) / 4;
  return Math.abs(r - 1) < EPS || Math.abs(r - 3) < EPS;
}

function countNotesInMeasure(m: PartModel['measures'][0]): number {
  return m.events.filter((e) => e.kind === 'note').length;
}

/** Apply duo-specific articulation and light dynamics; preserves pitches and event counts. */
export function applyExpressiveDuoFeel(
  score: ScoreModel,
  opts?: { ecmEvenEighths?: boolean }
): ScoreModel {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');

  const parts = score.parts.map((p) => {
    const isGuitar = p.instrumentIdentity === 'clean_electric_guitar';
    const isBass = p.instrumentIdentity === 'acoustic_upright_bass';

    const measures = p.measures.map((m) => {
      const gMeas = guitar?.measures.find((x) => x.index === m.index);
      const bMeas = bass?.measures.find((x) => x.index === m.index);
      const gN = gMeas ? countNotesInMeasure(gMeas) : 0;
      const bN = bMeas ? countNotesInMeasure(bMeas) : 0;
      const denseBoth = gN >= 3 && bN >= 3;

      const events = m.events.map((e) => {
        if (e.kind !== 'note') return e;
        const n = e as NoteEvent;
        const { pitch, startBeat, duration, voice } = n;
        let articulation = n.articulation;
        let velocity = n.velocity;

        if (isBass) {
          if (m.index === 8) {
            if (duration >= 1 - EPS) articulation = 'tenuto';
            else articulation = 'staccato';
          } else if (isQuarterish(duration) && isStrongBeat(startBeat)) {
            articulation = 'staccato';
          } else if (duration >= 1.5) {
            articulation = 'tenuto';
          } else {
            articulation = 'staccato';
          }
        } else if (isGuitar) {
          if (opts?.ecmEvenEighths) {
            if (duration >= 1.5 - EPS) articulation = 'tenuto';
            else articulation = 'staccato';
          } else if (duration <= 0.625 + EPS) {
            articulation = isBackbeat(startBeat) && (pitch + m.index * 3) % 5 < 2 ? 'accent' : 'staccato';
          } else if (duration >= 1.5 - EPS) {
            articulation = 'tenuto';
          } else if (gN >= 4 || denseBoth) {
            articulation = 'staccato';
          } else {
            articulation = 'tenuto';
          }

          if (!opts?.ecmEvenEighths && denseBoth && duration <= 0.75 && (pitch + startBeat * 7) % 11 < 2) {
            articulation = 'staccato';
          }

          if (!opts?.ecmEvenEighths && duration <= 0.5 && (pitch * 3 + m.index * 5) % 17 === 0) {
            velocity = 38;
          }
        }

        const out: NoteEvent = {
          kind: 'note',
          pitch,
          startBeat,
          duration,
          voice,
          articulation,
        };
        if (velocity !== undefined) out.velocity = velocity;
        if (n.motifRef) out.motifRef = n.motifRef;
        return out;
      });

      return { ...m, events };
    });

    return { ...p, measures };
  });

  return { ...score, parts };
}

/** Soft score components for seed lock (higher = better). */
export function expressiveFeelSoftScore(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;

  const arts = new Set<string>();
  let noteCount = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        noteCount++;
        const a = (e as NoteEvent).articulation;
        if (a) arts.add(a);
      }
    }
  }
  const articulationVariety = noteCount > 0 ? Math.min(1, arts.size / 3.5) : 0;

  let onBackbeat = 0;
  let onDown = 0;
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const s = (e as NoteEvent).startBeat;
      const r = Math.round(s * 4) / 4;
      if (Math.abs(s - r) > 0.06) continue;
      if (Math.abs(r - 1) < EPS || Math.abs(r - 3) < EPS) onBackbeat++;
      if (Math.abs(r) < EPS || Math.abs(r - 2) < EPS) onDown++;
    }
  }
  const denom = onBackbeat + onDown;
  const compSparsity = denom > 0 ? onBackbeat / denom : 0.4;

  const gPitches: number[] = [];
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') gPitches.push((e as NoteEvent).pitch);
    }
  }
  let shellish = 0;
  let pairs = 0;
  for (let i = 1; i < gPitches.length; i++) {
    const iv = Math.abs(gPitches[i] - gPitches[i - 1]) % 12;
    pairs++;
    if (iv > 0 && iv <= 8) shellish++;
  }
  const voiceLeading = pairs > 0 ? shellish / pairs : 0;

  let denseOverlapPenalty = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const ga = activityScoreForBar(g, bar);
    const ba = activityScoreForBar(b, bar);
    if (ga >= 5 && ba >= 5) denseOverlapPenalty += 0.12;
  }

  let guitarOnsets = 0;
  let onsetCoincide = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const gm = g.measures.find((m) => m.index === bar);
    const bm = b.measures.find((m) => m.index === bar);
    if (!gm || !bm) continue;
    const bStarts = bm.events
      .filter((e) => e.kind === 'note')
      .map((e) => (e as NoteEvent).startBeat);
    for (const e of gm.events) {
      if (e.kind !== 'note') continue;
      guitarOnsets++;
      const gs = (e as NoteEvent).startBeat;
      if (bStarts.some((bs) => Math.abs(bs - gs) < 0.06)) onsetCoincide++;
    }
  }
  const coincideRatio = guitarOnsets > 0 ? onsetCoincide / guitarOnsets : 0;
  const compBassCoincidePenalty = Math.max(0, coincideRatio - 0.3) * 4;

  return (
    articulationVariety * 2.2 +
    compSparsity * 2.8 +
    voiceLeading * 1.5 -
    denseOverlapPenalty -
    compBassCoincidePenalty
  );
}
