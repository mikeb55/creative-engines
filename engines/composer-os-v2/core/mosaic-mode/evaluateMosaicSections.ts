/**
 * Mosaic Mode Step 7 — section-scoped style/GCE evaluation (one profile per section).
 */

import type { CompositionContext } from '../compositionContext';
import type { SectionLockEntry } from './precomputeMosaicEffectiveHarmonyBars';
import { songModeEvalProfileForSongwriter } from '../evaluation/songModeEvaluationProfiles';
import type { ExtractedStyleFeatures, StyleDimensionDefinition, StyleDimensionScore, StyleProfile, StyleProfileEvaluationInput, StyleProfileEvaluationResult } from '../evaluation/evaluationTypes';
import { extractScoreModelFeatures } from '../evaluation/featureExtractor';
import type {
  MeasureModel,
  NoteEvent,
  PartModel,
  ScoreEvent,
  ScoreModel,
} from '../score-model/scoreModelTypes';

/** Section-scoped Verlaine profile — no Towner/Weber discrimination import (ts-node safe). */
const DUO_VERLAINE_SECTION_DIMENSIONS: StyleDimensionDefinition[] = [
  { id: 'modalFieldPersistence', label: 'Modal Field Persistence', weight: 0.22 },
  { id: 'extensionRetentionRate', label: 'Extension Retention', weight: 0.18 },
  { id: 'chordSurfaceBias', label: 'Suspended Chord Surface', weight: 0.2 },
  { id: 'bassDisplacementRate', label: 'Bass Displacement', weight: 0.2 },
  { id: 'progressionAvoidance', label: 'Progression Avoidance', weight: 0.2 },
];

function featureNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function scoreDuoVerlaineSection(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const h = input.features.harmonic ?? {};
  const formal = input.features.formal ?? {};
  const chordChange = featureNum(h.chordChangeRate);
  const phraseHold = featureNum(formal.phraseHoldRate);
  const byId: Record<string, number> = {
    modalFieldPersistence:
      (chordChange == null || chordChange <= 0.28) && (phraseHold == null || phraseHold >= 0.62)
        ? 10
        : chordChange != null && chordChange <= 0.38
          ? 4
          : 7,
    extensionRetentionRate: (featureNum(h.commonToneRate) ?? featureNum(h.add9Maj9Rate) ?? 0) >= 0.58 ? 10 : 7,
    chordSurfaceBias: (featureNum(h.susAddRate) ?? featureNum(h.add9Maj9Rate) ?? 0) >= 0.45 ? 7 : 4,
    bassDisplacementRate: (featureNum(h.slashChordRate) ?? 0) >= 0.32 ? 7 : 4,
    progressionAvoidance: (featureNum(h.functionalCadenceRate) ?? featureNum(h.twoFiveOneRate) ?? 0) <= 0.15 ? 7 : 4,
  };
  const dimensions: StyleDimensionScore[] = input.profile.dimensions.map((d) => {
    const s = byId[d.id] ?? 1;
    return { id: d.id, label: d.label, score: s, weight: d.weight, weightedScore: s * d.weight };
  });
  const finalStyleScore = dimensions.reduce((acc, d) => acc + (d.weightedScore ?? d.score * d.weight), 0);
  const failures: string[] = [];
  if ((featureNum(h.susAddRate) ?? 0) < 0.42) {
    failures.push('chordSurfaceBias below 0.78 — insufficient sus/add/slash surface.');
  }
  const pass = finalStyleScore >= input.profile.threshold && failures.length === 0;
  return {
    styleId: input.profile.id,
    styleName: input.profile.name ?? input.profile.label ?? input.profile.id,
    dimensions,
    finalStyleScore,
    weakestDimensionId: dimensions[0]?.id ?? '',
    strongestDimensionId: dimensions[0]?.id ?? '',
    pass,
    threshold: input.profile.threshold,
    notes: failures.length ? failures : undefined,
  };
}

const duoVerlaineSectionStyleProfile: StyleProfile = {
  id: 'verlaine',
  name: 'Tom Verlaine (duo section)',
  family: 'songwriter',
  threshold: 7.0,
  dimensions: DUO_VERLAINE_SECTION_DIMENSIONS,
  score: scoreDuoVerlaineSection,
};

// ── Mosaic section signature scoring (0–1 linear interp, weighted sum, min 2 sigs ≥ 0.6) ──

interface MosaicSignatureDef {
  id: string;
  label: string;
  weight: number;
}

