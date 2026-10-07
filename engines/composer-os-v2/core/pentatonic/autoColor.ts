/**
 * Dev 6B AUTO COLOR.
 * A restrained plan over the frozen Dev 5 path, Dev 5 colour metadata,
 * Dev 6A form and duo readings, and the existing phrase operators.
 * It does not write notes, retune path cost, or add a second generator.
 */

import type { PentatonicScoreAnalysis } from './analyzeScore';
import { evaluatePentatonicColour } from './colourEvaluate';
import { getPentatonicColourResource, listPentatonicColourResources } from './colourRegistry';
import type { PentatonicColourFunction } from './colourTypes';
import {
  assessPentatonicFormDuo,
  formDuoEventsFromAnalysis,
  placeOperatorInForm,
  type DuoRole,
  type FormFunction,
  type RegisterClass,
} from './formDuoIntelligence';
import { assessGrounding, DEFAULT_OUTSIDE_BUDGET, type GroundingAssessment, type OutsideBudget, type PathTrajectory } from './pathIntelligence';
import {
  chooseSlipDirection,
  planPentatonicOperator,
  type Dev5bPurpose,
  type PentatonicOperator,
} from './phraseOperators';
import { isPerfectFourth } from './quartalField';
import { parseNoteToken } from './pitch';
import type { MotifMapMethod } from './motifTransform';

export const PENTATONIC_AUTO_COLOR_VERSION = 'pentatonic-auto-color-6b';

export const MUSICAL_INTENTIONS = [
  'DARKER',
  'BRIGHTER',
  'MORE_OUTSIDE',
  'LESS_OUTSIDE',
  'RETAIN_MOTIF',
  'MORE_CONTINUITY',
  'MORE_TENSION',
  'TENSION_THEN_RESOLVE',
  'MORE_SPACE',
  'LESS_DENSE',
  'MORE_SUSPENDED',
  'MORE_AMBIGUOUS',
  'MORE_EDGE',
  'RETURN_HOME',
  'STAY_CURRENT',
  'DEVELOP',
  'SUPPORT_BASS',
  'ANSWER_BASS',
  'SUPPORT_GUITAR',
  'ANSWER_GUITAR',
] as const;

export type MusicalIntention = (typeof MUSICAL_INTENTIONS)[number];

export const AUTO_COLOR_GUI_INTENTIONS: ReadonlyArray<readonly [MusicalIntention, string]> = [
  ['DARKER', 'darker'],
  ['BRIGHTER', 'brighter'],
  ['MORE_OUTSIDE', 'more outside'],
  ['RETAIN_MOTIF', 'retain motif'],
  ['TENSION_THEN_RESOLVE', 'tension then resolve'],
  ['MORE_SPACE', 'more space'],
  ['MORE_SUSPENDED', 'suspended'],
  ['STAY_CURRENT', 'stay current'],
];

export const DEV6B_REJECTED_BEHAVIOURS = [
  'maximise colour distance',
  'more chromatic means more outside',
  'style imitation',
  'artist name as a style button',
  'chord-scale mapping',
  'generic pentatonic lick',
  'velocity drop as space',
  'register drop as darker',
  'lower pitch as darker',
  'ii–V–I',
  'Roman-numeral function',
  'chord-by-chord collection switching',
  'both voices forced',
  'HOME at every boundary',
  'new field when reseat or hold is enough',
  'weak unresolved slip at an ending',
  'Woody Shaw semitone pair',
  'THROUGH',
  'generic SEQUENCE',
  'full INTENSIFY',
  'TAB',
] as const;

/** Structural reminders from earlier research. Names stay out of the plan text. */
export type StructuralStrategy =
  | 'LINEAGE_RESEAT'
  | 'BOUNDED_SLIP_RETURN'
  | 'STRONG_SLIP_LANDING'
  | 'DOWNWARD_STATIC_SLIP'
  | 'HOLD_ACROSS_HARMONY'
  | 'QUARTAL_SUPPORT';

export type AutoColorOutcome = 'PLAN' | 'KEEP_CURRENT' | 'NONE' | 'NO_PHRASE' | 'STRUCTURAL_SILENCE' | 'INSUFFICIENT_CONTEXT';

export type AutoColorAction = 'retain' | 'change' | 'abstain';

export type SilencePreference = 'NONE' | 'NO_PHRASE' | 'STRUCTURAL_SILENCE' | 'PATH_NONE';

export interface AutoColorContext {
  intentions?: readonly MusicalIntention[];
  text?: string;
  formFunction?: FormFunction;
  duoRole?: DuoRole;
  pathIsNone?: boolean;
  currentResourceId?: string | null;
  homeResourceId?: string | null;
  homeKnown?: boolean;
  fieldIsHome?: boolean;
  centreNote?: string | null;
  hasMotif?: boolean;
  lineageIdentity?: 'clear' | 'weak' | 'absent';
  density?: 'sparse' | 'moderate' | 'dense' | 'unknown';
  grounding?: GroundingAssessment | null;
  register?: RegisterClass;
  atPhraseBoundary?: boolean;
  atPhraseEnding?: boolean;
  atSectionBoundary?: boolean;
  holdCredible?: boolean;
  quartalAvailable?: boolean;
  pairIsRegion?: boolean;
  outsideDevicesAlreadyUsed?: number;
  melodyNotes?: readonly string[];
  methodRequest?: MotifMapMethod;
}

export interface AutoColorPlan {
  version: typeof PENTATONIC_AUTO_COLOR_VERSION;
  outcome: AutoColorOutcome;
  intentions: readonly MusicalIntention[];
  unknownPhrases: readonly string[];
  conflicts: readonly string[];
  formFunction: FormFunction;
  duoRole: DuoRole;
  action: AutoColorAction;
  targetColour: PentatonicColourFunction | 'CURRENT' | 'NONE';
  targetResourceId: string | null;
  selectedResource: string;
  operator: PentatonicOperator;
  phrasePurpose: Dev5bPurpose | 'NONE';
  trajectory: PathTrajectory;
  outsideBudget: OutsideBudget;
  returnBehaviour: string;
  silencePreference: SilencePreference;
  generationNeeded: boolean;
  fieldChanged: boolean;
  homeReturn: boolean;
  lineagePreserved: boolean;
  method: MotifMapMethod;
  strategy: StructuralStrategy | null;
  rationale: string;
  rejected: readonly string[];
}

interface Draft {
  outcome: AutoColorOutcome;
  action: AutoColorAction;
  targetColour: AutoColorPlan['targetColour'];
  targetResourceId: string | null;
  operator: PentatonicOperator;
  phrasePurpose: Dev5bPurpose | 'NONE';
  trajectory: PathTrajectory;
  outsideBudget: OutsideBudget;
  returnBehaviour: string;
  silencePreference: SilencePreference;
  generationNeeded: boolean;
  fieldChanged: boolean;
  homeReturn: boolean;
  lineagePreserved: boolean;
  strategy: StructuralStrategy | null;
  rationale: string;
  rejected: string[];
  conflicts: string[];
  placementRole: DuoRole;
  structuralSilence: boolean;
  purposeNoPhrase: boolean;
  explicitOutside: boolean;
  explicitReseat: boolean;
}

