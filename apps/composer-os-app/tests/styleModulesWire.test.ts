/**
 * Style modules: API client parses /api/style-modules
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/services/api';

describe('style modules API wire', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses modules from JSON', async () => {
    const payload = {
      modules: [
        { id: 'barry_harris', name: 'Barry Harris', enabled: true, type: 'any' },
        { id: 'metheny', name: 'Metheny', enabled: true, type: 'any' },
        { id: 'triad_pairs', name: 'Triad Pairs', enabled: true, type: 'any' },
        { id: 'bacharach', name: 'Bacharach', enabled: true, type: 'any' },
      ],
    };
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(payload)),
      } as Response)
    );
    const r = await api.getStyleModules();
    expect(r.modules.length).toBe(4);
    expect(r.modules.map((m) => m.id).sort().join(',')).toBe('bacharach,barry_harris,metheny,triad_pairs');
  });
});
