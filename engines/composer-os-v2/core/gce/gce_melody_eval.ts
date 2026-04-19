/**
 * Real GCE melody evaluator. Score 0-10. Hard fail rules cap at 6.0.
 */

export interface MelodicNote {
  midi: number;
  beats: number;
  bar: number;
  beat: number;
  rest?: boolean;
}

export interface EvalContext {
  chords?: Array<{ bar: number; pitchClasses: number[] }>;
  keyCenter?: number;
  beatsPerBar?: number;
  /** Flugelhorn: register 58-74, 25%+ rests */
  flugelhorn?: boolean;
}

export interface EvalResult {
  score: number;
  reasons: string[];
}

export function evaluateMelody(line: MelodicNote[], context: EvalContext = {}): EvalResult {
  const reasons: string[] = [];
  let score = 0;

  const notes = line.filter((e) => !e.rest && e.midi > 0);
  const rests = line.filter((e) => e.rest || e.midi === 0);

  if (notes.length === 0) {
    return { score: 0, reasons: ['No notes'] };
  }

  const pitches = notes.map((n) => n.midi);
  const beatsPerBar = context.beatsPerBar ?? 3;

  let hardFail = false;

  if (rests.length === 0) {
    hardFail = true;
    reasons.push('No rests at all');
  }

  const motifScore = scoreMotifCoherence(pitches);
  if (motifScore.score < 0.5 && notes.length >= 8) {
    hardFail = true;
    reasons.push('No motif recurrence');
  }

  const equalRun = countEqualDurationRun(notes);
  if (equalRun > beatsPerBar * 2) {
    hardFail = true;
    reasons.push('> 2 bars uninterrupted equal-duration notes');
  }

  const period = detectPeriodicity(pitches);
  if (period > 0 && pitches.length >= period * 2) {
    hardFail = true;
    reasons.push('Perfectly periodic repetition (symmetry fetish)');
  }

  const scaleLike = isScaleLike(pitches);
  if (scaleLike) {
    hardFail = true;
    reasons.push('Looks like raw scale/pattern printout');
  }

  score += motifScore.score;
  reasons.push(...motifScore.reasons);

  const rhythmScore = scoreRhythmSpace(line, notes, rests, context);
  score += rhythmScore.score;
  reasons.push(...rhythmScore.reasons);

  const contourScore = scoreContour(pitches, context.flugelhorn);
  score += contourScore.score;
  reasons.push(...contourScore.reasons);

  const harmScore = scoreHarmonicGravity(pitches, context);
  score += harmScore.score;
  reasons.push(...harmScore.reasons);

  const ecmScore = scoreEcmSuitability(line, notes, context.flugelhorn);
  score += ecmScore.score;
  reasons.push(...ecmScore.reasons);

  if (hardFail) {
    score = Math.min(6, score);
    reasons.push('[HARD FAIL - score capped at 6]');
  }
  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  if (reasons.length === 0) reasons.push('OK');
  return { score, reasons };
}

function scoreMotifCoherence(pitches: number[]): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  if (pitches.length < 6) return { score: 0, reasons: ['Too short for motif'] };

  const cellLen = Math.min(5, Math.max(3, Math.floor(pitches.length / 6)));
  const cell = pitches.slice(0, cellLen).map((p) => p % 12);
  let recurrences = 0;
  for (let i = cellLen; i <= pitches.length - cellLen; i++) {
    const seg = pitches.slice(i, i + cellLen).map((p) => p % 12);
    const match = cell.every((c, j) => Math.abs((seg[j]! - c + 12) % 12) <= 4);
    if (match) recurrences++;
  }
  if (recurrences >= 3) {
    return { score: 2, reasons: ['Motif returns 3+ times with variation'] };
  }
  if (recurrences >= 2) {
    return { score: 1.5, reasons: ['Motif returns with variation'] };
  }
  if (recurrences >= 1) {
    return { score: 1, reasons: ['Some motif recurrence'] };
  }
  return { score: 0, reasons: ['No motif recurrence'] };
}