const SYNONYMS: Record<string, MusicalIntention> = {
  darker: 'DARKER',
  darken: 'DARKER',
  'more dark': 'DARKER',
  'darker colour': 'DARKER',
  'darker color': 'DARKER',
  brighter: 'BRIGHTER',
  brighten: 'BRIGHTER',
  'more bright': 'BRIGHTER',
  'brighter colour': 'BRIGHTER',
  'brighter color': 'BRIGHTER',
  outside: 'MORE_OUTSIDE',
  'more outside': 'MORE_OUTSIDE',
  'further out': 'MORE_OUTSIDE',
  'less outside': 'LESS_OUTSIDE',
  inside: 'LESS_OUTSIDE',
  'come inside': 'LESS_OUTSIDE',
  'retain motif': 'RETAIN_MOTIF',
  'keep motif': 'RETAIN_MOTIF',
  'keep the motif': 'RETAIN_MOTIF',
  'keep the cell': 'RETAIN_MOTIF',
  'retain the cell': 'RETAIN_MOTIF',
  continuity: 'MORE_CONTINUITY',
  'more continuity': 'MORE_CONTINUITY',
  hold: 'MORE_CONTINUITY',
  'hold field': 'MORE_CONTINUITY',
  tension: 'MORE_TENSION',
  'more tension': 'MORE_TENSION',
  'tension then resolve': 'TENSION_THEN_RESOLVE',
  'tension and resolve': 'TENSION_THEN_RESOLVE',
  'tension then resolution': 'TENSION_THEN_RESOLVE',
  space: 'MORE_SPACE',
  'more space': 'MORE_SPACE',
  breathe: 'MORE_SPACE',
  'less dense': 'LESS_DENSE',
  thinner: 'LESS_DENSE',
  'fewer notes': 'LESS_DENSE',
  suspended: 'MORE_SUSPENDED',
  'more suspended': 'MORE_SUSPENDED',
  sus: 'MORE_SUSPENDED',
  ambiguous: 'MORE_AMBIGUOUS',
  'more ambiguous': 'MORE_AMBIGUOUS',
  edge: 'MORE_EDGE',
  'more edge': 'MORE_EDGE',
  'return home': 'RETURN_HOME',
  'go home': 'RETURN_HOME',
  home: 'RETURN_HOME',
  stay: 'STAY_CURRENT',
  'stay current': 'STAY_CURRENT',
  'keep current': 'STAY_CURRENT',
  develop: 'DEVELOP',
  development: 'DEVELOP',
  'support bass': 'SUPPORT_BASS',
  'support the bass': 'SUPPORT_BASS',
  'answer bass': 'ANSWER_BASS',
  'answer the bass': 'ANSWER_BASS',
  'support guitar': 'SUPPORT_GUITAR',
  'support the guitar': 'SUPPORT_GUITAR',
  'answer guitar': 'ANSWER_GUITAR',
  'answer the guitar': 'ANSWER_GUITAR',
};

const CONTRADICTIONS: ReadonlyArray<readonly [MusicalIntention, MusicalIntention, string]> = [
  ['DARKER', 'BRIGHTER', 'DARKER contradicts BRIGHTER'],
  ['MORE_OUTSIDE', 'LESS_OUTSIDE', 'MORE_OUTSIDE contradicts LESS_OUTSIDE'],
  ['STAY_CURRENT', 'RETURN_HOME', 'STAY_CURRENT contradicts RETURN_HOME'],
  ['SUPPORT_BASS', 'ANSWER_BASS', 'SUPPORT_BASS contradicts ANSWER_BASS'],
  ['SUPPORT_GUITAR', 'ANSWER_GUITAR', 'SUPPORT_GUITAR contradicts ANSWER_GUITAR'],
];

const BAND = { low: 0, moderate: 1, high: 2 } as const;
const DISTANCE = { near: 0, moderate: 1, far: 2 } as const;

function has(intentions: readonly MusicalIntention[], intention: MusicalIntention): boolean {
  return intentions.includes(intention);
}

