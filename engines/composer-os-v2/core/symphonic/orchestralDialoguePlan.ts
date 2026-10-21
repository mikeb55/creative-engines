/**
 * V4.0 Phase 4D — explicit bar-level orchestral dialogue (seed 77241 / 24-bar piano).
 * Replaces automatic phrase melody routing when `orchestralDialogue` is set on symphonic settings.
 */

import { parseGeneralPianoChord } from '../piano/generalPianoWriter';
import { soundingSpellingToWritten, spellMidi, type SpelledPitch } from '../instruments/writtenPitch';
import type { Transposition } from '../instruments/instrumentTypes';
import type { SymphonicOrchestrationSettings } from '../orchestrate/types';
import type { DynamicMark, PartDynamicEvent } from '../score-model/scoreModelTypes';
import type {
  Phase2DistributionReceipt,
  Phase2EventPlan,
  Phase2Part,
  Phase2Phrase,
  Phase2Plan,
  Phase2SourceNote,
} from '../orchestrate/symphonicDistribution';
import {
  HARP_RANGE,
  SYMPHONIC_SLOTS,
  symphonicScoreEndBar,
  type ResolvedSymphonicSettings,
  type SymphonicPhrasePlan,
} from '../orchestrate/symphonicWriting';

export const ORCHESTRAL_DIALOGUE_77241 = '77241-phase4d';

const HARMONY_77241 = [
  'Cmaj7/E', 'Fmaj7/A', 'Dm7', 'Gsus4', 'Cmaj7(#11)', 'Am7', 'Fmaj7/C', 'Ebmaj7/G',
  'Abmaj7', 'Emaj7', 'Bmaj7(#11)', 'F#m7', 'Dbmaj7', 'Amaj7', 'Fm7', 'Bb7sus4',
  'Cmaj7/E', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Cmaj7', 'Cmaj7',
] as const;

const mod12 = (v: number) => ((v % 12) + 12) % 12;

function chordSymbolForBar(bar: number): string {
  return bar === 13 ? 'C#maj7' : HARMONY_77241[bar - 1]!;
}

function orderedSupportPcs(symbol: string): number[] {
  const ch = parseGeneralPianoChord(symbol);
  if (!ch) return [0];
  const { rootPc, bassPc, tones } = ch;
  const order: number[] = [];
  const add = (pc: number) => {
    if (!order.includes(pc)) order.push(pc);
  };
  for (const t of tones) {
    const d = mod12(t - rootPc);
    if (d === 3 || d === 4) add(t);
  }
  for (const t of tones) {
    const d = mod12(t - rootPc);
    if (d === 10 || d === 11) add(t);
  }
  for (const t of tones) {
    if (mod12(t - rootPc) === 7) add(t);
  }
  for (const t of tones) add(t);
  add(rootPc);
  add(bassPc);
  return order;
}

export interface OrchestralDialoguePlan {
  id: string;
  scoreEndBar: number;
}

export interface OrchestralDialogueBarRow {
  bar: number;
  primaryLead: string;
  families: string[];
}

interface BusySpan {
  start: number;
  end: number;
}

const INNER_SUPPORT = ['vn2', 'va', 'bn1'] as const;
const BASS_PARTS = ['vc', 'db'] as const;

function familyOf(partId: string): string | null {
  return SYMPHONIC_SLOTS.find((slot) => slot.partId === partId)?.family ?? null;
}

function activityOf(partId: string, settings: ResolvedSymphonicSettings): string {
  const family = familyOf(partId);
  if (!family || family === 'timpani' || family === 'percussion') return settings.families.percussion;
  if (family === 'harp') return settings.families.harp;
  return settings.families[family as keyof typeof settings.families] ?? 'off';
}

function overlaps(start: number, end: number, spans: readonly BusySpan[]): boolean {
  return spans.some((span) => start < span.end - 1e-6 && span.start < end - 1e-6);
}

function occupy(busy: Map<string, BusySpan[]>, partId: string, start: number, end: number): void {
  const list = busy.get(partId) ?? [];
  list.push({ start, end });
  busy.set(partId, list);
}

/** Orchestral flute stipulation: sounding C4 minimum (catalogue hard range allows B3). */
const FLUTE_MIN_SOUNDING = 60;

function dialogueSoundingRange(partId: string, range: readonly [number, number]): readonly [number, number] {
  if (partId === 'fl1') return [Math.max(FLUTE_MIN_SOUNDING, range[0]), range[1]];
  return range;
}

function hornLeadPrefersDownOctave(bar: number, partId: string): boolean {
  return partId === 'hn1' && bar >= 15 && bar <= 16;
}

function fits(midis: number[], range: readonly [number, number], shift: number): boolean {
  return midis.every((midi) => midi + shift >= range[0] && midi + shift <= range[1]);
}

function chooseShift(
  midis: number[],
  range: readonly [number, number],
  locked: boolean,
  preferDownOctave = false,
): number | null {
  const shifts = locked
    ? [0]
    : preferDownOctave
      ? [-12, 0, 12, -24, 24]
      : [0, -12, 12, -24, 24];
  return shifts.find((shift) => fits(midis, range, shift)) ?? null;
}

function pickPart(
  parts: readonly Phase2Part[],
  ids: readonly string[],
  midis: number[],
  busy: Map<string, BusySpan[]>,
  spans: BusySpan[],
  avoid: ReadonlySet<string>,
  locked: boolean,
  settings: ResolvedSymphonicSettings,
): { partId: string; shift: number } | null {
  for (const id of ids) {
    if (avoid.has(id)) continue;
    if (activityOf(id, settings) === 'off') continue;
    const part = parts.find((item) => item.partId === id);
    if (!part?.range) continue;
    const range = dialogueSoundingRange(id, part.range);
    const shift = chooseShift(midis, range, locked);
    if (shift === null) continue;
    if (spans.some((span) => overlaps(span.start, span.end, busy.get(id) ?? []))) continue;
    return { partId: id, shift };
  }
  return null;
}

