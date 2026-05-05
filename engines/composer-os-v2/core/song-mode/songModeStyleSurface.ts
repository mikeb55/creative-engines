/**
 * Song Mode — thin “style surfaces”: nudge `generationMetadata` fields downstream already consume,
 * with short honest receipt lines (no mimic claims).
 */

import type { GenerationMetadata } from '../compositionContext';
import type { StyleProfile } from './songModeStyleProfile';
import { registerSongModeSectionBehaviour } from './songModeSectionControl';
import { normalizeSongwriterStyleKey } from './songwriterStyleProfiles';

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
