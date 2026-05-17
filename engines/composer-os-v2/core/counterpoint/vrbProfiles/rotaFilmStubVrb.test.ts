/**
 * Nino Rota film stub SQ VRB — Session Harmonic Voice verification.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import {
  scoreMelodicIdentity,
  scorePhraseGrammar,
  scoreJazzIntervalBalance,
  type ContrapuntalGceScoringOptions,
} from '../../gce/gceAutoScorers';
import type { MelodicNote } from '../../gce/gce_melody_eval';
import { SQ_TO_BB_SQ_COMPOSER_ENABLED, sqLineVrbIdForSqToBb } from '../sqToBbWorkflowTypes';
import {
  ROTA_SQ_CHORD_VOCABULARY,
  ROTA_SQ_CONTRAPUNTAL_LINE_POLICY,
  ROTA_SQ_GCE_SCORER_ADJUSTMENTS,
  ROTA_SQ_VRB_PROFILE,
} from './rotaFilmStubVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('rota') === ROTA_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = ROTA_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'rota' &&
    p.independenceLevel === 'low' &&
    p.registerPolicy === 'lyrical_soprano_arch_mid_centrist' &&
    p.phraseArticulation === 'strict_periodic_tonal_cadence'
  );
}

function testChordVocabulary(): boolean {
  const v = ROTA_SQ_CHORD_VOCABULARY;
  return (
    v.includes('dom9') === false &&
    v.includes('dom7') &&
    v.includes('chromatic_mediants') &&
    v.includes('chromatic_median_bIII') &&
    v.includes('chromatic_median_bVI') &&
    v.includes('chromatic_median_bII') &&
    v.includes('triad_skeleton')
  );
}

function testBestBbStyles(): boolean {
  const b = getVoiceRuleBundle('rota');
  return b.bestBbStyle === 'schneider' && b.secondaryBbStyle === 'brookmeyer';
}

function testGceSigma19(): boolean {
  return getSqVrbGceAdjustments('rota')?.registerCohesionStdevCeilingSt === 19;
}

function testMotifRecurrenceWeight(): boolean {
  return ROTA_SQ_GCE_SCORER_ADJUSTMENTS.motifRecurrenceWeight === 0.4;
}

function testPhraseCellBarsRange(): boolean {
  const adj = getSqVrbGceAdjustments('rota');
  return adj?.phraseCellBarsMin === 4 && adj?.phraseCellBarsMax === 8;
}

function testAuthenticCadenceCredit(): boolean {
  return (ROTA_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit ?? 0) >= 0.22;
}

function testParallelThirdSixthBonus(): boolean {
  return (ROTA_SQ_GCE_SCORER_ADJUSTMENTS.parallelThirdSixthBonus ?? 0) > 0;
}

function buildPeriodicTonalLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 67;
  const steps = [2, 1, 2, 2, -1, 2, 3, 1, 2, 2, -2, 2, 1, 2, 3, -1];
  for (let i = 0; i < 32; i++) {
    line.push({
      midi: p,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
    p += steps[i % steps.length]!;
  }
  return line;
}

function testRotaIntervalSignature(): boolean {
  const periodic = buildPeriodicTonalLine();
  const rotaScore = scoreJazzIntervalBalance(
    periodic.map((n) => n.midi),
    'rota',
    true,
  );
  return rotaScore >= 0.55;
}

function testAuthenticCadencePg(): boolean {
  const line = buildPeriodicTonalLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 16, cadenceStrength: 'medium' as const },
    { startBeat: 16, endBeat: 32, cadenceStrength: 'strong' as const },
  ];
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'rota',
    mesoSpans,
    cadenceTags: [{ positionBars: 32, type: 'authentic', strength: 'strong' }],
  });
  return pg.score >= 6.5 && pg.justification.includes('[SQ rota PG]');
}

function testWeakCadencePgLowerThanStrong(): boolean {
  const line = buildPeriodicTonalLine();
  const strongMeso = [
    { startBeat: 0, endBeat: 16, cadenceStrength: 'strong' as const },
    { startBeat: 16, endBeat: 32, cadenceStrength: 'strong' as const },
  ];
  const weakMeso = [
    { startBeat: 0, endBeat: 16, cadenceStrength: 'weak' as const },
    { startBeat: 16, endBeat: 32, cadenceStrength: 'weak' as const },
  ];
  const strongPg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'rota',
    mesoSpans: strongMeso,
    cadenceTags: [],
  });
  const weakPg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'rota',
    mesoSpans: weakMeso,
    cadenceTags: [],
  });
  return strongPg.score > weakPg.score;
}

function testMiRotaPath(): boolean {
  const line = buildPeriodicTonalLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: (i % 2 === 0 ? 'medium' : 'strong') as 'medium' | 'strong',
  }));
  const opts: ContrapuntalGceScoringOptions = {
    contrapuntalLinePolicy: true,
    sqVrbId: 'rota',
    mesoSpans,
    cadenceTags: [],
  };
  const mi = scoreMelodicIdentity(line, 'rota', opts);
  return mi.score >= 6.5 && mi.justification.includes('[SQ rota MI]');
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('morricone')?.registerCohesionStdevCeilingSt === 22 &&
    getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36 &&
    getSqVrbGceAdjustments('ravel')?.registerCohesionStdevCeilingSt === 20 &&
    getVoiceRuleBundle('morricone').contrapuntalLinePolicy?.vrbId === 'morricone'
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('rota');
}

function testUiPickerRota(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'rota', label: 'Rota', enabled: true") &&
    src.indexOf("'rota'") > src.indexOf("'williams'")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('rota', 'schneider') === 'rota';
}

function testBundleWired(): boolean {
  return getVoiceRuleBundle('rota').sqVrbProfileId === 'rota';
}

export function runRotaFilmStubVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Rota SQ VRB — profile loads', testProfileLoads],
    ['Rota SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Rota SQ VRB — independenceLevel low', () =>
      ROTA_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'low'],
    ['Rota SQ VRB — registerPolicy lyrical_soprano_arch_mid_centrist', () =>
      ROTA_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy === 'lyrical_soprano_arch_mid_centrist'],
    ['Rota SQ VRB — phraseArticulation strict_periodic_tonal_cadence', () =>
      ROTA_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation === 'strict_periodic_tonal_cadence'],
    ['Rota SQ VRB — chord vocabulary triads + chromatic mediants', testChordVocabulary],
    ['Rota SQ VRB — bestBbStyle schneider secondary brookmeyer', testBestBbStyles],
    ['Rota SQ VRB — GCE σ ceiling 19 st', testGceSigma19],
    ['Rota SQ VRB — motifRecurrenceWeight 0.4', testMotifRecurrenceWeight],
    ['Rota SQ VRB — phraseCellBars 4–8', testPhraseCellBarsRange],
    ['Rota SQ VRB — authenticCadenceCredit elevated', testAuthenticCadenceCredit],
    ['Rota SQ VRB — parallelThirdSixthBonus present', testParallelThirdSixthBonus],
    ['Rota SQ VRB — verismo interval signature', testRotaIntervalSignature],
    ['Rota SQ VRB — authentic cadence PG', testAuthenticCadencePg],
    ['Rota SQ VRB — strong cadence beats weak PG', testWeakCadencePgLowerThanStrong],
    ['Rota SQ VRB — periodic MI path', testMiRotaPath],
    ['Rota SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Rota SQ VRB — picker enabled (UI after Williams)', testUiPickerRota],
    ['Rota SQ VRB — sqLineVrbId routes rota', testSqLineRouting],
    ['Rota SQ VRB — voiceRuleBundle wired', testBundleWired],
    ['Rota SQ VRB — prior VRBs unchanged', testPriorVrbsUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runRotaFilmStubVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
