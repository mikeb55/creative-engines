/**
 * Duo / shared score: authoritative final pass — exact 4/4 per voice per measure.
 * Runs once, after all musical / performance / expressive layers (no rhythm edits after seal).
 * `guitar_bass_duo` sets score.duoRhythmSnap = eighth_beats (Sibelius-friendly attacks); ECM keeps quarter grid.
 */


import type { DuoVaultReSnapTelemetry } from '../goldenPath/duoVaultMotifContourSnap';
import type { ChordEvent, MeasureModel, NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import { createNote, createRest } from '../score-model/scoreEventBuilder';
import { validateStrictBarMath, validateSibeliusUndottedBeatAtoms } from './strictBarMath';
import { validateNotationSafeRhythm } from './notationSafeRhythm';
import { snapEighthBeat, snapEventToEighthBeatGrid } from './duoEighthBeatGrid';
import { applyBassBeatNotationGrouping } from './bassBeatNotationGrouping';
import { extractMotifShapeFromGuitarBar, realizeReturnMidiFromMotifShape } from '../motif/motifShape';
import { clampPitch } from '../goldenPath/guitarBassDuoHarmony';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { BASS_HARD_RANGE_HIGH, BASS_HARD_RANGE_LOW } from '../instrument-profiles/uprightBassProfile';

const EPS = 1e-4;
const HOOK_REGISTER_LOW = 55;
const HOOK_REGISTER_HIGH = 79;

/** Beat atoms for 4/4 — undotted only (no 1.5 / 0.75); greedy desc keeps wholes/halves/quarters before eighths. */
const UNDOTTED_BEAT_ATOMS_DESC: readonly number[] = [4, 2, 1, 0.5, 0.25, 0.125];

function snapSixteenthBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

/** Decompose a span (beats) into undotted standard lengths only; every piece is in NOTATION_SAFE set except dots. */
function decomposeIntoUndottedPieces(total: number): number[] {
  let r = snapSixteenthBeat(total);
  if (r <= EPS) return [];
  const out: number[] = [];
  for (const u of UNDOTTED_BEAT_ATOMS_DESC) {
    while (r >= u - EPS) {
      out.push(u);
      r = snapSixteenthBeat(r - u);
    }
  }
  if (r > EPS) {
    throw new Error(`[duoBarMathFinalize] cannot decompose ${total} beats into undotted atoms (remainder ${r})`);
  }
  return out;
}

type NoteTie = 'start' | 'stop' | 'continue';

/**
 * Fragments of one note. Ties come from the split itself, not from a neighbouring
 * note that happens to share a pitch.
 */
function tieForSplitFragment(original: NoteTie | undefined, index: number, count: number): NoteTie | undefined {
  if (count === 1) return original;
  const incoming = original === 'stop' || original === 'continue';
  const outgoing = original === 'start' || original === 'continue';
  const tieIn = incoming || index > 0;
  const tieOut = outgoing || index < count - 1;
  if (tieIn && tieOut) return 'continue';
  if (tieOut) return 'start';
  if (tieIn) return 'stop';
  return undefined;
}

function expandVoiceEventsUndotted(events: ScoreEvent[], preserveSoundingTies: boolean): ScoreEvent[] {
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
  const out: ScoreEvent[] = [];
  for (const e of sorted) {
    const voice = e.voice ?? 1;
    const pieces = decomposeIntoUndottedPieces(e.duration);
    let t = snapSixteenthBeat(e.startBeat);
    if (pieces.length === 0) continue;
    if (e.kind === 'note') {
      const n = e as NoteEvent;
      pieces.forEach((piece, i) => {
        const nn = createNote(
          n.pitch,
          t,
          piece,
          voice,
          n.motifRef,
          preserveSoundingTies && n.pitches ? [...n.pitches] : undefined,
        );
        if (i === 0) {
          if (n.articulation) nn.articulation = n.articulation;
          if (n.velocity !== undefined) nn.velocity = n.velocity;
          if (n.spelling) nn.spelling = { ...n.spelling };
          if (n.durationAccent) nn.durationAccent = n.durationAccent;
          if (n.notation) nn.notation = { ...n.notation };
        }
        if (preserveSoundingTies && pieces.length > 1) {
          const tie = tieForSplitFragment(n.notation?.tie, i, pieces.length);
          if (tie) nn.notation = { ...(nn.notation ?? {}), tie };
        }
        out.push(nn);
        t = snapSixteenthBeat(t + piece);
      });
    } else if (e.kind === 'chord') {
      const c = e as ChordEvent;
      for (const piece of pieces) {
        const ce: ChordEvent = {
          kind: 'chord',
          pitches: [...c.pitches],
          startBeat: t,
          duration: piece,
          voice,
        };
        if (c.motifRef) ce.motifRef = c.motifRef;
        out.push(ce);
        t = snapSixteenthBeat(t + piece);
      }
    } else {
      for (const piece of pieces) {
        out.push(createRest(t, piece, voice));
        t = snapSixteenthBeat(t + piece);
      }
    }
  }
  return out;
}

function expandUndottedPreferredInMeasure(m: MeasureModel): void {
  const raw = m.events.filter((e) => e.kind === 'note' || e.kind === 'rest' || e.kind === 'chord');
  const cap = measureBeatSpanQuartersOf(m);
  if (raw.length === 0) {
    m.events = [createRest(0, cap, 1)];
    return;
  }
  const byVoice = new Map<number, ScoreEvent[]>();
  for (const e of raw) {
    const v = e.voice ?? 1;
    if (!byVoice.has(v)) byVoice.set(v, []);
    byVoice.get(v)!.push(e);
  }
  const rebuilt: ScoreEvent[] = [];
  const preserveSoundingTies = m.b1PulsePreserve === true;
  for (const v of [...byVoice.keys()].sort((a, b) => a - b)) {
    rebuilt.push(...expandVoiceEventsUndotted(byVoice.get(v)!, preserveSoundingTies));
  }
  m.events = rebuilt;
}

/** Merge consecutive rests in one voice; if merged duration is dotted (1.5 / 0.75), split back to undotted atoms. */
function mergeAdjacentRestsUndotted(events: ScoreEvent[]): ScoreEvent[] {
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
  const out: ScoreEvent[] = [];
  for (const e of sorted) {
    if (e.kind !== 'rest') {
      out.push(e);
      continue;
    }
    const voice = e.voice ?? 1;
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.kind === 'rest' &&
      (prev.voice ?? 1) === voice &&
      Math.abs(prev.startBeat + prev.duration - e.startBeat) < EPS
    ) {
      const total = snapSixteenthBeat(prev.duration + e.duration);
      out.pop();
      const pieces = decomposeIntoUndottedPieces(total);
      let t = prev.startBeat;
      for (const p of pieces) {
        out.push(createRest(t, p, voice));
        t = snapSixteenthBeat(t + p);
      }
    } else {
      out.push(e);
    }
  }
  return out;
}

