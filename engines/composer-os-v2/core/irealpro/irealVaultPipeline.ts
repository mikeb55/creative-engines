import { getProfileForMode, planPhrase, type GenerationMode } from '../generation';
import { generateVaultRiff, type ScoreNote } from '../guitar/vaultRiffGenerator';
import type { EmotionalDrift } from '../harmony/reharmCandidateEngine';
import { mapChordToVaultType } from './chordSymbolMapper';
import { parseIRealProInput } from './irealProAdapter';
import type { ParsedChart } from './parsedChart';

export type IRealVaultOutput = {
  title: string;
  key: string | null;
  bars: number;
  generatedNotes: ScoreNote[];
  chordMappings: { barIndex: number; symbol: string; vaultChordTypeId: string; rootPc: number }[];
  unmappedChords: { barIndex: number; symbol: string }[];
  mode: GenerationMode;
};

export type GenerateFromIRealOptions = {
  riffStyle?: 'quadratonic' | 'dyad-seesaw' | 'triad-pair-pendulum' | 'pedal-string' | 'bebop-placement';
  tuningId?: string;
  /** Reserved for future reharm / candidate bias; not applied in this pipeline yet. */
  drift?: EmotionalDrift;
  /** Build I — solo (dense / bar-reactive) vs melody (sparse / phrase-oriented). */
  mode?: GenerationMode;
};

/**
 * Map each bar’s first chord to the Vault and concatenate **1-bar** riffs on a **4/4** timeline (Build I).
 */
export function generateVaultFromParsedChart(chart: ParsedChart, options?: GenerateFromIRealOptions): IRealVaultOutput {
  void options?.drift;
  const measures = chart.measures ?? [];
  const bars = measures.length;
  const mode: GenerationMode = options?.mode ?? 'solo';
  const profile = getProfileForMode(mode);
  const riffStyleSolo = options?.riffStyle ?? 'bebop-placement';
  const effectiveRiffStyle = mode === 'melody' ? 'quadratonic' : riffStyleSolo;
  const tuningId = options?.tuningId ?? 'standard';

  const generatedNotes: ScoreNote[] = [];
  const chordMappings: IRealVaultOutput['chordMappings'] = [];
  const unmappedChords: IRealVaultOutput['unmappedChords'] = [];

  for (let barIndex = 0; barIndex < measures.length; barIndex++) {
    const phrasePlan = planPhrase(1, mode);

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
      bars: phrasePlan.bars,
      style: effectiveRiffStyle,
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

    if (
      mode === 'melody' &&
      barIndex % 2 === 1 &&
      Math.random() < profile.postCadenceRestProbability
    ) {
      generatedNotes.push({
        pitch: 0,
        startBeat: (barIndex + 1) * 4,
        duration: 0.5,
        guitarString: 0,
        guitarFret: 0,
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
    mode,
  };
}

/**
 * Parse iReal input, map each bar’s first chord to the Vault, and concatenate **1-bar** riffs on a **4/4** timeline.
 */
export function generateFromIReal(input: string, options?: GenerateFromIRealOptions): IRealVaultOutput {
  const chart = parseIRealProInput(input);
  return generateVaultFromParsedChart(chart, options);
}
