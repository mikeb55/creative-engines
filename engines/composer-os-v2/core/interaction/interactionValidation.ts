/**
 * Composer OS V2 — Interaction validation
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { InteractionPlan } from './interactionTypes';
import { isGuitarMelodyVoiceNote } from '../score-integrity/guitarVoiceMelody';

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

/** Extreme overlap (any bar) — never “brief”. */
const EXTREME_GAP_ST = 2;
/** Sustained mud: consecutive bars this tight. */
const SUSTAINED_TIGHT_ST = 4;
/** Too many bars slightly crowded before we fail (non-consecutive brief proximity allowed). */
const MAX_LOOSE_CROWD_BARS = 4;

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

/** Guitar **melody (voice 1)** pitches per bar — polyphony inner voice must not force false bass “crowding”. */
function getGuitarMelodyPitchesByBar(score: ScoreModel): Map<number, number[]> {
  const part = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const byBar = new Map<number, number[]>();
  if (!part) return byBar;
  for (const m of part.measures) {
    const pitches = m.events
      .filter((e) => e.kind === 'note' && isGuitarMelodyVoiceNote(e))
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
    const first = m.events.find(
      (e) =>
        e.kind === 'note' &&
        (instrumentId !== 'clean_electric_guitar' || isGuitarMelodyVoiceNote(e))
    );
    if (first) byBar.set(m.index, (first as { startBeat: number }).startBeat);
  }
  return byBar;
}

/**
 * Contextual melody–bass vertical spacing: fail on sustained mud or extreme overlap,
 * not on a single bar of brief inner-voice / duo proximity.
 */
export function validateInteractionIntegrity(
  score: ScoreModel,
  _plan?: InteractionPlan
): InteractionValidationResult {
  const errors: string[] = [];
  const guitarByBar = getGuitarMelodyPitchesByBar(score);
  const bassByBar = getPitchesByBar(score, 'acoustic_upright_bass');
  const guitarFirstBeat = getFirstBeatByBar(score, 'clean_electric_guitar');
  const bassFirstBeat = getFirstBeatByBar(score, 'acoustic_upright_bass');

  let bothOnBeat1 = 0;
  let barsWithBoth = 0;
  let densityOverloadBars = 0;

  const threshold = _plan?.registerSeparationThreshold ?? CROWDING_THRESHOLD;
  /** Bar counts toward “too many loose” only if gap is below this (caps huge plan thresholds). */
  const looseLine = Math.min(threshold, CROWDING_THRESHOLD);
  let maxConsecutiveTight = 0;
  let runTight = 0;
  let looseCrowdBars = 0;
  let extremeBars = 0;

  for (let bar = 1; bar <= 8; bar++) {
    const gPitches = guitarByBar.get(bar) ?? [];
    const bPitches = bassByBar.get(bar) ?? [];
    if (gPitches.length === 0 || bPitches.length === 0) {
      runTight = 0;
      continue;
    }
    barsWithBoth++;
    const gFirst = guitarFirstBeat.get(bar);
    const bFirst = bassFirstBeat.get(bar);
    if (gFirst === 0 && bFirst === 0) bothOnBeat1++;

    const gLow = Math.min(...gPitches);
    const bHigh = Math.max(...bPitches);
    const gap = gLow - bHigh;

    if (gap < EXTREME_GAP_ST) {
      extremeBars++;
    }
    if (gap < looseLine) {
      looseCrowdBars++;
    }
    if (gap < SUSTAINED_TIGHT_ST) {
      runTight++;
      maxConsecutiveTight = Math.max(maxConsecutiveTight, runTight);
    } else {
      runTight = 0;
    }

    const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
    const gm = guitar?.measures.find((m) => m.index === bar);
    const bm = bass?.measures.find((m) => m.index === bar);
    const guitarNotes = gm?.events.filter((e) => e.kind === 'note').length ?? 0;
    const bassNotes = bm?.events.filter((e) => e.kind === 'note').length ?? 0;
    if (guitarNotes + bassNotes > DENSITY_OVERLOAD_THRESHOLD) densityOverloadBars++;
  }

  if (extremeBars >= 1) {
    errors.push(
      `Register crowding: melody–bass gap < ${EXTREME_GAP_ST} st in ${extremeBars} bar(s) (extreme overlap)`
    );
  } else if (maxConsecutiveTight >= 2) {
    errors.push(
      `Register crowding: ${maxConsecutiveTight} consecutive bars with melody–bass gap < ${SUSTAINED_TIGHT_ST} st (sustained mud)`
    );
  } else if (looseCrowdBars > MAX_LOOSE_CROWD_BARS) {
    errors.push(
      `Register crowding: melody too close to bass in ${looseCrowdBars} bars (limit ${MAX_LOOSE_CROWD_BARS} bars @ < ${looseLine} st)`
    );
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
  const guitarByBar = getGuitarMelodyPitchesByBar(score);
  const bassByBar = getPitchesByBar(score, 'acoustic_upright_bass');

  /** Plan-aware “tight” line: large thresholds (e.g. 8) become ~5 st for sustained checks. */
  const strictLine = Math.max(4, Math.min(threshold, threshold <= 6 ? threshold : threshold - 3));
  let maxRunBelowStrict = 0;
  let run = 0;
  let mudBars = 0;

  for (let bar = 1; bar <= 8; bar++) {
    const gPitches = guitarByBar.get(bar) ?? [];
    const bPitches = bassByBar.get(bar) ?? [];
    if (gPitches.length === 0 || bPitches.length === 0) {
      run = 0;
      continue;
    }
    const gLow = Math.min(...gPitches);
    const bHigh = Math.max(...bPitches);
    const gap = gLow - bHigh;

    if (gap < EXTREME_GAP_ST) {
      errors.push(`Register separation: extreme overlap in bar ${bar} (melody–bass gap ${gap} < ${EXTREME_GAP_ST} st)`);
      return { valid: false, errors };
    }

    if (gap < strictLine) {
      run++;
      maxRunBelowStrict = Math.max(maxRunBelowStrict, run);
    } else {
      run = 0;
    }

    if (gap < SUSTAINED_TIGHT_ST) mudBars++;
  }

  if (maxRunBelowStrict >= 2) {
    errors.push(
      `Register separation: sustained proximity — ${maxRunBelowStrict} consecutive bars with melody–bass gap < ${strictLine} st (plan ${threshold} st)`
    );
  } else if (mudBars > MAX_LOOSE_CROWD_BARS) {
    errors.push(
      `Register separation: perceptual mud — ${mudBars} bars with melody–bass gap < ${SUSTAINED_TIGHT_ST} st`
    );
  }

  return { valid: errors.length === 0, errors };
}
