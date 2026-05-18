import type { ScoreNote } from '../guitar/vaultRiffGenerator';

/** Melodic shape within one bar from successive pitch motions (vault melody notes only). */
export type PhraseContourTag = 'rise' | 'fall' | 'stable';

export type VaultHookIdentity = {
  /** Chorus 1 bar 1 → global bar index 0 in Build I stacking. */
  hookSourceGlobalBarIndex: number;
  hookPitchClasses: number[];
  /** Signed smallest-interval steps between consecutive hook PCs (length hookPitchClasses.length - 1). */
  hookIntervalPattern: number[];
  /** Chorus starts where bar 1 matches the chorus-1 hook (exact PCs or same interval pattern). */
  recurrences: Array<{
    chorusIndex: number;
    globalBarIndex: number;
    matchKind: 'exact' | 'transposed';
  }>;
};

function playableNotesInBar(notes: ScoreNote[], barIndex: number): ScoreNote[] {
  return notes
    .filter((n) => n.barIndex === barIndex && n.pitch > 0)
    .sort((a, b) => a.startBeat - b.startBeat);
}

function pitchClassesOrdered(notes: ScoreNote[], barIndex: number): number[] {
  return playableNotesInBar(notes, barIndex).map((n) => ((n.pitch % 12) + 12) % 12);
}

function smallestStepPc(fromPc: number, toPc: number): number {
  let d = toPc - fromPc;
  while (d > 6) d -= 12;
  while (d < -6) d += 12;
  return d;
}

function intervalPatternFromPcs(pcs: number[]): number[] {
  if (pcs.length < 2) return [];
  const out: number[] = [];
  for (let i = 1; i < pcs.length; i++) {
    out.push(smallestStepPc(pcs[i - 1]!, pcs[i]!));
  }
  return out;
}

