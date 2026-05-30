/**
 * V88 practice layer — extract etude/practice targets from any MusicContext (always-on).
 */

import {
  chordTonesForChordSymbol,
  normalizeChordSymbol,
} from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
  harmonyBarsFromMusicContext,
} from '../music-context/musicContextAdapters';
import type { MusicContext } from '../music-context/musicContextTypes';
import type {
  GuideToneLineEntry,
  PracticeDifficultyRating,
  PracticeLayer,
  PracticeSequenceStep,
  RhythmicFocus,
  ScaleRecommendation,
} from './practiceLayerTypes';

const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

function pcName(pc: number): string {
  return PC_NAMES[((pc % 12) + 12) % 12]!;
}

function uniqueChordsInOrder(bars: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const bar of bars) {
    const sym = normalizeChordSymbol(String(bar || '').trim());
    if (!sym || seen.has(sym)) continue;
    seen.add(sym);
    out.push(sym);
  }
  return out;
}

function guideTonesForSymbol(symbol: string): { thirdPc: number; seventhPc: number | null } {
  const tones = chordTonesForChordSymbol(symbol, { lockedHarmony: true });
  const thirdPc = ((tones.third % 12) + 12) % 12;
  const hasSeventh = tones.seventh > 0 && tones.seventh !== tones.root;
  const seventhPc = hasSeventh ? ((tones.seventh % 12) + 12) % 12 : null;
  return { thirdPc, seventhPc };
}

function nearestVoiceLeadingMotion(prevAnchor: number, nextThird: number, nextSeventh: number | null): number {
  const candidates = [nextThird, ...(nextSeventh != null ? [nextSeventh] : [])];
  let best = candidates[0]!;
  let bestDist = Infinity;
  for (const pc of candidates) {
    for (const octave of [-12, 0, 12]) {
      const midi = pc + 60 + octave;
      const prevMidi = prevAnchor + 60;
      const dist = Math.abs(midi - prevMidi);
      if (dist < bestDist) {
        bestDist = dist;
        best = pc;
      }
    }
  }
  return ((best - prevAnchor + 18) % 12) - 6;
}

function buildGuideToneLines(bars: readonly string[]): GuideToneLineEntry[] {
  const lines: GuideToneLineEntry[] = [];
  let prevAnchor: number | null = null;
  for (let i = 0; i < bars.length; i++) {
    const chordSymbol = normalizeChordSymbol(String(bars[i] || '').trim());
    if (!chordSymbol) continue;
    const { thirdPc, seventhPc } = guideTonesForSymbol(chordSymbol);
    const voiceLeadingMotion =
      prevAnchor == null
        ? null
        : nearestVoiceLeadingMotion(prevAnchor, thirdPc, seventhPc);
    lines.push({ barIndex: i, chordSymbol, thirdPc, seventhPc, voiceLeadingMotion });
    prevAnchor = seventhPc ?? thirdPc;
  }
  return lines;
}

function scaleForChord(symbol: string): ScaleRecommendation {
  const s = symbol.toLowerCase();
  if (/7alt|\balt\b|7b9|7#9|7#5|7b5/.test(s)) {
    return { chordSymbol: symbol, scale: 'altered', rationale: 'altered dominant colour tones' };
  }
  if (/maj7#11|#11/.test(s)) {
    return { chordSymbol: symbol, scale: 'lydian', rationale: 'Lydian major over #11 maj7' };
  }
  if (/maj7|maj9|\^7/.test(s)) {
    return { chordSymbol: symbol, scale: 'ionian', rationale: 'major seventh tonic colour' };
  }
  if (/m7b5|ø/.test(s)) {
    return { chordSymbol: symbol, scale: 'locrian', rationale: 'half-diminished / iiø function' };
  }
  if (/m7|min7|-7|m9/.test(s)) {
    return { chordSymbol: symbol, scale: 'dorian', rationale: 'minor seventh — Dorian modal colour' };
  }
  if (/7sus|sus4|sus2/.test(s)) {
    return { chordSymbol: symbol, scale: 'mixolydian', rationale: 'suspended dominant pedal' };
  }
  if (/(^|[^a-z])7/.test(s)) {
    return { chordSymbol: symbol, scale: 'mixolydian', rationale: 'dominant seventh — Mixolydian base' };
  }
  if (/\bm(?!aj)/.test(s) || /min/.test(s)) {
    return { chordSymbol: symbol, scale: 'aeolian', rationale: 'minor triad — natural minor' };
  }
  return { chordSymbol: symbol, scale: 'major', rationale: 'diatonic major / ionian centre' };
}

function buildScaleRecommendations(targets: readonly string[]): ScaleRecommendation[] {
  return targets.map(scaleForChord);
}

