import { describe, expect, it } from 'vitest';
import {
  ART_ROCK_LEADSHEET_HELPER_TEXT,
  buildLeadSheetHarmonyOverridePayload,
  deriveLeadSheetHarmonyAdvisory,
  getLeadSheetComposerDescription,
  LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS,
  mapLeadSheetFileInputResponseToPanelState,
  previewLeadSheetOutputFilename,
  sanitizeLeadSheetOutputLabel,
  type LeadSheetFileInputResponse,
} from '../src/services/leadSheetFileInputDesktop';

describe('leadSheetFileInputDesktop panel mapping', () => {
  it('includes art_rock in desktop leadsheet composer options', () => {
    expect(LEADSHEET_FILE_INPUT_COMPOSER_OPTIONS.some((opt) => opt.id === 'art_rock')).toBe(true);
  });

  it('exposes Art Rock helper text for the guided panel', () => {
    expect(getLeadSheetComposerDescription('art_rock')).toBe(ART_ROCK_LEADSHEET_HELPER_TEXT);
    expect(ART_ROCK_LEADSHEET_HELPER_TEXT).toBe(
      'Sparse intro, dense peak, open ending — modal power-chord color with a rock backbeat, for indie, post-rock, or cinematic charts.'
    );
  });

  it('builds output filename preview from label or source file', () => {
    expect(sanitizeLeadSheetOutputLabel('  my-bridge take  ')).toBe('my-bridge_take');
    expect(previewLeadSheetOutputFilename('my-bridge', 'art_rock')).toBe(
      'my-bridge_art_rock_v<timestamp>_quintet.musicxml'
    );
    expect(previewLeadSheetOutputFilename('', 'debussy', 'Chart One.musicxml')).toBe(
      'Chart_One_debussy_v<timestamp>_quintet.musicxml'
    );
  });

  it('maps inferred-advisory MIDI response to panel advisory', () => {
    const response: LeadSheetFileInputResponse = {
      ok: true,
      sourceFormat: 'midi',
      harmonyProvenance: 'inferred-advisory',
      midiQuantizeNote:
        'MIDI input v1: single-track melody only. Harmony is inferred and advisory.',
      harmonyConfidenceByBar: [0.72, 0.68],
    };

    expect(deriveLeadSheetHarmonyAdvisory(response)).toBe(response.midiQuantizeNote);

    const state = mapLeadSheetFileInputResponseToPanelState(response);
    expect(state.advisory).toBe(response.midiQuantizeNote);
    expect(state.harmonyConfidenceByBar).toEqual([0.72, 0.68]);
    expect(state.sourceFormat).toBe('midi');
  });

  it('leaves advisory absent for explicit MusicXML harmony', () => {
    const response: LeadSheetFileInputResponse = {
      ok: true,
      sourceFormat: 'musicxml',
      harmonyProvenance: 'explicit',
      harmonyConfidenceByBar: [1, 1],
    };

    expect(deriveLeadSheetHarmonyAdvisory(response)).toBeUndefined();

    const state = mapLeadSheetFileInputResponseToPanelState(response);
    expect(state.advisory).toBeUndefined();
    expect(state.sourceFormat).toBe('musicxml');
  });

  it('maps harmonyProvenanceByBar and builds override payload', () => {
    const response: LeadSheetFileInputResponse = {
      ok: true,
      sourceFormat: 'midi',
      harmonyProvenance: 'inferred-advisory',
      harmonyConfidenceByBar: [0.6, 0.95, 0.55],
      harmonyProvenanceByBar: ['inferred-advisory', 'user-override', 'inferred-advisory'],
    };

    const state = mapLeadSheetFileInputResponseToPanelState(response);
    expect(state.harmonyProvenanceByBar?.[1]).toBe('user-override');

    const payload = buildLeadSheetHarmonyOverridePayload({ 3: 'Dm7', 99: 'G7', 2: '  ' });
    expect(payload).toEqual({ 3: 'Dm7', 99: 'G7' });
  });
});
