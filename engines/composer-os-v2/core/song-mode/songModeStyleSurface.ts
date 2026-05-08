/**
 * Song Mode — thin “style surfaces”: nudge `generationMetadata` fields downstream already consume,
 * with short honest receipt lines (no mimic claims).
 */

import type {
  ArvoPartContextMode,
  BartokContextMode,
  BeatlesContextMode,
  FelaKutiContextMode,
  FrankZappaContextMode,
  GenerationMetadata,
  GershwinContextMode,
  MilesDavisContextMode,
  PrinceContextMode,
  SatieContextMode,
} from '../compositionContext';
import type { StyleProfile } from './songModeStyleProfile';
import { registerSongModeSectionBehaviour } from './songModeSectionControl';
import { normalizeSongwriterStyleKey } from './songwriterStyleProfiles';
import { computeZappaDensityArc, resolveFrankZappaSyntheticScaleBias } from './frankZappaSlice';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function appendStyleSurfaceNotes(metadata: GenerationMetadata, lines: string[]): void {
  if (lines.length === 0) return;
  metadata.songModeStyleSurfaceNotes = [...(metadata.songModeStyleSurfaceNotes ?? []), ...lines];
}

/** Append Song Mode receipt lines (primary songwriter surfaces, Phase C1 follow-ups, etc.). */
export function appendSongModeStyleSurfaceNotes(metadata: GenerationMetadata, lines: string[]): void {
  appendStyleSurfaceNotes(metadata, lines);
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

/** ECM Song Mode style surface preset (`applyEcmChamberStyleSurface`). */
export type EcmChamberSurfaceMode = 'angel_song' | 'balanced' | 'metheny_scofield';

function resolveEcmChamberSurfaceMode(metadata: GenerationMetadata): EcmChamberSurfaceMode {
  const raw = metadata.ecmChamberMode;
  if (raw === 'angel_song' || raw === 'balanced' || raw === 'metheny_scofield') return raw;
  return 'balanced';
}

/**
 * **`STYLE_ECM` / `STYLE_ECM_CHAMBER`** — sparse chamber feel: lower density/sync, raise space; phrase-start looseness,
 * bass independence, cadence softness scale by {@link EcmChamberSurfaceMode}. Velocity shaping remains in `songModeStyleEngine.ts`.
 */
export function applyEcmChamberStyleSurface(metadata: GenerationMetadata, styleProfile: StyleProfile | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (styleProfile !== 'STYLE_ECM' && styleProfile !== 'STYLE_ECM_CHAMBER') return;

  const mode = resolveEcmChamberSurfaceMode(metadata);
  metadata.ecmChamberMode = mode;

  const dens0 = metadata.songwriterDensityBias ?? 0.5;
  const sync0 = metadata.songwriterSyncopationBias ?? 0.5;
  const space0 = metadata.songwriterSpaceBias ?? 0.5;

  let dDens = 0;
  let dSync = 0;
  let dSpace = 0;
  let dPhraseLoose = 0;
  let dBassInd = 0;
  let dCadSoft = 0;

  switch (mode) {
    case 'angel_song':
      dDens = -0.25;
      dSync = -0.2;
      dSpace = 0.3;
      dPhraseLoose = 0.15;
      dBassInd = 0.2;
      dCadSoft = 0.25;
      break;
    case 'balanced':
      dDens = -0.15;
      dSync = -0.1;
      dSpace = 0.2;
      dPhraseLoose = 0.08;
      dBassInd = 0.15;
      dCadSoft = 0.18;
      break;
    case 'metheny_scofield':
      dDens = -0.05;
      dSync = 0.05;
      dSpace = 0.1;
      dPhraseLoose = 0.03;
      dBassInd = 0.1;
      dCadSoft = 0.1;
      break;
  }

  metadata.songwriterDensityBias = clamp01(dens0 + dDens);
  metadata.songwriterSyncopationBias = clamp01(sync0 + dSync);
  metadata.songwriterSpaceBias = clamp01(space0 + dSpace);
  metadata.songwriterPhraseStartLooseness = clamp01((metadata.songwriterPhraseStartLooseness ?? 0.5) + dPhraseLoose);
  metadata.songwriterBassIndependenceBias = clamp01((metadata.songwriterBassIndependenceBias ?? 0.5) + dBassInd);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + dCadSoft);

  const profileTag = styleProfile === 'STYLE_ECM_CHAMBER' ? 'STYLE_ECM_CHAMBER' : 'STYLE_ECM';
  appendStyleSurfaceNotes(metadata, [
    `${profileTag}: ecmChamberMode=${mode} — density bias ${dDens >= 0 ? '+' : ''}${dDens}, syncopation bias ${dSync >= 0 ? '+' : ''}${dSync}, space bias ${dSpace >= 0 ? '+' : ''}${dSpace} (from prior songwriterDensityBias/songwriterSyncopationBias/songwriterSpaceBias defaults 0.5 when unset; clamped 0–1).`,
    `${profileTag}: phrase-start looseness (beat 2 / off-beat) ${dPhraseLoose >= 0 ? '+' : ''}${dPhraseLoose}.`,
    `${profileTag}: bass independence bias ${dBassInd >= 0 ? '+' : ''}${dBassInd}.`,
    `${profileTag}: cadence softness ${dCadSoft >= 0 ? '+' : ''}${dCadSoft}.`,
    `${profileTag}: Style Engine pass applies profile-specific note velocities (not an imitation of any artist).`,
  ]);
}

