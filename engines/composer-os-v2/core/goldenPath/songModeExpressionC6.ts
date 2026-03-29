/**
 * Phase C6 — Expression (V1): guitar-only velocity + articulation shaping after C5.
 * No onset/duration/count/bar edits; deterministic (seededUnit); yields to C5 caps / reduction.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { seededUnit } from './guitarBassDuoHarmony';
import { songModePhraseSegments } from './songModePhraseEngineV1';
import { getEffectiveRhythmStrength } from '../rhythmIntentResolve';

type RhythmMode = 'stable' | 'balanced' | 'surprise';

export interface SongModeC6PhraseRow {
  phraseIndex: number;
  c6Active: boolean;
  c6Summary?: string;
}

function cloneGuitarPhraseNotes(
  guitar: PartModel,
  startBar: number,
  endBar: number
): Map<number, Array<{ vel: number; articulation?: NoteEvent['articulation'] }>> {
  const map = new Map<number, Array<{ vel: number; articulation?: NoteEvent['articulation'] }>>();
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    const rows: Array<{ vel: number; articulation?: NoteEvent['articulation'] }> = [];
    for (const e of m.events) {
      if (e.kind === 'note') {
        const n = e as NoteEvent;
        rows.push({ vel: n.velocity ?? 90, articulation: n.articulation });
      }
    }
    map.set(b, rows);
  }
  return map;
}

function restoreGuitarPhraseNotes(
  guitar: PartModel,
  startBar: number,
  endBar: number,
  backup: Map<number, Array<{ vel: number; articulation?: NoteEvent['articulation'] }>>
): void {
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    const snap = backup.get(b);
    if (!m || !snap) continue;
    let j = 0;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      const row = snap[j++];
      if (!row) break;
      n.velocity = row.vel;
      n.articulation = row.articulation;
    }
  }
}

function isStrongBeat(sb: number): boolean {
  return Math.abs(sb) < 0.07 || Math.abs(sb - 2) < 0.07;
}

function isBackbeat(sb: number): boolean {
  return Math.abs(sb - 1) < 0.07 || Math.abs(sb - 3) < 0.07;
}

function c6StrengthMultiplier(
  c5:
    | {
        c5Skipped?: boolean;
        autoReductionStep?: number;
        secondaryLayerDisabled?: boolean;
      }
    | undefined
): number {
  if (!c5 || c5.c5Skipped) return 0;
  let m = 1;
  if ((c5.autoReductionStep ?? 0) >= 1) m *= 0.88;
  if ((c5.autoReductionStep ?? 0) >= 2) m *= 0.78;
  if (c5.secondaryLayerDisabled) m *= 0.92;
  return Math.max(0.36, Math.min(1, m));
}

function noteYieldToPrimary(
  primary: 'c2' | 'c3' | 'c4',
  sb: number,
  ostinatoActive: boolean,
  noteIdxInBar: number
): number {
  const bb = isBackbeat(sb);
  const ostSlot = ostinatoActive && noteIdxInBar % 3 !== 1;
  if (primary === 'c3' && bb) return 0.52;
  if (primary === 'c4' && ostSlot) return 0.58;
  if (primary === 'c2') return 1;
  return 0.85;
}

function isStrongAccent(n: NoteEvent, orig: number): boolean {
  return n.articulation === 'accent' || (n.velocity ?? 90) >= orig + 9;
}

function maxStrongForMode(mode: RhythmMode): number {
  if (mode === 'stable') return 2;
  if (mode === 'surprise') return 4;
  return 3;
}

function compressStrongGuitarBar(
  notes: NoteEvent[],
  orig: number[],
  maxStrong: number,
  mode: RhythmMode
): void {
  while (true) {
    const strong: number[] = [];
    for (let i = 0; i < notes.length; i++) {
      if (isStrongAccent(notes[i]!, orig[i]!)) strong.push(i);
    }
    if (strong.length <= maxStrong) return;
    let weakest = strong[0]!;
    let wg = (notes[weakest]!.velocity ?? 90) - orig[weakest]!;
    for (const i of strong) {
      const g = (notes[i]!.velocity ?? 90) - orig[i]!;
      if (g < wg) {
        wg = g;
        weakest = i;
      }
    }
    const n = notes[weakest]!;
    const preserveBackbeat = mode !== 'stable' && isBackbeat(n.startBeat);
    if (preserveBackbeat && n.articulation === 'accent') {
      n.articulation = undefined;
      n.velocity = Math.round(Math.max(orig[weakest]! + 6, (n.velocity ?? 90) - 8));
    } else if (n.articulation === 'accent') {
      n.articulation = undefined;
      n.velocity = Math.round(Math.max(orig[weakest]! + 4, (n.velocity ?? 90) - 10));
    } else {
      n.velocity = Math.round(Math.max(orig[weakest]! + 3, (n.velocity ?? 90) - 9));
    }
  }
}

function phraseLooksOverUniform(notes: NoteEvent[], orig: number[]): boolean {
  if (notes.length < 3) return false;
  const vs = notes.map((n, i) => (n.velocity ?? 90) - orig[i]!);
  const mean = vs.reduce((a, b) => a + b, 0) / vs.length;
  const dev = vs.every((x) => Math.abs(x - mean) < 2.5);
  return dev && Math.abs(mean) < 3;
}

function applyArticulationC6(
  n: NoteEvent,
  mode: RhythmMode,
  seed: number,
  phraseIdx: number,
  barIndex: number,
  ni: number,
  sb: number
): void {
  const t = seededUnit(seed, phraseIdx, 99200 + barIndex * 17 + ni);
  if (mode === 'stable') {
    if (t < 0.08 && isStrongBeat(sb) && !n.articulation) n.articulation = 'tenuto';
    return;
  }
  if (mode === 'balanced') {
    if (n.articulation === 'accent') return;
    if (isStrongBeat(sb) && t < 0.22) n.articulation = 'tenuto';
    else if (!isStrongBeat(sb) && t < 0.18) n.articulation = 'staccato';
    return;
  }
  const pat = (barIndex + ni + phraseIdx * 3) % 7;
  if (pat === 0 || pat === 4) {
    if (t < 0.55) n.articulation = n.articulation === 'accent' ? 'accent' : 'tenuto';
  } else if (pat === 2 && t < 0.35) {
    n.articulation = 'staccato';
  }
}

function applyBarExpression(
  m: MeasureModel,
  barIndex: number,
  phraseIdx: number,
  startBar: number,
  endBar: number,
  seed: number,
  mode: RhythmMode,
  globalMult: number,
  jb: boolean,
  ostinatoActive: boolean,
  primary: 'c2' | 'c3' | 'c4'
): void {
  const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
  notes.sort((a, b) => a.startBeat - b.startBeat);
  if (notes.length === 0) return;

  const orig = notes.map((n) => n.velocity ?? 90);
  const rel = barIndex - startBar;
  const lastI = notes.length - 1;

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    const sb = n.startBeat;
    const base = orig[i]!;
    let d = 0;
    const y = noteYieldToPrimary(primary, sb, ostinatoActive, i);

    if (mode === 'stable') {
      if (isStrongBeat(sb)) d += 1.2;
      if (rel === 0 && i === 0) d += 1.0;
      if (rel === 3 && i === lastI) d += 1.2;
    } else if (mode === 'balanced') {
      if (isStrongBeat(sb)) d += 4.2;
      else d -= 1.2;
      if (rel === 0 && i === 0) d += 3.0;
      if (rel === 3 && i === lastI) d += 3.8;
      if (jb && isBackbeat(sb)) d += 1.8;
      if (ostinatoActive && i % 3 === 0) d += 1.4;
    } else {
      if (isStrongBeat(sb)) d += 6.0;
      else d -= 1.8;
      if (rel === 0 && i === 0) d += 4.2;
      if (rel === 3 && i === lastI) d += 5.0;
      if (jb && isBackbeat(sb)) d += 2.4;
      if (ostinatoActive && i % 3 === 0) d += 2.0;
    }

    if (jb && isBackbeat(sb) && primary === 'c3') d *= 0.45;

    d *= globalMult * y;
    d *= 0.92 + seededUnit(seed, phraseIdx, 99100 + barIndex + i) * 0.08;

    let v = Math.round(base + d);
    v = Math.min(127, Math.max(1, v));

    if (mode !== 'stable' && isStrongBeat(sb) && seededUnit(seed, phraseIdx, 99150 + barIndex + i) < (mode === 'surprise' ? 0.42 : 0.28)) {
      n.articulation = 'accent';
    }

    n.velocity = v;
    applyArticulationC6(n, mode, seed, phraseIdx, barIndex, i, sb);
  }

  const maxS = maxStrongForMode(mode);
  compressStrongGuitarBar(notes, orig, maxS, mode);

  const flat = phraseLooksOverUniform(notes, orig);
  if (flat) {
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i]!;
      if (!isBackbeat(n.startBeat)) {
        n.velocity = Math.round((n.velocity ?? 90) - (mode === 'surprise' ? 5 : 3));
        n.velocity = Math.max(1, Math.min(127, n.velocity ?? 90));
      }
    }
  }
}

/**
 * C6 expression pass — guitar only; respects C5 row (yield / scale); restores phrase on fail-safe.
 */