function scoreRhythmSpace(
  line: MelodicNote[],
  notes: MelodicNote[],
  rests: MelodicNote[],
  context?: { flugelhorn?: boolean }
): { score: number; reasons: string[] } {
  const ctx = context ?? {};
  const reasons: string[] = [];
  let score = 0;
  const restBeats = rests.reduce((s, r) => s + r.beats, 0);
  const noteBeats = notes.reduce((s, n) => s + n.beats, 0);
  const totalBeats = restBeats + noteBeats;
  const restRatio = totalBeats > 0 ? restBeats / totalBeats : 0;

  const minRest = ctx.flugelhorn ? 0.25 : 0.12;
  if (restRatio >= minRest && restRatio <= 0.55) {
    score += 1;
    reasons.push(ctx.flugelhorn ? 'Breath/rest ratio (25%+)' : 'Good rest ratio');
  } else if (restRatio >= (ctx.flugelhorn ? 0.15 : 0.06)) {
    score += 0.5;
    reasons.push('Some rests present');
  }

  const held = notes.filter((n) => n.beats >= 2).length;
  if (held >= 1) {
    score += 0.5;
    reasons.push('Held notes present');
  }

  const durs = notes.map((n) => n.beats);
  const variety = new Set(durs.map((d) => Math.round(d * 4))).size;
  if (variety >= 2) {
    score += 0.5;
    reasons.push('Rhythmic variety');
  }

  return { score: Math.min(2, score), reasons };
}

function scoreContour(pitches: number[], flugelhorn?: boolean): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const minP = Math.min(...pitches);
  const maxP = Math.max(...pitches);
  const range = maxP - minP;

  if (flugelhorn) {
    if (minP >= 58 && maxP <= 74) {
      score += 1;
      reasons.push('Flugelhorn register (58-74)');
    }
  } else if (range >= 3 && range <= 14) {
    score += 1;
    reasons.push('Singable range');
  }

  const leaps = pitches.filter((_, i) => i > 0 && Math.abs(pitches[i]! - pitches[i - 1]!) > 3).length;
  if (leaps >= 1 && leaps <= 5) {
    score += 1;
    reasons.push('Controlled leaps');
  } else if (leaps === 0 && pitches.length > 10) {
    score -= 0.5;
    reasons.push('No leaps, scale-like');
  }

  return { score: Math.max(0, score), reasons };
}

function scoreHarmonicGravity(pitches: number[], ctx: EvalContext): { score: number; reasons: string[] } {
  const pcs = pitches.map((p) => ((p % 12) + 12) % 12);
  const stable = [0, 2, 3, 4, 5, 7, 9, 10];
  const count = pcs.filter((p) => stable.includes(p)).length;
  const ratio = count / pcs.length;
  if (ratio >= 0.75) return { score: 2, reasons: ['Strong pitch gravity'] };
  if (ratio >= 0.6) return { score: 1.5, reasons: ['Pitch gravity consistent'] };
  if (ratio >= 0.5) return { score: 1, reasons: ['Adequate harmonic targeting'] };
  return { score: 0.5, reasons: ['Chromatic drift'] };
}

function scoreEcmSuitability(line: MelodicNote[], notes: MelodicNote[], flugelhorn?: boolean): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  if (notes.length >= 6 && notes.length <= 35) {
    score += 0.5;
    reasons.push('Composed density');
  }
  const held = notes.filter((n) => n.beats >= 1.5).length;
  if (held >= 1) {
    score += 0.5;
    reasons.push('Held notes');
  }
  if (notes.length >= 4 && notes.length <= 45) {
    score += 1;
    reasons.push(flugelhorn ? 'ECM warmth / flugelhorn suitability' : 'ECM suitability');
  }
  return { score: Math.min(2, score), reasons };
}

function countEqualDurationRun(notes: MelodicNote[]): number {
  if (notes.length < 2) return 0;
  let maxRunBeats = 0;
  let runBeats = notes[0]!.beats;
  let lastDur = notes[0]!.beats;
  for (let i = 1; i < notes.length; i++) {
    const d = notes[i]!.beats;
    if (Math.abs(d - lastDur) < 0.01) {
      runBeats += d;
    } else {
      if (runBeats > maxRunBeats) maxRunBeats = runBeats;
      runBeats = d;
      lastDur = d;
    }
  }
  return Math.max(maxRunBeats, runBeats);
}

function detectPeriodicity(seq: number[]): number {
  for (let p = 1; p <= Math.floor(seq.length / 2); p++) {
    let ok = true;
    for (let i = p; i < seq.length && ok; i++) {
      if (seq[i] !== seq[i % p]) ok = false;
    }
    if (ok) return p;
  }
  return 0;
}

function isScaleLike(pitches: number[]): boolean {
  if (pitches.length < 10) return false;
  const leaps = pitches.filter((_, i) => i > 0 && Math.abs(pitches[i]! - pitches[i - 1]!) > 3).length;
  return leaps === 0;
}
