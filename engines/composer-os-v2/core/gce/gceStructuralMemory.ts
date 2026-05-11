/**
 * GCE structural memory — lightweight JSON fingerprints (no ML).
 * Phase 1: extract/compare structural metrics + melodic bar-sequence streak guard.
 */

import fs from 'fs';
import path from 'path';
import {
  addEvent,
  createMeasure,
  createNote,
  createRest,
  createScore,
} from '../score-model/scoreEventBuilder';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { resolveMelodicPartId } from './resolveMelodicPartId';
import { getBestFingerprintId } from './gceMemoryRegistry';
import { auditAltoConsecutiveRestBars } from '../big-band/orbitSteelyV14MelodicDevelopment';

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function pitchToMidi(step: string, octave: number, alter: number): number {
  const pc = STEP_TO_PC[step.toUpperCase()] ?? 0;
  return (octave + 1) * 12 + pc + alter;
}

/** Declared macro shape for a reference chart — validators may relax rules that fight the tag. */
export type GceIntentTag =
  | 'bright_opening'
  | 'gradual_darkening'
  | 'sparse_ending'
  | 'constant_density'
  | 'climax_driven'
  | 'through_composed';

export interface StructuralFingerprint {
  id: string;
  format: 'big_band' | 'string_quartet' | 'duo' | 'ecm';
  songwriterId: string;
  gceScore: number;
  gceGateOverride?: number;
  /** Optional authorial/structural labels for rule relaxation (see handbook). */
  intentTags?: GceIntentTag[];
  /** active parts per bar, normalised 0–1, length = barCount */
  densityCurve: number[];
  melodicRestSpans: {
    partId: string;
    maxConsecutiveRestBars: number;
    restSpanDistribution: number[];
  }[];
  sectionTransitions: {
    barNumber: number;
    label: string;
    densityDelta: number;
  }[];
  /** bb_drums voice 1 note-event count per bar */
  drumNarrativeShape: number[];
  /** 0–1: proportion of bars whose pitch-sequence signature appears exactly once (lead melodic part) */
  melodicVarietyScore: number;
  notes?: string;
}

export interface StructuralFingerprintMeta {
  id: string;
  format: StructuralFingerprint['format'];
  songwriterId: string;
  gceScore: number;
  gceGateOverride?: number;
  intentTags?: GceIntentTag[];
  notes?: string;
}

const MELODIC_BB_PART_IDS = new Set([
  'bb_alto_sax',
  'bb_tenor_sax',
  'bb_trumpets',
  'bb_trombones',
  'bb_piano',
]);

function scoreBarCount(score: ScoreModel): number {
  let n = 0;
  for (const p of score.parts) {
    if (p.measures.length > n) n = p.measures.length;
  }
  return n;
}

function isMelodicPartId(id: string): boolean {
  if (MELODIC_BB_PART_IDS.has(id)) return true;
  if (id === 'bb_drums' || id === 'bb_rhythm_section') return false;
  return true;
}

function measureVoice1PitchSignature(measure: MeasureModel): string {
  const notes: NoteEvent[] = [];
  for (const e of measure.events) {
    if (e.kind !== 'note') continue;
    const ne = e as NoteEvent;
    if ((ne.voice ?? 1) !== 1) continue;
    notes.push(ne);
  }
  notes.sort((a, b) => a.startBeat - b.startBeat || a.pitch - b.pitch);
  if (notes.length === 0) return '';
  return notes.map((n) => n.pitch).join(',');
}

function measureIsVoice1RestOnly(measure: MeasureModel): boolean {
  for (const e of measure.events) {
    if (e.kind === 'note' && (e.voice ?? 1) === 1) return false;
  }
  return true;
}

function collectRestRunLengths(part: PartModel): { maxRun: number; distribution: number[] } {
  const runs: number[] = [];
  let cur = 0;
  for (const m of part.measures) {
    if (measureIsVoice1RestOnly(m)) {
      cur += 1;
    } else if (cur > 0) {
      runs.push(cur);
      cur = 0;
    }
  }
  if (cur > 0) runs.push(cur);
  const maxRun = runs.length ? Math.max(...runs) : 0;
  return { maxRun, distribution: runs.sort((a, b) => a - b) };
}