function mergeRestsInMeasure(m: MeasureModel): void {
  const raw = m.events.filter((e) => e.kind === 'note' || e.kind === 'rest' || e.kind === 'chord');
  if (raw.length === 0) return;
  const byVoice = new Map<number, ScoreEvent[]>();
  for (const e of raw) {
    const v = e.voice ?? 1;
    if (!byVoice.has(v)) byVoice.set(v, []);
    byVoice.get(v)!.push(e);
  }
  const rebuilt: ScoreEvent[] = [];
  for (const v of [...byVoice.keys()].sort((a, b) => a - b)) {
    rebuilt.push(...mergeAdjacentRestsUndotted(byVoice.get(v)!));
  }
  m.events = rebuilt;
}

/** Sibelius-friendly: expand to undotted atoms only, then coalesce adjacent rests without reintroducing dotted lengths. */
function expandUndottedPreferredNotationAtomsInScore(score: ScoreModel): void {
  for (const p of score.parts) {
    for (const m of p.measures) {
      expandUndottedPreferredInMeasure(m);
      for (let pass = 0; pass < 6; pass++) {
        mergeRestsInMeasure(m);
      }
    }
  }
}

export type RhythmSnapMode = 'quarter' | 'eighth';

function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

function snapBeat(x: number, mode: RhythmSnapMode): number {
  return mode === 'eighth' ? snapEighthBeat(x) : qBeat(x);
}

