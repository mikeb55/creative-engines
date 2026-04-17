/**
 * Guitar–Bass Duo family — minimal consumption of `generationMetadata.wybleVoiceLayout`.
 * When the map matches `WYBLE_ROLE_MAP_DUO_FAMILY`, the first bass attack in bar 1 is
 * raised by a small chromatic offset so `bass_anchor` is not identical to the pre-Wyble
 * anchor pitch (portable metadata → real written pitch change).
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { EnsembleWybleRoleMap } from '../wyble/wybleVoiceLayoutTypes';
import { WYBLE_ROLE_MAP_DUO_FAMILY } from '../wyble/ensembleWybleRoleMaps';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';

/** Semitone lift applied only to the first bass note event in measure 1. */
export const WYBLE_DUO_BASS_BAR1_ANCHOR_NUDGE_SEMITONES = 2;

function isDuoFamilyWybleMap(layout: EnsembleWybleRoleMap): boolean {
  const m = WYBLE_ROLE_MAP_DUO_FAMILY;
  return (
    layout.lead_line.partId === m.lead_line.partId &&
    (layout.lead_line.voice ?? 1) === (m.lead_line.voice ?? 1) &&
    layout.inner_counter.partId === m.inner_counter.partId &&
    (layout.inner_counter.voice ?? 2) === (m.inner_counter.voice ?? 2) &&
    layout.bass_anchor.partId === m.bass_anchor.partId
  );
}

export function applyDuoWybleBassAnchorBar1Nudge(score: ScoreModel, context: CompositionContext): void {
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  const layout = context.generationMetadata?.wybleVoiceLayout;
  if (!layout || !isDuoFamilyWybleMap(layout)) return;

  const bassPartId = WYBLE_ROLE_MAP_DUO_FAMILY.bass_anchor.partId;
  const bass = score.parts.find((p) => p.id === bassPartId);
  if (!bass || bass.measures.length < 1) return;

  const m0 = bass.measures[0];
  if (!m0) return;

  for (const ev of m0.events) {
    if (ev.kind === 'note') {
      ev.pitch += WYBLE_DUO_BASS_BAR1_ANCHOR_NUDGE_SEMITONES;
      break;
    }
  }
}
