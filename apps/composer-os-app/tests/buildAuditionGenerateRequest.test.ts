import { describe, expect, it } from 'vitest';
import {
  SONG_MODE_DUO_ARRANGEMENT_COMPOSERS,
  buildAuditionGenerateRequest,
  resolveAuditionPresetForComposer,
} from '../src/utils/buildAuditionGenerateRequest';

describe('buildAuditionGenerateRequest', () => {
  it('routes bill_evans through song_mode', () => {
    const req = buildAuditionGenerateRequest('bill_evans', 12345);
    expect(req.presetId).toBe('song_mode');
    expect(req.primarySongwriterStyle).toBe('bill_evans');
    expect(req.seed).toBe(12345);
  });

  it('keeps debussy on song_mode duo path (not string_quartet)', () => {
    const req = buildAuditionGenerateRequest('debussy', 777);
    expect(req.presetId).toBe('song_mode');
    expect(req.primarySongwriterStyle).toBe('debussy');
    expect(SONG_MODE_DUO_ARRANGEMENT_COMPOSERS.has('debussy')).toBe(true);
    expect(resolveAuditionPresetForComposer('debussy')).toBe('song_mode');
  });

  it('keeps messiaen and steve_reich on song_mode duo path', () => {
    for (const id of ['messiaen', 'steve_reich'] as const) {
      const req = buildAuditionGenerateRequest(id, 1);
      expect(req.presetId).toBe('song_mode');
      expect(req.primarySongwriterStyle).toBe(id);
    }
  });
});