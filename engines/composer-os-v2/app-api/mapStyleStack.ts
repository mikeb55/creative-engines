/**
 * Map App API style stack to engine StyleStack (validated against registry).
 */

import type { AppStyleStack } from './appApiTypes';
import type { StyleStack } from '../core/style-modules/styleModuleTypes';
import { getStyleModule } from '../core/style-modules/styleModuleRegistry';

function normalizeOptionalId(s: string | undefined): string | undefined {
  if (s === undefined || s === null) return undefined;
  const t = String(s).trim();
  return t === '' ? undefined : t;
}

export function mapAppStyleStackToEngine(stack: AppStyleStack): StyleStack {
  const primary = stack.primary;
  if (!getStyleModule(primary)) {
    throw new Error(`Unknown style module: ${primary}`);
  }
  const secondary = normalizeOptionalId(stack.secondary);
  const colour = normalizeOptionalId(stack.colour);
  if (secondary !== undefined && !getStyleModule(secondary)) {
    throw new Error(`Unknown style module: ${secondary}`);
  }
  if (colour !== undefined && !getStyleModule(colour)) {
    throw new Error(`Unknown style module: ${colour}`);
  }

  const w = stack.weights;
  const p = typeof w.primary === 'number' ? w.primary : 1;
  const sec = typeof w.secondary === 'number' ? w.secondary : 0;
  const col = typeof w.colour === 'number' ? w.colour : 0;
  const total = p + sec + col || 1;

  return {
    primary,
    secondary,
    colour,
    weights: {
      primary: p / total,
      secondary: sec / total,
      colour: col / total,
    },
  };
}
