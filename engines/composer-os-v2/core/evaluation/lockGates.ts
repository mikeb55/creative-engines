import type {
  ExtractedStyleFeatures,
  LockEvaluationResult,
  LockGate,
  LockGateInput,
  LockGateResult,
  PassFail,
} from './evaluationTypes';

function num(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return v;
}

const xmlValidityGate: LockGate = {
  id: 'xmlValidity',
  label: 'XML Validity',
  severity: 'critical',
  validate(input: LockGateInput): LockGateResult {
    const ok = input.output != null;
    return {
      gateId: 'xmlValidity',
      label: 'XML Validity',
      status: ok ? 'pass' : 'fail',
      severity: 'critical',
      reason: ok ? undefined : 'output is null or undefined',
    };
  },
};

const barDurationIntegrityGate: LockGate = {
  id: 'barDurationIntegrity',
  label: 'Bar Duration Integrity',
  severity: 'error',
  validate(input: LockGateInput): LockGateResult {
    const f = input.features as ExtractedStyleFeatures | undefined;
    const bc = num(f?.formal?.barCount);
    const ok = bc !== undefined && bc > 0;
    return {
      gateId: 'barDurationIntegrity',
      label: 'Bar Duration Integrity',
      status: ok ? 'pass' : 'fail',
      severity: 'error',
      reason: ok ? undefined : 'features.formal.barCount must be a positive number',
    };
  },
};

const chordMelodyAlignmentGate: LockGate = {
  id: 'chordMelodyAlignment',
  label: 'Chord Melody Alignment',
  severity: 'error',
  validate(input: LockGateInput): LockGateResult {
    const f = input.features as ExtractedStyleFeatures | undefined;
    const h = f?.harmonic;
    const ok =
      h != null &&
      typeof h === 'object' &&
      !Array.isArray(h) &&
      Object.keys(h as Record<string, unknown>).length > 0;
    return {
      gateId: 'chordMelodyAlignment',
      label: 'Chord Melody Alignment',
      status: ok ? 'pass' : 'fail',
      severity: 'error',
      reason: ok ? undefined : 'features.harmonic must exist and be non-empty',
    };
  },
};

const sectionContrastGate: LockGate = {
  id: 'sectionContrast',
  label: 'Section Contrast',
  severity: 'warning',
  validate(input: LockGateInput): LockGateResult {
    const f = input.features as ExtractedStyleFeatures | undefined;
    const r = num(f?.formal?.riffRepetitionRatio);
    const ok = r === undefined || Math.abs(r - 1.0) > 1e-9;
    return {
      gateId: 'sectionContrast',
      label: 'Section Contrast',
      status: ok ? 'pass' : 'fail',
      severity: 'warning',
      reason: ok ? undefined : 'riffRepetitionRatio must not be 1.0 (all bars identical)',
    };
  },
};

const rhythmAntiLoopGate: LockGate = {
  id: 'rhythmAntiLoop',
  label: 'Rhythm Anti-Loop',
  severity: 'warning',
  validate(input: LockGateInput): LockGateResult {
    const f = input.features as ExtractedStyleFeatures | undefined;
    const s = num(f?.rhythmic?.swingGridAlignment);
    const ok = s === undefined || Math.abs(s - 1.0) > 1e-9;
    return {
      gateId: 'rhythmAntiLoop',
      label: 'Rhythm Anti-Loop',
      status: ok ? 'pass' : 'fail',
      severity: 'warning',
      reason: ok ? undefined : 'swingGridAlignment must not be 1.0 (robotically perfect)',
    };
  },
};

const registerIntegrityGate: LockGate = {
  id: 'registerIntegrity',
  label: 'Register Integrity',
  severity: 'error',
  validate(input: LockGateInput): LockGateResult {
    const f = input.features as ExtractedStyleFeatures | undefined;
    const avs = num(f?.orchestration?.avgVoicingSize);
    const ok = avs !== undefined && avs >= 1 && avs <= 12;
    return {
      gateId: 'registerIntegrity',
      label: 'Register Integrity',
      status: ok ? 'pass' : 'fail',
      severity: 'error',
      reason: ok ? undefined : 'features.orchestration.avgVoicingSize must be between 1 and 12',
    };
  },
};

export const defaultLockGates: LockGate[] = [
  xmlValidityGate,
  barDurationIntegrityGate,
  chordMelodyAlignmentGate,
  sectionContrastGate,
  rhythmAntiLoopGate,
  registerIntegrityGate,
];

export function evaluateLock(
  output: unknown,
  features?: ExtractedStyleFeatures
): LockEvaluationResult {
  const input: LockGateInput = { output, features };
  const gates: LockGateResult[] = defaultLockGates.map((g) => g.validate(input));
  const failedGates = gates.filter((r) => r.status === 'fail');
  const criticalFailures = failedGates.filter((r) => r.severity === 'critical');
  const overall: PassFail = failedGates.length === 0 ? 'pass' : 'fail';
  return {
    status: overall,
    gates,
    failedGates,
    criticalFailures,
    pass: failedGates.length === 0,
  };
}
