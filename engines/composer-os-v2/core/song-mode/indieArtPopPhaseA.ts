/**
 * Song Mode — STYLE_INDIE_ART_POP Phase A deepening (texture / roles / phrase edges only).
 * Runs after Song Mode space pass (C7), before melodic continuity / finalize.
 * Does not alter harmony, chord symbols, or MusicXML import paths.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { SectionRole, SectionWithRole } from '../section-roles/sectionRoleTypes';
import { isProtectedBar } from '../score-integrity/identityLock';
import { appendSongModeStyleSurfaceNotes } from './songModeStyleSurface';
import {
  resolveIndieArtPopTuningTexture,
  type AlternateGuitarTuningResolved,
  type IndieArtPopTuningTextureKind,
} from './alternateGuitarTunings';
import { normalizeStyleProfileId } from './songModeStyleProfile';

function sectionRoleForBar(sections: SectionWithRole[], bar: number): SectionRole | null {
  for (const s of sections) {
    if (bar >= s.startBar && bar < s.startBar + s.length) return s.role;
  }
  return null;
}

function clampVel(v: number): number {
  return Math.max(1, Math.min(127, Math.round(v)));
}

function isPhraseEndBar(bar: number): boolean {
  return bar > 0 && bar % 4 === 0;
}

function applyDelta(base: number, delta: number, cap = 22): number {
  const d = Math.max(-cap, Math.min(cap, delta));
  return clampVel(base + d);
}

/**
 * Phase A: sectional contrast, tuning-aware guitar role bias, phrase-edge shaping, pre-return impact.
 * Skips identity-protected hook bars (see `identityLock.ts`).
 */
export function applyIndieArtPopPhaseADeepening(
  score: ScoreModel,
  context: CompositionContext,
  sections: SectionWithRole[]
): void {
  const meta = context.generationMetadata;
  if (!meta?.songModeHookFirstIdentity) return;
  if (context.presetId !== 'guitar_bass_duo') return;
  if (normalizeStyleProfileId(meta.styleProfile) !== 'STYLE_INDIE_ART_POP') return;

  const tuning = meta.alternateGuitarTuning as AlternateGuitarTuningResolved | undefined;
  const texture: IndieArtPopTuningTextureKind = resolveIndieArtPopTuningTexture(tuning);
  const splitStrong = tuning?.mode === 'separate';

  const guitar =
    score.parts.find((p) => p.id === 'guitar') ??
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar' && p.id !== 'guitar_2') ??
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  /** After `remapBassPartToElectricGuitar2ForIndieArtPop`, the former bass staff is `guitar_2`, same instrument id as Guitar 1. */
  const lowerLine = splitStrong
    ? score.parts.find((p) => p.id === 'guitar_2')
    : score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar) return;

  const stringsPlaceholderBars: number[] = [];
  const tb = context.form.totalBars;

  const visitGuitarNote = (mIndex: number, n: NoteEvent): void => {
    if (isProtectedBar(mIndex, context)) return;

    const base = n.velocity ?? 80;
    const v = n.voice ?? 1;
    const role = sectionRoleForBar(sections, mIndex);
    let d = 0;

    if (role === 'statement') d -= 4;
    else if (role === 'contrast') d += v === 1 ? 7 : 2;
    else if (role === 'return') d += v === 1 ? 8 : 3;
    else if (role === 'development') d += v === 1 ? 5 : 0;

    if (texture === 'drone_cluster') {
      if (v === 2) {
        d += 6;
        if (!n.articulation) n.articulation = 'tenuto';
      } else if (n.duration <= 1.01) {
        d += 4;
        if (!n.articulation) n.articulation = 'staccato';
      }
    } else if (texture === 'open_modal') {
      if (v === 1) d += 3;
      if (v === 2) d -= 4;
    }

    if (splitStrong) {
      if (v === 2) {
        d += 4;
        if (n.pitch <= 60) d += 2;
      } else {
        d += 3;
        if (n.pitch >= 62) d += 2;
        if (!n.articulation && n.duration <= 1.25) n.articulation = 'accent';
      }
    } else if (texture === 'standard') {
      if (v === 2) d += 1;
      if (v === 1 && !n.articulation && n.duration <= 1.01) n.articulation = 'accent';
    }

    const phraseEnd = isPhraseEndBar(mIndex);
    if (phraseEnd) {
      if (v === 2 && n.startBeat >= 2 - 1e-4) {
        d -= 14;
        stringsPlaceholderBars.push(mIndex);
      }
      if (v === 1 && n.startBeat >= 3 - 1e-4) {
        d += 6;
        if (!n.articulation) n.articulation = 'accent';
      }
    }

    if (tb >= 24 && mIndex === 24 && v === 1) {
      d += 8;
      if (!n.articulation) n.articulation = 'accent';
    }

    n.velocity = applyDelta(base, d);
  };

  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      visitGuitarNote(m.index, e as NoteEvent);
    }
  }

  if (lowerLine) {
    for (const m of lowerLine.measures) {
      if (isProtectedBar(m.index, context)) continue;
      const role = sectionRoleForBar(sections, m.index);
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        const n = e as NoteEvent;
        const base = n.velocity ?? 80;
        let d = 0;
        if (role === 'statement') d -= 3;
        else if (role === 'contrast') d += 5;
        else if (role === 'return') d += 6;
        else if (role === 'development') d += 2;
        if (texture === 'open_modal' && role === 'contrast') d -= 2;
        n.velocity = applyDelta(base, d, 18);
      }
    }
  }

  const uniqBars = [...new Set(stringsPlaceholderBars)].sort((a, b) => a - b);

  context.generationMetadata = {
    ...meta,
    indieArtPopPhaseAApplied: true,
    indieArtPopStringsPlaceholderBars: uniqBars.length ? uniqBars.slice(0, 24) : undefined,
  } as GenerationMetadata;

  appendSongModeStyleSurfaceNotes(context.generationMetadata, [
    `STYLE_INDIE_ART_POP Phase A: sectional contrast + tuning-aware roles (${texture}) + phrase-edge shaping; hook-safe bars unchanged.`,
  ]);
}