/** Exported for BB GCE arrangement pillar — same counting as fingerprint density curve. */
export function activePartsNormalizedBigBand(score: ScoreModel, bar: number): number {
  const ids = score.parts.map((p) => p.id);
  let active = 0;
  for (const p of score.parts) {
    if (p.id === 'bb_drums') {
      const m = p.measures[bar - 1];
      if (!m) continue;
      let hit = false;
      for (const e of m.events) {
        if (e.kind === 'note') {
          hit = true;
          break;
        }
      }
      if (hit) active++;
    } else {
      const m = p.measures[bar - 1];
      if (!m) continue;
      let hit = false;
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        if ((e.voice ?? 1) !== 1) continue;
        hit = true;
        break;
      }
      if (hit) active++;
    }
  }
  const denom = Math.max(1, ids.length);
  return active / denom;
}

function drumVoice1Hits(score: ScoreModel, bar: number): number {
  const drums = score.parts.find((p) => p.id === 'bb_drums');
  const m = drums?.measures[bar - 1];
  if (!m) return 0;
  let n = 0;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    if ((e.voice ?? 1) !== 1) continue;
    n++;
  }
  return n;
}

function rehearsalMarksFromScore(score: ScoreModel, barCount: number): Array<{ barNumber: number; label: string }> {
  const seen = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.rehearsalMark && m.index >= 1 && m.index <= barCount) {
        seen.set(m.index, m.rehearsalMark);
      }
    }
  }
  return [...seen.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([barNumber, label]) => ({ barNumber, label }));
}

export function extractFingerprint(
  score: ScoreModel,
  gceScore: number,
  meta: StructuralFingerprintMeta
): StructuralFingerprint {
  const barCount = scoreBarCount(score);
  const densityCurve: number[] = [];
  const drumNarrativeShape: number[] = [];
  for (let b = 1; b <= barCount; b++) {
    densityCurve.push(activePartsNormalizedBigBand(score, b));
    drumNarrativeShape.push(drumVoice1Hits(score, b));
  }

  const melodicParts = score.parts.filter((p) => isMelodicPartId(p.id));
  const melodicRestSpans = melodicParts.map((p) => {
    const { maxRun, distribution } = collectRestRunLengths(p);
    return {
      partId: p.id,
      maxConsecutiveRestBars: maxRun,
      restSpanDistribution: distribution,
    };
  });

  const rehearsals = rehearsalMarksFromScore(score, barCount);
  const sectionTransitions = rehearsals.map((r) => {
    const bi = r.barNumber;
    const dPrev =
      bi >= 2 ? densityCurve[bi - 2] ?? 0 : densityCurve[0] ?? 0;
    const dHere = bi >= 1 ? densityCurve[bi - 1] ?? 0 : 0;
    return {
      barNumber: r.barNumber,
      label: r.label,
      densityDelta: dHere - dPrev,
    };
  });

  const leadPartId = resolveMelodicPartId(score);
  const lead = score.parts.find((p) => p.id === leadPartId);
  const sigByBar: string[] = [];
  if (lead) {
    for (const m of lead.measures) {
      sigByBar.push(measureVoice1PitchSignature(m));
    }
  }
  const freq = new Map<string, number>();
  for (const s of sigByBar) {
    freq.set(s, (freq.get(s) ?? 0) + 1);
  }
  let uniqueBars = 0;
  for (const s of sigByBar) {
    if ((freq.get(s) ?? 0) === 1) uniqueBars++;
  }
  const melodicVarietyScore = sigByBar.length > 0 ? uniqueBars / sigByBar.length : 0;

  return {
    id: meta.id,
    format: meta.format,
    songwriterId: meta.songwriterId,
    gceScore,
    ...(meta.gceGateOverride !== undefined ? { gceGateOverride: meta.gceGateOverride } : {}),
    densityCurve,
    melodicRestSpans,
    sectionTransitions,
    drumNarrativeShape,
    melodicVarietyScore,
    ...(meta.intentTags?.length ? { intentTags: meta.intentTags } : {}),
    ...(meta.notes ? { notes: meta.notes } : {}),
  };
}

