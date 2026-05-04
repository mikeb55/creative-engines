import { generateVaultRiff, type ScoreNote } from '../guitar/vaultRiffGenerator';
import type { EmotionalDrift } from '../harmony/reharmCandidateEngine';
import { mapChordToVaultType } from './chordSymbolMapper';
import { parseIRealProInput } from './irealProAdapter';

export type IRealVaultOutput = {
  title: string;
  key: string | null;
  bars: number;
  generatedNotes: ScoreNote[];
  chordMappings: { barIndex: number; symbol: string; vaultChordTypeId: string; rootPc: number }[];
  unmappedChords: { barIndex: number; symbol: string }[];
};

export type GenerateFromIRealOptions = {
  riffStyle?: 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string' | 'bebop-placement';
  tuningId?: string;
  /** Reserved for future reharm / candidate bias; not applied in this pipeline yet. */
  drift?: EmotionalDrift;
};

/**
 * Parse iReal input, map each bar’s first chord to the Vault, and concatenate **1-bar** riffs on a **4/4** timeline.
 */
export function generateFromIReal(input: string, options?: GenerateFromIRealOptions): IRealVaultOutput {
  void options?.drift;
  const chart = parseIRealProInput(input);
  const measures = chart.measures ?? [];
  const bars = measures.length;
  const riffStyle = options?.riffStyle ?? 'bebop-placement';
  const tuningId = options?.tuningId ?? 'standard';

  const generatedNotes: ScoreNote[] = [];
  const chordMappings: IRealVaultOutput['chordMappings'] = [];
  const unmappedChords: IRealVaultOutput['unmappedChords'] = [];

  for (let barIndex = 0; barIndex < measures.length; barIndex++) {
    const measure = measures[barIndex];
    const first = measure?.[0];
    if (!first) continue;

    const mapped = mapChordToVaultType(first);
    if (!mapped) {
      unmappedChords.push({ barIndex, symbol: first.symbol });
      continue;
    }

    chordMappings.push({
      barIndex,
      symbol: first.symbol,
      vaultChordTypeId: mapped.vaultChordTypeId,
      rootPc: mapped.rootPc,
    });

    const barNotes = generateVaultRiff({
      chordTypeId: mapped.vaultChordTypeId,
      rootPc: mapped.rootPc,
      bars: 1,
      style: riffStyle,
      tuningId,
    });

    const beatOffset = barIndex * 4;
    for (const n of barNotes) {
      generatedNotes.push({
        ...n,
        startBeat: n.startBeat + beatOffset,
        barIndex,
      });
    }
  }

  return {
    title: chart.title,
    key: chart.key,
    bars,
    generatedNotes,
    chordMappings,
    unmappedChords,
  };
}
