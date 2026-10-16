/**
 * Optional hexatonic colour for the existing BHL composer.
 * Worlds A–F stay in bhlWorlds.ts. Provisional Core pairs stay unapproved.
 */

import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { getAdvancedColour, listAdvancedColours } from '../hexatonic/advancedCollections';
import {
  CORE_CANDIDATES,
  CORE_LABORATORY_STATUS,
  getCoreCandidate,
  type CoreCandidate,
} from '../hexatonic/coreLaboratory';
import {
  getHexatonicScalar,
  listHexatonicScalars,
  rootSpelled,
  scalarTriadsAt,
  transposeScalar,
  type HexatonicTriadReading,
} from '../hexatonic/collections';
import { getHexatonicWpsPair, listHexatonicWpsPairs, transposeHexatonicWpsPair } from '../hexatonic/triadPairs';
import type { BhlGuitarEvent, BhlPhrasePlan } from './bhlPhrase';
import { parseSpelledPitch, realizeTriadPair, type LiquidDuration, type LiquidSlot, type ParentTriadInput } from '../wwh/wwhTriadPair';
import { spellName, transposeSpelled, type Spelled } from '../wwh/wps/wpsTonalityVaultRecord';

export const BHL_HEXATONIC_FAMILIES = ['scalar', 'wps', 'provisional', 'advanced'] as const;
export type BhlHexatonicFamily = (typeof BHL_HEXATONIC_FAMILIES)[number];
export const BHL_HEXATONIC_STRATEGIES = ['dialogue', 'liquid', 'sparse'] as const;
export type BhlHexatonicStrategy = (typeof BHL_HEXATONIC_STRATEGIES)[number];

export interface BhlHexatonicSelection {
  family: BhlHexatonicFamily;
  id: string;
  /** Semitones above the catalogue spelling. 0 keeps the printed reference. */
  referencePc: number;
}

export interface BhlHexatonicColour {
  family: BhlHexatonicFamily;
  id: string;
  label: string;
  referencePc: number;
  pitchClasses: number[];
  left: ParentTriadInput | null;
  right: ParentTriadInput | null;
  sharedPitchClasses: number[];
  provenance: string;
  provisional: boolean;
  status: string;
  artisticApproval: false;
}

export interface BhlHexatonicStamp extends BhlHexatonicColour {
  /** Null on a single Generate: pitches were remapped and Dialogue, Liquid, or Sparse did not run. */
  strategy: BhlHexatonicStrategy | null;
  /** Explicit writing label. colour-remap is the single-Generate case that keeps strategy null. */
  hexatonicWriting: BhlHexatonicStrategy | 'colour-remap';
}

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

function spelledOf(token: string): Spelled {
  const parsed = parseSpelledPitch(token);
  return { step: parsed.step, alter: parsed.alter };
}

function transposeNotes(notes: readonly [string, string, string], semitones: number): [string, string, string] {
  if (semitones === 0) return [notes[0], notes[1], notes[2]];
  const from = spelledOf(notes[0]);
  const to = rootSpelled(mod12(parseSpelledPitch(notes[0]).pc + semitones));
  return notes.map((token) => spellName(transposeSpelled(spelledOf(token), from, to))) as [string, string, string];
}

function triadInput(id: string, quality: ParentTriadInput['quality'], notes: readonly [string, string, string], provenance: ParentTriadInput['provenance']): ParentTriadInput {
  const pitchClasses = notes.map((token) => parseSpelledPitch(token).pc) as [number, number, number];
  return {
    id,
    rootSpelling: notes[0],
    quality,
    notes: [notes[0], notes[1], notes[2]],
    pitchClasses,
    provenance,
  };
}

function readingInput(reading: HexatonicTriadReading, id: string): ParentTriadInput {
  return triadInput(id, reading.quality, [reading.spelling[0], reading.spelling[1], reading.spelling[2]], 'suggested');
}

function sharedOf(left: ParentTriadInput | null, right: ParentTriadInput | null): number[] {
  if (!left || !right) return [];
  const rightPcs = new Set(right.pitchClasses);
  return left.pitchClasses.filter((pitchClass) => rightPcs.has(pitchClass));
}

function colourBase(selection: BhlHexatonicSelection, fields: Omit<BhlHexatonicColour, 'family' | 'id' | 'referencePc' | 'artisticApproval'>): BhlHexatonicColour {
  return {
    family: selection.family,
    id: selection.id,
    referencePc: selection.referencePc,
    artisticApproval: false,
    ...fields,
  };
}

