/**
 * Dev 7 beside Dev 6.
 * planAutoColor stays the authority. These notes say when graded out, pivot, or extraction may help.
 * They do not replace retain, reseat, hold, or silence.
 */

import { planAutoColor, type AutoColorContext, type AutoColorPlan, type MusicalIntention } from './autoColor';
import { fieldFromResource, type PentatonicField } from './fieldDistance';
import { planGradedOut, type GradedOutPlan, type OutnessLevel } from './gradedOut';
import { planLayeredField, type LayeredFieldPlan } from './layeredField';
import { extractParentField, type ExtractionResult } from './parentExtraction';
import { planPivotLink, type PivotLinkPlan } from './pivotLink';

export interface ColourNavigationAdvice {
  consulted: 'NONE' | 'GRADED_OUT' | 'PIVOT_LINK' | 'PARENT_EXTRACTION' | 'LAYERED_FIELD' | 'SILENCE';
  applied: boolean;
  dev6Operator: string;
  gradedOut: GradedOutPlan | null;
  pivot: PivotLinkPlan | null;
  extraction: ExtractionResult | null;
  layered: LayeredFieldPlan | null;
  explanation: string;
}

export function planColourNavigation(ctx: AutoColorContext & {
  outness?: OutnessLevel;
  parentPitchClasses?: readonly number[];
  motifPitchClasses?: readonly number[];
  layered?: boolean;
}): { dev6: AutoColorPlan; advice: ColourNavigationAdvice } {
  const dev6 = planAutoColor(ctx);
  return { dev6, advice: adviseColourNavigation(ctx, dev6) };
}

export function adviseColourNavigation(ctx: AutoColorContext & {
  outness?: OutnessLevel;
  parentPitchClasses?: readonly number[];
  motifPitchClasses?: readonly number[];
  layered?: boolean;
}, dev6: AutoColorPlan): ColourNavigationAdvice {
  const current = fieldOf(ctx.currentResourceId, ctx.centreNote);
  const home = fieldOf(ctx.homeResourceId, ctx.centreNote);
  const silence = dev6.silencePreference === 'STRUCTURAL_SILENCE' || dev6.silencePreference === 'NO_PHRASE' || dev6.outcome === 'NO_PHRASE' || dev6.outcome === 'STRUCTURAL_SILENCE';
  const intentions = dev6.intentions;
  if (silence || intentions.includes('MORE_SPACE')) {
    return emptyAdvice(dev6, 'SILENCE', false, 'Silence stays. No field change.');
  }
  if (ctx.pathIsNone || dev6.operator === 'NONE' && dev6.outcome === 'NONE') {
    return emptyAdvice(dev6, 'NONE', false, 'PATH NONE stays discontinuous. Dev 7 does not smooth it.');
  }
  if (!current) {
    return emptyAdvice(dev6, 'NONE', false, 'No current field. Nothing was invented.');
  }
  if (ctx.layered) {
    const role = dev6.duoRole === 'BASS_RESPONDS' || intentions.includes('ANSWER_BASS') ? 'GUITAR_SLOW_BASS_ACTIVE' : 'GUITAR_ACTIVE_BASS_SLOW';
    return {
      ...emptyAdvice(dev6, 'LAYERED_FIELD', true, 'Guitar and bass share the current field at different densities.'),
      layered: planLayeredField({ field: current, role: role as 'GUITAR_SLOW_BASS_ACTIVE' | 'GUITAR_ACTIVE_BASS_SLOW' }),
    };
  }
  if (has(intentions, 'MORE_AMBIGUOUS') && ctx.parentPitchClasses && ctx.parentPitchClasses.length > 0) {
    const extraction = extractParentField({ parentPitchClasses: ctx.parentPitchClasses, current, home, centreSpelling: ctx.centreNote });
    const applied = extraction.disposition === 'FIELDS' && dev6.fieldChanged;
    return { ...emptyAdvice(dev6, 'PARENT_EXTRACTION', applied, extraction.explanation), extraction };
  }
  if (has(intentions, 'RETURN_HOME') && home) {
    const pivot = planPivotLink({ source: current, destination: home, home, motifPitchClasses: ctx.motifPitchClasses });
    return { ...emptyAdvice(dev6, 'PIVOT_LINK', dev6.homeReturn, 'Shortest return is the pivot back to HOME.'), pivot };
  }
  if (has(intentions, 'MORE_CONTINUITY') || has(intentions, 'RETAIN_MOTIF')) {
    const pivot = planPivotLink({ source: current, destination: current, home, motifPitchClasses: ctx.motifPitchClasses });
    return { ...emptyAdvice(dev6, 'PIVOT_LINK', false, 'Hold or reseat. A link phrase is not required.'), pivot };
  }
  if (has(intentions, 'MORE_OUTSIDE') || has(intentions, 'TENSION_THEN_RESOLVE') || ctx.outness) {
    const outness: OutnessLevel = ctx.outness ?? 'MODERATE';
    const earned = dev6.operator === 'SLIP' || Boolean(ctx.outness);
    const gradedOut = planGradedOut({ source: current, outness, home });
    const applied = earned && gradedOut.disposition === 'MOVE';
    const explanation = applied
      ? gradedOut.explanation
      : 'Dev 6 kept the field. Graded out is noted and is not taken.';
    return { ...emptyAdvice(dev6, 'GRADED_OUT', applied, explanation), gradedOut };
  }
  return emptyAdvice(dev6, 'NONE', false, 'Dev 6 plan stands. No extra field.');
}

function emptyAdvice(dev6: AutoColorPlan, consulted: ColourNavigationAdvice['consulted'], applied: boolean, explanation: string): ColourNavigationAdvice {
  return {
    consulted,
    applied,
    dev6Operator: dev6.operator,
    gradedOut: null,
    pivot: null,
    extraction: null,
    layered: null,
    explanation,
  };
}

function has(intentions: readonly MusicalIntention[], intention: MusicalIntention): boolean {
  return intentions.includes(intention);
}

function fieldOf(resourceId: string | null | undefined, centre: string | null | undefined): PentatonicField | null {
  if (!resourceId) return null;
  return fieldFromResource(resourceId, centre || 'C');
}
