import type { NoteEvent } from '../score-model/scoreModelTypes';
import type {
  Phrase,
  PhraseContour,
  PhraseFeel,
  PhraseHarmonicRole,
  PhraseRange,
  PhraseRhythmComplexity,
} from './phraseTypes';

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Earliest phrase-global beat (quarters from start of `range.startBar`) where this note can start. */
function phraseGlobalStartBeat(note: NoteEvent, range: PhraseRange, minGlobal: number): number {
  const barSpan = range.endBar - range.startBar + 1;
  const maxSlots = barSpan * 4;
  for (let bi = 0; bi < barSpan; bi++) {
    const g = bi * 4 + note.startBeat;
    if (g >= minGlobal - 1e-9 && g < maxSlots) return g;
  }
  const fallback = (barSpan - 1) * 4 + note.startBeat;
  return Math.min(fallback, maxSlots - 1e-9);
}

function classifyContour(sortedPitches: number[]): PhraseContour {
  if (sortedPitches.length <= 1) return 'flat';
  const dirs: number[] = [];
  for (let i = 1; i < sortedPitches.length; i++) {
    const d = sortedPitches[i]! - sortedPitches[i - 1]!;
    if (d === 0) dirs.push(0);
    else dirs.push(d > 0 ? 1 : -1);
  }
  const nonzero = dirs.filter((d) => d !== 0);
  if (nonzero.length === 0) return 'flat';
  const signs = nonzero.map((d) => (d > 0 ? 1 : -1));
  const first = signs[0]!;
  const allSame = signs.every((s) => s === first);
  if (allSame) return first > 0 ? 'ascending' : 'descending';

  let changes = 0;
  for (let i = 1; i < signs.length; i++) {
    if (signs[i] !== signs[i - 1]) changes++;
  }

  let peakAt = -1;
  for (let i = 1; i < sortedPitches.length - 1; i++) {
    const l = sortedPitches[i]! - sortedPitches[i - 1]!;
    const r = sortedPitches[i + 1]! - sortedPitches[i]!;
    if (l > 0 && r < 0) peakAt = i;
  }
  const archLike = peakAt > 0 && peakAt < sortedPitches.length - 1;

  if (changes >= 2) return 'wave';
  if (archLike) return 'arch';
  return 'wave';
}

export function buildPhrase(
  id: string,
  range: PhraseRange,
  notes: NoteEvent[],
  harmonicRole: PhraseHarmonicRole
): Phrase {
  const bars = range.endBar - range.startBar + 1;
  const totalQuarterSlots = bars * 4;

  let minGlobal = 0;
  const placements: Array<{ note: NoteEvent; gStart: number }> = [];
  for (const note of notes) {
    const gStart = phraseGlobalStartBeat(note, range, minGlobal);
    placements.push({ note, gStart });
    minGlobal = gStart + note.duration;
  }

  const occupied = new Array<boolean>(totalQuarterSlots).fill(false);
  for (const { note, gStart } of placements) {
    const end = gStart + note.duration;
    for (let k = 0; k < totalQuarterSlots; k++) {
      if (gStart < k + 1 - 1e-9 && end > k + 1e-9) occupied[k] = true;
    }
  }
  let gaps = 0;
  for (let s = 0; s < totalQuarterSlots; s++) {
    if (!occupied[s]) gaps++;
  }

  const density = clamp01(notes.length / totalQuarterSlots);

  const rhythmFingerprint = placements.map(
    ({ note, gStart }) => `${note.duration}@${gStart}`
  );

  const orderForContour = [...placements].sort((a, b) => a.gStart - b.gStart);
  const pitches = orderForContour.map((p) => p.note.pitch);
  const contour: PhraseContour = classifyContour(pitches);

  let offbeat = 0;
  for (const { gStart } of placements) {
    const frac = Math.abs(gStart - Math.round(gStart));
    if (frac > 1e-6) offbeat++;
  }
  const offbeatRatio = notes.length === 0 ? 0 : offbeat / notes.length;
  let rhythmComplexity: PhraseRhythmComplexity;
  if (notes.length === 0 || offbeat === 0) {
    rhythmComplexity = 'simple';
  } else if (offbeatRatio > 0.3) {
    rhythmComplexity = 'complex';
  } else {
    rhythmComplexity = 'moderate';
  }

  const feel: PhraseFeel = 'straight';

  return {
    id,
    range,
    rhythmComplexity,
    feel,
    density,
    contour,
    harmonicRole,
    gaps,
    repetitionOf: undefined,
    rhythmFingerprint,
  };
}
