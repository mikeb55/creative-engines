import { createMeasure } from '../core/score-model/scoreEventBuilder';
import { emitGuitarPhraseBar } from '../core/goldenPath/guitarPhraseAuthority';
import {
  SLONIMSKY_PATTERNS,
  generateSlonimskyPattern,
  interpolateSlonimskyPattern,
  mapDuoPhraseIntentToSlonimskyContext,
  mapDuoPhraseIntentToSlonimskyPhraseIntent,
  selectSlonimskyPattern,
  type SlonimskyContext,
  type SlonimskyNote,
} from '../core/slonimsky/slonimskyEngine';
import { getPatternsBySection } from '../core/slonimsky/thesaurusRegistry';
import type { MeasureModel, NoteEvent } from '../core/score-model/scoreModelTypes';

/** V1 core patterns — interval DNA must match research spec (order follows SLONIMSKY_PATTERNS ids). */
const V1_INTERVAL_DNA: Record<string, number[]> = {
  p_minorThirdCycle: [3, 3, 3],
  p_majorThirdCycle: [4, 4],
  p_tritonePole: [6, -6],
  p_wholeTone: [2, 2, 2],
  p_asymCell123: [1, 2, 3],
  p_chromaticInterp: [1, 1, 1],
  p_expanding: [1, 2, 3, 4],
  p_contracting: [4, 3, 2, 1],
};

