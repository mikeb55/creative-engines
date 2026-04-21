/**
 * Riff-specific structural quality supplement (deterministic symbolic checks).
 * NOT general GCE / duo evaluation — label as `riffQualityRules` only.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { RiffDensity, RiffGridMode, RiffRhythmSegment } from './riffTypes';
import { countMaxRhythmRepeats, hasSyncopation } from './riffRhythm';

export const RIFF_QUALITY_RULESET_VERSION = 'riff_quality_v1';

export interface RiffQualityRuleRow {
  /** Stable id for tests / manifests */
  id: string;
  passed: boolean;
  detail?: string;
}

export interface RiffQualitySummary {
  rulesetVersion: typeof RIFF_QUALITY_RULESET_VERSION;
  rules: RiffQualityRuleRow[];
  aggregatePass: boolean;
  passedCount: number;
  failedCount: number;
}

export interface EvaluateRiffQualityRulesInput {
  score: ScoreModel;
  perBarRhythm: RiffRhythmSegment[][];
  density: RiffDensity;
  bars: number;
  grid: RiffGridMode;
}

function guitarPart(score: ScoreModel) {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

/** Notes on guitar melody line (voice 1 / default). */
function guitarMelodicNotes(score: ScoreModel): { midi: number; measureIndex: number; startBeat: number; duration: number }[] {
  const g = guitarPart(score);
  const out: { midi: number; measureIndex: number; startBeat: number; duration: number }[] = [];
  if (!g) return out;
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const v = (e as { voice?: number }).voice ?? 1;
      if (v !== 1) continue;
      out.push({
        midi: (e as { pitch: number }).pitch,
        measureIndex: m.index,
        startBeat: (e as { startBeat: number }).startBeat,
        duration: (e as { duration: number }).duration,
      });
    }
  }
  return out;
}

function minMelodicNotesFloor(density: RiffDensity, bars: number): number {
  /** Deterministic density floor — short riffs stay lenient but catch near-empty outputs. */
  switch (density) {
    case 'sparse':
      return Math.max(1, Math.ceil(0.9 * bars));
    case 'dense':
      return Math.max(2, Math.ceil(2.8 * bars));
    default:
      return Math.max(2, Math.ceil(1.6 * bars));
  }
}

function minPlayedBeatsFloor(density: RiffDensity, bars: number): number {
  const beats = bars * 4;
  switch (density) {
    case 'sparse':
      return beats * 0.22;
    case 'dense':
      return beats * 0.38;
    default:
      return beats * 0.28;
  }
}

/** Same rhythm fingerprint appearing in ≥2 bars (motif cell reuse). */
function ruleRhythmCellReuse(perBar: RiffRhythmSegment[][], bars: number): RiffQualityRuleRow {
  if (bars < 2) return { id: 'rhythm_cell_reuse', passed: true, detail: 'single_bar_skip' };
  const rep = countMaxRhythmRepeats(perBar);
  const ok = rep >= 2;
  return { id: 'rhythm_cell_reuse', passed: ok, detail: ok ? `max_repeat=${rep}` : `max_repeat=${rep}` };
}

/** Enough distinct onset buckets when multiple attacks exist (non-degenerate onset pattern). */
function ruleRhythmicIdentity(perBar: RiffRhythmSegment[][]): RiffQualityRuleRow {
  if (hasSyncopation(perBar)) return { id: 'rhythmic_identity', passed: true, detail: 'syncopation' };
  const onsetSet = new Set<number>();
  let played = 0;
  for (const bar of perBar) {
    for (const s of bar) {
      if (s.rest) continue;
      played++;
      onsetSet.add(Math.round(s.startBeat * 1000) / 1000);
    }
  }
  const ok = played <= 2 || onsetSet.size >= 2;
  return {
    id: 'rhythmic_identity',
    passed: ok,
    detail: ok ? `distinct_onsets=${onsetSet.size}` : `distinct_onsets=${onsetSet.size}`,
  };
}

/** Loop-ish closure: modular pitch distance between last and first melodic attacks (small window). */
function rulePhraseClosure(notes: { midi: number }[]): RiffQualityRuleRow {
  if (notes.length < 2) return { id: 'phrase_closure', passed: false, detail: 'too_few_notes' };
  const a = notes[0]!.midi % 12;
  const b = notes[notes.length - 1]!.midi % 12;
  const d = Math.min(Math.abs(a - b), 12 - Math.abs(a - b));
  const ok = d <= 6;
  return { id: 'phrase_closure', passed: ok, detail: `pc_delta=${d}` };
}

function ruleRegisterCoherence(notes: { midi: number }[]): RiffQualityRuleRow {
  if (notes.length === 0) return { id: 'register_coherence', passed: false, detail: 'no_notes' };
  let lo = 127;
  let hi = 0;
  for (const n of notes) {
    lo = Math.min(lo, n.midi);
    hi = Math.max(hi, n.midi);
  }
  const span = hi - lo;
  const ok = span <= 36;
  return { id: 'register_coherence', passed: ok, detail: `span_semis=${span}` };
}

