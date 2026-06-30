/**
 * Guitar–Bass Duo / ECM chamber: regenerate a bar span and splice into a prior MusicXML export.
 */

import type { GenerateRequest } from '../../app-api/appApiTypes';
import { mapAppStyleStackToEngine } from '../../app-api/mapStyleStack';
import type { FormId } from '../form/formPlanner';
import { parseChordProgressionInputWithBarCount } from '../harmony/chordProgressionParser';
import { runGoldenPath, type GoldenPathResult, type RunGoldenPathOptions } from '../goldenPath/runGoldenPath';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { extractLeadSheetMelodyAnchorsFromMusicXml } from '../song-mode/songModeLeadSheetAdapter';
import { fragmentBarMeterMapFromFull } from './barMeterMapFragment';
import { splicePartwiseMusicXmlMeasures } from './musicXmlSectionSplice';
import { validateSectionRegenerationBarRange } from './sectionRegenerationPlanning';

function patchSectionRegenContextMetadata(
  frag: GoldenPathResult,
  fullBars: string[],
  totalBars: number,
  sb: number,
  eb: number,
  span: number,
  fullBarMeterMap: BarMeterMap | undefined
): void {
  frag.context.form.totalBars = totalBars;
  frag.context.lockedHarmonyBarsRaw = [...fullBars];
  frag.context.generationMetadata.parsedCustomProgressionBars = [...fullBars];
  frag.context.generationMetadata.sectionRegenerationReceipt = `section_regen bars ${sb}-${eb} span=${span}`;
  frag.context.generationMetadata.sectionRegenerationPartialScore = true;
  if (fullBarMeterMap && Object.keys(fullBarMeterMap).length > 0) {
    frag.context.barMeterMap = fullBarMeterMap;
    frag.context.generationMetadata.barMeterMap = fullBarMeterMap;
  }
}

function isImportExpressionPilotPreset(presetId: string): boolean {
  return (
    presetId === 'guitar_bass_duo' || presetId === 'guitar_bass_duo_single_line' || presetId === 'ecm_chamber'
  );
}

function normalizeImportHarmonyMode(input: unknown): 'free_harmony' | 'lock_harmony' | 'blend_harmony' {
  return input === 'lock_harmony' || input === 'blend_harmony' || input === 'free_harmony'
    ? input
    : 'free_harmony';
}

function normalizeHarmonyBlendRaw(input: unknown): number | undefined {
  if (typeof input !== 'number' || !Number.isFinite(input)) return undefined;
  return Math.min(1, Math.max(0, input));
}