export interface PitchSequenceStreakOptions {
  /** 1-based inclusive; bars inside may repeat freely (default intro 1–4). */
  introExemptMaxBar?: number;
  /** When set, only these part ids are checked (otherwise all {@link isMelodicPartId} melodic parts). */
  partIdFilter?: Set<string>;
}

/**
 * Critical guard: >2 consecutive bars with identical voice-1 pitch sequence on any melodic part
 * (i.e. 3+ identical bars in a row) outside the intro exempt window → failure.
 */
export function validateMelodicPitchSequenceStreaks(
  score: ScoreModel,
  options?: PitchSequenceStreakOptions
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const exemptMax = options?.introExemptMaxBar ?? 4;
  const barCount = scoreBarCount(score);

  for (const part of score.parts) {
    if (options?.partIdFilter) {
      if (!options.partIdFilter.has(part.id)) continue;
    } else if (!isMelodicPartId(part.id)) {
      continue;
    }
    let prevSig = '\x00';
    let runLen = 0;
    for (let b = 1; b <= barCount; b++) {
      const m = part.measures[b - 1];
      const sig = m ? measureVoice1PitchSignature(m) : '';
      /* Rest-only / empty voice-1 — no pitch sequence to compare; breaks streak */
      if (sig === '') {
        prevSig = '\x00';
        runLen = 0;
        continue;
      }
      if (sig === prevSig) {
        runLen += 1;
      } else {
        runLen = 1;
        prevSig = sig;
      }
      /* Third consecutive identical bar lands here; intro bars 1–4 exempt */
      if (runLen === 3 && b > exemptMax) {
        failures.push(
          `melodic_pitch_sequence_streak: part ${part.id} three consecutive identical pitch sequences ending bar ${b}`
        );
      }
    }
  }

  return { pass: failures.length === 0, failures };
}

export interface ValidateStructuralOptions {
  /** When true, skip density/drum/variety/rest/section numeric comparison (still runs streak + bar count). */
  skipFingerprintNumericDiff?: boolean;
}

/** Declared validation buckets (failures array may list multiple instances of streak rule per part). */
export const GCE_STRUCTURAL_VALIDATION_RULE_IDS = [
  'bar_count',
  'density_curve',
  'drum_narrative_shape',
  'melodic_variety_score',
  'section_transition_density_delta',
  'melodic_rest_span_profile',
  'melodic_pitch_sequence_streak',
] as const;

export const GCE_STRUCTURAL_VALIDATION_RULE_COUNT = GCE_STRUCTURAL_VALIDATION_RULE_IDS.length;

