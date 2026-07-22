/**
 * Riff Generator — app entry: file naming, MusicXML under the Composer OS library Riffs folder, manifest.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GenerateRequest } from './appApiTypes';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { writeOutputManifest } from './writeOutputManifest';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import {
  RIFF_GUITAR_PART_INSTRUMENT_TAG,
  RIFF_INSTRUMENT_MIDI_PROGRAM,
  RIFF_SOLO_PART_INSTRUMENT_TAG,
  riffPartInstrumentTagsFromScore,
} from '../core/riff-generator/riffMultiVoiceTypes';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { GenerateResult } from './generateComposition';
import type { OddMeterPolicyStyle } from '../core/rhythm/oddMeterEngine';
import {
  RIFF_BAR_STEP_VALUES,
  type RiffBarCount,
  type RiffDensity,
  type RiffGridMode,
  type RiffLineMode,
  type RiffStyleId,
} from '../core/riff-generator/riffTypes';
import { riffStyleIdForFamily } from '../core/riff-generator/resolveRiffGeneratorProfile';
import { getVoiceRuleBundle, normalizeHarmonicVoiceId } from '../core/composer/voiceRuleBundles';
import { resolveEffectiveGenerationSeed } from '../core/creative-controls/creativeControlResolver';
import { compactRiffQualityForManifest } from '../core/riff-generator/riffQualityRules';
import { zappaRiffSoloControlsFrom } from '../core/riff-generator/zappaRiffSoloParams';

function parseRiffBars(req: GenerateRequest): RiffBarCount {
  const n = req.totalBars ?? 2;
  if ((RIFF_BAR_STEP_VALUES as readonly number[]).includes(n)) return n as RiffBarCount;
  return 2;
}

/**
 * Sole riff-pattern authority on `riff_generator`.
 * Reads `riffVrbId` only — `harmonicVoice` is never consulted (Phase A honesty).
 */
function parseRiffVrbId(req: GenerateRequest): string | undefined {
  const id = req.riffVrbId?.trim();
  if (!id) return undefined;
  const b = getVoiceRuleBundle(id);
  return b.riffProfile ? b.voiceId : undefined;
}

/**
 * Phase B Iter 1 — read-only HV chord-colour value when toggle is on.
 * Inert when `riffUseHvForPattern` is off (default). Never feeds `parseRiffVrbId`.
 * Colour application is Iter 2 — this only exposes the normalized id to the engine.
 */
export function resolveRiffHvChordColourReadOnly(req: GenerateRequest): string | undefined {
  if (req.riffUseHvForPattern !== true) return undefined;
  const raw = req.harmonicVoice?.trim();
  if (!raw) return undefined;
  const id = normalizeHarmonicVoiceId(raw);
  return id || undefined;
}

function parseRiffOddMeterPreset(req: GenerateRequest): OddMeterPolicyStyle | undefined {
  const p = req.riffOddMeterPreset;
  if (
    p === 'meter5' ||
    p === 'meter7' ||
    p === 'meter9' ||
    p === 'meter10' ||
    p === 'mahavishnu' ||
    p === 'fripp' ||
    p === 'weatherReport'
  ) {
    return p;
  }
  return undefined;
}

function parseRiffStyle(req: GenerateRequest): RiffStyleId {
  const s = req.riffStyle;
  if (s === 'metheny' || s === 'scofield' || s === 'funk' || s === 'neutral') return s;
  return 'neutral';
}

function parseRiffDensity(req: GenerateRequest): RiffDensity {
  const d = req.riffDensity;
  if (d === 'sparse' || d === 'medium' || d === 'dense') return d;
  return 'medium';
}

function parseRiffGrid(req: GenerateRequest): RiffGridMode {
  return req.riffGrid === 'sixteenth' ? 'sixteenth' : 'eighth';
}

function parseRiffLineMode(req: GenerateRequest): RiffLineMode {
  const m = req.riffLineMode;
  if (m === 'guitar_bass' || m === 'octave_double') return m;
  return 'single_line';
}

