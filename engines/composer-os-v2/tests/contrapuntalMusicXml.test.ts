/**
 * Pass 4 — contrapuntalLineSet / bigBandSectionRender → MusicXML merge (chunk 1).
 */

import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { bbSectionRenderToScoreModel } from '../core/counterpoint/sqToBbScoreExport';
import { precomputeContrapuntalLines } from '../core/counterpoint/precomputeContrapuntalLines';
import { wireBigBandSectionRendererOnContext } from '../core/composer/bigBandSectionPlanRenderer';
import {
  applyContrapuntalPass4MusicXmlMerge,
  mergeSqContrapuntalLineSetIntoScore,
} from '../core/counterpoint/contrapuntalPass4MusicXmlMerge';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildStringQuartetScoreFromContext } from '../core/composer/stringEnsemble';
import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import { createNote, createScore } from '../core/score-model/scoreEventBuilder';
import type { PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import { SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC } from '../core/string-quartet/stringQuartetTypes';

function emptySqScore(barCount: number): ScoreModel {
  const measures = Array.from({ length: barCount }, (_, i) => ({ index: i + 1, events: [] }));
  const mk = (id: string, name: string, inst: string): PartModel => ({
    id,
    name,
    instrumentIdentity: inst,
    midiProgram: 40,
    clef: 'treble' as const,
    measures: measures.map((m) => ({ ...m, events: [] })),
  });
  return createScore('Test SQ', [
    mk(SQ_PART_V1, 'Violin I', 'sq_violin_1'),
    mk(SQ_PART_V2, 'Violin II', 'sq_violin_2'),
    mk(SQ_PART_VA, 'Viola', 'sq_viola'),
    { ...mk(SQ_PART_VC, 'Cello', 'sq_cello'), midiProgram: 42, clef: 'bass' },
  ]);
}

function makeDuoCtx(seed: number, vrbId: string, bars: string[]): CompositionContext {
  const bundle = getVoiceRuleBundle(vrbId);
  return {
    seed,
    presetId: 'guitar_bass_duo',
    voiceBundle: bundle,
    form: { totalBars: bars.length, sections: [{ label: 'A', startBar: 1, length: bars.length }] },
    lockedHarmonyBarsRaw: bars,
    generationMetadata: { generatedAt: new Date().toISOString() } as GenerationMetadata,
  } as unknown as CompositionContext;
}

function xmlHasFourSqParts(xml: string): boolean {
  return (
    xml.includes('sq_violin_1') &&
    xml.includes('sq_violin_2') &&
    xml.includes('sq_viola') &&
    xml.includes('sq_cello') &&
    xml.includes('<pitch>')
  );
}

function testSqLineSetMergedIntoExportXml(): boolean {
  const ctx = makeDuoCtx(88001, 'bob_brookmeyer', ['Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7']);
  precomputeContrapuntalLines(ctx, 'bob_brookmeyer');
  if (!ctx.generationMetadata?.contrapuntalLineSet) return false;

  const score = emptySqScore(8);
  const meta = ctx.generationMetadata!;
  const merged = applyContrapuntalPass4MusicXmlMerge(score, ctx);
  const ex = exportScoreModelToMusicXml(merged);
  return (
    ex.success === true &&
    Boolean(ex.xml && xmlHasFourSqParts(ex.xml)) &&
    (meta.contrapuntalLineMusicXmlMergeReceipt?.sqBarsWritten ?? 0) > 0
  );
}

function testSqPolicyDisabledSkipsMerge(): boolean {
  const brookCtx = makeDuoCtx(88002, 'bob_brookmeyer', ['C', 'C', 'C', 'C']);
  const lines = precomputeContrapuntalLines(brookCtx, 'bob_brookmeyer');
  if (!lines) return false;

  const jobimBundle = getVoiceRuleBundle('jobim');
  if (jobimBundle.contrapuntalLinePolicy?.enabled) return false;

  const meta: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    contrapuntalLineSet: lines,
  };
  const score = emptySqScore(4);
  applyContrapuntalPass4MusicXmlMerge(score, {
    ...brookCtx,
    voiceBundle: jobimBundle,
    generationMetadata: meta,
  } as unknown as CompositionContext);
  return (meta.contrapuntalLineMusicXmlMergeReceipt?.sqBarsWritten ?? 0) === 0;
}

function testSqPreservesArrangerBars(): boolean {
  const ctx = makeDuoCtx(88003, 'bob_brookmeyer', ['C', 'C', 'C', 'C']);
  const lines = precomputeContrapuntalLines(ctx, 'bob_brookmeyer');
  if (!lines) return false;

  const score = emptySqScore(4);
  score.parts[0]!.measures[0]!.events.push(createNote(72, 0, 1, 1));

  const receipt = mergeSqContrapuntalLineSetIntoScore(score, lines);
  const stillHasArranger = score.parts[0]!.measures[0]!.events.some((e) => e.kind === 'note' && e.pitch === 72);
  const bar2Filled =
    score.parts[0]!.measures[1]!.events.some((e) => e.kind === 'note') &&
    receipt.sqBarsWritten >= 1 &&
    receipt.barsSkipped >= 1;
  return stillHasArranger && bar2Filled;
}

