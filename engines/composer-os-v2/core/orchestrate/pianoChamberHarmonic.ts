/**
 * V3.5 Phase 2 — musician-controlled harmonic development for piano-to-chamber.
 * Called only when a control is enabled. Liquid harmony and triad parents
 * supply pitch classes. This module schedules the line.
 */

import { bhlPitchClassName, listBhlFieldChoices } from '../bhl/bhlPhrase';
import { buildBhlWorldField, isFifthStep } from '../bhl/bhlWorlds';
import { planLiquidHarmony, nearestResolvePitchClassToTriad } from '../harmony/liquidHarmonyPlanner';
import { applyOperator } from '../motif-ops/operators';
import type { Motif } from '../motif-ops/types';
import { planRegisterOwnership } from '../orchestration/registerOwnershipPlanner';
import type { RegisterBand } from '../orchestration/orchestrationTypes';
import { q, qToNumber, type ExactQuarter } from '../piano/pianoExactTiming';
import type { ResolvedPart } from './ensembleTemplates';
import {
  describeTriadPair,
  transformTriadParent,
  triadPair,
  triadParent,
} from './harmonicColour';
import type { SpelledRegister } from './harmonicColourTypes';
import type {
  BhlTensionReleaseControl,
  PianoChamberHarmonicDevelopment,
  PianoChamberRole,
  TriadPairDialogueControl,
} from './types';

const PART_BAND: Record<string, RegisterBand> = {
  fl: 'high',
  ob: 'high',
  cl: 'middle',
  hn: 'middle',
  bn: 'low',
  vn1: 'high',
  vn2: 'middle',
  va: 'middle',
  vc: 'bass',
  db: 'sub_bass',
};

const BANDS: Record<RegisterBand, [number, number]> = {
  sub_bass: [24, 43],
  bass: [36, 55],
  low: [48, 67],
  middle: [60, 79],
  high: [72, 91],
  very_high: [84, 103],
};

const INNER: Record<string, readonly string[]> = {
  countermelody: ['vc', 'va', 'cl', 'bn', 'hn', 'vn2'],
  harmonic_support: ['va', 'hn', 'cl', 'vn2', 'bn', 'vc'],
  inner: ['va', 'hn', 'cl', 'vn2', 'bn', 'vc', 'ob'],
};

export interface HarmonicSourceRow {
  id: string;
  bar: number;
  onset: number;
  duration: number;
  midi: number;
  role: PianoChamberRole;
}

export interface ScheduledHarmonicNote {
  control: 'bhl' | 'triad-pair';
  partId: string;
  onset: ExactQuarter;
  duration: ExactQuarter;
  pitch: SpelledRegister;
  syntheticId: string;
  reason: string;
}