/** Monophonic timeline: later event wins overlap by shortening the previous duration (may trim to zero). */
function trimOverlapsMonophonic(sorted: ScoreEvent[], mode: RhythmSnapMode): ScoreEvent[] {
  const out: ScoreEvent[] = [];
  for (const e of sorted) {
    while (out.length > 0) {
      const last = out[out.length - 1];
      const le = last.startBeat + last.duration;
      if (e.startBeat >= le - EPS) break;
      last.duration = snapBeat(e.startBeat - last.startBeat, mode);
      if (last.duration > EPS) break;
      out.pop();
    }
    if (e.duration > EPS) out.push(e);
  }
  return out;
}

/**
 * Build a single monophonic voice line: snap, remove overlaps (split/trim notes), gap-fill with rests,
 * trim anything past the measure span (split long notes at bar end).
 */
function rebuildMonophonicVoiceLine(
  events: ScoreEvent[],
  voice: number,
  mode: RhythmSnapMode,
  barBeats: number
): ScoreEvent[] {
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
  for (const e of sorted) {
    if (mode === 'eighth') {
      snapEventToEighthBeatGrid(e, barBeats);
    } else {
      (e as { startBeat: number }).startBeat = qBeat((e as { startBeat: number }).startBeat);
      (e as { duration: number }).duration = qBeat((e as { duration: number }).duration);
    }
  }
  const trimmed = trimOverlapsMonophonic(sorted, mode);
  const filtered = trimmed.filter((e) => e.duration > EPS);
  if (filtered.length === 0) {
    return [createRest(0, barBeats, voice)];
  }
  const out: ScoreEvent[] = [];
  let cursor = 0;
  for (const e of filtered) {
    let sb = e.startBeat;
    if (sb >= barBeats - EPS) break;
    let dur = e.duration;
    if (sb + dur > barBeats + EPS) {
      dur = snapBeat(barBeats - sb, mode);
    }
    if (dur <= EPS) continue;
    if (sb > cursor + EPS) {
      out.push(createRest(cursor, snapBeat(sb - cursor, mode), voice));
      cursor = sb;
    }
    if (e.kind === 'note') {
      const n = e as NoteEvent;
      const nn = createNote(n.pitch, sb, dur, voice, n.motifRef, n.pitches ? [...n.pitches] : undefined);
      if (n.articulation) nn.articulation = n.articulation;
      if (n.velocity !== undefined) nn.velocity = n.velocity;
      if (n.spelling) nn.spelling = { ...n.spelling };
      if (n.durationAccent) nn.durationAccent = n.durationAccent;
      if (n.notation) nn.notation = { ...n.notation };
      out.push(nn);
    } else if (e.kind === 'chord') {
      const c = e as ChordEvent;
      const ce: ChordEvent = {
        kind: 'chord',
        pitches: [...c.pitches],
        startBeat: sb,
        duration: dur,
        voice,
      };
      if (c.motifRef) ce.motifRef = c.motifRef;
      out.push(ce);
    } else {
      out.push(createRest(sb, dur, voice));
    }
    cursor = snapBeat(sb + dur, mode);
  }
  if (cursor < barBeats - EPS) {
    out.push(createRest(cursor, snapBeat(barBeats - cursor, mode), voice));
  }
  return out;
}

/** One measure, one monophonic line (voice 1) — used for bass clarity. */
function finalizeMeasureMonoVoice1(m: MeasureModel, mode: RhythmSnapMode): void {
  const cap = measureBeatSpanQuartersOf(m);
  const raw = m.events.filter((e) => e.kind === 'note' || e.kind === 'rest' || e.kind === 'chord');
  if (raw.length === 0) {
    m.events = [createRest(0, cap, 1)];
    return;
  }
  m.events = rebuildMonophonicVoiceLine(raw, 1, mode, cap);
}