function emptyBbStubScore(barCount: number): ScoreModel {
  return bbSectionRenderToScoreModel({ phrases: [] }, barCount);
}

function testBbRenderMergedWhenGatesPass(): boolean {
  const ctx = makeDuoCtx(88001, 'bob_brookmeyer', ['Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7']);
  precomputeContrapuntalLines(ctx, 'bob_brookmeyer');
  wireBigBandSectionRendererOnContext(ctx);
  const meta = ctx.generationMetadata as GenerationMetadata;
  if (!meta.bigBandSectionRender || meta.sqBbGceGate1BlockedRenderer) return false;
  const g2 = meta.sqBbGceGate2;
  if (g2?.hardFail || (g2 && g2.outcome !== 'pass' && g2.outcome !== 'review')) return false;

  const score = emptyBbStubScore(8);
  const merged = applyContrapuntalPass4MusicXmlMerge(score, ctx);
  const ex = exportScoreModelToMusicXml(merged);
  const alto = merged.parts.find((p) => p.id === 'bb_alto_sax');
  const hasBbNotes = Boolean(alto?.measures.some((m) => m.events.some((e) => e.kind === 'note')));
  const ctx16 = makeDuoCtx(88001, 'bob_brookmeyer', Array.from({ length: 16 }, () => 'Cmaj7'));
  precomputeContrapuntalLines(ctx16, 'bob_brookmeyer');
  wireBigBandSectionRendererOnContext(ctx16);
  const render16 = (ctx16.generationMetadata as GenerationMetadata).bigBandSectionRender;
  const bb16 = render16?.phrases.length ? bbSectionRenderToScoreModel(render16, 16) : null;
  const directBb = bb16 ? exportScoreModelToMusicXml(bb16, { bpm: 120 }) : { success: false };
  const tbnM10 = Boolean(
    bb16?.parts.find((p) => p.id === 'bb_trombones')?.measures[9]?.events.some((e) => e.kind === 'note'),
  );

  return (
    ex.success === true &&
    hasBbNotes &&
    (meta.contrapuntalLineMusicXmlMergeReceipt?.bbBarsWritten ?? 0) > 0 &&
    directBb.success === true &&
    Boolean(tbnM10)
  );
}

function testBbGate1BlockedSkipsMerge(): boolean {
  const ctx = makeDuoCtx(88005, 'bob_brookmeyer', ['Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7']);
  precomputeContrapuntalLines(ctx, 'bob_brookmeyer');
  wireBigBandSectionRendererOnContext(ctx);
  if (!ctx.generationMetadata?.bigBandSectionRender) return false;
  (ctx.generationMetadata as GenerationMetadata).sqBbGceGate1BlockedRenderer = true;

  const score = emptySqScore(8);
  const gateMeta = ctx.generationMetadata as GenerationMetadata;
  applyContrapuntalPass4MusicXmlMerge(score, ctx);
  return (gateMeta.contrapuntalLineMusicXmlMergeReceipt?.bbBarsWritten ?? 0) === 0;
}

function testMergeReceiptOnMetadataAfterExport(): boolean {
  const r = runGoldenPathOnce(88006, {
    presetId: 'guitar_bass_duo',
    primarySongwriterStyle: 'sq_vrb_bartok',
    totalBars: 8,
    chordProgressionText: 'Dm7 | G7 | Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | Am7',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: ['Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7'],
  });
  const receipt = r.context?.generationMetadata?.contrapuntalLineMusicXmlMergeReceipt;
  return (
    receipt != null &&
    typeof receipt.sqBarsWritten === 'number' &&
    typeof receipt.bbBarsWritten === 'number' &&
    typeof receipt.barsSkipped === 'number'
  );
}

export function runContrapuntalMusicXmlTests(): { name: string; ok: boolean }[] {
  return [
    ['Pass4 SQ — line set → 4-part XML', testSqLineSetMergedIntoExportXml],
    ['Pass4 SQ — policy disabled skips merge', testSqPolicyDisabledSkipsMerge],
    ['Pass4 SQ — arranger bars preserved', testSqPreservesArrangerBars],
    ['Pass4 BB — section render merged when gates pass', testBbRenderMergedWhenGatesPass],
    ['Pass4 BB — gate1 blocked skips BB merge', testBbGate1BlockedSkipsMerge],
    ['Pass4 — mergeReceipt on metadata after export', testMergeReceiptOnMetadataAfterExport],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runContrapuntalMusicXmlTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