function arraysEqualShort(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Classifies one bar’s melody motion: net upward / downward melodic steps vs stable / balanced.
 */
export function phraseContourForBar(notes: ScoreNote[], barIndex: number): PhraseContourTag {
  const playable = playableNotesInBar(notes, barIndex);
  if (playable.length < 2) return 'stable';

  let score = 0;
  for (let i = 1; i < playable.length; i++) {
    const d = playable[i]!.pitch - playable[i - 1]!.pitch;
    if (d > 0) score++;
    else if (d < 0) score--;
  }
  if (score > 0) return 'rise';
  if (score < 0) return 'fall';
  return 'stable';
}

/**
 * Per global bar index (0 … totalBars − 1), contour tags after multi-chorus stacking.
 */
export function buildPhraseContoursForBars(notes: ScoreNote[], totalBars: number): PhraseContourTag[] {
  const out: PhraseContourTag[] = [];
  for (let b = 0; b < totalBars; b++) {
    out.push(phraseContourForBar(notes, b));
  }
  return out;
}

/**
 * Captures chorus 1 bar 1 hook PCs / interval shape and marks later choruses whose bar 1 matches.
 */
export function buildHookIdentityTracker(
  notes: ScoreNote[],
  barsPerChorus: number,
  chorusCount: number
): VaultHookIdentity | undefined {
  if (chorusCount < 2 || barsPerChorus < 1) return undefined;

  const hookGlobalBar = 0;
  const hookPitchClasses = pitchClassesOrdered(notes, hookGlobalBar);
  const hookIntervalPattern = intervalPatternFromPcs(hookPitchClasses);

  const recurrences: VaultHookIdentity['recurrences'] = [];

  for (let chorusIndex = 1; chorusIndex < chorusCount; chorusIndex++) {
    const globalBarIndex = chorusIndex * barsPerChorus;
    const cand = pitchClassesOrdered(notes, globalBarIndex);

    if (hookPitchClasses.length === 0) {
      continue;
    }

    if (hookPitchClasses.length === 1) {
      if (cand.length === 1) {
        recurrences.push({ chorusIndex, globalBarIndex, matchKind: 'exact' });
      }
      continue;
    }

    if (arraysEqualShort(hookPitchClasses, cand)) {
      recurrences.push({ chorusIndex, globalBarIndex, matchKind: 'exact' });
      continue;
    }

    const candPat = intervalPatternFromPcs(cand);
    if (
      hookIntervalPattern.length > 0 &&
      hookIntervalPattern.length === candPat.length &&
      arraysEqualShort(hookIntervalPattern, candPat)
    ) {
      recurrences.push({ chorusIndex, globalBarIndex, matchKind: 'transposed' });
    }
  }

  return {
    hookSourceGlobalBarIndex: hookGlobalBar,
    hookPitchClasses,
    hookIntervalPattern,
    recurrences,
  };
}

/** Overall tension score per chorus (Build I vault stack). */
export type ChorusTensionProgression = {
  /** Length === `chorusCount`; each value clamped to [0, 1]. */
  perChorus: number[];
};

export type ChorusQualityDimension = 'density' | 'register' | 'motifTension' | 'rhythmicVariation';

export type ChorusQualityTransition = {
  fromChorusIndex: number;
  toChorusIndex: number;
  changedDimensions: ChorusQualityDimension[];
  changedDimensionCount: number;
  passed: boolean;
  densityDelta: number;
  registerDelta: number;
  motifTensionDelta: number;
  rhythmicVariationChanged: boolean;
};

export type ChorusQualityGate = {
  minChangedDimensions: number;
  transitions: ChorusQualityTransition[];
  passed: boolean;
};

const HOOK_EXACT_TENSION_DELTA = -0.1;
const HOOK_TRANSPOSED_TENSION_DELTA = 0.14;
const CONTOUR_WEIGHT = 0.48;
const POSITION_WEIGHT = 0.38;

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/**
 * Derives per-chorus tension from contour density (rising bars), hook recurrence (exact vs transposed),
 * and chorus index (ramps via `chorusIndex / max(1, chorusCount - 1)` when multiple choruses).
 */
export function buildTensionProgression(params: {
  phraseContours: PhraseContourTag[];
  hookIdentity: VaultHookIdentity | undefined;
  barsPerChorus: number;
  chorusCount: number;
}): ChorusTensionProgression {
  const { phraseContours, hookIdentity, barsPerChorus, chorusCount } = params;
  const perChorus: number[] = [];

  const recurrenceByChorus = new Map<number, 'exact' | 'transposed'>();
  if (hookIdentity) {
    for (const r of hookIdentity.recurrences) {
      recurrenceByChorus.set(r.chorusIndex, r.matchKind);
    }
  }

  for (let chorusIndex = 0; chorusIndex < chorusCount; chorusIndex++) {
    const start = chorusIndex * barsPerChorus;
    const end = Math.min(start + barsPerChorus, phraseContours.length);
    let rise = 0;
    let denom = 0;
    for (let b = start; b < end; b++) {
      denom++;
      if (phraseContours[b] === 'rise') rise++;
    }
    const riseRatio = denom > 0 ? rise / denom : 0;

    let hookDelta = 0;
    if (chorusIndex > 0) {
      const kind = recurrenceByChorus.get(chorusIndex);
      if (kind === 'exact') hookDelta = HOOK_EXACT_TENSION_DELTA;
      else if (kind === 'transposed') hookDelta = HOOK_TRANSPOSED_TENSION_DELTA;
    }

    const positionRamp =
      chorusCount <= 1 ? 0 : chorusIndex / Math.max(1, chorusCount - 1);

    const raw =
      CONTOUR_WEIGHT * riseRatio + POSITION_WEIGHT * positionRamp + hookDelta;

    perChorus.push(clamp01(raw));
  }

  return { perChorus };
}

function playable(notes: ScoreNote[]): ScoreNote[] {
  return notes.filter((n) => n.pitch > 0);
}

function meanPitch(notes: ScoreNote[]): number {
  const p = playable(notes);
  if (p.length === 0) return 0;
  return p.reduce((sum, n) => sum + n.pitch, 0) / p.length;
}

function densityPerBar(notes: ScoreNote[], barsPerChorus: number): number {
  if (barsPerChorus <= 0) return 0;
  return playable(notes).length / barsPerChorus;
}

function contourSignature(contours: readonly PhraseContourTag[]): string {
  let rise = 0;
  let fall = 0;
  let stable = 0;
  for (const contour of contours) {
    if (contour === 'rise') rise++;
    else if (contour === 'fall') fall++;
    else stable++;
  }
  return `${rise}:${fall}:${stable}:${contours.join('|')}`;
}

export function buildChorusQualityGate(params: {
  notes: ScoreNote[];
  phraseContours: PhraseContourTag[];
  tensionProgression: ChorusTensionProgression;
  barsPerChorus: number;
  chorusCount: number;
  minChangedDimensions?: number;
}): ChorusQualityGate {
  const minChangedDimensions = params.minChangedDimensions ?? 2;
  const transitions: ChorusQualityTransition[] = [];
  if (params.chorusCount < 2 || params.barsPerChorus < 1) {
    return { minChangedDimensions, transitions, passed: true };
  }

  const chorusNotes: ScoreNote[][] = [];
  const contourSlices: PhraseContourTag[][] = [];
  for (let chorusIndex = 0; chorusIndex < params.chorusCount; chorusIndex++) {
    const lo = chorusIndex * params.barsPerChorus;
    const hi = lo + params.barsPerChorus;
    chorusNotes.push(params.notes.filter((n) => n.barIndex >= lo && n.barIndex < hi));
    contourSlices.push(params.phraseContours.slice(lo, hi));
  }

  for (let chorusIndex = 1; chorusIndex < params.chorusCount; chorusIndex++) {
    const prevNotes = chorusNotes[chorusIndex - 1] ?? [];
    const currNotes = chorusNotes[chorusIndex] ?? [];
    const densityDelta = Math.abs(densityPerBar(currNotes, params.barsPerChorus) - densityPerBar(prevNotes, params.barsPerChorus));
    const registerDelta = Math.abs(meanPitch(currNotes) - meanPitch(prevNotes));
    const motifTensionDelta = Math.abs(
      (params.tensionProgression.perChorus[chorusIndex] ?? 0) -
        (params.tensionProgression.perChorus[chorusIndex - 1] ?? 0)
    );
    const rhythmicVariationChanged =
      contourSignature(contourSlices[chorusIndex] ?? []) !== contourSignature(contourSlices[chorusIndex - 1] ?? []);
    const changedDimensions: ChorusQualityDimension[] = [];
    if (densityDelta >= 0.12) changedDimensions.push('density');
    if (registerDelta >= 1.5) changedDimensions.push('register');
    if (motifTensionDelta >= 0.08) changedDimensions.push('motifTension');
    if (rhythmicVariationChanged) changedDimensions.push('rhythmicVariation');
    transitions.push({
      fromChorusIndex: chorusIndex - 1,
      toChorusIndex: chorusIndex,
      changedDimensions,
      changedDimensionCount: changedDimensions.length,
      passed: changedDimensions.length >= minChangedDimensions,
      densityDelta,
      registerDelta,
      motifTensionDelta,
      rhythmicVariationChanged,
    });
  }

  return {
    minChangedDimensions,
    transitions,
    passed: transitions.every((transition) => transition.passed),
  };
}

/**
 * First weak adjacent-chorus pair → warn only; second+ weak pairs → throw (persistent weak variation).
 */
export function applyChorusQualityGate(gate: ChorusQualityGate): string[] {
  const warnings: string[] = [];
  if (gate.passed) return warnings;
  const failed = gate.transitions.filter((transition) => !transition.passed);
  if (failed.length === 0) return warnings;

  const first = failed[0]!;
  const warnMsg = `Vault multi-chorus quality: weak transition ${first.fromChorusIndex}->${first.toChorusIndex} (${first.changedDimensionCount}/${gate.minChangedDimensions} dimension(s) changed)`;
  warnings.push(warnMsg);
  console.warn(`[vault-chorus] ${warnMsg}`);

  if (failed.length > 1) {
    const details = failed
      .slice(1)
      .map(
        (transition) =>
          `${transition.fromChorusIndex}->${transition.toChorusIndex}:${transition.changedDimensionCount}/${gate.minChangedDimensions}`
      )
      .join(', ');
    throw new Error(`Vault multi-chorus quality gate failed: ${details}`);
  }
  return warnings;
}

/** @deprecated Prefer {@link applyChorusQualityGate}; kept for tests that expect throw-on-any-failure. */
export function assertChorusQualityGate(gate: ChorusQualityGate): void {
  if (gate.passed) return;
  const failed = gate.transitions.filter((transition) => !transition.passed);
  const details = failed
    .map(
      (transition) =>
        `${transition.fromChorusIndex}->${transition.toChorusIndex}:${transition.changedDimensionCount}/${gate.minChangedDimensions}`
    )
    .join(', ');
  throw new Error(`Vault multi-chorus quality gate failed: ${details}`);
}
