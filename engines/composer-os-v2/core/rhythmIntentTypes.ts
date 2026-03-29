/**
 * D1 — Engine-side intent control (V8.0). Types only — no runtime imports from compositionContext.
 */

export interface RhythmIntentControl {
  groove: number;
  pattern: number;
  expression: number;
  space: number;
  surprise: number;
}

export type RhythmIntentPrimaryFamily =
  | 'groove_weighted'
  | 'pattern_weighted'
  | 'expression_weighted'
  | 'space_weighted'
  | 'balanced';

export interface RhythmIntentResolvedPhrase {
  phraseIndex: number;
  primary_family: RhythmIntentPrimaryFamily;
  secondary_family: RhythmIntentPrimaryFamily | null;
  influence_budget: number;
  layer_weights: {
    groove: number;
    pattern: number;
    expression: number;
    space: number;
  };
  surprise_scale: number;
  yield_flags: string[];
}