function spellWritten(part: Phase2Part, sounding: number): { step: string; alter: number; octave: number; midi: number } {
  const written = soundingSpellingToWritten(spellMidi(sounding), part.transposition);
  return { step: written.step, alter: written.alter, octave: written.octave, midi: written.midi };
}

function phraseForBar(phrases: readonly Phase2Phrase[], bar: number): Phase2Phrase {
  return phrases.find((p) => bar >= p.startBar && bar <= p.endBar) ?? phrases[phrases.length - 1]!;
}

function phraseDynamicForDialogue(phrase: Phase2Phrase): 'p' | 'mp' | 'mf' | 'f' | 'ff' {
  if (phrase.startBar >= 21) return phrase.endBar >= 23 ? 'ff' : 'f';
  if (phrase.startBar >= 17) return 'mf';
  if (phrase.startBar >= 9) return 'mp';
  return 'p';
}

const DIALOGUE_ORCH_PARTS = [
  'vn1', 'vn2', 'va', 'vc', 'db', 'fl1', 'ob1', 'cl1', 'cl2', 'bn1', 'bn2',
  'hn1', 'hn2', 'hn3', 'hn4', 'tbn1', 'tbn2', 'hp',
] as const;

function isLeadOrBass(p: Phase2EventPlan): boolean {
  return p.role === 'primary-melody' || p.role === 'melodic-reinforcement' || p.role === 'bass-foundation';
}

/** Phase 4F — breath joins: bars 8 and 16 last beat support rests; melody/bass only. */
function applyPhase4fJoinBreaths(placements: Phase2EventPlan[]): void {
  for (const bar of [8, 16]) {
    const barStart = (bar - 1) * 4;
    const joinBeat = barStart + 3;
    for (let i = placements.length - 1; i >= 0; i -= 1) {
      const p = placements[i]!;
      if (p.onset < barStart || p.onset >= bar * 4) continue;
      if (isLeadOrBass(p)) continue;
      if (p.onset >= joinBeat - 1e-6) {
        placements.splice(i, 1);
        continue;
      }
      const end = p.onset + p.duration;
      if (end > joinBeat + 1e-6) p.duration = Math.max(0, joinBeat - p.onset);
    }
  }
}

function isVcBeat1InBar24(p: Phase2EventPlan, barStart: number, barEnd: number): boolean {
  return p.partId === 'vc' && p.onset >= barStart && p.onset < barEnd && p.onset <= barStart + 1e-3;
}

function activePartsInBar24(placements: readonly Phase2EventPlan[], barStart: number, barEnd: number): Set<string> {
  return new Set(
    placements
      .filter((p) => p.onset < barEnd && p.onset + p.duration > barStart)
      .map((p) => p.partId),
  );
}

function applyPhase4fBar24Thin(placements: Phase2EventPlan[]): void {
  const bar = 24;
  const barStart = (bar - 1) * 4;
  const barEnd = bar * 4;
  const keepForDrop = new Set<string>();
  for (const p of placements) {
    if (p.onset < barStart || p.onset >= barEnd) continue;
    if (p.role === 'primary-melody' || p.role === 'melodic-reinforcement') keepForDrop.add(p.partId);
    if (p.partId === 'db') keepForDrop.add('db');
    if (isVcBeat1InBar24(p, barStart, barEnd)) keepForDrop.add('vc');
  }
  for (let i = placements.length - 1; i >= 0; i -= 1) {
    const p = placements[i]!;
    if (p.onset < barStart || p.onset >= barEnd) continue;
    if (isVcBeat1InBar24(p, barStart, barEnd)) {
      p.duration = Math.max(p.duration, 3);
      continue;
    }
    if (p.role === 'primary-melody' || p.role === 'melodic-reinforcement') continue;
    if (p.role === 'bass-foundation') {
      if (p.onset <= barStart + 1e-3) p.duration = Math.max(p.duration, 3);
      continue;
    }
    if (p.onset > barStart + 1e-3) {
      const lhDerived = p.role === 'sustained-colour'
        && !p.eventId.startsWith('4d-harm')
        && !p.eventId.startsWith('4d-harp');
      if (lhDerived) continue;
      placements.splice(i, 1);
      continue;
    }
    p.duration = Math.max(p.duration, 3);
  }
  let active = activePartsInBar24(placements, barStart, barEnd);
  if (active.size <= 8) return;
  const dropOrder = ['hp', 'tbn2', 'tbn1', 'hn4', 'hn3', 'bn2', 'cl2', 'va', 'vn2', 'bn1', 'hn2', 'hn1', 'cl1', 'ob1', 'fl1'];
  for (const partId of dropOrder) {
    if (active.size <= 8) break;
    if (keepForDrop.has(partId)) continue;
    for (let i = placements.length - 1; i >= 0; i -= 1) {
      const p = placements[i]!;
      if (p.partId !== partId || p.onset < barStart || p.onset >= barEnd) continue;
      if (isVcBeat1InBar24(p, barStart, barEnd)) continue;
      if (p.partId === 'db' && p.onset <= barStart + 1e-3) continue;
      if ((p.role === 'primary-melody' || p.role === 'melodic-reinforcement') && keepForDrop.has(p.partId)) continue;
      placements.splice(i, 1);
    }
    active = activePartsInBar24(placements, barStart, barEnd);
  }
  if (active.size <= 8) return;
  for (const partId of dropOrder) {
    if (active.size <= 8) break;
    if (partId === 'vc' || partId === 'db' || keepForDrop.has(partId)) continue;
    for (let i = placements.length - 1; i >= 0; i -= 1) {
      const p = placements[i]!;
      if (p.partId !== partId || p.onset < barStart || p.onset >= barEnd) continue;
      if (isVcBeat1InBar24(p, barStart, barEnd)) continue;
      if (p.partId === 'db' && p.role === 'bass-foundation' && p.onset <= barStart + 1e-3) continue;
      placements.splice(i, 1);
    }
    active = activePartsInBar24(placements, barStart, barEnd);
  }
  const hasVcBeat1 = placements.some((p) => isVcBeat1InBar24(p, barStart, barEnd) && p.duration > 0);
  if (!hasVcBeat1) {
    const ref = placements.find((p) => p.partId === 'db' && p.onset >= barStart && p.onset < barEnd)
      ?? placements.find((p) => p.partId === 'vc' && p.onset >= barStart - 4 && p.onset < barEnd);
    const phraseId = placements.find((p) => p.onset >= barStart && p.onset < barEnd)?.phraseId ?? 'a';
    placements.push({
      kind: 'source',
      eventId: `4d-vc-b1:${bar}`,
      partId: 'vc',
      shift: 0,
      phraseId,
      role: 'bass-foundation',
      transformation: 'preserved-source',
      lineage: `vc-beat1:${bar}`,
      reason: `Bar ${bar} cello beat-1 anchor (post-thin).`,
      onset: barStart,
      duration: 3,
      midi: ref?.midi ?? 48,
      voice: 1,
      classifies: false,
    });
  }
}

