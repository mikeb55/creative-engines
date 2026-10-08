/**
 * Reviewable plan drafts. The saved JSON is the authority, not this builder.
 */

import type { Development, GuitarMode, PerformancePlan, PlanSection, Player, Role, Span, VoicePlan } from './performancePlanTypes';
import { cutAfter, type SourceIndex } from './sourceIndexAdapter';

const ZERO = { bar: 0, offsetQ: { n: 0, d: 1 } };

function spanOf(index: SourceIndex, first: number, last: number): Span {
  const start = index.measures[first];
  const end = index.measures[last];
  if (!start || !end) throw new Error(`span ${first}..${last} is outside the source`);
  return { firstMeasureId: start.id, lastMeasureId: end.id };
}

function sourceDevelopment(returnSectionId: string | null): Development {
  return {
    parentMotifIds: [],
    operation: 'none',
    retained: ['pitch', 'rhythm', 'silence'],
    permittedDeparture: [],
    returnSectionId,
    execution: 'literal_quote',
  };
}

function sourceVoice(player: Player, span: Span, role: Role): VoicePlan {
  return {
    material: { kind: 'source', span, sourcePlayer: player, integrity: 'exact' },
    role,
    entry: { kind: 'at', point: ZERO },
    exit: { kind: 'section_end' },
    density: [{ at: ZERO, level: 'moderate' }],
  };
}

function sourceSection(id: string, span: Span, purpose: PlanSection['purpose'], rationale: string, mode: GuitarMode): PlanSection {
  return {
    id,
    purpose,
    length: { kind: 'source', span },
    meter: { kind: 'source', span },
    tempo: { kind: 'source', span },
    primarySourceSpan: span,
    guitarMode: mode,
    voices: {
      guitar: sourceVoice('guitar', span, 'lead'),
      bass: sourceVoice('bass', span, 'support'),
    },
    development: sourceDevelopment(null),
    harmony: { policy: 'source', sourceSpan: span, vocabularyRefs: [], instruction: null },
    cues: [],
    exchanges: [],
    rationale,
  };
}

export function proposeSourceClosePlan(index: SourceIndex, id: string, mode: GuitarMode = 'MELODIC'): PerformancePlan {
  const span = spanOf(index, 0, index.measures.length - 1);
  const tail = spanOf(index, index.measures.length - 1, index.measures.length - 1);
  const section = sourceSection('src-all', span, 'statement', 'Full source traversal. No added bars.', mode);
  section.purpose = 'ending';
  const ids = [section.id];
  return {
    schemaVersion: '1.0',
    engineEdition: '7.3',
    id,
    source: {
      scoreId: index.scoreId,
      sha256: index.sha256,
      partIds: { ...index.partIds },
      annotationSha256: null,
    },
    motifs: [],
    identity: {
      primaryTraversal: [span],
      protectedSpans: [span],
      requiredMotifIds: [],
      returnLandmarks: [{ id: 'written-ending', span: tail }],
    },
    sections: [section],
    ending: { kind: 'source', finalSectionId: section.id, tail },
    practiceViews: [
      { id: 'guitar-study', product: 'guitar_study', sectionIds: ids, focus: 'guitar', approaches: ['minimal', 'lyrical', 'adventurous'] },
      { id: 'bass-partner', product: 'bass_partner', sectionIds: ids, focus: 'bass', approaches: ['minimal', 'lyrical', 'adventurous'] },
    ],
    notes: ['Source-close plan. Both parts stay on the written notes. The ending is the written ending.'],
  };
}

export interface LedDepartureOptions {
  id: string;
  afterOrder: number;
  leader: Player;
  yieldBars: number;
  answerBars: number;
  rejoinBars: number;
  mode?: GuitarMode;
}

