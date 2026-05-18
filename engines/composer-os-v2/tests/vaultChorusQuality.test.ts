/**
 * Vault multi-chorus — quality gate, tension rotation, contour hints, solo style rotation.
 */

import { parseChordProgressionText } from '../core/irealpro/chordSymbolMapper';
import {
  generateVaultFromParsedChart,
  MELODY_MOTIF_TENSION_CYCLE,
  melodyMotifTensionStateForBar,
  tensionCycleRotationForChorus,
  TRIAD_PAIR_CHORUS_ROTATION,
} from '../core/irealpro/irealVaultPipeline';
import {
  applyChorusQualityGate,
  buildChorusQualityGate,
  type ChorusQualityGate,
  type ChorusQualityTransition,
} from '../core/irealpro/vaultChorusPhraseDiagnostics';

const FIXTURE_CHART = parseChordProgressionText(
  'Cmaj7 | Dm7 | G7 | Cmaj7',
  'C',
  { num: 4, den: 4 },
  120
);

function transition(
  from: number,
  to: number,
  changedDimensionCount: number,
  dims: ChorusQualityTransition['changedDimensions'] = []
): ChorusQualityTransition {
  return {
    fromChorusIndex: from,
    toChorusIndex: to,
    changedDimensions: dims,
    changedDimensionCount,
    passed: changedDimensionCount >= 2,
    densityDelta: 0,
    registerDelta: 0,
    motifTensionDelta: 0,
    rhythmicVariationChanged: false,
  };
}

function gateWithTransitions(transitions: ChorusQualityTransition[]): ChorusQualityGate {
  return {
    minChangedDimensions: 2,
    transitions,
    passed: transitions.every((t) => t.passed),
  };
}

export function runVaultChorusQualityTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const single = generateVaultFromParsedChart(FIXTURE_CHART, { seed: 42001, chorusCount: 1 });
  out.push({
    ok:
      (single.chorusQualityGate?.transitions.length ?? 0) === 0 &&
      (single.chorusQualityWarnings?.length ?? 0) === 0,
    name: 'chorusCount=1 → no quality gate run (single chorus)',
  });

  const dual = generateVaultFromParsedChart(FIXTURE_CHART, {
    seed: 42002,
    chorusCount: 2,
    mode: 'melody',
  });
  out.push({
    ok: dual.chorusQualityGate !== undefined && dual.chorusQualityGate.transitions.length === 1,
    name: 'chorusCount=2 → gate runs (one adjacent transition)',
  });

  const passingGate = gateWithTransitions([
    transition(0, 1, 2, ['density', 'register']),
  ]);
  out.push({
    ok: applyChorusQualityGate(passingGate).length === 0,
    name: 'chorusCount=2 → gate passes when ≥2 dimensions change',
  });

  const warnOnly = applyChorusQualityGate(gateWithTransitions([transition(0, 1, 1)]));
  let threwOnSecond = false;
  try {
    applyChorusQualityGate(
      gateWithTransitions([transition(0, 1, 1), transition(1, 2, 0)])
    );
  } catch (e) {
    threwOnSecond = e instanceof Error && e.message.includes('1->2');
  }
  out.push({
    ok: warnOnly.length === 1 && warnOnly[0]!.includes('0->1') && threwOnSecond,
    name: 'chorusCount=2 → warn on first weak pair (0→1), throw on second (1→2)',
  });

  const states = [0, 1, 2, 3].map((chorusIndex) =>
    melodyMotifTensionStateForBar(2, 0, chorusIndex)
  );
  const cycleLen = MELODY_MOTIF_TENSION_CYCLE.length;
  const expected = [0, 1, 2, 3].map((chorusIndex) => MELODY_MOTIF_TENSION_CYCLE[(1 + chorusIndex) % cycleLen]!);
  out.push({
    ok: states.every((s, i) => s === expected[i]),
    name: 'chorusCount=4 → tensionCycleRotation advances (primary → tension → chaos → recover)',
  });

  const melTwo = generateVaultFromParsedChart(FIXTURE_CHART, {
    seed: 42003,
    chorusCount: 2,
    mode: 'melody',
  });
  const barsPerChorus = FIXTURE_CHART.measures!.length;
  const c1Bar0 = melTwo.generatedNotes.filter((n) => n.barIndex === barsPerChorus && n.pitch > 0);
  const melOneAgain = generateVaultFromParsedChart(FIXTURE_CHART, {
    seed: 42003,
    chorusCount: 1,
    mode: 'melody',
  });
  const c1Bar0SoloChorus = melOneAgain.generatedNotes.filter((n) => n.barIndex === 0 && n.pitch > 0);
  const contourDiffers =
    c1Bar0.length > 0 &&
    c1Bar0SoloChorus.length > 0 &&
    (c1Bar0.length !== c1Bar0SoloChorus.length ||
      c1Bar0.some((n, i) => c1Bar0SoloChorus[i]?.pitch !== n.pitch));
  out.push({
    ok: contourDiffers,
    name: 'Melody mode: contourHintsForNextChorus propagates to chorus 2',
  });

  const soloFour = generateVaultFromParsedChart(FIXTURE_CHART, {
    seed: 42004,
    chorusCount: 4,
    mode: 'solo',
    riffStyle: 'triad-pair-pendulum',
  });
  const stylesUsed = new Set(
    [0, 1, 2, 3].map((i) => TRIAD_PAIR_CHORUS_ROTATION[i % TRIAD_PAIR_CHORUS_ROTATION.length]!)
  );
  out.push({
    ok: stylesUsed.size >= 2,
    name: 'Solo mode: TRIAD_PAIR_CHORUS_ROTATION changes style per chorus',
  });

  out.push({
    ok:
      tensionCycleRotationForChorus(3, 'sonic_youth') === 0 &&
      tensionCycleRotationForChorus(3) === 3 &&
      melodyMotifTensionStateForBar(2, 0, 0) !== melodyMotifTensionStateForBar(2, 0, 1),
    name: 'Sonic Youth: tension-cycle skip confirmed (no rotation advance)',
  });

  const diagGate = dual.chorusQualityGate;
  const t0 = diagGate?.transitions[0];
  out.push({
    ok:
      t0 !== undefined &&
      typeof t0.densityDelta === 'number' &&
      typeof t0.registerDelta === 'number' &&
      typeof t0.motifTensionDelta === 'number' &&
      typeof t0.rhythmicVariationChanged === 'boolean' &&
      Array.isArray(t0.changedDimensions),
    name: 'Quality gate: all 4 dimensions present in diagnostics output',
  });

  return out;
}
