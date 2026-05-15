/**
 * Duo golden-path — wire {@link AbstractLineSet} soprano/bass into guitar/bass parts
 * (Brookmeyer, Bartók, P1+P2 jazz VRBs, SQ VRB family + fall-through for others).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { AbstractLineSet } from '../counterpoint/abstractLineSet';
import type { MeasureModel, NoteEvent as ScoreNoteEvent, PartModel } from '../score-model/scoreModelTypes';
import { addEvent, createNote } from '../score-model/scoreEventBuilder';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import { clampPitch } from './guitarBassDuoHarmony';
import { liftToneToRange } from './guitarPhraseAuthority';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { postProcessDuoAbstractBass, postProcessDuoAbstractGuitar } from './duoAbstractLineComposerTransforms';
import { LINE_FIRST_DUO_ENGINE_VRB_IDS, LINE_FIRST_DUO_ENGINE_VRB_ID_SET } from './lineFirstDuoEngineVrbIds';

export { LINE_FIRST_DUO_ENGINE_VRB_IDS };

function isDuoGoldenPathPresetId(presetId: string): boolean {
  return isGuitarBassDuoFamily(presetId) || presetId === 'ecm_chamber';
}

/** Songwriter primary === same VRB id: skip abstract guitar/bass fill (slice path). `custom_locked` keeps fill for Gate B harnesses. */
export function slicePrimaryBlocksLineFirstAbstract(context: CompositionContext, engineVrbId: string): boolean {
  const sid = context.generationMetadata?.songwriterStyleId;
  if (!sid || sid !== engineVrbId) return false;
  const hm = context.generationMetadata?.harmonyModeRequested;
  if (hm === 'custom_locked') return false;
  /** Until harmony mode is known, do not block — avoids transient `undefined` during duo build ordering Gate B / harness parity. */
  if (hm !== 'builtin' && hm !== 'custom') return false;
  return LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has(engineVrbId);
}

/** Duo golden path: run contrapuntal precompute when bundle policy enabled (metadata; independent of slice fill gate). */
export function shouldRunDuoContrapuntalPrecompute(context: CompositionContext, vrbId: string): boolean {
  const id = (vrbId || context.voiceBundle?.voiceId || '').trim();
  if (!id) return false;
  const bundle = context.voiceBundle ?? getVoiceRuleBundle(id);
  return Boolean(bundle?.contrapuntalLinePolicy?.enabled);
}

/** Co-onset streak before bass downbeat nudge; Brookmeyer + Bartók keep legacy `streak > 2` (need 3). */
export function coOnsetStreakThresholdForFloor(floor: number, engineVrbId: string): number {
  if (engineVrbId === 'bob_brookmeyer' || engineVrbId === 'bartok') return 3;
  if (floor >= 0.75) return 1;
  if (floor >= 0.65) return 2;
  return 3;
}

function debussyStepwiseParallelCoMotion(
  gp: number | undefined,
  bp: number | undefined,
  g: number,
  b: number,
): boolean {
  if (gp === undefined || bp === undefined) return false;
  const dg = g - gp;
  const db = b - bp;
  if (dg === 0 || db === 0) return false;
  if (Math.sign(dg) !== Math.sign(db)) return false;
  if (Math.abs(dg) > 2 || Math.abs(db) > 2) return false;
  return Math.abs(dg) === Math.abs(db);
}

/** Line-first duo: duo golden-path preset + abstract line set + engine-wired VRB id. */
export function isLineFirstDuoAbstractFromSet(
  ls: AbstractLineSet | null | undefined,
  context: CompositionContext,
): boolean {
  if (!ls) return false;
  if (!isDuoGoldenPathPresetId(context.presetId)) return false;
  const id = ls.styleSourceVrbId;
  if (!id) return false;
  if (!LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has(id)) return false;
  if (slicePrimaryBlocksLineFirstAbstract(context, id)) return false;
  return true;
}