interface HarmonicContext {
  seed: number;
  beats: number;
  beatType: number;
  barQuarters: number;
  phrases: Array<{ id: string; startBar: number; endBar: number }>;
  rows: HarmonicSourceRow[];
  busy: Map<string, Array<{ start: number; end: number }>>;
  foregroundByPhrase: Map<string, string>;
  bassPartId: string | null;
  parts: readonly ResolvedPart[];
  control: PianoChamberHarmonicDevelopment;
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function pcOf(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function ic(a: number, b: number): number {
  const diff = Math.abs(pcOf(a) - pcOf(b));
  return Math.min(diff, 12 - diff);
}

function nearestPc(from: number, options: readonly number[]): number | null {
  if (!options.length) return null;
  let best = options[0]!;
  let dist = 99;
  for (const pc of options) {
    const gap = ic(from, pc);
    if (gap < dist) {
      dist = gap;
      best = pc;
    }
  }
  return best;
}

function spellPc(pc: number, midi: number): SpelledRegister {
  const name = bhlPitchClassName(pc);
  const step = name[0] ?? 'C';
  const alter = name.includes('b') ? -1 : name.includes('#') ? 1 : 0;
  const octave = Math.floor(midi / 12) - 1;
  return { step, alter, octave, midi };
}

function pitchName(pitch: SpelledRegister): string {
  const accidental = pitch.alter === 0 ? '' : pitch.alter < 0 ? 'b'.repeat(-pitch.alter) : '#'.repeat(pitch.alter);
  return `${pitch.step}${accidental}${pitch.octave}`;
}

function at(eighths: number): ExactQuarter {
  return q(eighths, 2);
}

function eighths(quarters: number): number {
  return Math.round(quarters * 2);
}

function barStartEighths(bar: number, barQuarters: number): number {
  return (bar - 1) * eighths(barQuarters);
}

function carriers(ctx: HarmonicContext, start: number, end: number): Set<string> {
  const ids = new Set<string>();
  if (ctx.bassPartId) ids.add(ctx.bassPartId);
  for (const phrase of ctx.phrases) {
    if (phrase.endBar < start || phrase.startBar > end) continue;
    const foreground = ctx.foregroundByPhrase.get(phrase.id);
    if (foreground) ids.add(foreground);
  }
  return ids;
}

function rowsInBar(ctx: HarmonicContext, bar: number): HarmonicSourceRow[] {
  return ctx.rows.filter((row) => row.bar === bar);
}

function sonority(rows: readonly HarmonicSourceRow[]): number[] {
  return [...new Set(rows.map((row) => pcOf(row.midi)))];
}

function rootOf(rows: readonly HarmonicSourceRow[]): number | null {
  const bass = rows.filter((row) => row.role === 'bass').sort((a, b) => a.midi - b.midi || a.onset - b.onset);
  const pool = bass.length ? bass : [...rows].sort((a, b) => a.midi - b.midi || a.onset - b.onset);
  const lowest = pool[0];
  return lowest ? pcOf(lowest.midi) : null;
}

function spanFree(busy: Map<string, Array<{ start: number; end: number }>>, partId: string, start: number, end: number): boolean {
  return !(busy.get(partId) ?? []).some((span) => start < span.end - 1e-6 && span.start < end - 1e-6);
}

function hold(busy: Map<string, Array<{ start: number; end: number }>>, partId: string, start: number, end: number): void {
  const list = busy.get(partId) ?? [];
  list.push({ start, end });
  busy.set(partId, list);
}

function cloneBusy(busy: Map<string, Array<{ start: number; end: number }>>): Map<string, Array<{ start: number; end: number }>> {
  return new Map([...busy.entries()].map(([id, spans]) => [id, spans.map((span) => ({ ...span }))]));
}

function midiFor(pc: number, around: number, low: number, high: number, previous: number | null): number | null {
  let best: number | null = null;
  let bestDist = 99;
  for (let midi = low; midi <= high; midi += 1) {
    if (pcOf(midi) !== pcOf(pc)) continue;
    if (previous !== null && Math.abs(midi - previous) > 7) continue;
    const dist = Math.abs(midi - (previous ?? around));
    if (dist < bestDist) {
      bestDist = dist;
      best = midi;
    }
  }
  return best;
}

interface Slot {
  bar: number;
  onsetQ: number;
  durationQ: number;
  eighth: number;
  endEighth: number;
}

function slotsFor(control: BhlTensionReleaseControl, barQuarters: number, beats: number, beatType: number): { common: Slot; tension: Slot; resolution: Slot } | { error: string } {
  const start = control.startBar;
  const end = control.endBar;
  const needsNextBar = control.resolutionTiming === 'bar-end';
  let tensionBar = start;
  if (control.tensionPlacement === 'mid') tensionBar = Math.floor((start + end) / 2);
  if (control.tensionPlacement === 'late') tensionBar = end;
  let resolutionBar = tensionBar;
  if (needsNextBar) {
    if (tensionBar >= end) tensionBar = end - 1;
    resolutionBar = tensionBar + 1;
    if (tensionBar < start) return { error: 'Bar-end resolution needs a following bar inside the chosen span.' };
  } else if (control.resolutionTiming === 'phrase-end') {
    resolutionBar = end;
    if (tensionBar >= end) tensionBar = Math.max(start, end - 1);
    if (tensionBar === resolutionBar && end === start) {
      resolutionBar = start;
    }
  }
  if (tensionBar < start || resolutionBar > end || tensionBar > end) {
    return { error: 'Tension and resolution do not both fall inside the chosen span.' };
  }
  const compound = beats === 6 && beatType === 8;
  const mild = control.departure === 'mild';
  let commonOff = 0.5;
  let commonDur = 0.5;
  let tensionOff = 1;
  let tensionDur = mild ? 1 : compound ? 1 : 2;
  let resolutionOff = mild ? 2 : compound ? 1.5 : 3;
  if (compound) {
    commonOff = 0.5;
    commonDur = 0.5;
    tensionOff = 1;
    tensionDur = mild ? 0.5 : 1;
    resolutionOff = mild ? 1.5 : 2;
  } else if (barQuarters === 3 && beats === 3) {
    commonOff = 0.5;
    commonDur = 0.5;
    tensionOff = 1;
    tensionDur = mild ? 1 : 1;
    resolutionOff = 2;
  }
  if (control.resolutionTiming === 'bar-end') {
    tensionOff = mild ? barQuarters - 1 : Math.max(0.5, barQuarters - tensionDur);
    tensionDur = mild ? 1 : Math.min(2, barQuarters - tensionOff);
    resolutionOff = 0;
  }
  if (control.resolutionTiming === 'phrase-end' && resolutionBar !== tensionBar) {
    resolutionOff = 0;
  }
  if (control.resolutionTiming === 'phrase-end' && resolutionBar === tensionBar) {
    resolutionOff = Math.max(tensionOff + tensionDur, barQuarters - 1);
    if (resolutionOff >= barQuarters) return { error: 'Phrase-end resolution has no beat left after the tension.' };
  }
  const common = makeSlot(tensionBar, commonOff, commonDur, barQuarters);
  const tension = makeSlot(tensionBar, tensionOff, tensionDur, barQuarters);
  const resolution = makeSlot(resolutionBar, resolutionOff, control.resolutionTiming === 'bar-end' || resolutionOff === 0 ? Math.min(1, barQuarters) : 1, barQuarters);
  if (!common || !tension || !resolution) return { error: 'The metre cannot hold this tension and resolution.' };
  if (tension.eighth < common.endEighth - 1e-6 || resolution.eighth < tension.endEighth - 1e-6) {
    return { error: 'Resolution would arrive before the tension has sounded.' };
  }
  return { common, tension, resolution };
}

function makeSlot(bar: number, onsetQ: number, durationQ: number, barQuarters: number): Slot | null {
  if (onsetQ < -1e-6 || durationQ <= 0 || onsetQ + durationQ > barQuarters + 1e-6) return null;
  const eighth = barStartEighths(bar, barQuarters) + eighths(onsetQ);
  const endEighth = eighth + eighths(durationQ);
  return { bar, onsetQ, durationQ, eighth, endEighth };
}

function choosePart(
  ctx: HarmonicContext,
  ids: readonly string[],
  spans: Array<{ start: number; end: number }>,
  centre: number,
  protectedParts: Set<string>,
  busy: Map<string, Array<{ start: number; end: number }>>,
): ResolvedPart | null {
  const ranked = ids
    .filter((id) => !protectedParts.has(id))
    .map((id) => ctx.parts.find((part) => part.partId === id))
    .filter((part): part is ResolvedPart => !!part && !!part.spec.soundingHardRange)
    .filter((part) => spans.every((span) => spanFree(busy, part.partId, span.start, span.end)))
    .sort((a, b) => {
      const ar = a.spec.soundingHardRange!;
      const br = b.spec.soundingHardRange!;
      const ad = Math.abs((ar[0] + ar[1]) / 2 - centre);
      const bd = Math.abs((br[0] + br[1]) / 2 - centre);
      return ad - bd || a.partId.localeCompare(b.partId);
    });
  return ranked[0] ?? null;
}

function buildBhlLine(ctx: HarmonicContext, control: BhlTensionReleaseControl, busy: Map<string, Array<{ start: number; end: number }>>):
  | { ok: true; notes: ScheduledHarmonicNote[] }
  | { ok: false; error: string } {
  if (!Number.isInteger(control.startBar) || !Number.isInteger(control.endBar) || control.startBar < 1 || control.endBar > 24 || control.endBar < control.startBar) {
    return fail('BHL span must be whole bars inside 1–24.');
  }
  if (control.departure !== 'mild' && control.departure !== 'strong') return fail('Harmonic departure must be mild or strong.');
  if (!['early', 'mid', 'late'].includes(control.tensionPlacement)) return fail('Tension placement was not recognised.');
  if (!['next-beat', 'bar-end', 'phrase-end'].includes(control.resolutionTiming)) return fail('Resolution timing was not recognised.');
  const timed = slotsFor(control, ctx.barQuarters, ctx.beats, ctx.beatType);
  if ('error' in timed) return fail(timed.error);
  const tensionRows = rowsInBar(ctx, timed.tension.bar);
  const resolutionRows = rowsInBar(ctx, timed.resolution.bar);
  if (!tensionRows.length || !resolutionRows.length) {
    return fail(`Bars ${timed.tension.bar} and ${timed.resolution.bar} include protected silence. No tension line was written over the rest.`);
  }
  const root = rootOf(tensionRows);
  if (root === null) return fail('The tension bar has no sounding pitch to treat as a root.');
  const resolutionRoot = rootOf(resolutionRows);
  const local = sonority(tensionRows);
  const state = control.departure === 'strong' ? 'chaos' as const : 'tension' as const;
  const field = buildBhlWorldField('B', {
    bar: timed.tension.bar,
    quarters: ctx.barQuarters,
    attacks: [],
    rests: [],
    notes: [],
    pitchClasses: local,
    rootPc: root,
  }, state);
  if (!field.chordType) return fail('World B did not return a quadratonic chord. The line was refused.');
  const limit = control.departure === 'mild' ? 2 : 6;
  const choices = listBhlFieldChoices(local, root);
  let chosen: { chordType: string; tensionPc: number; commonPc: number; chordTones: number[]; resolvesOn: number } | null = null;
  for (const choice of choices) {
    const liquid = planLiquidHarmony(choice.vaultChordType, root, 'tension');
    if (!liquid.voicingPitchClasses.length) continue;
    const tensionPc = liquid.melodyPitchClass;
    if (local.includes(tensionPc)) continue;
    const chordTones = liquid.voicingPitchClasses.filter((pc) => pc !== tensionPc);
    const shared = chordTones.filter((pc) => local.includes(pc));
    const commonPc = nearestPc(tensionPc, shared);
    if (commonPc === null || ic(commonPc, tensionPc) > limit) continue;
    const candidate = { chordType: choice.vaultChordType, tensionPc, commonPc, chordTones, resolvesOn: liquid.tensionResolvesOnBeat };
    if (choice.vaultChordType === field.chordType) {
      chosen = candidate;
      break;
    }
    chosen ??= candidate;
  }
  if (!chosen) {
    return fail(`No ${control.departure} quadratonic tension sits outside bar ${timed.tension.bar} while keeping a common tone. The proposal was refused.`);
  }
  const liquidTension = planLiquidHarmony(chosen.chordType, root, 'tension');
  const liquidResolve = planLiquidHarmony(chosen.chordType, root, 'resolve');
  const tensionPc = chosen.tensionPc;
  const commonPc = chosen.commonPc;
  const chordTones = chosen.chordTones;
  const arrival = sonority(resolutionRows);
  const triadTones = chordTones.length ? chordTones : liquidResolve.voicingPitchClasses;
  const preferred = nearestResolvePitchClassToTriad(tensionPc, triadTones);
  const resolutionChoices = triadTones.filter((pc) => arrival.includes(pc) && pc !== tensionPc);
  const resolutionPc = resolutionChoices.includes(preferred) ? preferred : nearestPc(tensionPc, resolutionChoices);
  if (resolutionPc === null) {
    return fail('Resolution would leave the sounding arrival. The locked harmony was not replaced.');
  }
  const fifthTarget = (root + 7) % 12;
  const resolutionRootPc = resolutionRoot ?? root;
  if (isFifthStep(resolutionRootPc - root) && tensionPc === (fifthTarget + 11) % 12 && resolutionPc === fifthTarget) {
    return fail('The line would spell a dominant resolving by a fifth. That substitution was refused.');
  }
  if (liquidTension.tensionResolvesOnBeat > 0) {
    const gap = (timed.resolution.eighth - timed.tension.eighth) / 2;
    if (gap + 1e-6 < liquidTension.tensionResolvesOnBeat && control.resolutionTiming === 'next-beat') {
      return fail('The metre cannot wait for the liquid-harmony resolution offset.');
    }
  }
  const protectedParts = carriers(ctx, control.startBar, control.endBar);
  const target = control.target;
  const pool = INNER[target] ?? [target];
  if (!INNER[target] && !ctx.parts.some((part) => part.partId === target)) {
    return fail(`Unknown inner target ${target}.`);
  }
  if (protectedParts.has(target)) {
    return fail(`${target} carries protected melody or bass in this span. The line was refused.`);
  }
  const centre = tensionRows.reduce((sum, row) => sum + row.midi, 0) / tensionRows.length;
  const spans = [timed.common, timed.tension, timed.resolution].map((slot) => ({
    start: slot.eighth / 2,
    end: slot.endEighth / 2,
  }));
  const part = choosePart(ctx, pool, spans, Math.min(centre, 72), protectedParts, busy);
  if (!part || !part.spec.soundingHardRange) {
    return fail('No free inner instrument can take the tension line without touching a locked voice.');
  }
  const range = part.spec.soundingHardRange;
  const band = BANDS[PART_BAND[part.partId] ?? 'middle'];
  const low = Math.max(range[0], Math.min(band[0], centre));
  const high = Math.min(range[1], Math.max(band[1], centre));
  const box: [number, number] = [Math.min(low, high), Math.max(low, high)];
  const clamped: [number, number] = box[1] - box[0] >= 12 ? box : [range[0], range[1]];
  const plan = planRegisterOwnership({
    sections: ctx.phrases.map((phrase, index) => ({ index, startBar: phrase.startBar, endBar: phrase.endBar, label: phrase.id })),
    partRegisterBias: PART_BAND,
    mayLeadInMidRegister: { cl: true, hn: true, vn2: true, va: true },
  });
  const assigned = plan.entries.find((entry) => entry.partId === part.partId)?.registerBand ?? PART_BAND[part.partId] ?? 'middle';
  const around = (BANDS[assigned][0] + BANDS[assigned][1]) / 2;
  const commonMidi = midiFor(commonPc, around, clamped[0], clamped[1], null);
  const tensionMidi = commonMidi === null ? null : midiFor(tensionPc, around, range[0], range[1], commonMidi);
  const resolutionMidi = tensionMidi === null ? null : midiFor(resolutionPc, around, range[0], range[1], tensionMidi);
  if (commonMidi === null || tensionMidi === null || resolutionMidi === null) {
    return fail(`${part.name} cannot lead the quadratonic by step inside its range. The leap was refused.`);
  }
  for (const midi of [commonMidi, tensionMidi, resolutionMidi]) {
    if (midi < range[0] || midi > range[1]) return fail(`${part.name} would leave its hard range.`);
  }
  const written = [
    { slot: timed.common, midi: commonMidi, pc: commonPc, job: 'common tone' },
    { slot: timed.tension, midi: tensionMidi, pc: tensionPc, job: 'tension' },
    { slot: timed.resolution, midi: resolutionMidi, pc: resolutionPc, job: 'resolution' },
  ];
  const notes: ScheduledHarmonicNote[] = written.map((item, index) => {
    hold(busy, part.partId, item.slot.eighth / 2, item.slot.endEighth / 2);
    return {
      control: 'bhl' as const,
      partId: part.partId,
      onset: at(item.slot.eighth),
      duration: at(item.slot.endEighth - item.slot.eighth),
      pitch: spellPc(item.pc, item.midi),
      syntheticId: `bhl-${control.startBar}-${index}`,
      reason: `${part.name} bar ${item.slot.bar}: World B ${chosen.chordType} on the sounding root. ${item.job} ${pitchName(spellPc(item.pc, item.midi))}. ${control.departure} departure, tension ${control.tensionPlacement}, resolution ${control.resolutionTiming}. Common tone stays in the bar. Melody, bass, and the arrival pitch classes were not moved. planLiquidHarmony resolution offset ${liquidTension.tensionResolvesOnBeat}.`,
    };
  });
  return { ok: true, notes };
}

function motifCell(ctx: HarmonicContext, start: number, end: number): HarmonicSourceRow[] {
  const melody = ctx.rows
    .filter((row) => row.role === 'melody' && row.bar >= start && row.bar <= end)
    .sort((a, b) => a.onset - b.onset || b.midi - a.midi);
  const unique: HarmonicSourceRow[] = [];
  for (const row of melody) {
    const previous = unique[unique.length - 1];
    if (previous && Math.abs(previous.onset - row.onset) < 1e-6) continue;
    unique.push(row);
    if (unique.length === 4) break;
  }
  return unique;
}

function memberMidi(
  pcs: readonly number[],
  spellings: ReadonlyArray<SpelledRegister>,
  around: number,
  low: number,
  high: number,
  previous: number | null,
  direction: -1 | 0 | 1,
): { midi: number; spelling: SpelledRegister } | null {
  let best: { midi: number; spelling: SpelledRegister } | null = null;
  let bestDist = 99;
  spellings.forEach((spelling, index) => {
    const pc = pcs[index]!;
    for (let midi = low; midi <= high; midi += 1) {
      if (pcOf(midi) !== pc) continue;
      if (previous !== null) {
        const gap = midi - previous;
        if (Math.abs(gap) > 7) continue;
        if (direction > 0 && gap <= 0) continue;
        if (direction < 0 && gap >= 0) continue;
        if (direction === 0 && gap !== 0) continue;
      }
      const dist = Math.abs(midi - (previous ?? around));
      if (dist < bestDist) {
        bestDist = dist;
        const octave = Math.floor(midi / 12) - 1;
        best = { midi, spelling: { step: spelling.step, alter: spelling.alter, octave, midi } };
      }
    }
  });
  return best;
}

function buildTriadDialogue(
  ctx: HarmonicContext,
  control: TriadPairDialogueControl,
  busy: Map<string, Array<{ start: number; end: number }>>,
): { ok: true; notes: ScheduledHarmonicNote[] } | { ok: false; error: string } {
  if (!Number.isInteger(control.startBar) || !Number.isInteger(control.endBar) || control.startBar < 1 || control.endBar > 24 || control.endBar < control.startBar) {
    return fail('Triad-pair span must be whole bars inside 1–24.');
  }
  if (control.relation !== 'alternation' && control.relation !== 'interlocking') {
    return fail('Triad-pair dialogue is alternation or interlocking.');
  }
  if (!Number.isInteger(control.maxAttacks) || control.maxAttacks < 2) {
    return fail('Activity limit must leave room for both parents. One attack cannot be a dialogue.');
  }
  if (!(control.registerMax > control.registerMin)) return fail('Register limits are empty.');
  const cell = motifCell(ctx, control.startBar, control.endBar);
  if (cell.length < 2) return fail('The span has no motif of at least two melody notes to answer. Nothing was added.');
  let parentA;
  let parentB;
  try {
    parentA = triadParent(control.parentA.id, control.parentA.quality, control.parentA.notes, control.parentA.voices, [control.registerMin, control.registerMax]);
    parentB = triadParent(control.parentB.id, control.parentB.quality, control.parentB.notes, control.parentB.voices, [control.registerMin, control.registerMax]);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  let intent;
  try {
    intent = triadPair('piano-chamber-dialogue', parentA, parentB, control.relation === 'alternation' ? 'alternate' : 'interlock');
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  if (intent.kind !== 'triad-pair') return fail('The dialogue did not stay a triad pair.');
  const facts = describeTriadPair(parentA, parentB);
  const origin = cell[0]!.onset;
  const motif: Motif = {
    id: 'triad-pair-cell',
    events: cell.map((row) => ({ onset: row.onset - origin, duration: row.duration, midi: row.midi })),
  };
  const answer = applyOperator(motif, 'fragment-head', { count: Math.min(3, cell.length) });
  const answerEvents = answer.motif.events.filter((event) => event.midi !== null);
  if (answerEvents.length < 1) return fail('The motif fragment produced no answer. The exchange was refused.');
  let transformNote = `${parentB.id} stays.`;
  let alternateReply: typeof parentB | null = null;
  for (const operation of ['P', 'L', 'R'] as const) {
    const transformed = transformTriadParent(parentB, operation);
    if (!transformed.ok) {
      transformNote = `${operation} on ${parentB.id} refused (${transformed.reason}).`;
      continue;
    }
    const shared = transformed.parent.triad.pitchClasses.filter((pc) => parentB.triad.pitchClasses.includes(pc));
    const same = transformed.parent.triad.pitchClasses.every((pc) => parentB.triad.pitchClasses.includes(pc));
    if (!shared.length || same) {
      transformNote = `${operation} on ${parentB.id} lost the parent identity.`;
      continue;
    }
    alternateReply = transformed.parent;
    transformNote = `${operation} on ${parentB.id} is available and still shares ${shared.length} pitch class${shared.length === 1 ? '' : 'es'}.`;
    break;
  }
  const protectedParts = carriers(ctx, control.startBar, control.endBar);
  const groups = control.groups;
  if (!Array.isArray(groups) || groups.length !== 2 || groups.some((group) => !group.length)) {
    return fail('Name two instrumental groups.');
  }
  const flat = [...groups[0], ...groups[1]];
  if (new Set(flat).size !== flat.length) return fail('The two groups share an instrument.');
  for (const id of flat) {
    if (!ctx.parts.some((part) => part.partId === id)) return fail(`Unknown part ${id}.`);
    if (protectedParts.has(id)) return fail(`${id} carries protected melody or bass. The dialogue was refused.`);
  }
  const scaleNote = facts.sixNoteUnion
    ? 'The pair union has six pitch classes. Those six were not treated as a scale.'
    : 'The line uses the two parent triads only.';
  const half = Math.ceil((control.endBar - control.startBar + 1) / 2);
  const windowA: [number, number] = [control.startBar, control.startBar + half - 1];
  const windowB: [number, number] = [windowA[1] + 1, control.endBar];
  const notes: ScheduledHarmonicNote[] = [];
  let attacks = 0;

  function placeMapped(
    parent: typeof parentA,
    events: Array<{ onset: number; duration: number; midi: number }>,
    group: readonly string[],
    window: [number, number] | null,
    label: string,
  ): void {
    let previous: number | null = null;
    let previousPc: number | null = null;
    events.forEach((event, index) => {
      if (attacks >= control.maxAttacks) return;
      const startQ = window
        ? (window[0] - 1) * ctx.barQuarters + event.onset
        : (control.startBar - 1) * ctx.barQuarters + event.onset;
      const duration = Math.max(0.5, Math.min(event.duration, 2));
      const endQ = startQ + duration;
      const bar = Math.floor(startQ / ctx.barQuarters) + 1;
      if (window && (bar < window[0] || bar > window[1] || endQ > window[1] * ctx.barQuarters + 1e-6)) return;
      if (bar < control.startBar || bar > control.endBar) return;
      const direction: -1 | 0 | 1 = previous === null || event.midi === null
        ? 0
        : event.midi > (events[index - 1]?.midi ?? event.midi)
          ? 1
          : event.midi < (events[index - 1]?.midi ?? event.midi)
            ? -1
            : 0;
      const pcs = [...parent.triad.pitchClasses];
      const spellings = parent.voices.map((voice) => voice.pitch);
      let chosen = memberMidi(pcs, spellings, event.midi, control.registerMin, control.registerMax, previous, previous === null ? 0 : direction);
      if (!chosen && previous !== null && direction === 0) {
        chosen = memberMidi(pcs, spellings, previous, control.registerMin, control.registerMax, previous, 0);
      }
      if (!chosen) return;
      if (previousPc !== null && chosen.midi === previous && direction !== 0) return;
      const part = choosePart(ctx, group, [{ start: startQ, end: endQ }], chosen.midi, protectedParts, busy);
      if (!part?.spec.soundingHardRange) return;
      const range = part.spec.soundingHardRange;
      if (chosen.midi < range[0] || chosen.midi > range[1]) return;
      hold(busy, part.partId, startQ, endQ);
      attacks += 1;
      previous = chosen.midi;
      previousPc = pcOf(chosen.midi);
      notes.push({
        control: 'triad-pair',
        partId: part.partId,
        onset: at(eighths(startQ)),
        duration: at(eighths(duration)),
        pitch: chosen.spelling,
        syntheticId: `pair-${label}-${index}`,
        reason: `${part.name} states ${parent.id} (${label}). Motif duration ${duration} from the source cell. ${transformNote} ${scaleNote} Rests fill attacks that had no stepwise parent tone.`,
      });
    });
  }

  const answerLine = answerEvents.map((event) => ({ onset: event.onset, duration: event.duration, midi: event.midi as number }));
  const plrNote = transformNote;
  function placeReply(
    events: Array<{ onset: number; duration: number; midi: number }>,
    group: readonly string[],
    window: [number, number] | null,
  ): void {
    const before = notes.length;
    transformNote = `${parentB.id} sounded as named. ${plrNote} The named parent was kept.`;
    placeMapped(parentB, events, group, window, 'parent-b');
    if (notes.length > before || !alternateReply) return;
    transformNote = `Named ${parentB.id} had no stepwise reply. ${plrNote} The transformed parent was used.`;
    placeMapped(alternateReply, events, group, window, 'parent-b');
  }
  if (control.relation === 'alternation') {
    if (windowB[0] > windowB[1]) return fail('Alternation needs two bars so the parents can answer in turn.');
    transformNote = `${parentA.id} keeps its own tones.`;
    placeMapped(parentA, motif.events.filter((event) => event.midi !== null).map((event) => ({ onset: event.onset, duration: event.duration, midi: event.midi as number })), groups[0], windowA, 'parent-a');
    const lastA = notes[notes.length - 1];
    if (lastA && qToNumber(lastA.onset) + qToNumber(lastA.duration) > (windowB[0] - 1) * ctx.barQuarters - 0.5) {
      notes.pop();
      attacks -= 1;
    }
    placeReply(answerLine, groups[1], windowB);
  } else {
    const mixed = motif.events.filter((event) => event.midi !== null).map((event, index) => ({ event, index }));
    transformNote = `${parentA.id} keeps its own tones.`;
    placeMapped(
      parentA,
      mixed.filter((item) => item.index % 2 === 0).map((item) => ({ onset: item.event.onset, duration: item.event.duration, midi: item.event.midi as number })),
      groups[0],
      null,
      'parent-a',
    );
    placeReply(
      mixed.filter((item) => item.index % 2 === 1).map((item) => ({ onset: item.event.onset, duration: item.event.duration, midi: item.event.midi as number })),
      groups[1],
      null,
    );
  }
  const heardA = notes.some((note) => parentA.triad.pitchClasses.includes(pcOf(note.pitch.midi)) && note.syntheticId.includes('parent-a'));
  const heardB = notes.some((note) => note.syntheticId.includes('parent-b'));
  if (!heardA || !heardB) {
    return fail('One parent had no stepwise answer in range. The exchange was left as silence rather than a chord block.');
  }
  for (const note of notes) {
    note.reason = `${note.reason} Seed ${ctx.seed}.`;
  }
  return { ok: true, notes };
}

export function applyPianoChamberHarmonic(ctx: HarmonicContext): { ok: true; notes: ScheduledHarmonicNote[] } | { ok: false; error: string } {
  const busy = cloneBusy(ctx.busy);
  const notes: ScheduledHarmonicNote[] = [];
  if (ctx.control.bhl?.enabled) {
    const line = buildBhlLine(ctx, ctx.control.bhl, busy);
    if (!line.ok) return line;
    notes.push(...line.notes);
  }
  if (ctx.control.triadPair?.enabled) {
    const line = buildTriadDialogue(ctx, ctx.control.triadPair, busy);
    if (!line.ok) return line;
    notes.push(...line.notes);
  }
  if (!notes.length) return fail('Harmonic development was requested and wrote nothing. Refused.');
  return { ok: true, notes };
}
