/**
 * BHL iteration 2 — plan, generate, splice, verify.
 * Does not call runGoldenPath. Does not write the album tree.
 */

import fs from 'node:fs';
import { assertBhlExportPath } from './bhlCopy';
import { generateBhlGuitar, type BhlFeasibilityNote, type BhlGeneratedGuitar, type BhlLiquidTrace } from './bhlGenerate';
import {
  generateBhlWorldGuitar,
  type BhlPhraseArc,
  type BhlPhraseBinderReport,
  type BhlRhythmMode,
  type BhlWorldGuitar,
} from './bhlPhraseShape';
import type { BhlWorldId } from './bhlWorlds';
import { ingestBhlSource, lockSpecOf, sha256File } from './bhlIngest';
import {
  deriveBhlPhrasePlan,
  evaluateBhlPredicates,
  type BhlFieldSnap,
  type BhlGuitarEvent,
  type BhlPhrasePlan,
  type BhlPredicateResult,
} from './bhlPhrase';
import { readBassBars, type BhlOnsetPlan } from './bhlRhythm';
import type { BhlLockReport, BhlSpan } from './bhlTypes';
import { verifyBhlLocks, verifyRecordedSourceSha } from './bhlVerify';
import { replaceBhlGuitar, type BhlHarmonyChange } from './bhlWrite';

export interface BhlComposeRequest {
  sourcePath: string;
  span: BhlSpan;
  seed: number;
  protectedGuitarBars?: readonly number[];
  /** When set, the generator follows this plan instead of deriving one. */
  plan?: BhlPhrasePlan;
  /** Six BHL worlds. Omitted keeps the iteration-2 guitar generator. */
  world?: BhlWorldId;
  phraseArc?: BhlPhraseArc;
  rhythm?: BhlRhythmMode;
  outputPath?: string;
  permittedOutputDir?: string;
}

export interface BhlComposeResult {
  plan: BhlPhrasePlan;
  events: BhlGuitarEvent[];
  snaps: BhlFieldSnap[];
  onsetPlans: BhlOnsetPlan[];
  liquid: BhlLiquidTrace[];
  feasibility: BhlFeasibilityNote[];
  predicates: BhlPredicateResult[];
  harmony: BhlHarmonyChange[];
  xml: string;
  verification: BhlLockReport;
  outsideIdentical: boolean;
  sourceSha256: string;
  outputPath: string | null;
  outputBytes: number | null;
  world: BhlWorldGuitar | null;
  binder: BhlPhraseBinderReport | null;
}

export function composeBhlGuitar(request: BhlComposeRequest): BhlComposeResult {
  const protectedGuitarBars = [...(request.protectedGuitarBars ?? [])];
  const lock = ingestBhlSource({
    sourcePath: request.sourcePath,
    span: request.span,
    protectedGuitarBars,
  });
  verifyRecordedSourceSha(request.sourcePath, lock.sourceSha256);
  const sourceXml = fs.readFileSync(request.sourcePath, 'utf8');
  const plan =
    request.plan ??
    deriveBhlPhrasePlan(lock.bass, lock.metres, lock.bassPartId, request.span, request.seed);
  const bars = readBassBars(lock.bass, lock.metres, lock.bassPartId);
  const worldGuitar = request.world
    ? generateBhlWorldGuitar(plan, bars, {
        world: request.world,
        seed: request.seed,
        phraseArc: request.phraseArc ?? 'derived',
        rhythm: request.rhythm ?? 'derived',
      })
    : null;
  const generated: BhlGeneratedGuitar = worldGuitar ?? generateBhlGuitar(plan, bars);
  const effectivePlan = worldGuitar?.plan ?? plan;
  const writable: number[] = [];
  for (let bar = request.span.from; bar <= request.span.to; bar++) {
    if (!protectedGuitarBars.includes(bar)) writable.push(bar);
  }
  const quarters = new Map<number, number>();
  for (const metre of lock.metres) {
    if (metre.partId !== lock.guitarPartId) continue;
    quarters.set(metre.bar, (metre.beats * 4) / metre.beatType);
  }
  const events = generated.events.filter((event) => writable.includes(event.bar));
  const onsetPlans = generated.onsetPlans.filter((plan) => writable.includes(plan.bar));
  const snaps = generated.snaps.filter((snap) => writable.includes(snap.bar));
  const feasibility = generated.feasibility.filter((note) => writable.includes(note.bar));
  const written = replaceBhlGuitar(sourceXml, lock.guitarPartId, writable, events, quarters);
  const verification = verifyBhlLocks(sourceXml, written.xml, lockSpecOf(lock));
  verifyRecordedSourceSha(request.sourcePath, lock.sourceSha256);
  if (sha256File(request.sourcePath) !== lock.sourceSha256) throw new Error('source SHA-256 changed during compose');
  const predicates = evaluateBhlPredicates(effectivePlan, events, onsetPlans);
  let outputPath: string | null = null;
  let outputBytes: number | null = null;
  if (request.outputPath) {
    if (!request.permittedOutputDir) throw new Error('permittedOutputDir is required when writing');
    assertBhlExportPath({
      sourcePath: request.sourcePath,
      outputPath: request.outputPath,
      permittedOutputDir: request.permittedOutputDir,
    });
    fs.writeFileSync(request.outputPath, written.xml, { flag: 'wx' });
    outputPath = request.outputPath;
    outputBytes = fs.statSync(request.outputPath).size;
  }
  return {
    plan: effectivePlan,
    events,
    snaps,
    onsetPlans,
    liquid: generated.liquid,
    feasibility,
    predicates,
    harmony: written.harmony,
    xml: written.xml,
    verification,
    outsideIdentical: written.outsideIdentical,
    sourceSha256: lock.sourceSha256,
    outputPath,
    outputBytes,
    world: worldGuitar,
    binder: worldGuitar?.binder ?? null,
  };
}
