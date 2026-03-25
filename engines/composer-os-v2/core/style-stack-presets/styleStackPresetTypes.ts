/**
 * Reusable style stack combinations (separate from named mode presets).
 */

import type { AppStyleStack } from '../../app-api/appApiTypes';

export type StyleStackPresetId =
  | 'bacharach_pattison_ecm'
  | 'thad_bebop_swing'
  | 'songwriter_classic_hook'
  | 'quartet_lyrical_counterpoint';

export interface StyleStackPresetDefinition {
  id: StyleStackPresetId;
  displayName: string;
  description: string;
  stack: AppStyleStack;
}
