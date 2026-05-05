/**
 * Lead melody planning — chord-tone aware pitches, style-driven rhythm and contour,
 * optional per-bar harmony override (otherwise scaffold from {@link SectionChordPlan}).
 */

import type { ChorusPlan } from './chorusPlanner';
import type { HookPlan } from './hookPlanner';
import type { SectionChordPlan } from './songCompilationTypes';
import type { SongHook } from './songHookTypes';
import type { SongSectionPlan, SongVoiceType } from './songModeTypes';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { ChordToneSet } from '../goldenPath/guitarBassDuoHarmony';
import { contourForPhrase, overallContourArc } from './melodyContourPlanner';
import { buildPhraseEntriesFromChordPlan } from './melodyPhrasePlanner';
import type { LeadMelodyPlan, MelodyContourKind, MelodyNoteEvent } from './leadMelodyTypes';
import { getSingerRangeProfile } from './singerRangeProfiles';
import type {
  MelodyBehaviourPlan,
  MelodyContourProfileId,
  MelodyRhythmicSubdivision,
} from './melodyBehaviourPlanner';

/** Map research contour profile to phrase-level contour used in pitch picking. */
export function melodyContourProfileToPhraseKind(profile: MelodyContourProfileId): MelodyContourKind {
  switch (profile) {
    case 'arch':
    case 'wide_arc':
    case 'bebop_arc':
    case 'groove_arc':
    case 'cabaret_arc':
      return 'arch';
    case 'ascending':
    case 'rising':
    case 'sequence':
      return 'ascending';
    case 'dissolving':
    case 'recitation':
      return 'descending';
    default:
      return 'wave';
  }
}

function seededUnit(seed: number, bar: number, salt = 0): number {
  let s = (seed * 7919 + bar * 104729 + salt * 503) >>> 0;
  s = (s * 1103515245 + 12345) >>> 0;
  return s / 0xffffffff;
}

/** One chord symbol per bar (1-based index aligns with measure numbers). */
export function flattenChordPlanToHarmonyBars(chordPlan: SectionChordPlan[]): string[] {
  const out: string[] = [];
  for (const block of chordPlan) {
    for (const sym of block.chordSymbols) {
      out.push(sym);
    }
  }
  return out;
}

function chordTonesToMelodyMidis(ct: ChordToneSet, lo: number, hi: number): number[] {
  const raw = [ct.root, ct.third, ct.fifth, ct.seventh];
  const pcs = [...new Set(raw.map((m) => ((m % 12) + 12) % 12))];
  const targets: number[] = [];
  for (const pc of pcs) {
    let m = 60 + pc;
    while (m < lo) m += 12;
    while (m > hi) m -= 12;
    if (m >= lo && m <= hi) {
      targets.push(m);
      continue;
    }
    if (m + 12 <= hi) targets.push(m + 12);
    else if (m - 12 >= lo) targets.push(m - 12);
  }
  return [...new Set(targets)].sort((a, b) => a - b);
}

function pickMidiFromCandidates(
  candidates: number[],
  prevMidi: number | undefined,
  intervalTendency: MelodyBehaviourPlan['intervalTendency'],
  seed: number,
  bar: number,
  salt: number,
  contour: MelodyContourKind,
  wideLeapPeakThisNote?: boolean
): number {
  if (candidates.length === 0) return 60;
  const u = seededUnit(seed, bar, salt);
  const sortedByPrev = [...candidates].sort((a, b) => {
    if (prevMidi === undefined) return a - b;
    return Math.abs(a - prevMidi) - Math.abs(b - prevMidi);
  });
  const sortedByHeight = [...candidates].sort((a, b) => a - b);

  if (prevMidi === undefined) {
    if (contour === 'ascending') return sortedByHeight[Math.min(sortedByHeight.length - 1, 1 + (seed % 2))]!;
    if (contour === 'descending') return sortedByHeight[Math.max(0, sortedByHeight.length - 2)]!;
    return candidates[Math.floor(u * candidates.length) % candidates.length]!;
  }

  if (
    wideLeapPeakThisNote &&
    intervalTendency === 'stepwise' &&
    prevMidi !== undefined
  ) {
    const leaps = candidates.filter((c) => {
      const d = Math.abs(c - prevMidi);
      return d >= 8 && d <= 11;
    });
    if (leaps.length > 0 && seededUnit(seed, bar, salt + 991) < 0.62) {
      const idx = Math.floor(seededUnit(seed, bar, salt + 992) * leaps.length) % leaps.length;
      return leaps[idx]!;
    }
  }

  if (intervalTendency === 'stepwise') {
    const best = sortedByPrev[0]!;
    if (u > 0.86 && sortedByPrev.length > 1) {
      return sortedByPrev[sortedByPrev.length - 1]!;
    }
    return best;
  }
  if (intervalTendency === 'angular') {
    const wide = [...candidates].sort((a, b) => Math.abs(b - prevMidi!) - Math.abs(a - prevMidi!))[0]!;
    return u < 0.42 ? wide : candidates[Math.floor(u * candidates.length) % candidates.length]!;
  }
  const idx = Math.floor(u * sortedByPrev.length) % sortedByPrev.length;
  return sortedByPrev[idx]!;
}

