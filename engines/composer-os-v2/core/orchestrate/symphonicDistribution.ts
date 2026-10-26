/**
 * V4.0 Phase 2 — source-led distribution on the existing symphonic roster.
 * Planning only. Phase 1 stays on planSymphonicPhrases when allocation is absent or phase-1.
 * Treatments follow phrase content. They do not follow fixture names or a four-bar family cycle.
 */

import { symphonicAccompanimentOperatorForPhraseKind } from '../mosaic-mode/mosaicPhrasePlanner';
import { applyOperator } from '../motif-ops/operators';
import type { Motif, OperatorId } from '../motif-ops/types';
import { soundingSpellingToWritten, type SpelledPitch } from '../instruments/writtenPitch';
import type { Transposition } from '../instruments/instrumentTypes';
import type { SymphonicFamilyActivity, SymphonicOrchestrationSettings } from './types';
import {
  orchestrationEnergyForFortyEightBarThematic,
  planFortyEightBarForm,
  symphonicOrchestrationDensityFromEnergy,
  symphonicPhrasesFromFortyEightBarPlan,
  type EnergyCurve,
  type FortyEightBarThematicRole,
  type SymphonicOrchestrationDensity,
} from '../form/macroFormPlanner';
import {
  BASS_DRUM_GM,
  HARP_RANGE,
  SUSPENDED_CYMBAL_GM,
  SYMPHONIC_SLOTS,
  TIMPANI_RANGE,
  foldIntoRange,
  isSymphonicScoreEnding,
  SYMPHONIC_DEFAULT_SCORE_END_BAR,
  SYMPHONIC_EXTENDED_SCORE_END_BAR,
  symphonicScoreEndBar,
  type ResolvedSymphonicSettings,
  type SymphonicPhrasePlan,
} from './symphonicWriting';

export type Phase2Role =
  | 'primary-melody'
  | 'melodic-reinforcement'
  | 'independent-answer'
  | 'countermelody'
  | 'sustained-colour'
  | 'bass-foundation'
  | 'rhythmic-punctuation'
  | 'silence';

export interface Phase2SourceNote {
  id: string;
  bar: number;
  onset: number;
  duration: number;
  midi: number;
  role: 'melody' | 'bass' | 'countermelody' | 'harmonic_support' | 'rhythmic_figure' | 'unassigned';
  locked: boolean;
  tieStart: boolean;
  tieStop: boolean;
}

export interface Phase2Part {
  partId: string;
  range: readonly [number, number] | null;
  transposition: Transposition;
}

export interface Phase2Phrase {
  id: string;
  index: number;
  startBar: number;
  endBar: number;
  kind: 'statement' | 'development' | 'return';
  start: number;
  end: number;
}

export interface Phase2EventPlan {
  kind: 'source' | 'derived';
  eventId: string;
  partId: string;
  shift: number;
  phraseId: string;
  role: Phase2Role;
  transformation: string;
  lineage: string;
  reason: string;
  onset: number;
  duration: number;
  midi: number;
  voice: number;
  classifies: boolean;
  op?: string;
}

export interface Phase2DistributionReceipt {
  allocation: 'phase-2';
  decisions: Array<{
    phraseId: string;
    sourceLineage: string;
    role: Phase2Role | string;
    instrument: string;
    span: { startBar: number; endBar: number };
    register: string;
    activity: string;
    handoverAt: number | null;
    texture: string;
    reason: string;
  }>;
  events: Array<{
    lineage: string;
    role: Phase2Role;
    instrument: string;
    phraseId?: string;
    onset: number;
    duration: number;
    written: { step: string; alter: number; octave: number; midi: number };
    sounding: number;
    transformation: string;
  }>;
  silence: Array<{ bar?: number; instrument?: string; role?: string; reason: string }>;
  rejected: Array<{ phraseId: string; candidate: string; reason: string }>;
  endurance: Array<{ instrument: string; quarters: number; reason: string }>;
}

export interface Phase2Plan {
  placements: Phase2EventPlan[];
  plans: SymphonicPhrasePlan[];
  foreground: Record<string, string>;
  handovers: Record<string, boolean>;
  answers: Array<{ phraseId: string; operator: string; partId: string; notes: number }>;
  derivedLines: Array<{ partId: string; lineageId: string; ops: string[]; events: Array<{ sounding: number; duration: number; onset: number }> }>;
  silence: Array<{ bar: number; reason: string }>;
  omissions: Array<{ eventId?: string; partId?: string; reason: string }>;
  warnings: string[];
  timpaniTuning: number[];
  harpPedal: string;
  distribution: Phase2DistributionReceipt;
}

interface BusySpan {
  start: number;
  end: number;
}

const ANSWER_OPS: readonly OperatorId[] = ['fragment-head', 'augment', 'displace'];
const WIND_RUN_LIMIT = 6;
const RESCUE_DIALOGUE_PHRASE_IDS = new Set(['a', 'a_prime']);

function rescueDialoguePhrase(phraseId: string, scoreEndBar: number): boolean {
  return scoreEndBar >= SYMPHONIC_EXTENDED_SCORE_END_BAR && RESCUE_DIALOGUE_PHRASE_IDS.has(phraseId);
}

interface FortyEightPhraseEnergy {
  energy: EnergyCurve;
  density: SymphonicOrchestrationDensity;
  thematicRole: FortyEightBarThematicRole;
}

function fortyEightPhraseEnergyById(
  phrases: readonly Phase2Phrase[],
  scoreEndBar: number,
): Map<string, FortyEightPhraseEnergy> | null {
  if (scoreEndBar < SYMPHONIC_EXTENDED_SCORE_END_BAR) return null;
  const form = planFortyEightBarForm(null);
  const symPhrases = symphonicPhrasesFromFortyEightBarPlan(form);
  const map = new Map<string, FortyEightPhraseEnergy>();
  for (const phrase of phrases) {
    const row = symPhrases.find(
      (item) => item.id === phrase.id || (item.startBar === phrase.startBar && item.endBar === phrase.endBar),
    ) ?? symPhrases.find((item) => phrase.startBar >= item.startBar && phrase.endBar <= item.endBar);
    if (!row) return null;
    const macro = form.macro.sections.find(
      (section) => row.startBar >= section.startBar && row.startBar < section.startBar + section.length,
    );
    const energy = orchestrationEnergyForFortyEightBarThematic(row.thematicRole, macro);
    map.set(phrase.id, {
      energy,
      density: symphonicOrchestrationDensityFromEnergy(energy),
      thematicRole: row.thematicRole,
    });
  }
  return map;
}

function orderedPhraseMelodyParts(
  register: 'high' | 'middle' | 'low',
  energy: EnergyCurve,
  settings: ResolvedSymphonicSettings,
  priorPhrasePart: string | null,
): string[] {
  const preferWood =
    energy === 'high' || energy === 'peak' || (energy === 'mid' && register !== 'low');
  const preferStrings = energy === 'low' || register === 'low';
  const families: Array<'woodwind' | 'strings' | 'brass'> = [];
  const priorFamily = priorPhrasePart ? familyOf(priorPhrasePart) : null;
  if (priorFamily === 'woodwind') {
    families.push('strings', 'woodwind');
  } else if (priorFamily === 'strings') {
    families.push('woodwind', 'strings');
  } else if (preferWood) {
    families.push('woodwind', 'strings');
  } else if (preferStrings) {
    families.push('strings', 'woodwind');
  } else {
    families.push('strings', 'woodwind');
  }
  if ((energy === 'high' || energy === 'peak') && settings.families.brass !== 'off') {
    families.push('brass');
  }
  const ids: string[] = [];
  for (const family of families) {
    if (family === 'brass') {
      if (settings.families.brass === 'off') continue;
    } else if (settings.families[family] === 'off') continue;
    ids.push(...pools(family, register, settings));
  }
  return [...new Set(ids)];
}

function orderedPhraseSupportParts(
  eRow: FortyEightPhraseEnergy,
  register: 'high' | 'middle' | 'low',
  settings: ResolvedSymphonicSettings,
  melodyPart: string | null,
  priorSupportPart: string | null,
): string[] {
  if (eRow.thematicRole === 'coda') return ['vc'];
  const melodyFamily = melodyPart ? familyOf(melodyPart) : 'strings';
  const contrastWind = melodyFamily !== 'woodwind';
  const windIds = pools('woodwind', register).filter(
    (id) => activityOf(id, settings) !== 'off' && id !== melodyPart && !['fl1', 'picc'].includes(id),
  );
  const stringIds = pools('strings', register).filter(
    (id) => activityOf(id, settings) !== 'off' && id !== melodyPart && id !== 'vn1',
  );
  const primary = contrastWind ? windIds : stringIds;
  const secondary = contrastWind ? stringIds : windIds;
  const rotate = (list: string[]): string[] => {
    if (!priorSupportPart || !list.includes(priorSupportPart)) return list;
    const index = list.indexOf(priorSupportPart);
    return [...list.slice(index + 1), ...list.slice(0, index + 1)];
  };
  if (eRow.thematicRole === 'intro') {
    const wood = ['ob1', 'cl1', 'fl2'].filter((id) => activityOf(id, settings) !== 'off');
    const brass =
      settings.families.brass !== 'off' && (settings.families.strings === 'off' || settings.foreground === 'brass')
        ? pools('brass', register).filter(
          (id) => activityOf(id, settings) !== 'off' && !['tp1', 'tp2', 'tp3', 'tba'].includes(id),
        )
        : [];
    return rotate([...wood, ...brass]);
  }
  if (eRow.thematicRole === 'transformed_return') {
    return ['ob1', 'ca', 'cl1', 'cl2', ...rotate(stringIds)];
  }
  if (eRow.thematicRole === 'development_fragmentation') {
    return [...rotate(primary), ...secondary];
  }
  return [...rotate(primary), ...secondary.slice(0, 2)];
}

