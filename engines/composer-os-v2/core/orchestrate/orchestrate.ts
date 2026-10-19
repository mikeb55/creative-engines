/**
 * Composer OS V3.4 Stage C — chamber Orchestrate transformer.
 * Opt-in. It writes instrumental notes. It does not replace Duo, Quartet, or Big Band generation.
 */

import { createHash } from 'node:crypto';
import { buildBhlWorldField, isBhlWorldId, type BhlWorldId } from '../bhl/bhlWorlds';
import type { BhlBassBar } from '../bhl/bhlRhythm';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { scoreBizziVertical } from '../counterpoint/voiceLeadingScorer';
import { getDensityForBar, planDensityCurve } from '../density/densityCurvePlanner';
import type { DensityLevel } from '../density/densityCurveTypes';
import { runEnsembleExportPipeline } from '../export/ensembleExport';
import { getHexatonicScalar } from '../hexatonic/collections';
import { inspectCataloguePitch } from '../instruments/instrumentCatalogue';
import { CONCERT_TRANSPOSITION, type InstrumentSpec } from '../instruments/instrumentTypes';
import { soundingToWritten } from '../instruments/writtenPitch';
import { buildIndependenceReport } from '../musical-evaluation/independenceReport';
import { ingestCanonicalScore, type CanonicalEvaluationScore } from '../musical-evaluation/canonicalScore';
import { applyOperator, type OperatorParams } from '../motif-ops/operators';
import { OPERATOR_IDS, type Motif, type MotifNoteEvent, type OperatorId } from '../motif-ops/types';
import { getEnsembleFamilyProfile } from '../orchestration/ensembleFamilyProfiles';
import { planDensityOwnership } from '../orchestration/densityOwnershipPlanner';
import { planRegisterOwnership } from '../orchestration/registerOwnershipPlanner';
import { planTextureOwnership } from '../orchestration/textureOwnershipPlanner';
import type { RegisterBand } from '../orchestration/orchestrationTypes';
import { getPentatonicArchetype } from '../pentatonic/registry';
import { planBassRegisterMap, planGuitarRegisterMap } from '../register-map/registerMapPlanner';
import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import type { ChordEvent, NoteEvent, PartModel, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import {
  extractQuartetBarsFromStringParts,
  quartetBarsHaveParallelMotionViolation,
} from '../string-quartet/quartetVoiceLeadingGuard';
import { resolveTemplate, type ResolvedPart } from './ensembleTemplates';
import { performE2 } from './e2Perform';
import { proposePianoChamber, realisePianoChamber, type PianoChamberFidelity, type PianoChamberProposal } from './pianoChamber';
import type {
  DerivedLineEvent,
  EnsembleTemplateId,
  HarmonySource,
  LayerRole,
  OrchestrateDensity,
  OrchestrateFlag,
  OrchestrateReceipt,
  OrchestrateRequest,
  SectionColourPlan,
} from './types';

export interface OrchestrateSuccess {
  ok: true;
  musicXml: string;
  receipt: OrchestrateReceipt;
  score: ScoreModel;
  midiBase64?: string;
  fidelity?: PianoChamberFidelity;
}

export interface OrchestrateFailure {
  ok: false;
  error: string;
}

export interface OrchestrateProposal {
  ok: true;
  proposalOnly: true;
  proposal: PianoChamberProposal;
}

export type OrchestrateResult = OrchestrateSuccess | OrchestrateFailure | OrchestrateProposal;

interface SourceNote {
  partId: string;
  bar: number;
  onset: number;
  duration: number;
  midi: number;
}

interface Phrase {
  notes: SourceNote[];
  shift: number;
}

interface LogicalNote {
  onset: number;
  duration: number;
  sounding: number;
  tie: 'start' | 'stop' | 'continue' | null;
}

const BANDS: Record<RegisterBand, [number, number]> = {
  sub_bass: [24, 43],
  bass: [36, 55],
  low: [48, 67],
  middle: [60, 79],
  high: [72, 91],
  very_high: [84, 103],
};

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function quarters(value: { n: number; d: number }): number {
  return value.d === 0 ? 0 : value.n / value.d;
}

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

function q(value: number): number {
  return Math.round(value * 8) / 8;
}

function bandForCentre(centre: number): RegisterBand {
  if (centre < 40) return 'sub_bass';
  if (centre < 52) return 'bass';
  if (centre < 64) return 'low';
  if (centre < 76) return 'middle';
  if (centre < 88) return 'high';
  return 'very_high';
}

function clefFor(spec: InstrumentSpec): 'treble' | 'bass' {
  return spec.clefs[0] === 'bass' ? 'bass' : 'treble';
}

function sectionAt(plan: readonly SectionColourPlan[], bar: number): SectionColourPlan {
  return plan.find((section) => bar >= section.startBar && bar <= section.endBar) ?? plan[plan.length - 1]!;
}

function readSource(score: CanonicalEvaluationScore): { notes: SourceNote[]; bars: number; barLength: number; melodyPart: string; bassPart: string | null } {
  const notes: SourceNote[] = [];
  const barLengths = new Map<number, number>();
  for (const measure of score.measures) {
    if (!barLengths.has(measure.bar)) barLengths.set(measure.bar, quarters(measure.expected));
  }
  const barLength = barLengths.values().next().value ?? 4;
  for (const event of score.soundingEvents) {
    if (event.rest || event.soundingMidi === null) continue;
    const length = barLengths.get(event.bar) ?? barLength;
    const onsetInBar = quarters(event.onsetInBar);
    notes.push({
      partId: event.partId,
      bar: event.bar,
      onset: q((event.bar - 1) * length + onsetInBar),
      duration: q(quarters(event.duration)),
      midi: event.soundingMidi,
    });
  }
  const bars = Math.max(1, ...score.measures.map((measure) => measure.bar), 1);
  const byPart = new Map<string, SourceNote[]>();
  for (const note of notes) {
    const list = byPart.get(note.partId) ?? [];
    list.push(note);
    byPart.set(note.partId, list);
  }
  const ranked = [...byPart.entries()].map(([partId, list]) => {
    const mean = list.reduce((sum, note) => sum + note.midi, 0) / list.length;
    const held = list.reduce((sum, note) => sum + note.duration, 0);
    return { partId, mean, held };
  }).sort((a, b) => b.mean - a.mean || b.held - a.held || a.partId.localeCompare(b.partId));
  const melodyPart = ranked[0]?.partId ?? '';
  const bassPart = ranked.length > 1 ? ranked[ranked.length - 1]!.partId : null;
  return { notes, bars, barLength, melodyPart, bassPart: bassPart === melodyPart ? null : bassPart };
}

function monophonic(notes: readonly SourceNote[], highest: boolean): SourceNote[] {
  const sorted = [...notes].sort((a, b) => a.onset - b.onset || (highest ? b.midi - a.midi : a.midi - b.midi));
  const kept: SourceNote[] = [];
  for (const note of sorted) {
    const overlaps = kept.some((item) => note.onset < item.onset + item.duration - 0.001 && item.onset < note.onset + note.duration - 0.001);
    if (!overlaps) kept.push(note);
  }
  return kept.sort((a, b) => a.onset - b.onset);
}

function phrasesOf(notes: readonly SourceNote[]): SourceNote[][] {
  const sorted = [...notes].sort((a, b) => a.onset - b.onset);
  const phrases: SourceNote[][] = [];
  for (const note of sorted) {
    const current = phrases[phrases.length - 1];
    const previous = current?.[current.length - 1];
    if (!current || !previous || note.onset >= previous.onset + previous.duration + 4) phrases.push([note]);
    else current.push(note);
  }
  return phrases;
}

function fits(midis: readonly number[], range: [number, number]): boolean {
  return midis.every((midi) => midi >= range[0] && midi <= range[1]);
}

function nearestShift(midis: readonly number[], range: [number, number]): number | null {
  const shifts = [0, -12, 12, -24, 24, -36, 36, -48, 48];
  const fitting = shifts.filter((shift) => fits(midis.map((midi) => midi + shift), range));
  if (!fitting.length) return null;
  fitting.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
  return fitting[0]!;
}

function chooseCarrier(
  phrase: readonly SourceNote[],
  carriers: readonly ResolvedPart[],
): { part: ResolvedPart; shift: number; hardFlags: boolean } | null {
  if (!carriers.length) return null;
  const midis = phrase.map((note) => note.midi);
  for (const part of carriers) {
    const comfort = part.spec.soundingComfortRange;
    const hard = part.spec.soundingHardRange;
    if (!comfort || !hard) continue;
    const shift = nearestShift(midis, comfort);
    if (shift !== null) return { part, shift, hardFlags: false };
  }
  let best: { part: ResolvedPart; shift: number; outside: number } | null = null;
  for (const part of carriers) {
    const hard = part.spec.soundingHardRange;
    if (!hard) continue;
    const shift = nearestShift(midis, hard) ?? 0;
    const outside = midis.filter((midi) => midi + shift < hard[0] || midi + shift > hard[1]).length;
    if (!best || outside < best.outside) best = { part, shift, outside };
  }
  return best ? { part: best.part, shift: best.shift, hardFlags: true } : null;
}

function parseChain(chain: readonly string[]): Array<{ op: OperatorId; params: OperatorParams }> {
  const steps: Array<{ op: OperatorId; params: OperatorParams }> = [];
  for (const token of chain) {
    const cleaned = token.trim().toLowerCase().replace('×', ':').replace(/\s+/g, '');
    const [name, raw] = cleaned.split(':');
    if (!OPERATOR_IDS.includes(name as OperatorId)) return [];
    const op = name as OperatorId;
    if (op === 'augment' || op === 'diminish') steps.push({ op, params: { factor: raw ? Number(raw) : 2 } });
    else steps.push({ op, params: {} });
  }
  return steps;
}

function deriveMotif(phrase: readonly SourceNote[], chain: readonly string[]): { lineageId: string; ops: string[]; events: MotifNoteEvent[] } | null {
  const steps = parseChain(chain);
  if (!steps.length) return null;
  let motif: Motif = {
    id: 'm1',
    events: phrase.map((note, index) => ({
      onset: index === 0 ? 0 : q(note.onset - phrase[0]!.onset),
      duration: note.duration,
      midi: note.midi,
    })),
  };
  const ops: string[] = [];
  for (const step of steps) {
    const result = applyOperator(motif, step.op, step.params);
    motif = result.motif;
    ops.push(step.op);
  }
  let lineageId = motif.id;
  const last = steps[steps.length - 1]!;
  if ((last.op === 'augment' || last.op === 'diminish') && !lineageId.endsWith(String(last.params.factor))) {
    lineageId = `${lineageId}${last.params.factor}`;
  }
  return { lineageId, ops, events: motif.events.map((event) => ({ ...event, onset: q(event.onset), duration: q(event.duration) })) };
}

function coOnset(melody: readonly DerivedLineEvent[], line: readonly DerivedLineEvent[]): number {
  const a = new Set(melody.map((note) => note.onset));
  const b = new Set(line.map((note) => note.onset));
  let shared = 0;
  for (const onset of a) if (b.has(onset)) shared += 1;
  const union = new Set([...a, ...b]).size || 1;
  return shared / union;
}

function longestParallelPerfect(melody: readonly DerivedLineEvent[], line: readonly DerivedLineEvent[]): number {
  const onsets = [...new Set([...melody.map((note) => note.onset), ...line.map((note) => note.onset)])].sort((a, b) => a - b);
  const verticals: Array<{ onset: number; melody: number; line: number }> = [];
  for (const onset of onsets) {
    const mel = melody.find((note) => onset >= note.onset && onset < note.onset + note.duration);
    const other = line.find((note) => onset >= note.onset && onset < note.onset + note.duration);
    if (mel && other) verticals.push({ onset, melody: mel.sounding, line: other.sounding });
  }
  let run = 1;
  let longest = verticals.length ? 1 : 0;
  for (let index = 1; index < verticals.length; index += 1) {
    const previous = verticals[index - 1]!;
    const current = verticals[index]!;
    const iv0 = mod12(previous.melody - previous.line);
    const iv1 = mod12(current.melody - current.line);
    const perfect = (iv0 === 0 || iv0 === 7) && iv0 === iv1;
    const upper = current.melody - previous.melody;
    const lower = current.line - previous.line;
    const parallel = upper !== 0 && lower !== 0 && Math.sign(upper) === Math.sign(lower);
    if (perfect && parallel) {
      run += 1;
      longest = Math.max(longest, run);
    } else run = 1;
  }
  return longest;
}

function accompanimentPlays(partIndex: number, bar: number, section: SectionColourPlan): boolean {
  const device = section.segmentalDevice ?? 'none';
  if (device === 'none') return true;
  const length = section.endBar - section.startBar + 1;
  const local = bar - section.startBar;
  const half = Math.max(1, Math.floor(length / 2));
  if (device === 'sectional_boundary') return bar !== section.startBar;
  if (device === 'timbral_shift' || device === 'timbral_echo') {
    return local < half ? partIndex % 2 === 0 : partIndex % 2 === 1;
  }
  if (device === 'antiphonal') return bar % 2 === partIndex % 2;
  return true;
}

function attacksFor(requested: OrchestrateDensity, planner: DensityLevel): number[] {
  if (planner === 'sparse' || requested === 'sparse') return [1];
  if (requested === 'medium') return [1, 3];
  if (requested === 'dense') return [0.5, 1.5, 2.5, 3.5];
  return [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75];
}

/**
 * Harmony pitch-class slot. Density, register, and texture planners do not read the seed.
 * A linear `seed % length` collides when the field length divides the seed difference
 * (3340 and 44 collide on every field whose length divides 3296, including BHL world C).
 * This mix stays inside the field. The same seed still picks the same slot.
 */
function fieldSlot(seed: number, bar: number, partIndex: number, attackIndex: number, tone: number, length: number): number {
  let x = (Math.trunc(seed) ^ Math.imul(bar + 1, 0x9e3779b1) ^ Math.imul(partIndex + 1, 0x85ebca6b) ^ Math.imul(attackIndex + 1, 0xc2b2ae35) ^ Math.imul(tone + 1, 0x27d4eb2f)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x % length;
}

function selectFieldPitchClasses(
  pitchClasses: readonly number[],
  count: number,
  seed: number,
  bar: number,
  partIndex: number,
  attackIndex: number,
): number[] {
  const chosen: number[] = [];
  for (let tone = 0; tone < pitchClasses.length && chosen.length < count; tone += 1) {
    const pc = pitchClasses[fieldSlot(seed, bar, partIndex, attackIndex, tone, pitchClasses.length)]!;
    if (!chosen.includes(pc)) chosen.push(pc);
  }
  return chosen;
}

function placePitch(pc: number, target: number, range: [number, number]): number | null {
  let best: number | null = null;
  for (let midi = range[0]; midi <= range[1]; midi += 1) {
    if (mod12(midi) !== mod12(pc)) continue;
    if (best === null || Math.abs(midi - target) < Math.abs(best - target)) best = midi;
  }
  return best;
}

function fieldFor(
  source: HarmonySource,
  param: string,
  rootPc: number,
  sourcePcs: readonly number[],
): { pitchClasses: number[]; detail: string; invoked: boolean } {
  if (source === 'source') {
    const pitchClasses = [...new Set(sourcePcs.map(mod12))].sort((a, b) => a - b);
    return { pitchClasses, detail: 'Pitch classes taken from the source sounding notes.', invoked: true };
  }
  if (source === 'bhl_world') {
    const world: BhlWorldId = isBhlWorldId(param) ? param : 'A';
    const bar: BhlBassBar = {
      bar: 1,
      quarters: 4,
      attacks: [0],
      rests: [],
      notes: [{ onset: 0, quarters: 4, midi: rootPc, pitchClass: rootPc }],
      pitchClasses: [rootPc],
      rootPc,
    };
    const field = buildBhlWorldField(world, bar, 'primary');
    return {
      pitchClasses: field.pitchClasses.map(mod12),
      detail: `BHL world ${field.world} ${field.name} via buildBhlWorldField.`,
      invoked: true,
    };
  }
  if (source === 'pentatonic') {
    const archetype = getPentatonicArchetype(param || 'major_pentatonic');
    if (!archetype) return { pitchClasses: [], detail: `Pentatonic archetype ${param} was not found.`, invoked: false };
    return {
      pitchClasses: archetype.intervals.map((interval) => mod12(rootPc + interval)),
      detail: `Pentatonic archetype ${archetype.id} intervals ${archetype.intervals.join(' ')}.`,
      invoked: true,
    };
  }
  if (source === 'hexatonic') {
    const scalar = getHexatonicScalar(param || 'hex_major_omit_seventh');
    if (!scalar) return { pitchClasses: [], detail: `Hexatonic scalar ${param} was not found.`, invoked: false };
    return {
      pitchClasses: scalar.pitchClasses.map((pitchClass) => mod12(pitchClass)),
      detail: `Hexatonic scalar ${scalar.id}.`,
      invoked: true,
    };
  }
  const bundle = getVoiceRuleBundle(param || 'sq_vrb_bartok');
  const requested = param || 'sq_vrb_bartok';
  if (bundle.voiceId !== requested) {
    return { pitchClasses: [], detail: `SQ harmonic voice ${requested} was not found. Neutral bundle was not used.`, invoked: false };
  }
  const intervals = bundle.melodicPolicy.preferredIntervalSets ?? [];
  if (!intervals.length) {
    return { pitchClasses: [], detail: `${bundle.voiceId} has no preferredIntervalSets.`, invoked: true };
  }
  return {
    pitchClasses: [rootPc, ...intervals.map((interval) => mod12(rootPc + interval))],
    detail: `SQ voice ${bundle.voiceId} preferredIntervalSets ${intervals.join(' ')}.`,
    invoked: true,
  };
}

function sliceNote(onset: number, duration: number, sounding: number, barLength: number): LogicalNote[] {
  const slices: LogicalNote[] = [];
  let left = duration;
  let cursor = onset;
  while (left > 0.001) {
    const barStart = Math.floor(cursor / barLength) * barLength;
    const room = q(barStart + barLength - cursor);
    const take = q(Math.min(left, room));
    slices.push({ onset: q(cursor), duration: take, sounding, tie: null });
    cursor = q(cursor + take);
    left = q(left - take);
  }
  if (slices.length > 1) {
    slices.forEach((slice, index) => {
      slice.tie = index === 0 ? 'start' : index === slices.length - 1 ? 'stop' : 'continue';
    });
  }
  return slices;
}

function eventsForBar(notes: readonly LogicalNote[], bar: number, barLength: number): ScoreEvent[] {
  const start = (bar - 1) * barLength;
  const inBar = notes
    .filter((note) => note.onset >= start - 0.001 && note.onset < start + barLength - 0.001)
    .map((note) => ({ ...note, onset: q(note.onset - start) }))
    .sort((a, b) => a.onset - b.onset);
  const events: ScoreEvent[] = [];
  let cursor = 0;
  let index = 0;
  while (index < inBar.length) {
    const note = inBar[index]!;
    let next = index + 1;
    const stack = [note];
    while (
      next < inBar.length
      && Math.abs(inBar[next]!.onset - note.onset) <= 0.001
      && Math.abs(inBar[next]!.duration - note.duration) <= 0.001
    ) {
      stack.push(inBar[next]!);
      next += 1;
    }
    if (note.onset > cursor + 0.001) {
      events.push({ kind: 'rest', startBeat: q(cursor), duration: q(note.onset - cursor), voice: 1 });
    }
    if (stack.length === 1) {
      const written = soundingToWritten(note.sounding, CONCERT_TRANSPOSITION);
      const event: NoteEvent = {
        kind: 'note',
        pitch: note.sounding,
        startBeat: q(note.onset),
        duration: note.duration,
        voice: 1,
        spelling: { step: written.step, alter: written.alter },
      };
      if (note.tie) event.notation = { tie: note.tie };
      events.push(event);
    } else {
      const chord: ChordEvent = {
        kind: 'chord',
        pitches: [...new Set(stack.map((item) => item.sounding))].sort((a, b) => a - b),
        startBeat: q(note.onset),
        duration: note.duration,
        voice: 1,
      };
      events.push(chord);
    }
    cursor = q(note.onset + note.duration);
    index = next;
  }
  if (cursor < barLength - 0.001) {
    events.push({ kind: 'rest', startBeat: q(cursor), duration: q(barLength - cursor), voice: 1 } satisfies RestEvent);
  }
  return events;
}

function writtenEvents(notes: readonly LogicalNote[], bar: number, barLength: number, spec: InstrumentSpec): ScoreEvent[] {
  const events = eventsForBar(notes, bar, barLength);
  return events.map((event) => {
    if (event.kind === 'chord') {
      return {
        ...event,
        pitches: event.pitches.map((pitch) => soundingToWritten(pitch, spec.transposition).midi),
      };
    }
    if (event.kind !== 'note') return event;
    const written = soundingToWritten(event.pitch, spec.transposition);
    return {
      ...event,
      pitch: written.midi,
      spelling: { step: written.step, alter: written.alter },
    };
  });
}

function partModel(part: ResolvedPart, measures: PartModel['measures']): PartModel {
  return {
    id: part.partId,
    name: part.name,
    instrumentIdentity: part.spec.id === 'viola' ? 'viola' : part.spec.id,
    midiProgram: part.spec.midiProgram,
    clef: clefFor(part.spec),
    measures,
    scoreInstrumentName: part.name,
    catalogueInstrumentSound: part.spec.instrumentSound,
  };
}

export function orchestrate(request: OrchestrateRequest): OrchestrateResult {
  if (request.pianoChamber) {
    if (request.enabled !== true) return { ok: false, error: 'Orchestrate is off.' };
    if (request.pianoChamber.action === 'propose') {
      const proposed = proposePianoChamber(
        request.pianoChamber.sourceMusicXml,
        request.pianoChamber.correction?.partIds,
        request.pianoChamber.correction,
      );
      if (!proposed.ok) return proposed;
      return { ok: true, proposalOnly: true, proposal: proposed.proposal };
    }
    const realised = realisePianoChamber(request);
    if (!realised.ok) return realised;
    return {
      ok: true,
      musicXml: realised.musicXml,
      receipt: realised.receipt,
      score: realised.score,
      midiBase64: realised.midiBase64,
      fidelity: realised.fidelity,
    };
  }
  if (request.e2) {
    const performed = performE2(request.e2);
    if (!performed.ok) return { ok: false, error: performed.reason };
    const receipt: OrchestrateReceipt = {
      version: 'orchestrate-1',
      inputSha256: request.e2.source?.sha256 ?? '',
      params: request,
      layerAssignments: [],
      derivedLines: [],
      omittedLines: [],
      flagged: [],
      omissions: [],
      doublingRuns: [],
      provenance: [],
      planners: {
        family: request.e2.ensemble,
        density: [],
        register: [],
        guitarZone: null,
        bassZone: null,
        ownershipEntries: performed.placements.length,
      },
      parallelMotionReported: performed.parallelMotion,
      independence: [],
      voiceLeadingScores: [],
      musicalQualityScore: null,
      musicallyApproved: false,
    };
    return { ok: true, musicXml: performed.musicXml, receipt, score: performed.score };
  }
  if (request.enabled !== true) return { ok: false, error: 'Orchestrate is off.' };
  if (request.preserveMelody !== true) return { ok: false, error: 'Melody preservation is required.' };
  if (!request.plan.length) return { ok: false, error: 'Orchestrate needs a section colour plan.' };
  const ingested = ingestCanonicalScore(request.sourceMusicXml);
  if (!ingested.score) return { ok: false, error: ingested.parseError ?? 'Source MusicXML did not parse.' };
  const source = readSource(ingested.score);
  if (!source.melodyPart) return { ok: false, error: 'Source score has no sounding melody.' };
  const mixed = ingested.score.measures.some((measure) => Math.abs(quarters(measure.expected) - source.barLength) > 0.01);
  if (mixed) return { ok: false, error: 'Stage C orchestrates one metre. Mixed metres were left unchanged.' };

  const template: EnsembleTemplateId = request.template;
  const resolved = resolveTemplate(template);
  if (!resolved.parts.length) return { ok: false, error: 'The template has no catalogue instruments with a numeric range.' };
  const familyId = template === 'string_quartet' ? 'string_quartet' : template;
  const family = getEnsembleFamilyProfile(familyId);

  const melodyNotes = monophonic(source.notes.filter((note) => note.partId === source.melodyPart), true);
  const bassNotes = source.bassPart ? monophonic(source.notes.filter((note) => note.partId === source.bassPart), false) : [];
  const phrases = phrasesOf(melodyNotes);
  const placedMelody = new Map<string, LogicalNote[]>();
  const shiftsByBar = new Map<number, { partId: string; shift: number }>();
  const flagged: OrchestrateFlag[] = [];

  for (const phrase of phrases) {
    const firstBar = phrase[0]!.bar;
    const section = sectionAt(request.plan, firstBar);
    const wanted = section.melodyCarriers.length
      ? section.melodyCarriers.map((id) => resolved.parts.find((part) => part.partId === id)).filter((part): part is ResolvedPart => !!part)
      : resolved.parts.filter((part) => part.hint === 'melody');
    const choice = chooseCarrier(phrase, wanted.length ? wanted : resolved.parts);
    if (!choice) continue;
    const shifted = phrase.map((note) => ({ ...note, midi: note.midi + choice.shift }));
    const slices = shifted.flatMap((note) => sliceNote(note.onset, note.duration, note.midi, source.barLength));
    const list = placedMelody.get(choice.part.partId) ?? [];
    list.push(...slices);
    placedMelody.set(choice.part.partId, list);
    for (const note of phrase) {
      shiftsByBar.set(note.bar, { partId: choice.part.partId, shift: choice.shift });
      const hard = choice.part.spec.soundingHardRange;
      const comfort = choice.part.spec.soundingComfortRange;
      const sounding = note.midi + choice.shift;
      if (hard && (sounding < hard[0] || sounding > hard[1])) {
        flagged.push({
          bar: note.bar,
          beat: q(note.onset - (note.bar - 1) * source.barLength) + 1,
          partId: choice.part.partId,
          kind: 'outside_hard_range',
          detail: `Melody sounding MIDI ${sounding} stays outside ${choice.part.spec.displayName} ${hard[0]}–${hard[1]} after a whole-phrase octave shift of ${choice.shift}. The note was not moved again.`,
        });
      } else if (comfort && (sounding < comfort[0] || sounding > comfort[1])) {
        flagged.push({
          bar: note.bar,
          beat: q(note.onset - (note.bar - 1) * source.barLength) + 1,
          partId: choice.part.partId,
          kind: 'outside_comfort',
          detail: `Melody sounding MIDI ${sounding} is outside the inferred comfort range ${comfort[0]}–${comfort[1]}.`,
        });
      }
    }
  }

  const melodyPartId = shiftsByBar.values().next().value?.partId ?? resolved.parts[0]!.partId;
  const bassPart = [...resolved.parts].reverse().find((part) => part.partId !== melodyPartId && part.hint === 'bass')
    ?? [...resolved.parts].reverse().find((part) => part.partId !== melodyPartId)
    ?? null;

  const counterPart = request.plan.some((section) => section.counterlineFrom)
    ? resolved.parts.find((part) => part.partId !== melodyPartId && (request.plan.some((section) => section.roles?.[part.partId] === 'countermelody') || part.hint === 'counterline')) ?? null
    : null;
  const doublingPart = request.plan.some((section) => section.doubling !== 'none')
    ? resolved.parts.find((part) => part.partId !== melodyPartId && part.partId !== counterPart?.partId && part.partId !== bassPart?.partId && (part.hint === 'doubling' || request.plan.some((section) => section.roles?.[part.partId] === 'harmony_inner')))
      ?? resolved.parts.find((part) => part.partId !== melodyPartId && part.partId !== counterPart?.partId && part.partId !== bassPart?.partId)
      ?? null
    : null;

  const lastOnset = Math.max(
    source.bars * source.barLength,
    ...[...placedMelody.values()].flatMap((notes) => notes.map((note) => note.onset + note.duration)),
    0,
  );
  let totalBars = Math.max(source.bars, Math.ceil(lastOnset / source.barLength));

  const derivedLines: OrchestrateReceipt['derivedLines'] = [];
  const omittedLines: OrchestrateReceipt['omittedLines'] = [];
  const counterNotes = new Map<string, LogicalNote[]>();
  const sectionWithChain = request.plan.find((section) => section.counterlineFrom && counterPart);
  if (sectionWithChain?.counterlineFrom && counterPart && phrases[0]) {
    const derived = deriveMotif(phrases[0], sectionWithChain.counterlineFrom.chain);
    const limits = sectionWithChain.independence ?? { maxCoOnsetRate: 0.5, maxParallelPerfectRun: 2 };
    if (!derived) {
      omittedLines.push({ partId: counterPart.partId, lineageId: '', reason: 'The counterline chain named an operator that is not in motif-ops.' });
    } else {
      const origin = phrases[0][0]!.onset;
      const melodyEvents: DerivedLineEvent[] = phrases[0].map((note) => ({
        sounding: note.midi + (shiftsByBar.get(note.bar)?.shift ?? 0),
        duration: note.duration,
        onset: note.onset,
      }));
      let accepted: DerivedLineEvent[] | null = null;
      const baseOffset = sectionWithChain.counterlineFrom.offsetBeats ?? 1;
      for (let extra = 0; extra <= 3; extra += 1) {
        const offset = baseOffset + extra;
        const events = derived.events
          .filter((event) => event.midi !== null)
          .map((event) => ({ sounding: event.midi as number, duration: event.duration, onset: q(origin + offset + event.onset) }));
        const rate = coOnset(melodyEvents, events);
        const run = longestParallelPerfect(melodyEvents, events);
        if (rate <= limits.maxCoOnsetRate && run <= limits.maxParallelPerfectRun) {
          accepted = events;
          break;
        }
      }
      if (!accepted) {
        omittedLines.push({
          partId: counterPart.partId,
          lineageId: derived.lineageId,
          reason: `No offset within 3 beats kept co-onset at or below ${limits.maxCoOnsetRate} and parallel perfect runs at or below ${limits.maxParallelPerfectRun}. The line was omitted.`,
        });
      } else {
        const playable: DerivedLineEvent[] = [];
        for (const event of accepted) {
          const hard = counterPart.spec.soundingHardRange!;
          if (event.sounding < hard[0] || event.sounding > hard[1]) {
            flagged.push({
              bar: Math.floor(event.onset / source.barLength) + 1,
              beat: q(event.onset % source.barLength) + 1,
              partId: counterPart.partId,
              kind: 'outside_hard_range',
              detail: `Derived line MIDI ${event.sounding} is outside ${counterPart.spec.displayName} ${hard[0]}–${hard[1]} and was not rewritten.`,
            });
            playable.push(event);
          } else playable.push(event);
        }
        counterNotes.set(counterPart.partId, playable.flatMap((event) => sliceNote(event.onset, event.duration, event.sounding, source.barLength)));
        derivedLines.push({ partId: counterPart.partId, lineageId: derived.lineageId, ops: derived.ops, events: playable });
        const end = Math.max(...playable.map((event) => event.onset + event.duration));
        totalBars = Math.max(totalBars, Math.ceil(end / source.barLength));
      }
    }
  }

  const covered = request.plan.flatMap((section) => {
    const rows: Array<{ bar: number; section: SectionColourPlan }> = [];
    for (let bar = section.startBar; bar <= section.endBar; bar += 1) rows.push({ bar, section });
    return rows;
  });
  const maxPlanned = Math.max(...request.plan.map((section) => section.endBar), totalBars);
  totalBars = Math.max(totalBars, maxPlanned);
  const sectionsForPlanner: SectionWithRole[] = request.plan.map((section) => ({
    label: section.section,
    startBar: section.startBar,
    length: section.endBar - section.startBar + 1,
    role: section.segmentalDevice && section.segmentalDevice !== 'none' ? 'contrast' : 'statement',
    metadata: {
      role: section.segmentalDevice && section.segmentalDevice !== 'none' ? 'contrast' : 'statement',
      densityTendency: section.density === 'sparse' ? 'sparse' : 'medium',
      registerTendency: section.registerCentre >= 72 ? 'high' : section.registerCentre <= 52 ? 'low' : 'centre',
      rhythmActivity: section.density === 'sparse' ? 'low' : 'medium',
      textureTendency: 'mixed',
    },
  }));
  const densityPlan = planDensityCurve(sectionsForPlanner, totalBars);
  const guitarMap = planGuitarRegisterMap(sectionsForPlanner);
  const bassMap = planBassRegisterMap(sectionsForPlanner);
  const ownershipSections = request.plan.map((section, index) => ({
    index,
    label: section.section,
    startBar: section.startBar,
    endBar: section.endBar,
  }));
  const partRegisterBias: Record<string, RegisterBand> = {};
  const mayLead: Record<string, boolean> = {};
  for (const part of resolved.parts) {
    const centre = request.plan[0]?.registerCentre ?? 67;
    partRegisterBias[part.partId] = part.partId === bassPart?.partId ? 'bass' : bandForCentre(centre);
    mayLead[part.partId] = part.partId === melodyPartId;
  }
  const registerPlan = planRegisterOwnership({
    sections: ownershipSections,
    partRegisterBias,
    mayLeadInMidRegister: mayLead,
  });
  const texturePlan = planTextureOwnership({
    sections: ownershipSections,
    leadPartBySection: Object.fromEntries(ownershipSections.map((section) => [section.index, melodyPartId])),
  });
  const densityOwnership = planDensityOwnership({
    sections: ownershipSections,
    sectionDensityBias: Object.fromEntries(ownershipSections.map((section, index) => [
      section.index,
      request.plan[index]?.density === 'sparse' ? 'sparse' : 'moderate',
    ])),
    partWeights: Object.fromEntries(resolved.parts.map((part) => [part.partId, part.partId === melodyPartId ? 1 : 0.4])),
  });

  const doublingRuns: OrchestrateReceipt['doublingRuns'] = [];
  const doublingNotes = new Map<string, LogicalNote[]>();
  const doublingSection = request.plan.find((section) => section.doubling !== 'none');
  if (doublingPart && doublingSection && doublingSection.doubling !== 'none') {
    const cap = doublingSection.maxDoublingBars ?? 4;
    const melodySlices = placedMelody.get(melodyPartId) ?? [];
    const doubled: LogicalNote[] = [];
    let runStart: number | null = null;
    let runBars = 0;
    let runInterval: 'unison' | 'octave' | null = null;
    for (let bar = doublingSection.startBar; bar <= Math.min(doublingSection.endBar, totalBars); bar += 1) {
      const local = bar - doublingSection.startBar;
      if (local >= cap) break;
      const barNotes = melodySlices.filter((note) => Math.floor((note.onset + 0.001) / source.barLength) + 1 === bar);
      const interval: 'unison' | 'octave' = doublingSection.doubling === 'unison' ? 'unison' : 'octave';
      const shift = interval === 'octave' ? -12 : 0;
      const hard = doublingPart.spec.soundingHardRange!;
      const can = barNotes.every((note) => note.sounding + shift >= hard[0] && note.sounding + shift <= hard[1]);
      const usedShift = can ? shift : 0;
      const usedInterval: 'unison' | 'octave' = usedShift === 0 ? 'unison' : 'octave';
      if (!barNotes.length) continue;
      if (!barNotes.every((note) => note.sounding + usedShift >= hard[0] && note.sounding + usedShift <= hard[1])) {
        flagged.push({
          bar,
          beat: 1,
          partId: doublingPart.partId,
          kind: 'outside_hard_range',
          detail: 'Doubling does not fit the hard range. Those bars were left as rests.',
        });
        break;
      }
      for (const note of melodySlices.filter((item) => Math.floor(item.onset / source.barLength) + 1 === bar)) {
        doubled.push({ ...note, sounding: note.sounding + usedShift });
      }
      if (runInterval === usedInterval && runStart !== null && bar === runStart + runBars) runBars += 1;
      else {
        if (runStart !== null && runInterval) doublingRuns.push({ parts: [doublingPart.partId, melodyPartId], interval: runInterval, startBar: runStart, bars: runBars });
        runStart = bar;
        runBars = 1;
        runInterval = usedInterval;
      }
    }
    if (runStart !== null && runInterval) doublingRuns.push({ parts: [doublingPart.partId, melodyPartId], interval: runInterval, startBar: runStart, bars: runBars });
    doublingNotes.set(doublingPart.partId, doubled);
  }

  const bassPlaced: LogicalNote[] = [];
  if (bassPart && bassNotes.length && bassPart.partId !== melodyPartId) {
    const hard = bassPart.spec.soundingHardRange!;
    const comfort = bassPart.spec.soundingComfortRange ?? hard;
    const shift = nearestShift(bassNotes.map((note) => note.midi), comfort) ?? nearestShift(bassNotes.map((note) => note.midi), hard) ?? 0;
    for (const note of bassNotes) {
      const sounding = note.midi + shift;
      if (sounding < hard[0] || sounding > hard[1]) {
        flagged.push({
          bar: note.bar,
          beat: q(note.onset % source.barLength) + 1,
          partId: bassPart.partId,
          kind: 'outside_hard_range',
          detail: `Bass sounding MIDI ${sounding} is outside ${hard[0]}–${hard[1]} and was not rewritten.`,
        });
      }
      bassPlaced.push(...sliceNote(note.onset, note.duration, sounding, source.barLength));
    }
  }

  const provenance: OrchestrateReceipt['provenance'] = [];
  const harmonyNotes = new Map<string, LogicalNote[]>();
  const densityRows: OrchestrateReceipt['planners']['density'] = [];
  for (let bar = 1; bar <= totalBars; bar += 1) {
    const section = sectionAt(request.plan, bar);
    const plannerLevel = getDensityForBar(densityPlan, bar);
    densityRows.push({ bar, requested: section.density, planner: plannerLevel });
    const sourcePcs = source.notes.filter((note) => note.bar === bar).map((note) => note.midi);
    const root = bassNotes.find((note) => note.bar === bar)?.midi ?? melodyNotes.find((note) => note.bar === bar)?.midi ?? 60;
    const field = fieldFor(section.harmonySource, section.harmonyParam ?? '', mod12(root), sourcePcs.length ? sourcePcs : [mod12(root)]);
    if (!provenance.some((row) => row.source === section.harmonySource && row.param === (section.harmonyParam ?? '') && row.detail === field.detail)) {
      provenance.push({
        source: section.harmonySource,
        param: section.harmonyParam ?? '',
        invoked: field.invoked,
        influenced: false,
        pitchClasses: field.pitchClasses,
        detail: field.detail,
      });
    }
    const attacks = attacksFor(section.density, plannerLevel);
    const spacing = attacks.length === 1 ? 1 : q(attacks[1]! - attacks[0]!);
    resolved.parts.forEach((part, partIndex) => {
      if (part.partId === melodyPartId || part.partId === bassPart?.partId || part.partId === doublingPart?.partId || part.partId === counterPart?.partId) return;
      const role = section.roles?.[part.partId];
      if (role === 'melody' || role === 'bass' || role === 'countermelody') return;
      if (!accompanimentPlays(partIndex, bar, section)) return;
      const technique = section.techniques?.[part.partId];
      if (technique && !part.spec.techniques.includes(technique)) {
        flagged.push({
          bar,
          beat: 1,
          partId: part.partId,
          kind: 'technique_not_allowed',
          detail: `${part.spec.displayName} has no catalogue technique ${technique}. The technique was not written.`,
        });
      }
      if (!field.invoked || !field.pitchClasses.length) return;
      const assigned = registerPlan.entries.find((entry) => entry.partId === part.partId)?.registerBand ?? bandForCentre(section.registerCentre);
      const window = BANDS[assigned];
      const hard = part.spec.soundingHardRange!;
      const low = Math.max(hard[0], window[0]);
      const high = Math.min(hard[1], window[1]);
      const range: [number, number] = low <= high ? [low, high] : hard;
      const guitarMid = (guitarMap.sections[0]!.preferredZone[0] + guitarMap.sections[0]!.preferredZone[1]) / 2;
      const bassMid = (bassMap.sections[0]!.preferredZone[0] + bassMap.sections[0]!.preferredZone[1]) / 2;
      let target = section.registerCentre;
      if (hard[0] >= 55) target = Math.round((section.registerCentre + guitarMid) / 2);
      if (hard[1] <= 70) target = Math.round((section.registerCentre + bassMid) / 2);
      const list = harmonyNotes.get(part.partId) ?? [];
      const voices = part.spec.maxSimultaneous >= 10 ? Math.min(3, part.spec.maxSimultaneous, field.pitchClasses.length) : 1;
      attacks.forEach((beat, attackIndex) => {
        const classes = selectFieldPitchClasses(field.pitchClasses, voices, request.seed, bar, partIndex, attackIndex);
        const duration = q(Math.min(spacing, source.barLength - beat));
        const placed: number[] = [];
        classes.forEach((pc, tone) => {
          const aim = tone === 0 && classes.length > 1 ? target - 12 : target;
          const midi = placePitch(pc, aim, range);
          if (midi === null) {
            flagged.push({
              bar,
              beat: beat + 1,
              partId: part.partId,
              kind: 'outside_hard_range',
              detail: `No ${part.spec.displayName} pitch in ${range[0]}–${range[1]} fits pitch class ${pc}. The tone was omitted.`,
            });
            return;
          }
          if (placed.includes(midi)) return;
          placed.push(midi);
          list.push(...sliceNote((bar - 1) * source.barLength + beat, duration, midi, source.barLength));
        });
        if (placed.length > part.spec.maxSimultaneous) {
          flagged.push({
            bar,
            beat: beat + 1,
            partId: part.partId,
            kind: 'too_many_notes',
            detail: `${part.spec.displayName} sounded ${placed.length} notes. Catalogue maxSimultaneous is ${part.spec.maxSimultaneous}.`,
          });
        }
        if (placed.length) {
          const row = provenance.find((item) => item.detail === field.detail);
          if (row) row.influenced = true;
        }
      });
      harmonyNotes.set(part.partId, list);
    });
  }

  for (const [partId, notes] of [...placedMelody, ...counterNotes, ...doublingNotes, ...harmonyNotes]) {
    const part = resolved.parts.find((item) => item.partId === partId);
    if (!part) continue;
    for (const note of notes) {
      const check = inspectCataloguePitch(part.spec.id, note.sounding);
      for (const flag of check.flags) {
        const bar = Math.floor(note.onset / source.barLength) + 1;
        if (flagged.some((item) => item.partId === partId && item.bar === bar && item.kind === flag.kind && item.detail.includes(String(note.sounding)))) continue;
        flagged.push({
          bar,
          beat: q(note.onset % source.barLength) + 1,
          partId,
          kind: flag.kind,
          detail: flag.detail,
        });
      }
    }
  }

  const byPart = new Map<string, LogicalNote[]>();
  const absorb = (partId: string, notes: readonly LogicalNote[]) => {
    const list = byPart.get(partId) ?? [];
    list.push(...notes);
    byPart.set(partId, list);
  };
  for (const [partId, notes] of placedMelody) absorb(partId, notes);
  for (const [partId, notes] of doublingNotes) absorb(partId, notes);
  for (const [partId, notes] of counterNotes) absorb(partId, notes);
  if (bassPart) absorb(bassPart.partId, bassPlaced);
  for (const [partId, notes] of harmonyNotes) absorb(partId, notes);

  const parts: PartModel[] = resolved.parts.map((part) => {
    const notes = byPart.get(part.partId) ?? [];
    const measures = Array.from({ length: totalBars }, (_, index) => ({
      index: index + 1,
      events: writtenEvents(notes, index + 1, source.barLength, part.spec),
    }));
    return partModel(part, measures);
  });

  const layerAssignments: OrchestrateReceipt['layerAssignments'] = [];
  for (let bar = 1; bar <= totalBars; bar += 1) {
    const shift = shiftsByBar.get(bar);
    if (shift) layerAssignments.push({ bar, role: 'melody', partId: shift.partId, sourcePart: source.melodyPart, octaveShift: shift.shift });
    if (bassPart && bassPlaced.some((note) => Math.floor(note.onset / source.barLength) + 1 === bar)) {
      layerAssignments.push({ bar, role: 'bass', partId: bassPart.partId, sourcePart: source.bassPart ?? source.melodyPart, octaveShift: 0 });
    }
    if (counterPart && counterNotes.get(counterPart.partId)?.some((note) => Math.floor(note.onset / source.barLength) + 1 === bar)) {
      layerAssignments.push({ bar, role: 'countermelody', partId: counterPart.partId, sourcePart: source.melodyPart, octaveShift: 0 });
    }
    for (const part of resolved.parts) {
      if (part.partId === melodyPartId || part.partId === bassPart?.partId || part.partId === counterPart?.partId) continue;
      if (harmonyNotes.get(part.partId)?.some((note) => Math.floor(note.onset / source.barLength) + 1 === bar)) {
        layerAssignments.push({ bar, role: 'harmony_inner', partId: part.partId, sourcePart: source.melodyPart, octaveShift: 0 });
      }
    }
  }

  let parallelMotionReported: boolean | null = null;
  const strings = ['vn1', 'vn2', 'va', 'vc'].map((id) => parts.find((part) => part.id === id)).filter((part): part is PartModel => !!part);
  if (strings.length === 4) {
    parallelMotionReported = quartetBarsHaveParallelMotionViolation(extractQuartetBarsFromStringParts(strings, totalBars));
  }

  const voiceLeadingScores: number[] = [];
  const counterEvents = derivedLines[0]?.events ?? [];
  if (counterEvents.length && phrases[0]) {
    const root = mod12(phrases[0][0]!.midi);
    for (const event of counterEvents) {
      const mel = melodyNotes.find((note) => event.onset >= note.onset && event.onset < note.onset + note.duration) ?? melodyNotes[0]!;
      voiceLeadingScores.push(scoreBizziVertical(mod12(mel.midi), mod12(event.sounding), mod12(bassNotes[0]?.midi ?? mel.midi), root));
    }
  }

  const transpose: ScoreModel['exportPartTranspose'] = {};
  for (const part of resolved.parts) {
    const value = part.spec.transposition;
    if (value.diatonic !== 0 || value.chromatic !== 0 || value.octaveChange !== 0) transpose[part.partId] = value;
  }
  const scoreModel: ScoreModel = {
    title: `Orchestration ${template}`,
    tempo: 96,
    timeSignature: { beats: source.barLength, beatType: 4 },
    keySignature: { fifths: 0, mode: 'major', hideKeySignature: false },
    exportPartTranspose: Object.keys(transpose).length ? transpose : undefined,
    parts,
  };

  const exported = runEnsembleExportPipeline(scoreModel);
  if (!exported.ok || !exported.xml) return { ok: false, error: exported.errors.join('; ') || 'MusicXML export failed.' };

  const independence: OrchestrateReceipt['independence'] = [];
  const reportScore = ingestCanonicalScore(exported.xml).score;
  if (reportScore) {
    const report = buildIndependenceReport(reportScore);
    const idFor = (name: string) => reportScore.parts.find((part) => part.name === name)?.id ?? name;
    for (const pair of report.pairs) {
      const ids: [string, string] = [idFor(pair.pair[0]), idFor(pair.pair[1])];
      if (!ids.includes(melodyPartId)) continue;
      independence.push({
        pair: ids,
        coOnsetRate: pair.coOnsetRate,
        longestParallelPerfect: pair.parallelPerfectRuns.reduce((max, run) => Math.max(max, run.length), 0),
      });
    }
  }

  const receipt: OrchestrateReceipt = {
    version: 'orchestrate-1',
    inputSha256: sha256(request.sourceMusicXml),
    params: request,
    layerAssignments,
    derivedLines,
    omittedLines,
    flagged,
    omissions: resolved.omissions,
    doublingRuns,
    provenance,
    planners: {
      family: family.family,
      density: densityRows,
      register: registerPlan.entries.map((entry) => ({
        partId: entry.partId,
        requested: partRegisterBias[entry.partId] ?? '',
        assigned: entry.registerBand,
      })),
      guitarZone: guitarMap.sections[0] ? [guitarMap.sections[0].preferredZone[0], guitarMap.sections[0].preferredZone[1]] : null,
      bassZone: bassMap.sections[0] ? [bassMap.sections[0].preferredZone[0], bassMap.sections[0].preferredZone[1]] : null,
      ownershipEntries: texturePlan.entries.length + densityOwnership.entries.length,
    },
    parallelMotionReported,
    independence,
    voiceLeadingScores,
    musicalQualityScore: null,
    musicallyApproved: false,
  };
  return { ok: true, musicXml: exported.xml, receipt, score: scoreModel };
}

export function soundingLine(xml: string, partId: string): Array<{ midi: number; duration: number; onset: number }> {
  const parsed = ingestCanonicalScore(xml).score;
  if (!parsed) return [];
  return parsed.soundingEvents
    .filter((event) => event.partId === partId && !event.rest && event.soundingMidi !== null)
    .map((event) => ({
      midi: event.soundingMidi as number,
      duration: quarters(event.duration),
      onset: quarters(event.onset),
    }))
    .sort((a, b) => a.onset - b.onset || a.midi - b.midi);
}

export function collectSounding(score: ScoreModel, partId: string, transposition = CONCERT_TRANSPOSITION): number[] {
  const part = score.parts.find((item) => item.id === partId);
  if (!part) return [];
  const notes: Array<{ onset: number; midi: number }> = [];
  for (const measure of part.measures) {
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      if (event.notation?.tie === 'stop' || event.notation?.tie === 'continue') continue;
      const sounding = event.pitch + transposition.chromatic + transposition.octaveChange * 12;
      notes.push({ onset: (measure.index - 1) * 4 + event.startBeat, midi: sounding });
    }
  }
  notes.sort((a, b) => a.onset - b.onset);
  return notes.map((note) => note.midi);
}
