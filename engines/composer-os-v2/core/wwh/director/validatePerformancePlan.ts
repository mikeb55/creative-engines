/**
 * Bind a parsed plan to a source index.
 * Failures name the section. They do not repair the music.
 */

import { createHash } from 'node:crypto';
import { plannedBarCount, previewCueTrace, resolveWindow } from './cueSchedule';
import type { CueTrace, PerformancePlan, PlanDiagnostic, PlanSection, Span } from './performancePlanTypes';
import { canonicalPlanJson, parsePerformancePlan, PerformancePlanSchemaError } from './performancePlanSchema';
import { verifyNamedSpans } from './chordMelodyAlign';
import { cutAfter, expandSpan, hasIncomingTie, sameSpan, type SourceIndex, type SourceMeasure } from './sourceIndexAdapter';

export class PerformancePlanBindError extends Error {
  readonly errors: PlanDiagnostic[];

  constructor(errors: PlanDiagnostic[]) {
    super(errors.map((error) => `${error.sectionId ?? '$'} ${error.code}: ${error.message}`).join('\n'));
    this.name = 'PerformancePlanBindError';
    this.errors = errors;
  }
}

function push(errors: PlanDiagnostic[], code: string, sectionId: string | null, message: string): void {
  errors.push({ code, sectionId, message });
}

function spanMeasures(index: SourceIndex, span: Span, errors: PlanDiagnostic[], sectionId: string | null, label: string): SourceMeasure[] {
  if (!index.byId.has(span.firstMeasureId) || !index.byId.has(span.lastMeasureId)) {
    push(errors, 'UNKNOWN_MEASURE', sectionId, `${label} uses an unknown measure id`);
    return [];
  }
  const first = index.byId.get(span.firstMeasureId)!;
  const last = index.byId.get(span.lastMeasureId)!;
  if (last.order < first.order) {
    push(errors, 'SPAN_ORDER', sectionId, `${label} runs backward`);
    return [];
  }
  return expandSpan(index, span);
}

function pointInRange(bar: number, offsetN: number, barCount: number): boolean {
  if (bar < barCount) return offsetN >= 0;
  return bar === barCount && offsetN === 0;
}

export interface BoundPlan {
  plan: PerformancePlan;
  planSha256: string;
  primaryMeasures: SourceMeasure[];
  arrangementByDuoId: Map<string, SourceMeasure>;
  trace: CueTrace;
}

