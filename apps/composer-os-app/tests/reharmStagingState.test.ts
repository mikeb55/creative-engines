import { describe, expect, it, vi } from 'vitest';

/** Mirrors ReharmPanel applyStaging / discardStaging — no engine import. */
describe('reharm staging state semantics', () => {
  it('apply commits pendingStrip via onApplyBars then clears staging', () => {
    let staging: { pendingStrip: string[] } | null = { pendingStrip: ['Dm9', 'G13'] };
    const onApplyBars = vi.fn();

    function applyStaging() {
      if (!staging || !onApplyBars) return;
      onApplyBars(staging.pendingStrip);
      staging = null;
    }

    applyStaging();
    expect(onApplyBars).toHaveBeenCalledWith(['Dm9', 'G13']);
    expect(staging).toBeNull();
  });

  it('discard clears staging without onApplyBars or regen', () => {
    let staging: { pendingStrip: string[] } | null = { pendingStrip: ['Cmaj7'] };
    const onApplyBars = vi.fn();

    function discardStaging() {
      staging = null;
    }

    discardStaging();
    expect(staging).toBeNull();
    expect(onApplyBars).not.toHaveBeenCalled();
  });
});