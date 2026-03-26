/**
 * V3.4 — Infer key signature from chord roots (harmony only; slash bass does not vote for tonic).
 */

import { parseChordForMusicXmlHarmony } from '../export/chordSymbolMusicXml';
import type { CompositionContext, ChordSymbolPlan } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type {
  KeyInferenceResult,
  KeySignatureExport,
  KeySignatureReceiptMetadata,
  KeySignatureRequestMode,
  ResolvedKeySignature,
} from './keyInferenceTypes';

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Major-key fifths (Circle of fifths); enharmonic spelling fixed per PC. */
const MAJOR_FIFTHS_BY_PC: Record<number, number> = {
  0: 0,
  1: 7,
  2: 2,
  3: -3,
  4: 4,
  5: -1,
  6: 6,
  7: 1,
  8: -4,
  9: 3,
  10: -2,
  11: 5,
};

const PC_TO_SHARP_NAME: Record<number, string> = {
  0: 'C',
  1: 'C#',
  2: 'D',
  3: 'Eb',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'Ab',
  9: 'A',
  10: 'Bb',
  11: 'B',
};

export function rootLetterAlterToPc(step: string, alter: number): number {
  const base = STEP_TO_PC[step.toUpperCase()];
  if (base === undefined) return 0;
  return ((base + alter) % 12 + 12) % 12;
}

export function majorKeyFifthsForTonicPc(pc: number): number {
  return MAJOR_FIFTHS_BY_PC[pc] ?? 0;
}

/** Natural minor: same signature as relative major (3 semitones above tonic). */
export function minorKeyFifthsForTonicPc(pc: number): number {
  const relMaj = (pc + 3) % 12;
  return MAJOR_FIFTHS_BY_PC[relMaj] ?? 0;
}

function displayTonicName(pc: number): string {
  return PC_TO_SHARP_NAME[pc] ?? 'C';
}

function chordHarmonyRootOnly(chord: string): { pc: number; kindLower: string } {
  const p = parseChordForMusicXmlHarmony(chord.trim());
  const pc = rootLetterAlterToPc(p.rootStep, p.rootAlter);
  return { pc, kindLower: (p.kindText ?? '').toLowerCase() };
}

function isMinorishSuffix(kindLower: string): boolean {
  if (!kindLower) return false;
  if (kindLower.includes('maj') || kindLower.includes('major') || kindLower.includes('aug')) return false;
  return (
    /\bmin/.test(kindLower) ||
    /\bm7\b/.test(kindLower) ||
    /\bm9\b/.test(kindLower) ||
    /\bm11\b/.test(kindLower) ||
    /\bm6\b/.test(kindLower) ||
    /^m\d/.test(kindLower) ||
    /^m$/.test(kindLower) ||
    /dim/.test(kindLower) ||
    /^-/.test(kindLower)
  );
}

function isMajorishOrDomSuffix(kindLower: string): boolean {
  if (!kindLower) return true;
  if (isMinorishSuffix(kindLower)) return false;
  if (/maj/.test(kindLower) || /Δ/.test(kindLower) || /sus/.test(kindLower)) return true;
  if (/\d/.test(kindLower)) return true;
  return true;
}

function isHighlyChromaticSuffix(kindLower: string): boolean {
  return /alt|b5|#5|#9|b13|tritone|ø|o7|°|aug/.test(kindLower);
}

/**
 * Parse user tonal centre: "Bb", "F# minor", "gm", "Eb major".
 * Returns null if not recognised.
 */
