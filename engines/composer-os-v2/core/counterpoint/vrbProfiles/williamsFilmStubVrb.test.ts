/**
 * John Williams film stub SQ VRB — Session Harmonic Voice verification.
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
  WILLIAMS_SQ_CHORD_VOCABULARY,
  WILLIAMS_SQ_CONTRAPUNTAL_LINE_POLICY,
  WILLIAMS_SQ_GCE_SCORER_ADJUSTMENTS,
  WILLIAMS_SQ_VRB_PROFILE,
} from './williamsFilmStubVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('williams') === WILLIAMS_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = WILLIAMS_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'williams' &&
    p.independenceLevel === 'moderate' &&
    p.registerPolicy === 'heroic_arch_with_fanfare_leaps' &&
    p.phraseArticulation === 'romantic_periodic_cadential' &&
    p.imitationStyle === 'leitmotif_development'
  );
}

function testChordVocabulary(): boolean {
  const v = WILLIAMS_SQ_CHORD_VOCABULARY;
  return (
    v.includes('dom9') &&
    v.includes('chromatic_mediants') &&
    v.includes('lydian_IV') &&
    v.includes('quartal_fanfare') &&
    v.includes('modal_interchange_bVII')
  );
}

function testBestBbStyle(): boolean {
  return getVoiceRuleBundle('williams').bestBbStyle === 'schneider';
}

function testGceSigma26(): boolean {
  return getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26;
}

function testMotifRecurrenceWeight(): boolean {
  return WILLIAMS_SQ_GCE_SCORER_ADJUSTMENTS.motifRecurrenceWeight === 0.44;
}

function testPhraseCellBarsRange(): boolean {
  const adj = getSqVrbGceAdjustments('williams');
  return adj?.phraseCellBarsMin === 4 && adj?.phraseCellBarsMax === 16;
}

function buildHeroicFanfareLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 60;
  const leaps = [7, 5, 2, 2, -3, 2, 7, 4, -2, 2, 5, 2, -3, 2, 4, 2];
  for (let i = 0; i < 32; i++) {
    line.push({
      midi: p,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
    p += leaps[i % leaps.length]!;
  }
  return line;
}

function buildHerrmannCellLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 60;
  for (let i = 0; i < 24; i++) {
    line.push({
      midi: p,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
    p += i % 2 === 0 ? 1 : 6;
  }
  return line;
}

function testWilliamsIntervalRewardVsHerrmann(): boolean {
  const heroic = buildHeroicFanfareLine();
  const herrmannLine = buildHerrmannCellLine();
  const wHero = scoreJazzIntervalBalance(
    heroic.map((n) => n.midi),
    'williams',
    true,
  );
  const wHerr = scoreJazzIntervalBalance(
    heroic.map((n) => n.midi),
    'herrmann',
    true,
  );
  const hOnHerr = scoreJazzIntervalBalance(
    herrmannLine.map((n) => n.midi),
    'herrmann',
    true,
  );
  const wOnHerr = scoreJazzIntervalBalance(
    herrmannLine.map((n) => n.midi),
    'williams',
    true,
  );
  return wHero > wHerr && hOnHerr > wOnHerr;
}

function testAuthenticCadencePg(): boolean {
  const line = buildHeroicFanfareLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 16, cadenceStrength: 'medium' as const },
    { startBeat: 16, endBeat: 32, cadenceStrength: 'strong' as const },
  ];
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'williams',
    mesoSpans,
    cadenceTags: [{ positionBars: 32, type: 'authentic', strength: 'strong' }],
  });
  return pg.score >= 6.5 && pg.justification.includes('[SQ williams PG]');
}

function testWilliamsMiPath(): boolean {
  const line = buildHeroicFanfareLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: (i % 2 === 0 ? 'medium' : 'strong') as 'medium' | 'strong',
  }));
  const mi = scoreMelodicIdentity(line, 'williams', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'williams',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6.5 && mi.justification.includes('[SQ williams MI]');
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getVoiceRuleBundle('morricone').contrapuntalLinePolicy?.vrbId === 'morricone' &&
    getVoiceRuleBundle('herrmann').contrapuntalLinePolicy?.vrbId === 'herrmann' &&
    getVoiceRuleBundle('ravel').contrapuntalLinePolicy?.independenceLevel === 'moderate' &&
    getSqVrbGceAdjustments('morricone')?.registerCohesionStdevCeilingSt === 22 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36 &&
    getSqVrbGceAdjustments('ravel')?.registerCohesionStdevCeilingSt === 20
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('williams');
}

function testUiPickerWilliams(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'williams', label: 'Williams', enabled: true") &&
    src.indexOf("'williams'") > src.indexOf("'morricone'")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('williams', 'schneider') === 'williams';
}

export function runWilliamsFilmStubVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Williams SQ VRB — profile loads', testProfileLoads],
    ['Williams SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Williams SQ VRB — independenceLevel moderate', () =>
      WILLIAMS_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'moderate'],
    ['Williams SQ VRB — registerPolicy heroic_arch_with_fanfare_leaps', () =>
      WILLIAMS_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy === 'heroic_arch_with_fanfare_leaps'],
    ['Williams SQ VRB — phraseArticulation romantic_periodic_cadential', () =>
      WILLIAMS_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation === 'romantic_periodic_cadential'],
    ['Williams SQ VRB — chord vocabulary dom9 mediants lydian quartal bVII', testChordVocabulary],
    ['Williams SQ VRB — bestBbStyle schneider', testBestBbStyle],
    ['Williams SQ VRB — GCE σ ceiling 26 st', testGceSigma26],
    ['Williams SQ VRB — motifRecurrenceWeight 0.44', testMotifRecurrenceWeight],
    ['Williams SQ VRB — phraseCellBars 4–16', testPhraseCellBarsRange],
    ['Williams SQ VRB — P4/P5 reward vs Herrmann on heroic line', testWilliamsIntervalRewardVsHerrmann],
    ['Williams SQ VRB — authentic cadence PG', testAuthenticCadencePg],
    ['Williams SQ VRB — heroic MI path', testWilliamsMiPath],
    ['Williams SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Williams SQ VRB — picker enabled (UI after Morricone)', testUiPickerWilliams],
    ['Williams SQ VRB — sqLineVrbId routes williams', testSqLineRouting],
    ['Williams SQ VRB — prior VRBs unchanged', testPriorVrbsUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runWilliamsFilmStubVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