export function validateAgainstFingerprint(
  score: ScoreModel,
  fingerprint: StructuralFingerprint,
  tolerance: number,
  options?: ValidateStructuralOptions
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const skipNumeric =
    options?.skipFingerprintNumericDiff === true ||
    tolerance === Number.POSITIVE_INFINITY ||
    tolerance === Number.NEGATIVE_INFINITY;

  const streak = validateMelodicPitchSequenceStreaks(score, { introExemptMaxBar: 4 });
  failures.push(...streak.failures);

  const cand = extractFingerprint(score, fingerprint.gceScore, {
    id: `${fingerprint.id}_candidate`,
    format: fingerprint.format,
    songwriterId: fingerprint.songwriterId,
    gceScore: fingerprint.gceScore,
    notes: 'candidate',
  });

  if (cand.densityCurve.length !== fingerprint.densityCurve.length) {
    failures.push(
      `bar_count: expected ${fingerprint.densityCurve.length} bars, got ${cand.densityCurve.length}`
    );
  }

  if (!skipNumeric && fingerprint.densityCurve.length === cand.densityCurve.length) {
    for (let i = 0; i < fingerprint.densityCurve.length; i++) {
      const a = fingerprint.densityCurve[i] ?? 0;
      const b = cand.densityCurve[i] ?? 0;
      if (Math.abs(a - b) > tolerance) {
        failures.push(`density_curve: bar ${i + 1} ref=${a.toFixed(4)} cand=${b.toFixed(4)} tol=${tolerance}`);
      }
    }

    if (fingerprint.drumNarrativeShape.length === cand.drumNarrativeShape.length) {
      for (let i = 0; i < fingerprint.drumNarrativeShape.length; i++) {
        const a = fingerprint.drumNarrativeShape[i] ?? 0;
        const b = cand.drumNarrativeShape[i] ?? 0;
        if (Math.abs(a - b) > tolerance) {
          failures.push(`drum_narrative_shape: bar ${i + 1} ref=${a} cand=${b} tol=${tolerance}`);
        }
      }
    }

    if (Math.abs(fingerprint.melodicVarietyScore - cand.melodicVarietyScore) > tolerance) {
      failures.push(
        `melodic_variety_score: ref=${fingerprint.melodicVarietyScore.toFixed(4)} cand=${cand.melodicVarietyScore.toFixed(4)}`
      );
    }

    if (fingerprint.sectionTransitions.length === cand.sectionTransitions.length) {
      for (let i = 0; i < fingerprint.sectionTransitions.length; i++) {
        const fr = fingerprint.sectionTransitions[i]!;
        const cr = cand.sectionTransitions[i]!;
        if (fr.barNumber !== cr.barNumber || fr.label !== cr.label) {
          failures.push(`section_transition: idx ${i} ref bar ${fr.barNumber}/${fr.label} vs cand ${cr.barNumber}/${cr.label}`);
        } else if (Math.abs(fr.densityDelta - cr.densityDelta) > tolerance) {
          failures.push(
            `section_transition_density_delta: bar ${fr.barNumber} ref=${fr.densityDelta.toFixed(4)} cand=${cr.densityDelta.toFixed(4)}`
          );
        }
      }
    } else {
      failures.push(
        `section_transition: expected ${fingerprint.sectionTransitions.length} marks, got ${cand.sectionTransitions.length}`
      );
    }

    if (fingerprint.melodicRestSpans.length === cand.melodicRestSpans.length) {
      for (let i = 0; i < fingerprint.melodicRestSpans.length; i++) {
        const fr = fingerprint.melodicRestSpans[i]!;
        const cr = cand.melodicRestSpans[i]!;
        if (fr.partId !== cr.partId) {
          failures.push(`melodic_rest_span: part order mismatch ref=${fr.partId} cand=${cr.partId}`);
          break;
        }
        if (Math.abs(fr.maxConsecutiveRestBars - cr.maxConsecutiveRestBars) > tolerance) {
          failures.push(
            `melodic_rest_span: ${fr.partId} maxRest ref=${fr.maxConsecutiveRestBars} cand=${cr.maxConsecutiveRestBars}`
          );
        }
      }
    }
  }

  return { pass: failures.length === 0, failures };
}

/** Steely Orbit V2.0 — primary fingerprint gate (5 independent checks vs Steely target reference + score metrics). */
export const STEELY_ORBIT_V2_FINGERPRINT_RULE_IDS = [
  'melodic_pitch_sequence_streak',
  'alto_rest_span',
  'density_eight_bar_vs_orbit_v6',
  'drum_narrative_variance_sixteen_bar',
  'section_transition_min_density_delta',
] as const;

export const STEELY_ORBIT_V2_FINGERPRINT_RULE_COUNT = STEELY_ORBIT_V2_FINGERPRINT_RULE_IDS.length;

/** Optional looser cap for 8-bar windows that overlap a transition span (e.g. Steely Orbit 57–64 drain vs V6 dense ending). */
export interface DensityEightBarTransitionZone {
  /** 1-based inclusive */
  startBar: number;
  endBar: number;
  maxMeanAbsDeviation: number;
}

function windowOverlapsBarSpan(windowStart1Based: number, windowEnd1Based: number, spanStart: number, spanEnd: number): boolean {
  return windowStart1Based <= spanEnd && windowEnd1Based >= spanStart;
}

