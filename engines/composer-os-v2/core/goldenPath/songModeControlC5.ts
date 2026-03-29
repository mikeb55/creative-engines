/**
 * Phase C5 — Control layer (V1): deterministic primary/secondary roles for C2/C3/C4 stacks,
 * strength caps, muddy-bar auto-reduction metadata, and gentle guitar-only velocity contrast
 * attenuation (no timing, duration, or structure changes).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { seededUnit } from './guitarBassDuoHarmony';
import { songModePhraseSegments } from './songModePhraseEngineV1';
import { getEffectiveRhythmStrength } from '../rhythmIntentResolve';

export type SongModeC5LayerId = 'c2' | 'c3' | 'c4';

export interface SongModeC5PhraseRow {
  phraseIndex: number;
  primaryLayer: SongModeC5LayerId;
  secondaryLayer: SongModeC5LayerId | null;
  primaryStrength: 1;
  secondaryStrength: number;
  layerScale: { c2: number; c3: number; c4: number };
  maxDensityPerBeat: number;
  maxSyncopationRatio: number;
  maxRepetitionScore: number;
  /** 0 = none, 1 = halve secondary strength, 2 = disable secondary layer for phrase */
  autoReductionStep: 0 | 1 | 2;
  secondaryLayerDisabled: boolean;
  c5Skipped?: boolean;
  c5SkipReason?: string;
}

function cloneGuitarPhraseNotes(
  guitar: PartModel,
  startBar: number,
  endBar: number
): Map<number, Array<{ vel: number; articulation?: NoteEvent['articulation'] }>> {
  const map = new Map<number, Array<{ vel: number; articulation?: NoteEvent['articulation'] }>>();
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    const rows: Array<{ vel: number; articulation?: NoteEvent['articulation'] }> = [];
    for (const e of m.events) {
      if (e.kind === 'note') {
        const n = e as NoteEvent;
        rows.push({ vel: n.velocity ?? 90, articulation: n.articulation });
      }
    }
    map.set(b, rows);
  }
  return map;
}

function restoreGuitarPhraseNotes(
  guitar: PartModel,
  startBar: number,
  endBar: number,
  backup: Map<number, Array<{ vel: number; articulation?: NoteEvent['articulation'] }>>
): void {
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    const snap = backup.get(b);
    if (!m || !snap) continue;
    let j = 0;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      const row = snap[j++];
      if (!row) break;
      n.velocity = row.vel;
      n.articulation = row.articulation;
    }
  }
}

function collectNotesInMeasure(m: MeasureModel): NoteEvent[] {
  return m.events.filter((e) => e.kind === 'note') as NoteEvent[];
}

function barDensityPerBeat(m: MeasureModel): number {
  const n = collectNotesInMeasure(m).length;
  return n / BEATS_PER_MEASURE;
}

function barSyncopationRatio(m: MeasureModel): number {
  const notes = collectNotesInMeasure(m);
  if (notes.length === 0) return 0;
  let off = 0;
  for (const n of notes) {
    const sb = n.startBeat;
    const nearHalf = Math.abs(sb - Math.round(sb * 2) / 2) < 0.08 && Math.abs(sb - Math.round(sb)) > 0.06;
    if (nearHalf) off++;
  }
  return off / notes.length;
}

function barRepetitionScore(prev: MeasureModel | undefined, cur: MeasureModel): number {
  if (!prev) return 0;
  const a = collectNotesInMeasure(prev)
    .map((n) => n.startBeat)
    .sort((x, y) => x - y);
  const b = collectNotesInMeasure(cur)
    .map((n) => n.startBeat)
    .sort((x, y) => x - y);
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0.35;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i]! - b[i]!);
  const norm = diff / (a.length * BEATS_PER_MEASURE);
  return norm < 0.06 ? 0.92 : norm < 0.14 ? 0.55 : 0.2;
}

function tieRank(layer: SongModeC5LayerId, mode: 'stable' | 'balanced' | 'surprise'): number {
  const order: SongModeC5LayerId[] =
    mode === 'stable' ? ['c2', 'c3', 'c4'] : mode === 'balanced' ? ['c3', 'c4', 'c2'] : ['c4', 'c3', 'c2'];
  return order.indexOf(layer);
}

function layerEligible(
  layer: SongModeC5LayerId,
  meta: GenerationMetadata,
  pi: number
): boolean {
  if (layer === 'c2') return !!meta.songModeRhythmOverlayByPhrase?.[pi];
  if (layer === 'c3') return meta.songModeJamesBrownFunkApplied === true;
  if (layer === 'c4') return meta.songModeOstinatoByPhrase?.[pi]?.ostinatoActive === true;
  return false;
}

function layerScore(layer: SongModeC5LayerId, seed: number, pi: number): number {
  const salt = layer === 'c2' ? 98601 : layer === 'c3' ? 98602 : 98603;
  const base = layer === 'c2' ? 0.4 : layer === 'c3' ? 0.42 : 0.44;
  return base + seededUnit(seed, pi, salt) * 0.55;
}

function buildLayerScales(
  primary: SongModeC5LayerId,
  secondary: SongModeC5LayerId | null,
  secondaryStrength: number
): { c2: number; c3: number; c4: number } {
  const o: { c2: number; c3: number; c4: number } = { c2: 0.25, c3: 0.25, c4: 0.25 };
  o[primary] = 1;
  if (secondary) o[secondary] = Math.min(0.5, Math.max(0, secondaryStrength));
  return o;
}