/** App-layer solo flag — Zappa VRB always on regardless of request. */
export function resolveRiffAppSoloEnabled(vrbId: string | undefined, riffSolo?: boolean): boolean {
  return vrbId === 'frank_zappa' ? true : riffSolo === true;
}

/** Riff export: `guitar` → clean electric; `solo` → overdriven (Zappa solo lane). */
export function confirmRiffPartInstrumentAssignment(score: ScoreModel): {
  ok: boolean;
  guitarPartId: string;
  soloPartId: string | null;
  guitarTag: typeof RIFF_GUITAR_PART_INSTRUMENT_TAG;
  soloTag: typeof RIFF_SOLO_PART_INSTRUMENT_TAG | null;
} {
  const tags = riffPartInstrumentTagsFromScore(score);
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const solo = score.parts.find((p) => p.id === 'solo');
  const guitarOk =
    !!guitar &&
    guitar.instrumentIdentity === 'clean_electric_guitar' &&
    guitar.midiProgram === RIFF_INSTRUMENT_MIDI_PROGRAM.cleanGuitar;
  const soloOk =
    !solo ||
    (solo.id === 'solo' &&
      solo.instrumentIdentity === 'electric_guitar_solo' &&
      solo.midiProgram === RIFF_INSTRUMENT_MIDI_PROGRAM.overdrivenGuitar);
  return {
    ok: !!tags && guitarOk && soloOk,
    guitarPartId: guitar?.id ?? 'guitar',
    soloPartId: solo?.id ?? null,
    guitarTag: RIFF_GUITAR_PART_INSTRUMENT_TAG,
    soloTag: solo ? RIFF_SOLO_PART_INSTRUMENT_TAG : null,
  };
}

/** Filename slug — avoid implying duo GCE or embedding a faux “quality” brand in the path. */
function riffFilenameSlug(title: string): string {
  const t = title.trim() || 'Riff';
  const slug = t.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
  return slug || 'Riff';
}

function riffManifestValidation(
  composite: number,
  gatePassed: boolean,
  riffStructuralPass?: boolean
): import('./appApiTypes').ValidationSummary {
  return {
    scoreIntegrity: true,
    exportIntegrity: true,
    /** Duo / ECM behaviour gates do not run for riff preset. */
    behaviourGates: false,
    mxValid: true,
    strictBarMath: true,
    exportRoundTrip: false,
    instrumentMetadata: true,
    sibeliusSafe: true,
    readinessRelease: 0,
    readinessMx: 1,
    shareable: false,
    errors: [],
    warnings: (() => {
      const base =
        gatePassed
          ? [
              `Riff preset: riffCompositeScore ${composite.toFixed(
                1
              )} is an internal 0–10 composite only (scoreRiffGce); not the duo/Song Mode GCE. Duo behaviour gates were not run.`,
            ]
          : [`Riff preset: internal riff gate not met (composite ${composite.toFixed(1)}).`];
      if (riffStructuralPass === false) {
        base.push(
          'Riff structural supplement (riffQualityRules): one or more objective checks failed — see manifest riffQualityRules; not a general GCE failure.'
        );
      }
      return base;
    })(),
  };
}

