/**
 * Dev 3.2 HOME inference.
 * Candidates come only from a printed key, an opening harmony root that the
 * first bass pitch class confirms, or a stable closing bass pitch class.
 * No title. No filename. No search across all 24 pentatonics.
 */

import { readChordEvidence } from './chordEvidence';
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

const BASS_WINDOW_BEATS = 8;
/** Near-tie band. Source priority applies only inside it. */
const MEMBERSHIP_BAND = 0.02;

export type HomeEvidenceSource = 'KEY' | 'OPENING' | 'CLOSING';

export interface HomeCandidate {
  source: HomeEvidenceSource;
  centre: string;
  mode: 'major' | 'minor';
  archetypeId: string;
  pitchClasses: readonly number[];
  membership: number;
  detail: string;
}

export interface InferredHome {
  status: 'inferred' | 'INSUFFICIENT_CONTEXT';
  tonalCentre: { root: string; mode: 'major' | 'minor' } | null;
  home: { archetypeId: string; referenceNote: string } | null;
  depth: 'near' | 'chromatic';
  purpose: PentatonicPassage['purpose'];
  reading: string;
  evidence: readonly string[];
  candidates: readonly HomeCandidate[];
  winnerSource: HomeEvidenceSource | null;
}

function addWeight(map: Map<number, number>, pc: number, amount: number): void {
  map.set(pc, (map.get(pc) ?? 0) + amount);
}

