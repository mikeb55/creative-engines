/**
 * Melodic variation pack — motif mutations + GCE scoring (same pillars as {@link scoreResultForGce}).
 */

import type { MelodicNote } from '../gce/gce_melody_eval';
import { scoreResultForGce } from '../gce/gceGate';
import type { GceStructureSection } from '../gce/gceAutoScorers';
import { gceSectionsFromFormMap } from '../gce/gceAutoScorers';
import type { MeasureModel, PartModel, ScoreModel, ScoreEvent } from '../score-model/scoreModelTypes';
import type { CompositionContext } from '../compositionContext';
import {
  applyMotifMutation,
  extractMotifCell,
  scoreMotifSimilarity,
  type MotifNoteLite,
  type MutationMotifCell,
  type MotifTransform,
} from './motifMutationEngine';

/** Ordered short motif input (pitch MIDI + duration in quarters). */
export type Melody = MotifNoteLite[];

export interface VariationCandidate {
  transform: MotifTransform;
  cell: MutationMotifCell;
  notes: MotifNoteLite[];
}

export interface MelodicVariationGceInput {
  chords: string[];
  sections: GceStructureSection[];
  songwriterId?: string;
}

export interface ScoredVariation {
  variation: VariationCandidate;
  gceScore: number;
}

/** Same transform priority as build spec (subset of {@link MotifTransform}). */
export const VARIATION_TRANSFORM_PRIORITY: readonly MotifTransform[] = [
  'rhythmic_displacement',
  'contour_inversion',
  'registral_displacement',
  'augmentation',
  'diminution',
  'fragmentation',
] as const;

const SIMILARITY_DEDUP = 0.92;

function clampMidiToRegisterBand(midi: number, band: MutationMotifCell['registerBand']): number {
  const lo = band === 'low' ? 45 : band === 'high' ? 73 : 58;
  const hi = band === 'low' ? 57 : band === 'high' ? 84 : 72;
  let m = midi;
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return Math.max(lo, Math.min(hi, m));
}

/**
 * Reconstruct playable motif notes from a mutated cell (anchor pitch from original).
 */
export function mutationCellToMotifNotes(original: MotifNoteLite[], mutated: MutationMotifCell): MotifNoteLite[] {
  const rhythm =
    mutated.rhythmicCell.length > 0
      ? mutated.rhythmicCell
      : original.map((o) => o.duration);
  const spine = mutated.intervalSpine;
  const anchor = original[0]?.pitch ?? 60;

  const pitches: number[] = [];
  let p = clampMidiToRegisterBand(anchor, mutated.registerBand);
  for (let i = 0; i < rhythm.length; i++) {
    pitches.push(p);
    if (i < spine.length) {
      p = clampMidiToRegisterBand(p + spine[i]!, mutated.registerBand);
    }
  }

  return rhythm.map((dur, i) => ({
    pitch: pitches[i]!,
    duration: dur,
  }));
}

/** Lay motif notes across 4/4 bars for GCE melodic evaluators. */
export function motifNotesToMelodicLine(notes: MotifNoteLite[]): MelodicNote[] {
  let bar = 1;
  let beat = 1;
  const out: MelodicNote[] = [];
  for (const n of notes) {
    const midi = Math.round(n.pitch);
    const beats = n.duration;
    out.push({ midi, beats, bar, beat });
    let nextBeat = beat + beats;
    let b = bar;
    while (nextBeat > 4 + 1e-6) {
      nextBeat -= 4;
      b++;
    }
    bar = b;
    beat = nextBeat;
  }
  return out;
}

