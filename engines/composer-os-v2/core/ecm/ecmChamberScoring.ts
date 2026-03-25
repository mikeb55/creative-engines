/**
 * Soft ECM feel scoring — distinguishes Metheny quartet vs Schneider chamber from context + score heuristics.
 */
import type { ScoreModel } from '../score-model/scoreModelTypes';
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

/** Metheny: single melodic line, supportive layers, low cadence churn, straight ECM float. */
export function scoreEcmMethenyFeel(
  score: ScoreModel,
  context: CompositionContext,
  plans: EcmScorePlans
): number {
  let s = 0;
  if (context.feel.mode === 'straight') s += 12;
  if (avgChordChangesPerBar(context) <= 0.5) s += 22;
  if (strongCadenceRatioFromHarmony(context) <= 0.35) s += 18;
  const plen = plans.motifState?.placements?.length ?? 0;
  if (plen >= 2) s += 20;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (guitar) {
    const notes = guitar.measures.reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0);
    if (notes >= 8 && notes <= 28) s += 15;
  }
  return s;
}

/** Schneider: more independent lines, slower harmony, swells, fewer strong cadences. */
export function scoreEcmSchneiderFeel(
  score: ScoreModel,
  context: CompositionContext,
  plans: EcmScorePlans
): number {
  let s = 0;
  if (context.feel.syncopationDensity === 'low') s += 10;
  if (avgChordChangesPerBar(context) <= 0.5) s += 22;
  if (strongCadenceRatioFromHarmony(context) <= 0.35) s += 25;
  const m = context.generationMetadata.ecmMetrics;
  if (m && m.sections.some((sec) => sec.swellEvents >= 1)) s += 15;
  if (m && m.innerVoiceSmoothnessEstimate >= 0.7) s += 18;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (guitar && bass) {
    const gn = guitar.measures.reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0);
    const bn = bass.measures.reduce((n, m) => n + m.events.filter((e) => e.kind === 'note').length, 0);
    if (gn > 0 && bn > 0 && gn / Math.max(1, bn) < 1.4) s += 12;
  }
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
