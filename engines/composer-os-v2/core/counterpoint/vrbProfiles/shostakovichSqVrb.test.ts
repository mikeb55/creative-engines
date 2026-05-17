/**
 * Shostakovich SQ VRB — Session Harmonic Voice verification.
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
  SHOSTAKOVICH_SQ_CHORD_VOCABULARY,
  SHOSTAKOVICH_SQ_CONTRAPUNTAL_LINE_POLICY,
  SHOSTAKOVICH_SQ_GCE_SCORER_ADJUSTMENTS,
  SHOSTAKOVICH_SQ_VRB_PROFILE,
} from './shostakovichSqVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('shostakovich') === SHOSTAKOVICH_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = SHOSTAKOVICH_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'shostakovich' &&
    p.independenceLevel === 'moderate' &&
    p.registerPolicy === 'low_biased_extreme_punctuation_spikes' &&
    p.phraseArticulation === 'asymmetric_cell_non_resolving'
  );
}

function testChordVocabulary(): boolean {
  const v = SHOSTAKOVICH_SQ_CHORD_VOCABULARY;
  return (
    v.includes('chromatic_mediants') &&
    v.includes('tritone_dyad_anchor') &&
    v.includes('bass_drone_fifth') &&
    v.includes('ii_half_dim7')
  );
}

function testBestBbStyles(): boolean {
  const b = getVoiceRuleBundle('shostakovich');
  return b.bestBbStyle === 'mingus' && b.secondaryBbStyle === 'brookmeyer';
}

function testGceSigma28(): boolean {
  return getSqVrbGceAdjustments('shostakovich')?.registerCohesionStdevCeilingSt === 28;
}

function testSoftCeiling32(): boolean {
  return getSqVrbGceAdjustments('shostakovich')?.registerCohesionSoftCeilingSt === 32;
}

function testPhraseCellBarsRange(): boolean {
  const adj = getSqVrbGceAdjustments('shostakovich');
  return adj?.phraseCellBarsMin === 2 && adj?.phraseCellBarsMax === 5;
}

function testNoAuthenticCadenceCredit(): boolean {
  return SHOSTAKOVICH_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit === undefined;
}

function testModalEndingsValid(): boolean {
  return SHOSTAKOVICH_SQ_GCE_SCORER_ADJUSTMENTS.modalEndingsValid === true;
}

function testThirdRelationCredit(): boolean {
  return (SHOSTAKOVICH_SQ_GCE_SCORER_ADJUSTMENTS.thirdRelationCredit ?? 0) >= 0.1;
}

function testTritoneAxisCredit(): boolean {
  return (SHOSTAKOVICH_SQ_GCE_SCORER_ADJUSTMENTS.tritoneAxisCredit ?? 0) >= 0.1;
}

function testHighMotifRecurrenceWeight(): boolean {
  return (SHOSTAKOVICH_SQ_GCE_SCORER_ADJUSTMENTS.motifRecurrenceWeight ?? 0) >= 0.44;
}

function buildAsymmetricCellLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 60;
  const steps = [1, 2, 3, 1, -2, 1, 4, 6, -1, 2, 3, 1, 2, -3, 1, 2];
  for (let i = 0; i < 16; i++) {
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

function buildStrettoRepeatLine(): MelodicNote[] {
  const motif = [60, 61, 58, 59];
  const line: MelodicNote[] = [];
  for (let i = 0; i < 48; i++) {
    line.push({
      midi: motif[i % motif.length]! + (i >= 24 ? 12 : 0),
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
  }
  return line;
}

function buildExtremeRegisterLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  const motif = [40, 41, 38, 39, 60, 61, 58, 59, 84, 85, 82, 83, 91, 90, 88, 87];
  for (let i = 0; i < motif.length; i++) {
    line.push({
      midi: motif[i]!,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
  }
  return line;
}

function testNonResolvingPgValid(): boolean {
  const line = buildAsymmetricCellLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 8, cadenceStrength: 'weak' as const },
    { startBeat: 8, endBeat: 16, cadenceStrength: 'weak' as const },
  ];
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'shostakovich',
    mesoSpans,
    cadenceTags: [],
  });
  return pg.score >= 6 && pg.justification.includes('[SQ shostakovich PG]');
}

function testExtremeRegisterMiNoHardFail(): boolean {
  const line = buildExtremeRegisterLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 6, cadenceStrength: 'weak' as const },
    { startBeat: 6, endBeat: 12, cadenceStrength: 'medium' as const },
  ];
  const mi = scoreMelodicIdentity(line, 'shostakovich', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'shostakovich',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6 && !mi.justification.includes('HARD FAIL') && mi.justification.includes('[SQ shostakovich MI]');
}

function testPassacagliaPgNoPedalPenalty(): boolean {
  const line = buildStrettoRepeatLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 12,
    endBeat: (i + 1) * 12,
    cadenceStrength: 'weak' as const,
  }));
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'shostakovich',
    mesoSpans,
    cadenceTags: [{ positionBars: 48, type: 'modal', strength: 'weak' }],
  });
  return pg.score >= 5.5 && pg.justification.includes('[SQ shostakovich PG]');
}

function testStrettoMotifMiPath(): boolean {
  const line = buildStrettoRepeatLine();
  const mesoSpans = Array.from({ length: 6 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'shostakovich', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'shostakovich',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6.5 && mi.justification.includes('[SQ shostakovich MI]');
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('glass')?.registerCohesionStdevCeilingSt === 18 &&
    getSqVrbGceAdjustments('rota')?.registerCohesionStdevCeilingSt === 19 &&
    getSqVrbGceAdjustments('ravel')?.registerCohesionStdevCeilingSt === 20 &&
    getSqVrbGceAdjustments('badalamenti')?.registerCohesionStdevCeilingSt === 21 &&
    getSqVrbGceAdjustments('morricone')?.registerCohesionStdevCeilingSt === 22 &&
    getSqVrbGceAdjustments('goldsmith')?.registerCohesionStdevCeilingSt === 24 &&
    getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('zimmer')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('shostakovich');
}

function testUiPickerShostakovich(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'shostakovich', label: 'Shostakovich', enabled: true") &&
    !src.includes("Shostakovich — coming soon")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('shostakovich', 'mingus') === 'shostakovich';
}

function testBundleWired(): boolean {
  return getVoiceRuleBundle('dmitri_shostakovich').sqVrbProfileId === 'shostakovich';
}

export function runShostakovichSqVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Shostakovich SQ VRB — profile loads', testProfileLoads],
    ['Shostakovich SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Shostakovich SQ VRB — independenceLevel moderate', () =>
      SHOSTAKOVICH_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'moderate'],
    [
      'Shostakovich SQ VRB — registerPolicy low_biased_extreme_punctuation_spikes',
      () =>
        SHOSTAKOVICH_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy ===
        'low_biased_extreme_punctuation_spikes',
    ],
    [
      'Shostakovich SQ VRB — phraseArticulation asymmetric_cell_non_resolving',
      () =>
        SHOSTAKOVICH_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation ===
        'asymmetric_cell_non_resolving',
    ],
    ['Shostakovich SQ VRB — chord vocabulary mediants tritone pedal', testChordVocabulary],
    ['Shostakovich SQ VRB — bestBbStyle mingus secondary brookmeyer', testBestBbStyles],
    ['Shostakovich SQ VRB — GCE σ ceiling 28 st', testGceSigma28],
    ['Shostakovich SQ VRB — soft σ warning above 32 st', testSoftCeiling32],
    ['Shostakovich SQ VRB — phraseCellBars 2–5', testPhraseCellBarsRange],
    ['Shostakovich SQ VRB — no authenticCadenceCredit', testNoAuthenticCadenceCredit],
    ['Shostakovich SQ VRB — modalEndingsValid', testModalEndingsValid],
    ['Shostakovich SQ VRB — thirdRelationCredit', testThirdRelationCredit],
    ['Shostakovich SQ VRB — tritoneAxisCredit', testTritoneAxisCredit],
    ['Shostakovich SQ VRB — high motifRecurrenceWeight', testHighMotifRecurrenceWeight],
    ['Shostakovich SQ VRB — non-resolving PG valid', testNonResolvingPgValid],
    ['Shostakovich SQ VRB — extreme register spike no hard-fail', testExtremeRegisterMiNoHardFail],
    ['Shostakovich SQ VRB — passacaglia pedal PG valid', testPassacagliaPgNoPedalPenalty],
    ['Shostakovich SQ VRB — stretto motif MI path', testStrettoMotifMiPath],
    ['Shostakovich SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Shostakovich SQ VRB — picker enabled (UI)', testUiPickerShostakovich],
    ['Shostakovich SQ VRB — sqLineVrbId routes shostakovich', testSqLineRouting],
    ['Shostakovich SQ VRB — voiceRuleBundle wired', testBundleWired],
    ['Shostakovich SQ VRB — prior VRBs σ unchanged', testPriorVrbsUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runShostakovichSqVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