/**
 * **STYLE_SOPHISTICATED_POP** — Bacharach-aligned surface nudges (closest style match). Intended to run immediately before
 * {@link applySophisticatedPopStyleSurface} in `runGoldenPath` so both stack on the same profile.
 */
export function applyBacharachStyleSurface(metadata: GenerationMetadata, styleProfile: StyleProfile | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (styleProfile !== 'STYLE_SOPHISTICATED_POP') return;

  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) - 0.08);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.05);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.2);

  appendStyleSurfaceNotes(metadata, [
    'STYLE_SOPHISTICATED_POP (Bacharach surface): density −0.08, syncopation +0.05, cadence softness +0.20 — light Latin/bossa-aligned rhythm metadata (generative bias only).',
  ]);
}

/**
 * **STYLE_MODERN_JAZZ** — Bill Evans–aligned metadata nudges (closest style match). Runs before generic sophisticated-pop hooks when both apply.
 */
export function applyBillEvansStyleSurface(metadata: GenerationMetadata, styleProfile: StyleProfile | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (styleProfile !== 'STYLE_MODERN_JAZZ') return;
  if (metadata.jobimMode === true) return;

  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) - 0.05);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.22);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.12);

  appendStyleSurfaceNotes(metadata, [
    'STYLE_MODERN_JAZZ (Bill Evans surface): density −0.05, cadence softness +0.22, space bias +0.12 — impressionist colour metadata (generative bias only).',
  ]);
}

/**
 * **STYLE_MODERN_JAZZ** + **`jobimMode`** — bossa-aligned metadata nudges when primary songwriter is Jobim (does not stack with {@link applyBillEvansStyleSurface}).
 */
export function applyJobimStyleSurface(metadata: GenerationMetadata, styleProfile: StyleProfile | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (styleProfile !== 'STYLE_MODERN_JAZZ') return;
  if (metadata.jobimMode !== true) return;

  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) - 0.08);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.18);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.15);

  appendStyleSurfaceNotes(metadata, [
    'STYLE_MODERN_JAZZ (Jobim surface): density −0.08, syncopation +0.18, cadence softness +0.15 — bossa rhythm metadata (generative bias only).',
  ]);
}

/**
 * Primary **`frank_zappa`** — density arc mean from six-zone `computeZappaDensityArc`, raised syncopation, reduced space (dense Zappa pocket metadata).
 */
