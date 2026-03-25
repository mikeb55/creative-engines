/**
 * Ensemble family profiles (Prompt 4/7).
 */

import {
  getEnsembleFamilyProfile,
  listEnsembleFamilies,
} from '../core/orchestration/ensembleFamilyProfiles';

export function runEnsembleFamilyProfilesTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const families = listEnsembleFamilies();
  out.push({
    ok: families.length >= 5 && families.includes('duo') && families.includes('songwriting_lead_sheet'),
    name: 'family profiles load correctly',
  });

  const duo = getEnsembleFamilyProfile('duo');
  const bb = getEnsembleFamilyProfile('big_band');
  out.push({
    ok: duo.requireBassAnchor === true && duo.textureConstraints.maxForegroundLines >= 1 && bb.registerDefaults.harmonicBass === 'sub_bass',
    name: 'family defaults: duo bass anchor; big band sub_bass default',
  });

  return out;
}
