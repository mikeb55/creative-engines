/**
 * Plan ensemble voicing slices from orchestration (spread vs cluster from density).
 */

import type { OrchestrationPlan } from '../orchestration/orchestrationPlanTypes';
import type { DensityBand } from '../orchestration/orchestrationTypes';
import type { EnsembleVoicingFamily, EnsembleVoicingPlan, VoicingSpreadStyle } from './voicingTypes';
import { BIG_BAND_REGISTER_CENTER, QUARTET_REGISTER_CENTER } from './voicingProfiles';

function spreadForDensity(d: DensityBand): VoicingSpreadStyle {
  if (d === 'dense') return 'cluster';
  if (d === 'sparse') return 'open';
  return 'balanced';
}

export function planEnsembleVoicing(
  plan: OrchestrationPlan,
  family: EnsembleVoicingFamily
): EnsembleVoicingPlan {
  const centers = family === 'big_band' ? BIG_BAND_REGISTER_CENTER : QUARTET_REGISTER_CENTER;

  const slices = plan.sectionRoleMatrix.map((block) => {
    const dBand: DensityBand = block.rows[0]?.densityBand ?? 'moderate';
    const spread = spreadForDensity(dBand);

    const rows = block.rows.map((r) => ({
      partId: r.partId,
      spreadStyle: spread,
      registerCenterMidi: centers[r.partId] ?? 60,
    }));

    return {
      sectionIndex: block.section.index,
      startBar: block.section.startBar,
      endBar: block.section.endBar,
      rows,
    };
  });

  return {
    ensembleFamily: family,
    totalBars: plan.totalBars,
    slices,
  };
}
