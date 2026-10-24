/**
 * Coffee Run custom octet for pianoChamber.realise.
 * Chamber and symphonic rosters stay on their existing modules.
 *
 * Roster (8): piano (source retained), piccolo, bassoon, bass clarinet,
 * trumpet in B-flat, viola, double bass, harp.
 */

import type { InstrumentSpec } from '../instruments/instrumentTypes';
import { getInstrument } from '../instruments/instrumentCatalogue';
import type { RegisterBand } from '../orchestration/orchestrationTypes';
import type { ResolvedPart } from './ensembleTemplates';

export interface CoffeeRunOctetSlot {
  partId: string;
  instrumentId: string;
  name: string;
  hint: 'melody' | 'doubling' | 'counterline' | 'harmony' | 'bass';
}

/** Fixed order. Piano first so export lists the retained source staff first. */
export const COFFEE_RUN_OCTET_SLOTS: readonly CoffeeRunOctetSlot[] = [
  { partId: 'pn', instrumentId: 'piano', name: 'Piano', hint: 'melody' },
  { partId: 'picc', instrumentId: 'piccolo', name: 'Piccolo', hint: 'melody' },
  { partId: 'bn1', instrumentId: 'bassoon', name: 'Bassoon', hint: 'harmony' },
  { partId: 'bcl', instrumentId: 'bass_clarinet_bb', name: 'Bass Clarinet in B-flat', hint: 'counterline' },
  { partId: 'tp1', instrumentId: 'trumpet_bb', name: 'Trumpet in B-flat', hint: 'melody' },
  { partId: 'va', instrumentId: 'viola', name: 'Viola', hint: 'counterline' },
  { partId: 'db', instrumentId: 'double_bass', name: 'Double Bass', hint: 'bass' },
  { partId: 'hp', instrumentId: 'harp', name: 'Harp', hint: 'harmony' },
];

export const COFFEE_RUN_OCTET_PART_IDS = COFFEE_RUN_OCTET_SLOTS.map((slot) => slot.partId);

/** Instruments that receive new orchestral material. Piano is source-only. */
export const COFFEE_RUN_OCTET_ORCH_IDS = COFFEE_RUN_OCTET_PART_IDS.filter((id) => id !== 'pn');

export const COFFEE_RUN_OCTET_PART_BAND: Record<string, RegisterBand> = {
  pn: 'middle',
  picc: 'very_high',
  bn1: 'low',
  bcl: 'low',
  tp1: 'high',
  va: 'middle',
  db: 'sub_bass',
  hp: 'middle',
};

export function resolveCoffeeRunOctetRoster(): {
  parts: ResolvedPart[];
  omissions: Array<{ partId: string; instrumentId: string; detail: string }>;
} {
  const parts: ResolvedPart[] = [];
  const omissions: Array<{ partId: string; instrumentId: string; detail: string }> = [];
  for (const slot of COFFEE_RUN_OCTET_SLOTS) {
    let spec: InstrumentSpec;
    try {
      spec = getInstrument(slot.instrumentId);
    } catch {
      omissions.push({
        partId: slot.partId,
        instrumentId: slot.instrumentId,
        detail: `${slot.instrumentId} is not in the catalogue.`,
      });
      continue;
    }
    if (!spec.soundingHardRange) {
      omissions.push({
        partId: slot.partId,
        instrumentId: slot.instrumentId,
        detail: `${spec.displayName} has no documented sounding range.`,
      });
      continue;
    }
    parts.push({
      partId: slot.partId,
      instrumentId: slot.instrumentId,
      name: slot.name,
      hint: slot.hint,
      spec: slot.partId === 'va' || slot.partId === 'db'
        ? { ...spec, maxSimultaneous: 1 }
        : spec,
    });
  }
  return { parts, omissions };
}

/**
 * Changing 2–3 seat colour per phrase. Bassoon appears in fewer palettes.
 * Never continuous tutti of all seven companions.
 */
