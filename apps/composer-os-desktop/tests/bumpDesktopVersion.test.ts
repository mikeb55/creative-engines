import { describe, expect, it } from 'vitest';
import { bumpPatchSemver } from '../install/bumpDesktopVersion';

describe('bumpPatchSemver', () => {
  it('increments patch', () => {
    expect(bumpPatchSemver('1.0.1')).toBe('1.0.2');
    expect(bumpPatchSemver('0.0.0')).toBe('0.0.1');
    expect(bumpPatchSemver('2.3.9')).toBe('2.3.10');
  });

  it('rejects non x.y.z', () => {
    expect(() => bumpPatchSemver('1.0')).toThrow();
    expect(() => bumpPatchSemver('v1.0.0')).toThrow();
    expect(() => bumpPatchSemver('1.0.0-beta')).toThrow();
  });
});