export function applyFrankZappaStyleSurface(
  metadata: GenerationMetadata,
  primarySongwriterStyle: string | undefined,
  totalBarsHint?: number
): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'frank_zappa') return;

  const ctxMode: FrankZappaContextMode = metadata.frankZappaContext ?? 'avant_rock';
  metadata.frankZappaContext = ctxMode;
  metadata.frankZappaSyntheticScaleBias = resolveFrankZappaSyntheticScaleBias(ctxMode);

  const tb = Math.max(8, Math.min(128, totalBarsHint ?? metadata.totalBars ?? 32));
  const arc = computeZappaDensityArc(tb);
  metadata.frankZappaDensityBiasByBar = arc;
  metadata.songwriterDensityBias = clamp01(arc.reduce((a, x) => a + x, 0) / arc.length);

  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.22);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) - 0.15);

  appendStyleSurfaceNotes(metadata, [
    `Frank Zappa surface (${ctxMode}): density from six-zone arc mean → songwriterDensityBias; syncopation +0.22; space −0.15; synthetic scale bias metadata — generative bias only.`,
  ]);
}

/**
 * Primary **`miles_davis`** — cool / quintet / electric pocket: space-forward metadata by {@link MilesDavisContextMode}.
 */
/**
 * Primary **`bartok`** — folk-modal axis / chamber space: raised space + sync + cadence softness; density nudges by {@link BartokContextMode}.
 */
export function applyBartokStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'bartok') return;

  const ctx: BartokContextMode = metadata.bartokContext ?? 'mikrokosmos';
  metadata.bartokContext = ctx;

  const dens0 = metadata.songwriterDensityBias ?? 0.5;
  const sync0 = metadata.songwriterSyncopationBias ?? 0.5;
  const space0 = metadata.songwriterSpaceBias ?? 0.5;
  const cad0 = metadata.songwriterCadenceSoftness ?? 0.5;

  let dDens = 0;
  if (ctx === 'mikrokosmos') dDens = 0.06;
  else if (ctx === 'string_quartet') dDens = -0.08;
  else dDens = 0.02;

  metadata.songwriterDensityBias = clamp01(dens0 + dDens);
  metadata.songwriterSyncopationBias = clamp01(sync0 + 0.18);
  metadata.songwriterSpaceBias = clamp01(space0 + 0.28);
  metadata.songwriterCadenceSoftness = clamp01(cad0 + 0.22);

  appendStyleSurfaceNotes(metadata, [
    `Bartók surface (${ctx}): space +0.28, sync +0.18, cadence softness +0.22; density delta ${dDens >= 0 ? '+' : ''}${dDens} — generative metadata only.`,
  ]);
}

/**
 * Primary **`gershwin`** — theatre-song sync + Songbook density (`gershwinSlice.ts` harmony receipts separate).
 */
export function applyGershwinStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'gershwin') return;

  const ctx: GershwinContextMode = metadata.gershwinContext ?? 'song_aaba';
  metadata.gershwinContext = ctx;

  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.26);
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.12);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.14);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.18);

  appendStyleSurfaceNotes(metadata, [
    `Gershwin surface (${ctx}): sync +0.26, density +0.12, space +0.14, cadence softness +0.18 — generative metadata only.`,
  ]);
}

/**
 * Primary **`arvo_part`** — sparse tintinnabuli pocket: raised space + cadence softness; lower density + sync (`arvoPartSlice.ts` receipts separate).
 */
export function applyArvoPartStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'arvo_part') return;

  const ctx: ArvoPartContextMode = metadata.arvoPartContext ?? 'fur_alina';
  metadata.arvoPartContext = ctx;

  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.45);
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) - 0.28);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) - 0.22);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.38);

  appendStyleSurfaceNotes(metadata, [
    `Arvo Pärt surface (${ctx}): space +0.45, density −0.28, syncopation −0.22, cadence softness +0.38 — generative metadata only.`,
  ]);
}

