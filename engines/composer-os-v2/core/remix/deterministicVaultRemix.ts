import type { ParsedChart } from '../irealpro/parsedChart';
import {
  generateVaultFromParsedChart,
  regenerateVaultChorusWithTension,
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

/** Single-chorus tension drag — remix path with {@link chorusIndex} + {@link tensionOverride} only. */
export function remixVaultChorusTension(
  chart: ParsedChart,
  priorOutput: IRealVaultOutput,
  prior: { seed: number; options?: VaultGenerationOptions },
  chorusIndex: number,
  tensionOverride: number,
): IRealVaultOutput {
  return regenerateVaultChorusWithTension({
    chart,
    prior: priorOutput,
    options: { ...prior.options, seed: prior.seed },
    chorusIndex,
    tensionOverride,
  });
}
