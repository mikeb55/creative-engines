/**
 * Dev 7 beside Dev 6.
 * planAutoColor stays the authority. These notes say when graded out, pivot, or extraction may help.
 * They do not replace retain, reseat, hold, or silence.
 */

import { planAutoColor, type AutoColorContext, type AutoColorPlan, type MusicalIntention } from './autoColor';
import { fieldFromResource, measureFieldDistance, type PentatonicField } from './fieldDistance';
import { buildReturnPath, planGradedOut, PENTATONIC_GRADED_OUT_VERSION, type GradedOutPlan, type OutnessLevel } from './gradedOut';
import { layerRoleForDuo, planLayeredField, type LayeredFieldPlan } from './layeredField';
import { extractParentField, type ExtractionResult } from './parentExtraction';
import { canonicalPitchSetId } from './pitch';
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
  const moved = dev6ChoseMove(dev6);
  const chosen = fieldOf(dev6.targetResourceId, ctx.centreNote);
  if (silence || intentions.includes('MORE_SPACE')) {
    return emptyAdvice(dev6, 'SILENCE', false, 'Silence stays. No field change.');
  }
  if (ctx.pathIsNone || (dev6.operator === 'NONE' && dev6.outcome === 'NONE') || dev6.outcome === 'NONE') {
    return emptyAdvice(dev6, 'NONE', false, 'PATH NONE stays discontinuous. Dev 7 does not smooth it.');
  }
  if (!current) {
    return emptyAdvice(dev6, 'NONE', false, 'No current field. Nothing was invented.');
  }
  if (ctx.layered) {
    return {
      ...emptyAdvice(dev6, 'LAYERED_FIELD', false, 'Layered field is metadata. It does not write a phrase or a new field.'),
      layered: planLayeredField({ field: current, role: layerRoleForDuo(dev6.duoRole) }),
    };
  }
  if (has(intentions, 'MORE_AMBIGUOUS') && ctx.parentPitchClasses && ctx.parentPitchClasses.length > 0) {
    const extraction = extractParentField({ parentPitchClasses: ctx.parentPitchClasses, current, home, centreSpelling: ctx.centreNote });
    return {
      ...emptyAdvice(dev6, 'PARENT_EXTRACTION', false, `${extraction.explanation} Report only. No field was planned.`),
      extraction,
    };
  }
  if (has(intentions, 'RETURN_HOME') && home && moved && dev6.homeReturn) {
    const pivot = planPivotLink({ source: current, destination: home, home, motifPitchClasses: ctx.motifPitchClasses });
    return { ...emptyAdvice(dev6, 'PIVOT_LINK', false, 'Dev 6 already chose the return. Pivot link only checks that pair.'), pivot };
  }
  if (has(intentions, 'RETURN_HOME') && !moved) {
    return emptyAdvice(dev6, 'PIVOT_LINK', false, 'Dev 6 did not choose a return. No destination was started.');
  }
  if (moved && chosen && !sameField(current, chosen)) {
    const outness: OutnessLevel = ctx.outness ?? bandFor(measureFieldDistance(current, chosen).distanceClass);
    const gradedOut = annotateChosenDistance(current, chosen, home, outness);
    const pivot = planPivotLink({ source: current, destination: chosen, home, motifPitchClasses: ctx.motifPitchClasses });
    return { ...emptyAdvice(dev6, 'GRADED_OUT', false, gradedOut.explanation), gradedOut, pivot };
  }
  if (has(intentions, 'MORE_CONTINUITY') || has(intentions, 'RETAIN_MOTIF')) {
    const pivot = planPivotLink({ source: current, destination: current, home, motifPitchClasses: ctx.motifPitchClasses });
    return { ...emptyAdvice(dev6, 'PIVOT_LINK', false, 'Hold or reseat. A link phrase is not required.'), pivot };
  }
  if (has(intentions, 'MORE_OUTSIDE') || has(intentions, 'TENSION_THEN_RESOLVE') || ctx.outness) {
    const outness: OutnessLevel = ctx.outness ?? 'MODERATE';
    const gradedOut = planGradedOut({ source: current, outness, home });
    return {
      ...emptyAdvice(dev6, 'GRADED_OUT', false, `Informational. Dev 6 did not move. ${gradedOut.explanation}`),
      gradedOut,
    };
  }
  return emptyAdvice(dev6, 'NONE', false, 'Dev 6 plan stands. No extra field.');
}

function dev6ChoseMove(dev6: AutoColorPlan): boolean {
  if (dev6.operator === 'RETAIN' || dev6.operator === 'HOLD_FIELD' || dev6.operator === 'NONE') return false;
  if (
    dev6.outcome === 'NONE'
    || dev6.outcome === 'NO_PHRASE'
    || dev6.outcome === 'STRUCTURAL_SILENCE'
    || dev6.outcome === 'KEEP_CURRENT'
    || dev6.outcome === 'INSUFFICIENT_CONTEXT'
  ) return false;
  if (dev6.silencePreference === 'STRUCTURAL_SILENCE' || dev6.silencePreference === 'NO_PHRASE' || dev6.silencePreference === 'PATH_NONE') return false;
  return dev6.fieldChanged;
}

function annotateChosenDistance(
  source: PentatonicField,
  destination: PentatonicField,
  home: PentatonicField | null,
  outness: OutnessLevel,
): GradedOutPlan {
  const distance = measureFieldDistance(source, destination);
  return {
    version: PENTATONIC_GRADED_OUT_VERSION,
    disposition: 'DISTANCE',
    initiatesMove: false,
    outness,
    source,
    destination,
    distance,
    returnPath: buildReturnPath(source, destination, home),
    explanation: `Dev 6 already chose ${destination.displayName}. Distance is ${distance.distanceClass.toLowerCase()}, ${distance.sharedCount} shared notes. Dev 7 does not replace that field.`,
  };
}

function bandFor(distanceClass: string): OutnessLevel {
  if (distanceClass === 'OUTSIDE') return 'STRONG';
  if (distanceClass === 'REMOTE') return 'REMOTE';
  if (distanceClass === 'RELATED') return 'MODERATE';
  return 'SUBTLE';
}

function sameField(left: PentatonicField, right: PentatonicField): boolean {
  return canonicalPitchSetId(left.pitchClasses) === canonicalPitchSetId(right.pitchClasses);
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