/** Mean absolute deviation in any 8-bar window must stay ≤ cap (global or zone when window overlaps transition span). */
export function validateDensityEightBarVsReference(
  candidateDensity: number[],
  referenceDensity: number[],
  maxMeanAbsDeviation: number,
  transitionZone?: DensityEightBarTransitionZone | null
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const n = candidateDensity.length;
  if (n !== referenceDensity.length || n < 8) {
    failures.push(`density_eight_bar: length mismatch ref=${referenceDensity.length} cand=${n}`);
    return { pass: false, failures };
  }
  for (let s = 0; s <= n - 8; s++) {
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += Math.abs(candidateDensity[s + i]! - referenceDensity[s + i]!);
    }
    const meanAbs = sum / 8;
    const wStart = s + 1;
    const wEnd = s + 8;
    let cap = maxMeanAbsDeviation;
    if (
      transitionZone &&
      windowOverlapsBarSpan(wStart, wEnd, transitionZone.startBar, transitionZone.endBar)
    ) {
      cap = transitionZone.maxMeanAbsDeviation;
    }
    if (meanAbs > cap) {
      failures.push(
        `density_eight_bar: bars ${wStart}–${wEnd} mean_abs_dev=${meanAbs.toFixed(4)} > ${cap}` +
          (cap !== maxMeanAbsDeviation ? ` (transition_zone)` : '')
      );
    }
  }
  return { pass: failures.length === 0, failures };
}

function variancePopulation(vals: number[]): number {
  if (vals.length === 0) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  let s = 0;
  for (const v of vals) {
    const d = v - mean;
    s += d * d;
  }
  return s / vals.length;
}

/** Every 16-bar window must have drum voice-1 hit variance ≥ minVariance (flat if below). */
export function validateDrumVarianceSixteenBarSpans(
  drumShape: number[],
  minVariance: number
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (minVariance < 0) {
    return { pass: true, failures: [] };
  }
  const n = drumShape.length;
  if (n < 16) {
    failures.push(`drum_variance: need ≥16 bars, got ${n}`);
    return { pass: false, failures };
  }
  for (let s = 0; s <= n - 16; s++) {
    const w = drumShape.slice(s, s + 16);
    const v = variancePopulation(w);
    if (v < minVariance) {
      failures.push(
        `drum_variance: bars ${s + 1}–${s + 16} population_variance=${v.toFixed(6)} < ${minVariance}`
      );
    }
  }
  return { pass: failures.length === 0, failures };
}

/** Section rehearsal transitions must show |densityDelta| ≥ minAbs (Intro at bar 1 exempt). */
export function validateSectionTransitionsMinAbsoluteDelta(
  transitions: StructuralFingerprint['sectionTransitions'],
  minAbs: number
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (minAbs <= 0) {
    return { pass: true, failures: [] };
  }
  for (const t of transitions) {
    const introish = t.barNumber <= 1 || /^intro$/i.test(t.label.trim());
    if (introish) continue;
    if (Math.abs(t.densityDelta) < minAbs) {
      failures.push(
        `section_transition_delta: bar ${t.barNumber} "${t.label}" |Δ|=${Math.abs(t.densityDelta).toFixed(4)} < ${minAbs}`
      );
    }
  }
  return { pass: failures.length === 0, failures };
}

export interface SteelyOrbitV2FingerprintGateResult {
  pass: boolean;
  rules: Record<string, boolean>;
  failures: string[];
}

/** Optional subset for pitch-streak checks; omit from gate options to enforce **all** melodic BB parts. */
export const STEELY_ORBIT_V2_MELODY_STREAK_PART_IDS = new Set([
  'bb_alto_sax',
  'bb_tenor_sax',
  'bb_piano',
]);

