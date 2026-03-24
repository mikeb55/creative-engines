/**
 * Composer OS App — API client unit test
 */

import { api } from '../src/services/api';

describe('API client', () => {
  it('exposes getPresets, getStyleModules, generate, getOutputs, openOutputFolder', () => {
    expect(typeof api.getPresets).toBe('function');
    expect(typeof api.getStyleModules).toBe('function');
    expect(typeof api.generate).toBe('function');
    expect(typeof api.getOutputs).toBe('function');
    expect(typeof api.openOutputFolder).toBe('function');
  });
});
