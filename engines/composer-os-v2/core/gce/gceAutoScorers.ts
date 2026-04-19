import type { MelodicNote } from './gce_melody_eval';
import type { FormMap } from '../compositionContext';
import type { NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

/** Mirror **`uprightBassProfile`** hard range — inlined to avoid any module-init edge cases in GCE-only imports. */
const UPRIGHT_BASS_HARD_LOW = 28;
const UPRIGHT_BASS_HARD_HIGH = 55;

/** Section slice for GCE Structure & Form (aligned with `FormMap` / lead sheet conventions). */
export interface GceStructureSection {
  label: string;
  barStart: number;
  barEnd: number;
  role: string;
}

export function gceSectionsFromFormMap(form: FormMap): GceStructureSection[] {
  return form.sections.map((s) => ({
    label: s.label,
    barStart: s.startBar,
    barEnd: s.startBar + s.length - 1,
    role: s.label,
  }));
}

export interface CategoryScore {
  score: number;
  justification: string;
}

export function scoreMelodicIdentity(line: MelodicNote[]): CategoryScore {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  if (notes.length < 4) {
    return { score: 0, justification: 'Too few notes' };
  }

  const pitches = notes.map((n) => n.midi);

  const uniquePitchCount = new Set(pitches).size;
  const pitchClassCount = new Set(pitches.map((p) => p % 12)).size;

  // R — motif recurrence (sliding windows, pitch-class interval vectors)
  const windowSize = 4;
  const windows: number[][] = [];
  for (let i = 0; i <= pitches.length - windowSize; i++) {
    const win = pitches.slice(i, i + windowSize);
    const intervals = win.slice(1).map((p, j) => (((p - win[j]!) % 12) + 12) % 12);
    windows.push(intervals);
  }
  let recurrences = 0;
  for (let i = 0; i < windows.length; i++) {
    for (let j = i + 2; j < windows.length; j++) {
      const match = windows[i]!.every((iv, k) => Math.abs(iv - windows[j]![k]!) <= 2);
      if (match) {
        recurrences++;
        break;
      }
    }
  }
  const motifRecurrence =
    windows.length > 0 ? Math.min(recurrences / (windows.length * 0.4), 1) : 0;

  // C — contour compression (U/D/S entropy; lower entropy → more directed contour)
  const contour = pitches.slice(1).map((p, i) =>
    p > pitches[i]! ? 'U' : p < pitches[i]! ? 'D' : 'S'
  );
  const counts = { U: 0, D: 0, S: 0 };
  for (const c of contour) counts[c as 'U' | 'D' | 'S']++;
  const total = contour.length;
  let entropy = 0;
  for (const k of ['U', 'D', 'S'] as const) {
    const p = counts[k] / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(3);
  let contourCompression = 1 - entropy / maxEntropy;

  const pitchMean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
  const pitchVariance =
    pitches.reduce((s, p) => s + Math.pow(p - pitchMean, 2), 0) / pitches.length;
  const pitchStddev = Math.sqrt(pitchVariance);
  /** Flat / single repeated pitch: entropy favours “all same” → treat as no contour. */
  if (pitchStddev < 1.0) {
    contourCompression = 0;
  }

  // I — interval economy
  const stepIntervals = pitches.slice(1).map((p, i) => Math.abs(p - pitches[i]!));
  const uniqueIntervals = new Set(stepIntervals.map((iv) => Math.min(iv, 12))).size;
  let intervalEconomy = 1 - Math.min(uniqueIntervals / 10, 1);
  if (uniqueIntervals <= 1) {
    intervalEconomy = 0;
  }

  // G — register cohesion
  const registerCohesion = 1 - Math.min(pitchStddev / 12, 1);

  const rawScore =
    10 *
    (0.35 * motifRecurrence +
      0.25 * contourCompression +
      0.2 * intervalEconomy +
      0.2 * registerCohesion);

  let score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));

  if (uniquePitchCount <= 2) {
    return {
      score: Math.min(2, score),
      justification: 'HARD FAIL — insufficient pitch variety',
    };
  }
  if (pitchClassCount <= 2) {
    return {
      score: Math.min(3, score),
      justification: 'HARD FAIL — insufficient pitch class variety',
    };
  }

  const hardFail = motifRecurrence < 0.35;

  return {
    score: hardFail ? Math.min(score, 6) : score,
    justification:
      `motif recurrence ${(motifRecurrence * 10).toFixed(1)}, ` +
      `contour ${(contourCompression * 10).toFixed(1)}, ` +
      `interval economy ${(intervalEconomy * 10).toFixed(1)}, ` +
      `register cohesion ${(registerCohesion * 10).toFixed(1)}` +
      (hardFail ? ' [HARD FAIL]' : ''),
  };
}