const OCTET_PHRASE_PALETTES: readonly (readonly string[])[] = [
  ['picc', 'va', 'db'],
  ['tp1', 'bcl', 'hp'],
  ['va', 'db', 'hp'],
  ['picc', 'hp', 'bcl'],
  ['tp1', 'db', 'va'],
  ['bcl', 'hp', 'picc'],
  ['db', 'va', 'tp1'],
  ['hp', 'bcl', 'db'],
  ['picc', 'tp1', 'va'],
  ['bcl', 'db', 'bn1'], // bassoon only occasional
];

export type CoffeeRunOctetLane = 'bass' | 'counter' | 'colour' | 'answer';

/** Soft cap so bassoon cannot shadow the piano across the cue. */
export const COFFEE_RUN_OCTET_BN1_MAX_NOTES = 8;

/** Soft cap so double bass does not monopolise companion texture. */
export const COFFEE_RUN_OCTET_DB_MAX_NOTES = 12;

/** Film-marker bars that need expressive companion presence (Coffee Run Variation). */
export const COFFEE_RUN_OCTET_MARKER_BARS = [11, 19, 20, 21, 22, 23] as const;

/** Upper winds + viola + harp — dialogue voices (bass stays supportive). */
export const COFFEE_RUN_OCTET_DIALOGUE_IDS = ['picc', 'bn1', 'bcl', 'tp1', 'va', 'hp'] as const;

export function coffeeRunOctetPhrasePalette(phraseIndex: number, kind: 'statement' | 'development' | 'return'): readonly string[] {
  const base = OCTET_PHRASE_PALETTES[((phraseIndex % OCTET_PHRASE_PALETTES.length) + OCTET_PHRASE_PALETTES.length) % OCTET_PHRASE_PALETTES.length]!;
  // Sparse returns: drop the brightest seat so the piano can clear.
  if (kind === 'return') return base.filter((id) => id !== 'picc' && id !== 'tp1').slice(0, 2);
  return base;
}

/** Prefer seats that match the lane, rotated so piccolo/bassoon are not always first. */
export function coffeeRunOctetCarrierOrder(
  lane: CoffeeRunOctetLane,
  phraseIndex: number,
  palette: readonly string[],
): string[] {
  const affinity: Record<CoffeeRunOctetLane, readonly string[]> = {
    bass: ['db', 'bcl', 'bn1'],
    counter: ['va', 'bcl', 'tp1', 'hp'],
    colour: ['hp', 'va', 'bcl', 'picc'],
    answer: ['va', 'bcl', 'tp1', 'picc', 'hp', 'db', 'bn1'],
  };
  const preferred = affinity[lane];
  const rotateBy = ((phraseIndex % preferred.length) + preferred.length) % preferred.length;
  const rotated = [...preferred.slice(rotateBy), ...preferred.slice(0, rotateBy)];
  const inPalette = rotated.filter((id) => palette.includes(id));
  const rest = rotated.filter((id) => !palette.includes(id));
  return [...inPalette, ...rest];
}

export function coffeeRunOctetIsMarkerBar(bar: number): boolean {
  return (COFFEE_RUN_OCTET_MARKER_BARS as readonly number[]).includes(bar);
}

/** True when this companion should stay silent on the bar (transparency, not tutti). */
export function coffeeRunOctetRestGate(bar: number, partId: string, seed: number): boolean {
  const seat = COFFEE_RUN_OCTET_ORCH_IDS.indexOf(partId);
  if (seat < 0) return true;
  // Marker bars keep dialogue voices available; bass may still rest.
  if (coffeeRunOctetIsMarkerBar(bar) && partId !== 'db' && partId !== 'bn1') return false;
  // Bassoon rests more often than the others.
  if (partId === 'bn1') return (bar + seed) % 2 === 0;
  if (partId === 'db') return (bar + seed) % 2 === 0;
  return (bar + seat * 2 + (seed % 5)) % 3 === 0;
}

