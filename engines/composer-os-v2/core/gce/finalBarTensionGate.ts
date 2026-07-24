/**
 * Final-bar tension hard gate — shared evaluator for formal GCE / LOCK harnesses.
 *
 * Numeric threshold unchanged: tension > FINAL_BAR_TENSION_HARD_GATE fails in `terminal` context only.
 * `loop` (riff_generator default): never auto-fails (loop-setup tension expected).
 * `open_idiom`: never auto-fails; emits disclosure (chord-loop-trust style acknowledgment surface).
 * User preference `openIdiomDefault` (default OFF) promotes terminal → open_idiom when set.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { resolveMelodicPartId } from './resolveMelodicPartId';
import { resolveEndingContext, type EndingContext } from './endingContext';

/** Spec: docs/GCE_FRAMEWORK_V2.md — Final bar tension > 0.7 (accidental ending). */
export const FINAL_BAR_TENSION_HARD_GATE = 0.7;

export interface OpenIdiomEndingDisclosure {
  /** User/request consciously accepted an open (unresolved) terminal ending. */
  acknowledged: true;
  endingContext: 'open_idiom';
  finalChord: string;
  tension: number;
  finalBar: number;
  /** Short musician-facing note for UI banner. */
  summary: string;
  /** True when open_idiom came from user-level `openIdiomDefault` preference. */
  viaOpenIdiomDefault?: true;
}

export interface FinalBarTensionGateInput {
  score: ScoreModel;
  /** One chord symbol per scored bar (1-based bar i → chords[i-1]). */
  chords: string[];
  endingContext?: EndingContext | null;
  presetId?: string | null;
  acknowledgeOpenIdiomEnding?: boolean | null;
  /** User preference (default OFF): same gate treatment as acknowledgeOpenIdiomEnding. */
  openIdiomDefault?: boolean | null;
  /** Override final bar index (1-based). Default: chords.length. */
  finalBar?: number;
}

export interface FinalBarTensionGateResult {
  endingContext: EndingContext;
  tension: number;
  finalChord: string;
  finalBar: number;
  /** Hard-gate PASS/FAIL — false only when terminal + tension > threshold. */
  pass: boolean;
  /** True when context exempts auto-fail (loop or open_idiom). */
  autoFailExempt: boolean;
  detail: string;
  /** Present when open_idiom and tension would have failed under terminal rules. */
  disclosure: OpenIdiomEndingDisclosure | null;
}

export function isTonicFamilyChordForFbt(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  const q = s.toLowerCase();
  if (/maj7|maj9/i.test(s) && !q.includes('min')) return true;
  if (/^[^/]*min(?!maj)/i.test(s) && !q.includes('13') && !q.includes('alt')) return true;
  if (/^[^/]*min9/i.test(s)) return true;
  return false;
}

export function isDominantFamilyChordForFbt(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  if (isTonicFamilyChordForFbt(s)) return false;
  const q = s.toLowerCase();
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

function melodyNotesInBar(score: ScoreModel, bar: number): number {
  const partId = resolveMelodicPartId(score);
  const part = score.parts.find((p) => p.id === partId) ?? score.parts[0];
  const m = part?.measures.find((x) => x.index === bar);
  if (!m) return 0;
  return m.events.filter((e) => e.kind === 'note').length;
}

/**
 * Chord/melody tension proxy (0–1). Formula unchanged from Verlaine/Jamerson harnesses.
 */
export function computeFinalBarTensionProxy(
  score: ScoreModel,
  chords: string[],
  finalBar?: number
): { tension: number; finalChord: string; finalBar: number } {
  const bar = finalBar ?? chords.length;
  const chord = (chords[bar - 1] ?? '').trim();
  const shortMelodicEnding = melodyNotesInBar(score, bar) <= 2;
  let tension: number;
  if (isDominantFamilyChordForFbt(chord)) tension = 0.95 + (shortMelodicEnding ? 0.15 : 0);
  else if (isTonicFamilyChordForFbt(chord)) tension = 0.15;
  else tension = 0.55;
  return { tension: Math.min(1, tension), finalChord: chord, finalBar: bar };
}

/**
 * Evaluate finalBarTension hard gate with endingContext.
 * Threshold numeric value is never softened — only whether auto-fail applies.
 */
export function evaluateFinalBarTensionGate(input: FinalBarTensionGateInput): FinalBarTensionGateResult {
  const endingContext = resolveEndingContext({
    presetId: input.presetId,
    endingContext: input.endingContext,
    acknowledgeOpenIdiomEnding: input.acknowledgeOpenIdiomEnding,
    openIdiomDefault: input.openIdiomDefault,
  });
  const { tension, finalChord, finalBar } = computeFinalBarTensionProxy(
    input.score,
    input.chords,
    input.finalBar
  );
  const wouldFailTerminal = tension > FINAL_BAR_TENSION_HARD_GATE;
  const autoFailExempt = endingContext === 'loop' || endingContext === 'open_idiom';
  const pass = autoFailExempt ? true : !wouldFailTerminal;

  let disclosure: OpenIdiomEndingDisclosure | null = null;
  if (endingContext === 'open_idiom' && wouldFailTerminal) {
    const viaDefault = input.openIdiomDefault === true;
    disclosure = {
      acknowledged: true,
      endingContext: 'open_idiom',
      finalChord,
      tension,
      finalBar,
      summary: viaDefault
        ? 'Open ending via preference (openIdiomDefault) — final bar stays unresolved on purpose (finalBarTension would fail under terminal rules).'
        : 'Open ending acknowledged — final bar stays unresolved on purpose (finalBarTension would fail under terminal rules).',
      ...(viaDefault ? { viaOpenIdiomDefault: true as const } : {}),
    };
  }

  const detail = [
    `proxy=${tension.toFixed(3)}`,
    `finalChord=${finalChord || '(empty)'}`,
    `endingContext=${endingContext}`,
    `threshold=${FINAL_BAR_TENSION_HARD_GATE}`,
    autoFailExempt ? `autoFailExempt=${endingContext}` : 'autoFailExempt=false',
  ].join(' ');

  return {
    endingContext,
    tension,
    finalChord,
    finalBar,
    pass,
    autoFailExempt,
    detail,
    disclosure,
  };
}

/** Convenience for harness hard-gate rows. */
export function finalBarTensionHardGatePass(
  score: ScoreModel,
  chords: string[],
  opts?: {
    endingContext?: EndingContext | null;
    presetId?: string | null;
    acknowledgeOpenIdiomEnding?: boolean | null;
    openIdiomDefault?: boolean | null;
    finalBar?: number;
  }
): boolean {
  return evaluateFinalBarTensionGate({
    score,
    chords,
    endingContext: opts?.endingContext,
    presetId: opts?.presetId,
    acknowledgeOpenIdiomEnding: opts?.acknowledgeOpenIdiomEnding,
    openIdiomDefault: opts?.openIdiomDefault,
    finalBar: opts?.finalBar,
  }).pass;
}