/**
 * Step 4b branch-selection coverage without mounting HomeGenerate (vitest node env
 * cannot collect HomeGenerate: voiceRuleBundles / riffReceiptCompiler circular import).
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { stitchMosaicBlocks } from '@composer-os/core/mosaic-mode/stitchMosaicBlocks';
import { validateMosaicBlocksGenerateInput } from '@composer-os/core/mosaic-mode/validateMosaicBlocksGenerateInput';
import { buildMosaicBlocksGeneratePayload } from '@composer-os/core/mosaic-mode/buildMosaicBlocksGeneratePayload';
import { mapCoreUiToGenerationFields } from '../src/utils/buildGenerateRequestBody';

const blockA =
  'Em(maj7) | Fmaj7#11/E | Am6 | Cmaj7 | G7sus4 | F#m7b5 | B7alt | Em(add9)';
const blockB = 'Dmaj7 | A/C# | Bm7 | Gmaj7 | D/F# | Em7 | A7 | Dmaj9';

function blocksModeActive(
  presetId: string,
  blocksPanelOpen: boolean,
  blockCardsLength: number
): boolean {
  return presetId === 'guitar_bass_duo' && blocksPanelOpen && blockCardsLength >= 2;
}

function extractBlocksBranchSource(src: string): string {
  const gateIdx = src.indexOf('const blocksModeActive =');
  expect(gateIdx).toBeGreaterThan(0);
  const coreIdx = src.indexOf('const coreFields = mapCoreUiToGenerationFields', gateIdx);
  expect(coreIdx).toBeGreaterThan(gateIdx);
  return src.slice(gateIdx, coreIdx);
}

function runBlocksPayloadPipeline(
  blockCards: Array<{ chords: string; composerId: string }>,
  seed = 90106
): Record<string, unknown> {
  const stitched = stitchMosaicBlocks(
    blockCards.map((b) => ({
      chordsText: b.chords,
      songwriterStyleId: b.composerId,
    }))
  );
  if (!stitched.ok) throw new Error(stitched.error);
  const validated = validateMosaicBlocksGenerateInput({
    chordProgressionText: stitched.result.chordProgressionText,
    totalBars: stitched.result.totalBars,
    mosaicSectionPlan: stitched.result.mosaicSectionPlan,
  });
  if (!validated.ok) throw new Error(validated.error);
  const composerSlug = validated.mosaicSectionPlan[0]!.songwriterStyleId;
  const { body } = buildMosaicBlocksGeneratePayload({
    composerSlug,
    seed,
    totalBars: validated.totalBars,
    chordProgressionText: validated.chordProgressionText,
    mosaicSectionPlan: validated.mosaicSectionPlan,
  });
  return body;
}

describe('HomeGenerate blocks branch selection (Step 4b)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/pages/HomeGenerate.tsx'), 'utf-8');
  const blocksBranchSrc = extractBlocksBranchSource(src);

  it('gate predicate matches source: duo + panel open + >=2 cards', () => {
    expect(blocksModeActive('guitar_bass_duo', true, 2)).toBe(true);
    expect(blocksModeActive('guitar_bass_duo', true, 3)).toBe(true);
    expect(blocksModeActive('guitar_bass_duo', false, 2)).toBe(false);
    expect(blocksModeActive('song_mode', true, 2)).toBe(false);
    expect(blocksModeActive('guitar_bass_duo', true, 1)).toBe(false);
    expect(src).toContain(
      "presetId === 'guitar_bass_duo' && blocksPanelOpen && blockCards.length >= 2"
    );
  });

  it('blocks branch in source: stitch, validate, buildMosaicBlocksGeneratePayload, enqueue(body), return', () => {
    expect(blocksBranchSrc).toContain('stitchMosaicBlocks');
    expect(blocksBranchSrc).toContain('validateMosaicBlocksGenerateInput');
    expect(blocksBranchSrc).toContain('buildMosaicBlocksGeneratePayload');
    expect(blocksBranchSrc).toContain('enqueue(body)');
    expect(blocksBranchSrc).toContain('return;');
    expect(blocksBranchSrc).not.toContain('mapCoreUiToGenerationFields');
    expect(blocksBranchSrc).not.toContain('enqueue(payloadToSend)');
  });

  it('classic path in source: mapCoreUiToGenerationFields then enqueue(payloadToSend) below blocks return', () => {
    const classicIdx = src.indexOf('const coreFields = mapCoreUiToGenerationFields');
    const enqueuePayloadIdx = src.indexOf('enqueue(payloadToSend)', classicIdx);
    expect(classicIdx).toBeGreaterThan(0);
    expect(enqueuePayloadIdx).toBeGreaterThan(classicIdx);
    expect(blocksBranchSrc).not.toContain('enqueue(payloadToSend)');
  });

  it('invalid blocks in source: setError on stitch/validate failure without enqueue', () => {
    expect(blocksBranchSrc).toContain('setError(stitched.error)');
    expect(blocksBranchSrc).toContain('setError(validated.error)');
    const stitchFail = blocksBranchSrc.slice(
      blocksBranchSrc.indexOf('if (!stitched.ok)'),
      blocksBranchSrc.indexOf('const validated = validateMosaicBlocksGenerateInput')
    );
    expect(stitchFail).not.toContain('enqueue(');
    const validateFail = blocksBranchSrc.slice(
      blocksBranchSrc.indexOf('if (!validated.ok)'),
      blocksBranchSrc.indexOf('const composerSlug = validated.mosaicSectionPlan')
    );
    expect(validateFail).not.toContain('enqueue(');
  });

  it('blocksModeActive TRUE: mosaic enqueue body shape (buildMosaicBlocksGeneratePayload path)', () => {
    const body = runBlocksPayloadPipeline([
      { chords: blockA, composerId: 'verlaine' },
      { chords: blockB, composerId: 'marr' },
    ]);

    expect(body.presetId).toBe('guitar_bass_duo');
    expect(body.harmonyMode).toBe('custom_locked');
    expect(body.bandModeEnabled).toBe(true);
    expect(body.longFormEnabled).toBe(true);
    expect(body.mosaicSectionPlan).toBeDefined();
    expect(Array.isArray(body.mosaicSectionPlan)).toBe(true);
    expect((body.mosaicSectionPlan as unknown[]).length).toBe(2);
    expect(body.primarySongwriterStyle).toBe('verlaine');
    expect(body.outputLabel).toBe('verlaine');
    expect(body.styleStack).toEqual({
      primary: 'barry_harris',
      styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
    });
    expect(body.variationId).toBeUndefined();
    expect((body.chordProgressionText as string).split(' | ')).toHaveLength(16);
  });

  it('blocksModeActive FALSE: classic duo coreFields has variationId and no mosaicSectionPlan', () => {
    expect(blocksModeActive('guitar_bass_duo', false, 2)).toBe(false);

    const classicBody = mapCoreUiToGenerationFields({
      presetId: 'guitar_bass_duo',
      seed: 90106,
      tonalCenter: '',
      bpm: 120,
      totalBars: 32,
      variationId: 'v-1',
      creativeControlLevel: 'stable',
    });

    expect(classicBody.presetId).toBe('guitar_bass_duo');
    expect(classicBody.variationId).toBe('v-1');
    expect(classicBody.mosaicSectionPlan).toBeUndefined();
  });

  it('blocksModeActive FALSE: wrong preset gate blocks mosaic branch', () => {
    expect(blocksModeActive('song_mode', true, 2)).toBe(false);

    const songBody = mapCoreUiToGenerationFields({
      presetId: 'song_mode',
      seed: 90217,
      tonalCenter: '',
      bpm: 120,
      totalBars: 32,
      variationId: 'v-1',
      creativeControlLevel: 'stable',
      primarySongwriterStyle: 'wayne_shorter',
    });

    expect(songBody.presetId).toBe('song_mode');
    expect(songBody.mosaicSectionPlan).toBeUndefined();
  });

  it('invalid blocks input: stitch rejects missing composer (enqueue would not run)', () => {
    const enqueueMock = vi.fn();
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: '' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(false);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('enqueue mock: blocks pipeline body differs from classic duo coreFields', () => {
    const enqueueMock = vi.fn();
    const mosaicBody = runBlocksPayloadPipeline([
      { chords: blockA, composerId: 'verlaine' },
      { chords: blockB, composerId: 'marr' },
    ]);
    enqueueMock(mosaicBody);

    const classicBody = mapCoreUiToGenerationFields({
      presetId: 'guitar_bass_duo',
      seed: 90106,
      tonalCenter: '',
      bpm: 120,
      totalBars: 32,
      variationId: 'v-1',
      creativeControlLevel: 'stable',
    });
    enqueueMock(classicBody);

    expect(enqueueMock).toHaveBeenCalledTimes(2);
    const mosaicCall = enqueueMock.mock.calls[0]![0] as Record<string, unknown>;
    const classicCall = enqueueMock.mock.calls[1]![0] as Record<string, unknown>;
    expect(mosaicCall.mosaicSectionPlan).toBeDefined();
    expect(classicCall.mosaicSectionPlan).toBeUndefined();
    expect(mosaicCall.variationId).toBeUndefined();
    expect(classicCall.variationId).toBe('v-1');
    expect(mosaicCall.harmonyMode).toBe('custom_locked');
    expect(classicCall.harmonyMode).toBeUndefined();
  });
});
