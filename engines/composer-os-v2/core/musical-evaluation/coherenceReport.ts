/**
 * Whole-piece coherence view. Describes lineage, returns, contrast, and independence.
 * musicalQualityScore stays null.
 */

import { createHash } from 'node:crypto';
import { discoverMotifs } from '../motif-ops/motifDiscovery';
import type { LineagePlacement } from '../motif-ops/developmentChain';
import { ingestCanonicalScore, sha256Text } from './canonicalScore';
import { analyseHookEvidence, type HookEvidence } from './hookEvidence';
import { assertNeutralNotes, buildIndependenceReport, type IndependenceReport } from './independenceReport';

export interface CoherenceReport {
  version: 'coherence-1';
  inputSha256: string;
  params: { partFilter: string[] | null };
  lineage: LineagePlacement[];
  discovered: string[];
  hooks: HookEvidence[];
  sectionContrast: Array<{ from: string; to: string; harmonic: number; rhythmic: number }>;
  independence: IndependenceReport | null;
  absences: Array<{ cellId: string; fromBar: number; toBar: number }>;
  notes: string[];
  musicalQualityScore: null;
  musicallyApproved: false;
}

export function buildCoherenceReport(args: {
  xml: string;
  lineage?: readonly LineagePlacement[];
  hookMidis?: readonly number[];
  hookId?: string;
}): CoherenceReport {
  const inputSha256 = sha256Text(args.xml);
  const ingested = ingestCanonicalScore(args.xml);
  const empty: CoherenceReport = {
    version: 'coherence-1',
    inputSha256,
    params: { partFilter: null },
    lineage: [...(args.lineage ?? [])],
    discovered: [],
    hooks: [],
    sectionContrast: [],
    independence: null,
    absences: [],
    notes: [],
    musicalQualityScore: null,
    musicallyApproved: false,
  };
  if (!ingested.score) return empty;
  const found = discoverMotifs(ingested.score);
  const independence = buildIndependenceReport(ingested.score);
  const top = found.patterns[0];
  const hooks = top
    ? [
        analyseHookEvidence(ingested.score, {
          hookId: args.hookId ?? top.id,
          midis: absoluteMidis(top.points),
        }),
      ]
    : args.hookMidis
      ? [analyseHookEvidence(ingested.score, { hookId: args.hookId ?? 'hook', midis: args.hookMidis })]
      : [];
  const notes = [
    ...independence.notes,
    ...found.patterns.slice(0, 3).map((pattern) => `${pattern.id} returns ${pattern.occurrences.length} times.`),
  ];
  if (found.limits.truncated) notes.push('Pattern search used the 64-event window cap.');
  assertNeutralNotes(notes);
  return {
    ...empty,
    discovered: found.patterns.map((pattern) => pattern.id),
    hooks,
    sectionContrast: sectionContrast(ingested.score),
    independence,
    absences: absencesOf(found.patterns),
    notes,
    musicalQualityScore: null,
    musicallyApproved: false,
  };
}

function absoluteMidis(points: Array<{ onset: number; midi: number }>): number[] {
  const origin = 60;
  return points.map((point) => origin + point.midi);
}

function sectionContrast(score: NonNullable<ReturnType<typeof ingestCanonicalScore>['score']>): CoherenceReport['sectionContrast'] {
  const bars = [...new Set(score.measures.map((measure) => measure.bar))].sort((a, b) => a - b);
  if (bars.length < 2) return [];
  const chunks: Array<{ label: string; bars: number[] }> = [];
  for (let i = 0; i < bars.length; i += 8) {
    const slice = bars.slice(i, i + 8);
    chunks.push({ label: `bars ${slice[0]}-${slice[slice.length - 1]}`, bars: slice });
  }
  const rows: CoherenceReport['sectionContrast'] = [];
  for (let i = 1; i < chunks.length; i += 1) {
    const left = chunks[i - 1]!;
    const right = chunks[i]!;
    rows.push({
      from: left.label,
      to: right.label,
      harmonic: distance(classes(score, left.bars), classes(score, right.bars)),
      rhythmic: rhythmDistance(score, left.bars, right.bars),
    });
  }
  return rows;
}

function classes(score: NonNullable<ReturnType<typeof ingestCanonicalScore>['score']>, bars: readonly number[]): Set<number> {
  const set = new Set<number>();
  const wanted = new Set(bars);
  for (const event of score.soundingEvents) {
    if (wanted.has(event.bar) && event.soundingMidi !== null) set.add(((event.soundingMidi % 12) + 12) % 12);
  }
  return set;
}

function distance(left: Set<number>, right: Set<number>): number {
  if (left.size === 0 && right.size === 0) return 0;
  let shared = 0;
  for (const pc of left) if (right.has(pc)) shared += 1;
  const union = new Set([...left, ...right]).size || 1;
  return Math.max(0, Math.min(1, 1 - shared / union));
}

function rhythmDistance(
  score: NonNullable<ReturnType<typeof ingestCanonicalScore>['score']>,
  left: readonly number[],
  right: readonly number[],
): number {
  const density = (bars: readonly number[]) => {
    const wanted = new Set(bars);
    const attacks = score.soundingEvents.filter((event) => wanted.has(event.bar) && event.soundingMidi !== null).length;
    return attacks / Math.max(1, bars.length);
  };
  const a = density(left);
  const b = density(right);
  const peak = Math.max(a, b, 1);
  return Math.max(0, Math.min(1, Math.abs(a - b) / peak));
}

function absencesOf(patterns: ReturnType<typeof discoverMotifs>['patterns']): CoherenceReport['absences'] {
  const rows: CoherenceReport['absences'] = [];
  for (const pattern of patterns) {
    const bars = pattern.occurrences.map((item) => item.bar).sort((a, b) => a - b);
    for (let i = 1; i < bars.length; i += 1) {
      if (bars[i]! - bars[i - 1]! > 4) {
        rows.push({ cellId: pattern.id, fromBar: bars[i - 1]!, toBar: bars[i]! });
      }
    }
  }
  return rows;
}

export function coherenceSha256(report: CoherenceReport): string {
  return createHash('sha256').update(JSON.stringify(report)).digest('hex');
}
