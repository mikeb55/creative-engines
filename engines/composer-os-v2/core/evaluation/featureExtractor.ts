import type { FeatureExtractionInput, FeatureExtractor, ExtractedStyleFeatures } from './evaluationTypes';
import type {
  ChordEvent,
  MeasureModel,
  NoteEvent,
  PartModel,
  ScoreEvent,
  ScoreModel,
} from '../score-model/scoreModelTypes';

function nullFeatures(): ExtractedStyleFeatures {
  return {
    orchestration: {
      avgVoicingSize: null,
      pianoDensity: null,
    },
    formal: {
      riffRepetitionRatio: null,
    },
    rhythmic: {
      swingGridAlignment: null,
    },
  };
}

function isScoreModel(output: unknown): output is ScoreModel {
  if (output == null || typeof output !== 'object') return false;
  const o = output as Record<string, unknown>;
  return Array.isArray(o.parts);
}

function pitchCount(ev: ScoreEvent): number {
  if (ev.kind === 'rest') return 0;
  if (ev.kind === 'chord') return (ev as ChordEvent).pitches.length;
  const n = ev as NoteEvent;
  return 1 + (n.pitches?.length ?? 0);
}

function measureBeatSpan(m: MeasureModel): number {
  return m.measureBeatSpanQuarters ?? 4;
}

/** Max simultaneous pitches in one measure (all events merged). */
function maxConcurrentInMeasure(m: MeasureModel, beatSpan: number): number {
  const EPS = 1e-6;
  const samples = Math.max(12, Math.ceil(beatSpan * 24));
  let maxC = 0;
  for (let s = 0; s < samples; s++) {
    const t = ((s + 0.5) / samples) * beatSpan;
    let c = 0;
    for (const ev of m.events) {
      if (ev.kind === 'rest') continue;
      const start = ev.startBeat;
      const end = start + ev.duration;
      if (t >= start - EPS && t < end - EPS) {
        c += pitchCount(ev);
      }
    }
    maxC = Math.max(maxC, c);
  }
  return maxC;
}

/** Percussion staves must not pollute LOCK sectionContrast rhythm fingerprint (Band mode Stage 2). */
function isPercussionRhythmFingerprintPart(part: PartModel): boolean {
  if (part.id === 'bb_drums' || part.id === 'groove_drums' || part.id === 'art_rock_band_drums') {
    return true;
  }
  if (part.instrumentIdentity.endsWith('_drums')) return true;
  return false;
}

function isPianoPart(part: PartModel): boolean {
  if (part.songModePresentAsPianoComp === true) return true;
  if (part.midiProgram === 0) return true;
  const n = part.name.toLowerCase();
  if (n.includes('piano')) return true;
  const sn = part.scoreInstrumentName?.toLowerCase() ?? '';
  return sn.includes('piano');
}

function rhythmFingerprint(m: MeasureModel, beatSpan: number): string {
  const parts: string[] = [];
  for (const ev of m.events) {
    if (ev.kind === 'rest') continue;
    const sb = Math.round(ev.startBeat * 48) / 48;
    const dur = Math.round(ev.duration * 48) / 48;
    parts.push(`${sb.toFixed(4)}:${dur.toFixed(4)}`);
  }
  parts.sort();
  return `${beatSpan.toFixed(3)}|${parts.join(';')}`;
}

function swingGridHits(startBeat: number, beatSpan: number): boolean {
  const STEP = 1 / 6;
  const EPS = 0.06;
  let kMin = Math.ceil((startBeat - EPS) / STEP);
  let kMax = Math.floor((startBeat + EPS) / STEP);
  if (kMin > kMax) {
    kMin = Math.floor(startBeat / STEP);
    kMax = kMin;
  }
  for (let k = kMin - 2; k <= kMax + 2; k++) {
    const g = k * STEP;
    if (g >= -EPS && g <= beatSpan + EPS && Math.abs(startBeat - g) < EPS) {
      return true;
    }
  }
  return false;
}

