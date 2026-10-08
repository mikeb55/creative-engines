/**
 * V7.3B pilots. Plans select source bars and cue times. They do not invent notes.
 */

import { alignChordMelody, switchIsSafe } from './chordMelodyAlign';
import type { Cue, PerformancePlan, PlanSection, Role, Span, VoicePlan } from './performancePlanTypes';
import { cutAfter, type SourceIndex } from './sourceIndexAdapter';

const ZERO = { bar: 0, offsetQ: { n: 0, d: 1 } };
const QUARTER = { n: 1, d: 1 };

function spanOf(index: SourceIndex, first: number, last: number): Span {
  const start = index.measures[first];
  const end = index.measures[last];
  if (!start || !end) throw new Error(`span ${first}..${last} is outside ${index.scoreId}`);
  return { firstMeasureId: start.id, lastMeasureId: end.id };
}

function motifEvents(index: SourceIndex, player: 'guitar' | 'bass', first: number, last: number): string[] {
  return index.events
    .filter((event) => event.player === player && !event.rest && event.order >= first && event.order <= last)
    .map((event) => event.id);
}

function sourceVoice(player: 'guitar' | 'bass', span: Span, role: Role): VoicePlan {
  return {
    material: { kind: 'source', span, sourcePlayer: player, integrity: 'exact' },
    role,
    entry: { kind: 'at', point: ZERO },
    exit: { kind: 'section_end' },
    density: [{ at: ZERO, level: 'moderate' }],
  };
}

function sourceSection(id: string, span: Span, purpose: PlanSection['purpose'], rationale: string): PlanSection {
  return {
    id,
    purpose,
    length: { kind: 'source', span },
    meter: { kind: 'source', span },
    tempo: { kind: 'source', span },
    primarySourceSpan: span,
    guitarMode: 'MELODIC',
    leadership: 'shared',
    voices: {
      guitar: sourceVoice('guitar', span, 'lead'),
      bass: sourceVoice('bass', span, 'support'),
    },
    development: {
      parentMotifIds: [],
      operation: 'none',
      retained: ['pitch', 'rhythm', 'silence'],
      permittedDeparture: [],
      returnSectionId: null,
      execution: 'literal_quote',
    },
    harmony: { policy: 'source', sourceSpan: span, vocabularyRefs: [], instruction: null },
    cues: [],
    exchanges: [],
    rationale,
    authorisedSubstitution: null,
  };
}

function shell(
  index: SourceIndex,
  id: string,
  sections: PlanSection[],
  motif: PerformancePlan['motifs'][number],
  landmark: { id: string; span: Span },
  notes: string[],
  chordMelody: PerformancePlan['chordMelody']
): PerformancePlan {
  const whole = spanOf(index, 0, index.measures.length - 1);
  const tail = spanOf(index, index.measures.length - 1, index.measures.length - 1);
  const ids = sections.map((section) => section.id);
  const final = sections[sections.length - 1];
  if (!final) throw new Error('plan needs a section');
  return {
    schemaVersion: '1.0',
    engineEdition: '7.3b',
    id,
    source: { scoreId: index.scoreId, sha256: index.sha256, partIds: { ...index.partIds }, annotationSha256: null },
    chordMelody,
    motifs: [motif],
    identity: {
      primaryTraversal: [whole],
      protectedSpans: [whole],
      requiredMotifIds: [motif.id],
      returnLandmarks: [landmark, { id: 'written-ending', span: tail }],
    },
    sections,
    ending: { kind: 'source', finalSectionId: final.id, tail },
    practiceViews: [
      { id: 'guitar-study', product: 'guitar_study', sectionIds: ids, focus: 'guitar', approaches: ['minimal', 'lyrical', 'adventurous'] },
      { id: 'bass-partner', product: 'bass_partner', sectionIds: ids, focus: 'bass', approaches: ['minimal', 'lyrical', 'adventurous'] },
    ],
    notes,
  };
}

