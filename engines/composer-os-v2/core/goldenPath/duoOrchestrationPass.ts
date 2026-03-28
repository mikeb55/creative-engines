/**
 * Post-ECM / post-variation structural orchestration — section contrast, register bias, phrase arc.
 * Preserves rhythm (note→rest with same start/duration); pitch nudges re-capped by voice-leading guards.
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel, PartModel, NoteEvent } from '../score-model/scoreModelTypes';
import { createRest } from '../score-model/scoreEventBuilder';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
import { chordTonesForChordSymbolWithContext } from '../harmony/harmonyChordTonePolicy';
import { resolveChordForDuoPostPass } from '../harmony/harmonyResolution';
import { pitchClassToBassMidi } from '../harmony/chordSymbolAnalysis';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { enforceDuoVoiceLeadingPostOrchestration, enforceEcmPostEditGuards } from './ecmShapingPass';

const G_LOW = 55;
const G_HIGH = 79;
const BASS_LOW = 36;
const BASS_HIGH = 52;
/** Avoid low-mid guitar clutter (approx. middle C area). */
const GUITAR_LIFT_BELOW = 62;

function chordForBar(context: CompositionContext, barIndex: number, mChord?: string): string {
  return resolveChordForDuoPostPass(context, barIndex, mChord);
}

function sectionLabelForBar(barIndex: number, context: CompositionContext): string {
  for (const sec of context.form.sections) {
    if (barIndex >= sec.startBar && barIndex < sec.startBar + sec.length) return sec.label;
  }
  return 'A';
}

function isSectionB(label: string): boolean {
  return label === 'B' || label.startsWith('B');
}

function isSectionA(label: string): boolean {
  return !isSectionB(label);
}

/** Bar 7 is the duo identity / signature moment — do not thin interior notes here (V3.2 interval peak vs bar 6). */
function isDuoIdentityGuitarBar(barIndex: number): boolean {
  return barIndex === 7;
}

/** Bar 6 is the immediate lead-in to the identity bar — keep B-section lift off so bar 7 can stay the interval peak vs bar 6. */
function skipBRegisterLiftForDuoIdentity(barIndex: number): boolean {
  return barIndex === 6 || barIndex === 7;
}

function snapGuitarToChord(pitch: number, chord: string): number {
  const pool = guitarChordTonesInRange(chord, G_LOW, G_HIGH);
  const pcs = new Set([pool.root, pool.third, pool.fifth, pool.seventh].map((p) => ((Math.round(p) % 12) + 12) % 12));
  const pc = ((pitch % 12) + 12) % 12;
  if (pcs.has(pc)) return pitch;
  let best = pitch;
  let bd = 99;
  for (const c of [pool.root, pool.third, pool.fifth, pool.seventh]) {
    const cc = clampPitch(Math.round(c), G_LOW, G_HIGH);
    const d = Math.abs(cc - pitch);
    if (d <= 2 && d < bd) {
      bd = d;
      best = cc;
    }
  }
  return bd <= 2 ? best : pitch;
}

function thinInteriorNotesInBars(
  part: PartModel,
  seed: number,
  salt: number,
  barFilter: (barIndex: number) => boolean,
  removeFrac: number
): void {
  for (const m of [...part.measures].sort((a, b) => a.index - b.index)) {
    if (!barFilter(m.index)) continue;
    const noteIdxs: number[] = [];
    m.events.forEach((e, i) => {
      if (e.kind === 'note') noteIdxs.push(i);
    });
    if (noteIdxs.length <= 2) continue;
    const interior = noteIdxs.slice(1, -1);
    const targetRemove = Math.max(0, Math.floor(interior.length * removeFrac));
    if (targetRemove === 0) continue;
    const ranked = interior
      .map((ei) => ({ ei, r: seededUnit(seed, m.index * 5000 + ei, salt) }))
      .sort((a, b) => a.r - b.r);
    const selected = new Set<number>();
    for (const { ei } of ranked) {
      if (selected.size >= targetRemove) break;
      const pos = noteIdxs.indexOf(ei);
      if (pos <= 0 || pos >= noteIdxs.length - 1) continue;
      const prev = noteIdxs[pos - 1];
      const next = noteIdxs[pos + 1];
      if (selected.has(prev) || selected.has(next)) continue;
      selected.add(ei);
    }
    for (const ei of selected) {
      const ev = m.events[ei];
      if (!ev || ev.kind !== 'note') continue;
      const n = ev as NoteEvent;
      m.events[ei] = createRest(n.startBeat, n.duration, n.voice ?? 1);
    }
  }
}

function liftGuitarRegisterInSectionB(
  guitar: PartModel,
  context: CompositionContext,
  seed: number
): void {
  for (const m of guitar.measures) {
    if (skipBRegisterLiftForDuoIdentity(m.index)) continue;
    const label = sectionLabelForBar(m.index, context);
    if (!isSectionB(label)) continue;
    const chord = chordForBar(context, m.index, m.chord);
    m.events.forEach((e, idx) => {
      if (e.kind !== 'note') return;
      const n = e as NoteEvent;
      if (seededUnit(seed, m.index * 600 + idx, 21001) >= 0.35) return;
      const np = clampPitch(n.pitch + 1, G_LOW, G_HIGH);
      const snapped = snapGuitarToChord(np, chord);
      if (snapped !== n.pitch) m.events[idx] = { ...n, pitch: snapped };
    });
  }
}