/** Mirrors {@link generateComposition} duo options, plus overrides for the fragment run. */
export function duoRunGoldenPathOptionsFromGenerateRequest(
  req: GenerateRequest,
  overrides: Partial<RunGoldenPathOptions>
): RunGoldenPathOptions {
  const duo = isGuitarBassDuoFamily(req.presetId);
  const chordText =
    duo && typeof req.chordProgressionText === 'string' ? req.chordProgressionText : undefined;
  const importLeadSheetXml =
    typeof req.songModeLeadSheetMusicXml === 'string' ? req.songModeLeadSheetMusicXml.trim() : '';
  const totalBarsForAnchors = req.totalBars ?? (req.presetId === 'ecm_chamber' ? 32 : 8);
  const importExpressionEnabled = isImportExpressionPilotPreset(req.presetId) && importLeadSheetXml.length > 0;
  const adaptedImport =
    importExpressionEnabled
      ? extractLeadSheetMelodyAnchorsFromMusicXml(importLeadSheetXml, totalBarsForAnchors, {
          leadSheetPerformanceBlend: req.leadSheetPerformanceBlend,
        })
      : undefined;
  const importedAnchors = adaptedImport?.ok ? adaptedImport.melodyAnchors : undefined;
  const normalizedImportHarmonyMode = normalizeImportHarmonyMode(req.importHarmonyMode);
  const harmonyBlendRaw = normalizeHarmonyBlendRaw(req.harmonyBlend);

  const base: RunGoldenPathOptions = {
    styleStack: mapAppStyleStackToEngine(req.styleStack),
    presetId: req.presetId,
    scoreTitle: req.title,
    harmonyMode: duo ? req.harmonyMode : undefined,
    chordProgressionText: chordText,
    ecmMode: req.presetId === 'ecm_chamber' ? req.ecmMode ?? 'ECM_METHENY_QUARTET' : undefined,
    totalBars: req.totalBars,
    longFormEnabled: req.longFormEnabled,
    keySignatureMode: req.keySignatureMode,
    tonalCenterOverride: req.tonalCenterOverride,
    tonalCenter: req.tonalCenter,
    variationEnabled: req.variationEnabled === true ? true : undefined,
    creativeControlLevel: req.creativeControlLevel,
    intent: req.intent,
    c4Strength: req.c4Strength,
    songModeJamesBrownFunkOverlay: req.songModeJamesBrownFunkOverlay === true ? true : undefined,
    blendStrength: req.blendStrength ?? 'medium',
    ...(req.chromaticStrength === 'off' ||
    req.chromaticStrength === 'subtle' ||
    req.chromaticStrength === 'prominent'
      ? { chromaticStrength: req.chromaticStrength }
      : {}),
    songModeLeadSheetMelodyAnchors: importedAnchors,
    leadSheetPerformanceBlend: req.leadSheetPerformanceBlend,
    importHarmonyMode: normalizedImportHarmonyMode,
    harmonyBlend: harmonyBlendRaw,
    ...(req.formId ? { formId: req.formId as FormId } : {}),
    ...(req.barMeterMap ? { barMeterMap: req.barMeterMap } : {}),
    zappaSoloMidiLow: req.zappaSoloMidiLow,
    zappaSoloMidiHigh: req.zappaSoloMidiHigh,
    zappaSoloDensity: req.zappaSoloDensity,
    zappaSoloDissonance: req.zappaSoloDissonance,
    ...(typeof req.primarySongwriterStyle === 'string' &&
    req.primarySongwriterStyle.trim().toLowerCase() === 'frank_zappa'
      ? {
          primarySongwriterStyle: req.primarySongwriterStyle.trim(),
          songModeHookFirstIdentity: true,
          styleProfile: req.styleProfile ?? 'STYLE_ECM',
          ...(typeof req.secondarySongwriterStyle === 'string' && req.secondarySongwriterStyle.trim() !== ''
            ? { secondarySongwriterStyle: req.secondarySongwriterStyle.trim() }
            : {}),
        }
      : {}),
    ...(typeof req.stochasticVariance === 'number' ? { stochasticVariance: req.stochasticVariance } : {}),
    ...(typeof req.stochasticRenderOrdinal === 'number'
      ? { stochasticRenderOrdinal: req.stochasticRenderOrdinal }
      : {}),
    ...(req.presetId === 'guitar_bass_duo'
      ? { duoVaultMotifEnabled: req.duoVaultMotifEnabled !== false }
      : {}),
    ...overrides,
  };
  return base;
}

