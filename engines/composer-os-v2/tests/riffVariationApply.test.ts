import {
  applyMutation,
  mutationOperatorsForBar,
} from '../core/riff-generator/riffVariationApply';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import type { RiffBarSnapshot } from '../core/riff-generator/riffCarryForward';

const BAR: RiffBarSnapshot = {
  rhythm: [{ startBeat: 0, duration: 1, rest: false }],
  guitarNotes: [{ pitch: 64, startBeat: 0, duration: 1, voice: 1 }],
  chord: 'E9',
};

function opsSubset(actual: string[], allowed: string[]): boolean {
  return actual.every((op) => allowed.includes(op));
}

export function runRiffVariationApplyTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const led = resolveRiffGeneratorProfile({
    vrbId: 'led_zeppelin',
    style: 'neutral',
    grid: 'eighth',
    density: 'medium',
  });

  {
    const ops = mutationOperatorsForBar(led, 'led_zeppelin', 1, 'E7');
    out.push({
      ok:
        ops.length > 0 &&
        opsSubset(ops, ['microTimingShift', 'endTruncation', 'ornamentAdd']),
      name: 'led_zeppelin blues_rock mutate: receipt ops are microTimingShift/endTruncation/ornamentAdd',
    });
    applyMutation(BAR, led, 42, 'led_zeppelin', 0);
  }

  {
    const epic = { ...led, pedalRigid: true };
    const ops = mutationOperatorsForBar(epic, 'led_zeppelin', 2, 'BbMaj7#11');
    out.push({
      ok: ops.length === 1 && ops[0] === 'upperVoicingColourSwap',
      name: 'led_zeppelin epic_modal_heavy mutate: only upperVoicingColourSwap',
    });
  }

  const sly = resolveRiffGeneratorProfile({
    vrbId: 'sly_stone',
    style: 'funk',
    grid: 'sixteenth',
    density: 'medium',
  });

  {
    const ops = mutationOperatorsForBar(sly, 'sly_stone', 0, 'E9');
    out.push({
      ok:
        ops.includes('harmonicColourSwap') &&
        ops.includes('rhythmicWarp') &&
        ops.includes('registerShift'),
      name: 'sly_stone mutate: harmonicColourSwap + rhythmicDisplacement + octaveShift in op set',
    });
    applyMutation(BAR, sly, 99, 'sly_stone', 0);
  }

  return out;
}