export function isLineFirstDuoAbstractContext(context: CompositionContext): boolean {
  return isLineFirstDuoAbstractFromSet(context.generationMetadata?.contrapuntalLineSet, context);
}

function abstractNotesForBar(ls: AbstractLineSet, role: 'soprano' | 'bass', bar1Based: number) {
  const v = ls.voices.find((x) => x.role === role);
  if (!v) return [];
  const b0 = bar1Based - 1;
  return v.notes
    .filter((n) => n.offsetBars >= b0 - 1e-9 && n.offsetBars < b0 + 1 - 1e-9)
    .sort((a, b) => a.offsetBars - b.offsetBars);
}

/** Map abstract soprano into one guitar measure; uses {@link clampPitch} + measure span (idiom shell). */
export function fillGuitarMeasureFromAbstractSoprano(
  m: MeasureModel,
  ls: AbstractLineSet,
  bar1Based: number,
  opts: { effectiveLow: number; effectiveHigh: number; staggerGuitar: number },
  engineVrbId: string,
  context: CompositionContext,
): void {
  m.events = [];
  const spanQ = measureBeatSpanQuartersOf(m);
  const notes = abstractNotesForBar(ls, 'soprano', bar1Based);
  if (notes.length === 0) {
    addEvent(m, createNote(clampPitch(60, opts.effectiveLow, opts.effectiveHigh), 0, Math.min(4, spanQ)));
    postProcessDuoAbstractGuitar(engineVrbId, m, context, bar1Based, opts.effectiveLow, opts.effectiveHigh, spanQ);
    return;
  }
  let first = true;
  for (const n of notes) {
    const rel = n.offsetBars - (bar1Based - 1);
    let startQ = rel * spanQ;
    if (first) {
      startQ += opts.staggerGuitar;
      first = false;
    }
    startQ = Math.max(0, Math.min(spanQ - 0.25, startQ));
    const durQ = Math.max(0.25, Math.min(spanQ - startQ, n.durationBars * spanQ));
    const p = liftToneToRange(Math.round(n.pitchMidi), opts.effectiveLow, opts.effectiveHigh);
    addEvent(m, createNote(p, startQ, durQ));
  }
  postProcessDuoAbstractGuitar(engineVrbId, m, context, bar1Based, opts.effectiveLow, opts.effectiveHigh, spanQ);
}

/** Map abstract bass line into one bass measure; {@link clampPitch} + span (idiom shell). */
export function fillBassMeasureFromAbstractBassLine(
  m: MeasureModel,
  ls: AbstractLineSet,
  bar1Based: number,
  opts: { effectiveLow: number; effectiveHigh: number },
  engineVrbId: string,
  context: CompositionContext,
): void {
  m.events = [];
  const spanQ = measureBeatSpanQuartersOf(m);
  const notes = abstractNotesForBar(ls, 'bass', bar1Based);
  if (notes.length === 0) {
    addEvent(
      m,
      createNote(clampPitch(40, opts.effectiveLow, opts.effectiveHigh), 0, Math.min(4, spanQ), 1, 'duo_abs_bass'),
    );
    postProcessDuoAbstractBass(engineVrbId, m, context, bar1Based, opts.effectiveLow, opts.effectiveHigh, spanQ);
    return;
  }
  for (const n of notes) {
    const rel = n.offsetBars - (bar1Based - 1);
    const startQ = Math.max(0, Math.min(spanQ - 0.25, rel * spanQ));
    const durQ = Math.max(0.25, Math.min(spanQ - startQ, n.durationBars * spanQ));
    const p = liftToneToRange(Math.round(n.pitchMidi), opts.effectiveLow, opts.effectiveHigh);
    addEvent(m, createNote(p, startQ, durQ, 1, 'duo_abs_bass'));
  }
  postProcessDuoAbstractBass(engineVrbId, m, context, bar1Based, opts.effectiveLow, opts.effectiveHigh, spanQ);
}

