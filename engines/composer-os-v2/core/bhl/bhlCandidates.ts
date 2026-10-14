/**
 * BHL Batch B — three stored candidates, comparison, and refinement.
 * Comparison reads the stored MusicXML. It does not compose again.
 */

import { createHash } from 'node:crypto';
import { composeBhlGuitar, type BhlComposeRequest, type BhlComposeResult } from './bhlCompose';
import { compareBhlEvidence, readBhlEvidence, type BhlEvidenceComparison, type BhlEvidenceReport } from './bhlEvidence';
import type { BhlPhraseArc, BhlRhythmMode } from './bhlPhraseShape';
import type { BhlProjectCandidate } from './bhlProject';
import type { BhlMusicalRequest } from './bhlResources';
import type { BhlSpan } from './bhlTypes';
import type { BhlWorldId } from './bhlWorlds';

export interface BhlCandidateRequest extends BhlComposeRequest {
  musical?: BhlMusicalRequest | null;
  label?: string;
}

export interface BhlCandidateSet {
  candidates: BhlProjectCandidate[];
}

function sha(xml: string): string {
  return createHash('sha256').update(xml, 'utf8').digest('hex');
}

function eventSignature(result: BhlComposeResult): string {
  return result.events
    .map((event) => `${event.bar}@${event.onsetQuarters}:${[...event.midis].sort((a, b) => a - b).join('.')}`)
    .join('|');
}

export function summariseBhlEvidence(report: BhlEvidenceReport): Record<string, unknown> {
  const guitar = report.events.filter((event) => /guitar|gtr/i.test(`${event.partName} ${event.partId}`));
  const attacks = guitar.filter((event) => event.attack && !event.rest);
  const rests = guitar.filter((event) => event.rest);
  const voices = [...new Set(attacks.map((event) => event.voice))];
  return {
    guitarAttacks: attacks.length,
    guitarRests: rests.length,
    voices,
    silences: report.silences.length,
    motions: report.motions.length,
    crossings: report.crossings.length,
    questions: report.questions,
    musicalQualityScore: report.musicalQualityScore,
  };
}

export function composeBhlCandidate(request: BhlCandidateRequest): { result: BhlComposeResult; candidate: BhlProjectCandidate } {
  if (!request.plan) throw new Error('candidate compose needs a phrase plan');
  const rhythm = (request.rhythm ?? 'derived') as BhlRhythmMode;
  const phraseArc = (request.phraseArc ?? 'derived') as BhlPhraseArc;
  const written = composeBhlGuitar({
    ...request,
    plan: request.plan,
    rhythm,
    phraseArc,
  });
  const evidence = readBhlEvidence(written.xml, request.span);
  const candidate: BhlProjectCandidate = {
    id: request.label ?? `c-${request.seed}`,
    seed: request.seed,
    label: request.label ?? `seed ${request.seed}`,
    parentId: null,
    settings: {
      seed: request.seed,
      span: request.span,
      world: request.world ?? null,
      rhythm,
      phraseArc,
      musical: request.musical ?? null,
      protectedGuitarBars: request.protectedGuitarBars ?? [],
      sourcePath: request.sourcePath,
      pentatonicPcs: request.pentatonicPcs ?? null,
      quartal: request.quartal === true,
    },
    xml: written.xml,
    xmlSha256: sha(written.xml),
    evidenceSummary: {
      ...summariseBhlEvidence(evidence),
      signature: eventSignature(written),
      worldPitchClasses: written.world?.pitchClasses ?? [],
      commonToneRetentions: written.world?.commonToneRetentions ?? 0,
      contrastingMoves: written.world?.contrastingMoves ?? 0,
      outsideFieldNotes: written.fieldNotes.filter((note) => note.status === 'outside-permitted').length,
      binderVoices: written.binder?.independentVoiceAttacks ?? 0,
      guitarSilenceBars: written.binder?.guitarSilenceBars ?? [],
    },
    notes: '',
    decision: '',
  };
  return { result: written, candidate };
}

const RHYTHM_CYCLE: readonly BhlRhythmMode[] = ['derived', 'displace', 'syncopate', 'sparse'];
const ARC_CYCLE: readonly BhlPhraseArc[] = ['derived', 'invert', 'recall'];

function nextOf<T>(list: readonly T[], value: T): T {
  const index = list.indexOf(value);
  return list[(index + 1) % list.length]!;
}

