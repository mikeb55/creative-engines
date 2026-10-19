/**
 * Billy Strayhorn — source progression corpus.
 *
 * The slice's `BS_HARM_*` fingerprints declare numeric targets for parallel
 * colour planing, minor-third drift, tritone reinterpretation and dominant
 * chains, but carry no concrete progression data — the passes invent their
 * root motion arithmetically from whatever the spine supplies. This corpus
 * supplies transcribed four-chord rows for each declared device so the slice
 * can be seeded with Strayhorn root motion rather than only recolouring
 * functional harmony after the fact.
 *
 * Rows are transcribed from published analyses of Lush Life, Chelsea Bridge,
 * Isfahan, Blood Count and Lotus Blossom, and are written in the repo's
 * parenthesised symbol dialect (`maj9(#11)`, `13(b9)`, `m6(9)`) so they parse
 * through `parseChordSymbol` without conversion.
 *
 * Every row is verified free of the functional minor7 -> dominant7 -> major
 * ascending-fourth cycle by `applyStrayhornRootMotionGuard`; see
 * `tests/strayhornRootMotionGuard.test.ts`, which fails if any row regresses.
 *
 * Sources:
 *   Chelsea Bridge — https://www.researchcatalogue.net/view/62908/105071
 *   Lush Life — https://www.researchcatalogue.net/view/62908/105059
 *   Isfahan — https://www.researchcatalogue.net/view/62908/105073
 *   Blood Count — https://www.researchcatalogue.net/view/62908/105075
 *   Lotus Blossom — https://www.italianpiano.com/blog/monday-notes/billy-strayhorn-and-duke-ellington-lotus-blossom-30-years-side-by-side/
 *   van de Leur, Something to Live For — https://academic.oup.com/book/36081/chapter/313195289
 */

/** Fingerprint ids in `billyStrayhornVrbFingerprints.ts` that own progression data. */
export type StrayhornHarmonicFingerprintId =
  | 'BS_HARM_01'
  | 'BS_HARM_03'
  | 'BS_HARM_04'
  | 'BS_HARM_06'
  | 'BS_HARM_OTHER';

export interface StrayhornProgressionRow {
  /** Owning fingerprint receipt id. */
  fingerprintId: StrayhornHarmonicFingerprintId;
  /** Four chord symbols in order, repo dialect. */
  chords: readonly [string, string, string, string];
  /** Signed semitone root motion between consecutive pairs, ascending positive. */
  intervals: readonly [number, number, number];
  /** Named piece the row is modelled on, or the device when generic. */
  source: string;
}

