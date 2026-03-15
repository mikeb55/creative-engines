/**
 * Contemporary Counterpoint Engine — Generator
 * Minimal scaffold: generates 2–4 lines with voice independence, rhythmic independence,
 * register interlock, phrase overlap. Output is structured line arrays.
 */

import type {
  CounterpointParameters,
  CounterpointLine,
  CounterpointNote,
  CounterpointOutput,
  HarmonicSegment,
} from './counterpointTypes';
import { DEFAULT_PARAMS } from './counterpointTypes';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function parseChordToRoot(chord: string): number {
  const roots: Record<string, number> = {
    C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
    'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
  };
  const m = chord.match(/^([A-G][#b]?)/);
  return roots[m?.[1] ?? 'C'] ?? 60;
}

function getScaleTones(root: number): number[] {
  const steps = [0, 2, 4, 5, 7, 9, 11];
  return steps.map((s) => root + s);
}

export function generateContemporaryCounterpoint(
  parameters: CounterpointParameters & { harmonicContext: HarmonicSegment[]; seed?: number }
): CounterpointOutput {
  const params = { ...DEFAULT_PARAMS, ...parameters };
  const { lineCount, rhythmicOffsetBias, seed = Date.now() } = params;
  const rand = seededRandom(seed);

  const segments = parameters.harmonicContext;
  const totalBars = segments.reduce((s, seg) => s + seg.bars, 0);
  const beatsPerBar = 4;

  const registers: ('low' | 'mid' | 'high')[] = ['low', 'mid', 'high'];
  const lines: CounterpointLine[] = [];
  const handoffPoints: number[] = [];
  const overlapPoints: number[] = [];

  for (let v = 0; v < Math.min(lineCount, 4); v++) {
    const register = registers[v % 3] as 'low' | 'mid' | 'high';
    const basePitch = register === 'low' ? 48 : register === 'mid' ? 60 : 72;
    const notes: CounterpointNote[] = [];
    const profile: string[] = [];

    let beat = 0;
    let segIdx = 0;
    let chordRoot = parseChordToRoot(segments[0]?.chord ?? 'C');
    let scaleTones = getScaleTones(chordRoot);

    while (beat < totalBars * beatsPerBar) {
      const segEnd = segments.slice(0, segIdx + 1).reduce((a, s) => a + s.bars * beatsPerBar, 0);
      if (beat >= segEnd && segIdx < segments.length - 1) {
        segIdx++;
        chordRoot = parseChordToRoot(segments[segIdx]?.chord ?? 'C');
        scaleTones = getScaleTones(chordRoot);
      }

      const offset = rhythmicOffsetBias * (rand() - 0.5) * 2;
      const step = 1 + Math.floor(rand() * 2);
      const pitchOffset = scaleTones[Math.floor(rand() * scaleTones.length)] - chordRoot;
      const pitch = basePitch + pitchOffset;

      notes.push({
        pitch: Math.max(36, Math.min(84, pitch)),
        onset: beat,
        duration: 0.5 + rand() * 1.5,
        voiceIndex: v,
      });
      profile.push(beat % 4 === 0 ? 'downbeat' : 'offbeat');

      beat += step + (offset > 0 ? 1 : 0);
    }

    if (v > 0 && rand() < params.overlapTolerance) {
      overlapPoints.push(totalBars * 2);
    }
    if (v > 0 && rand() < 0.4) {
      handoffPoints.push(Math.floor(totalBars / 2) * beatsPerBar);
    }

    lines.push({
      voiceIndex: v,
      notes,
      register,
      rhythmicProfile: profile,
    });
  }

  const impliedHarmony = segments.map((s) => s.chord);

  return {
    lines,
    impliedHarmony,
    totalBars,
    handoffPoints: [...new Set(handoffPoints)],
    overlapPoints: [...new Set(overlapPoints)],
  };
}
