/**
 * Duo engine V3.0 — melody authority: motif identity, phrase shape, endings, rhythm, memorability.
 */

import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { MotifTrackerState } from '../motif/motifTypes';
import type { CompositionContext } from '../compositionContext';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';
import {
  isSongModeHookFirstIdentity,
  partitionDuoIdentityIssues,
  type SongModeDuoIdentityIssue,
} from '../song-mode/songModeDuoIdentityBehaviourRules';

/** Local copy — avoids circular import with duoLockQuality (GCE imports this module). */
function maxConsecutiveStepwiseLocal(guitar: PartModel, maxStep: number): number {
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push((e as { pitch: number }).pitch);
    }
  }
  if (pitches.length < 2) return 0;
  let maxRun = 1;
  let run = 1;
  let dir = 0;
  for (let i = 1; i < pitches.length; i++) {
    const d = pitches[i] - pitches[i - 1];
    if (d === 0) continue;
    const ad = Math.abs(d);
    if (ad > maxStep) {
      run = 1;
      dir = Math.sign(d);
      continue;
    }
    const s = Math.sign(d);
    if (dir === 0 || s === dir) {
      run++;
      dir = s;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 2;
      dir = s;
    }
  }
  return maxRun;
}

function hasRepeatedIntervalCellLocal(guitar: PartModel): boolean {
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push((e as { pitch: number }).pitch);
    }
  }
  if (pitches.length < 4) return true;
  const adjs: number[] = [];
  for (let i = 1; i < pitches.length; i++) {
    adjs.push(Math.abs(pitches[i] - pitches[i - 1]) % 12);
  }
  const seen = new Set<number>();
  for (const iv of adjs) {
    if (iv === 0) continue;
    if (seen.has(iv)) return true;
    seen.add(iv);
  }
  return false;
}

export interface DuoMelodyIdentityV3Result {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: SongModeDuoIdentityIssue[];
}

function finalizeMelodyV3(
  issues: SongModeDuoIdentityIssue[],
  compositionContext: CompositionContext | undefined
): DuoMelodyIdentityV3Result {
  const songMode = isSongModeHookFirstIdentity(compositionContext);
  const { blocking, warnings } = partitionDuoIdentityIssues(issues, songMode);
  return {
    valid: blocking.length === 0,
    errors: blocking,
    warnings,
    issues,
  };
}

function guitarPart(score: ScoreModel): PartModel | undefined {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

/** Last sounding pitch in bar (by end time). */
function lastNotePitchInBar(m: MeasureModel | undefined): number | undefined {
  if (!m) return undefined;
  let best: { pitch: number; end: number } | undefined;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as { pitch: number; startBeat: number; duration: number };
    const end = n.startBeat + n.duration;
    if (!best || end >= best.end) best = { pitch: n.pitch, end };
  }
  return best?.pitch;
}

function userChordToneOpts(ctx?: CompositionContext) {
  return ctx && shouldUseUserChordSemanticsForTones(ctx) ? ({ lockedHarmony: true } as const) : undefined;
}

/** Allowed pitch classes for bar resolution: chord tones + tensions + semitone approaches (resolution colour). */
function allowedEndingPitchClasses(chord: string, ctx?: CompositionContext): Set<number> {
  const t = chordTonesForChordSymbol(chord, userChordToneOpts(ctx));
  const pcs = new Set<number>();
  const core: number[] = [t.root, t.third, t.fifth, t.seventh];
  for (const p of core) {
    pcs.add(((p % 12) + 12) % 12);
  }
  const rp = ((t.root % 12) + 12) % 12;
  const c = chord.replace(/\s/g, '');
  if (/alt|7b9|7#9|b9|#9/i.test(c)) {
    pcs.add((rp + 1) % 12);
    pcs.add((rp + 3) % 12);
  }
  if (/9|13|11|maj9|m9|-9/i.test(c)) {
    pcs.add((rp + 2) % 12);
  }
  const expanded = new Set<number>();
  for (const pc of pcs) {
    expanded.add(pc);
    expanded.add((pc + 1) % 12);
    expanded.add((pc + 11) % 12);
  }
  return expanded;
}

function barHasAcceptablePhraseEnd(
  m: MeasureModel | undefined,
  chord: string,
  ctx?: CompositionContext
): boolean {
  if (!m?.chord && !chord) return true;
  const ch = m?.chord ?? chord;
  const last = lastNotePitchInBar(m);
  if (last === undefined) return true;
  const allowed = allowedEndingPitchClasses(ch, ctx);
  return allowed.has(((last % 12) + 12) % 12);
}

