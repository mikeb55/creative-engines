/**
 * Phrase corpus → engine shapes.
 * Motif seed: `phraseEntryToCoreMotif` used by Phase-2 PoCs (`riffPhraseMotifSeed` — sax/jazz_rock/diminished pairings, flags OFF by default).
 * IntervalWeights merge stays phase 3.
 */

import type { CoreMotif, MotifRegisterTag, MotifRoleTag } from '../motif/motifEngineTypes';
import type { RiffIntervalWeightMap } from '../composer/riffProfileTypes';
import type { RiffPhraseEntry } from './riffPhraseLibraryTypes';
import { pitchedEvents } from './riffPhraseLibraryValidate';

const IC_TO_WEIGHT_KEY: Record<number, keyof RiffIntervalWeightMap> = {
  1: 'm2',
  2: 'M2',
  3: 'm3',
  4: 'M3',
  5: 'P4',
  6: 'tritone',
  7: 'P5',
  9: 'M6',
};

function registerTagsForPhrase(entry: RiffPhraseEntry): MotifRegisterTag[] {
  const span = entry.registerHigh - entry.registerLow;
  const tags: MotifRegisterTag[] = [];
  if (entry.registerCenter < 55) tags.push('low');
  else if (entry.registerCenter > 72) tags.push('high');
  else tags.push('mid');
  tags.push(span <= 12 ? 'narrow' : 'wide');
  return tags;
}

/**
 * Map phrase → CoreMotif for motif-seed (Phase-2 POC / later blend).
 * Does not call generateRiffCoreMotif or touch assignMelodyToBar.
 */
export function phraseEntryToCoreMotif(entry: RiffPhraseEntry): CoreMotif {
  const notes = pitchedEvents(entry.noteEvents);
  const rhythmPattern = notes.map((n, i) => {
    const nextStart = i + 1 < notes.length ? notes[i + 1]!.startBeat : n.startBeat + n.duration;
    return {
      startBeat: n.startBeat,
      duration: Math.max(0.125, Math.min(n.duration, nextStart - n.startBeat)),
    };
  });

  const roleTags: MotifRoleTag[] = [];
  if (entry.chromaticityScore >= 0.35) roleTags.push('chromatic');
  if (entry.tags.some((t) => /guide|chord.?tone/i.test(t))) roleTags.push('guide-tone');
  if (roleTags.length === 0) roleTags.push('chord-tone');

  return {
    id: `phrase:${entry.id}`,
    intervalPattern: [...entry.intervalSequence],
    rhythmPattern,
    contourPattern: [...entry.contour],
    roleTags,
    registerTags: registerTagsForPhrase(entry),
  };
}

/**
 * Histogram of absolute interval classes → RiffIntervalWeightMap shape.
 * Phase-3 soft-merge only — do not write onto live RiffProfile here.
 */
export function phraseEntryToIntervalWeightHist(entry: RiffPhraseEntry): RiffIntervalWeightMap {
  const counts: Partial<Record<keyof RiffIntervalWeightMap, number>> = {};
  let n = 0;
  for (const step of entry.intervalSequence) {
    const ic = Math.abs(step);
    const key = IC_TO_WEIGHT_KEY[ic];
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
    n += 1;
  }
  if (n === 0) return {};
  const out: RiffIntervalWeightMap = {};
  for (const [k, c] of Object.entries(counts) as Array<[keyof RiffIntervalWeightMap, number]>) {
    out[k] = Number((c / n).toFixed(4));
  }
  return out;
}