/**
 * Composer OS V2 — Interaction validation
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { InteractionPlan } from './interactionTypes';

export interface InteractionValidationResult {
  valid: boolean;
  errors: string[];
}

/** Min semitones between bass top and guitar bottom to avoid crowding. */
const CROWDING_THRESHOLD = 5;
/** Max fraction of bars where both start on beat 0 (excessive unison). */
const UNISON_BEAT1_THRESHOLD = 0.85;
/** Max combined events per bar before density overload. */
/** Per-bar guitar + bass note onsets (not rests). Notation-safe splits may add segments; threshold above typical busy bar. */
const DENSITY_OVERLOAD_THRESHOLD = 14;

function getPitchesByBar(score: ScoreModel, instrumentId: string): Map<number, number[]> {
  const part = score.parts.find((p) => p.instrumentIdentity === instrumentId);
  const byBar = new Map<number, number[]>();
  if (!part) return byBar;
  for (const m of part.measures) {
    const pitches = m.events
      .filter((e) => e.kind === 'note')
      .map((e) => (e as { pitch: number }).pitch);
    if (pitches.length) byBar.set(m.index, pitches);
  }
  return byBar;
}

function getFirstBeatByBar(score: ScoreModel, instrumentId: string): Map<number, number> {
  const part = score.parts.find((p) => p.instrumentIdentity === instrumentId);
  const byBar = new Map<number, number>();
  if (!part) return byBar;
  for (const m of part.measures) {
    const first = m.events.find((e) => e.kind === 'note');
    if (first) byBar.set(m.index, (first as { startBeat: number }).startBeat);
  }
  return byBar;
}

export function validateInteractionIntegrity(
  score: ScoreModel,
  _plan?: InteractionPlan
): InteractionValidationResult {
  const errors: string[] = [];
  const guitarByBar = getPitchesByBar(score, 'clean_electric_guitar');
  const bassByBar = getPitchesByBar(score, 'acoustic_upright_bass');
  const guitarFirstBeat = getFirstBeatByBar(score, 'clean_electric_guitar');
  const bassFirstBeat = getFirstBeatByBar(score, 'acoustic_upright_bass');

  let bothOnBeat1 = 0;
  let barsWithBoth = 0;
  let densityOverloadBars = 0;

  for (let bar = 1; bar <= 8; bar++) {
    const gPitches = guitarByBar.get(bar) ?? [];
    const bPitches = bassByBar.get(bar) ?? [];
    if (gPitches.length > 0 && bPitches.length > 0) {
      barsWithBoth++;
      const gFirst = guitarFirstBeat.get(bar);
      const bFirst = bassFirstBeat.get(bar);
      if (gFirst === 0 && bFirst === 0) bothOnBeat1++;

      const gLow = Math.min(...gPitches);
      const bHigh = Math.max(...bPitches);
      const threshold = _plan?.registerSeparationThreshold ?? CROWDING_THRESHOLD;
      if (gLow - bHigh < threshold) {
        errors.push(`Register crowding in bar ${bar}: guitar low ${gLow} too close to bass high ${bHigh}`);
      }
    }

    const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    const gm = guitar?.measures.find((m) => m.index === bar);
    const bm = bass?.measures.find((m) => m.index === bar);
    const guitarNotes = gm?.events.filter((e) => e.kind === 'note').length ?? 0;
    const bassNotes = bm?.events.filter((e) => e.kind === 'note').length ?? 0;
    if (guitarNotes + bassNotes > DENSITY_OVERLOAD_THRESHOLD) densityOverloadBars++;
  }

  if (barsWithBoth > 0 && bothOnBeat1 / barsWithBoth > UNISON_BEAT1_THRESHOLD) {
    errors.push('Excessive unison behaviour: both instruments start on beat 1 too often');
  }

  if (densityOverloadBars > 2) {
    errors.push(`Simultaneous density overload in ${densityOverloadBars} bars`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateRegisterSeparation(
  score: ScoreModel,
  plan: InteractionPlan
): InteractionValidationResult {
  const errors: string[] = [];
  const threshold = plan.registerSeparationThreshold;
  const guitarByBar = getPitchesByBar(score, 'clean_electric_guitar');
  const bassByBar = getPitchesByBar(score, 'acoustic_upright_bass');

  for (let bar = 1; bar <= 8; bar++) {
    const gPitches = guitarByBar.get(bar) ?? [];
    const bPitches = bassByBar.get(bar) ?? [];
    if (gPitches.length === 0 || bPitches.length === 0) continue;
    const gLow = Math.min(...gPitches);
    const bHigh = Math.max(...bPitches);
    if (gLow - bHigh < threshold) {
      errors.push(`Register separation violated in bar ${bar}: gap ${gLow - bHigh} < ${threshold}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