export function generateBhlCandidateSet(input: {
  sourcePath: string;
  span: BhlSpan;
  seed: number;
  world: BhlWorldId;
  plan: BhlComposeRequest['plan'];
  musical?: BhlMusicalRequest | null;
  rhythm?: BhlRhythmMode;
  phraseArc?: BhlPhraseArc;
  pentatonicPcs?: readonly number[] | null;
  pentatonicLabel?: string | null;
  contrastPcs?: readonly number[] | null;
  riffRhythm?: import('./bhlRiffRhythm').BhlRiffRequest | null;
  quartal?: boolean;
  protectedGuitarBars?: readonly number[];
}): BhlCandidateSet {
  if (!input.plan) throw new Error('candidate set needs the locked phrase plan');
  const baseRhythm = input.rhythm ?? 'derived';
  const baseArc = input.phraseArc ?? 'derived';
  const specs: Array<{ seed: number; rhythm: BhlRhythmMode; phraseArc: BhlPhraseArc; label: string }> = [
    { seed: input.seed, rhythm: baseRhythm, phraseArc: baseArc, label: 'Candidate 1' },
    { seed: input.seed + 17, rhythm: nextOf(RHYTHM_CYCLE, baseRhythm), phraseArc: baseArc, label: 'Candidate 2' },
    { seed: input.seed + 29, rhythm: baseRhythm, phraseArc: nextOf(ARC_CYCLE, baseArc), label: 'Candidate 3' },
  ];
  const seen = new Set<string>();
  const candidates: BhlProjectCandidate[] = [];
  for (const spec of specs) {
    let seed = spec.seed;
    let produced: BhlProjectCandidate | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const { candidate } = composeBhlCandidate({
        sourcePath: input.sourcePath,
        span: input.span,
        seed,
        world: input.world,
        plan: input.plan,
        musical: input.musical,
        rhythm: spec.rhythm,
        phraseArc: spec.phraseArc,
        pentatonicPcs: input.pentatonicPcs,
        pentatonicLabel: input.pentatonicLabel,
        contrastPcs: input.contrastPcs,
        riffRhythm: input.riffRhythm,
        quartal: input.quartal,
        protectedGuitarBars: input.protectedGuitarBars,
        label: spec.label,
      });
      const signature = String(candidate.evidenceSummary.signature ?? '');
      if (!seen.has(signature)) {
        seen.add(signature);
        produced = { ...candidate, seed, settings: { ...candidate.settings, seed, variedFromRequest: spec.label !== 'Candidate 1' } };
        break;
      }
      seed += 100;
    }
    if (!produced) throw new Error(`${spec.label} did not produce a distinct guitar line`);
    candidates.push(produced);
  }
  return { candidates };
}

export function compareBhlCandidateXml(
  leftXml: string,
  rightXml: string,
  span: BhlSpan,
): { left: Record<string, unknown>; right: Record<string, unknown>; comparison: BhlEvidenceComparison } {
  const left = readBhlEvidence(leftXml, span);
  const right = readBhlEvidence(rightXml, span);
  return {
    left: summariseBhlEvidence(left),
    right: summariseBhlEvidence(right),
    comparison: compareBhlEvidence(left, right),
  };
}

export function refineBhlCandidate(input: {
  sourcePath: string;
  span: BhlSpan;
  world: BhlWorldId;
  plan: BhlComposeRequest['plan'];
  original: BhlProjectCandidate;
  musical?: BhlMusicalRequest | null;
  rhythm?: BhlRhythmMode;
  phraseArc?: BhlPhraseArc;
  pentatonicPcs?: readonly number[] | null;
  pentatonicLabel?: string | null;
  contrastPcs?: readonly number[] | null;
  riffRhythm?: import('./bhlRiffRhythm').BhlRiffRequest | null;
  quartal?: boolean;
  protectedGuitarBars?: readonly number[];
  seed?: number;
}): BhlProjectCandidate {
  const seed = input.seed ?? input.original.seed + 1;
  const { candidate } = composeBhlCandidate({
    sourcePath: input.sourcePath,
    span: input.span,
    seed,
    world: input.world,
    plan: input.plan,
    musical: input.musical,
    rhythm: input.rhythm,
    phraseArc: input.phraseArc,
    pentatonicPcs: input.pentatonicPcs,
    pentatonicLabel: input.pentatonicLabel,
    contrastPcs: input.contrastPcs,
    riffRhythm: input.riffRhythm,
    quartal: input.quartal,
    protectedGuitarBars: input.protectedGuitarBars,
    label: `${input.original.label} refined`,
  });
  return {
    ...candidate,
    id: `${input.original.id}-refined-${seed}`,
    parentId: input.original.id,
    seed,
  };
}
