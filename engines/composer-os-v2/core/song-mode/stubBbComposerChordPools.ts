/**
 * Big-band stub composers — tiered chord pools (64 symbols each pool = 16 rows × 4 chords).
 * Wired into `songModeBuilder.ts` via `Object.assign(SONGWRITER_CHORD_POOLS, …)`.
 */

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type StubBbChordPoolShape = {
  verse: string[][];
  chorus: string[][];
  bridge: string[][];
  pre_chorus: string[][];
};

function chunk64(buildRow: (i: number) => string[]): StubBbChordPoolShape {
  const rows = Array.from({ length: 16 }, (_, i) => buildRow(i));
  return {
    verse: rows.slice(0, 4),
    chorus: rows.slice(4, 8),
    bridge: rows.slice(8, 12),
    pre_chorus: rows.slice(12, 16),
  };
}

/** Nestico — Basie-era clarity: functional majors, ii–V pockets, shout-ready dominants. */
export const nestico_swing = chunk64((i) => {
  const a = ROOTS[i % 12];
  const b = ROOTS[(i + 5) % 12];
  const c = ROOTS[(i + 7) % 12];
  const d = ROOTS[(i + 10) % 12];
  return [`${a}6/9`, `${b}m7`, `${c}9`, `${d}13`];
});

export const nestico_ballad = chunk64((i) => {
  const a = ROOTS[(i + 3) % 12];
  const b = ROOTS[(i + 8) % 12];
  const c = ROOTS[(i + 10) % 12];
  const d = ROOTS[(i + 2) % 12];
  return [`${a}maj9`, `${b}m11`, `${c}maj13`, `${d}m9`];
});

export const nestico_blues = chunk64((i) => {
  const a = ROOTS[(i + 5) % 12];
  const b = ROOTS[(i + 10) % 12];
  const c = ROOTS[(i + 3) % 12];
  const d = ROOTS[(i + 8) % 12];
  return [`${a}7`, `${b}9`, `${c}m7`, `${d}13`];
});

/** Brookmeyer — quartal/modal plates vs swing bounce vs linear minor gates. */
export const brookmeyer_modal = chunk64((i) => {
  const a = ROOTS[i % 12];
  const b = ROOTS[(i + 5) % 12];
  const c = ROOTS[(i + 7) % 12];
  const d = ROOTS[(i + 11) % 12];
  return [`${a}sus9`, `${b}m11`, `${c}maj7#11`, `${d}quartal`];
});

export const brookmeyer_contrapuntal = chunk64((i) => {
  const a = ROOTS[(i + 2) % 12];
  const b = ROOTS[(i + 8) % 12];
  const c = ROOTS[(i + 5) % 12];
  const d = ROOTS[(i + 11) % 12];
  return [`${a}m7(b5)`, `${b}7alt`, `${c}m9`, `${d}maj7#11`];
});

export const brookmeyer_swing = chunk64((i) => {
  const a = ROOTS[(i + 4) % 12];
  const b = ROOTS[(i + 9) % 12];
  const c = ROOTS[(i + 2) % 12];
  const d = ROOTS[(i + 7) % 12];
  return [`${a}m9`, `${b}13`, `${c}maj9`, `${d}9`];
});

/** Fischer — polytonal altered fields; lyrical ballad clusters; Latin groove clarity. */
export const fischer_polytonal = chunk64((i) => {
  const a = ROOTS[i % 12];
  const b = ROOTS[(i + 6) % 12];
  const c = ROOTS[(i + 3) % 12];
  const d = ROOTS[(i + 9) % 12];
  return [`${a}maj7#11`, `${b}7(#9,b13)`, `${c}m11`, `${d}maj7(#5)`];
});

export const fischer_ballad = chunk64((i) => {
  const a = ROOTS[(i + 1) % 12];
  const b = ROOTS[(i + 7) % 12];
  const c = ROOTS[(i + 4) % 12];
  const d = ROOTS[(i + 10) % 12];
  return [`${a}maj9(11)`, `${b}m11`, `${c}maj13`, `${d}m9`];
});

export const fischer_latin = chunk64((i) => {
  const a = ROOTS[(i + 5) % 12];
  const b = ROOTS[(i + 10) % 12];
  const c = ROOTS[(i + 3) % 12];
  const d = ROOTS[(i + 8) % 12];
  return [`${a}m9`, `${b}13`, `${c}maj9`, `${d}m11`];
});

/** Nelson — blues backbone; modal centres; swing shout functional clarity. */
export const nelson_blues = chunk64((i) => {
  const a = ROOTS[(i + 7) % 12];
  const b = ROOTS[(i + 10) % 12];
  const c = ROOTS[(i + 5) % 12];
  const d = ROOTS[(i + 3) % 12];
  return [`${a}9`, `${b}13`, `${c}m9`, `${d}7(b9)`];
});

