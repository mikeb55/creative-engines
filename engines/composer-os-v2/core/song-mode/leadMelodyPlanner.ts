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
import { MELODY_PROFILE } from '../generation/generationModeProfile';

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
    case 'flat':
    case 'flat_with_terminal_climax':
    case 'conversational':
      return 'wave';
    case 'irregular':
    case 'dramatic_leap':
    case 'motivic_development':
    case 'speech_contour':
      return 'wave';
    default:
      return 'wave';
  }
}

/** Bar-index contour bias −1…+1 for pitch-selection bias (not forced melody). */
export function contourBarBiasForProfile(
  profile: MelodyContourProfileId,
  idxInPhrase: number,
  phraseLenBars: number,
  seed: number
): number {
  const len = Math.max(1, phraseLenBars);
  const t = len <= 1 ? 0 : idxInPhrase / (len - 1);
  const u = seededUnit(seed, idxInPhrase, 5021);

  switch (profile) {
    case 'arch':
    case 'wide_arc':
    case 'bebop_arc':
    case 'cabaret_arc':
      return t < 0.5 ? t * 2 * 0.85 : (1 - (t - 0.5) * 2) * -0.85;
    case 'ascending':
    case 'rising':
    case 'sequence':
      return -0.65 + t * 1.2;
    case 'dissolving':
      return 0.75 - t * 1.1;
    case 'flat_with_terminal_climax':
      return idxInPhrase >= len - 2 ? 0.55 + u * 0.25 : -0.05 + u * 0.08;
    case 'flat':
    case 'riff':
    case 'groove_arc':
      return (u - 0.5) * 0.15;
    case 'speech_contour':
      return idxInPhrase <= 1 ? 0.35 : idxInPhrase >= len - 1 ? -0.45 : -0.05;
    case 'dramatic_leap':
      return idxInPhrase === 0 ? 0.75 : -0.15 + u * 0.1;
    case 'motivic_development':
      return Math.sin((u + t) * Math.PI * 2) * 0.35;
    case 'recitation':
      return idxInPhrase >= len - 1 ? -0.5 : 0.08;
    case 'irregular':
      return (seededUnit(seed, idxInPhrase, 7771) - 0.5) * 0.5;
    default:
      return (seededUnit(seed, idxInPhrase, 8881) - 0.5) * 0.25;
  }
}

function maxLeapSemitonesForTendency(tendency: MelodyBehaviourPlan['intervalTendency']): number {
  if (tendency === 'stepwise') return 3;
  if (tendency === 'mixed') return 7;
  return 11;
}

function maxLeapsOverThreePerPhrase(tendency: MelodyBehaviourPlan['intervalTendency']): number {
  if (tendency === 'stepwise') return 1;
  if (tendency === 'mixed') return 3;
  return 5;
}

interface LeapPhraseState {
  leapsOver3: number;
  pendingContrary: boolean;
  prevLeapSign: number;
}

function filterCandidatesLeapBudget(
  candidates: number[],
  prev: number | undefined,
  tendency: MelodyBehaviourPlan['intervalTendency'],
  st: LeapPhraseState
): number[] {
  if (prev === undefined || candidates.length === 0) return candidates;
  const maxLeap = maxLeapSemitonesForTendency(tendency);
  const maxBig = maxLeapsOverThreePerPhrase(tendency);
  let pool = candidates.filter((c) => Math.abs(c - prev) <= maxLeap);
  if (pool.length === 0) pool = [...candidates].sort((a, b) => Math.abs(a - prev!) - Math.abs(b - prev!)).slice(0, 4);
  if (st.leapsOver3 >= maxBig) {
    const tight = pool.filter((c) => Math.abs(c - prev) <= 3);
    if (tight.length > 0) pool = tight;
  }
  return pool.length > 0 ? pool : candidates;
}