/** Total melodic duration vs bar length — fights “all dead air”. */
function rulePlayableTimeRatio(score: ScoreModel, density: RiffDensity, bars: number): RiffQualityRuleRow {
  const g = guitarPart(score);
  if (!g) return { id: 'playable_time_ratio', passed: false, detail: 'no_guitar' };
  let playedBeats = 0;
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if (((e as { voice?: number }).voice ?? 1) !== 1) continue;
      playedBeats += (e as { duration: number }).duration;
    }
  }
  const minB = minPlayedBeatsFloor(density, bars);
  const ok = playedBeats + 1e-6 >= minB;
  return {
    id: 'playable_time_ratio',
    passed: ok,
    detail: `played_beats=${playedBeats.toFixed(2)} min=${minB.toFixed(2)}`,
  };
}

/** Pitch-class echo, repeated interval motive, or dense enough stream to skip strict recurrence. */
function ruleHookRecurrence(notes: { midi: number }[]): RiffQualityRuleRow {
  if (notes.length < 2) return { id: 'hook_recurrence', passed: false, detail: 'too_few_notes' };
  const pc0 = notes[0]!.midi % 12;
  if (notes.slice(1).some((n) => n.midi % 12 === pc0)) {
    return { id: 'hook_recurrence', passed: true, detail: 'pc0_repeats' };
  }
  if (notes.length >= 3) {
    const step0 = notes[1]!.midi - notes[0]!.midi;
    for (let i = 2; i < notes.length - 1; i++) {
      if (notes[i + 1]!.midi - notes[i]!.midi === step0) {
        return { id: 'hook_recurrence', passed: true, detail: 'interval_echo' };
      }
    }
  }
  const denseOk = notes.length >= 7;
  return {
    id: 'hook_recurrence',
    passed: denseOk,
    detail: denseOk ? 'dense_stream_ok' : 'no_clear_hook',
  };
}

/**
 * Evaluate riff-only structural rules from symbolic score + planned rhythm.
 * Safe to call only for riff outputs; does not import duo GCE modules.
 */
export function evaluateRiffQualityRules(input: EvaluateRiffQualityRulesInput): RiffQualitySummary {
  const { score, perBarRhythm, density, bars, grid } = input;
  const notes = guitarMelodicNotes(score);
  const g = guitarPart(score);

  const rows: RiffQualityRuleRow[] = [];

  /** Bar occupancy — every guitar bar has ≥1 melodic note. */
  let occOk = !!g && g.measures.length >= bars;
  if (g && occOk) {
    for (let i = 0; i < bars; i++) {
      const m = g.measures.find((x) => x.index === i + 1);
      const hasNote = m?.events.some((e) => e.kind === 'note' && ((e as { voice?: number }).voice ?? 1) === 1);
      if (!hasNote) {
        occOk = false;
        break;
      }
    }
  }
  rows.push({
    id: 'bar_occupancy',
    passed: occOk,
    detail: occOk ? `bars=${bars} grid=${grid}` : 'empty_bar',
  });

  /** Melodic note count vs density tier. */
  const minN = minMelodicNotesFloor(density, bars);
  rows.push({
    id: 'density_floor_notes',
    passed: notes.length >= minN,
    detail: `notes=${notes.length} min=${minN}`,
  });

  rows.push(ruleRhythmCellReuse(perBarRhythm, bars));
  rows.push(ruleRhythmicIdentity(perBarRhythm));
  rows.push(rulePhraseClosure(notes));
  rows.push(ruleRegisterCoherence(notes));
  rows.push(rulePlayableTimeRatio(score, density, bars));
  rows.push(ruleHookRecurrence(notes));

  const passedCount = rows.filter((r) => r.passed).length;
  const failedCount = rows.length - passedCount;
  const aggregatePass = failedCount === 0;

  return {
    rulesetVersion: RIFF_QUALITY_RULESET_VERSION,
    rules: rows,
    aggregatePass,
    passedCount,
    failedCount,
  };
}

/** Compact JSON-safe payload for manifests (no giant detail strings). */
export interface RiffQualityManifestCompact {
  rulesetVersion: string;
  aggregatePass: boolean;
  passedCount: number;
  totalRules: number;
  rules: { id: string; passed: boolean }[];
}

export function compactRiffQualityForManifest(s: RiffQualitySummary): RiffQualityManifestCompact {
  return {
    rulesetVersion: s.rulesetVersion,
    aggregatePass: s.aggregatePass,
    passedCount: s.passedCount,
    totalRules: s.rules.length,
    rules: s.rules.map((r) => ({ id: r.id, passed: r.passed })),
  };
}
