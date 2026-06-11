/**
 * V81b+c / V83e — passing diminished insertion between structural sixth anchors.
 * Weak-beat (Phase 1) + optional profile-driven "and of 1" (0.5) when passing into beat 2.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { BhMelodyRhythmProfile } from './bhMelodyRhythmProfile';
import { dim7DegreePc } from './chordTones';
import { applyIdentitiesToNoteChoice } from './identities';
import { familyKey } from './ladderBuilder';
import { pitchClassToSharpName } from './scaleOfChords';
import type { ChordMelodyHarmonyEvent, ChordMelodyNoteChoice, ResolvedChordMelodyNote } from './types';

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function isStrongBeat(onsetBeat: number): boolean {
  const beat = ((onsetBeat % 4) + 4) % 4;
  return Math.abs(beat) < 0.05 || Math.abs(beat - 2) < 0.05;
}

function isWeakBeat(onsetBeat: number): boolean {
  const beat = ((onsetBeat % 4) + 4) % 4;
  return Math.abs(beat - 1) < 0.05 || Math.abs(beat - 3) < 0.05;
}

function findMelodyNote(
  melody: readonly ImportMelodyNote[],
  bar: number,
  onsetBeat: number
): ImportMelodyNote | undefined {
  return melody.find((n) => n.bar === bar && Math.abs(n.onsetBeat - onsetBeat) < 0.02);
}

function melodyIndexAt(
  melody: readonly ImportMelodyNote[],
  bar: number,
  onsetBeat: number
): number {
  return melody.findIndex((n) => n.bar === bar && Math.abs(n.onsetBeat - onsetBeat) < 0.02);
}

function isPassingContour(melody: readonly ImportMelodyNote[], index: number, melodyPc: number): boolean {
  const prev = melody[index - 1];
  const next = melody[index + 1];
  if (!prev || !next) return false;
  const prevPc = mod12(prev.midiPitch);
  const nextPc = mod12(next.midiPitch);
  const stepPrev = Math.min((melodyPc - prevPc + 12) % 12, (prevPc - melodyPc + 12) % 12);
  const stepNext = Math.min((melodyPc - nextPc + 12) % 12, (nextPc - melodyPc + 12) % 12);
  return stepPrev <= 2 && stepNext <= 2 && prevPc !== nextPc;
}

function weakBeatSlot(anchorBeat: number, nextBeat: number, anchorBar: number, nextBar: number): number | null {
  if (anchorBar === nextBar) {
    const gap = nextBeat - anchorBeat;
    if (gap < 1) return null;
    if (isStrongBeat(anchorBeat) && anchorBeat < 1.05) return 1;
    if (Math.abs(anchorBeat - 2) < 0.05 && nextBeat >= 3) return 3;
    return null;
  }
  if (Math.abs(anchorBeat - 2) < 0.05) return 3;
  if (anchorBeat < 0.05) return 1;
  return null;
}

/** V83e — "and of 1" (0.5): offbeat eighth after beat 1 when passing into beat 2. */
function andOfOnePassingDimSlot(
  anchorBeat: number,
  nextBeat: number,
  anchorBar: number,
  nextBar: number
): number | null {
  if (!isStrongBeat(anchorBeat) || anchorBeat > 0.05) return null;
  if (anchorBar === nextBar) {
    if (nextBeat < 1 - 0.05 || nextBeat > 2 + 0.05) return null;
    if (nextBeat - anchorBeat < 0.75) return null;
    return 0.5;
  }
  if (anchorBar + 1 === nextBar && nextBeat < 0.05) return 0.5;
  return null;
}

/** V83e+f — pick 3–5 and-of-1 bars from eligible candidates (profile-gated). */
function selectAndOfOneBars(
  candidates: readonly { bar: number; anchorIndex: number }[],
  profile?: BhMelodyRhythmProfile
): Set<number> {
  const bias = profile?.offbeatPassingDimBias ?? 0;
  if (bias < 0.35 || candidates.length === 0) return new Set();
  const target = Math.min(5, Math.max(3, Math.round(candidates.length * bias * 0.55)));
  const ranked = [...candidates].sort((a, b) => {
    const ha = ((a.bar * 17 + a.anchorIndex * 13) % 97) / 97;
    const hb = ((b.bar * 17 + b.anchorIndex * 13) % 97) / 97;
    return ha - hb;
  });
  return new Set(ranked.slice(0, Math.min(target, ranked.length)).map((c) => c.bar));
}

function isPassingDimOnset(onsetBeat: number): boolean {
  return isWeakBeat(onsetBeat) || Math.abs(onsetBeat - 0.5) < 0.05 || Math.abs(onsetBeat - 2.5) < 0.05;
}

