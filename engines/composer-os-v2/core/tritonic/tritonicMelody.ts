/**
 * V104p2 — Tritonic melody generation: voice-led cell chain → singable motif + MusicContext.
 * Always-on — no feature flag.
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import {
  computeMusicContextChecksum,
  coreMotifToMusicContextMotif,
} from '../music-context/musicContextAdapters';
import type { MusicContext } from '../music-context/musicContextTypes';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { TritonicCell } from './tritonicCell';
import {
  realiseTritonic,
  realisationToMusicContext,
  type TritonicRealisationContext,
} from './tritonicRealisation';
import { getVoiceLeadingCandidates, pitchClassMovement } from './tritonicVoiceLeading';

const MELODY_ANCHOR_MIDI = 67;

function pcToMidiNearAnchor(pc: PitchClass, anchorMidi: number): number {
  const anchorPc = ((anchorMidi % 12) + 12) % 12;
  let midi = anchorMidi - anchorPc + pc;
  while (midi < anchorMidi - 6) midi += 12;
  while (midi > anchorMidi + 6) midi -= 12;
  return midi;
}

/** Top-voice lane through a voice-led cell chain — singable register (≤6 semitone steps). */
export function extractSingableMelodyMidis(cells: readonly TritonicCell[]): number[] {
  if (cells.length === 0) return [];

  const first = cells[0]!;
  const topPc = [...first.notes].sort((a, b) => a - b).pop()!;
  let melodyVoiceIdx = first.notes.indexOf(topPc);
  let currentMidi = pcToMidiNearAnchor(topPc, MELODY_ANCHOR_MIDI);
  const midis: number[] = [currentMidi];

  for (let i = 1; i < cells.length; i++) {
    const from = cells[i - 1]!;
    const to = cells[i]!;
    const candidates = getVoiceLeadingCandidates(from, [to]);
    const vl = candidates[0];
    const movement = vl?.voiceMovement[melodyVoiceIdx] ?? 0;
    currentMidi += movement;
    midis.push(currentMidi);

    const targetPc = ((currentMidi % 12) + 12) % 12;
    melodyVoiceIdx = to.notes.findIndex((n) => n === targetPc);
    if (melodyVoiceIdx < 0) {
      melodyVoiceIdx = to.notes.reduce(
        (best, n, idx) =>
          Math.abs(pitchClassMovement(targetPc, n)) <
          Math.abs(pitchClassMovement(targetPc, to.notes[best]!))
            ? idx
            : best,
        0,
      );
    }
  }

  return midis;
}

export function melodyMidisToCoreMotif(midis: readonly number[]): CoreMotif {
  const intervalPattern = midis.slice(1).map((m, i) => midis[i + 1]! - midis[i]!);
  const contourPattern = intervalPattern.map((iv) => (iv > 0 ? 1 : iv < 0 ? -1 : 0));
  return {
    id: 'tritonic-melody-0',
    intervalPattern,
    rhythmPattern: midis.map((_, i) => ({ startBeat: i, duration: 1 })),
    contourPattern,
    roleTags: ['guide-tone'],
    registerTags: ['mid'],
  };
}

export type TritonicMelodyParams = {
  bpm?: number;
  seed?: number;
};

/**
 * Realise tritonic cells → harmony + voice-led singable motif.
 * harmony.bars via normalizeChordSymbol; checksum after normalisation.
 */
export function buildMusicContextFromTritonicMelody(
  ctx: TritonicRealisationContext,
  key: PitchClass,
  params?: TritonicMelodyParams,
): MusicContext {
  const result = realiseTritonic(ctx);
  const cells = result.phrases.flat();
  const base = realisationToMusicContext(result, key);

  const harmonyBars = base.harmony.bars.map((s) => s);
  const harmonyChecksum = computeMusicContextChecksum(harmonyBars);

  const melodyMidis = extractSingableMelodyMidis(cells);
  const coreMotif = melodyMidisToCoreMotif(melodyMidis);
  const motif = coreMotifToMusicContextMotif(coreMotif, 'tritonic');
  motif.anchorMidi = melodyMidis[0];
  motif.seedPitches = [...melodyMidis];

  return {
    ...base,
    seed: params?.seed ?? 0,
    presetId: `tritonic_melody_${result.mode}`,
    bpm: params?.bpm ?? base.bpm,
    totalBars: harmonyBars.length,
    harmony: {
      bars: harmonyBars,
      checksum: harmonyChecksum,
      source: 'generated',
    },
    motif,
    receipts: [
      {
        engine: 'tritonic',
        kind: 'tritonic_melody_complete',
        payload: {
          mode: result.mode,
          cellCount: cells.length,
          noteCount: melodyMidis.length,
          harmonyChecksum,
          melodyChecksum: computeMusicContextChecksum(melodyMidis.map(String)),
          floatingChecksum: result.checksum,
        },
      },
    ],
  };
}
