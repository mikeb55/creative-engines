/**
 * Performance Composer — TRITONE PAIR (radical mode, phase 1 test).
 *
 * One behaviour for the whole form: the guitar lives in two minor-pentatonic fields a tritone apart.
 *   HOME   = minor pentatonic on the tune's tonic (from its first chord, else its key signature).
 *   MIRROR = HOME moved a tritone. Every HOME note has an exact mirror; no note is shared;
 *            every MIRROR note sits a semitone from a HOME note, which gives the return paths.
 *
 * Everything is read from the score: fields from its first chord, sections from its rehearsal marks,
 * section letters and double bars, pitches from its own melody (mapped into the active field),
 * rhythms from its own bars (kept, displaced, eroded, filled against the bass, or migrated from other bars).
 * The seed changes every choice. This file holds no note lists.
 *
 * Locks: every non-guitar part is byte-identical; guitar attributes, chord symbols, directions and
 * barlines stay; bar count, metre and tempo stay. Only the guitar's notes are new.
 *
 * This is a Mike-requested override of Pentatonic Dev 5B/6B/7 restraints, in this module only:
 * maximum colour distance is the point, two fields sound at once, and the best-fitting field is not chosen.
 * Pentatonic Options V2 / Dev 6 code is not touched.
 */

import { getPentatonicColourResource } from '../pentatonic/colourRegistry';
import { quartalSubsets } from '../pentatonic/quartalField';
import { seededRandom, type PcChord } from './pcChord';
import { solveFretPath, type FretSlice, type FretSolution } from './pcFretboard';
import {
  chordAt,
  elementChildren,
  measureViews,
  parseScoreDocument,
  partElements,
  partNames,
  type PcMeasureView,
} from './pcScore';

export const TRITONE_PAIR_ENGINE = 'pc-tritone-pair-1.1';
export const TRITONE_PAIR_LABEL = 'Tritone Pair';

/* ------------------------------------------------------------------ types */

export type FieldId = 'HOME' | 'MIRROR';

export interface TpField {
  id: FieldId;
  rootPc: number;
  rootName: string;
  pcs: number[];
  /** Spelling of each pitch class in this field. */
  spelling: Map<number, { step: string; alter: number }>;
  names: string[];
}

export type TpRole = 'ALIGN' | 'SWAP' | 'COLLIDE' | 'ALONE' | 'SILENCE' | 'RETURN' | 'HOME' | 'SLIDE' | 'END';

export interface TpSection {
  index: number;
  from: number;
  to: number;
  label: string;
  role: 'ALIGN' | 'SWAP' | 'COLLIDE' | 'HOME';
}

export interface TpBarPlan {
  bar: number;
  printed: string;
  section: number;
  role: TpRole;
  /** Field of the guitar's upper (or only) voice. */
  upper: FieldId;
  /** Field of the lower voice in two-voice bars. */
  lower: FieldId | null;
  /** Which field the bar's own chord and bass sit closer to. */
  native: FieldId;
  bassActive: boolean;
  sourceGuitarActive: boolean;
  lengthQ: number;
}

/** grip: three-note quartal grip in one field. clash-grip: a top note in one field over a fourth from the other field. */
export type TpKind = 'line' | 'quartal-dyad' | 'mirror-dyad' | 'stack' | 'grip' | 'clash-grip' | 'inner';

export interface TpEvent {
  bar: number;
  voice: '1' | '2';
  /** Quarter notes from the start of the bar. */
  onset: number;
  quarters: number;
  /** Sounding MIDI, low to high. */
  midis: number[];
  field: FieldId;
  kind: TpKind;
}

export interface TpPlan {
  engine: string;
  seed: number;
  guitarPartId: string;
  home: TpField;
  mirror: TpField;
  sections: TpSection[];
  bars: TpBarPlan[];
  events: TpEvent[];
  fret: FretSolution;
  /** Hand position marks (bar, onset, roman) where the hand moves to a new area. */
  positionMarks: Array<{ bar: number; onset: number; fret: number }>;
  repairs: number;
}

/* ------------------------------------------------------------------ fields */

const LETTERS = 'CDEFGAB';
const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const accName = (step: string, alter: number) => `${step}${alter === -1 ? 'b' : alter === 1 ? '#' : alter === -2 ? 'bb' : alter === 2 ? '##' : ''}`;

function minorPentatonic(): { intervals: number[]; letterSteps: number[] } {
  const r = getPentatonicColourResource('minor_pentatonic');
  if (!r) throw new Error('minor_pentatonic missing from the colour registry');
  return { intervals: [...r.intervals], letterSteps: [...r.letterSteps] };
}

function buildField(id: FieldId, rootStep: string, rootAlter: number): TpField {
  const { intervals, letterSteps } = minorPentatonic();
  const rootPc = mod12(NATURAL[rootStep]! + rootAlter);
  const spelling = new Map<number, { step: string; alter: number }>();
  const names: string[] = [];
  const pcs: number[] = [];
  intervals.forEach((iv, i) => {
    const pc = mod12(rootPc + iv);
    const step = LETTERS[(LETTERS.indexOf(rootStep) + letterSteps[i]!) % 7]!;
    let alter = pc - NATURAL[step]!;
    if (alter > 6) alter -= 12;
    if (alter < -6) alter += 12;
    spelling.set(pc, { step, alter });
    names.push(accName(step, alter));
    pcs.push(pc);
  });
  return { id, rootPc, rootName: accName(rootStep, rootAlter), pcs, spelling, names };
}

function accidentalWeight(f: TpField): number {
  let w = 0;
  for (const s of f.spelling.values()) w += Math.abs(s.alter) * (Math.abs(s.alter) > 1 ? 3 : 1);
  return w;
}

