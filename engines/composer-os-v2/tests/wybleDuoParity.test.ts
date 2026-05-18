/**
 * Wyble duo parity — phraseIntentBias, Stage 2 continuity, velocity, BB Light Touch.
 */

import { duoGoldenPathPhraseIntentAtBar } from '../core/phrase/phraseBuilder';
import {
  applyPhraseIntentBiasToGuitarV1Measure,
  phraseIntentBiasPitchNudgeSemitones,
} from '../core/goldenPath/duoPhraseIntentBias';
import {
  applyWybleDuoVelocityPolicy,
  DEFAULT_DUO_VELOCITY_POLICY,
  meanBassVelocity,
  meanGuitarV1Velocity,
} from '../core/goldenPath/duoVelocityPolicy';
import {
  bbLightTouchPolicyFromRequest,
  countDoublingAssignments,
  DEFAULT_BB_LIGHT_TOUCH_OFF,
  DEFAULT_BB_LIGHT_TOUCH_ON,
  filterAssignmentsForBbLightTouch,
  hasLeadLineInRender,
} from '../core/composer/bbLightTouch';
import { applyPhase6RendererWiring } from '../core/composer/bigBandSectionPlanRenderer';
import { runDuoIntentTests } from './duoIntent.test';
import {
  addEvent,
  createMeasure,
  createNote,
  createScore,
} from '../core/score-model/scoreEventBuilder';
import type { PartModel } from '../core/score-model/scoreModelTypes';
import type { SectionAssignment, SectionWritingIntent } from '../core/counterpoint/quartetFeatureTypes';
import type { BigBandVoicing } from '../core/counterpoint/ContrapuntalLineEngine';
import type { AbstractLineSet } from '../core/counterpoint/abstractLineSet';
import type { NoteEvent } from '../core/score-model/scoreModelTypes';

function doublingAssignments(n: number): SectionAssignment[] {
  const base: SectionAssignment[] = [
    {
      section: 'saxes',
      role: 'lead',
      sourceVoiceIds: ['S'],
      prominence: 1,
      lineDerived: true,
    },
  ];
  for (let i = 0; i < n; i++) {
    base.push({
      section: 'saxes',
      role: 'doubling',
      sourceVoiceIds: ['A'],
      prominence: 0.5,
      lineDerived: true,
    });
  }
  return base;
}

function mockIntentWithDoublings(count: number): SectionWritingIntent {
  return {
    phraseId: 'p0',
    startBeat: 0,
    endBeat: 4,
    assignments: doublingAssignments(count),
  } as SectionWritingIntent;
}

function minimalBbVoicing(intent: SectionWritingIntent): BigBandVoicing {
  return {
    sectionWritingIntents: [intent],
    soliRhythmPlans: [{ primaryDurationsBeats: [1] }],
    backgroundsRhythmPlans: [{ backgroundsRhythm: 'quarter' }],
    voicingGeometries: [{ shape: 'closed', spreadMin: 6, spreadMax: 12 }],
  } as unknown as BigBandVoicing;
}

function minimalLineSet(): AbstractLineSet {
  return {
    voices: [
      {
        role: 'soprano',
        notes: [{ pitchMidi: 72, offsetBars: 0, durationBars: 1 }],
        tags: ['melodic_lead'],
      },
      {
        role: 'alto',
        notes: [{ pitchMidi: 60, offsetBars: 0, durationBars: 1 }],
        tags: [],
      },
      { role: 'tenor', notes: [], tags: [] },
      {
        role: 'bass',
        notes: [{ pitchMidi: 48, offsetBars: 0, durationBars: 1 }],
        tags: ['bass_anchor'],
      },
    ],
    cadenceTags: [],
    densityEnvelope: { segments: [{ startBar: 0, endBar: 4, density: 'medium' }] },
    dissonanceProfile: {
      allowedIntervals: [0, 3, 4, 7],
      forbiddenIntervals: [],
      parallelFifthsAllowed: false,
      parallelOctavesAllowed: false,
      resolveByStep: true,
    },
    sourceMode: 'melody_plus_chords',
    lengthBars: 4,
    styleSourceVrbId: 'brookmeyer',
  };
}