export function scoreHarmonyAndLanguage(chords: string[]): CategoryScore {
  if (!chords || chords.length === 0) {
    return { score: 0, justification: 'No chords' };
  }

  const extendedPatterns = [
    /maj7/i,
    /maj9/i,
    /maj11/i,
    /maj13/i,
    /m7/i,
    /m9/i,
    /m11/i,
    /m13/i,
    /mmaj/i,
    /7alt/i,
    /7#/i,
    /7b/i,
    /#11/i,
    /b9/i,
    /#9/i,
    /b13/i,
    /13sus/i,
    /13/i,
    /11/i,
    /sus4/i,
    /sus2/i,
    /add9/i,
    /add11/i,
    /6\/9/i,
    /6-9/i,
    /dim7/i,
    /m7b5/i,
    /maj6/i,
    /\/[A-G]/, // slash chords
  ];

  const plainTriadPattern = /^[A-G][#b]?m?$/;

  let extendedCount = 0;
  let plainCount = 0;
  let repeatedRunCount = 0;
  let consecutiveSame = 1;

  for (let i = 0; i < chords.length; i++) {
    const c = chords[i] ?? '';
    const isExtended = extendedPatterns.some((p) => p.test(c));
    const isPlain = plainTriadPattern.test(c.trim());

    if (isExtended) extendedCount++;
    else if (isPlain) plainCount++;

    if (i > 0 && c === chords[i - 1]) {
      consecutiveSame++;
      if (consecutiveSame >= 4) repeatedRunCount++;
    } else {
      consecutiveSame = 1;
    }
  }

  const total = chords.length;
  const extendedRatio = extendedCount / total;
  const plainPenalty = plainCount / total;
  const repetitionPenalty = Math.min(repeatedRunCount / total, 0.3);

  const uniqueRoots = new Set(
    chords.map((c) => c.match(/^[A-G][#b]?/)?.[0] ?? '')
  ).size;
  const varietyScore = Math.min(uniqueRoots / 8, 1);

  const rawScore =
    extendedRatio * 6 +
    varietyScore * 2 +
    (1 - plainPenalty) * 1.5 -
    repetitionPenalty * 2;

  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  const justification =
    `${extendedCount}/${total} extended chords, ` +
    `${uniqueRoots} unique roots, ` +
    `${plainCount} plain triads`;

  return { score, justification };
}

export function scoreRhythmicIdentity(line: MelodicNote[]): CategoryScore {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  if (notes.length === 0) {
    return { score: 0, justification: 'No notes' };
  }

  // IOI variety — normalized entropy of durations
  const durBuckets = new Map<number, number>();
  for (const n of notes) {
    const bucket = Math.round(n.beats * 4);
    durBuckets.set(bucket, (durBuckets.get(bucket) ?? 0) + 1);
  }
  const total = notes.length;
  let entropy = 0;
  for (const count of durBuckets.values()) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(Math.max(durBuckets.size, 1));
  const ioiVariety = maxEntropy > 0 ? Math.min(entropy / maxEntropy, 1) : 0;

  // Syncopation — offbeat attacks (beat not integer)
  const offbeat = notes.filter((n) => {
    const b = n.beat % 1;
    return b > 0.1 && b < 0.9;
  }).length;
  const syncopation = Math.min(offbeat / total, 1);

  // Rhythm motif recurrence — repeated duration 3-grams
  const durations = notes.map((n) => Math.round(n.beats * 4));
  let matches = 0;
  const grams = new Map<string, number>();
  for (let i = 0; i <= durations.length - 3; i++) {
    const key = durations.slice(i, i + 3).join(',');
    grams.set(key, (grams.get(key) ?? 0) + 1);
  }
  for (const count of grams.values()) {
    if (count >= 2) matches++;
  }
  const rhythmMotif = Math.min(matches / Math.max(grams.size, 1), 1);

  // Groove stability — consistency of attacks per bar
  const barAttacks = new Map<number, number>();
  for (const n of notes) {
    barAttacks.set(n.bar, (barAttacks.get(n.bar) ?? 0) + 1);
  }
  const attackCounts = [...barAttacks.values()];
  const mean = attackCounts.reduce((a, b) => a + b, 0) / attackCounts.length;
  const variance =
    attackCounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / attackCounts.length;
  const stddev = Math.sqrt(variance);
  const grooveStability = Math.max(0, 1 - Math.min(stddev / mean, 1));

  const rawScore =
    10 *
    (0.25 * ioiVariety + 0.3 * syncopation + 0.25 * rhythmMotif + 0.2 * grooveStability);

  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));

  const hardFail = syncopation < 0.15 && rhythmMotif < 0.2;

  return {
    score: hardFail ? Math.min(score, 6) : score,
    justification:
      `IOI variety ${(ioiVariety * 10).toFixed(1)}, ` +
      `syncopation ${(syncopation * 100).toFixed(0)}%, ` +
      `rhythm motif ${(rhythmMotif * 10).toFixed(1)}, ` +
      `groove ${(grooveStability * 10).toFixed(1)}` +
      (hardFail ? ' [HARD FAIL]' : ''),
  };
}

export function scoreStructureAndForm(
  _score: ScoreModel,
  chords: string[],
  sections: GceStructureSection[]
): CategoryScore {
  void _score;
  if (!sections || sections.length < 2) {
    return { score: 4, justification: 'Insufficient section data' };
  }

  // Adjacent contrast — distinct section roles
  const roles = sections.map((s) => s.role);
  const uniqueRoles = new Set(roles).size;
  const adjacentChanges = roles.filter((r, i) => i > 0 && r !== roles[i - 1]).length;
  const adjacentContrast = Math.min(adjacentChanges / (sections.length - 1), 1);

  // Return consistency — same-role sections have similar chord content
  const roleGroups = new Map<string, string[][]>();
  for (const sec of sections) {
    const secChords = chords.slice(sec.barStart - 1, sec.barEnd);
    if (!roleGroups.has(sec.role)) roleGroups.set(sec.role, []);
    roleGroups.get(sec.role)!.push(secChords);
  }
  const consistencyScores: number[] = [];
  for (const [, groups] of roleGroups) {
    if (groups.length < 2) continue;
    for (let i = 1; i < groups.length; i++) {
      const a = new Set(groups[0]);
      const b = new Set(groups[i]);
      const intersection = [...a].filter((c) => b.has(c)).length;
      const union = new Set([...a, ...b]).size;
      consistencyScores.push(union > 0 ? intersection / union : 0);
    }
  }
  const returnConsistency =
    consistencyScores.length > 0
      ? consistencyScores.reduce((x, y) => x + y, 0) / consistencyScores.length
      : 0.5;

  // Boundary strength — chord changes at section boundaries
  let boundaryChanges = 0;
  for (const sec of sections) {
    const boundaryBar = sec.barStart - 1;
    if (boundaryBar > 0 && boundaryBar < chords.length) {
      if (chords[boundaryBar] !== chords[boundaryBar - 1]) {
        boundaryChanges++;
      }
    }
  }
  const boundaryStrength = Math.min(boundaryChanges / sections.length, 1);

  const rawScore =
    10 *
    (0.35 * adjacentContrast + 0.35 * returnConsistency + 0.3 * boundaryStrength);

  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));

  const hardFail = adjacentContrast < 0.2;

  return {
    score: hardFail ? Math.min(score, 4) : score,
    justification:
      `${uniqueRoles} distinct roles, ` +
      `${adjacentChanges}/${sections.length - 1} adjacent changes, ` +
      `return consistency ${(returnConsistency * 10).toFixed(1)}, ` +
      `boundary strength ${(boundaryStrength * 10).toFixed(1)}` +
      (hardFail ? ' [HARD FAIL - no contrast]' : ''),
  };
}

