/**
 * Whole-score HOME inference.
 * No title lookup. No ii–V grammar. Pitch evidence outranks a printed key.
 */

import { parseNoteToken, PENTATONIC_NOTE_CHOICES, mod12 } from './pitch';
import { getPentatonicArchetype } from './registry';
import type { PentatonicScoreImport } from './musicXmlScore';
import type { PentatonicPassage } from './pathTypes';

const MAJOR_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Cb',
  [-6]: 'Gb',
  [-5]: 'Db',
  [-4]: 'Ab',
  [-3]: 'Eb',
  [-2]: 'Bb',
  [-1]: 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
};
const MINOR_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Ab',
  [-6]: 'Eb',
  [-5]: 'Bb',
  [-4]: 'F',
  [-3]: 'C',
  [-2]: 'G',
  [-1]: 'D',
  0: 'A',
  1: 'E',
  2: 'B',
  3: 'F#',
  4: 'C#',
  5: 'G#',
  6: 'D#',
  7: 'A#',
};

const MIN_DURATION = 4;
const BASS_WINDOW_BEATS = 8;
/** Bass centre may choose among fields this close in membership. It does not override a clearer field. */
const MEMBERSHIP_BASS_BAND = 0.02;

export interface InferredHome {
  status: 'inferred' | 'INSUFFICIENT_CONTEXT';
  tonalCentre: { root: string; mode: 'major' | 'minor' } | null;
  home: { archetypeId: string; referenceNote: string } | null;
  depth: 'near' | 'chromatic';
  purpose: PentatonicPassage['purpose'];
  reading: string;
  evidence: readonly string[];
}

interface Candidate {
  archetypeId: string;
  mode: 'major' | 'minor';
  referencePc: number;
  referenceNote: string;
  pitchClasses: number[];
  membership: number;
  bassShare: number;
  centreShare: number;
  score: number;
}

function addWeight(map: Map<number, number>, pc: number, amount: number): void {
  map.set(pc, (map.get(pc) ?? 0) + amount);
}

function dominantPc(weights: Map<number, number>): number | null {
  let best: number | null = null;
  let bestWeight = 0;
  let tied = false;
  for (const [pc, weight] of weights) {
    if (weight > bestWeight) {
      best = pc;
      bestWeight = weight;
      tied = false;
    } else if (weight === bestWeight && weight > 0) {
      tied = true;
    }
  }
  return tied ? null : best;
}

function windowWeights(attacks: { pc: number; durationBeats: number }[], fromEnd: boolean): Map<number, number> {
  const ordered = fromEnd ? [...attacks].reverse() : attacks;
  const weights = new Map<number, number>();
  let used = 0;
  for (const attack of ordered) {
    if (used >= BASS_WINDOW_BEATS) break;
    const take = Math.min(attack.durationBeats, BASS_WINDOW_BEATS - used);
    if (take <= 0) continue;
    addWeight(weights, attack.pc, take);
    used += take;
  }
  return weights;
}

function meaningfulKey(score: PentatonicScoreImport): { fifths: number; mode: 'major' | 'minor'; root: string } | null {
  const keys = score.keySignatures.filter((key) => key.mode === 'major' || key.mode === 'minor');
  const unique = new Map<string, { fifths: number; mode: 'major' | 'minor' }>();
  for (const key of keys) {
    const mode = key.mode === 'minor' ? 'minor' : 'major';
    unique.set(`${key.fifths}:${mode}`, { fifths: key.fifths, mode });
  }
  if (unique.size !== 1) return null;
  const only = [...unique.values()][0]!;
  const root = (only.mode === 'minor' ? MINOR_BY_FIFTHS : MAJOR_BY_FIFTHS)[only.fifths];
  if (!root) return null;
  return { ...only, root };
}

function candidatesFor(total: number, weight: Map<number, number>, bassWeight: Map<number, number>, bassTotal: number): Candidate[] {
  const out: Candidate[] = [];
  for (const archetypeId of ['major_pentatonic', 'minor_pentatonic'] as const) {
    const archetype = getPentatonicArchetype(archetypeId);
    if (!archetype) continue;
    for (let referencePc = 0; referencePc < 12; referencePc++) {
      const pitchClasses = archetype.intervals.map((interval) => mod12(referencePc + interval));
      let inside = 0;
      for (const pc of pitchClasses) inside += weight.get(pc) ?? 0;
      const membership = total > 0 ? inside / total : 0;
      const bassShare = bassTotal > 0 ? (bassWeight.get(referencePc) ?? 0) / bassTotal : 0;
      const centreShare = total > 0 ? (weight.get(referencePc) ?? 0) / total : 0;
      out.push({
        archetypeId,
        mode: archetypeId === 'minor_pentatonic' ? 'minor' : 'major',
        referencePc,
        referenceNote: PENTATONIC_NOTE_CHOICES[referencePc] ?? 'C',
        pitchClasses,
        membership,
        bassShare,
        centreShare,
        score: 0.7 * membership + 0.2 * bassShare + 0.1 * centreShare,
      });
    }
  }
  return out;
}