function normalisePhrase(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function parseMusicalIntentions(input: string | readonly string[]): { intentions: MusicalIntention[]; unknown: string[] } {
  const raw = Array.isArray(input) ? input.join(' + ') : input;
  const parts = raw
    .split(/\s*(?:\+|,|;|\band\b|\/)\s*/i)
    .map(normalisePhrase)
    .filter((part) => part.length > 0);
  const intentions: MusicalIntention[] = [];
  const unknown: string[] = [];
  for (const part of parts) {
    const direct = (MUSICAL_INTENTIONS as readonly string[]).includes(part.toUpperCase()) ? (part.toUpperCase() as MusicalIntention) : undefined;
    const mapped = direct ?? SYNONYMS[part];
    if (!mapped) {
      unknown.push(part);
      continue;
    }
    if (!intentions.includes(mapped)) intentions.push(mapped);
  }
  return { intentions, unknown };
}

function contradictionMessages(intentions: readonly MusicalIntention[], fieldIsHome: boolean): string[] {
  const messages: string[] = [];
  for (const [left, right, message] of CONTRADICTIONS) {
    if (!has(intentions, left) || !has(intentions, right)) continue;
    if (left === 'STAY_CURRENT' && right === 'RETURN_HOME' && fieldIsHome) continue;
    messages.push(message);
  }
  return messages;
}

function contextIsEnough(ctx: AutoColorContext): boolean {
  if (ctx.pathIsNone) return true;
  if (ctx.currentResourceId) return true;
  if (ctx.homeKnown) return true;
  if (ctx.hasMotif) return true;
  if (ctx.formFunction && ctx.formFunction !== 'unknown') return true;
  if (ctx.duoRole && ctx.duoRole !== 'UNKNOWN') return true;
  return false;
}

function resourceName(id: string | null): string {
  if (!id) return 'NONE';
  return getPentatonicColourResource(id)?.displayName ?? id;
}

function currentColour(ctx: AutoColorContext): PentatonicColourFunction | 'NONE' {
  if (ctx.pathIsNone || !ctx.currentResourceId) return 'NONE';
  if (ctx.fieldIsHome) return 'HOME';
  return getPentatonicColourResource(ctx.currentResourceId)?.metadata.primaryColour ?? 'CONTINUITY';
}

function colourShiftAllowed(form: FormFunction): boolean {
  return form === 'continuation' || form === 'development' || form === 'climax';
}

function outsideFormAllows(form: FormFunction): { allowed: boolean; reason: string | null } {
  if (form === 'opening') return { allowed: false, reason: 'Opening keeps a clear field. Outside would be gratuitous.' };
  if (form === 'continuation') return { allowed: false, reason: 'Continuation keeps the field. Outside waits.' };
  if (form === 'unknown') return { allowed: false, reason: 'Unknown form stays conservative. Outside is not assumed.' };
  if (form === 'release') return { allowed: false, reason: 'Release prefers home, continuity, or silence.' };
  if (form === 'ending') return { allowed: false, reason: 'An ending blocks a weak unresolved slip.' };
  if (form === 'climax') return { allowed: true, reason: null };
  return { allowed: true, reason: null };
}

function nearestColour(args: {
  currentId: string;
  direction: 'darker' | 'brighter';
  allowEdge: boolean;
}): { id: string; reason: string } | null {
  const current = getPentatonicColourResource(args.currentId);
  if (!current) return null;
  const currentBand = args.direction === 'darker' ? BAND[current.metadata.darkness] : BAND[current.metadata.brightness];
  if (currentBand >= 2 && (args.direction === 'darker' ? BAND[current.metadata.brightness] === 0 : BAND[current.metadata.darkness] === 0)) {
    return null;
  }
  const ranked = listPentatonicColourResources()
    .filter((resource) => resource.id !== current.id)
    .map((resource) => {
      const meta = resource.metadata;
      const nextBand = args.direction === 'darker' ? BAND[meta.darkness] : BAND[meta.brightness];
      const step = nextBand - currentBand;
      const blocked =
        step <= 0 ||
        meta.primaryColour === 'REMOTE' ||
        meta.primaryColour === 'OUTSIDE' ||
        meta.distanceFromHome === 'far' ||
        (!args.allowEdge && (meta.chromaticEdge === 'high' || meta.primaryColour === 'EDGE'));
      return { resource, step, blocked };
    })
    .filter((row) => !row.blocked)
    .sort((left, right) => {
      if (left.step !== right.step) return left.step - right.step;
      const leftDistance = DISTANCE[left.resource.metadata.distanceFromHome];
      const rightDistance = DISTANCE[right.resource.metadata.distanceFromHome];
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      const leftEdge = BAND[left.resource.metadata.chromaticEdge];
      const rightEdge = BAND[right.resource.metadata.chromaticEdge];
      if (leftEdge !== rightEdge) return leftEdge - rightEdge;
      const leftCommon = BAND[left.resource.metadata.commonTonePotential];
      const rightCommon = BAND[right.resource.metadata.commonTonePotential];
      if (leftCommon !== rightCommon) return rightCommon - leftCommon;
      return left.resource.id.localeCompare(right.resource.id);
    });
  const best = ranked[0];
  if (!best) return null;
  const meta = best.resource.metadata;
  const reason =
    args.direction === 'darker'
      ? `${best.resource.displayName} is the smallest darker step. Darkness moves from ${current.metadata.darkness} to ${meta.darkness}. Distance stays ${meta.distanceFromHome}. Chromatic edge stays ${meta.chromaticEdge}. Register stays where it is.`
      : `${best.resource.displayName} is the smallest brighter step. Brightness moves from ${current.metadata.brightness} to ${meta.brightness}. Distance stays ${meta.distanceFromHome}. A further bright collection was not required.`;
  return { id: best.resource.id, reason };
}

function baseDraft(ctx: AutoColorContext, role: DuoRole): Draft {
  return {
    outcome: 'KEEP_CURRENT',
    action: 'retain',
    targetColour: 'CURRENT',
    targetResourceId: ctx.currentResourceId ?? null,
    operator: 'RETAIN',
    phrasePurpose: 'NONE',
    trajectory: 'RETAIN_CURRENT_FIELD',
    outsideBudget: DEFAULT_OUTSIDE_BUDGET,
    returnBehaviour: ctx.fieldIsHome ? 'Already home.' : 'No return is required.',
    silencePreference: 'NONE',
    generationNeeded: false,
    fieldChanged: false,
    homeReturn: false,
    lineagePreserved: ctx.hasMotif === true || ctx.lineageIdentity === 'clear',
    strategy: null,
    rationale: 'The current field stays.',
    rejected: ['new field when reseat or hold is enough'],
    conflicts: [],
    placementRole: role,
    structuralSilence: false,
    purposeNoPhrase: false,
    explicitOutside: false,
    explicitReseat: false,
  };
}

function finish(ctx: AutoColorContext, intentions: readonly MusicalIntention[], unknown: readonly string[], draft: Draft): AutoColorPlan {
  const form = ctx.formFunction ?? 'unknown';
  const role = draft.placementRole;
  const phrasePlan =
    draft.phrasePurpose === 'NONE' || draft.outcome === 'INSUFFICIENT_CONTEXT'
      ? null
      : planPentatonicOperator({
          purpose: draft.purposeNoPhrase ? 'NO_PHRASE' : draft.phrasePurpose,
          hasMotif: ctx.hasMotif === true,
          grounding: ctx.grounding ?? assessGrounding({}),
          budget: draft.outsideBudget,
          outsideDevicesAlreadyUsed: ctx.outsideDevicesAlreadyUsed ?? 0,
          explicitOutside: draft.explicitOutside,
          explicitReseat: draft.explicitReseat,
          quartalAvailable: ctx.quartalAvailable === true,
          pairAvailable: ctx.pairIsRegion === true,
        });
  let operator = draft.operator;
  if (phrasePlan && phrasePlan.phraseResult === 'NO_PHRASE' && !ctx.hasMotif && draft.phrasePurpose !== 'COMPING_FRAGMENT') {
    operator = 'NONE';
    draft.purposeNoPhrase = true;
    draft.silencePreference = 'NO_PHRASE';
  }
  const placed = ctx.pathIsNone || draft.outcome === 'INSUFFICIENT_CONTEXT'
    ? null
    : {
        operator,
        formFunction: form,
        atPhraseBoundary: ctx.atPhraseBoundary !== false,
        atPhraseEnding: ctx.atPhraseEnding === true || form === 'ending',
        atSectionBoundary: ctx.atSectionBoundary === true,
        role,
        slipLanding: form === 'ending' ? ('WEAK' as const) : ('STRONG' as const),
        pairIsRegion: ctx.pairIsRegion === true,
        holdCredible: ctx.holdCredible !== false,
        pathIsNone: false,
        purposeNoPhrase: draft.purposeNoPhrase,
        structuralSilencePreferred: draft.structuralSilence,
        homeKnown: ctx.homeKnown === true,
        fieldIsHome: ctx.fieldIsHome === true,
      };
  const rejected = [...draft.rejected];
  let silence = draft.silencePreference;
  let outcome = draft.outcome;
  let homeReturn = draft.homeReturn;
  let changedOperator = false;
  if (ctx.pathIsNone) {
    outcome = 'NONE';
    operator = 'NONE';
    silence = 'PATH_NONE';
    rejected.push('STRUCTURAL_SILENCE substituted for PATH NONE');
    rejected.push('NO_PHRASE substituted for PATH NONE');
  } else if (placed) {
    const placement = placeOperatorInForm(placed);
    if (placement.operator !== operator) changedOperator = true;
    operator = placement.operator;
    for (const note of placement.rejected) if (!rejected.includes(note)) rejected.push(note);
    if (placement.texture === 'STRUCTURAL_SILENCE') {
      outcome = 'STRUCTURAL_SILENCE';
      silence = 'STRUCTURAL_SILENCE';
      operator = 'NONE';
    } else if (placement.texture === 'NO_PHRASE') {
      outcome = 'NO_PHRASE';
      silence = 'NO_PHRASE';
      operator = 'NONE';
    } else if (placement.texture === 'PATH_NONE') {
      outcome = 'NONE';
      silence = 'PATH_NONE';
    }
    homeReturn = homeReturn || placement.homeReturn;
  }
  if (draft.outcome === 'INSUFFICIENT_CONTEXT') {
    outcome = 'INSUFFICIENT_CONTEXT';
    operator = 'NONE';
    silence = 'NONE';
  } else if (outcome === 'STRUCTURAL_SILENCE' || outcome === 'NO_PHRASE' || outcome === 'NONE') {
    /* abstentions stay distinct */
  } else if (operator === 'RETAIN' && !draft.fieldChanged && !draft.generationNeeded && draft.phrasePurpose === 'NONE') {
    outcome = 'KEEP_CURRENT';
  } else {
    outcome = 'PLAN';
  }
  const fieldChanged = draft.fieldChanged && outcome !== 'NONE' && outcome !== 'INSUFFICIENT_CONTEXT' && outcome !== 'STRUCTURAL_SILENCE' && outcome !== 'NO_PHRASE' && !changedOperator;
  const targetResourceId = fieldChanged ? draft.targetResourceId : outcome === 'INSUFFICIENT_CONTEXT' || outcome === 'NONE' ? null : ctx.currentResourceId ?? draft.targetResourceId;
  let strategy = draft.strategy;
  if (operator === 'HOLD_FIELD') strategy = 'HOLD_ACROSS_HARMONY';
  if (operator === 'QUARTAL_COMP') strategy = 'QUARTAL_SUPPORT';
  if (operator === 'SLIP') {
    const staticField = Boolean(ctx.grounding?.bassPedal || ctx.grounding?.bassOstinato || ctx.grounding?.sustainedTone);
    const slip = chooseSlipDirection({
      staticField,
      upResolvesBetter: false,
      registerFavoursUp: false,
      degreeLineageFavoursUp: false,
    });
    strategy = staticField && slip.label === 'DOWN' ? 'DOWNWARD_STATIC_SLIP' : form === 'ending' ? 'STRONG_SLIP_LANDING' : 'BOUNDED_SLIP_RETURN';
  }
  if ((operator === 'CELL_LINEAGE' || operator === 'RESEAT') && (has(intentions, 'RETAIN_MOTIF') || has(intentions, 'DEVELOP'))) {
    strategy = strategy ?? 'LINEAGE_RESEAT';
  }
  const colourNote =
    ctx.melodyNotes && ctx.melodyNotes.length > 0
      ? evaluatePentatonicColour({
          centreNote: ctx.centreNote ?? null,
          home: ctx.homeResourceId && ctx.centreNote ? { resourceId: ctx.homeResourceId, referenceNote: ctx.centreNote } : null,
          current: ctx.currentResourceId && ctx.centreNote ? { resourceId: ctx.currentResourceId, referenceNote: ctx.centreNote } : null,
          melodyNotes: ctx.melodyNotes,
        })
      : null;
  const rationale = [
    draft.rationale,
    colourNote && !fieldChanged && colourNote.disposition === 'RETAIN' ? 'Colour evaluation kept the current field.' : '',
    draft.conflicts.length > 0 ? `Conflict: ${draft.conflicts.join(' ')}` : '',
  ]
    .filter((part) => part.length > 0)
    .join(' ');
  return {
    version: PENTATONIC_AUTO_COLOR_VERSION,
    outcome,
    intentions,
    unknownPhrases: unknown,
    conflicts: draft.conflicts,
    formFunction: form,
    duoRole: ctx.duoRole ?? 'UNKNOWN',
    action: outcome === 'PLAN' && fieldChanged ? 'change' : outcome === 'INSUFFICIENT_CONTEXT' || outcome === 'NONE' || outcome === 'NO_PHRASE' || outcome === 'STRUCTURAL_SILENCE' ? 'abstain' : 'retain',
    targetColour: outcome === 'INSUFFICIENT_CONTEXT' || outcome === 'NONE' ? 'NONE' : draft.targetColour,
    targetResourceId: outcome === 'INSUFFICIENT_CONTEXT' ? null : targetResourceId,
    selectedResource: outcome === 'INSUFFICIENT_CONTEXT' ? 'NONE' : resourceName(targetResourceId),
    operator,
    phrasePurpose: draft.purposeNoPhrase ? 'NO_PHRASE' : draft.phrasePurpose,
    trajectory: draft.trajectory,
    outsideBudget: draft.outsideBudget,
    returnBehaviour: homeReturn && !draft.returnBehaviour.toLowerCase().includes('home') ? `${draft.returnBehaviour} Home is available at the release or ending.` : draft.returnBehaviour,
    silencePreference: silence,
    generationNeeded: outcome === 'PLAN' ? draft.generationNeeded : false,
    fieldChanged,
    homeReturn,
    lineagePreserved: draft.lineagePreserved && outcome !== 'INSUFFICIENT_CONTEXT',
    method: ctx.methodRequest === 'M-NEAR' ? 'M-NEAR' : 'M-DEG',
    strategy,
    rationale,
    rejected,
  };
}

function decide(ctx: AutoColorContext, intentions: readonly MusicalIntention[]): Draft {
  const form = ctx.formFunction ?? 'unknown';
  const heard = ctx.duoRole ?? 'UNKNOWN';
  const draft = baseDraft(ctx, heard);
  const grounded = ctx.grounding?.present === true;
  const dense = ctx.density === 'dense';
  const stay = has(intentions, 'STAY_CURRENT');
  const retainMotif = has(intentions, 'RETAIN_MOTIF');
  const space = has(intentions, 'MORE_SPACE') || has(intentions, 'LESS_DENSE');

  if (ctx.pathIsNone) {
    draft.outcome = 'NONE';
    draft.action = 'abstain';
    draft.operator = 'NONE';
    draft.targetColour = 'NONE';
    draft.targetResourceId = null;
    draft.silencePreference = 'PATH_NONE';
    draft.lineagePreserved = false;
    draft.rationale = 'PATH NONE already abstains. No colour was invented. Structural silence and no-phrase stay separate.';
    draft.rejected.push('a colour field forced onto PATH NONE');
    return draft;
  }

  if (space) {
    draft.outcome = 'STRUCTURAL_SILENCE';
    draft.action = 'abstain';
    draft.operator = 'NONE';
    draft.structuralSilence = true;
    draft.silencePreference = 'STRUCTURAL_SILENCE';
    draft.generationNeeded = false;
    draft.fieldChanged = false;
    const silenceRole =
      heard === 'GUITAR_LEADS' ||
      heard === 'BASS_LEADS' ||
      heard === 'GUITAR_RESPONDS' ||
      heard === 'BASS_RESPONDS' ||
      heard === 'GUITAR_SUPPORTS' ||
      heard === 'BASS_SUPPORTS' ||
      heard === 'SPACE'
        ? heard
        : 'SPACE';
    draft.placementRole = silenceRole;
    draft.rejected.push('velocity drop as space', 'register change as a substitute for space', 'a comping fragment added to fill the bar');
    if (heard === 'BASS_LEADS' || has(intentions, 'SUPPORT_BASS')) {
      draft.rationale = 'The bass leads. Guitar silence is the plan. Space is not a softer dynamic.';
    } else if (heard === 'GUITAR_LEADS' || has(intentions, 'SUPPORT_GUITAR')) {
      draft.rationale = 'The guitar leads. Bass exposure stays. The other voice is silent.';
    } else {
      draft.rationale = 'Structural silence is the plan. Fewer notes are not a lower velocity.';
    }
    if (has(intentions, 'DEVELOP')) draft.conflicts.push('DEVELOP would add a line. MORE_SPACE keeps the silence.');
    return draft;
  }

  if (has(intentions, 'SUPPORT_BASS')) {
    draft.placementRole = 'GUITAR_SUPPORTS';
    draft.phrasePurpose = 'COMPING_FRAGMENT';
    if (ctx.register === 'COLLIDING' || dense) {
      draft.structuralSilence = true;
      draft.outcome = 'STRUCTURAL_SILENCE';
      draft.silencePreference = 'STRUCTURAL_SILENCE';
      draft.operator = 'NONE';
      draft.rationale = 'Support for the bass would crowd it. Silence keeps the bass line clear.';
      draft.rejected.push('a second lead over the bass');
      return draft;
    }
    draft.operator = ctx.quartalAvailable ? 'QUARTAL_COMP' : ctx.holdCredible !== false ? 'HOLD_FIELD' : 'RETAIN';
    draft.strategy = draft.operator === 'QUARTAL_COMP' ? 'QUARTAL_SUPPORT' : 'HOLD_ACROSS_HARMONY';
    draft.targetColour = 'CONTINUITY';
    draft.trajectory = 'RETAIN_CURRENT_FIELD';
    draft.generationNeeded = draft.operator === 'QUARTAL_COMP';
    draft.rationale =
      draft.operator === 'QUARTAL_COMP'
        ? 'Guitar supports the bass with a short quartal subset of the current field. The bass is not answered by a new lead.'
        : 'Guitar keeps the current field under the bass. No new collection.';
    draft.rejected.push('a new guitar lead', 'both voices forced into counterpoint');
    return draft;
  }

  if (has(intentions, 'ANSWER_BASS')) {
    draft.placementRole = 'GUITAR_RESPONDS';
    if (!ctx.hasMotif || dense) {
      draft.purposeNoPhrase = true;
      draft.outcome = 'NO_PHRASE';
      draft.silencePreference = 'NO_PHRASE';
      draft.operator = 'NONE';
      draft.phrasePurpose = 'NO_PHRASE';
      draft.rationale = dense
        ? 'An answer would clutter the bass. NO_PHRASE leaves the field alone. This is not structural silence and not PATH NONE.'
        : 'No parent cell. An answer is not invented.';
      draft.rejected.push('a new unrelated guitar line');
      return draft;
    }
    draft.operator = 'RESEAT';
    draft.explicitReseat = true;
    draft.phrasePurpose = 'LYRICAL_ANSWER';
    draft.trajectory = 'HOME_COLOUR_HOME';
    draft.strategy = 'LINEAGE_RESEAT';
    draft.targetColour = 'CONTINUITY';
    draft.generationNeeded = false;
    draft.lineagePreserved = true;
    draft.rationale = 'The guitar answers from the same cell by reseating the landing. The field stays.';
    draft.rejected.push('a new field for the answer');
    return draft;
  }

  if (has(intentions, 'SUPPORT_GUITAR')) {
    draft.placementRole = 'BASS_SUPPORTS';
    if (ctx.register === 'COLLIDING') {
      draft.structuralSilence = true;
      draft.placementRole = 'BASS_SUPPORTS';
      draft.outcome = 'STRUCTURAL_SILENCE';
      draft.silencePreference = 'STRUCTURAL_SILENCE';
      draft.operator = 'NONE';
      draft.rationale = 'Bass support would collide with the guitar. Silence preserves the melody.';
      draft.rejected.push('a bass line in the guitar register');
      return draft;
    }
    draft.operator = ctx.holdCredible !== false ? 'HOLD_FIELD' : 'RETAIN';
    draft.strategy = 'HOLD_ACROSS_HARMONY';
    draft.targetColour = 'CONTINUITY';
    draft.trajectory = 'CONTINUITY';
    draft.rationale = 'Bass stays a ground under the guitar. Register space stays. No new field.';
    draft.rejected.push('a bass melody that covers the guitar', 'chord-by-chord collection switching');
    return draft;
  }

  if (has(intentions, 'ANSWER_GUITAR')) {
    draft.placementRole = 'BASS_RESPONDS';
    if (!ctx.hasMotif || dense) {
      draft.purposeNoPhrase = true;
      draft.outcome = 'NO_PHRASE';
      draft.silencePreference = 'NO_PHRASE';
      draft.operator = 'NONE';
      draft.phrasePurpose = 'NO_PHRASE';
      draft.rationale = 'A bass answer would clutter the guitar, or there is no cell to answer. NO_PHRASE.';
      return draft;
    }
    draft.operator = 'RESEAT';
    draft.explicitReseat = true;
    draft.phrasePurpose = 'LYRICAL_ANSWER';
    draft.trajectory = 'CONTINUITY';
    draft.strategy = 'LINEAGE_RESEAT';
    draft.lineagePreserved = true;
    draft.generationNeeded = false;
    draft.rationale = 'Bass answers by contrary or oblique motion from the same cell. Reseat comes before any new field.';
    draft.rejected.push('a new bass field', 'parallel motion that copies the guitar');
    return draft;
  }

  const stayOnly =
    stay &&
    !has(intentions, 'MORE_SUSPENDED') &&
    !has(intentions, 'MORE_AMBIGUOUS') &&
    !has(intentions, 'DEVELOP') &&
    !has(intentions, 'DARKER') &&
    !has(intentions, 'BRIGHTER') &&
    !has(intentions, 'MORE_TENSION') &&
    !has(intentions, 'TENSION_THEN_RESOLVE') &&
    !has(intentions, 'MORE_OUTSIDE') &&
    !has(intentions, 'MORE_EDGE') &&
    !has(intentions, 'MORE_CONTINUITY') &&
    !has(intentions, 'RETURN_HOME') &&
    !has(intentions, 'RETAIN_MOTIF');
  if (has(intentions, 'LESS_OUTSIDE') || stayOnly) {
    draft.operator = form === 'continuation' || ctx.holdCredible !== false ? 'HOLD_FIELD' : 'RETAIN';
    draft.strategy = draft.operator === 'HOLD_FIELD' ? 'HOLD_ACROSS_HARMONY' : null;
    draft.targetColour = ctx.fieldIsHome ? 'HOME' : 'INSIDE';
    draft.trajectory = 'CONTINUITY';
    draft.phrasePurpose = retainMotif ? 'MOTIF' : 'NONE';
    draft.lineagePreserved = retainMotif || ctx.hasMotif === true;
    draft.rationale = has(intentions, 'LESS_OUTSIDE')
      ? 'Less outside keeps HOME, the inside colour, or the current field. Slip and a remote collection were refused.'
      : 'Stay on the current field.';
    draft.rejected.push('SLIP', 'a remote collection', 'chord-by-chord collection switching');
    if (has(intentions, 'RETURN_HOME') && ctx.homeKnown && !ctx.fieldIsHome) {
      draft.homeReturn = true;
      draft.targetColour = 'HOME';
      draft.targetResourceId = ctx.homeResourceId ?? ctx.currentResourceId ?? null;
      draft.fieldChanged = Boolean(ctx.homeResourceId && ctx.homeResourceId !== ctx.currentResourceId);
      draft.returnBehaviour = 'Return to HOME. This is not a cadence.';
      draft.operator = 'RETAIN';
      draft.trajectory = 'HOME';
    }
    return draft;
  }

  if (has(intentions, 'RETURN_HOME')) {
    if (!ctx.homeKnown) {
      draft.conflicts.push('RETURN_HOME has no HOME to return to.');
      draft.rationale = 'HOME is not known. The current field stays. No home was invented.';
      draft.rejected.push('an invented HOME');
      return draft;
    }
    draft.homeReturn = !ctx.fieldIsHome;
    draft.targetColour = 'HOME';
    draft.targetResourceId = ctx.homeResourceId ?? ctx.currentResourceId ?? null;
    draft.fieldChanged = Boolean(!ctx.fieldIsHome && ctx.homeResourceId && ctx.homeResourceId !== ctx.currentResourceId);
    draft.operator = ctx.fieldIsHome ? 'RETAIN' : 'RESEAT';
    draft.explicitReseat = !ctx.fieldIsHome;
    draft.trajectory = 'HOME';
    draft.returnBehaviour = ctx.fieldIsHome ? 'Already home.' : 'Return to HOME. This is not a cadence.';
    draft.phrasePurpose = ctx.fieldIsHome ? 'NONE' : 'MOTIF';
    draft.rationale = ctx.fieldIsHome ? 'The field is already HOME.' : 'The plan returns to HOME without a ii–V–I and without a new outside colour.';
    draft.rejected.push('ii–V–I', 'HOME pasted onto every boundary');
    return draft;
  }

  if (has(intentions, 'MORE_CONTINUITY') && !has(intentions, 'DEVELOP') && !has(intentions, 'TENSION_THEN_RESOLVE')) {
    draft.operator = 'HOLD_FIELD';
    draft.strategy = 'HOLD_ACROSS_HARMONY';
    draft.targetColour = 'CONTINUITY';
    draft.trajectory = 'CONTINUITY';
    draft.rationale = 'One field holds across the harmony. A new collection per chord was refused.';
    draft.rejected.push('chord-by-chord collection switching');
    return draft;
  }

  if ((has(intentions, 'DARKER') || has(intentions, 'BRIGHTER')) && !has(intentions, 'MORE_OUTSIDE')) {
    const direction = has(intentions, 'DARKER') ? 'darker' : 'brighter';
    const current = ctx.currentResourceId ? getPentatonicColourResource(ctx.currentResourceId) : undefined;
    if (!current) {
      draft.conflicts.push(`No current field to make ${direction}.`);
      draft.rationale = 'There is no current colour to move. No field was invented.';
      draft.outcome = 'INSUFFICIENT_CONTEXT';
      draft.action = 'abstain';
      draft.targetResourceId = null;
      draft.targetColour = 'NONE';
      return draft;
    }
    const already =
      direction === 'darker'
        ? BAND[current.metadata.darkness] >= 2 && BAND[current.metadata.brightness] === 0
        : BAND[current.metadata.brightness] >= 2 && BAND[current.metadata.darkness] === 0;
    const shift = already || stay || !colourShiftAllowed(form) ? null : nearestColour({ currentId: current.id, direction, allowEdge: has(intentions, 'MORE_EDGE') });
    if (!shift || stay) {
      draft.operator = retainMotif ? 'CELL_LINEAGE' : form === 'continuation' ? 'HOLD_FIELD' : 'RETAIN';
      draft.phrasePurpose = retainMotif ? 'MOTIF' : 'NONE';
      draft.strategy = draft.operator === 'HOLD_FIELD' ? 'HOLD_ACROSS_HARMONY' : retainMotif ? 'LINEAGE_RESEAT' : null;
      draft.lineagePreserved = true;
      draft.targetColour = currentColour(ctx) === 'NONE' ? 'CURRENT' : currentColour(ctx);
      draft.fieldChanged = false;
      if (!colourShiftAllowed(form) && !already) {
        draft.conflicts.push(`${form} keeps the current field. A ${direction} collection waits.`);
      }
      draft.rationale = already
        ? `${current.displayName} is already the ${direction} colour in this vocabulary. The register stays. Reseat was enough, so the field stays.`
        : stay
          ? `STAY_CURRENT keeps ${current.displayName}. A ${direction} collection was not substituted.`
          : `${current.displayName} stays. ${form} does not spend a new field on a ${direction} colour.`;
      draft.rejected.push('register drop as darker', 'lower pitch as darker', 'remote altered', 'iwato');
      return draft;
    }
    draft.operator = ctx.hasMotif ? 'CELL_LINEAGE' : 'RESEAT';
    draft.phrasePurpose = ctx.hasMotif ? 'MOTIF' : 'NONE';
    draft.explicitReseat = !ctx.hasMotif;
    draft.targetResourceId = shift.id;
    draft.targetColour = direction === 'darker' ? 'DARK_COLOUR' : 'BRIGHT_COLOUR';
    draft.fieldChanged = true;
    draft.action = 'change';
    draft.outcome = 'PLAN';
    draft.lineagePreserved = ctx.hasMotif === true || retainMotif;
    draft.strategy = 'LINEAGE_RESEAT';
    draft.generationNeeded = false;
    draft.trajectory = 'HOME_COLOUR_HOME';
    draft.rationale = shift.reason;
    draft.rejected.push('remote altered', 'iwato', 'register drop as darker', 'lower pitch as darker', 'a larger colour jump');
    return draft;
  }

  if (has(intentions, 'MORE_SUSPENDED') || has(intentions, 'MORE_AMBIGUOUS')) {
    const wanted = has(intentions, 'MORE_SUSPENDED') ? 'SUSPENDED' : 'AMBIGUOUS';
    const preferred = wanted === 'SUSPENDED' ? 'suspended_pentatonic' : 'ambiguous_third';
    draft.targetColour = wanted;
    draft.trajectory = wanted === 'SUSPENDED' ? 'HOME_SUSPENDED_HOME' : 'HOME_AMBIGUOUS_RESOLUTION';
    if (stay || !colourShiftAllowed(form) || currentColour(ctx) === wanted) {
      draft.operator = 'HOLD_FIELD';
      draft.strategy = 'HOLD_ACROSS_HARMONY';
      draft.fieldChanged = false;
      draft.rationale = `The current field is read as ${wanted.toLowerCase()} colour. No new collection.`;
      if (!colourShiftAllowed(form) && currentColour(ctx) !== wanted) {
        draft.conflicts.push(`${form} will not open a new ${wanted.toLowerCase()} collection.`);
      }
      return draft;
    }
    draft.operator = ctx.hasMotif ? 'CELL_LINEAGE' : 'RESEAT';
    draft.targetResourceId = preferred;
    draft.fieldChanged = preferred !== ctx.currentResourceId;
    draft.phrasePurpose = 'MOTIF';
    draft.generationNeeded = false;
    draft.lineagePreserved = ctx.hasMotif === true;
    draft.strategy = 'LINEAGE_RESEAT';
    draft.rationale =
      wanted === 'SUSPENDED'
        ? 'Suspended pentatonic is the smallest suspended field. The third stays undecided. This is not a cadence delay pasted on from a ii–V–I.'
        : 'Ambiguous third is the smallest ambiguous field. Whole-tone and remote altered stay unused.';
    draft.rejected.push('whole-tone by default', 'remote altered');
    return draft;
  }

  const outsideWanted = has(intentions, 'MORE_OUTSIDE') || has(intentions, 'MORE_EDGE');
  const tensionArc = has(intentions, 'TENSION_THEN_RESOLVE');
  const tension = has(intentions, 'MORE_TENSION') || tensionArc;
  const develop = has(intentions, 'DEVELOP');

  if (outsideWanted || tension) {
    const formGate = outsideFormAllows(form);
    const budget: OutsideBudget = form === 'development' && grounded && outsideWanted ? 'MODERATE' : 'LOW';
    const room = (ctx.outsideDevicesAlreadyUsed ?? 0) === 0 || budget !== 'LOW';
    const slipEarned = grounded && formGate.allowed && room && (outsideWanted || (tensionArc && form === 'development'));
    draft.outsideBudget = budget;
    if (!ctx.hasMotif && (outsideWanted || tensionArc || develop)) {
      draft.purposeNoPhrase = true;
      draft.outcome = 'NO_PHRASE';
      draft.silencePreference = 'NO_PHRASE';
      draft.operator = 'NONE';
      draft.phrasePurpose = 'NO_PHRASE';
      draft.conflicts.push('No cell. Outside and tension are not invented.');
      draft.rationale = 'No parent cell. The plan abstains instead of writing a generic line.';
      draft.rejected.push('generic pentatonic lick');
      return draft;
    }
    if (slipEarned && !stay) {
      draft.operator = 'SLIP';
      draft.explicitOutside = true;
      draft.phrasePurpose = develop || tensionArc ? 'DEVELOPMENT' : 'MOTIF';
      draft.trajectory = outsideWanted ? 'HOME_OUTSIDE_HOME' : 'CONTINUITY';
      draft.targetColour = has(intentions, 'MORE_EDGE') ? 'EDGE' : 'OUTSIDE';
      draft.generationNeeded = true;
      draft.homeReturn = true;
      draft.returnBehaviour = 'HOME after one outside span. Resolution is a return, not a cadence.';
      draft.lineagePreserved = true;
      draft.strategy = 'BOUNDED_SLIP_RETURN';
      draft.rationale = grounded
        ? 'One grounded slip, then HOME. Distance is not maximised. The cell stays recognisable.'
        : 'Slip stays bounded.';
      draft.rejected.push('maximise colour distance', 'remote altered', 'a second outside device', 'ii–V–I');
      if (form === 'ending') {
        draft.operator = 'RETAIN';
        draft.explicitOutside = false;
        draft.generationNeeded = false;
        draft.conflicts.push('Ending blocks a weak unresolved slip.');
        draft.rationale = 'The ending keeps the field or returns HOME. An open slip was refused.';
        draft.returnBehaviour = 'Strong landing on the current field or HOME. No unresolved slip.';
      }
      return draft;
    }
    draft.operator = tension ? 'RESEAT' : 'RETAIN';
    draft.explicitReseat = tension;
    draft.phrasePurpose = tensionArc ? 'DEVELOPMENT' : retainMotif ? 'MOTIF' : 'NONE';
    draft.trajectory = tensionArc ? 'HOME_COLOUR_HOME' : 'CONTINUITY';
    draft.targetColour = tension ? 'SUSPENDED' : 'INSIDE';
    draft.homeReturn = tensionArc;
    draft.returnBehaviour = tensionArc ? 'HOME, then colour, then HOME. The colour is a reseat, not a new collection and not a cadence.' : 'No outside span.';
    draft.generationNeeded = tensionArc;
    draft.lineagePreserved = true;
    if (!grounded && (outsideWanted || tensionArc)) draft.conflicts.push('Outside needs a ground. The excursion was refused.');
    if (!formGate.allowed && formGate.reason && (outsideWanted || (tensionArc && form !== 'development'))) draft.conflicts.push(formGate.reason);
    draft.rationale = tensionArc
      ? 'Tension then resolve stays on one field: home, a suspended or coloured landing, then home. Slip was not earned.'
      : 'Outside was not earned. The current field stays.';
    draft.rejected.push('maximise colour distance', 'SLIP without grounding', 'remote altered');
    return draft;
  }

  if (develop || retainMotif) {
    if (!ctx.hasMotif) {
      draft.purposeNoPhrase = true;
      draft.outcome = 'NO_PHRASE';
      draft.silencePreference = 'NO_PHRASE';
      draft.operator = 'NONE';
      draft.phrasePurpose = 'NO_PHRASE';
      draft.lineagePreserved = false;
      draft.rationale = 'No parent cell. Development is not a new pattern.';
      draft.rejected.push('generic pentatonic lick', 'generic pattern generation');
      return draft;
    }
    const quartalLine = develop && form === 'development' && ctx.quartalAvailable === true && (heard === 'COUNTERPOINT' || heard === 'GUITAR_RESPONDS' || heard === 'BASS_RESPONDS');
    draft.operator = quartalLine ? 'QUARTAL_LINE' : retainMotif && !develop ? 'CELL_LINEAGE' : form === 'development' ? 'CELL_LINEAGE' : 'RESEAT';
    draft.phrasePurpose = develop ? 'DEVELOPMENT' : 'MOTIF';
    draft.explicitReseat = draft.operator === 'RESEAT';
    draft.trajectory = 'CONTINUITY';
    draft.generationNeeded = develop;
    draft.lineagePreserved = true;
    draft.strategy = 'LINEAGE_RESEAT';
    draft.targetColour = 'CONTINUITY';
    if (form === 'opening' || form === 'unknown') {
      draft.operator = 'CELL_LINEAGE';
      draft.generationNeeded = false;
      draft.conflicts.push(form === 'opening' ? 'Opening develops by keeping the cell, not by a new field.' : 'Unknown form keeps the cell.');
    }
    draft.rationale = develop
      ? 'Development rotates, reseats, or derives one quartal cell from the parent. The lineage stays. No generic pattern.'
      : 'The parent cell stays. M-DEG is the map. A new field was not required.';
    draft.rejected.push('generic pentatonic lick', 'a field with no parent cell');
    return draft;
  }

  draft.rationale = 'No stronger plan was earned. The current field stays.';
  return draft;
}

export function planAutoColor(ctx: AutoColorContext = {}): AutoColorPlan {
  const parsed = ctx.text ? parseMusicalIntentions(ctx.text) : { intentions: [...(ctx.intentions ?? [])], unknown: [] as string[] };
  const intentions = parsed.intentions;
  if (intentions.length === 0) {
    return finish(ctx, [], parsed.unknown, {
      ...baseDraft(ctx, ctx.duoRole ?? 'UNKNOWN'),
      outcome: 'INSUFFICIENT_CONTEXT',
      action: 'abstain',
      operator: 'NONE',
      targetColour: 'NONE',
      targetResourceId: null,
      silencePreference: 'NONE',
      lineagePreserved: false,
      rationale: parsed.unknown.length > 0 ? 'Those words are outside the intention vocabulary. No plan was invented.' : 'No intention was given. No plan was invented.',
      rejected: ['an invented plan'],
    });
  }
  const conflicts = contradictionMessages(intentions, ctx.fieldIsHome === true);
  if (conflicts.length > 0) {
    const draft = baseDraft(ctx, ctx.duoRole ?? 'UNKNOWN');
    draft.conflicts = conflicts;
    draft.outcome = 'KEEP_CURRENT';
    draft.rationale = 'The intentions contradict. The simpler plan keeps the current field.';
    draft.rejected.push('a forced compromise plan');
    return finish(ctx, intentions, parsed.unknown, draft);
  }
  if (!contextIsEnough(ctx)) {
    const draft = baseDraft(ctx, 'UNKNOWN');
    draft.outcome = 'INSUFFICIENT_CONTEXT';
    draft.action = 'abstain';
    draft.operator = 'NONE';
    draft.targetColour = 'NONE';
    draft.targetResourceId = null;
    draft.lineagePreserved = false;
    draft.rationale = 'Not enough form, duo, field, or motif context. No colour was invented.';
    draft.rejected.push('an invented plan');
    return finish(ctx, intentions, parsed.unknown, draft);
  }
  return finish(ctx, intentions, parsed.unknown, decide(ctx, intentions));
}

function fourthsAvailable(pitchClasses: readonly number[] | null | undefined): boolean {
  if (!pitchClasses || pitchClasses.length < 2) return false;
  for (let left = 0; left < pitchClasses.length; left += 1) {
    for (let right = left + 1; right < pitchClasses.length; right += 1) {
      if (isPerfectFourth(pitchClasses[left]!, pitchClasses[right]!)) return true;
    }
  }
  return false;
}

export function autoColorContextFromAnalysis(analysis: PentatonicScoreAnalysis): Omit<AutoColorContext, 'intentions' | 'text'> {
  const homePcs = analysis.identity.home?.pitchClasses ? [...analysis.identity.home.pitchClasses] : null;
  const events = formDuoEventsFromAnalysis(analysis);
  const form = assessPentatonicFormDuo({
    events,
    endingDetected: analysis.score.endingDetected,
    homePitchClasses: homePcs,
  });
  const phrase = form.phrases[0];
  const role = form.roles[0];
  const decision = phrase ? form.decisions.find((row) => row.phraseId === phrase.id) : form.decisions[0];
  const pathEvent = phrase
    ? analysis.path.events.find((event) => event.sourceLabel === phrase.firstSourceLabel)
    : analysis.path.events[0];
  const slice = events.filter((_, index) => (phrase ? index >= phrase.firstIndex && index <= phrase.lastIndex : true));
  const bassPitchClasses = slice.map((event) =>
    (event.bassNotes ?? []).flatMap((note) => {
      const parsed = parseNoteToken(note);
      return parsed ? [parsed.pc] : [];
    })
  );
  const melodyCount = slice.reduce((sum, event) => sum + (event.melodyMidis?.length ?? event.melodyNotes?.length ?? 0), 0);
  const bassCount = slice.reduce((sum, event) => sum + (event.bassMidis?.length ?? event.bassNotes?.length ?? 0), 0);
  const attacks = melodyCount + bassCount;
  const bars = Math.max(1, slice.length);
  const density = attacks / bars >= 6 ? 'dense' : attacks / bars >= 3 ? 'moderate' : attacks > 0 ? 'sparse' : 'unknown';
  const register = form.register[0]?.classification ?? 'UNKNOWN';
  const resourceId = pathEvent?.archetypeId && pathEvent.chosenId !== 'NONE' ? pathEvent.archetypeId : null;
  const fieldIsHome = Boolean(homePcs && pathEvent?.canonicalPitchSet && pathEvent.canonicalPitchSet.length === homePcs.length && pathEvent.canonicalPitchSet.every((pc) => homePcs.includes(pc)));
  const grounding = assessGrounding({
    bassPitchClasses: bassPitchClasses.filter((row) => row.length > 0),
    motifIdentityRetained: melodyCount >= 3,
  });
  return {
    formFunction: decision?.function ?? phrase?.function ?? 'unknown',
    duoRole: role?.role ?? 'UNKNOWN',
    pathIsNone: pathEvent?.chosenId === 'NONE',
    currentResourceId: resourceId,
    homeResourceId: analysis.identity.home?.archetypeId ?? null,
    homeKnown: analysis.identity.homeStatus === 'HOME' && Boolean(analysis.identity.home),
    fieldIsHome,
    centreNote: analysis.identity.centre?.spelling ?? null,
    hasMotif: melodyCount >= 3,
    lineageIdentity: melodyCount >= 3 ? 'clear' : 'absent',
    density,
    grounding,
    register,
    atPhraseBoundary: true,
    atPhraseEnding: phrase?.function === 'ending',
    atSectionBoundary: false,
    holdCredible: form.holdFieldSpans.length > 0 || form.decisions.some((row) => row.continuity === 'PHRASE_RETENTION' || row.continuity === 'SECTION_RETENTION'),
    quartalAvailable: fourthsAvailable(pathEvent?.canonicalPitchSet),
    pairIsRegion: form.tritonePairSpans.length > 0,
    outsideDevicesAlreadyUsed: 0,
    melodyNotes: slice.flatMap((event) => event.melodyNotes ?? []).slice(0, 8),
  };
}

export interface AutoColorBenchmarkRow {
  title: string;
  formFunction: FormFunction;
  duoRole: DuoRole;
  intention: MusicalIntention;
  outcome: AutoColorOutcome;
  operator: PentatonicOperator;
  resource: string;
  fieldChanged: boolean;
  homeReturn: boolean;
  silenceWon: boolean;
  abstained: boolean;
  lineagePreserved: boolean;
  rejected: readonly string[];
}

export function benchmarkAutoColor(title: string, analysis: PentatonicScoreAnalysis): AutoColorBenchmarkRow[] {
  const context = autoColorContextFromAnalysis(analysis);
  const current = context.currentResourceId ? getPentatonicColourResource(context.currentResourceId) : undefined;
  const shade: MusicalIntention = current && BAND[current.metadata.brightness] >= BAND[current.metadata.darkness] ? 'DARKER' : 'BRIGHTER';
  const intentions: MusicalIntention[] = ['RETAIN_MOTIF', 'MORE_SPACE', 'TENSION_THEN_RESOLVE', 'MORE_OUTSIDE', shade];
  return intentions.map((intention) => {
    const plan = planAutoColor({ ...context, intentions: [intention] });
    return {
      title,
      formFunction: plan.formFunction,
      duoRole: plan.duoRole,
      intention,
      outcome: plan.outcome,
      operator: plan.operator,
      resource: plan.selectedResource,
      fieldChanged: plan.fieldChanged,
      homeReturn: plan.homeReturn,
      silenceWon: plan.outcome === 'STRUCTURAL_SILENCE',
      abstained: plan.outcome === 'INSUFFICIENT_CONTEXT' || plan.outcome === 'NONE' || plan.outcome === 'KEEP_CURRENT',
      lineagePreserved: plan.lineagePreserved,
      rejected: plan.rejected,
    };
  });
}