export function scoreEconomyAndFocus(line: MelodicNote[]): CategoryScore {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  const totalBars = Math.max(...line.map((n) => n.bar), 1);
  const density = notes.length / (totalBars * 4);
  let score: number;
  /** Jazz duo melody: ideal ~50–80% notes per beat; wall-to-wall >95% penalised. */
  if (density > 0.95) {
    score = density >= 0.98 ? 3 : 4;
  } else if (density > 0.88) {
    score = density <= 0.915 ? 6 : 5;
  } else if (density > 0.8) {
    score = density <= 0.84 ? 8 : 7;
  } else if (density >= 0.5) {
    score = density >= 0.58 && density <= 0.72 ? 10 : 9;
  } else if (density >= 0.3) {
    score = density < 0.4 ? 6 : 7;
  } else {
    score = density < 0.15 ? 4 : 5;
  }
  return {
    score,
    justification: `Note density ${Math.round(density * 100)}% (${notes.length} notes / ${totalBars} bars)`,
  };
}

function isTensionChord(c: string): boolean {
  if (!c) return false;
  if (c.includes('maj7') || c.includes('maj9') || c.includes('maj13') || c.includes('6/9')) return false;
  if (
    ['alt', 'b9', '#9', '7#11', '7b13', 'dim7', 'm7b5', '7sus'].some((m) => c.includes(m))
  ) {
    return true;
  }
  const stem = chordStem(c);
  return /^[A-G][#b]?13/.test(stem) && !stem.includes('maj');
}

function isReleaseChord(c: string): boolean {
  if (!c) return false;
  if (['maj7', 'maj9', 'maj7#11', '6/9', 'maj6'].some((m) => c.includes(m))) {
    return true;
  }
  const stem = chordStem(c);
  return /^[A-G][#b]?(m9|m7|m11|mmaj)/.test(stem);
}

export function scoreTensionAndRelease(chords: string[]): CategoryScore {
  if (chords.length === 0) {
    return { score: 4, justification: '0 tension-release arcs found' };
  }
  let arcs = 0;
  for (let i = 0; i < chords.length - 1; i++) {
    const curr = chords[i] ?? '';
    const currTension = isTensionChord(curr);
    const nextRelease = isReleaseChord(chords[i + 1] ?? '');
    const nextTwoRelease = isReleaseChord(chords[i + 2] ?? '');
    if (currTension && (nextRelease || nextTwoRelease)) {
      arcs++;
      i++;
    }
  }
  const score = arcs >= 3 ? 9 : arcs === 2 ? 8 : arcs === 1 ? 6 : 4;
  return {
    score,
    justification: `${arcs} tension-release arcs found`,
  };
}

/** Strip alternate bass / parenthetical extensions for classification (e.g. `Dm9/F` → `Dm9`). */
function chordStem(raw: string): string {
  const s = raw.trim();
  const noParen = s.split('(')[0]!.trim();
  return noParen.split('/')[0]!.trim();
}

/** Dominant-function markers (excludes maj7 / minor-7 types). */
function chordSymbolDominantFamily(raw: string): boolean {
  const s = chordStem(raw);
  if (/maj7|mmaj|maj9|maj11|maj13/i.test(s)) return false;
  if (/^[A-G][#b]?m(7|9|11|13)/i.test(s)) return false;
  /** Lead-sheet spellings like `Dmin9` / `Ebmin11` (not dominant). */
  if (/^[A-G][#b]?min(7|9|11|13)/i.test(s)) return false;
  if (/7alt/i.test(s)) return true;
  if (/7b9|7#9/i.test(s)) return true;
  if (/b13/i.test(s)) return true;
  if (/7#11/i.test(s)) return true;
  if (/13/i.test(s) && !/13sus/i.test(s) && !/maj13/i.test(s) && !/m13/i.test(s)) return true;
  if (/b9/i.test(s) && !/maj9/i.test(s) && !/add9/i.test(s)) return true;
  if (/#9/i.test(s) && !/maj9/i.test(s)) return true;
  if (/^[A-G][#b]?(9|11|13)$/i.test(s)) return true;
  if (/^[A-G][#b]?7([^m]|$)/i.test(s)) return true;
  return false;
}

function chordSymbolTonicFamily(raw: string): boolean {
  const c = chordStem(raw);
  if (/maj7|maj9|maj6|maj11|maj13|mmaj7|add9/i.test(c)) return true;
  if (/[A-G][#b]?m(7|9|11|13)/i.test(c) || /[A-G][#b]?min(7|9|11|13)/i.test(c)) return true;
  if (/maj6|6\/9|6-9/i.test(c)) return true;
  /** `Cm` / `Cmin` triads; `sus` without 7 reads as pedal / plagal-adjacent, not V7. */
  if (/^[A-G][#b]?(m|min)?$/i.test(c)) return true;
  if (!chordSymbolDominantFamily(c)) return true;
  return false;
}

const CADENCE_TONIC_LOOKBACK_BARS = 4;

/** Any tonic-family chord in the last N bars of the section (handles ii–V–I with V7 on the bar line). */
function sectionCadenceHasTonicFamily(
  chords: string[],
  sec: GceStructureSection,
  lookbackBars: number = CADENCE_TONIC_LOOKBACK_BARS
): boolean {
  const span = Math.min(
    lookbackBars,
    Math.max(0, sec.barEnd - sec.barStart + 1)
  );
  for (let i = 0; i < span; i++) {
    const bar = sec.barEnd - i;
    const idx = bar - 1;
    const sym = idx >= 0 && idx < chords.length ? chords[idx]! : '';
    if (sym.trim() !== '' && chordSymbolTonicFamily(sym)) return true;
  }
  return false;
}

function sectionHasLongEnding(line: MelodicNote[], sec: GceStructureSection): boolean {
  const idxs: number[] = [];
  for (let i = 0; i < line.length; i++) {
    const n = line[i]!;
    if (n.rest || n.midi <= 0) continue;
    if (n.bar >= sec.barStart && n.bar <= sec.barEnd) idxs.push(i);
  }
  if (idxs.length === 0) return false;
  const lastTwoIdx = idxs.slice(-2);
  for (const i of lastTwoIdx) {
    const n = line[i]!;
    if (n.beats >= 1.5) return true;
    const next = line[i + 1];
    if (next?.rest === true && next.beats >= 1.0) return true;
  }
  return false;
}

/** GCE v2.0 — Cadential Clarity */
export function scoreCadentialClarity(
  line: MelodicNote[],
  chords: string[],
  sections: GceStructureSection[]
): CategoryScore {
  if (!sections?.length || !chords.length) {
    return { score: 0, justification: 'Insufficient section or chord data' };
  }
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  let strongBeatLandings = 0;
  let tonicLandings = 0;
  let longNoteEndings = 0;

  for (const sec of sections) {
    const inSection = notes.filter((n) => n.bar >= sec.barStart && n.bar <= sec.barEnd);
    if (inSection.length === 0) continue;
    const last = inSection[inSection.length - 1]!;
    const beatInt = Math.floor(last.beat);
    if (beatInt >= 0 && beatInt <= 3) strongBeatLandings++;

    if (sectionCadenceHasTonicFamily(chords, sec)) tonicLandings++;

    if (sectionHasLongEnding(line, sec)) longNoteEndings++;
  }

  const denom = 3 * sections.length;
  const raw =
    denom > 0 ? (10 * (strongBeatLandings + tonicLandings + longNoteEndings)) / denom : 0;
  const score = Math.max(0, Math.min(10, Math.round(raw * 10) / 10));
  return {
    score,
    justification:
      `strong beats ${strongBeatLandings}, tonic-family ${tonicLandings}, long endings ${longNoteEndings} / ${sections.length} sections`,
  };
}

/** GCE v2.0 — Phrase Grammar */
export function scorePhraseGrammar(line: MelodicNote[]): CategoryScore {
  const phrases: MelodicNote[][] = [];
  let buf: MelodicNote[] = [];
  for (const e of line) {
    if (e.rest && e.beats >= 0.75) {
      if (buf.length) {
        phrases.push(buf);
        buf = [];
      }
      continue;
    }
    buf.push(e);
  }
  if (buf.length) phrases.push(buf);

  const pitchedPhrases = phrases.filter((p) => p.some((n) => !n.rest && n.midi > 0));
  const totalPhrases = Math.max(pitchedPhrases.length, 1);
  let closedPhrases = 0;
  const lengths: number[] = [];
  for (let p = 0; p < pitchedPhrases.length; p++) {
    const pitched = pitchedPhrases[p]!.filter((n) => !n.rest && n.midi > 0);
    if (!pitched.length) continue;
    lengths.push(pitched.length);
    const last = pitched[pitched.length - 1]!;
    if (p < pitchedPhrases.length - 1 || last.beats >= 1.5) closedPhrases++;
  }

  const phraseCount = pitchedPhrases.length;
  let phraseVariety = 0;
  if (lengths.length > 0) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / lengths.length;
    phraseVariety = Math.min(Math.sqrt(variance) / (mean + 0.01), 1);
  }

  const rawScore =
    10 *
    (0.4 * (closedPhrases / totalPhrases) +
      0.3 * Math.min(phraseCount / 6, 1) +
      0.3 * phraseVariety);
  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  return {
    score,
    justification: `${closedPhrases}/${totalPhrases} closed phrases, ${phraseCount} phrases, variety ${(phraseVariety * 10).toFixed(1)}`,
  };
}

function countNotesPerBar(part: PartModel): Map<number, number> {
  const m = new Map<number, number>();
  for (const meas of part.measures) {
    let n = 0;
    for (const e of meas.events) {
      if (e.kind === 'note') n++;
    }
    m.set(meas.index, n);
  }
  return m;
}

/**
 * Lowest/highest MIDI in the part.
 * **`melodyVoiceOnly`** — same convention as **`scoreModelToMelodicLine`**: voice **1** or unspecified (excludes guitar **voice 2** shells so register gap reflects lead vs bass).
 */
function collectMidiRange(
  part: PartModel,
  opts?: { melodyVoiceOnly?: boolean }
): { min: number; max: number } {
  let min = 127;
  let max = 0;
  let counted = 0;
  for (const meas of part.measures) {
    for (const e of meas.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!Number.isFinite(n.pitch)) continue;
      if (
        opts?.melodyVoiceOnly &&
        n.voice !== undefined &&
        n.voice !== 1
      ) {
        continue;
      }
      counted++;
      min = Math.min(min, n.pitch);
      max = Math.max(max, n.pitch);
    }
  }
  if (counted === 0 && opts?.melodyVoiceOnly) {
    return collectMidiRange(part);
  }
  const isBassPart =
    part.instrumentIdentity === 'acoustic_upright_bass' || part.id === 'bass';
  if (counted === 0 && isBassPart) {
    /** No finite pitches (pipeline bug / frozen sentinel) — use upright hard range, not `{60,60}` (that forces gap 0 vs melody at middle C). */
    return { min: UPRIGHT_BASS_HARD_LOW, max: UPRIGHT_BASS_HARD_HIGH };
  }
  const out = min <= max ? { min, max } : { min: 60, max: 60 };
  return {
    min: Number.isFinite(out.min) ? out.min : 60,
    max: Number.isFinite(out.max) ? out.max : 60,
  };
}

/** GCE v2.0 — Arrangement & Orchestration */
export function scoreArrangementAndOrchestration(score: ScoreModel): CategoryScore {
  const guitar =
    score.parts.find((p) => p.id === 'guitar') ??
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass =
    score.parts.find((p) => p.id === 'bass') ??
    score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar || !bass) {
    return { score: 4, justification: 'Missing guitar or bass part' };
  }

  const gMap = countNotesPerBar(guitar);
  const bMap = countNotesPerBar(bass);
  const bars = new Set([...gMap.keys(), ...bMap.keys()]);
  const barList = [...bars].sort((a, b) => a - b);
  if (barList.length === 0) {
    return { score: 0, justification: 'No measures' };
  }

  /** Per bar: **|Ng/4 − Nb/4|** = imbalance of note counts scaled to one beat (4/4). Mean → **densityDifference** ∈ ~0–2+. */
  let diffSum = 0;
  const totals: number[] = [];
  for (const bar of barList) {
    const gn = gMap.get(bar) ?? 0;
    const bn = bMap.get(bar) ?? 0;
    diffSum += Math.abs(gn / 4 - bn / 4);
    totals.push(gn + bn);
  }
  const densityDifference = diffSum / barList.length;

  const gMelody = collectMidiRange(guitar, { melodyVoiceOnly: true });
  const bR = collectMidiRange(bass);
  /** Low overlap between **melody-register** guitar bottom and bass ceiling (typical duo target ~5–20 st when separated). */
  const gmin = Number.isFinite(gMelody.min) ? gMelody.min : 60;
  const bmax = Number.isFinite(bR.max) ? bR.max : UPRIGHT_BASS_HARD_HIGH;
  const registerSeparation = Math.max(0, gmin - bmax);

  const meanTot = totals.reduce((a, b) => a + b, 0) / totals.length;
  const varTot =
    totals.reduce((s, v) => s + Math.pow(v - meanTot, 2), 0) / totals.length;
  const activePartVariety = Math.sqrt(varTot);

  const rawScore =
    10 *
    (0.4 * Math.min(densityDifference / 0.5, 1) +
      0.35 * Math.min(registerSeparation / 12, 1) +
      0.25 * Math.min(activePartVariety / 2, 1));
  const sc = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  return {
    score: sc,
    justification:
      `density Δ ${densityDifference.toFixed(2)} (mean |guitar−bass| notes/bar ÷ 4), register gap ${registerSeparation.toFixed(0)} st (melody guitar min − bass max), part activity σ ${activePartVariety.toFixed(1)}`,
  };
}

function sectionIndexForBar(bar: number, sections: GceStructureSection[]): number {
  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s]!;
    if (bar >= sec.barStart && bar <= sec.barEnd) return s;
  }
  return -1;
}

/** Same 4-note interval windows as scoreMelodicIdentity (for thematic recall). */
function melodicIntervalWindows(pitches: number[]): number[][] {
  const windowSize = 4;
  const windows: number[][] = [];
  for (let i = 0; i <= pitches.length - windowSize; i++) {
    const win = pitches.slice(i, i + windowSize);
    windows.push(win.slice(1).map((p, j) => (((p - win[j]!) % 12) + 12) % 12));
  }
  return windows;
}

/** GCE v2.0 — Thematic Recall Potential */
export function scoreThematicRecallPotential(
  line: MelodicNote[],
  sections: GceStructureSection[]
): CategoryScore {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  if (notes.length < 4 || !sections.length) {
    return { score: 0, justification: 'Too few notes or no sections' };
  }
  const pitches = notes.map((n) => n.midi);
  const windows = melodicIntervalWindows(pitches);
  const motifSectionSets = new Map<string, Set<number>>();

  for (let i = 0; i < windows.length; i++) {
    for (let j = i + 2; j < windows.length; j++) {
      const match = windows[i]!.every((iv, k) => Math.abs(iv - windows[j]![k]!) <= 2);
      if (!match) continue;
      const key = windows[i]!.join(',');
      if (!motifSectionSets.has(key)) motifSectionSets.set(key, new Set());
      const si = sectionIndexForBar(notes[i]!.bar, sections);
      const sj = sectionIndexForBar(notes[j]!.bar, sections);
      if (si >= 0) motifSectionSets.get(key)!.add(si);
      if (sj >= 0) motifSectionSets.get(key)!.add(sj);
    }
  }

  let crossSectionMotifs = 0;
  for (const set of motifSectionSets.values()) {
    if (set.size >= 2) crossSectionMotifs++;
  }

  const rawScore = 10 * Math.min(crossSectionMotifs / 3, 1);
  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
  return {
    score,
    justification: `${crossSectionMotifs} motif type(s) across 2+ sections`,
  };
}
