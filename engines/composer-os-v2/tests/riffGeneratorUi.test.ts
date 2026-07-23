/**
 * Riff Generator UI catalog smoke tests.
 */

import {
  RIFF_VRB_OPTIONS,
  applyRiffDensityToSilenceStyleClass,
  defaultRiffVrbIdForFamily,
  riffFamilyShowsMeterPicker,
  riffGateLabelsFromFailedRules,
  riffVrbOptionsForFamily,
  riffVrbUiIndicators,
} from '../ui/riffGeneratorUi';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';

function testCatalogFamilies(): boolean {
  const funk = riffVrbOptionsForFamily('funk').map((o) => o.vrbId);
  const fusion = riffVrbOptionsForFamily('fusion').map((o) => o.vrbId);
  const rock = riffVrbOptionsForFamily('rock').map((o) => o.vrbId);
  return (
    funk.includes('nile_rodgers') &&
    funk.includes('james_brown') &&
    fusion.includes('weather_report') &&
    fusion.includes('mahavishnu') &&
    funk.includes('sly_stone') &&
    rock.includes('led_zeppelin') &&
    rock.includes('eddie_van_halen') &&
    rock.includes('jimmy_herring') &&
    !funk.includes('jamerson') &&
    !rock.includes('jamerson') &&
    RIFF_VRB_OPTIONS.length >= 17 &&
    defaultRiffVrbIdForFamily('rock') === 'iommi'
  );
}

function testMeterPickerGating(): boolean {
  return (
    riffFamilyShowsMeterPicker('fusion') &&
    riffFamilyShowsMeterPicker('art_rock') &&
    !riffFamilyShowsMeterPicker('funk') &&
    !riffFamilyShowsMeterPicker('rock')
  );
}

function testDensityStyleClassOnVrb(): boolean {
  const b = getVoiceRuleBundle('weather_report');
  if (!b.riffProfile) return false;
  const p = resolveRiffGeneratorProfile({
    vrbId: 'weather_report',
    style: 'metheny',
    grid: 'sixteenth',
    density: 'sparse',
  });
  return p.silencePolicy.styleClass.includes('riff_density:sparse');
}

function testDefaultVrbPerFamily(): boolean {
  return (
    defaultRiffVrbIdForFamily('funk') === 'james_brown' &&
    defaultRiffVrbIdForFamily('rock') === 'iommi'
  );
}

function testSlyStoneRegistry(): boolean {
  const sly = getVoiceRuleBundle('sly_stone');
  return (
    sly.sigma === 24 &&
    sly.family === 'funk' &&
    getVoiceRuleBundle('family_stone').voiceId === 'sly_stone' &&
    sly.riffProfile?.allowPitchStreak === false &&
    sly.riffProfile?.silencePolicy.styleClass === 'Busy'
  );
}

function testGateLabels(): boolean {
  const labels = riffGateLabelsFromFailedRules(['anchorStrength: score=0.40', 'unknown: x']);
  return labels[0] === 'Needs a stronger downbeat' && labels.length === 1;
}

function testVrbIndicators(): boolean {
  const fripp = riffVrbUiIndicators('fripp');
  const morello = riffVrbUiIndicators('morello');
  const verlaine = riffVrbUiIndicators('verlaine');
  const sly = riffVrbUiIndicators('sly_stone');
  return (
    Boolean(fripp.processLoopLabel) &&
    Boolean(morello.killSwitchLabel) &&
    Boolean(verlaine.counterpartLabel) &&
    sly.allowPitchStreak === false
  );
}

export function runRiffGeneratorUiTests(): { name: string; ok: boolean }[] {
  return [
    ['RiffGeneratorUi — VRB catalog by family', testCatalogFamilies],
    ['RiffGeneratorUi — meter picker gating', testMeterPickerGating],
    ['RiffGeneratorUi — density styleClass on VRB profile', testDensityStyleClassOnVrb],
    ['RiffGeneratorUi — default VRB per family', testDefaultVrbPerFamily],
    ['RiffGeneratorUi — Sly Stone registry', testSlyStoneRegistry],
    ['RiffGeneratorUi — gate rule labels', testGateLabels],
    ['RiffGeneratorUi — VRB UI indicators', testVrbIndicators],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
