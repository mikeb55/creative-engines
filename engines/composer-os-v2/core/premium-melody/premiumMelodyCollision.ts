import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import { BEATS_PER_BAR } from './premiumMelodyCellLibrary';

const GAP_CANDIDATES = [0.25, 1 / 3, 0.5, 0.67, 0.75];

/**
 * Smart collision resolution using gap candidates [0.25, 1/3, 0.5, 0.67, 0.75].
 */
export function resolvePremiumMelodyOnsetCollisionsSmart(
  notes: readonly ImportMelodyNote[]
): ImportMelodyNote[] {
  const out: ImportMelodyNote[] = [];
  const lastOnsetByBar = new Map<number, number>();
  const allSlots = [0, 0.25, 1 / 3, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75];

  for (const note of notes) {
    let onsetBeat = note.onsetBeat;
    const prev = lastOnsetByBar.get(note.bar);
    if (prev != null && onsetBeat <= prev + 0.2) {
      let resolved = false;
      for (const gap of GAP_CANDIDATES) {
        const candidate = prev + gap;
        if (candidate <= BEATS_PER_BAR - 0.25) {
          onsetBeat = candidate;
          resolved = true;
          break;
        }
      }
      if (!resolved) {
        for (const slot of allSlots) {
          if (slot > prev + 0.2) {
            onsetBeat = slot;
            resolved = true;
            break;
          }
        }
      }
      if (!resolved) onsetBeat = Math.min(BEATS_PER_BAR - 0.25, prev + 0.25);
    }
    lastOnsetByBar.set(note.bar, onsetBeat);
    out.push({ ...note, onsetBeat });
  }
  return out;
}