export function runRiffGeneratorApp(req: GenerateRequest, presetOutputDir: string): GenerateResult {
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const bars = parseRiffBars(req);
  const vrbId = parseRiffVrbId(req);
  const hvChordColourReadOnly = resolveRiffHvChordColourReadOnly(req);
  const bundle = vrbId ? getVoiceRuleBundle(vrbId) : undefined;
  const style =
    bundle?.family && typeof bundle.family === 'string'
      ? riffStyleIdForFamily(bundle.family)
      : parseRiffStyle(req);
  const density = parseRiffDensity(req);
  const oddMeterPreset = parseRiffOddMeterPreset(req);
  const grid = parseRiffGrid(req);
  let lineMode = parseRiffLineMode(req);
  const bassOn = req.riffBass === true;
  if (bassOn && lineMode === 'single_line') {
    lineMode = 'guitar_bass';
  }
  if (lineMode === 'octave_double' && bassOn) {
    /** Octave mode is guitar-only; bass ignored. */
  }
  const bpm = req.bpm && req.bpm > 0 ? req.bpm : 100;
  const title = req.title?.trim() || 'Riff';
  const chordText =
    req.chordProgression?.length && req.chordProgression.join('|').trim()
      ? req.chordProgression.join(' | ')
      : req.chordProgressionText;

  const riffOp = req.riffOp === 'regenerate' || req.riffOp === 'mutate' ? req.riffOp : undefined;
  const soloEnabled = resolveRiffAppSoloEnabled(vrbId, req.riffSolo);
  const zappaControls = zappaRiffSoloControlsFrom(req);
  const gen = runRiffGenerator(effectiveSeed, {
    bars,
    density,
    style,
    grid,
    lineMode,
    bassEnabled: bassOn && lineMode === 'guitar_bass',
    soloEnabled,
    bpm,
    title,
    chordProgressionText: chordText,
    vrbId,
    ...(hvChordColourReadOnly ? { hvChordColourReadOnly } : {}),
    oddMeterPreset,
    riffOp: riffOp ?? 'full',
    barLocks: req.riffBarLocks,
    carryForward: req.riffCarryForward,
    ...zappaControls,
    ...(req.riffPhraseMotifSeed === true ? { phraseMotifSeed: true } : {}),
  });

  if (!gen.success) {
    return {
      success: false,
      error: gen.error,
      composerOsVersion: COMPOSER_OS_VERSION,
      validation: {
        integrityPassed: false,
        behaviourGatesPassed: false,
        mxValidationPassed: false,
        strictBarMathPassed: false,
        exportRoundTripPassed: false,
        exportIntegrityPassed: false,
        instrumentMetadataPassed: false,
        sibeliusSafe: false,
        readiness: { shareable: false, release: 0, mx: 0 },
        errors: [gen.error],
      },
      harmonicVoiceIgnoredOnRiffPreset: true,
      ...(hvChordColourReadOnly ? { riffHvChordColourReadOnly: hvChordColourReadOnly } : {}),
      runManifest: {
        seed: effectiveSeed,
        presetId: 'riff_generator',
        activeModules: ['riff_generator'],
        timestamp: new Date().toISOString(),
        scoreTitle: title,
        variationId: req.variationId,
        creativeControlLevel: req.creativeControlLevel,
        harmonicVoiceIgnoredOnRiffPreset: true,
        ...(hvChordColourReadOnly ? { riffHvChordColourReadOnly: hvChordColourReadOnly } : {}),
      },
    };
  }

  if (!gen.xml) {
    return {
      success: false,
      error: 'Riff generation produced no MusicXML',
      composerOsVersion: COMPOSER_OS_VERSION,
      validation: {
        integrityPassed: false,
        behaviourGatesPassed: false,
        mxValidationPassed: false,
        strictBarMathPassed: false,
        exportRoundTripPassed: false,
        exportIntegrityPassed: false,
        instrumentMetadataPassed: false,
        sibeliusSafe: false,
        readiness: { shareable: false, release: 0, mx: 0 },
        errors: ['Riff generation produced no MusicXML'],
      },
      harmonicVoiceIgnoredOnRiffPreset: true,
      ...(hvChordColourReadOnly ? { riffHvChordColourReadOnly: hvChordColourReadOnly } : {}),
      runManifest: {
        seed: effectiveSeed,
        presetId: 'riff_generator',
        activeModules: ['riff_generator'],
        timestamp: new Date().toISOString(),
        scoreTitle: title,
        variationId: req.variationId,
        creativeControlLevel: req.creativeControlLevel,
        harmonicVoiceIgnoredOnRiffPreset: true,
        ...(hvChordColourReadOnly ? { riffHvChordColourReadOnly: hvChordColourReadOnly } : {}),
      },
    };
  }

  const riffDir = presetOutputDir;
  fs.mkdirSync(riffDir, { recursive: true });
  const slug = riffFilenameSlug(title);
  const filename = `V1-Riff-${slug}-seed${effectiveSeed}-${vrbId ?? style}-${bars}b.musicxml`;
  const filepath = path.join(riffDir, filename);
  fs.writeFileSync(filepath, gen.xml, 'utf-8');

  const ts = new Date().toISOString();
  const rqCompact = compactRiffQualityForManifest(gen.riffQuality);
  const instrumentConfirm = confirmRiffPartInstrumentAssignment(gen.score);
  const manifestValidation = riffManifestValidation(gen.gce, true, gen.riffQuality.aggregatePass);
  const manifestPayload: Parameters<typeof writeOutputManifest>[1] = {
    presetId: 'riff_generator',
    styleStack: ['riff_generator'],
    seed: effectiveSeed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
    timestamp: ts,
    scoreTitle: title,
    riffCompositeScore: gen.gce,
    riffInternalGatePassed: true,
    harmonicVoiceIgnoredOnRiffPreset: true,
    ...(hvChordColourReadOnly ? { riffHvChordColourReadOnly: hvChordColourReadOnly } : {}),
    riffQualityRules: rqCompact,
    validation: manifestValidation,
  };
  if (instrumentConfirm.ok) {
    (manifestPayload as { riffPartInstruments?: { guitar: string; solo?: string } }).riffPartInstruments = {
      guitar: instrumentConfirm.guitarTag,
      ...(instrumentConfirm.soloTag ? { solo: instrumentConfirm.soloTag } : {}),
    };
  }
  writeOutputManifest(filepath, manifestPayload);

  const chordLoopDisclosure = gen.chordLoopDisclosure;
  const disclosureWarnings: string[] = [];
  if (chordLoopDisclosure) {
    const n = chordLoopDisclosure.substitutions.length;
    const m = chordLoopDisclosure.unsupported.length;
    if (n > 0 || m > 0) {
      disclosureWarnings.push(
        `Riff chord loop: generated with ${n} reviewed substitution(s) / ${m} unsupported token(s) — see chordLoopDisclosure.`
      );
    }
  }

  return {
    success: true,
    composerOsVersion: COMPOSER_OS_VERSION,
    xml: gen.xml,
    riffCarryForward: gen.riffCarryForward,
    riffMusicality: gen.riffMusicality,
    musicContext: gen.musicContext,
    ...(chordLoopDisclosure ? { chordLoopDisclosure } : {}),
    filename,
    filepath,
    scoreTitle: title,
    harmonicVoiceIgnoredOnRiffPreset: true,
    ...(hvChordColourReadOnly ? { riffHvChordColourReadOnly: hvChordColourReadOnly } : {}),
    validation: {
      integrityPassed: true,
      behaviourGatesPassed: false,
      mxValidationPassed: true,
      strictBarMathPassed: true,
      exportRoundTripPassed: false,
      exportIntegrityPassed: true,
      instrumentMetadataPassed: true,
      sibeliusSafe: true,
      readiness: { shareable: false, release: 0, mx: 1 },
      errors: [],
      warnings: [...(manifestValidation.warnings ?? []), ...disclosureWarnings],
    },
    runManifest: {
      seed: effectiveSeed,
      presetId: 'riff_generator',
      activeModules: ['riff_generator'],
      timestamp: ts,
      scoreTitle: title,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      harmonicVoiceIgnoredOnRiffPreset: true,
      ...(hvChordColourReadOnly ? { riffHvChordColourReadOnly: hvChordColourReadOnly } : {}),
    },
    requestEcho: {
      tonalCenter: req.tonalCenter,
      bpm,
      totalBars: bars,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
    },
  };
}
