/**
 * Path-cost hypotheses for Dev 2.
 * Starting numbers, not musical laws. Do not retune them to force a fixture.
 */

export const PENTATONIC_PATH_ENGINE_VERSION = 'pentatonic-path-1.0';
export const PENTATONIC_PATH_CONFIG_VERSION = 'pentatonic-path-config-1.0';

export const PENTATONIC_PATH_NONE = 'NONE';

export interface PentatonicPathConfig {
  /** Cost of leaving one state for a different state. Same state continued is 0. */
  changeCost: number;
  /**
   * Upper bound on the shared-tone discount.
   * Continuity = shared pitch classes / max(previous size, next size).
   * Discount = min(maxCommonToneDiscount, continuity * maxCommonToneDiscount).
   * The denominator is the larger collection. It is not fixed at 5.
   */
  maxCommonToneDiscount: number;
  /**
   * Upper bound on the liquid-harmony displacement discount.
   * Economy = 1 − (mean nearest pitch-class distance / 6), clamped at 0.
   * Discount applies only when the collection changes.
   * This is pitch-class distance, not voice-leading.
   */
  maxDisplacementDiscount: number;
  /** Subtracted from change cost when the previous event set phraseBoundaryAfter. */
  phraseBoundaryChangeDiscount: number;
  /** Added for each distinct pentatonic resource after the first. NONE is not a resource. */
  distinctResourcePenalty: number;
  /** Local cost of choosing NONE. Not a penalty stacked on top of a suitability score. */
  noneBaselineCost: number;
  /** Alternative paths must sit inside bestCost + this window and differ in segmentation. */
  alternativePathWindow: number;
  /** Added when a state is left after exactly one event. */
  shortSegmentPenalty: number;
  /**
   * Subtracted on the final event when the chosen HOME relationship is HOME
   * and purpose or colour explicitly asks for a home-leaning close.
   */
  finalHomeBonus: number;
}

export const DEFAULT_PENTATONIC_PATH_CONFIG: PentatonicPathConfig = {
  changeCost: 0.35,
  maxCommonToneDiscount: 0.15,
  maxDisplacementDiscount: 0.08,
  phraseBoundaryChangeDiscount: 0.15,
  distinctResourcePenalty: 0.1,
  noneBaselineCost: 0.4,
  alternativePathWindow: 0.15,
  shortSegmentPenalty: 0.12,
  finalHomeBonus: 0.05,
};

export function liquidChangeParts(args: {
  changed: boolean;
  previous: readonly number[] | null;
  next: readonly number[] | null;
  phraseBoundary: boolean;
  config: PentatonicPathConfig;
}): {
  gross: number;
  commonToneDiscount: number;
  displacementDiscount: number;
  phraseBoundaryDiscount: number;
  net: number;
  continuity: number;
} {
  const continuity = sharedToneContinuity(args.previous, args.next);
  if (!args.changed) {
    return {
      gross: 0,
      commonToneDiscount: 0,
      displacementDiscount: 0,
      phraseBoundaryDiscount: 0,
      net: 0,
      continuity,
    };
  }
  const commonToneDiscount = Math.min(args.config.maxCommonToneDiscount, continuity * args.config.maxCommonToneDiscount);
  const displacementDiscount = Math.min(
    args.config.maxDisplacementDiscount,
    displacementEconomy(args.previous, args.next) * args.config.maxDisplacementDiscount
  );
  const phraseBoundaryDiscount = args.phraseBoundary ? args.config.phraseBoundaryChangeDiscount : 0;
  return {
    gross: args.config.changeCost,
    commonToneDiscount,
    displacementDiscount,
    phraseBoundaryDiscount,
    net: Math.max(0, args.config.changeCost - commonToneDiscount - displacementDiscount - phraseBoundaryDiscount),
    continuity,
  };
}

export function resolvePathConfig(partial?: Partial<PentatonicPathConfig> | null): PentatonicPathConfig {
  return { ...DEFAULT_PENTATONIC_PATH_CONFIG, ...partial };
}

export function pathConfigIsDefault(config: PentatonicPathConfig): boolean {
  return JSON.stringify(config) === JSON.stringify(DEFAULT_PENTATONIC_PATH_CONFIG);
}

export function pathConfigurationId(config: PentatonicPathConfig): string {
  if (pathConfigIsDefault(config)) return PENTATONIC_PATH_CONFIG_VERSION;
  return `${PENTATONIC_PATH_CONFIG_VERSION}:custom:${JSON.stringify(config)}`;
}

/**
 * Shared pitch classes / max(previous size, next size).
 * Works for any collection size. Two pentatonics use a denominator of 5.
 * Pitch-class continuity only. Not voice-leading. Not note migration.
 */
export function sharedToneContinuity(previous: readonly number[] | null, next: readonly number[] | null): number {
  if (!previous || !next || previous.length === 0 || next.length === 0) return 0;
  const right = new Set(next);
  const shared = previous.filter((pc) => right.has(pc)).length;
  return shared / Math.max(previous.length, next.length);
}

/**
 * 1 when every removed pitch class has a nearby introduced pitch class.
 * 0 when the mean nearest distance is a tritone.
 * Not voice-leading. Not migrating notes.
 */
export function displacementEconomy(previous: readonly number[] | null, next: readonly number[] | null): number {
  if (!previous || !next) return 0;
  const prev = new Set(previous);
  const nextSet = new Set(next);
  const removed = [...prev].filter((pc) => !nextSet.has(pc));
  const introduced = [...nextSet].filter((pc) => !prev.has(pc));
  if (removed.length === 0 && introduced.length === 0) return 1;
  if (removed.length === 0 || introduced.length === 0) return 0;
  let sum = 0;
  for (const from of removed) {
    let best = 6;
    for (const to of introduced) {
      const raw = Math.abs(from - to) % 12;
      best = Math.min(best, Math.min(raw, 12 - raw));
    }
    sum += best;
  }
  return Math.max(0, 1 - sum / removed.length / 6);
}