function releaseCue(id: string, owner: 'guitar' | 'bass', earliestBar: number, latestBar: number, landmarkId: string, text: string): Cue {
  return {
    id,
    owner,
    action: 'release',
    target: owner === 'bass' ? 'guitar' : 'bass',
    trigger: {
      kind: 'performer_signal',
      earliest: { bar: earliestBar, offsetQ: ZERO.offsetQ },
      latest: { bar: latestBar, offsetQ: ZERO.offsetQ },
      afterCueId: null,
    },
    printedText: text,
    prerequisites: [],
    responseDelay: { minQ: ZERO.offsetQ, maxQ: QUARTER, previewQ: QUARTER },
    interruption: { behaviour: 'none' },
    returnLandmarkId: landmarkId,
  };
}

function safeCuts(index: SourceIndex): number[] {
  const cuts: number[] = [];
  for (let order = 0; order < index.measures.length - 1; order += 1) {
    if (cutAfter(index, order).safe) cuts.push(order);
  }
  return cuts;
}

export function proposePulseWindow(index: SourceIndex, id = 'pulse-window'): PerformancePlan {
  if (index.measures.length < 4) throw new Error('pulse window needs 4 bars');
  if (!cutAfter(index, 0).safe) throw new Error('first bar is not a safe cut');
  return invitationPlan(index, id, 0, 'Pulse window for metre and cue movement.');
}

export function proposeBlackAuraPlanA(index: SourceIndex): PerformancePlan {
  if (index.measures.length !== 39) throw new Error(`Black Aura expects 39 bars, found ${index.measures.length}`);
  const cut = 7;
  if (!cutAfter(index, cut).safe) throw new Error('Black Aura bar 8/9 cut is not safe');
  return invitationPlan(index, 'black-aura-v73b-plan-a', cut, 'Plan A. Bass-led invitation. Guitar waits for the bass release.');
}

function invitationPlan(index: SourceIndex, id: string, cut: number, headline: string): PerformancePlan {
  const before = spanOf(index, 0, cut);
  const after = spanOf(index, cut + 1, index.measures.length - 1);
  const template = spanOf(index, cut, cut);
  const motifId = 'bass-invitation-cell';
  const events = motifEvents(index, 'bass', 0, 1);
  if (!events.length) throw new Error('Black Aura bass opening has no attacks');
  const landmark = { id: 'rejoin-after-invite', span: spanOf(index, cut + 1, cut + 1) };
  const release = releaseCue(
    'bass-release',
    'bass',
    1,
    3,
    landmark.id,
    'Continue until bass releases the phrase. Guitar waits, then answers. No written pitches.'
  );
  const answer: Cue = {
    id: 'guitar-answer',
    owner: 'guitar',
    action: 'enter',
    target: 'bass',
    trigger: { kind: 'at', point: { bar: 1, offsetQ: QUARTER } },
    printedText: 'Guitar answer begins one quarter after the bass release. Performer-directed. No written pitches.',
    prerequisites: ['bass-release'],
    responseDelay: { minQ: ZERO.offsetQ, maxQ: ZERO.offsetQ, previewQ: ZERO.offsetQ },
    interruption: { behaviour: 'none' },
    returnLandmarkId: landmark.id,
  };
  const invite: PlanSection = {
    id: 'invite',
    purpose: 'bass_feature',
    length: { kind: 'cue_window', cycleBars: 1, minCycles: 2, maxCycles: 6, previewCycles: 4, releaseCueId: 'bass-release' },
    meter: { kind: 'repeat_template', span: template },
    tempo: { kind: 'inherit_entry' },
    primarySourceSpan: null,
    guitarMode: 'MELODIC',
    leadership: 'bass',
    voices: {
      guitar: {
        material: { kind: 'performer', motifIds: [motifId], instruction: 'After the bass release, one melodic answer of the bass cell. You may decline. No written pitches.' },
        role: 'respond',
        entry: { kind: 'cue', cueId: 'bass-release' },
        exit: { kind: 'section_end' },
        density: [{ at: ZERO, level: 'sparse' }],
      },
      bass: {
        material: { kind: 'performer', motifIds: [motifId], instruction: 'Bass leads from the opening cell. Release the phrase inside the cue window. No written pitches.' },
        role: 'lead',
        entry: { kind: 'at', point: ZERO },
        exit: { kind: 'section_end' },
        density: [{ at: ZERO, level: 'moderate' }],
      },
    },
    development: {
      parentMotifIds: [motifId],
      operation: 'extend',
      retained: ['rhythm', 'contour'],
      permittedDeparture: ['texture'],
      returnSectionId: 'src-return',
      execution: 'performer_directed',
    },
    harmony: { policy: 'performer_intent', sourceSpan: null, vocabularyRefs: [], instruction: 'No new harmony. Use only what the source already states.' },
    cues: [release, answer],
    exchanges: [
      {
        id: 'invite-exchange',
        initiator: 'bass',
        responder: 'guitar',
        motifIds: [motifId],
        proposalCueId: 'bass-release',
        responseCueId: 'guitar-answer',
        relation: 'leave_space',
        retainedAnchor: motifId,
        returnSectionId: 'src-return',
        execution: 'performer_directed',
      },
    ],
    rationale: 'Bass opens the space. Guitar entrance is the bass release plus the preview delay. The window length is the cycle count, not the cue.',
    authorisedSubstitution: null,
  };
  const head = sourceSection('src-before', before, 'statement', 'Locked source before the bass invitation.');
  const tail = sourceSection('src-return', after, 'ending', 'Locked return through the written ending.');
  return shell(index, id, [head, invite, tail], {
    id: motifId,
    owner: 'bass',
    span: spanOf(index, 0, 1),
    sourceEventIds: events,
    provenance: 'user_confirmed',
    preserve: ['rhythm', 'contour'],
  }, landmark, [
    headline,
    'Live instruction: continue until bass releases the phrase. Export uses the preview trace, which is not evidence of listening.',
    `All ${index.measures.length} source bars stay in order. No chord-melody substitution is authorised.`,
  ], null);
}