/** Max pitch per bar (memorable peak); NaN for rest-only bars. */
function maxGuitarPitchByBar(guitar: PartModel, totalBars: number): number[] {
  const out: number[] = [];
  for (let b = 1; b <= totalBars; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    const notes = m?.events.filter((e) => e.kind === 'note') as { pitch: number }[] | undefined;
    if (!notes?.length) {
      out.push(NaN);
      continue;
    }
    out.push(Math.max(...notes.map((n) => n.pitch)));
  }
  return out;
}

/** Rise → peak → fall: register spread; first bar not the peak; cadence may sit high (swing phrasing). */
function hasGlobalMelodicContour(maxByBar: number[]): boolean {
  const finite = maxByBar.filter((x) => !Number.isNaN(x));
  if (finite.length < 4) return false;
  const hi = Math.max(...finite);
  const lo = Math.min(...finite);
  if (hi - lo < 1.0) return false;
  const first = finite[0];
  const last = finite[finite.length - 1];
  if (first >= hi - 0.08) return false;
  if (hi - lo >= 2.2) return true;
  return last < hi - 0.03 || last < first + 0.9;
}

/** Adjacent melodic intervals; count large leaps (>12 semitones) for singability. */
function largeLeapStats(guitar: PartModel): { maxLeap: number; countOver12: number } {
  const pitches: number[] = [];
  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    for (const e of [...m.events].sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    )) {
      if (e.kind === 'note') pitches.push((e as { pitch: number }).pitch);
    }
  }
  let maxLeap = 0;
  let countOver12 = 0;
  for (let i = 1; i < pitches.length; i++) {
    const d = Math.abs(pitches[i] - pitches[i - 1]);
    maxLeap = Math.max(maxLeap, d);
    if (d > 12) countOver12++;
  }
  return { maxLeap, countOver12 };
}

/** Max min–max span per bar (9th = 14 semitones). Allow one bar per 8 to exceed slightly (identity leap). */
function barPitchSpans(guitar: PartModel, totalBars: number): number[] {
  const spans: number[] = [];
  for (let b = 1; b <= totalBars; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    const notes = m?.events.filter((e) => e.kind === 'note') as { pitch: number }[] | undefined;
    if (!notes?.length) {
      spans.push(0);
      continue;
    }
    const ps = notes.map((n) => n.pitch);
    spans.push(Math.max(...ps) - Math.min(...ps));
  }
  return spans;
}

export function rhythmSigGuitar(m: MeasureModel): string {
  return [...m.events]
    .filter((e) => e.kind === 'note')
    .sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat)
    .map((e) => `${(e as { startBeat: number }).startBeat}:${(e as { duration: number }).duration}`)
    .join('|');
}

/** Primary motif in ≥75% of 2-bar phrases (each phrase must touch bars 2k+1 or 2k+2). */
export function phrasePrimaryMotifCoverage(motifState: MotifTrackerState): number {
  const primaryId = motifState.baseMotifs[0]?.id ?? 'm1';
  const phrases: [number, number][] = [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
  ];
  let hit = 0;
  for (const [a, b] of phrases) {
    const has = motifState.placements.some(
      (p) => p.motifId === primaryId && (p.startBar === a || p.startBar === b)
    );
    if (has) hit++;
  }
  return hit / 4;
}

/** Bar fingerprint: rhythm + interval pattern (for exact-repeat detection). */
export function barMelodicFingerprint(m: MeasureModel): string {
  const notes = m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number; duration: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  if (notes.length === 0) return '';
  const rh = notes.map((n) => `${n.startBeat}:${n.duration}`).join('|');
  const ints: number[] = [];
  for (let i = 1; i < notes.length; i++) ints.push(notes[i].pitch - notes[i - 1].pitch);
  return `${rh}#${ints.join(',')}`;
}

/** Max count of identical melodic fingerprints across bars (exact repetition). */
export function maxDuplicateBarFingerprints(guitar: PartModel): number {
  const sigs = new Map<string, number>();
  for (const m of guitar.measures) {
    const fp = barMelodicFingerprint(m);
    if (!fp) continue;
    sigs.set(fp, (sigs.get(fp) ?? 0) + 1);
  }
  let mx = 0;
  for (const c of sigs.values()) mx = Math.max(mx, c);
  return mx;
}

function maxPitchInBar(m: MeasureModel | undefined): number | undefined {
  if (!m) return undefined;
  let mx = -999;
  for (const e of m.events) {
    if (e.kind === 'note') mx = Math.max(mx, (e as { pitch: number }).pitch);
  }
  return mx < -900 ? undefined : mx;
}