export function runDuoSectionRegeneration(
  req: GenerateRequest,
  effectiveSeed: number,
  totalBars: number
): { ok: true; result: GoldenPathResult } | { ok: false; error: string } {
  const sr = req.sectionRegeneration;
  if (!sr || !sr.baseMusicXml?.trim()) {
    return { ok: false, error: 'sectionRegeneration.baseMusicXml is required' };
  }
  if (!isGuitarBassDuoFamily(req.presetId)) {
    return { ok: false, error: 'section regeneration supports guitar_bass_duo presets and ecm_chamber only' };
  }

  const chordText = typeof req.chordProgressionText === 'string' ? req.chordProgressionText.trim() : '';
  if (!chordText) {
    return { ok: false, error: 'chordProgressionText required for section regeneration (custom harmony)' };
  }

  const parsed = parseChordProgressionInputWithBarCount(chordText, totalBars);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const fullBars = parsed.bars;

  const vr = validateSectionRegenerationBarRange({
    spec: { startBar: sr.startBar, endBar: sr.endBar },
    totalBars,
    fullChordBarCount: fullBars.length,
    locks: req.locks,
    formId: req.formId as FormId | undefined,
  });
  if (!vr.ok) {
    return { ok: false, error: vr.error };
  }

  const sb = Math.floor(sr.startBar);
  const eb = Math.floor(sr.endBar);
  const sliceBars = fullBars.slice(sb - 1, eb);
  const span = sliceBars.length;
  if (span !== eb - sb + 1) {
    return { ok: false, error: 'internal slice length mismatch' };
  }

  const fragMeterMap = fragmentBarMeterMapFromFull(req.barMeterMap, sb, span);
  const fragmentOpts = duoRunGoldenPathOptionsFromGenerateRequest(req, {
    totalBars: span,
    harmonyMode: 'custom_locked',
    chordProgressionText: sliceBars.join('|'),
    lockedHarmonyBarsRaw: sliceBars,
    parsedChordBars: sliceBars,
    ...(fragMeterMap ? { barMeterMap: fragMeterMap } : {}),
  });

  const frag = runGoldenPath(effectiveSeed, fragmentOpts);
  if (!frag.success || !frag.xml) {
    return { ok: false, error: frag.errors?.[0] ?? 'fragment generation failed' };
  }

  const merged = splicePartwiseMusicXmlMeasures(sr.baseMusicXml.trim(), frag.xml, sb, eb);
  if (!merged.ok) {
    return { ok: false, error: merged.errors.join('; ') };
  }

  frag.xml = merged.xml;
  patchSectionRegenContextMetadata(frag, fullBars, totalBars, sb, eb, span, req.barMeterMap);

  return { ok: true, result: frag };
}

/**
 * Song Mode — same splice pipeline as {@link runDuoSectionRegeneration} using resolved locked harmony bars.
 */
export function runSongModeSectionRegeneration(
  req: GenerateRequest,
  effectiveSeed: number,
  totalBars: number,
  lockedHarmonyBarsAuthoritative: string[],
  baseOptions: RunGoldenPathOptions
): { ok: true; result: GoldenPathResult } | { ok: false; error: string } {
  const sr = req.sectionRegeneration;
  if (!sr?.baseMusicXml?.trim()) {
    return { ok: false, error: 'sectionRegeneration.baseMusicXml is required' };
  }

  const vr = validateSectionRegenerationBarRange({
    spec: { startBar: sr.startBar, endBar: sr.endBar },
    totalBars,
    fullChordBarCount: lockedHarmonyBarsAuthoritative.length,
    locks: req.locks,
    formId: req.formId as FormId | undefined,
  });
  if (!vr.ok) {
    return { ok: false, error: vr.error };
  }

  const sb = Math.floor(sr.startBar);
  const eb = Math.floor(sr.endBar);
  const sliceBars = lockedHarmonyBarsAuthoritative.slice(sb - 1, eb);
  const span = sliceBars.length;
  if (span !== eb - sb + 1) {
    return { ok: false, error: 'internal slice length mismatch' };
  }

  const fullMeter = baseOptions.barMeterMap;
  const fragMeterMap = fragmentBarMeterMapFromFull(fullMeter, sb, span);

  const fragmentOpts: RunGoldenPathOptions = {
    ...baseOptions,
    totalBars: span,
    harmonyMode: 'custom_locked',
    chordProgressionText: sliceBars.join('|'),
    lockedHarmonyBarsRaw: sliceBars,
    parsedChordBars: sliceBars,
    ...(fragMeterMap ? { barMeterMap: fragMeterMap } : {}),
  };

  const frag = runGoldenPath(effectiveSeed, fragmentOpts);
  if (!frag.success || !frag.xml) {
    return { ok: false, error: frag.errors?.[0] ?? 'fragment generation failed' };
  }

  const merged = splicePartwiseMusicXmlMeasures(sr.baseMusicXml.trim(), frag.xml, sb, eb);
  if (!merged.ok) {
    return { ok: false, error: merged.errors.join('; ') };
  }

  frag.xml = merged.xml;
  patchSectionRegenContextMetadata(
    frag,
    lockedHarmonyBarsAuthoritative,
    totalBars,
    sb,
    eb,
    span,
    fullMeter
  );

  return { ok: true, result: frag };
}
