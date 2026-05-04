import { buildBeatContextLegalityMap } from '../harmony/beatContextLegalityMap';
import type { NoteTag } from '../harmony/noteTag';
import { selectQuadratonicMelodySpec } from '../harmony/quadratonicMelodySelector';
import { buildGuitarGripLibrary } from './guitarGripLibrary';
import type { FretboardRealization } from './fretboardRealization';
import { getAlternateGuitarTuningPreset } from '../song-mode/alternateGuitarTunings';

const STANDARD_OPEN_MIDIS: readonly number[] = [40, 45, 50, 55, 59, 64];

const NOTE_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function parseScientificToMidi(note: string): number | null {
  const m = /^\s*([A-Ga-g])([#b]?)(-?\d+)\s*$/.exec(note);
  if (!m) return null;
  const step = m[1]!.toUpperCase();
  const acc = m[2] ?? '';
  const key = `${step}${acc}`;
  const semi = NOTE_SEMITONE[key];
  if (semi === undefined) return null;
  const oct = Number(m[3]);
  if (!Number.isFinite(oct)) return null;
  return (oct + 1) * 12 + semi;
}

function openStringMidis(tuningId: string): number[] {
  const preset = getAlternateGuitarTuningPreset(tuningId);
  if (!preset || preset.id === 'custom') return [...STANDARD_OPEN_MIDIS];
  const midis: number[] = [];
  for (const s of preset.strings) {
    const mm = parseScientificToMidi(s);
    if (mm === null) return [...STANDARD_OPEN_MIDIS];
    midis.push(mm);
  }
  return midis.length === 6 ? midis : [...STANDARD_OPEN_MIDIS];
}

function relToAbs(rootPc: number, rel: number): number {
  return normalizePc(rootPc + rel);
}

export type ScoreNote = {
  pitch: number;
  startBeat: number;
  duration: number;
  guitarString: number;
  guitarFret: number;
  barIndex: number;
};

export type VaultRiffStyle =
  | 'quadratonic'
  | 'dyad-seesaw'
  | 'triad-pair-pendulum'
  | 'pedal-string'
  | 'bebop-placement';

export type GenerateVaultRiffOptions = {
  chordTypeId: string;
  rootPc: number;
  bars: 1 | 2 | 4 | 8;
  style: VaultRiffStyle;
  tuningId?: string;
  /**
   * Eighth-note subdivisions per measure (4/4 ⇒ 8). Derived from time signature
   * as `num * 8 / den` (e.g. 3/4 ⇒ 6).
   */
  eighthsPerBar?: number;
};

function isStrongPillar(posInBar: number, eighthsPerBar: number): boolean {
  if (posInBar === 0) return true;
  const half = eighthsPerBar / 2;
  return Number.isInteger(half) && half > 0 && posInBar === half;
}

/** Even eighth positions that are not the two primary pillars (4/4: 2 and 6). */
function isWeakStructuralEven(posInBar: number, eighthsPerBar: number): boolean {
  if (posInBar % 2 !== 0) return false;
  if (posInBar === 0) return false;
  const half = eighthsPerBar / 2;
  if (Number.isInteger(half) && posInBar === half) return false;
  return true;
}

/**
 * Strong = bar pillars (4/4: 1 and 3); weak = other structural beats; offbeats = remaining eighths.
 * @param posInBar 0..eighthsPerBar-1
 */
function targetPcForEighth(
  posInBar: number,
  eighthsPerBar: number,
  triadPcs: number[],
  tensionPc: number,
  legality: Map<number, NoteTag>,
  nextStrongTarget: number
): number {
  if (isStrongPillar(posInBar, eighthsPerBar)) {
    const idx = posInBar === 0 ? 0 : 1;
    return triadPcs[idx % triadPcs.length]!;
  }
  if (isWeakStructuralEven(posInBar, eighthsPerBar)) {
    const tTag = legality.get(tensionPc);
    if (tTag?.beatLegality === 'weak') return tensionPc;
    return triadPcs[1] ?? triadPcs[0]!;
  }
  const approach = normalizePc(nextStrongTarget - 1);
  if (legality.get(approach)) return approach;
  return tensionPc;
}

function findPlacement(
  openMidis: readonly number[],
  grips: FretboardRealization[],
  absPc: number
): { pitch: number; guitarString: number; guitarFret: number } | null {
  const want = normalizePc(absPc);
  for (const g of grips) {
    for (let i = 0; i < g.pitchClasses.length; i++) {
      if (normalizePc(g.pitchClasses[i]!) === want) {
        const s = g.strings[i]!;
        const f = g.frets[i]!;
        return { pitch: openMidis[s]! + f, guitarString: s, guitarFret: f };
      }
    }
  }
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= 15; f++) {
      if (normalizePc(openMidis[s]! + f) === want) {
        return { pitch: openMidis[s]! + f, guitarString: s, guitarFret: f };
      }
    }
  }
  return null;
}

