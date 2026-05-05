import type { ParsedChart } from '../irealpro/parsedChart';
import {
  generateVaultFromParsedChart,
  type IRealVaultOutput,
  type VaultGenerationOptions,
} from '../irealpro/irealVaultPipeline';

/**
 * Deterministic remix: same base {@link VaultGenerationOptions.seed}, merge one or more option overrides.
 * RNG varies because {@link deriveVaultRngRoot} mixes drift / duo intent / mode into the vault root.
 */
export function remixSeed(
  chart: ParsedChart,
  prior: { seed: number; options?: VaultGenerationOptions },
  patch: Partial<VaultGenerationOptions>,
): IRealVaultOutput {
  return generateVaultFromParsedChart(chart, {
    ...prior.options,
    ...patch,
    seed: prior.seed,
  });
}
