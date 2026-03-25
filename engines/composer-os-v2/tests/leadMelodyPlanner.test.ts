/**
 * Lead melody planning (Prompt B/3).
 */

import { planLeadMelody } from '../core/song-mode/leadMelodyPlanner';
import { validateHookReturnConsistency, validateLeadMelodyPlan } from '../core/song-mode/melodyValidation';
import { planChorusMetadata } from '../core/song-mode/chorusPlanner';
import { planHookMetadata } from '../core/song-mode/hookPlanner';
import { buildSongHook, buildSectionChordPlans } from '../core/song-mode/songModeBuilder';
import { planDefaultVerseChorusStructure } from '../core/song-mode/songSectionPlanner';

export function runLeadMelodyPlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const sections = planDefaultVerseChorusStructure();
  const chordPlan = buildSectionChordPlans(sections, 11);
  const hookPlan = planHookMetadata(11, sections, 'max_martin');
  const chorusPlan = planChorusMetadata(sections, 'max_martin');
  const hook = buildSongHook(11);
  const plan = planLeadMelody({
    seed: 11,
    sections,
    chordPlan,
    hookPlan,
    chorusPlan,
    hook,
    voiceType: 'male_tenor',
  });

  out.push({
    ok:
      plan.notes.length > 0 &&
      plan.phrases.length > 0 &&
      plan.cadenceMeasures.length > 0 &&
      ['rising', 'falling', 'balanced'].includes(plan.contourArc),
    name: 'planLeadMelody emits notes, phrases, cadences, contour arc',
  });

  out.push({
    ok: plan.hookReturnMeasure != null && typeof plan.hookReturnMeasure === 'number',
    name: 'default structure sets hookReturnMeasure for chorus entry',
  });

  const v = validateLeadMelodyPlan(plan);
  out.push({
    ok: v.ok,
    name: 'validateLeadMelodyPlan accepts full plan',
  });

  const hookOk = validateHookReturnConsistency(plan, hookPlan.expectsHookReturnInChorus);
  out.push({
    ok: hookOk.ok,
    name: 'hook return consistency passes when chorus expects return',
  });

  const badHook = validateHookReturnConsistency(
    { ...plan, hookReturnMeasure: undefined },
    true
  );
  out.push({
    ok: !badHook.ok && badHook.errors.some((e) => e.includes('hookReturnMeasure')),
    name: 'negative: missing hook return when expected fails validation',
  });

  const empty = validateLeadMelodyPlan({
    phrases: [],
    notes: [],
    contourArc: 'balanced',
    cadenceMeasures: [],
  });
  out.push({
    ok: !empty.ok && empty.errors.some((e) => e.includes('empty')),
    name: 'negative: empty lead melody fails validation',
  });

  return out;
}