/** One measure: each voice ID gets its own monophonic line (guitar may use multiple voices in theory). */
function finalizeMeasurePerVoiceLines(m: MeasureModel, mode: RhythmSnapMode): void {
  const cap = measureBeatSpanQuartersOf(m);
  const raw = m.events.filter((e) => e.kind === 'note' || e.kind === 'rest' || e.kind === 'chord');
  if (raw.length === 0) {
    m.events = [createRest(0, cap, 1)];
    return;
  }
  const byVoice = new Map<number, ScoreEvent[]>();
  for (const e of raw) {
    const v = e.voice ?? 1;
    if (!byVoice.has(v)) byVoice.set(v, []);
    byVoice.get(v)!.push(e);
  }
  const out: ScoreEvent[] = [];
  for (const v of [...byVoice.keys()].sort((a, b) => a - b)) {
    out.push(...rebuildMonophonicVoiceLine(byVoice.get(v)!, v, mode, cap));
  }
  m.events = out;
  for (const [v, evs] of byVoice) {
    const sum = evs.reduce((s, e) => s + e.duration, 0);
    if (sum > cap + 0.01)
      throw new Error(`[wyble-debug] PRE-rebuild voice ${v} overflow m.index=${m.index} sum=${sum} events=${evs.length}`);
  }
  const postSum = out.filter((e) => (e.voice ?? 1) === 2).reduce((s, e) => s + e.duration, 0);
  if (postSum > cap + 0.01)
    throw new Error(`[wyble-debug] POST-rebuild voice2 overflow m.index=${m.index} sum=${postSum}`);
}

/** Mutates measure events to exact bar length per voice (4/4). Bass is forced to a single monophonic voice. */
export function finalizeMeasureBarMathPerVoice(
  m: MeasureModel,
  opts?: { forceBassMonoVoice1?: boolean; rhythmSnap?: RhythmSnapMode }
): void {
  const mode: RhythmSnapMode = opts?.rhythmSnap ?? 'quarter';
  if (opts?.forceBassMonoVoice1) {
    finalizeMeasureMonoVoice1(m, mode);
  } else {
    finalizeMeasurePerVoiceLines(m, mode);
  }
}

/** Mutates score: every measure normalized; bass part collapsed to monophonic voice 1 per measure. */
export function finalizeScoreBarMathPerVoice(score: ScoreModel): void {
  const mode: RhythmSnapMode = score.duoRhythmSnap === 'eighth_beats' ? 'eighth' : 'quarter';
  for (const p of score.parts) {
    const forceBassMono = p.instrumentIdentity === 'acoustic_upright_bass';
    const partMode: RhythmSnapMode = p.id === 'groove_drums' ? 'quarter' : mode;
    for (const m of p.measures) {
      const rhythmSnap: RhythmSnapMode = m.b1PulsePreserve ? 'quarter' : partMode;
      finalizeMeasureBarMathPerVoice(m, { forceBassMonoVoice1: forceBassMono, rhythmSnap });
    }
  }
}

/** Deep-freeze rhythm payloads so any post-return mutation throws (import safety / pipeline contract). */
export function freezeScoreRhythmAfterFinalize(score: ScoreModel): void {
  Object.freeze(score.parts);
  for (const p of score.parts) {
    Object.freeze(p);
    Object.freeze(p.measures);
    for (const m of p.measures) {
      Object.freeze(m);
      Object.freeze(m.events);
      for (const e of m.events) {
        Object.freeze(e);
      }
    }
  }
}

/**
 * Clamp every clean-electric guitar note to the profile hard range (E2–E6). Catches stray sentinels / bad octaves
 * from any upstream pass without altering notes already in range.
 */