function pickWithContourBias(
  candidates: number[],
  prevMidi: number | undefined,
  tendency: MelodyBehaviourPlan['intervalTendency'],
  seed: number,
  bar: number,
  salt: number,
  contourBarBias: number,
  contourStrength: number,
  basePick: () => number
): number {
  if (prevMidi === undefined || candidates.length === 0) return basePick();
  const str = Math.max(0, Math.min(1, contourStrength));
  if (str <= 0.02) return basePick();
  const bias = contourBarBias;
  let best = candidates[0]!;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const delta = c - prevMidi;
    const dir = delta === 0 ? 0 : delta > 0 ? 1 : -1;
    const contourFit = dir * bias * str * 5;
    const proximity = -Math.abs(delta) * (1.15 - str * 0.35);
    const sc = contourFit + proximity;
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  }
  const maxL = maxLeapSemitonesForTendency(tendency);
  return Math.abs(best - prevMidi) <= maxL ? best : basePick();
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

/** Nudge first attack off beat 1 for floating-entrance MAL profiles (e.g. Gil Evans cloud). */
function delayFloatingEntranceOnCells(
  cells: Array<{ startBeat: number; duration: number }>
): Array<{ startBeat: number; duration: number }> {
  if (cells.length === 0) return cells;
  const [first, ...rest] = cells;
  if (first.startBeat > 0.08) return cells;
  const slack = Math.min(1.75, Math.max(0.35, first.duration * 0.38));
  const newStart = Math.min(3.25, first.startBeat + slack);
  const newDur = Math.max(0.25, first.duration - slack);
  return [{ ...first, startBeat: newStart, duration: newDur }, ...rest];
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
  /** Bar contour bias strength — defaults to {@link MELODY_PROFILE}. */
  contourPlanningStrength?: number;
}

function updateLeapPhraseState(st: LeapPhraseState, prev: number | undefined, midi: number): void {
  if (prev === undefined) return;
  const iv = midi - prev;
  if (Math.abs(iv) > 3) st.leapsOver3++;
  if (Math.abs(iv) > 7) {
    st.pendingContrary = true;
    st.prevLeapSign = iv === 0 ? 0 : iv > 0 ? 1 : -1;
  }
}