function provisionalColour(candidate: CoreCandidate, selection: BhlHexatonicSelection): BhlHexatonicColour {
  const leftNotes = transposeNotes(candidate.leftSpelling, selection.referencePc);
  const rightNotes = transposeNotes(candidate.rightSpelling, selection.referencePc);
  const left = triadInput(`${candidate.id}-left`, candidate.leftQuality, leftNotes, 'suggested');
  const right = triadInput(`${candidate.id}-right`, candidate.rightQuality, rightNotes, 'suggested');
  const pitchClasses = [...new Set([...left.pitchClasses, ...right.pitchClasses])].sort((a, b) => a - b);
  return colourBase(selection, {
    label: candidate.label,
    pitchClasses,
    left,
    right,
    sharedPitchClasses: sharedOf(left, right),
    provenance: candidate.vaultNote ? `${candidate.provenance}. ${candidate.vaultNote}` : candidate.provenance,
    provisional: true,
    status: CORE_LABORATORY_STATUS,
  });
}

export function resolveBhlHexatonicColour(selection: BhlHexatonicSelection): BhlHexatonicColour {
  if (!BHL_HEXATONIC_FAMILIES.includes(selection.family)) throw new Error(`unknown hexatonic family ${selection.family}`);
  if (!Number.isInteger(selection.referencePc) || selection.referencePc < 0 || selection.referencePc > 11) {
    throw new Error('reference note must be a pitch class 0–11');
  }
  if (selection.family === 'provisional') {
    const candidate = getCoreCandidate(selection.id);
    if (!candidate) throw new Error(`unknown provisional pair ${selection.id}`);
    return provisionalColour(candidate, selection);
  }
  if (selection.family === 'advanced') {
    const colour = getAdvancedColour(selection.id);
    if (!colour) throw new Error(`unknown advanced colour ${selection.id}`);
    const leftNotes = transposeNotes(colour.leftSpelling, selection.referencePc);
    const rightNotes = transposeNotes(colour.rightSpelling, selection.referencePc);
    const left = triadInput(`${colour.id}-left`, colour.leftQuality, leftNotes, 'suggested');
    const right = triadInput(`${colour.id}-right`, colour.rightQuality, rightNotes, 'suggested');
    const pitchClasses = [...new Set([...left.pitchClasses, ...right.pitchClasses])].sort((a, b) => a - b);
    return colourBase(selection, {
      label: colour.label,
      pitchClasses,
      left,
      right,
      sharedPitchClasses: sharedOf(left, right),
      provenance: colour.provenance,
      provisional: false,
      status: colour.status,
    });
  }
  if (selection.family === 'scalar') {
    const scalar = getHexatonicScalar(selection.id);
    if (!scalar) throw new Error(`unknown hexatonic scalar ${selection.id}`);
    const pitchClasses = transposeScalar(selection.id, selection.referencePc);
    const readings = scalarTriadsAt(selection.id, rootSpelled(selection.referencePc));
    const left = readings?.[0] ? readingInput(readings[0], `${scalar.id}-lower`) : null;
    const right = readings?.[1] ? readingInput(readings[1], `${scalar.id}-upper`) : null;
    return colourBase(selection, {
      label: scalar.id,
      pitchClasses,
      left,
      right,
      sharedPitchClasses: sharedOf(left, right),
      provenance: scalar.source,
      provisional: false,
      status: 'catalogue',
    });
  }
  const pair = getHexatonicWpsPair(selection.id);
  if (!pair) throw new Error(`unknown WPS pair ${selection.id}`);
  const moved = transposeHexatonicWpsPair(selection.id, rootSpelled(selection.referencePc));
  return colourBase(selection, {
    label: `${pair.parentSymbol} · ${pair.harrisLabel}`,
    pitchClasses: [...moved.pitchClasses],
    left: moved.resolution.input,
    right: moved.tension.input,
    sharedPitchClasses: [...moved.sharedPitchClasses],
    provenance: pair.provenance,
    provisional: false,
    status: 'catalogue',
  });
}

export function listBhlHexatonicChoices(): Array<{ family: BhlHexatonicFamily; id: string; label: string; provisional: boolean }> {
  return [
    ...listHexatonicScalars().map((row) => ({ family: 'scalar' as const, id: row.id, label: row.id, provisional: false })),
    ...listHexatonicWpsPairs().map((row) => ({ family: 'wps' as const, id: row.id, label: `${row.parentSymbol} · ${row.harrisLabel}`, provisional: false })),
    ...CORE_CANDIDATES.map((row) => ({ family: 'provisional' as const, id: row.id, label: row.label, provisional: true })),
    ...listAdvancedColours().map((row) => ({ family: 'advanced' as const, id: row.id, label: `${row.label} — ${row.status}`, provisional: false })),
  ];
}