function resolvePassingDimOnset(
  anchorBeat: number,
  nextBeat: number,
  anchorBar: number,
  nextBar: number,
  melody: readonly ImportMelodyNote[],
  preferAndOfOne: boolean
): number | null {
  const andOfOne = andOfOnePassingDimSlot(anchorBeat, nextBeat, anchorBar, nextBar);
  if (preferAndOfOne && andOfOne != null && !findMelodyNote(melody, anchorBar, andOfOne)) {
    return andOfOne;
  }
  const weak = weakBeatSlot(anchorBeat, nextBeat, anchorBar, nextBar);
  if (weak != null && isPassingDimOnset(weak) && !findMelodyNote(melody, anchorBar, weak)) {
    return weak;
  }
  return null;
}

function chromaticApproachMidi(refMidi: number, targetPc: number): number {
  const candidates = [refMidi - 1, refMidi + 1];
  let best = refMidi;
  let bestDist = Infinity;
  for (const m of candidates) {
    const pc = mod12(m);
    const dist = Math.min((targetPc - pc + 12) % 12, (pc - targetPc + 12) % 12);
    if (dist < bestDist || (dist === bestDist && m < best)) {
      bestDist = dist;
      best = m;
    }
  }
  return best;
}

function symbolForDim7(dimRootPc: number): string {
  return `${pitchClassToSharpName(dimRootPc)}dim7`;
}

function toStructuralEvents(events: readonly ResolvedChordMelodyNote[]): ChordMelodyHarmonyEvent[] {
  return events.map((e) => ({
    ...e,
    eventKind: 'structural' as const,
    exportStackMidis: e.exportStackMidis ?? [],
    innerVoicingMidis: e.innerVoicingMidis ?? [],
    voicingVariant: e.voicingVariant ?? 'sixth-block',
    voicingFingerprint: e.voicingFingerprint ?? '',
  }));
}

function buildPassingDimEvent(
  anchor: ChordMelodyHarmonyEvent,
  passingOnset: number,
  syntheticMelodyMidi: number
): ChordMelodyHarmonyEvent {
  const dimRoot = anchor.anchor.dim7RootPc;
  const choice: ChordMelodyNoteChoice = {
    bar: anchor.bar,
    onsetBeat: passingOnset,
    sectionLabel: anchor.sectionLabel,
    fakeBookSymbol: anchor.fakeBookSymbol,
    anchor: anchor.anchor,
    scalePairIndex: anchor.scalePairIndex,
    melodyPc: mod12(syntheticMelodyMidi),
    kind: 'dim7',
    chordSymbol: symbolForDim7(dimRoot),
    droppedTonePc: dim7DegreePc(dimRoot),
  };
  const resolved = applyIdentitiesToNoteChoice(choice);
  return {
    ...resolved,
    eventKind: 'passing_dim',
    harmonyOnly: true,
    syntheticMelodyMidi,
    phrasingRole: 'full',
    ladderHit: false,
    exportStackMidis: [],
    innerVoicingMidis: [],
    voicingVariant: 'sixth-block',
    voicingFingerprint: '',
    voicingHint: 'bb-dim7-passing',
  };
}

