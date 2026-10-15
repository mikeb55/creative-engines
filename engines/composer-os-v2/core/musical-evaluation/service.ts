/**
 * Read-only musical evaluation.
 * Technical pass/fail, structural description, and human judgement stay separate.
 * The service does not write notes and does not award an artistic score.
 */

import { createHash } from 'node:crypto';
import { BHL_WORLD_IDS } from '../bhl/bhlWorlds';
import { listHexatonicScalars } from '../hexatonic/collections';
import { HEXATONIC_PROJECT_VERSION } from '../hexatonic/hexatonicProject';
import { listHexatonicWpsPairs } from '../hexatonic/triadPairs';
import { listPentatonicColourResources } from '../pentatonic/colourRegistry';
import { PENTATONIC_PROJECT_FORMAT, PENTATONIC_PROJECT_VERSION } from '../pentatonic/pentatonicProject';
import { WPS_VAULT_TONALITIES } from '../wwh/wps/wpsTonalityVaultRecord';
import {
  BMEF_CORE,
  BMEF_DECISIONS,
  BMEF_EVIDENCE_LEVELS,
  BMEF_GATES,
  BMEF_MODULE_J,
  BMEF_VERSION,
  emptyHumanScorecard,
} from './bmefCatalog';
import { eventSignature, ingestCanonicalScore, sha256Text } from './canonicalScore';
import { analyseHarmony, type DeclaredField, type MusicalFinding } from './harmonicEvidence';
import { analyseRhythm, EXPERIMENTAL_RHYTHM_METRICS } from './rhythmEvidence';
import { runTechnicalChecks, type TechnicalCheckRequest, type TechnicalReport } from './technicalChecks';

export const RECEIPT_VERSION = 'musical-evaluation-receipt-1';

export interface ScoreInput {
  label: string;
  xml: string;
}

export interface EvaluationRequest {
  score: ScoreInput;
  declared?: DeclaredField;
  intentionId?: string | null;
  lock?: TechnicalCheckRequest['lock'];
  reimportXml?: string;
}

export interface ComparisonRequest {
  scores: readonly ScoreInput[];
  declared?: DeclaredField;
  intentionId?: string | null;
}

export interface ScoreDifference {
  left: string;
  right: string;
  bar: number;
  onset: string;
  instrument: string | null;
  voice: string | null;
  eventId: string;
  change: 'only-in-left' | 'only-in-right';
  signature: string;
}

export interface EvidenceReceipt {
  receiptVersion: typeof RECEIPT_VERSION;
  bmefVersion: typeof BMEF_VERSION;
  scores: Array<{ label: string; sha256: string }>;
  technical: Array<{ label: string; sha256: string; summary: TechnicalReport['summary']; findings: TechnicalReport['findings'] }>;
  structural: Array<{ label: string; sha256: string; findings: MusicalFinding[] }>;
  comparison: {
    notice: string;
    differences: ScoreDifference[];
    rank: null;
    musicalQualityScore: null;
  } | null;
  humanJudgement: null;
  unsupportedMetrics: string[];
  preserved: {
    pentatonicColours: number;
    hexatonicScalars: number;
    wpsPairs: number;
    wpsTonalities: number;
    bhlWorlds: number;
    pentatonicProject: string;
    hexatonicProject: number;
  };
  bmef: {
    gates: typeof BMEF_GATES;
    core: typeof BMEF_CORE;
    moduleJ: typeof BMEF_MODULE_J;
    evidenceLevels: typeof BMEF_EVIDENCE_LEVELS;
    decisions: typeof BMEF_DECISIONS;
    machineRatings: null;
    machineDecision: null;
    humanScorecard: ReturnType<typeof emptyHumanScorecard>;
  };
  receiptSha256: string;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) out[key] = sortValue(source[key]);
    return out;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function preserved() {
  return {
    pentatonicColours: listPentatonicColourResources().length,
    hexatonicScalars: listHexatonicScalars().length,
    wpsPairs: listHexatonicWpsPairs().length,
    wpsTonalities: WPS_VAULT_TONALITIES.length,
    bhlWorlds: BHL_WORLD_IDS.length,
    pentatonicProject: `${PENTATONIC_PROJECT_FORMAT}-${PENTATONIC_PROJECT_VERSION}`,
    hexatonicProject: HEXATONIC_PROJECT_VERSION,
  };
}

function structuralFindings(xml: string, declared: DeclaredField | undefined, intentionId: string | null): MusicalFinding[] {
  const harmonic = analyseHarmony({ xml, declared, intentionId });
  const rhythm = analyseRhythm({ xml, intentionId });
  return [...harmonic.findings, ...rhythm.findings];
}

function seal(body: Omit<EvidenceReceipt, 'receiptSha256'>): EvidenceReceipt {
  const receiptSha256 = sha256Text(canonicalJson(body));
  return { ...body, receiptSha256 };
}

export function evaluateScore(request: EvaluationRequest): EvidenceReceipt {
  const sha256 = sha256Text(request.score.xml);
  const technical = runTechnicalChecks({
    xml: request.score.xml,
    lock: request.lock,
    reimportXml: request.reimportXml,
  });
  const findings = structuralFindings(request.score.xml, request.declared, request.intentionId ?? null);
  const rhythm = analyseRhythm({ xml: request.score.xml });
  return seal({
    receiptVersion: RECEIPT_VERSION,
    bmefVersion: BMEF_VERSION,
    scores: [{ label: request.score.label, sha256 }],
    technical: [{ label: request.score.label, sha256, summary: technical.summary, findings: technical.findings }],
    structural: [{ label: request.score.label, sha256, findings }],
    comparison: null,
    humanJudgement: null,
    unsupportedMetrics: [...rhythm.unsupportedMetrics],
    preserved: preserved(),
    bmef: {
      gates: BMEF_GATES,
      core: BMEF_CORE,
      moduleJ: BMEF_MODULE_J,
      evidenceLevels: BMEF_EVIDENCE_LEVELS,
      decisions: BMEF_DECISIONS,
      machineRatings: null,
      machineDecision: null,
      humanScorecard: emptyHumanScorecard('J'),
    },
  });
}

