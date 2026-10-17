/**
 * V3.4 E1 checkpoint 3B — pitch membership only.
 * Debussy: guitar notes on bars the harmony slice already marked whole-tone or pentatonic.
 * Messiaen: guitar and bass notes in the slice's selected mode, including its transposition.
 * Rhythm, motif tags, and chord symbols stay. Identity-locked bars and lead-sheet anchors stay.
 * Song Mode's global pitch-field suppression is not changed.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { isProtectedBar } from '../score-integrity/identityLock';
import { debussyGoverningCollection } from './debussySlice';
import { messiaenGovernedPitchClasses } from './messiaenSlice';

export interface E1VoiceRelationsReceipt {
  status: 'applied' | 'refused' | 'refused_blend' | 'refused_no_mode';
  composerId?: string;
  reason?: string;
  collectionBars?: number;
  snappedNotes?: number;
  unchangedNotes?: number;
  modeKey?: string;
  pitchClasses?: number[];
}

function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function anchorBars(context: CompositionContext): Set<number> {
  const rows = context.generationMetadata?.songModeLeadSheetMelodyAnchors;
  const out = new Set<number>();
  if (!rows) return out;
  for (const row of rows) out.add(row.bar);
  return out;
}

function blendBlocks(context: CompositionContext): boolean {
  const blend = context.generationMetadata?.composerProfileBlend;
  return blend?.status === 'phrase_block' || blend?.status === 'secondary_authoritative';
}

function snapPitch(
  pitch: number,
  pcs: readonly number[],
  low: number,
  high: number,
  prevSnapped: number | null,
  dir: -1 | 0 | 1,
): number {
  const inSet = (midi: number) => pcs.includes(pitchClass(midi));
  if (inSet(pitch) && pitch >= low && pitch <= high) return pitch;
  const consider = (floor: number, ceiling: number): number | null => {
    let best: number | null = null;
    let bestScore = Infinity;
    for (let midi = floor; midi <= ceiling; midi++) {
      if (!inSet(midi)) continue;
      let score = Math.abs(midi - pitch);
      if (prevSnapped != null && dir !== 0) {
        const moved = midi - prevSnapped;
        if (moved === 0) score += 2;
        else if (Math.sign(moved) !== dir) score += 6;
      }
      if (score < bestScore) {
        bestScore = score;
        best = midi;
      }
    }
    return best;
  };
  const near = consider(Math.max(low, pitch - 7), Math.min(high, pitch + 7));
  return near ?? consider(low, high) ?? pitch;
}

function snapPart(
  part: PartModel,
  context: CompositionContext,
  pcsForBar: (bar: number, symbol: string) => number[] | null,
  low: number,
  high: number,
  anchors: Set<number>,
): { snapped: number; unchanged: number; bars: number } {
  let snapped = 0;
  let unchanged = 0;
  const bars = new Set<number>();
  let prevOriginal: number | null = null;
  let prevSnapped: number | null = null;
  for (const measure of part.measures) {
    const notes = measure.events
      .filter((event): event is NoteEvent => event.kind === 'note')
      .sort((a, b) => a.startBeat - b.startBeat || (a.voice ?? 1) - (b.voice ?? 1));
    const locked = isProtectedBar(measure.index, context) || anchors.has(measure.index);
    const pcs = locked ? null : pcsForBar(measure.index, measure.chord ?? '');
    if (pcs) bars.add(measure.index);
    for (const note of notes) {
      const original = note.pitch;
      const dir: -1 | 0 | 1 =
        prevOriginal == null ? 0 : original === prevOriginal ? 0 : original > prevOriginal ? 1 : -1;
      if (pcs) {
        const next = snapPitch(original, pcs, low, high, prevSnapped, dir);
        if (next !== original) snapped += 1;
        else unchanged += 1;
        note.pitch = next;
        prevSnapped = next;
      }
      prevOriginal = original;
    }
  }
  return { snapped, unchanged, bars: bars.size };
}

export function applyE1Checkpoint3bPitchMembership(
  score: ScoreModel,
  context: CompositionContext,
): E1VoiceRelationsReceipt {
  const md = context.generationMetadata as GenerationMetadata;
  if (md.e1VoiceRelations !== true) {
    return { status: 'refused', reason: 'flag_off' };
  }
  const composerId = md.songwriterStyleId;
  if (blendBlocks(context)) {
    return { status: 'refused_blend', composerId, reason: 'stage_d_blend_owns_harmony' };
  }
  const guitar = score.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((part) => part.instrumentIdentity === 'acoustic_upright_bass');
  const anchors = anchorBars(context);

  if (composerId === 'debussy' && guitar) {
    const receipts = md.debussyDeviceReceipts ?? [];
    const bars = md.debussyEffectiveHarmonyBars ?? [];
    const result = snapPart(
      guitar,
      context,
      (bar) => debussyGoverningCollection(bar, bars[bar - 1] ?? '', receipts),
      52,
      84,
      anchors,
    );
    return {
      status: 'applied',
      composerId,
      collectionBars: result.bars,
      snappedNotes: result.snapped,
      unchangedNotes: result.unchanged,
    };
  }

  if (composerId === 'messiaen') {
    const modeKey = typeof md.activeMode === 'string' ? md.activeMode : undefined;
    const pcs = messiaenGovernedPitchClasses(modeKey);
    if (!pcs) {
      return {
        status: 'refused_no_mode',
        composerId,
        modeKey,
        reason: 'selected key is not a mode of limited transposition',
      };
    }
    let snapped = 0;
    let unchanged = 0;
    let collectionBars = 0;
    for (const part of [guitar, bass]) {
      if (!part) continue;
      const result = snapPart(part, context, () => pcs, part === bass ? 28 : 52, part === bass ? 55 : 84, anchors);
      snapped += result.snapped;
      unchanged += result.unchanged;
      collectionBars = Math.max(collectionBars, result.bars);
    }
    return {
      status: 'applied',
      composerId,
      modeKey,
      pitchClasses: pcs,
      collectionBars,
      snappedNotes: snapped,
      unchangedNotes: unchanged,
    };
  }

  return { status: 'refused', composerId, reason: 'composer_not_in_checkpoint' };
}
