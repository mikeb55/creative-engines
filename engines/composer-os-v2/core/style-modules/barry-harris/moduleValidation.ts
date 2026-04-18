/**
 * Composer OS V2 — Barry Harris style validation
 */

import type { GenerationMetadata } from '../../compositionContext';
import type { ScoreModel } from '../../score-model/scoreModelTypes';
import { isGuitarMelodyVoiceNote } from '../../score-integrity/guitarVoiceMelody';

export interface BarryHarrisValidationResult {
  valid: boolean;
  errors: string[];
}

function maxVoiceLeadJump(pitches: number[]): number {
  let max = 0;
  for (let i = 1; i < pitches.length; i++) {
    max = Math.max(max, Math.abs(pitches[i] - pitches[i - 1]));
  }
  return max;
}

const MOTIF_REF_RE = /^song_motif/;

/**
 * Song Mode Fagen keys-comp puts chord-tone companions on **voice 2**; voice 1 stays the melodic strand for BH checks.
 * Optional metadata widens the melodic leap budget slightly when comp layers still leave occasional wide hook intervals.
 */
export function validateBarryHarrisConformance(
  score: ScoreModel,
  metadata?: GenerationMetadata
): BarryHarrisValidationResult {
  const errors: string[] = [];

  const fagenKeysComp =
    metadata?.songModeFagenKeysCompV15Applied === true && metadata?.songwriterStyleId === 'donald_fagen';

  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (guitar) {
    /** Melody (voice 1) only — same intent as `strictEnforceGlobalLeaps` skipping V2 edges in `ecmShapingPass.ts`. */
    const allPitches: number[] = [];
    const motifPitches: number[] = [];
    for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
      const melodyNotes = [...m.events]
        .filter((e) => isGuitarMelodyVoiceNote(e))
        .sort(
          (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
        );
      for (const e of melodyNotes) {
        const p = (e as { pitch: number }).pitch;
        allPitches.push(p);
        const ref = (e as { motifRef?: string }).motifRef;
        if (ref && MOTIF_REF_RE.test(ref)) motifPitches.push(p);
      }
    }
    const maxMelodyLeap = fagenKeysComp ? 18 : 12;
    let maxJump: number;
    if (fagenKeysComp && motifPitches.length >= 6) {
      maxJump = maxVoiceLeadJump(motifPitches);
    } else {
      maxJump = maxVoiceLeadJump(allPitches);
    }
    if (maxJump > maxMelodyLeap) errors.push('Voice-leading jumps excessive for current duo grammar');
  }

  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (bass) {
    const allPitches: number[] = [];
    for (const m of bass.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') allPitches.push(e.pitch);
      }
    }
    const maxJump = maxVoiceLeadJump(allPitches);
    /** Walking bass + register shifts: allow up to 14 st (echo / cadence moves). */
    if (maxJump > 14) errors.push('Bass voice-leading jumps excessive');
  }

  const chordCount = new Set(score.parts.flatMap((p) => p.measures.map((m) => m.chord).filter(Boolean))).size;
  if (chordCount < 3) errors.push('Harmony too static for current duo grammar');

  return { valid: errors.length === 0, errors };
}
