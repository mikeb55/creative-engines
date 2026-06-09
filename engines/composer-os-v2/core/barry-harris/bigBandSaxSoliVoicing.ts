/**
 * V81f - Big band 5-voice AATBS sax soli for Barry Harris chord-melody.
 */

import { closeBlockVoicingBelowMelody, drop2VoicingBelowMelody } from './blockVoicings';
import type { ResolvedChordMelodyNote } from './types';
import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import {
  assessBigBandFeasibilityFromVoices,
  type BigBandFeasibilityResult,
} from './assessBigBandFeasibility';
import { passingDimExportDurationBeats } from './stringQuartetVoicing';
import type { PhrasingRole } from './types';

export type BbVoiceMidis = {
  alto1: number | null;
  alto1SustainMidi?: number;
  alto2: number;
  tenor1: number;
  tenor2: number;
  bari: number;
};

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function chromaticApproachMidi(refMidi: number, targetPc: number): number {
  const candidates = [refMidi - 1, refMidi + 1];
  let best = refMidi;
  let bestDist = Infinity;
  for (const m of candidates) {
    const dist = Math.min((mod12(m) - targetPc + 12) % 12, (targetPc - mod12(m) + 12) % 12);
    if (dist < bestDist) {
      bestDist = dist;
      best = m;
    }
  }
  return best;
}

function computeBariFromTenor2(tenor2: number, rootPc: number, stack: readonly number[]): number {
  if (mod12(tenor2 - 12) === mod12(rootPc) && tenor2 - 12 >= 37) {
    return tenor2 - 12;
  }
  let candidate = tenor2 - 12;
  while (candidate >= 37) {
    if (mod12(candidate) === mod12(rootPc)) return candidate;
    candidate -= 1;
  }
  for (const m of [...stack].sort((a, b) => b - a)) {
    const down = m - 12;
    if (down >= 37 && down < tenor2) return down;
  }
  return Math.max(37, tenor2 - 12);
}

/** Expand a 4-note BH rung stack to 5-voice AATBS sax soli. */
export function expandToFiveVoiceSaxSoli(stack: readonly number[], rootPc?: number): BbVoiceMidis {
  const sorted = [...stack].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) {
    return { alto1: 60, alto2: 57, tenor1: 53, tenor2: 50, bari: 38 };
  }
  const top = sorted[n - 1]!;
  let alto2: number;
  let tenor1: number;
  let tenor2: number;
  if (n >= 4) {
    alto2 = sorted[n - 2]!;
    tenor1 = sorted[n - 3]!;
    tenor2 = sorted[n - 4]!;
  } else if (n === 3) {
    alto2 = sorted[1]!;
    tenor1 = sorted[0]!;
    tenor2 = sorted[0]!;
  } else if (n === 2) {
    alto2 = sorted[0]!;
    tenor1 = sorted[0]!;
    tenor2 = sorted[0]!;
  } else {
    alto2 = top;
    tenor1 = top;
    tenor2 = top;
  }
  const effectiveRoot = rootPc ?? mod12(tenor2);
  const bari = computeBariFromTenor2(tenor2, effectiveRoot, sorted);
  return { alto1: top, alto2, tenor1, tenor2, bari };
}

export function widenBbDimInner(inner: readonly number[], melodyMidi: number): number[] {
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

export function spreadBbDimVoicingBelowMelody(melodyMidi: number, tonePcs: readonly number[]): number[] {
  const drop2 = drop2VoicingBelowMelody(melodyMidi, tonePcs, undefined);
  const widened = widenBbDimInner(
    drop2.length > 0 ? drop2 : closeBlockVoicingBelowMelody(melodyMidi, tonePcs, undefined),
    melodyMidi
  );
  return widened.length > 0 ? widened : drop2;
}

function nextStructuralRootPc(
  note: ResolvedChordMelodyNote,
  all: readonly ResolvedChordMelodyNote[]
): number {
  const next = all
    .filter(
      (r) =>
        r.eventKind !== 'passing_dim' &&
        !r.harmonyOnly &&
        (r.bar > note.bar || (r.bar === note.bar && r.onsetBeat > note.onsetBeat))
    )
    .sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat)[0];
  if (!next) return mod12(note.anchor.sixthRootPc);
  return mod12(next.anchor.sixthRootPc);
}

export function distributePassingDimBbVoices(
  innerMidis: readonly number[],
  heldMelodyMidi: number,
  melodyApproachMidi: number | undefined,
  nextRootPc: number,
  refBassMidi: number
): BbVoiceMidis {
  const spread = widenBbDimInner(innerMidis, melodyApproachMidi ?? heldMelodyMidi);
  const sorted = [...spread].sort((a, b) => a - b);
  const alto2 = sorted[sorted.length - 1] ?? heldMelodyMidi - 5;
  const tenor1 = sorted[sorted.length - 2] ?? sorted[0] ?? alto2 - 4;
  const tenor2 = sorted[sorted.length - 3] ?? sorted[0] ?? tenor1 - 4;
  const bari = chromaticApproachMidi(refBassMidi, nextRootPc);
  return {
    alto1: null,
    alto1SustainMidi: heldMelodyMidi,
    alto2,
    tenor1,
    tenor2,
    bari,
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

export function applyBigBandDistribution(
  note: ResolvedChordMelodyNote,
  melodyMidi: number,
  heldMelodyMidi: number | null,
  melody: readonly ImportMelodyNote[],
  allNotes: readonly ResolvedChordMelodyNote[]
): ResolvedChordMelodyNote {
  let bbVoiceMidis: BbVoiceMidis;
  let exportDurationBeats: number | undefined;
  let exportBariDurationBeats: number | undefined;

  if (note.eventKind === 'passing_dim' || note.harmonyOnly) {
    const held = heldMelodyMidi ?? melodyMidi;
    const nextRoot = nextStructuralRootPc(note, allNotes);
    const refBass =
      heldMelodyMidi != null
        ? heldMelodyMidi - 12
        : note.innerVoicingMidis.length > 0
          ? Math.min(...note.innerVoicingMidis)
          : melodyMidi - 12;
    bbVoiceMidis = distributePassingDimBbVoices(
      note.innerVoicingMidis,
      held,
      melodyMidi,
      nextRoot,
      refBass
    );
    const structural = structuralDurationBeats(note, melody, allNotes);
    exportDurationBeats = passingDimExportDurationBeats(note, allNotes);
    exportBariDurationBeats = 1;
  } else {
    const stack = note.exportStackMidis.length > 0 ? note.exportStackMidis : [melodyMidi];
    bbVoiceMidis = expandToFiveVoiceSaxSoli(stack, mod12(note.anchor.sixthRootPc));
    if (bbVoiceMidis.alto1 == null || mod12(bbVoiceMidis.alto1) !== mod12(melodyMidi)) {
      bbVoiceMidis = { ...bbVoiceMidis, alto1: melodyMidi };
    }
  }

  const feasibility = assessBigBandFeasibilityFromVoices(bbVoiceMidis, {
    phrasingRole: note.phrasingRole,
  });

  return {
    ...note,
    bbVoiceMidis,
    bbFeasibilityWarnings: feasibility.warnings,
    guitarFeasible: feasibility.feasible,
    exportDurationBeats,
    exportBariDurationBeats,
  };
}

export function assessBbStackFeasibility(
  stack: readonly number[],
  phrasingRole?: PhrasingRole,
  rootPc?: number
): BigBandFeasibilityResult {
  const voices = expandToFiveVoiceSaxSoli(stack, rootPc);
  return assessBigBandFeasibilityFromVoices(voices, { phrasingRole });
}