export const nelson_modal = chunk64((i) => {
  const a = ROOTS[i % 12];
  const b = ROOTS[(i + 5) % 12];
  const c = ROOTS[(i + 10) % 12];
  const d = ROOTS[(i + 3) % 12];
  return [`${a}m11`, `${b}sus13`, `${c}maj7#11`, `${d}m9`];
});

export const nelson_swing = chunk64((i) => {
  const a = ROOTS[(i + 2) % 12];
  const b = ROOTS[(i + 9) % 12];
  const c = ROOTS[(i + 4) % 12];
  const d = ROOTS[(i + 11) % 12];
  return [`${a}m7`, `${b}9`, `${c}maj13`, `${d}13`];
});

/** Quincy Jones — punchy swing shout vocabulary / soul–pop crossover / orchestral lifts. */
export const quincy_jones_swing = chunk64((i) => {
  const a = ROOTS[(i + 4) % 12];
  const b = ROOTS[(i + 9) % 12];
  const c = ROOTS[(i + 2) % 12];
  const d = ROOTS[(i + 7) % 12];
  return [`${a}m9`, `${b}13`, `${c}maj9`, `${d}9`];
});

export const quincy_jones_soul = chunk64((i) => {
  const a = ROOTS[(i + 6) % 12];
  const b = ROOTS[(i + 11) % 12];
  const c = ROOTS[(i + 3) % 12];
  const d = ROOTS[(i + 8) % 12];
  return [`${a}maj9`, `${b}m11`, `${c}13`, `${d}sus9`];
});

export const quincy_jones_orchestral = chunk64((i) => {
  const a = ROOTS[i % 12];
  const b = ROOTS[(i + 5) % 12];
  const c = ROOTS[(i + 10) % 12];
  const d = ROOTS[(i + 4) % 12];
  return [`${a}maj7`, `${b}m9`, `${c}maj13`, `${d}maj9(#11)`];
});

/** Count Basie — 12-bar blues vocabulary: I7/IV7, #IVdim, ii, V, minor iv, VI7b9, 9/13 (no 11). */
export const basie_blues = chunk64((i) => {
  const I = ROOTS[i % 12];
  const IV = ROOTS[(i + 5) % 12];
  const V = ROOTS[(i + 7) % 12];
  const ii = ROOTS[(i + 2) % 12];
  const vm = ROOTS[(i + 5) % 12];
  const VIb9 = ROOTS[(i + 9) % 12];
  const sharpIv = ROOTS[(i + 6) % 12];
  const row = i % 4;
  if (row === 0) return [`${I}9`, `${sharpIv}dim7`, `${I}13`, `${IV}9`];
  if (row === 1) return [`${IV}13`, `${IV}9`, `${I}9`, `${I}13`];
  if (row === 2) return [`${ii}m7`, `${V}9`, `${VIb9}7(b9)`, `${ii}m7`];
  return [`${vm}m7`, `${IV}9`, `${sharpIv}dim7`, `${V}13`];
});

/** Count Basie — swing: ii–V pockets, turnbacks, shout-ready dominants (compact symbols). */
export const basie_swing = chunk64((i) => {
  const a = ROOTS[i % 12];
  const b = ROOTS[(i + 5) % 12];
  const c = ROOTS[(i + 7) % 12];
  const d = ROOTS[(i + 10) % 12];
  return [`${a}m7`, `${b}9`, `${c}m7`, `${d}9`];
});

/** Count Basie — ballad: lush majors / m11, slower harmonic rhythm signifiers. */
export const basie_ballad = chunk64((i) => {
  const a = ROOTS[(i + 3) % 12];
  const b = ROOTS[(i + 8) % 12];
  const c = ROOTS[(i + 10) % 12];
  const d = ROOTS[(i + 2) % 12];
  return [`${a}maj9`, `${b}m11`, `${c}6/9`, `${d}m9`];
});

/** Assign into `SONGWRITER_CHORD_POOLS` — three tiers per composer (seed % 3 resolver in builder). */
export const STUB_BB_COMPOSER_CHORD_POOLS: Record<string, StubBbChordPoolShape> = {
  nestico_swing,
  nestico_ballad,
  nestico_blues,
  brookmeyer_modal,
  brookmeyer_contrapuntal,
  brookmeyer_swing,
  fischer_polytonal,
  fischer_ballad,
  fischer_latin,
  nelson_blues,
  nelson_modal,
  nelson_swing,
  quincy_jones_swing,
  quincy_jones_soul,
  quincy_jones_orchestral,
  basie_blues,
  basie_swing,
  basie_ballad,
};
