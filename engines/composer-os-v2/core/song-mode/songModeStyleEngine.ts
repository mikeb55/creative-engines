/**
 * Song Mode — Style Engine: post-score performance layer (velocity only).
 * Runs after `generateGoldenPathDuoScore` (Motif + Phrase already applied inside that call).
 *
 * Invariants (must stay true):
 * - Does not read or write pitch, startBeat, duration, articulation, or event kind.
 * - Does not add/remove notes or rests; only adjusts `velocity` on existing `note` events.
 * - Micro-variation uses `seededUnit(seed, …)` only (no `Math.random()`).
 * - Phrase/beat shaping uses deterministic functions of bar index and `startBeat` only
 *   (e.g. `Math.sin` of phrase phase — not an RNG).
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import type { StyleProfile } from './songModeStyleProfile';

/** Song Mode long-form phrase length (bars); matches phrase engine segmentation. */
const PHRASE_BARS = 4;

/** Eighth-note grid index 0..7 within the bar for accent placement. */
function eighthIndexOnGrid(startBeat: number): number {
  if (startBeat < 0) return 0;
  return Math.round(startBeat * 8) % 8;
}

function isStrongBeatEighth(ei: number): boolean {
  return ei === 0 || ei === 4;
}

function isOffbeatEighth(ei: number): boolean {
  return ei === 1 || ei === 3 || ei === 5 || ei === 7;
}

/** 0..PHRASE_BARS-1 for 1-based bar index. */
function positionInPhraseBar(barIndex: number): number {
  return (barIndex - 1) % PHRASE_BARS;
}

/**
 * Per-note velocity delta from style + phrase + beat + register.
 * `micro` is seededUnit-based texture; phrase contour uses sin(phrase phase) only.
 */
function velocityDeltaForNote(
  profile: StyleProfile,
  seed: number,
  profileBand: number,
  barIndex: number,
  pitch: number,
  startBeat: number
): number {
  const posInPhrase = positionInPhraseBar(barIndex);
  const phrasePhase = (posInPhrase + 0.5) / PHRASE_BARS;
  const sinContour = Math.sin(phrasePhase * Math.PI);
  const ei = eighthIndexOnGrid(startBeat);
  const strong = isStrongBeatEighth(ei);
  const off = isOffbeatEighth(ei);
  const salt = barIndex * 9973 + pitch * 13 + Math.round(startBeat * 1000);
  const u = seededUnit(seed, profileBand + 80, salt);
  const micro = Math.round((u - 0.5) * 10);

  if (profile === 'STYLE_ECM') {
    /** Softer overall; gentle mid-phrase swell; less downbeat-vs-offbeat contrast. */
    const gentleSwell = Math.round(sinContour * 5);
    let d = -7 + gentleSwell;
    if (strong) d += 1;
    else if (off) d -= 2;
    d += Math.round(micro * 0.5);
    return d;
  }

  if (profile === 'STYLE_MODERN_JAZZ') {
    let d = -2;
    if (posInPhrase === 0) d += 6;
    if (posInPhrase === PHRASE_BARS - 1) d += 4;
    if (strong) d += 3;
    else if (off) d += 4;
    if (pitch >= 72) d += 3;
    d += Math.round(micro * 0.85);
    return d;
  }
  if (profile === 'STYLE_BEBOP_POST_BOP') {
    let d = 3;
    if (strong) d += 8;
    else if (off) d += 5;
    if (posInPhrase === 0) d += 4;
    d += micro;
    return d;
  }
  if (profile === 'STYLE_SOPHISTICATED_POP') {
    const gentleSwell = Math.round(sinContour * 8);
    let d = gentleSwell;
    if (strong) d += 4;
    else if (off) d += 2;
    if (posInPhrase === PHRASE_BARS - 1) d += 5;
    d += Math.round(micro * 0.6);
    return d;
  }
  if (profile === 'STYLE_GROOVE_SOUL') {
    let d = 4;
    if (off) d += 10;
    if (strong) d += 2;
    if (pitch < 55) d += 3;
    d += Math.round(micro * 0.9);
    return d;
  }
  if (profile === 'STYLE_INDIE_ART_POP') {
    const gentleSwell = Math.round(sinContour * 6);
    let d = -4 + gentleSwell;
    if (off) d += 6;
    if (posInPhrase === PHRASE_BARS - 1) d += 3;
    d += Math.round(micro * 0.75);
    return d;
  }
  if (profile === 'STYLE_FOLK_GUITAR_NARRATIVE') {
    let d = -8;
    if (posInPhrase === 0) d += 5;
    if (posInPhrase === PHRASE_BARS - 1) d += 8;
    if (strong) d += 3;
    d += Math.round(micro * 0.4);
    return d;
  }
  if (profile === 'STYLE_CLASSICAL_INFLUENCE') {
    const dramaticSwell = Math.round(sinContour * 14);
    let d = -5 + dramaticSwell;
    if (posInPhrase === PHRASE_BARS - 1) d += 10;
    if (strong) d += 5;
    else if (off) d -= 3;
    d += micro;
    return d;
  }

  if (profile === 'STYLE_SHORTER_POST_BOP') {
    /** Phrase-edge push + stronger downbeats; wider contrast via full micro range. */
    let d = -3;
    if (posInPhrase === 0) d += 8;
    if (posInPhrase === PHRASE_BARS - 1) d += 6;
    if (strong) d += 6;
    else if (off) d += 1;
    d += micro;
    return d;
  }

  /** STYLE_BEBOP_LITE — forward punch on offbeats & upper register; compact local jitter. */
  let d = 2;
  if (strong) d += 3;
  if (off) d += 7;
  if (pitch >= 72) d += 4;
  d += Math.round(micro * 0.72);
  return d;
}

export function applySongModeStyleEngineToScore(score: ScoreModel, seed: number, profile: StyleProfile): void {
  const profileBand =
    profile === 'STYLE_ECM' ? 0 :
    profile === 'STYLE_SHORTER_POST_BOP' ? 1 :
    profile === 'STYLE_BEBOP_LITE' ? 2 :
    profile === 'STYLE_MODERN_JAZZ' ? 3 :
    profile === 'STYLE_BEBOP_POST_BOP' ? 4 :
    profile === 'STYLE_SOPHISTICATED_POP' ? 5 :
    profile === 'STYLE_GROOVE_SOUL' ? 6 :
    profile === 'STYLE_INDIE_ART_POP' ? 7 :
    profile === 'STYLE_FOLK_GUITAR_NARRATIVE' ? 8 : 9;

  for (const part of score.parts) {
    for (const m of part.measures) {
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        const n = e as { velocity?: number; pitch: number; startBeat: number };
        const v0 = n.velocity ?? 80;
        const delta = velocityDeltaForNote(
          profile,
          seed,
          profileBand,
          m.index,
          n.pitch,
          n.startBeat
        );
        n.velocity = Math.max(1, Math.min(127, v0 + delta));
      }
    }
  }
}