export function applySongModeExpressionC6(score: ScoreModel, context: CompositionContext): void {
  const meta = context.generationMetadata as GenerationMetadata;
  if (meta.songModeHookFirstIdentity !== true) return;
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.form.totalBars !== 32) return;

  const guitar = score.parts.find((p) => p.id === 'guitar') as PartModel | undefined;
  if (!guitar) return;

  const seed = context.seed;
  const segments = songModePhraseSegments();
  const c5rows = meta.songModeC5ByPhrase;
  const ostRows = meta.songModeOstinatoByPhrase;
  const jb = meta.songModeJamesBrownFunkApplied === true;

  const out: SongModeC6PhraseRow[] = [];

  for (let pi = 0; pi < segments.length; pi++) {
    const strength = getEffectiveRhythmStrength(meta, pi) as RhythmMode;
    const { startBar, endBar } = segments[pi];
    const backup = cloneGuitarPhraseNotes(guitar, startBar, endBar);
    const c5 = c5rows?.[pi];
    const mult = c6StrengthMultiplier(c5);

    if (mult <= 0) {
      out.push({ phraseIndex: pi, c6Active: false, c6Summary: 'inactive: C5 skip or yield' });
      continue;
    }

    const primary = c5?.primaryLayer ?? 'c2';
    const ostinatoActive = ostRows?.[pi]?.ostinatoActive === true;

    try {
      for (let bar = startBar; bar <= endBar; bar++) {
        const m = guitar.measures.find((x) => x.index === bar);
        if (!m) continue;
        applyBarExpression(m, bar, pi, startBar, endBar, seed, strength, mult, jb, ostinatoActive, primary);
      }

      const origFlat: number[] = [];
      for (let bar = startBar; bar <= endBar; bar++) {
        const snap = backup.get(bar);
        if (!snap) continue;
        for (const row of snap) origFlat.push(row.vel);
      }
      let idx = 0;
      let strongTotal = 0;
      let noteTotal = 0;
      for (let bar = startBar; bar <= endBar; bar++) {
        const m = guitar.measures.find((x) => x.index === bar);
        if (!m) continue;
        const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
        notes.sort((a, b) => a.startBeat - b.startBeat);
        for (const n of notes) {
          const o = origFlat[idx];
          if (o === undefined) throw new Error('c6_mismatch');
          idx++;
          if (isStrongAccent(n, o)) strongTotal++;
          noteTotal++;
        }
      }
      if (idx !== origFlat.length) throw new Error('c6_mismatch');
      if (noteTotal > 0 && strongTotal / noteTotal > 0.62 && strength === 'stable') {
        throw new Error('c6_over_expressed');
      }

      out.push({
        phraseIndex: pi,
        c6Active: true,
        c6Summary: `active: mode=${strength}; mult=${mult.toFixed(2)}; primary=${primary}`,
      });
    } catch {
      restoreGuitarPhraseNotes(guitar, startBar, endBar, backup);
      out.push({
        phraseIndex: pi,
        c6Active: false,
        c6Summary: 'reverted: fail-safe',
      });
    }
  }

  meta.songModeC6ByPhrase = out;
  meta.songModeC6Receipt =
    'C6: guitar expression (velocity + articulation); yields to C5; no timing/duration changes';
}
