/**
 * Melody V2 — deterministic phrase-slot variation on repeated 4-bar sections.
 */

import type { CompositionContext } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel } from '../score-model/scoreModelTypes';
import { isGuitarBassDuoFamily, isStandardGuitarBassDuo } from '../presets/guitarBassDuoPresetIds';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import {
  type DuoVaultMotifSnapReceipt,
  vaultMotifSnapReceiptsForGuard,
} from './duoVaultMotifContourSnap';

function voice1SortedNotes(m: MeasureModel): NoteEvent[] {
  return m.events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);
}

function phraseSlotIndex(bar: number): number {
  return Math.floor((bar - 1) / 4);
}

function peakNote(notes: NoteEvent[]): NoteEvent | undefined {
  if (notes.length === 0) return undefined;
  return notes.reduce((a, b) => (a.pitch >= b.pitch ? a : b));
}

/** Post-pass: vary approach to phrase peak on 2nd+ occurrence of same 4-bar slot. */
export function applyPhraseVariationPass(
  guitar: PartModel,
  context: CompositionContext,
  seed: number,
  localSnapReceipts?: readonly DuoVaultMotifSnapReceipt[],
): void {
  if (context.presetId === 'ecm_chamber') return;
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  const vaultReceipts = vaultMotifSnapReceiptsForGuard(context, localSnapReceipts);
  if (
    isStandardGuitarBassDuo(context.presetId) &&
    vaultReceipts?.length &&
    context.generationMetadata?.duoVaultMotifEnabled !== false
  ) {
    return;
  }

  const seenSlots = new Map<number, { peakPitch: number; lastBar: number }>();

  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const slot = phraseSlotIndex(m.index);
    if (slot === 0) {
      const notes = voice1SortedNotes(m);
      const pk = peakNote(notes);
      if (pk) seenSlots.set(0, { peakPitch: pk.pitch, lastBar: m.index });
      continue;
    }
    const prior = seenSlots.get(slot);
    const notes = voice1SortedNotes(m);
    if (!prior || notes.length === 0) {
      const pk = peakNote(notes);
      if (pk) seenSlots.set(slot, { peakPitch: pk.pitch, lastBar: m.index });
      continue;
    }

    const variationIdx = (slot + seed) % 3;
    const pk = peakNote(notes);
    if (!pk) continue;

    if (variationIdx === 0) {
      const dir = seededUnit(seed, m.index, 73001) < 0.5 ? -1 : 1;
      pk.pitch = clampPitch(pk.pitch + dir, 40, 84);
    } else if (variationIdx === 1 && m.index % 4 === 3) {
      const evIdx = m.events.indexOf(pk);
      if (evIdx >= 0) {
        const shifted = Math.max(0, pk.startBeat - 0.25);
        m.events[evIdx] = { ...pk, startBeat: shifted };
      }
    } else if (variationIdx === 2 && m.index % 4 === 0) {
      const last = notes[notes.length - 1];
      if (last) {
        const evIdx = m.events.indexOf(last);
        if (evIdx >= 0) {
          m.events[evIdx] = { ...last, pitch: clampPitch(last.pitch + 2, 40, 84) };
        }
      }
    }

    seenSlots.set(slot, { peakPitch: pk.pitch, lastBar: m.index });
  }
}
