/**
 * Guitar–Bass Duo (Single-Line): monophonic guitar/bass, receipt label.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID } from '../core/presets/guitarBassDuoPresetIds';
import { assertDuoSingleLineNoChordalGuitarVoicings } from '../core/goldenPath/duoSingleLineMonophony';

function overlaps(aStart: number, aDur: number, bStart: number, bDur: number): boolean {
  return aStart < bStart + bDur && bStart < aStart + aDur;
}

function testSingleLineSuccessAndReceipt(): boolean {
  const r = runGoldenPath(42_001, { presetId: GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID });
  return (
    r.success &&
    r.context.presetId === GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID &&
    r.context.generationMetadata.duoModeReceiptLabel === 'Guitar–Bass Duo (Single-Line)'
  );
}

function testGuitarNoChordalVoicings(): boolean {
  const r = runGoldenPath(42_002, { presetId: GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID });
  if (!r.success) return false;
  const guitar = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return false;
  return assertDuoSingleLineNoChordalGuitarVoicings(guitar).length === 0;
}

function testBassMonophonicByBar(): boolean {
  const r = runGoldenPath(42_003, { presetId: GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID });
  if (!r.success) return false;
  const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return false;
  for (const m of bass.measures) {
    const notes = m.events.filter((e) => e.kind === 'note') as { startBeat: number; duration: number }[];
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        if (overlaps(notes[i].startBeat, notes[i].duration, notes[j].startBeat, notes[j].duration)) {
          return false;
        }
      }
    }
  }
  return true;
}

export function runGuitarBassDuoSingleLineTests(): { name: string; ok: boolean }[] {
  const results: { name: string; ok: boolean }[] = [];
  const t = (name: string, ok: boolean) => results.push({ name, ok });
  t('Single-line preset: golden path success + duoModeReceiptLabel', testSingleLineSuccessAndReceipt());
  t('Single-line: guitar has no voice-2 / overlapping chordal layer', testGuitarNoChordalVoicings());
  t('Single-line: bass has no simultaneous note overlaps per bar', testBassMonophonicByBar());
  return results;
}
