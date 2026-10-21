/**
 * V4.0 Phase 4D — explicit bar-level orchestral dialogue (seed 77241 / 24-bar piano).
 * Replaces automatic phrase melody routing when `orchestralDialogue` is set on symphonic settings.
 */

import { parseGeneralPianoChord } from '../piano/generalPianoWriter';
import { soundingSpellingToWritten, spellMidi, type SpelledPitch } from '../instruments/writtenPitch';
import type { Transposition } from '../instruments/instrumentTypes';
import type { SymphonicOrchestrationSettings } from '../orchestrate/types';
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

function phraseDynamicForDialogue(phrase: Phase2Phrase): 'mp' | 'mf' | 'f' {
  if (phrase.endBar >= 21) return 'f';
  if (phrase.endBar === 8 || phrase.startBar === 9) return 'mp';
  if (phrase.endBar === 16 || phrase.startBar === 17) return 'mp';
  return 'mf';
}

function primaryMelodyPart(bar: number, melodyIndexInBar: number): string {
  if (bar <= 4) return 'vn1';
  if (bar <= 8) return melodyIndexInBar % 2 === 0 ? 'fl1' : 'ob1';
  if (bar <= 10) return 'cl1';
  if (bar <= 12) return 'vn1';
  if (bar <= 14) return 'ob1';
  if (bar <= 16) return 'hn1';
  return 'vn1';
}

function authorisedFluteShift(bar: number): number | null {
  if (bar >= 17 && bar <= 20) return 12;
  if (bar >= 21 && bar <= 24) return 0;
  return null;
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
    candidates.sort((a, b) => Math.abs(a - prefer) - Math.abs(b - prefer));
    const span = { start: onset, end: onset + duration };
    const choice = pickPart(parts, [partId], [candidates[0]!], busy, [span], leadParts, false, settings);
    if (!choice) return false;
    const eventId = `4d-harm:${bar}:${partId}:${lineageSuffix}`;
    if (placements.some((p) => p.eventId === eventId)) return false;
    const sounding = candidates[0]! + choice.shift;
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
      const choice = forcedLead
        ?? pickPart(parts, leadIds, [note.midi], busy, [span], new Set(), note.locked, settings)
        ?? pickPart(parts, ['vn1', 'fl1', 'ob1', 'cl1', 'hn1'], [note.midi], busy, [span], new Set(), note.locked, settings);
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
    const choice = pickPart(parts, ids, [note.midi], busy, [span], new Set(), note.locked || held !== null, settings);
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

  for (let bar = 1; bar <= scoreEndBar; bar += 1) {
    if (silentBars.has(bar)) continue;
    const phrase = phraseForBar(phrases, bar);
    const barOnset = (bar - 1) * 4;
    const bassHit = bass.filter((n) => n.bar === bar).sort((a, b) => a.onset - b.onset)[0];
    if (!bassHit) continue;
    const vcOnBeat1 = placements.some(
      (p) => p.partId === 'vc' && p.role === 'bass-foundation' && Math.abs(p.onset - barOnset) < 1e-3,
    );
    if (!vcOnBeat1) {
      const span = { start: barOnset, end: barOnset + Math.min(4, bassHit.duration) };
      const choice = pickPart(parts, ['vc'], [bassHit.midi], busy, [span], new Set(), true, settings);
      if (choice) {
        push({
          kind: 'source',
          eventId: `4d-vc-b1:${bar}`,
          partId: 'vc',
          shift: choice.shift,
          phraseId: phrase.id,
          role: 'bass-foundation',
          transformation: choice.shift === 0 ? 'preserved-source' : 'octave-transfer',
          lineage: `vc-beat1:${bar}`,
          reason: `Bar ${bar} cello reinforces bass on beat 1.`,
          onset: barOnset,
          duration: span.end - span.start,
          midi: bassHit.midi + choice.shift,
          voice: 1,
          classifies: false,
        });
      }
    }
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
      const choice = pickPart(parts, [partId, ...INNER_SUPPORT], [note.midi], busy, [span], leadParts, note.locked, settings);
      if (!choice) continue;
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
      dynamic: phraseDynamicForDialogue(phrase),
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