function applyPhase4fHn2Bar23Octave(placements: Phase2EventPlan[]): void {
  const barStart = 22 * 4;
  for (const p of placements) {
    if (p.partId !== 'hn2') continue;
    if (p.onset < barStart || p.onset >= 23 * 4) continue;
    if (p.midi === 23) p.midi = 35;
  }
}

function firstSoundingBeatInBar(partId: string, bar: number, placements: readonly Phase2EventPlan[]): number {
  const barStart = (bar - 1) * 4;
  const hits = placements.filter(
    (p) => p.partId === partId && p.onset >= barStart && p.onset < bar * 4,
  );
  if (!hits.length) return 0;
  return Math.min(...hits.map((p) => p.onset - barStart));
}

function lastSoundingBeatInBar(partId: string, bar: number, placements: readonly Phase2EventPlan[]): number {
  const barStart = (bar - 1) * 4;
  const hits = placements.filter(
    (p) => p.partId === partId && p.onset < bar * 4 && p.onset + p.duration > barStart,
  );
  if (!hits.length) return 0;
  return Math.max(...hits.map((p) => Math.min(bar * 4, p.onset + p.duration) - barStart));
}

/** Bar 16 wedge stop: last attack onset before the last-beat breath (beat 3). */
function wedgeStopBeatBar16BeforeBreath(partId: string, placements: readonly Phase2EventPlan[]): number {
  const bar = 16;
  const barStart = (bar - 1) * 4;
  const breathBeat = 3;
  const hits = placements.filter(
    (p) => p.partId === partId && p.onset >= barStart && p.onset < bar * 4,
  );
  const beforeBreath = hits.filter((p) => p.onset - barStart < breathBeat - 1e-6);
  if (!beforeBreath.length) return firstSoundingBeatInBar(partId, 15, placements);
  return Math.max(...beforeBreath.map((p) => p.onset - barStart));
}

/** Phase 4F dramatic-arc dynamics for every orchestral part (exported MusicXML). */
export function buildOrchestralDialogue77241PartDynamics(
  partIds: readonly string[],
  placements: readonly Phase2EventPlan[],
): Record<string, PartDynamicEvent[]> {
  const out: Record<string, PartDynamicEvent[]> = {};
  const ids = partIds.filter((id) => (DIALOGUE_ORCH_PARTS as readonly string[]).includes(id));
  for (const partId of ids) {
    const list: PartDynamicEvent[] = [];
    list.push({ bar: 1, beat: firstSoundingBeatInBar(partId, 1, placements), mark: 'p' });
    if (partId === 'fl1') list.push({ bar: 5, beat: firstSoundingBeatInBar(partId, 5, placements), mark: 'mp' });
    if (partId === 'ob1') list.push({ bar: 7, beat: firstSoundingBeatInBar(partId, 7, placements), mark: 'mp' });
    list.push({ bar: 9, beat: firstSoundingBeatInBar(partId, 9, placements), mark: 'mp' });
    const b15 = firstSoundingBeatInBar(partId, 15, placements);
    const b16Stop = wedgeStopBeatBar16BeforeBreath(partId, placements);
    if (placements.some((p) => p.partId === partId && p.onset >= 14 * 4 && p.onset < 16 * 4)) {
      list.push({ bar: 15, beat: b15, wedge: 'crescendo' });
      list.push({ bar: 16, beat: b16Stop, wedge: 'stop' });
      list.push({ bar: 16, beat: b16Stop, mark: 'mf' });
    }
    list.push({ bar: 17, beat: firstSoundingBeatInBar(partId, 17, placements), mark: 'mf' });
    list.push({ bar: 21, beat: firstSoundingBeatInBar(partId, 21, placements), mark: 'f' });
    list.push({ bar: 23, beat: firstSoundingBeatInBar(partId, 23, placements), mark: 'ff' });
    list.push({ bar: 24, beat: firstSoundingBeatInBar(partId, 24, placements), wedge: 'diminuendo' });
    list.push({ bar: 24, beat: lastSoundingBeatInBar(partId, 24, placements), wedge: 'stop' });
    list.push({ bar: 24, beat: firstSoundingBeatInBar(partId, 24, placements), mark: 'p' });
    out[partId] = list;
  }
  return out;
}