function clampCleanElectricGuitarNotesToHardRange(score: ScoreModel): void {
  const [low, high] = CLEAN_ELECTRIC_GUITAR.hardRange;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return;
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!Number.isFinite(n.pitch)) {
        n.pitch = clampPitch(64, low, high);
        continue;
      }
      const c = clampPitch(n.pitch, low, high);
      if (c !== n.pitch) n.pitch = c;
    }
  }
}

/** Same contract as guitar clamp — notation passes must not leave bass `pitch` non-finite (breaks GCE / export math). */
function clampUprightBassNotesToHardRange(score: ScoreModel): void {
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return;
  for (const m of bass.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if (!Number.isFinite(n.pitch)) {
        n.pitch = clampPitch(40, BASS_HARD_RANGE_LOW, BASS_HARD_RANGE_HIGH);
        continue;
      }
      const c = clampPitch(n.pitch, BASS_HARD_RANGE_LOW, BASS_HARD_RANGE_HIGH);
      if (c !== n.pitch) n.pitch = c;
    }
  }
}

/**
 * Authoritative end of rhythm pipeline: finalize → validate once → freeze parts.
 * Call only after all passes that may alter startBeat/duration (performance, expressive, ECM envelopes).
 */
export function finalizeAndSealDuoScoreBarMath(
  score: ScoreModel,
  presetId?: string,
  opts?: {
    /** Stage 5.2 — vault PC pass after register clamp; last pitch touch before validate + freeze. */
    vaultFinalResnap?: (score: ScoreModel) => DuoVaultReSnapTelemetry;
  },
): DuoVaultReSnapTelemetry | undefined {
  finalizeScoreBarMathPerVoice(score);
  /** Guitar–Bass Duo only: eighth-beat seal + Sibelius-friendly bass notation grouping (ECM / other presets skip). */
  if (score.duoRhythmSnap === 'eighth_beats') {
    applyBassBeatNotationGrouping(score);
  }
  expandUndottedPreferredNotationAtomsInScore(score);
  const undot = validateSibeliusUndottedBeatAtoms(score);
  if (!undot.valid) {
    throw new Error(`Undotted beat atoms failed after expand: ${undot.errors.join('; ')}`);
  }
  for (const p of score.parts) {
    for (const m of p.measures) {
      const cap = measureBeatSpanQuartersOf(m);
      const v2 = m.events.filter((e) => (e.voice ?? 1) === 2);
      const v2sum = v2.reduce((s, e) => s + e.duration, 0);
      if (v2sum > cap + 0.01)
        throw new Error(
          `[v2-overflow] part=${p.id} measure=${m.index} sum=${v2sum} cap=${cap} events=${v2.map((e) => e.kind + ':' + e.startBeat + '+' + e.duration).join(',')}`
        );
    }
  }
  const hookBias = (score as any)._hookRepetitionBias ?? 0.5;
  if (hookBias > 0.6) restoreGuitarBar25HookPitchesFromBar1(score, presetId);
  clampGuitarBar24LastNoteOctaveBeforeBar25(score);
  clampCleanElectricGuitarNotesToHardRange(score);
  clampUprightBassNotesToHardRange(score);
  const reSnapTelemetry = opts?.vaultFinalResnap?.(score);
  const undotAfterFinalPitch = validateSibeliusUndottedBeatAtoms(score);
  if (!undotAfterFinalPitch.valid) {
    throw new Error(
      `Undotted beat atoms failed after final pitch pass: ${undotAfterFinalPitch.errors.join('; ')}`
    );
  }
  const v = validateStrictBarMath(score);
  if (!v.valid) {
    throw new Error(`Bar math enforcement failed after finalize: ${v.errors.join('; ')}`);
  }
  const ns = validateNotationSafeRhythm(score);
  if (!ns.valid) {
    throw new Error(`Notation-safe rhythm failed before export: ${ns.errors.join('; ')}`);
  }
  freezeScoreRhythmAfterFinalize(score);
  return reSnapTelemetry;
}