export function proposeBlackAuraPlanB(index: SourceIndex): PerformancePlan {
  if (index.measures.length !== 39) throw new Error(`Black Aura expects 39 bars, found ${index.measures.length}`);
  const cuts = safeCuts(index).filter((order) => order >= 12 && order <= 24);
  const cut = cuts[0];
  if (cut === undefined) throw new Error('Black Aura has no safe mid-score cut for Plan B');
  const before = spanOf(index, 0, cut);
  const after = spanOf(index, cut + 1, index.measures.length - 1);
  const template = spanOf(index, cut, cut);
  const motifId = 'guitar-development-cell';
  const events = motifEvents(index, 'guitar', 0, 1);
  if (!events.length) throw new Error('Black Aura guitar opening has no attacks');
  const landmark = { id: 'rejoin-after-interrupt', span: spanOf(index, cut + 1, cut + 1) };
  const interrupt: Cue = {
    id: 'bass-interrupt',
    owner: 'bass',
    action: 'interrupt',
    target: 'guitar',
    trigger: { kind: 'at', point: { bar: 2, offsetQ: ZERO.offsetQ } },
    printedText: 'Bass interruption. Stop the guitar continuation and hand the bar back. Do not cut a written note.',
    prerequisites: [],
    responseDelay: { minQ: ZERO.offsetQ, maxQ: QUARTER, previewQ: ZERO.offsetQ },
    interruption: { behaviour: 'stop' },
    returnLandmarkId: landmark.id,
  };
  const lead: PlanSection = {
    id: 'g-lead',
    purpose: 'improvisation',
    length: { kind: 'cue_window', cycleBars: 1, minCycles: 4, maxCycles: 6, previewCycles: 4, releaseCueId: 'bass-interrupt' },
    meter: { kind: 'repeat_template', span: template },
    tempo: { kind: 'inherit_entry' },
    primarySourceSpan: null,
    guitarMode: 'HYBRID',
    leadership: 'guitar',
    voices: {
      guitar: {
        material: { kind: 'performer', motifIds: [motifId], instruction: 'Guitar develops the opening cell until the bass interruption. No written pitches.' },
        role: 'lead',
        entry: { kind: 'at', point: ZERO },
        exit: { kind: 'cue', cueId: 'bass-interrupt' },
        density: [{ at: ZERO, level: 'moderate' }],
      },
      bass: {
        material: { kind: 'tacet', reason: 'yield' },
        role: 'listen',
        entry: { kind: 'at', point: ZERO },
        exit: { kind: 'section_end' },
        density: [{ at: ZERO, level: 'sparse' }],
      },
    },
    development: {
      parentMotifIds: [motifId],
      operation: 'extend',
      retained: ['rhythm', 'contour'],
      permittedDeparture: ['rhythm'],
      returnSectionId: 'src-return',
      execution: 'performer_directed',
    },
    harmony: { policy: 'performer_intent', sourceSpan: null, vocabularyRefs: [], instruction: 'No new harmony.' },
    cues: [interrupt],
    exchanges: [],
    rationale: 'Guitar leads a planned four-bar continuation. The bass interruption stops that continuation and pulls the return forward. This is not a bass invitation.',
    authorisedSubstitution: null,
  };
  const holdCue: Cue = {
    id: 'bass-hold-release',
    owner: 'bass',
    action: 'release',
    target: 'guitar',
    trigger: { kind: 'at', point: ZERO },
    printedText: 'Bass holds the open bars. Guitar stays out. No written pitches.',
    prerequisites: [],
    responseDelay: { minQ: ZERO.offsetQ, maxQ: ZERO.offsetQ, previewQ: ZERO.offsetQ },
    interruption: { behaviour: 'none' },
    returnLandmarkId: landmark.id,
  };
  const hold: PlanSection = {
    id: 'hold',
    purpose: 'bass_feature',
    length: { kind: 'cue_window', cycleBars: 1, minCycles: 1, maxCycles: 4, previewCycles: 2, releaseCueId: 'bass-hold-release' },
    meter: { kind: 'repeat_template', span: template },
    tempo: { kind: 'inherit_entry' },
    primarySourceSpan: null,
    guitarMode: 'MELODIC',
    leadership: 'bass',
    voices: {
      guitar: {
        material: { kind: 'tacet', reason: 'yield' },
        role: 'listen',
        entry: { kind: 'at', point: ZERO },
        exit: { kind: 'section_end' },
        density: [{ at: ZERO, level: 'sparse' }],
      },
      bass: {
        material: { kind: 'performer', motifIds: [motifId], instruction: 'Bass plays alone for the preview cycles, then both rejoin the written source. No written pitches.' },
        role: 'lead',
        entry: { kind: 'at', point: ZERO },
        exit: { kind: 'section_end' },
        density: [{ at: ZERO, level: 'sparse' }],
      },
    },
    development: {
      parentMotifIds: [motifId],
      operation: 'fragment',
      retained: ['contour'],
      permittedDeparture: ['texture'],
      returnSectionId: 'src-return',
      execution: 'performer_directed',
    },
    harmony: { policy: 'performer_intent', sourceSpan: null, vocabularyRefs: [], instruction: 'No new harmony.' },
    cues: [holdCue],
    exchanges: [
      {
        id: 'hold-exchange',
        initiator: 'bass',
        responder: 'guitar',
        motifIds: [motifId],
        proposalCueId: 'bass-hold-release',
        responseCueId: 'bass-hold-release',
        relation: 'leave_space',
        retainedAnchor: landmark.id,
        returnSectionId: 'src-return',
        execution: 'performer_directed',
      },
    ],
    rationale: 'After the interruption, bass keeps a separate open hold. Its cycle count sets the return. Guitar does not answer inside the interrupted phrase.',
    authorisedSubstitution: null,
  };
  const head = sourceSection('src-before', before, 'statement', 'Locked source before the guitar development.');
  const tail = sourceSection('src-return', after, 'ending', 'Locked return through the written ending.');
  return shell(index, 'black-aura-v73b-plan-b', [head, lead, hold, tail], {
    id: motifId,
    owner: 'guitar',
    span: spanOf(index, 0, 1),
    sourceEventIds: events,
    provenance: 'user_confirmed',
    preserve: ['rhythm', 'contour'],
  }, landmark, [
    `Plan B. Guitar-led development, cut after printed bar ${index.measures[cut]?.printedNumber}. Bass interruption stops the guitar and moves the return.`,
    'The hold after the stop is a second window. It is not Plan A with the names swapped.',
    'All 39 source bars stay in order. No chord-melody substitution is authorised.',
    'Preview trace resolves the stop. It is not evidence of live listening.',
  ], null);
}

