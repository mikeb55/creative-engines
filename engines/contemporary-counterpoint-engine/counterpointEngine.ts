/**
 * Contemporary Counterpoint Engine — Main entry
 * Exposes generateContemporaryCounterpoint(parameters)
 */

import type { CounterpointInput, CounterpointOutput, CounterpointParameters } from './counterpointTypes';
import { DEFAULT_PARAMS } from './counterpointTypes';
import { generateContemporaryCounterpoint } from './counterpointGenerator';

export * from './counterpointTypes';
export { generateContemporaryCounterpoint } from './counterpointGenerator';

export function runContemporaryCounterpointEngine(input: CounterpointInput): CounterpointOutput {
  const params = { ...DEFAULT_PARAMS, ...input.parameters };
  const segments = Array.isArray(input.harmonicContext)
    ? input.harmonicContext
    : input.harmonicContext.segments;
  const totalBars = Array.isArray(input.harmonicContext)
    ? segments.reduce((a, s) => a + s.bars, 0)
    : input.harmonicContext.totalBars;

  return generateContemporaryCounterpoint({
    ...params,
    harmonicContext: segments,
    seed: input.seed ?? Date.now(),
  });
}
