/**
 * Soft ECM feel scoring — distinguishes Metheny quartet vs Schneider chamber from context + score heuristics.
 */
import type { ScoreModel, PartModel, NoteEvent } from '../score-model/scoreModelTypes';
import type { CompositionContext } from '../compositionContext';
import type { EcmChamberMode } from './ecmChamberTypes';
/** Minimal plan slice for scoring (avoids circular imports). */
export type EcmScorePlans = { motifState?: { placements?: unknown[] } };

function avgChordChangesPerBar(context: CompositionContext): number {
  const n = context.harmony.segments.length;
  return n / Math.max(1, context.harmony.totalBars);
}

function dominantishChord(chord: string): boolean {
  const c = chord.toLowerCase();
  return c.includes('7') || c.includes('13') || c.includes('alt');
}

/** Strong cadence proxy: dominant-type chords in the plan. */
function strongCadenceRatioFromHarmony(context: CompositionContext): number {
  let d = 0;
  for (const s of context.harmony.segments) {
    if (dominantishChord(s.chord)) d += 1;
  }
  return d / Math.max(1, context.harmony.segments.length);
}

function noteCount(part: PartModel): number {
  return part.measures.reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0);
}

function pedalLikeBassBars(score: ScoreModel): number {
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return 0;
  let n = 0;
  for (const m of bass.measures) {
    const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
    if (notes.length === 1 && notes[0].duration >= 3.5) n += 1;
  }
  return n;
}

function guitarOnsetDensity(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  let onsets = 0;
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') onsets += 1;
    }
  }
  const tb = Math.max(1, g.measures.length);
  return onsets / tb;
}

function perBarGuitarNoteCounts(score: ScoreModel): number[] {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return [];
  return g.measures.map((m) => m.events.filter((e) => e.kind === 'note').length);
}

function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
}

/** Mean note duration in beats (guitar) — phrase length proxy. */
function meanGuitarNoteDuration(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  let sum = 0;
  let n = 0;
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        sum += (e as NoteEvent).duration;
        n++;
      }
    }
  }
  return n > 0 ? sum / n : 0;
}

/** Fraction of guitar onsets on half-beat grid (rhythmic fingerprint). */
function guitarRhythmicGridness(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  let grid = 0;
  let total = 0;
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      total++;
      const s = (e as NoteEvent).startBeat;
      const r = Math.round(s * 2) / 2;
      if (Math.abs(s - r) < 0.08) grid++;
    }
  }
  return total > 0 ? grid / total : 0;
}

/** Penalise scores that read like the opposite ECM mode (keeps seed search from converging). */
export function ecmCrossModeSimilarityPenalty(
  score: ScoreModel,
  context: CompositionContext,
  mode: EcmChamberMode
): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;

  const gn = noteCount(g);
  const bn = noteCount(b);
  const chordRate = avgChordChangesPerBar(context);
  const onsetD = guitarOnsetDensity(score);
  const pedalBars = pedalLikeBassBars(score);
  const bars = perBarGuitarNoteCounts(score);
  const densVar = variance(bars);
  const phraseLen = meanGuitarNoteDuration(score);
  const gridness = guitarRhythmicGridness(score);
  const tb = Math.max(1, context.form.totalBars);

  let pen = 0;

  if (mode === 'ECM_METHENY_QUARTET') {
    if (bn > Math.round(tb * 0.65)) pen += 32;
    if (gn > tb * 3.5) pen += 22;
    if (chordRate > 0.55) pen += 24;
    if (onsetD > 3.2) pen += 18;
    if (densVar < 0.35 && tb >= 16) pen += 14;
    if (phraseLen > 1.85) pen += 10;
    if (gridness < 0.55) pen += 8;
  } else {
    if (pedalBars >= Math.round(tb * 0.35)) pen += 42;
    if (bn < Math.round(tb * 0.45)) pen += 16;
    if (gn < tb * 0.55) pen += 16;
    if (chordRate > 0.2) pen += 22;
    if (onsetD < 0.85) pen += 14;
    if (densVar < 0.2 && tb >= 16) pen += 12;
    if (phraseLen < 0.75) pen += 12;
    if (gridness > 0.92) pen += 10;
  }

  return pen * 1.12;
}