/** HOME from the first chord (minor root, or relative minor of a major root), else from the key signature. */
export function chooseFields(guitarViews: readonly PcMeasureView[]): { home: TpField; mirror: TpField; reason: string } {
  let first: PcChord | null = null;
  for (const v of guitarViews) {
    const h = v.harmony.find((x) => x.chord);
    if (h?.chord) {
      first = h.chord;
      break;
    }
  }
  let homeStep: string;
  let homeAlter: number;
  let reason: string;
  if (first) {
    const minor = first.chordPcs.includes(mod12(first.rootPc + 3)) && !first.chordPcs.includes(mod12(first.rootPc + 4));
    if (minor || !first.chordPcs.includes(mod12(first.rootPc + 4))) {
      homeStep = first.rootStep;
      homeAlter = first.rootAlter;
      reason = `first chord ${first.label}`;
    } else {
      homeStep = LETTERS[(LETTERS.indexOf(first.rootStep) + 5) % 7]!;
      homeAlter = mod12(first.rootPc + 9) - NATURAL[homeStep]!;
      if (homeAlter > 6) homeAlter -= 12;
      if (homeAlter < -6) homeAlter += 12;
      reason = `relative minor of first chord ${first.label}`;
    }
  } else {
    const fifths = guitarViews[0]?.fifths ?? 0;
    const pc = mod12(fifths * 7 + 9);
    const sharpKeys = fifths > 0;
    homeStep = LETTERS.split('').find((s) => NATURAL[s] === pc) ?? LETTERS.split('').find((s) => mod12(NATURAL[s]! + (sharpKeys ? 1 : -1)) === pc)!;
    homeAlter = mod12(pc - NATURAL[homeStep]!) > 6 ? mod12(pc - NATURAL[homeStep]!) - 12 : mod12(pc - NATURAL[homeStep]!);
    reason = `key signature (${fifths} fifths)`;
  }
  const home = buildField('HOME', homeStep, homeAlter);
  // Mirror root: augmented fourth or diminished fifth above, whichever spells the field more simply.
  const options = [3, 4].map((letterUp) => {
    const step = LETTERS[(LETTERS.indexOf(homeStep) + letterUp) % 7]!;
    let alter = mod12(home.rootPc + 6) - NATURAL[step]!;
    if (alter > 6) alter -= 12;
    if (alter < -6) alter += 12;
    return Math.abs(alter) <= 1 ? buildField('MIRROR', step, alter) : null;
  }).filter((f): f is TpField => f !== null);
  const mirror = options.sort((a, b) => accidentalWeight(a) - accidentalWeight(b))[0]!;
  return { home, mirror, reason };
}

/* ------------------------------------------------------------------ analysis */

interface BarInfo {
  bar: number;
  printed: string;
  lengthQ: number;
  chord: PcChord | null;
  bassPcs: number[];
  bassOnsets: number[];
  bassActive: boolean;
  melody: Array<{ onset: number; quarters: number; midi: number }>;
  native: FieldId;
}

function guitarAndBass(doc: Document): { guitar: Element; others: Element[]; guitarId: string } {
  const parts = partElements(doc);
  const names = partNames(doc);
  const guitar = parts.find((p) => /guit|gtr/i.test(names.get(p.getAttribute('id') ?? '') ?? '')) ?? parts[0]!;
  return { guitar, others: parts.filter((p) => p !== guitar), guitarId: guitar.getAttribute('id') ?? 'P1' };
}

function analyse(doc: Document, home: TpField, mirror: TpField): { infos: BarInfo[]; guitarViews: PcMeasureView[] } {
  const { guitar, others } = guitarAndBass(doc);
  const gv = measureViews(guitar);
  const ov = others.map((p) => measureViews(p));
  const infos: BarInfo[] = [];
  let lastNative: FieldId = 'HOME';
  gv.forEach((v, i) => {
    const q = v.divisions;
    const bassNotes = ov.flatMap((views) => views[i]?.notes.filter((n) => !n.rest) ?? []);
    const bassPcs = [...new Set(bassNotes.flatMap((n) => n.midis.map(mod12)))];
    const bassOnsets = [...new Set(bassNotes.map((n) => n.onset / (ov[0]?.[i]?.divisions ?? q)))];
    const chord = chordAt(gv, i + 1, 0);
    const attacks = v.notes.filter((n) => !n.rest && !n.tieStop && n.midis.length);
    const melody = attacks.map((n) => ({ onset: n.onset / q, quarters: n.ticks / q, midi: Math.max(...n.midis) }));
    const pcs = new Set([...(chord?.chordPcs ?? []), ...bassPcs]);
    const fit = (f: TpField) => f.pcs.filter((pc) => pcs.has(pc)).length;
    let native: FieldId = lastNative;
    if (pcs.size) native = fit(mirror) > fit(home) ? 'MIRROR' : 'HOME';
    lastNative = native;
    infos.push({ bar: i + 1, printed: v.printed, lengthQ: v.length / q, chord, bassPcs, bassOnsets, bassActive: bassNotes.length > 0, melody, native });
  });
  return { infos, guitarViews: gv };
}

