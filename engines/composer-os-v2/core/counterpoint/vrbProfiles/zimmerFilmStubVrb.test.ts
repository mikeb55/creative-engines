/**
 * Hans Zimmer film stub SQ VRB — Session Harmonic Voice verification.
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
  ZIMMER_PASSACAGLIA_SUB_MODE,
  ZIMMER_SQ_CHORD_VOCABULARY,
  ZIMMER_SQ_CONTRAPUNTAL_LINE_POLICY,
  ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS,
  ZIMMER_SQ_VRB_PROFILE,
} from './zimmerFilmStubVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('zimmer') === ZIMMER_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = ZIMMER_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'zimmer' &&
    p.independenceLevel === 'low' &&
    p.registerPolicy === 'dynamically_wide_arc_accumulative' &&
    p.phraseArticulation === 'repeating_ostinato_no_cadence' &&
    p.imitationStyle === 'staggered_entry'
  );
}

function testPassacagliaSubModeDocumented(): boolean {
  const sub = ZIMMER_SQ_VRB_PROFILE.zimmerPassacagliaSubMode;
  return (
    sub === ZIMMER_PASSACAGLIA_SUB_MODE &&
    sub.independenceLevel === 'moderate' &&
    sub.registerPolicy === 'systematic_bass_to_soprano_expansion' &&
    sub.phraseArticulation === 'ground_iterations_progressive_entry' &&
    sub.gceRegisterCohesionStdevCeilingSt === 28
  );
}

function testChordVocabulary(): boolean {
  const v = ZIMMER_SQ_CHORD_VOCABULARY;
  return (
    v.includes('modal_aeolian') &&
    v.includes('chromatic_median_bVI') &&
    v.includes('aeolian_cadence_bVI_bVII_i') &&
    v.includes('chromatic_mediants')
  );
}

function testBestBbStyles(): boolean {
  const b = getVoiceRuleBundle('zimmer');
  return b.bestBbStyle === 'schneider' && b.secondaryBbStyle === 'brookmeyer';
}

function testGceSigma26(): boolean {
  return getSqVrbGceAdjustments('zimmer')?.registerCohesionStdevCeilingSt === 26;
}

function testPhraseCellBarsRange(): boolean {
  const adj = getSqVrbGceAdjustments('zimmer');
  return adj?.phraseCellBarsMin === 4 && adj?.phraseCellBarsMax === 8;
}

function testMinimalAuthenticCadence(): boolean {
  return (ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit ?? 1) <= 0.05;
}

function testModalEndingsValid(): boolean {
  return ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS.modalEndingsValid === true;
}

function testNoPeriodicMultiple(): boolean {
  return ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS.phrasePeriodBars === 0;
}

function testHighMotifRecurrence(): boolean {
  return ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS.motifRecurrenceWeight === 0.48;
}

function testWallToWallSuppressed(): boolean {
  return ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS.wallToWallPhrasePenalty === 0;
}

function testDensityAccumulationCredit(): boolean {
  return (ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS.additiveLayeringCredit ?? 0) >= 0.12;
}

function testSubMediantAndChromaticMediant(): boolean {
  return (
    (ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS.subMediantColorCredit ?? 0) > 0 &&
    (ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS.chromaticMediantCredit ?? 0) > 0
  );
}

function buildOstinatoLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 57;
  const steps = [2, 2, 1, 2, 2, 1, 2, 2];
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

function testRepeatingOstinatoPgValid(): boolean {
  const line = buildOstinatoLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: (i === 3 ? 'weak' : 'medium') as 'weak' | 'medium',
  }));
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'zimmer',
    mesoSpans,
    cadenceTags: [{ positionBars: 32, type: 'modal', strength: 'weak' }],
  });
  return pg.score >= 6 && pg.justification.includes('[SQ zimmer PG]');
}

function testZimmerMiPath(): boolean {
  const line = buildOstinatoLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'zimmer', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'zimmer',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6.5 && mi.justification.includes('[SQ zimmer MI]');
}

function testPassacagliaGceBranch(): boolean {
  const line = buildOstinatoLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: 'weak' as const,
  }));
  const opts: ContrapuntalGceScoringOptions = {
    contrapuntalLinePolicy: true,
    sqVrbId: 'zimmer',
    passacagliaMode: true,
    mesoSpans,
    cadenceTags: [],
  };
  const pg = scorePhraseGrammar(line, opts);
  const mi = scoreMelodicIdentity(line, 'zimmer', opts);
  return (
    pg.justification.includes('[SQ zimmer passacaglia PG]') &&
    mi.justification.includes('[SQ zimmer passacaglia MI]')
  );
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('glass')?.registerCohesionStdevCeilingSt === 18 &&
    getSqVrbGceAdjustments('rota')?.registerCohesionStdevCeilingSt === 19 &&
    getSqVrbGceAdjustments('ravel')?.registerCohesionStdevCeilingSt === 20 &&
    getSqVrbGceAdjustments('morricone')?.registerCohesionStdevCeilingSt === 22 &&
    getSqVrbGceAdjustments('goldsmith')?.registerCohesionStdevCeilingSt === 24 &&
    getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('zimmer');
}

function testUiPickerZimmer(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'zimmer', label: 'Zimmer', enabled: true") &&
    src.indexOf("'zimmer'") > src.indexOf("'glass'")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('zimmer', 'schneider') === 'zimmer';
}

function testBundleWired(): boolean {
  return (
    getVoiceRuleBundle('hans_zimmer').sqVrbProfileId === 'zimmer' &&
    getVoiceRuleBundle('zimmer').sqVrbProfileId === 'zimmer'
  );
}

export function runZimmerFilmStubVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Zimmer SQ VRB — profile loads', testProfileLoads],
    ['Zimmer SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Zimmer SQ VRB — independenceLevel low', () =>
      ZIMMER_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'low'],
    ['Zimmer SQ VRB — registerPolicy dynamically_wide_arc_accumulative', () =>
      ZIMMER_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy ===
      'dynamically_wide_arc_accumulative'],
    [
      'Zimmer SQ VRB — phraseArticulation repeating_ostinato_no_cadence',
      () =>
        ZIMMER_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation ===
        'repeating_ostinato_no_cadence',
    ],
    ['Zimmer SQ VRB — passacaglia sub-mode documented', testPassacagliaSubModeDocumented],
    ['Zimmer SQ VRB — modal aeolian + bVI + aeolian cadence vocabulary', testChordVocabulary],
    ['Zimmer SQ VRB — bestBbStyle schneider secondary brookmeyer', testBestBbStyles],
    ['Zimmer SQ VRB — GCE σ ceiling 26 st', testGceSigma26],
    ['Zimmer SQ VRB — phraseCellBars 4–8', testPhraseCellBarsRange],
    ['Zimmer SQ VRB — authenticCadenceCredit minimal', testMinimalAuthenticCadence],
    ['Zimmer SQ VRB — modalEndingsValid', testModalEndingsValid],
    ['Zimmer SQ VRB — no periodic multiple bonus', testNoPeriodicMultiple],
    ['Zimmer SQ VRB — motifRecurrenceWeight 0.48', testHighMotifRecurrence],
    ['Zimmer SQ VRB — wallToWallPhrasePenalty suppressed', testWallToWallSuppressed],
    ['Zimmer SQ VRB — density accumulation credit', testDensityAccumulationCredit],
    ['Zimmer SQ VRB — submediant + chromatic mediant credits', testSubMediantAndChromaticMediant],
    ['Zimmer SQ VRB — repeating ostinato PG valid', testRepeatingOstinatoPgValid],
    ['Zimmer SQ VRB — ostinato MI path', testZimmerMiPath],
    ['Zimmer SQ VRB — passacaglia GCE branch tags', testPassacagliaGceBranch],
    ['Zimmer SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Zimmer SQ VRB — picker enabled (UI after Glass)', testUiPickerZimmer],
    ['Zimmer SQ VRB — sqLineVrbId routes zimmer', testSqLineRouting],
    ['Zimmer SQ VRB — voiceRuleBundle wired', testBundleWired],
    ['Zimmer SQ VRB — prior VRBs σ unchanged', testPriorVrbsUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runZimmerFilmStubVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
