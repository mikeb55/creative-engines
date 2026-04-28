import type { MeasureModel, NoteEvent } from '../score-model/scoreModelTypes';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import type { PhraseIntent } from '../goldenPath/guitarPhraseAuthority';
import { getDuoPhraseIntentV31 } from '../goldenPath/guitarPhraseAuthority';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import type {
  Phrase,
  PhraseContour,
  PhraseFeel,
  PhraseHarmonicRole,
  PhraseRange,
  PhraseRhythmComplexity,
  PhraseSequencingType,
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

// ---- Phrase Engine Stage 2: 4-bar phrase sequencing (duo golden path) — seed-only, no new pipeline stage. ----

export function phraseSequencingTypeFromIntent(intent: PhraseIntent): PhraseSequencingType {
  switch (intent) {
    case 'cadence':
      return 'cadence';
    case 'return':
      return 'arrival';
    case 'development':
    case 'contrast':
      return 'departure';
    default:
      return 'question';
  }
}

function pickQuestionOrDepartureIntent(seed: number, bar: number, salt: number): PhraseIntent {
  const pool: PhraseIntent[] = [
    'guitar_lead',
    'answer_guitar',
    'development',
    'contrast',
    'bass_lead',
    'answer_bass',
  ];
  const u = seededUnit(seed, bar, 9300 + salt);
  return pool[Math.min(pool.length - 1, Math.floor(u * pool.length))]!;
}

function rotatePhraseIntentForContrast(
  seed: number,
  bar: number,
  guard: number,
  previousPhraseSequencingType: PhraseSequencingType
): PhraseIntent {
  const u = seededUnit(seed, bar, 9310 + guard);
  if (previousPhraseSequencingType === 'question') {
    const dep: PhraseIntent[] = ['development', 'contrast'];
    return dep[Math.min(dep.length - 1, Math.floor(u * dep.length))]!;
  }
  if (previousPhraseSequencingType === 'departure') {
    const q: PhraseIntent[] = ['guitar_lead', 'answer_guitar', 'bass_lead', 'answer_bass'];
    return q[Math.min(q.length - 1, Math.floor(u * q.length))]!;
  }
  const mixed: PhraseIntent[] = ['guitar_lead', 'development', 'contrast', 'answer_guitar'];
  return mixed[Math.min(mixed.length - 1, Math.floor(u * mixed.length))]!;
}

function applyPhraseEngineStage2AtPhraseStart(
  seed: number,
  bar: number,
  intent: PhraseIntent,
  previousPhraseSequencingType: PhraseSequencingType | undefined
): PhraseIntent {
  const afterCadenceLanding = bar > 1 && bar % 4 === 1;
  let out = intent;
  if (afterCadenceLanding) {
    const t = phraseSequencingTypeFromIntent(out);
    if (t === 'cadence' || t === 'arrival') {
      out = pickQuestionOrDepartureIntent(seed, bar, 0);
    }
  }

  if (previousPhraseSequencingType !== undefined) {
    let guard = 0;
    while (phraseSequencingTypeFromIntent(out) === previousPhraseSequencingType && guard < 28) {
      out = rotatePhraseIntentForContrast(seed, bar, guard, previousPhraseSequencingType);
      guard++;
    }
    if (phraseSequencingTypeFromIntent(out) === previousPhraseSequencingType) {
      out =
        previousPhraseSequencingType === 'question'
          ? seededUnit(seed, bar, 9340) < 0.5
            ? 'development'
            : 'contrast'
          : 'guitar_lead';
    }
  }

  if (afterCadenceLanding) {
    const t = phraseSequencingTypeFromIntent(out);
    if (t === 'cadence' || t === 'arrival') {
      out = pickQuestionOrDepartureIntent(seed, bar, 48);
    }
  }

  return out;
}

/**
 * Bar-level duo golden path intent: V3.1 authority, plus Stage 2 sequencing on each 4-bar phrase downbeat only.
 * Deterministic in `seed`; guitar and bass must both call this with the same `(seed, bar)`.
 */
export function duoGoldenPathPhraseIntentAtBar(seed: number, bar: number): PhraseIntent {
  const phase = ((bar - 1) % 8) + 1;
  const phraseNumber8 = Math.floor((bar - 1) / 8) + 1;
  const base = getDuoPhraseIntentV31(phase, phraseNumber8);
  if ((bar - 1) % 4 !== 0) return base;

  const prevPhraseFirstBar = bar - 4;
  const previousPhraseSequencingType =
    prevPhraseFirstBar < 1
      ? undefined
      : phraseSequencingTypeFromIntent(duoGoldenPathPhraseIntentAtBar(seed, prevPhraseFirstBar));

  return applyPhraseEngineStage2AtPhraseStart(seed, bar, base, previousPhraseSequencingType);
}

const STAGE3_ANT_EPS = 1e-4;
const STAGE3_EIGHTH = 0.5;

/** Phrase Engine Stage 3: at most one voice-1 onset per bar shifted earlier by one eighth-note beat (deterministic). */
export function applyDuoGoldenPhraseEngineStage3Anticipation(m: MeasureModel, seed: number, bar: number): void {
  if (bar % 4 === 0) return;

  const v1 = m.events.filter(
    (e): e is NoteEvent => e.kind === 'note' && ((e as NoteEvent).voice ?? 1) === 1
  );
  if (v1.length === 0) return;

  const spans = v1.map((n) => ({ n, s: n.startBeat, e: n.startBeat + n.duration }));
  const validIndices: number[] = [];
  for (let i = 0; i < spans.length; i++) {
    const { n, s } = spans[i]!;
    if (s < STAGE3_EIGHTH - STAGE3_ANT_EPS) continue;
    const newS = snapAttackBeatToGrid(s - STAGE3_EIGHTH);
    const newE = newS + n.duration;
    if (newS < -STAGE3_ANT_EPS || newE > 4 + STAGE3_ANT_EPS) continue;
    let ok = true;
    for (let j = 0; j < spans.length && ok; j++) {
      if (j === i) continue;
      const o = spans[j]!;
      if (newS < o.e - STAGE3_ANT_EPS && newE > o.s + STAGE3_ANT_EPS) ok = false;
    }
    if (ok) validIndices.push(i);
  }
  if (validIndices.length === 0) return;

  const pick =
    validIndices[
      Math.min(validIndices.length - 1, Math.floor(seededUnit(seed, bar, 9420) * validIndices.length))
    ]!;
  const chosen = spans[pick]!.n;
  chosen.startBeat = snapAttackBeatToGrid(chosen.startBeat - STAGE3_EIGHTH);
}