function collectOnsets(measures: MeasureModel[]): { total: number; aligned: number } {
  let total = 0;
  let aligned = 0;
  for (const m of measures) {
    const span = measureBeatSpan(m);
    for (const ev of m.events) {
      if (ev.kind === 'rest') continue;
      total++;
      if (swingGridHits(ev.startBeat, span)) aligned++;
    }
  }
  return { total, aligned };
}

export function extractScoreModelFeatures(output: ScoreModel): ExtractedStyleFeatures {
  const parts = output.parts ?? [];
  const maxBars = parts.reduce((mx, p) => Math.max(mx, p.measures.length), 0);
  if (maxBars < 1) {
    return nullFeatures();
  }

  const concurrentByBar: number[] = [];
  for (let b = 1; b <= maxBars; b++) {
    const merged: ScoreEvent[] = [];
    let span = 4;
    for (const part of parts) {
      if (isPercussionRhythmFingerprintPart(part)) continue;
      const m = part.measures[b - 1];
      if (!m) continue;
      span = measureBeatSpan(m);
      merged.push(...m.events);
    }
    const synthetic: MeasureModel = {
      index: b,
      events: merged,
      measureBeatSpanQuarters: span,
    };
    concurrentByBar.push(maxConcurrentInMeasure(synthetic, span));
  }

  const avgVoicingSize =
    concurrentByBar.reduce((a, v) => a + v, 0) / concurrentByBar.length;

  let pianoBarsWithDenseComp = 0;
  const pianoParts = parts.filter(isPianoPart);
  if (pianoParts.length > 0) {
    for (let b = 1; b <= maxBars; b++) {
      let dense = false;
      for (const pp of pianoParts) {
        const m = pp.measures[b - 1];
        if (!m) continue;
        const span = measureBeatSpan(m);
        if (maxConcurrentInMeasure(m, span) > 2) {
          dense = true;
          break;
        }
      }
      if (dense) pianoBarsWithDenseComp++;
    }
  }
  const pianoDensity = pianoParts.length === 0 ? null : pianoBarsWithDenseComp / maxBars;

  const fingerprints: string[] = [];
  let repetitionBars = 0;
  for (let b = 1; b <= maxBars; b++) {
    const merged: ScoreEvent[] = [];
    let span = 4;
    for (const part of parts) {
      if (isPercussionRhythmFingerprintPart(part)) continue;
      const m = part.measures[b - 1];
      if (!m) continue;
      span = measureBeatSpan(m);
      merged.push(...m.events);
    }
    const synthetic: MeasureModel = { index: b, events: merged, measureBeatSpanQuarters: span };
    const fp = rhythmFingerprint(synthetic, span);
    fingerprints.push(fp);
    if (b > 1) {
      const prev = fingerprints.slice(0, b - 1);
      if (prev.includes(fp)) repetitionBars++;
    }
  }
  const riffRepetitionRatio = maxBars > 1 ? repetitionBars / (maxBars - 1) : 0;

  let onsetTotal = 0;
  let onsetAligned = 0;
  for (const part of parts) {
    if (isPercussionRhythmFingerprintPart(part)) continue;
    const r = collectOnsets(part.measures);
    onsetTotal += r.total;
    onsetAligned += r.aligned;
  }
  const swingGridAlignment = onsetTotal > 0 ? onsetAligned / onsetTotal : 1;

  return {
    orchestration: {
      avgVoicingSize,
      pianoDensity,
    },
    formal: {
      riffRepetitionRatio,
    },
    rhythmic: {
      swingGridAlignment,
    },
  };
}

export const scoreModelFeatureExtractor: FeatureExtractor<ScoreModel> = {
  id: 'scoreModel',
  extract(input: FeatureExtractionInput<ScoreModel>): ExtractedStyleFeatures {
    if (input.sourceFormat !== 'scoreModel') {
      return nullFeatures();
    }
    if (!isScoreModel(input.output)) {
      return nullFeatures();
    }
    return extractScoreModelFeatures(input.output);
  },
};
