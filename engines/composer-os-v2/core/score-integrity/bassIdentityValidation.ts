/**
 * Guitar–Bass Duo — strict bass melodic identity / anti-loop gates.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import { chordTonesForGoldenChord } from '../goldenPath/guitarBassDuoHarmony';
import { contourFingerprint, rhythmFingerprint } from '../goldenPath/bassLineFingerprints';

function chordForBar(barIndex: number): string {
  if (barIndex <= 2) return 'Dmin9';
  if (barIndex <= 4) return 'G13';
  if (barIndex <= 6) return 'Cmaj9';
  return 'A7alt';
}

export interface BassIdentityResult {
  valid: boolean;
  errors: string[];
}

/**
 * Golden-path bass must read as a melodic voice: contour, rhythm, targets, anti-loop.
 */
export function validateBassIdentity(score: ScoreModel, opts?: { presetId?: string }): BassIdentityResult {
  if (opts?.presetId === 'ecm_chamber') return { valid: true, errors: [] };
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
    const chord = chordForBar(n.bar);
    const rootPc = chordTonesForGoldenChord(chord).root % 12;
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
    const rootPc = chordTonesForGoldenChord(chordForBar(m.index)).root % 12;
    if (first.pitch % 12 !== rootPc) nonRootFirstBars++;
  }
  const minNonRoot = longForm ? Math.min(4, Math.max(2, Math.floor(nBassBars / 10))) : 2;
  if (nonRootFirstBars < minNonRoot) {
    errors.push('Bass identity: not enough non-root phrase starts (target-tone voice required)');
  }

  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  let answerBars = 0;
  if (guitar) {
    for (let bar = 1; bar <= 8; bar++) {
      const gm = guitar.measures.find((x) => x.index === bar);
      const bm = bass.measures.find((x) => x.index === bar);
      if (!gm || !bm) continue;
      const g1 = gm.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
      const b1 = bm.events.find((e) => e.kind === 'note') as { startBeat: number } | undefined;
      if (g1 && b1 && g1.startBeat !== b1.startBeat) answerBars++;
    }
  }
  const minAnswer = longForm ? 2 : 3;
  if (answerBars < minAnswer) {
    errors.push('Bass identity: insufficient conversational onset contrast with guitar');
  }

  let echoHits = 0;
  if (guitar) {
    for (let bar = 1; bar <= 8; bar++) {
      const gm = guitar.measures.find((x) => x.index === bar);
      const bm = bass.measures.find((x) => x.index === bar);
      if (!gm || !bm) continue;
      const gPitches = gm.events.filter((e) => e.kind === 'note').map((e) => (e as { pitch: number }).pitch);
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
  }
  const minEcho = longForm ? 1 : 2;
  if (echoHits < minEcho) {
    errors.push('Bass identity: motif echo / shared pitch-class with guitar too weak');
  }

  return { valid: errors.length === 0, errors };
}
