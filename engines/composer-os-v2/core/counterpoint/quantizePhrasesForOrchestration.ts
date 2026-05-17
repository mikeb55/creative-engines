/**
 * Collapse onset-union micro-phrases from {@link extractQuartetFeatures} into
 * meso spans for BB section-writing (2-bar grid preferred).
 */

import type { CompositionContext } from '../compositionContext';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { AbstractLineSet, NoteEvent } from './abstractLineSet';
import type {
  MotionProfile,
  PhraseCadenceStrength,
  QuartetFeatures,
  TextureClass,
  VoiceActivityProfile,
} from './quartetFeatureTypes';
import {
  normalizeSqToBbDensity,
  SQ_TO_BB_DENSITY_MESO_THRESHOLD,
} from './sqToBbWorkflowTypes';

const DEFAULT_BOUNDARY_THRESHOLD = 0.55;
const STRONG_BOUNDARY_THRESHOLD = 0.85;
const SPREAD_DELTA_SEMITONES = 5;
const IMITATION_LOOKBACK_BARS = 0.5;

export interface QuantizePhrasesForOrchestrationOptions {
  minSpanBars?: number;
  maxSpanBars?: number;
  /** When set with contrapuntal line policy, `sqToBbDensity` on metadata selects meso threshold. */
  context?: CompositionContext;
  boundaryThreshold?: number;
}

function resolveMesoBoundaryThreshold(
  lines: AbstractLineSet,
  options?: QuantizePhrasesForOrchestrationOptions,
): number {
  if (options?.boundaryThreshold !== undefined) return options.boundaryThreshold;
  const ctx = options?.context;
  if (!ctx) return DEFAULT_BOUNDARY_THRESHOLD;
  const vrbId = ctx.generationMetadata?.songwriterStyleId ?? lines.styleSourceVrbId;
  const bundle = ctx.voiceBundle ?? getVoiceRuleBundle(vrbId);
  if (!bundle?.contrapuntalLinePolicy?.enabled) return DEFAULT_BOUNDARY_THRESHOLD;
  const density = normalizeSqToBbDensity(ctx.generationMetadata?.sqToBbDensity);
  return SQ_TO_BB_DENSITY_MESO_THRESHOLD[density];
}

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function roundKey(b: number): number {
  return Math.round(b * 1e6) / 1e6;
}

function metricSalienceAtBar(bar: number): number {
  const b = Math.round(bar);
  if (b <= 0) return 0.5;
  if (b % 8 === 0) return 1.0;
  if (b % 4 === 0) return 0.9;
  if (b % 2 === 0) return 0.7;
  return 0.5;
}

function cadenceSignalAt(lines: AbstractLineSet, raw: QuartetFeatures[], pos: number): number {
  const eps = 0.04;
  for (const c of lines.cadenceTags) {
    if (Math.abs(c.positionBars - pos) <= eps) {
      return c.strength === 'strong' ? 1 : c.strength === 'medium' ? 0.75 : 0.55;
    }
  }
  for (const f of raw) {
    if (Math.abs(f.endBeat - pos) <= eps && f.cadenceStrength !== 'none') {
      const rank =
        f.cadenceStrength === 'strong' ? 1 : f.cadenceStrength === 'medium' ? 0.75 : 0.55;
      return Math.max(rank, 0.55);
    }
    if (f.convergenceScore > 0.72 && Math.abs(f.endBeat - pos) <= eps) return 0.65;
  }
  return 0;
}

function imitationEntrySignalAt(lines: AbstractLineSet, pos: number): number {
  const lo = pos - IMITATION_LOOKBACK_BARS;
  const hi = pos + 1e-6;
  for (const ev of lines.imitationMap ?? []) {
    const dst = lines.voices.find((v) => v.role === ev.imitatingVoice);
    if (!dst) continue;
    for (const n of dst.notes) {
      if (n.offsetBars >= lo && n.offsetBars < hi) {
        return 0.85;
      }
    }
    const src = lines.voices.find((v) => v.role === ev.sourceVoice);
    if (src) {
      for (const n of src.notes) {
        const entry = n.offsetBars + ev.delayBars;
        if (entry >= lo && entry < hi) return 0.8;
      }
    }
  }
  return 0;
}

function pitchAt(notes: NoteEvent[], t: number): number | null {
  for (const n of notes) {
    if (n.offsetBars <= t + 1e-9 && t < n.offsetBars + n.durationBars - 1e-9) {
      return n.pitchMidi;
    }
  }
  return null;
}

