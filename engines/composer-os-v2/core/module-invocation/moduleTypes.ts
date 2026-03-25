/**
 * Composer OS V2 — minimal module invocation types (Phase 1A).
 * Static registry only; no dynamic loading or pipeline integration.
 */

export type ModuleCategory =
  | 'melody'
  | 'harmony'
  | 'rhythm'
  | 'counterpoint'
  | 'orchestration'
  | 'songwriting'
  | 'bridge/export';

/**
 * Registered module: id, category, input/output contract placeholders, and runner.
 * `input` / `output` are structural placeholders for documentation and typing.
 */
export interface ModuleDefinition<I, O> {
  id: string;
  category: ModuleCategory;
  input: I;
  output: O;
  run: (input: I) => O;
}
