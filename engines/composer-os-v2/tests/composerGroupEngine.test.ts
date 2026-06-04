/**
 * Composer Group Mode — defaults engine tests.
 */

import {
  getComposerGroup,
  getGroupDefaults,
  isEcmChamber,
  isPostBopCore,
  isStudioOrchestral,
  resolveComposerParams,
} from '../core/groups/composerGroupEngine';

export function runComposerGroupEngineTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const ecmComposers = [
    'maria_schneider',
    'kenny_wheeler',
    'gil_evans',
    'bill_evans',
    'pat_metheny',
    'wayne_shorter',
    'schneider',
    'wheeler',
  ] as const;

  for (const id of ecmComposers) {
    out.push({
      ok: getComposerGroup(id) === 'ECM_CHAMBER_JAZZ',
      name: `getComposerGroup ECM: ${id}`,
    });
  }

  const studioComposers = [
    'don_sebesky',
    'quincy_jones',
    'oliver_nelson',
    'sammy_nestico',
    'count_basie',
    'duke_ellington',
    'billy_strayhorn',
    'charles_mingus',
    'sebesky',
    'ellington',
    'strayhorn',
    'basie',
  ] as const;

  for (const id of studioComposers) {
    out.push({
      ok: getComposerGroup(id) === 'STUDIO_ORCHESTRAL_JAZZ',
      name: `getComposerGroup Studio: ${id}`,
    });
  }

  const ecmDefaults = getGroupDefaults('ECM_CHAMBER_JAZZ');
  out.push({
    ok:
      ecmDefaults?.groovePersistence === 0.25 &&
      ecmDefaults.registralPorosity === 0.8 &&
      ecmDefaults.cadentialResolution === 'suspended' &&
      ecmDefaults.productionGloss === 0.2 &&
      ecmDefaults.melodyFraming === 'integrated',
    name: 'getGroupDefaults ECM_CHAMBER_JAZZ',
  });

  const studioDefaults = getGroupDefaults('STUDIO_ORCHESTRAL_JAZZ');
  out.push({
    ok:
      studioDefaults?.groovePersistence === 0.78 &&
      studioDefaults.stringProminence === 0.65 &&
      studioDefaults.cadentialResolution === 'arrived' &&
      studioDefaults.productionGloss === 0.82 &&
      studioDefaults.melodyFraming === 'spotlighted',
    name: 'getGroupDefaults STUDIO_ORCHESTRAL_JAZZ',
  });

  out.push({
    ok: getGroupDefaults('POST_BOP_CORE') === null,
    name: 'getGroupDefaults POST_BOP_CORE placeholder returns null',
  });

  const merged = resolveComposerParams('maria_schneider', { productionGloss: 0.35, soloistSpotlight: 0.9 });
  out.push({
    ok:
      merged?.productionGloss === 0.35 &&
      merged.soloistSpotlight === 0.9 &&
      merged.groovePersistence === 0.25 &&
      merged.melodyFraming === 'integrated',
    name: 'resolveComposerParams merges overrides over ECM defaults',
  });

  out.push({
    ok: isEcmChamber('kenny_wheeler') && !isEcmChamber('don_sebesky'),
    name: 'isEcmChamber boolean checks',
  });

  out.push({
    ok: isStudioOrchestral('don_sebesky') && !isStudioOrchestral('pat_metheny'),
    name: 'isStudioOrchestral boolean checks',
  });

  out.push({
    ok: !isPostBopCore('thelonious_monk') && !isPostBopCore('charlie_parker'),
    name: 'isPostBopCore false until Group 3 built',
  });

  const reserved = ['thelonious_monk', 'john_coltrane', 'miles_davis'] as const;
  for (const id of reserved) {
    out.push({
      ok: getComposerGroup(id) === null,
      name: `precursor reserved null group: ${id}`,
    });
  }

  return out;
}