function orderedPhraseBassParts(
  eRow: FortyEightPhraseEnergy,
  settings: ResolvedSymphonicSettings,
  priorBassPart: string | null,
): string[] {
  let base: string[] =
    eRow.thematicRole === 'intro'
      ? ['bn1', 'db', 'vc']
      : eRow.thematicRole === 'coda'
        ? ['db', 'vc']
        : eRow.thematicRole === 'transformed_return'
          ? ['vc', 'db', 'bn1', 'va']
          : ['db', 'vc', 'bn1', 'va'];
  if (settings.families.brass !== 'off' && (settings.families.strings === 'off' || settings.foreground === 'brass')) {
    base = [...base, 'tbn1', 'tba'];
  }
  const legal = base.filter((id) => activityOf(id, settings) !== 'off');
  if (!priorBassPart || !legal.includes(priorBassPart)) return legal;
  const index = legal.indexOf(priorBassPart);
  return [...legal.slice(index + 1), ...legal.slice(0, index + 1)];
}

function introMelodyPartIds(settings: ResolvedSymphonicSettings, register: 'high' | 'middle' | 'low'): string[] {
  if (settings.foreground === 'brass' && settings.families.brass !== 'off') {
    return pools('brass', register, settings).filter((id) => activityOf(id, settings) !== 'off');
  }
  if (settings.foreground === 'strings' && settings.families.strings !== 'off') {
    return pools('strings', register).filter((id) => activityOf(id, settings) !== 'off' && id !== 'db');
  }
  return pools('woodwind', register).filter((id) => activityOf(id, settings) !== 'off' && !['picc', 'bcl', 'cbn'].includes(id));
}

/** Time-weighted mean of simultaneous sounding parts in a bar span (acceptance metric). */
export function timeWeightedSimultaneousParts(
  events: ReadonlyArray<{ onset: number; duration: number; instrument: string }>,
  startBar: number,
  endBar: number,
): number {
  const t0 = (startBar - 1) * 4;
  const t1 = endBar * 4;
  const sampleStep = 0.25;
  let sum = 0;
  let samples = 0;
  for (let t = t0; t < t1 - 1e-6; t += sampleStep) {
    const active = new Set<string>();
    for (const event of events) {
      if (event.onset < t + sampleStep - 1e-6 && event.onset + event.duration > t + 1e-6) {
        active.add(event.instrument);
      }
    }
    sum += active.size;
    samples += 1;
  }
  return samples ? sum / samples : 0;
}