export interface ChordSpan {
  headEnd: number;
  cmStart: number;
  cmEnd: number;
}

export function findAuthorisedChordSpan(duo: SourceIndex, arrangement: SourceIndex): ChordSpan {
  const alignment = alignChordMelody(duo, arrangement);
  if (!alignment.ok) throw new Error(alignment.message);
  const pair = (order: number) => alignment.pairs.find((item) => item.duoOrder === order);
  for (let start = 4; start < duo.measures.length - 8; start += 1) {
    for (const length of [8, 4]) {
      const end = start + length - 1;
      if (end > duo.measures.length - 5) continue;
      const before = pair(start - 1);
      const last = pair(end);
      if (!before || !last) continue;
      const into = switchIsSafe(duo, arrangement, start - 1, before.arrangementOrder);
      const out = switchIsSafe(duo, arrangement, end, last.arrangementOrder);
      if (into.safe && out.safe) return { headEnd: start - 1, cmStart: start, cmEnd: end };
    }
  }
  throw new Error('no safe authorised chord-melody span');
}

export function proposeMirrorPlanC(duo: SourceIndex, arrangement: SourceIndex): PerformancePlan {
  if (duo.measures.length !== 68) throw new Error(`The Mirror expects 68 bars, found ${duo.measures.length}`);
  const alignment = alignChordMelody(duo, arrangement);
  if (!alignment.ok) throw new Error(alignment.message);
  const picked = findAuthorisedChordSpan(duo, arrangement);
  const pair = (order: number) => {
    const found = alignment.pairs.find((item) => item.duoOrder === order);
    if (!found) throw new Error(`no arrangement bar for duo order ${order}`);
    return found;
  };
  const headSpan = spanOf(duo, 0, picked.headEnd);
  const cmDuo = spanOf(duo, picked.cmStart, picked.cmEnd);
  const cmArr = spanOf(arrangement, pair(picked.cmStart).arrangementOrder, pair(picked.cmEnd).arrangementOrder);
  const returnSpan = spanOf(duo, picked.cmEnd + 1, duo.measures.length - 1);
  const template = spanOf(duo, picked.cmEnd, picked.cmEnd);
  const motifId = 'mirror-bass-cell';
  const events = motifEvents(duo, 'bass', 0, Math.min(3, picked.headEnd));
  if (!events.length) throw new Error('The Mirror bass opening has no attacks');
  const landmark = { id: 'mirror-return', span: spanOf(duo, picked.cmEnd + 1, picked.cmEnd + 1) };
  const release = releaseCue(
    'mirror-bass-release',
    'bass',
    1,
    3,
    landmark.id,
    'Continue until bass releases the phrase. Then return to the written landmark. No written pitches.'
  );
  const dialogue: PlanSection = {
    id: 'dialogue',
    purpose: 'dialogue',
    length: { kind: 'cue_window', cycleBars: 1, minCycles: 2, maxCycles: 5, previewCycles: 3, releaseCueId: 'mirror-bass-release' },
    meter: { kind: 'repeat_template', span: template },
    tempo: { kind: 'inherit_entry' },
    primarySourceSpan: null,
    guitarMode: 'MELODIC',
    leadership: 'bass',
    voices: {
      guitar: {
        material: { kind: 'performer', motifIds: [motifId], instruction: 'Guitar answers only after the bass release, using the named cell. No new pitches or voicings.' },
        role: 'respond',
        entry: { kind: 'cue', cueId: 'mirror-bass-release' },
        exit: { kind: 'section_end' },
        density: [{ at: ZERO, level: 'sparse' }],
      },
      bass: {
        material: { kind: 'performer', motifIds: [motifId], instruction: 'Bass leads the open dialogue from the written cell. No written pitches.' },
        role: 'lead',
        entry: { kind: 'at', point: ZERO },
        exit: { kind: 'section_end' },
        density: [{ at: ZERO, level: 'moderate' }],
      },
    },
    development: {
      parentMotifIds: [motifId],
      operation: 'recall',
      retained: ['rhythm', 'contour'],
      permittedDeparture: ['texture'],
      returnSectionId: 'src-return',
      execution: 'performer_directed',
    },
    harmony: { policy: 'performer_intent', sourceSpan: null, vocabularyRefs: [], instruction: 'No new harmony. Inner voices stay in the copied chord melody only.' },
    cues: [release],
    exchanges: [
      {
        id: 'mirror-exchange',
        initiator: 'bass',
        responder: 'guitar',
        motifIds: [motifId],
        proposalCueId: 'mirror-bass-release',
        responseCueId: 'mirror-bass-release',
        relation: 'answer_contour',
        retainedAnchor: landmark.id,
        returnSectionId: 'src-return',
        execution: 'performer_directed',
      },
    ],
    rationale: 'Bass-led open dialogue between the chord-melody span and the verified return landmark.',
    authorisedSubstitution: null,
  };
  const chord: PlanSection = {
    id: 'cm-span',
    purpose: 'statement',
    length: { kind: 'source', span: cmDuo },
    meter: { kind: 'source', span: cmDuo },
    tempo: { kind: 'source', span: cmDuo },
    primarySourceSpan: cmDuo,
    guitarMode: 'CHORD_MELODY',
    leadership: 'guitar',
    voices: {
      guitar: {
        material: { kind: 'chord_melody', sourceSpan: cmDuo, arrangementSpan: cmArr, integrity: 'exact' },
        role: 'lead',
        entry: { kind: 'at', point: ZERO },
        exit: { kind: 'section_end' },
        density: [{ at: ZERO, level: 'moderate' }],
      },
      bass: sourceVoice('bass', cmDuo, 'support'),
    },
    development: {
      parentMotifIds: [],
      operation: 'none',
      retained: ['pitch', 'rhythm', 'silence'],
      permittedDeparture: [],
      returnSectionId: null,
      execution: 'literal_quote',
    },
    harmony: { policy: 'source', sourceSpan: cmDuo, vocabularyRefs: [], instruction: null },
    cues: [],
    exchanges: [],
    rationale: 'Authorised guitar span. Inner voices come from the verified arrangement. Bass stays the duo part.',
    authorisedSubstitution: { sourceSpan: cmDuo, arrangementSpan: cmArr },
  };
  const head = sourceSection('src-head', headSpan, 'statement', 'Original guitar and bass before the authorised chord melody.');
  const tail = sourceSection('src-return', returnSpan, 'ending', 'Locked return from the verified landmark through the written ending.');
  return shell(duo, 'mirror-v73b-plan-c', [head, chord, dialogue, tail], {
    id: motifId,
    owner: 'bass',
    span: spanOf(duo, 0, Math.min(3, picked.headEnd)),
    sourceEventIds: events,
    provenance: 'user_confirmed',
    preserve: ['rhythm', 'contour', 'pitch'],
  }, landmark, [
    `Plan C. Chord melody on duo orders ${picked.cmStart}..${picked.cmEnd}, then a bass-led open dialogue, then landmark ${duo.measures[picked.cmEnd + 1]?.printedNumber}.`,
    alignment.message,
    'Inner voices are copied. Bass notes in that span stay the duo bass. Unsafe boundaries were rejected by the search.',
    'Preview trace is not evidence of listening or of generated improvisation.',
  ], {
    id: arrangement.scoreId,
    sha256: arrangement.sha256,
    scoreId: arrangement.scoreId,
    label: arrangement.title,
  });
}
