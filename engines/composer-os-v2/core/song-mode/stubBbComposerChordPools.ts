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

/**
 * Brookmeyer — tier pools (**line-first** posture in planner: harmony yields to melodic cell).
 * `brookmeyer_quartal` stacked 4ths / sus plates · `brookmeyer_linear` sparse planing / slash drivers · `brookmeyer_cluster` dense altered clusters.
 */
export const brookmeyer_quartal = chunk64((i) => {
  const a = ROOTS[i % 12];
  const b = ROOTS[(i + 5) % 12];
  const c = ROOTS[(i + 7) % 12];
  const d = ROOTS[(i + 11) % 12];
  const bassPed = ROOTS[(i + 3) % 12];
  return [`${a}quartal`, `${b}sus13`, `${c}maj7#11/${bassPed}`, `${d}sus9/${bassPed}`];
});

export const brookmeyer_linear = chunk64((i) => {
  const a = ROOTS[(i + 2) % 12];
  const b = ROOTS[(i + 8) % 12];
  const c = ROOTS[(i + 5) % 12];
  const d = ROOTS[(i + 11) % 12];
  return [`${a}m11`, `${b}maj9/${c}`, `${c}dim7`, `${d}maj7#11`];
});

export const brookmeyer_cluster = chunk64((i) => {
  const a = ROOTS[(i + 4) % 12];
  const b = ROOTS[(i + 9) % 12];
  const c = ROOTS[(i + 2) % 12];
  const d = ROOTS[(i + 7) % 12];
  return [`${a}m9(b5)`, `${b}7alt`, `${c}augmaj7`, `${d}13(#11)`];
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

/** C minor 12-bar backbone for minor-blues tier (tile rows). */
const NELSON_MINOR_BLUES12 = [
  'Cm7',
  'Cm7',
  'Cm7',
  'Cm7',
  'Fm7',
  'Fm7',
  'Cm7',
  'Cm7',
  'Ab7(9,13)',
  'G7(9,13)',
  'Cm7',
  'G7',
] as const;

/**
 * Nelson — minor modal: C pedal + E♭maj7 / Fmaj7 upper field; Cm9/11; quartal min11 planing;
 * Dm11→E♭dim7→C7/E→Fm7 chromatic cells (`seed % 3` tier).
 */
export const nelson_minor_modal = chunk64((i) => {
  const eb = 'Ebmaj7/C';
  const fmaj = 'Fmaj7/C';
  const cm9 = 'Cm9';
  const cm11 = 'Cm11';
  const dm11 = 'Dm11';
  const ebdim = 'Ebdim7';
  const c7e = 'C7/E';
  const fm7 = 'Fm7';
  const pat = i % 4;
  if (pat === 0) return [eb, fmaj, cm9, cm11];
  if (pat === 1) return [fmaj, eb, cm11, dm11];
  if (pat === 2) return [dm11, ebdim, c7e, fm7];
  const q = ['Cm11', 'Dbm11', 'Dm11', 'Ebm11'];
  const qi = i % 4;
  return [`${q[qi]}`, `${q[(qi + 1) % 4]}`, eb, fmaj];
});

/** Nelson — exact C minor 12-bar blues cycle (ivm7; bVI7–V7–i turnaround). */
export const nelson_minor_blues = chunk64((i) => {
  const base = i * 4;
  return [0, 1, 2, 3].map((k) => NELSON_MINOR_BLUES12[(base + k) % 12]!);
});

/** Nelson — late orchestral chromaticism (*Sound Pieces*): min11 planing, dim passing, maj pivot. */
export const nelson_orchestral = chunk64((i) => {
  const r = (o: number) => ROOTS[(i + o) % 12]!;
  const u = i % 3;
  if (u === 0) return [`${r(0)}m11`, `${r(1)}m11`, 'Cmaj7(9)', `${r(3)}dim7`];
  if (u === 1) return [`${r(2)}m11`, `${r(3)}m11`, 'Ebdim7', `${r(5)}m11`];
  return [`${r(0)}m9`, `${r(4)}maj7(9)`, `${r(6)}m11`, `${r(8)}m11`];
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
  brookmeyer_quartal,
  brookmeyer_linear,
  brookmeyer_cluster,
  fischer_polytonal,
  fischer_ballad,
  fischer_latin,
  nelson_minor_modal,
  nelson_minor_blues,
  nelson_orchestral,
  quincy_jones_swing,
  quincy_jones_soul,
  quincy_jones_orchestral,
  basie_blues,
  basie_swing,
  basie_ballad,
  /** Messiaen Mode 2 — octatonic (1-2-1-2): dim7 / aug / dom7(b9) as colour (transpositions 1–3 via row). */
  messiaen_mode2: chunk64((i) => {
    const trans = (i % 3) + 1;
    const base = (i * 7 + trans * 3) % 12;
    const r = (o: number) => ROOTS[(base + o) % 12];
    return [`${r(0)}dim7`, `${r(6)}dim7`, `${r(4)}aug`, `${r(10)}7(b9)`];
  }),
  /** Messiaen Mode 3 — 9-note subsets; Chord of Resonance rows (`maj9/E`); Mode 3² skew via `preferSq`. */
  messiaen_mode3: chunk64((i) => {
    const preferSq = i % 4 === 0 ? 2 : i % 3;
    const base = (i * 5 + preferSq + 5) % 12;
    const r = (o: number) => ROOTS[(base + o) % 12];
    const chordOfResonance = i % 8 === 0 ? `${r(0)}maj9/E` : `${r(0)}maj7(#11)`;
    return [chordOfResonance, `${r(4)}aug`, `${r(9)}dim7`, `${r(2)}m7(b5)`];
  }),
  /** Messiaen birdsong — ornamental chromatic / cluster surfaces (non-functional). */
  messiaen_birdsong: chunk64((i) => {
    const base = (i * 11 + 2) % 12;
    const r = (o: number) => ROOTS[(base + o) % 12];
    return [`${r(0)}maj7(#11)`, `${r(1)}add(b9)`, `${r(6)}dim7`, `${r(3)}maj13(#11)`];
  }),
};
