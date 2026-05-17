/**
 * Jerry Goldsmith film stub SQ VRB — Session Harmonic Voice verification.
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
  GOLDSMITH_SQ_CHORD_VOCABULARY,
  GOLDSMITH_SQ_CONTRAPUNTAL_LINE_POLICY,
  GOLDSMITH_SQ_GCE_SCORER_ADJUSTMENTS,
  GOLDSMITH_SQ_VRB_PROFILE,
} from './goldsmithFilmStubVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('goldsmith') === GOLDSMITH_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = GOLDSMITH_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'goldsmith' &&
    p.independenceLevel === 'moderate' &&
    p.registerPolicy === 'dramatically_volatile_wide_arc' &&
    p.phraseArticulation === 'doubly_open_cell_development'
  );
}

function testChordVocabulary(): boolean {
  const v = GOLDSMITH_SQ_CHORD_VOCABULARY;
  return (
    v.includes('dom7') &&
    v.includes('dom9') &&
    v.includes('dom7alt') &&
    v.includes('chromatic_mediants') &&
    v.includes('modal_mixolydian')
  );
}

function testBestBbStyles(): boolean {
  const b = getVoiceRuleBundle('goldsmith');
  return b.bestBbStyle === 'schneider' && b.secondaryBbStyle === 'brookmeyer';
}

function testGceSigma24(): boolean {
  return getSqVrbGceAdjustments('goldsmith')?.registerCohesionStdevCeilingSt === 24;
}

function testSoftCeiling26(): boolean {
  return getSqVrbGceAdjustments('goldsmith')?.registerCohesionSoftCeilingSt === 26;
}

function testPhraseCellBarsRange(): boolean {
  const adj = getSqVrbGceAdjustments('goldsmith');
  return adj?.phraseCellBarsMin === 4 && adj?.phraseCellBarsMax === 6;
}

function testReducedAuthenticCadence(): boolean {
  return (GOLDSMITH_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit ?? 1) <= 0.1;
}

function testModalEndingsValid(): boolean {
  return GOLDSMITH_SQ_GCE_SCORER_ADJUSTMENTS.modalEndingsValid === true;
}

function testNoPeriodicMultiple(): boolean {
  return GOLDSMITH_SQ_GCE_SCORER_ADJUSTMENTS.phrasePeriodBars === 0;
}

function buildDoublyOpenCellLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 62;
  const steps = [2, 1, 3, 2, -1, 2, 4, 1, 2, 3, -2, 1, 2, 2, 3, -1];
  for (let i = 0; i < 24; i++) {
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

function buildSequentialAscentLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 55;
  for (let i = 0; i < 20; i++) {
    line.push({
      midi: p,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
    p += [2, 2, 3, 2][i % 4]!;
  }
  return line;
}

function testDoublyOpenPgValid(): boolean {
  const line = buildDoublyOpenCellLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 12, cadenceStrength: 'weak' as const },
    { startBeat: 12, endBeat: 24, cadenceStrength: 'medium' as const },
  ];
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'goldsmith',
    mesoSpans,
    cadenceTags: [{ positionBars: 24, type: 'modal', strength: 'medium' }],
  });
  return pg.score >= 6 && pg.justification.includes('[SQ goldsmith PG]');
}

function testGoldsmithMiPath(): boolean {
  const line = buildSequentialAscentLine();
  const mesoSpans = Array.from({ length: 3 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: (i === 2 ? 'medium' : 'weak') as 'medium' | 'weak',
  }));
  const mi = scoreMelodicIdentity(line, 'goldsmith', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'goldsmith',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6.5 && mi.justification.includes('[SQ goldsmith MI]');
}

function testGoldsmithIntervalTarget(): boolean {
  const asc = buildSequentialAscentLine();
  const gs = scoreJazzIntervalBalance(
    asc.map((n) => n.midi),
    'goldsmith',
    true,
  );
  return gs >= 0.5;
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('rota')?.registerCohesionStdevCeilingSt === 19 &&
    getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('morricone')?.registerCohesionStdevCeilingSt === 22 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36 &&
    getSqVrbGceAdjustments('ravel')?.registerCohesionStdevCeilingSt === 20
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('goldsmith');
}

function testUiPickerGoldsmith(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'goldsmith', label: 'Goldsmith', enabled: true") &&
    src.indexOf("'goldsmith'") > src.indexOf("'rota'")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('goldsmith', 'schneider') === 'goldsmith';
}

function testBundleWired(): boolean {
  return getVoiceRuleBundle('jerry_goldsmith').sqVrbProfileId === 'goldsmith';
}

export function runGoldsmithFilmStubVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Goldsmith SQ VRB — profile loads', testProfileLoads],
    ['Goldsmith SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Goldsmith SQ VRB — independenceLevel moderate', () =>
      GOLDSMITH_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'moderate'],
    ['Goldsmith SQ VRB — registerPolicy dramatically_volatile_wide_arc', () =>
      GOLDSMITH_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy === 'dramatically_volatile_wide_arc'],
    [
      'Goldsmith SQ VRB — phraseArticulation doubly_open_cell_development',
      () =>
        GOLDSMITH_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation ===
        'doubly_open_cell_development',
    ],
    ['Goldsmith SQ VRB — chord vocabulary dom9 jazz mediants', testChordVocabulary],
    ['Goldsmith SQ VRB — bestBbStyle schneider secondary brookmeyer', testBestBbStyles],
    ['Goldsmith SQ VRB — GCE σ ceiling 24 st', testGceSigma24],
    ['Goldsmith SQ VRB — soft σ ceiling 26 st', testSoftCeiling26],
    ['Goldsmith SQ VRB — phraseCellBars 4–6', testPhraseCellBarsRange],
    ['Goldsmith SQ VRB — authenticCadenceCredit reduced', testReducedAuthenticCadence],
    ['Goldsmith SQ VRB — modalEndingsValid', testModalEndingsValid],
    ['Goldsmith SQ VRB — no 8-bar periodic bonus', testNoPeriodicMultiple],
    ['Goldsmith SQ VRB — doubly-open PG valid', testDoublyOpenPgValid],
    ['Goldsmith SQ VRB — sequential ascent MI path', testGoldsmithMiPath],
    ['Goldsmith SQ VRB — goldsmith interval target', testGoldsmithIntervalTarget],
    ['Goldsmith SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Goldsmith SQ VRB — picker enabled (UI after Rota)', testUiPickerGoldsmith],
    ['Goldsmith SQ VRB — sqLineVrbId routes goldsmith', testSqLineRouting],
    ['Goldsmith SQ VRB — voiceRuleBundle wired', testBundleWired],
    ['Goldsmith SQ VRB — prior VRBs σ unchanged', testPriorVrbsUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runGoldsmithFilmStubVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
