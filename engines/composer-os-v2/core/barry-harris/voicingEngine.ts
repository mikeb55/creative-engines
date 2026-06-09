/**
 * V80j - Base voicing engine (one valid stack per note; V80k adds voice-leading scoring).
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { closeBlockVoicingBelowMelody } from './blockVoicings';
import { chordTonePcsForResolved } from './identities';
import type { PhrasingRole, ResolvedChordMelodyNote, VoicingVariant } from './types';

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function voicingFingerprint(midis: readonly number[], variant: VoicingVariant): string {
  return `${variant}:${[...midis].sort((a, b) => a - b).join(',')}`;
}

function harmonySymbolForResolved(resolved: ResolvedChordMelodyNote): string {
  if (resolved.kind === 'dim7') return resolved.chordSymbol;
  return resolved.exportSymbol;
}

export function buildBaseVoicing(
  resolved: ResolvedChordMelodyNote,
  melodyMidi: number,
  phrasingRole: PhrasingRole
): Pick<
  ResolvedChordMelodyNote,
  | 'exportStackMidis'
  | 'innerVoicingMidis'
  | 'voicingVariant'
  | 'borrowedReplacementPc'
  | 'voicingFingerprint'
> {
  const melodyPc = mod12(melodyMidi);
  const tones = chordTonePcsForResolved(resolved);

  if (phrasingRole === 'single') {
    const stack = [melodyMidi];
    return {
      exportStackMidis: stack,
      innerVoicingMidis: [],
      voicingVariant: 'single',
      voicingFingerprint: voicingFingerprint(stack, 'single'),
    };
  }

  if (phrasingRole === 'dyad') {
    const anchorPc = tones.find((t) => t !== melodyPc) ?? tones[0] ?? melodyPc;
    let bass = melodyMidi - 1;
    while (mod12(bass) !== anchorPc) bass -= 1;
    while (bass >= melodyMidi) bass -= 12;
    const stack = [bass, melodyMidi].sort((a, b) => a - b);
    return {
      exportStackMidis: stack,
      innerVoicingMidis: [bass],
      voicingVariant: 'dyad',
      voicingFingerprint: voicingFingerprint(stack, 'dyad'),
    };
  }

  const inner = closeBlockVoicingBelowMelody(melodyMidi, tones, undefined);
  let variant: VoicingVariant = 'sixth-block';
  let innerOut = [...inner];
  let borrowedReplacementPc: number | undefined;

  if (resolved.kind === 'borrowed') {
    variant = 'borrowed-replacement';
    borrowedReplacementPc = resolved.borrowedTonePc;
    const replaceIdx = innerOut.reduce(
      (bestIdx, m, idx, arr) => {
        const d = Math.min(
          (mod12(m) - resolved.borrowedTonePc + 12) % 12,
          (resolved.borrowedTonePc - mod12(m) + 12) % 12
        );
        const bestD =
          bestIdx < 0
            ? 13
            : Math.min(
                (mod12(arr[bestIdx]!) - resolved.borrowedTonePc + 12) % 12,
                (resolved.borrowedTonePc - mod12(arr[bestIdx]!) + 12) % 12
              );
        return d < bestD ? idx : bestIdx;
      },
      -1
    );
    if (replaceIdx >= 0) {
      let replacement = innerOut[replaceIdx]!;
      while (mod12(replacement) !== resolved.borrowedTonePc) replacement += 1;
      while (replacement >= melodyMidi) replacement -= 12;
      innerOut[replaceIdx] = replacement;
    }
  }

  const stack = [...innerOut, melodyMidi].sort((a, b) => a - b);
  return {
    exportStackMidis: stack,
    innerVoicingMidis: innerOut,
    voicingVariant: variant,
    borrowedReplacementPc,
    voicingFingerprint: voicingFingerprint(stack, variant),
  };
}

export function applyVoicingEngineToResolved(
  resolvedNotes: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[]
): ResolvedChordMelodyNote[] {
  return resolvedNotes.map((r) => {
    const mel = melody.find((n) => n.bar === r.bar && Math.abs(n.onsetBeat - r.onsetBeat) < 0.02);
    if (!mel) {
      return {
        ...r,
        exportStackMidis: [],
        innerVoicingMidis: [],
        voicingVariant: 'single' as const,
        voicingFingerprint: 'missing-melody',
        voiceLeadingCost: null,
        guitarFretSpan: null,
        guitarFeasible: null,
      };
    }
    const voicing = buildBaseVoicing(r, mel.midiPitch, r.phrasingRole);
    return {
      ...r,
      ...voicing,
      voiceLeadingCost: null,
      guitarFretSpan: null,
      guitarFeasible: null,
    };
  });
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

function isStrongBeat(onsetBeat: number): boolean {
  const beat = ((onsetBeat % 4) + 4) % 4;
  return Math.abs(beat) < 0.05 || Math.abs(beat - 2) < 0.05;
}

/** Write export stacks + BH harmony symbols onto score (after pinMelodyOnScore). */
export function applyChordMelodyToScore(
  score: ScoreModel,
  resolvedNotes: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[],
  presetId: string
): ScoreModel {
  const out = structuredClone(score) as ScoreModel;
  const parts = targetPartsForPreset(out, presetId);
  if (parts.length === 0) return out;

  const byBar = new Map<number, ResolvedChordMelodyNote[]>();
  for (const r of resolvedNotes) {
    const list = byBar.get(r.bar) ?? [];
    list.push(r);
    byBar.set(r.bar, list);
  }

  for (const [bar, notes] of byBar) {
    const strong = notes.filter((n) => isStrongBeat(n.onsetBeat));
    const barPick = strong[0] ?? notes[0];
    const barSymbol = barPick ? harmonySymbolForResolved(barPick) : undefined;
    for (const part of parts) {
      let measure = part.measures.find((m) => m.index === bar);
      if (!measure) {
        measure = { index: bar, events: [] };
        part.measures.push(measure);
      }
      if (barSymbol) {
        measure.chord = barSymbol;
        measure.chordSymbol = barSymbol;
      }
    }
  }

  const resolvedByOnset = new Map<string, ResolvedChordMelodyNote>();
  for (const r of resolvedNotes) {
    resolvedByOnset.set(`${r.bar}:${r.onsetBeat.toFixed(4)}`, r);
  }

  for (const mel of melody) {
    const resolved =
      resolvedByOnset.get(`${mel.bar}:${mel.onsetBeat.toFixed(4)}`) ??
      resolvedNotes.find((r) => r.bar === mel.bar && Math.abs(r.onsetBeat - mel.onsetBeat) < 0.02);
    if (!resolved) continue;

    let stack =
      resolved.exportStackMidis.length > 0 ? [...resolved.exportStackMidis] : [mel.midiPitch];
    if (!stack.includes(mel.midiPitch)) stack.push(mel.midiPitch);
    stack.sort((a, b) => a - b);
    resolved.blockVoicingMidis = resolved.innerVoicingMidis;

    for (const part of parts) {
      let measure = part.measures.find((m) => m.index === mel.bar);
      if (!measure) {
        measure = { index: mel.bar, events: [] };
        part.measures.push(measure);
      }

      measure.events = measure.events.filter(
        (e) =>
          !(
            (e.kind === 'note' || e.kind === 'chord') &&
            Math.abs(e.startBeat - mel.onsetBeat) < 0.02
          )
      );

      const symbol = harmonySymbolForResolved(resolved);
      if (stack.length === 1) {
        measure.events.push({
          kind: 'note',
          pitch: mel.midiPitch,
          startBeat: mel.onsetBeat,
          duration: mel.durationBeats,
          voice: 1,
        });
      } else {
        measure.events.push({
          kind: 'chord',
          pitches: stack,
          startBeat: mel.onsetBeat,
          duration: mel.durationBeats,
          voice: 1,
          chordSymbol: symbol,
        });
      }

      measure.events.sort((a, b) => a.startBeat - b.startBeat);
    }
  }

  for (const part of parts) {
    part.measures.sort((a, b) => a.index - b.index);
  }
  return out;
}

export function assertMelodyIsTopOfStack(resolved: ResolvedChordMelodyNote, melodyMidi: number): boolean {
  if (resolved.exportStackMidis.length === 0) return false;
  return Math.max(...resolved.exportStackMidis) === melodyMidi;
}