/**
 * Wyble duo golden path — per-voice MIDI velocity shaping (guitar lead arc + supportive bass).
 */

import type { NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

export interface DuoVelocityPolicy {
  guitarV1Base: number;
  bassBase: number;
  accentMultiplier: number;
  phraseShapeEnabled: boolean;
}

export const DEFAULT_DUO_VELOCITY_POLICY: DuoVelocityPolicy = {
  guitarV1Base: 85,
  bassBase: 68,
  accentMultiplier: 1.15,
  phraseShapeEnabled: true,
};

const PHRASE_SHAPE = [0.6, 1.0, 0.85, 0.5] as const;
const VEL_MIN = 40;
const VEL_MAX = 117;

function clampVelocity(v: number): number {
  return Math.max(VEL_MIN, Math.min(VEL_MAX, Math.round(v)));
}

function phraseShapeFactor(bar: number, phraseShapeEnabled: boolean): number {
  if (!phraseShapeEnabled) return 1;
  const pos = ((bar - 1) % 4) + 1;
  return PHRASE_SHAPE[pos - 1] ?? 1;
}

function applyGuitarVelocity(part: PartModel, policy: DuoVelocityPolicy): void {
  for (const measure of part.measures) {
    const bar = measure.index;
    const shape = phraseShapeFactor(bar, policy.phraseShapeEnabled);
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      const note = event as NoteEvent;
      if ((note.voice ?? 1) !== 1) continue;
      const base = policy.guitarV1Base + shape * 15 * policy.accentMultiplier;
      note.velocity = clampVelocity(base);
    }
  }
}

function applyBassVelocity(part: PartModel, policy: DuoVelocityPolicy): void {
  for (const measure of part.measures) {
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      const note = event as NoteEvent;
      note.velocity = clampVelocity(policy.bassBase);
    }
  }
}

/**
 * Apply Wyble velocity policy to guitar v1 + bass. Score-model `NoteEvent.velocity` is passed through MIDI export.
 */
export function applyWybleDuoVelocityPolicy(
  score: ScoreModel,
  policy: DuoVelocityPolicy = DEFAULT_DUO_VELOCITY_POLICY,
): void {
  const guitar = score.parts.find(
    (p) => p.id === 'guitar' || p.instrumentIdentity === 'clean_electric_guitar',
  );
  const bass = score.parts.find((p) => p.id === 'bass' || p.instrumentIdentity === 'acoustic_upright_bass');
  if (guitar) applyGuitarVelocity(guitar, policy);
  if (bass) applyBassVelocity(bass, policy);
}

export function meanGuitarV1Velocity(part: PartModel | undefined): number {
  if (!part) return 0;
  const vels: number[] = [];
  for (const measure of part.measures) {
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      const n = event as NoteEvent;
      if ((n.voice ?? 1) === 1) vels.push(n.velocity ?? 80);
    }
  }
  return vels.length ? vels.reduce((a, b) => a + b, 0) / vels.length : 0;
}

export function meanBassVelocity(part: PartModel | undefined): number {
  if (!part) return 0;
  const vels: number[] = [];
  for (const measure of part.measures) {
    for (const event of measure.events) {
      if (event.kind === 'note') vels.push((event as NoteEvent).velocity ?? 80);
    }
  }
  return vels.length ? vels.reduce((a, b) => a + b, 0) / vels.length : 0;
}