export function buildStubDuoScoreFromMelodicLine(line: MelodicNote[], chords: string[], title = 'variation'): ScoreModel {
  const noteBars = line.filter((n) => !n.rest && n.midi > 0).map((n) => n.bar);
  const maxBarFromNotes = noteBars.length ? Math.max(...noteBars) : 1;
  const maxBar = Math.max(maxBarFromNotes, chords.length, 1);

  const guitarMeasures: MeasureModel[] = [];
  const bassMeasures: MeasureModel[] = [];

  for (let b = 1; b <= maxBar; b++) {
    const chordSym = chords[b - 1] ?? chords[chords.length - 1] ?? '';
    const inBar = line
      .filter((n) => !n.rest && n.midi > 0 && n.bar === b)
      .sort((a, c) => a.beat - c.beat);
    const events: ScoreEvent[] = [];
    for (const n of inBar) {
      events.push({
        kind: 'note',
        pitch: n.midi,
        startBeat: n.beat,
        duration: n.beats,
        voice: 1,
      });
    }
    guitarMeasures.push({ index: b, events, chord: chordSym });
    bassMeasures.push({
      index: b,
      events: [{ kind: 'rest', startBeat: 0, duration: 4, voice: 1 }],
      chord: chordSym,
    });
  }

  const guitar: PartModel = {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: guitarMeasures,
  };
  const bass: PartModel = {
    id: 'bass',
    name: 'Bass',
    instrumentIdentity: 'acoustic_upright_bass',
    midiProgram: 32,
    clef: 'bass',
    measures: bassMeasures,
  };

  return { title, parts: [guitar, bass] };
}

/** Single source of truth with {@link scoreResultForGce} / reharm progression scoring. */
export function computeGceOverallForMelodyStub(
  notes: MotifNoteLite[],
  input: MelodicVariationGceInput
): number {
  const line = motifNotesToMelodicLine(notes);
  const score = buildStubDuoScoreFromMelodicLine(line, input.chords);
  return scoreResultForGce(score, input.chords, input.sections, input.songwriterId).overallScore;
}

export function generateMelodicVariations(melody: Melody, count: number): VariationCandidate[] {
  if (!melody.length) return [];
  const target = Math.max(3, Math.min(5, Math.floor(count)));
  const baseCell = extractMotifCell(melody, melody.length);
  const candidates: VariationCandidate[] = [];

  for (const tr of VARIATION_TRANSFORM_PRIORITY) {
    const mutated = applyMotifMutation(baseCell, tr);
    if (scoreMotifSimilarity(baseCell, mutated) > SIMILARITY_DEDUP) continue;
    if (candidates.some((c) => scoreMotifSimilarity(c.cell, mutated) > SIMILARITY_DEDUP)) continue;

    const notes = mutationCellToMotifNotes(melody, mutated);
    if (notes.length === 0) continue;

    candidates.push({ transform: tr, cell: mutated, notes });
    if (candidates.length >= target) break;
  }

  return candidates;
}

export function scoreMelodicVariationsForPack(
  candidates: VariationCandidate[],
  input: MelodicVariationGceInput
): ScoredVariation[] {
  const scored = candidates.map((variation) => ({
    variation,
    gceScore: computeGceOverallForMelodyStub(variation.notes, input),
  }));
  scored.sort((a, b) => b.gceScore - a.gceScore);
  return scored;
}

/** One pitch-class per bar (optional) for reharm GCE stub — aligns with {@link ReharmSequenceRequest.melodyPcs}. */
export function stubMelodicLineFromMelodyPcs(
  totalBars: number,
  startBar: number,
  endBar: number,
  melodyPcs: (number | null)[] | undefined
): MelodicNote[] {
  const line: MelodicNote[] = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    let midi = 67;
    if (melodyPcs && bar >= startBar && bar <= endBar) {
      const pc = melodyPcs[bar - startBar];
      if (pc !== null && pc !== undefined && Number.isFinite(pc)) {
        midi = 60 + ((((Math.round(pc) % 12) + 12) % 12) as number);
      }
    }
    line.push({ bar, beat: 1, beats: 2, midi });
  }
  return line;
}

export function gceInputFromCompositionContext(
  context: CompositionContext,
  chordStrip: string[]
): MelodicVariationGceInput {
  return {
    chords: chordStrip,
    sections: gceSectionsFromFormMap(context.form),
    songwriterId: context.generationMetadata?.songwriterStyleId,
  };
}
