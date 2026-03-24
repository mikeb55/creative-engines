/**
 * Composer OS V2 — App API: get style modules
 */

import type { AppStyleModule } from './appApiTypes';

const MODULES: AppStyleModule[] = [
  { id: 'barry_harris', name: 'Barry Harris' },
  { id: 'metheny', name: 'Metheny' },
  { id: 'triad_pairs', name: 'Triad Pairs' },
];

export function getStyleModules(): AppStyleModule[] {
  return [...MODULES];
}
