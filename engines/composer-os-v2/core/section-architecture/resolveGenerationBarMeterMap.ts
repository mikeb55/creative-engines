/**
 * P6/P7 — Shared bar-meter resolution for API + golden path.
 *
 * Precedence (lowest → highest):
 * 1. SongDefaults.meter
 * 2. SectionPreset.meterMap
 * 3. Zappa GCE auto meter (mode-dependent)
 * 4. req.barMeterMap (always wins per bar)
 */

import type { FormMap } from '../compositionContext';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { sanitizeBarMeterMap } from '../rhythm/barMeterTypes';
import { buildZappaGceAutoBarMeterMap } from '../gce/applyZappaGceStructuralGeneration';
import {
  FRANK_ZAPPA_STRUCTURAL_FINGERPRINT,
  isFrankZappaSongwriterId,
  type ZappaGceMeterMode,
} from '../gce/frankZappaStructuralFingerprint';
import {
  mergeBarMeterMaps,
  resolveBarMeterMapFromSong,
} from './barMeterResolution';
import type { Song } from './sectionArchitectureTypes';

export type { ZappaGceMeterMode };

export interface ResolveGenerationBarMeterMapInput {
  totalBars: number;
  song?: Song;
  requestBarMeterMap?: BarMeterMap;
  /** When true, Zappa GCE may synthesize meter splice (requires `form` + `seed`). */
  zappaGceAutoBarMeterMapEnabled?: boolean;
  zappaGceMeterMode?: ZappaGceMeterMode;
  zappaStructuralActive?: boolean;
  form?: FormMap;
  seed?: number;
}

export interface ResolveGenerationBarMeterMapResult {
  barMeterMap: BarMeterMap | undefined;
  requestBarMeterMapPresent: boolean;
  sectionMeterApplied: boolean;
  zappaMeterApplied: boolean;
  zappaGceMeterMode: ZappaGceMeterMode;
}

export function resolveGenerationBarMeterMap(
  input: ResolveGenerationBarMeterMapInput
): ResolveGenerationBarMeterMapResult {
  const reqMeter = sanitizeBarMeterMap(input.requestBarMeterMap);
  const requestBarMeterMapPresent = !!reqMeter && Object.keys(reqMeter).length > 0;
  const mode =
    input.zappaGceMeterMode ?? FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.zappaGceMeterMode ?? 'disrupt';

  let sectionMap: BarMeterMap | undefined;
  if (input.song) {
    sectionMap = resolveBarMeterMapFromSong(input.song);
  }

  const sectionMeterApplied = !!sectionMap && Object.keys(sectionMap).length > 0;

  let working: BarMeterMap | undefined = sectionMap;

  const zappaEligible =
    input.zappaStructuralActive === true &&
    input.zappaGceAutoBarMeterMapEnabled === true &&
    !requestBarMeterMapPresent &&
    FRANK_ZAPPA_STRUCTURAL_FINGERPRINT.metricDisruption &&
    input.form?.sections?.length &&
    typeof input.seed === 'number';

  let zappaMeterApplied = false;

  if (zappaEligible && mode !== 'respect') {
    const zappaMap = buildZappaGceAutoBarMeterMap(input.form!, input.seed!);
    if (Object.keys(zappaMap).length > 0) {
      zappaMeterApplied = true;
      if (mode === 'own') {
        working = zappaMap;
      } else {
        working = mergeBarMeterMaps(working, zappaMap);
      }
    }
  }

  const finalMap = mergeBarMeterMaps(working, reqMeter);

  return {
    barMeterMap: finalMap,
    requestBarMeterMapPresent,
    sectionMeterApplied,
    zappaMeterApplied,
    zappaGceMeterMode: mode,
  };
}

/** Build minimal {@link FormMap} from a {@link Song} for Zappa GCE meter splice. */
export function formMapFromSong(song: Song): FormMap {
  return {
    totalBars: song.totalBars,
    sections: song.sections.map((s) => ({
      label: s.label,
      startBar: s.barRange.startBar,
      length: Math.max(1, s.barRange.endBar - s.barRange.startBar + 1),
    })),
  };
}

/** API-layer helper — resolves flat `barMeterMap` for ensemble + app generate requests. */
export function resolveBarMeterMapForGenerateRequest(req: {
  totalBars?: number;
  song?: Song;
  barMeterMap?: BarMeterMap;
  zappaGceAutoBarMeterMapEnabled?: boolean;
  zappaGceMeterMode?: ZappaGceMeterMode;
  primarySongwriterStyle?: string;
  songwriterStyleId?: string;
  zappaStyleMode?: 'compositional' | 'bluesrockFerocious';
  seed?: number;
}): BarMeterMap | undefined {
  const tb = Math.max(1, Math.floor(req.song?.totalBars ?? req.totalBars ?? 8));
  const sw = req.songwriterStyleId ?? req.primarySongwriterStyle;
  const zappaActive =
    isFrankZappaSongwriterId(sw) &&
    (req.zappaStyleMode === undefined || req.zappaStyleMode === 'compositional');
  return resolveGenerationBarMeterMap({
    totalBars: tb,
    song: req.song,
    requestBarMeterMap: req.barMeterMap,
    zappaGceAutoBarMeterMapEnabled: req.zappaGceAutoBarMeterMapEnabled,
    zappaGceMeterMode: req.zappaGceMeterMode,
    zappaStructuralActive: zappaActive,
    form: req.song ? formMapFromSong(req.song) : undefined,
    seed: req.seed,
  }).barMeterMap;
}
