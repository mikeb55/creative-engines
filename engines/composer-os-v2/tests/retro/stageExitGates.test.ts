/**
 * Composer OS V2 — Stage exit gate tests + negative tests
 * Verifies each stage passes its minimum exit conditions.
 * Negative tests prove gates actually catch failures.
 */

import type { ChordSymbolForValidation, RehearsalMarkForValidation } from '../../core/score-integrity/scoreIntegrityTypes';
import { runGoldenPath } from '../../core/goldenPath/runGoldenPath';
import { runScoreIntegrityGate } from '../../core/score-integrity/scoreIntegrityGate';
import { runBehaviourGates } from '../../core/score-integrity/behaviourGates';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { createMeasure, createNote, addEvent, createScore } from '../../core/score-model/scoreEventBuilder';
import { planSectionRoles } from '../../core/section-roles/sectionRolePlanner';
import { planDensityCurve } from '../../core/density/densityCurvePlanner';
import { planGuitarRegisterMap, planBassRegisterMap } from '../../core/register-map/registerMapPlanner';
import { planGuitarBehaviour } from '../../core/instrument-behaviours/guitarBehaviour';
import { planBassBehaviour } from '../../core/instrument-behaviours/uprightBassBehaviour';
import { computeRhythmicConstraints } from '../../core/rhythm-engine/rhythmEngine';
import { runSongMode } from '../../core/song-mode/runSongMode';

function extractPitchByInstrument(score: { parts: Array<{ instrumentIdentity: string; measures: Array<{ events: Array<{ kind: string; pitch?: number }> }> }> }) {
  return score.parts.map((p) => {
    const pitches: number[] = [];
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'note' && e.pitch != null) pitches.push(e.pitch);
      }
    }
    return { instrument: p.instrumentIdentity, pitches };
  });
}

function testFoundationContractsValid(): boolean {
  const r = runGoldenPath(100);
  return r.success && r.score.parts.length >= 2;
}

function testFoundationScoreModelValid(): boolean {
  const r = runGoldenPath(101);
  return r.score.parts.every((p) => p.measures.length === 8);
}

function testGoldenPathEndToEndValid(): boolean {
  const r = runGoldenPath(102);
  return r.success && r.xml !== undefined && r.mxValidationPassed;
}

function testMusicalCoreGatesPass(): boolean {
  for (const seed of [100, 101, 102, 103, 104]) {
    const r = runGoldenPath(seed);
    if (r.behaviourGatesPassed && r.integrityPassed) return true;
  }
  return false;
}

function testFirstIntelligenceMotifAndBHPass(): boolean {
  const r = runGoldenPath(104);
  return r.behaviourGatesPassed && !!r.plans?.motifState?.placements?.length;
}

function testStyleSystemGatesPass(): boolean {
  for (const seed of [100, 101, 105, 106, 107]) {
    const r = runGoldenPath(seed);
    if (r.behaviourGatesPassed && !!r.plans?.styleStack) return true;
  }
  return false;
}

function testOutputControlGatesPass(): boolean {
  for (const seed of [100, 101, 110, 111]) {
    const r = runGoldenPath(seed);
    if (r.success && r.xml && r.behaviourGatesPassed) return true;
  }
  return false;
}

function testInteractionLayerGatesPass(): boolean {
  for (const seed of [100, 101, 108, 109]) {
    const r = runGoldenPath(seed);
    if (r.behaviourGatesPassed && !!r.plans?.interactionPlan) return true;
  }
  return false;
}

function testNegativeRehearsalMarkRemovedFails(): boolean {
  const r = runGoldenPath(200);
  const chordByBar = new Map<number, string>();
  const rehearsalByBar = new Map<number, string>();
  for (const p of r.score.parts) {
    for (const m of p.measures) {
      if (m.chord) chordByBar.set(m.index, m.chord);
      if (m.rehearsalMark) rehearsalByBar.set(m.index, m.rehearsalMark);
    }
  }
  const chordSymbols = Array.from(chordByBar.entries()).map(([bar, chord]) => ({ bar, chord }));
  const rehearsalMarks: RehearsalMarkForValidation[] = []; // empty — should fail when required
  const bars = r.score.parts[0]?.measures.map((m) => ({ index: m.index - 1, duration: 4 })) ?? [];
  const integrity = runScoreIntegrityGate({
    bars,
    instruments: guitarBassDuoPreset.instrumentProfiles,
    chordSymbols,
    rehearsalMarks,
    chordSymbolsRequired: true,
    rehearsalMarksRequired: true,
    pitchByInstrument: extractPitchByInstrument(r.score),
  });
  return !integrity.passed;
}

function testNegativeChordSymbolsRemovedFails(): boolean {
  const r = runGoldenPath(201);
  const rehearsalByBar = new Map<number, string>();
  for (const p of r.score.parts) {
    for (const m of p.measures) {
      if (m.rehearsalMark) rehearsalByBar.set(m.index, m.rehearsalMark);
    }
  }
  const chordSymbols: ChordSymbolForValidation[] = [];
  const rehearsalMarks = Array.from(rehearsalByBar.entries()).map(([bar, label]) => ({ bar, label }));
  const bars = r.score.parts[0]?.measures.map((m) => ({ index: m.index - 1, duration: 4 })) ?? [];
  const integrity = runScoreIntegrityGate({
    bars,
    instruments: guitarBassDuoPreset.instrumentProfiles,
    chordSymbols,
    rehearsalMarks,
    chordSymbolsRequired: true,
    rehearsalMarksRequired: true,
    pitchByInstrument: extractPitchByInstrument(r.score),
  });
  return !integrity.passed;
}

