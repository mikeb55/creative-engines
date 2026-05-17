/**
 * Morricone film stub SQ VRB — Session Harmonic Voice verification.
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
  MORRICONE_PEDAL_POINT_VALID_BARS,
  MORRICONE_SQ_CHORD_VOCABULARY,
  MORRICONE_SQ_CONTRAPUNTAL_LINE_POLICY,
  MORRICONE_SQ_VRB_PROFILE,
} from './morriconeFilmStubVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('morricone') === MORRICONE_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = MORRICONE_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'morricone' &&
    p.independenceLevel === 'low' &&
    p.registerPolicy === 'lyrical_arch' &&
    p.phraseArticulation === 'folk_modal_suspended' &&
    p.imitationStyle === 'climactic_synthesis'
  );
}

function testModalChordVocabulary(): boolean {
  const v = MORRICONE_SQ_CHORD_VOCABULARY;
  return (
    v.includes('modal_aeolian') &&
    v.includes('modal_dorian') &&
    v.includes('chromatic_median_bIII') &&
    v.includes('chromatic_median_bVI') &&
    v.includes('chromatic_median_bII')
  );
}

function testPedalPointAllowance(): boolean {
  const bundle = getVoiceRuleBundle('morricone');
  return (
    MORRICONE_PEDAL_POINT_VALID_BARS >= 8 &&
    bundle.pedalPointValidBars === MORRICONE_PEDAL_POINT_VALID_BARS &&
    bundle.harmonicRhythm.maxChordDurationBars >= 8
  );
}

function testBestBbStyle(): boolean {
  const m = getVoiceRuleBundle('morricone');
  return m.bestBbStyle === 'schneider';
}

function testGceSigma22(): boolean {
  return getSqVrbGceAdjustments('morricone')?.registerCohesionStdevCeilingSt === 22;
}

function buildFolkModalArchLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 67;
  for (let i = 0; i < 40; i++) {
    line.push({
      midi: p,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
    p += [2, 2, 5, 2, -2, 2, 7, -3][i % 8]!;
  }
  return line;
}

function testInconclusivePgValid(): boolean {
  const line = buildFolkModalArchLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 32, cadenceStrength: 'weak' as const },
    { startBeat: 32, endBeat: 40, cadenceStrength: 'medium' as const },
  ];
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'morricone',
    mesoSpans,
    cadenceTags: [{ positionBars: 32, type: 'modal', strength: 'weak' }],
  });
  return pg.score >= 6 && pg.justification.includes('[SQ morricone PG]');
}

function testModalCadenceNotWeakPenalty(): boolean {
  const line = buildFolkModalArchLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: 'weak' as const,
  }));
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'morricone',
    mesoSpans,
    cadenceTags: [],
  });
  return pg.score >= 5.5;
}

function testMiFolkModal(): boolean {
  const line = buildFolkModalArchLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 20, cadenceStrength: 'medium' as const },
    { startBeat: 20, endBeat: 40, cadenceStrength: 'weak' as const },
  ];
  const opts: ContrapuntalGceScoringOptions = {
    contrapuntalLinePolicy: true,
    sqVrbId: 'morricone',
    mesoSpans,
    cadenceTags: [],
  };
  const mi = scoreMelodicIdentity(line, 'morricone', opts);
  return mi.score >= 6.5 && mi.justification.includes('[SQ morricone MI]');
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getVoiceRuleBundle('ravel').contrapuntalLinePolicy?.vrbId === 'ravel' &&
    getVoiceRuleBundle('herrmann').contrapuntalLinePolicy?.vrbId === 'herrmann' &&
    getVoiceRuleBundle('bartok').contrapuntalLinePolicy?.enabled === true &&
    getSqVrbGceAdjustments('ravel')?.registerCohesionStdevCeilingSt === 20 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('morricone');
}

function testUiPickerMorricone(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'morricone', label: 'Morricone', enabled: true") &&
    src.indexOf("'morricone'") > src.indexOf("'herrmann'")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('morricone', 'schneider') === 'morricone';
}

export function runMorriconeFilmStubVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Morricone SQ VRB — profile loads', testProfileLoads],
    ['Morricone SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Morricone SQ VRB — independenceLevel low', () =>
      MORRICONE_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'low'],
    ['Morricone SQ VRB — registerPolicy lyrical_arch', () =>
      MORRICONE_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy === 'lyrical_arch'],
    ['Morricone SQ VRB — phraseArticulation folk_modal_suspended', () =>
      MORRICONE_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation === 'folk_modal_suspended'],
    ['Morricone SQ VRB — modal fields Aeolian Dorian + chromatic mediants', testModalChordVocabulary],
    ['Morricone SQ VRB — pedal point allowance ≥ 8 bars', testPedalPointAllowance],
    ['Morricone SQ VRB — bestBbStyle schneider', testBestBbStyle],
    ['Morricone SQ VRB — GCE σ ceiling 22 st', testGceSigma22],
    ['Morricone SQ VRB — inconclusive endings valid PG', testInconclusivePgValid],
    ['Morricone SQ VRB — modal cadences valid PG', testModalCadenceNotWeakPenalty],
    ['Morricone SQ VRB — folk-modal MI path', testMiFolkModal],
    ['Morricone SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Morricone SQ VRB — picker enabled (UI after Herrmann)', testUiPickerMorricone],
    ['Morricone SQ VRB — sqLineVrbId routes morricone', testSqLineRouting],
    ['Morricone SQ VRB — Bartók Ravel Herrmann unchanged', testPriorVrbsUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runMorriconeFilmStubVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
