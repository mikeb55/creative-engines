/**
 * V105p4 — Dual-guitar Duo MusicContext realisation.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { buildDuoExportTruth } from './duoExportHelper';
import { resolveLowerGuitarRoles } from './duoLowerGuitarRoleResolver';
import { buildMusicContextFromDuo } from './duoProducer';

describe('resolveLowerGuitarRoles', () => {
  it('returns empty plan for guitar_bass topology', () => {
    const bars = resolveLowerGuitarRoles({
      upperBars: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
      bassBars: ['C', 'A', 'D', 'G'],
      topology: 'guitar_bass',
      seed: 42,
    });
    expect(bars).toEqual([]);
  });

  it('assigns roles per bar for dual_guitar_bass', () => {
    const bars = resolveLowerGuitarRoles({
      upperBars: ['Cmaj7', 'A7alt', 'Dm7b5', 'G7'],
      bassBars: ['C', 'A', 'D', 'G'],
      topology: 'dual_guitar_bass',
      intent: 'conversational',
      seed: 9001,
    });
    expect(bars.length).toBe(4);
    expect(bars.every((b) => b.role.length > 0)).toBe(true);
    const restCount = bars.filter((b) => b.role === 'rest').length;
    expect(restCount).toBeGreaterThan(0);
  });

  it('supportive intent favours guide-tone and pedal over conversational', () => {
    const upper = ['Fmaj7', 'Em7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Cmaj7'];
    const bass = ['F', 'E', 'A', 'D', 'G', 'C', 'C', 'C'];
    const base = { upperBars: upper, bassBars: bass, topology: 'dual_guitar_bass' as const, seed: 12345 };
    const conversational = resolveLowerGuitarRoles({ ...base, intent: 'conversational' });
    const supportive = resolveLowerGuitarRoles({ ...base, intent: 'supportive' });
    const convGlue = conversational.filter((b) => b.role === 'guide_tone_lane' || b.role === 'pedal').length;
    const supGlue = supportive.filter((b) => b.role === 'guide_tone_lane' || b.role === 'pedal').length;
    expect(supGlue).toBeGreaterThan(convGlue);
  });
});

describe('buildMusicContextFromDuo dual-guitar topologies', () => {
  it('harmony bars normalised; checksum LOCK from export truth', () => {
    const truth = buildDuoExportTruth(['C^7', 'D-7', 'G7', 'C^7'], ['C', 'D', 'G', 'C']);
    const ctx = buildMusicContextFromDuo(truth, {
      instrumentTopology: 'dual_guitar_bass',
      duoIntent: 'supportive',
      seed: 777,
    });
    expect(ctx.harmony.bars).toEqual(truth.upperBars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(truth.checksum);
  });

  it('receipt duo_realisation_complete carries lower-guitar metrics', () => {
    const truth = buildDuoExportTruth(['Cmaj7', 'Am7', 'Dm7', 'G7'], ['C', 'A', 'D', 'G']);
    const ctx = buildMusicContextFromDuo(truth, {
      instrumentTopology: 'dual_guitar_bass',
      duoIntent: 'conversational',
      seed: 4242,
    });
    const receipt = ctx.receipts.find((r) => r.kind === 'duo_realisation_complete');
    expect(receipt?.engine).toBe('duo');
    expect(receipt?.payload).toMatchObject({
      instrumentTopology: 'dual_guitar_bass',
      duoIntent: 'conversational',
      lowerGuitarEnabled: true,
      lowerGuitarRoleDistribution: expect.objectContaining({
        guide_tone_lane: expect.any(Number),
        counterline: expect.any(Number),
        pedal: expect.any(Number),
        sparse_comp_answer: expect.any(Number),
        rest: expect.any(Number),
      }),
      registralCollisionCount: expect.any(Number),
      parallelMotionCount: expect.any(Number),
    });
  });

  it('dual_guitar topology resolves without bass bars in export truth', () => {
    const truth = buildDuoExportTruth(['Em7', 'Am7', 'B7', 'Em7'], ['Em7', 'Am7', 'B7', 'Em7']);
    const ctx = buildMusicContextFromDuo(truth, {
      instrumentTopology: 'dual_guitar',
      seed: 55,
    });
    const receipt = ctx.receipts.find((r) => r.kind === 'duo_realisation_complete');
    expect(receipt?.payload).toMatchObject({
      instrumentTopology: 'dual_guitar',
      lowerGuitarEnabled: true,
      barCount: 4,
    });
  });
});
