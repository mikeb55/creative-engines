/**
 * Dual-electric Sonic Youth polychord score builders (no bass / 8-bar proto).
 * Guitar 1 = AAEEAA; Guitar 2 = ACCGG♯C. Grips via solveGuitarGrip({ openStrings }).
 */

import { solveGuitarGrip } from '../guitar/voicingFeasibility';
import type { ChordEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { addEvent, createMeasure, createScore } from '../score-model/scoreEventBuilder';
import type { SYSixStringMidi } from '../sy-tuning/syTuningTypes';
import { QUALITY_INTERVALS, type TriadQuality } from '../wwh/wwhTriadPair';

/** Lee AAEEAA opens — 6→1. A2 A2 E3 E3 A3 A3. */
export const SY_PROTO_LEE_AAEEAA_OPEN: SYSixStringMidi = [45, 45, 52, 52, 57, 57];

/** Thurston ACCGG♯C opens — 6→1. A2 C3 C3 G3 G♯3 C4. */
export const SY_PROTO_ACCGGSHARP_C_OPEN: SYSixStringMidi = [45, 48, 48, 55, 56, 60];

export type SyProtoTriadQuality = TriadQuality;
export type SyProtoTriadInput = {
  rootPc: number;
  quality: SyProtoTriadQuality;
};

export type SonicYouthOneBarPolychordResult = {
  score: ScoreModel;
  guitar1Pitches: number[];
  guitar2Pitches: number[];
  guitar1OpenPitches: SYSixStringMidi;
  guitar2OpenPitches: SYSixStringMidi;
};

export type SyProtoPolychordPair = {
  guitar1: SyProtoTriadInput;
  guitar2: SyProtoTriadInput;
};

/** Optional per-guitar opens (MIDI 6→1). Omitted → AAEEAA / ACCGG#C. */
export type SonicYouthPolychordTuningOptions = {
  guitar1Tuning?: readonly number[];
  guitar2Tuning?: readonly number[];
};

export type SonicYouthPolychordProgressionResult = {
  score: ScoreModel;
  bars: SonicYouthOneBarPolychordResult[];
  guitar1OpenPitches: SYSixStringMidi;
  guitar2OpenPitches: SYSixStringMidi;
};

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** MIDI → note+octave (e.g. 45 → A2). */
function midiToNoteOctave(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${PC_NAMES[pc]!}${octave}`;
}

/** Part label from opens 6→1, e.g. "Guitar 1 (A2 A2 E3 E3 A3 A3)". */
function guitarPartNameFromOpens(
  guitarLabel: 'Guitar 1' | 'Guitar 2',
  opens: readonly number[]
): string {
  return `${guitarLabel} (${opens.map(midiToNoteOctave).join(' ')})`;
}

function chordAt(pitches: number[], startBeat: number, duration: number, voice = 1): ChordEvent {
  return {
    kind: 'chord',
    pitches: [...pitches].sort((a, b) => a - b),
    startBeat,
    duration,
    voice,
  };
}

function normalizeRootPc(rootPc: number): number {
  return ((rootPc % 12) + 12) % 12;
}

function triadLabel(triad: SyProtoTriadInput): string {
  const root = PC_NAMES[normalizeRootPc(triad.rootPc)] ?? '?';
  return `${root} ${triad.quality}`;
}

function triadPitchClasses(triad: SyProtoTriadInput): [number, number, number] {
  const root = normalizeRootPc(triad.rootPc);
  const intervals = QUALITY_INTERVALS[triad.quality];
  const third = normalizeRootPc(root + intervals.third);
  const fifth = normalizeRootPc(root + intervals.fifth);
  return [root, third, fifth];
}

function midisForPcInRange(pc: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) {
    if (normalizeRootPc(m) === normalizeRootPc(pc)) out.push(m);
  }
  return out;
}

/**
 * Resolve open-string MIDI for one guitar.
 * Supplied tunings: six integers 0–127, physical order 6→1; repeats / non-ascending allowed.
 */
function resolveOpenTuning(
  raw: readonly number[] | undefined,
  fallback: SYSixStringMidi,
  guitarLabel: 'Guitar 1' | 'Guitar 2'
): SYSixStringMidi {
  if (raw === undefined) return fallback;
  if (
    !Array.isArray(raw) ||
    raw.length !== 6 ||
    !raw.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 127)
  ) {
    throw new Error(
      `${guitarLabel} tuning must contain six integer MIDI pitches in 0–127 (string order 6→1)`
    );
  }
  return [raw[0]!, raw[1]!, raw[2]!, raw[3]!, raw[4]!, raw[5]!];
}

function solveTriadGripOnOpens(
  opens: readonly number[],
  triad: SyProtoTriadInput,
  guitarLabel: 'Guitar 1' | 'Guitar 2'
): number[] {
  const pcs = triadPitchClasses(triad);
  if (new Set(pcs).size !== 3) {
    throw new Error(`${guitarLabel} grip unavailable for ${triadLabel(triad)} (degenerate triad)`);
  }
  const lo = Math.min(...opens);
  const hi = Math.max(...opens) + 15;
  const pools = pcs.map((pc) => midisForPcInRange(pc, lo, hi));
  let best: { midis: number[]; span: number; lowest: number } | null = null;
  for (const a of pools[0]!) {
    for (const b of pools[1]!) {
      for (const c of pools[2]!) {
        const midis = [a, b, c];
        if (new Set(midis).size !== 3) continue;
        const solved = solveGuitarGrip(midis, { openStrings: opens });
        if (!solved.feasible || solved.frets.length !== 3) continue;
        const candidate = { midis, span: solved.fretSpan, lowest: solved.lowestFret };
        if (
          !best ||
          candidate.span < best.span ||
          (candidate.span === best.span && candidate.lowest < best.lowest)
        ) {
          best = candidate;
        }
      }
    }
  }
  if (!best) {
    throw new Error(`${guitarLabel} grip unavailable for ${triadLabel(triad)}`);
  }
  return best.midis.slice().sort((x, y) => x - y);
}

function electricGuitarTriadPart(
  id: 'guitar' | 'guitar_2',
  name: string,
  pitches: number[]
): PartModel {
  const m = createMeasure(1, undefined);
  addEvent(m, chordAt(pitches, 0, 4, 1));
  return {
    id,
    name,
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  };
}

/**
 * One-bar dual-electric polychord (no bass).
 * Reference pair: D major (G1) + E major (G2).
 * Optional tunings → solveGuitarGrip({ openStrings }); default AAEEAA / ACCGG#C.
 */
export function buildSonicYouthOneBarPolychordScore(
  guitar1Triad: SyProtoTriadInput,
  guitar2Triad: SyProtoTriadInput,
  options?: SonicYouthPolychordTuningOptions
): SonicYouthOneBarPolychordResult {
  const g1Open = resolveOpenTuning(options?.guitar1Tuning, SY_PROTO_LEE_AAEEAA_OPEN, 'Guitar 1');
  const g2Open = resolveOpenTuning(options?.guitar2Tuning, SY_PROTO_ACCGGSHARP_C_OPEN, 'Guitar 2');
  const guitar1Pitches = solveTriadGripOnOpens(g1Open, guitar1Triad, 'Guitar 1');
  const guitar2Pitches = solveTriadGripOnOpens(g2Open, guitar2Triad, 'Guitar 2');
  if (new Set(guitar1Pitches).size !== 3) {
    throw new Error(`Guitar 1 grip unavailable for ${triadLabel(guitar1Triad)}`);
  }
  if (new Set(guitar2Pitches).size !== 3) {
    throw new Error(`Guitar 2 grip unavailable for ${triadLabel(guitar2Triad)}`);
  }

  const guitar1 = electricGuitarTriadPart(
    'guitar',
    guitarPartNameFromOpens('Guitar 1', g1Open),
    guitar1Pitches
  );
  const guitar2 = electricGuitarTriadPart(
    'guitar_2',
    guitarPartNameFromOpens('Guitar 2', g2Open),
    guitar2Pitches
  );
  const score = createScore('Sonic Youth one-bar polychord prototype', [guitar1, guitar2], {
    tempo: 96,
  });
  score.exportStaffTuningByPartId = {
    guitar: g1Open,
    guitar_2: g2Open,
  };

  return {
    score,
    guitar1Pitches,
    guitar2Pitches,
    guitar1OpenPitches: g1Open,
    guitar2OpenPitches: g2Open,
  };
}

/**
 * Multi-bar dual-electric polychord progression (no bass).
 * Grip failure reports bar, guitar, and chord.
 * Optional tunings validated once (guitar-labelled); defaults AAEEAA / ACCGG#C.
 */
export function buildSonicYouthPolychordProgressionScore(
  pairs: readonly SyProtoPolychordPair[],
  options?: SonicYouthPolychordTuningOptions
): SonicYouthPolychordProgressionResult {
  if (pairs.length === 0) {
    throw new Error('polychord progression requires at least one { guitar1, guitar2 } pair');
  }

  const g1Open = resolveOpenTuning(options?.guitar1Tuning, SY_PROTO_LEE_AAEEAA_OPEN, 'Guitar 1');
  const g2Open = resolveOpenTuning(options?.guitar2Tuning, SY_PROTO_ACCGGSHARP_C_OPEN, 'Guitar 2');
  const tuningOpts: SonicYouthPolychordTuningOptions = {
    guitar1Tuning: g1Open,
    guitar2Tuning: g2Open,
  };

  const bars: SonicYouthOneBarPolychordResult[] = [];
  const g1Measures = [];
  const g2Measures = [];

  for (let i = 0; i < pairs.length; i++) {
    const bar = i + 1;
    const pair = pairs[i]!;
    let oneBar: SonicYouthOneBarPolychordResult;
    try {
      oneBar = buildSonicYouthOneBarPolychordScore(pair.guitar1, pair.guitar2, tuningOpts);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`bar ${bar}: ${detail}`);
    }
    bars.push(oneBar);

    const srcG1 = oneBar.score.parts.find((p) => p.id === 'guitar');
    const srcG2 = oneBar.score.parts.find((p) => p.id === 'guitar_2');
    if (!srcG1?.measures[0] || !srcG2?.measures[0]) {
      throw new Error(`bar ${bar}: one-bar score missing guitar parts`);
    }
    const m1 = createMeasure(bar, srcG1.measures[0].chord);
    for (const e of srcG1.measures[0].events) addEvent(m1, e);
    const m2 = createMeasure(bar, srcG2.measures[0].chord);
    for (const e of srcG2.measures[0].events) addEvent(m2, e);
    g1Measures.push(m1);
    g2Measures.push(m2);
  }

  const guitar1: PartModel = {
    id: 'guitar',
    name: guitarPartNameFromOpens('Guitar 1', g1Open),
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: g1Measures,
  };
  const guitar2: PartModel = {
    id: 'guitar_2',
    name: guitarPartNameFromOpens('Guitar 2', g2Open),
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: g2Measures,
  };

  const score = createScore('Sonic Youth polychord progression prototype', [guitar1, guitar2], {
    tempo: 96,
  });
  score.exportStaffTuningByPartId = {
    guitar: g1Open,
    guitar_2: g2Open,
  };

  return {
    score,
    bars,
    guitar1OpenPitches: g1Open,
    guitar2OpenPitches: g2Open,
  };
}