export function readBhlHexatonicSelection(raw: unknown): BhlHexatonicColour | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (!raw || typeof raw !== 'object') throw new Error('hexatonic colour must be an object');
  const row = raw as Record<string, unknown>;
  const family = row.family;
  const id = row.id;
  const referencePc = row.referencePc === undefined ? 0 : row.referencePc;
  if (typeof family !== 'string' || typeof id !== 'string' || typeof referencePc !== 'number') {
    throw new Error('hexatonic colour needs family, id, and referencePc');
  }
  return resolveBhlHexatonicColour({ family: family as BhlHexatonicFamily, id, referencePc });
}

function nearestMidi(midi: number, field: readonly number[]): number {
  let best = midi;
  let bestDistance = 99;
  for (let candidate = midi - 6; candidate <= midi + 6; candidate += 1) {
    if (!field.includes(mod12(candidate))) continue;
    const distance = Math.abs(candidate - midi);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/** Move guitar pitches onto the selected collection. Rhythm and bass stay. */
export function remapGuitarToHexatonic(events: readonly BhlGuitarEvent[], pitchClasses: readonly number[]): BhlGuitarEvent[] {
  const field = [...new Set(pitchClasses.map(mod12))];
  if (!field.length) throw new Error('hexatonic colour has no pitch classes');
  return events.map((event) => {
    const midis = event.midis.map((midi) => nearestMidi(midi, field));
    return {
      ...event,
      midis,
      pitchClasses: [...new Set(midis.map(mod12))].sort((a, b) => a - b),
    };
  });
}

export function stampHexatonicColour(xml: string, colour: BhlHexatonicColour, strategy: BhlHexatonicStrategy | null = null): string {
  const payload: BhlHexatonicStamp = {
    ...colour,
    strategy,
    hexatonicWriting: strategy ?? 'colour-remap',
    artisticApproval: false,
  };
  const comment = `<!-- bhl-hexatonic ${JSON.stringify(payload).replace(/--/g, '- -')} -->`;
  const stripped = xml.replace(/\n?<!-- bhl-hexatonic [\s\S]*?-->\n?/, '\n');
  const declaration = stripped.match(/^<\?xml[^?]*\?>\s*/);
  if (!declaration) return `${comment}\n${stripped}`;
  return `${stripped.slice(0, declaration[0].length)}${comment}\n${stripped.slice(declaration[0].length)}`;
}

export function readHexatonicStamp(xml: string): BhlHexatonicStamp | null {
  const match = xml.match(/<!-- bhl-hexatonic ([\s\S]*?) -->/);
  if (!match?.[1]) return null;
  const parsed = JSON.parse(match[1]) as BhlHexatonicStamp;
  if (parsed.artisticApproval !== false) throw new Error('hexatonic stamp claimed artistic approval');
  if (!parsed.hexatonicWriting) parsed.hexatonicWriting = parsed.strategy ?? 'colour-remap';
  return parsed;
}

function durationOf(quarters: number): LiquidDuration {
  if (quarters >= 4) return 'whole';
  if (quarters >= 2) return 'half';
  if (quarters >= 1.5) return 'quarter.';
  if (quarters >= 1) return 'quarter';
  return 'eighth';
}

function eventOf(event: BhlGuitarEvent, midis: number[]): BhlGuitarEvent {
  const unique = [...new Set(midis)].sort((a, b) => a - b);
  return { ...event, midis: unique, pitchClasses: unique.map(mod12) };
}

function triadTone(input: ParentTriadInput, index: number, anchor: number): number {
  const pitchClass = input.pitchClasses[index % 3]!;
  return nearestMidi(anchor, [pitchClass]);
}

/**
 * Dialogue, liquid, and sparse guitar writing on an existing event list.
 * A common tone is kept only when both triads contain it.
 */
export function applyHexatonicStrategy(
  events: readonly BhlGuitarEvent[],
  colour: BhlHexatonicColour,
  strategy: BhlHexatonicStrategy,
  seed: number,
): { events: BhlGuitarEvent[]; notes: string[]; commonToneRetentions: number } {
  const notes: string[] = [];
  const ordered = events.map((event) => ({ ...event, midis: [...event.midis], pitchClasses: [...event.pitchClasses] }));
  if (!colour.left || !colour.right) {
    notes.push('This colour has no two-triad reading. No common-tone hold is claimed.');
    return { events: remapGuitarToHexatonic(ordered, colour.pitchClasses), notes, commonToneRetentions: 0 };
  }
  const shared = new Set(colour.sharedPitchClasses);
  let commonToneRetentions = 0;
  if (strategy === 'liquid') {
    const slots: LiquidSlot[] = ordered.map((event) => ({
      bar: event.bar,
      duration: durationOf(event.quarters),
      rest: false,
      kind: 'connect' as const,
    }));
    try {
      const realized = realizeTriadPair(colour.left, colour.right, seed, slots);
      let pick = 0;
      for (const event of ordered) {
        const voicing = realized.events[pick]?.voicing;
        pick += 1;
        if (!voicing) continue;
        event.midis = voicing.points.map((point) => point.midi);
        event.pitchClasses = [...new Set(event.midis.map(mod12))].sort((a, b) => a - b);
      }
      notes.push('Liquid writing uses realizeTriadPair. planLiquidHarmony was not called.');
    } catch (error) {
      notes.push(error instanceof Error ? error.message : String(error));
      notes.push('No playable liquid path. Pitches stay in the collection without an invented hold.');
    }
  }
  let previous: number[] = [];
  ordered.forEach((event, index) => {
    const anchor = event.midis[event.midis.length - 1] ?? 64;
    if (strategy === 'dialogue') {
      const source = index % 2 === 0 ? colour.left! : colour.right!;
      const statement = ordered.filter((item) => item.regionId === event.regionId)[0] === event && index < 4;
      const midi = statement ? triadTone(colour.left!, index, anchor) : triadTone(source, index + seed, anchor);
      event.midis = [midi];
      event.pitchClasses = [mod12(midi)];
      if (index % 3 === 2 && index > 3) {
        event.midis = [];
        event.pitchClasses = [];
      }
    }
    if (strategy === 'sparse') {
      const melody = event.midis[event.midis.length - 1] ?? triadTone(colour.left!, index, anchor);
      const partner = index % 4 === 3 ? triadTone(index % 8 < 4 ? colour.left! : colour.right!, 1, melody) : null;
      const midis = partner === null || partner === melody ? [melody] : [melody, partner];
      const check = assessGuitarFeasibility(midis);
      event.midis = check.feasible ? midis : [melody];
      event.pitchClasses = event.midis.map(mod12);
    }
    const kept = event.midis.filter((midi) => previous.includes(midi) || shared.has(mod12(midi)) || !previous.length);
    const illegalHold = event.midis.filter((midi) => previous.some((before) => mod12(before) === mod12(midi)) && !shared.has(mod12(midi)));
    if (illegalHold.length && colour.left && colour.right) {
      const current = index % 2 === 0 ? colour.left : colour.right;
      event.midis = event.midis.map((midi) => (illegalHold.includes(midi) ? triadTone(current, 2, midi + 1) : midi));
      notes.push(`Bar ${event.bar} does not hold a tone outside the shared set.`);
    } else if (kept.length && previous.length && event.midis.some((midi) => shared.has(mod12(midi)) && previous.some((before) => mod12(before) === mod12(midi)))) {
      commonToneRetentions += 1;
    }
    event.pitchClasses = [...new Set(event.midis.map(mod12))].sort((a, b) => a - b);
    previous = [...event.midis];
  });
  return {
    events: ordered.filter((event) => event.midis.length > 0),
    notes,
    commonToneRetentions,
  };
}

export function positionShiftWarnings(events: readonly BhlGuitarEvent[]): string[] {
  const warnings: string[] = [];
  let previous: number | null = null;
  for (const event of events) {
    if (event.midis.length < 2) continue;
    const check = assessGuitarFeasibility(event.midis);
    if (!check.feasible) warnings.push(`Bar ${event.bar} at beat ${event.onsetQuarters} is not a feasible guitar grip.`);
    if (previous !== null && Math.abs(check.lowestFret - previous) > 4) {
      warnings.push(`Bar ${event.bar} shifts position by ${Math.abs(check.lowestFret - previous)} frets.`);
    }
    previous = check.lowestFret;
  }
  return warnings;
}

export const BHL_HEXATONIC_TENSIONS = ['home', 'near', 'outside', 'return'] as const;
export const BHL_HEXATONIC_SPACES = ['played', 'rests', 'empty-bars'] as const;
export const BHL_HEXATONIC_DENSITIES = ['sparse', 'fuller'] as const;
export const BHL_HEXATONIC_TEXTURES = ['melody', 'dyads', 'triads', 'melody-inner'] as const;
export const BHL_HEXATONIC_MOTIFS = ['statement', 'transform'] as const;
export const BHL_HEXATONIC_INTERACTIONS = ['with-bass', 'independent'] as const;

export interface BhlHexatonicShape {
  tension: (typeof BHL_HEXATONIC_TENSIONS)[number];
  space: (typeof BHL_HEXATONIC_SPACES)[number];
  density: (typeof BHL_HEXATONIC_DENSITIES)[number];
  texture: (typeof BHL_HEXATONIC_TEXTURES)[number];
  motif: (typeof BHL_HEXATONIC_MOTIFS)[number];
  interaction: (typeof BHL_HEXATONIC_INTERACTIONS)[number];
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`${label} ${String(value)} is not available`);
}

export function readBhlHexatonicShape(raw: unknown): BhlHexatonicShape | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (!raw || typeof raw !== 'object') throw new Error('shape must be an object');
  const row = raw as Record<string, unknown>;
  return {
    tension: oneOf(row.tension, BHL_HEXATONIC_TENSIONS, 'tension'),
    space: oneOf(row.space, BHL_HEXATONIC_SPACES, 'space'),
    density: oneOf(row.density, BHL_HEXATONIC_DENSITIES, 'density'),
    texture: oneOf(row.texture, BHL_HEXATONIC_TEXTURES, 'texture'),
    motif: oneOf(row.motif, BHL_HEXATONIC_MOTIFS, 'motif'),
    interaction: oneOf(row.interaction, BHL_HEXATONIC_INTERACTIONS, 'interaction'),
  };
}

