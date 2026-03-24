/**
 * Composer OS V2 — Style module types
 * Style modules are modifiers only, no independent generation pipelines.
 */

import type { CompositionContext } from '../compositionContext';

/** Style module identifier. */
export type StyleModuleId = string;

/** Style module contract: modifies context, does not generate independently. */
export interface StyleModule {
  id: StyleModuleId;
  /** Apply style modifications to context. Does NOT run its own pipeline. */
  modify(context: CompositionContext): CompositionContext;
}