export function applyPhase4fArcToPlacements(placements: Phase2EventPlan[]): void {
  applyPhase4fJoinBreaths(placements);
  applyPhase4fHn2Bar23Octave(placements);
  applyPhase4fBar24Thin(placements);
}

export const DIALOGUE_VELOCITY_BY_MARK: Record<DynamicMark, number> = {
  ppp: 36, pp: 40, p: 52, mp: 68, mf: 84, f: 100, ff: 116, fff: 120, sfz: 110, fp: 90,
};

export function applyDialogueDynamicsVelocities(
  partDynamics: Record<string, PartDynamicEvent[]>,
  parts: Array<{ id: string; measures: Array<{ index: number; events: Array<{ kind: string; startBeat?: number; velocity?: number }> }> }>,
): void {
  for (const part of parts) {
    const markEvents = [...(partDynamics[part.id] ?? [])]
      .filter((m) => m.mark)
      .sort((a, b) => a.bar - b.bar || a.beat - b.beat);
    for (const measure of part.measures) {
      const active = [...markEvents].filter((m) => m.bar <= measure.index);
      const mark = active.length ? active[active.length - 1]!.mark! : 'mf';
      for (const event of measure.events) {
        if (event.kind !== 'note') continue;
        event.velocity = DIALOGUE_VELOCITY_BY_MARK[mark] ?? 84;
      }
    }
  }
}

function primaryMelodyPart(bar: number, _melodyIndexInBar: number): string {
  if (bar <= 4) return 'vn1';
  if (bar <= 6) return 'fl1';
  if (bar <= 8) return 'ob1';
  if (bar <= 10) return 'cl1';
  if (bar <= 12) return 'vn1';
  if (bar <= 14) return 'ob1';
  if (bar <= 16) return 'hn1';
  if (bar <= 18) return 'vn1';
  if (bar <= 20) return 'ob1';
  if (bar <= 22) return 'hn1';
  return 'vn1';
}

function authorisedFluteShift(bar: number): number | null {
  if (bar === 17 || bar === 18) return 12;
  if (bar === 23 || bar === 24) return 0;
  return null;
}

function authorisedVn2MelodyDouble(bar: number): boolean {
  return bar >= 19 && bar <= 20;
}

function pitchClassDistance(a: number, b: number): number {
  const d = Math.abs(mod12(a) - mod12(b));
  return Math.min(d, 12 - d);
}

function clashesMelodyAtBeats(midi: number, melodyMidis: readonly number[]): boolean {
  return melodyMidis.some((m) => {
    const ic = pitchClassDistance(midi, m);
    return ic === 1 || ic === 11;
  });
}

function melodyMidisAtStrongBeats(bar: number, placements: readonly Phase2EventPlan[]): number[] {
  const barStart = (bar - 1) * 4;
  const out: number[] = [];
  for (const beat of [0, 2]) {
    const t = barStart + beat;
    for (const p of placements) {
      if (p.role !== 'primary-melody' && p.role !== 'melodic-reinforcement') continue;
      if (Math.abs(p.onset - t) < 1e-3) out.push(p.midi);
    }
  }
  return out;
}

function supportPartsForBar(bar: number): string[] {
  if (bar <= 4) return ['vn2', 'va', 'bn1'];
  if (bar <= 8) return ['vn2', 'va', 'hn1', 'hn2'];
  if (bar <= 16) {
    const lead = primaryMelodyPart(bar, 0);
    const woodLead = lead === 'cl1' || lead === 'ob1' || lead === 'fl1' || lead === 'hn1';
    const base = ['cl2', 'bn1', 'bn2', 'hn1', 'hn2'];
    return woodLead ? [...base, 'vn2', 'va'] : base;
  }
  if (bar <= 20) return ['vn2', 'va', 'bn1', 'hn1', 'hn2', 'hn3', 'hn4'];
  return ['vn2', 'va', 'bn1', 'bn2', 'hn1', 'hn2', 'tbn1', 'tbn2'];
}

export function resolveOrchestralDialoguePlan(
  raw: SymphonicOrchestrationSettings | undefined,
): OrchestralDialoguePlan | null {
  const key = (raw as { orchestralDialogue?: string } | undefined)?.orchestralDialogue;
  if (key === ORCHESTRAL_DIALOGUE_77241) return { id: ORCHESTRAL_DIALOGUE_77241, scoreEndBar: 24 };
  return null;
}

export function barDialogueRows(placements: readonly Phase2EventPlan[]): OrchestralDialogueBarRow[] {
  const rows: OrchestralDialogueBarRow[] = [];
  for (let bar = 1; bar <= 24; bar += 1) {
    const barStart = (bar - 1) * 4;
    const barEnd = bar * 4;
    const primaries = placements.filter(
      (p) => p.role === 'primary-melody' && p.onset >= barStart - 1e-6 && p.onset < barEnd,
    );
    const lead = [...new Set(primaries.map((p) => p.partId))].join('+') || '—';
    const families = new Set<string>();
    for (const p of placements) {
      if (p.onset < barStart - 1e-6 || p.onset >= barEnd) continue;
      const f = familyOf(p.partId);
      if (f) families.add(f);
    }
    rows.push({ bar, primaryLead: lead, families: [...families].sort() });
  }
  return rows;
}