/** Palette favouring winds/va/harp for dramatic marker bars. */
export function coffeeRunOctetMarkerDialogueOrder(bar: number, seed: number): string[] {
  const rotate = (bar + seed) % COFFEE_RUN_OCTET_DIALOGUE_IDS.length;
  const ids = [...COFFEE_RUN_OCTET_DIALOGUE_IDS];
  return [...ids.slice(rotate), ...ids.slice(0, rotate)];
}

export interface OctetPianoAnchor {
  midi: number;
  onset: number;
  end: number;
}

export interface OctetCompanionShape {
  midi: number;
  onset: number;
  duration: number;
}

function pcOf(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function overlaps(onset: number, end: number, anchor: OctetPianoAnchor): boolean {
  return onset < anchor.end - 1e-6 && anchor.onset < end - 1e-6;
}

/** Reject unisons, octave doubles, and close-register minor seconds against the piano. */
export function coffeeRunOctetConflictsPiano(
  midi: number,
  onset: number,
  duration: number,
  piano: readonly OctetPianoAnchor[],
): boolean {
  const end = onset + duration;
  for (const anchor of piano) {
    if (!overlaps(onset, end, anchor)) continue;
    const delta = Math.abs(midi - anchor.midi);
    if (delta === 0) return true;
    if (delta % 12 === 0) return true;
    if (delta <= 15 && (delta % 12 === 1 || delta % 12 === 11)) return true;
  }
  return false;
}

function foldIntoRange(midi: number, range: readonly [number, number]): number | null {
  let value = midi;
  for (let i = 0; i < 8; i += 1) {
    if (value >= range[0] && value <= range[1]) return value;
    value += value < range[0] ? 12 : -12;
  }
  return null;
}

/**
 * Build an independent companion attack from a donor cell:
 * rhythmic displacement, contrary/oblique register choice, sonority pitch that is not a piano PC copy.
 */
export function shapeCoffeeRunOctetCompanion(input: {
  donorMidi: number;
  donorOnset: number;
  donorDuration: number;
  phraseStart: number;
  phraseEnd: number;
  partId: string;
  range: readonly [number, number];
  piano: readonly OctetPianoAnchor[];
  sonorityPcs: readonly number[];
  seed: number;
  phraseIndex: number;
  lane: CoffeeRunOctetLane;
}): OctetCompanionShape | null {
  const displaceOptions = [0.5, 0.25, 0.75, 1];
  const displace = displaceOptions[(input.seed + input.phraseIndex + input.donorMidi) % displaceOptions.length]!;
  let onset = input.donorOnset + displace;
  let duration = Math.min(input.donorDuration, input.lane === 'answer' ? 1 : 1.5);
  if (input.lane === 'colour' || input.lane === 'answer') duration = Math.min(duration, 1);
  if (onset + duration > input.phraseEnd + 1e-6) {
    onset = Math.max(input.phraseStart, input.phraseEnd - duration);
  }
  if (onset < input.phraseStart - 1e-6) return null;
  if (duration < 0.25) return null;

  // Contrary bias: answer/counter move opposite the donor relative to mid-range.
  const mid = (input.range[0] + input.range[1]) / 2;
  const contraryCentre = input.donorMidi >= mid ? mid - 7 : mid + 7;
  const intervals = input.lane === 'bass' ? [0, -5, -7, 5] : [3, 4, 5, -3, -4, 7, -7, 2, -2];
  const pcs = input.sonorityPcs.length ? input.sonorityPcs : [pcOf(input.donorMidi)];

  const candidates: number[] = [];
  for (const pc of pcs) {
    for (const interval of intervals) {
      const raw = contraryCentre + interval;
      const snapped = raw - pcOf(raw) + pc;
      const folded = foldIntoRange(snapped, input.range);
      if (folded === null) continue;
      if (pcOf(folded) === pcOf(input.donorMidi) && input.lane !== 'bass') continue;
      candidates.push(folded);
    }
  }
  // Unique, prefer farther from donor (oblique/contrary colour).
  const unique = [...new Set(candidates)].sort(
    (a, b) => Math.abs(b - input.donorMidi) - Math.abs(a - input.donorMidi),
  );

  for (const midi of unique) {
    if (coffeeRunOctetConflictsPiano(midi, onset, duration, input.piano)) continue;
    return { midi, onset, duration };
  }

  // Last resort: keep displacement, try pure octave displacement away from piano register.
  for (const shift of [-12, 12, -7, 7, -5, 5]) {
    const folded = foldIntoRange(input.donorMidi + shift, input.range);
    if (folded === null) continue;
    if (coffeeRunOctetConflictsPiano(folded, onset, duration, input.piano)) continue;
    if (pcOf(folded) === pcOf(input.donorMidi)) continue;
    return { midi: folded, onset, duration };
  }
  return null;
}

export interface OctetMotifCell {
  midi: number;
  onset: number;
  duration: number;
}

/**
 * Build a short coherent companion phrase (3–4 cells) from a melody motif:
 * rhythmic variety, contour transform, piano-conflict checks.
 */
export function buildCoffeeRunOctetDialoguePhrase(input: {
  motif: readonly OctetMotifCell[];
  phraseStart: number;
  phraseEnd: number;
  range: readonly [number, number];
  piano: readonly OctetPianoAnchor[];
  sonorityPcs: readonly number[];
  seed: number;
  phraseIndex: number;
  /** Second voice enters later with a fragment (overlapping exchange). */
  exchange: boolean;
}): OctetCompanionShape[] {
  if (input.motif.length < 2) return [];
  const head = input.motif.slice(0, Math.min(4, input.motif.length));
  const origin = head[0]!.onset;
  const rhythmPool = input.exchange
    ? [0.5, 0.5, 1, 0.75]
    : [1, 0.5, 0.75, 1, 0.5];
  const startPad = input.exchange ? 1.0 + (input.phraseIndex % 2) * 0.5 : 0.25;
  let cursor = Math.max(input.phraseStart, origin + startPad);
  const out: OctetCompanionShape[] = [];
  const invert = (input.seed + input.phraseIndex) % 2 === 0;

  for (const [index, cell] of head.entries()) {
    if (input.exchange && index === 0) continue; // fragment: skip motif head
    const duration = rhythmPool[(index + input.seed) % rhythmPool.length]!;
    if (cursor + duration > input.phraseEnd + 1e-6) break;
    const contour = invert ? -(cell.midi - head[0]!.midi) : (cell.midi - head[0]!.midi);
    const base = head[0]!.midi + (invert ? -5 : 3) + contour;
    const pcs = input.sonorityPcs.length ? input.sonorityPcs : [pcOf(cell.midi)];
    let chosen: number | null = null;
    for (const pc of pcs) {
      const snapped = base - pcOf(base) + pc;
      const folded = foldIntoRange(snapped, input.range);
      if (folded === null) continue;
      if (coffeeRunOctetConflictsPiano(folded, cursor, duration, input.piano)) continue;
      chosen = folded;
      break;
    }
    if (chosen === null) {
      for (const shift of [3, -3, 4, -4, 7, -7, 5, -5]) {
        const folded = foldIntoRange(cell.midi + shift, input.range);
        if (folded === null) continue;
        if (coffeeRunOctetConflictsPiano(folded, cursor, duration, input.piano)) continue;
        if (pcOf(folded) === pcOf(cell.midi)) continue;
        chosen = folded;
        break;
      }
    }
    if (chosen === null) {
      cursor += duration;
      continue;
    }
    out.push({ midi: chosen, onset: cursor, duration });
    // Slight gap or legato join for rhythmic variety.
    const gap = (index + input.seed) % 3 === 0 ? 0.25 : 0;
    cursor += duration + gap;
  }
  return out;
}