/** Section starts: rehearsal marks, section-letter words (A, A′, B2 …), and the bar after a double or final bar. */
export function findSections(doc: Document): Array<{ from: number; to: number; label: string }> {
  const { guitar } = guitarAndBass(doc);
  const measures = elementChildren(guitar, 'measure');
  const starts = new Map<number, string>([[1, '']]);
  measures.forEach((m, i) => {
    const bar = i + 1;
    for (const c of elementChildren(m)) {
      if (c.nodeName === 'direction') {
        const reh = c.getElementsByTagName('rehearsal')[0]?.textContent?.trim();
        if (reh) starts.set(bar, reh);
        for (const w of Array.from(c.getElementsByTagName('words'))) {
          const t = (w.textContent ?? '').trim();
          if (/^[A-Z][′'’0-9]?$/.test(t)) starts.set(bar, starts.get(bar) || t);
        }
      }
      if (c.nodeName === 'barline') {
        const style = elementChildren(c, 'bar-style')[0]?.textContent?.trim() ?? '';
        const right = (c.getAttribute('location') ?? 'right') === 'right';
        if (right && /light-light|light-heavy|heavy-light|heavy-heavy/.test(style) && bar < measures.length && !starts.has(bar + 1)) starts.set(bar + 1, '');
        if (elementChildren(c, 'repeat').some((r) => r.getAttribute('direction') === 'forward')) starts.set(bar, starts.get(bar) ?? '');
      }
    }
  });
  const sorted = [...starts.keys()].sort((a, b) => a - b);
  let sections = sorted.map((from, i) => ({ from, to: (sorted[i + 1] ?? measures.length + 1) - 1, label: starts.get(from) ?? '' }));
  // A one-bar section joins the one after it (a pickup or intro bar), or the one before at the end.
  const merged: typeof sections = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    if (s.to - s.from + 1 < 2 && i + 1 < sections.length) {
      sections[i + 1] = { ...sections[i + 1]!, from: s.from, label: sections[i + 1]!.label || s.label };
      continue;
    }
    if (s.to - s.from + 1 < 2 && merged.length) {
      merged[merged.length - 1] = { ...merged[merged.length - 1]!, to: s.to };
      continue;
    }
    merged.push(s);
  }
  sections = [];
  for (const s of merged) {
    let from = s.from;
    while (s.to - from + 1 > 12) {
      sections.push({ from, to: from + 7, label: s.label });
      from += 8;
    }
    sections.push({ from, to: s.to, label: s.label });
  }
  return sections;
}

/* ------------------------------------------------------------------ plan */

const other = (f: FieldId): FieldId => (f === 'HOME' ? 'MIRROR' : 'HOME');

function sectionRole(i: number, n: number): TpSection['role'] {
  if (n === 1) return 'HOME';
  if (i === n - 1) return 'HOME';
  if (i === 0) return 'ALIGN';
  if (i === 1 && n >= 3) return 'SWAP';
  return 'COLLIDE';
}

function planBars(infos: BarInfo[], sections: TpSection[], rng: () => number): TpBarPlan[] {
  const plans: TpBarPlan[] = [];
  const last = infos.length;
  for (const s of sections) {
    // One choice per COLLIDE section: which field sits on top.
    const collideUpperIsMirrorOfNative = rng() < 0.75;
    const len = s.to - s.from + 1;
    const returnBars = s.role === 'HOME' ? Math.max(1, Math.floor(len * 0.2)) : 0;
    let aloneRun = 0;
    for (let bar = s.from; bar <= s.to; bar++) {
      const info = infos[bar - 1]!;
      const sourceGuitarActive = info.melody.length > 0;
      let role: TpRole = s.role;
      if (role === 'HOME' && bar - s.from < returnBars && len >= 4) role = 'RETURN';
      // Alone only where the bass rests for two bars or more; a single bar's rest stays part of the section.
      const bassRestsNear = !infos[bar - 2]?.bassActive || !infos[bar]?.bassActive;
      if (!info.bassActive && bassRestsNear && bar !== 1 && bar !== last) role = 'ALONE';
      if (info.bassActive && !sourceGuitarActive && bar !== 1 && bar < last - 1) role = 'SILENCE';
      if (bar === last) role = 'END';
      else if (bar === last - 1 && s.role === 'HOME') role = 'SLIDE';
      let upper: FieldId;
      let lower: FieldId | null = null;
      switch (role) {
        case 'ALIGN':
          upper = info.native;
          break;
        case 'SWAP':
          upper = other(info.native);
          break;
        case 'COLLIDE':
          upper = collideUpperIsMirrorOfNative ? other(info.native) : info.native;
          lower = other(upper);
          break;
        case 'ALONE':
          // Alone, the guitar trades the pair itself: one bar in each field.
          upper = aloneRun % 2 === 0 ? 'MIRROR' : 'HOME';
          aloneRun += 1;
          break;
        case 'RETURN':
          upper = 'MIRROR';
          break;
        case 'SLIDE':
          upper = 'MIRROR';
          break;
        default:
          upper = 'HOME';
      }
      if (role !== 'ALONE') aloneRun = 0;
      plans.push({
        bar,
        printed: info.printed,
        section: s.index,
        role,
        upper,
        lower,
        native: info.native,
        bassActive: info.bassActive,
        sourceGuitarActive,
        lengthQ: info.lengthQ,
      });
    }
  }
  return plans;
}

/* ------------------------------------------------------------------ rhythm */

interface Slot {
  onset: number;
  quarters: number;
  /** Source pitch this slot answers (contour reference). */
  ref: number;
}

const GRID = 0.5;
const snap = (x: number) => Math.round(x / 0.25) * 0.25;

function normalise(slots: Slot[], len: number): Slot[] {
  const s = slots
    .filter((x) => x.onset >= 0 && x.onset < len)
    .sort((a, b) => a.onset - b.onset)
    .filter((x, i, arr) => i === 0 || x.onset !== arr[i - 1]!.onset);
  for (let i = 0; i < s.length; i++) {
    const next = s[i + 1]?.onset ?? len;
    s[i] = { ...s[i]!, quarters: Math.max(0.25, Math.min(s[i]!.quarters, next - s[i]!.onset)) };
  }
  return s;
}

function onsetKey(s: readonly Slot[]): string {
  return s.map((x) => x.onset).join(',');
}

const RHYTHM_OPS = {
  displace(s: Slot[], len: number): Slot[] {
    return normalise(
      s.map((x) => ({ ...x, onset: x.onset + GRID })).filter((x) => x.onset < len),
      len
    );
  },
  anticipate(s: Slot[], len: number): Slot[] {
    return normalise(s.map((x, i) => (i === 0 && x.onset >= GRID ? { ...x, onset: x.onset - GRID, quarters: x.quarters + GRID } : x)), len);
  },
  erode(s: Slot[], len: number, rng: () => number, keep: number): Slot[] {
    if (s.length <= 1) return s;
    const out = s.filter(() => rng() < keep);
    return normalise(out.length ? out : [s[Math.floor(rng() * s.length)]!], len);
  },
  /** Fill gaps of a beat or more where the bass does not attack: the guitar interlocks with the bass. */
  fill(s: Slot[], len: number, rng: () => number, bassOnsets: readonly number[]): Slot[] {
    const out = [...s];
    const bounds = [0, ...s.flatMap((x) => [x.onset, x.onset + x.quarters]), len].sort((a, b) => a - b);
    for (let t = 0; t < len; t += GRID) {
      const busy = s.some((x) => t >= x.onset && t < x.onset + x.quarters);
      if (busy || bassOnsets.some((b) => Math.abs(b - t) < 0.01)) continue;
      const freeTo = Math.min(...bounds.filter((b) => b > t), len);
      if (freeTo - t < 1) continue;
      if (rng() < 0.55) {
        const ref = (s.find((x) => x.onset > t) ?? s[s.length - 1])?.ref ?? 60;
        out.push({ onset: t, quarters: rng() < 0.5 ? GRID : 1, ref });
        t += GRID;
      }
    }
    return normalise(out, len);
  },
  /** Hold each note until the next one: a legato, singing version of the same placements. */
  sustain(s: Slot[], len: number): Slot[] {
    return normalise(s.map((x, i) => ({ ...x, quarters: (s[i + 1]?.onset ?? len) - x.onset })), len);
  },
};

/* ------------------------------------------------------------------ generation */

interface GenState {
  rng: () => number;
  home: TpField;
  mirror: TpField;
  prevUpper: number | null;
  prevUpper2: number | null;
  prevRef: number | null;
  prevLower: number | null;
  lowerDir: 1 | -1;
  lastKeys: Map<string, string>;
  lastLowerTemplate: number;
  stacks: number;
  /** Bar of the last grip burst (bursts never fall in consecutive bars). */
  lastBurstBar: number;
  /** Onset of the last grip burst (the next burst lands somewhere else in the bar). */
  lastBurstOnset: number;
}

const field = (st: GenState, id: FieldId) => (id === 'HOME' ? st.home : st.mirror);

/** Put a source pitch class into the active field: keep it, take its exact tritone mirror, or move to the nearest field note. */
function mapPc(pc: number, f: TpField, o: TpField, rng: () => number, mirrorMode: boolean, dir: number): number {
  if (f.pcs.includes(pc)) return pc;
  if (mirrorMode && o.pcs.includes(pc)) return mod12(pc + 6);
  // Nearest field note; on a tie, the one that keeps the tune's direction.
  const near = [...f.pcs].sort((a, b) => {
    const da = Math.min(mod12(a - pc), mod12(pc - a));
    const db = Math.min(mod12(b - pc), mod12(pc - b));
    if (da !== db) return da - db;
    const aDown = mod12(pc - a) === da;
    const bDown = mod12(pc - b) === db;
    if (dir !== 0 && aDown !== bDown) return (dir < 0) === aDown ? -1 : 1;
    return rng() < 0.5 ? -1 : 1;
  });
  return near[0]!;
}

interface Register {
  lo: number;
  hi: number;
  centre: number;
  angular: number;
  dyad: number;
}

function registerFor(role: TpRole, progress: number): Register {
  // progress: 0..1 position inside the section, for an arc that lifts toward the section's end.
  const lift = Math.round(progress * 3);
  switch (role) {
    case 'ALIGN':
      return { lo: 53, hi: 70, centre: 61 + lift, angular: 0.08, dyad: 0.3 };
    case 'SWAP':
      return { lo: 55, hi: 72, centre: 64 + lift, angular: 0.2, dyad: 0.35 };
    case 'COLLIDE':
      return { lo: 57, hi: 72, centre: 65 + lift, angular: 0.25, dyad: 0 };
    case 'ALONE':
      return { lo: 50, hi: 74, centre: 63 + lift, angular: 0.35, dyad: 0.4 };
    case 'RETURN':
      return { lo: 55, hi: 71, centre: 64, angular: 0.15, dyad: 0.3 };
    case 'HOME':
      return { lo: 53, hi: 70, centre: 62 + lift, angular: 0.05, dyad: 0.25 };
    default:
      return { lo: 50, hi: 70, centre: 60, angular: 0, dyad: 0 };
  }
}

function pickPitch(st: GenState, ref: number, f: TpField, o: TpField, reg: Register, floor: number, mirrorMode = false): number {
  const dir = st.prevRef === null ? 0 : Math.sign(ref - st.prevRef);
  let pc = mapPc(mod12(ref), f, o, st.rng, mirrorMode, dir);
  // The tune moved but the mapping would stand still: step to the neighbouring field note instead.
  if (st.prevUpper !== null && pc === mod12(st.prevUpper) && st.prevRef !== null && mod12(ref) !== mod12(st.prevRef)) {
    const sorted = [...f.pcs].sort((a, b) => a - b);
    const i = sorted.indexOf(pc);
    const step = dir !== 0 ? dir : st.rng() < 0.5 ? 1 : -1;
    pc = sorted[(i + (step > 0 ? 1 : sorted.length - 1)) % sorted.length]!;
  }
  const prev = st.prevUpper ?? reg.centre;
  const lo = Math.max(reg.lo, floor);
  const cands: number[] = [];
  for (let m = lo; m <= reg.hi; m++) if (mod12(m) === pc) cands.push(m);
  if (!cands.length) for (let m = reg.lo - 12; m <= reg.hi + 12; m++) if (mod12(m) === pc && m >= floor) cands.push(m);
  const score = (m: number) => {
    let s = Math.abs(m - prev) + 0.35 * Math.abs(m - reg.centre);
    if (dir !== 0 && st.prevUpper !== null && Math.sign(m - st.prevUpper) !== dir && m !== st.prevUpper) s += 4;
    if (m === st.prevUpper && m === st.prevUpper2) s += 9;
    return s;
  };
  cands.sort((a, b) => score(a) - score(b));
  let m = cands[0]!;
  // Octave displacement: an angular leap, never two in a row.
  const lastLeap = st.prevUpper !== null && st.prevUpper2 !== null && Math.abs(st.prevUpper - st.prevUpper2) >= 10;
  if (!lastLeap && st.rng() < reg.angular) {
    const up = m + 12 <= reg.hi + 2 ? m + 12 : null;
    const down = m - 12 >= lo ? m - 12 : null;
    const pick = up !== null && down !== null ? (st.rng() < 0.5 ? up : down) : up ?? down;
    if (pick !== null) m = pick;
  }
  if (m === st.prevUpper && m === st.prevUpper2) {
    const step = f.pcs.map((p) => cands.find((c) => mod12(c) === p)).filter((c): c is number => c !== undefined);
    m = cands[1] ?? step[0] ?? m;
  }
  return m;
}

/**
 * A three-note grip with m on top. Same field: two quartal steps down inside the field.
 * Clash: under m, a fourth (or tritone) from the other field, its top note at least a tone below m,
 * so the two worlds sound at once under one hand.
 */
function gripUnder(m: number, f: TpField, o: TpField, clash: boolean): { midis: number[]; kind: TpKind } | null {
  if (!clash) {
    const a = quartalPartner(m, f);
    const b = a !== null ? quartalPartner(a, f) : null;
    if (a === null || b === null || b < 45) return null;
    return { midis: [b, a, m], kind: 'grip' };
  }
  for (let top = m - 2; top >= m - 7; top--) {
    if (!o.pcs.includes(mod12(top))) continue;
    for (const d of [5, 6]) {
      const low = top - d;
      if (low >= 45 && o.pcs.includes(mod12(low))) return { midis: [low, top, m], kind: 'clash-grip' };
    }
  }
  return null;
}

/** A fourth below inside the same field (a fifth or third if no fourth exists). */
function quartalPartner(m: number, f: TpField): number | null {
  for (const d of [5, 7, 3, 4]) if (f.pcs.includes(mod12(m - d))) return m - d;
  return null;
}

function sourceSlots(info: BarInfo): Slot[] {
  return normalise(info.melody.map((n) => ({ onset: snap(n.onset), quarters: snap(n.quarters) || 0.25, ref: n.midi })), info.lengthQ);
}

/** A bar's rhythm: its own, transformed by the role, or a rhythm migrated from another bar of the tune. */
function rhythmFor(st: GenState, plan: TpBarPlan, info: BarInfo, infos: BarInfo[], voiceKey: string): Slot[] {
  const len = info.lengthQ;
  let slots = sourceSlots(info);
  const sameLength = infos.filter((b) => b.lengthQ === len && b.melody.length >= 2 && b.bar !== info.bar);
  if (!slots.length || plan.role === 'ALONE') {
    const donor = sameLength[Math.floor(st.rng() * sameLength.length)];
    if (donor) {
      const own = slots.map((s) => s.ref);
      slots = sourceSlots(donor).map((s, i) => ({ ...s, ref: own.length ? own[i % own.length]! : s.ref }));
    }
  }
  if (!slots.length) return [];
  const r = st.rng;
  const ops: string[] = [];
  const choose = (list: string[]) => list[Math.floor(r() * list.length)]!;
  switch (plan.role) {
    case 'ALIGN':
      if (r() > 0.5) ops.push(choose(['displace', 'erode', 'sustain', 'anticipate']));
      break;
    case 'SWAP':
      if (r() > 0.3) ops.push(choose(['displace', 'fill', 'sustain', 'anticipate']));
      if (r() > 0.6) ops.push(choose(['fill', 'erode']));
      break;
    case 'COLLIDE':
      ops.push(choose(['displace', 'fill', 'anticipate']));
      break;
    case 'ALONE':
      ops.push('fill', 'fill');
      if (r() > 0.4) ops.push(choose(['displace', 'anticipate']));
      break;
    case 'RETURN':
      if (r() > 0.5) ops.push('sustain');
      break;
    case 'HOME':
      if (r() > 0.7) ops.push(choose(['sustain', 'anticipate']));
      break;
    default:
      break;
  }
  const apply = (op: string, s: Slot[]): Slot[] => {
    switch (op) {
      case 'displace':
        return RHYTHM_OPS.displace(s, len);
      case 'anticipate':
        return RHYTHM_OPS.anticipate(s, len);
      case 'erode':
        return RHYTHM_OPS.erode(s, len, r, plan.role === 'RETURN' ? 0.55 : 0.7);
      case 'fill':
        return RHYTHM_OPS.fill(s, len, r, info.bassOnsets);
      case 'sustain':
        return RHYTHM_OPS.sustain(s, len);
      default:
        return s;
    }
  };
  for (const op of ops) {
    const next = apply(op, slots);
    if (next.length) slots = next;
  }
  // Never the same placement two bars running (except where the tune's own rhythm is the point).
  // Compared on attack placement only: a change of note length alone is not a new rhythm.
  const key = onsetKey(slots);
  if (key === st.lastKeys.get(voiceKey) && plan.role !== 'HOME') {
    for (const op of ['displace', 'fill', 'anticipate', 'erode']) {
      const alt = apply(op, slots);
      if (alt.length && onsetKey(alt) !== key) {
        slots = alt;
        break;
      }
    }
  }
  st.lastKeys.set(voiceKey, onsetKey(slots));
  return slots;
}

/** Lower-voice rhythm templates (relative to the bar length). A slow inner melody, not a pedal. */
function lowerTemplates(len: number): Array<Array<[number, number]>> {
  const h = len / 2;
  const t: Array<Array<[number, number]>> = [
    [[0, len]],
    [[1, len - 1]],
    [[GRID, len - GRID]],
    [[0, h], [h, h]],
    [[0, len - 1], [len - 1, 1]],
    [[1, h - 1 + h]],
    [[0, 1.5], [1.5, len - 1.5]],
  ];
  return t.filter((x) => x.every(([o, q]) => o >= 0 && q > 0 && o + q <= len + 1e-9));
}

/** Order pcs as a chain of perfect fourths (checked with the Pentatonic Engine's quartal analysis). */
function fourthChain(pcs: readonly number[]): number[] | null {
  if (!quartalSubsets(pcs).some((q) => q.pitchClasses.length === 3 && q.perfectFourths === 2)) return null;
  for (const start of pcs) {
    const chain = [start];
    while (chain.length < pcs.length) {
      const next = mod12(chain[chain.length - 1]! + 5);
      if (!pcs.includes(next) || chain.includes(next)) break;
      chain.push(next);
    }
    if (chain.length === pcs.length) return chain;
  }
  return null;
}

/** HOME quartal stack for the last bar, and the MIRROR stack a semitone below it for the bar before. */
export function endingStacks(home: TpField, mirror: TpField, rng: () => number, size = 4): { home: number[]; mirror: number[] } | null {
  const chain = fourthChain(home.pcs);
  if (!chain) return null;
  const options: Array<{ home: number[]; mirror: number[] }> = [];
  for (let i = 0; i + size <= chain.length; i++) {
    const h = chain.slice(i, i + size);
    const m = h.map((pc) => mod12(pc - 1));
    if (m.every((pc) => mirror.pcs.includes(pc))) options.push({ home: h, mirror: m });
  }
  if (!options.length) return size > 3 ? endingStacks(home, mirror, rng, size - 1) : null;
  const pick = options[Math.floor(rng() * options.length)]!;
  // Voice from a low note that lands on the middle strings.
  // Stacked fourths from a low note on the fifth string, so both stacks sit low and dark under the hand.
  const base = 48 + mod12(pick.home[0]! - 48);
  const h = pick.home.map((_, i) => base + 5 * i);
  return { home: h, mirror: h.map((x) => x - 1) };
}

/* ------------------------------------------------------------------ fretboard */

function slicesOf(events: readonly TpEvent[], bars: readonly TpBarPlan[]): { slices: FretSlice[]; owners: number[][] } {
  const startOf: number[] = [];
  let t = 0;
  for (const b of bars) {
    startOf[b.bar] = t;
    t += b.lengthQ;
  }
  const notes = events.flatMap((e, ei) => e.midis.map((m) => ({ midi: m, start: startOf[e.bar]! + e.onset, end: startOf[e.bar]! + e.onset + e.quarters, ei })));
  const times = [...new Set(notes.map((n) => n.start))].sort((a, b) => a - b);
  const slices: FretSlice[] = [];
  const owners: number[][] = [];
  for (const time of times) {
    const sounding = notes.filter((n) => n.start <= time && n.end > time);
    const held = sounding.filter((n) => n.start < time).map((n) => n.midi);
    const bar = bars.find((b) => startOf[b.bar]! <= time && time < startOf[b.bar]! + b.lengthQ)?.bar ?? 1;
    slices.push({ time, midis: [...new Set(sounding.map((n) => n.midi))], held: [...new Set(held)], bar });
    owners.push([...new Set(sounding.filter((n) => n.start === time).map((n) => n.ei))]);
  }
  return { slices, owners };
}

/* ------------------------------------------------------------------ compose */

export function composeTritonePair(sourceXml: string, seed: number): TpPlan {
  const doc = parseScoreDocument(sourceXml);
  const { guitarId, guitar } = guitarAndBass(doc);
  const gv = measureViews(guitar);
  const { home, mirror } = chooseFields(gv);
  const { infos } = analyse(doc, home, mirror);
  const rng = seededRandom(seed);
  const sections: TpSection[] = findSections(doc).map((s, i, all) => ({ index: i, ...s, role: sectionRole(i, all.length) }));
  const bars = planBars(infos, sections, rng);
  const st: GenState = {
    rng,
    home,
    mirror,
    prevUpper: null,
    prevUpper2: null,
    prevRef: null,
    prevLower: null,
    lowerDir: rng() < 0.5 ? 1 : -1,
    lastKeys: new Map(),
    lastLowerTemplate: -1,
    stacks: 0,
    lastBurstBar: -9,
    lastBurstOnset: -1,
  };
  const ending = endingStacks(home, mirror, rng);
  const peaks = peakBars(doc);
  let events: TpEvent[] = [];

  for (const plan of bars) {
    const info = infos[plan.bar - 1]!;
    const sec = sections[plan.section]!;
    const progress = sec.to === sec.from ? 1 : (plan.bar - sec.from) / (sec.to - sec.from);
    const len = plan.lengthQ;
    const f = field(st, plan.upper);
    const o = field(st, other(plan.upper));

    if (plan.role === 'END' && ending) {
      events.push({ bar: plan.bar, voice: '1', onset: 0, quarters: len, midis: ending.home, field: 'HOME', kind: 'stack' });
      continue;
    }
    if (plan.role === 'SLIDE' && ending) {
      // Enter after the bass's downbeat: the mirror stack, held, a semitone under home.
      const onset = info.bassOnsets.includes(0) && len >= 2 ? 1 : 0;
      if (onset > 0) {
        const ref = info.melody[0]?.midi ?? 64;
        const lead = pickPitch(st, ref, mirror, home, registerFor('HOME', 0), 0);
        events.push({ bar: plan.bar, voice: '1', onset: 0, quarters: onset, midis: [lead], field: 'MIRROR', kind: 'line' });
      }
      events.push({ bar: plan.bar, voice: '1', onset, quarters: len - onset, midis: ending.mirror, field: 'MIRROR', kind: 'stack' });
      continue;
    }
    if (plan.role === 'SILENCE') {
      // Silence as pivot. Before a new section the guitar may lift in on the last beat.
      const nextIsNew = bars[plan.bar]?.section !== plan.section;
      if (nextIsNew && rng() < 0.7) {
        const nxt = infos[plan.bar];
        const ref = nxt?.melody[0]?.midi ?? info.melody[0]?.midi ?? 62;
        const target = field(st, bars[plan.bar]?.upper ?? 'HOME');
        const m = pickPitch(st, ref, target, target === home ? mirror : home, registerFor('HOME', 0.5), 0);
        events.push({ bar: plan.bar, voice: '1', onset: len - 1, quarters: 1, midis: [m], field: target.id, kind: 'line' });
        st.prevUpper2 = st.prevUpper;
        st.prevUpper = m;
      }
      continue;
    }

    const isPeak = peaks.has(plan.bar) && (plan.role === 'HOME' || plan.role === 'ALIGN' || plan.role === 'SWAP');
    // The score's own PEAK: top of the range, and its longest note becomes a grip.
    const reg = isPeak ? { lo: 70, hi: 77, centre: 74, angular: 0, dyad: 0 } : registerFor(plan.role, progress);
    const twoVoice = plan.lower !== null;
    let lowerNotes: TpEvent[] = [];
    if (twoVoice) {
      const lf = field(st, plan.lower!);
      const templates = lowerTemplates(len);
      let ti = Math.floor(rng() * templates.length);
      if (ti === st.lastLowerTemplate) ti = (ti + 1 + Math.floor(rng() * (templates.length - 1))) % templates.length;
      st.lastLowerTemplate = ti;
      for (const [onset, quarters] of templates[ti]!) {
        const prev = st.prevLower ?? 52;
        const cands: number[] = [];
        for (let m = 45; m <= 57; m++) if (lf.pcs.includes(mod12(m)) && m !== prev) cands.push(m);
        // Move by the nearest step in the current direction; turn at the edges.
        let pool = cands.filter((m) => Math.sign(m - prev) === st.lowerDir);
        if (!pool.length) {
          st.lowerDir = st.lowerDir === 1 ? -1 : 1;
          pool = cands.filter((m) => Math.sign(m - prev) === st.lowerDir);
        }
        pool.sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev));
        const m = (rng() < 0.75 ? pool[0] : pool[1] ?? pool[0]) ?? cands[0]!;
        if (rng() < 0.2) st.lowerDir = st.lowerDir === 1 ? -1 : 1;
        st.prevLower = m;
        lowerNotes.push({ bar: plan.bar, voice: '2', onset, quarters, midis: [m], field: lf.id, kind: 'inner' });
      }
    }

    let slots = rhythmFor(st, plan, info, infos, twoVoice ? 'upper2' : 'upper');
    // Grip burst (1.1): in SWAP and single-voice COLLIDE bars, one long note becomes a three-note grip,
    // then silence for a beat. Never two bars running, never the same place in the bar twice running.
    let burstAt: Slot | null = null;
    if (isPeak) burstAt = [...slots].sort((a, b) => b.quarters - a.quarters)[0] ?? null;
    const burstRole = plan.role === 'SWAP' || plan.role === 'COLLIDE';
    if (!isPeak && burstRole && plan.bar - st.lastBurstBar >= 2 && rng() < 0.85) {
      const cands = slots.filter((x) => x.quarters >= 0.5 && x.onset !== st.lastBurstOnset);
      cands.sort((a, b) => b.quarters - a.quarters || rng() - 0.5);
      burstAt = cands[0] ?? null;
      if (burstAt) {
        const b = burstAt;
        const quiet = b.onset + Math.max(b.quarters, 1);
        slots = slots.filter((x) => x === b || x.onset < b.onset || x.onset >= quiet + 1);
        st.lastBurstBar = plan.bar;
        st.lastBurstOnset = b.onset;
      }
    }
    const lastSlot = slots[slots.length - 1];
    for (const s of slots) {
      const below = lowerNotes.find((l) => l.onset <= s.onset && l.onset + l.quarters > s.onset)?.midis[0] ?? 0;
      let fieldHere = f;
      // RETURN: the mirror line resolves by semitone into HOME on the bar's last note.
      if (plan.role === 'RETURN' && s === lastSlot) fieldHere = home;
      // ALONE: the line zig-zags between the pair, note by note (tritones and semitones under the hand).
      if (plan.role === 'ALONE' && slots.indexOf(s) % 2 === 1) fieldHere = o;
      let m: number;
      if (plan.role === 'RETURN' && s === lastSlot && st.prevUpper !== null) {
        const up = st.prevUpper + 1;
        const down = st.prevUpper - 1;
        m = home.pcs.includes(mod12(down)) ? down : home.pcs.includes(mod12(up)) ? up : pickPitch(st, s.ref, home, mirror, reg, below + 5);
      } else {
        // Radical roles move the tune's own notes by an exact tritone; home roles take the nearest field note.
        const mirrorMode = plan.role === 'SWAP' || plan.role === 'COLLIDE' || plan.role === 'ALONE';
        m = pickPitch(st, s.ref, fieldHere, fieldHere === home ? mirror : home, reg, below ? below + 5 : 0, mirrorMode);
      }
      let midis = [m];
      let kind: TpKind = 'line';
      const long = s.quarters >= 1 || s === lastSlot;
      if (s === burstAt && twoVoice) {
        // Over the inner voice (other field): add its fourth above, so one hand holds both worlds.
        const lf = field(st, plan.lower!);
        const add = [5, 6].map((d) => below + d).find((x) => below > 0 && lf.pcs.includes(mod12(x)) && x <= m - 2);
        if (add !== undefined) {
          midis = [add, m];
          kind = 'clash-grip';
        }
      } else if (s === burstAt) {
        const o2 = fieldHere === home ? mirror : home;
        const g = gripUnder(m, fieldHere, o2, plan.role === 'COLLIDE') ?? gripUnder(m, fieldHere, o2, plan.role !== 'COLLIDE');
        if (g) {
          midis = g.midis;
          kind = g.kind;
        }
      } else if (!twoVoice && long && rng() < reg.dyad) {
        const mirrorDyad = (plan.role === 'SWAP' || plan.role === 'ALONE') && rng() < 0.6;
        const partner = mirrorDyad ? m - 6 : quartalPartner(m, fieldHere);
        if (partner !== null && partner >= 47) {
          midis.unshift(partner);
          kind = mirrorDyad ? 'mirror-dyad' : 'quartal-dyad';
          // A third note at the section's last long note: a quartal stack, rarely.
          const sectionEnd = plan.bar === sec.to && s === lastSlot;
          if (!mirrorDyad && sectionEnd && st.stacks < 6) {
            const third = quartalPartner(partner, fieldHere);
            if (third !== null && third >= 45 && mod12(partner - third) === 5) {
              midis.unshift(third);
              kind = 'stack';
              st.stacks += 1;
            }
          }
        }
      }
      st.prevUpper2 = st.prevUpper;
      st.prevUpper = m;
      st.prevRef = s.ref;
      events.push({ bar: plan.bar, voice: '1', onset: s.onset, quarters: s.quarters, midis, field: fieldHere.id, kind });
    }
    events.push(...lowerNotes);
  }

  // Playability: solve the whole part on the fretboard; repair the first moment that cannot be fingered.
  let repairs = 0;
  let fret = solveFretPath(slicesOf(events, bars).slices);
  while (!fret.ok && repairs < 400) {
    const { owners } = slicesOf(events, bars);
    const culprits = owners[fret.failedAt] ?? [];
    let fixed = false;
    // 1. Drop an added dyad or stack note.
    for (const ei of culprits) {
      const e = events[ei]!;
      if (e.midis.length > 1 && e.kind !== 'stack') {
        const rest = e.midis.slice(1);
        events[ei] = { ...e, midis: rest, kind: rest.length > 1 ? (e.kind === 'clash-grip' ? 'mirror-dyad' : 'quartal-dyad') : 'line' };
        fixed = true;
        break;
      }
    }
    // 2. Move an inner-voice note to a neighbouring field note.
    if (!fixed) {
      for (const ei of culprits) {
        const e = events[ei]!;
        if (e.voice === '2') {
          const lf = field(st, e.field);
          const m = e.midis[0]!;
          const alt = [m + 1, m - 1, m + 2, m - 2, m + 3, m - 3, m + 4, m - 4, m + 5, m - 5].find((x) => x >= 43 && x <= 59 && lf.pcs.includes(mod12(x)));
          if (alt !== undefined && repairs % 3 !== 2) {
            events[ei] = { ...e, midis: [alt] };
            fixed = true;
            break;
          }
        }
      }
    }
    // 3. Move an upper note by an octave toward the middle of the neck, or drop the inner note under it.
    if (!fixed) {
      for (const ei of culprits) {
        const e = events[ei]!;
        if (e.voice === '1' && e.midis.length === 1) {
          const m = e.midis[0]!;
          const target = m > 64 ? m - 12 : m + 12;
          if (target >= 50 && target <= 76) {
            events[ei] = { ...e, midis: [target] };
            fixed = true;
            break;
          }
        }
      }
    }
    if (!fixed) {
      const inner = culprits.find((ei) => events[ei]!.voice === '2');
      if (inner !== undefined) {
        events = events.filter((_, i) => i !== inner);
        fixed = true;
      }
    }
    if (!fixed) break;
    repairs += 1;
    fret = solveFretPath(slicesOf(events, bars).slices);
  }
  if (!fret.ok) throw new Error(`Tritone Pair: could not finger bar ${slicesOf(events, bars).slices[fret.failedAt]?.bar}; nothing written.`);

  // Position marks: where the hand settles in a new area (moves of three frets or more, held for a while).
  const { slices } = slicesOf(events, bars);
  const startOf = new Map<number, number>();
  let acc = 0;
  for (const b of bars) {
    startOf.set(b.bar, acc);
    acc += b.lengthQ;
  }
  const positionMarks: TpPlan['positionMarks'] = [];
  let shown = -99;
  slices.forEach((s, i) => {
    const p = fret.positions[i]!;
    if (!p) return;
    // Mark only a move of three frets or more that the hand then stays at.
    const ahead = fret.positions.slice(i, i + 4).filter((x) => x > 0);
    const settles = ahead.every((x) => Math.abs(x - p) <= 2);
    if (Math.abs(p - shown) >= 3 && settles) {
      shown = p;
      positionMarks.push({ bar: s.bar, onset: s.time - startOf.get(s.bar)!, fret: p });
    }
  });

  return { engine: TRITONE_PAIR_ENGINE, seed, guitarPartId: guitarId, home, mirror, sections, bars, events, fret, positionMarks, repairs };
}