/**
 * Primary **`satie`** — floating modal field: raised space + cadence softness; lower density + sync (`satieSlice.ts` receipts separate).
 */
export function applySatieStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'satie') return;

  const ctx: SatieContextMode = metadata.satieContext ?? 'gymnopedie';
  metadata.satieContext = ctx;

  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.42);
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) - 0.24);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) - 0.18);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.44);

  appendStyleSurfaceNotes(metadata, [
    `Satie surface (${ctx}): space +0.42, density −0.24, syncopation −0.18, cadence softness +0.44 — generative metadata only.`,
  ]);
}

/**
 * Primary **`prince`** — Minneapolis-pocket sync + density; generous space + softer cadence closes (`princeSlice.ts` receipts separate).
 */
export function applyPrinceStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'prince') return;

  const ctx: PrinceContextMode = metadata.princeContext ?? 'purple_rain';
  metadata.princeContext = ctx;

  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.28);
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.14);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.18);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.16);

  appendStyleSurfaceNotes(metadata, [
    `Prince surface (${ctx}): sync +0.28, density +0.14, space +0.18, cadence softness +0.16 — generative metadata only.`,
  ]);
}

/**
 * Primary **`beatles`** — pocket clarity + space; softer cadence closes (`beatlesSlice.ts` receipts separate).
 */
export function applyBeatlesStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'beatles') return;

  const ctx: BeatlesContextMode = metadata.beatlesContext ?? 'merseybeat_1962';
  metadata.beatlesContext = ctx;

  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.08);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) - 0.06);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.12);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.22);

  appendStyleSurfaceNotes(metadata, [
    `Beatles surface (${ctx}): density +0.08, sync −0.06, space +0.12, cadence softness +0.22 — generative metadata only.`,
  ]);
}

/**
 * Primary **`fela_kuti`** — Afrobeat pocket: raised sync + density, tighter space, very soft cadence closes (`felaKutiSlice.ts` receipts separate).
 */
export function applyFelaKutiStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'fela_kuti') return;

  const ctx: FelaKutiContextMode = metadata.felaKutiContext ?? 'zombie_1977';
  metadata.felaKutiContext = ctx;

  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.32);
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.18);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) - 0.14);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.38);

  appendStyleSurfaceNotes(metadata, [
    `Fela Kuti surface (${ctx}): sync +0.32, density +0.18, space −0.14, cadence softness +0.38 — generative metadata only.`,
  ]);
}

export function applyMilesDavisStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'miles_davis') return;

  const ctx: MilesDavisContextMode = metadata.milesDavisContext ?? 'modal_1959';
  metadata.milesDavisContext = ctx;

  const dens0 = metadata.songwriterDensityBias ?? 0.5;
  const sync0 = metadata.songwriterSyncopationBias ?? 0.5;
  const space0 = metadata.songwriterSpaceBias ?? 0.5;
  const cad0 = metadata.songwriterCadenceSoftness ?? 0.5;

  if (ctx === 'modal_1959') {
    metadata.songwriterDensityBias = clamp01(dens0 - 0.25);
    metadata.songwriterSyncopationBias = clamp01(sync0 - 0.05);
    metadata.songwriterSpaceBias = clamp01(space0 + 0.35);
    metadata.songwriterCadenceSoftness = clamp01(cad0 + 0.3);
  } else if (ctx === 'quintet_1965') {
    metadata.songwriterDensityBias = clamp01(dens0 - 0.12);
    metadata.songwriterSyncopationBias = clamp01(sync0 + 0.1);
    metadata.songwriterSpaceBias = clamp01(space0 + 0.25);
    metadata.songwriterCadenceSoftness = clamp01(cad0 + 0.2);
  } else {
    metadata.songwriterDensityBias = clamp01(dens0 + 0.08);
    metadata.songwriterSyncopationBias = clamp01(sync0 + 0.22);
    metadata.songwriterSpaceBias = clamp01(space0 + 0.1);
    metadata.songwriterCadenceSoftness = clamp01(cad0 + 0.15);
  }

  appendStyleSurfaceNotes(metadata, [
    `Miles Davis surface (${ctx}): density/sync/space/cadence biases — generative metadata only.`,
  ]);
}

