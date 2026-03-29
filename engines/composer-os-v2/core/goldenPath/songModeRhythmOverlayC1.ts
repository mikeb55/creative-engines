/**
 * Song Mode — Phase C1 rhythm overlay (soft, deterministic; guitar melody only).
 * Runs after phrase / identity / cadence / style velocity; before bar-math seal + validation.
 * Does not modify pitch, note count, bar structure, or attack grid; durations stay on eighth grid.
 */

import type { CompositionContext } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { seededUnit } from './guitarBassDuoHarmony';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import { songModePhraseSegments } from './songModePhraseEngineV1';

/** Phase C1 overlay ids (jazz / songwriter / ECM). Funk-grid ids reserved for Phase C3 — not implemented here. */
export const SONG_MODE_RHYTHM_OVERLAY_IDS = [
  'SHORTER',
  'FAGEN',
  'SCHNEIDER',
  'MONK',
  'BLADE',
  'ECM',
] as const;

export type SongModeRhythmOverlayId = (typeof SONG_MODE_RHYTHM_OVERLAY_IDS)[number];

export interface SongModeRhythmOverlayPhraseDebug {
  phraseIndex: number;
  appliedOverlays: { id: string; weight: number }[];
  overlayRhythmProfile: string;
}

interface OverlaySoftProfile {
  /** Contributes to duration tightening (0–1 scale, blended). */
  durTighten: number;
  /** MIDI velocity delta (blended, then clamped). */
  velDelta: number;
  /** Backbeat / off-beat accent bias 0–1. */
  syncAccent: number;
}

const OVERLAY_PROFILES: Record<SongModeRhythmOverlayId, OverlaySoftProfile> = {
  SHORTER: { durTighten: 0.42, velDelta: 2, syncAccent: 0.22 },
  FAGEN: { durTighten: 0.14, velDelta: 5, syncAccent: 0.48 },
  SCHNEIDER: { durTighten: 0.1, velDelta: 1, syncAccent: 0.4 },
  MONK: { durTighten: 0.28, velDelta: 6, syncAccent: 0.55 },
  BLADE: { durTighten: 0.2, velDelta: 7, syncAccent: 0.58 },
  ECM: { durTighten: 0.08, velDelta: -4, syncAccent: 0.15 },
};

interface BlendedSoft {
  durTighten: number;
  velDelta: number;
  syncAccent: number;
}

function blendOverlays(applied: { id: string; weight: number }[]): BlendedSoft {
  let dur = 0;
  let vel = 0;
  let sync = 0;
  let wsum = 0;
  for (const o of applied) {
    const p = OVERLAY_PROFILES[o.id as SongModeRhythmOverlayId];
    if (!p) continue;
    const w = o.weight;
    dur += p.durTighten * w;
    vel += p.velDelta * w;
    sync += p.syncAccent * w;
    wsum += w;
  }
  if (wsum < 1e-6) return { durTighten: 0, velDelta: 0, syncAccent: 0 };
  return { durTighten: dur / wsum, velDelta: vel / wsum, syncAccent: sync / wsum };
}

function selectOverlaysForPhrase(phraseIdx: number, seed: number): { id: string; weight: number }[] {
  const u0 = seededUnit(seed, phraseIdx, 93100);
  const count = u0 < 0.28 ? 0 : u0 < 0.62 ? 1 : 2;
  if (count === 0) return [];
  const pool = [...SONG_MODE_RHYTHM_OVERLAY_IDS];
  const out: { id: string; weight: number }[] = [];
  for (let k = 0; k < count; k++) {
    const j = Math.floor(seededUnit(seed, phraseIdx, 93110 + k + phraseIdx * 5) * pool.length);
    const id = pool[j];
    pool.splice(j, 1);
    out.push({ id, weight: 0.25 + seededUnit(seed, phraseIdx, 93120 + k * 13) * 0.5 });
  }
  return out;
}

function profileString(overlays: { id: string; weight: number }[]): string {
  if (overlays.length === 0) return 'none';
  return [...overlays.map((o) => o.id)].sort().join('+');
}

function applySoftToGuitarMeasure(
  m: MeasureModel,
  b: BlendedSoft,
  seed: number,
  phraseIdx: number,
  barIndex: number
): void {
  const events = m.events.filter((e) => e.kind === 'note' || e.kind === 'rest') as Array<
    NoteEvent | { kind: 'rest'; startBeat: number; duration: number }
  >;
  events.sort((a, b) => a.startBeat - b.startBeat);
  const tighten = Math.min(0.12, 0.035 + b.durTighten * 0.08);

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    const nextStart = i + 1 < events.length ? events[i + 1].startBeat : BEATS_PER_MEASURE;
    const room = nextStart - n.startBeat;
    if (room <= 1e-4) continue;

    let d = n.duration;
    d = snapAttackBeatToGrid(Math.max(0.5, d * (1 - tighten)));
    d = Math.min(d, room - 0.25);
    d = snapAttackBeatToGrid(Math.max(0.5, d));
    if (d < 0.5 - 1e-4) d = 0.5;
    n.duration = d;

    const baseV = n.velocity ?? 90;
    const dv = Math.round(b.velDelta * (0.85 + 0.3 * seededUnit(seed, phraseIdx, 93200 + barIndex + i)));
    n.velocity = Math.max(1, Math.min(127, baseV + dv));

    const sb = n.startBeat;
    const uAcc = seededUnit(seed, phraseIdx, 93300 + barIndex * 3 + i);
    const offBeat =
      Math.abs(sb - 0.5) < 0.01 ||
      Math.abs(sb - 1.5) < 0.01 ||
      Math.abs(sb - 2.5) < 0.01 ||
      Math.abs(sb - 3.5) < 0.01;
    if (offBeat && uAcc < b.syncAccent * 0.38) {
      n.articulation = 'accent';
    } else if (!offBeat && (sb === 1 || sb === 2 || sb === 3) && uAcc < b.syncAccent * 0.22) {
      n.articulation = 'accent';
    }
  }
}

/**
 * Soft rhythm overlay on guitar part only; preserves pitches and event count per measure.
 */
export function applySongModeRhythmOverlayC1(score: ScoreModel, context: CompositionContext): void {
  if (context.generationMetadata?.songModeRhythmOverlayDisabled === true) return;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return;
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.form.totalBars !== 32) return;

  const guitar = score.parts.find((p) => p.id === 'guitar') as PartModel | undefined;
  if (!guitar) return;

  const segments = songModePhraseSegments();
  const debug: SongModeRhythmOverlayPhraseDebug[] = [];
  const seed = context.seed;

  for (let pi = 0; pi < segments.length; pi++) {
    const { startBar, endBar } = segments[pi];
    const applied = selectOverlaysForPhrase(pi, seed);
    const blend = blendOverlays(applied);
    debug.push({
      phraseIndex: pi,
      appliedOverlays: applied.map((o) => ({ id: o.id, weight: o.weight })),
      overlayRhythmProfile: profileString(applied),
    });

    if (applied.length === 0) continue;

    for (let b = startBar; b <= endBar; b++) {
      const measure = guitar.measures.find((x) => x.index === b);
      if (!measure) continue;
      applySoftToGuitarMeasure(measure, blend, seed, pi, b);
    }
  }

  context.generationMetadata.songModeRhythmOverlayByPhrase = debug;
}
