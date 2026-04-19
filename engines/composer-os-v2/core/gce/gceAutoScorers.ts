import type { MelodicNote } from './gce_melody_eval';
import type { FormMap } from '../compositionContext';
import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';

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
  const contourCompression = 1 - entropy / maxEntropy;

  // I — interval economy
  const stepIntervals = pitches.slice(1).map((p, i) => Math.abs(p - pitches[i]!));
  const uniqueIntervals = new Set(stepIntervals.map((iv) => Math.min(iv, 12))).size;
  const intervalEconomy = 1 - Math.min(uniqueIntervals / 10, 1);

  // G — register cohesion
  const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
  const variance =
    pitches.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / pitches.length;
  const stddev = Math.sqrt(variance);
  const registerCohesion = 1 - Math.min(stddev / 12, 1);

  const rawScore =
    10 *
    (0.35 * motifRecurrence +
      0.25 * contourCompression +
      0.2 * intervalEconomy +
      0.2 * registerCohesion);

  const score = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));

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
  if (density >= 0.3 && density <= 0.7) score = 9;
  else if (density < 0.15) score = 5;
  else if (density < 0.3) score = 7;
  else score = 6;
  return {
    score,
    justification: `Note density ${Math.round(density * 100)}% (${notes.length} notes / ${totalBars} bars)`,
  };
}

export function scoreTensionAndRelease(chords: string[]): CategoryScore {
  if (chords.length === 0) {
    return { score: 4, justification: '0 tension-release arcs found' };
  }
  const tensionMarkers = ['alt', 'b9', '#9', '7#11', '7b13'];
  const releaseMarkers = ['maj7', 'maj9', 'maj7#11', '6/9'];
  let arcs = 0;
  let inTension = false;
  for (const c of chords) {
    const isTension = tensionMarkers.some((m) => c.includes(m));
    const isRelease = releaseMarkers.some((m) => c.includes(m));
    if (isTension) inTension = true;
    if (inTension && isRelease) {
      arcs++;
      inTension = false;
    }
  }
  const score = arcs >= 3 ? 9 : arcs === 2 ? 8 : arcs === 1 ? 6 : 4;
  return {
    score,
    justification: `${arcs} tension-release arcs found`,
  };
}

function chordSymbolTonicFamily(raw: string): boolean {
  const c = raw.trim();
  if (/maj7|maj9/i.test(c)) return true;
  if (/\bm7\b|\bm9\b|\bm11\b|\bm13\b/i.test(c)) return true;
  return /^[A-G][#b]?m?$/.test(c) || /^[A-G][#b]?$/.test(c);
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
    if (beatInt === 0 || beatInt === 1) strongBeatLandings++;

    const chordIdx = last.bar - 1;
    const chordSym = chordIdx >= 0 && chordIdx < chords.length ? chords[chordIdx]! : '';
    if (chordSym && chordSymbolTonicFamily(chordSym)) tonicLandings++;

    if (last.beats >= 1.5) longNoteEndings++;
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

function collectMidiRange(part: PartModel): { min: number; max: number } {
  let min = 127;
  let max = 0;
  for (const meas of part.measures) {
    for (const e of meas.events) {
      if (e.kind === 'note') {
        min = Math.min(min, e.pitch);
        max = Math.max(max, e.pitch);
      }
    }
  }
  return min <= max ? { min, max } : { min: 60, max: 60 };
}

/** GCE v2.0 — Arrangement & Orchestration */
export function scoreArrangementAndOrchestration(score: ScoreModel): CategoryScore {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const bass = score.parts.find((p) => p.id === 'bass');
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

  let diffSum = 0;
  const totals: number[] = [];
  for (const bar of barList) {
    const gn = gMap.get(bar) ?? 0;
    const bn = bMap.get(bar) ?? 0;
    diffSum += Math.abs(gn / 4 - bn / 4);
    totals.push(gn + bn);
  }
  const densityDifference = diffSum / barList.length;

  const gR = collectMidiRange(guitar);
  const bR = collectMidiRange(bass);
  const registerSeparation = Math.max(0, gR.min - bR.max);

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
      `density Δ ${densityDifference.toFixed(2)}, register gap ${registerSeparation.toFixed(0)} semitones, part activity σ ${activePartVariety.toFixed(1)}`,
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