function quantize(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function noteName(pc: number): string {
  return PENTATONIC_NOTE_CHOICES[pc] ?? 'C';
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

function modeFromSymbol(symbol: string): 'major' | 'minor' | null {
  const chord = readChordEvidence(symbol);
  if (!chord.ok) return null;
  const root = parseNoteToken(symbol.trim().replace(/\s+/g, '').match(/^([A-Ga-g](?:bb|##|b|#|x)?)/)?.[1] ?? '');
  if (!root) return null;
  const intervals = new Set(chord.chord.harmonyPitchClasses.map((pc) => mod12(pc - root.pc)));
  const minorThird = intervals.has(3);
  const majorThird = intervals.has(4);
  const fifth = intervals.has(7);
  if (minorThird && !majorThird && fifth) return 'minor';
  if (majorThird && !minorThird && fifth) return 'major';
  return null;
}

function pcsFor(archetypeId: 'major_pentatonic' | 'minor_pentatonic', referencePc: number): number[] {
  const archetype = getPentatonicArchetype(archetypeId);
  if (!archetype) return [];
  return archetype.intervals.map((interval) => mod12(referencePc + interval));
}

function membershipOf(pitchClasses: readonly number[], weight: Map<number, number>, total: number): number {
  if (total <= 0) return 0;
  let inside = 0;
  for (const pc of pitchClasses) inside += weight.get(pc) ?? 0;
  return inside / total;
}

const SOURCE_RANK: Record<HomeEvidenceSource, number> = { OPENING: 0, KEY: 1, CLOSING: 2 };

export function inferPentatonicHome(score: PentatonicScoreImport, profile: 'default' | 'wwh-duo-1.1' | 'wwh-duo-1.0'): InferredHome {
  const depth = profile === 'wwh-duo-1.1' || profile === 'wwh-duo-1.0' ? 'chromatic' : 'near';
  const evidence: string[] = ['Title and filename were not used.'];
  const candidates: HomeCandidate[] = [];

  const weight = new Map<number, number>();
  let total = 0;
  const bassAttacks: { pc: number; durationBeats: number; eventIndex: number }[] = [];
  for (let eventIndex = 0; eventIndex < score.events.length; eventIndex += 1) {
    const event = score.events[eventIndex]!;
    for (const attack of event.soundingAttacks) {
      const parsed = parseNoteToken(attack.spelling);
      if (!parsed || !(attack.durationBeats > 0)) continue;
      if (attack.role !== 'melody' && attack.role !== 'bass') continue;
      addWeight(weight, parsed.pc, attack.durationBeats);
      total += attack.durationBeats;
      if (attack.role === 'bass') bassAttacks.push({ pc: parsed.pc, durationBeats: attack.durationBeats, eventIndex });
    }
  }

  const printed = meaningfulKey(score);
  const usableKeys = score.keySignatures.filter((key) => key.mode === 'major' || key.mode === 'minor');
  if (score.keySignatures.length === 0) evidence.push('KEY unavailable. No key signature in the score.');
  else if (usableKeys.length === 0) evidence.push('KEY unavailable. Key evidence has no explicit major or minor mode.');
  else if (!printed) evidence.push('KEY unavailable. Printed key signatures do not agree on one major or minor tonic.');
  else {
    const archetypeId = printed.mode === 'minor' ? 'minor_pentatonic' : 'major_pentatonic';
    const referencePc = parseNoteToken(printed.root)?.pc ?? 0;
    const pitchClasses = pcsFor(archetypeId, referencePc);
    candidates.push({
      source: 'KEY',
      centre: printed.root,
      mode: printed.mode,
      archetypeId,
      pitchClasses,
      membership: quantize(membershipOf(pitchClasses, weight, total)),
      detail: `Printed key ${printed.root} ${printed.mode}. Fifths ${printed.fifths}.`,
    });
    evidence.push(`KEY candidate ${printed.root} ${printed.mode}.`);
  }

  const firstHarmony = score.events.flatMap((event) => event.harmonyEvidence).find((item) => item.symbol && !/^(n\.?\s*c\.?|nc)$/i.test(item.symbol));
  const firstBass = bassAttacks[0];
  if (!firstHarmony) evidence.push('OPENING unavailable. No explicit harmony root.');
  else if (!firstBass) evidence.push('OPENING unavailable. No sounding bass pitch class to confirm the harmony root.');
  else {
    const chord = readChordEvidence(firstHarmony.symbol);
    const rootToken = firstHarmony.symbol.trim().match(/^([A-Ga-g](?:bb|##|b|#|x)?)/);
    const root = rootToken ? parseNoteToken(rootToken[1]!) : null;
    if (!chord.ok || !root) evidence.push(`OPENING unavailable. Harmony "${firstHarmony.symbol}" has no readable root.`);
    else if (firstBass.pc !== root.pc) {
      evidence.push(
        `OPENING unavailable. First harmony root ${root.spelling} does not agree with the first sounding bass ${noteName(firstBass.pc)}.`
      );
    } else {
      const quality = modeFromSymbol(firstHarmony.symbol);
      const modes: ('major' | 'minor')[] = quality ? [quality] : ['major', 'minor'];
      for (const mode of modes) {
        const archetypeId = mode === 'minor' ? 'minor_pentatonic' : 'major_pentatonic';
        const pitchClasses = pcsFor(archetypeId, root.pc);
        candidates.push({
          source: 'OPENING',
          centre: root.spelling,
          mode,
          archetypeId,
          pitchClasses,
          membership: quantize(membershipOf(pitchClasses, weight, total)),
          detail: quality
            ? `First harmony ${firstHarmony.symbol} is ${quality}. First bass ${noteName(firstBass.pc)} agrees.`
            : `First harmony ${firstHarmony.symbol} does not set major or minor. First bass ${noteName(firstBass.pc)} agrees. Both archetypes stay in play.`,
        });
      }
      evidence.push(
        quality
          ? `OPENING candidate ${root.spelling} ${quality} from ${firstHarmony.symbol}.`
          : `OPENING candidates ${root.spelling} major and minor. ${firstHarmony.symbol} does not set the mode.`
      );
    }
  }

  let closingPc: number | null = null;
  let closingEvent = -1;
  if (bassAttacks.length === 0) evidence.push('CLOSING unavailable. No sounding bass.');
  else {
    const weights = new Map<number, number>();
    let used = 0;
    for (let index = bassAttacks.length - 1; index >= 0 && used < BASS_WINDOW_BEATS; index -= 1) {
      const attack = bassAttacks[index]!;
      const take = Math.min(attack.durationBeats, BASS_WINDOW_BEATS - used);
      if (take <= 0) continue;
      addWeight(weights, attack.pc, take);
      used += take;
    }
    let bestPc: number | null = null;
    let bestWeight = 0;
    let tied = false;
    for (const [pc, amount] of weights) {
      if (amount > bestWeight) {
        bestPc = pc;
        bestWeight = amount;
        tied = false;
      } else if (amount === bestWeight && amount > 0) tied = true;
    }
    const finalAttack = bassAttacks[bassAttacks.length - 1]!;
    if (bestPc === null || tied) evidence.push('CLOSING unavailable. The final bass window has no single sustained pitch class.');
    else if (finalAttack.pc !== bestPc && finalAttack.durationBeats >= bestWeight) {
      evidence.push(
        `CLOSING unavailable. Final bass ${noteName(finalAttack.pc)} is not a short passing attack, and it disagrees with the longer closing pitch class ${noteName(bestPc)}.`
      );
    } else {
      closingPc = bestPc;
      if (finalAttack.pc !== bestPc) {
        evidence.push(`Final bass ${noteName(finalAttack.pc)} is a passing attack. Closing centre stays ${noteName(bestPc)}.`);
      }
      let bestEvent = finalAttack.eventIndex;
      let bestEventWeight = 0;
      for (let index = bassAttacks.length - 1; index >= 0; index -= 1) {
        const attack = bassAttacks[index]!;
        if (attack.pc !== bestPc) continue;
        if (attack.durationBeats > bestEventWeight) {
          bestEventWeight = attack.durationBeats;
          bestEvent = attack.eventIndex;
        }
      }
      closingEvent = bestEvent;
      const closingSymbol = score.events[closingEvent]?.chordSymbol;
      const closingMode = closingSymbol ? modeFromSymbol(closingSymbol) : null;
      const modes: ('major' | 'minor')[] = closingMode ? [closingMode] : ['major', 'minor'];
      for (const mode of modes) {
        const archetypeId = mode === 'minor' ? 'minor_pentatonic' : 'major_pentatonic';
        const pitchClasses = pcsFor(archetypeId, bestPc);
        candidates.push({
          source: 'CLOSING',
          centre: noteName(bestPc),
          mode,
          archetypeId,
          pitchClasses,
          membership: quantize(membershipOf(pitchClasses, weight, total)),
          detail: closingMode
            ? `Stable closing bass ${noteName(bestPc)}. Closing harmony ${closingSymbol} is ${closingMode}.`
            : `Stable closing bass ${noteName(bestPc)}. Closing harmony does not set major or minor.`,
        });
      }
      evidence.push(
        closingMode
          ? `CLOSING candidate ${noteName(bestPc)} ${closingMode}.`
          : `CLOSING candidates ${noteName(bestPc)} major and minor.`
      );
    }
  }

  for (const candidate of candidates) {
    evidence.push(
      `${candidate.source} ${candidate.centre} ${candidate.mode} pcs ${candidate.pitchClasses.join(' ')} membership ${candidate.membership}. ${candidate.detail}`
    );
  }

  if (candidates.length === 0) {
    evidence.push('No source produced a defensible centre. The unrestricted pitch-field search was not used.');
    return {
      status: 'INSUFFICIENT_CONTEXT',
      tonalCentre: null,
      home: null,
      depth,
      purpose: 'colour',
      reading: 'INSUFFICIENT_CONTEXT. No centre was invented.',
      evidence,
      candidates,
      winnerSource: null,
    };
  }

  const bestMembership = Math.max(...candidates.map((item) => item.membership));
  const ranked = candidates
    .filter((item) => bestMembership - item.membership <= MEMBERSHIP_BAND)
    .sort((a, b) => {
      const source = SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
      if (source !== 0) return source;
      const aPc = parseNoteToken(a.centre)?.pc ?? 0;
      const bPc = parseNoteToken(b.centre)?.pc ?? 0;
      if (aPc !== bPc) return aPc - bPc;
      return a.archetypeId.localeCompare(b.archetypeId);
    });
  const chosen = ranked[0]!;
  evidence.push(
    `WINNER ${chosen.centre} ${chosen.mode} from ${chosen.source}. Membership ${chosen.membership}. Band ${MEMBERSHIP_BAND}.`
  );
  const outside = candidates.filter((item) => bestMembership - item.membership > MEMBERSHIP_BAND);
  if (outside.length > 0) {
    evidence.push(
      `Outside the ${MEMBERSHIP_BAND} band, source priority cannot win: ${outside
        .map((item) => `${item.source} ${item.centre} ${item.mode} ${item.membership}`)
        .join('; ')}.`
    );
  }
  return {
    status: 'inferred',
    tonalCentre: { root: chosen.centre, mode: chosen.mode },
    home: { archetypeId: chosen.archetypeId, referenceNote: chosen.centre },
    depth,
    purpose: 'colour',
    reading: `HOME ${chosen.centre} ${chosen.mode} pentatonic from ${chosen.source} evidence. Title was not used.`,
    evidence,
    candidates,
    winnerSource: chosen.source,
  };
}
