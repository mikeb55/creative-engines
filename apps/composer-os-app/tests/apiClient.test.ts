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
});
