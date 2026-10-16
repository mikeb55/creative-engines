/**
 * Blind listening plan for the 12 provisional Core pairs.
 * Codes hide the pair. Saving an answer is what reveals it.
 * Evidence never admits a pair.
 */

import { getHexatonicScalar, listHexatonicScalars } from './collections';
import {
  blankCoreLaboratoryReview,
  CORE_CANDIDATES,
  getCoreCandidate,
  validateCoreLaboratoryReview,
  type BlindAuditionItem,
  type BlindAuditionRecord,
  type BlindListeningAnswer,
  type CoreLaboratoryReview,
  type LaboratoryDecision,
} from './coreLaboratory';
import { CORE_CONTEXT_IDS, coreContextExampleMusicXml } from './coreContextExamples';
import { generateHexatonicPhrase } from './phraseGeneration';
import { getHexatonicWpsPair, listHexatonicWpsPairs } from './triadPairs';

export function blankBlindAnswer(): BlindListeningAnswer {
  return {
    distinct: 'UNDECIDED',
    compose: 'UNDECIDED',
    colour: '',
    saved: false,
    guitarPlaythrough: '',
    disposition: 'UNDECIDED',
  };
}

function randomOf(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = current;
  }
  return copy;
}

export function listBlindCatalogueIds(): readonly string[] {
  const blocked = new Set(CORE_CANDIDATES.map((row) => row.id));
  return [...listHexatonicScalars(), ...listHexatonicWpsPairs()]
    .map((row) => row.id)
    .filter((id) => !blocked.has(id));
}

export function buildBlindAudition(seed: number): BlindAuditionRecord {
  if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) throw new Error('blind seed must be a safe integer');
  const random = randomOf(seed);
  const candidates = shuffle(CORE_CANDIDATES.map((row) => row.id), random);
  const references = shuffle(listBlindCatalogueIds(), random).slice(0, 4);
  if (references.length !== 4) throw new Error('blind catalogue pool is short');
  const sessions = [0, 1, 2, 3].map((index) => ({
    index,
    items: shuffle(
      [
        ...candidates.slice(index * 3, index * 3 + 3).map((candidateId) => ({ kind: 'primary' as const, candidateId })),
        { kind: 'reference' as const, catalogueId: references[index]! },
      ],
      random,
    ),
  }));
  const codes = shuffle(Array.from({ length: 18 }, (_, index) => `mark-${String(index + 1).padStart(2, '0')}`), random);
  const coded: BlindAuditionItem[][] = sessions.map((session) =>
    session.items.map((item) => ({
      code: '',
      kind: item.kind,
      ...(item.kind === 'primary' ? { candidateId: item.candidateId } : { catalogueId: item.catalogueId }),
    })),
  );
  let codeIndex = 0;
  for (const items of coded) {
    for (const item of items) {
      item.code = codes[codeIndex]!;
      codeIndex += 1;
    }
  }
  const pull = (sessionIndex: number) => coded[sessionIndex]!.find((item) => item.kind === 'primary');
  const earlier = [pull(0), pull(1)];
  [2, 3].forEach((sessionIndex) => {
    const source = earlier[sessionIndex - 2];
    if (!source?.candidateId) throw new Error('blind repeat source missing');
    const repeat: BlindAuditionItem = {
      code: codes[codeIndex]!,
      kind: 'repeat',
      candidateId: source.candidateId,
      sourceCode: source.code,
    };
    codeIndex += 1;
    const at = Math.floor(random() * (coded[sessionIndex]!.length + 1));
    coded[sessionIndex]!.splice(at, 0, repeat);
  });
  const record: BlindAuditionRecord = {
    seed,
    cursor: { session: 0, item: 0 },
    sessions: coded.map((items, index) => ({ index, items })),
    answers: {},
  };
  const probe = blankCoreLaboratoryReview('core-laboratory', '2026-10-16T00:00:00.000Z');
  const checked = validateCoreLaboratoryReview({ ...probe, blind: record });
  if (!checked.ok) throw new Error(checked.errors.join('; '));
  return record;
}

export function findBlindItem(record: BlindAuditionRecord, code: string): BlindAuditionItem | undefined {
  for (const session of record.sessions) {
    const item = session.items.find((row) => row.code === code);
    if (item) return item;
  }
  return undefined;
}

export interface BlindItemDisclosure {
  code: string;
  revealed: boolean;
  clipCount: 4;
  kind?: BlindAuditionItem['kind'];
  candidateId?: string;
  catalogueId?: string;
  sourceCode?: string;
  label?: string;
}

