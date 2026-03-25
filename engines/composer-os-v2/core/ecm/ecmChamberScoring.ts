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
  return onsets / 8;
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

  let pen = 0;

  if (mode === 'ECM_METHENY_QUARTET') {
    if (bn > 14) pen += 28;
    if (gn > 48) pen += 18;
    if (chordRate > 0.55) pen += 22;
    if (onsetD > 2.8) pen += 15;
  } else {
    if (pedalBars >= 5) pen += 38;
    if (bn < 12) pen += 12;
    if (gn < 14) pen += 14;
    if (chordRate > 0.45) pen += 20;
    if (onsetD < 1.2) pen += 12;
  }

  return pen;
}

/** Metheny: space, straight float, pedal harmony, motif reuse, low cadence churn. */
export function scoreEcmMethenyFeel(
  score: ScoreModel,
  context: CompositionContext,
  plans: EcmScorePlans
): number {
  let s = 0;
  if (context.feel.mode === 'straight') s += 12;
  if (avgChordChangesPerBar(context) <= 0.55) s += 18;
  if (strongCadenceRatioFromHarmony(context) <= 0.4) s += 20;
  const plen = plans.motifState?.placements?.length ?? 0;
  if (plen >= 2) s += 14;

  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (guitar) {
    const notes = noteCount(guitar);
    if (notes >= 6 && notes <= 32) s += 18;
  }
  if (bass) {
    const bn = noteCount(bass);
    if (bn >= 6 && bn <= 12) s += 26;
    if (pedalLikeBassBars(score) >= 6) s += 22;
  }

  const gSparse = guitar?.measures.filter((m) => m.index <= 3).reduce((n, m) => {
    return n + m.events.filter((e) => e.kind === 'note').length;
  }, 0);
  if (gSparse !== undefined && gSparse <= 14) s += 12;

  return s;
}

/** Schneider: slow harmony, layered motion, swells, not walking bass. */
export function scoreEcmSchneiderFeel(
  score: ScoreModel,
  context: CompositionContext,
  plans: EcmScorePlans
): number {
  let s = 0;
  if (context.feel.syncopationDensity === 'low') s += 10;
  if (avgChordChangesPerBar(context) <= 0.35) s += 28;
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
    if (bn >= 14 && bn <= 22) s += 18;
  }

  let hasVelSwell = false;
  for (const p of score.parts) {
    for (const m of p.measures) {
      for (const e of m.events) {
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
      .filter((x) => x.index <= 4)
      .reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0) ?? 0;
  const denseB =
    guitar?.measures
      .filter((x) => x.index >= 5)
      .reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0) ?? 0;
  if (sparseA > 0 && denseB > sparseA && denseB > sparseA + 4) s += 12;

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
    if (avg > 0.55) reasons.push('harmonic rhythm too dense for Schneider chamber');
    const flatStates = m.sections.flatMap((sec) => sec.textureStates);
    if (new Set(flatStates).size < 3) reasons.push('texture state variety low');
    if (m.strongCadenceEstimate > 0.35) reasons.push('too many strong cadences for chamber');
  }
  return { ok: reasons.length === 0, reasons };
}