function registralApexSignalAt(lines: AbstractLineSet, pos: number): number {
  const soprano = lines.voices.find((v) => v.role === 'soprano')?.notes ?? [];
  if (soprano.length < 2) return 0;
  const step = 0.25;
  const samples: Array<{ t: number; p: number }> = [];
  for (let t = Math.max(0, pos - 0.5); t <= pos + 0.5 + 1e-9; t += step) {
    const p = pitchAt(soprano, t);
    if (p != null) samples.push({ t, p });
  }
  if (samples.length < 3) return 0;
  let best = 0;
  for (let i = 1; i < samples.length - 1; i++) {
    if (Math.abs(samples[i]!.t - pos) > 0.26) continue;
    const prev = samples[i - 1]!.p;
    const mid = samples[i]!.p;
    const next = samples[i + 1]!.p;
    if ((mid >= prev && mid >= next) || (mid <= prev && mid <= next)) {
      best = Math.max(best, Math.min(Math.abs(mid - prev), Math.abs(mid - next)));
    }
  }
  return clamp01(best / 4);
}

function spreadChangeSignalAt(lines: AbstractLineSet, pos: number): number {
  const soprano = lines.voices.find((v) => v.role === 'soprano')?.notes ?? [];
  const bass = lines.voices.find((v) => v.role === 'bass')?.notes ?? [];
  const spread = (t: number): number | null => {
    const s = pitchAt(soprano, t);
    const b = pitchAt(bass, t);
    if (s == null || b == null) return null;
    return s - b;
  };
  const s0 = spread(pos - 0.25);
  const s1 = spread(pos);
  if (s0 == null || s1 == null) return 0;
  return Math.abs(s1 - s0) >= SPREAD_DELTA_SEMITONES ? 0.9 : 0;
}

function scoreBoundaryAt(
  lines: AbstractLineSet,
  rawFeatures: QuartetFeatures[],
  positionBars: number,
): number {
  if (positionBars <= 0 || positionBars >= lines.lengthBars) return 0;
  const cadence = cadenceSignalAt(lines, rawFeatures, positionBars);
  const metric = metricSalienceAtBar(positionBars);
  const imitation = imitationEntrySignalAt(lines, positionBars);
  const registral = registralApexSignalAt(lines, positionBars);
  const spread = spreadChangeSignalAt(lines, positionBars);
  return clamp01(
    0.35 * cadence + 0.25 * metric + 0.2 * imitation + 0.1 * registral + 0.1 * spread,
  );
}

function buildBoundaryScores(
  lines: AbstractLineSet,
  rawFeatures: QuartetFeatures[],
): Map<number, number> {
  const scores = new Map<number, number>();
  const maxBar = Math.floor(lines.lengthBars);
  for (let b = 1; b <= maxBar; b++) {
    scores.set(b, scoreBoundaryAt(lines, rawFeatures, b));
  }
  scores.set(lines.lengthBars, 1);
  return scores;
}

function rankSpanChoice(
  span: number,
  end: number,
  boundaryScore: number,
  lengthBars: number,
  boundaryThreshold: number,
): number {
  let rank = boundaryScore * 2;
  if (span === 2) rank += 1.25;
  if (span === 1 && boundaryScore < boundaryThreshold) rank -= 6;
  if (span === 4 && metricSalienceAtBar(end) >= 0.9) rank += 0.6;
  if (span === 8 && metricSalienceAtBar(end) >= 1.0) rank += 0.6;
  if (boundaryScore >= STRONG_BOUNDARY_THRESHOLD) rank += 2.5;
  if (end >= lengthBars - 1e-9) rank += 0.2;
  return rank;
}

function selectMesoBoundaries(
  lengthBars: number,
  scores: Map<number, number>,
  minSpan: number,
  maxSpan: number,
  boundaryThreshold: number,
): number[] {
  const bounds: number[] = [0];
  let cur = 0;
  while (cur < lengthBars - 1e-9) {
    const remaining = lengthBars - cur;
    if (remaining <= minSpan + 1e-9) break;

    const spanOptions = [1, 2, 4, 8]
      .filter((s) => s >= minSpan && s <= maxSpan && s <= remaining + 1e-9)
      .map((s) => (s > remaining ? remaining : s));

    const uniqueSpans = [...new Set(spanOptions)].sort((a, b) => a - b);
    if (uniqueSpans.length === 0) break;

    let chosen = uniqueSpans[0]!;
    let bestRank = -Infinity;
    for (const span of uniqueSpans) {
      const end = roundKey(cur + span);
      const sc = scores.get(end) ?? 0;
      const r = rankSpanChoice(span, end, sc, lengthBars, boundaryThreshold);
      if (r > bestRank) {
        bestRank = r;
        chosen = span;
      }
    }

    const strongEnds = uniqueSpans.filter((span) => {
      const end = roundKey(cur + span);
      return (scores.get(end) ?? 0) >= STRONG_BOUNDARY_THRESHOLD;
    });
    if (strongEnds.length > 0) {
      chosen = Math.min(...strongEnds);
    }

    cur = roundKey(cur + chosen);
    if (cur < lengthBars - 1e-9) bounds.push(cur);
  }

  const last = bounds[bounds.length - 1]!;
  if (last < lengthBars - 1e-9) bounds.push(lengthBars);
  return bounds;
}