/**
 * Primary **`cole_porter`** — theatre-jazz standard harmony: slightly denser syncopation, cleaner cadential resolution metadata.
 */
export function applyColePorterStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'cole_porter') return;

  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.05);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.08);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) - 0.05);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) - 0.1);

  appendStyleSurfaceNotes(metadata, [
    'Cole Porter surface: density +0.05, syncopation +0.08, space −0.05, cadence softness −0.10 — clean cadential theatre-jazz metadata (generative bias only).',
  ]);
}

/**
 * Primary **`debussy`** — impressionist wash: slightly denser syncopation, generous space + cadence softness (`debussySlice.ts` harmony receipts separate).
 */
export function applyDebussyStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'debussy') return;

  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.14);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.09);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.31);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.34);

  appendStyleSurfaceNotes(metadata, [
    'debussy surface: density +0.14, syncopation +0.09, space +0.31, cadence softness +0.34 — generative bias only (harmony slice emits db:* device receipts).',
  ]);
}

/**
 * Primary **`thelonious_monk`** — angular pocket: lower mean density, raised syncopation + space, softer cadence metadata.
 */
export function applyMonkStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'thelonious_monk') return;

  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) - 0.12);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.3);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.35);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.1);

  appendStyleSurfaceNotes(metadata, [
    'thelonious_monk surface: density −0.12, syncopation +0.30, space +0.35, cadence softness +0.10 — generative bias only.',
  ]);
}

/**
 * Primary **`duke_ellington`** — dense orchestral pocket metadata (Song Mode hook-first path).
 */
export function applyDukeEllingtonStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'duke_ellington') return;

  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.15);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.22);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) - 0.1);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.08);

  appendStyleSurfaceNotes(metadata, [
    'duke_ellington surface: density +0.15, syncopation +0.22, space −0.10, cadence softness +0.08 — generative bias only.',
  ]);
}

/**
 * Primary **`maria_schneider`** — floating pastoral chamber metadata (Song Mode hook-first path).
 */
export function applyMariaSchneiderStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'maria_schneider') return;

  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.05);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) - 0.2);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.25);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.28);

  appendStyleSurfaceNotes(metadata, [
    'maria_schneider surface: density +0.05, syncopation −0.20, space +0.25, cadence softness +0.28 — generative bias only.',
  ]);
}

/**
 * STYLE_SOPHISTICATED_POP — modest rhythm/metadata nudges + receipts; harmony dressing runs separately on locked bars.
 */
export function applySophisticatedPopStyleSurface(metadata: GenerationMetadata, styleProfile: StyleProfile | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (styleProfile !== 'STYLE_SOPHISTICATED_POP') return;

  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.06);
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.04);
  metadata.bacharachModalMixtureLevel = clamp01((metadata.bacharachModalMixtureLevel ?? 0) + 0.07);

  appendStyleSurfaceNotes(metadata, [
    'STYLE_SOPHISTICATED_POP: raised syncopation and density biases slightly for Song Mode rhythm overlay (Phase C1); modest harmonic mixture metadata for dressed-up pop colour.',
    'STYLE_SOPHISTICATED_POP: chord symbols may gain tasteful 7th/9th extensions by section (deterministic dressing pass); Style Engine applies profile-specific velocities.',
    'STYLE_SOPHISTICATED_POP: B section targets brighter harmonic colour than opening sections (section-aware dressing). Not an imitation of any artist.',
  ]);

  registerSongModeSectionBehaviour(metadata, {
    sliceId: 'style_sophisticated_pop',
    densityBiasByRole: { BRIDGE_LIFT: 0.04 },
    harmonicColourBiasByRole: { BRIDGE_LIFT: 0.06, OPENING: 0.02 },
    entryReturnGestures: { emphasizeBridgeLift: true },
    returnVariationType: 'none',
  });
}