export function planOrchestralDialogueDistribution(input: {
  notes: readonly Phase2SourceNote[];
  phrases: readonly Phase2Phrase[];
  parts: readonly Phase2Part[];
  settings: ResolvedSymphonicSettings;
  mode: 'faithful' | 'developing';
  seed: number;
  silentBars: ReadonlySet<number>;
  barStart: (bar: number) => number;
  barEnd: (bar: number) => number;
  plan: OrchestralDialoguePlan;
}): { ok: true; plan: Phase2Plan } | { ok: false; error: string } {
  const { notes, phrases, parts, settings, silentBars, plan: dialoguePlan } = input;
  const scoreEndBar = Math.min(dialoguePlan.scoreEndBar, symphonicScoreEndBar(phrases));
  const busy = new Map<string, BusySpan[]>();
  const placements: Phase2EventPlan[] = [];
  const omissions: Phase2Plan['omissions'] = [];
  const warnings: string[] = [];
  const decisions: Phase2DistributionReceipt['decisions'] = [];
  const foreground: Record<string, string> = {};
  const handovers: Record<string, boolean> = {};
  const plans: SymphonicPhrasePlan[] = [];
  const answers: Phase2Plan['answers'] = [];
  const derivedLines: Phase2Plan['derivedLines'] = [];
  const silenceRows: Phase2Plan['silence'] = [];
  const rejected: Phase2DistributionReceipt['rejected'] = [];

  const push = (item: Phase2EventPlan): void => {
    placements.push(item);
    occupy(busy, item.partId, item.onset, item.onset + item.duration);
  };

  const lastSupportMidi = new Map<string, number>();

  const lowestMelodyMidi = (bar: number): number => {
    const barStart = (bar - 1) * 4;
    const notes = placements.filter(
      (p) => p.role === 'primary-melody' && p.onset >= barStart - 1e-6 && p.onset < bar * 4,
    );
    return notes.length ? Math.min(...notes.map((n) => n.midi)) : 84;
  };

  const placeDerivedSupport = (
    bar: number,
    partId: string,
    pc: number,
    onset: number,
    duration: number,
    phrase: Phase2Phrase,
    leadParts: ReadonlySet<string>,
    lineageSuffix: string,
  ): boolean => {
    if (activityOf(partId, settings) === 'off') return false;
    const part = parts.find((p) => p.partId === partId);
    if (!part?.range) return false;
    const soundingRange = dialogueSoundingRange(partId, part.range);
    const maxMidi = lowestMelodyMidi(bar) - 1;
    const prefer = lastSupportMidi.get(partId) ?? maxMidi - 8;
    const candidates: number[] = [];
    for (let midi = soundingRange[0]; midi <= Math.min(soundingRange[1], maxMidi); midi += 1) {
      if (mod12(midi) === pc) candidates.push(midi);
    }
    if (!candidates.length) {
      for (let midi = soundingRange[0]; midi <= soundingRange[1]; midi += 1) {
        if (mod12(midi) === pc) candidates.push(midi);
      }
    }
    if (!candidates.length) return false;
    const melodyExposure = melodyMidisAtStrongBeats(bar, placements);
    const safe = candidates.filter((midi) => !clashesMelodyAtBeats(midi, melodyExposure));
    if (!safe.length) return false;
    const pool = safe;
    pool.sort((a, b) => Math.abs(a - prefer) - Math.abs(b - prefer));
    const span = { start: onset, end: onset + duration };
    const choice = pickPart(parts, [partId], [pool[0]!], busy, [span], leadParts, false, settings);
    if (!choice) return false;
    const eventId = `4d-harm:${bar}:${partId}:${lineageSuffix}`;
    if (placements.some((p) => p.eventId === eventId)) return false;
    const sounding = pool[0]! + choice.shift;
    push({
      kind: 'source',
      eventId,
      partId: choice.partId,
      shift: choice.shift,
      phraseId: phrase.id,
      role: 'sustained-colour',
      transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
      lineage: eventId,
      reason: `Bar ${bar} chord-tone support on ${choice.partId}.`,
      onset,
      duration,
      midi: sounding,
      voice: 1,
      classifies: false,
    });
    lastSupportMidi.set(choice.partId, sounding);
    return true;
  };

  const heldBassPart = (note: Phase2SourceNote): string | null => {
    if (!note.tieStop) return null;
    const prior = notes
      .filter((item) => item.tieStart && item.role !== 'melody' && Math.abs(item.onset + item.duration - note.onset) < 1e-3)
      .sort((a, b) => b.onset - a.onset)[0];
    if (!prior) return null;
    return placements.find((p) => p.eventId === prior.id && p.role === 'bass-foundation')?.partId ?? null;
  };

  const melody = notes.filter((n) => n.role === 'melody' && n.bar <= scoreEndBar);
  const lhPool = notes.filter((n) => n.role !== 'melody' && n.bar <= scoreEndBar);
  const bassAnchorKeys = new Map<string, Phase2SourceNote>();
  for (const note of lhPool) {
    const key = `${note.bar}:${note.onset.toFixed(4)}`;
    const prev = bassAnchorKeys.get(key);
    if (!prev || note.midi < prev.midi) bassAnchorKeys.set(key, note);
  }
  const bassAnchors = new Set(bassAnchorKeys.values());
  const bass = [...bassAnchors];
  const inner = lhPool.filter((n) => !bassAnchors.has(n));

  const melodyByBar = new Map<number, Phase2SourceNote[]>();
  for (const note of melody) {
    const list = melodyByBar.get(note.bar) ?? [];
    list.push(note);
    melodyByBar.set(note.bar, list);
  }
  for (const list of melodyByBar.values()) list.sort((a, b) => a.onset - b.onset || a.midi - b.midi);

  let priorLead: string | null = null;
  for (let bar = 1; bar <= scoreEndBar; bar += 1) {
    if (silentBars.has(bar)) continue;
    const phrase = phraseForBar(phrases, bar);
    const local = melodyByBar.get(bar) ?? [];
    for (let index = 0; index < local.length; index += 1) {
      const note = local[index]!;
      const partId = primaryMelodyPart(bar, index);
      const span = { start: note.onset, end: note.onset + note.duration };
      const leadIds = [partId];
      const preferDown = hornLeadPrefersDownOctave(bar, partId);
      const forcedLead = preferDown
        ? (() => {
          const part = parts.find((p) => p.partId === partId);
          if (!part?.range) return null;
          const range = dialogueSoundingRange(partId, part.range);
          const shift = chooseShift([note.midi], range, note.locked, true);
          if (shift === null) return null;
          if (overlaps(span.start, span.end, busy.get(partId) ?? [])) return null;
          return { partId, shift };
        })()
        : null;
      const melodyFallback = bar >= 21 && bar <= 22
        ? ['hn1', 'hn2', 'hn3', 'hn4', 'ob1', 'cl1', 'fl1']
        : ['vn1', 'fl1', 'ob1', 'cl1', 'hn1'];
      const choice = forcedLead
        ?? pickPart(parts, leadIds, [note.midi], busy, [span], new Set(), note.locked, settings)
        ?? pickPart(parts, melodyFallback, [note.midi], busy, [span], new Set(), note.locked, settings);
      if (!choice) {
        if (note.locked) return { ok: false, error: `Locked melody ${note.id} has no instrument in bar ${bar}.` };
        omissions.push({ eventId: note.id, reason: `Bar ${bar} melody had no free lead instrument.` });
        continue;
      }
      if (priorLead && priorLead !== choice.partId) handovers[phrase.id] = true;
      priorLead = choice.partId;
      push({
        kind: 'source',
        eventId: note.id,
        partId: choice.partId,
        shift: choice.shift,
        phraseId: phrase.id,
        role: 'primary-melody',
        transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
        lineage: note.id,
        reason: `Phase 4D bar ${bar} primary lead ${choice.partId}.`,
        onset: note.onset,
        duration: note.duration,
        midi: note.midi + choice.shift,
        voice: 1,
        classifies: true,
      });
      const flShift = authorisedFluteShift(bar);
      if (flShift !== null && choice.partId === 'vn1') {
        const flSpan = { start: note.onset, end: note.onset + note.duration };
        const flPart = parts.find((p) => p.partId === 'fl1');
        const useShift = flPart?.range && flShift === 12 && fits([note.midi], flPart.range, 12)
          ? 12
          : chooseShift([note.midi], flPart?.range ?? [60, 96], false);
        if (useShift === null) continue;
        if (overlaps(flSpan.start, flSpan.end, busy.get('fl1') ?? [])) continue;
        push({
          kind: 'source',
          eventId: note.id,
          partId: 'fl1',
          shift: useShift,
          phraseId: phrase.id,
          role: 'melodic-reinforcement',
          transformation: flShift === 12 ? 'octave-reinforcement' : 'unison-reinforcement',
          lineage: `${note.id}:fl-dbl`,
          reason: `Authorised flute doubling bar ${bar}.`,
          onset: note.onset,
          duration: note.duration,
          midi: note.midi + useShift,
          voice: 1,
          classifies: false,
        });
        occupy(busy, 'fl1', flSpan.start, flSpan.end);
      }
      if (authorisedVn2MelodyDouble(bar) && choice.partId === 'ob1') {
        const vnSpan = { start: note.onset, end: note.onset + note.duration };
        const vnPart = parts.find((p) => p.partId === 'vn2');
        const vnShift = vnPart?.range ? chooseShift([note.midi], vnPart.range, false) : null;
        if (vnShift !== null && !overlaps(vnSpan.start, vnSpan.end, busy.get('vn2') ?? [])) {
          push({
            kind: 'source',
            eventId: note.id,
            partId: 'vn2',
            shift: vnShift,
            phraseId: phrase.id,
            role: 'melodic-reinforcement',
            transformation: vnShift === 0 ? 'unison-reinforcement' : 'octave-reinforcement',
            lineage: `${note.id}:vn2-dbl`,
            reason: `Authorised violin II doubling bar ${bar}.`,
            onset: note.onset,
            duration: note.duration,
            midi: note.midi + vnShift,
            voice: 1,
            classifies: false,
          });
          occupy(busy, 'vn2', vnSpan.start, vnSpan.end);
        }
      }
    }
    foreground[phrase.id] = priorLead ?? 'vn1';
  }

  const bassFirstInBar = new Set<number>();
  for (const note of bass.sort((a, b) => a.onset - b.onset)) {
    const phrase = phraseForBar(phrases, note.bar);
    const held = heldBassPart(note);
    const firstInBar = !bassFirstInBar.has(note.bar);
    if (firstInBar) bassFirstInBar.add(note.bar);
    const ids = held ? [held] : firstInBar ? ['db', 'vc'] : ['vc', 'db'];
    const span = { start: note.onset, end: note.onset + note.duration };
    let choice = pickPart(parts, ids, [note.midi], busy, [span], new Set(), note.locked || held !== null, settings);
    if (!choice) {
      for (const partId of ids) {
        const part = parts.find((p) => p.partId === partId);
        if (!part?.range) continue;
        const shift = chooseShift([note.midi], dialogueSoundingRange(partId, part.range), note.locked || held !== null);
        if (shift !== null) {
          choice = { partId, shift };
          break;
        }
      }
    }
    if (!choice) {
      if (note.locked) return { ok: false, error: `Locked bass ${note.id} has no instrument.` };
      omissions.push({ eventId: note.id, reason: 'Bass had no free cello or double bass.' });
      continue;
    }
    push({
      kind: 'source',
      eventId: note.id,
      partId: choice.partId,
      shift: choice.shift,
      phraseId: phrase.id,
      role: 'bass-foundation',
      transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
      lineage: note.id,
      reason: 'Piano LH bass → cello / double bass.',
      onset: note.onset,
      duration: note.duration,
      midi: note.midi + choice.shift,
      voice: 1,
      classifies: true,
    });
  }

  let innerIndex = 0;
  const innerByBar = new Map<number, Phase2SourceNote[]>();
  for (const note of inner) {
    const list = innerByBar.get(note.bar) ?? [];
    list.push(note);
    innerByBar.set(note.bar, list);
  }

  for (let bar = 1; bar <= scoreEndBar; bar += 1) {
    if (silentBars.has(bar)) continue;
    const phrase = phraseForBar(phrases, bar);
    const locals = (innerByBar.get(bar) ?? []).sort((a, b) => a.onset - b.onset || a.midi - b.midi);
    const barOnset = (bar - 1) * 4;
    const leadParts = new Set(
      placements.filter((p) => p.role === 'primary-melody' && p.onset >= barOnset && p.onset < bar * 4).map((p) => p.partId),
    );
    const pcs = orderedSupportPcs(chordSymbolForBar(bar));
    const supportIds = supportPartsForBar(bar);
    const sustain = bar <= 8 ? 2 : 4;
    for (let idx = 0; idx < supportIds.length; idx += 1) {
      const partId = supportIds[idx]!;
      const pc = pcs[idx % pcs.length]!;
      const onset = bar <= 8 && idx % 2 === 1 ? barOnset + 2 : barOnset;
      const duration = bar <= 8 && idx % 2 === 1 ? 2 : sustain;
      placeDerivedSupport(bar, partId, pc, onset, duration, phrase, leadParts, `s${idx}`);
    }
    for (const note of locals) {
      if (note.role === 'melody' || note.role === 'bass') continue;
      if (placements.some((p) => p.classifies && p.lineage === note.id)) continue;
      const partId = INNER_SUPPORT[innerIndex % INNER_SUPPORT.length]!;
      innerIndex += 1;
      const span = { start: note.onset, end: note.onset + note.duration };
      const fallbackIds = [...new Set([partId, ...INNER_SUPPORT, ...supportIds, 'cl2', 'bn2', 'hn3', 'hn4'])];
      let choice = pickPart(parts, fallbackIds, [note.midi], busy, [span], leadParts, note.locked, settings);
      if (!choice) {
        for (const partId of fallbackIds) {
          const part = parts.find((p) => p.partId === partId);
          if (!part?.range) continue;
          const shift = chooseShift([note.midi], dialogueSoundingRange(partId, part.range), note.locked);
          if (shift !== null) {
            choice = { partId, shift };
            break;
          }
        }
      }
      if (!choice) continue;
      const exposure = melodyMidisAtStrongBeats(bar, placements);
      if (clashesMelodyAtBeats(note.midi + choice.shift, exposure)) continue;
      push({
        kind: 'source',
        eventId: note.id,
        partId: choice.partId,
        shift: choice.shift,
        phraseId: phrase.id,
        role: 'sustained-colour',
        transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
        lineage: note.id,
        reason: 'LH inner → violin II / viola / bassoon.',
        onset: note.onset,
        duration: note.duration,
        midi: note.midi + choice.shift,
        voice: 1,
        classifies: false,
      });
    }
    if (bar >= 17 && bar <= 24 && settings.families.harp !== 'off') {
      let harpSlot = 0;
      const harpPcs = bar >= 21 ? pcs : pcs.slice(0, 3);
      for (const pc of harpPcs) {
        const candidates: number[] = [];
        for (let midi = HARP_RANGE[0]; midi <= HARP_RANGE[1]; midi += 1) {
          if (mod12(midi) === pc) candidates.push(midi);
        }
        if (!candidates.length) continue;
        const midi = candidates[Math.min(2, candidates.length - 1)]!;
        const onset = barOnset + harpSlot * (bar >= 21 ? 0.125 : 0.25);
        harpSlot += 1;
        const span = { start: onset, end: onset + (bar >= 21 ? 0.5 : 0.375) };
        const choice = pickPart(parts, ['hp'], [midi], busy, [span], new Set(), false, settings);
        if (!choice) continue;
        push({
          kind: 'source',
          eventId: `4d-harp:${bar}:${harpSlot}`,
          partId: 'hp',
          shift: choice.shift,
          phraseId: phrase.id,
          role: 'sustained-colour',
          transformation: 'preserved-source',
          lineage: `harp-ar:${bar}:${harpSlot}`,
          reason: `Bar ${bar} harp chord arpeggio.`,
          onset,
          duration: bar >= 21 ? 0.5 : 0.375,
          midi: midi + choice.shift,
          voice: midi >= 60 ? 1 : 3,
          classifies: false,
        });
      }
    }
  }

  for (const phrase of phrases) {
    if (phrase.endBar > scoreEndBar) continue;
    const register = 'middle';
    plans.push({
      phraseId: phrase.id,
      startBar: phrase.startBar,
      endBar: phrase.endBar,
      kind: phrase.kind,
      foregroundFamily: 'strings',
      foregroundIds: [...new Set(placements.filter((p) => p.phraseId === phrase.id && p.role === 'primary-melody').map((p) => p.partId))],
      supportIds: [...new Set(placements.filter((p) => p.phraseId === phrase.id && p.role === 'sustained-colour').map((p) => p.partId))],
      bassIds: [...new Set(placements.filter((p) => p.phraseId === phrase.id && p.role === 'bass-foundation').map((p) => p.partId))],
      counterline: 'silence',
      answerIds: [],
      register,
      dynamic: ((): 'p' | 'mp' | 'mf' => {
        const d = phraseDynamicForDialogue(phrase);
        if (d === 'f' || d === 'ff') return 'mf';
        if (d === 'p') return 'p';
        return d;
      })(),
      doubling: placements.some((p) => p.phraseId === phrase.id && p.role === 'melodic-reinforcement'),
      harp: placements.some((p) => p.phraseId === phrase.id && p.partId === 'hp'),
      timpani: false,
      percussion: 'none',
      previousFamily: null,
    });
    decisions.push({
      phraseId: phrase.id,
      sourceLineage: phrase.id,
      role: 'primary-melody',
      instrument: foreground[phrase.id] ?? 'vn1',
      span: { startBar: phrase.startBar, endBar: phrase.endBar },
      register,
      activity: 'dialogue',
      handoverAt: null,
      texture: 'dialogue',
      reason: 'Phase 4D explicit orchestral dialogue plan.',
    });
  }

  for (let bar = 1; bar <= scoreEndBar; bar += 1) {
    if (silentBars.has(bar)) continue;
    const phrase = phraseForBar(phrases, bar);
    const barOnset = (bar - 1) * 4;
    const bassAtBeat1 = bass.find((n) => n.bar === bar && Math.abs(n.onset - barOnset) < 1e-3);
    const bassHit = bassAtBeat1 ?? bass.filter((n) => n.bar === bar).sort((a, b) => a.onset - b.onset)[0];
    const rootPc = orderedSupportPcs(chordSymbolForBar(bar))[0] ?? 0;
    const bassMidi = bassHit?.midi ?? rootPc + 48;
    const vcOnBeat1 = placements.some(
      (p) => p.partId === 'vc' && p.role === 'bass-foundation' && Math.abs(p.onset - barOnset) < 1e-3,
    );
    if (!vcOnBeat1) {
      const part = parts.find((p) => p.partId === 'vc');
      const shift = part?.range ? chooseShift([bassMidi], dialogueSoundingRange('vc', part.range), true) : null;
      if (shift !== null) {
        push({
          kind: 'source',
          eventId: `4d-vc-b1:${bar}`,
          partId: 'vc',
          shift,
          phraseId: phrase.id,
          role: 'bass-foundation',
          transformation: shift === 0 ? 'preserved-source' : 'octave-transfer',
          lineage: `vc-beat1:${bar}`,
          reason: `Bar ${bar} cello beat-1 anchor.`,
          onset: barOnset,
          duration: 0.5,
          midi: bassMidi + shift,
          voice: 1,
          classifies: false,
        });
      }
    }
  }

  for (const note of lhPool) {
    if (placements.some((p) => Math.abs(p.onset - note.onset) < 1e-3 && mod12(p.midi) === mod12(note.midi))) continue;
    const phrase = phraseForBar(phrases, note.bar);
    const span = { start: note.onset, end: note.onset + note.duration };
    const ids = [
      ...INNER_SUPPORT,
      'vn2',
      'va',
      'cl2',
      'bn1',
      'bn2',
      'hn1',
      'hn2',
      'hn3',
      'hn4',
      'tbn1',
      'tbn2',
      'hp',
      'db',
      'vc',
    ];
    let placedLh = false;
    for (const partId of ids) {
      if (activityOf(partId, settings) === 'off') continue;
      const part = parts.find((p) => p.partId === partId);
      if (!part?.range) continue;
      const range = dialogueSoundingRange(partId, part.range);
      const shift = chooseShift([note.midi], range, true) ?? chooseShift([note.midi], range, false);
      if (shift === null) continue;
      const sounding = note.midi + shift;
      const exposure = melodyMidisAtStrongBeats(note.bar, placements);
      if (clashesMelodyAtBeats(sounding, exposure) && partId !== 'db' && partId !== 'vc') continue;
      push({
        kind: 'source',
        eventId: note.id,
        partId,
        shift,
        phraseId: phrase.id,
        role: note.midi < 50 ? 'bass-foundation' : 'sustained-colour',
        transformation: shift === 0 ? 'preserved-source' : 'octave-transfer',
        lineage: note.id,
        reason: 'Fallback LH inner / bass placement.',
        onset: note.onset,
        duration: note.duration,
        midi: sounding,
        voice: 1,
        classifies: false,
      });
      placedLh = true;
      break;
    }
    if (!placedLh) omissions.push({ eventId: note.id, reason: `LH ${note.id} had no free placement.` });
  }

  const classifyingLineages = () => new Set(placements.filter((p) => p.classifies).map((p) => p.lineage));
  for (const note of notes) {
    if (classifyingLineages().has(note.id)) continue;
    if (!note.locked && note.role !== 'melody' && note.role !== 'bass') continue;
    const phrase = phraseForBar(phrases, note.bar);
    const span = { start: note.onset, end: note.onset + note.duration };
    const role = note.role === 'bass'
      ? 'bass-foundation'
      : note.role === 'melody'
        ? 'primary-melody'
        : 'sustained-colour';
    const ids = note.role === 'bass'
      ? ['db', 'vc']
      : note.role === 'melody'
        ? [primaryMelodyPart(note.bar, 0), 'vn1', 'fl1', 'ob1', 'cl1', 'hn1']
        : [...INNER_SUPPORT];
    const choice = pickPart(parts, ids, [note.midi], busy, [span], new Set(), note.locked, settings);
    if (!choice) {
      if (note.locked) return { ok: false, error: `Protected event ${note.id} has no instrument.` };
      continue;
    }
    push({
      kind: 'source',
      eventId: note.id,
      partId: choice.partId,
      shift: choice.shift,
      phraseId: phrase.id,
      role,
      transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
      lineage: note.id,
      reason: `Fallback placement for protected or unplaced ${note.role}.`,
      onset: note.onset,
      duration: note.duration,
      midi: note.midi + choice.shift,
      voice: 1,
      classifies: note.locked || role === 'primary-melody' || role === 'bass-foundation',
    });
  }

  applyPhase4fArcToPlacements(placements);

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
      timpaniTuning: [],
      harpPedal: '',
      distribution: {
        allocation: 'phase-2',
        decisions,
        events,
        silence: silenceRows.map((row) => ({ bar: row.bar, reason: row.reason })),
        rejected,
        endurance: [],
      },
    },
  };
}
