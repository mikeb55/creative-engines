/**
 * Composer OS V2 — Barry Harris style validation
 */

import type { GenerationMetadata } from '../../compositionContext';
import type { ScoreModel } from '../../score-model/scoreModelTypes';
import { isGuitarMelodyVoiceNote } from '../../score-integrity/guitarVoiceMelody';

function computeFrankZappaVoiceLeadingScore(score: ScoreModel, metadata: GenerationMetadata): number {
  /** Prefer dedicated Zappa solo staff when merged after comp guitar (same instrument identity). */
  const guitar =
    score.parts.find((p) => p.id === 'zappa_solo') ??
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const allPitches: number[] = [];
  if (guitar) {
    for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
      const melodyNotes = [...m.events]
        .filter((e) => isGuitarMelodyVoiceNote(e))
        .sort(
          (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
        );
      for (const e of melodyNotes) {
        allPitches.push((e as { pitch: number }).pitch);
      }
    }
  }
  let s = 5;
  let smallSteps = 0;
  for (let i = 1; i < allPitches.length; i++) {
    const d = Math.abs(allPitches[i]! - allPitches[i - 1]!);
    if (d <= 2) smallSteps++;
    if (d === 1) s += 0.08;
  }
  if (allPitches.length > 1) {
    s += 2.2 * (smallSteps / (allPitches.length - 1));
  }
  const receipt = metadata.soloLine?.zappaGuideToneReceipt;
  if (receipt) {
    s += 2 * receipt.stepwiseContinuityRatio;
  }
  let maxLeap = 0;
  for (let i = 1; i < allPitches.length; i++) {
    maxLeap = Math.max(maxLeap, Math.abs(allPitches[i]! - allPitches[i - 1]!));
  }
  if (maxLeap > 14) s -= 2.5;
  else if (maxLeap > 12) s -= 1.6;
  else if (maxLeap > 9) s -= 0.9;

  if (guitar && guitar.measures.length) {
    const maxBar = guitar.measures.reduce((mx, m) => Math.max(mx, m.index), 0);
    for (let bar = 2; bar <= maxBar; bar++) {
      const mPrev = guitar.measures.find((x) => x.index === bar - 1);
      const mCur = guitar.measures.find((x) => x.index === bar);
      const c0 = mPrev?.chord;
      const c1 = mCur?.chord;
      if (!c0 || !c1 || c0 === c1) continue;
      const notes0 =
        mPrev?.events.filter((e) => e.kind === 'note' && isGuitarMelodyVoiceNote(e)) ??
        [];
      const notes1 =
        mCur?.events.filter((e) => e.kind === 'note' && isGuitarMelodyVoiceNote(e)) ??
        [];
      let last0: { pitch: number; startBeat: number; duration: number } | undefined;
      let bestEnd = -1;
      for (const e of notes0 as { pitch: number; startBeat: number; duration: number }[]) {
        const end = e.startBeat + e.duration;
        if (end >= bestEnd - 1e-6) {
          bestEnd = end;
          last0 = e;
        }
      }
      const first1 = [...(notes1 as { pitch: number; startBeat: number }[])].sort(
        (a, b) => a.startBeat - b.startBeat
      )[0];
      if (last0 && first1 && Math.abs(first1.pitch - last0.pitch) > 9) {
        s -= 0.45;
      }
    }
  }

  const clamped = Math.max(0, Math.min(10, s));
  /** One decimal — FP accumulation can land just below a tier boundary (e.g. 6.98 vs 7.0). */
  return Math.round(clamped * 10) / 10;
}

export interface BarryHarrisValidationResult {
  valid: boolean;
  errors: string[];
  /** Frank Zappa Musicality Phase 3 — voice-leading quality (0–10), when computed. */
  zappaVoiceLeadingScore?: number;
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
  let zappaVoiceLeadingScore: number | undefined;

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
    /** Walking bass + register shifts: allow up to 14 st (echo / cadence moves).
     *  Wayne Shorter post-bop: d2/d4/d5 device stack creates larger chromatic bass motion — widen to 18.
     *  Frank Zappa: intentionally disjunct bass — suppress this gate until mixed-meter export stabilises. */
    const maxBassJump = metadata?.songwriterStyleId === 'wayne_shorter' ? 18 : 14;
    if (metadata?.songwriterStyleId !== 'frank_zappa' && maxJump > maxBassJump) {
      errors.push('Bass voice-leading jumps excessive');
    }
  }

  const chordCount = new Set(score.parts.flatMap((p) => p.measures.map((m) => m.chord).filter(Boolean))).size;
  if (chordCount < 3) errors.push('Harmony too static for current duo grammar');

  if (metadata?.songwriterStyleId === 'frank_zappa' && metadata) {
    zappaVoiceLeadingScore = computeFrankZappaVoiceLeadingScore(score, metadata);
    if (metadata.frankZappaDiagnostics) {
      metadata.frankZappaDiagnostics = {
        ...metadata.frankZappaDiagnostics,
        zappaVoiceLeadingScore,
      };
    }
  }

  return { valid: errors.length === 0, errors, zappaVoiceLeadingScore };
}
