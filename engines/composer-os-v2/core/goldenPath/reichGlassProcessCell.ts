/**
 * Song Mode Reich/Glass — one repeating cell from the existing VRB interval set.
 * Bars in the first half phase that cell against the barline after `patternIntegrityMinRepeats`.
 * Bars in the second half keep the same pitches and append notes (Glass additive). No second voice.
 */

import type { CompositionContext } from '../compositionContext';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { addEvent, createNote, createRest } from '../score-model/scoreEventBuilder';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { seededUnit } from './guitarBassDuoHarmony';

const LOW = 58;
const HIGH = 76;
const EIGHTH = 0.5;
const BAR = 4;

function stepToRange(curr: number, signed: number): number {
  const mag = Math.abs(signed);
  const dir = signed >= 0 ? 1 : -1;
  let next = curr + dir * mag;
  if (next > HIGH || next < LOW) next = curr - dir * mag;
  if (next > HIGH) next = HIGH;
  if (next < LOW) next = LOW;
  return next;
}

function buildCell(anchor: number, intervals: number[], seed: number): number[] {
  const pitches = [Math.max(LOW, Math.min(HIGH, anchor))];
  let curr = pitches[0]!;
  for (let i = 0; i < 3; i++) {
    const mag = intervals[i % intervals.length]!;
    const sign = seededUnit(seed, 88110 + i) < 0.5 ? -1 : 1;
    curr = stepToRange(curr, sign * mag);
    pitches.push(curr);
  }
  return pitches;
}

function writeEighths(measure: MeasureModel, pitches: number[], sustainAfter = false): void {
  measure.events = measure.events.filter((event) => event.kind !== 'note' && event.kind !== 'rest');
  let beat = 0;
  for (const pitch of pitches) {
    addEvent(measure, createNote(pitch, beat, EIGHTH, 1, 'song_motif'));
    beat += EIGHTH;
  }
  if (sustainAfter && beat < BAR - 1e-6) {
    addEvent(measure, createNote(pitches[pitches.length - 1]!, beat, BAR - beat, 1, 'song_motif'));
    return;
  }
  if (beat < BAR - 1e-6) {
    addEvent(measure, createRest(beat, BAR - beat, 1));
  }
}

/**
 * Replaces the duo guitar line when Song Mode asked for `reich_glass` and no locked melody or blend owns the notes.
 */
export function applyReichGlassSongModeProcessCell(score: ScoreModel, context: CompositionContext): void {
  const md = context.generationMetadata;
  if (!md?.songModeHookFirstIdentity) return;
  if (md.songwriterStyleId !== 'reich_glass') return;
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  if (md.songModeLeadSheetMelodyAnchors?.length) return;
  const blend = md.composerProfileBlend?.status;
  if (blend === 'phrase_block' || blend === 'secondary_authoritative') return;

  const guitar =
    score.parts.find((part) => part.id === 'guitar') ??
    score.parts.find((part) => part.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar || guitar.measures.length === 0) return;

  const bundle = getVoiceRuleBundle('reich_glass');
  const preferred = (bundle.melodicPolicy.preferredIntervalSets ?? []).filter((n) => n > 0);
  const intervals = preferred.length > 0 ? preferred : [2, 3, 4, 7];
  const repeats = Math.max(1, bundle.patternIntegrityMinRepeats ?? 4);
  const seed = context.seed ?? 0;

  const bar1 = guitar.measures.find((measure) => measure.index === 1) ?? guitar.measures[0]!;
  const opening = bar1.events.find((event) => event.kind === 'note');
  const anchor = opening && opening.kind === 'note' ? opening.pitch : 64;
  const cell = buildCell(anchor, intervals, seed);

  const total = guitar.measures.length;
  const reichUntil = Math.max(1, Math.floor(total / 2));
  const glassStart = reichUntil + 1;

  for (const measure of guitar.measures) {
    const bar = measure.index;
    if (bar <= reichUntil) {
      const rotation = Math.floor((bar - 1) / repeats) % cell.length;
      const once = [0, 1, 2, 3].map((i) => cell[(i + rotation) % cell.length]!);
      if (bar % repeats === 0) {
        writeEighths(measure, once, true);
      } else {
        writeEighths(measure, [...once, ...once], false);
      }
      continue;
    }
    const growth = Math.floor((bar - glassStart) / repeats);
    const count = Math.min(8, 3 + growth);
    const grown: number[] = [];
    for (let i = 0; i < count; i++) grown.push(cell[i % cell.length]!);
    writeEighths(measure, grown, false);
  }

  md.reichGlassMotifReceipt = {
    cellPitches: cell,
    intervals,
    repeats,
    reichBars: `1–${reichUntil}`,
    glassBars: `${glassStart}–${total}`,
  };
}