/** Full Steely Orbit V2.0 gate vs structural reference fingerprint (e.g. `steely_orbit_target`) + derived candidate fingerprint. */
export function validateSteelyOrbitV2FingerprintGate(
  score: ScoreModel,
  orbitRef: StructuralFingerprint,
  options?: {
    densityEightBarMaxMeanAbs?: number;
    /** Looser 8-bar mean-abs cap for windows overlapping this span (Steely 57–64 drain vs Bill Evans dense tail). */
    densityTransitionZone?: DensityEightBarTransitionZone | null;
    drumSixteenBarMinVariance?: number;
    sectionMinAbsDensityDelta?: number;
    /** When set, limit pitch-sequence streak to these parts; omit for **all** melodic BB parts. */
    melodyStreakPartIds?: Set<string>;
    /** Turn off pitch-sequence streak (orchestration iteration hook). */
    disableMelodicPitchStreak?: boolean;
  }
): SteelyOrbitV2FingerprintGateResult {
  const tags = orbitRef.intentTags ?? [];
  const densityMax = options?.densityEightBarMaxMeanAbs ?? 0.4;
  const drumVarMin = options?.drumSixteenBarMinVariance ?? 0.05;
  let secMin = options?.sectionMinAbsDensityDelta ?? 0.1;
  if (tags.includes('constant_density')) {
    secMin = 0;
  }

  let densityTransitionZone = options?.densityTransitionZone ?? null;
  if (tags.includes('sparse_ending') && densityTransitionZone) {
    densityTransitionZone = {
      ...densityTransitionZone,
      maxMeanAbsDeviation: densityTransitionZone.maxMeanAbsDeviation + 0.15,
    };
  }

  const skipStreak = options?.disableMelodicPitchStreak === true;

  const rules: Record<string, boolean> = {
    melodic_pitch_sequence_streak: false,
    alto_rest_span: false,
    density_eight_bar_vs_orbit_v6: false,
    drum_narrative_variance_sixteen_bar: false,
    section_transition_min_density_delta: false,
  };
  const failures: string[] = [];

  const streakOpts: PitchSequenceStreakOptions = {
    introExemptMaxBar: 4,
    ...(options?.melodyStreakPartIds ? { partIdFilter: options.melodyStreakPartIds } : {}),
  };
  const streak = skipStreak
    ? { pass: true, failures: [] as string[] }
    : validateMelodicPitchSequenceStreaks(score, streakOpts);
  rules.melodic_pitch_sequence_streak = streak.pass;
  if (!streak.pass) failures.push(...streak.failures);

  const alto = auditAltoConsecutiveRestBars(score);
  rules.alto_rest_span = alto.ok;
  if (!alto.ok) failures.push(...alto.violations.map((v) => `alto_rest_span: ${v}`));

  const cand = extractFingerprint(score, orbitRef.gceScore, {
    id: `${orbitRef.id}_v2_candidate`,
    format: orbitRef.format,
    songwriterId: orbitRef.songwriterId,
    gceScore: orbitRef.gceScore,
  });

  if (cand.densityCurve.length !== orbitRef.densityCurve.length) {
    failures.push(
      `density_eight_bar: bar_count expected ${orbitRef.densityCurve.length} got ${cand.densityCurve.length}`
    );
    rules.density_eight_bar_vs_orbit_v6 = false;
  } else {
    const dens = validateDensityEightBarVsReference(
      cand.densityCurve,
      orbitRef.densityCurve,
      densityMax,
      densityTransitionZone
    );
    rules.density_eight_bar_vs_orbit_v6 = dens.pass;
    if (!dens.pass) failures.push(...dens.failures);
  }

  const drum = validateDrumVarianceSixteenBarSpans(cand.drumNarrativeShape, drumVarMin);
  rules.drum_narrative_variance_sixteen_bar = drum.pass;
  if (!drum.pass) failures.push(...drum.failures);

  const sec = validateSectionTransitionsMinAbsoluteDelta(cand.sectionTransitions, secMin);
  rules.section_transition_min_density_delta = sec.pass;
  if (!sec.pass) failures.push(...sec.failures);

  const pass = Object.values(rules).every(Boolean);

  return { pass, rules, failures };
}

function fingerprintsDir(): string {
  return path.resolve(__dirname, '../../gce-memory/fingerprints');
}

export function saveFingerprint(fp: StructuralFingerprint): void {
  const dir = fingerprintsDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${fp.id}.json`);
  fs.writeFileSync(file, `${JSON.stringify(fp, null, 2)}\n`, 'utf8');
}

export function loadFingerprint(id: string): StructuralFingerprint | null {
  const file = path.join(fingerprintsDir(), `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as StructuralFingerprint;
  } catch {
    return null;
  }
}