interface SectionMeasureBundle {
  leadPart: PartModel | undefined;
  chordSymbols: string[];
  totalBars: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Linear 0–1 between fail bound (0) and pass bound (1). Higher value = better when passBound > failBound. */
function linearInterpHigher(value: number, failBound: number, passBound: number): number {
  if (passBound <= failBound) return value >= passBound ? 1 : 0;
  return clamp01((value - failBound) / (passBound - failBound));
}

/** Linear 0–1 between fail bound (0) and pass bound (1). Lower value = better when passBound < failBound. */
function linearInterpLower(value: number, passBound: number, failBound: number): number {
  if (failBound <= passBound) return value <= passBound ? 1 : 0;
  return clamp01((failBound - value) / (failBound - passBound));
}

function scoreInBand(value: number, passMin: number, passMax: number, failMin: number, failMax: number): number {
  if (value >= passMin && value <= passMax) return 1;
  if (value < passMin) {
    if (value <= failMin) return 0;
    return linearInterpHigher(value, failMin, passMin);
  }
  if (value >= failMax) return 0;
  return linearInterpLower(value, passMax, failMax);
}

function leadPartFromScore(score: ScoreModel): PartModel | undefined {
  return (
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar') ??
    score.parts.find((p) => p.measures.some((m) => m.events.some((ev) => ev.kind !== 'rest')))
  );
}

function eventPitch(ev: ScoreEvent): number | null {
  if (ev.kind === 'note') return (ev as NoteEvent).pitch;
  if (ev.kind === 'chord') return ev.pitches[0] ?? null;
  return null;
}

function collectMelodyPitches(part: PartModel | undefined): number[] {
  if (!part) return [];
  const pitches: { bar: number; beat: number; pitch: number }[] = [];
  for (const m of part.measures) {
    for (const ev of m.events) {
      if (ev.kind === 'rest') continue;
      const p = eventPitch(ev);
      if (p != null) pitches.push({ bar: m.index, beat: ev.startBeat, pitch: p });
    }
  }
  pitches.sort((a, b) => a.bar - b.bar || a.beat - b.beat);
  return pitches.map((x) => x.pitch);
}

function melodicIntervals(pitches: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i++) {
    out.push(pitches[i]! - pitches[i - 1]!);
  }
  return out;
}

function intervalFamilyRatio(intervals: readonly number[]): number {
  if (intervals.length === 0) return 0;
  let step = 0;
  let leap45 = 0;
  let repeat = 0;
  for (let i = 0; i < intervals.length; i++) {
    const iv = intervals[i]!;
    const abs = Math.abs(iv);
    if (abs >= 1 && abs <= 2) step++;
    else if (abs >= 4 && abs <= 5) leap45++;
    else if (i > 0 && iv === intervals[i - 1]) repeat++;
  }
  return Math.max(step, leap45, repeat) / intervals.length;
}

