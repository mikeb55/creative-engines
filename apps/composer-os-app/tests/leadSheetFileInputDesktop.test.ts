import {
  deriveLeadSheetHarmonyAdvisory,
  mapLeadSheetFileInputResponseToPanelState,
  type LeadSheetFileInputResponse,
} from '../src/services/leadSheetFileInputDesktop';

describe('leadSheetFileInputDesktop panel mapping', () => {
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
});