export function insertPassingDiminishedEvents(
  structuralEvents: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[],
  profile?: BhMelodyRhythmProfile
): ChordMelodyHarmonyEvent[] {
  const structural = toStructuralEvents(structuralEvents);
  const orderedStructural = [...structural].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  const andOfOneCandidates: Array<{ bar: number; anchorIndex: number }> = [];

  for (let i = 0; i < orderedStructural.length; i++) {
    const event = orderedStructural[i]!;
    if (event.eventKind !== 'structural') continue;
    if (event.kind !== 'sixth') continue;
    if (event.phrasingRole !== 'full') continue;
    if (!isStrongBeat(event.onsetBeat)) continue;

    const nextStructural = orderedStructural.slice(i + 1).find((e) => e.eventKind === 'structural');
    if (!nextStructural) continue;

    const gap =
      nextStructural.bar === event.bar
        ? nextStructural.onsetBeat - event.onsetBeat
        : (4 - event.onsetBeat) + (nextStructural.bar - event.bar - 1) * 4 + nextStructural.onsetBeat;
    if (gap < 1) continue;

    const andOfOneSlot = andOfOnePassingDimSlot(
      event.onsetBeat,
      nextStructural.onsetBeat,
      event.bar,
      nextStructural.bar
    );
    if (andOfOneSlot == null || findMelodyNote(melody, event.bar, andOfOneSlot)) continue;

    const barMelodyCount = melody.filter((n) => n.bar === event.bar).length;
    if (barMelodyCount >= 3) continue;

    const prevStructural = orderedStructural[i - 1];
    const nextAfter = orderedStructural[i + 1];
    if (
      prevStructural?.eventKind === 'structural' &&
      prevStructural.kind === 'dim7' &&
      isStrongBeat(prevStructural.onsetBeat)
    ) {
      continue;
    }
    if (
      nextAfter?.eventKind === 'structural' &&
      nextAfter.kind === 'dim7' &&
      isStrongBeat(nextAfter.onsetBeat)
    ) {
      continue;
    }

    const anchorMel = findMelodyNote(melody, event.bar, event.onsetBeat);
    const melIdx = melodyIndexAt(melody, event.bar, event.onsetBeat);
    if (anchorMel && melIdx >= 0 && isPassingContour(melody, melIdx, event.melodyPc)) continue;

    andOfOneCandidates.push({ bar: event.bar, anchorIndex: i });
  }

  const andOfOneBars = selectAndOfOneBars(andOfOneCandidates, profile);
  const insertsByBar = new Map<number, number>();
  const out: ChordMelodyHarmonyEvent[] = [];

  for (let i = 0; i < orderedStructural.length; i++) {
    const event = orderedStructural[i]!;
    out.push(event);

    if (event.eventKind !== 'structural') continue;
    if (event.kind !== 'sixth') continue;
    if (event.phrasingRole !== 'full') continue;
    if (!isStrongBeat(event.onsetBeat)) continue;

    const nextStructural = orderedStructural.slice(i + 1).find((e) => e.eventKind === 'structural');
    if (!nextStructural) continue;

    const gap =
      nextStructural.bar === event.bar
        ? nextStructural.onsetBeat - event.onsetBeat
        : (4 - event.onsetBeat) + (nextStructural.bar - event.bar - 1) * 4 + nextStructural.onsetBeat;
    if (gap < 1) continue;

    const passingOnset = resolvePassingDimOnset(
      event.onsetBeat,
      nextStructural.onsetBeat,
      event.bar,
      nextStructural.bar,
      melody,
      andOfOneBars.has(event.bar)
    );
    if (passingOnset == null) continue;

    const barMelodyCount = melody.filter((n) => n.bar === event.bar).length;
    if (barMelodyCount >= 3) continue;

    const insertsThisBar = insertsByBar.get(event.bar) ?? 0;
    if (insertsThisBar >= 1) continue;

    const prevStructural = orderedStructural[i - 1];
    const nextAfter = orderedStructural[i + 1];
    if (
      prevStructural?.eventKind === 'structural' &&
      prevStructural.kind === 'dim7' &&
      isStrongBeat(prevStructural.onsetBeat)
    ) {
      continue;
    }
    if (
      nextAfter?.eventKind === 'structural' &&
      nextAfter.kind === 'dim7' &&
      isStrongBeat(nextAfter.onsetBeat)
    ) {
      continue;
    }

    const isAndOfOneSlot = Math.abs(passingOnset - 0.5) < 0.05;
    if (
      !isAndOfOneSlot &&
      (nextStructural.phrasingRole === 'single' || nextStructural.phrasingRole === 'dyad')
    ) {
      continue;
    }

    const anchorMel = findMelodyNote(melody, event.bar, event.onsetBeat);
    const melIdx = melodyIndexAt(melody, event.bar, event.onsetBeat);
    if (anchorMel && melIdx >= 0 && isPassingContour(melody, melIdx, event.melodyPc)) continue;

    const isAndOfOneInsert = Math.abs(passingOnset - 0.5) < 0.05;
    const anchorFk = familyKey(event.anchor);
    if (!isAndOfOneInsert && familyKey(nextStructural.anchor) !== anchorFk) continue;

    const anchorMidi = anchorMel?.midiPitch ?? event.melodyPc + 60;
    const targetPc = nextStructural.melodyPc;
    const syntheticMelodyMidi = chromaticApproachMidi(anchorMidi, targetPc);

    const passing = buildPassingDimEvent(event, passingOnset, syntheticMelodyMidi);
    out.push(passing);
    insertsByBar.set(event.bar, insertsThisBar + 1);
  }

  return out.sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
}

export function passingDimReceiptForEvent(event: ChordMelodyHarmonyEvent): string {
  const sixthPc = event.anchor.sixthRootPc;
  const dim7Symbol = symbolForDim7(event.anchor.dim7RootPc);
  return `bh:cm:passing_dim@bar${event.bar}:onset=${event.onsetBeat}:from=${sixthPc}→${dim7Symbol}`;
}

export function countEligibleStructuralSixths(events: readonly ChordMelodyHarmonyEvent[]): number {
  return events.filter(
    (e) =>
      e.eventKind === 'structural' &&
      e.kind === 'sixth' &&
      e.phrasingRole === 'full' &&
      isStrongBeat(e.onsetBeat)
  ).length;
}