function pcOf(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function familyOf(partId: string): 'woodwind' | 'brass' | 'strings' | 'harp' | 'timpani' | 'percussion' | null {
  return SYMPHONIC_SLOTS.find((slot) => slot.partId === partId)?.family ?? null;
}

function activityOf(partId: string, settings: ResolvedSymphonicSettings): SymphonicFamilyActivity | 'off' {
  const family = familyOf(partId);
  if (!family) return 'off';
  if (family === 'timpani' || family === 'percussion') return settings.families.percussion;
  if (family === 'harp') return settings.families.harp;
  return settings.families[family];
}

function registerOf(centre: number): 'high' | 'middle' | 'low' {
  if (centre >= 74) return 'high';
  if (centre >= 60) return 'middle';
  return 'low';
}

function pools(
  family: 'woodwind' | 'strings' | 'brass',
  register: 'high' | 'middle' | 'low',
  settings?: ResolvedSymphonicSettings,
): string[] {
  const table = {
    woodwind: { high: ['fl1', 'ob1', 'cl1', 'fl2'], middle: ['cl1', 'ob1', 'ca', 'fl1'], low: ['bn1', 'bcl', 'cl1'] },
    strings: { high: ['vn1', 'vn2'], middle: ['vn2', 'va', 'vn1'], low: ['vc', 'va', 'db'] },
    brass: { high: ['tp1', 'hn1', 'tp2'], middle: ['hn1', 'hn2', 'tp2'], low: ['tbn1', 'tba', 'hn3'] },
  };
  const list = table[family][register];
  if (family === 'brass' && register === 'middle' && settings?.foreground === 'brass') {
    return ['tp1', ...list.filter((id) => id !== 'tp1')];
  }
  return list;
}

function overlaps(start: number, end: number, spans: readonly BusySpan[]): boolean {
  return spans.some((span) => start < span.end - 1e-6 && span.start < end - 1e-6);
}

function occupy(busy: Map<string, BusySpan[]>, partId: string, start: number, end: number): void {
  const list = busy.get(partId) ?? [];
  list.push({ start, end });
  busy.set(partId, list);
}

function fits(midis: number[], range: readonly [number, number], shift: number): boolean {
  return midis.every((midi) => midi + shift >= range[0] && midi + shift <= range[1]);
}

function chooseShift(midis: number[], range: readonly [number, number], soundingLocked: boolean): number | null {
  const shifts = soundingLocked ? [0] : [0, -12, 12, -24, 24];
  return shifts.find((shift) => fits(midis, range, shift)) ?? null;
}

function pickPart(
  parts: readonly Phase2Part[],
  ids: readonly string[],
  midis: number[],
  busy: Map<string, BusySpan[]>,
  spans: BusySpan[],
  avoid: ReadonlySet<string>,
  soundingLocked: boolean,
  settings: ResolvedSymphonicSettings,
): { partId: string; shift: number } | null {
  for (const id of ids) {
    if (avoid.has(id)) continue;
    if (activityOf(id, settings) === 'off') continue;
    const part = parts.find((item) => item.partId === id);
    if (!part?.range) continue;
    const shift = chooseShift(midis, part.range, soundingLocked);
    if (shift === null) continue;
    if (spans.some((span) => overlaps(span.start, span.end, busy.get(id) ?? []))) continue;
    return { partId: id, shift };
  }
  return null;
}

function spellConcert(midi: number): SpelledPitch {
  const pc = pcOf(midi);
  const steps = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  return { step: steps[pc] ?? 'C', alter: alters[pc] ?? 0, octave: Math.floor(midi / 12) - 1, midi };
}

function spellWritten(part: Phase2Part, sounding: number): { step: string; alter: number; octave: number; midi: number } {
  const written = soundingSpellingToWritten(spellConcert(sounding), part.transposition);
  return { step: written.step, alter: written.alter, octave: written.octave, midi: written.midi };
}

function average(notes: readonly Phase2SourceNote[]): number {
  if (!notes.length) return 64;
  return notes.reduce((sum, note) => sum + note.midi, 0) / notes.length;
}

function shortRatio(notes: readonly Phase2SourceNote[]): number {
  if (!notes.length) return 0;
  return notes.filter((note) => note.duration <= 0.5).length / notes.length;
}

function openingFamily(centre: number, settings: ResolvedSymphonicSettings): 'woodwind' | 'strings' | 'brass' {
  const preferred = settings.foreground === 'source-register'
    ? (centre >= 67 ? 'woodwind' : 'strings')
    : settings.foreground;
  if (settings.families[preferred] !== 'off') return preferred;
  return (['strings', 'woodwind', 'brass'] as const).find((family) => settings.families[family] !== 'off') ?? 'strings';
}

function partnerFamily(family: 'woodwind' | 'strings' | 'brass'): 'woodwind' | 'strings' {
  return family === 'woodwind' ? 'strings' : 'woodwind';
}

function textureFor(
  phrase: Phase2Phrase,
  melody: readonly Phase2SourceNote[],
  countermelody: readonly Phase2SourceNote[],
  openingCentre: number,
  allSilent: boolean,
  scoreEndBar: number,
): string {
  if (allSilent || !melody.length) return 'silence';
  if (isSymphonicScoreEnding(phrase.endBar, scoreEndBar)) return 'sparse-return';
  const ratio = shortRatio(melody);
  const centre = average(melody);
  if (countermelody.length >= 4 && countermelody.length >= melody.length * 0.5) return 'dialogue';
  if (ratio >= 0.5 && phrase.kind !== 'statement') return 'layered';
  if (ratio >= 0.5) return 'subgroup';
  if (phrase.kind === 'development') return 'layered';
  if (phrase.kind === 'return' && Math.abs(centre - openingCentre) < 3) return 'sparse-return';
  if (phrase.kind === 'statement') return 'solo';
  return 'sustained-colour';
}

function exactDouble(
  notes: Array<{ onset: number; duration: number; midi: number }>,
  melody: readonly Phase2SourceNote[],
): boolean {
  if (notes.length < 2) return false;
  return melody.some((_, start) => {
    const window = melody.slice(start, start + notes.length);
    if (window.length !== notes.length) return false;
    const delta = notes[0]!.midi - window[0]!.midi;
    if (delta % 12 !== 0) return false;
    return notes.every((note, index) => note.midi - window[index]!.midi === delta && Math.abs(note.duration - window[index]!.duration) < 1e-6);
  });
}

/** Full-score primary melody for doubling checks: placed sounding pitches + source timing for bars not yet voiced. */
function primaryMelodyDoublingReference(
  melodyAll: readonly Phase2SourceNote[],
  placements: readonly Phase2EventPlan[],
): Phase2SourceNote[] {
  return melodyAll
    .map((note) => {
      const placed = placements.find((item) => item.eventId === note.id && item.role === 'primary-melody');
      if (placed) {
        return { ...note, onset: placed.onset, duration: placed.duration, midi: placed.midi };
      }
      return note;
    })
    .sort((a, b) => a.onset - b.onset || a.midi - b.midi);
}

function barSpansOf(silentBars: ReadonlySet<number>, barStart: (bar: number) => number, barEnd: (bar: number) => number): BusySpan[] {
  return [...silentBars].map((bar) => ({ start: barStart(bar), end: barEnd(bar) }));
}

function hitsSilence(onset: number, duration: number, silent: readonly BusySpan[]): boolean {
  return silent.some((span) => onset < span.end - 1e-6 && span.start < onset + duration - 1e-6);
}

function barSonority(notes: readonly Phase2SourceNote[], bar: number): Set<number> {
  return new Set(notes.filter((item) => item.bar === bar).map((item) => pcOf(item.midi)));
}

function isEditableGesture(note: Phase2SourceNote): boolean {
  if (note.tieStop && !note.tieStart) return false;
  return note.duration >= 1 - 1e-6;
}

/** Keep accompaniment outside the motif-answer window; clear only the overlapping interior. */
function rescueDialogueHarmonySegments(
  note: Phase2SourceNote,
  window: { start: number; end: number } | null,
): Array<{ onset: number; duration: number }> {
  if (!window || note.locked || !isEditableGesture(note)) {
    return [{ onset: note.onset, duration: note.duration }];
  }
  const noteEnd = note.onset + note.duration;
  if (note.onset >= window.end - 1e-6 || noteEnd <= window.start + 1e-6) {
    return [{ onset: note.onset, duration: note.duration }];
  }
  const segments: Array<{ onset: number; duration: number }> = [];
  if (note.onset < window.start - 1e-6) {
    segments.push({ onset: note.onset, duration: window.start - note.onset });
  }
  if (noteEnd > window.end + 1e-6) {
    segments.push({ onset: window.end, duration: noteEnd - window.end });
  }
  return segments;
}

function tryDerivedAccompaniment(input: {
  note: Phase2SourceNote;
  phrase: Phase2Phrase;
  notes: readonly Phase2SourceNote[];
  parts: readonly Phase2Part[];
  busy: Map<string, BusySpan[]>;
  settings: ResolvedSymphonicSettings;
  mode: 'faithful' | 'developing';
  silentSpans: readonly BusySpan[];
  partIds: readonly string[];
  avoid: ReadonlySet<string>;
  role: Phase2Role;
  barStart: (bar: number) => number;
  barEnd: (bar: number) => number;
  scoreEndBar: number;
}): Phase2EventPlan[] | null {
  const { note, phrase, notes, parts, busy, settings, mode, silentSpans, partIds, avoid, role, barStart, barEnd, scoreEndBar } = input;
  if (scoreEndBar <= SYMPHONIC_DEFAULT_SCORE_END_BAR) return null;
  if (note.locked || mode !== 'developing' || !isEditableGesture(note)) return null;
  const plan = symphonicAccompanimentOperatorForPhraseKind(phrase.kind);
  const slice = note.duration / plan.subdivisions;
  const motif: Motif = {
    id: `${note.id}-gesture`,
    events: Array.from({ length: plan.subdivisions }, (_, index) => ({
      onset: index * slice,
      duration: slice,
      midi: note.midi,
    })),
  };
  const transformed = applyOperator(motif, plan.operator, plan.params);
  const b0 = barStart(note.bar);
  const b1 = barEnd(note.bar);
  const sonority = barSonority(notes, note.bar);
  let events = transformed.motif.events
    .filter((event) => event.midi !== null)
    .map((event) => ({
      onset: b0 + event.onset,
      duration: event.duration,
      midi: event.midi as number,
    }));
  if (note.bar === phrase.endBar && plan.phraseEndRestQuarters > 0) {
    const limit = b1 - plan.phraseEndRestQuarters;
    events = events
      .map((event) => {
        if (event.onset >= limit - 1e-6) return null;
        const duration = Math.min(event.duration, limit - event.onset);
        return duration >= 0.25 - 1e-6 ? { ...event, duration } : null;
      })
      .filter((event): event is { onset: number; duration: number; midi: number } => event !== null);
  }
  events = events
    .filter((event) => event.onset >= b0 - 1e-6 && event.onset < b1 - 1e-6)
    .map((event) => ({ ...event, duration: Math.min(event.duration, b1 - event.onset) }))
    .filter((event) => event.duration >= 0.25 - 1e-6);
  if (!events.length) return null;
  if (events.some((event) => !sonority.has(pcOf(event.midi)))) return null;
  if (events.some((event) => hitsSilence(event.onset, event.duration, silentSpans))) return null;
  const spans = events.map((event) => ({ start: event.onset, end: event.onset + event.duration }));
  const choice = pickPart(parts, partIds, events.map((event) => event.midi), busy, spans, avoid, false, settings);
  if (!choice) return null;
  const opLabel = plan.operator;
  return events.map((event, index) => ({
    kind: 'derived' as const,
    eventId: `${note.id}-accomp-${index}`,
    partId: choice.partId,
    shift: choice.shift,
    phraseId: phrase.id,
    role,
    transformation: opLabel,
    lineage: `${note.id}.${opLabel}`,
    reason: `Editable accompaniment (${opLabel}) from the source bar gesture. Invalid shapes keep the original placement.`,
    onset: event.onset,
    duration: event.duration,
    midi: event.midi + choice.shift,
    voice: 1,
    classifies: false,
    op: opLabel,
  }));
}

export function planSymphonicDistribution(input: {
  notes: readonly Phase2SourceNote[];
  phrases: readonly Phase2Phrase[];
  parts: readonly Phase2Part[];
  settings: ResolvedSymphonicSettings;
  mode: 'faithful' | 'developing';
  seed: number;
  silentBars: ReadonlySet<number>;
  barStart: (bar: number) => number;
  barEnd: (bar: number) => number;
}): { ok: true; plan: Phase2Plan } | { ok: false; error: string } {
  const { notes, phrases, parts, settings, mode, seed, silentBars } = input;
  const scoreEndBar = symphonicScoreEndBar(phrases);
  const fortyEightEnergy = fortyEightPhraseEnergyById(phrases, scoreEndBar);
  const silentSpans = barSpansOf(silentBars, input.barStart, input.barEnd);
  const busy = new Map<string, BusySpan[]>();
  const placements: Phase2EventPlan[] = [];
  const rejected: Phase2DistributionReceipt['rejected'] = [];
  const decisions: Phase2DistributionReceipt['decisions'] = [];
  const silenceRows: Phase2Plan['silence'] = [];
  const omissions: Phase2Plan['omissions'] = [];
  const warnings: string[] = [];
  const foreground: Record<string, string> = {};
  const handovers: Record<string, boolean> = {};
  const answers: Phase2Plan['answers'] = [];
  const derivedLines: Phase2Plan['derivedLines'] = [];
  const covered = new Map<string, number>();
  const remember = (partId: string, count: number) => covered.set(partId, (covered.get(partId) ?? 0) + count);

  const melodyAll = notes.filter((note) => note.role === 'melody');
  const openingMelody = melodyAll.filter((note) => {
    const phrase = phrases[0];
    return phrase && note.bar >= phrase.startBar && note.bar <= phrase.endBar;
  });
  const openingCentre = average(openingMelody.length ? openingMelody : melodyAll);
  let carrierFamily = openingFamily(openingCentre, settings);
  let runQuarters = 0;
  let runPart: string | null = null;
  const endurance: Phase2DistributionReceipt['endurance'] = [];
  let previousPlanFamily: 'woodwind' | 'brass' | 'strings' | null = null;
  let openingPlanFamily: 'woodwind' | 'brass' | 'strings' | null = null;
  const plans: SymphonicPhrasePlan[] = [];
  let answerOpenUntil = -1;
  let independentAnswers = 0;
  const rescueDialogueAnswered = new Set<string>();
  const rescueDialogueOpByPhrase = new Map<string, OperatorId>();
  let priorPhraseMelodyCarrier: string | null = null;
  let priorPhraseSupportCarrier: string | null = null;
  let priorPhraseBassCarrier: string | null = null;
  const bassNotes = notes.filter((note) => note.role === 'bass');
  const layeredPhrase = phrases.find((phrase) => {
    const eRow = fortyEightEnergy?.get(phrase.id);
    if (eRow && (eRow.energy === 'peak' || eRow.energy === 'high')) return true;
    const local = melodyAll.filter((note) => note.bar >= phrase.startBar && note.bar <= phrase.endBar);
    const counter = notes.filter((note) => note.role === 'countermelody' && note.bar >= phrase.startBar && note.bar <= phrase.endBar);
    const silent = [...Array(phrase.endBar - phrase.startBar + 1).keys()].every((offset) => silentBars.has(phrase.startBar + offset));
    return textureFor(phrase, local, counter, openingCentre, silent, scoreEndBar) === 'layered';
  });

  const heldInstrument = (note: Phase2SourceNote): string | null => {
    if (!note.tieStop) return null;
    const prior = notes
      .filter((item) => item.tieStart && item.role === note.role && Math.abs(item.onset + item.duration - note.onset) < 1e-3)
      .sort((a, b) => b.onset - a.onset)[0];
    if (!prior) return null;
    return placements.find((item) => item.eventId === prior.id && item.classifies)?.partId ?? null;
  };

  const pushPlacement = (item: Phase2EventPlan, spans: BusySpan[]): void => {
    placements.push(item);
    for (const span of spans) occupy(busy, item.partId, span.start, span.end);
    remember(item.partId, 1);
  };

  for (const phrase of phrases) {
    const localMelody = melodyAll.filter((note) => note.bar >= phrase.startBar && note.bar <= phrase.endBar);
    const localCounter = notes.filter((note) => note.role === 'countermelody' && note.bar >= phrase.startBar && note.bar <= phrase.endBar);
    const localBass = bassNotes.filter((note) => note.bar >= phrase.startBar && note.bar <= phrase.endBar);
    const localHarmony = notes.filter((note) => (note.role === 'harmonic_support' || note.role === 'rhythmic_figure') && note.bar >= phrase.startBar && note.bar <= phrase.endBar);
    const allSilent = [...Array(phrase.endBar - phrase.startBar + 1).keys()].every((offset) => silentBars.has(phrase.startBar + offset));
    const eRow = fortyEightEnergy?.get(phrase.id);
    let texture = textureFor(phrase, localMelody, localCounter, openingCentre, allSilent, scoreEndBar);
    if (eRow && !allSilent && localMelody.length) {
      if (eRow.density === 'sparse') {
        texture = eRow.thematicRole === 'coda' || isSymphonicScoreEnding(phrase.endBar, scoreEndBar) ? 'sparse-return' : 'solo';
      } else if (eRow.density === 'medium') {
        texture = shortRatio(localMelody) >= 0.5 ? 'subgroup' : 'sustained-colour';
      } else {
        texture = localCounter.length >= 4 ? 'dialogue' : 'layered';
      }
    }
    const centre = average(localMelody);
    const register = registerOf(centre || openingCentre);
    const activity = shortRatio(localMelody) >= 0.5 ? 'rhythmic' : localCounter.length ? 'dialogue' : 'sustained';
    const melodyParts: string[] = [];
    let handoverAt: number | null = null;
    let phraseMelodyCarrier: string | null = null;
    let phraseMelodyShift = 0;

    if (allSilent || texture === 'silence') {
      silenceRows.push({ bar: phrase.startBar, reason: `${phrase.id} stays empty. The source phrase has no sounding attack, or the bar is protected silence.` });
      decisions.push({
        phraseId: phrase.id,
        sourceLineage: 'source-silence',
        role: 'silence',
        instrument: '',
        span: { startBar: phrase.startBar, endBar: phrase.endBar },
        register,
        activity: 'silent',
        handoverAt: null,
        texture: 'silence',
        reason: 'Protected or empty source span. An empty staff is not filled.',
      });
      foreground[phrase.id] = runPart ?? 'vn1';
      handovers[phrase.id] = false;
      plans.push(emptyPlan(phrase, register, previousPlanFamily));
      continue;
    }

    if (eRow && localMelody.length) {
      const spans = localMelody.map((note) => ({ start: note.onset, end: note.onset + note.duration }));
      const ids = eRow.thematicRole === 'intro'
        ? introMelodyPartIds(settings, register)
        : orderedPhraseMelodyParts(register, eRow.energy, settings, priorPhraseMelodyCarrier);
      const phraseChoice = pickPart(
        parts,
        ids,
        localMelody.map((note) => note.midi),
        busy,
        spans,
        new Set(),
        localMelody.some((note) => note.locked),
        settings,
      ) ?? pickPart(
        parts,
        [...pools('strings', register), ...pools('woodwind', register)],
        localMelody.map((note) => note.midi),
        busy,
        spans,
        new Set(),
        localMelody.some((note) => note.locked),
        settings,
      );
      if (phraseChoice) {
        phraseMelodyCarrier = phraseChoice.partId;
        phraseMelodyShift = phraseChoice.shift;
        if (priorPhraseMelodyCarrier && phraseMelodyCarrier !== priorPhraseMelodyCarrier) {
          handoverAt = localMelody[0]!.onset;
        }
      }
    }

    for (const note of localMelody) {
      const held = heldInstrument(note);
      const familyNow = carrierFamily === 'brass' && settings.families.brass === 'off' ? 'strings' : carrierFamily;
      const partner = partnerFamily(familyNow === 'brass' ? 'woodwind' : familyNow);
      const partnerOpen = settings.families[partner] !== 'off';
      const continuing = runPart !== null && familyOf(runPart) === familyNow;
      if (!eRow && !held && continuing && runQuarters >= WIND_RUN_LIMIT && partnerOpen) {
        carrierFamily = partner;
        if (handoverAt === null) handoverAt = note.onset;
        runQuarters = 0;
        runPart = null;
      }
      const chosenFamily = carrierFamily === 'brass' ? 'brass' : carrierFamily;
      const locked = note.locked;
      const choice = held
        ? pickPart(parts, [held], [note.midi], busy, [{ start: note.onset, end: note.onset + note.duration }], new Set(), locked, settings)
        : eRow && phraseMelodyCarrier
        ? pickPart(
          parts,
          [phraseMelodyCarrier],
          [note.midi],
          busy,
          [{ start: note.onset, end: note.onset + note.duration }],
          new Set(),
          locked,
          settings,
        ) ?? { partId: phraseMelodyCarrier, shift: phraseMelodyShift }
        : pickPart(
        parts,
        pools(chosenFamily === 'brass' ? 'brass' : chosenFamily, register, settings),
        [note.midi],
        busy,
        [{ start: note.onset, end: note.onset + note.duration }],
        new Set(runPart ? [] : []),
        locked,
        settings,
      ) ?? pickPart(
        parts,
        [...pools('strings', register), ...pools('woodwind', register), ...pools('brass', register, settings)],
        [note.midi],
        busy,
        [{ start: note.onset, end: note.onset + note.duration }],
        new Set(),
        locked,
        settings,
      );
      if (!choice) {
        if (locked) return { ok: false, error: `Locked melody ${note.id} has no instrument at the sounding pitch.` };
        omissions.push({ eventId: note.id, reason: 'No legal melody instrument at a permitted octave.' });
        continue;
      }
      if (runPart && choice.partId !== runPart && handoverAt === null) handoverAt = note.onset;
      pushPlacement({
        kind: 'source',
        eventId: note.id,
        partId: choice.partId,
        shift: choice.shift,
        phraseId: phrase.id,
        role: 'primary-melody',
        transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
        lineage: note.id,
        reason: choice.shift === 0
          ? 'Primary melody keeps the sounding pitch. The instrument follows the current wind or string span.'
          : 'Unlocked melody moved by octave so the chosen instrument could hold it.',
        onset: note.onset,
        duration: note.duration,
        midi: note.midi + choice.shift,
        voice: 1,
        classifies: true,
      }, [{ start: note.onset, end: note.onset + note.duration }]);
      melodyParts.push(choice.partId);
      const placedFamily = familyOf(choice.partId);
      if (placedFamily === 'woodwind' || placedFamily === 'brass') {
        if (runPart === choice.partId) runQuarters += note.duration;
        else runQuarters = note.duration;
      } else {
        runQuarters = runPart === choice.partId ? runQuarters + note.duration : note.duration;
      }
      runPart = choice.partId;
      carrierFamily = placedFamily === 'woodwind' || placedFamily === 'strings' || placedFamily === 'brass' ? placedFamily : carrierFamily;
    }

    if (runPart && (familyOf(runPart) === 'woodwind' || familyOf(runPart) === 'brass') && runQuarters > 8 && settings.families[partnerFamily(carrierFamily === 'brass' ? 'woodwind' : carrierFamily)] === 'off') {
      endurance.push({
        instrument: runPart,
        quarters: Math.round(runQuarters),
        reason: 'No legal handover. The partner family is off, so the source notes stay and the endurance limit is reported.',
      });
      warnings.push(`Wind endurance heuristic: ${runPart} sounds ${Math.round(runQuarters)} quarters without a rest. This is not player approval.`);
    }

    const counterFamily = (partId: string): 'woodwind' | 'strings' => (familyOf(partId) === 'woodwind' ? 'strings' : 'woodwind');
    for (const note of localCounter) {
      const held = heldInstrument(note);
      const melodyHere = localMelody.find((item) => item.onset < note.onset + note.duration - 1e-6 && note.onset < item.onset + item.duration - 1e-6);
      const melodyPart = melodyHere ? placements.find((item) => item.eventId === melodyHere.id && item.role === 'primary-melody')?.partId : melodyParts[0];
      const preferred = melodyPart ? counterFamily(melodyPart) : 'strings';
      const counterIds = eRow
        ? orderedPhraseSupportParts(eRow, register, settings, melodyPart ?? null, null).slice(0, 4)
        : preferred === 'strings' ? ['va', 'vc', 'vn2'] : ['cl1', 'ca', 'ob2', 'bn1'];
      const choice = pickPart(
        parts,
        held ? [held] : counterIds,
        [note.midi],
        busy,
        [{ start: note.onset, end: note.onset + note.duration }],
        new Set(melodyPart ? [melodyPart] : []),
        note.locked,
        settings,
      );
      if (!choice) {
        if (note.locked) return { ok: false, error: `Locked countermelody ${note.id} has no instrument at the sounding pitch.` };
        omissions.push({ eventId: note.id, reason: 'Countermelody had no free instrument in range.' });
        continue;
      }
      pushPlacement({
        kind: 'source',
        eventId: note.id,
        partId: choice.partId,
        shift: choice.shift,
        phraseId: phrase.id,
        role: 'countermelody',
        transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
        lineage: note.id,
        reason: 'Preserved source countermelody, placed against the melody family so the lines do not share one instrument.',
        onset: note.onset,
        duration: note.duration,
        midi: note.midi + choice.shift,
        voice: 1,
        classifies: true,
      }, [{ start: note.onset, end: note.onset + note.duration }]);
    }

    const bassOnCello = layeredPhrase?.id === phrase.id || (eRow?.energy === 'peak' || eRow?.energy === 'high');
    const noErowBassBase = bassOnCello ? ['vc', 'db', 'bn1', 'tba'] : ['db', 'vc', 'bn1', 'tba'];
    const noErowBassIds =
      settings.families.brass !== 'off' && (settings.families.strings === 'off' || settings.foreground === 'brass')
        ? [...noErowBassBase.slice(0, -1), 'tbn1', noErowBassBase[noErowBassBase.length - 1]!]
        : noErowBassBase;
    const phraseBassIds = eRow
      ? orderedPhraseBassParts(eRow, settings, priorPhraseBassCarrier)
      : noErowBassIds;
    let phraseBassCarrier: string | null = null;
    for (const note of localBass) {
      const held = heldInstrument(note);
      const ids = held ? [held] : phraseBassIds;
      if (!held) {
        const derivedBass = tryDerivedAccompaniment({
          note,
          phrase,
          notes,
          parts,
          busy,
          settings,
          mode,
          silentSpans,
          partIds: ids,
          avoid: new Set(),
          role: 'bass-foundation',
          barStart: input.barStart,
          barEnd: input.barEnd,
          scoreEndBar,
        });
        if (derivedBass?.length) {
          for (const item of derivedBass) {
            pushPlacement(item, [{ start: item.onset, end: item.onset + item.duration }]);
          }
          derivedLines.push({
            partId: derivedBass[0]!.partId,
            lineageId: derivedBass[0]!.lineage,
            ops: [derivedBass[0]!.op ?? 'derived'],
            events: derivedBass.map((item) => ({ sounding: item.midi, duration: item.duration, onset: item.onset })),
          });
          omissions.push({ eventId: note.id, reason: 'Unlocked bass replaced by a derived accompaniment gesture.' });
          continue;
        }
      }
      const choice = pickPart(parts, ids, [note.midi], busy, [{ start: note.onset, end: note.onset + note.duration }], new Set(), note.locked, settings);
      if (!choice) {
        if (note.locked) return { ok: false, error: `Locked bass ${note.id} has no instrument at the sounding pitch.` };
        omissions.push({ eventId: note.id, reason: 'Bass had no free instrument in range.' });
        continue;
      }
      pushPlacement({
        kind: 'source',
        eventId: note.id,
        partId: choice.partId,
        shift: choice.shift,
        phraseId: phrase.id,
        role: 'bass-foundation',
        transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
        lineage: note.id,
        reason: held
          ? 'Tied bass stays on the instrument that started the tie.'
          : bassOnCello && choice.partId === 'vc'
          ? 'Cello takes this phrase of the source bass so the lower strings carry a real line.'
          : 'Bass foundation keeps the source bass.',
        onset: note.onset,
        duration: note.duration,
        midi: note.midi + choice.shift,
        voice: 1,
        classifies: true,
      }, [{ start: note.onset, end: note.onset + note.duration }]);
      phraseBassCarrier = choice.partId;
    }
    if (phraseBassCarrier) priorPhraseBassCarrier = phraseBassCarrier;

    const supportPartIds = eRow
      ? orderedPhraseSupportParts(eRow, register, settings, phraseMelodyCarrier ?? melodyParts[0] ?? null, priorPhraseSupportCarrier)
      : ['va', 'vn2', 'cl2', 'hn1', 'bn1'];
    let phraseSupportCarrier: string | null = null;
    const dropInner = eRow
      ? eRow.density === 'sparse' || (eRow.density === 'medium' && texture === 'subgroup')
      : texture === 'sparse-return' || texture === 'subgroup' || isSymphonicScoreEnding(phrase.endBar, scoreEndBar);
    const skipInnerColour = eRow?.thematicRole === 'intro';
    const inRescueDialogue = rescueDialoguePhrase(phrase.id, scoreEndBar);
    let rescueDialogueWindow: { start: number; end: number } | null = null;
    if (inRescueDialogue && !rescueDialogueAnswered.has(phrase.id)) {
      const excludeOps = phrase.id === 'a_prime' && rescueDialogueOpByPhrase.has('a')
        ? [rescueDialogueOpByPhrase.get('a')!]
        : [];
      const built = buildAnswer(
        phrase,
        localMelody,
        notes,
        parts,
        busy,
        settings,
        seed,
        silentSpans,
        covered,
        { placement: 'tail', excludeOps, doublingMelody: primaryMelodyDoublingReference(melodyAll, placements) },
      );
      if (built.ok) {
        for (const item of built.events) {
          pushPlacement(item, [{ start: item.onset, end: item.onset + item.duration }]);
        }
        answers.push({ phraseId: phrase.id, operator: built.op, partId: built.partId, notes: built.events.length });
        derivedLines.push({
          partId: built.partId,
          lineageId: `${phrase.id}.${built.op}`,
          ops: [built.op],
          events: built.events.map((item) => ({ sounding: item.midi, duration: item.duration, onset: item.onset })),
        });
        rescueDialogueAnswered.add(phrase.id);
        rescueDialogueOpByPhrase.set(phrase.id, built.op);
        phraseSupportCarrier = built.partId;
        rejected.push(...built.rejected);
        const answerOnsets = built.events.map((item) => item.onset);
        const answerEnds = built.events.map((item) => item.onset + item.duration);
        rescueDialogueWindow = { start: Math.min(...answerOnsets), end: Math.max(...answerEnds) };
      } else {
        rejected.push(...built.rejected);
      }
    }
    const overlapsRescueDialogueWindow = (note: Phase2SourceNote): boolean => {
      if (!rescueDialogueWindow) return false;
      const noteEnd = note.onset + note.duration;
      return note.onset < rescueDialogueWindow.end - 1e-6 && noteEnd > rescueDialogueWindow.start + 1e-6;
    };
    const melodyPartsAvoidingHarmonySegment = (segment: { onset: number; duration: number }): Set<string> => {
      const avoid = new Set<string>();
      const end = segment.onset + segment.duration;
      for (const mel of localMelody) {
        const melEnd = mel.onset + mel.duration;
        if (mel.onset >= end - 1e-6 || melEnd <= segment.onset + 1e-6) continue;
        const partId = placements.find((item) => item.eventId === mel.id && item.role === 'primary-melody')?.partId;
        if (partId) avoid.add(partId);
      }
      return avoid;
    };
    for (const note of localHarmony) {
      if (skipInnerColour && !note.locked) {
        omissions.push({ eventId: note.id, reason: 'Intro exposure keeps inner colour silent so the opening line stays audible.' });
        continue;
      }
      const dialogueOverlap =
        rescueDialogueWindow
        && !note.locked
        && isEditableGesture(note)
        && overlapsRescueDialogueWindow(note);
      const harmonySegments = rescueDialogueHarmonySegments(note, dialogueOverlap ? rescueDialogueWindow : null);
      if (dialogueOverlap) {
        if (!harmonySegments.length) {
          omissions.push({
            eventId: note.id,
            reason: 'Editable inner colour in the dialogue response window replaced by a motif-derived answer.',
          });
          continue;
        }
        omissions.push({
          eventId: note.id,
          reason: 'Editable inner colour overlapping the dialogue window: exterior segments keep source placement; interior cleared for the answer.',
        });
      }
      if (dropInner && !inRescueDialogue && !note.locked) {
        omissions.push({ eventId: note.id, reason: texture === 'sparse-return' || isSymphonicScoreEnding(phrase.endBar, scoreEndBar) ? 'Sparse return or ending. Inner colour rests.' : 'Subgroup texture. Inner chord tones rest.' });
        continue;
      }
      const derivedInner = tryDerivedAccompaniment({
        note,
        phrase,
        notes,
        parts,
        busy,
        settings,
        mode,
        silentSpans,
        partIds: supportPartIds,
        avoid: new Set(melodyParts),
        role: note.role === 'rhythmic_figure' ? 'rhythmic-punctuation' : 'sustained-colour',
        barStart: input.barStart,
        barEnd: input.barEnd,
        scoreEndBar,
      });
      if (derivedInner?.length) {
        for (const item of derivedInner) {
          pushPlacement(item, [{ start: item.onset, end: item.onset + item.duration }]);
          phraseSupportCarrier = item.partId;
        }
        derivedLines.push({
          partId: derivedInner[0]!.partId,
          lineageId: derivedInner[0]!.lineage,
          ops: [derivedInner[0]!.op ?? 'derived'],
          events: derivedInner.map((item) => ({ sounding: item.midi, duration: item.duration, onset: item.onset })),
        });
        omissions.push({ eventId: note.id, reason: 'Unlocked inner colour replaced by a derived accompaniment gesture.' });
        continue;
      }
      for (const segment of harmonySegments) {
        const harmonyAvoid = melodyPartsAvoidingHarmonySegment(segment);
        let choice = pickPart(
          parts,
          supportPartIds,
          [note.midi],
          busy,
          [{ start: segment.onset, end: segment.onset + segment.duration }],
          harmonyAvoid,
          note.locked,
          settings,
        );
        if (!choice && note.locked) {
          const lockedFallback = [
            ...supportPartIds,
            ...pools('brass', register),
            ...pools('woodwind', register),
            ...pools('strings', register),
            'hp',
          ].filter((id, index, list) => list.indexOf(id) === index && activityOf(id, settings) !== 'off');
          choice = pickPart(
            parts,
            lockedFallback,
            [note.midi],
            busy,
            [{ start: segment.onset, end: segment.onset + segment.duration }],
            harmonyAvoid,
            true,
            settings,
          );
        }
        if (!choice) {
          if (note.locked) return { ok: false, error: `Locked inner event ${note.id} has no instrument at the sounding pitch.` };
          omissions.push({ eventId: note.id, reason: 'Inner colour had no free instrument in range.' });
          continue;
        }
        pushPlacement({
          kind: 'source',
          eventId: note.id,
          partId: choice.partId,
          shift: choice.shift,
          phraseId: phrase.id,
          role: note.role === 'rhythmic_figure' ? 'rhythmic-punctuation' : 'sustained-colour',
          transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
          lineage: note.id,
          reason: segment.onset !== note.onset || segment.duration !== note.duration
            ? 'Source inner colour outside the dialogue window keeps Rescue placement on the surviving segment.'
            : 'Source inner notes move as colour. They are not a new chord and not a second melody.',
          onset: segment.onset,
          duration: segment.duration,
          midi: note.midi + choice.shift,
          voice: 1,
          classifies: true,
        }, [{ start: segment.onset, end: segment.onset + segment.duration }]);
        phraseSupportCarrier = choice.partId;
      }
    }

    if (phraseSupportCarrier) priorPhraseSupportCarrier = phraseSupportCarrier;

    const energyAllowsAnswer = !eRow || eRow.energy === 'high' || eRow.energy === 'peak';
    const canAnswer = mode === 'developing'
      && settings.counterline === 'when-source-allows'
      && energyAllowsAnswer
      && (texture === 'layered' || texture === 'dialogue' || (texture === 'subgroup' && scoreEndBar >= SYMPHONIC_EXTENDED_SCORE_END_BAR))
      && !isSymphonicScoreEnding(phrase.endBar, scoreEndBar)
      && localMelody.length >= 3
      && phrase.start >= answerOpenUntil - 1e-6
      && eRow?.thematicRole !== 'coda';
    if (canAnswer && independentAnswers < 1 && !rescueDialoguePhrase(phrase.id, scoreEndBar)) {
      const built = buildAnswer(phrase, localMelody, notes, parts, busy, settings, seed, silentSpans, covered, {
        doublingMelody: primaryMelodyDoublingReference(melodyAll, placements),
      });
      if (built.ok) {
        for (const item of built.events) {
          pushPlacement(item, [{ start: item.onset, end: item.onset + item.duration }]);
        }
        answers.push({ phraseId: phrase.id, operator: built.op, partId: built.partId, notes: built.events.length });
        derivedLines.push({
          partId: built.partId,
          lineageId: `${phrase.id}.${built.op}`,
          ops: [built.op],
          events: built.events.map((item) => ({ sounding: item.midi, duration: item.duration, onset: item.onset })),
        });
        answerOpenUntil = Math.max(...built.events.map((item) => item.onset + item.duration));
        independentAnswers += 1;
        rejected.push(...built.rejected);
      } else {
        rejected.push(...built.rejected);
        silenceRows.push({ bar: phrase.startBar, reason: `${phrase.id}: no independent answer survived the doubling, silence, and sonority checks.` });
      }
    } else if (texture === 'layered' && mode !== 'developing') {
      rejected.push({ phraseId: phrase.id, candidate: 'independent-answer', reason: 'Faithful mode redistributes source lines and does not add counterpoint.' });
    } else if (texture === 'layered' && independentAnswers >= 1) {
      rejected.push({ phraseId: phrase.id, candidate: 'independent-answer', reason: 'One newly composed answer is already in the piece. Another was not added.' });
    }

    const allowBrassDoubling = !eRow || eRow.energy === 'high' || eRow.energy === 'peak';
    if (allowBrassDoubling && texture === 'layered' && settings.families.brass !== 'off' && shortRatio(localMelody) >= 0.5) {
      const head = localMelody.slice(0, 4);
      const trumpet = pickPart(parts, ['tp1', 'tp2'], head.map((note) => note.midi), busy, head.map((note) => ({ start: note.onset, end: note.onset + note.duration })), new Set(melodyParts), false, settings);
      if (trumpet && head.length >= 2) {
        for (const note of head) {
          pushPlacement({
            kind: 'source',
            eventId: note.id,
            partId: trumpet.partId,
            shift: trumpet.shift,
            phraseId: phrase.id,
            role: 'melodic-reinforcement',
            transformation: trumpet.shift === 0 ? 'unison-reinforcement' : 'octave-reinforcement',
            lineage: `${note.id}:reinforcement`,
            reason: 'Trumpet states the rhythmic head with the source. This is emphasis, not a second theme.',
            onset: note.onset,
            duration: note.duration,
            midi: note.midi + trumpet.shift,
            voice: 1,
            classifies: false,
          }, [{ start: note.onset, end: note.onset + note.duration }]);
        }
      } else {
        rejected.push({ phraseId: phrase.id, candidate: 'tp1', reason: 'Trumpet emphasis did not fit without colliding or leaving the range.' });
      }
      const hornSource = localMelody.slice(0, 3);
      const horn = pickPart(parts, ['hn1', 'hn2'], hornSource.map((note) => note.midi), busy, hornSource.map((note) => ({ start: note.onset, end: note.onset + note.duration })), new Set([...melodyParts, 'tp1']), false, settings);
      if (horn && hornSource.length >= 2) {
        for (const note of hornSource) {
          pushPlacement({
            kind: 'source',
            eventId: note.id,
            partId: horn.partId,
            shift: horn.shift,
            phraseId: phrase.id,
            role: 'sustained-colour',
            transformation: horn.shift === 0 ? 'unison-reinforcement' : 'octave-reinforcement',
            lineage: `${note.id}:horn-colour`,
            reason: 'Horn colours the rhythmic head. Octave displacement, when needed, stays reinforcement.',
            onset: note.onset,
            duration: note.duration,
            midi: note.midi + horn.shift,
            voice: 1,
            classifies: false,
          }, [{ start: note.onset, end: note.onset + note.duration }]);
        }
      }
      const weight = localBass[0];
      if (weight) {
        const tuba = pickPart(parts, ['tba', 'tbn1'], [weight.midi], busy, [{ start: weight.onset, end: weight.onset + Math.min(weight.duration, 2) }], new Set(), true, settings);
        if (tuba) {
          const duration = Math.min(weight.duration, 2);
          pushPlacement({
            kind: 'derived',
            eventId: `${phrase.id}-brass-weight`,
            partId: tuba.partId,
            shift: 0,
            phraseId: phrase.id,
            role: 'bass-foundation',
            transformation: 'unison-reinforcement',
            lineage: `${weight.id}:low-brass`,
            reason: 'Low brass reinforces one bass attack. It does not replace the bass line.',
            onset: weight.onset,
            duration,
            midi: weight.midi,
            voice: 1,
            classifies: false,
            op: 'bass-weight',
          }, [{ start: weight.onset, end: weight.onset + duration }]);
        }
      }
    } else if (settings.families.brass === 'off') {
      decisions.push({
        phraseId: phrase.id,
        sourceLineage: 'family-gate',
        role: 'silence',
        instrument: 'brass',
        span: { startBar: phrase.startBar, endBar: phrase.endBar },
        register,
        activity,
        handoverAt: null,
        texture,
        reason: 'Brass family is off. No brass notes were written.',
      });
    }

    foreground[phrase.id] = phraseMelodyCarrier ?? melodyParts[0] ?? runPart ?? 'vn1';
    const phraseHandover = priorPhraseMelodyCarrier !== null
      && phraseMelodyCarrier !== null
      && phraseMelodyCarrier !== priorPhraseMelodyCarrier;
    handovers[phrase.id] = phraseHandover || handoverAt !== null;
    if (phraseMelodyCarrier) priorPhraseMelodyCarrier = phraseMelodyCarrier;
    const planFamily = (familyOf(foreground[phrase.id]!) === 'brass' || familyOf(foreground[phrase.id]!) === 'woodwind' || familyOf(foreground[phrase.id]!) === 'strings'
      ? familyOf(foreground[phrase.id]!)!
      : 'strings') as 'woodwind' | 'brass' | 'strings';
    plans.push({
      phraseId: phrase.id,
      startBar: phrase.startBar,
      endBar: phrase.endBar,
      kind: phrase.kind,
      foregroundFamily: planFamily,
      foregroundIds: [...new Set(melodyParts)],
      supportIds: [...new Set(placements.filter((item) => item.phraseId === phrase.id && (item.role === 'sustained-colour' || item.role === 'countermelody')).map((item) => item.partId))],
      bassIds: [...new Set(placements.filter((item) => item.phraseId === phrase.id && item.role === 'bass-foundation').map((item) => item.partId))],
      counterline: answers.some((item) => item.phraseId === phrase.id) ? 'offer' : 'silence',
      answerIds: answers.filter((item) => item.phraseId === phrase.id).map((item) => item.partId),
      register,
      dynamic: isSymphonicScoreEnding(phrase.endBar, scoreEndBar) ? 'mp' : phrase.kind === 'statement' ? 'p' : 'mf',
      doubling: placements.some((item) => item.phraseId === phrase.id && item.role === 'melodic-reinforcement'),
      harp: false,
      timpani: false,
      percussion: 'none',
      previousFamily: previousPlanFamily,
    });
    decisions.push({
      phraseId: phrase.id,
      sourceLineage: localMelody[0]?.id ?? phrase.id,
      role: 'primary-melody',
      instrument: foreground[phrase.id] ?? '',
      span: { startBar: phrase.startBar, endBar: phrase.endBar },
      register,
      activity,
      handoverAt,
      texture,
      reason: eRow
        ? `${texture} from section energy ${eRow.energy} (${eRow.density}), phrase function ${phrase.kind}, register ${register}. Melody stays on one carrier per phrase; handover at the phrase boundary when range-compatible.`
        : `${texture} from register ${register}, phrase function ${phrase.kind}, and rhythmic activity ${activity}. Handover follows wind duration, not a bar grid.`,
    });
    previousPlanFamily = planFamily;
    if (!openingPlanFamily) openingPlanFamily = planFamily;
  }

  const pedal = new Map<number, number>();
  for (const note of notes) {
    const names = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
    const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
    const pc = pcOf(note.midi);
    const alter = alters[pc] ?? 0;
    const prior = pedal.get(pc);
    if (prior === undefined) pedal.set(pc, alter);
    else if (prior !== alter) pedal.set(pc, 99);
  }
  const harpPedal = [...pedal.entries()].filter((entry) => entry[1] !== 99).map(([pc, alter]) => `${namesSafe(pc)}:${alter}`).join(' ');
  if ([...pedal.values()].includes(99)) warnings.push('Harp pedal cannot hold two spellings of one pitch class. Conflicting harp notes rest.');
  const harpCap = settings.families.harp === 'off' ? 0 : settings.families.harp === 'limited' ? 4 : 8;
  let harpCount = 0;
  const harp = parts.find((part) => part.partId === 'hp');
  if (harp && harpCap > 0) {
    const colour = notes.filter((note) => note.role === 'harmonic_support' && pedal.get(pcOf(note.midi)) !== 99 && note.midi >= HARP_RANGE[0] && note.midi <= HARP_RANGE[1]);
    for (const note of colour) {
      if (harpCount >= harpCap) break;
      const phrase = phrases.find((item) => note.bar >= item.startBar && note.bar <= item.endBar);
      if (!phrase || isSymphonicScoreEnding(phrase.endBar, scoreEndBar)) continue;
      const harpRow = fortyEightEnergy?.get(phrase.id);
      if (harpRow && harpRow.thematicRole !== 'transformed_return') continue;
      const span = { start: note.onset, end: note.onset + note.duration };
      if (overlaps(span.start, span.end, busy.get('hp') ?? []) || hitsSilence(note.onset, note.duration, silentSpans)) continue;
      pushPlacement({
        kind: 'source',
        eventId: note.id,
        partId: 'hp',
        shift: 0,
        phraseId: phrase.id,
        role: 'sustained-colour',
        transformation: 'preserved-source',
        lineage: `${note.id}:harp`,
        reason: 'Harp colours an existing inner pitch at its source onset. No new arpeggio rhythm was invented.',
        onset: note.onset,
        duration: note.duration,
        midi: note.midi,
        voice: note.midi >= 60 ? 1 : 3,
        classifies: false,
      }, [span]);
      harpCount += 1;
      const plan = plans.find((item) => item.phraseId === phrase.id);
      if (plan) plan.harp = true;
    }
  }

  const timpaniTuning: number[] = [];
  for (const note of bassNotes) {
    const folded = foldIntoRange(note.midi, TIMPANI_RANGE);
    if (folded === null || timpaniTuning.includes(folded)) continue;
    timpaniTuning.push(folded);
    if (timpaniTuning.length === 4) break;
  }
  if (settings.families.percussion !== 'off' && timpaniTuning.length && layeredPhrase) {
    const row = bassNotes.find((note) => note.bar >= layeredPhrase.startBar && note.bar <= layeredPhrase.endBar);
    const folded = row ? foldIntoRange(row.midi, TIMPANI_RANGE) : null;
    if (row && folded !== null && timpaniTuning.includes(folded) && !hitsSilence(row.onset, Math.min(row.duration, 2), silentSpans)) {
      const duration = Math.min(row.duration, 2);
      if (!overlaps(row.onset, row.onset + duration, busy.get('timp') ?? [])) {
        pushPlacement({
          kind: 'derived',
          eventId: `${layeredPhrase.id}-timp`,
          partId: 'timp',
          shift: 0,
          phraseId: layeredPhrase.id,
          role: 'rhythmic-punctuation',
          transformation: 'timpani-tuning',
          lineage: `${row.id}:timpani`,
          reason: `Timpani plays a declared tuning ${folded} taken from the bass. No retune.`,
          onset: row.onset,
          duration,
          midi: folded,
          voice: 1,
          classifies: false,
          op: 'timpani-tuning',
        }, [{ start: row.onset, end: row.onset + duration }]);
        const plan = plans.find((item) => item.phraseId === layeredPhrase.id);
        if (plan) plan.timpani = true;
      }
    }
  }

  const percussive = phrases.filter((phrase) => shortRatio(melodyAll.filter((note) => note.bar >= phrase.startBar && note.bar <= phrase.endBar)) >= 0.5 && !isSymphonicScoreEnding(phrase.endBar, scoreEndBar));
  const percBudget = settings.families.percussion === 'off' ? 0 : settings.families.percussion === 'limited' ? 1 : 2;
  let percUsed = 0;
  for (const phrase of percussive) {
    if (percUsed >= percBudget) break;
    const local = melodyAll.filter((note) => note.bar >= phrase.startBar && note.bar <= phrase.endBar && !silentBars.has(note.bar));
    const offbeat = local.find((note) => {
      const barStart = input.barStart(note.bar);
      return note.onset - barStart > 0.2;
    });
    if (!offbeat) {
      rejected.push({ phraseId: phrase.id, candidate: 'percussion', reason: 'Only bar-downbeat attacks were available. No automatic accent was added.' });
      continue;
    }
    const gm = percUsed === 0 ? BASS_DRUM_GM : SUSPENDED_CYMBAL_GM;
    const label = percUsed === 0 ? 'bass-drum' : 'cymbal';
    const duration = Math.min(offbeat.duration, 1);
    if (hitsSilence(offbeat.onset, duration, silentSpans) || overlaps(offbeat.onset, offbeat.onset + duration, busy.get('perc') ?? [])) continue;
    pushPlacement({
      kind: 'derived',
      eventId: `${phrase.id}-${label}`,
      partId: 'perc',
      shift: 0,
      phraseId: phrase.id,
      role: 'rhythmic-punctuation',
      transformation: label,
      lineage: `${offbeat.id}:${label}`,
      reason: `${label} marks one offbeat source attack. It is not a drum-kit pattern.`,
      onset: offbeat.onset,
      duration,
      midi: gm,
      voice: 1,
      classifies: false,
      op: label,
    }, [{ start: offbeat.onset, end: offbeat.onset + duration }]);
    const plan = plans.find((item) => item.phraseId === phrase.id);
    if (plan) plan.percussion = label;
    percUsed += 1;
  }

  for (const bar of silentBars) {
    if (!silenceRows.some((row) => row.bar === bar)) silenceRows.push({ bar, reason: 'Source bar has no sounding attack. The rest stays empty.' });
  }

  const partById = new Map(parts.map((part) => [part.partId, part]));
  const events = placements.map((item) => {
    const part = partById.get(item.partId);
    const written = part ? spellWritten(part, item.midi) : { step: 'C', alter: 0, octave: 0, midi: item.midi };
    return {
      lineage: item.lineage,
      role: item.role,
      instrument: item.partId,
      phraseId: item.phraseId,
      onset: item.onset,
      duration: item.duration,
      written,
      sounding: item.midi,
      transformation: item.transformation,
    };
  });

  return {
    ok: true,
    plan: {
      placements,
      plans,
      foreground,
      handovers,
      answers,
      derivedLines,
      silence: silenceRows,
      omissions,
      warnings,
      timpaniTuning,
      harpPedal,
      distribution: {
        allocation: 'phase-2',
        decisions,
        events,
        silence: [
          ...silenceRows.map((row) => ({ bar: row.bar, reason: row.reason })),
          ...decisions.filter((item) => item.role === 'silence').map((item) => ({ instrument: item.instrument, role: 'silence', reason: item.reason })),
        ],
        rejected,
        endurance,
      },
    },
  };
}

function namesSafe(pc: number): string {
  return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pc] ?? 'C';
}