function resolveRhythmicMode(
  subdivision: MelodyRhythmicSubdivision,
  seed: number,
  bar: number
): 'whole_bar' | 'half_quarter' | 'eighth_patterns' {
  if (subdivision === 'mixed') {
    const u = seededUnit(seed, bar, 901);
    if (u < 0.34) return 'whole_bar';
    if (u < 0.67) return 'half_quarter';
    return 'eighth_patterns';
  }
  if (subdivision === 'whole_bar') return 'whole_bar';
  if (subdivision === 'half_quarter') return 'half_quarter';
  return 'eighth_patterns';
}

function rhythmCellsForBar(
  mode: 'whole_bar' | 'half_quarter' | 'eighth_patterns',
  seed: number,
  bar: number
): Array<{ startBeat: number; duration: number }> {
  const u = seededUnit(seed, bar, 777);
  switch (mode) {
    case 'whole_bar':
      return [{ startBeat: 0, duration: 4 }];
    case 'half_quarter':
      if (u < 0.55) {
        return [
          { startBeat: 0, duration: 2 },
          { startBeat: 2, duration: 2 },
        ];
      }
      return [
        { startBeat: 0, duration: 1 },
        { startBeat: 1, duration: 1 },
        { startBeat: 2, duration: 1 },
        { startBeat: 3, duration: 1 },
      ];
    case 'eighth_patterns': {
      const cells: Array<{ startBeat: number; duration: number }> = [];
      for (let i = 0; i < 8; i++) {
        const beat = i * 0.5;
        const play = seededUnit(seed, bar, 880 + i) > 0.24;
        if (play) cells.push({ startBeat: beat, duration: 0.5 });
      }
      if (cells.length === 0) cells.push({ startBeat: 0, duration: 0.5 });
      return cells;
    }
  }
}

interface PhraseMotifTemplate {
  cells: Array<{ startBeat: number; duration: number }>;
  semitoneOffsetsFromFirst: number[];
}

function applyChorusLiftToNotes(
  notes: MelodyNoteEvent[],
  chordPlan: SectionChordPlan[],
  liftSemitones: number
): MelodyNoteEvent[] {
  let m = 1;
  const liftByMeasure = new Map<number, number>();
  for (const b of chordPlan) {
    const lift = b.sectionKind === 'chorus' ? liftSemitones : 0;
    for (let i = 0; i < b.chordSymbols.length; i++) {
      liftByMeasure.set(m, lift);
      m += 1;
    }
  }
  return notes.map((n) => ({
    ...n,
    midi: n.midi + (liftByMeasure.get(n.measure) ?? 0),
  }));
}

function clampMidiToRange(notes: MelodyNoteEvent[], lo: number, hi: number): MelodyNoteEvent[] {
  return notes.map((n) => ({
    ...n,
    midi: Math.min(hi, Math.max(lo, n.midi)),
  }));
}

export interface PlanLeadMelodyInput {
  seed: number;
  sections: SongSectionPlan[];
  chordPlan: SectionChordPlan[];
  hookPlan: HookPlan;
  chorusPlan: ChorusPlan;
  hook: SongHook;
  voiceType: SongVoiceType;
  /** From {@link SongwritingPlanningBundle} — drives rhythm, intervals, motif repetition. */
  melodyBehaviour: MelodyBehaviourPlan;
  /**
   * Optional authoritative harmony (e.g. locked bars when wired from runtime).
   * When omitted or shorter than form, scaffold symbols from `chordPlan` fill the gap.
   */
  harmonyBars?: string[];
}