function cadenceRank(s: PhraseCadenceStrength): number {
  return s === 'strong' ? 3 : s === 'medium' ? 2 : s === 'weak' ? 1 : 0;
}

function dominantMotionProfile(micro: QuartetFeatures[]): MotionProfile {
  const weights = new Map<MotionProfile, number>();
  for (const f of micro) {
    const w = Math.max(1e-9, f.endBeat - f.startBeat);
    weights.set(f.motionProfile, (weights.get(f.motionProfile) ?? 0) + w);
  }
  let best: MotionProfile = 'mixed';
  let bestW = -1;
  for (const [k, w] of weights) {
    if (w > bestW) {
      bestW = w;
      best = k;
    }
  }
  return best;
}

function dominantTextureClass(micro: QuartetFeatures[]): TextureClass {
  const weights = new Map<TextureClass, number>();
  for (const f of micro) {
    const w = Math.max(1e-9, f.endBeat - f.startBeat);
    weights.set(f.textureClass, (weights.get(f.textureClass) ?? 0) + w);
  }
  let best: TextureClass = micro[0]?.textureClass ?? 'contrapuntal';
  let bestW = -1;
  for (const [k, w] of weights) {
    if (w > bestW) {
      bestW = w;
      best = k;
    }
  }
  if (micro.some((f) => f.imitationScore > 0.22 || f.textureClass === 'imitative')) {
    return 'imitative';
  }
  return best;
}

function mergeVoiceProfiles(micro: QuartetFeatures[]): VoiceActivityProfile[] {
  const byVoice = new Map<'S' | 'A' | 'T' | 'B', VoiceActivityProfile[]>();
  for (const f of micro) {
    for (const vp of f.voiceProfiles) {
      const arr = byVoice.get(vp.voiceId) ?? [];
      arr.push(vp);
      byVoice.set(vp.voiceId, arr);
    }
  }
  const out: VoiceActivityProfile[] = [];
  for (const voiceId of ['S', 'A', 'T', 'B'] as const) {
    const rows = byVoice.get(voiceId);
    if (!rows?.length) continue;
    const n = rows.length;
    const mean = (pick: (v: VoiceActivityProfile) => number) =>
      rows.reduce((s, v) => s + pick(v), 0) / n;
    out.push({
      voiceId,
      meanNoteDurationBeats: mean((v) => v.meanNoteDurationBeats),
      attackRatePerBar: mean((v) => v.attackRatePerBar),
      restRatio: mean((v) => v.restRatio),
      leapRatio: mean((v) => v.leapRatio),
      stepRatio: mean((v) => v.stepRatio),
      sustainedRatio: mean((v) => v.sustainedRatio),
      registerCenterMidi: mean((v) => v.registerCenterMidi),
      registerSpanSemitones: mean((v) => v.registerSpanSemitones),
      independenceScore: mean((v) => v.independenceScore),
      salienceScore: mean((v) => v.salienceScore),
    });
  }
  return out;
}

function aggregateWindow(
  micro: QuartetFeatures[],
  start: number,
  end: number,
  index: number,
): QuartetFeatures {
  const mean = (pick: (f: QuartetFeatures) => number) =>
    micro.reduce((s, f) => s + pick(f), 0) / micro.length;

  const hasImitation = micro.some((f) => f.imitationScore > 0.22 || f.textureClass === 'imitative');
  const hasCadence = micro.some((f) => f.cadenceStrength !== 'none');

  let bestCadence: PhraseCadenceStrength = 'none';
  for (const f of micro) {
    if (cadenceRank(f.cadenceStrength) > cadenceRank(bestCadence)) {
      bestCadence = f.cadenceStrength;
    }
  }

  const sal = mergeVoiceProfiles(micro).sort((a, b) => b.salienceScore - a.salienceScore);
  const primaryLineVoiceIds = sal.slice(0, 2).map((v) => v.voiceId);
  const secondaryLineVoiceIds = sal.slice(2).map((v) => v.voiceId);

  const arrivalBeatOffsets = [
    ...new Set(micro.flatMap((f) => f.arrivalBeatOffsets)),
  ].filter((b) => b >= start && b < end);
  const accentBeats = [...new Set(micro.flatMap((f) => f.accentBeats))].filter(
    (b) => b >= start && b < end,
  );

  const pedalVoiceIds = [
    ...new Set(micro.flatMap((f) => f.pedalVoiceIds)),
  ] as Array<'S' | 'A' | 'T' | 'B'>;

  return {
    phraseId: `meso-${index}`,
    startBeat: start,
    endBeat: end,
    textureClass: dominantTextureClass(micro),
    motionProfile: dominantMotionProfile(micro),
    harmonicRhythmPerBar: mean((f) => f.harmonicRhythmPerBar),
    verticalChangeRate: mean((f) => f.verticalChangeRate),
    rhythmicDensity: mean((f) => f.rhythmicDensity),
    syncopationScore: mean((f) => f.syncopationScore),
    contrapuntalIndependence: mean((f) => f.contrapuntalIndependence),
    imitationScore: hasImitation ? Math.max(mean((f) => f.imitationScore), 0.35) : mean((f) => f.imitationScore),
    homorhythmScore: mean((f) => f.homorhythmScore),
    chordalStabilityScore: mean((f) => f.chordalStabilityScore),
    registralSpreadSemitones: mean((f) => f.registralSpreadSemitones),
    crossingCount: Math.round(mean((f) => f.crossingCount)),
    convergenceScore: mean((f) => f.convergenceScore),
    divergenceScore: mean((f) => f.divergenceScore),
    sustainedVoicesCount: Math.round(mean((f) => f.sustainedVoicesCount)),
    activeVoicesCount: Math.round(mean((f) => f.activeVoicesCount)),
    pedalPresence: micro.some((f) => f.pedalPresence),
    pedalVoiceIds,
    cadenceStrength: hasCadence ? bestCadence : 'none',
    arrivalBeatOffsets,
    accentBeats,
    primaryLineVoiceIds,
    secondaryLineVoiceIds,
    voiceProfiles: mergeVoiceProfiles(micro),
  };
}

