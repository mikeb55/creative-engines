/**
 * Composer OS V2 — Barry Harris style module
 * Core model: every chord = 6th chord + related diminished chord
 * Movement alternates between these states, stepwise.
 * Strong beats = chord tones. Weak beats = passing tones.
 * Fully deterministic — seededUnit only, no Math.random().
 */
import type { CompositionContext, GenerationMetadata } from '../../compositionContext';
import type { StyleModule } from '../styleModuleTypes';
import { BARRY_HARRIS_MODULE_ID } from './moduleTypes';
import { seededUnit } from '../../goldenPath/guitarBassDuoHarmony';
import { isProtectedBar } from '../../score-integrity/identityLock';
import type { ScoreModel, NoteEvent, MeasureModel } from '../../score-model/scoreModelTypes';

/** Chord tone offsets by quality */
const CHORD_TONES: Record<string, number[]> = {
  maj7: [0, 4, 7, 11],
  m7:   [0, 3, 7, 10],
  '7':  [0, 4, 7, 10],
  '6':  [0, 4, 7, 9],
  dim7: [0, 3, 6, 9],
};

/** Related diminished offset (semitones above root) */
const DIM_OFFSET = 11;

/**
 * Deterministic diminished insertion check.
 * Replaces Math.random() with seededUnit.
 */
function shouldInsertDiminished(seed: number, barIndex: number, noteIdx: number): boolean {
  return seededUnit(seed, barIndex, 88000 + noteIdx) < 0.35;
}

/**
 * Returns true if beat position is strong (beats 1 and 3 in 4/4).
 */
function isStrongBeat(startBeat: number): boolean {
  return Math.abs(startBeat % 2) < 0.05;
}

/**
 * Apply Barry Harris harmonic movement behavior to a single measure.
 * Strong beats get chord tones. Weak beats get passing/diminished tones.
 * Protected bars are skipped entirely.
 */
function applyBarryHarrisToMeasure(
  measure: MeasureModel,
  barIndex: number,
  seed: number,
  rootPc: number,
  quality: string
): void {
  if (isProtectedBar(barIndex)) return;
  const tones = CHORD_TONES[quality] ?? CHORD_TONES['7'];
  const notes = measure.events.filter((e) => e.kind === 'note') as NoteEvent[];
  notes.sort((a, b) => a.startBeat - b.startBeat);

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]!;
    if (isStrongBeat(note.startBeat)) {
      // Strong beat: bias toward chord tone (3rd or 7th)
      const toneIdx = seededUnit(seed, barIndex, 88100 + i) < 0.6 ? 1 : 3;
      const target = 60 + rootPc + (tones[toneIdx] ?? tones[0]);
      // Nudge toward target by at most 1 semitone — preserve contour
      if (Math.abs(note.pitch - target) === 1) {
        note.pitch = target;
      }
    } else {
      // Weak beat: optionally insert diminished color
      if (shouldInsertDiminished(seed, barIndex, i)) {
        const dimTone = 60 + rootPc + DIM_OFFSET;
        if (Math.abs(note.pitch - dimTone) <= 2) {
          note.pitch = dimTone;
        }
      }
    }
  }
}

/**
 * Main Barry Harris style module entry point.
 * Applies harmonic movement behavior to guitar part in Song Mode.
 */
export function applyBarryHarris(context: CompositionContext, score?: ScoreModel): CompositionContext {
  if (score) {
    const guitar = score.parts.find((p) => p.id === 'guitar');
    if (guitar) {
      const seed = context.seed;
      for (const measure of guitar.measures) {
        applyBarryHarrisToMeasure(measure, measure.index, seed, 0, '7');
      }
    }
  }
  const overrides = (context as any).styleOverrides ?? {};
  return {
    ...context,
    styleOverrides: {
      ...overrides,
      barryHarris: {
        passingMotion: true,
        guideToneEmphasis: true,
        stepwiseVoiceLeading: true,
        dominantGravity: true,
        diminishedBridging: true,
        deterministic: true,
      },
    },
  } as CompositionContext;
}

export const barryHarrisModule: StyleModule = {
  id: BARRY_HARRIS_MODULE_ID,
  modify: (context: CompositionContext) => applyBarryHarris(context),
};