function quantizeAnswerTiming(onset: number, duration: number): { onset: number; duration: number } {
  const qOnset = Math.round(onset * 4) / 4;
  const qDuration = Math.max(0.25, Math.round(duration * 4) / 4);
  return { onset: qOnset, duration: qDuration };
}

function emptyPlan(phrase: Phase2Phrase, register: 'high' | 'middle' | 'low', previous: 'woodwind' | 'brass' | 'strings' | null): SymphonicPhrasePlan {
  return {
    phraseId: phrase.id,
    startBar: phrase.startBar,
    endBar: phrase.endBar,
    kind: phrase.kind,
    foregroundFamily: 'strings',
    foregroundIds: [],
    supportIds: [],
    bassIds: [],
    counterline: 'silence',
    answerIds: [],
    register,
    dynamic: 'p',
    doubling: false,
    harp: false,
    timpani: false,
    percussion: 'none',
    previousFamily: previous,
  };
}

interface BuildAnswerOptions {
  placement?: 'scan' | 'tail';
  excludeOps?: readonly OperatorId[];
  /** When set, exact-doubling checks use placed primary melody (audit parity). */
  doublingMelody?: readonly Phase2SourceNote[];
}

function buildAnswer(
  phrase: Phase2Phrase,
  melody: readonly Phase2SourceNote[],
  notes: readonly Phase2SourceNote[],
  parts: readonly Phase2Part[],
  busy: Map<string, BusySpan[]>,
  settings: ResolvedSymphonicSettings,
  seed: number,
  silentSpans: readonly BusySpan[],
  covered: Map<string, number>,
  options?: BuildAnswerOptions,
): { ok: true; op: OperatorId; partId: string; events: Phase2EventPlan[]; rejected: Phase2DistributionReceipt['rejected'] }
  | { ok: false; rejected: Phase2DistributionReceipt['rejected'] } {
  const rejected: Phase2DistributionReceipt['rejected'] = [];
  const doublingMelody = options?.doublingMelody ?? melody;
  const tailPlacement = options?.placement === 'tail';
  const motifSlice = tailPlacement ? melody.slice(-4) : melody.slice(0, 4);
  const origin = motifSlice[0]!.onset;
  const motif: Motif = {
    id: tailPlacement ? `${phrase.id}-tail` : `${phrase.id}-head`,
    events: motifSlice.map((note) => ({ onset: note.onset - origin, duration: note.duration, midi: note.midi })),
  };
  const sonority = new Set(notes.filter((note) => note.bar >= phrase.startBar && note.bar <= phrase.endBar).map((note) => pcOf(note.midi)));
  const start = Math.abs(seed + phrase.index * (tailPlacement ? 11 : 3)) % ANSWER_OPS.length;
  const excluded = new Set(options?.excludeOps ?? []);
  const order = (tailPlacement
    ? (['fragment-head', 'displace', 'augment'] as const)
    : [...ANSWER_OPS.slice(start), ...ANSWER_OPS.slice(0, start)]).filter((op) => !excluded.has(op));
  const inner = ['vn2', 'va', 'vc'].slice().sort((a, b) => (covered.get(a) ?? 0) - (covered.get(b) ?? 0));
  for (const op of order) {
    const params = op === 'fragment-head'
      ? { count: tailPlacement ? 2 : 3 }
      : op === 'augment'
        ? { factor: tailPlacement ? 1.5 : 2 }
        : { beats: 1 };
    const transformed = applyOperator(motif, op, params);
    const soundingEvents = transformed.motif.events.filter((event) => event.midi !== null).map((event) => {
      let midi = event.midi as number;
      if (!sonority.has(pcOf(midi))) {
        const nudge = [-1, 1, -2, 2].find((step) => sonority.has(pcOf(midi + step)));
        if (nudge === undefined) return null;
        midi += nudge;
      }
      return { onset: event.onset, duration: event.duration, midi };
    }).filter((event): event is { onset: number; midi: number; duration: number } => !!event);
    if (soundingEvents.length < 2) {
      rejected.push({ phraseId: phrase.id, candidate: op, reason: 'The operator left fewer than two sounding notes.' });
      continue;
    }
    const shifts = [0, 3, 4, 5, 7, -3, -4, -5];
    let placedLine: Array<{ onset: number; duration: number; midi: number }> | null = null;
    let usedShift = 0;
    for (const interval of shifts) {
      const moved = soundingEvents.map((event) => ({ ...event, midi: event.midi + interval }));
      if (!tailPlacement && moved.some((event) => !sonority.has(pcOf(event.midi)))) continue;
      if (tailPlacement) {
        const inKey = moved.filter((event) => sonority.has(pcOf(event.midi))).length;
        if (inKey < Math.max(2, Math.ceil(moved.length * 0.5))) continue;
      }
      const span = Math.max(...moved.map((event) => event.onset + event.duration));
      const relMin = Math.min(...moved.map((event) => event.onset));
      const melodyTail = melody.length
        ? Math.max(...melody.map((note) => note.onset + note.duration))
        : phrase.start;
      const breathMargin = tailPlacement ? 1.25 : 0;
      const cursorStart = tailPlacement
        ? Math.max(phrase.start + 0.25, melodyTail - Math.min(span, 4))
        : phrase.start + 0.5;
      const cursorEnd = tailPlacement
        ? Math.min(phrase.end - breathMargin, melodyTail + 1.5)
        : phrase.end;
      const maskLimit = tailPlacement ? 0.85 : 0.5;
      const tailAnchors: number[] = tailPlacement
        ? melody
          .filter((note) => note.duration >= 1)
          .flatMap((note) => [note.onset + note.duration * 0.35, note.onset + note.duration * 0.65])
        : [];
      const tryCursor = (cursor: number): boolean => {
        if (cursor + span > phrase.end - breathMargin + 1e-6 || cursor < phrase.start - 1e-6) return false;
        const trial = moved.map((event) => ({ ...event, onset: cursor + event.onset }));
        const trialEnd = Math.max(...trial.map((event) => event.onset + event.duration));
        if (trial.some((event) => hitsSilence(event.onset, event.duration, silentSpans))) {
          if (!tailPlacement || trialEnd > melodyTail + 0.5) return false;
        }
        const masked = trial.filter((event) => melody.some((note) => Math.abs(note.onset - event.onset) < 0.05)).length;
        if (masked / trial.length > maskLimit) return false;
        if (exactDouble(trial, doublingMelody)) return false;
        placedLine = trial.map((event) => {
          const timed = quantizeAnswerTiming(event.onset, event.duration);
          return { ...event, onset: timed.onset, duration: timed.duration };
        });
        if (exactDouble(placedLine, doublingMelody)) return false;
        usedShift = interval;
        return true;
      };
      if (tailPlacement) {
        for (const anchor of tailAnchors) {
          if (tryCursor(anchor - relMin)) break;
        }
        if (!placedLine) {
          for (let cursor = Math.min(cursorEnd, phrase.end - breathMargin) - span; cursor >= cursorStart - 1e-6; cursor -= 0.25) {
            if (tryCursor(cursor)) break;
          }
        }
        if (!placedLine) {
          for (let cursor = cursorStart; cursor + span <= cursorEnd + 1e-6; cursor += 0.25) {
            if (tryCursor(cursor)) break;
          }
        }
      } else {
        for (let cursor = cursorStart; cursor + span <= cursorEnd + 1e-6; cursor += 0.5) {
          if (tryCursor(cursor)) break;
        }
      }
      if (placedLine) break;
    }
    if (!placedLine) {
      rejected.push({ phraseId: phrase.id, candidate: op, reason: 'No placement kept the answer inside the phrase, out of protected silence, and off an exact doubling.' });
      continue;
    }
    const choice = pickPart(parts, inner, placedLine.map((event) => event.midi), busy, placedLine.map((event) => ({ start: event.onset, end: event.onset + event.duration })), new Set(), false, settings);
    if (!choice) {
      rejected.push({ phraseId: phrase.id, candidate: `${op} on ${inner.join('/')}`, reason: 'No inner string could hold the answer in range without a collision.' });
      continue;
    }
    const transformation = usedShift === 0 ? op : `${op}+sonority-shift-${usedShift}`;
    return {
      ok: true,
      op,
      partId: choice.partId,
      rejected,
      events: placedLine.map((event, index) => ({
        kind: 'derived' as const,
        eventId: `${phrase.id}-answer-${index}`,
        partId: choice.partId,
        shift: choice.shift,
        phraseId: phrase.id,
        role: 'independent-answer' as const,
        transformation,
        lineage: `${phrase.id}.${op}`,
        reason: `One source-derived answer (${transformation}) on an inner string. It is not an exact copy of the melody.`,
        onset: event.onset,
        duration: event.duration,
        midi: event.midi + choice.shift,
        voice: 1,
        classifies: false,
        op,
      })),
    };
  }
  return { ok: false, rejected };
}

