/**
 * BB Light Touch — cap doublings and thin inner voices for SQ→BB section render.
 */

import type { SectionAssignment, SectionWritingIntent } from '../counterpoint/quartetFeatureTypes';
import type { BigBandSectionNoteStub, BigBandSectionRenderOutput } from './bigBandSectionPlanRenderer';

export interface BbLightTouchPolicy {
  enabled: boolean;
  maxDoublings: number;
  silenceInnerVoices: boolean;
  preserveDuoLine: boolean;
}

export const DEFAULT_BB_LIGHT_TOUCH_OFF: BbLightTouchPolicy = {
  enabled: false,
  maxDoublings: 1,
  silenceInnerVoices: true,
  preserveDuoLine: true,
};

export const DEFAULT_BB_LIGHT_TOUCH_ON: BbLightTouchPolicy = {
  enabled: true,
  maxDoublings: 1,
  silenceInnerVoices: true,
  preserveDuoLine: true,
};

export function bbLightTouchPolicyFromRequest(enabled: boolean | undefined): BbLightTouchPolicy {
  return enabled === true ? { ...DEFAULT_BB_LIGHT_TOUCH_ON } : { ...DEFAULT_BB_LIGHT_TOUCH_OFF };
}

/** Filter section assignments before soli materialization. */
export function filterAssignmentsForBbLightTouch(
  assignments: readonly SectionAssignment[],
  policy: BbLightTouchPolicy,
): SectionAssignment[] {
  if (!policy.enabled) return [...assignments];

  const out: SectionAssignment[] = [];
  let doublingKept = 0;

  for (const a of assignments) {
    if (a.role === 'doubling') {
      if (doublingKept >= policy.maxDoublings) continue;
      doublingKept++;
      out.push(a);
      continue;
    }
    if (policy.silenceInnerVoices && (a.role === 'counterline' || a.role === 'pad')) {
      continue;
    }
    out.push(a);
  }

  if (policy.preserveDuoLine) {
    const hasLead = out.some((a) => a.role === 'lead');
    if (!hasLead) {
      const lead = assignments.find((a) => a.role === 'lead');
      if (lead) {
        out.unshift(lead);
      } else {
        out.unshift({
          section: 'saxes',
          role: 'lead',
          sourceVoiceIds: ['S'],
          prominence: 1,
          lineDerived: true,
        });
      }
    }
  }

  return out;
}

export function countDoublingAssignments(intent: SectionWritingIntent): number {
  return intent.assignments.filter((a) => a.role === 'doubling').length;
}

export function countDoublingNotesInRender(render: BigBandSectionRenderOutput): number {
  let n = 0;
  for (const phrase of render.phrases) {
    for (const note of phrase.notes) {
      if (note.role === 'doubling') n++;
    }
  }
  return n;
}

export function hasLeadLineInRender(render: BigBandSectionRenderOutput): boolean {
  return render.phrases.some((p) => p.notes.some((n) => n.role === 'lead'));
}
