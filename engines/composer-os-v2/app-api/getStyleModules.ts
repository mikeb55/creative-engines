/**
 * Composer OS V2 — App API: get style modules (from engine registry)
 */

import type { AppStyleModule } from './appApiTypes';
import { listRegisteredStyleModuleInfos } from '../core/style-modules/styleModuleRegistry';

export function getStyleModules(): AppStyleModule[] {
  return listRegisteredStyleModuleInfos().map((m) => ({
    id: m.id,
    name: m.displayName,
    enabled: true,
    type: 'any',
  }));
}