export function compareScores(request: ComparisonRequest): EvidenceReceipt {
  if (request.scores.length < 2 || request.scores.length > 3) {
    throw new Error('comparison accepts two or three scores');
  }
  const packed = request.scores.map((score) => ({ score, sha256: sha256Text(score.xml) }));
  const technical = packed.map(({ score, sha256 }) => {
    const report = runTechnicalChecks({ xml: score.xml });
    return { label: score.label, sha256, summary: report.summary, findings: report.findings };
  });
  const structural = packed.map(({ score, sha256 }) => ({
    label: score.label,
    sha256,
    findings: structuralFindings(score.xml, request.declared, request.intentionId ?? null),
  }));
  const differences: ScoreDifference[] = [];
  for (let left = 0; left < packed.length; left += 1) {
    for (let right = left + 1; right < packed.length; right += 1) {
      const a = ingestCanonicalScore(packed[left]!.score.xml).score;
      const b = ingestCanonicalScore(packed[right]!.score.xml).score;
      const leftEvents = a?.sourceEvents ?? [];
      const rightEvents = b?.sourceEvents ?? [];
      const rightSet = new Set(rightEvents.map(eventSignature));
      const leftSet = new Set(leftEvents.map(eventSignature));
      for (const event of leftEvents) {
        const signature = eventSignature(event);
        if (rightSet.has(signature)) continue;
        differences.push({
          left: packed[left]!.score.label,
          right: packed[right]!.score.label,
          bar: event.bar,
          onset: `${event.onsetInBar.n}/${event.onsetInBar.d}`,
          instrument: event.instrument,
          voice: event.voice,
          eventId: event.id,
          change: 'only-in-left',
          signature,
        });
      }
      for (const event of rightEvents) {
        const signature = eventSignature(event);
        if (leftSet.has(signature)) continue;
        differences.push({
          left: packed[left]!.score.label,
          right: packed[right]!.score.label,
          bar: event.bar,
          onset: `${event.onsetInBar.n}/${event.onsetInBar.d}`,
          instrument: event.instrument,
          voice: event.voice,
          eventId: event.id,
          change: 'only-in-right',
          signature,
        });
      }
    }
  }
  const rhythm = analyseRhythm({ xml: request.scores[0]!.xml });
  return seal({
    receiptVersion: RECEIPT_VERSION,
    bmefVersion: BMEF_VERSION,
    scores: packed.map(({ score, sha256 }) => ({ label: score.label, sha256 })),
    technical,
    structural,
    comparison: {
      notice: 'Differences identify events. They do not rank the scores.',
      differences,
      rank: null,
      musicalQualityScore: null,
    },
    humanJudgement: null,
    unsupportedMetrics: [...new Set([...rhythm.unsupportedMetrics, ...EXPERIMENTAL_RHYTHM_METRICS])],
    preserved: preserved(),
    bmef: {
      gates: BMEF_GATES,
      core: BMEF_CORE,
      moduleJ: BMEF_MODULE_J,
      evidenceLevels: BMEF_EVIDENCE_LEVELS,
      decisions: BMEF_DECISIONS,
      machineRatings: null,
      machineDecision: null,
      humanScorecard: emptyHumanScorecard('J'),
    },
  });
}

export function receiptBytes(receipt: EvidenceReceipt): string {
  return canonicalJson(receipt);
}

export function verifyReceipt(receipt: EvidenceReceipt): boolean {
  const { receiptSha256, ...body } = receipt;
  const live = sha256Text(canonicalJson(body));
  return live === receiptSha256 && createHash('sha256').update(receiptBytes(receipt), 'utf8').digest('hex').length === 64;
}

export interface ScoreIdentityEvent {
  id: string;
  bar: number;
  partId: string;
  instrument: string;
  voice: string;
  onset: string;
  rest: boolean;
}

export interface ScoreIdentity {
  sha256: string;
  parseError: string | null;
  rootName: string | null;
  parts: Array<{ id: string; name: string; role: string }>;
  bars: number[];
  eventCount: number;
  events: ScoreIdentityEvent[];
}

/** Identity of a loaded score. Reads the canonical ingest. Does not analyse or write. */
export function describeScoreIdentity(xml: string): ScoreIdentity {
  const ingest = ingestCanonicalScore(xml);
  const score = ingest.score;
  return {
    sha256: ingest.sha256,
    parseError: ingest.parseError,
    rootName: ingest.rootName,
    parts: (score?.parts ?? []).map((part) => ({ id: part.id, name: part.name, role: part.role })),
    bars: [...new Set((score?.measures ?? []).map((measure) => measure.bar))].sort((a, b) => a - b),
    eventCount: score?.sourceEvents.length ?? 0,
    events: (score?.sourceEvents ?? []).map((event) => ({
      id: event.id,
      bar: event.bar,
      partId: event.partId,
      instrument: event.instrument,
      voice: event.voice,
      onset: `${event.onsetInBar.n}/${event.onsetInBar.d}`,
      rest: event.rest,
    })),
  };
}
