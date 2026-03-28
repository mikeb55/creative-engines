/**
 * Form + style identity for Guitar–Bass Duo: soft scoring only (no hard gates).
 * Cadence clarity, motif presence, A/B contrast, harmonic pacing, Bacharach phrase bonus.
 */

import type { ScoreModel, PartModel, NoteEvent } from '../score-model/scoreModelTypes';
import type { MotifTrackerState } from '../motif/motifTypes';
import type { StyleStack } from '../style-modules/styleModuleTypes';
import type { CompositionContext } from '../compositionContext';
import { styleStackToModuleIds } from '../style-modules/styleModuleTypes';
import { chordTonesForChordSymbol, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';
import { analyzeGuitarSectionMeasures } from '../style-modules/bacharach/bacharachSignal';

const EPS = 1e-3;

/** Same harmonic map as generateGoldenPathDuoScore (2 bars per chord, cycling). */
export function goldenPathChordForBar(barIndex: number): string {
  const b = ((barIndex - 1) % 8) + 1;
  if (b <= 2) return 'Dmin9';
  if (b <= 4) return 'G13';
  if (b <= 6) return 'Cmaj9';
  return 'A7alt';
}

function userChordToneOpts(ctx?: CompositionContext) {
  return ctx && shouldUseUserChordSemanticsForTones(ctx) ? ({ lockedHarmony: true } as const) : undefined;
}

function isChordTone(pitch: number, chord: string, ctx?: CompositionContext): boolean {
  const t = chordTonesForChordSymbol(chord, userChordToneOpts(ctx));
  const pcs = [t.root, t.third, t.fifth, t.seventh].map((p) => p % 12);
  const pc = pitch % 12;
  return pcs.some((x) => x % 12 === pc);
}

function lastGuitarNoteInBar(guitar: PartModel, bar: number): NoteEvent | undefined {
  const m = guitar.measures.find((x) => x.index === bar);
  if (!m) return undefined;
  let best: NoteEvent | undefined;
  let bestStart = -1;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    if (n.startBeat >= bestStart) {
      bestStart = n.startBeat;
      best = n;
    }
  }
  return best;
}

function bassStrongBeatRootOrThird(bass: PartModel, bar: number, chord: string, ctx?: CompositionContext): boolean {
  const m = bass.measures.find((x) => x.index === bar);
  if (!m) return false;
  const t = chordTonesForChordSymbol(chord, userChordToneOpts(ctx));
  const rootPc = t.root % 12;
  const thirdPc = t.third % 12;
  const slashPc = parseChordSymbol(chord).slashBassPc;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    const sb = n.startBeat;
    const onStrong = Math.abs(sb) < EPS || Math.abs(sb - 2) < EPS;
    if (!onStrong) continue;
    const pc = n.pitch % 12;
    if (pc === rootPc || pc === thirdPc || (slashPc !== undefined && pc === slashPc)) return true;
  }
  return false;
}

/** Cadence bars: 4 (weaker dominant area), 8 (strong turnaround). */
function scoreCadenceClarity(score: ScoreModel, compositionContext?: CompositionContext): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;
  const lastBar = Math.max(...g.measures.map((m) => m.index));
  let s = 0;
  for (const bar of [4, lastBar]) {
    if (bar > lastBar) continue;
    const ch = g.measures.find((x) => x.index === bar)?.chord ?? goldenPathChordForBar(bar);
    const gn = lastGuitarNoteInBar(g, bar);
    if (gn && isChordTone(gn.pitch, ch, compositionContext)) s += 1.2;
    if (bassStrongBeatRootOrThird(b, bar, ch, compositionContext)) s += 0.8;
  }
  return s;
}

function intervalPattern(notes: { pitch: number }[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    out.push((notes[i].pitch - notes[i - 1].pitch + 12) % 12);
  }
  return out;
}