/**
 * Primary songwriter **Burt Bacharach** — conservative rhythm vs jazz-forward profiles, lighter comp density,
 * phrase-flex metadata; receipts describe generative biases only (non-imitative).
 */
export function applyBacharachSongModeSurfaceV1(
  metadata: GenerationMetadata,
  primarySongwriterStyle: string | undefined
): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'bacharach') return;

  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) - 0.1);
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) - 0.07);
  metadata.songwriterPhraseRegularity = clamp01((metadata.songwriterPhraseRegularity ?? 0.5) - 0.08);
  metadata.bacharachDeceptiveCadenceRate = clamp01((metadata.bacharachDeceptiveCadenceRate ?? 0) + 0.06);
  metadata.bacharachPedalUsage = clamp01((metadata.bacharachPedalUsage ?? 0) + 0.05);

  appendStyleSurfaceNotes(metadata, [
    'Bacharach slice: favoured smooth I/IV/vi maj7-m7 colours and light secondary-dominant motion on key cadences.',
    'Bacharach slice: bridge allowed a small controlled key-colour shift before returning home.',
    'Bacharach slice: accompaniment stayed lighter and melody-supportive rather than densely syncopated.',
  ]);

  registerSongModeSectionBehaviour(metadata, {
    sliceId: 'bacharach',
    densityBiasByRole: { OPENING: -0.07, BRIDGE_LIFT: 0.03, RETURN: -0.02 },
    harmonicColourBiasByRole: { BRIDGE_LIFT: 0.08, RETURN: 0.04 },
    entryReturnGestures: { softenReturn: true, emphasizeBridgeLift: true },
    returnVariationType: 'harmonic_recolour',
  });
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
    'Song Mode Donald Fagen slice v2: planning chord pools include extra bars with ii–V–I-type colour and borrowed maj7 sonorities (generic jazz-pop templates); Phase C1 separately raises syncopation overlay pull for early phrases (bars 1–12). Honest bias only — not a claim of authenticity.',
    'Song Mode Donald Fagen keys-comp v1.5: split-hand register bias (LH shells vs RH colour), phrase-level density caps, and keyboard-oriented dynamic contour — see later v1.5 receipt lines after score pass. Generative rule set only.',
  ]);

  registerSongModeSectionBehaviour(metadata, {
    sliceId: 'donald_fagen',
    densityBiasByRole: { BRIDGE_LIFT: 0.03, OPENING: 0.03 },
    harmonicColourBiasByRole: { BRIDGE_LIFT: 0.06 },
    registerBiasByRole: { OPENING: 0.02, BRIDGE_LIFT: 0.04 },
    entryReturnGestures: { emphasizeBridgeLift: true },
    returnVariationType: 'evolved_comp',
  });
}

/** Primary **`bernard_herrmann`** — film thriller harmonic bias (`filmSoundtrackHarmonySlices.ts`). */
export function applyBernardHerrmannStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'bernard_herrmann') return;
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.1);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) - 0.05);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.1);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) - 0.05);
  appendStyleSurfaceNotes(metadata, [
    'bernard_herrmann surface: density +0.10, syncopation −0.05, space +0.10, cadence softness −0.05 — generative bias only (harmony slice emits bh:* device receipts).',
  ]);
}

/** Primary **`john_williams`** — Hollywood orchestral colour (`filmSoundtrackHarmonySlices.ts`). */
export function applyJohnWilliamsStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'john_williams') return;
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.15);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.1);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) - 0.05);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.2);
  appendStyleSurfaceNotes(metadata, [
    'john_williams surface: density +0.15, syncopation +0.10, space −0.05, cadence softness +0.20 — generative bias only (harmony slice emits jw:* device receipts).',
  ]);
}