export function planLeadMelody(input: PlanLeadMelodyInput): LeadMelodyPlan {
  const { seed, chordPlan, hookPlan, hook, chorusPlan, voiceType, melodyBehaviour } = input;
  const scaffoldBars = flattenChordPlanToHarmonyBars(chordPlan);
  const override = input.harmonyBars;
  const harmonyForBar = (bar1: number): string => {
    const i = bar1 - 1;
    if (override && override.length > i && override[i]) return override[i]!;
    return scaffoldBars[i] ?? scaffoldBars[scaffoldBars.length - 1] ?? 'Cmaj7';
  };

  const profile = getSingerRangeProfile(voiceType);
  const [coLo, coHi] = profile.comfortRangeMidi;
  const lift = Math.min(chorusPlan.chorusLiftSemitones, profile.maxChorusLiftSemitones);

  const contours = chordPlan.map((b, idx) => contourForPhrase(b.sectionKind, hookPlan, seed, idx));

  let hookReturnMeasure: number | undefined;
  const firstChorus = chordPlan.find((c) => c.sectionKind === 'chorus');
  if (firstChorus) {
    let m = 1;
    for (const b of chordPlan) {
      if (b.sectionOrder === firstChorus.sectionOrder && b.sectionKind === 'chorus') {
        hookReturnMeasure = m;
        break;
      }
      m += b.chordSymbols.length;
    }
  }

  const phrases = buildPhraseEntriesFromChordPlan(chordPlan, contours, hookReturnMeasure);
  const notes: MelodyNoteEvent[] = [];
  const cadenceMeasures: number[] = [];

  const phraseMotifs = new Map<string, PhraseMotifTemplate>();

  for (const ph of phrases) {
    cadenceMeasures.push(ph.cadenceMeasure);
    const contourFromProfile = melodyContourProfileToPhraseKind(melodyBehaviour.contourProfile);
    const contour =
      hook.contourHint === 'ascending' && ph.sectionKind === 'chorus' ? 'ascending' : contourFromProfile;

    const apexMeasure =
      ph.cadenceMeasure > ph.startMeasure ? ph.cadenceMeasure - 1 : ph.startMeasure;

    for (let m = ph.startMeasure; m <= ph.endMeasure; m++) {
      const chordSym = harmonyForBar(m);
      const ct = chordTonesForChordSymbol(chordSym, { lockedHarmony: true });
      const candidates = chordTonesToMelodyMidis(ct, coLo, coHi);

      const rhythmMode = resolveRhythmicMode(melodyBehaviour.rhythmicSubdivision, seed, m);
      const tpl = phraseMotifs.get(ph.phraseId);
      const useMotif =
        tpl &&
        m > ph.startMeasure &&
        seededUnit(seed, m, 1003) < melodyBehaviour.repetitionVsVariationBias * 0.88;

      let cells: Array<{ startBeat: number; duration: number }>;
      if (useMotif && tpl) {
        cells = tpl.cells;
      } else {
        cells = rhythmCellsForBar(rhythmMode, seed, m);
      }

      const barNotes: MelodyNoteEvent[] = [];
      let prevInBar: number | undefined;
      const prevGlobal = notes.length > 0 ? notes[notes.length - 1]!.midi : undefined;

      const motifOk =
        Boolean(useMotif && tpl && tpl.semitoneOffsetsFromFirst.length === cells.length);

      if (motifOk && tpl) {
        const anchor = pickMidiFromCandidates(
          candidates,
          prevGlobal,
          melodyBehaviour.intervalTendency,
          seed,
          m,
          1101,
          contour,
          Boolean(melodyBehaviour.wideLeapPeakPerPhrase && m === apexMeasure)
        );
        for (let ci = 0; ci < cells.length; ci++) {
          const cell = cells[ci]!;
          let midi = anchor + tpl.semitoneOffsetsFromFirst[ci]!;
          midi = Math.min(coHi, Math.max(coLo, midi));
          barNotes.push({ measure: m, beat: cell.startBeat, duration: cell.duration, midi });
        }
      } else {
        for (let ci = 0; ci < cells.length; ci++) {
          const cell = cells[ci]!;
          const intervalSalt = ci * 17 + m * 31 + melodyBehaviour.phraseLength * 3;
          const prevForPick = ci === 0 ? prevGlobal : prevInBar ?? prevGlobal;
          const wideLeapPeakThisNote =
            Boolean(melodyBehaviour.wideLeapPeakPerPhrase) && m === apexMeasure && ci === 0;
          const midi = pickMidiFromCandidates(
            candidates,
            prevForPick,
            melodyBehaviour.intervalTendency,
            seed,
            m,
            intervalSalt,
            contour,
            wideLeapPeakThisNote
          );
          barNotes.push({ measure: m, beat: cell.startBeat, duration: cell.duration, midi });
          prevInBar = midi;
        }
      }

      if (m === ph.startMeasure && melodyBehaviour.repetitionVsVariationBias >= 0.48) {
        const firstMidi = barNotes[0]?.midi ?? candidates[0] ?? 60;
        const semitoneOffsetsFromFirst = barNotes.map((ev) => ev.midi - firstMidi);
        phraseMotifs.set(ph.phraseId, {
          cells,
          semitoneOffsetsFromFirst,
        });
      }

      notes.push(...barNotes);
    }
  }

  const notesLifted = applyChorusLiftToNotes(notes, chordPlan, lift);
  const [absLo, absHi] = profile.absoluteRangeMidi;
  const notesClamped = clampMidiToRange(notesLifted, absLo, absHi);

  return {
    phrases,
    notes: notesClamped,
    contourArc: overallContourArc(seed),
    hookReturnMeasure,
    cadenceMeasures,
  };
}
