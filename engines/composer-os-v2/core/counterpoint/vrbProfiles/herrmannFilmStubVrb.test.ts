/**
 * Herrmann film stub SQ VRB — Session Harmonic Voice verification.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import {
  scoreMelodicIdentity,
  scorePhraseGrammar,
  type ContrapuntalGceScoringOptions,
} from '../../gce/gceAutoScorers';
import type { MelodicNote } from '../../gce/gce_melody_eval';
import { SQ_TO_BB_SQ_COMPOSER_ENABLED, sqLineVrbIdForSqToBb } from '../sqToBbWorkflowTypes';
import {
  HERRMANN_SQ_CHORD_VOCABULARY,
  HERRMANN_SQ_CONTRAPUNTAL_LINE_POLICY,
  HERRMANN_SQ_VRB_PROFILE,
} from './herrmannFilmStubVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('herrmann') === HERRMANN_SQ_VRB_PROFILE;
}

function testContrapuntalPolicyFields(): boolean {
  const p = HERRMANN_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'herrmann' &&
    p.independenceLevel === 'low' &&
    p.imitationStyle === 'staggered_entry' &&
    p.registerPolicy === 'extreme_registers' &&
    p.phraseArticulation === 'ostinato_cell_based'
  );
}

function testChordVocabulary(): boolean {
  const v = HERRMANN_SQ_CHORD_VOCABULARY;
  return (
    v.includes('poly_triad_minor_second') &&
    v.includes('poly_triad_tritone') &&
    v.includes('tritone_dyad_anchor')
  );
}

function testBbStylesOnBundle(): boolean {
  const h = getVoiceRuleBundle('herrmann');
  return (
    h.bestBbStyle === 'brookmeyer' &&
    h.secondaryBbStyle === 'mingus' &&
    h.cautionBbStyle === 'basie' &&
    h.contrapuntalLinePolicy?.enabled === true &&
    h.contrapuntalLinePolicy?.vrbId === 'herrmann'
  );
}

function testGceSigma36(): boolean {
  const adj = getSqVrbGceAdjustments('herrmann');
  return adj != null && adj.registerCohesionStdevCeilingSt === 36;
}

function testCellRecurrenceWeighted(): boolean {
  const adj = getSqVrbGceAdjustments('herrmann');
  const ravel = getSqVrbGceAdjustments('ravel');
  return (
    (adj?.motifRecurrenceWeight ?? 0) > (ravel?.motifRecurrenceWeight ?? 0) &&
    (adj?.motifRecurrenceWeight ?? 0) >= 0.45
  );
}

function testRegisterCohesionWideExtremes(): boolean {
  const adj = getSqVrbGceAdjustments('herrmann');
  if (!adj || adj.registerCohesionStdevCeilingSt !== 36) return false;

  const line: MelodicNote[] = [];
  let p = 72;
  for (let i = 0; i < 24; i++) {
    line.push({
      midi: p,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 0.5,
      rest: false,
    });
    p += [1, 6, 3, 1, 6, 3][i % 6]!;
  }
  const mesoSpans = [
    { startBeat: 0, endBeat: 12, cadenceStrength: 'weak' as const },
    { startBeat: 12, endBeat: 24, cadenceStrength: 'weak' as const },
  ];
  const opts: ContrapuntalGceScoringOptions = {
    contrapuntalLinePolicy: true,
    sqVrbId: 'herrmann',
    mesoSpans,
    cadenceTags: [],
  };
  const mi = scoreMelodicIdentity(line, 'herrmann', opts);
  return mi.score >= 6.5 && mi.justification.includes('[SQ herrmann MI]');
}

function testOstinatoPgValid(): boolean {
  const cell = [0, 6, 6];
  const line: MelodicNote[] = [];
  let bar = 1;
  for (let m = 0; m < 8; m++) {
    let p = 60;
    for (let n = 0; n < 3; n++) {
      line.push({
        midi: p,
        bar,
        beat: 1 + n * 0.5,
        beats: 0.5,
        rest: false,
      });
      p += cell[n]!;
    }
    bar++;
  }
  const mesoSpans = Array.from({ length: 8 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'weak' as const,
  }));
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'herrmann',
    mesoSpans,
    cadenceTags: [],
  });
  return pg.score >= 5.5 && pg.justification.includes('[SQ herrmann PG]');
}

function testRavelBartokUnchanged(): boolean {
  const ravel = getVoiceRuleBundle('ravel');
  const bartok = getVoiceRuleBundle('bartok');
  return (
    ravel.contrapuntalLinePolicy?.vrbId === 'ravel' &&
    ravel.contrapuntalLinePolicy?.independenceLevel === 'moderate' &&
    bartok.contrapuntalLinePolicy?.enabled === true &&
    getSqVrbGceAdjustments('ravel')?.registerCohesionStdevCeilingSt === 20 &&
    getSqVrbGceAdjustments('bartok') === undefined
  );
}

function testPickerEnabled(): boolean {
  return (
    SQ_TO_BB_SQ_COMPOSER_ENABLED.has('herrmann') &&
    SQ_TO_BB_SQ_COMPOSER_ENABLED.has('ravel') &&
    SQ_TO_BB_SQ_COMPOSER_ENABLED.has('bartok')
  );
}

function testUiPickerHerrmann(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'herrmann', label: 'Herrmann', enabled: true") &&
    src.indexOf("'herrmann'") > src.indexOf("'ravel'")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('herrmann', 'schneider') === 'herrmann';
}

export function runHerrmannFilmStubVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Herrmann SQ VRB — profile loads', testProfileLoads],
    ['Herrmann SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicyFields],
    ['Herrmann SQ VRB — independenceLevel low', () =>
      HERRMANN_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'low'],
    ['Herrmann SQ VRB — chord vocabulary poly-triads + tritone dyad', testChordVocabulary],
    ['Herrmann SQ VRB — registerPolicy extreme_registers', () =>
      HERRMANN_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy === 'extreme_registers'],
    ['Herrmann SQ VRB — phraseArticulation ostinato_cell_based', () =>
      HERRMANN_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation === 'ostinato_cell_based'],
    ['Herrmann SQ VRB — bestBbStyle brookmeyer', testBbStylesOnBundle],
    ['Herrmann SQ VRB — GCE σ ceiling 36 st', testGceSigma36],
    ['Herrmann SQ VRB — cell recurrence weight up', testCellRecurrenceWeighted],
    ['Herrmann SQ VRB — extreme register MI cohesion', testRegisterCohesionWideExtremes],
    ['Herrmann SQ VRB — ostinato PG valid', testOstinatoPgValid],
    ['Herrmann SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Herrmann SQ VRB — picker enabled (UI after Ravel)', testUiPickerHerrmann],
    ['Herrmann SQ VRB — sqLineVrbId routes herrmann', testSqLineRouting],
    ['Herrmann SQ VRB — Ravel and Bartók unchanged', testRavelBartokUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runHerrmannFilmStubVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
