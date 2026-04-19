import { evaluateMelody } from './gce_melody_eval';
import type { MelodicNote } from './gce_melody_eval';
import type { ScoreModel } from '../score-model/scoreModelTypes';

export interface CategoryScore {
  score: number;
  justification: string;
}

export function scoreMelodicIdentity(line: MelodicNote[]): CategoryScore {
  const result = evaluateMelody(line, { beatsPerBar: 4 });
  return {
    score: result.score,
    justification: result.reasons[0] ?? 'No reasons',
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
  const rests = line.filter((n) => n.rest || n.midi === 0);
  const totalBeats = line.reduce((s, e) => s + e.beats, 0);
  const restBeats = rests.reduce((s, e) => s + e.beats, 0);
  const restRatio = totalBeats > 0 ? restBeats / totalBeats : 0;
  const durVariety = new Set(notes.map((n) => Math.round(n.beats * 4))).size;
  const hasLongNote = notes.some((n) => n.beats >= 2);
  const hasSyncopation = notes.some((n) => ![0, 1, 2, 3].includes(Math.floor(n.beat)));
  let score = 0;
  if (restRatio >= 0.1 && restRatio <= 0.5) score += 3;
  if (durVariety >= 3) score += 3;
  if (hasLongNote) score += 2;
  if (hasSyncopation) score += 2;
  return {
    score: Math.min(10, score),
    justification: `Rest ratio ${Math.round(restRatio * 100)}%, ${durVariety} duration types`,
  };
}

export function scoreStructureAndForm(score: ScoreModel): CategoryScore {
  const kinds = new Set(
    score.parts[0]?.measures
      .map((m) => (m as { sectionKind?: string }).sectionKind)
      .filter(Boolean) ?? []
  );
  const count = kinds.size;
  const s = count >= 3 ? 9 : count === 2 ? 7 : 4;
  return {
    score: s,
    justification: `Sections: ${[...kinds].join(', ') || 'unknown'}`,
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
