/**
 * V81d — String quartet voice distribution for Barry Harris chord-melody.
 */

import { closeBlockVoicingBelowMelody, drop2VoicingBelowMelody } from './blockVoicings';
import type { ResolvedChordMelodyNote } from './types';
import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import {
  assessStringQuartetFeasibilityFromVoices,
  sqIntervalPc,
  sqIsDissonantInterval,
  type StringQuartetFeasibilityResult,
} from './assessStringQuartetFeasibility';
import type { PhrasingRole } from './types';

export type SqVoiceMidis = {
  violin1: number | null;
  violin1SustainMidi?: number;
  violin2: number;
  viola: number;
  cello: number;
};

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function distributeStackToSqVoicesRaw(stack: readonly number[]): SqVoiceMidis {
  const sorted = [...stack].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) {
    return { violin1: 60, violin2: 57, viola: 48, cello: 36 };
  }
  if (n === 1) {
    const m = sorted[0]!;
    return { violin1: m, violin2: m, viola: m, cello: m };
  }
  if (n === 2) {
    return { violin1: sorted[1]!, violin2: sorted[0]!, viola: sorted[0]!, cello: sorted[0]! };
  }
  if (n === 3) {
    return { violin1: sorted[2]!, violin2: sorted[1]!, viola: sorted[1]!, cello: sorted[0]! };
  }
  return {
    violin1: sorted[n - 1]!,
    violin2: sorted[n - 2]!,
    viola: sorted[n - 3]!,
    cello: sorted[0]!,
  };
}

/** V81e — pick inner assignment avoiding m2/M7/tritone at violin i boundary. */
export function optimizeSqVoicesAgainstTop(topMidi: number, voices: SqVoiceMidis): SqVoiceMidis {
  const inner = [voices.cello, voices.viola, voices.violin2]
    .filter((m, i, arr) => arr.indexOf(m) === i)
    .sort((a, b) => a - b);

  if (inner.length === 0) {
    return voices;
  }

  let best: SqVoiceMidis | null = null;
  let bestTopLeap = Infinity;

  for (let i = 0; i < inner.length; i++) {
    for (let j = i; j < inner.length; j++) {
      const vc = inner[0]!;
      const vla = inner[i]!;
      const vn2 = inner[j]!;
      if (vc > vla || vla > vn2 || vn2 >= topMidi) continue;
      if (sqIsDissonantInterval(sqIntervalPc(vn2, topMidi))) continue;
      const leap = topMidi - vn2;
      if (leap < bestTopLeap) {
        bestTopLeap = leap;
        best = {
          violin1: voices.violin1,
          violin1SustainMidi: voices.violin1SustainMidi,
          violin2: vn2,
          viola: vla,
          cello: vc,
        };
      }
    }
  }

  if (best) return best;

  const vn2 = voices.violin2;
  if (!sqIsDissonantInterval(sqIntervalPc(vn2, topMidi))) {
    return voices;
  }

  let newViola = vn2;
  while (newViola >= topMidi - 2) newViola -= 12;
  newViola = Math.max(newViola, voices.cello);
  const candidates = inner.filter(
    (m) => m !== vn2 && m < topMidi && !sqIsDissonantInterval(sqIntervalPc(m, topMidi))
  );
  const newVn2 = candidates.length > 0 ? Math.max(...candidates) : vn2;
  if (newVn2 < topMidi && !sqIsDissonantInterval(sqIntervalPc(newVn2, topMidi))) {
    return {
      ...voices,
      violin1: voices.violin1 ?? topMidi,
      violin2: newVn2,
      viola: newViola,
      cello: voices.cello,
    };
  }

  let probe = topMidi - 3;
  while (probe > voices.cello && sqIsDissonantInterval(sqIntervalPc(probe, topMidi))) {
    probe -= 1;
  }
  if (
    probe > voices.cello &&
    !sqIsDissonantInterval(sqIntervalPc(probe, topMidi)) &&
    sqIsDissonantInterval(sqIntervalPc(voices.violin2, topMidi))
  ) {
    return {
      ...voices,
      violin2: probe,
    };
  }

  return voices;
}

export function assignSqVoicesFromStack(stack: readonly number[], melodyMidi: number): SqVoiceMidis {
  const inner = [...stack].filter((m) => m < melodyMidi).sort((a, b) => a - b);
  if (inner.length === 0) {
    return {
      violin1: melodyMidi,
      violin2: melodyMidi - 4,
      viola: melodyMidi - 7,
      cello: melodyMidi - 12,
    };
  }

  const consonant = inner.filter((m) => !sqIsDissonantInterval(sqIntervalPc(m, melodyMidi)));
  const dissonant = inner.filter((m) => sqIsDissonantInterval(sqIntervalPc(m, melodyMidi)));
  const vn2Candidates = consonant.length > 0 ? consonant : inner;
  const vn2 = Math.max(...vn2Candidates);
  const lowerPool = [...inner.filter((m) => m !== vn2)].sort((a, b) => a - b);
  const vc = lowerPool[0] ?? inner[0]!;
  const vla = lowerPool.length > 1 ? lowerPool[lowerPool.length - 1]! : vc;

  return optimizeSqVoicesAgainstTop(melodyMidi, {
    violin1: melodyMidi,
    violin2: vn2,
    viola: Math.max(vc, Math.min(vla, vn2 - 1)),
    cello: vc,
  });
}

