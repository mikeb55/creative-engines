/**
 * Controlled V7.3B plan edits.
 * Each edit changes cue ownership, entrances, or copied notes. A role label does not.
 */

import { addPulse, pulseFor, qFromPoint, sectionBarQ } from './cueSchedule';
import { wwhCmp } from '../wwhTiming';
import type { Leadership, PerformancePlan, Player } from './performancePlanTypes';
import type { SourceIndex } from './sourceIndexAdapter';

export class PlanMutationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PlanMutationError';
    this.code = code;
  }
}

function clone(plan: PerformancePlan): PerformancePlan {
  return structuredClone(plan);
}

export function moveCueByPulse(plan: PerformancePlan, cueId: string, index: SourceIndex): PerformancePlan {
  const next = clone(plan);
  const section = next.sections.find((item) => item.cues.some((cue) => cue.id === cueId));
  const cue = section?.cues.find((item) => item.id === cueId);
  if (!section || !cue) throw new PlanMutationError('MISSING_CUE', `no cue ${cueId}`);
  const barQ = sectionBarQ(section, index);
  if (!barQ) throw new PlanMutationError('METER', `${section.id} has no metre`);
  const templateId = section.meter.kind === 'explicit' ? null : section.meter.span.firstMeasureId;
  const measure = templateId ? index.byId.get(templateId) : index.measures[0];
  const pulse = section.meter.kind === 'explicit' ? pulseFor(section.meter.beats, section.meter.beatType) : pulseFor(measure?.guitar.beats ?? 4, measure?.guitar.beatType ?? 4);
  if (cue.trigger.kind === 'at') cue.trigger.point = addPulse(cue.trigger.point, pulse, barQ);
  else {
    const latest = cue.trigger.latest;
    cue.trigger.earliest = addPulse(cue.trigger.earliest, pulse, barQ);
    if (wwhCmp(qFromPoint(cue.trigger.earliest, barQ), qFromPoint(latest, barQ)) > 0) {
      cue.trigger.latest = addPulse(latest, pulse, barQ);
    }
  }
  return next;
}

export function setPreviewCycles(plan: PerformancePlan, sectionId: string, cycles: number): PerformancePlan {
  const next = clone(plan);
  const section = next.sections.find((item) => item.id === sectionId);
  if (!section) throw new PlanMutationError('MISSING_SECTION', `no section ${sectionId}`);
  if (section.length.kind !== 'cue_window') throw new PlanMutationError('LOCK', `${sectionId} is not an open window`);
  if (!Number.isInteger(cycles) || cycles < section.length.minCycles || cycles > section.length.maxCycles) {
    throw new PlanMutationError('BAD_LENGTH', `${cycles} is outside ${section.length.minCycles}..${section.length.maxCycles}`);
  }
  section.length.previewCycles = cycles;
  return next;
}

export function retargetLeadership(plan: PerformancePlan, sectionId: string, leadership: Leadership): PerformancePlan {
  const next = clone(plan);
  const section = next.sections.find((item) => item.id === sectionId);
  if (!section) throw new PlanMutationError('MISSING_SECTION', `no section ${sectionId}`);
  if (section.primarySourceSpan || section.length.kind === 'source') {
    throw new PlanMutationError('LOCK', `${sectionId} is locked source. Leadership cannot rewrite it.`);
  }
  if (!section.leadership) throw new PlanMutationError('LEADERSHIP', `${sectionId} has no leadership`);
  const previous = section.leadership;
  if (previous === leadership) return next;
  if (leadership === 'shared') {
    section.leadership = 'shared';
    for (const player of ['guitar', 'bass'] as const) {
      const voice = section.voices[player];
      if (voice.material.kind === 'tacet') {
        const donor = section.voices[player === 'guitar' ? 'bass' : 'guitar'];
        if (donor.material.kind === 'performer') voice.material = structuredClone(donor.material);
      }
      voice.entry = { kind: 'at', point: { bar: 0, offsetQ: { n: 0, d: 1 } } };
      voice.exit = { kind: 'section_end' };
      voice.role = 'lead';
    }
    for (const cue of section.cues) {
      if (cue.action === 'interrupt' || cue.interruption?.behaviour === 'stop') {
        cue.interruption = { behaviour: 'none' };
        cue.action = 'release';
      }
      cue.owner = 'both';
      cue.target = 'both';
    }
    return next;
  }
  if (previous !== 'shared') {
    const guitar = section.voices.guitar;
    section.voices.guitar = section.voices.bass;
    section.voices.bass = guitar;
    const swapOwner = (owner: Player | 'both'): Player | 'both' => {
      if (owner === 'both') return 'both';
      return owner === 'guitar' ? 'bass' : 'guitar';
    };
    for (const cue of section.cues) {
      cue.owner = swapOwner(cue.owner);
      cue.target = swapOwner(cue.target);
    }
    for (const exchange of section.exchanges) {
      const initiator = exchange.initiator;
      exchange.initiator = exchange.responder;
      exchange.responder = initiator;
    }
  } else {
    const partner: Player = leadership === 'guitar' ? 'bass' : 'guitar';
    section.voices[partner].material = { kind: 'tacet', reason: 'yield' };
    section.voices[partner].entry = { kind: 'at', point: { bar: 0, offsetQ: { n: 0, d: 1 } } };
    section.voices[partner].role = 'listen';
    section.voices[leadership].role = 'lead';
    for (const cue of section.cues) {
      if (cue.action !== 'interrupt' && cue.interruption?.behaviour !== 'stop') cue.owner = leadership;
    }
  }
  section.leadership = leadership;
  return next;
}

export function setGuitarMaterial(plan: PerformancePlan, sectionId: string, choice: 'source' | 'chord_melody'): PerformancePlan {
  const next = clone(plan);
  const section = next.sections.find((item) => item.id === sectionId);
  if (!section?.authorisedSubstitution) {
    throw new PlanMutationError('UNAUTHORISED', `${sectionId} has no authorised chord-melody span`);
  }
  const auth = section.authorisedSubstitution;
  if (choice === 'source') {
    section.guitarMode = 'MELODIC';
    section.voices.guitar.material = { kind: 'source', span: auth.sourceSpan, sourcePlayer: 'guitar', integrity: 'exact' };
    section.development.execution = 'literal_quote';
  } else {
    section.guitarMode = 'CHORD_MELODY';
    section.voices.guitar.material = {
      kind: 'chord_melody',
      sourceSpan: auth.sourceSpan,
      arrangementSpan: auth.arrangementSpan,
      integrity: 'exact',
    };
    section.development.execution = 'literal_quote';
  }
  return next;
}