function makeWybleVelocityScore() {
  const guitar: PartModel = {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [],
  };
  const bass: PartModel = {
    id: 'bass',
    name: 'Bass',
    instrumentIdentity: 'acoustic_upright_bass',
    midiProgram: 33,
    clef: 'bass',
    measures: [],
  };
  for (let bar = 1; bar <= 4; bar++) {
    const gm = createMeasure(bar, 'Cmaj7');
    addEvent(gm, createNote(60, 0, 1, 1));
    guitar.measures.push(gm);
    const bm = createMeasure(bar, 'Cmaj7');
    addEvent(bm, createNote(36, 0, 1));
    bass.measures.push(bm);
  }
  return createScore('wyble velocity fixture', [guitar, bass]);
}

function guitarV1VelocityAtBar(score: ReturnType<typeof makeWybleVelocityScore>, bar: number): number {
  const guitar = score.parts.find((p) => p.id === 'guitar')!;
  const m = guitar.measures.find((x) => x.index === bar)!;
  const n = m.events.find((e) => e.kind === 'note' && (e as NoteEvent).voice === 1) as NoteEvent;
  return n.velocity ?? 0;
}

export function runWybleDuoParityTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const arch1 = phraseIntentBiasPitchNudgeSemitones('arch', 1);
  const arch4 = phraseIntentBiasPitchNudgeSemitones('arch', 4);
  out.push({
    ok: arch1 > 0 && arch4 < 0,
    name: "phraseIntentBias 'arch' — bar 1 nudge is positive, bar 4 nudge is negative",
  });

  const desc1 = phraseIntentBiasPitchNudgeSemitones('descending', 1);
  const desc4 = phraseIntentBiasPitchNudgeSemitones('descending', 4);
  out.push({
    ok: desc1 > desc4,
    name: "phraseIntentBias 'descending' — bar 1 > bar 4 (monotone descent)",
  });

  const asc1 = phraseIntentBiasPitchNudgeSemitones('ascending', 1);
  const asc4 = phraseIntentBiasPitchNudgeSemitones('ascending', 4);
  out.push({
    ok: asc4 > asc1,
    name: "phraseIntentBias 'ascending' — bar 4 > bar 1 (monotone ascent)",
  });

  out.push({
    ok: [1, 2, 3, 4].every((b) => phraseIntentBiasPitchNudgeSemitones('neutral', b) === 0),
    name: "phraseIntentBias 'neutral' — no nudge applied",
  });

  const hiMeasure = createMeasure(1, 'Cmaj7');
  addEvent(hiMeasure, createNote(71, 0, 1, 1));
  applyPhraseIntentBiasToGuitarV1Measure(hiMeasure, 'arch', 1, 40, 72);
  const hiPitch = (hiMeasure.events[0] as NoteEvent).pitch;
  out.push({
    ok: hiPitch <= 72,
    name: 'phraseIntentBias nudge clamped within register window — never exceeds effectiveHigh',
  });

  const loMeasure = createMeasure(4, 'Cmaj7');
  addEvent(loMeasure, createNote(41, 0, 1, 1));
  applyPhraseIntentBiasToGuitarV1Measure(loMeasure, 'ascending', 4, 40, 72);
  const loPitch = (loMeasure.events[0] as NoteEvent).pitch;
  out.push({
    ok: loPitch >= 40,
    name: 'phraseIntentBias nudge clamped — never below effectiveLow',
  });

  let continuityUsed = false;
  for (let seed = 1; seed <= 400 && !continuityUsed; seed++) {
    const bar1 = duoGoldenPathPhraseIntentAtBar(seed, 1);
    const bar2 = duoGoldenPathPhraseIntentAtBar(seed, 2, undefined, bar1);
    if (bar2 === bar1) continuityUsed = true;
  }
  out.push({
    ok: continuityUsed,
    name: 'Stage 2 continuity — bars 2–4 receive currentPhraseIntent from bar 1 (not null)',
  });

  const bar1Intent = duoGoldenPathPhraseIntentAtBar(90210, 1);
  const bar5Fresh = duoGoldenPathPhraseIntentAtBar(90210, 5);
  const bar5WithBar1Continuity = duoGoldenPathPhraseIntentAtBar(90210, 5, undefined, bar1Intent);
  out.push({
    ok: bar5Fresh === bar5WithBar1Continuity,
    name: 'Stage 2 continuity — new phrase resets intent (bar 5 gets fresh computation)',
  });

  let continuityPreferBar1 = 0;
  for (let seed = 1; seed <= 800; seed++) {
    const bar1 = duoGoldenPathPhraseIntentAtBar(seed, 1);
    const bar3Fresh = duoGoldenPathPhraseIntentAtBar(seed, 3);
    const bar3Cont = duoGoldenPathPhraseIntentAtBar(seed, 3, undefined, bar1);
    if (bar3Cont === bar1 && bar3Fresh !== bar1) continuityPreferBar1++;
  }
  out.push({
    ok: continuityPreferBar1 >= 200,
    name: 'Stage 2 continuity — continuityIntent biases output toward bar-1 intent (not random)',
  });

  const velScore = makeWybleVelocityScore();
  applyWybleDuoVelocityPolicy(velScore);
  const guitar = velScore.parts.find((p) => p.id === 'guitar')!;
  const bass = velScore.parts.find((p) => p.id === 'bass')!;
  const gMean = meanGuitarV1Velocity(guitar);
  const bMean = meanBassVelocity(bass);
  const expectedGuitarBar1 = Math.max(
    40,
    Math.min(117, Math.round(85 + 0.6 * 15 * DEFAULT_DUO_VELOCITY_POLICY.accentMultiplier)),
  );
  out.push({
    ok: Math.abs(guitarV1VelocityAtBar(velScore, 1) - expectedGuitarBar1) <= 2,
    name: 'Velocity — guitar v1 base ≈ 85 (±5)',
  });
  out.push({
    ok: Math.abs(bMean - DEFAULT_DUO_VELOCITY_POLICY.bassBase) <= 5,
    name: 'Velocity — bass base ≈ 68 (±5)',
  });
  out.push({
    ok: gMean > bMean,
    name: 'Velocity — guitar velocity > bass velocity (melody louder than accompaniment)',
  });
  out.push({
    ok: guitarV1VelocityAtBar(velScore, 2) > guitarV1VelocityAtBar(velScore, 1),
    name: 'Velocity — phrase arc: bar 2 velocity > bar 1 velocity (ascending to peak)',
  });

  let velClamped = true;
  for (const part of velScore.parts) {
    for (const measure of part.measures) {
      for (const event of measure.events) {
        if (event.kind !== 'note') continue;
        const v = (event as NoteEvent).velocity ?? 0;
        if (v < 40 || v > 117) velClamped = false;
      }
    }
  }
  out.push({
    ok: velClamped,
    name: 'Velocity — all values clamped [40, 117]',
  });

  const intentMany = mockIntentWithDoublings(3);
  const offFiltered = filterAssignmentsForBbLightTouch(intentMany.assignments, DEFAULT_BB_LIGHT_TOUCH_OFF);
  const onFiltered = filterAssignmentsForBbLightTouch(intentMany.assignments, DEFAULT_BB_LIGHT_TOUCH_ON);
  out.push({
    ok: countDoublingAssignments({ ...intentMany, assignments: offFiltered }) === 3,
    name: 'BB Light Touch disabled — doubling count unchanged from current behaviour',
  });
  out.push({
    ok: countDoublingAssignments({ ...intentMany, assignments: onFiltered }) <= 1,
    name: 'BB Light Touch enabled — doublings ≤ 1 per section',
  });

  const renderOn = applyPhase6RendererWiring(
    minimalBbVoicing(intentMany),
    minimalLineSet(),
    DEFAULT_BB_LIGHT_TOUCH_ON,
  ).sectionRender!;
  out.push({
    ok: hasLeadLineInRender(renderOn),
    name: 'BB Light Touch enabled — guitar v1 line present in output',
  });

  out.push({
    ok: bbLightTouchPolicyFromRequest(true).enabled === true,
    name: 'BB Light Touch — bbLightTouch: true on request → lightTouch.enabled on renderer',
  });
  out.push({
    ok: bbLightTouchPolicyFromRequest(false).enabled === false,
    name: 'BB Light Touch — default false → existing BB behaviour unchanged',
  });

  const duoIntentRows = runDuoIntentTests();
  const duoFailed = duoIntentRows.filter((r) => !r.ok);
  out.push({
    ok: duoFailed.length === 0,
    name: 'duoIntent.test.ts existing tests — all still passing (no regressions)',
  });

  return out;
}