export function runSlonimskyEngineTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  for (const p of SLONIMSKY_PATTERNS) {
    const expected = V1_INTERVAL_DNA[p.id];
    out.push({
      ok: expected !== undefined && p.intervals.every((iv, i) => iv === expected[i]),
      name: `V1 pattern ${p.id} intervals match spec`,
    });
  }

  out.push({
    ok: SLONIMSKY_PATTERNS.find((p) => p.id === 'p_chromaticInterp')?.symmetryType === 'equalDivision',
    name: 'chromatic interpolation pattern uses equalDivision symmetry',
  });

  const baseCtx: SlonimskyContext = {
    keyPc: 0,
    chordType: 'dominant',
    functionalStrength: 'medium',
    allowedOutsideLevel: 2,
    phraseIntent: 'build',
    basePitch: 62,
    maxBeats: 4,
  };

  const patBuild = selectSlonimskyPattern({ ...baseCtx, phraseIntent: 'build' }, 100);
  out.push({
    ok: patBuild?.id === 'p_expanding' || patBuild?.id === 'p_chromaticInterp',
    name: 'selectSlonimskyPattern(build) picks expanding or chromatic only',
  });

  const patShock = selectSlonimskyPattern({ ...baseCtx, phraseIntent: 'shock' }, 101);
  out.push({
    ok:
      patShock?.id === 'p_minorThirdCycle' ||
      patShock?.id === 'p_majorThirdCycle' ||
      patShock?.id === 'p_tritonePole',
    name: 'selectSlonimskyPattern(shock) picks minor 3rd, major 3rd, or tritone pole',
  });

  const patFloat = selectSlonimskyPattern({ ...baseCtx, phraseIntent: 'float' }, 102);
  out.push({
    ok: patFloat?.id === 'p_wholeTone' || patFloat?.id === 'p_asymCell123',
    name: 'selectSlonimskyPattern(float) picks whole-tone or 1-2-3 cell',
  });

  const patRelease = selectSlonimskyPattern({ ...baseCtx, phraseIntent: 'release' }, 103);
  out.push({
    ok: patRelease?.id === 'p_contracting',
    name: 'selectSlonimskyPattern(release) picks contracting cell only',
  });

  const gen = generateSlonimskyPattern(
    SLONIMSKY_PATTERNS.find((p) => p.id === 'p_minorThirdCycle')!,
    { ...baseCtx, maxBeats: 4 },
    999_001
  );
  let stepsReasonable = gen.length >= 2;
  for (let i = 1; i < gen.length && stepsReasonable; i++) {
    const ad = Math.abs(gen[i]!.midi - gen[i - 1]!.midi);
    // Minor 3rd steps ± optional ±1 jitter from generateSlonimskyPattern
    if (ad < 2 || ad > 4) stepsReasonable = false;
  }
  out.push({
    ok: stepsReasonable && gen.every((n) => n.midi >= 48 && n.midi <= 84),
    name: 'generateSlonimskyPattern(minor 3rd cycle) emits in-range steps (~minor 3rds)',
  });

  out.push({
    ok: mapDuoPhraseIntentToSlonimskyPhraseIntent('cadence', 8, 0) === 'release',
    name: 'mapper: cadence → release',
  });
  out.push({
    ok: mapDuoPhraseIntentToSlonimskyPhraseIntent('return', 2, 0) === 'release',
    name: 'mapper: return → release',
  });
  out.push({
    ok: mapDuoPhraseIntentToSlonimskyPhraseIntent('development', 3, 0) === 'build',
    name: 'mapper: development → build',
  });
  out.push({
    ok: mapDuoPhraseIntentToSlonimskyPhraseIntent('contrast', 4, 0) === 'shock',
    name: 'mapper: contrast → shock',
  });
  out.push({
    ok: mapDuoPhraseIntentToSlonimskyPhraseIntent('guitar_lead', 7, 0) === 'shock',
    name: 'mapper: guitar_lead at phase 7 → shock',
  });
  out.push({
    ok: mapDuoPhraseIntentToSlonimskyPhraseIntent('guitar_lead', 3, 0) === 'build',
    name: 'mapper: guitar_lead off peak phase → build',
  });
  out.push({
    ok: mapDuoPhraseIntentToSlonimskyPhraseIntent('bass_lead', 5, 0) === 'float',
    name: 'mapper: bass_lead → float',
  });

  const ctxWayne = mapDuoPhraseIntentToSlonimskyContext({
    duoIntent: 'contrast',
    phase: 4,
    seed: 42,
    songwriterId: 'wayne_shorter',
    totalQuarterBeats: 128,
  });
  out.push({
    ok: ctxWayne.phraseIntent === 'shock' && ctxWayne.allowedOutsideLevel === 2 && ctxWayne.maxBeats === 128,
    name: 'mapDuoPhraseIntentToSlonimskyContext: wayne_shorter shock + outside 2 + maxBeats',
  });

  const ctxDefault = mapDuoPhraseIntentToSlonimskyContext({
    duoIntent: 'cadence',
    phase: 8,
    seed: 1,
    songwriterId: undefined,
    totalQuarterBeats: 32,
  });
  out.push({
    ok:
      ctxDefault.phraseIntent === 'release' &&
      ctxDefault.allowedOutsideLevel === 1 &&
      ctxDefault.maxBeats === 32,
    name: 'mapDuoPhraseIntentToSlonimskyContext: defaults for unknown songwriter',
  });

  const v1Base: SlonimskyNote[] = [
    { midi: 60, durationBeats: 1, beat: 0, role: 'target' },
    { midi: 62, durationBeats: 1, beat: 1, role: 'target' },
  ];
  let smallIvNeverAdds = true;
  for (let s = 0; s < 500; s++) {
    const r = interpolateSlonimskyPattern(
      v1Base,
      { ...baseCtx, allowedOutsideLevel: 1 },
      '',
      s
    );
    if (r.length > 2) smallIvNeverAdds = false;
  }
  out.push({
    ok: smallIvNeverAdds,
    name: 'interpolateSlonimskyPattern skips passing when interval < 3 semitones',
  });

  let foundWideIvInsert = false;
  const widePair: SlonimskyNote[] = [
    { midi: 60, durationBeats: 1, beat: 0, role: 'target' },
    { midi: 64, durationBeats: 1, beat: 1, role: 'target' },
  ];
  for (let s = 0; s < 3000; s++) {
    const r = interpolateSlonimskyPattern(
      widePair,
      { ...baseCtx, allowedOutsideLevel: 1 },
      '',
      s
    );
    if (r.length > 2) {
      foundWideIvInsert = true;
      break;
    }
  }
  out.push({
    ok: foundWideIvInsert,
    name: 'interpolateSlonimskyPattern inserts passing when interval >= 3 and roll >= 0.6',
  });

  const patColtraneFloat = selectSlonimskyPattern(
    {
      ...baseCtx,
      phraseIntent: 'float',
      chordType: 'major',
      styleProfile: 'STYLE_COLTRANE',
    },
    102
  );
  out.push({
    ok: patColtraneFloat?.id === 'p_asymCell123',
    name: 'styleAffinity coltrane biases float pool toward p_asymCell123',
  });

  function v1NoteFingerprint(m: MeasureModel): string {
    return m.events
      .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
      .sort((a, b) => a.startBeat - b.startBeat)
      .map((e) => `${e.startBeat}:${e.pitch}:${e.duration}`)
      .join('|');
  }

  const mA = createMeasure(1, 'D7', '');
  const mB = createMeasure(1, 'D7', '');
  emitGuitarPhraseBar({
    m: mA,
    bar: 3,
    chord: 'D7',
    effectiveLow: 52,
    effectiveHigh: 76,
    density: 'sparse',
    useOffbeat: false,
    reduceAttack: false,
    intent: 'guitar_lead',
    staggerG: 0,
    seed: 9001,
    swingDuo: true,
  });
  emitGuitarPhraseBar({
    m: mB,
    bar: 3,
    chord: 'D7',
    effectiveLow: 52,
    effectiveHigh: 76,
    density: 'sparse',
    useOffbeat: false,
    reduceAttack: false,
    intent: 'guitar_lead',
    staggerG: 0,
    seed: 9001,
    swingDuo: true,
    slonimskyCtx: undefined,
  });
  out.push({
    ok: v1NoteFingerprint(mA) === v1NoteFingerprint(mB),
    name: 'emitGuitarPhraseBar without slonimskyCtx matches omitting param (undefined)',
  });

  out.push({
    ok: getPatternsBySection('tritone').length >= 2,
    name: 'getPatternsBySection returns multiple tritone patterns',
  });

  return out;
}
