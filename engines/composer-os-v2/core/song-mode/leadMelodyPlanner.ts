/**
 * Orchestrates contour + phrase plans and emits a sparse lead melody (one anchor per bar).
 */

import type { ChorusPlan } from './chorusPlanner';
import type { HookPlan } from './hookPlanner';
import type { SectionChordPlan } from './songCompilationTypes';
import type { SongHook } from './songHookTypes';
import type { SongSectionPlan, SongVoiceType } from './songModeTypes';
import { contourForPhrase, overallContourArc } from './melodyContourPlanner';
import { buildPhraseEntriesFromChordPlan } from './melodyPhrasePlanner';
import type { LeadMelodyPlan, MelodyNoteEvent } from './leadMelodyTypes';
import { getSingerRangeProfile } from './singerRangeProfiles';

const PENT = [60, 62, 64, 67, 69];

function pickPitch(seed: number, barIndex: number, phraseContour: LeadMelodyPlan['phrases'][0]['contour']): number {
  const i = (seed + barIndex * 13 + (phraseContour === 'ascending' ? 1 : 0)) % PENT.length;
  let p = PENT[i];
  if (phraseContour === 'descending') p = PENT[(i + 2) % PENT.length];
  if (phraseContour === 'arch' && barIndex % 4 >= 2) p += 2;
  return p;
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
}

export function planLeadMelody(input: PlanLeadMelodyInput): LeadMelodyPlan {
  const { seed, chordPlan, hookPlan, hook, chorusPlan, voiceType } = input;
  const profile = getSingerRangeProfile(voiceType);
  const lift = Math.min(chorusPlan.chorusLiftSemitones, profile.maxChorusLiftSemitones);
  const contours = chordPlan.map((b, idx) =>
    contourForPhrase(b.sectionKind, hookPlan, seed, idx)
  );
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

  for (const ph of phrases) {
    cadenceMeasures.push(ph.cadenceMeasure);
    for (let m = ph.startMeasure; m <= ph.endMeasure; m++) {
      const contour =
        hook.contourHint === 'ascending' && ph.sectionKind === 'chorus' ? 'ascending' : ph.contour;
      const midi = pickPitch(seed, m, contour);
      notes.push({ measure: m, beat: 0, duration: 4, midi });
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
