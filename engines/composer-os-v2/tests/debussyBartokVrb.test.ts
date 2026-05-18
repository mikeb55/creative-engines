/**
 * Debussy + Bartók SQ VRB registry stubs and SQ→BB UI alignment.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rhythmExpectationForVrb } from '../core/gce/gceAutoScorers';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { normalizeSectionVrbMap } from '../app-api/normalizeSectionVrbMap';
import {
  BARTOK_SQ_CHORD_VOCABULARY,
  BARTOK_SQ_CONTRAPUNTAL_LINE_POLICY,
  BARTOK_SQ_VRB_PROFILE,
} from '../core/counterpoint/vrbProfiles/bartokSqVrb';
import {
  DEBUSSY_SQ_CHORD_VOCABULARY,
  DEBUSSY_SQ_CONTRAPUNTAL_LINE_POLICY,
  DEBUSSY_SQ_VRB_PROFILE,
} from '../core/counterpoint/vrbProfiles/debussySqVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from '../core/counterpoint/vrbProfiles/sqVrbProfileRegistry';

const REGISTRY_VRB_IDS = [
  'ravel',
  'herrmann',
  'morricone',
  'williams',
  'rota',
  'goldsmith',
  'glass',
  'zimmer',
  'badalamenti',
  'shostakovich',
  'webern',
  'joni_mitchell',
  'ligeti',
  'satie',
  'cole_porter',
  'gershwin',
  'arvo_part',
  'debussy',
  'bartok',
] as const;

const SQ_TO_BB_UI_SOURCE = readFileSync(
  join(__dirname, '../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts'),
  'utf8',
);

function optionsHasId(id: string): boolean {
  return SQ_TO_BB_UI_SOURCE.includes(`id: '${id}'`);
}

function testDebussySigma21(): boolean {
  return getSqVrbGceAdjustments('debussy')?.registerCohesionStdevCeilingSt === 21;
}

function testBartokSigma29(): boolean {
  return getSqVrbGceAdjustments('bartok')?.registerCohesionStdevCeilingSt === 29;
}

function testDebussyProfileDefined(): boolean {
  return getSqVrbProfile('debussy') === DEBUSSY_SQ_VRB_PROFILE;
}

function testBartokProfileDefined(): boolean {
  return getSqVrbProfile('bartok') === BARTOK_SQ_VRB_PROFILE;
}

function testRegistryCount19(): boolean {
  return REGISTRY_VRB_IDS.length === 19 && REGISTRY_VRB_IDS.every((id) => getSqVrbProfile(id) != null);
}

function testDebussyVrbId(): boolean {
  return getSqVrbProfile('debussy')?.vrbId === 'debussy';
}

function testBartokVrbId(): boolean {
  return getSqVrbProfile('bartok')?.vrbId === 'bartok';
}

function testDebussySuppressFunctional(): boolean {
  return getVoiceRuleBundle('debussy').suppressFunctionalResolution === true;
}

function testBartokSuppressFunctional(): boolean {
  return getVoiceRuleBundle('bartok').suppressFunctionalResolution === true;
}

function testDebussyParallelAllow(): boolean {
  return DEBUSSY_SQ_CONTRAPUNTAL_LINE_POLICY.parallelMotionPolicy === 'allow';
}

function testBartokIndependenceHigh(): boolean {
  return BARTOK_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'high';
}

function testDebussyWholeToneChord(): boolean {
  return DEBUSSY_SQ_CHORD_VOCABULARY.includes('whole_tone_chord');
}

function testBartokChromaticCluster(): boolean {
  return BARTOK_SQ_CHORD_VOCABULARY.includes('chromatic_cluster');
}

function testDebussyAnticipation08(): boolean {
  return rhythmExpectationForVrb('debussy')?.anticipationRateMax === 0.08;
}

function testBartokAnticipation04(): boolean {
  return rhythmExpectationForVrb('bartok')?.anticipationRateMax === 0.04;
}

function testUiArvoPart(): boolean {
  return optionsHasId('arvo_part');
}

function testUiDebussy(): boolean {
  return optionsHasId('debussy');
}

function testUiBartok(): boolean {
  return optionsHasId('bartok');
}

function testSectionMapInstrumental(): boolean {
  try {
    const map = normalizeSectionVrbMap({
      totalBars: 32,
      sectionVrbMap: { opening: 'debussy', development: 'bartok' },
      sectionLabelMode: 'instrumental',
    });
    return map.size === 2 && map.has('opening') && map.has('development');
  } catch {
    return false;
  }
}

function testSectionMapSong(): boolean {
  try {
    const map = normalizeSectionVrbMap({
      totalBars: 32,
      sectionVrbMap: { verse: 'debussy', chorus: 'bartok' },
      sectionLabelMode: 'song',
    });
    return map.size === 2 && map.has('verse') && map.has('chorus');
  } catch {
    return false;
  }
}

export function runDebussyBartokVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Debussy/Bartók VRB — debussy σ 21', testDebussySigma21],
    ['Debussy/Bartók VRB — bartok σ 29', testBartokSigma29],
    ['Debussy/Bartók VRB — debussy registry profile', testDebussyProfileDefined],
    ['Debussy/Bartók VRB — bartok registry profile', testBartokProfileDefined],
    ['Debussy/Bartók VRB — registry 19 entries', testRegistryCount19],
    ['Debussy/Bartók VRB — debussy vrbId', testDebussyVrbId],
    ['Debussy/Bartók VRB — bartok vrbId', testBartokVrbId],
    ['Debussy/Bartók VRB — debussy suppressFunctionalResolution', testDebussySuppressFunctional],
    ['Debussy/Bartók VRB — bartok suppressFunctionalResolution', testBartokSuppressFunctional],
    ['Debussy/Bartók VRB — debussy parallelMotionPolicy allow', testDebussyParallelAllow],
    ['Debussy/Bartók VRB — bartok independenceLevel high', testBartokIndependenceHigh],
    ['Debussy/Bartók VRB — debussy whole_tone_chord', testDebussyWholeToneChord],
    ['Debussy/Bartók VRB — bartok chromatic_cluster', testBartokChromaticCluster],
    ['Debussy/Bartók VRB — debussy anticipationRateMax 0.08', testDebussyAnticipation08],
    ['Debussy/Bartók VRB — bartok anticipationRateMax 0.04', testBartokAnticipation04],
    ['Debussy/Bartók VRB — UI arvo_part option', testUiArvoPart],
    ['Debussy/Bartók VRB — UI debussy option', testUiDebussy],
    ['Debussy/Bartók VRB — UI bartok option', testUiBartok],
    ['Debussy/Bartók VRB — sectionVrbMap instrumental', testSectionMapInstrumental],
    ['Debussy/Bartók VRB — sectionVrbMap song', testSectionMapSong],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runDebussyBartokVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
