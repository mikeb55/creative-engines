/**
 * Piano Composition V1 writer. Final piano pitches, onsets and durations are created here.
 * Motif operators and harmony parsing are inputs. Guitar, Fagen, E1 and the duo seal are not called.
 */

import { buildChordSymbolPlanFromBars, buildHarmonyPlanFromBars } from '../harmony/chordProgressionParser';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { HarmonyPlan } from '../primitives/harmonyTypes';
import type { ChordSymbolPlan, FormMap } from '../compositionContext';
import { planDensityCurve } from '../density/densityCurvePlanner';
import { resolveFormPrecedence } from '../form/resolveFormPrecedence';
import { planSectionRoles } from '../section-roles/sectionRolePlanner';
import { applyOperator } from '../motif-ops/operators';
import { buildChain } from '../motif-ops/developmentChain';
import type { Motif, MotifNoteEvent } from '../motif-ops/types';
import { getInstrument } from '../instruments/instrumentCatalogue';
import type { NoteEvent, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';
import type { DensityCurvePlan } from '../density/densityCurveTypes';
import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import { comparePianoScoreToXml } from './pianoXmlOracle';
import {
  pianoGrandStaffConfig,
  PIANO_V1_BARS,
  PIANO_V1_TEMPO,
  type PianoLockedEvent,
} from './pianoTypes';
import {
  validateLockedEventPlayable,
  validateLockedEventsPresent,
  validateLhDevelopment,
  validatePianoIndependence,
  validatePianoPlayability,
} from './pianoValidation';

const DORIAN = [0, 2, 4, 5, 7, 9, 11] as const;
export const PIANO_V1_HARMONY = ['Dm9', 'Dm9', 'Cmaj7', 'Dm9', 'Fmaj7', 'Cmaj7', 'Dm9', 'Dm9'] as const;

export interface PianoLhTexture {
  bar: number;
  texture: 'sustained' | 'sparse' | 'broken' | 'response' | 'tied-stack';
}

export interface PianoCompositionPlan {
  seed: number;
  tempo: number;
  bars: number;
  harmonyBars: string[];
  harmonyPlan: HarmonyPlan;
  chordSymbolPlan: ChordSymbolPlan;
  form: FormMap;
  roles: SectionWithRole[];
  density: DensityCurvePlan;
  lineageIds: string[];
  transformOps: string[];
  lhResponse: { lineageId: string; bar: number; pitches: number[]; durations: number[] };
  returnBar: number;
  returnLockBars: number[];
  innerVoiceEnabled: boolean;
  textures: PianoLhTexture[];
  modalTones: { bar: number; pitch: number; role: 'modal' }[];
  /** Present only on the opt-in general piano path. */
  general?: {
    tonalCentre: 'C' | 'Am';
    metre: '4/4' | 'mixed';
    stageA?: {
      quarters: { n: number; d: number };
      ticks: number;
      fragments: { bar: number; hand: 'RH' | 'LH'; motifRef?: string; omitted: { n: number; d: number }; reason: string }[];
    };
    phases: string[];
    openingIntervals: number[];
    returnIntervals: number[];
    developmentDurations: number[];
    phraseDevelopment?: {
      evidence?: 'planning-level';
      opening: { onset: number; duration: number; midi: number | null }[];
      spans: { span: number; bars: number[]; intent: string; chosen: string; candidates: { id: string; score: number }[] }[];
      returnDurations: number[];
      climaxRhMax: number;
    };
    polychords?: { bar: number; display: string; sourceSymbol?: string; upper: number[]; lower: number[] }[];
    finalEvents?: {
      evidence: 'final-realised-score';
      disclaimer: string;
      opening: { bar: number; pitch: number; onset: number; duration: number; voice: number }[];
      bar21Return: { bar: number; pitch: number; onset: number; duration: number; voice: number }[];
      phraseRestBars: number[];
      climax: { bars: number[]; highestPitch: number | null; soundingNotes: number; notesPerQuarter: number };
      repetition: { repeatedIntervals: number; intervals: number };
      contour: { up: number; down: number; same: number };
    };
  };
}

export interface PianoLockSnapshot {
  harmonyBars: string[];
  form: FormMap;
  lockedEvents: PianoLockedEvent[];
}

export interface PianoComposeSuccess {
  ok: true;
  score: ScoreModel;
  xml: string;
  plan: PianoCompositionPlan;
  lockSnapshot: PianoLockSnapshot;
  elapsedSeconds: number;
  soundingAttacks: number;
}

export interface PianoComposeFailure {
  ok: false;
  code: 'disabled' | 'bad_request' | 'unsupported_lock' | 'playability' | 'validation' | 'parity';
  error: string;
  fieldErrors?: { field: string; message: string }[];
}

export type PianoComposeResult = PianoComposeSuccess | PianoComposeFailure;

interface Slot {
  start: number;
  duration: number;
  pitch: number;
  pitches?: number[];
  tie?: 'start' | 'stop' | 'continue';
  motifRef?: string;
}

function rootMotif(): Motif {
  return {
    id: 'm1',
    field: DORIAN,
    events: [
      { onset: 0, duration: 1, midi: 62 },
      { onset: 1, duration: 1, midi: 64 },
      { onset: 2, duration: 1, midi: 71 },
      { onset: 3, duration: 0.5, midi: 69 },
      { onset: 3.5, duration: 0.5, midi: 67 },
      { onset: 4, duration: 1, midi: 65 },
      { onset: 5, duration: 1, midi: 64 },
      { onset: 6, duration: 1, midi: 62 },
      { onset: 7, duration: 1, midi: null },
    ],
  };
}

function fillVoice(slots: Slot[], voice: number): ScoreEvent[] {
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  const events: ScoreEvent[] = [];
  let cursor = 0;
  for (const slot of sorted) {
    if (slot.start < cursor - 1e-6) {
      throw new Error(`piano writer overlap voice ${voice} at beat ${slot.start}`);
    }
    if (slot.start > cursor + 1e-6) {
      events.push({ kind: 'rest', startBeat: cursor, duration: roundBeat(slot.start - cursor), voice });
    }
    const note: NoteEvent = {
      kind: 'note',
      pitch: slot.pitch,
      startBeat: slot.start,
      duration: slot.duration,
      voice,
      ...(slot.pitches ? { pitches: slot.pitches } : {}),
      ...(slot.motifRef ? { motifRef: slot.motifRef } : {}),
      ...(slot.tie ? { notation: { tie: slot.tie } } : {}),
    };
    events.push(note);
    cursor = slot.start + slot.duration;
  }
  if (cursor < 4 - 1e-6) {
    events.push({ kind: 'rest', startBeat: cursor, duration: roundBeat(4 - cursor), voice } satisfies RestEvent);
  }
  if (cursor > 4 + 1e-6) throw new Error(`piano writer voice ${voice} exceeds the bar`);
  return events;
}

function roundBeat(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function placeEvents(events: readonly MotifNoteEvent[], slots: Slot[], motifRef: string): void {
  for (const event of events) {
    if (event.midi === null) continue;
    slots.push({
      start: event.onset,
      duration: event.duration,
      pitch: event.midi,
      motifRef,
    });
  }
}

function snapshotOf(plan: PianoCompositionPlan, locks: readonly PianoLockedEvent[]): PianoLockSnapshot {
  return {
    harmonyBars: [...plan.harmonyBars],
    form: structuredClone(plan.form),
    lockedEvents: structuredClone([...locks]),
  };
}

export function composePianoV1(input: {
  seed: number;
  innerVoice?: boolean;
  lockedEvents?: PianoLockedEvent[];
  tempo?: number;
}): PianoComposeResult {
  const tempo = input.tempo ?? PIANO_V1_TEMPO;
  if (!Number.isInteger(input.seed)) {
    return { ok: false, code: 'bad_request', error: 'Piano composition V1 needs an integer seed.' };
  }
  if (tempo !== PIANO_V1_TEMPO) {
    return { ok: false, code: 'bad_request', error: 'Piano composition V1 checkpoint tempo is quarter note = 64.' };
  }
  const locks = input.lockedEvents ?? [];
  for (const lock of locks) {
    const playable = validateLockedEventPlayable(lock);
    if (!playable.ok) {
      return { ok: false, code: 'unsupported_lock', error: playable.errors.join('; ') };
    }
  }

  const harmonyBars = [...PIANO_V1_HARMONY];
  for (const symbol of harmonyBars) {
    const tones = chordTonesForChordSymbol(symbol, { lockedHarmony: true });
    if (!Number.isFinite(tones.root)) {
      return { ok: false, code: 'validation', error: `unparsed harmony symbol ${symbol}` };
    }
  }
  const harmonyPlan = buildHarmonyPlanFromBars(harmonyBars);
  const chordSymbolPlan = buildChordSymbolPlanFromBars(harmonyBars);
  const form = resolveFormPrecedence({
    totalBars: PIANO_V1_BARS,
    lockedHarmonyBarCount: harmonyBars.length,
    compiledSections: [
      { kind: 'verse', barLength: 4 },
      { kind: 'chorus', barLength: 4 },
    ],
  });
  const roles = planSectionRoles(form.sections, { verse_0: 'statement', chorus_0: 'return' });
  const density = planDensityCurve(roles, PIANO_V1_BARS);
  const innerVoiceEnabled = input.innerVoice !== false;
  const brokenUp = input.seed % 2 === 0;
  const innerPitch = brokenUp ? 65 : 72;

  const root = rootMotif();
  const chain = buildChain(root, [
    { op: 'fragment-head', params: { count: 2 } },
    { op: 'augment' },
  ]);
  const augmented = chain.results[1];
  const head = chain.results[0];
  if (!augmented || !head) {
    return { ok: false, code: 'validation', error: 'motif chain did not produce an augmented head' };
  }
  const opening = root.events.filter((event) => event.onset < 4);
  const shifted = applyOperator(
    { id: 'm1-bar1', field: DORIAN, events: opening.map((event) => ({ ...event })) },
    'transpose-in-field',
    { degrees: 1 },
  );
  const response = applyOperator(head, 'transpose', { semitones: -12 });
  if (augmented.events.some((event, index) => event.duration !== (head.events[index]?.duration ?? 0) * 2)) {
    return { ok: false, code: 'validation', error: 'augmentation did not change durations' };
  }

  const rh = new Map<number, Slot[]>();
  const lh = new Map<number, Slot[]>();
  const inner = new Map<number, Slot[]>();
  for (let bar = 1; bar <= 8; bar += 1) {
    rh.set(bar, []);
    lh.set(bar, []);
    inner.set(bar, []);
  }

  for (const event of root.events) {
    if (event.midi === null) continue;
    const bar = event.onset < 4 ? 1 : 2;
    const start = event.onset < 4 ? event.onset : event.onset - 4;
    rh.get(bar)!.push({ start, duration: event.duration, pitch: event.midi, motifRef: root.id });
  }
  placeEvents(shifted.motif.events, rh.get(3)!, shifted.step.toId);
  const tail = shifted.motif.events.filter((event) => event.midi !== null).at(-1);
  if (!tail?.midi) return { ok: false, code: 'validation', error: 'shifted motif has no tail' };
  rh.get(4)!.push({ start: 0, duration: 2.5, pitch: tail.midi, motifRef: 'm1.hold' });
  placeEvents(augmented.events, rh.get(5)!, augmented.id);
  rh.get(6)!.push({ start: 2, duration: 1, pitch: 67, motifRef: 'm1.continue' });
  rh.get(6)!.push({ start: 3, duration: 1, pitch: 69, motifRef: 'm1.continue' });
  for (const event of opening) {
    if (event.midi === null) continue;
    rh.get(7)!.push({ start: event.onset, duration: event.duration, pitch: event.midi, motifRef: 'm1.return' });
  }
  placeEvents(head.events, rh.get(8)!, `${head.id}.liquidation`);

  lh.get(1)!.push({ start: 0, duration: 4, pitch: 50, motifRef: 'lh.sustain' });
  lh.get(2)!.push({ start: 1, duration: 1, pitch: 45, motifRef: 'lh.sparse' });
  lh.get(2)!.push({ start: 3, duration: 1, pitch: 53, motifRef: 'lh.sparse' });
  lh.get(3)!.push({ start: 0, duration: 4, pitch: 48, pitches: [48, 55], motifRef: 'lh.dyad' });
  const broken = brokenUp ? [50, 53, 57, 60, 57, 53, 50, 57] : [57, 53, 50, 53, 57, 60, 57, 50];
  broken.forEach((pitch, index) => {
    lh.get(4)!.push({ start: index * 0.5, duration: 0.5, pitch, motifRef: 'lh.broken' });
  });
  lh.get(5)!.push({ start: 0, duration: 2.5, pitch: 53, pitches: [53, 60], motifRef: 'lh.stack' });
  placeEvents(
    response.motif.events.map((event) => ({ ...event, onset: event.onset })),
    lh.get(6)!,
    response.step.toId,
  );
  lh.get(7)!.push({ start: 0, duration: 4, pitch: 45, pitches: [45, 52], tie: 'start', motifRef: 'lh.tie' });
  lh.get(8)!.push({ start: 0, duration: 2, pitch: 45, pitches: [45, 52], tie: 'stop', motifRef: 'lh.tie' });
  if (innerVoiceEnabled) {
    inner.get(7)!.push({ start: 0, duration: 4, pitch: innerPitch, motifRef: 'rh.inner' });
  }

  const catalogue = getInstrument('piano');
  const score: ScoreModel = {
    title: `Piano Composition V1 seed ${input.seed}`,
    tempo,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [{
      id: 'piano',
      name: catalogue.displayName,
      instrumentIdentity: catalogue.id,
      midiProgram: catalogue.midiProgram,
      clef: 'treble',
      catalogueInstrumentSound: catalogue.instrumentSound,
      pianoGrandStaff: pianoGrandStaffConfig(innerVoiceEnabled),
      measures: harmonyBars.map((chord, index) => {
        const bar = index + 1;
        const events = [
          ...fillVoice(rh.get(bar) ?? [], 1),
          ...(innerVoiceEnabled ? fillVoice(inner.get(bar) ?? [], 2) : []),
          ...fillVoice(lh.get(bar) ?? [], 3),
        ];
        return { index: bar, chord, chordSymbol: chord, events };
      }),
    }],
  };

  const plan: PianoCompositionPlan = {
    seed: input.seed,
    tempo,
    bars: PIANO_V1_BARS,
    harmonyBars,
    harmonyPlan,
    chordSymbolPlan,
    form,
    roles,
    density,
    lineageIds: chain.lineageIds,
    transformOps: chain.steps.map((step) => step.op),
    lhResponse: {
      lineageId: response.step.toId,
      bar: 6,
      pitches: response.motif.events.map((event) => event.midi).filter((midi): midi is number => midi !== null),
      durations: response.motif.events.filter((event) => event.midi !== null).map((event) => event.duration),
    },
    returnBar: 7,
    returnLockBars: [7],
    innerVoiceEnabled,
    textures: [
      { bar: 1, texture: 'sustained' },
      { bar: 2, texture: 'sparse' },
      { bar: 3, texture: 'sustained' },
      { bar: 4, texture: 'broken' },
      { bar: 5, texture: 'sustained' },
      { bar: 6, texture: 'response' },
      { bar: 7, texture: 'tied-stack' },
      { bar: 8, texture: 'tied-stack' },
    ],
    modalTones: [
      { bar: 1, pitch: 71, role: 'modal' },
      { bar: 1, pitch: 67, role: 'modal' },
    ],
  };
  const lockSnapshot = snapshotOf(plan, locks);
  const kept = validateLockedEventsPresent(score, locks);
  if (!kept.ok) return { ok: false, code: 'unsupported_lock', error: kept.errors.join('; ') };
  const playable = validatePianoPlayability(score, tempo);
  if (!playable.ok) return { ok: false, code: 'playability', error: playable.errors.join('; ') };
  const independent = validatePianoIndependence(score);
  if (!independent.ok) return { ok: false, code: 'validation', error: independent.errors.join('; ') };
  const developed = validateLhDevelopment(score);
  if (!developed.ok) return { ok: false, code: 'validation', error: developed.errors.join('; ') };
  const barMath = validateStrictBarMath(score);
  if (!barMath.valid) return { ok: false, code: 'validation', error: barMath.errors.join('; ') };

  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) {
    return { ok: false, code: 'validation', error: exported.errors.join('; ') || 'piano export failed' };
  }
  const compared = comparePianoScoreToXml(score, exported.xml);
  if (!compared.ok || compared.elapsedSeconds === null) {
    return { ok: false, code: 'parity', error: compared.errors.join('; ') };
  }
  const after = snapshotOf(plan, locks);
  if (JSON.stringify(after) !== JSON.stringify(lockSnapshot)) {
    return { ok: false, code: 'validation', error: 'harmony, form or locks changed during export' };
  }
  const chordsAfter = score.parts[0]?.measures.map((measure) => measure.chord) ?? [];
  if (chordsAfter.join('|') !== harmonyBars.join('|')) {
    return { ok: false, code: 'validation', error: 'exported score harmony no longer matches the plan' };
  }
  return {
    ok: true,
    score,
    xml: exported.xml,
    plan,
    lockSnapshot,
    elapsedSeconds: compared.elapsedSeconds,
    soundingAttacks: compared.soundingAttacks,
  };
}