function liftGuitarLowMidInA(guitar: PartModel, context: CompositionContext, seed: number): void {
  for (const m of guitar.measures) {
    const label = sectionLabelForBar(m.index, context);
    if (!isSectionA(label)) continue;
    const chord = chordForBar(context, m.index, m.chord);
    m.events.forEach((e, idx) => {
      if (e.kind !== 'note') return;
      const n = e as NoteEvent;
      if (n.pitch >= GUITAR_LIFT_BELOW) return;
      if (seededUnit(seed, m.index * 700 + idx, 21002) >= 0.6) return;
      const np = clampPitch(n.pitch + 1, G_LOW, G_HIGH);
      const snapped = snapGuitarToChord(np, chord);
      m.events[idx] = { ...n, pitch: snapped };
    });
  }
}

function bassPassingNudgeInB(
  bass: PartModel,
  context: CompositionContext,
  seed: number
): void {
  for (const m of bass.measures) {
    const label = sectionLabelForBar(m.index, context);
    if (!isSectionB(label)) continue;
    const chord = chordForBar(context, m.index, m.chord);
    const t = chordTonesForChordSymbolWithContext(chord, context);
    const noteIdxs: number[] = [];
    m.events.forEach((e, i) => {
      if (e.kind === 'note') noteIdxs.push(i);
    });
    if (noteIdxs.length < 3) continue;
    const interior = noteIdxs.slice(1, -1);
    const pick = interior[Math.floor(seededUnit(seed, m.index * 800, 21003) * interior.length)];
    const ev = m.events[pick];
    if (!ev || ev.kind !== 'note') continue;
    const n = ev as NoteEvent;
    const dir = seededUnit(seed, m.index, 21004) < 0.5 ? -1 : 1;
    const raw = n.pitch + dir;
    const pool = [t.root, t.third, t.fifth, t.seventh].map((midi) => {
      const pc = ((midi % 12) + 12) % 12;
      return clampPitch(pitchClassToBassMidi(pc, BASS_LOW, BASS_HIGH), BASS_LOW, BASS_HIGH);
    });
    let best = n.pitch;
    let bd = 99;
    for (const c of pool) {
      const d = Math.abs(c - raw);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best !== n.pitch && bd <= 3) m.events[pick] = { ...n, pitch: best };
  }
}

function bassThinAnchorsInA(bass: PartModel, context: CompositionContext, seed: number): void {
  thinInteriorNotesInBars(
    bass,
    seed,
    21005,
    (bar) => isSectionA(sectionLabelForBar(bar, context)),
    0.06
  );
}

function phraseArcExtraThinning(guitar: PartModel, context: CompositionContext, seed: number, totalBars: number): void {
  if (totalBars < 1) return;
  thinInteriorNotesInBars(
    guitar,
    seed,
    21006,
    (bar) => {
      if (isDuoIdentityGuitarBar(bar)) return false;
      const t = (bar - 1) / totalBars;
      return t < 0.26 || t > 0.74;
    },
    0.06
  );
}

/**
 * Structural / register orchestration — after variation + ECM shaping, before bar-math seal.
 */
export function applyDuoOrchestrationPass(score: ScoreModel, context: CompositionContext, seed: number): void {
  if (context.presetId !== 'guitar_bass_duo' && context.presetId !== 'ecm_chamber') return;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar) return;

  const tb = context.form.totalBars;

  /** A: extra space + clearer register (does not exceed prior ECM thinning). */
  thinInteriorNotesInBars(
    guitar,
    seed,
    21007,
    (bar) =>
      isSectionA(sectionLabelForBar(bar, context)) && !isDuoIdentityGuitarBar(bar),
    0.08
  );
  liftGuitarLowMidInA(guitar, context, seed);

  /** B: slightly more presence + lift. */
  liftGuitarRegisterInSectionB(guitar, context, seed);

  /** Phrase arc: ends + opening slightly thinner. */
  phraseArcExtraThinning(guitar, context, seed, tb);

  if (bass) {
    bassThinAnchorsInA(bass, context, seed);
    bassPassingNudgeInB(bass, context, seed);
  }

  if (context.presetId === 'ecm_chamber') {
    enforceEcmPostEditGuards(score, context, seed);
  } else {
    enforceDuoVoiceLeadingPostOrchestration(score, context);
  }
}

export function meanGuitarNotePitch(guitar: PartModel): number {
  let n = 0;
  let s = 0;
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        s += (e as NoteEvent).pitch;
        n++;
      }
    }
  }
  return n > 0 ? s / n : 0;
}

export function noteDensityPerBar(guitar: PartModel): number[] {
  return [...guitar.measures]
    .sort((a, b) => a.index - b.index)
    .map((m) => m.events.filter((e) => e.kind === 'note').length);
}