/**
 * Produces a deterministic eighth-note line with vault legality and string/fret metadata.
 * Default 8 eighths per bar (4/4); pass `eighthsPerBar` for other meters.
 */
export function generateVaultRiff(options: GenerateVaultRiffOptions): ScoreNote[] {
  const { chordTypeId, rootPc, bars, style } = options;
  const tuningId = options.tuningId ?? 'standard';
  const eighthsPerBar = Math.max(1, Math.floor(options.eighthsPerBar ?? 8));
  const legality = buildBeatContextLegalityMap(chordTypeId, rootPc);
  const spec = selectQuadratonicMelodySpec(chordTypeId);
  if (!spec || legality.size === 0) return [];

  const openMidis = openStringMidis(tuningId);
  const grips = buildGuitarGripLibrary(chordTypeId, rootPc, tuningId);

  const root = normalizePc(rootPc);
  const triadPcs = spec.melodicTriad.map((t) => relToAbs(root, t.pitchClassFromRoot));
  const tensionPc = relToAbs(root, spec.primaryTension.pitchClassFromRoot);
  const quad = [
    ...new Set([...triadPcs.map(normalizePc), normalizePc(tensionPc)]),
  ].sort((a, b) => a - b);

  const totalEighths = bars * eighthsPerBar;
  const out: ScoreNote[] = [];

  const dyadGrips = grips.filter(
    (g) => g.pitchClasses.length === 2 && (g.tonalRole === 'triad' || g.tonalRole === 'tensionQuadratonic')
  );
  const firstDyad = dyadGrips[0] ?? null;

  for (let i = 0; i < totalEighths; i++) {
    const barIndex = Math.floor(i / eighthsPerBar) + 1;
    const posInBar = i % eighthsPerBar;
    const startBeat = posInBar * 0.5;
    const nextI = i + 1;
    const nextPos = nextI < totalEighths ? nextI % eighthsPerBar : 0;
    const half = eighthsPerBar / 2;
    const nextOnPillar =
      nextPos === 0 || (Number.isInteger(half) && half > 0 && nextPos === half);
    const nextStrongPc = nextOnPillar
      ? triadPcs[nextPos === 0 ? 0 : 1]!
      : triadPcs[0]!;

    let targetPc = triadPcs[0]!;

    switch (style) {
      case 'quadratonic':
        if (isStrongPillar(posInBar, eighthsPerBar)) {
          targetPc = triadPcs[posInBar === 0 ? 0 : 1] ?? triadPcs[0]!;
        } else if (isWeakStructuralEven(posInBar, eighthsPerBar)) {
          targetPc = tensionPc;
        } else {
          targetPc = quad[(i + 1) % Math.max(1, quad.length)]!;
        }
        break;
      case 'dyad-seesaw':
        if (firstDyad && firstDyad.pitchClasses.length >= 2) {
          targetPc = normalizePc(firstDyad.pitchClasses[i % 2]!);
        } else {
          targetPc = triadPcs[i % 3]!;
        }
        break;
      case 'triad-pair-pendulum': {
        const pend = quad.length >= 2 ? [quad[0]!, quad[quad.length - 1]!] : [triadPcs[0]!, tensionPc];
        targetPc = pend[i % 2]!;
        break;
      }
      case 'pedal-string':
        if (isStrongPillar(posInBar, eighthsPerBar)) {
          targetPc = root;
        } else {
          targetPc = targetPcForEighth(posInBar, eighthsPerBar, triadPcs, tensionPc, legality, nextStrongPc);
        }
        break;
      case 'bebop-placement':
        targetPc = targetPcForEighth(posInBar, eighthsPerBar, triadPcs, tensionPc, legality, nextStrongPc);
        break;
      default:
        targetPc = targetPcForEighth(posInBar, eighthsPerBar, triadPcs, tensionPc, legality, nextStrongPc);
    }

    if (style === 'pedal-string' && isStrongPillar(posInBar, eighthsPerBar)) {
      let fretHi = -1;
      for (let f = 0; f <= 15; f++) {
        if (normalizePc(openMidis[5]! + f) === root) {
          fretHi = f;
          break;
        }
      }
      if (fretHi >= 0) {
        out.push({
          pitch: openMidis[5]! + fretHi,
          startBeat,
          duration: 0.5,
          guitarString: 5,
          guitarFret: fretHi,
          barIndex,
        });
        continue;
      }
    }

    const pl = findPlacement(openMidis, grips, targetPc);
    if (!pl) continue;
    out.push({
      pitch: pl.pitch,
      startBeat,
      duration: 0.5,
      guitarString: pl.guitarString,
      guitarFret: pl.guitarFret,
      barIndex,
    });
  }

  return out;
}