function buildRhythmicFocus(ctx: MusicContext): RhythmicFocus {
  const meter = `${ctx.meter.beats}/${ctx.meter.beatType}`;
  const motif = ctx.motif?.rhythmPattern ?? [];
  if (motif.length > 0) {
    const counts = new Map<number, number>();
    for (const r of motif) {
      const d = Number(r.duration);
      if (!Number.isFinite(d) || d <= 0) continue;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    let dominantDurationBeats: number | null = null;
    let max = 0;
    for (const [dur, n] of counts) {
      if (n > max) {
        max = n;
        dominantDurationBeats = dur;
      }
    }
    const label =
      dominantDurationBeats != null
        ? `${meter} · motif pulse ${dominantDurationBeats} beat(s) @ ${ctx.bpm} bpm`
        : `${meter} @ ${ctx.bpm} bpm (motif-derived)`;
    return {
      label,
      meter,
      bpm: ctx.bpm,
      motifDerived: true,
      dominantDurationBeats,
    };
  }
  return {
    label: `${meter} @ ${ctx.bpm} bpm`,
    meter,
    bpm: ctx.bpm,
    motifDerived: false,
    dominantDurationBeats: ctx.meter.beats,
  };
}

function chordDifficultyWeight(symbol: string): number {
  const s = symbol.toLowerCase();
  if (/alt|#11|b9|#9|dim|°|ø|m7b5|aug|\+/.test(s)) return 2;
  if (/7|sus|9|11|13/.test(s)) return 1;
  return 0;
}

function rateDifficulty(targets: readonly string[], totalBars: number): PracticeDifficultyRating {
  let score = targets.reduce((s, c) => s + chordDifficultyWeight(c), 0);
  if (targets.length > 8) score += 2;
  else if (targets.length > 5) score += 1;
  if (totalBars > 32) score += 1;
  if (score <= 2) return 'easy';
  if (score <= 5) return 'medium';
  if (score <= 9) return 'hard';
  return 'advanced';
}

function sortChordsForPractice(targets: readonly string[]): string[] {
  return [...targets].sort((a, b) => chordDifficultyWeight(a) - chordDifficultyWeight(b));
}

function buildPracticeSequence(params: {
  ctx: MusicContext;
  targets: readonly string[];
  rhythmicFocus: RhythmicFocus;
  difficulty: PracticeDifficultyRating;
}): PracticeSequenceStep[] {
  const sorted = sortChordsForPractice(params.targets);
  const easyBatch = sorted.filter((c) => chordDifficultyWeight(c) === 0);
  const colourBatch = sorted.filter((c) => chordDifficultyWeight(c) > 0);
  const steps: PracticeSequenceStep[] = [
    {
      order: 1,
      focus: 'key_center',
      label: `Key centre ${params.ctx.key.root} ${params.ctx.key.mode} — sing/arpeggiate home scale`,
    },
    {
      order: 2,
      focus: 'chord_vocabulary',
      label: 'Learn unique chord shapes (simple → colour)',
      chordSymbols: sorted,
    },
  ];
  if (easyBatch.length > 0) {
    steps.push({
      order: 3,
      focus: 'chord_vocabulary',
      label: 'Diatonic chord drill',
      chordSymbols: easyBatch,
    });
  }
  steps.push({
    order: steps.length + 1,
    focus: 'guide_tone_line',
    label: 'Voice-lead 3rds/7ths through the progression',
  });
  steps.push({
    order: steps.length + 1,
    focus: 'scale_work',
    label: 'Scale-of-the-moment per chord',
    chordSymbols: sorted,
  });
  if (colourBatch.length > 0 && params.difficulty !== 'easy') {
    steps.push({
      order: steps.length + 1,
      focus: 'scale_work',
      label: 'Colour-chord scale drill (altered / Lydian / locrian)',
      chordSymbols: colourBatch,
    });
  }
  steps.push({
    order: steps.length + 1,
    focus: 'rhythm',
    label: params.rhythmicFocus.label,
  });
  return steps.map((s, i) => ({ ...s, order: i + 1 }));
}

/** Extract practice etude targets from any MusicContext producer output. */
export function buildPracticeLayerFromMusicContext(ctx: MusicContext): PracticeLayer {
  const bars = harmonyBarsFromMusicContext(ctx);
  const normalizedBars = bars.map(normalizeChordSymbol);
  const checksum = computeMusicContextChecksum(normalizedBars);
  if (checksum !== ctx.harmony.checksum) {
    throw new Error('Practice layer: harmony checksum mismatch after normalisation');
  }

  const targetChordSymbols = uniqueChordsInOrder(normalizedBars);
  const guideToneLines = buildGuideToneLines(normalizedBars);
  const scaleRecommendations = buildScaleRecommendations(targetChordSymbols);
  const rhythmicFocus = buildRhythmicFocus(ctx);
  const difficultyRating = rateDifficulty(targetChordSymbols, normalizedBars.length);
  const practiceSequence = buildPracticeSequence({
    ctx,
    targets: targetChordSymbols,
    rhythmicFocus,
    difficulty: difficultyRating,
  });

  const payload = {
    chordCount: targetChordSymbols.length,
    guideToneLineLength: guideToneLines.length,
    difficultyRating,
    scaleCount: scaleRecommendations.length,
  };

  return {
    targetChordSymbols,
    guideToneLines,
    scaleRecommendations,
    rhythmicFocus,
    difficultyRating,
    practiceSequence,
    provenance: {
      sourceEngineId: 'practice_layer',
      capturedAt: Date.now(),
      sourceContextEngineId: ctx.provenance?.sourceEngineId,
    },
    receipt: {
      engine: 'practice_layer',
      kind: 'practice_layer_complete',
      payload,
    },
  };
}

/** Human-readable guide-tone pitch names for UI / export. */
export function guideToneLinePitchNames(entry: GuideToneLineEntry): {
  third: string;
  seventh: string | null;
} {
  return {
    third: pcName(entry.thirdPc),
    seventh: entry.seventhPc == null ? null : pcName(entry.seventhPc),
  };
}
