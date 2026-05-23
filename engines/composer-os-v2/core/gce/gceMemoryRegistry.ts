/**
 * GCE structural memory — registry of canonical fingerprints + per-format gate overrides.
 */

/** Overall GCE floor hints when comparing ensemble formats (not the primary GCEEvaluator threshold). */
export const formatGateOverrides = {
  /** Empirical floor after BB GCE scorer fix + Steely V2.1 baseline (was 7.5 vs broken duo-only pillars). */
  big_band: 7.3,
  string_quartet: 8.0,
  duo: 8.8,
  ecm: 8.8,
} as const;

export type FormatGateKey = keyof typeof formatGateOverrides;

/** `format:songwriterId` → fingerprint id (best-known structural reference). */
export const bestFingerprintIdByFormatSongwriter: Record<string, string> = {
  'big_band:bill_evans': 'orbit_v6_64',
  'big_band:donald_fagen': 'steely_orbit_v1_7',
  /** Declarative GCE structural profile — {@link ./frankZappaStructuralFingerprint}. */
  'duo:frank_zappa': 'frank_zappa_duo_structural_v1',
};

export function fingerprintRegistryKey(format: string, songwriterId: string): string {
  return `${format}:${songwriterId.trim().toLowerCase()}`;
}

export function getBestFingerprintId(format: string, songwriterId: string): string | null {
  return bestFingerprintIdByFormatSongwriter[fingerprintRegistryKey(format, songwriterId)] ?? null;
}
