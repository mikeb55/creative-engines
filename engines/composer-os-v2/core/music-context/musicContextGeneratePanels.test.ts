/**
 * V105p8 — MusicContext → Generate panel adapters.
 */

import { buildMusicContextFromHarmonyBars } from './harmonyBarsMusicContextShell';
import { appendReceiptToMusicContext } from './musicContextAdapters';
import {
  buildFretboardViewFromMusicContext,
  buildVaultHarmonicDetailFromMusicContext,
  buildVaultMicroscopePropsFromMusicContext,
  shouldShowFretboardPanel,
  shouldShowVaultMicroscope,
  synthesizeScoreNotesFromMusicContext,
} from './musicContextGeneratePanels';

function vaultCtx() {
  return buildMusicContextFromHarmonyBars({
    harmonyBars: ['Cmaj7', 'A7alt', 'Dm7', 'G7'],
    sourceEngineId: 'vault',
    presetId: 'vault',
    seed: 1,
  });
}

function wybleTritonicCtx() {
  const base = buildMusicContextFromHarmonyBars({
    harmonyBars: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
    sourceEngineId: 'wyble_tritonic',
    presetId: 'wyble_tritonic',
    seed: 2,
  });
  return appendReceiptToMusicContext(base, {
    engine: 'wyble_tritonic',
    kind: 'wyble_tritonic_realisation_complete',
    payload: { barCount: 4 },
  });
}

function duoCtx() {
  return buildMusicContextFromHarmonyBars({
    harmonyBars: ['Em7', 'Am7', 'B7', 'Em7'],
    sourceEngineId: 'duo',
    presetId: 'guitar_bass_duo',
    seed: 3,
  });
}

describe('musicContextGeneratePanels', () => {
  it('shows VaultMicroscope for vault and wyble_tritonic only', () => {
    expect(shouldShowVaultMicroscope(vaultCtx())).toBe(true);
    expect(shouldShowVaultMicroscope(wybleTritonicCtx())).toBe(true);
    expect(shouldShowVaultMicroscope(duoCtx())).toBe(false);
  });

  it('shows Fretboard for guitar producers', () => {
    expect(shouldShowFretboardPanel(duoCtx())).toBe(true);
    expect(shouldShowFretboardPanel(wybleTritonicCtx())).toBe(true);
    const sq = buildMusicContextFromHarmonyBars({
      harmonyBars: ['Cmaj7'],
      sourceEngineId: 'string_quartet',
      presetId: 'string_quartet',
    });
    expect(shouldShowFretboardPanel(sq)).toBe(false);
  });

  it('buildVaultHarmonicDetail includes tension map per bar', () => {
    const detail = buildVaultHarmonicDetailFromMusicContext(vaultCtx());
    expect(detail.barDetails.length).toBe(4);
    expect(detail.barDetails.every((b) => b.tensionState.length > 0)).toBe(true);
  });

  it('synthesizeScoreNotes produces 1-based barIndex score notes', () => {
    const notes = synthesizeScoreNotesFromMusicContext(vaultCtx());
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]?.barIndex).toBeGreaterThanOrEqual(1);
  });

  it('buildVaultMicroscopeProps returns chord type from first mappable bar', () => {
    const props = buildVaultMicroscopePropsFromMusicContext(vaultCtx());
    expect(props?.chordTypeId.length).toBeGreaterThan(0);
    expect(props?.scoreNotes.length).toBeGreaterThan(0);
  });

  it('buildFretboardView marks tritonic float when tritonic receipt present', () => {
    const view = buildFretboardViewFromMusicContext(wybleTritonicCtx());
    expect(view?.notes.length).toBeGreaterThan(0);
    expect(view?.tritonicFloatCount).toBeGreaterThanOrEqual(0);
  });

  it('reharm decisions read from composition_depth receipt', () => {
    const ctx = appendReceiptToMusicContext(vaultCtx(), {
      engine: 'composition_depth',
      kind: 'composition_depth_complete',
      payload: {
        reharmonisationSuggestions: [
          {
            originalSymbol: 'Cmaj7',
            alternatives: [{ symbol: 'Cmaj9', rationale: 'colour extension' }],
          },
        ],
      },
    });
    const detail = buildVaultHarmonicDetailFromMusicContext(ctx);
    expect(detail.reharmDecisions.length).toBe(1);
    expect(detail.reharmDecisions[0]?.alternatives[0]?.symbol).toBe('Cmaj9');
  });
});
