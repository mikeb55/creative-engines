/**
 * Generation receipt shape (unit)
 */
import { isGenerationReceiptShape } from '../src/services/api';

describe('generation receipt shape', () => {
  it('accepts a minimal valid receipt', () => {
    expect(
      isGenerationReceiptShape({
        success: true,
        validation: {
          readiness: { release: 1, mx: 2, shareable: true },
        },
      })
    ).toBe(true);
  });

  it('rejects missing readiness', () => {
    expect(
      isGenerationReceiptShape({
        success: true,
        validation: {},
      })
    ).toBe(false);
  });
});