export function planLeadMelody(input: PlanLeadMelodyInput): LeadMelodyPlan {
  const { seed, chordPlan, hookPlan, hook, chorusPlan, voiceType, melodyBehaviour } = input;
  const contourPlanningStrength = input.contourPlanningStrength ?? MELODY_PROFILE.contourPlanningStrength;
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
    const leapSt: LeapPhraseState = { leapsOver3: 0, pendingContrary: false, prevLeapSign: 0 };
    const phraseLenBars = ph.endMeasure - ph.startMeasure + 1;
    const contourFromProfile = melodyContourProfileToPhraseKind(melodyBehaviour.contourProfile);
    const contour =
      hook.contourHint === 'ascending' && ph.sectionKind === 'chorus' ? 'ascending' : contourFromProfile;

    const apexMeasure =
      ph.cadenceMeasure > ph.startMeasure ? ph.cadenceMeasure - 1 : ph.startMeasure;

    const pickMelodicIdentityMidi = (
      candidatesIn: number[],
      prevForPick: number | undefined,
      wideLeapPeakThisNote: boolean,
      salt: number,
      measure: number
    ): { midi: number; melodicDiagnostics?: string[] } => {
      const barBias = contourBarBiasForProfile(
        melodyBehaviour.contourProfile,
        measure - ph.startMeasure,
        phraseLenBars,
        seed
      );
      let candPool = filterCandidatesLeapBudget(
        candidatesIn,
        prevForPick,
        melodyBehaviour.intervalTendency,
        leapSt
      );

      if (prevForPick !== undefined && leapSt.pendingContrary) {
        const tight = candPool.filter((c) => Math.abs(c - prevForPick) <= 2);
        const opp = tight.filter(
          (c) => c !== prevForPick && Math.sign(c - prevForPick) !== leapSt.prevLeapSign
        );
        const pool = opp.length > 0 ? opp : tight;
        const midiFallback = pickMidiFromCandidates(
          candPool,
          prevForPick,
          melodyBehaviour.intervalTendency,
          seed,
          measure,
          salt,
          contour,
          wideLeapPeakThisNote
        );
        const midi =
          pool.length > 0
            ? [...pool].sort((a, b) => Math.abs(a - prevForPick) - Math.abs(b - prevForPick))[0]!
            : midiFallback;
        leapSt.pendingContrary = false;
        updateLeapPhraseState(leapSt, prevForPick, midi);
        return { midi, melodicDiagnostics: ['post_leap_recovery'] };
      }

      candPool = filterCandidatesLeapBudget(
        candidatesIn,
        prevForPick,
        melodyBehaviour.intervalTendency,
        leapSt
      );
      const raw = pickMidiFromCandidates(
        candPool,
        prevForPick,
        melodyBehaviour.intervalTendency,
        seed,
        measure,
        salt,
        contour,
        wideLeapPeakThisNote
      );
      let midi = pickWithContourBias(
        candPool,
        prevForPick,
        melodyBehaviour.intervalTendency,
        seed,
        measure,
        salt,
        barBias,
        contourPlanningStrength,
        () => raw
      );
      midi = Math.min(coHi, Math.max(coLo, midi));
      updateLeapPhraseState(leapSt, prevForPick, midi);
      return { midi };
    };

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
        if (melodyBehaviour.malLeadHints?.avoidStrongBeatOneAttack && m === ph.startMeasure) {
          cells = delayFloatingEntranceOnCells(cells.map((c) => ({ ...c })));
        }
      } else {
        cells = rhythmCellsForBar(rhythmMode, seed, m);
        if (melodyBehaviour.malLeadHints?.avoidStrongBeatOneAttack) {
          cells = delayFloatingEntranceOnCells(cells.map((c) => ({ ...c })));
        }
      }

      const barNotes: MelodyNoteEvent[] = [];
      let prevInBar: number | undefined;
      const prevGlobal = notes.length > 0 ? notes[notes.length - 1]!.midi : undefined;

      const motifOk =
        Boolean(useMotif && tpl && tpl.semitoneOffsetsFromFirst.length === cells.length);

      if (motifOk && tpl) {
        const anchorPick = pickMelodicIdentityMidi(
          candidates,
          prevGlobal,
          Boolean(melodyBehaviour.wideLeapPeakPerPhrase && m === apexMeasure),
          1101,
          m
        );
        const anchor = anchorPick.midi;
        for (let ci = 0; ci < cells.length; ci++) {
          const cell = cells[ci]!;
          let midi = anchor + tpl.semitoneOffsetsFromFirst[ci]!;
          midi = Math.min(coHi, Math.max(coLo, midi));
          const ev: MelodyNoteEvent = {
            measure: m,
            beat: cell.startBeat,
            duration: cell.duration,
            midi,
          };
          if (ci === 0 && anchorPick.melodicDiagnostics)
            ev.melodicDiagnostics = anchorPick.melodicDiagnostics;
          barNotes.push(ev);
        }
      } else {
        for (let ci = 0; ci < cells.length; ci++) {
          const cell = cells[ci]!;
          const intervalSalt = ci * 17 + m * 31 + melodyBehaviour.phraseLength * 3;
          const prevForPick = ci === 0 ? prevGlobal : prevInBar ?? prevGlobal;
          const wideLeapPeakThisNote =
            Boolean(melodyBehaviour.wideLeapPeakPerPhrase) && m === apexMeasure && ci === 0;
          const picked = pickMelodicIdentityMidi(
            candidates,
            prevForPick,
            wideLeapPeakThisNote,
            intervalSalt,
            m
          );
          const ev: MelodyNoteEvent = {
            measure: m,
            beat: cell.startBeat,
            duration: cell.duration,
            midi: picked.midi,
          };
          if (picked.melodicDiagnostics) ev.melodicDiagnostics = picked.melodicDiagnostics;
          barNotes.push(ev);
          prevInBar = picked.midi;
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