/** Bars whose score text marks the peak ("PEAK", "climax" is a section name, not a moment). */
function peakBars(doc: Document): Set<number> {
  const out = new Set<number>();
  for (const part of partElements(doc)) {
    Array.from(part.getElementsByTagName('measure')).forEach((m, i) => {
      for (const w of Array.from(m.getElementsByTagName('words'))) if (/\bpeak\b/i.test(w.textContent ?? '')) out.add(i + 1);
    });
  }
  return out;
}

/* ------------------------------------------------------------------ describe */

export const ROLE_WORDS: Record<TpRole, string> = {
  ALIGN: 'Follow the trade',
  SWAP: 'Swap the worlds',
  COLLIDE: 'Both at once',
  ALONE: 'Alone: trade the pair',
  SILENCE: 'Silence',
  RETURN: 'Return path',
  HOME: 'Home',
  SLIDE: 'Mirror stack',
  END: 'Home stack',
};

export function fieldLabel(plan: TpPlan, id: FieldId): string {
  const f = id === 'HOME' ? plan.home : plan.mirror;
  return `${f.rootName} field`;
}

/** Short words printed above the guitar where the idea changes. */
export function barLabel(plan: TpPlan, b: TpBarPlan): string {
  const name = (id: FieldId | null) => (id === 'HOME' ? plan.home.rootName : plan.mirror.rootName);
  switch (b.role) {
    case 'COLLIDE':
      return `${name(b.upper)} over ${name(b.lower)}`;
    case 'ALONE':
      return `${plan.mirror.rootName} ⇄ ${plan.home.rootName}`;
    case 'SILENCE':
      return 'Silence';
    case 'SLIDE':
      return `${plan.mirror.rootName} stack, up 1 fret`;
    case 'END':
      return `${plan.home.rootName} stack`;
    case 'RETURN':
      return `${plan.mirror.rootName} → ${plan.home.rootName}`;
    default:
      return fieldLabel(plan, b.upper);
  }
}
