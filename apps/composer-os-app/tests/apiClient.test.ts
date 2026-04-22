/**
 * Composer OS App — API client unit test
 */

import { api } from '../src/services/api';

describe('API client', () => {
  it('exposes Composer OS app API methods only', () => {
    expect(typeof api.getPresets).toBe('function');
    expect(typeof api.getStyleModules).toBe('function');
    expect(typeof api.getOutputDirectory).toBe('function');
    expect(typeof api.generate).toBe('function');
    expect(typeof api.getOutputs).toBe('function');
    expect(typeof api.openOutputFolder).toBe('function');
    expect(typeof api.getDiagnostics).toBe('function');
  });

  it('maps HTTP 413 generate errors to LeadSheet size guidance', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 413,
        text: async () => JSON.stringify({ error: 'PayloadTooLargeError: request entity too large' }),
      }) as Response) as typeof fetch;
    try {
      await expect(api.generate({ presetId: 'song_mode' })).rejects.toThrow(
        'LeadSheet MusicXML is too large for the current web request limit.'
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
