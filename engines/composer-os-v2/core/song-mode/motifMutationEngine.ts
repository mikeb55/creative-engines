/**
 * Motif mutation primitives for phrase-engine development windows (GCE Melodic Identity).
 * Distinct from {@link motifSimilarityScorer} / ThemeGenome MotifCell2.
 */

export interface MotifNoteLite {
  pitch: number;
  /** Duration in quarter-note units */
  duration: number;
}

/** Genome-style motif cell for transforms + similarity (playbook S formula). */
export interface MutationMotifCell {
  intervalSpine: number[];
  rhythmicCell: number[];
  contourCode: 'up' | 'down' | 'arch' | 'flat' | 'leap';
  registerBand: 'low' | 'mid' | 'high';
  pitchClasses: number[];
}

export type MotifTransform =
  | 'sequence'
  | 'augmentation'
  | 'diminution'
  | 'registral_displacement'
  | 'contour_inversion'
  | 'rhythmic_displacement'
  | 'fragmentation';

export type SectionRole = 'A' | 'A2' | 'B' | 'bridge' | 'coda';

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function classifyContour(intervalSpine: number[]): MutationMotifCell['contourCode'] {
  if (intervalSpine.length === 0) return 'flat';
  const net = intervalSpine.reduce((a, b) => a + b, 0);
  const big = intervalSpine.some((i) => Math.abs(i) >= 7);
  if (big) return 'leap';
  if (net > 2) return 'up';
  if (net < -2) return 'down';
  return 'flat';
}

function registerFromMidi(m: number): MutationMotifCell['registerBand'] {
  if (m < 58) return 'low';
  if (m > 72) return 'high';
  return 'mid';
}

/**
 * Extract a {@link MutationMotifCell} from ordered notes (first `bars` bars worth when paired with bar indices — here caller passes sliced notes).
 */
export function extractMotifCell(notes: MotifNoteLite[], bars: number): MutationMotifCell {
  const maxN = bars > 0 ? Math.min(bars, notes.length) : notes.length;
  const slice = notes.slice(0, maxN);
  if (slice.length === 0) {
    return {
      intervalSpine: [],
      rhythmicCell: [],
      contourCode: 'flat',
      registerBand: 'mid',
      pitchClasses: [],
    };
  }
  const pitches = slice.map((n) => n.pitch);
  const rhythmicCell = slice.map((n) => n.duration);
  const intervalSpine: number[] = [];
  for (let i = 1; i < pitches.length; i++) {
    intervalSpine.push(pitches[i]! - pitches[i - 1]!);
  }
  const pitchClasses = pitches.map((p) => ((p % 12) + 12) % 12);
  const avg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
  return {
    intervalSpine,
    rhythmicCell,
    contourCode: classifyContour(intervalSpine),
    registerBand: registerFromMidi(avg),
    pitchClasses,
  };
}

function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function applyMotifMutation(motif: MutationMotifCell, transform: MotifTransform): MutationMotifCell {
  const rnd = mulberry32(motif.intervalSpine.length * 131 + motif.rhythmicCell.length * 17);

  switch (transform) {
    case 'sequence': {
      const d = 2 + Math.floor(mulberry32(motif.intervalSpine.length + motif.pitchClasses.length * 31 + 999)() * 4);
      const intervalSpine = motif.intervalSpine.map((x) => x + (x >= 0 ? d : -d));
      return {
        ...motif,
        intervalSpine,
        contourCode: classifyContour(intervalSpine),
      };
    }
    case 'augmentation':
      return {
        ...motif,
        rhythmicCell: motif.rhythmicCell.map((d) => d * 2),
      };
    case 'diminution':
      return {
        ...motif,
        rhythmicCell: motif.rhythmicCell.map((d) => Math.max(0.125, d / 2)),
      };
    case 'registral_displacement': {
      const dir = rnd() < 0.5 ? 1 : -1;
      return {
        ...motif,
        registerBand:
          motif.registerBand === 'low' ? 'mid' : motif.registerBand === 'mid' ? (dir > 0 ? 'high' : 'low') : 'mid',
      };
    }
    case 'contour_inversion':
      return {
        ...motif,
        intervalSpine: motif.intervalSpine.map((i) => -i),
        contourCode: classifyContour(motif.intervalSpine.map((i) => -i)),
      };
    case 'rhythmic_displacement': {
      if (motif.rhythmicCell.length < 2) return { ...motif };
      const rot = [...motif.rhythmicCell.slice(1), motif.rhythmicCell[0]!];
      return { ...motif, rhythmicCell: rot };
    }
    case 'fragmentation':
      return {
        ...motif,
        intervalSpine: motif.intervalSpine.slice(0, Math.min(3, motif.intervalSpine.length)),
        rhythmicCell: motif.rhythmicCell.slice(0, Math.min(3, motif.rhythmicCell.length)),
        pitchClasses: motif.pitchClasses.slice(0, Math.min(3, motif.pitchClasses.length)),
      };
    default: {
      const _exhaustive: never = transform;
      return _exhaustive;
    }
  }
}

function contourRelation(a: MutationMotifCell['contourCode'], b: MutationMotifCell['contourCode']): number {
  if (a === b) return 1;
  if (a === 'flat' || b === 'flat') return 0.5;
  if ((a === 'up' && b === 'down') || (a === 'down' && b === 'up')) return 0;
  return 0.5;
}

function registerRelation(
  a: MutationMotifCell['registerBand'],
  b: MutationMotifCell['registerBand']
): number {
  if (a === b) return 1;
  if (a === 'mid' || b === 'mid') return 0.5;
  return 0;
}

/** Playbook S = 0.35I + 0.30R + 0.20C + 0.15G */
export function scoreMotifSimilarity(a: MutationMotifCell, b: MutationMotifCell): number {
  const I =
    a.intervalSpine.length === 0 && b.intervalSpine.length === 0
      ? 1
      : intervalOverlapScore(a.intervalSpine, b.intervalSpine);
  const R =
    a.rhythmicCell.length === 0 && b.rhythmicCell.length === 0
      ? 1
      : rhythmOverlapScore(a.rhythmicCell, b.rhythmicCell);
  const C = contourRelation(a.contourCode, b.contourCode);
  const G = registerRelation(a.registerBand, b.registerBand);
  return 0.35 * I + 0.3 * R + 0.2 * C + 0.15 * G;
}

function intervalOverlapScore(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let hit = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(a[i]! - b[i]!) <= 2) hit++;
  }
  return hit / Math.max(a.length, b.length);
}

function rhythmOverlapScore(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let hit = 0;
  for (let i = 0; i < n; i++) {
    const ra = a[i]!;
    const rb = b[i]!;
    const err = Math.abs(ra - rb) / Math.max(ra, rb, 0.25);
    if (err < 0.08) hit++;
  }
  return hit / Math.max(a.length, b.length);
}

export function selectMotifTransform(sectionRole: SectionRole, seed: number): MotifTransform {
  const r = mulberry32(seed + sectionRole.charCodeAt(0) * 9973)();
  switch (sectionRole) {
    case 'A':
      return r < 0.5 ? 'sequence' : 'augmentation';
    case 'A2':
      return r < 0.5 ? 'registral_displacement' : 'sequence';
    case 'B':
      return r < 0.5 ? 'contour_inversion' : 'rhythmic_displacement';
    case 'bridge':
      return r < 0.5 ? 'fragmentation' : 'diminution';
    case 'coda':
      return 'sequence';
    default:
      return 'sequence';
  }
}