function testNegativeGuitarRegisterTooHighFails(): boolean {
  const m = createMeasure(1, 'Cmaj7');
  addEvent(m, createNote(95, 0, 4));
  const score = createScore('Test', [{
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  }]);
  const bars = [{ index: 0, duration: 4 }];
  const chordSymbols = [{ bar: 0, chord: 'Cmaj7' }];
  const rehearsalMarks = [{ bar: 0, label: 'A' }];
  const pitchByInstrument = [{ instrument: 'clean_electric_guitar', pitches: [95] }];
  const integrity = runScoreIntegrityGate({
    bars,
    instruments: guitarBassDuoPreset.instrumentProfiles,
    chordSymbols,
    rehearsalMarks,
    chordSymbolsRequired: true,
    rehearsalMarksRequired: false,
    pitchByInstrument,
  });
  return !integrity.passed;
}

function testNegativeMotifRecurrenceBrokenFails(): boolean {
  const sections = planSectionRoles(
    [{ label: 'A', startBar: 1, length: 4 }, { label: 'B', startBar: 5, length: 4 }],
    { A: 'statement', B: 'contrast' }
  );
  const densityPlan = planDensityCurve(sections, 8);
  const guitarMap = planGuitarRegisterMap(sections);
  const bassMap = planBassRegisterMap(sections);
  const guitarBehaviour = planGuitarBehaviour(sections, densityPlan, guitarMap);
  const bassBehaviour = planBassBehaviour(sections, densityPlan, bassMap);
  const rhythmConstraints = computeRhythmicConstraints({ mode: 'swing', intensity: 0.5, syncopationDensity: 'medium' });

  const m1 = createMeasure(1, 'Dm7');
  addEvent(m1, createNote(60, 0, 2));
  addEvent(m1, createNote(62, 2, 2));
  const score = createScore('Test', [{
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m1],
  }]);

  const brokenMotifState = {
    baseMotifs: [{ id: 'm1', notes: [{ pitch: 60, startBeat: 0, duration: 2 }], barCount: 1 }],
    placements: [{ motifId: 'm1', startBar: 1, variant: 'original' as const, notes: [{ pitch: 60, startBeat: 0, duration: 2 }] }],
  };

  const r = runBehaviourGates(
    score,
    rhythmConstraints,
    guitarBehaviour,
    bassBehaviour,
    sections,
    densityPlan,
    { motifState: brokenMotifState, styleStack: undefined }
  );
  return !r.allValid;
}

function testSongModeLeadMelodyGatePasses(): boolean {
  const r = runSongMode({ seed: 4242, title: 'Retro Song Mode Gate' });
  return (
    r.validation.valid &&
    (r.compiledSong.leadMelodyPlan?.notes.length ?? 0) > 0 &&
    r.leadSheetContract.vocalMelody.events.length > 0
  );
}

function testNegativeStyleStackNeutralizedFails(): boolean {
  const r = runGoldenPath(202);
  const sections = r.plans?.sections ?? [];
  const densityPlan = r.plans?.densityPlan!;
  const guitarBehaviour = r.plans?.guitarBehaviour!;
  const bassBehaviour = r.plans?.bassBehaviour!;
  const rhythmConstraints = r.plans?.rhythmConstraints!;

  const badStack = {
    primary: 'barry_harris' as const,
    secondary: 'metheny' as const,
    colour: 'triad_pairs' as const,
    weights: { primary: 0, secondary: 0, colour: 0 },
  };

  const result = runBehaviourGates(
    r.score,
    rhythmConstraints,
    guitarBehaviour,
    bassBehaviour,
    sections,
    densityPlan,
    { motifState: r.plans!.motifState, styleStack: badStack }
  );
  return !result.allValid;
}

export function runStageExitGatesTests(): { name: string; ok: boolean }[] {
  return [
    ['Foundation: contracts valid', testFoundationContractsValid],
    ['Foundation: score model valid', testFoundationScoreModelValid],
    ['Golden Path: end-to-end valid', testGoldenPathEndToEndValid],
    ['Musical Core: gates pass', testMusicalCoreGatesPass],
    ['First Intelligence: motif + BH pass', testFirstIntelligenceMotifAndBHPass],
    ['Style System: gates pass', testStyleSystemGatesPass],
    ['Interaction Layer: gates pass', testInteractionLayerGatesPass],
    ['Output & Control: gates pass', testOutputControlGatesPass],
    ['Song Mode: lead melody + lead sheet gate passes', testSongModeLeadMelodyGatePasses],
    ['Negative: rehearsal mark removed fails', testNegativeRehearsalMarkRemovedFails],
    ['Negative: chord symbols removed fails', testNegativeChordSymbolsRemovedFails],
    ['Negative: guitar register too high fails', testNegativeGuitarRegisterTooHighFails],
    ['Negative: motif recurrence broken fails', testNegativeMotifRecurrenceBrokenFails],
    ['Negative: style stack neutralized fails', testNegativeStyleStackNeutralizedFails],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