export function bindAndValidatePlan(
  input: unknown,
  index: SourceIndex,
  arrangement: SourceIndex | null = null,
  traceInput: CueTrace | null = null
): BoundPlan {
  let plan: PerformancePlan;
  try {
    plan = parsePerformancePlan(input);
  } catch (error) {
    if (error instanceof PerformancePlanSchemaError) {
      throw new PerformancePlanBindError(
        error.errors.map((item) => ({ code: item.code, sectionId: null, message: `${item.path} ${item.message}` }))
      );
    }
    throw error;
  }
  const errors: PlanDiagnostic[] = [];
  if (plan.source.sha256 !== index.sha256 || plan.source.scoreId !== index.scoreId) {
    push(errors, 'SOURCE_HASH', null, `plan source ${plan.source.sha256} does not match index ${index.sha256}`);
  }
  if (plan.source.partIds.guitar !== index.partIds.guitar || plan.source.partIds.bass !== index.partIds.bass) {
    push(errors, 'PART_ID', null, `plan parts ${plan.source.partIds.guitar}/${plan.source.partIds.bass} do not match ${index.partIds.guitar}/${index.partIds.bass}`);
  }
  const arrangementByDuoId = new Map<string, SourceMeasure>();
  if (plan.chordMelody) {
    if (!arrangement) push(errors, 'MISSING_ARRANGEMENT', null, 'plan selects a chord melody but no arrangement score was supplied');
    else if (arrangement.sha256 !== plan.chordMelody.sha256 || arrangement.scoreId !== plan.chordMelody.scoreId) {
      push(errors, 'ARRANGEMENT_HASH', null, `arrangement ${arrangement.sha256} does not match plan ${plan.chordMelody.sha256}`);
    }
  }

  const seen = new Set<string>();
  const dupe = (id: string, label: string, sectionId: string | null) => {
    if (seen.has(id)) push(errors, 'DUPLICATE_ID', sectionId, `duplicate ${label} ${id}`);
    seen.add(id);
  };
  for (const motif of plan.motifs) dupe(motif.id, 'motif', null);
  for (const section of plan.sections) {
    dupe(section.id, 'section', section.id);
    for (const cue of section.cues) dupe(cue.id, 'cue', section.id);
    for (const exchange of section.exchanges) dupe(exchange.id, 'exchange', section.id);
  }
  for (const view of plan.practiceViews) dupe(view.id, 'practice view', null);
  for (const landmark of plan.identity.returnLandmarks) dupe(landmark.id, 'landmark', null);

  const motifById = new Map(plan.motifs.map((motif) => [motif.id, motif]));
  for (const motifId of plan.identity.requiredMotifIds) {
    const motif = motifById.get(motifId);
    if (!motif) push(errors, 'MISSING_MOTIF', null, `required motif ${motifId} is not on the plan`);
    else if (motif.provenance === 'candidate') {
      push(errors, 'CANDIDATE_MOTIF', null, `required motif ${motifId} is still a candidate`);
    }
  }
  for (const motif of plan.motifs) {
    spanMeasures(index, motif.span, errors, null, `motif ${motif.id}`);
    for (const eventId of motif.sourceEventIds) {
      if (!index.events.some((event) => event.id === eventId)) {
        push(errors, 'UNKNOWN_EVENT', null, `motif ${motif.id} event ${eventId} is not in the source`);
      }
    }
  }

  const primaryExpected = plan.identity.primaryTraversal.flatMap((span) => spanMeasures(index, span, errors, null, 'primary traversal'));
  const expectedIds = primaryExpected.map((measure) => measure.id);
  if (expectedIds.length !== index.measures.length || expectedIds.some((id, order) => id !== index.measures[order]?.id)) {
    push(errors, 'PRIMARY_COVERAGE', null, 'primary traversal must list every source measure once, in source order');
  }
  for (const span of plan.identity.protectedSpans) spanMeasures(index, span, errors, null, 'protected span');
  for (const landmark of plan.identity.returnLandmarks) spanMeasures(index, landmark.span, errors, null, `landmark ${landmark.id}`);

  const trace = plan.engineEdition === '7.3b' ? traceInput ?? previewCueTrace(plan) : { planId: plan.id, decisions: [] };
  const cueOwner = new Map<string, { sectionId: string; bar: number | null }>();
  for (const section of plan.sections) {
    for (const cue of section.cues) {
      if (!cue.owner) push(errors, 'CUE_OWNER', section.id, `cue ${cue.id} has no owner`);
      const bar = cue.trigger.kind === 'at' ? cue.trigger.point.bar : cue.trigger.earliest.bar;
      cueOwner.set(cue.id, { sectionId: section.id, bar });
      if (plan.engineEdition !== '7.3b' && cue.trigger.kind === 'performer_signal') {
        push(errors, 'CUE_SIGNAL_DEFERRED', section.id, `cue ${cue.id} uses a performer signal. V7.3A accepts only timed cues.`);
      }
      if (cue.returnLandmarkId && !plan.identity.returnLandmarks.some((item) => item.id === cue.returnLandmarkId)) {
        push(errors, 'NO_RETURN', section.id, `cue ${cue.id} returns to missing landmark ${cue.returnLandmarkId}`);
      }
    }
  }

  const primaryActual: string[] = [];
  let previousPrimaryEnd: number | null = null;
  let openSincePrimary = false;
  plan.sections.forEach((section, sectionIndex) => {
    const barCount = section.length.kind === 'source' ? spanMeasures(index, section.length.span, errors, section.id, 'length').length : plannedBarCount(section, index);
    if (section.length.kind === 'source' && (section.meter.kind !== 'source' || !sameSpan(section.meter.span, section.length.span))) {
      push(errors, 'METER_REWRITE', section.id, 'a source section keeps the metre of its own span');
    }
    if (section.length.kind === 'fixed' && section.meter.kind === 'repeat_template') {
      const template = spanMeasures(index, section.meter.span, errors, section.id, 'metre template');
      if (template.length > 0 && section.length.bars % template.length !== 0) {
        push(errors, 'METER_TEMPLATE', section.id, 'template length does not divide the section');
      }
    }
    if (section.length.kind === 'fixed' && section.meter.kind === 'source') {
      const stated = spanMeasures(index, section.meter.span, errors, section.id, 'metre source');
      if (stated.length !== section.length.bars) {
        push(errors, 'METER_LENGTH', section.id, 'source metre span length differs from the fixed bar count');
      }
    }
    for (const player of ['guitar', 'bass'] as const) {
      const voice = section.voices[player];
      if (voice.entry.kind === 'at' && !pointInRange(voice.entry.point.bar, voice.entry.point.offsetQ.n, barCount)) {
        push(errors, 'ENTRY', section.id, `${player} entry is outside the section`);
      }
      const lockedMaterial = voice.material.kind === 'source' || voice.material.kind === 'chord_melody';
      if (plan.engineEdition !== '7.3b' && voice.entry.kind === 'cue') {
        push(errors, 'SPLIT_SECTION', section.id, `${player} waits on cue ${voice.entry.cueId}. Split that turn into its own section.`);
      }
      if (plan.engineEdition !== '7.3b' && voice.entry.kind === 'at' && (voice.entry.point.bar !== 0 || voice.entry.point.offsetQ.n !== 0)) {
        push(errors, 'SPLIT_SECTION', section.id, `${player} enters mid-section. Split that turn into its own section.`);
      }
      if (plan.engineEdition !== '7.3b' && voice.exit.kind !== 'section_end') {
        push(errors, 'SPLIT_SECTION', section.id, `${player} exits before the section ends. Split that turn into its own section.`);
      }
      if (plan.engineEdition === '7.3b' && lockedMaterial && (voice.entry.kind !== 'at' || voice.entry.point.bar !== 0 || voice.entry.point.offsetQ.n !== 0 || voice.exit.kind !== 'section_end')) {
        push(errors, 'CUE_SPLITS_SOURCE', section.id, `${player} cue would cut a protected source passage`);
      }
      if (plan.engineEdition === '7.3b' && voice.entry.kind === 'cue' && !section.cues.some((cue) => cue.id === voice.entry.cueId)) {
        push(errors, 'MISSING_CUE', section.id, `${player} entry cue is not in this section`);
      }
      if (plan.engineEdition === '7.3b' && voice.exit.kind === 'cue' && !section.cues.some((cue) => cue.id === voice.exit.cueId)) {
        push(errors, 'MISSING_CUE', section.id, `${player} exit cue is not in this section`);
      }
      if (voice.material.kind === 'chord_melody') {
        if (player !== 'guitar') push(errors, 'SOURCE_PLAYER', section.id, 'chord melody replaces the guitar part only');
        if (section.guitarMode !== 'CHORD_MELODY') push(errors, 'MODE', section.id, 'chord-melody material requires guitar mode CHORD_MELODY');
        if (!plan.chordMelody) push(errors, 'MISSING_ARRANGEMENT', section.id, 'section uses chord melody without a plan binding');
        if (section.length.kind !== 'source' || !sameSpan(section.length.span, voice.material.sourceSpan)) {
          push(errors, 'LOCK_CONFLICT', section.id, 'chord-melody section must occupy its duo span');
        }
        if (!arrangement) push(errors, 'INCOMPATIBLE_ARRANGEMENT', section.id, 'cannot check the arrangement');
        else {
          const problems = verifyNamedSpans(index, arrangement, voice.material.sourceSpan, voice.material.arrangementSpan);
          for (const problem of problems) push(errors, 'INCOMPATIBLE_ARRANGEMENT', section.id, problem);
          if (!problems.length) {
            const source = expandSpan(index, voice.material.sourceSpan);
            const arranged = expandSpan(arrangement, voice.material.arrangementSpan);
            source.forEach((measure, indexInSpan) => {
              if (arrangementByDuoId.has(measure.id)) push(errors, 'DUPLICATE_ID', section.id, `duo bar ${measure.printedNumber} is already mapped`);
              arrangementByDuoId.set(measure.id, arranged[indexInSpan]!);
            });
            const first = arranged[0];
            const previous = plan.sections[sectionIndex - 1];
            const switching = !previous || previous.voices.guitar.material.kind !== 'chord_melody';
            if (switching && first && first.order > 0) {
              const cut = cutAfter(arrangement, first.order - 1);
              if (!cut.safe) push(errors, 'UNSAFE_CUT', section.id, `chord-melody entry is unsafe: ${cut.reason}`);
            }
          }
        }
      } else if (voice.material.kind === 'source') {
        if (voice.material.sourcePlayer !== player) {
          push(errors, 'SOURCE_PLAYER', section.id, `${player} cannot copy ${voice.material.sourcePlayer} notes in V7.3A`);
        }
        const copied = spanMeasures(index, voice.material.span, errors, section.id, `${player} source`);
        if (section.length.kind !== 'source' || !sameSpan(section.length.span, voice.material.span) || copied.length !== barCount) {
          push(errors, 'LOCK_CONFLICT', section.id, `${player} source span does not occupy the whole section`);
        }
        if (section.primarySourceSpan && !sameSpan(section.primarySourceSpan, voice.material.span)) {
          push(errors, 'PRIMARY_SPAN', section.id, `${player} source span is not the primary span`);
        }
      } else if (section.length.kind === 'source' || section.primarySourceSpan) {
        push(errors, 'LOCK_CONFLICT', section.id, `${player} is ${voice.material.kind} inside a locked source section`);
      }
      if (voice.material.kind === 'performer') {
        if (section.development.execution !== 'performer_directed') {
          push(errors, 'FALSE_REALIZATION', section.id, `${player} open material is marked ${section.development.execution}`);
        }
        for (const motifId of voice.material.motifIds) {
          if (!motifById.has(motifId)) push(errors, 'MISSING_MOTIF', section.id, `${player} references missing motif ${motifId}`);
        }
        if (voice.material.motifIds.length === 0) {
          push(errors, 'NO_ANCHOR', section.id, `${player} open window names no motif`);
        }
      }
      if (
        (voice.material.kind === 'source' || voice.material.kind === 'chord_melody') &&
        section.development.execution !== 'literal_quote'
      ) {
        push(errors, 'FALSE_REALIZATION', section.id, 'copied material is marked performer-directed');
      }
    }
    if (section.guitarMode === 'CHORD_MELODY' && section.voices.guitar.material.kind !== 'chord_melody') {
      push(errors, 'MODE', section.id, 'CHORD_MELODY mode requires chord-melody guitar material');
    }
    if (plan.engineEdition === '7.3b' && section.length.kind === 'cue_window') {
      if (section.primarySourceSpan) push(errors, 'CUE_SPLITS_SOURCE', section.id, 'a cue window cannot sit on a locked source span');
      const disagreement = leadershipDisagreement(section);
      if (disagreement) push(errors, 'LEADERSHIP', section.id, disagreement);
      const resolved = resolveWindow(section, trace, index);
      if (!resolved.ok) push(errors, 'CUE_WINDOW', section.id, resolved.message);
    }
    if (section.primarySourceSpan) {
      const copied = spanMeasures(index, section.primarySourceSpan, errors, section.id, 'primary span');
      primaryActual.push(...copied.map((measure) => measure.id));
      const start = copied[0]?.order;
      if (previousPrimaryEnd !== null && start !== undefined && start !== previousPrimaryEnd + 1) {
        push(errors, 'PRIMARY_GAP', section.id, 'primary spans skip or repeat source measures');
      }
      if (openSincePrimary && previousPrimaryEnd !== null) {
        const cut = cutAfter(index, previousPrimaryEnd);
        if (!cut.safe) push(errors, 'UNSAFE_CUT', section.id, `insertion before ${section.id} is unsafe: ${cut.reason}`);
      }
      if (copied.length) previousPrimaryEnd = copied[copied.length - 1]!.order;
      openSincePrimary = false;
    } else {
      if (!openSincePrimary && previousPrimaryEnd === null) {
        const first = index.measures[0];
        if (first && (hasIncomingTie(first.guitar) || hasIncomingTie(first.bass))) {
          push(errors, 'UNSAFE_CUT', section.id, 'opening insertion meets an incoming tie');
        }
      }
      if (!openSincePrimary && previousPrimaryEnd !== null) {
        const laterPrimary = plan.sections.slice(sectionIndex + 1).some((item) => item.primarySourceSpan);
        if (!laterPrimary) push(errors, 'ENDING_NOT_LAST', section.id, 'added material sits after the last source section');
        else {
          const cut = cutAfter(index, previousPrimaryEnd);
          if (!cut.safe) push(errors, 'UNSAFE_CUT', section.id, `cannot insert ${section.id}: ${cut.reason}`);
        }
      }
      openSincePrimary = true;
    }
    for (const exchange of section.exchanges) {
      if (exchange.execution !== 'performer_directed') push(errors, 'FALSE_REALIZATION', section.id, 'exchange claims a rendered response');
      if (!motifById.has(exchange.retainedAnchor) && !plan.identity.returnLandmarks.some((item) => item.id === exchange.retainedAnchor)) {
        push(errors, 'NO_ANCHOR', section.id, `exchange ${exchange.id} anchor ${exchange.retainedAnchor} is not a motif or landmark`);
      }
      const proposal = cueOwner.get(exchange.proposalCueId);
      const response = cueOwner.get(exchange.responseCueId);
      if (!proposal) push(errors, 'MISSING_CUE', section.id, `missing proposal cue ${exchange.proposalCueId}`);
      if (!response) push(errors, 'MISSING_CUE', section.id, `missing response cue ${exchange.responseCueId}`);
      if (proposal && response) {
        const proposalAt = plan.sections.findIndex((item) => item.id === proposal.sectionId);
        const responseAt = plan.sections.findIndex((item) => item.id === response.sectionId);
        if (responseAt < proposalAt || (responseAt === proposalAt && (response.bar ?? 0) < (proposal.bar ?? 0))) {
          push(errors, 'CUE_ORDER', section.id, `response ${exchange.responseCueId} precedes proposal ${exchange.proposalCueId}`);
        }
      }
      if (exchange.returnSectionId && !plan.sections.some((item) => item.id === exchange.returnSectionId)) {
        push(errors, 'MISSING_SECTION', section.id, `return section ${exchange.returnSectionId} is missing`);
      }
    }
  });

  if (primaryActual.join('|') !== expectedIds.join('|')) {
    push(errors, 'PRIMARY_ORDER', null, 'primary source copies are missing, repeated, or out of order');
  }
  if (plan.ending.kind === 'cue_release') {
    const ending = plan.ending;
    const finalIndex = plan.sections.findIndex((section) => section.id === ending.finalSectionId);
    if (finalIndex !== plan.sections.length - 1) push(errors, 'ENDING_NOT_LAST', ending.finalSectionId, 'the ending section is not last');
    const finalSection = plan.sections[finalIndex];
    if (!finalSection?.cues.some((cue) => cue.id === ending.cueId)) {
      push(errors, 'MISSING_CUE', ending.finalSectionId, 'ending cue is not in the final section');
    }
  }
  if (plan.ending.kind === 'source') {
    const finalId = plan.ending.finalSectionId;
    const finalIndex = plan.sections.findIndex((section) => section.id === finalId);
    if (finalIndex !== plan.sections.length - 1) push(errors, 'ENDING_NOT_LAST', plan.ending.finalSectionId, 'the ending section is not last');
    const finalSection = plan.sections[finalIndex];
    if (!finalSection?.primarySourceSpan) push(errors, 'ENDING', plan.ending.finalSectionId, 'source ending must copy source');
    else {
      const tail = spanMeasures(index, plan.ending.tail, errors, finalSection.id, 'ending tail');
      const body = spanMeasures(index, finalSection.primarySourceSpan, errors, finalSection.id, 'ending body');
      if (tail.length && body.length) {
        const bodyIds = new Set(body.map((measure) => measure.id));
        if (tail.some((measure) => !bodyIds.has(measure.id))) {
          push(errors, 'ENDING', finalSection.id, 'ending tail is outside the final section');
        }
        const lastSource = index.measures[index.measures.length - 1];
        if (lastSource && tail[tail.length - 1]?.id !== lastSource.id) {
          push(errors, 'ENDING', finalSection.id, 'ending tail does not include the last source measure');
        }
      }
    }
  }
  for (const view of plan.practiceViews) {
    for (const sectionId of view.sectionIds) {
      if (!plan.sections.some((section) => section.id === sectionId)) {
        push(errors, 'MISSING_SECTION', sectionId, `practice view ${view.id} references a missing section`);
      }
    }
  }

  const openAnchor = plan.sections.some((section) => section.voices.guitar.material.kind === 'performer' || section.voices.bass.material.kind === 'performer');
  if (openAnchor && plan.identity.returnLandmarks.length === 0) {
    push(errors, 'NO_RETURN', null, 'an open window needs a return landmark');
  }

  if (errors.length) throw new PerformancePlanBindError(errors);
  return {
    plan,
    planSha256: createHash('sha256').update(canonicalPlanJson(plan)).digest('hex'),
    primaryMeasures: primaryExpected,
    arrangementByDuoId,
    trace,
  };
}

