/**
 * Duo family: `generationMetadata.wybleVoiceLayout` is consumed in golden-path score build (bar 1 bass nudge).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID } from '../core/presets/guitarBassDuoPresetIds';
import { WYBLE_DUO_BASS_BAR1_ANCHOR_NUDGE_SEMITONES } from '../core/goldenPath/duoWybleBassAnchorNudge';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { createMeasure, createNote, createScore, addEvent } from '../core/score-model/scoreEventBuilder';
import type { CompositionContext } from '../core/compositionContext';
import { WYBLE_ROLE_MAP_DUO_FAMILY } from '../core/wyble/ensembleWybleRoleMaps';
import { applyDuoWybleBassAnchorBar1Nudge } from '../core/goldenPath/duoWybleBassAnchorNudge';

function firstBassNoteMidiBar1(score: ScoreModel): number {
  const bass = score.parts.find((p) => p.id === 'bass');
  const m0 = bass?.measures[0];
  const ev = m0?.events.find((e) => e.kind === 'note');
  if (ev?.kind !== 'note') throw new Error('expected bass bar 1 note');
  return ev.pitch;
}

describe('Duo family Wyble layout score consumption', () => {
  it('raises bar 1 first bass note when Wyble duo map is present vs suppressWybleVoiceLayoutForTest', () => {
    const withLayout = runGoldenPathOnce(11, { presetId: 'guitar_bass_duo' });
    const suppressed = runGoldenPathOnce(11, {
      presetId: 'guitar_bass_duo',
      suppressWybleVoiceLayoutForTest: true,
    });
    expect(withLayout.score.parts.some((p) => p.id === 'bass')).toBe(true);
    expect(suppressed.score.parts.some((p) => p.id === 'bass')).toBe(true);
    const pWith = firstBassNoteMidiBar1(withLayout.score);
    const pNo = firstBassNoteMidiBar1(suppressed.score);
    expect(pWith - pNo).toBe(WYBLE_DUO_BASS_BAR1_ANCHOR_NUDGE_SEMITONES);
  });

  it('applies the same bar-1 bass nudge for guitar_bass_duo_single_line', () => {
    const withLayout = runGoldenPathOnce(11, {
      presetId: GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID,
    });
    const suppressed = runGoldenPathOnce(11, {
      presetId: GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID,
      suppressWybleVoiceLayoutForTest: true,
    });
    expect(withLayout.score.parts.some((p) => p.id === 'bass')).toBe(true);
    expect(suppressed.score.parts.some((p) => p.id === 'bass')).toBe(true);
    expect(firstBassNoteMidiBar1(withLayout.score) - firstBassNoteMidiBar1(suppressed.score)).toBe(
      WYBLE_DUO_BASS_BAR1_ANCHOR_NUDGE_SEMITONES
    );
  });

  it('applyDuoWybleBassAnchorBar1Nudge mutates only matching duo + map (unit)', () => {
    const m = createMeasure(1, 'Cmaj7');
    addEvent(m, createNote(40, 0, 4, 1));
    const score = createScore('t', [
      { id: 'bass', name: 'Bass', instrumentIdentity: 'acoustic_upright_bass', midiProgram: 32, clef: 'bass', measures: [m] },
    ]);
    const ctx = {
      presetId: 'guitar_bass_duo',
      generationMetadata: { wybleVoiceLayout: WYBLE_ROLE_MAP_DUO_FAMILY },
    } as unknown as CompositionContext;
    applyDuoWybleBassAnchorBar1Nudge(score, ctx);
    expect(firstBassNoteMidiBar1(score)).toBe(40 + WYBLE_DUO_BASS_BAR1_ANCHOR_NUDGE_SEMITONES);
  });
});
