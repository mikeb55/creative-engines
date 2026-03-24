/**
 * Empty style module list surfaces a clear message (matches hook behaviour)
 */
import { describe, expect, it } from 'vitest';
import { styleModulesListError, STYLE_MODULES_UNAVAILABLE_MSG } from '../src/hooks/useStyleModules';

describe('styleModulesListError', () => {
  it('returns user message when list is empty', () => {
    expect(styleModulesListError([])).toBe(STYLE_MODULES_UNAVAILABLE_MSG);
    expect(styleModulesListError(undefined)).toBe(STYLE_MODULES_UNAVAILABLE_MSG);
  });

  it('returns null when modules exist', () => {
    expect(styleModulesListError([{ id: 'barry_harris', name: 'Barry Harris' }])).toBe(null);
  });
});