/** Musician-facing shape written onto the existing phrase regions. */
export function applyHexatonicShape(plan: BhlPhrasePlan, shape: BhlHexatonicShape): BhlPhrasePlan {
  const next = structuredClone(plan);
  next.regions.forEach((region, index) => {
    const last = index === next.regions.length - 1;
    if (shape.tension === 'home') region.tensionState = last ? 'recover' : 'resolve';
    if (shape.tension === 'near') region.tensionState = 'primary';
    if (shape.tension === 'outside') region.tensionState = last ? 'recover' : index === 0 ? 'primary' : 'tension';
    if (shape.tension === 'return') {
      region.tensionState = last ? 'recover' : 'primary';
      if (last) region.pitchTransform = 'recall-cell';
    }
    if (shape.space === 'rests' || shape.space === 'empty-bars') region.dialogue = 'leave-space';
    if (shape.space === 'empty-bars' && region.bars.length > 1) region.rhythmTransform = 'silence-window';
    if (shape.density === 'sparse' || shape.texture === 'melody') region.density = 'single';
    if (shape.density === 'fuller' && shape.texture === 'dyads') region.density = 'dyad';
    if (shape.texture === 'dyads' && shape.density !== 'sparse') region.density = 'dyad';
    if (shape.texture === 'triads') region.density = shape.density === 'sparse' ? 'dyad' : 'triad';
    if (shape.texture === 'melody-inner') region.density = 'counterline';
    if (shape.motif === 'transform' && (region.role === 'development' || region.role === 'transformation')) {
      region.pitchTransform = 'invert-into-field';
    }
    if (shape.motif === 'statement' && region.role === 'statement') region.pitchTransform = 'neighbor-statement';
    if (shape.interaction === 'with-bass' && shape.space === 'played') region.dialogue = 'answer-after-bass';
    if (shape.interaction === 'independent' && shape.space === 'played') region.dialogue = 'counter-motion';
  });
  return next;
}

