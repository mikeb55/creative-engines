/**
 * Phase 6+7 — string ensemble, big band section helpers, guitar voicing, étude (additive suite).
 */

import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import {
  shoutVoicesAreRhythmicUnison,
  shouldForceTuttiDivergence,
  shoutChorusPlan,
} from '../core/composer/bigBandSectionWriter';
import type { RhythmMotifBinding } from '../core/composer/rhythmDnaMotifBinder';
import type { FormSection } from '../core/composer/formController';
import {
  violaClefAttributesSnippet,
  validateViolinFirstPitchOrReject,
  schneiderOctaveDoublingPenalty,
} from '../core/composer/stringEnsemble';
import {
  filterVoicingsByMaxSpan,
  guitarVoicingFromFrets,
  guitarVoicingToTechnicalXmlFragments,
  methenyPlainMaj7CostsMoreThanSharp11,
} from '../core/composer/guitarVoicingEngine';
import {
  defaultEtudeConstraints,
  generateEtudeMidiLine,
  maxMelodicIntervalInEtude,
  allNotesAreChordTones,
} from '../core/composer/etudeGenerator';

function testViolinFirstRejectsAbove103(): boolean {
  const r = validateViolinFirstPitchOrReject(104);
  return r.ok === false;
}

function testSchneiderDoublingPenaltyOutsideShout(): boolean {
  const b = getVoiceRuleBundle('maria_schneider');
  return schneiderOctaveDoublingPenalty(b, 'head', true) > 0;
}

function testSchneiderNoPenaltyOnShoutChorus(): boolean {
  const b = getVoiceRuleBundle('maria_schneider');
  return schneiderOctaveDoublingPenalty(b, 'shout-chorus', true) === 0;
}

function testViolaClefSnippetIsAlto(): boolean {
  const s = violaClefAttributesSnippet();
  return s.includes('<sign>C</sign>') && s.includes('<line>3</line>');
}

function testGuitarSpanOver4Filtered(): boolean {
  const wide = guitarVoicingFromFrets('C', [0, 0, 0, 0, 0, 6]);
  const kept = filterVoicingsByMaxSpan([wide], 4);
  return kept.length === 0;
}

function testMethenyPlainMaj7CostsMoreThanSharp11(): boolean {
  const v = guitarVoicingFromFrets('C', [0, 3, 2, 0, 1, 0]);
  return methenyPlainMaj7CostsMoreThanSharp11(v);
}

function testGuitarTechnicalTabFragments(): boolean {
  const v = guitarVoicingFromFrets('G', [3, 2, 0, 0, 0, 3]);
  const xml = guitarVoicingToTechnicalXmlFragments(v);
  return (
    xml.includes('<technical>') &&
    xml.includes('<string>') &&
    xml.includes('<fret>') &&
    xml.includes('</technical>')
  );
}

function testEtudeScalesMaxStepTwo(): boolean {
  const c = defaultEtudeConstraints('violin_I');
  c.technicalFocus = 'scales';
  c.bars = 4;
  const line = generateEtudeMidiLine(null, [0, 4, 7], c, 424242);
  return maxMelodicIntervalInEtude(line) <= 2;
}

function testEtudeArpeggiosChordTonesOnly(): boolean {
  const c = defaultEtudeConstraints('cello');
  c.technicalFocus = 'arpeggios';
  c.bars = 3;
  const line = generateEtudeMidiLine(null, [0, 4, 7], c, 777001);
  return allNotesAreChordTones(line, 0, [0, 4, 7]);
}

function testShoutRhythmicUnison(): boolean {
  return (
    shoutVoicesAreRhythmicUnison([
      [4, 4, 4, 4],
      [4, 4, 4, 4],
    ]) === true
  );
}

function testTuttiDivergenceWhenCollisionPersists(): boolean {
  return shouldForceTuttiDivergence([1, 1, 0]) === true;
}

function testShoutChorusPlanMarksUnison(): boolean {
  const b = getVoiceRuleBundle('gil_evans');
  const fs: FormSection = {
    sceneId: 'shout-a',
    role: 'shout-chorus',
    barRange: [0, 8],
    targetTensionStart: 0.9,
    targetTensionEnd: 1,
    motifRecallRequired: false,
  };
  const binding = { allowedRhythmCells: ['rd_shout_grid'] } as RhythmMotifBinding;
  const plan = shoutChorusPlan(b, binding, fs);
  return plan.kind === 'shout-chorus' && plan.rhythmicUnison === true;
}

export function runPhase67EnsembleGuitarEtudeTests(): { name: string; ok: boolean }[] {
  return [
    ['Phase 6+7 — violin I rejects MIDI > 103', testViolinFirstRejectsAbove103],
    ['Phase 6+7 — Schneider octave-double penalty outside shout', testSchneiderDoublingPenaltyOutsideShout],
    ['Phase 6+7 — Schneider no doubling penalty on shout-chorus', testSchneiderNoPenaltyOnShoutChorus],
    ['Phase 6+7 — viola MusicXML clef is alto (C3)', testViolaClefSnippetIsAlto],
    ['Phase 6+7 — guitar voicing span > 4 rejected from pool', testGuitarSpanOver4Filtered],
    ['Phase 6+7 — Metheny bundle: plain maj7 scores higher cost than maj7#11', testMethenyPlainMaj7CostsMoreThanSharp11],
    ['Phase 6+7 — guitar tab XML has technical string+fret', testGuitarTechnicalTabFragments],
    ['Phase 6+7 — étude scales: consecutive intervals ≤ 2 semitones', testEtudeScalesMaxStepTwo],
    ['Phase 6+7 — étude arpeggios: notes match chord tones', testEtudeArpeggiosChordTonesOnly],
    ['Phase 6+7 — shout chorus: rhythmic unison helper', testShoutRhythmicUnison],
    ['Phase 6+7 — tutti: persistent collision triggers divergence', testTuttiDivergenceWhenCollisionPersists],
    ['Phase 6+7 — shout plan ties rhythmic unison flag', testShoutChorusPlanMarksUnison],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
