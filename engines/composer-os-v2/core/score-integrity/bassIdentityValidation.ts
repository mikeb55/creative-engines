/**
 * Guitar–Bass Duo — strict bass melodic identity / anti-loop gates.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { chordTonesForGoldenChord } from '../goldenPath/guitarBassDuoHarmony';
import { contourFingerprint, rhythmFingerprint } from '../goldenPath/bassLineFingerprints';
import { GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID } from '../presets/guitarBassDuoPresetIds';
import { isGuitarMelodyVoiceNote } from './guitarVoiceMelody';
import { noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';
import { chordSymbolRootPc } from '../voicing/ensembleHarmonyUtils';

/** Builtin golden-path root map (default for all non-Marr styles). */
function goldenChordForBar(barIndex: number): string {
  if (barIndex <= 2) return 'Dmin9';
  if (barIndex <= 4) return 'G13';
  if (barIndex <= 6) return 'Cmaj9';
  return 'A7alt';
}

/** Live harmony for bar: bass measure chord → guitar measure chord → golden fallback. */
function liveChordSymbolForBar(score: ScoreModel, barIndex: number): string {
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const fromBass = bass?.measures.find((m) => m.index === barIndex)?.chord?.trim();
  if (fromBass) return fromBass;
  const fromGuitar = guitar?.measures.find((m) => m.index === barIndex)?.chord?.trim();
  if (fromGuitar) return fromGuitar;
  return goldenChordForBar(barIndex);
}

/**
 * Bass "root" PC for identity gates = chord-symbol root (not slash bass).
 * Golden builtins keep prior map semantics; live Marr symbols use parsed harmony root.
 */