/** Metheny: space, straight float, pedal harmony, motif reuse, low cadence churn. */
export function scoreEcmMethenyFeel(
  score: ScoreModel,
  context: CompositionContext,
  plans: EcmScorePlans
): number {
  const tb = context.form.totalBars;
  let s = 0;
  if (context.feel.mode === 'straight') s += 12;
  if (avgChordChangesPerBar(context) <= 0.55) s += 18;
  if (strongCadenceRatioFromHarmony(context) <= 0.4) s += 20;
  const plen = plans.motifState?.placements?.length ?? 0;
  if (plen >= 4) s += 16;

  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (guitar) {
    const notes = noteCount(guitar);
    if (notes >= tb * 0.35 && notes <= tb * 4) s += 18;
  }
  if (bass) {
    const bn = noteCount(bass);
    if (bn >= tb * 0.35 && bn <= tb * 0.55) s += 26;
    if (pedalLikeBassBars(score) >= Math.floor(tb * 0.75)) s += 22;
  }

  const gSparse = guitar?.measures
    .filter((m) => m.index <= Math.min(4, tb))
    .reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0);
  if (gSparse !== undefined && gSparse <= Math.min(18, tb * 2)) s += 12;

  return s;
}

/** Schneider: slow harmony, layered motion, swells, not walking bass. */
export function scoreEcmSchneiderFeel(
  score: ScoreModel,
  context: CompositionContext,
  plans: EcmScorePlans
): number {
  const tb = context.form.totalBars;
  const third = Math.max(1, Math.floor(tb / 3));
  let s = 0;
  if (context.feel.syncopationDensity === 'low') s += 10;
  if (avgChordChangesPerBar(context) <= 0.2) s += 28;
  if (strongCadenceRatioFromHarmony(context) <= 0.35) s += 18;
  const m = context.generationMetadata.ecmMetrics;
  if (m && m.sections.some((sec) => sec.swellEvents >= 1)) s += 14;
  if (m && m.innerVoiceSmoothnessEstimate >= 0.7) s += 16;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (guitar && bass) {
    const gn = noteCount(guitar);
    const bn = noteCount(bass);
    if (gn > 0 && bn > 0 && gn / Math.max(1, bn) < 1.5) s += 22;
    if (bn >= Math.round(tb * 0.55) && bn <= Math.round(tb * 0.95)) s += 18;
  }

  let hasVelSwell = false;
  for (const p of score.parts) {
    for (const meas of p.measures) {
      for (const e of meas.events) {
        if (e.kind === 'note' && (e as NoteEvent).velocity !== undefined) {
          hasVelSwell = true;
          break;
        }
      }
    }
  }
  if (hasVelSwell) s += 14;

  const sparseA =
    guitar?.measures
      .filter((x) => x.index <= third)
      .reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0) ?? 0;
  const denseB =
    guitar?.measures
      .filter((x) => x.index > third && x.index <= 2 * third)
      .reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0) ?? 0;
  if (sparseA > 0 && denseB > sparseA && denseB > sparseA + Math.max(4, third * 0.5)) s += 14;

  return s;
}

/** Soft gate: section-level texture/cadence expectations for the active mode. */
export function passesEcmGate(
  context: CompositionContext,
  mode: EcmChamberMode
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const m = context.generationMetadata.ecmMetrics;
  if (!m) {
    reasons.push('missing ecmMetrics');
    return { ok: false, reasons };
  }
  const avg = avgChordChangesPerBar(context);
  if (mode === 'ECM_METHENY_QUARTET') {
    if (avg > 0.6) reasons.push('harmonic rhythm too dense for Metheny quartet');
    if (m.motifEchoSegments < 2) reasons.push('motif echo segments low');
    if (m.strongCadenceEstimate > 0.45) reasons.push('cadence density high for ECM float');
  } else {
    if (avg > 0.15) reasons.push('harmonic rhythm too dense for Schneider chamber');
    const flatStates = m.sections.flatMap((sec) => sec.textureStates);
    if (new Set(flatStates).size < 3) reasons.push('texture state variety low');
    if (m.strongCadenceEstimate > 0.35) reasons.push('too many strong cadences for chamber');
  }
  return { ok: reasons.length === 0, reasons };
}
