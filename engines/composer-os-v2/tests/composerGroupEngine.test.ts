/**
 * Composer Group Mode — defaults engine tests.
 */

import {
  getComposerGroup,
  getComposerGroups,
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
    'schneider',
    'wheeler',
  ] as const;

  for (const id of ecmComposers) {
    out.push({
      ok: getComposerGroup(id) === 'ECM_CHAMBER_JAZZ',
      name: `getComposerGroup ECM: ${id}`,
    });
  }

  out.push({
    ok: getComposerGroup('wayne_shorter') === 'POST_BOP_CORE',
    name: 'getComposerGroup Wayne Shorter defaults POST_BOP_CORE',
  });

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

  const postBopComposers = [
    'thelonious_monk',
    'john_coltrane',
    'charlie_parker',
    'herbie_hancock',
    'mccoy_tyner',
    'barry_harris',
    'andrew_hill',
    'monk',
    'coltrane',
    'bird',
  ] as const;

  for (const id of postBopComposers) {
    out.push({
      ok: getComposerGroup(id) === 'POST_BOP_CORE',
      name: `getComposerGroup Post-Bop: ${id}`,
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

  const postBopDefaults = getGroupDefaults('POST_BOP_CORE');
  out.push({
    ok:
      postBopDefaults?.groovePersistence === 0.72 &&
      postBopDefaults.registralPorosity === 0.45 &&
      postBopDefaults.stringProminence === 0.05 &&
      postBopDefaults.cadentialResolution === 'functional_modal' &&
      postBopDefaults.ensembleDensityCurve === 'blowing_arc' &&
      postBopDefaults.silenceWeighting === 'rhythmic' &&
      postBopDefaults.productionGloss === 0.3 &&
      postBopDefaults.melodyFraming === 'head_based' &&
      postBopDefaults.soloistSpotlight === 0.6 &&
      postBopDefaults.sectionalContrastMode === 'blowing_sections',
    name: 'getGroupDefaults POST_BOP_CORE',
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

  const postBopMembers = [
    'thelonious_monk',
    'john_coltrane',
    'charlie_parker',
    'miles_davis',
    'herbie_hancock',
    'mccoy_tyner',
    'barry_harris',
    'andrew_hill',
    'jim_hall',
    'wayne_shorter',
  ] as const;

  for (const id of postBopMembers) {
    out.push({
      ok: isPostBopCore(id),
      name: `isPostBopCore member: ${id}`,
    });
  }

  out.push({
    ok: !isPostBopCore('bill_evans') && isEcmChamber('bill_evans'),
    name: 'Bill Evans defaults ECM not Post-Bop',
  });

  const wayneGroups = getComposerGroups('wayne_shorter');
  out.push({
    ok:
      wayneGroups?.primary === 'POST_BOP_CORE' &&
      wayneGroups.secondary === 'ECM_CHAMBER_JAZZ' &&
      wayneGroups.defaultTo === 'POST_BOP_CORE',
    name: 'getComposerGroups wayne_shorter dual-group',
  });

  const billGroups = getComposerGroups('bill_evans');
  out.push({
    ok:
      billGroups?.primary === 'ECM_CHAMBER_JAZZ' &&
      billGroups.secondary === 'POST_BOP_CORE' &&
      billGroups.defaultTo === 'ECM_CHAMBER_JAZZ',
    name: 'getComposerGroups bill_evans dual-group',
  });

  const wayneEcm = resolveComposerParams('wayne_shorter', {}, 'ECM_CHAMBER_JAZZ');
  out.push({
    ok:
      wayneEcm?.cadentialResolution === 'suspended' &&
      wayneEcm.melodyFraming === 'integrated' &&
      wayneEcm.groovePersistence === 0.25,
    name: 'resolveComposerParams groupOverride ECM for wayne_shorter',
  });

  const billPostBop = resolveComposerParams('bill_evans', {}, 'POST_BOP_CORE');
  out.push({
    ok:
      billPostBop?.cadentialResolution === 'functional_modal' &&
      billPostBop.melodyFraming === 'head_based' &&
      billPostBop.groovePersistence === 0.72,
    name: 'resolveComposerParams groupOverride Post-Bop for bill_evans',
  });

  return out;
}
