/**
 * Plans that point at an existing chord-melody file.
 * They do not invent voicings.
 */

import { alignChordMelody, switchIsSafe } from './chordMelodyAlign';
import type { PerformancePlan, PlanSection, Span, VoicePlan } from './performancePlanTypes';
import type { SourceIndex } from './sourceIndexAdapter';

const ZERO = { bar: 0, offsetQ: { n: 0, d: 1 } };

function spanOf(index: SourceIndex, first: number, last: number): Span {
  const start = index.measures[first];
  const end = index.measures[last];
  if (!start || !end) throw new Error(`span ${first}..${last} is outside ${index.scoreId}`);
  return { firstMeasureId: start.id, lastMeasureId: end.id };
}

function sourceVoice(player: 'guitar' | 'bass', span: Span, role: VoicePlan['role']): VoicePlan {
  return {
    material: { kind: 'source', span, sourcePlayer: player, integrity: 'exact' },
    role,
    entry: { kind: 'at', point: ZERO },
    exit: { kind: 'section_end' },
    density: [{ at: ZERO, level: 'moderate' }],
  };
}

function chordVoice(sourceSpan: Span, arrangementSpan: Span): VoicePlan {
  return {
    material: { kind: 'chord_melody', sourceSpan, arrangementSpan, integrity: 'exact' },
    role: 'lead',
    entry: { kind: 'at', point: ZERO },
    exit: { kind: 'section_end' },
    density: [{ at: ZERO, level: 'moderate' }],
  };
}

function shell(
  duo: SourceIndex,
  arrangement: SourceIndex,
  id: string,
  sections: PlanSection[],
  notes: string[]
): PerformancePlan {
  const tail = spanOf(duo, duo.measures.length - 1, duo.measures.length - 1);
  const whole = spanOf(duo, 0, duo.measures.length - 1);
  const final = sections[sections.length - 1];
  if (!final) throw new Error('chord-melody plan needs a section');
  final.purpose = 'ending';
  return {
    schemaVersion: '1.0',
    engineEdition: '7.3',
    id,
    source: {
      scoreId: duo.scoreId,
      sha256: duo.sha256,
      partIds: { ...duo.partIds },
      annotationSha256: null,
    },
    chordMelody: {
      id: arrangement.scoreId,
      sha256: arrangement.sha256,
      scoreId: arrangement.scoreId,
      label: arrangement.title,
    },
    motifs: [],
    identity: {
      primaryTraversal: [whole],
      protectedSpans: [whole],
      requiredMotifIds: [],
      returnLandmarks: [{ id: 'written-ending', span: tail }],
    },
    sections,
    ending: { kind: 'source', finalSectionId: final.id, tail },
    practiceViews: [
      {
        id: 'guitar-study',
        product: 'guitar_study',
        sectionIds: sections.map((section) => section.id),
        focus: 'guitar',
        approaches: ['minimal', 'lyrical', 'adventurous'],
      },
      {
        id: 'bass-partner',
        product: 'bass_partner',
        sectionIds: sections.map((section) => section.id),
        focus: 'bass',
        approaches: ['minimal', 'lyrical', 'adventurous'],
      },
    ],
    notes,
  };
}

function lockedSection(
  id: string,
  duoSpan: Span,
  arrangementSpan: Span,
  purpose: PlanSection['purpose'],
  rationale: string,
  mode: 'MELODIC' | 'CHORD_MELODY'
): PlanSection {
  return {
    id,
    purpose,
    length: { kind: 'source', span: duoSpan },
    meter: { kind: 'source', span: duoSpan },
    tempo: { kind: 'source', span: duoSpan },
    primarySourceSpan: duoSpan,
    guitarMode: mode,
    voices: {
      guitar: mode === 'CHORD_MELODY' ? chordVoice(duoSpan, arrangementSpan) : sourceVoice('guitar', duoSpan, 'lead'),
      bass: sourceVoice('bass', duoSpan, 'support'),
    },
    development: {
      parentMotifIds: [],
      operation: 'none',
      retained: ['pitch', 'rhythm', 'silence'],
      permittedDeparture: [],
      returnSectionId: null,
      execution: 'literal_quote',
    },
    harmony: { policy: 'source', sourceSpan: duoSpan, vocabularyRefs: [], instruction: null },
    cues: [],
    exchanges: [],
    rationale,
  };
}

function requireAlignment(duo: SourceIndex, arrangement: SourceIndex) {
  const alignment = alignChordMelody(duo, arrangement);
  if (!alignment.ok) throw new Error(`${arrangement.title}: ${alignment.message}`);
  return alignment;
}

function excludedNote(arrangement: SourceIndex, orders: number[]): string {
  if (!orders.length) return 'Every arrangement bar maps onto the duo.';
  const printed = orders.map((order) => arrangement.measures[order]?.printedNumber ?? String(order));
  return `Arrangement bars ${printed.join(', ')} stay out of the duo. They do not match a duo bar.`;
}

export function proposeFullChordMelody(duo: SourceIndex, arrangement: SourceIndex, id: string): PerformancePlan {
  const alignment = requireAlignment(duo, arrangement);
  const first = alignment.pairs[0]!;
  const last = alignment.pairs[alignment.pairs.length - 1]!;
  const duoSpan = spanOf(duo, first.duoOrder, last.duoOrder);
  const arrangementSpan = spanOf(arrangement, first.arrangementOrder, last.arrangementOrder);
  const section = lockedSection(
    'cm-all',
    duoSpan,
    arrangementSpan,
    'statement',
    'Guitar is the existing chord melody. Bass stays the duo part.',
    'CHORD_MELODY'
  );
  return shell(duo, arrangement, id, [section], [
    alignment.message,
    excludedNote(arrangement, alignment.excludedArrangementOrders),
    'Voicings are copied from the arrangement. Nothing was regenerated.',
  ]);
}

export function proposeMixedChordMelody(
  duo: SourceIndex,
  arrangement: SourceIndex,
  id: string,
  afterDuoOrder: number
): PerformancePlan {
  const alignment = requireAlignment(duo, arrangement);
  const boundary = alignment.pairs.find((pair) => pair.duoOrder === afterDuoOrder);
  const next = alignment.pairs.find((pair) => pair.duoOrder === afterDuoOrder + 1);
  if (!boundary || !next) throw new Error(`no aligned split after duo order ${afterDuoOrder}`);
  const cut = switchIsSafe(duo, arrangement, afterDuoOrder, boundary.arrangementOrder);
  if (!cut.safe) throw new Error(`refusing mixed split after duo order ${afterDuoOrder}: ${cut.reason}`);
  const original = lockedSection(
    'src-head',
    spanOf(duo, 0, afterDuoOrder),
    spanOf(arrangement, alignment.pairs[0]!.arrangementOrder, boundary.arrangementOrder),
    'statement',
    'Original guitar and bass.',
    'MELODIC'
  );
  const chord = lockedSection(
    'cm-tail',
    spanOf(duo, next.duoOrder, duo.measures.length - 1),
    spanOf(arrangement, next.arrangementOrder, alignment.pairs[alignment.pairs.length - 1]!.arrangementOrder),
    'development',
    'Existing chord melody from the verified split. Bass stays the duo part.',
    'CHORD_MELODY'
  );
  return shell(duo, arrangement, id, [original, chord], [
    alignment.message,
    `Mixed split after duo bar ${duo.measures[afterDuoOrder]?.printedNumber}. ${cut.reason}`,
    excludedNote(arrangement, alignment.excludedArrangementOrders),
    'Original guitar stays original. Chord-melody bars are copied, not simplified.',
  ]);
}
