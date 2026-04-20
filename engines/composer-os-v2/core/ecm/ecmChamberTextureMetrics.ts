/**
 * ECM Chamber-only symbolic texture metrics + pragmatic 0–10 texture score.
 * No harmony changes; safe to call on any duo score with guitar + bass parts.
 */

import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

const BEATS = 4;

export type EcmBarActivity = {
  bar: number;
  bassActive: number;
  compActive: number;
  bassH1: number;
  bassH2: number;
  compH1: number;
  compH2: number;
};

export type EcmPhraseEdgeDetail = {
  bar: number;
  compActiveBar: number;
  compActiveSecondHalf: number;
  compThinned: boolean;
  compSilent: boolean;
};

export type EcmChamberTextureMetrics = {
  totalBars: number;
  perBar: EcmBarActivity[];
  doubleDenseBars: number;
  doubleDenseRatio: number;
  bassOnlyBars: number;
  bassOnlyRatio: number;
  compOnlyBars: number;
  compOnlyRatio: number;
  spaceBars: number;
  spaceBarsRatio: number;
  bassMin: number | null;
  bassMax: number | null;
  compMin: number | null;
  compMax: number | null;
  gapGlobal: number | null;
  gapPerPhrase: Array<{ phraseIndex: number; startBar: number; endBar: number; gap: number | null }>;
  phraseEdges: {
    totalPhraseEdges: number;
    phraseEdgesWithThinning: number;
    phraseEdgesWithSilence: number;
    thinningRatio: number | null;
    silenceRatio: number | null;
    details: EcmPhraseEdgeDetail[];
  };
};

function getPart(score: ScoreModel, id: string): PartModel | undefined {
  return score.parts.find((p) => p.id === id);
}

function finiteNoteIntervalsVoice1(m: MeasureModel | undefined): [number, number][] {
  if (!m) return [];
  const raw: [number, number][] = [];
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    if ((e.voice ?? 1) !== 1) continue;
    const n = e as NoteEvent;
    if (typeof n.pitch !== 'number' || !Number.isFinite(n.pitch)) continue;
    const s = Math.max(0, n.startBeat);
    const ed = Math.min(BEATS, s + n.duration);
    if (ed > s) raw.push([s, ed]);
  }
  return mergeIntervals(raw);
}

function mergeIntervals(iv: [number, number][]): [number, number][] {
  if (iv.length === 0) return [];
  const sorted = [...iv].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let [cs, ce] = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const [a, b] = sorted[i]!;
    if (a <= ce) ce = Math.max(ce, b);
    else {
      out.push([cs, ce]);
      cs = a;
      ce = b;
    }
  }
  out.push([cs, ce]);
  return out;
}

/** Union length of intervals clipped to [t0, t1), divided by (t1 - t0). */
function coverageInRange(iv: [number, number][], t0: number, t1: number): number {
  const w = t1 - t0;
  if (w <= 0) return 0;
  let sum = 0;
  for (const [a, b] of iv) {
    const lo = Math.max(t0, a);
    const hi = Math.min(t1, b);
    if (hi > lo) sum += hi - lo;
  }
  return Math.min(1, sum / w);
}

function pitchSpanFinite(part: PartModel | undefined): { min: number; max: number } | null {
  if (!part) return null;
  let min = 127;
  let max = 0;
  let any = false;
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if (typeof e.pitch !== 'number' || !Number.isFinite(e.pitch)) continue;
      any = true;
      min = Math.min(min, e.pitch);
      max = Math.max(max, e.pitch);
    }
  }
  if (!any || min > max) return null;
  return { min, max };
}

/** ECM golden path: 8-bar phrase units; phrase-ending bars are 8, 16, … */
export function phraseEndBars(totalBars: number): number[] {
  const out: number[] = [];
  for (let b = 8; b <= totalBars; b += 8) out.push(b);
  return out;
}

/**
 * Full symbolic texture breakdown for an ECM-style guitar–bass score.
 * `compPartId` defaults to `guitar` (ECM Chamber duo export).
 */
