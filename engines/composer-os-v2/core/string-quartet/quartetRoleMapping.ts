/**
 * Quartet roles → shared orchestration labels (Prompt 6/7).
 */

import type { OrchestrationRoleLabel } from '../orchestration/orchestrationRoleTypes';
import type { QuartetRoleType } from './quartetRoleTypes';

export function mapQuartetRoleToOrchestrationRoles(q: QuartetRoleType): {
  instrumentRole: OrchestrationRoleLabel;
  textureRole: OrchestrationRoleLabel;
} {
  switch (q) {
    case 'lead':
      return { instrumentRole: 'lead', textureRole: 'lead' };
    case 'counterline':
      return { instrumentRole: 'counterline', textureRole: 'counterline' };
    case 'inner_motion':
      return { instrumentRole: 'inner_motion', textureRole: 'inner_motion' };
    case 'harmonic_support':
      return { instrumentRole: 'support', textureRole: 'support' };
    case 'bass_anchor':
      return { instrumentRole: 'bass_anchor', textureRole: 'support' };
    case 'sustain_pad':
      return { instrumentRole: 'pad', textureRole: 'pad' };
    case 'silence':
      return { instrumentRole: 'silence', textureRole: 'silence' };
  }
}