export function discloseBlindItem(record: BlindAuditionRecord, code: string): BlindItemDisclosure {
  const item = findBlindItem(record, code);
  if (!item) throw new Error(`unknown blind item ${code}`);
  const hidden: BlindItemDisclosure = { code, revealed: false, clipCount: 4 };
  if (!record.answers[code]?.saved) return hidden;
  const candidate = item.candidateId ? getCoreCandidate(item.candidateId) : undefined;
  const label = item.kind === 'reference'
    ? `Catalogue reference ${item.catalogueId}`
    : item.kind === 'repeat'
      ? `Repeat of ${item.sourceCode}. ${candidate?.label ?? item.candidateId}`
      : candidate?.label ?? item.candidateId;
  return {
    code,
    revealed: true,
    clipCount: 4,
    kind: item.kind,
    ...(item.candidateId ? { candidateId: item.candidateId } : {}),
    ...(item.catalogueId ? { catalogueId: item.catalogueId } : {}),
    ...(item.sourceCode ? { sourceCode: item.sourceCode } : {}),
    label,
  };
}

export function blindExcerptMusicXml(record: BlindAuditionRecord, code: string, excerpt: number): string {
  const item = findBlindItem(record, code);
  if (!item) throw new Error(`unknown blind item ${code}`);
  if (!Number.isInteger(excerpt) || excerpt < 0 || excerpt > 3) throw new Error('excerpt must be 0..3');
  if (item.kind === 'reference') {
    const catalogueId = item.catalogueId;
    if (!catalogueId) throw new Error(`reference ${code} has no catalogue id`);
    const centre = Math.abs(record.seed + excerpt) % 12;
    const phraseSeed = Math.abs(record.seed + excerpt * 17);
    if (getHexatonicScalar(catalogueId)) return generateHexatonicPhrase({ seed: phraseSeed, centre, scalarId: catalogueId }).musicXml;
    if (getHexatonicWpsPair(catalogueId)) return generateHexatonicPhrase({ seed: phraseSeed, centre, wpsId: catalogueId }).musicXml;
    throw new Error(`unknown catalogue reference ${catalogueId}`);
  }
  if (!item.candidateId) throw new Error(`blind item ${code} has no candidate`);
  return coreContextExampleMusicXml(item.candidateId, CORE_CONTEXT_IDS[excerpt]!);
}

export function moveBlindCursor(record: BlindAuditionRecord, delta: number): BlindAuditionRecord {
  const slots: { session: number; item: number }[] = [];
  record.sessions.forEach((session, sessionIndex) => {
    session.items.forEach((_, itemIndex) => slots.push({ session: sessionIndex, item: itemIndex }));
  });
  const current = slots.findIndex((slot) => slot.session === record.cursor.session && slot.item === record.cursor.item);
  const next = slots[Math.min(slots.length - 1, Math.max(0, (current < 0 ? 0 : current) + delta))] ?? slots[0]!;
  return { ...record, cursor: next };
}

function decisionFor(disposition: BlindListeningAnswer['disposition']): LaboratoryDecision | null {
  if (disposition === 'ACCEPT') return 'KEEP';
  if (disposition === 'REFINE') return 'REFINE';
  if (disposition === 'REJECT') return 'REJECT';
  if (disposition === 'KEEP_PROVISIONAL') return 'UNDECIDED';
  return null;
}

export function commitBlindAnswer(review: CoreLaboratoryReview, code: string, answer: BlindListeningAnswer): CoreLaboratoryReview {
  if (!review.blind) return review;
  const item = findBlindItem(review.blind, code);
  if (!item) return review;
  const stored: BlindListeningAnswer = { ...answer, saved: true };
  let next: CoreLaboratoryReview = {
    ...review,
    artisticApproval: false,
    blind: {
      ...review.blind,
      answers: { ...review.blind.answers, [code]: stored },
    },
  };
  if (item.kind !== 'primary' || !item.candidateId) return next;
  const entry = next.candidates[item.candidateId];
  if (!entry) return next;
  const decision = decisionFor(stored.disposition);
  next = {
    ...next,
    artisticApproval: false,
    candidates: {
      ...next.candidates,
      [item.candidateId]: {
        ...entry,
        colour: stored.colour || entry.colour,
        decision: decision ?? entry.decision,
      },
    },
  };
  return next;
}

export interface BlindListeningEvidence {
  text: string;
  referenceNotes: readonly string[];
  repeatDisagreements: readonly string[];
  automaticJudgement: false;
}

export function blindListeningEvidence(record: BlindAuditionRecord): BlindListeningEvidence {
  const referenceNotes: string[] = [];
  const repeatDisagreements: string[] = [];
  for (const session of record.sessions) {
    for (const item of session.items) {
      const answer = record.answers[item.code];
      if (!answer?.saved) continue;
      if (item.kind === 'reference') {
        referenceNotes.push(`${item.code} was answered before its catalogue name was shown. Listening evidence, not a judgement.`);
      }
      if (item.kind === 'repeat' && item.sourceCode) {
        const source = record.answers[item.sourceCode];
        if (source?.saved && (source.distinct !== answer.distinct || source.compose !== answer.compose)) {
          repeatDisagreements.push(`${item.code} disagreed with ${item.sourceCode}. Listening evidence, not a judgement.`);
        }
      }
    }
  }
  const lines = [...referenceNotes, ...repeatDisagreements];
  return {
    text: lines.join(' ') || 'No hidden-reference hits or repeat disagreements are stored.',
    referenceNotes,
    repeatDisagreements,
    automaticJudgement: false,
  };
}