export function proposeLedDeparture(index: SourceIndex, options: LedDepartureOptions): PerformancePlan {
  const cut = cutAfter(index, options.afterOrder);
  if (!cut.safe) throw new Error(`refusing insertion after order ${options.afterOrder}: ${cut.reason}`);
  if (options.yieldBars <= 0 || options.answerBars <= 0 || options.rejoinBars <= 0) {
    throw new Error('departure turns need a positive bar count');
  }
  const mode = options.mode ?? 'MELODIC';
  const leader = options.leader;
  const partner: Player = leader === 'bass' ? 'guitar' : 'bass';
  const before = spanOf(index, 0, options.afterOrder);
  const after = spanOf(index, options.afterOrder + 1, index.measures.length - 1);
  const template = spanOf(index, options.afterOrder, options.afterOrder);
  const cellOrders = [0, Math.min(1, options.afterOrder)];
  const cellSpan = spanOf(index, cellOrders[0]!, cellOrders[1]!);
  const motifId = `${leader}-opening-cell`;
  const sourceEventIds = index.events
    .filter((event) => event.player === leader && !event.rest && cellOrders.includes(event.order))
    .map((event) => event.id);
  if (!sourceEventIds.length) throw new Error(`no ${leader} attacks in the opening cell`);
  const tail = spanOf(index, index.measures.length - 1, index.measures.length - 1);
  const returnId = 'src-return';
  const proposalCue = `${options.id}-proposal`;
  const responseCue = `${options.id}-response`;
  const rejoinCue = `${options.id}-rejoin`;

  const open = (
    id: string,
    bars: number,
    purpose: PlanSection['purpose'],
    partnerRole: Role,
    partnerMaterial: VoicePlan['material'],
    leaderInstruction: string,
    rationale: string
  ): PlanSection => ({
    id,
    purpose,
    length: { kind: 'fixed', bars },
    meter: { kind: 'repeat_template', span: template },
    tempo: { kind: 'inherit_entry' },
    primarySourceSpan: null,
    guitarMode: mode,
    voices: {
      guitar: voice(leader === 'guitar' ? 'lead' : partnerRole, leader === 'guitar' ? performer(motifId, leaderInstruction) : partnerMaterial),
      bass: voice(leader === 'bass' ? 'lead' : partnerRole, leader === 'bass' ? performer(motifId, leaderInstruction) : partnerMaterial),
    },
    development: {
      parentMotifIds: [motifId],
      operation: 'extend',
      retained: ['rhythm', 'contour'],
      permittedDeparture: ['texture'],
      returnSectionId: returnId,
      execution: 'performer_directed',
    },
    harmony: {
      policy: 'performer_intent',
      sourceSpan: null,
      vocabularyRefs: [],
      instruction: 'No new harmony. Use only what the source already states.',
    },
    cues: [],
    exchanges: [],
    rationale,
  });

  const yieldSection = open(
    'depart-yield',
    options.yieldBars,
    leader === 'bass' ? 'bass_feature' : 'improvisation',
    'listen',
    { kind: 'tacet', reason: 'yield' },
    `${leader === 'bass' ? 'Bass' : 'Guitar'} proposes the opening cell. Partner waits. Do not write new notes.`,
    `${leader} leads. Partner yields.`
  );
  yieldSection.cues = [
    {
      id: proposalCue,
      owner: leader,
      action: 'enter',
      target: partner,
      trigger: { kind: 'at', point: ZERO },
      printedText: `${leader.toUpperCase()} CUE — proposal. Partner stays out.`,
    },
  ];

  const answerSection = open(
    'depart-answer',
    options.answerBars,
    'dialogue',
    'respond',
    {
      kind: 'performer',
      motifIds: [motifId],
      instruction:
        partner === 'guitar'
          ? 'Guitar: one melodic answer. Keep the cell rhythm or answer its contour. You may decline. No written pitches.'
          : 'Bass: one answer. Keep the cell rhythm or answer its contour. You may decline. No written pitches.',
    },
    `${leader === 'bass' ? 'Bass' : 'Guitar'} continues the proposal under the answer. Return cue stays with the leader.`,
    'Partner receives a performer-directed response. Leader still owns the return.'
  );
  answerSection.cues = [
    {
      id: responseCue,
      owner: partner,
      action: 'enter',
      target: leader,
      trigger: { kind: 'at', point: ZERO },
      printedText: `${partner.toUpperCase()} RESPONSE — performer-directed. ${leader.toUpperCase()} still leads.`,
    },
  ];
  answerSection.exchanges = [
    {
      id: `${options.id}-exchange`,
      initiator: leader,
      responder: partner,
      motifIds: [motifId],
      proposalCueId: proposalCue,
      responseCueId: responseCue,
      relation: 'answer_contour',
      retainedAnchor: motifId,
      returnSectionId: returnId,
      execution: 'performer_directed',
    },
  ];

  const rejoinSection = open(
    'depart-rejoin',
    options.rejoinBars,
    'recall',
    'listen',
    { kind: 'tacet', reason: 'yield' },
    `${leader === 'bass' ? 'Bass' : 'Guitar'} plays the return cue, then both rejoin the written source. No written pitches.`,
    `${leader} owns the rejoin.`
  );
  rejoinSection.cues = [
    {
      id: rejoinCue,
      owner: leader,
      action: 'rejoin',
      target: 'both',
      trigger: { kind: 'at', point: ZERO },
      printedText: `${leader.toUpperCase()} CUE — rejoin the written source at the next bar.`,
    },
  ];

  const beforeSection = sourceSection('src-before', before, 'statement', 'Locked source before the departure.', mode);
  const returnSection = sourceSection(returnId, after, 'ending', 'Locked return through the written ending.', mode);
  const sections = [beforeSection, yieldSection, answerSection, rejoinSection, returnSection];
  const ids = sections.map((section) => section.id);
  const printed = index.measures[options.afterOrder]?.printedNumber;
  const nextPrinted = index.measures[options.afterOrder + 1]?.printedNumber;
  return {
    schemaVersion: '1.0',
    engineEdition: '7.3',
    id: options.id,
    source: {
      scoreId: index.scoreId,
      sha256: index.sha256,
      partIds: { ...index.partIds },
      annotationSha256: null,
    },
    motifs: [
      {
        id: motifId,
        owner: leader,
        span: cellSpan,
        sourceEventIds,
        provenance: 'user_confirmed',
        preserve: ['rhythm', 'contour'],
      },
    ],
    identity: {
      primaryTraversal: [spanOf(index, 0, index.measures.length - 1)],
      protectedSpans: [spanOf(index, 0, index.measures.length - 1)],
      requiredMotifIds: [motifId],
      returnLandmarks: [
        { id: 'rejoin-source', span: spanOf(index, options.afterOrder + 1, options.afterOrder + 1) },
        { id: 'written-ending', span: tail },
      ],
    },
    sections,
    ending: { kind: 'source', finalSectionId: returnId, tail },
    practiceViews: [
      { id: 'guitar-study', product: 'guitar_study', sectionIds: ids, focus: 'guitar', approaches: ['minimal', 'lyrical', 'adventurous'] },
      { id: 'bass-partner', product: 'bass_partner', sectionIds: ids, focus: 'bass', approaches: ['minimal', 'lyrical', 'adventurous'] },
    ],
    notes: [
      `Insertion after printed bar ${printed}, before printed bar ${nextPrinted}. ${cut.reason}.`,
      `${options.yieldBars}+${options.answerBars}+${options.rejoinBars} added bars. ${leader} leads. Original ending stays last.`,
      'Open bars are performer-directed. This plan does not invent pitches, voicings, or harmony.',
    ],
  };
}