function intervalNgramRecurrence(intervals: readonly number[], n = 3): number {
  if (intervals.length < n) return 0;
  const counts = new Map<string, number>();
  for (let i = 0; i <= intervals.length - n; i++) {
    const key = intervals.slice(i, i + n).join(',');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let top = 0;
  for (const c of counts.values()) top = Math.max(top, c);
  const total = intervals.length - n + 1;
  return total > 0 ? top / total : 0;
}

function bluesTaggedIntervalRate(intervals: readonly number[]): number {
  if (intervals.length === 0) return 0;
  let tagged = 0;
  for (const iv of intervals) {
    const abs = Math.abs(iv);
    if (abs === 3 || abs === 6) tagged++;
  }
  return tagged / intervals.length;
}

function minorThirdTritoneAdjacencyRate(intervals: readonly number[]): number {
  if (intervals.length < 2) return 0;
  let adj = 0;
  for (let i = 1; i < intervals.length; i++) {
    const a = Math.abs(intervals[i - 1]!);
    const b = Math.abs(intervals[i]!);
    if ((a === 3 && b === 6) || (a === 6 && b === 3)) adj++;
  }
  return adj / (intervals.length - 1);
}

function measureBeatSpan(m: MeasureModel): number {
  return m.measureBeatSpanQuarters ?? 4;
}

function barAttackPattern(m: MeasureModel): string {
  const span = measureBeatSpan(m);
  const parts: string[] = [];
  for (const ev of m.events) {
    if (ev.kind === 'rest') continue;
    parts.push(`${Math.round(ev.startBeat * 48) / 48}`);
  }
  parts.sort();
  return `${span}|${parts.join(';')}`;
}

function rotatePatternKey(key: string, shift: number): string {
  const [spanPart, body] = key.split('|');
  if (!body) return key;
  const beats = body.split(';').filter(Boolean).map(Number);
  if (beats.length === 0) return key;
  const span = Number(spanPart) || 4;
  const rotated = beats.map((b) => {
    const r = ((b - shift) % span + span) % span;
    return Math.round(r * 48) / 48;
  });
  rotated.sort((a, b) => a - b);
  return `${span}|${rotated.join(';')}`;
}

function topRhythmFingerprintShare(part: PartModel | undefined): { topShare: number; rotationShare: number; activeBars: number } {
  if (!part) return { topShare: 0, rotationShare: 0, activeBars: 0 };
  const fps: string[] = [];
  let active = 0;
  for (const m of part.measures) {
    const hasNote = m.events.some((ev) => ev.kind !== 'rest');
    if (!hasNote) continue;
    active++;
    fps.push(barAttackPattern(m));
  }
  if (active === 0) return { topShare: 0, rotationShare: 0, activeBars: 0 };
  const counts = new Map<string, number>();
  for (const fp of fps) counts.set(fp, (counts.get(fp) ?? 0) + 1);
  let top = 0;
  let topKey = '';
  for (const [k, c] of counts) {
    if (c > top) {
      top = c;
      topKey = k;
    }
  }
  let rotationHits = 0;
  for (const fp of fps) {
    if (fp === topKey) {
      rotationHits++;
      continue;
    }
    const beats = fp.split('|')[1]?.split(';').filter(Boolean).map(Number) ?? [];
    const span = Number(fp.split('|')[0]) || 4;
    let matched = false;
    for (let shift = 1; shift < span && !matched; shift++) {
      if (rotatePatternKey(topKey, shift) === fp) matched = true;
    }
    if (matched) rotationHits++;
  }
  return { topShare: top / active, rotationShare: rotationHits / active, activeBars: active };
}

function restAndPhraseMetrics(part: PartModel | undefined): { restRatio: number; meanPhraseBars: number } {
  if (!part || part.measures.length === 0) return { restRatio: 0, meanPhraseBars: 99 };
  let restBeats = 0;
  let totalBeats = 0;
  const activeFlags: boolean[] = [];
  for (const m of part.measures) {
    const span = measureBeatSpan(m);
    totalBeats += span;
    let barRest = 0;
    let hasNote = false;
    for (const ev of m.events) {
      if (ev.kind === 'rest') barRest += ev.duration;
      else hasNote = true;
    }
    if (!hasNote) barRest = span;
    restBeats += barRest;
    activeFlags.push(hasNote);
  }
  const phrases: number[] = [];
  let run = 0;
  for (const active of activeFlags) {
    if (active) run++;
    else if (run > 0) {
      phrases.push(run);
      run = 0;
    }
  }
  if (run > 0) phrases.push(run);
  const meanPhraseBars = phrases.length > 0 ? phrases.reduce((a, b) => a + b, 0) / phrases.length : 99;
  return { restRatio: totalBeats > 0 ? restBeats / totalBeats : 0, meanPhraseBars };
}

/** Fripp sig4 — note groups separated by >= minGapBeats rest/silence (within or across bars). */
function countNoteGroupsByRestGap(part: PartModel | undefined, minGapBeats = 0.5): number {
  if (!part || part.measures.length === 0) return 0;

  const hasMelodyVoice = part.measures.some((m) =>
    m.events.some((ev) => ev.kind !== 'rest' && ev.voice === 1)
  );
  const melodyVoiceOnly = hasMelodyVoice ? 1 : undefined;

  const toGlobalBeat = (barIndex: number, localBeat: number): number => {
    let offset = 0;
    for (const m of part.measures) {
      if (m.index >= barIndex) break;
      offset += measureBeatSpan(m);
    }
    return offset + localBeat;
  };

  type Span = { start: number; end: number };
  const spans: Span[] = [];
  for (const m of part.measures) {
    for (const ev of m.events) {
      if (ev.kind === 'rest') continue;
      if (melodyVoiceOnly !== undefined && ev.voice !== melodyVoiceOnly) continue;
      const gStart = toGlobalBeat(m.index, ev.startBeat);
      spans.push({ start: gStart, end: gStart + ev.duration });
    }
  }
  if (spans.length === 0) return 0;

  spans.sort((a, b) => a.start - b.start);
  const merged: Span[] = [{ ...spans[0]! }];
  for (let i = 1; i < spans.length; i++) {
    const cur = spans[i]!;
    const last = merged[merged.length - 1]!;
    if (cur.start - last.end < minGapBeats) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged.length;
}

function frippSilenceDisciplineScores(part: PartModel | undefined): {
  restRatio: number;
  noteGroupCount: number;
  sig4Rest: number;
  sig4Phrase: number;
  sig4: number;
} {
  const silence = restAndPhraseMetrics(part);
  const noteGroupCount = countNoteGroupsByRestGap(part, 0.5);
  const sig4Rest = scoreInBand(silence.restRatio, 0.12, 0.35, 0.06, 0.6);
  const sig4Phrase = linearInterpHigher(noteGroupCount, 1, 3);
  const sig4 = Math.min(sig4Rest, sig4Phrase);
  return { restRatio: silence.restRatio, noteGroupCount, sig4Rest, sig4Phrase, sig4 };
}

function pitchClassAttackStats(part: PartModel | undefined): {
  topPcShare: number;
  topPcBarShare: number;
  lowestPcBarConstancy: number;
} {
  if (!part) return { topPcShare: 0, topPcBarShare: 0, lowestPcBarConstancy: 0 };
  const pcCounts = new Map<number, number>();
  let attacks = 0;
  const lowestByBar: number[] = [];
  const pcByBar: Map<number, Set<number>> = new Map();
  for (const m of part.measures) {
    let lowest: number | null = null;
    for (const ev of m.events) {
      if (ev.kind === 'rest') continue;
      const p = eventPitch(ev);
      if (p == null) continue;
      attacks++;
      const pc = ((p % 12) + 12) % 12;
      pcCounts.set(pc, (pcCounts.get(pc) ?? 0) + 1);
      if (lowest == null || p < lowest) lowest = p;
      if (!pcByBar.has(m.index)) pcByBar.set(m.index, new Set());
      pcByBar.get(m.index)!.add(pc);
    }
    if (lowest != null) lowestByBar.push(((lowest % 12) + 12) % 12);
  }
  let topPcShare = 0;
  for (const c of pcCounts.values()) topPcShare = Math.max(topPcShare, c);
  topPcShare = attacks > 0 ? topPcShare / attacks : 0;

  let topPc = -1;
  let topCount = 0;
  for (const [pc, c] of pcCounts) {
    if (c > topCount) {
      topCount = c;
      topPc = pc;
    }
  }
  let barsWithTop = 0;
  for (const pcs of pcByBar.values()) {
    if (pcs.has(topPc)) barsWithTop++;
  }
  const topPcBarShare = pcByBar.size > 0 ? barsWithTop / pcByBar.size : 0;

  const lowestCounts = new Map<number, number>();
  for (const pc of lowestByBar) lowestCounts.set(pc, (lowestCounts.get(pc) ?? 0) + 1);
  let lowestTop = 0;
  for (const c of lowestCounts.values()) lowestTop = Math.max(lowestTop, c);
  const lowestPcBarConstancy = lowestByBar.length > 0 ? lowestTop / lowestByBar.length : 0;

  return { topPcShare, topPcBarShare, lowestPcBarConstancy };
}

function motifRecurrenceShare(pitches: readonly number[]): number {
  if (pitches.length < 3) return 0;
  const counts = new Map<string, number>();
  let windows = 0;
  for (const len of [2, 3, 4]) {
    for (let i = 0; i <= pitches.length - len; i++) {
      const fp = pitches.slice(i, i + len).map((p) => ((p % 12) + 12) % 12).join(',');
      counts.set(fp, (counts.get(fp) ?? 0) + 1);
      windows++;
    }
  }
  let top = 0;
  for (const c of counts.values()) top = Math.max(top, c);
  return windows > 0 ? top / windows : 0;
}

function chordComplexity(symbol: string): number {
  const lower = symbol.toLowerCase();
  let mods = 0;
  if (lower.includes('sus')) mods++;
  if (lower.includes('add')) mods++;
  if (/\d/.test(lower.replace(/maj7/g, ''))) mods++;
  if (lower.includes('#') || lower.includes('b')) mods++;
  if (lower.includes('alt')) mods++;
  return 1 + mods;
}

function isTriadPowerDom7(symbol: string): boolean {
  const root = symbol.split('/')[0]?.trim().toLowerCase() ?? '';
  if (/^([a-g][#b]?)(m(?!aj)|min|dim|aug)?$/i.test(root)) return true;
  if (/^([a-g][#b]?)(maj7|maj9|m11|m9|9|11|13|alt|sus|add)/i.test(root)) return false;
  if (/^([a-g][#b]?)7(\s|$)/i.test(root)) return true;
  if (/^([a-g][#b]?)5$/i.test(root)) return true;
  return /^([a-g][#b]?)$/i.test(root);
}

function isAdvancedExtension(symbol: string): boolean {
  const lower = symbol.toLowerCase();
  return (
    lower.includes('9') ||
    lower.includes('11') ||
    lower.includes('13') ||
    lower.includes('alt') ||
    lower.includes('#11') ||
    lower.includes('b9')
  );
}

function isAdvancedColorChord(symbol: string): boolean {
  const lower = symbol.toLowerCase();
  return (
    lower.includes('sus') ||
    lower.includes('maj7#11') ||
    lower.includes('m11') ||
    lower.includes('quartal') ||
    lower.includes('alt') ||
    lower.includes('7alt')
  );
}

function isSuspendedOrNonfunctional(symbol: string): boolean {
  const lower = symbol.toLowerCase();
  return (
    lower.includes('sus') ||
    lower.includes('m11') ||
    lower.includes('maj7#11') ||
    lower.includes('m9') ||
    lower.includes('quartal') ||
    !lower.includes('7') ||
    lower.includes('maj7')
  );
}

function isDominantSymbol(symbol: string): boolean {
  const lower = symbol.toLowerCase();
  return lower.includes('7') && !lower.includes('maj7') && !lower.includes('m7');
}

function isMajorTonicLike(symbol: string): boolean {
  const root = symbol.split('/')[0]?.trim().toLowerCase() ?? '';
  return /^([a-g][#b]?)(maj|maj7)?$/i.test(root) && !root.includes('m') && !root.includes('min');
}

function viResolutionRate(chords: readonly string[]): number {
  if (chords.length < 2) return 0;
  let moves = 0;
  let vi = 0;
  for (let i = 1; i < chords.length; i++) {
    if (normalizeChordRoot(chords[i - 1] ?? '') === normalizeChordRoot(chords[i] ?? '')) continue;
    moves++;
    if (isDominantSymbol(chords[i - 1] ?? '') && isMajorTonicLike(chords[i] ?? '')) vi++;
  }
  return moves > 0 ? vi / moves : 0;
}

function combined125IntervalRate(intervals: readonly number[]): number {
  if (intervals.length === 0) return 0;
  let hit = 0;
  for (const iv of intervals) {
    const abs = Math.abs(iv);
    if (abs === 1 || abs === 2 || abs === 5) hit++;
  }
  return hit / intervals.length;
}

function fourthFillBehaviorRate(intervals: readonly number[]): number {
  if (intervals.length < 2) return 0;
  let events = 0;
  for (let i = 0; i < intervals.length - 1; i++) {
    const abs = Math.abs(intervals[i]!);
    const nextAbs = Math.abs(intervals[i + 1]!);
    if (abs === 5 && (nextAbs === 1 || nextAbs === 2)) events++;
    if (abs === 5) events++;
  }
  return events / Math.max(1, intervals.length);
}

function offbeatAttackRate(part: PartModel | undefined): number {
  if (!part) return 0;
  let total = 0;
  let offbeat = 0;
  for (const m of part.measures) {
    for (const ev of m.events) {
      if (ev.kind === 'rest') continue;
      total++;
      const sb = ev.startBeat;
      const nearBeat1 = Math.abs(sb) < 0.06 || Math.abs(sb - 1) < 0.06 || Math.abs(sb - 2) < 0.06 || Math.abs(sb - 3) < 0.06;
      if (!nearBeat1) offbeat++;
    }
  }
  return total > 0 ? offbeat / total : 0;
}

function phraseEntryOffBeat1Rate(part: PartModel | undefined): number {
  if (!part) return 0;
  let phrases = 0;
  let offEntries = 0;
  let prevActive = false;
  for (const m of part.measures) {
    const notes = m.events.filter((ev) => ev.kind !== 'rest');
    const active = notes.length > 0;
    if (active && !prevActive) {
      phrases++;
      const first = notes.reduce((min, ev) => (ev.startBeat < min.startBeat ? ev : min), notes[0]!);
      if (Math.abs(first.startBeat) > 0.08) offEntries++;
    }
    prevActive = active;
  }
  return phrases > 0 ? offEntries / phrases : 0;
}

function sectionBundle(output: ScoreModel): SectionMeasureBundle {
  const leadPart = leadPartFromScore(output);
  const start = leadPart?.measures[0]?.index ?? 1;
  const end = leadPart?.measures[leadPart.measures.length - 1]?.index ?? start;
  const chordSymbols =
    chordSymbolsForSection(output, start, end).length > 0
      ? chordSymbolsForSection(output, start, end)
      : [];
  return {
    leadPart,
    chordSymbols,
    totalBars: Math.max(1, end - start + 1),
  };
}

function evaluateMosaicSignatureProfile(
  profileId: string,
  profileName: string,
  signatures: MosaicSignatureDef[],
  scores01: Record<string, number>,
  overallThreshold: number
): StyleProfileEvaluationResult {
  const dimensions: StyleDimensionScore[] = signatures.map((sig) => {
    const s01 = scores01[sig.id] ?? 0;
    return {
      id: sig.id,
      label: sig.label,
      score: s01 * 10,
      weight: sig.weight,
      weightedScore: s01 * 10 * sig.weight,
    };
  });
  const weightedSum = signatures.reduce((acc, sig) => acc + (scores01[sig.id] ?? 0) * sig.weight, 0);
  const strongSigs = signatures.filter((sig) => (scores01[sig.id] ?? 0) >= 0.6).length;
  const pass = weightedSum >= overallThreshold && strongSigs >= 2;
  const failures: string[] = [];
  if (weightedSum < overallThreshold) {
    failures.push(`weighted signature sum ${weightedSum.toFixed(3)} below ${overallThreshold.toFixed(2)}`);
  }
  if (strongSigs < 2) {
    failures.push(`only ${strongSigs} signature(s) >= 0.60 (need 2)`);
  }
  let weakestDimensionId = dimensions[0]?.id ?? '';
  let strongestDimensionId = dimensions[0]?.id ?? '';
  let minS = Infinity;
  let maxS = -Infinity;
  for (const d of dimensions) {
    if (d.score < minS) {
      minS = d.score;
      weakestDimensionId = d.id;
    }
    if (d.score > maxS) {
      maxS = d.score;
      strongestDimensionId = d.id;
    }
  }
  return {
    styleId: profileId,
    styleName: profileName,
    dimensions,
    finalStyleScore: weightedSum * 10,
    weakestDimensionId,
    strongestDimensionId,
    pass,
    threshold: overallThreshold * 10,
    notes: failures.length ? failures : undefined,
  };
}

const FRIPP_SECTION_SIGS: MosaicSignatureDef[] = [
  { id: 'intervalSystemCoherence', label: 'Interval System Coherence', weight: 0.32 },
  { id: 'antiBluesVocabulary', label: 'Anti-Blues Vocabulary', weight: 0.23 },
  { id: 'pulseCellRecurrence', label: 'Pulse-Cell Recurrence', weight: 0.25 },
  { id: 'silenceDiscipline', label: 'Silence Discipline', weight: 0.2 },
];

function scoreFrippMosaicSection(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const bundle = sectionBundle(input.output as ScoreModel);
  const pitches = collectMelodyPitches(bundle.leadPart);
  const intervals = melodicIntervals(pitches);
  const familyRatio = intervalFamilyRatio(intervals);
  const ngramRec = intervalNgramRecurrence(intervals);
  const sig1 = Math.max(
    linearInterpHigher(familyRatio, 0.35, 0.55),
    linearInterpHigher(ngramRec, 0.2, 0.35)
  );
  const bluesRate = bluesTaggedIntervalRate(intervals);
  const m3TriAdj = minorThirdTritoneAdjacencyRate(intervals);
  const sig2 = Math.min(
    linearInterpLower(bluesRate, 0.18, 0.3),
    linearInterpLower(m3TriAdj, 0.1, 0.18)
  );
  const rhythm = topRhythmFingerprintShare(bundle.leadPart);
  const sig3 = Math.max(
    linearInterpHigher(rhythm.topShare, 0.22, 0.4),
    linearInterpHigher(rhythm.rotationShare, 0.22, 0.3)
  );
  const silence = frippSilenceDisciplineScores(bundle.leadPart);
  const sig4Rest = silence.sig4Rest;
  const sig4Phrase = silence.sig4Phrase;
  const sig4 = silence.sig4;
  return evaluateMosaicSignatureProfile(
    'fripp',
    'Robert Fripp (mosaic section)',
    FRIPP_SECTION_SIGS,
    {
      intervalSystemCoherence: sig1,
      antiBluesVocabulary: sig2,
      pulseCellRecurrence: sig3,
      silenceDiscipline: sig4,
    },
    0.62
  );
}

const JACK_WHITE_SECTION_SIGS: MosaicSignatureDef[] = [
  { id: 'bluesCompressedIntervals', label: 'Blues-Compressed Intervals', weight: 0.3 },
  { id: 'dronePersistence', label: 'Drone Persistence', weight: 0.27 },
  { id: 'riffRepetition', label: 'Riff Repetition', weight: 0.25 },
  { id: 'harmonicBluntness', label: 'Harmonic Bluntness', weight: 0.18 },
];

function scoreJackWhiteMosaicSection(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const bundle = sectionBundle(input.output as ScoreModel);
  const pitches = collectMelodyPitches(bundle.leadPart);
  const intervals = melodicIntervals(pitches);
  const smallShare = intervals.length > 0 ? intervals.filter((iv) => Math.abs(iv) <= 3).length / intervals.length : 0;
  const largeShare = intervals.length > 0 ? intervals.filter((iv) => Math.abs(iv) > 5).length / intervals.length : 0;
  const sig1 = Math.min(
    linearInterpHigher(smallShare, 0.55, 0.72),
    linearInterpLower(largeShare, 0.08, 0.18)
  );
  const drone = pitchClassAttackStats(bundle.leadPart);
  const sig2 = Math.max(
    linearInterpHigher(drone.topPcShare, 0.18, 0.28),
    linearInterpHigher(drone.topPcBarShare, 0.45, 0.6),
    linearInterpHigher(drone.lowestPcBarConstancy, 0.45, 0.55)
  );
  const motifShare = motifRecurrenceShare(pitches);
  const rhythm = topRhythmFingerprintShare(bundle.leadPart);
  const sig3 = Math.max(
    linearInterpHigher(motifShare, 0.2, 0.35),
    linearInterpHigher(rhythm.topShare, 0.28, 0.45)
  );
  const chords = bundle.chordSymbols;
  const bluntShare = chords.length > 0 ? chords.filter(isTriadPowerDom7).length / chords.length : 0;
  const advExtShare = chords.length > 0 ? chords.filter(isAdvancedExtension).length / chords.length : 0;
  const avgComplex =
    chords.length > 0 ? chords.reduce((a, c) => a + chordComplexity(c), 0) / chords.length : 99;
  const sig4 = Math.min(
    linearInterpHigher(bluntShare, 0.55, 0.75),
    linearInterpLower(advExtShare, 0.12, 0.25),
    linearInterpLower(avgComplex, 1.8, 2.2)
  );
  return evaluateMosaicSignatureProfile(
    'jack_white',
    'Jack White (mosaic section)',
    JACK_WHITE_SECTION_SIGS,
    {
      bluesCompressedIntervals: sig1,
      dronePersistence: sig2,
      riffRepetition: sig3,
      harmonicBluntness: sig4,
    },
    0.64
  );
}

const WAYNE_SHORTER_SECTION_SIGS: MosaicSignatureDef[] = [
  { id: 'cadentialAvoidance', label: 'Cadential Avoidance', weight: 0.31 },
  { id: 'fourthSecondIntervalFamily', label: 'Fourth-Second Interval Family', weight: 0.24 },
  { id: 'metricDisplacement', label: 'Metric Displacement', weight: 0.23 },
  { id: 'harmonicDensityRestraint', label: 'Harmonic Density Restraint', weight: 0.22 },
];

function scoreWayneShorterMosaicSection(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const bundle = sectionBundle(input.output as ScoreModel);
  const pitches = collectMelodyPitches(bundle.leadPart);
  const intervals = melodicIntervals(pitches);
  const chords = bundle.chordSymbols;
  const viRate = viResolutionRate(chords);
  const suspShare = chords.length > 0 ? chords.filter(isSuspendedOrNonfunctional).length / chords.length : 0;
  const sig1 = Math.min(
    linearInterpLower(viRate, 0.12, 0.28),
    linearInterpHigher(suspShare, 0.25, 0.45)
  );
  const combined125 = combined125IntervalRate(intervals);
  const fourthFill = fourthFillBehaviorRate(intervals);
  const sig2 = Math.min(
    linearInterpHigher(combined125, 0.5, 0.68),
    linearInterpHigher(fourthFill, 0.12, 0.22)
  );
  const offbeat = offbeatAttackRate(bundle.leadPart);
  const phraseOff = phraseEntryOffBeat1Rate(bundle.leadPart);
  const sig3 = Math.max(
    linearInterpHigher(phraseOff, 0.18, 0.35),
    linearInterpHigher(offbeat, 0.18, 0.3)
  );
  const density = bundle.totalBars > 0 ? chords.length / bundle.totalBars : 0;
  const colorShare = chords.length > 0 ? chords.filter(isAdvancedColorChord).length / chords.length : 0;
  const sig4Density = scoreInBand(density, 0.5, 1.5, 0.25, 2.0);
  const sig4Color = linearInterpHigher(colorShare, 0.15, 0.3);
  const sig4 = Math.min(sig4Density, sig4Color);
  return evaluateMosaicSignatureProfile(
    'wayne_shorter',
    'Wayne Shorter (mosaic section)',
    WAYNE_SHORTER_SECTION_SIGS,
    {
      cadentialAvoidance: sig1,
      fourthSecondIntervalFamily: sig2,
      metricDisplacement: sig3,
      harmonicDensityRestraint: sig4,
    },
    0.66
  );
}

const duoFrippSectionStyleProfile: StyleProfile = {
  id: 'fripp',
  name: 'Robert Fripp (mosaic section)',
  family: 'rock',
  threshold: 6.2,
  dimensions: FRIPP_SECTION_SIGS.map((s) => ({ ...s, featureKeys: [] })),
  score: scoreFrippMosaicSection,
};

const duoJackWhiteSectionStyleProfile: StyleProfile = {
  id: 'jack_white',
  name: 'Jack White (mosaic section)',
  family: 'rock',
  threshold: 6.4,
  dimensions: JACK_WHITE_SECTION_SIGS.map((s) => ({ ...s, featureKeys: [] })),
  score: scoreJackWhiteMosaicSection,
};

const duoWayneShorterSectionStyleProfile: StyleProfile = {
  id: 'wayne_shorter',
  name: 'Wayne Shorter (mosaic section)',
  family: 'jazz',
  threshold: 6.6,
  dimensions: WAYNE_SHORTER_SECTION_SIGS.map((s) => ({ ...s, featureKeys: [] })),
  score: scoreWayneShorterMosaicSection,
};

/** Slice composers with evaluation profiles wired in Step 7 (until on SONG_MODE_COMPOSER_EVAL_PROFILES). */
function duoSliceEvalProfile(composerId: string): StyleProfile | undefined {
  switch (composerId) {
    case 'verlaine':
      return duoVerlaineSectionStyleProfile;
    case 'fripp':
      return duoFrippSectionStyleProfile;
    case 'jack_white':
      return duoJackWhiteSectionStyleProfile;
    case 'wayne_shorter':
      return duoWayneShorterSectionStyleProfile;
    case 'marr':
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('../evaluation/marrStyleProfile').marrStyleProfile as StyleProfile;
    default:
      return undefined;
  }
}

export interface DuoSectionEvalResult {
  sectionLabel: string;
  startBar: number;
  endBar: number;
  composerId: string;
  passed: boolean;
  scores: Record<string, number>;
  failures: string[];
}

function styleProfileForSection(composerId: string): StyleProfile | undefined {
  return songModeEvalProfileForSongwriter(composerId) ?? duoSliceEvalProfile(composerId);
}

function cloneMeasure(m: MeasureModel): MeasureModel {
  return {
    ...m,
    events: m.events.map((ev) => ({ ...ev })),
  };
}

function clonePartMeasures(part: PartModel, startBar: number, endBar: number): PartModel {
  return {
    ...part,
    measures: part.measures
      .filter((m) => m.index >= startBar && m.index <= endBar)
      .map(cloneMeasure),
  };
}

function sliceScoreForBarRange(score: ScoreModel, startBar: number, endBar: number): ScoreModel {
  return {
    ...score,
    parts: score.parts.map((part) => clonePartMeasures(part, startBar, endBar)),
  };
}

function chordSymbolsForSection(score: ScoreModel, startBar: number, endBar: number): string[] {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return [];
  const out: string[] = [];
  for (let bar = startBar; bar <= endBar; bar++) {
    const chord = guitar.measures.find((m) => m.index === bar)?.chord ?? '';
    out.push(chord);
  }
  return out;
}

function normalizeChordRoot(symbol: string): string {
  return symbol.trim().split('/')[0]?.trim().toLowerCase() ?? '';
}

function harmonicFeaturesFromChordBars(bars: readonly string[]): NonNullable<ExtractedStyleFeatures['harmonic']> {
  const n = bars.length;
  if (n === 0) return {};

  let slash = 0;
  let susAdd = 0;
  let add9Maj9 = 0;
  let altered = 0;
  let triadLike = 0;
  let changes = 0;
  let functionalCadence = 0;
  let twoFiveOne = 0;

  for (let i = 0; i < n; i++) {
    const sym = bars[i] ?? '';
    const lower = sym.toLowerCase();
    if (sym.includes('/')) slash++;
    if (lower.includes('sus') || lower.includes('add')) susAdd++;
    if (lower.includes('maj9') || lower.includes('add9') || /[^a-z]9/.test(lower)) add9Maj9++;
    if (lower.includes('alt') || lower.includes('7alt') || lower.includes('b9') || lower.includes('#9')) {
      altered++;
    }
    if (/^([a-g][#b]?)(maj7?|m(?!aj)|min|dim|aug)?$/i.test(sym.split('/')[0]?.trim() ?? '')) {
      triadLike++;
    }
    if (i > 0 && normalizeChordRoot(bars[i - 1] ?? '') !== normalizeChordRoot(sym)) {
      changes++;
    }
    if (lower.includes('7') && !lower.includes('maj7') && !lower.includes('m7')) {
      functionalCadence++;
    }
    if (i >= 2) {
      const a = bars[i - 2]?.toLowerCase() ?? '';
      const b = bars[i - 1]?.toLowerCase() ?? '';
      const c = lower;
      if (a.includes('m7') && b.includes('7') && (c.includes('maj') || c.endsWith('7'))) {
        twoFiveOne++;
      }
    }
  }

  const denom = Math.max(1, n);
  const changeDenom = Math.max(1, n - 1);

  return {
    chordChangeRate: changes / changeDenom,
    slashChordRate: slash / denom,
    susAddRate: susAdd / denom,
    add9Maj9Rate: add9Maj9 / denom,
    alteredDominantRate: altered / denom,
    triadRate: triadLike / denom,
    functionalCadenceRate: functionalCadence / denom,
    twoFiveOneRate: twoFiveOne / denom,
    pedalRate: 0,
    commonToneRate: 1 - changes / changeDenom,
    modalMixRate: susAdd / denom,
    extensionDensity: add9Maj9 / denom,
  };
}

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function mergeSectionFeatures(
  scoreSlice: ScoreModel,
  expectedHarmonyBars: readonly string[]
): ExtractedStyleFeatures {
  const base = extractScoreModelFeatures(scoreSlice);
  const fromChords = harmonicFeaturesFromChordBars(
    expectedHarmonyBars.length > 0 ? expectedHarmonyBars : chordSymbolsForSection(
      scoreSlice,
      scoreSlice.parts[0]?.measures[0]?.index ?? 1,
      scoreSlice.parts[0]?.measures[scoreSlice.parts[0]?.measures.length - 1]?.index ?? 1
    )
  );
  const avgVoicing = asNumber(base.orchestration?.avgVoicingSize);
  const swingGrid = asNumber(base.rhythmic?.swingGridAlignment);
  return {
    ...base,
    harmonic: { ...(base.harmonic ?? {}), ...fromChords },
    formal: {
      ...(base.formal ?? {}),
      phraseHoldRate: 1 - (asNumber(fromChords.chordChangeRate) ?? 0),
    },
    melodic: {
      ...(base.melodic ?? {}),
      contourClarity: avgVoicing != null ? Math.min(1, avgVoicing / 5) : null,
      attackDensity: swingGrid,
      bassIndependenceRate: fromChords.slashChordRate ?? null,
    },
    rhythmic: {
      ...(base.rhythmic ?? {}),
      syncopationRate: swingGrid != null ? 1 - swingGrid : null,
      subdivisionDensity: swingGrid,
    },
  };
}

function buildEvalResult(entry: SectionLockEntry, styleResult: StyleProfileEvaluationResult): DuoSectionEvalResult {
  const scores: Record<string, number> = {
    overall: styleResult.finalStyleScore,
  };
  for (const dim of styleResult.dimensions) {
    scores[dim.id] = dim.score;
  }

  const failures: string[] = [];
  if (styleResult.notes?.length) {
    failures.push(...styleResult.notes.map(String));
  }
  if (!styleResult.pass && failures.length === 0) {
    failures.push(
      `section style score ${styleResult.finalStyleScore.toFixed(2)} below threshold ${styleResult.threshold.toFixed(1)}`
    );
  }

  return {
    sectionLabel: entry.sectionLabel,
    startBar: entry.startBar,
    endBar: entry.endBar,
    composerId: entry.composerId,
    passed: styleResult.pass,
    scores,
    failures,
  };
}

function evaluateSectionEntry(score: ScoreModel, entry: SectionLockEntry): DuoSectionEvalResult | undefined {
  const profile = styleProfileForSection(entry.composerId);
  if (!profile) {
    console.warn(
      `[duo-section-eval] no style profile for composer "${entry.composerId}" — section "${entry.sectionLabel}" skipped`
    );
    return undefined;
  }

  try {
    const sectionScore = sliceScoreForBarRange(score, entry.startBar, entry.endBar);
    const features = mergeSectionFeatures(sectionScore, entry.expectedHarmonyBars);

    const styleResult = profile.score({
      output: sectionScore,
      features,
      profile,
    });

    return buildEvalResult(entry, styleResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[duo-section-eval] section "${entry.sectionLabel}" (${entry.composerId}) eval error: ${message}`
    );
    return {
      sectionLabel: entry.sectionLabel,
      startBar: entry.startBar,
      endBar: entry.endBar,
      composerId: entry.composerId,
      passed: false,
      scores: {},
      failures: [message],
    };
  }
}

/**
 * Evaluate each duo section against its composer style profile (order-independent, pure).
 */
export function evaluateMosaicSections(
  score: ScoreModel,
  context: CompositionContext
): DuoSectionEvalResult[] {
  const registry = context.generationMetadata?.mosaicLockRegistry;
  if (!registry || registry.length === 0) return [];

  const results: DuoSectionEvalResult[] = [];
  for (const entry of registry) {
    const result = evaluateSectionEntry(score, entry);
    if (result) results.push(result);
  }
  return results;
}
