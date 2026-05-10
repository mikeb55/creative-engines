import { drumDeterministicUnit } from '../big-band/bigBandDrumIntensity';

/** V1.5 default sax-soli semitone offsets (cycle) over the soli window. */
export const BB_V1_5_SOLI_MOTIF: readonly number[] = [0, 2, 4, 5, 7, 5, 4, 2];

function clampInt(n: number, lo: number, hi: number): number {
  const x = Math.round(n);
  return Math.max(lo, Math.min(hi, x));
}

/**
 * V2: blend the base soli motif with:
 * - head-window lead deltas (semitones vs nominal 55+rpc+4 sax anchor after Wyble + mitigation), and
 * - optional bars 1–8 chord-root contour vs bar 1 (harmonic “head motion” when lead deltas flatten to 0).
 */
export function blendSoliMotifWithHeadTheme(
  baseMotif: readonly number[],
  headLeadOffsetsSemitones: readonly number[],
  headChordRootPcs?: readonly number[]
): number[] {
  const L = Math.min(baseMotif.length, headLeadOffsetsSemitones.length);
  const roots = headChordRootPcs?.length === 8 ? headChordRootPcs : undefined;
  const r0 = roots?.[0];
  return baseMotif.map((b, i) => {
    if (i >= L) return b;
    const h = headLeadOffsetsSemitones[i] ?? 0;
    const pull = clampInt(h * 0.55, -5, 5);
    let contour = 0;
    if (roots != null && typeof r0 === 'number') {
      const ri = roots[i] ?? r0;
      let step = (ri - r0 + 12) % 12;
      if (step > 6) step -= 12;
      contour = clampInt(step / 2, -4, 4);
    }
    return clampInt(b + pull + contour, -12, 12);
  });
}

export interface SaxSoliConfig {
  startBar: number;
  endBar: number;
}

export interface SaxSoliBarPattern {
  leadOffsetSemitones: number;
}

export function generateSaxSoliPhrase(
  chordSequence: string[],
  motif: number[],
  config: SaxSoliConfig
): Map<number, SaxSoliBarPattern> {
  const out = new Map<number, SaxSoliBarPattern>();
  if (motif.length === 0) return out;
  for (let bar = config.startBar; bar <= config.endBar; bar++) {
    if (bar < 1 || bar > chordSequence.length) continue;
    const idx = (bar - config.startBar) % motif.length;
    out.set(bar, { leadOffsetSemitones: motif[idx]! });
  }
  return out;
}

export function generateBrassPunches(
  chordSequence: string[],
  rhythmGrid: number[]
): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (let bar = 1; bar <= chordSequence.length; bar++) {
    const chord = chordSequence[bar - 1] ?? '';
    const prev = bar > 1 ? chordSequence[bar - 2] ?? '' : '';
    const cadenceLike = bar % 4 === 0 || (prev.length > 0 && chord !== prev);
    if (!cadenceLike) continue;
    out.set(bar, [...rhythmGrid]);
  }
  return out;
}

export function generateShoutChorus(chordSequence: string[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  if (chordSequence.length < 24) return out;
  const start = Math.max(1, chordSequence.length - 7);
  const end = Math.max(start, chordSequence.length - 4);
  for (let bar = start; bar <= end; bar++) {
    out.set(bar, [0, 1, 2, 3]);
  }
  return out;
}

export type FigureResponseLevel = 'low' | 'medium' | 'high';

/**
 * Scales brass/shout hit maps for ensemble “dialogue” vs background comping.
 * `medium` copies baseline generators; `low` thins hits; `high` adds secondary punches.
 */
export function applyFigureResponseToPunchMaps(
  brass: Map<number, number[]>,
  shout: Map<number, number[]>,
  chordLen: number,
  opts: { figureResponse?: FigureResponseLevel; seed: number }
): { brass: Map<number, number[]>; shout: Map<number, number[]> } {
  const fr = opts.figureResponse ?? 'medium';
  if (fr === 'medium') {
    return { brass: new Map(brass), shout: new Map(shout) };
  }
  const seed = opts.seed;

  if (fr === 'low') {
    const brassOut = new Map<number, number[]>();
    const shoutOut = new Map<number, number[]>();
    for (const [bar, beats] of brass) {
      if (drumDeterministicUnit(seed, bar, 88101) < 0.28) {
        brassOut.set(bar, beats);
      }
    }
    for (const [bar, beats] of shout) {
      if (drumDeterministicUnit(seed, bar, 88201) < 0.35) {
        shoutOut.set(bar, beats);
      }
    }
    return { brass: brassOut, shout: shoutOut };
  }

  const brassOut = new Map<number, number[]>(brass);
  const shoutOut = new Map<number, number[]>(shout);
  for (let bar = 1; bar <= chordLen; bar++) {
    if (!brassOut.has(bar) && bar % 2 === 0 && drumDeterministicUnit(seed, bar, 88301) < 0.45) {
      brassOut.set(bar, [1, 3]);
    }
  }
  for (let bar = Math.max(1, chordLen - 8); bar <= chordLen; bar++) {
    if (!shoutOut.has(bar) && drumDeterministicUnit(seed, bar, 88401) < 0.22) {
      shoutOut.set(bar, [0, 2]);
    }
  }
  return { brass: brassOut, shout: shoutOut };
}