/** Reject only when rhythm, triad alternation, and an exact cell all repeat with no rest. */
export function demonstrablyMechanical(events: readonly BhlGuitarEvent[]): boolean {
  const attacks = events.filter((event) => event.midis.length > 0);
  if (attacks.length < 8) return false;
  const byBar = new Map<number, string>();
  for (const event of attacks) {
    const key = byBar.get(event.bar) ?? '';
    byBar.set(event.bar, `${key}${event.onsetQuarters};`);
  }
  const grids = [...byBar.values()];
  const sameRhythm = grids.length >= 4 && grids.every((grid) => grid === grids[0]);
  const sets = attacks.map((event) => event.pitchClasses.join(','));
  const alternating = sets.length >= 8 && sets.every((set, index) => set === sets[index % 2]);
  const cell = attacks.slice(0, 3).map((event) => event.midis.join('.')).join('|');
  let copies = 0;
  for (let index = 0; index + 3 <= attacks.length; index += 3) {
    const slice = attacks.slice(index, index + 3).map((event) => event.midis.join('.')).join('|');
    if (slice === cell) copies += 1;
  }
  const hasRestGap = events.some((event, index) => index > 0 && event.onsetQuarters - (events[index - 1]!.onsetQuarters + events[index - 1]!.quarters) >= 1);
  return sameRhythm && alternating && copies >= 3 && !hasRestGap;
}