function motifSimilarityScore(motifState: MotifTrackerState, guitar: PartModel): number {
  if (!motifState.baseMotifs.length) return 0;
  const m0 = motifState.baseMotifs[0].notes;
  if (m0.length < 2) return 0;
  const pat = intervalPattern(m0);
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    if (m.index > 4) break;
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push((e as NoteEvent).pitch);
    }
  }
  if (pitches.length < pat.length + 1) return 0;
  let hits = 0;
  for (let i = 0; i <= pitches.length - pat.length - 1; i++) {
    const slice = pitches.slice(i, i + pat.length + 1);
    const iv = intervalPattern(slice.map((p) => ({ pitch: p })));
    let ok = true;
    for (let k = 0; k < pat.length; k++) {
      if (iv[k] !== pat[k]) {
        ok = false;
        break;
      }
    }
    if (ok) hits++;
  }
  const placements = motifState.placements.length;
  return Math.min(2.5, hits * 0.6 + placements * 0.15);
}

function scoreABContrast(guitar: PartModel, totalBars: number): number {
  const mid = totalBars <= 8 ? 4 : totalBars / 2;
  const aPitches: number[] = [];
  const bPitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const p = (e as NoteEvent).pitch;
      if (m.index <= mid) aPitches.push(p);
      else bPitches.push(p);
    }
  }
  if (!aPitches.length || !bPitches.length) return 0;
  const meanA = aPitches.reduce((s, x) => s + x, 0) / aPitches.length;
  const meanB = bPitches.reduce((s, x) => s + x, 0) / bPitches.length;
  return Math.min(2, Math.abs(meanB - meanA) / 6);
}

/** Early bars slower harmonic rhythm than cadence bars (2 bars/chord early vs implied motion at 4,8). */
function scoreHarmonicPacing(score: ScoreModel): number {
  let changes = 0;
  let prev = '';
  for (const m of score.parts[0]?.measures ?? []) {
    const c = m.chord ?? '';
    if (c && c !== prev) {
      changes++;
      prev = c;
    }
  }
  const n = score.parts[0]?.measures.length ?? 0;
  if (n <= 0) return 0;
  const density = changes / n;
  if (density > 0.6) return 0.3;
  return 1.2;
}

function scoreBacharachPhraseBonus(score: ScoreModel, styleStack?: StyleStack): number {
  if (!styleStack) return 0;
  const ids = styleStackToModuleIds(styleStack);
  if (!ids.includes('bacharach')) return 0;
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  const measA = g.measures.filter((m) => m.index >= 1 && m.index <= 4);
  const measB = g.measures.filter((m) => m.index >= 5 && m.index <= 8);
  const sigA = analyzeGuitarSectionMeasures(measA);
  const sigB = analyzeGuitarSectionMeasures(measB);
  let s = 0;
  if (sigA.offStrongGrid || sigB.offStrongGrid) s += 0.6;
  if (sigA.variety && sigB.variety) s += 0.5;
  const ordered = [...sigA.pitchesOrdered, ...sigB.pitchesOrdered];
  if (ordered.length < 4) return s;
  const maxP = Math.max(...ordered);
  const late = ordered.slice(Math.floor(ordered.length * 0.6));
  if (late.includes(maxP)) s += 0.8;
  return Math.min(2.5, s);
}

export interface FormIdentitySoftOpts {
  motifState?: MotifTrackerState;
  styleStack?: StyleStack;
  compositionContext?: CompositionContext;
}

/**
 * Soft lock score: motif identity, cadence clarity, contrast, pacing, Bacharach identity.
 */
export function scoreFormIdentitySoft(score: ScoreModel, opts?: FormIdentitySoftOpts): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  const totalBars = g.measures.length;

  const cad = scoreCadenceClarity(score, opts?.compositionContext);
  const motif = opts?.motifState ? motifSimilarityScore(opts.motifState, g) : 0;
  const contrast = scoreABContrast(g, totalBars);
  const pacing = scoreHarmonicPacing(score);
  const bach = scoreBacharachPhraseBonus(score, opts?.styleStack);

  return cad + motif + contrast + pacing + bach;
}