function microInWindow(f: QuartetFeatures, start: number, end: number): boolean {
  return f.startBeat < end - 1e-9 && f.endBeat > start + 1e-9;
}

/**
 * Collapse onset-union micro-features into meso spans for orchestration.
 */
export function quantizePhrasesForOrchestration(
  lines: AbstractLineSet,
  rawFeatures: QuartetFeatures[],
  options?: QuantizePhrasesForOrchestrationOptions,
): QuartetFeatures[] {
  if (rawFeatures.length === 0) return [];
  if (rawFeatures.length === 1) return [{ ...rawFeatures[0]!, phraseId: 'meso-0' }];

  const minSpan = options?.minSpanBars ?? 1;
  const maxSpan = options?.maxSpanBars ?? 8;
  const lengthBars = lines.lengthBars;
  const boundaryThreshold = resolveMesoBoundaryThreshold(lines, options);

  const scores = buildBoundaryScores(lines, rawFeatures);
  const boundaries = selectMesoBoundaries(lengthBars, scores, minSpan, maxSpan, boundaryThreshold);

  const meso: QuartetFeatures[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i]!;
    const end = boundaries[i + 1]!;
    if (end - start < minSpan - 1e-9) continue;
    const micro = rawFeatures.filter((f) => microInWindow(f, start, end));
    if (micro.length === 0) continue;
    meso.push(aggregateWindow(micro, start, end, meso.length));
  }

  if (meso.length === 0) {
    return [
      aggregateWindow(
        rawFeatures,
        0,
        lengthBars,
        0,
      ),
    ];
  }

  return meso;
}

/** Verify meso spans for Gate A / unit harnesses. */
export function verifyQuantizedPhraseSpans(
  lines: AbstractLineSet,
  raw: QuartetFeatures[],
  meso: QuartetFeatures[],
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (meso.length > raw.length) errors.push('meso count exceeds raw count');
  if (lines.lengthBars >= 16 && meso.length < 4) {
    errors.push(`meso count ${meso.length} < 4 for ${lines.lengthBars} bars`);
  }
  for (const m of meso) {
    const span = m.endBeat - m.startBeat;
    if (span < 1 - 1e-9) errors.push(`span ${m.phraseId} < 1 bar`);
  }
  for (let i = 0; i < meso.length; i++) {
    const m = meso[i]!;
    if (i > 0) {
      const prev = meso[i - 1]!;
      if (Math.abs(prev.endBeat - m.startBeat) > 1e-5) {
        errors.push(`gap/overlap between ${prev.phraseId} and ${m.phraseId}`);
      }
    }
  }
  const first = meso[0];
  const last = meso[meso.length - 1];
  if (first && Math.abs(first.startBeat) > 1e-5) errors.push('meso does not start at 0');
  if (last && Math.abs(last.endBeat - lines.lengthBars) > 1e-5) {
    errors.push('meso does not end at lengthBars');
  }
  const covered = meso.reduce((s, m) => s + (m.endBeat - m.startBeat), 0);
  if (Math.abs(covered - lines.lengthBars) > 0.02) {
    errors.push(`total covered ${covered} !== lengthBars ${lines.lengthBars}`);
  }
  return { ok: errors.length === 0, errors };
}
