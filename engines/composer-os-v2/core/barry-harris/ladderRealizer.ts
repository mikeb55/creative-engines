/**
 * V80k ladder — register-placed voicing realizations per rung (close / drop-2 / shell / dyad).
 */
import { closeBlockVoicingBelowMelody, drop2VoicingBelowMelody } from './blockVoicings';
import { assessGuitarFeasibility } from './guitarVoicingFeasibility';
import type { LadderRung, RealizedVoicing, VoicingShapeType } from './types';

export type LadderRegisterRange = {
  minMelodyMidi: number;
  maxMelodyMidi: number;
};

export type LadderSpacingPreference = 'close' | 'drop2' | 'all';

export type LadderRealizerOptions = {
  registerRange?: LadderRegisterRange;
  spacingPreference?: LadderSpacingPreference;
  allowStretch?: boolean;
};

const DEFAULT_REGISTER: LadderRegisterRange = { minMelodyMidi: 55, maxMelodyMidi: 79 };

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function tonePcsForRung(rung: LadderRung): number[] {
  return [...new Set(rung.abstractClose.map(mod12))];
}

function voicingFingerprint(
  source: LadderRung['source'],
  shapeType: VoicingShapeType,
  pitches: readonly number[]
): string {
  const sorted = [...pitches].sort((a, b) => a - b);
  return `${source}:${shapeType}:${sorted.join(',')}`;
}

function laneSignature(shapeType: VoicingShapeType, innerVoicingMidis: readonly number[]): string {
  const pcs = [...new Set(innerVoicingMidis.map(mod12))].sort((a, b) => a - b);
  return `${shapeType}:${pcs.join('-')}`;
}

function finalizeRealization(
  rung: LadderRung,
  melodyMidi: number,
  innerVoicingMidis: number[],
  shapeType: VoicingShapeType,
  allowStretch: boolean
): RealizedVoicing | null {
  const inner = [...innerVoicingMidis].sort((a, b) => a - b);
  const pitches = [...inner, melodyMidi].sort((a, b) => a - b);
  const feasibility = assessGuitarFeasibility(pitches, { allowStretch });
  if (!feasibility.feasible) return null;
  return {
    rungIndex: rung.index,
    source: rung.source,
    shapeType,
    pitches,
    innerVoicingMidis: inner,
    voicingFingerprint: voicingFingerprint(rung.source, shapeType, pitches),
    guitarFeasible: true,
    guitarFretSpan: feasibility.fretSpan,
    laneSignature: laneSignature(shapeType, inner),
  };
}

function placeInnerFromPcs(melodyMidi: number, pcsBottomUp: readonly number[]): number[] {
  let cursor = melodyMidi - 1;
  const placed: number[] = [];
  for (let i = pcsBottomUp.length - 1; i >= 0; i--) {
    const pc = pcsBottomUp[i]!;
    let pitch = cursor;
    while (mod12(pitch) !== pc) pitch -= 1;
    placed.unshift(pitch);
    cursor = pitch - 1;
  }
  return placed;
}

function shellInnerPcSets(rung: LadderRung): number[][] {
  const inner = rung.abstractClose.map(mod12).filter((pc) => pc !== mod12(rung.melodyPc));
  inner.sort((a, b) => a - b);
  if (inner.length <= 2) return [inner];
  return [
    [inner[0]!, inner[1]!],
    [inner[0]!, inner[inner.length - 1]!],
    [inner[1]!, inner[inner.length - 1]!],
  ];
}

function pushUnique(realizations: RealizedVoicing[], candidate: RealizedVoicing | null): void {
  if (!candidate) return;
  if (realizations.some((r) => r.voicingFingerprint === candidate.voicingFingerprint)) return;
  realizations.push(candidate);
}

export function closeVoicingVariants(
  rung: LadderRung,
  melodyMidi: number,
  allowStretch = true
): RealizedVoicing[] {
  const inner = closeBlockVoicingBelowMelody(melodyMidi, tonePcsForRung(rung));
  const realized = finalizeRealization(rung, melodyMidi, inner, 'close', allowStretch);
  return realized ? [realized] : [];
}

