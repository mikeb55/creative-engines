/**
 * Big Band research → structured rules (Prompt 5.6/7).
 * Prose lives in data/BigBandResearch.md; code stores rule shapes only.
 */

export type BigBandComposerId = 'ellington' | 'basie' | 'thad' | 'schneider';

export type BigBandEraId = 'swing' | 'bebop' | 'post_bop' | 'contemporary';

export type RuleEffectType = 'density' | 'rhythm' | 'harmony' | 'orchestration' | 'form';

export type RuleCategory =
  | 'composer'
  | 'era'
  | 'foundational'
  | 'functional'
  | 'shout'
  | 'riff'
  | 'soli';

/** Single engine-facing rule (registry + parser extract). */
export interface BigBandRule {
  id: string;
  description: string;
  category: RuleCategory;
  effectType: RuleEffectType;
  /** 1–100 — planning tie-breaker when merging rule sets. */
  priority: number;
}

/** Raw bullets grouped by research section (from parser). */
export interface ComposerResearchBlock {
  composerId: BigBandComposerId;
  displayName: string;
  engineRuleLines: string[];
}

export interface EraResearchBlock {
  eraId: BigBandEraId;
  displayName: string;
  engineRuleLines: string[];
}

export interface ParsedBigBandResearch {
  ok: boolean;
  errors: string[];
  /** Composer blocks keyed by id */
  composers: Partial<Record<BigBandComposerId, ComposerResearchBlock>>;
  eras: Partial<Record<BigBandEraId, EraResearchBlock>>;
  foundations: string[];
  functional: {
    shout: string[];
    riff: string[];
    soli: string[];
  };
  /** Counts of extracted ENGINE RULE bullets (sanity / tests). */
  stats: {
    composerRuleLines: number;
    eraRuleLines: number;
    foundationLines: number;
    shoutLines: number;
    riffLines: number;
    soliLines: number;
  };
}

export interface BigBandRuleRegistryShape {
  composerRules: Record<BigBandComposerId, BigBandRule[]>;
  eraRules: Record<BigBandEraId, BigBandRule[]>;
  foundationalRules: BigBandRule[];
  functionalRules: {
    shout: BigBandRule[];
    riff: BigBandRule[];
    soli: BigBandRule[];
  };
}

/** Tuning derived from era + optional composer (planning hints only). */
export interface BigBandRuleTuning {
  riffVsLine: 'riff_primary' | 'line_primary' | 'balanced';
  spaceEmphasis: number;
  densityArc: boolean;
  smoothTransitions: boolean;
  shoutMotivicClimax: boolean;
}

export interface ResolvedBigBandRuleSet {
  era: BigBandEraId;
  composerStyle: BigBandComposerId | null;
  ruleIds: string[];
  tuning: BigBandRuleTuning;
  /** True when bundled research file parsed without structural errors. */
  researchLoaded: boolean;
  researchErrors: string[];
}