export interface DistributionAudit {
  ok: boolean;
  failures: string[];
}

export function auditPhase2Distribution(input: {
  events: readonly Phase2DistributionReceipt['events'];
  silentBars: ReadonlySet<number>;
  barOf: (onset: number) => number;
  silentSpans?: readonly BusySpan[];
  locked: ReadonlyArray<{ id: string; midi: number; onset: number; duration: number }>;
  settings: Pick<ResolvedSymphonicSettings, 'families'> & { allocation?: SymphonicOrchestrationSettings['allocation'] };
  mode: 'faithful' | 'developing';
}): DistributionAudit {
  const failures: string[] = [];
  const preserved = input.events.filter((event) => event.transformation === 'preserved-source' || event.transformation === 'octave-transfer');
  const byLineage = new Map<string, Set<string>>();
  for (const event of preserved) {
    const set = byLineage.get(event.lineage) ?? new Set<string>();
    set.add(event.instrument);
    byLineage.set(event.lineage, set);
  }
  for (const [lineage, instruments] of byLineage) {
    if (instruments.size > 1) failures.push(`Illegal handover: ${lineage} is split across ${[...instruments].join(', ')}.`);
  }
  for (const event of input.events) {
    if (input.silentBars.has(input.barOf(event.onset)) || input.silentSpans?.some((span) => event.onset < span.end - 1e-6 && span.start < event.onset + event.duration - 1e-6)) {
      failures.push(`Filled silence at bar ${input.barOf(event.onset)} on ${event.instrument}.`);
    }
    const family = familyOf(event.instrument);
    const gate = !family
      ? 'off'
      : family === 'timpani' || family === 'percussion'
        ? input.settings.families.percussion
        : family === 'harp'
          ? input.settings.families.harp
          : input.settings.families[family];
    if (gate === 'off') failures.push(`Out of permission: ${event.instrument} sounds while ${family} is off.`);
  }
  if (input.mode === 'faithful' && input.events.some((event) => event.role === 'independent-answer')) {
    failures.push('Out of permission: faithful mode contains a newly composed answer.');
  }
  const melody = input.events
    .filter((event) => event.role === 'primary-melody')
    .slice()
    .sort((a, b) => a.onset - b.onset || a.sounding - b.sounding);
  const seenAnswers = new Set<string>();
  for (const event of input.events.filter((item) => item.role === 'independent-answer')) {
    if (seenAnswers.has(event.lineage)) continue;
    seenAnswers.add(event.lineage);
    const group = input.events
      .filter((item) => item.lineage === event.lineage && item.role === 'independent-answer')
      .slice()
      .sort((a, b) => a.onset - b.onset);
    const line = group.map((item) => ({ onset: item.onset, duration: item.duration, midi: item.sounding }));
    const theme = melody.map((item) => ({ id: item.lineage, bar: 0, onset: item.onset, duration: item.duration, midi: item.sounding, role: 'melody' as const, locked: false, tieStart: false, tieStop: false }));
    if (exactDouble(line, theme)) {
      failures.push(`Doubling labelled independent: ${event.lineage}.`);
    }
  }
  for (const lock of input.locked) {
    const hits = input.events.filter((event) => event.lineage === lock.id && (event.transformation === 'preserved-source' || event.transformation === 'octave-transfer'));
    if (!hits.length) failures.push(`Protected event ${lock.id} is missing.`);
    else if (hits.some((event) => event.sounding !== lock.midi || Math.abs(event.onset - lock.onset) > 1e-6 || Math.abs(event.duration - lock.duration) > 1e-6)) {
      failures.push(`Protected pitch or duration changed for ${lock.id}.`);
    }
  }
  const answers = input.events.filter((event) => event.role === 'independent-answer');
  const lineages = [...new Set(answers.map((event) => event.lineage))];
  for (let index = 0; index < lineages.length; index += 1) {
    for (let other = index + 1; other < lineages.length; other += 1) {
      const a = answers.filter((event) => event.lineage === lineages[index]);
      const b = answers.filter((event) => event.lineage === lineages[other]);
      const a0 = Math.min(...a.map((event) => event.onset));
      const a1 = Math.max(...a.map((event) => event.onset + event.duration));
      const b0 = Math.min(...b.map((event) => event.onset));
      const b1 = Math.max(...b.map((event) => event.onset + event.duration));
      if (a0 < b1 - 1e-6 && b0 < a1 - 1e-6) failures.push('Two newly composed answers overlap.');
    }
  }
  return { ok: failures.length === 0, failures };
}

export function midiTimelineAligned(tempos: ReadonlyArray<{ tick: number }>): string | null {
  if (!tempos.length) return 'missing tempo';
  if (tempos[0]!.tick !== 0) return 'shifted MIDI-family timing';
  return null;
}