/** Each 2-bar phrase: second bar peak ≥ first bar peak (melodic “lift” into phrase close). */
export function phrasePairPeaksRise(guitar: PartModel): boolean {
  for (let k = 0; k < 4; k++) {
    if (k === 3) continue;
    const m1 = guitar.measures.find((x) => x.index === 2 * k + 1);
    const m2 = guitar.measures.find((x) => x.index === 2 * k + 2);
    const max1 = maxPitchInBar(m1);
    const max2 = maxPitchInBar(m2);
    if (max1 === undefined || max2 === undefined) continue;
    if (max2 < max1 - 2.5) return false;
  }
  return true;
}

/** At most two local peaks within each 2-bar phrase window. */
export function phrasePeakCountOk(guitar: PartModel): boolean {
  for (let k = 0; k < 4; k++) {
    if (k === 3) continue;
    const notes: { pitch: number; t: number }[] = [];
    for (const bi of [2 * k + 1, 2 * k + 2]) {
      const m = guitar.measures.find((x) => x.index === bi);
      if (!m) continue;
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        const n = e as { pitch: number; startBeat: number; duration: number };
        notes.push({ pitch: n.pitch, t: bi * 4 + n.startBeat });
      }
    }
    notes.sort((a, b) => a.t - b.t);
    if (notes.length < 3) continue;
    let peaks = 0;
    for (let i = 1; i < notes.length - 1; i++) {
      if (notes[i].pitch > notes[i - 1].pitch && notes[i].pitch > notes[i + 1].pitch) peaks++;
    }
    if (peaks > 2) return false;
  }
  return true;
}

function isSyncopatedOnset(startBeat: number): boolean {
  const frac = ((startBeat % 1) + 1) % 1;
  return frac > 0.07 && frac < 0.93;
}

/** Phrase has at least one off-beat / fractional entry. */
export function phraseHasSyncopation(guitar: PartModel, phraseIndex: number): boolean {
  const b1 = phraseIndex * 2 + 1;
  const b2 = b1 + 1;
  for (const bi of [b1, b2]) {
    const m = guitar.measures.find((x) => x.index === bi);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const sb = (e as { startBeat: number }).startBeat;
      if (isSyncopatedOnset(sb)) return true;
    }
  }
  return false;
}

export function countPitchDirectionChanges(guitar: PartModel): number {
  const pitches: number[] = [];
  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    for (const e of [...m.events].sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    )) {
      if (e.kind === 'note') pitches.push((e as { pitch: number }).pitch);
    }
  }
  let ch = 0;
  let lastDir = 0;
  for (let i = 1; i < pitches.length; i++) {
    const d = pitches[i] - pitches[i - 1];
    if (d === 0) continue;
    const dir = Math.sign(d);
    if (lastDir !== 0 && dir !== lastDir) ch++;
    lastDir = dir;
  }
  return ch;
}

export function anchorPitchClassHits(guitar: PartModel, anchorPc: number | undefined): number {
  if (anchorPc === undefined) return 0;
  const pc = ((anchorPc % 12) + 12) % 12;
  let n = 0;
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const p = (e as { pitch: number }).pitch;
      if (((p % 12) + 12) % 12 === pc) n++;
    }
  }
  return n;
}

export function hasRepeatedRhythmCell(guitar: PartModel): boolean {
  const sigs = new Map<string, number>();
  for (const m of guitar.measures) {
    const r = rhythmSigGuitar(m);
    if (!r) continue;
    sigs.set(r, (sigs.get(r) ?? 0) + 1);
  }
  for (const c of sigs.values()) if (c >= 2) return true;
  return false;
}

/**
 * V3.0 validation for guitar_bass_duo golden path.
 * Melody authority: motif coverage, contour, singability, phrase shape, endings, rhythm, memorability.
 */
