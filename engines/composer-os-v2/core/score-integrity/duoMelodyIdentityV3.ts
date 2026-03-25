/**
 * Duo engine V3.0 — melody identity: primary motif coverage, contour, singability, phrase endings.
 */

import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { MotifTrackerState } from '../motif/motifTypes';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { maxConsecutiveStepwiseMotion } from './duoLockQuality';

export interface DuoMelodyIdentityV3Result {
  valid: boolean;
  errors: string[];
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

/** Allowed pitch classes for bar resolution: chord tones + tensions + semitone approaches (resolution colour). */
function allowedEndingPitchClasses(chord: string): Set<number> {
  const t = chordTonesForChordSymbol(chord);
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

function barHasAcceptablePhraseEnd(m: MeasureModel | undefined, chord: string): boolean {
  if (!m?.chord && !chord) return true;
  const ch = m?.chord ?? chord;
  const last = lastNotePitchInBar(m);
  if (last === undefined) return true;
  const allowed = allowedEndingPitchClasses(ch);
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
  if (hi - lo < 2.0) return false;
  const first = finite[0];
  const last = finite[finite.length - 1];
  if (first >= hi - 0.18) return false;
  if (hi - lo >= 2.6) return true;
  return last < hi - 0.05 || last < first + 1.2;
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

/**
 * V3.0 validation for guitar_bass_duo golden path.
 * Rejects: weak motif reuse, no contour, unsingable leaps, long scalar runs, bad phrase ends.
 */
export function validateDuoMelodyIdentityV3(
  score: ScoreModel,
  motifState?: MotifTrackerState,
  opts?: { presetId?: string }
): DuoMelodyIdentityV3Result {
  const errors: string[] = [];
  if (opts?.presetId === 'ecm_chamber') return { valid: true, errors: [] };
  const g = guitarPart(score);
  if (!g) return { valid: true, errors: [] };

  const totalBars = g.measures.length;
  if (totalBars < 8) return { valid: true, errors: [] };

  if (motifState?.placements?.length) {
    const primaryId = motifState.baseMotifs[0]?.id ?? 'm1';
    const barsWithPrimary = new Set(
      motifState.placements.filter((p) => p.motifId === primaryId).map((p) => p.startBar)
    );
    const ratio = barsWithPrimary.size / totalBars;
    if (ratio < 0.69) {
      errors.push(
        `Duo V3: primary motif must appear in ≥70% of bars (${barsWithPrimary.size}/${totalBars})`
      );
    }
  } else {
    errors.push('Duo V3: motif placements missing');
  }

  const maxByBar = maxGuitarPitchByBar(g, totalBars);
  if (!hasGlobalMelodicContour(maxByBar)) {
    errors.push('Duo V3: melody lacks rise → peak → fall contour');
  }

  const { maxLeap, countOver12 } = largeLeapStats(g);
  if (maxLeap > 14) {
    errors.push('Duo V3: interval leap exceeds expressive maximum (14 semitones)');
  }
  if (countOver12 > 1) {
    errors.push('Duo V3: more than one large leap (>12 semitones) — line not singable');
  }

  const scalarRun = maxConsecutiveStepwiseMotion(g, 2);
  if (scalarRun > 5) {
    errors.push('Duo V3: scale run exceeds 5 consecutive stepwise notes');
  }

  const spans = barPitchSpans(g, totalBars);
  let wideBars = 0;
  for (const s of spans) {
    if (s > 14) wideBars++;
  }
  if (wideBars > 1) {
    errors.push('Duo V3: melodic range exceeds a 9th in more than one bar');
  }

  for (let b = 1; b <= totalBars; b++) {
    const m = g.measures.find((x) => x.index === b);
    const ch = m?.chord ?? '';
    if (!barHasAcceptablePhraseEnd(m, ch)) {
      errors.push(`Duo V3: bar ${b} phrase end is not a chord tone or strong tension`);
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}
