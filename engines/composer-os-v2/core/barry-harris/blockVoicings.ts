/**
 * V82e - Top-note-locked block voicings (guitar + BB/SQ lanes).
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { ScoreModel, ScoreEvent } from '../score-model/scoreModelTypes';
import { chordTonePcsForResolved, droppedTonePcForResolved } from './identities';
import type { ResolvedChordMelodyNote, VoicingHint } from './types';

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

/** Close-position inner voices strictly below melody top. */
export function closeBlockVoicingBelowMelody(
  melodyMidi: number,
  tonePcs: readonly number[],
  omitPc?: number
): number[] {
  const melodyPc = mod12(melodyMidi);
  const pcs = [...new Set(tonePcs.map(mod12))].filter(
    (pc) => pc !== melodyPc && (omitPc === undefined || pc !== mod12(omitPc))
  );
  if (pcs.length === 0) return [];

  pcs.sort((a, b) => a - b);
  let cursor = melodyMidi - 1;
  const placed: number[] = [];

  for (let i = pcs.length - 1; i >= 0; i--) {
    const pc = pcs[i]!;
    let pitch = cursor;
    while (mod12(pitch) !== pc) pitch -= 1;
    while (pitch < melodyMidi - 19) pitch += 12;
    placed.unshift(pitch);
    cursor = pitch - 1;
  }
  return placed;
}

/** Drop-2 spread: second voice from top dropped an octave (BB/SQ sax soli lane). */
export function drop2VoicingBelowMelody(
  melodyMidi: number,
  tonePcs: readonly number[],
  omitPc?: number
): number[] {
  const close = closeBlockVoicingBelowMelody(melodyMidi, tonePcs, omitPc);
  if (close.length < 2) return close;
  const out = [...close];
  out[1] = out[1]! - 12;
  return out.sort((a, b) => a - b);
}

export function ensembleVoicingHint(base: VoicingHint, presetId: string): VoicingHint {
  if (presetId === 'big_band') {
    return base.includes('dim7') ? 'bb-dim7-passing' : 'bb-sax-soli-drop2';
  }
  if (presetId === 'string_quartet') return 'sq-drop2-block';
  return base;
}

export function blockMidisForResolved(
  resolved: ResolvedChordMelodyNote,
  melodyMidi: number,
  presetId: string
): number[] {
  const hint = ensembleVoicingHint(resolved.voicingHint, presetId);
  const tones = chordTonePcsForResolved(resolved);
  const omit = droppedTonePcForResolved(resolved);
  if (hint === 'bb-sax-soli-drop2' || hint === 'sq-drop2-block') {
    return drop2VoicingBelowMelody(melodyMidi, tones, omit);
  }
  return closeBlockVoicingBelowMelody(melodyMidi, tones, omit);
}

function findMelodyNote(
  melody: readonly ImportMelodyNote[],
  bar: number,
  onsetBeat: number
): ImportMelodyNote | undefined {
  return melody.find(
    (n) => n.bar === bar && Math.abs(n.onsetBeat - onsetBeat) < 0.02
  );
}

function targetPartsForPreset(score: ScoreModel, presetId: string) {
  if (presetId === 'big_band') {
    return score.parts.filter(
      (p) => p.id === 'style_transfer_bb_comp' || p.instrumentIdentity === 'piano'
    );
  }
  if (presetId === 'string_quartet') {
    return score.parts.filter((p) => /violin|viola|cello|sq_/i.test(p.id));
  }
  return score.parts.filter((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

export function applyBarryHarrisBlockVoicingsToScore(
  score: ScoreModel,
  resolvedNotes: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[],
  presetId: string
): ScoreModel {
  const out = structuredClone(score) as ScoreModel;
  const parts = targetPartsForPreset(out, presetId);
  if (parts.length === 0) return out;

  for (const resolved of resolvedNotes) {
    const mel = findMelodyNote(melody, resolved.bar, resolved.onsetBeat);
    if (!mel) continue;
    const inner = blockMidisForResolved(resolved, mel.midiPitch, presetId);
    resolved.blockVoicingMidis = inner;

    for (const part of parts) {
      let measure = part.measures.find((m) => m.index === resolved.bar);
      if (!measure) {
        measure = { index: resolved.bar, events: [] };
        part.measures.push(measure);
      }
      measure.events = measure.events.filter(
        (e) =>
          !(
            e.kind === 'note' &&
            (e.voice ?? 2) >= 2 &&
            Math.abs(e.startBeat - resolved.onsetBeat) < 0.02
          )
      );
      const events: ScoreEvent[] = [];
      for (let i = 0; i < inner.length; i++) {
        events.push({
          kind: 'note',
          pitch: inner[i]!,
          startBeat: resolved.onsetBeat,
          duration: mel.durationBeats,
          voice: 2 + (i % 2),
        });
      }
      measure.events.push(...events);
      measure.events.sort((a, b) => a.startBeat - b.startBeat);
    }
  }

  for (const part of parts) {
    part.measures.sort((a, b) => a.index - b.index);
  }
  return out;
}