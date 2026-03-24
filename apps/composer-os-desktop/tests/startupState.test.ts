/**
 * Startup state helpers
 */
import { isFatalState, canTransitionFromReady } from '../electron/startupState';

describe('startup state helpers', () => {
  it('identifies fatal_error', () => {
    expect(isFatalState('fatal_error')).toBe(true);
    expect(isFatalState('ready')).toBe(false);
  });

  it('allows generation transitions from ready', () => {
    expect(canTransitionFromReady('generate_running')).toBe(true);
    expect(canTransitionFromReady('generate_failed')).toBe(true);
    expect(canTransitionFromReady('generate_succeeded')).toBe(true);
    expect(canTransitionFromReady('booting')).toBe(false);
  });
});