function rootPcForBassIdentityChord(chord: string): number {
  switch (chord) {
    case 'Dmin9':
    case 'G13':
    case 'Cmaj9':
    case 'A7alt':
      return chordTonesForGoldenChord(chord).root % 12;
    default: {
      const root = chordSymbolRootPc(chord);
      if (root !== undefined) return ((root % 12) + 12) % 12;
      const m = chord.trim().match(/^([A-G](?:#|b)?)/i);
      const pc = m ? noteNameToPitchClass(m[1]!) : undefined;
      return pc !== undefined ? ((pc % 12) + 12) % 12 : chordTonesForGoldenChord(chord).root % 12;
    }
  }
}

/** Root PC for root-only / phrase-start gates. Live chords are Marr-only. */
function rootPcForBar(
  score: ScoreModel,
  barIndex: number,
  useLiveChordRoots: boolean
): number {
  if (useLiveChordRoots) {
    return rootPcForBassIdentityChord(liveChordSymbolForBar(score, barIndex));
  }
  return chordTonesForGoldenChord(goldenChordForBar(barIndex)).root % 12;
}

export interface BassIdentityResult {
  valid: boolean;
  errors: string[];
}

/** Classic duo head window is 8 bars; shorter locked forms only count bars that exist. */
export function bassMotifEchoHeadBars(nBassBars: number): number {
  return Math.min(8, Math.max(1, nBassBars));
}

/**
 * Motif-echo minimum — same formula as {@link validateBassIdentity}.
 * 8-bar étude keeps minEcho=2; sub-8 heads require ≥1; long-form (≥16) requires 1.
 */
export function minBassMotifEchoHits(nBassBars: number): number {
  const longForm = nBassBars >= 16;
  const head = bassMotifEchoHeadBars(nBassBars);
  return longForm ? 1 : head < 8 ? 1 : 2;
}

/**
 * Count bars in the echo head window with a shared pitch-class between guitar Voice-1
 * and any bass note — same criteria as {@link validateBassIdentity}.
 */
export function countBassMotifEchoHits(score: ScoreModel): number {
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!bass || !guitar) return 0;
  const head = bassMotifEchoHeadBars(bass.measures.length);
  let echoHits = 0;
  for (let bar = 1; bar <= head; bar++) {
    const gm = guitar.measures.find((x) => x.index === bar);
    const bm = bass.measures.find((x) => x.index === bar);
    if (!gm || !bm) continue;
    const gPitches = gm.events
      .filter((e) => isGuitarMelodyVoiceNote(e))
      .map((e) => (e as { pitch: number }).pitch);
    if (gPitches.length === 0) continue;
    const gPc = new Set(gPitches.map((p) => p % 12));
    for (const e of bm.events) {
      if (e.kind !== 'note') continue;
      const bp = (e as { pitch: number }).pitch % 12;
      if (gPc.has(bp)) {
        echoHits++;
        break;
      }
    }
  }
  return echoHits;
}

/**
 * Golden-path bass must read as a melodic voice: contour, rhythm, targets, anti-loop.
 * `useLiveChordRoots` — Marr only; all other styles keep the golden-map root checker.
 */
export function validateBassIdentity(
  score: ScoreModel,
  opts?: { presetId?: string; zappaStructuralRelax?: boolean; useLiveChordRoots?: boolean }
): BassIdentityResult {
  if (opts?.presetId === 'ecm_chamber') return { valid: true, errors: [] };
  /** Walking-bass / LOCK gates target full duo texture; single-line mode enforces monophony elsewhere. */
  if (opts?.presetId === GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID) return { valid: true, errors: [] };
  /** Frank Zappa duo: guide-tone / root-forward bass is intentional; jazz-pop bass-identity heuristics are non-blocking. */
  if (opts?.zappaStructuralRelax) return { valid: true, errors: [] };
  const useLiveChordRoots = opts?.useLiveChordRoots === true;
  const errors: string[] = [];
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return { valid: true, errors: [] };
  const nBassBars = bass.measures.length;
  const longForm = nBassBars >= 16;
  const longForm32 = nBassBars >= 32;

  const notes: { bar: number; pitch: number; start: number; dur: number }[] = [];
  for (const m of bass.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        notes.push({
          bar: m.index,
          pitch: (e as { pitch: number }).pitch,
          start: (e as { startBeat: number }).startBeat,
          dur: (e as { duration: number }).duration,
        });
      }
    }
  }

  if (notes.length < 8) {
    errors.push('Bass identity: insufficient melodic activity (need sustained line)');
  }

  let rootRun = 0;
  let maxRootRun = 0;
  for (const n of notes) {
    const rootPc = rootPcForBar(score, n.bar, useLiveChordRoots);
    if (n.pitch % 12 === rootPc) {
      rootRun++;
      maxRootRun = Math.max(maxRootRun, rootRun);
    } else {
      rootRun = 0;
    }
  }
  if (maxRootRun >= 5) {
    errors.push('Bass identity: excessive root-only chain (melodic targets required)');
  }

  const fingerprints: string[] = [];
  for (const m of bass.measures) {
    fingerprints.push(rhythmFingerprint(m));
  }
  const minRhythmRun = longForm ? 4 : 3;
  for (let i = 0; i <= fingerprints.length - minRhythmRun; i++) {
    const slice = fingerprints.slice(i, i + minRhythmRun);
    if (slice.length < minRhythmRun) continue;
    const a = slice[0];
    if (!a || a.length === 0) continue;
    if (slice.every((x) => x === a)) {
      errors.push('Bass identity: rhythmic cell repeated across more than two consecutive bars');
      break;
    }
  }

  const contours = bass.measures.map((m) => contourFingerprint(m)).filter((c) => c.length > 0);
  const distinctContours = new Set(contours);
  const minDistinct = longForm ? (longForm32 ? 3 : 3) : 4;
  if (distinctContours.size < minDistinct) {
    errors.push('Bass identity: insufficient contour variety across the line');
  }

  const contourCounts = new Map<string, number>();
  for (const c of contours) {
    contourCounts.set(c, (contourCounts.get(c) ?? 0) + 1);
  }
  const maxSameContour = longForm32 ? 9 : longForm ? 7 : 5;
  for (const [, count] of contourCounts) {
    if (count >= maxSameContour) {
      errors.push('Bass identity: identical contour reused too broadly (phrase variety required)');
      break;
    }
  }

  const allPitches = notes.map((n) => n.pitch);
  if (allPitches.length) {
    const span = Math.max(...allPitches) - Math.min(...allPitches);
    if (span < 7) {
      errors.push('Bass identity: register span too static (melodic arc required)');
    }
  }

  let nonRootFirstBars = 0;
  for (const m of bass.measures) {
    const first = m.events.find((e) => e.kind === 'note') as { pitch: number } | undefined;
    if (!first) continue;
    const rootPc = rootPcForBar(score, m.index, useLiveChordRoots);
    if (first.pitch % 12 !== rootPc) nonRootFirstBars++;
  }
  const minNonRoot = longForm ? Math.min(4, Math.max(2, Math.floor(nBassBars / 10))) : 2;
  if (nonRootFirstBars < minNonRoot) {
    errors.push('Bass identity: not enough non-root phrase starts (target-tone voice required)');
  }

  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  /** Classic duo head window is 8 bars; shorter locked forms only count bars that exist. */
  const head = bassMotifEchoHeadBars(nBassBars);
  let answerBars = 0;
  if (guitar) {
    for (let bar = 1; bar <= head; bar++) {
      const gm = guitar.measures.find((x) => x.index === bar);
      const bm = bass.measures.find((x) => x.index === bar);
      if (!gm || !bm) continue;
      const g1 = gm.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
      const b1 = bm.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
      if (g1 && b1 && g1.startBeat !== b1.startBeat) answerBars++;
    }
  }
  /** 8-bar étude keeps minAnswer=3; sub-8 heads scale down without touching long-form. */
  const minAnswer = longForm ? 2 : head < 8 ? 1 : 3;
  if (answerBars < minAnswer) {
    errors.push('Bass identity: insufficient conversational onset contrast with guitar');
  }

  const echoHits = countBassMotifEchoHits(score);
  const minEcho = minBassMotifEchoHits(nBassBars);
  if (echoHits < minEcho) {
    errors.push('Bass identity: motif echo / shared pitch-class with guitar too weak');
  }

  return { valid: errors.length === 0, errors };
}