export function drop2VoicingVariants(
  rung: LadderRung,
  melodyMidi: number,
  allowStretch = true
): RealizedVoicing[] {
  const inner = drop2VoicingBelowMelody(melodyMidi, tonePcsForRung(rung));
  const realized = finalizeRealization(rung, melodyMidi, inner, 'drop2', allowStretch);
  return realized ? [realized] : [];
}

export function shellVoicingVariants(
  rung: LadderRung,
  melodyMidi: number,
  allowStretch = true
): RealizedVoicing[] {
  const out: RealizedVoicing[] = [];
  for (const pcs of shellInnerPcSets(rung)) {
    pushUnique(out, finalizeRealization(rung, melodyMidi, placeInnerFromPcs(melodyMidi, pcs), 'shell', allowStretch));
  }
  return out;
}

export function dyadVoicingVariants(
  rung: LadderRung,
  melodyMidi: number,
  allowStretch = true
): RealizedVoicing[] {
  const out: RealizedVoicing[] = [];
  const innerPcs = rung.abstractClose.map(mod12).filter((pc) => pc !== mod12(rung.melodyPc));
  for (const pc of [...new Set(innerPcs)]) {
    for (let drop = 0; drop < 3; drop++) {
      let bass = melodyMidi - 1;
      while (mod12(bass) !== pc) bass -= 1;
      bass -= 12 * drop;
      if (bass >= melodyMidi) continue;
      pushUnique(out, finalizeRealization(rung, melodyMidi, [bass], 'dyad', allowStretch));
    }
  }
 return out;
}

export function singleNoteVoicing(rung: LadderRung, melodyMidi: number): RealizedVoicing {
  const pitches = [melodyMidi];
  const feasibility = assessGuitarFeasibility(pitches);
  return {
    rungIndex: rung.index,
    source: rung.source,
    shapeType: 'single',
    pitches,
    innerVoicingMidis: [],
    voicingFingerprint: voicingFingerprint(rung.source, 'single', pitches),
    guitarFeasible: feasibility.feasible,
    guitarFretSpan: feasibility.fretSpan,
    laneSignature: 'single',
  };
}

export function realizeRungAtMelody(
  rung: LadderRung,
  melodyMidi: number,
  options: LadderRealizerOptions = {}
): RealizedVoicing[] {
  const allowStretch = options.allowStretch ?? true;
  const pref = options.spacingPreference ?? 'all';
  const realizations: RealizedVoicing[] = [];

  if (mod12(melodyMidi) !== mod12(rung.melodyPc)) {
    return realizations;
  }

  if (pref === 'all' || pref === 'close') {
    for (const r of closeVoicingVariants(rung, melodyMidi, allowStretch)) pushUnique(realizations, r);
  }
  if (pref === 'all' || pref === 'drop2') {
    for (const r of drop2VoicingVariants(rung, melodyMidi, allowStretch)) pushUnique(realizations, r);
  }
  if (pref === 'all') {
    for (const r of shellVoicingVariants(rung, melodyMidi, allowStretch)) pushUnique(realizations, r);
    for (const r of dyadVoicingVariants(rung, melodyMidi, allowStretch)) pushUnique(realizations, r);
  }

  return realizations;
}

function melodyMidisForRungPc(rung: LadderRung, range: LadderRegisterRange): number[] {
  const target = mod12(rung.melodyPc);
  const out: number[] = [];
  for (let m = range.minMelodyMidi; m <= range.maxMelodyMidi; m++) {
    if (mod12(m) === target) out.push(m);
  }
  if (out.length > 0) return out;
  let m = range.minMelodyMidi;
  while (mod12(m) !== target) m += 1;
  return m <= range.maxMelodyMidi ? [m] : [range.minMelodyMidi + target];
}

export function realizeLadder(
  ladder: readonly LadderRung[],
  registerRange: LadderRegisterRange = DEFAULT_REGISTER,
  spacingPreference: LadderSpacingPreference = 'all'
): Map<number, RealizedVoicing[]> {
  const map = new Map<number, RealizedVoicing[]>();
  for (const rung of ladder) {
    const bucket: RealizedVoicing[] = [];
    for (const melodyMidi of melodyMidisForRungPc(rung, registerRange)) {
      for (const r of realizeRungAtMelody(rung, melodyMidi, { spacingPreference, allowStretch: true })) {
        pushUnique(bucket, r);
      }
    }
    map.set(rung.index, bucket);
  }
  return map;
}