/** Guitar only; pulls velocity toward mid (90) — contrast reduction, not timing. */
function attenuateGuitarPhraseVelocityTowardNeutral(
  guitar: PartModel,
  startBar: number,
  endBar: number,
  factor: number
): void {
  const f = Math.max(0.75, Math.min(1, factor));
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      const v = n.velocity ?? 90;
      n.velocity = Math.round(90 + (v - 90) * f);
    }
  }
}

function phraseMetrics(
  guitar: PartModel,
  startBar: number,
  endBar: number
): { maxDensity: number; maxSync: number; maxRep: number } {
  let maxDensity = 0;
  let maxSync = 0;
  let maxRep = 0;
  let prev: MeasureModel | undefined;
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    maxDensity = Math.max(maxDensity, barDensityPerBeat(m));
    maxSync = Math.max(maxSync, barSyncopationRatio(m));
    maxRep = Math.max(maxRep, barRepetitionScore(prev, m));
    prev = m;
  }
  return { maxDensity, maxSync, maxRep };
}

function muddyPhrase(d: number, s: number, r: number): boolean {
  return d > 2.0 || s > 0.52 || r > 0.72;
}

function muddySevere(d: number, s: number, r: number): boolean {
  return d > 2.45 || s > 0.58 || r > 0.82;
}

/**
 * C5 control pass: metadata + optional gentle guitar velocity contrast clamp (no structural edits).
 */
export function applySongModeControlC5(score: ScoreModel, context: CompositionContext): void {
  const meta = context.generationMetadata as GenerationMetadata;
  if (meta.songModeHookFirstIdentity !== true) return;
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.form.totalBars !== 32) return;

  const guitar = score.parts.find((p) => p.id === 'guitar') as PartModel | undefined;
  if (!guitar) return;

  const seed = context.seed;
  const segments = songModePhraseSegments();
  const rows: SongModeC5PhraseRow[] = [];

  for (let pi = 0; pi < segments.length; pi++) {
    const strengthMode = getEffectiveRhythmStrength(meta, pi);
    const { startBar, endBar } = segments[pi];
    const backup = cloneGuitarPhraseNotes(guitar, startBar, endBar);

    try {
      const eligible: SongModeC5LayerId[] = (['c2', 'c3', 'c4'] as const).filter((L) =>
        layerEligible(L, meta, pi)
      );
      if (eligible.length === 0) {
        throw new Error('c5_no_eligible_layer');
      }

      const scored = eligible
        .map((L) => ({ L, s: layerScore(L, seed, pi) }))
        .sort((a, b) => {
          if (Math.abs(b.s - a.s) > 1e-9) return b.s - a.s;
          return tieRank(a.L, strengthMode) - tieRank(b.L, strengthMode);
        });

      const primary = scored[0]!.L;
      let secondary: SongModeC5LayerId | null = null;
      if (strengthMode !== 'stable' && scored.length >= 2) {
        secondary = scored[1]!.L;
      }

      let secondaryStrength =
        strengthMode === 'stable' ? 0 : strengthMode === 'balanced' ? 0.45 : 0.5;
      if (secondary === null) secondaryStrength = 0;

      const { maxDensity, maxSync, maxRep } = phraseMetrics(guitar, startBar, endBar);
      let autoStep: 0 | 1 | 2 = 0;
      let secondaryDisabled = false;

      let muddy = muddyPhrase(maxDensity, maxSync, maxRep);
      if (muddy && secondary !== null) {
        secondaryStrength *= 0.5;
        autoStep = 1;
        muddy = muddySevere(maxDensity, maxSync, maxRep);
        if (muddy) {
          secondary = null;
          secondaryStrength = 0;
          secondaryDisabled = true;
          autoStep = 2;
        }
      }

      const layerScale = buildLayerScales(primary, secondary, secondaryStrength);

      let velFactor = 1;
      if (autoStep >= 1) velFactor *= 0.97;
      if (autoStep >= 2) velFactor *= 0.94;
      if (primary === 'c4') velFactor = Math.min(1, velFactor + 0.015);

      if (velFactor < 0.999) {
        attenuateGuitarPhraseVelocityTowardNeutral(guitar, startBar, endBar, velFactor);
      }

      rows.push({
        phraseIndex: pi,
        primaryLayer: primary,
        secondaryLayer: secondary,
        primaryStrength: 1,
        secondaryStrength,
        layerScale,
        maxDensityPerBeat: maxDensity,
        maxSyncopationRatio: maxSync,
        maxRepetitionScore: maxRep,
        autoReductionStep: autoStep,
        secondaryLayerDisabled: secondaryDisabled,
      });
    } catch {
      restoreGuitarPhraseNotes(guitar, startBar, endBar, backup);
      rows.push({
        phraseIndex: pi,
        primaryLayer: 'c2',
        secondaryLayer: null,
        primaryStrength: 1,
        secondaryStrength: 0,
        layerScale: { c2: 1, c3: 0.25, c4: 0.25 },
        maxDensityPerBeat: 0,
        maxSyncopationRatio: 0,
        maxRepetitionScore: 0,
        autoReductionStep: 0,
        secondaryLayerDisabled: true,
        c5Skipped: true,
        c5SkipReason: 'fail_safe_restore',
      });
    }
  }

  meta.songModeC5ByPhrase = rows;
  meta.songModeC5Receipt =
    'C5: primary/secondary roles, caps, muddy reduction (guitar velocity contrast only; no timing/duration)';
}