export function getBestFingerprint(format: string, songwriterId: string): StructuralFingerprint | null {
  const bid = getBestFingerprintId(format, songwriterId);
  if (!bid) return null;
  return loadFingerprint(bid);
}

/* --- MusicXML (Composer OS Big Band part ids) → ScoreModel for offline fingerprint seeding --- */

function extractXmlMeasures(inner: string): string[] {
  return inner.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
}

function parseNoteBlock(nb: string): {
  isRest: boolean;
  isChord: boolean;
  voice: number;
  durationTicks: number;
  midi: number | null;
} {
  const isChord = /<chord\s*\/>/.test(nb);
  const vm = nb.match(/<voice>(\d+)<\/voice>/i);
  const voice = vm ? parseInt(vm[1], 10) : 1;
  const dm = nb.match(/<duration>(\d+)<\/duration>/i);
  const durationTicks = dm ? parseInt(dm[1], 10) : 0;
  if (/<rest/.test(nb)) {
    return { isRest: true, isChord, voice, durationTicks, midi: null };
  }
  const unp = nb.match(/<unpitched>([\s\S]*?)<\/unpitched>/i);
  if (unp) {
    const sm = unp[1].match(/<display-step>([A-G])<\/display-step>/i);
    const om = unp[1].match(/<display-octave>(\d+)<\/display-octave>/i);
    if (sm && om) {
      const midi = pitchToMidi(sm[1], parseInt(om[1], 10), 0);
      return { isRest: false, isChord, voice, durationTicks, midi };
    }
  }
  const sm = nb.match(/<step>([A-G])<\/step>/i);
  const om = nb.match(/<octave>(\d+)<\/octave>/i);
  const am = nb.match(/<alter>(-?\d+)<\/alter>/i);
  if (!sm || !om) {
    return { isRest: false, isChord, voice, durationTicks, midi: null };
  }
  const alter = am ? parseInt(am[1], 10) : 0;
  const midi = pitchToMidi(sm[1], parseInt(om[1], 10), alter);
  return { isRest: false, isChord, voice, durationTicks, midi };
}

/** First `<harmony>` in measure → compact symbol for GCE (extended jazz tokens). */
function chordLabelFromMeasureHarmonyXml(measureXml: string): string | undefined {
  const block = measureXml.match(/<harmony>([\s\S]*?)<\/harmony>/i)?.[1];
  if (!block) return undefined;
  const rs = block.match(/<root-step>([A-G])<\/root-step>/i)?.[1];
  const ra = block.match(/<root-alter>(-?\d+)<\/root-alter>/i);
  let root = rs ?? '';
  if (rs && ra) {
    const a = parseInt(ra[1], 10);
    if (a === -1) root = `${rs}b`;
    else if (a === 1) root = `${rs}#`;
  }
  const kindText =
    block.match(/<kind[^>]*\s+text="([^"]*)"/i)?.[1]?.trim() ??
    block.match(/<kind[^>]*>([^<]+)<\/kind>/i)?.[1]?.trim() ??
    '';
  let suffix = kindText;
  if (!suffix) {
    const k = block.match(/<kind[^>]*>([^<]+)<\/kind>/i)?.[1]?.trim();
    if (k === 'major-seventh') suffix = 'maj7';
    else if (k === 'minor-seventh') suffix = 'm7';
    else if (k === 'dominant') suffix = '7';
    else if (k === 'major-minor') suffix = 'mM7';
    else if (k === 'half-diminished') suffix = 'm7b5';
    else if (k === 'diminished') suffix = 'dim';
    else if (k === 'suspended-fourth') suffix = 'sus4';
  }
  const bassStep = block.match(/<bass-step>([A-G])<\/bass-step>/i)?.[1];
  const bassAlt = block.match(/<bass-alter>(-?\d+)<\/bass-alter>/i);
  let slash = '';
  if (bassStep) {
    let bs = bassStep;
    if (bassAlt && parseInt(bassAlt[1], 10) === -1) bs = `${bassStep}b`;
    else if (bassAlt && parseInt(bassAlt[1], 10) === 1) bs = `${bassStep}#`;
    slash = `/${bs}`;
  }
  if (!root) return undefined;
  return `${root}${suffix}${slash}`;
}