/** Primary **`ennio_morricone`** — Italian film lyric / western idioms (`filmSoundtrackHarmonySlices.ts`). */
export function applyEnnioMorriconeStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'ennio_morricone') return;
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.15);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.1);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) - 0.05);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.15);
  appendStyleSurfaceNotes(metadata, [
    'ennio_morricone surface: density +0.15, syncopation +0.10, space −0.05, cadence softness +0.15 — generative bias only (harmony slice emits em:* device receipts).',
  ]);
}

/** Primary **`nino_rota`** — operatic / waltz film lyricism (`filmSoundtrackHarmonySlices.ts`). */
export function applyNinoRotaStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'nino_rota') return;
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.05);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.05);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.15);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.25);
  appendStyleSurfaceNotes(metadata, [
    'nino_rota surface: density +0.05, syncopation +0.05, space +0.15, cadence softness +0.25 — generative bias only (harmony slice emits nr:* device receipts).',
  ]);
}

/** Primary **`jerry_goldsmith`** — polytonal action / suspense (`filmSoundtrackHarmonySlices.ts`). */
export function applyJerryGoldsmithStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'jerry_goldsmith') return;
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.25);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.25);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) - 0.15);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) - 0.1);
  appendStyleSurfaceNotes(metadata, [
    'jerry_goldsmith surface: density +0.25, syncopation +0.25, space −0.15, cadence softness −0.10 — generative bias only (harmony slice emits jg:* device receipts).',
  ]);
}

/** Primary **`philip_glass`** — additive minimal pulse (`filmSoundtrackHarmonySlices.ts`). */
export function applyPhilipGlassStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'philip_glass') return;
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.2);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.05);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) - 0.15);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.15);
  appendStyleSurfaceNotes(metadata, [
    'philip_glass surface: density +0.20, syncopation +0.05, space −0.15, cadence softness +0.15 — generative bias only (harmony slice emits pg:* device receipts).',
  ]);
}

/** Primary **`hans_zimmer`** — epic ostinato stack bias (`filmSoundtrackHarmonySlices.ts`). */
export function applyHansZimmerStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'hans_zimmer') return;
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) + 0.3);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) + 0.2);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) - 0.15);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.05);
  appendStyleSurfaceNotes(metadata, [
    'hans_zimmer surface: density +0.30, syncopation +0.20, space −0.15, cadence softness +0.05 — generative bias only (harmony slice emits hz:* device receipts).',
  ]);
}

/** Primary **`angelo_badalamenti`** — dark lounge dream-pop bias (`filmSoundtrackHarmonySlices.ts`). */
export function applyAngeloBadalamentiStyleSurface(metadata: GenerationMetadata, primarySongwriterStyle: string | undefined): void {
  if (metadata.songModeHookFirstIdentity !== true) return;
  if (primarySongwriterStyle == null || primarySongwriterStyle.trim() === '') return;
  if (normalizeSongwriterStyleKey(primarySongwriterStyle) !== 'angelo_badalamenti') return;
  metadata.songwriterDensityBias = clamp01((metadata.songwriterDensityBias ?? 0.5) - 0.05);
  metadata.songwriterSyncopationBias = clamp01((metadata.songwriterSyncopationBias ?? 0.5) - 0.05);
  metadata.songwriterSpaceBias = clamp01((metadata.songwriterSpaceBias ?? 0.5) + 0.15);
  metadata.songwriterCadenceSoftness = clamp01((metadata.songwriterCadenceSoftness ?? 0.5) + 0.25);
  appendStyleSurfaceNotes(metadata, [
    'angelo_badalamenti surface: density −0.05, syncopation −0.05, space +0.15, cadence softness +0.25 — generative bias only (harmony slice emits ab:* device receipts).',
  ]);
}