export const STRAYHORN_PROGRESSION_CORPUS: readonly StrayhornProgressionRow[] = [
  /* BS_HARM_01 — parallel colour planing (target 0.45). */
  {
    fingerprintId: 'BS_HARM_01',
    chords: ['Bbm6(9)', 'Abm6(9)', 'Bbm6(9)', 'Abm6(9)'],
    intervals: [-2, 2, -2],
    source: 'Chelsea Bridge, opening planed minor-6/9 pair',
  },
  {
    fingerprintId: 'BS_HARM_01',
    chords: ['Bbm6(9)', 'Abm6(9)', 'Gbm6(9)', 'Fm6(9)'],
    intervals: [-2, -2, -1],
    source: 'Chelsea Bridge, extended descending plane',
  },
  {
    fingerprintId: 'BS_HARM_01',
    chords: ['Emaj7', 'Ebmaj7(#11)', 'Dmaj7(#11)', 'D7(#11)'],
    intervals: [-1, -1, 0],
    source: 'Lush Life, chromatic major-7 descent',
  },
  {
    fingerprintId: 'BS_HARM_01',
    chords: ['Abmmaj7', 'Gbmmaj7', 'Fmmaj7', 'Ebmmaj7'],
    intervals: [-2, -1, -2],
    source: 'Chelsea Bridge, minor-major7 planing (van de Leur)',
  },
  {
    fingerprintId: 'BS_HARM_01',
    chords: ['Fmaj7(#11)', 'Emaj7(#11)', 'Ebmaj7(#11)', 'Dbmaj9'],
    intervals: [-1, -1, -2],
    source: 'Isfahan, lydian plane into tonic',
  },

  /* BS_HARM_03 — minor-third key drift (target 0.40). No motion is +/-5. */
  {
    fingerprintId: 'BS_HARM_03',
    chords: ['Dbmaj9', 'Emaj9', 'Gmaj9', 'Bbmaj9'],
    intervals: [3, 3, 3],
    source: 'Minor-third cycle, Isfahan tonal areas',
  },
  {
    fingerprintId: 'BS_HARM_03',
    chords: ['Fmaj7', 'Abmaj7(#11)', 'Bmaj9', 'Dbmaj9'],
    intervals: [3, 3, 2],
    source: 'Lush Life, mediant drift into Db',
  },
  {
    fingerprintId: 'BS_HARM_03',
    chords: ['G6(9)', 'Gm6(9)', 'Fmaj7', 'Dbmaj9'],
    intervals: [0, -2, -4],
    source: 'Blood Count, modal shift then mediant fall',
  },
  {
    fingerprintId: 'BS_HARM_03',
    chords: ['Dbmaj9', 'Fm9', 'Gm9', 'Bbm6(9)'],
    intervals: [4, 2, 3],
    source: 'Lush Life, rising mediant chain',
  },

  /* BS_HARM_04 — tritone reinterpretation (target 0.50). */
  {
    fingerprintId: 'BS_HARM_04',
    chords: ['Eb7(#9)', 'Amaj7(#11)', 'Ab13', 'Dbmaj9'],
    intervals: [6, -1, -7],
    source: 'Lush Life, verse tritone redirect',
  },
  {
    fingerprintId: 'BS_HARM_04',
    chords: ['Dbmaj7', 'Cb7(#11)', 'Emaj7', 'D7(#11)'],
    intervals: [-2, 5, -2],
    source: 'Blood Count, enharmonic dominant pivot',
  },
  {
    fingerprintId: 'BS_HARM_04',
    chords: ['Bb/D', 'Dbm6', 'Cm7(b5)', 'F7'],
    intervals: [-1, -1, 5],
    source: 'Lotus Blossom, I-vi-ii-V broken by tritone sub and half-diminished',
  },
  {
    fingerprintId: 'BS_HARM_04',
    chords: ['G13(b9)', 'Db7(#11)', 'Cmaj7(#11)', 'Ebmaj7'],
    intervals: [6, -1, 3],
    source: 'Chelsea Bridge, dominant reinterpreted at cadence',
  },

  /* BS_HARM_06 — non-functional dominant chains (target 0.25). */
  {
    fingerprintId: 'BS_HARM_06',
    chords: ['Db9', 'C9', 'B9', 'Bb9'],
    intervals: [-1, -1, -1],
    source: 'Descending semitone dominant chain, Lush Life bridge',
  },
  {
    fingerprintId: 'BS_HARM_06',
    chords: ['E13', 'F13', 'Gb13', 'G13'],
    intervals: [1, 1, 1],
    source: 'Ascending semitone dominant chain',
  },
  {
    fingerprintId: 'BS_HARM_06',
    chords: ['Ab13(b9)', 'G13(b9)', 'Gb13(b9)', 'F13(b9)'],
    intervals: [-1, -1, -1],
    source: 'Blood Count, altered dominant descent',
  },
  {
    fingerprintId: 'BS_HARM_06',
    chords: ['C7(#9)', 'F7(#9)', 'Bb7', 'Ab13(#11)'],
    intervals: [5, 5, -2],
    source: 'Dominant cycle — all-dominant, so no minor7 opens the chain',
  },

  /* BS_HARM_OTHER — CESH, pedal planing, alternation, hybrid cadence. */
  {
    fingerprintId: 'BS_HARM_OTHER',
    chords: ['Dmmaj7', 'Dm7(#5)', 'Dm6', 'D7(#11)'],
    intervals: [0, 0, 0],
    source: 'Chelsea Bridge, chromatic elaboration of static harmony (CESH)',
  },
  {
    fingerprintId: 'BS_HARM_OTHER',
    chords: ['E/A', 'Eb/A', 'Dm/A', 'F/A'],
    intervals: [-1, -1, 3],
    source: 'Isfahan, upper-structure planing over pedal bass',
  },
  {
    fingerprintId: 'BS_HARM_OTHER',
    chords: ['Db6(9)', 'D7(#11)', 'Db6(9)', 'D7(#11)'],
    intervals: [1, -1, 1],
    source: 'Lotus Blossom, semitone colour alternation',
  },
  {
    fingerprintId: 'BS_HARM_OTHER',
    chords: ['Bbm6(9)', 'Abm6(9)', 'Gbmaj7(#11)', 'Dbmaj9'],
    intervals: [-2, -2, -5],
    source: 'Chelsea Bridge, plane resolving plagally rather than by fourth cycle',
  },
];

/** Rows owned by a given fingerprint id. */
export function strayhornRowsForFingerprint(
  fingerprintId: StrayhornHarmonicFingerprintId
): readonly StrayhornProgressionRow[] {
  return STRAYHORN_PROGRESSION_CORPUS.filter((r) => r.fingerprintId === fingerprintId);
}

/** Deterministic row pick for a seed, optionally constrained to one fingerprint. */
export function pickStrayhornRow(
  seed: number,
  fingerprintId?: StrayhornHarmonicFingerprintId
): StrayhornProgressionRow {
  const pool = fingerprintId ? strayhornRowsForFingerprint(fingerprintId) : STRAYHORN_PROGRESSION_CORPUS;
  const rows = pool.length > 0 ? pool : STRAYHORN_PROGRESSION_CORPUS;
  let s = (seed ^ 0x5f3759df) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return rows[s % rows.length]!;
}

/** Distinct root-motion intervals present in the corpus — the Strayhorn motion set. */
export function strayhornMotionSet(): readonly number[] {
  const set = new Set<number>();
  for (const row of STRAYHORN_PROGRESSION_CORPUS) {
    for (const i of row.intervals) set.add(i);
  }
  return [...set].sort((a, b) => a - b);
}