const DOWNBEAT_EPS = 0.06;

function firstDownbeatNote(m: MeasureModel | undefined): ScoreNoteEvent | undefined {
  if (!m) return undefined;
  const cands = m.events
    .filter((e): e is ScoreNoteEvent => e.kind === 'note')
    .filter((e) => {
      const x = ((e.startBeat % 4) + 4) % 4;
      return x < DOWNBEAT_EPS;
    })
    .sort((a, b) => a.startBeat - b.startBeat);
  return cands[0];
}

function partParallelCoMotion(gp: number | undefined, bp: number | undefined, g: number, b: number): boolean {
  if (gp === undefined || bp === undefined) return false;
  const dg = g - gp;
  const db = b - bp;
  if (dg === 0 || db === 0) return false;
  return Math.sign(dg) === Math.sign(db);
}

/**
 * Strong-beat co-onset: consecutive guitar+bass downbeats → nudge bass +0.25q.
 * Threshold from `duoVoicePolicy.rhythmicIndependenceFloor`; Debussy skips count when stepwise parallel motion.
 * Pärt (`part`): same-direction parallel downbeats nudge immediately. Lachenmann / Crumb: full-beat delay vs +0.25q.
 */
export function applyDuoAbstractStrongBeatCoOnsetDisplacement(
  context: CompositionContext,
  guitarPart: PartModel,
  bassPart: PartModel,
): void {
  if (!isLineFirstDuoAbstractContext(context)) return;
  const ls = context.generationMetadata?.contrapuntalLineSet;
  const id = ls?.styleSourceVrbId ?? '';
  const floor = getVoiceRuleBundle(id).duoVoicePolicy?.rhythmicIndependenceFloor ?? 0.65;
  const need = coOnsetStreakThresholdForFloor(floor, id);
  const md = context.generationMetadata as GenerationMetadata & { duoLineFirstRhythmReceipts?: string[] };
  const rec = md.duoLineFirstRhythmReceipts ?? [];
  const tb = Math.max(
    guitarPart.measures.length,
    bassPart.measures.length,
    ...guitarPart.measures.map((x) => x.index),
    ...bassPart.measures.map((x) => x.index),
  );
  let streak = 0;
  let prevGp: number | undefined;
  let prevBp: number | undefined;
  for (let b = 1; b <= tb; b++) {
    const gm = guitarPart.measures.find((x) => x.index === b);
    const bm = bassPart.measures.find((x) => x.index === b);
    const g0 = firstDownbeatNote(gm);
    const b0 = firstDownbeatNote(bm);
    if (g0 && b0) {
      const gPitch = g0.pitch;
      const bPitch = b0.pitch;
      const debussyParallel =
        id === 'debussy' && debussyStepwiseParallelCoMotion(prevGp, prevBp, gPitch, bPitch);
      const partPar = id === 'part' && partParallelCoMotion(prevGp, prevBp, gPitch, bPitch);
      if (partPar) {
        b0.startBeat = Math.min(b0.startBeat + 0.25, 3.75);
        rec.push(`duo_abstract:part_parallel_nudge:bar=${b}`);
        streak = 0;
      } else if (debussyParallel) {
        streak = 0;
      } else {
        streak++;
        if (streak >= need) {
          const silenceMode = id === 'lachenmann' || id === 'crumb_black_angels';
          if (silenceMode) {
            b0.startBeat = Math.min(b0.startBeat + 1.0, 3.25);
            rec.push(`duo_abstract:co_onset_quarter_delay:bar=${b}`);
          } else {
            b0.startBeat = Math.min(b0.startBeat + 0.25, 3.75);
            rec.push(`duo_abstract:co_onset_displace:bar=${b}`);
          }
          streak = 0;
        }
      }
      prevGp = gPitch;
      prevBp = bPitch;
    } else {
      streak = 0;
    }
  }
  if (rec.length) md.duoLineFirstRhythmReceipts = rec;
}
