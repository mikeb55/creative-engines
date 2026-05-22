/**
 * Horn stab track from compiled {@link RiffProfile.hornStabTopology}.
 */

import type { RiffHornStabTopology, RiffProfile } from '../composer/riffProfileTypes';
import type { HornStabFunction, HornStabTrack, StabEvent } from './riffMultiVoiceTypes';
import { voicingClassForChordSymbol, type RiffVoicingClass } from './riffPitchField';

const SLY_ANSWER_SLOTS = [3, 7] as const;
const DEFAULT_STAB_DURATION_16THS = 2;

function stabFunctionForTopology(
  topo: RiffHornStabTopology,
  slot: number,
  barIndex: number
): HornStabFunction {
  if (topo.slots.includes(0) || topo.slots.includes(8)) return 'block';
  if (barIndex % 4 >= 2 && topo.slots.length >= 3) return 'double';
  if (slot === 3 || slot === 7 || (SLY_ANSWER_SLOTS as readonly number[]).includes(slot)) return 'answer';
  return 'answer';
}

function canonicalSlots(topo: RiffHornStabTopology, vrbId?: string): number[] {
  if (vrbId === 'sly_stone' && topo.slots.length === 2 && topo.slots.includes(4) && topo.slots.includes(14)) {
    return [...SLY_ANSWER_SLOTS];
  }
  if (vrbId === 'sly_stone' && topo.slots.length <= 2 && !topo.slots.includes(0)) {
    return [...SLY_ANSWER_SLOTS];
  }
  return [...topo.slots];
}

function emitBarStabs(
  barIndex: number,
  chord: string,
  topo: RiffHornStabTopology,
  vrbId: string | undefined,
  out: StabEvent[]
): void {
  const voicing = voicingClassForChordSymbol(chord);
  const slots = canonicalSlots(topo, vrbId);
  if (barIndex % topo.repeatEveryBars !== 0 && barIndex > 0) return;
  for (const slot of slots) {
    out.push({
      bar: barIndex,
      beat16th: slot,
      duration16ths: DEFAULT_STAB_DURATION_16THS,
      voicingClass: voicing,
      function: stabFunctionForTopology(topo, slot, barIndex),
    });
  }
}

/**
 * Build horn stab events when `hornStabTopology` is present on the resolved profile.
 */
export function buildHornStabTrack(
  profile: RiffProfile | undefined,
  bars: number,
  chordSymbols: string[],
  vrbId?: string
): HornStabTrack | undefined {
  const topologies = profile?.hornStabTopology;
  if (!topologies?.length) return undefined;

  const events: StabEvent[] = [];
  for (let b = 0; b < bars; b++) {
    const chord = chordSymbols[b] ?? chordSymbols[chordSymbols.length - 1] ?? 'E9';
    const topo = topologies[b % topologies.length]!;
    emitBarStabs(b, chord, topo, vrbId, events);
  }
  return events.length ? events : undefined;
}