function leadershipDisagreement(section: PlanSection): string | null {
  if (section.length.kind !== 'cue_window') return null;
  const lead = section.leadership;
  if (!lead) return 'cue window needs guitar, bass, or shared leadership';
  if (lead === 'shared') {
    for (const player of ['guitar', 'bass'] as const) {
      const entry = section.voices[player].entry;
      if (entry.kind !== 'at' || entry.point.bar !== 0 || entry.point.offsetQ.n !== 0) {
        return `${player} still waits, so leadership is not shared`;
      }
    }
    return null;
  }
  const leaderEntry = section.voices[lead].entry;
  if (leaderEntry.kind !== 'at' || leaderEntry.point.bar !== 0 || leaderEntry.point.offsetQ.n !== 0) {
    return `${lead} does not open the window`;
  }
  const partner = lead === 'bass' ? 'guitar' : 'bass';
  const partnerEntry = section.voices[partner].entry;
  if (partnerEntry.kind === 'cue') {
    const cue = section.cues.find((item) => item.id === partnerEntry.cueId);
    if (cue && cue.owner !== lead && cue.owner !== 'both') return `response cue ${cue.id} is owned by ${cue.owner}`;
  }
  for (const cue of section.cues) {
    const stops = cue.action === 'interrupt' || cue.interruption?.behaviour === 'stop';
    if (stops && cue.owner === lead) return `leader owns interruption ${cue.id}`;
    if (!stops && cue.owner !== lead && cue.owner !== 'both' && cue.owner !== partner) {
      return `cue ${cue.id} is owned by ${cue.owner} under ${lead} leadership`;
    }
    if (!stops && partnerEntry.kind === 'cue' && partnerEntry.cueId === cue.id && cue.owner !== lead && cue.owner !== 'both') {
      return `response cue ${cue.id} is owned by ${cue.owner}`;
    }
  }
  return null;
}
