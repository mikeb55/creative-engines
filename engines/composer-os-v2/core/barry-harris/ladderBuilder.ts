/**
 * V80k ladder — pre-voice-led 8-rung BH scale-of-chords ladder per 6th/dim7 family.
 */
import { dim7ChordTones, sixthChordTones } from './chordTones';
import { buildBhOrderedScale } from './scaleOfChords';
import type { BhFamily, LadderRung, LadderSource } from './types';

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function abstractCloseForRung(melodyPc: number, source: LadderSource, family: BhFamily): number[] {
  const tones =
    source === '6'
      ? sixthChordTones(family.sixthRootPc, family.sixthQuality)
      : dim7ChordTones(family.dim7RootPc);
  const inner = tones.filter((pc) => mod12(pc) !== mod12(melodyPc)).sort((a, b) => a - b);
  return [...inner, mod12(melodyPc)];
}

export function buildLadder(family: BhFamily): LadderRung[] {
  const scale = buildBhOrderedScale(family);
  if (scale.length !== 8) {
    throw new Error(`BH ladder requires 8 scale tones; got ${scale.length}`);
  }
  return scale.map((melodyPc, index) => {
    const source: LadderSource = index % 2 === 0 ? '6' : 'dim';
    return {
      index,
      melodyPc: mod12(melodyPc),
      source,
      abstractClose: abstractCloseForRung(melodyPc, source, family),
      family,
    };
  });
}

export function familyKey(family: BhFamily): string {
  return `${family.sixthRootPc}:${family.sixthQuality}`;
}

export function findRungForMelodyPc(ladder: readonly LadderRung[], melodyPc: number): LadderRung | undefined {
  const pc = mod12(melodyPc);
  return ladder.find((r) => r.melodyPc === pc);
}

export function nearestRung(ladder: readonly LadderRung[], melodyPc: number): LadderRung {
  const pc = mod12(melodyPc);
  let best = ladder[0]!;
  let bestDist = 12;
  for (const rung of ladder) {
    const d = Math.min(Math.abs(rung.melodyPc - pc), 12 - Math.abs(rung.melodyPc - pc));
    if (d < bestDist) {
      bestDist = d;
      best = rung;
    }
  }
  return best;
}