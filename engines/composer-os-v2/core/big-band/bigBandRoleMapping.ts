/**
 * Big Band roles → shared orchestration labels (Prompt 5/7).
 */

import type { OrchestrationRoleLabel } from '../orchestration/orchestrationRoleTypes';
import type { BigBandRoleType } from './bigBandTypes';

export function mapBigBandRoleToOrchestrationRoles(bb: BigBandRoleType): {
  instrumentRole: OrchestrationRoleLabel;
  textureRole: OrchestrationRoleLabel;
} {
  switch (bb) {
    case 'lead_melody':
      return { instrumentRole: 'lead', textureRole: 'lead' };
    case 'pads':
      return { instrumentRole: 'pad', textureRole: 'pad' };
    case 'backgrounds':
      return { instrumentRole: 'support', textureRole: 'support' };
    case 'riffs':
      return { instrumentRole: 'inner_motion', textureRole: 'inner_motion' };
    case 'punches':
      return { instrumentRole: 'lead', textureRole: 'lead' };
    case 'shout':
      return { instrumentRole: 'lead', textureRole: 'lead' };
    case 'counterline':
      return { instrumentRole: 'counterline', textureRole: 'counterline' };
    case 'rhythm_anchor':
      return { instrumentRole: 'support', textureRole: 'support' };
    case 'bass_anchor':
      return { instrumentRole: 'bass_anchor', textureRole: 'support' };
    case 'silence':
      return { instrumentRole: 'silence', textureRole: 'silence' };
  }
}