/**
 * Duo 32-bar guitar: align bar 25 note pitches to bar 1 (time order) with **harmonic transposition** (same as motif
 * `realizeReturnMidiFromMotifShape`). Literal bar-1 MIDI copy breaks MotifShape similarity when chord₁ ≠ chord₂₅
 * (relative-PCs no longer match). Timing unchanged.
 */
function restoreGuitarBar25HookPitchesFromBar1(score: ScoreModel, presetId?: string): void {
  if (score.duoRhythmSnap !== 'eighth_beats') return;
  const guitar = score.parts.find((p) => p.id === 'guitar' && p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar || !guitar.measures.some((m) => m.index === 32)) return;
  const m1 = guitar.measures.find((x) => x.index === 1);
  const m25 = guitar.measures.find((x) => x.index === 25);
  if (!m1 || !m25) return;
  if (m1.b1PulsePreserve || m25.b1PulsePreserve) return;
  const chord1 = m1.chord ?? 'Cmaj7';
  const chord25 = m25.chord ?? chord1;
  const n1 = m1.events
    .filter((e) => e.kind === 'note')
    .sort((a, b) => a.startBeat - b.startBeat) as NoteEvent[];
  const n25 = m25.events
    .filter((e) => e.kind === 'note')
    .sort((a, b) => a.startBeat - b.startBeat) as NoteEvent[];
  if (n1.length === 0 || n25.length === 0) return;
  const stmtShape = extractMotifShapeFromGuitarBar(
    guitar,
    1,
    chord1,
    HOOK_REGISTER_LOW,
    HOOK_REGISTER_HIGH,
    { lockedHarmony: true },
    presetId,
  );
  if (!stmtShape) return;
  const pitches1 = n1.map((n) => n.pitch);
  const p0 = pitches1[0]!;
  let target = realizeReturnMidiFromMotifShape(
    stmtShape,
    pitches1,
    chord1,
    chord25,
    p0,
    HOOK_REGISTER_LOW,
    HOOK_REGISTER_HIGH,
    0,
    { lockedHarmony: true },
    presetId,
  );
  const sameChord =
    chord1.trim().toLowerCase() === chord25.trim().toLowerCase();
  if (
    sameChord &&
    target.length >= 2 &&
    target.length === pitches1.length &&
    target.every((t, i) => t === pitches1[i])
  ) {
    const idx = 1;
    target = target.map((p, i) =>
      i === idx ? clampPitch(p + 1, HOOK_REGISTER_LOW, HOOK_REGISTER_HIGH) : p
    );
  }
  const k = Math.min(n25.length, target.length);
  for (let i = 0; i < k; i++) {
    n25[i].pitch = target[i]!;
  }
}

function clampGuitarBar24LastNoteOctaveBeforeBar25(score: ScoreModel): void {
  if (score.duoRhythmSnap !== 'eighth_beats') return;
  const guitar = score.parts.find((p) => p.id === 'guitar' && p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar || !guitar.measures.some((m) => m.index === 32)) return;
  const m24 = guitar.measures.find((x) => x.index === 24);
  const m25 = guitar.measures.find((x) => x.index === 25);
  if (!m24 || !m25) return;
  if (m24.b1PulsePreserve || m25.b1PulsePreserve) return;
  const notes24 = m24.events
    .filter((e) => e.kind === 'note')
    .sort((a, b) => a.startBeat - b.startBeat) as NoteEvent[];
  const notes25 = m25.events
    .filter((e) => e.kind === 'note')
    .sort((a, b) => a.startBeat - b.startBeat) as NoteEvent[];
  if (notes24.length === 0 || notes25.length === 0) return;
  const last24 = notes24[notes24.length - 1]!;
  const first25 = notes25[0]!;
  let p = last24.pitch;
  const target = first25.pitch;
  while (Math.abs(p - target) > 12) {
    if (p > target) p -= 12;
    else p += 12;
  }
  last24.pitch = p;
}

/** @deprecated Use finalizeAndSealDuoScoreBarMath — kept for call-site clarity. */
export function assertScoreBarMathExact(score: ScoreModel): void {
  finalizeAndSealDuoScoreBarMath(score);
}
