/**
 * PR B - enforceHook forced-leap gate when intervalWeights present.
 */

import type { RiffIntervalWeightMap } from '../core/composer/riffProfileTypes';
import {
  enforceHook,
  shouldSuppressEnforceHookLeap,
  type MelodyLine,
} from '../core/riff-generator/riffMelody';

/** Stepwise line: intervals of 2, no leap (>=4), no chromatic. */
function stepwiseNotes(): MelodyLine[] {
  return [
    { startBeat: 0, duration: 1, pitch: 60 },
    { startBeat: 1, duration: 1, pitch: 62 },
    { startBeat: 2, duration: 1, pitch: 64 },
  ];
}

function pitchesOf(notes: MelodyLine[]): number[] {
  return notes.map((n) => n.pitch);
}

export function runRiffEnforceHookIntervalGateTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const stepHeavy: RiffIntervalWeightMap = { m2: 0.35, M2: 0.4, m3: 0.25 };
    const leapHeavy: RiffIntervalWeightMap = { P4: 0.35, P5: 0.4, tritone: 0.25, M2: 0.1 };
    const mixedPeakLeap: RiffIntervalWeightMap = { m3: 0.3, P5: 0.3, M2: 0.2 };
    out.push({
      ok:
        shouldSuppressEnforceHookLeap(undefined) === false &&
        shouldSuppressEnforceHookLeap({}) === false &&
        shouldSuppressEnforceHookLeap(stepHeavy) === true &&
        shouldSuppressEnforceHookLeap({ M2: 0.9, m3: 0.5 }) === true &&
        shouldSuppressEnforceHookLeap(leapHeavy) === false &&
        shouldSuppressEnforceHookLeap({ P4: 0.5, M2: 0.2 }) === false &&
        shouldSuppressEnforceHookLeap(mixedPeakLeap) === false &&
        shouldSuppressEnforceHookLeap({ M3: 0.8, M2: 0.2 }) === false,
      name: 'shouldSuppressEnforceHookLeap: step peak suppresses; leap/tie/absent/M3 keep',
    });
  }

  {
    const notes = stepwiseNotes();
    const before = pitchesOf(notes);
    const rng = () => 0.75;
    enforceHook(notes, rng, { M2: 0.5, m3: 0.3, m2: 0.2 });
    out.push({
      ok: pitchesOf(notes).join(',') === before.join(','),
      name: 'step-heavy intervalWeights: suppress forced-leap inject (pitches unchanged)',
    });
  }

  {
    const notes = stepwiseNotes();
    const rng = () => 0.75;
    enforceHook(notes, rng, { P5: 0.45, P4: 0.3, tritone: 0.25 });
    out.push({
      ok: notes[1]!.pitch === 65 && Math.abs(notes[1]!.pitch - notes[0]!.pitch) === 5,
      name: 'leap-heavy intervalWeights: keep forced-leap inject (+/-5 on notes[1])',
    });
  }

  {
    const withWeights = stepwiseNotes();
    const absent = stepwiseNotes();
    const undefinedWeights = stepwiseNotes();
    const rngA = () => 0.25;
    const rngB = () => 0.25;
    const rngC = () => 0.25;
    enforceHook(withWeights, rngA, undefined);
    enforceHook(absent, rngB);
    enforceHook(undefinedWeights, rngC, undefined);
    const ok =
      withWeights[1]!.pitch === 55 &&
      absent[1]!.pitch === 55 &&
      undefinedWeights[1]!.pitch === 55 &&
      pitchesOf(withWeights).join(',') === pitchesOf(absent).join(',');
    out.push({
      ok,
      name: 'absent intervalWeights: forced-leap inject unchanged (parity with 2-arg call)',
    });
  }

  {
    const notes = stepwiseNotes();
    notes[1]!.pitch = 61;
    const before = pitchesOf(notes);
    enforceHook(notes, () => 0.75, { M2: 0.9 });
    out.push({
      ok: pitchesOf(notes).join(',') === before.join(','),
      name: 'existing chromatic: early return (gate irrelevant)',
    });
  }

  return out;
}