function quantize(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function inferPentatonicHome(score: PentatonicScoreImport, profile: 'default' | 'wwh-duo-1.0'): InferredHome {
  const depth = profile === 'wwh-duo-1.0' ? 'chromatic' : 'near';
  const evidence: string[] = [];
  const printed = meaningfulKey(score);
  if (score.keySignatures.length === 0) evidence.push('No key signature in the guitar part.');
  else if (!printed) evidence.push('Printed key signatures do not agree on one major or minor tonic, so the key is not a centre.');
  else evidence.push(`One printed key: ${printed.root} ${printed.mode}. Used only as a tie-break or when pitch evidence is too thin.`);

  const weight = new Map<number, number>();
  const bassWeight = new Map<number, number>();
  const bassAttacks: { pc: number; durationBeats: number }[] = [];
  let total = 0;
  let bassTotal = 0;
  for (const event of score.events) {
    for (const attack of event.soundingAttacks) {
      const parsed = parseNoteToken(attack.spelling);
      if (!parsed || attack.durationBeats <= 0) continue;
      addWeight(weight, parsed.pc, attack.durationBeats);
      total += attack.durationBeats;
      if (attack.role === 'bass') {
        addWeight(bassWeight, parsed.pc, attack.durationBeats);
        bassTotal += attack.durationBeats;
        bassAttacks.push({ pc: parsed.pc, durationBeats: attack.durationBeats });
      }
    }
  }

  const openingBass = dominantPc(windowWeights(bassAttacks, false));
  const closingBass = dominantPc(windowWeights(bassAttacks, true));
  const stableBass = openingBass !== null && openingBass === closingBass ? openingBass : null;
  evidence.push(
    stableBass !== null
      ? `Opening and closing bass windows agree on ${PENTATONIC_NOTE_CHOICES[stableBass]}.`
      : 'Opening and closing bass windows do not share one centre.'
  );

  if (total < MIN_DURATION) {
    if (printed) {
      evidence.push('Sounding melody and bass duration is under 4 beats. The single printed key supplies the centre.');
      return {
        status: 'inferred',
        tonalCentre: { root: printed.root, mode: printed.mode },
        home: { archetypeId: printed.mode === 'minor' ? 'minor_pentatonic' : 'major_pentatonic', referenceNote: printed.root },
        depth,
        purpose: 'colour',
        reading: `HOME ${printed.root} ${printed.mode} pentatonic from the only printed key. Pitch evidence was too short to choose a field.`,
        evidence,
      };
    }
    evidence.push('Sounding duration is under 4 beats and there is no single printed key.');
    return {
      status: 'INSUFFICIENT_CONTEXT',
      tonalCentre: null,
      home: null,
      depth,
      purpose: 'colour',
      reading: 'INSUFFICIENT_CONTEXT. No centre was invented.',
      evidence,
    };
  }

  const all = candidatesFor(total, weight, bassWeight, bassTotal);
  const bestMembership = Math.max(...all.map((item) => item.membership));
  const ranked = all
    .filter((item) => bestMembership - item.membership <= MEMBERSHIP_BASS_BAND)
    .sort((a, b) => {
      const bassShare = quantize(b.bassShare) - quantize(a.bassShare);
      if (bassShare !== 0) return bassShare;
      const membership = quantize(b.membership) - quantize(a.membership);
      if (membership !== 0) return membership;
      const centre = quantize(b.centreShare) - quantize(a.centreShare);
      if (centre !== 0) return centre;
      if (stableBass !== null && a.referencePc !== b.referencePc) {
        if (a.referencePc === stableBass) return -1;
        if (b.referencePc === stableBass) return 1;
      }
      if (printed) {
        const aKey = a.referenceNote === printed.root && a.mode === printed.mode ? 0 : 1;
        const bKey = b.referenceNote === printed.root && b.mode === printed.mode ? 0 : 1;
        if (aKey !== bKey) return aKey - bKey;
      }
      return a.referencePc - b.referencePc || a.archetypeId.localeCompare(b.archetypeId);
    });
  evidence.push(
    `Best pitch-field membership is ${quantize(bestMembership)}. Bass centre may choose inside a ${MEMBERSHIP_BASS_BAND} band.`
  );
  evidence.push(
    `Top fields before tie-break: ${ranked
      .slice(0, 3)
      .map((item) => `${item.referenceNote} ${item.mode} membership ${quantize(item.membership)} score ${quantize(item.score)}`)
      .join('; ')}.`
  );
  if (stableBass !== null) {
    evidence.push(
      `Stable bass ${PENTATONIC_NOTE_CHOICES[stableBass]} is a tie-break only. A bass pedal does not replace the pitch field.`
    );
  }
  const chosen = ranked[0];
  if (!chosen) {
    return {
      status: 'INSUFFICIENT_CONTEXT',
      tonalCentre: null,
      home: null,
      depth,
      purpose: 'colour',
      reading: 'INSUFFICIENT_CONTEXT. No centre was invented.',
      evidence,
    };
  }
  evidence.push(
    `Chosen ${chosen.referenceNote} ${chosen.mode} pentatonic. Membership ${quantize(chosen.membership)}. Bass share on the centre ${quantize(chosen.bassShare)}. Score ${quantize(chosen.score)}.`
  );
  if (printed && (printed.root !== chosen.referenceNote || printed.mode !== chosen.mode)) {
    evidence.push(`Printed key ${printed.root} ${printed.mode} is not the chosen field.`);
  }
  return {
    status: 'inferred',
    tonalCentre: { root: chosen.referenceNote, mode: chosen.mode },
    home: { archetypeId: chosen.archetypeId, referenceNote: chosen.referenceNote },
    depth,
    purpose: 'colour',
    reading: `Inferred HOME ${chosen.referenceNote} ${chosen.mode} pentatonic from melody and bass pitch evidence. Title was not used.`,
    evidence,
  };
}
