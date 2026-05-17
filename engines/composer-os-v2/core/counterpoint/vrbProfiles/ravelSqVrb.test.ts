/**
 * Ravel SQ VRB profile — Session 2 Harmonic Voice build verification.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import { scoreMelodicIdentity, scorePhraseGrammar, type ContrapuntalGceScoringOptions } from '../../gce/gceAutoScorers';
import type { MelodicNote } from '../../gce/gce_melody_eval';
import { SQ_TO_BB_SQ_COMPOSER_ENABLED, sqLineVrbIdForSqToBb } from '../sqToBbWorkflowTypes';
import {
  RAVEL_SQ_CHORD_VOCABULARY,
  RAVEL_SQ_CONTRAPUNTAL_LINE_POLICY,
  RAVEL_SQ_VRB_PROFILE,
} from './ravelSqVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('ravel') === RAVEL_SQ_VRB_PROFILE;
}

function testContrapuntalPolicyFields(): boolean {
  const p = RAVEL_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'ravel' &&
    p.independenceLevel === 'moderate' &&
    p.imitationStyle === 'motivic_echo' &&
    p.registerPolicy === 'comfortable_with_climax_leaps' &&
    p.phraseArticulation === 'periodic_cadential'
  );
}

function testChordVocabulary(): boolean {
  const v = RAVEL_SQ_CHORD_VOCABULARY;
  return (
    v.includes('dom13') &&
    v.includes('ii_half_dim7') &&
    v.includes('octatonic_whole_half')
  );
}

function testBbStylesOnBundle(): boolean {
  const ravel = getVoiceRuleBundle('ravel');
  return (
    ravel.bestBbStyle === 'schneider' &&
    ravel.secondaryBbStyle === 'brookmeyer' &&
    ravel.cautionBbStyle === 'basie'
  );
}

function testGceAdjustmentsActive(): boolean {
  const adj = getSqVrbGceAdjustments('ravel');
  return adj != null && adj.registerCohesionStdevCeilingSt === 20;
}

function testRegisterCohesionCeiling20(): boolean {
  const adj = getSqVrbGceAdjustments('ravel');
  if (!adj || adj.registerCohesionStdevCeilingSt !== 20) return false;

  const line: MelodicNote[] = [];
  for (let b = 0; b < 16; b++) {
    line.push({
      midi: 72 + (b % 3),
      bar: Math.floor(b / 4) + 1,
      beat: (b % 4) + 1,
      beats: 1,
      rest: false,
    });
  }
  const mesoSpans = [
    { startBeat: 0, endBeat: 8, cadenceStrength: 'medium' as const },
    { startBeat: 8, endBeat: 16, cadenceStrength: 'strong' as const },
  ];
  const opts: ContrapuntalGceScoringOptions = {
    contrapuntalLinePolicy: true,
    sqVrbId: 'ravel',
    mesoSpans,
    cadenceTags: [],
  };
  const tight = scoreMelodicIdentity(line, 'ravel', opts).score;

  const wideLine: MelodicNote[] = line.map((n, i) => ({
    ...n,
    midi: 60 + (i % 2 === 0 ? 0 : 22),
  }));
  const wideOpts: ContrapuntalGceScoringOptions = { ...opts, sqVrbId: 'bartok' };
  const wideBartok = scoreMelodicIdentity(wideLine, 'bartok', {
    ...wideOpts,
    contrapuntalLinePolicy: true,
    mesoSpans,
    cadenceTags: [],
  }).score;
  const wideRavel = scoreMelodicIdentity(wideLine, 'ravel', opts).score;
  return tight >= 6 && wideRavel <= wideBartok;
}

function testBartokUnchanged(): boolean {
  const bartok = getVoiceRuleBundle('bartok');
  return (
    bartok.contrapuntalLinePolicy?.enabled === true &&
    bartok.contrapuntalLinePolicy?.vrbId !== 'ravel' &&
    bartok.contrapuntalLinePolicy?.preferredImitationTypes?.includes('strict') === true &&
    getSqVrbGceAdjustments('bartok') === undefined
  );
}

function testRavelPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('ravel') && SQ_TO_BB_SQ_COMPOSER_ENABLED.has('bartok');
}

function testUiPickerRavelEnabled(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'ravel', label: 'Ravel', enabled: true") &&
    !src.includes("Ravel — coming soon', enabled: false")
  );
}

function testSqLineVrbRouting(): boolean {
  return sqLineVrbIdForSqToBb('ravel', 'brookmeyer') === 'ravel';
}

function testPhraseGrammarRavelTag(): boolean {
  const line: MelodicNote[] = [];
  for (let i = 0; i < 32; i++) {
    line.push({
      midi: 67 + (i % 5),
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 0.5,
      beats: 0.5,
      rest: false,
    });
  }
  const mesoSpans = Array.from({ length: 8 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'medium' as const,
  }));
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'ravel',
    mesoSpans,
    cadenceTags: [{ positionBars: 32, type: 'modal', strength: 'strong' }],
  });
  return pg.justification.includes('[SQ ravel PG]');
}

export function runRavelSqVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Ravel SQ VRB — profile loads', testProfileLoads],
    ['Ravel SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicyFields],
    ['Ravel SQ VRB — independenceLevel moderate', () => RAVEL_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'moderate'],
    ['Ravel SQ VRB — chord vocabulary dom13 iiø7 octatonic', testChordVocabulary],
    ['Ravel SQ VRB — registerPolicy comfortable_with_climax_leaps', () =>
      RAVEL_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy === 'comfortable_with_climax_leaps'],
    ['Ravel SQ VRB — bestBbStyle schneider', testBbStylesOnBundle],
    ['Ravel SQ VRB — GCE adjustments when vrbId ravel', testGceAdjustmentsActive],
    ['Ravel SQ VRB — MI registerCohesion σ ceiling 20 st', testRegisterCohesionCeiling20],
    ['Ravel SQ VRB — picker enabled (engine)', testRavelPickerEnabled],
    ['Ravel SQ VRB — picker enabled (UI)', testUiPickerRavelEnabled],
    ['Ravel SQ VRB — Bartók still enabled in SQ composer set', () =>
      SQ_TO_BB_SQ_COMPOSER_ENABLED.has('bartok')],
    ['Ravel SQ VRB — sqLineVrbId routes ravel', testSqLineVrbRouting],
    ['Ravel SQ VRB — Bartók behavior unchanged', testBartokUnchanged],
    ['Ravel SQ VRB — PG ravel cadence path', testPhraseGrammarRavelTag],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runRavelSqVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