export function validateDuoMelodyIdentityV3(
  score: ScoreModel,
  motifState?: MotifTrackerState,
  opts?: { presetId?: string; compositionContext?: CompositionContext }
): DuoMelodyIdentityV3Result {
  const empty = finalizeMelodyV3([], opts?.compositionContext);
  if (opts?.presetId === 'ecm_chamber') return empty;
  const g = guitarPart(score);
  if (!g) return empty;

  const totalBars = g.measures.length;
  if (totalBars < 8) return empty;

  const issues: SongModeDuoIdentityIssue[] = [];

  if (motifState?.placements?.length) {
    const cov = phrasePrimaryMotifCoverage(motifState);
    if (cov < 0.75) {
      issues.push({
        ruleId: 'v3_motif_coverage_low',
        message: `Duo V3: primary motif must appear in ≥75% of 2-bar phrases (${(cov * 100).toFixed(0)}%)`,
      });
    }
  } else {
    issues.push({ ruleId: 'v3_motif_placements_missing', message: 'Duo V3: motif placements missing' });
  }

  const nOriginalPlacements =
    motifState?.placements.filter((p) => p.variant === 'original').length ?? 0;
  if (maxDuplicateBarFingerprints(g) < 2 && nOriginalPlacements < 2) {
    issues.push({
      ruleId: 'v3_exact_repetition_required',
      message: 'Duo V3: exact melodic repetition required at least twice',
    });
  }

  const maxByBar = maxGuitarPitchByBar(g, totalBars);
  if (!hasGlobalMelodicContour(maxByBar)) {
    issues.push({
      ruleId: 'v3_contour_rise_peak_fall',
      message: 'Duo V3: melody lacks rise → peak → fall contour',
    });
  }

  const { maxLeap, countOver12 } = largeLeapStats(g);
  if (maxLeap > 14) {
    issues.push({
      ruleId: 'v3_leap_exceeds_max',
      message: 'Duo V3: interval leap exceeds expressive maximum (14 semitones)',
    });
  }
  if (countOver12 > 1) {
    issues.push({
      ruleId: 'v3_multiple_large_leaps',
      message: 'Duo V3: more than one large leap (>12 semitones) — line not singable',
    });
  }

  const scalarRun = maxConsecutiveStepwiseLocal(g, 2);
  if (scalarRun > 4) {
    issues.push({
      ruleId: 'v3_scale_run_too_long',
      message: 'Duo V3: scale run exceeds 4 consecutive stepwise notes',
    });
  }

  const spans = barPitchSpans(g, totalBars);
  let wideBars = 0;
  for (const s of spans) {
    if (s > 14) wideBars++;
  }
  if (wideBars > 1) {
    issues.push({
      ruleId: 'v3_range_exceeds_ninth_multi_bar',
      message: 'Duo V3: melodic range exceeds a 9th in more than one bar',
    });
  }

  for (let b = 1; b <= totalBars; b++) {
    const m = g.measures.find((x) => x.index === b);
    const ch = m?.chord ?? '';
    if (!barHasAcceptablePhraseEnd(m, ch, opts?.compositionContext)) {
      issues.push({
        ruleId: 'v3_phrase_end_not_chord_tone',
        message: `Duo V3: bar ${b} phrase end is not a chord tone or strong tension`,
      });
      break;
    }
  }

  for (let k = 0; k < 4; k++) {
    if (!phraseHasSyncopation(g, k)) {
      issues.push({
        ruleId: 'v3_syncopation_required',
        message: `Duo V3: phrase ${k + 1} needs at least one syncopated entry`,
      });
      break;
    }
  }

  const anchorPc = motifState?.baseMotifs[0]?.notes[0]?.pitch;
  const anchorHits = anchorPitchClassHits(g, anchorPc);
  const repRhythm = hasRepeatedRhythmCell(g);
  const repIntervals = hasRepeatedIntervalCellLocal(g);
  if (anchorHits < 3 && !repRhythm && !repIntervals) {
    issues.push({
      ruleId: 'v3_memorability_weak',
      message: 'Duo V3: memorability weak (anchor, rhythm cell, or interval cell)',
    });
  }

  const dirCh = countPitchDirectionChanges(g);
  /** 8-bar slice (behaviour gates) allows 20 after eighth-beat rhythm; long-form scales with bar count. */
  const maxDirChanges = totalBars <= 8 ? 20 : Math.round(16 * (totalBars / 8) * 1.25);
  if (dirCh > maxDirChanges) {
    issues.push({
      ruleId: 'v3_zigzag_too_often',
      message: 'Duo V3: melody zig-zags too often (no clear line)',
    });
  }

  return finalizeMelodyV3(issues, opts?.compositionContext);
}

/** 0–1.2 layer for GCE: motif clarity, phrase contour, memorability (score-only). */
export function melodyAuthorityGceLayer(guitar: PartModel): number {
  let x = 0;
  if (phrasePairPeaksRise(guitar)) x += 0.38;
  if (phrasePeakCountOk(guitar)) x += 0.22;
  x += Math.min(0.42, 0.21 * maxDuplicateBarFingerprints(guitar));
  if (hasRepeatedRhythmCell(guitar)) x += 0.24;
  return Math.min(1.2, x);
}
