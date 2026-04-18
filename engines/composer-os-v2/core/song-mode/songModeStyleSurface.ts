/**
 * Song Mode — thin “style surfaces”: nudge `generationMetadata` fields downstream already consume,
 * with short honest receipt lines (no mimic claims).
 */

import type { GenerationMetadata } from '../compositionContext';
import type { StyleProfile } from './songModeStyleProfile';
import { normalizeSongwriterStyleKey } from './songwriterStyleProfiles';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function appendStyleSurfaceNotes(metadata: GenerationMetadata, lines: string[]): void {
  if (lines.length === 0) return;
  metadata.songModeStyleSurfaceNotes = [...(metadata.songModeStyleSurfaceNotes ?? []), ...lines];
}

/**
 * When the user picks **Groove / Soul**, bias syncopation + density upward so Phase **C1** rhythm overlay
 * (`songwriterSyncopationBias` → `selectOverlaysForPhrase`) and related intent differ measurably from defaults.
 * Velocity shaping for this profile remains in `songModeStyleEngine.ts` (Style Engine pass).
 * Appends receipt lines so other surfaces (e.g. primary-songwriter) can stack.
 */
export function applyGrooveSoulStyleSurface(metadata: GenerationMetadata, styleProfile: StyleProfile | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (styleProfile !== 'STYLE_GROOVE_SOUL') return;

  const sync = (metadata.songwriterSyncopationBias ?? 0.5) + 0.12;
  const dens = (metadata.songwriterDensityBias ?? 0.5) + 0.08;
  metadata.songwriterSyncopationBias = clamp01(sync);
  metadata.songwriterDensityBias = clamp01(dens);

  appendStyleSurfaceNotes(metadata, [
    'STYLE_GROOVE_SOUL: raised syncopation and density biases for Song Mode rhythm overlay (Phase C1) and phrase intent.',
    'STYLE_GROOVE_SOUL: Style Engine pass applies profile-specific note velocities (not an imitation of any artist).',
  ]);
}

/**
 * When the resolved primary songwriter is the **Donald Fagen** profile (`donald_fagen` / aliases including
 * `songwriter_donald_fagen`), apply small additive nudges **after** generic `resolveSongwritingStyles` so
 * phrase grid, harmony colour, and rhythm/density differ measurably from other primaries.
 */
export function applyDonaldFagenSongwriterSurface(
  metadata: GenerationMetadata,
  primarySongwriterStyle: string | undefined
): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  const id = normalizeSongwriterStyleKey(primarySongwriterStyle);
  if (id !== 'donald_fagen') return;

  metadata.songwriterPhraseRegularity = clamp01((metadata.songwriterPhraseRegularity ?? 0.5) + 0.12);
  /** Controlled syncopation uplift for Phase C1 rhythm overlay (not max chaos — paired with modest density). */
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.06);
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.03);
  metadata.songwriterHookRepetitionBias = clamp01((metadata.songwriterHookRepetitionBias ?? 0.5) + 0.04);

  metadata.fagenMuChordBias = clamp01((metadata.fagenMuChordBias ?? 0) + 0.04);
  metadata.fagenLydianMajorBias = clamp01((metadata.fagenLydianMajorBias ?? 0) + 0.03);
  metadata.fagenAlteredDominantBias = clamp01((metadata.fagenAlteredDominantBias ?? 0) + 0.06);
  metadata.fagenRootAvoidanceMelody = clamp01((metadata.fagenRootAvoidanceMelody ?? 0) + 0.05);
  metadata.fagenSlashChordDensity = clamp01((metadata.fagenSlashChordDensity ?? 0) + 0.05);

  metadata.bacharachDeceptiveCadenceRate = clamp01((metadata.bacharachDeceptiveCadenceRate ?? 0) + 0.09);
  metadata.bacharachChromaticVoiceLeading = clamp01((metadata.bacharachChromaticVoiceLeading ?? 0) + 0.06);
  metadata.bacharachPedalUsage = clamp01(Math.max(0, (metadata.bacharachPedalUsage ?? 0) - 0.08));

  appendStyleSurfaceNotes(metadata, [
    'Primary songwriter surface (Donald Fagen): phrase/hook-return weights nudged; syncopation raised slightly for C1 overlays; density kept moderate (harmonic colour over raw note count).',
    'Primary songwriter surface (Donald Fagen): jazz-pop harmony metadata nudged (Mu/add-colour, Lydian-on-symbol, altered dominants, slash density, cadence-side-step weights; chromatic voice-leading; lower static-pedal bias). Duo guitar consumes Mu/Lydian/altered/root-avoidance when primary resolves to donald_fagen.',
  ]);
}