export function parseTonalCenterString(raw: string): { tonicPc: number; mode: 'major' | 'minor' } | null {
  const t = raw.trim().toLowerCase();
  const minorWord = /\b(minor|min|m)\b/.test(t) || /\bm$/.test(t.replace(/\s/g, ''));
  const majorWord = /\b(major|maj)\b/.test(t);

  const cleaned = t
    .replace(/\b(minor|major|maj|min)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const m = cleaned.match(/^([a-g])([#b]?)$/i);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  let alter = 0;
  if (m[2] === '#') alter = 1;
  else if (m[2] === 'b') alter = -1;
  const pc = rootLetterAlterToPc(letter, alter);

  let mode: 'major' | 'minor' = 'major';
  if (minorWord && !majorWord) mode = 'minor';
  else if (majorWord) mode = 'major';
  else if (cleaned.endsWith('m') && cleaned.length <= 3) mode = 'minor';

  return { tonicPc: pc, mode };
}

function addVote(votes: number[], pc: number, w: number): void {
  votes[pc] = (votes[pc] ?? 0) + w;
}

/**
 * Expand chord symbol plan to one chord string per bar in order.
 */
export function chordsFromChordSymbolPlan(plan: ChordSymbolPlan): string[] {
  const out: string[] = [];
  for (const seg of plan.segments) {
    for (let i = 0; i < seg.bars; i++) {
      out.push(seg.chord);
    }
  }
  return out;
}

/**
 * Infer key from ordered chord symbols (harmonic roots only).
 */
export function inferKeyFromChords(chords: string[]): KeyInferenceResult {
  const n = chords.length;
  if (n === 0) {
    return {
      inferredTonicPc: 0,
      inferredTonicName: 'C',
      mode: 'ambiguous',
      confidence: 0,
      recommendedFifths: 0,
      recommendedMode: 'major',
      noKeySignatureRecommended: true,
      reason: 'no_chords',
    };
  }

  const votes: number[] = Array(12).fill(0);
  const minorPull: number[] = Array(12).fill(0);
  const majorPull: number[] = Array(12).fill(0);

  for (let i = 0; i < n; i++) {
    const { pc, kindLower } = chordHarmonyRootOnly(chords[i]);
    const wFreq = 0.35 / n;
    addVote(votes, pc, wFreq);
    if (i === 0) addVote(votes, pc, 0.18);
    if (i === n - 1) addVote(votes, pc, 0.16);

    if (isMinorishSuffix(kindLower)) {
      minorPull[pc] += 0.22;
    } else if (isMajorishOrDomSuffix(kindLower)) {
      majorPull[pc] += 0.18;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    const a = chordHarmonyRootOnly(chords[i]);
    const b = chordHarmonyRootOnly(chords[i + 1]);
    const d = (b.pc - a.pc + 12) % 12;
    if (d !== 5) continue;
    const domish = /7|13|9|11|alt/.test(a.kindLower);
    const iim = isMinorishSuffix(a.kindLower);
    if (domish && !iim) {
      addVote(votes, b.pc, 0.26);
      majorPull[b.pc] += 0.14;
    } else if (iim) {
      const tonic = (a.pc + 10) % 12;
      addVote(votes, tonic, 0.26);
      majorPull[tonic] += 0.14;
    } else {
      addVote(votes, b.pc, 0.18);
      addVote(votes, (a.pc + 10) % 12, 0.12);
    }
  }

  const scores: number[] = Array(12).fill(0);
  let best = 0;
  let second = 1;
  for (let pc = 0; pc < 12; pc++) {
    scores[pc] = votes[pc] + minorPull[pc] * 0.9 + majorPull[pc] * 0.85;
    if (scores[pc] > scores[best]) {
      second = best;
      best = pc;
    } else if (pc !== best && scores[pc] > scores[second]) {
      second = pc;
    }
  }

  const uniqRoots = new Set(chords.map((c) => chordHarmonyRootOnly(c).pc)).size;
  let chromaticPenalty = 0;
  for (const c of chords) {
    const { kindLower } = chordHarmonyRootOnly(c);
    if (isHighlyChromaticSuffix(kindLower)) chromaticPenalty += 0.07;
  }
  chromaticPenalty += Math.min(0.45, (uniqRoots / Math.max(4, n)) * 0.35);

  const top = scores[best];
  const runner = scores[second];
  const separation = top > 0 ? (top - runner) / (top + 0.01) : 0;

  let mode: 'major' | 'minor' | 'ambiguous' = 'ambiguous';
  const mScore = minorPull[best];
  const MJScore = majorPull[best];
  if (mScore > MJScore + 0.12) mode = 'minor';
  else if (MJScore > mScore + 0.12) mode = 'major';
  else mode = 'ambiguous';

  let confidence = Math.min(1, top * 1.4 * (0.55 + separation * 0.45));
  confidence = Math.max(0, confidence - chromaticPenalty);

  const ambiguousMode = mode === 'ambiguous';
  const lowSep = separation < 0.12 && n >= 4;
  const noKeySignatureRecommended =
    confidence < 0.38 || chromaticPenalty > 0.42 || (ambiguousMode && confidence < 0.55) || lowSep;

  let recommendedMode: 'major' | 'minor' = 'major';
  if (mode === 'minor') recommendedMode = 'minor';
  else if (mode === 'major') recommendedMode = 'major';
  else recommendedMode = minorPull[best] >= majorPull[best] ? 'minor' : 'major';

  const recommendedFifths =
    recommendedMode === 'major' ? majorKeyFifthsForTonicPc(best) : minorKeyFifthsForTonicPc(best);

  let reason: string | undefined;
  if (noKeySignatureRecommended) {
    if (chromaticPenalty > 0.38) reason = 'chromatic_or_wandering_harmony';
    else if (confidence < 0.38) reason = 'low_confidence';
    else if (ambiguousMode) reason = 'ambiguous_mode';
    else reason = 'weak_tonal_centre';
  }

  return {
    inferredTonicPc: best,
    inferredTonicName: displayTonicName(best),
    mode: ambiguousMode ? 'ambiguous' : recommendedMode === 'major' ? 'major' : 'minor',
    confidence,
    recommendedFifths,
    recommendedMode,
    noKeySignatureRecommended,
    reason,
  };
}

export interface ResolveKeyOptions {
  requestMode: KeySignatureRequestMode;
  /** Used when requestMode === 'override'. */
  tonalCenterOverride?: string;
}

export function resolveKeySignatureForExport(
  inference: KeyInferenceResult,
  opts: ResolveKeyOptions
): ResolvedKeySignature {
  const noneMode = opts.requestMode === 'none';
  const overrideRaw = opts.tonalCenterOverride?.trim();

  if (noneMode) {
    const meta: KeySignatureReceiptMetadata = {
      inferredTonicPc: inference.inferredTonicPc,
      inferredTonicName: inference.inferredTonicName,
      inferredMode: inference.mode === 'ambiguous' ? 'ambiguous' : inference.mode,
      confidence: inference.confidence,
      noKeySignatureRecommended: true,
      overrideUsed: false,
      noneMode: true,
      exportFifths: 0,
      exportMode: 'major',
      hideKeySignature: true,
    };
    return {
      export: {
        fifths: 0,
        mode: 'major',
        hideKeySignature: true,
        caption: 'Key signature suppressed (user: none / chromatic-friendly)',
      },
      metadata: meta,
    };
  }

  if (opts.requestMode === 'override') {
    if (overrideRaw) {
      const parsed = parseTonalCenterString(overrideRaw);
      if (parsed) {
        const fifths =
          parsed.mode === 'major' ? majorKeyFifthsForTonicPc(parsed.tonicPc) : minorKeyFifthsForTonicPc(parsed.tonicPc);
        const meta: KeySignatureReceiptMetadata = {
          inferredTonicPc: inference.inferredTonicPc,
          inferredTonicName: inference.inferredTonicName,
          inferredMode: inference.mode,
          confidence: inference.confidence,
          noKeySignatureRecommended: inference.noKeySignatureRecommended,
          overrideUsed: true,
          noneMode: false,
          exportFifths: fifths,
          exportMode: parsed.mode,
          hideKeySignature: false,
        };
        return {
          export: { fifths, mode: parsed.mode, hideKeySignature: false },
          metadata: meta,
        };
      }
    }
    // override requested but missing / unparseable → fall through to auto behaviour
  }

  // auto (or failed override → fall back to inference)
  if (inference.noKeySignatureRecommended) {
    const meta: KeySignatureReceiptMetadata = {
      inferredTonicPc: inference.inferredTonicPc,
      inferredTonicName: inference.inferredTonicName,
      inferredMode: inference.mode,
      confidence: inference.confidence,
      noKeySignatureRecommended: true,
      overrideUsed: false,
      noneMode: false,
      exportFifths: 0,
      exportMode: 'major',
      hideKeySignature: true,
    };
    return {
      export: {
        fifths: 0,
        mode: 'major',
        hideKeySignature: true,
        caption: 'Key signature suppressed (harmony ambiguous or highly chromatic)',
      },
      metadata: meta,
    };
  }

  const meta: KeySignatureReceiptMetadata = {
    inferredTonicPc: inference.inferredTonicPc,
    inferredTonicName: inference.inferredTonicName,
    inferredMode: inference.mode === 'ambiguous' ? 'ambiguous' : inference.mode,
    confidence: inference.confidence,
    noKeySignatureRecommended: false,
    overrideUsed: false,
    noneMode: false,
    exportFifths: inference.recommendedFifths,
    exportMode: inference.recommendedMode,
    hideKeySignature: false,
  };

  const exp: KeySignatureExport = {
    fifths: inference.recommendedFifths,
    mode: inference.recommendedMode,
    hideKeySignature: false,
  };

  return { export: exp, metadata: meta };
}

/**
 * Attach key signature to score + context after harmony is fixed (additive; no note changes).
 */
export function applyKeySignatureToScoreAndContext(
  score: ScoreModel,
  context: CompositionContext,
  options?: {
    keySignatureMode?: KeySignatureRequestMode;
    tonalCenterOverride?: string;
    /** Legacy echo field — used only when mode is `override` and override string omitted */
    tonalCenter?: string;
  }
): void {
  const chords = chordsFromChordSymbolPlan(context.chordSymbolPlan);
  const inference = inferKeyFromChords(chords);
  const reqMode = options?.keySignatureMode ?? 'auto';
  const overrideStr =
    (options?.tonalCenterOverride?.trim() || options?.tonalCenter?.trim()) ?? undefined;
  const resolved = resolveKeySignatureForExport(inference, {
    requestMode: reqMode,
    tonalCenterOverride: reqMode === 'override' ? overrideStr : undefined,
  });
  score.keySignature = resolved.export;
  context.generationMetadata.keySignatureReceipt = resolved.metadata;
}