export function analyzeEcmChamberTexture(
  score: ScoreModel,
  totalBars: number,
  opts?: { compPartId?: string }
): EcmChamberTextureMetrics {
  const compId = opts?.compPartId ?? 'guitar';
  const guitar = getPart(score, compId);
  const bass = getPart(score, 'bass');
  const perBar: EcmBarActivity[] = [];
  let doubleDenseBars = 0;
  let bassOnlyBars = 0;
  let compOnlyBars = 0;
  let spaceBars = 0;

  for (let bar = 1; bar <= totalBars; bar++) {
    const gm = guitar?.measures[bar - 1];
    const bm = bass?.measures[bar - 1];
    const gIv = finiteNoteIntervalsVoice1(gm);
    const bIv = finiteNoteIntervalsVoice1(bm);
    const bassActive = coverageInRange(bIv, 0, BEATS);
    const compActive = coverageInRange(gIv, 0, BEATS);
    const bassH1 = coverageInRange(bIv, 0, 2);
    const bassH2 = coverageInRange(bIv, 2, BEATS);
    const compH1 = coverageInRange(gIv, 0, 2);
    const compH2 = coverageInRange(gIv, 2, BEATS);
    perBar.push({ bar, bassActive, compActive, bassH1, bassH2, compH1, compH2 });
    if (bassActive >= 0.5 && compActive >= 0.5) doubleDenseBars++;
    if (bassActive >= 0.5 && compActive < 0.2) bassOnlyBars++;
    if (compActive >= 0.5 && bassActive < 0.2) compOnlyBars++;
    if (bassActive < 0.2 && compActive < 0.2) spaceBars++;
  }

  const tb = Math.max(1, totalBars);
  const bSpan = pitchSpanFinite(bass);
  const gSpan = pitchSpanFinite(guitar);
  let gapGlobal: number | null = null;
  if (bSpan && gSpan) gapGlobal = gSpan.min - bSpan.max;

  const phraseLen = 8;
  const gapPerPhrase: Array<{ phraseIndex: number; startBar: number; endBar: number; gap: number | null }> = [];
  for (let start = 1; start <= totalBars; start += phraseLen) {
    const end = Math.min(start + phraseLen - 1, totalBars);
    const phraseIndex = (start - 1) / phraseLen;
    let bMax = 0;
    let gMin = 127;
    let bAny = false;
    let gAny = false;
    for (let bar = start; bar <= end; bar++) {
      const gm = guitar?.measures[bar - 1];
      const bm = bass?.measures[bar - 1];
      for (const e of bm?.events ?? []) {
        if (e.kind !== 'note') continue;
        if (typeof e.pitch !== 'number' || !Number.isFinite(e.pitch)) continue;
        bAny = true;
        bMax = Math.max(bMax, e.pitch);
      }
      for (const e of gm?.events ?? []) {
        if (e.kind !== 'note') continue;
        if (typeof e.pitch !== 'number' || !Number.isFinite(e.pitch)) continue;
        gAny = true;
        gMin = Math.min(gMin, e.pitch);
      }
    }
    const gap = bAny && gAny && gMin <= 127 && bMax >= 0 ? gMin - bMax : null;
    gapPerPhrase.push({ phraseIndex, startBar: start, endBar: end, gap });
  }

  const edgeBars = phraseEndBars(totalBars);
  const details: EcmPhraseEdgeDetail[] = [];
  let phraseEdgesWithThinning = 0;
  let phraseEdgesWithSilence = 0;
  for (const b of edgeBars) {
    const row = perBar[b - 1];
    if (!row) continue;
    const compActiveBar = row.compActive;
    const compActiveSecondHalf = row.compH2;
    const compThinned = compActiveBar < 0.5 || compActiveSecondHalf < 0.5;
    const compSilent = compActiveBar < 0.2 || compActiveSecondHalf < 0.2;
    details.push({ bar: b, compActiveBar, compActiveSecondHalf, compThinned, compSilent });
    if (compThinned) phraseEdgesWithThinning++;
    if (compSilent) phraseEdgesWithSilence++;
  }
  const totalPhraseEdges = edgeBars.length;
  const thinningRatio = totalPhraseEdges > 0 ? phraseEdgesWithThinning / totalPhraseEdges : null;
  const silenceRatio = totalPhraseEdges > 0 ? phraseEdgesWithSilence / totalPhraseEdges : null;

  return {
    totalBars,
    perBar,
    doubleDenseBars,
    doubleDenseRatio: doubleDenseBars / tb,
    bassOnlyBars,
    bassOnlyRatio: bassOnlyBars / tb,
    compOnlyBars,
    compOnlyRatio: compOnlyBars / tb,
    spaceBars,
    spaceBarsRatio: spaceBars / tb,
    bassMin: bSpan?.min ?? null,
    bassMax: bSpan?.max ?? null,
    compMin: gSpan?.min ?? null,
    compMax: gSpan?.max ?? null,
    gapGlobal,
    gapPerPhrase,
    phraseEdges: {
      totalPhraseEdges,
      phraseEdgesWithThinning,
      phraseEdgesWithSilence,
      thinningRatio,
      silenceRatio,
      details,
    },
  };
}

export function computeEcmTextureScore(metrics: EcmChamberTextureMetrics): number {
  let s = 10;
  const g = metrics.gapGlobal;
  if (g === null || !Number.isFinite(g)) s -= 3;
  else if (g < 6) s -= 3;
  else if (g < 9) s -= 1;

  const ddr = metrics.doubleDenseRatio;
  if (ddr > 0.35) s -= 2;
  else if (ddr > 0.2) s -= 1;

  if (metrics.spaceBarsRatio < 0.05) s -= 1;

  const te = metrics.phraseEdges.totalPhraseEdges;
  if (te > 0) {
    const tr = metrics.phraseEdges.thinningRatio ?? 0;
    if (tr < 0.5) s -= 1;
    const sr = metrics.phraseEdges.silenceRatio ?? 0;
    if (sr >= 0.25) s += 0.5;
  }

  return Math.max(0, Math.min(10, Math.round(s * 10) / 10));
}

export type EcmChamberTextureEvalRun = {
  preset: 'ecm_chamber';
  seed: number;
  totalBars: number;
  metrics: EcmChamberTextureMetrics;
  ecmTextureScore: number;
};

export function buildEcmChamberTextureEvalRun(
  seed: number,
  totalBars: number,
  score: ScoreModel
): EcmChamberTextureEvalRun {
  const metrics = analyzeEcmChamberTexture(score, totalBars);
  return {
    preset: 'ecm_chamber',
    seed,
    totalBars,
    metrics,
    ecmTextureScore: computeEcmTextureScore(metrics),
  };
}
