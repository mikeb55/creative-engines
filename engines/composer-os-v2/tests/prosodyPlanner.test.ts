/**
 * Prosody placeholder planning (Prompt B/3).
 */

import { planProsodyPlaceholders } from '../core/song-mode/prosodyPlanner';
import { validateProsodyPlaceholderPlan } from '../core/song-mode/prosodyValidation';
import type { ProsodyPlaceholderPlan } from '../core/song-mode/lyricProsodyTypes';

const sampleMelody = {
  phrases: [
    {
      phraseId: 'verse_0',
      sectionOrder: 0,
      sectionKind: 'verse',
      startMeasure: 1,
      endMeasure: 4,
      cadenceMeasure: 4,
      contour: 'arch' as const,
      repetitionTag: 'statement' as const,
      phraseLengthBars: 4,
    },
  ],
  notes: [{ measure: 1, beat: 0, duration: 4, midi: 60 }],
  contourArc: 'balanced' as const,
  hookReturnMeasure: 5,
  cadenceMeasures: [4],
};

export function runProsodyPlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const p = planProsodyPlaceholders(sampleMelody, null, 3);
  out.push({
    ok:
      p.lines.length === 1 &&
      p.lines[0].syllableSlots.length === 4 &&
      p.lines[0].stressPattern.length > 0 &&
      p.melodicStressAlignmentScore >= 0 &&
      p.melodicStressAlignmentScore <= 1,
    name: 'planProsodyPlaceholders emits syllable slots and stress pattern',
  });

  const v = validateProsodyPlaceholderPlan(p);
  out.push({
    ok: v.ok,
    name: 'validateProsodyPlaceholderPlan accepts planner output',
  });

  const bad: ProsodyPlaceholderPlan = {
    lines: [
      {
        phraseId: 'x',
        syllableSlots: [2],
        stressPattern: [],
        emotionalContourTag: 'intimate',
      },
    ],
    authorAlignment: 'none',
    melodicStressAlignmentScore: 2,
  };
  const vBad = validateProsodyPlaceholderPlan(bad);
  out.push({
    ok:
      !vBad.ok &&
      vBad.errors.some((e) => e.includes('stress')) &&
      vBad.errors.some((e) => e.includes('alignment')),
    name: 'negative: invalid stress / alignment fails prosody validation',
  });

  return out;
}
