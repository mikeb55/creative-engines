/**
 * Bartok CLE pitch-scoring golden master (seed 61234, 8-bar Gate B4 locked harmony).
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { CompositionContext } from '../core/compositionContext';
import type { AbstractLineSet } from '../core/counterpoint/abstractLineSet';
import type { BartokPitchScoringTrace } from '../core/counterpoint/bartokPitchScoringTypes';
import { buildBartokScoredLineSet } from '../core/counterpoint/bartokPitchScorer';
import { normalizeGoldenFixtureText } from './goldenFixtureCompare';

export const BARTOK_CLE_GOLDEN_SEED = 61234;
export const BARTOK_CLE_GOLDEN_LENGTH_BARS = 8;
export const BARTOK_CLE_LOCKED_HARMONY = [
  'F#m7b5',
  'B7alt',
  'Emaj7',
  'Gm7',
  'F#m7b5',
  'B7alt',
  'Emaj7',
  'Gm7',
] as const;

const GOLDEN_DIR = path.join(__dirname, 'golden');
const LINE_FIXTURE = path.join(GOLDEN_DIR, 'bartok-cle-seed61234.lineSet.golden.json');
const TRACE_FIXTURE = path.join(GOLDEN_DIR, 'bartok-cle-seed61234.trace.golden.json');

function beat4dp(value: number): string {
  return value.toFixed(4);
}

function score6dp(value: number): string {
  return value.toFixed(6);
}

export function buildBartokCleTestContext(seed: number, lengthBars: number): CompositionContext {
  return {
    seed,
    lockedHarmonyBarsRaw: [...BARTOK_CLE_LOCKED_HARMONY],
    form: { totalBars: lengthBars },
    generationMetadata: {
      songwriterStyleId: 'bartok',
      harmonyModeRequested: 'custom_locked',
    },
  } as unknown as CompositionContext;
}

function serializeLineSet(ls: AbstractLineSet) {
  return {
    styleSourceVrbId: ls.styleSourceVrbId,
    lengthBars: ls.lengthBars,
    sourceMode: ls.sourceMode,
    voices: ls.voices.map((v) => ({
      role: v.role,
      tags: [...v.tags].sort(),
      notes: v.notes
        .map((n) => ({
          pitchMidi: Math.round(n.pitchMidi),
          durationBars: beat4dp(n.durationBars),
          offsetBars: beat4dp(n.offsetBars),
          ...(n.articulationTag ? { articulationTag: n.articulationTag } : {}),
        }))
        .sort(
          (a, b) => a.offsetBars.localeCompare(b.offsetBars) || a.pitchMidi - b.pitchMidi,
        ),
    })),
    cadenceTags: ls.cadenceTags,
    densityEnvelope: ls.densityEnvelope,
    imitationMap: ls.imitationMap,
    dissonanceProfile: ls.dissonanceProfile,
  };
}

function serializeTrace(trace: BartokPitchScoringTrace) {
  return {
    seed: trace.seed,
    lengthBars: trace.lengthBars,
    styleSourceVrbId: trace.styleSourceVrbId,
    imitationMode: trace.imitationMode,
    phraseImitationModes: [...trace.phraseImitationModes],
    phraseAxisStreak: trace.phraseAxisStreak,
    slots: trace.slots.map((s) => ({
      slot: s.slot,
      tupleCount: s.tupleCount,
      beamWidth: s.beamWidth,
      finalScore: score6dp(s.finalScore),
      ensembleFactors: Object.fromEntries(
        Object.entries(s.ensembleFactors).sort(([a], [b]) => a.localeCompare(b)),
      ),
      chosenMidiByRole: s.chosenMidiByRole,
      activeFunction: s.activeFunction,
      collectionId: s.collectionId,
      cellId: s.cellId,
      phraseImitationMode: s.phraseImitationMode,
      sourceMotifInterval: s.sourceMotifInterval,
      transformationByRole: s.transformationByRole,
      candidates: s.candidates.map((c) => ({
        role: c.role,
        candidateMidi: c.candidateMidi,
        shortlistRank: c.shortlistRank,
        voiceScore: score6dp(c.voiceScore),
        tieBreakKey: c.tieBreakKey,
        dimensions: Object.fromEntries(
          Object.entries(c.dimensions)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, score6dp(v)]),
        ),
      })),
    })),
  };
}

export function buildBartokCleGoldenSnapshot(): { lineSetText: string; traceText: string } {
  const ctx = buildBartokCleTestContext(BARTOK_CLE_GOLDEN_SEED, BARTOK_CLE_GOLDEN_LENGTH_BARS);
  const { lineSet, trace } = buildBartokScoredLineSet(
    ctx,
    BARTOK_CLE_GOLDEN_LENGTH_BARS,
    BARTOK_CLE_GOLDEN_SEED,
  );
  const lineSetText =
    JSON.stringify(
      {
        seed: BARTOK_CLE_GOLDEN_SEED,
        lockedHarmony: BARTOK_CLE_LOCKED_HARMONY,
        lineSet: serializeLineSet(lineSet),
      },
      null,
      2,
    ) + '\n';
  const traceText =
    JSON.stringify(
      {
        seed: BARTOK_CLE_GOLDEN_SEED,
        trace: serializeTrace(trace),
      },
      null,
      2,
    ) + '\n';
  return { lineSetText, traceText };
}

export function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function writeBartokCleGoldenFixtures(): void {
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  const { lineSetText, traceText } = buildBartokCleGoldenSnapshot();
  fs.writeFileSync(LINE_FIXTURE, lineSetText, 'utf8');
  fs.writeFileSync(TRACE_FIXTURE, traceText, 'utf8');
  console.log(`Wrote ${LINE_FIXTURE}`);
  console.log(`Wrote ${TRACE_FIXTURE}`);
  console.log(`lineSet sha256: ${sha256Hex(lineSetText)}`);
  console.log(`trace sha256: ${sha256Hex(traceText)}`);
}

export function runBartokClePitchScoringGoldenMasterTests(): { name: string; ok: boolean; detail?: string }[] {
  const results: { name: string; ok: boolean; detail?: string }[] = [];

  if (!fs.existsSync(LINE_FIXTURE) || !fs.existsSync(TRACE_FIXTURE)) {
    return [
      {
        name: 'bartokCleGoldenMaster - fixtures present',
        ok: false,
        detail: 'missing golden JSON fixtures (run write-fixtures or BARTOK_CLE_UPDATE_GOLDEN=1)',
      },
    ];
  }

  let snapshot: { lineSetText: string; traceText: string };
  try {
    snapshot = buildBartokCleGoldenSnapshot();
  } catch (e) {
    return [
      {
        name: 'bartokCleGoldenMaster - build snapshot',
        ok: false,
        detail: String(e),
      },
    ];
  }

  const expectedLine = normalizeGoldenFixtureText(fs.readFileSync(LINE_FIXTURE, 'utf8'));
  const expectedTrace = normalizeGoldenFixtureText(fs.readFileSync(TRACE_FIXTURE, 'utf8'));
  const actualLine = normalizeGoldenFixtureText(snapshot.lineSetText);
  const actualTrace = normalizeGoldenFixtureText(snapshot.traceText);

  if (process.env.BARTOK_CLE_UPDATE_GOLDEN === '1') {
    writeBartokCleGoldenFixtures();
  }

  const lineHash = sha256Hex(actualLine);
  const expLineHash = sha256Hex(expectedLine);
  results.push({
    name: `bartokCleGoldenMaster - lineSet JSON byte-exact seed ${BARTOK_CLE_GOLDEN_SEED}`,
    ok: actualLine === expectedLine,
    detail:
      actualLine !== expectedLine
        ? `sha256 expected ${expLineHash.slice(0, 12)} got ${lineHash.slice(0, 12)}`
        : undefined,
  });

  const traceHash = sha256Hex(actualTrace);
  const expTraceHash = sha256Hex(expectedTrace);
  results.push({
    name: `bartokCleGoldenMaster - trace JSON byte-exact seed ${BARTOK_CLE_GOLDEN_SEED}`,
    ok: actualTrace === expectedTrace,
    detail:
      actualTrace !== expectedTrace
        ? `sha256 expected ${expTraceHash.slice(0, 12)} got ${traceHash.slice(0, 12)}`
        : undefined,
  });

  return results;
}

const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  process.argv[1].includes('bartokClePitchScoringGoldenMaster.test');

if (isMain) {
  const cmd = process.argv[2];
  if (cmd === 'write-fixtures') {
    writeBartokCleGoldenFixtures();
    process.exit(0);
  }
  if (cmd === 'run') {
    const rows = runBartokClePitchScoringGoldenMasterTests();
    const failed = rows.filter((r) => !r.ok);
    for (const r of rows) {
      console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.detail ?? '');
    }
    process.exit(failed.length ? 1 : 0);
  }
  console.error('Usage: npx tsx bartokClePitchScoringGoldenMaster.test.ts write-fixtures | run');
  process.exit(2);
}