function performer(motifId: string, instruction: string): VoicePlan['material'] {
  return { kind: 'performer', motifIds: [motifId], instruction };
}

function voice(role: Role, material: VoicePlan['material']): VoicePlan {
  return {
    material,
    role,
    entry: { kind: 'at', point: ZERO },
    exit: { kind: 'section_end' },
    density: [{ at: ZERO, level: material.kind === 'tacet' ? 'sparse' : 'moderate' }],
  };
}

export function assertBlackAuraSource(index: SourceIndex): void {
  if (index.measures.length !== 39) throw new Error(`Black Aura pilot expects 39 bars, found ${index.measures.length}`);
  for (const measure of index.measures) {
    if (measure.guitar.beats !== 4 || measure.guitar.beatType !== 4) {
      throw new Error(`printed bar ${measure.printedNumber} is ${measure.guitar.beats}/${measure.guitar.beatType}`);
    }
  }
  const tempo = index.measures[0]?.guitar.tempo;
  if (tempo?.beatUnit !== 'quarter' || tempo.dots !== 0 || tempo.perMinute !== '92') {
    throw new Error(`expected quarter = 92, found ${tempo?.beatUnit} dots ${tempo?.dots} = ${tempo?.perMinute}`);
  }
  const cut = cutAfter(index, 7);
  if (!cut.safe) throw new Error(`bar 8/9 cut is not safe: ${cut.reason}`);
  const late = cutAfter(index, 37);
  if (late.safe) throw new Error('expected the bass tie across the written ending to block a cut between bars 38 and 39');
}
