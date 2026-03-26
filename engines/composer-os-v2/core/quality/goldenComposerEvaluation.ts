/**
 * Golden Composer Evaluation (GCE) — 0–10 musical quality score for Guitar–Bass Duo golden path.
 * Used for LOCK iteration; deterministic from score content only.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { chordTonesForGoldenChord } from '../goldenPath/guitarBassDuoHarmony';

function chordForBar(barIndex: number): string {
  if (barIndex <= 2) return 'Dmin9';
  if (barIndex <= 4) return 'G13';
  if (barIndex <= 6) return 'Cmaj9';
  return 'A7alt';
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export interface GceBreakdown {
  bassMelodic: number;
  bassRhythm: number;
  guitarSpace: number;
  guitarContour: number;
  interaction: number;
  motifReuse: number;
  formContrast: number;
  /** V3.3 — phrase onset spread / inevitability (0–10). */
  phraseAsymmetry: number;
}

export interface GceResult {
  /** Weighted mean 0–10 */
  total: number;
  breakdown: GceBreakdown;
}

const W = {
  bassMelodic: 0.2,
  bassRhythm: 0.12,
  guitarSpace: 0.11,
  guitarContour: 0.11,
  interaction: 0.17,
  motifReuse: 0.11,
  formContrast: 0.11,
  phraseAsymmetry: 0.07,
};

export function evaluateGoldenComposerGce(score: ScoreModel): GceResult {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) {
    const z = 0;
    const b: GceBreakdown = {
      bassMelodic: z,
      bassRhythm: z,
      guitarSpace: z,
      guitarContour: z,
      interaction: z,
      motifReuse: z,
      formContrast: z,
      phraseAsymmetry: z,
    };
    return { total: 0, breakdown: b };
  }

  const bassNotes: { bar: number; pitch: number; start: number }[] = [];
  for (const m of bass.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        bassNotes.push({
          bar: m.index,
          pitch: (e as { pitch: number }).pitch,
          start: (e as { startBeat: number }).startBeat,
        });
      }
    }
  }

  let rootHits = 0;
  for (const n of bassNotes) {
    const t = chordTonesForGoldenChord(chordForBar(n.bar));
    if (n.pitch % 12 === t.root % 12) rootHits++;
  }
  const rootRatio = bassNotes.length ? rootHits / bassNotes.length : 1;
  /** Pivot ~0.43: typical strong guide-tone lines score 9+ without rewarding root-plodding. */
  const bassMelodic = 10 * (1 - clamp01((rootRatio - 0.43) / 0.5));

  const bassStarts = bassNotes.map((n) => Math.round(n.start * 4) / 4);
  const uniqueBass = new Set(bassStarts).size;
  const bassRhythm = 10 * clamp01(uniqueBass / 6);

  let restBeats = 0;
  let totalBeats = 0;
  const gPitchesA: number[] = [];
  const gPitchesB: number[] = [];
  const guitarPitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'rest') restBeats += (e as { duration: number }).duration;
      if (e.kind === 'note') {
        const p = (e as { pitch: number }).pitch;
        guitarPitches.push(p);
        if (m.index <= 4) gPitchesA.push(p);
        else gPitchesB.push(p);
      }
    }
    totalBeats += 4;
  }
  const restRatio = totalBeats > 0 ? restBeats / totalBeats : 0;
  const guitarSpace = 10 * clamp01((restRatio - 0.02) / 0.22);

  let guitarContour = 5;
  if (guitarPitches.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < guitarPitches.length; i++) {
      intervals.push(Math.abs(guitarPitches[i] - guitarPitches[i - 1]));
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const varI = intervals.reduce((s, x) => s + (x - mean) ** 2, 0) / intervals.length;
    const spread = Math.sqrt(varI);
    guitarContour = 4 + 6 * clamp01(spread / 4);
  }

  let bothDb = 0;
  let barsBoth = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const gm = guitar.measures.find((m) => m.index === bar);
    const bm = bass.measures.find((m) => m.index === bar);
    const gn = gm?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    const bn = bm?.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    if (gn && bn) {
      barsBoth++;
      if (gn.startBeat === 0 && bn.startBeat === 0) bothDb++;
    }
  }
  const overlapRatio = barsBoth ? bothDb / barsBoth : 0;
  const interaction = 10 * (1 - clamp01((overlapRatio - 0.15) / 0.75));

  const pcSet = new Set(guitarPitches.map((p) => p % 12));
  const motifReuse = 4 + 6 * clamp01(pcSet.size / 8);

  let formContrast = 5;
  if (gPitchesA.length && gPitchesB.length) {
    const meanA = gPitchesA.reduce((a, b) => a + b, 0) / gPitchesA.length;
    const meanB = gPitchesB.reduce((a, b) => a + b, 0) / gPitchesB.length;
    const maxA = Math.max(...gPitchesA);
    const maxB = Math.max(...gPitchesB);
    const meanDiff = Math.abs(meanA - meanB);
    const maxDiff = Math.abs(maxB - maxA);
    formContrast = 4 + 6 * clamp01(Math.max(meanDiff / 4.5, maxDiff / 8));
  }

  const firstStarts: number[] = [];
  for (const m of guitar.measures) {
    const gn = m.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
    if (gn) firstStarts.push(gn.startBeat);
  }
  let phraseAsymmetry = 5;
  if (firstStarts.length >= 4) {
    const sp = Math.max(...firstStarts) - Math.min(...firstStarts);
    phraseAsymmetry = 4 + 6 * clamp01(sp / 2.25);
  }

  const breakdown: GceBreakdown = {
    bassMelodic,
    bassRhythm,
    guitarSpace,
    guitarContour,
    interaction,
    motifReuse,
    formContrast,
    phraseAsymmetry,
  };

  const total =
    W.bassMelodic * bassMelodic +
    W.bassRhythm * bassRhythm +
    W.guitarSpace * guitarSpace +
    W.guitarContour * guitarContour +
    W.interaction * interaction +
    W.motifReuse * motifReuse +
    W.formContrast * formContrast +
    W.phraseAsymmetry * phraseAsymmetry;

  return { total: Math.round(total * 100) / 100, breakdown };
}