export function distributeStackToSqVoices(stack: readonly number[]): SqVoiceMidis {
  const melodyMidi = Math.max(...stack);
  return assignSqVoicesFromStack(stack, melodyMidi);
}

export function passingDimExportDurationBeats(
  event: ResolvedChordMelodyNote,
  allNotes: readonly ResolvedChordMelodyNote[],
  barBeats = 4
): number {
  const nextStructural = allNotes
    .filter((r) => r.bar === event.bar && !r.harmonyOnly && r.onsetBeat > event.onsetBeat)
    .sort((a, b) => a.onsetBeat - b.onsetBeat)[0];
  if (nextStructural) {
    return Math.max(0.5, nextStructural.onsetBeat - event.onsetBeat);
  }
  return Math.max(0.5, barBeats - event.onsetBeat);
}

export function widenSqDimInner(inner: readonly number[], melodyMidi: number): number[] {
  const sorted = [...inner].sort((a, b) => a - b);
  if (sorted.length === 0) return sorted;
  const widened = sorted.map((m) => {
    let out = m;
    while (out + 12 < melodyMidi - 7) out += 12;
    if (out >= melodyMidi) out -= 12;
    return out;
  });
  const dropped = widened.map((m) => (m >= melodyMidi - 5 ? m - 12 : m));
  return [...new Set(dropped.filter((m) => m < melodyMidi))].sort((a, b) => a - b);
}

export function spreadSqDimVoicingBelowMelody(melodyMidi: number, tonePcs: readonly number[]): number[] {
  const drop2 = drop2VoicingBelowMelody(melodyMidi, tonePcs, undefined);
  const widened = widenSqDimInner(
    drop2.length > 0 ? drop2 : closeBlockVoicingBelowMelody(melodyMidi, tonePcs, undefined),
    melodyMidi
  );
  return widened.length > 0 ? widened : drop2;
}

export function distributePassingDimSqVoices(
  innerMidis: readonly number[],
  heldMelodyMidi: number,
  melodyApproachMidi?: number
): SqVoiceMidis {
  const spread = widenSqDimInner(innerMidis, melodyApproachMidi ?? heldMelodyMidi);
  const sorted = [...spread].sort((a, b) => a - b);
  const cello = sorted[0] ?? heldMelodyMidi - 12;
  const viola = sorted[1] ?? sorted[0] ?? cello;
  const vn2 = sorted[sorted.length - 1] ?? viola;
  return {
    violin1: null,
    violin1SustainMidi: heldMelodyMidi,
    violin2: vn2,
    viola: viola,
    cello: cello,
  };
}

function structuralDurationBeats(
  event: ResolvedChordMelodyNote,
  melody: readonly ImportMelodyNote[],
  all: readonly ResolvedChordMelodyNote[]
): number {
  const mel = melody.find((m) => m.bar === event.bar && Math.abs(m.onsetBeat - event.onsetBeat) < 0.02);
  if (mel) return mel.durationBeats;
  const prevMel = melody
    .filter((m) => m.bar === event.bar && m.onsetBeat < event.onsetBeat)
    .sort((a, b) => b.onsetBeat - a.onsetBeat)[0];
  if (prevMel) return prevMel.durationBeats;
  const nextStructural = all
    .filter((r) => r.bar === event.bar && !r.harmonyOnly && r.onsetBeat > event.onsetBeat)
    .sort((a, b) => a.onsetBeat - b.onsetBeat)[0];
  if (nextStructural) return Math.max(0.5, nextStructural.onsetBeat - event.onsetBeat);
  return 1;
}

export function applyStringQuartetDistribution(
  note: ResolvedChordMelodyNote,
  melodyMidi: number,
  heldMelodyMidi: number | null,
  melody: readonly ImportMelodyNote[],
  allNotes: readonly ResolvedChordMelodyNote[]
): ResolvedChordMelodyNote {
  let sqVoiceMidis: SqVoiceMidis;
  let exportDurationBeats: number | undefined;

  if (note.eventKind === 'passing_dim' || note.harmonyOnly) {
    const held = heldMelodyMidi ?? melodyMidi;
    sqVoiceMidis = distributePassingDimSqVoices(note.innerVoicingMidis, held, melodyMidi);
    sqVoiceMidis = optimizeSqVoicesAgainstTop(held, sqVoiceMidis);
    exportDurationBeats = passingDimExportDurationBeats(note, allNotes);
  } else {
    const stack = note.exportStackMidis.length > 0 ? note.exportStackMidis : [melodyMidi];
    sqVoiceMidis = assignSqVoicesFromStack(stack, melodyMidi);
  }

  const feasibility = assessStringQuartetFeasibilityFromVoices(sqVoiceMidis, {
    phrasingRole: note.phrasingRole,
  });

  return {
    ...note,
    sqVoiceMidis,
    sqFeasibilityWarnings: feasibility.warnings,
    guitarFeasible: feasibility.feasible,
    exportDurationBeats,
  };
}

export function assessSqStackFeasibility(
  stack: readonly number[],
  phrasingRole?: PhrasingRole
): StringQuartetFeasibilityResult {
  const voices = distributeStackToSqVoices(stack);
  return assessStringQuartetFeasibilityFromVoices(voices, { phrasingRole });
}
