/**
 * Fripp/KC polymeter scaffolding — two additive cycles on a shared sixteenth grid; realign at LCM span.
 */

import { lcm } from './rhythmPulseGrid';
import { validateCycle, materializeOnsets, type CycleDefinition } from './asymmetricRhythmEngine';

/** Length of one cycle in sixteenth-note pulses (unified grid). */
export function sixteenthSpanFromCycle(cycle: CycleDefinition): number {
  validateCycle(cycle);
  return cycle.pulseUnit === 'sixteenth' ? cycle.pulsesPerCycle : cycle.pulsesPerCycle * 2;
}

/** Pulse-offset onset positions from cycle start, in sixteenth units [0, span). */
export function onsetOffsetsSixteenths(cycle: CycleDefinition): number[] {
  validateCycle(cycle);
  const mult = cycle.pulseUnit === 'sixteenth' ? 1 : 2;
  return materializeOnsets(cycle).map((o) => o.pulseOffset * mult);
}

export function polymeterLcmSixteenths(cycleA: CycleDefinition, cycleB: CycleDefinition): number {
  return lcm(sixteenthSpanFromCycle(cycleA), sixteenthSpanFromCycle(cycleB));
}

/**
 * One-line receipt: LCM span + individual sixteenth spans (for manifests / slice diagnostics).
 */
export function buildFrippPolymeterAlignmentReceipt(cycleA: CycleDefinition, cycleB: CycleDefinition): string {
  const sa = sixteenthSpanFromCycle(cycleA);
  const sb = sixteenthSpanFromCycle(cycleB);
  const L = polymeterLcmSixteenths(cycleA, cycleB);
  return `fk:poly@lcm${L}q|A${sa}q|B${sb}q`;
}