function parseMeasureXmlToMeasureModel(measureXml: string, measureNumber: number): MeasureModel {
  const measure: MeasureModel = createMeasure(measureNumber);
  const chordLab = chordLabelFromMeasureHarmonyXml(measureXml);
  if (chordLab) measure.chord = chordLab;
  const noteBlocks = measureXml.match(/<note[\s\S]*?<\/note>/gi) ?? [];
  let tickCursor = 0;
  let lastAttackTick = 0;
  for (const nb of noteBlocks) {
    const p = parseNoteBlock(nb);
    if (p.voice !== 1) continue;
    const durBeats = p.durationTicks > 0 ? p.durationTicks / 480 : 0;
    if (p.isRest) {
      const startBeat = tickCursor / 480;
      addEvent(measure, createRest(startBeat, durBeats, 1));
      tickCursor += p.durationTicks;
      continue;
    }
    if (p.isChord) {
      if (p.midi != null) {
        const startBeat = lastAttackTick / 480;
        addEvent(measure, createNote(p.midi, startBeat, durBeats, 1));
      }
      continue;
    }
    if (p.midi != null) {
      lastAttackTick = tickCursor;
      const startBeat = tickCursor / 480;
      addEvent(measure, createNote(p.midi, startBeat, durBeats, 1));
      tickCursor += p.durationTicks;
    }
  }
  const rh = measureXml.match(/<rehearsal[^>]*>([^<]+)<\/rehearsal>/i);
  if (rh) {
    measure.rehearsalMark = rh[1].trim();
  }
  return measure;
}

function extractWorkTitle(xml: string): string {
  const m =
    xml.match(/<work-title>([^<]+)<\/work-title>/i) ??
    xml.match(/<movement-title>([^<]+)<\/movement-title>/i);
  return m?.[1]?.trim() ?? 'Imported';
}

/**
 * Parse Composer OS Big Band MusicXML (parts use ids `bb_*`) into a minimal ScoreModel.
 */
export function parseComposerOsBigBandMusicXml(xml: string): ScoreModel | null {
  const trimmed = xml.trim();
  if (!trimmed.includes('<score-partwise')) return null;
  const partBlocks = [...trimmed.matchAll(/<part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/gi)];
  const parts: PartModel[] = [];
  for (const m of partBlocks) {
    const id = m[1];
    const inner = m[2];
    if (!id.startsWith('bb_')) continue;
    const measuresXml = extractXmlMeasures(inner);
    const measures: MeasureModel[] = [];
    for (const mx of measuresXml) {
      const numM = mx.match(/<measure[^>]*number="(\d+)"/i);
      const measureNumber = numM ? parseInt(numM[1], 10) : measures.length + 1;
      measures.push(parseMeasureXmlToMeasureModel(mx, measureNumber));
    }
    const clef: 'treble' | 'bass' = id === 'bb_rhythm_section' ? 'bass' : 'treble';
    parts.push({
      id,
      name: id,
      instrumentIdentity: id,
      midiProgram: 0,
      clef,
      measures,
    });
  }
  if (parts.length === 0) return null;
  let maxBars = 0;
  for (const p of parts) {
    if (p.measures.length > maxBars) maxBars = p.measures.length;
  }
  for (const p of parts) {
    while (p.measures.length < maxBars) {
      const idx = p.measures.length + 1;
      p.measures.push(createMeasure(idx));
    }
  }
  return createScore(extractWorkTitle(trimmed), parts);
}

export function extractFingerprintFromMusicXmlFile(
  xmlPath: string,
  meta: StructuralFingerprintMeta,
  gceScore: number
): StructuralFingerprint | null {
  if (!fs.existsSync(xmlPath)) return null;
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const score = parseComposerOsBigBandMusicXml(xml);
  if (!score) return null;
  return extractFingerprint(score, gceScore, meta);
}
