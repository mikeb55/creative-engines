/**
 * Riff Generator Commit 10 — family tags, profile resolution, odd-meter gating, blend, boundary ramp.
 */

import { buildRiffBoundaryRamp, riffBoundarySwingRampKindForFamily } from '../core/riff-generator/riffBoundarySwingRamp';
import {
  resolveRiffGeneratorProfile,
  resolveRiffGeneratorProfileWithMeta,
  riffStyleIdForFamily,
} from '../core/riff-generator/resolveRiffGeneratorProfile';
import { blendRiffGeneratorVrbs } from '../core/riff-generator/riffVrbBlend';
import {
  RIFF_GENERATOR_VRB_IDS,
  RIFF_VRB_EXPECTED_FAMILY,
  isNeutralRiffGeneratorFallback,
  resolveRiffFamilyTag,
  riffProfileIsComplete,
} from '../core/riff-generator/riffVrbRegistry';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { LINE_FIRST_DUO_ENGINE_VRB_ID_SET } from '../core/goldenPath/lineFirstDuoEngineVrbIds';
import { SONGWRITER_RULE_REGISTRY, riffVrbSigmaCeiling, riffVrbSigmaCeilingUnchanged } from '../core/song-mode/songwriterRuleRegistry';
import {
  SONGWRITER_STYLE_PROFILES,
  normalizeSongwriterStyleKey,
} from '../core/song-mode/songwriterStyleProfiles';
import { RIFF_VRB_SIGMA_CEILINGS } from '../core/riff-generator/riffVrbRegistry';
import { runRiffGeneratorApp } from '../app-api/riffGeneratorApp';
import {
  previewRiffChordLoopTokens,
  replaceRiffChordLoopTokenAt,
  riffChordLoopGenerateBlocked,
  riffChordTokenAckKey,
} from '../core/riff-generator/riffChordLoop';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Phase E integration checklist gaps for a VRB (historically Jamerson).
 * Empty when all RIFF_GENERATOR_VRB_IDS pass Song Mode profile + line-first wiring.
 */
const RIFF_PHASE_E_WIP_EXCLUDED: readonly string[] = [];

function testRiffGeneratorFamilyTagResolution(): boolean {
  for (const id of RIFF_GENERATOR_VRB_IDS) {
    const expected = RIFF_VRB_EXPECTED_FAMILY[id];
    const bundle = getVoiceRuleBundle(id);
    if (bundle.family !== expected) return false;
    if (resolveRiffFamilyTag(id) !== expected) return false;
  }
  if (getVoiceRuleBundle('jimmy_page').voiceId !== 'led_zeppelin') return false;
  if (resolveRiffFamilyTag('zeppelin') !== 'rock') return false;
  return true;
}

function testRiffGeneratorProfileCompleteness(): boolean {
  for (const id of RIFF_GENERATOR_VRB_IDS) {
    const family = RIFF_VRB_EXPECTED_FAMILY[id];
    const meta = resolveRiffGeneratorProfileWithMeta({
      vrbId: id,
      style: riffStyleIdForFamily(family),
      grid: 'eighth',
      density: 'medium',
    });
    if (meta.source !== 'vrb') return false;
    if (!riffProfileIsComplete(meta.profile)) return false;
    if (isNeutralRiffGeneratorFallback(meta.profile)) return false;
  }
  const unknown = resolveRiffGeneratorProfileWithMeta({
    vrbId: 'unknown_riff_vrb_xyz',
    style: 'neutral',
    grid: 'eighth',
    density: 'medium',
  });
  return unknown.source === 'neutral_fallback' && isNeutralRiffGeneratorFallback(unknown.profile);
}

function testOddMeterOverlayGating(): boolean {
  const nileNoMeter = resolveRiffGeneratorProfileWithMeta({
    vrbId: 'nile_rodgers',
    style: 'funk',
    grid: 'eighth',
    density: 'medium',
  });
  const nileWithMeter = resolveRiffGeneratorProfileWithMeta({
    vrbId: 'nile_rodgers',
    style: 'funk',
    grid: 'eighth',
    density: 'medium',
    oddMeterPreset: 'meter7',
  });
  if (nileWithMeter.oddMeterOverlayApplied) return false;
  if (nileWithMeter.profile.silencePolicy.oddMeterPreset) return false;
  if (nileNoMeter.profile.meterPolicy !== nileWithMeter.profile.meterPolicy) return false;

  const fusionWith = resolveRiffGeneratorProfileWithMeta({
    vrbId: 'weather_report',
    style: 'metheny',
    grid: 'sixteenth',
    density: 'medium',
    oddMeterPreset: 'weatherReport',
  });
  if (!fusionWith.oddMeterOverlayApplied) return false;
  if (fusionWith.profile.silencePolicy.oddMeterPreset !== 'weatherReport') return false;

  const iommiWith = resolveRiffGeneratorProfile({
    vrbId: 'iommi',
    style: 'neutral',
    grid: 'eighth',
    density: 'medium',
    oddMeterPreset: 'fripp',
  });
  return iommiWith.silencePolicy.oddMeterPreset === undefined;
}

function testRiffBoundarySwingRampByFamily(): boolean {
  if (riffBoundarySwingRampKindForFamily('funk') !== 'straight_shuffle') return false;
  if (riffBoundarySwingRampKindForFamily('rock') !== 'straight_shuffle') return false;
  if (riffBoundarySwingRampKindForFamily('fusion') !== 'odd_meter') return false;
  if (riffBoundarySwingRampKindForFamily('art_rock') !== 'odd_meter') return false;
  const same = buildRiffBoundaryRamp('nile_rodgers', 'sly_stone', 2, 1);
  const cross = buildRiffBoundaryRamp('nile_rodgers', 'iommi', 2, 1);
  return same.length === 2 && same[0]!.rampKind === 'straight_shuffle' && cross.length === 0;
}

function testRiffVrbBlendSameFamily(): boolean {
  const r = blendRiffGeneratorVrbs(
    [
      { vrbId: 'nile_rodgers', weight: 1 },
      { vrbId: 'sly_stone', weight: 1 },
    ],
    { style: 'funk', grid: 'eighth', density: 'medium' }
  );
  return !r.warning && r.blendedVrbIds.length === 2 && r.usedVrbId.startsWith('blended:');
}

function testRiffVrbBlendCrossFamilyWarn(): boolean {
  const r = blendRiffGeneratorVrbs(
    [
      { vrbId: 'nile_rodgers', weight: 0.6 },
      { vrbId: 'iommi', weight: 0.4 },
    ],
    { style: 'funk', grid: 'eighth', density: 'medium' }
  );
  return (
    r.warning?.code === 'cross_family' &&
    r.usedVrbId === 'nile_rodgers' &&
    r.blendedVrbIds.length === 1
  );
}

function testRiffVrbSongModeIntegration(): boolean {
  for (const id of RIFF_GENERATOR_VRB_IDS) {
    if ((RIFF_PHASE_E_WIP_EXCLUDED as readonly string[]).includes(id)) continue;
    const pk = normalizeSongwriterStyleKey(id);
    if (pk !== id) return false;
    if (!SONGWRITER_STYLE_PROFILES[pk]) return false;
    const rules = (SONGWRITER_RULE_REGISTRY.songwriterRules as Record<string, unknown>)[id];
    if (!rules || !Array.isArray(rules) || rules.length < 1) return false;
    if (!LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has(id)) return false;
    const expected = RIFF_VRB_SIGMA_CEILINGS[id];
    if (expected != null && riffVrbSigmaCeiling(id) !== expected) return false;
  }
  return riffVrbSigmaCeilingUnchanged();
}

function testRiffPhaseAHarmonicVoiceHonestyReceipt(): boolean {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-riff-phase-a-'));
  try {
    const r = runRiffGeneratorApp(
      {
        presetId: 'riff_generator',
        styleStack: {
          primary: 'barry_harris',
          styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
        },
        seed: 88042,
        title: 'PhaseAHonesty',
        totalBars: 2,
        // Deliberate mismatch: HV would mislead if it drove pattern.
        harmonicVoice: 'jamerson',
        riffVrbId: 'nile_rodgers',
        riffStyle: 'funk',
        riffDensity: 'medium',
        riffGrid: 'eighth',
        riffLineMode: 'single_line',
        riffBass: false,
        bpm: 100,
      },
      tmp
    );
    if (!r.success) return false;
    if (r.harmonicVoiceIgnoredOnRiffPreset !== true) return false;
    if (r.runManifest?.harmonicVoiceIgnoredOnRiffPreset !== true) return false;
    // Toggle OFF (default): read-only HV path stays inert.
    if (r.riffHvChordColourReadOnly != null) return false;
    if (r.runManifest?.riffHvChordColourReadOnly != null) return false;
    // Pattern authority = riffVrbId (nile), not jamerson HV.
    if (!r.filename?.includes('nile_rodgers')) return false;
    if (r.filename.includes('jamerson')) return false;
    const offXml = r.xml;

    // Phase B Iter 1/2 — jamerson has no mosaic dispatch entry → colour identity; pattern still riffVrbId.
    const on = runRiffGeneratorApp(
      {
        presetId: 'riff_generator',
        styleStack: {
          primary: 'barry_harris',
          styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
        },
        seed: 88042,
        title: 'PhaseAHonesty',
        totalBars: 2,
        riffUseHvForPattern: true,
        harmonicVoice: 'jamerson',
        riffVrbId: 'nile_rodgers',
        riffStyle: 'funk',
        riffDensity: 'medium',
        riffGrid: 'eighth',
        riffLineMode: 'single_line',
        riffBass: false,
        bpm: 100,
      },
      tmp
    );
    if (!on.success) return false;
    if (on.harmonicVoiceIgnoredOnRiffPreset !== true) return false;
    if (on.riffHvChordColourReadOnly !== 'jamerson') return false;
    if (on.runManifest?.riffHvChordColourReadOnly !== 'jamerson') return false;
    if (!on.filename?.includes('nile_rodgers')) return false;
    if (on.filename.includes('jamerson')) return false;
    // No-dispatch HV: MusicXML still matches OFF (colour path identity).
    if (on.xml !== offXml) return false;

    // Phase B Iter 2 — dispatchable HV (bill_evans) must colour chords (XML differs; pattern still nile).
    const offEvans = runRiffGeneratorApp(
      {
        presetId: 'riff_generator',
        styleStack: {
          primary: 'barry_harris',
          styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
        },
        seed: 88044,
        title: 'PhaseBIter2',
        totalBars: 2,
        chordProgressionText: 'Cmaj7 | Dm7',
        riffVrbId: 'nile_rodgers',
        riffStyle: 'funk',
        riffDensity: 'medium',
        riffGrid: 'eighth',
        riffLineMode: 'single_line',
        riffBass: false,
        bpm: 100,
      },
      tmp
    );
    const onEvans = runRiffGeneratorApp(
      {
        presetId: 'riff_generator',
        styleStack: {
          primary: 'barry_harris',
          styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
        },
        seed: 88044,
        title: 'PhaseBIter2',
        totalBars: 2,
        chordProgressionText: 'Cmaj7 | Dm7',
        riffUseHvForPattern: true,
        harmonicVoice: 'bill_evans',
        riffVrbId: 'nile_rodgers',
        riffStyle: 'funk',
        riffDensity: 'medium',
        riffGrid: 'eighth',
        riffLineMode: 'single_line',
        riffBass: false,
        bpm: 100,
      },
      tmp
    );
    if (!offEvans.success || !onEvans.success) return false;
    if (onEvans.riffHvChordColourReadOnly !== 'bill_evans') return false;
    if (!onEvans.filename?.includes('nile_rodgers')) return false;
    if (onEvans.filename.includes('bill_evans')) return false;
    if (onEvans.xml === offEvans.xml) return false;
    return true;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function testRiffChordLoopPhase3Gating(): boolean {
  const empty = previewRiffChordLoopTokens('');
  if (empty.length !== 0 || riffChordLoopGenerateBlocked(empty, new Set())) return false;

  const valid = previewRiffChordLoopTokens('Am7 | Dm7 | G7 | Cmaj7');
  if (riffChordLoopGenerateBlocked(valid, new Set())) return false;

  const soft = previewRiffChordLoopTokens('Cmin7 | Dm7');
  if (!riffChordLoopGenerateBlocked(soft, new Set())) return false;
  const acks = new Set([
    riffChordTokenAckKey({ index: 0, token: 'Cmin7', usedSymbol: soft[0]!.usedSymbol }),
  ]);
  if (riffChordLoopGenerateBlocked(soft, acks)) return false;

  const hard = previewRiffChordLoopTokens('Cmaj7 | NOTACHORD | Dm7');
  if (!riffChordLoopGenerateBlocked(hard, new Set())) return false;
  const picked = replaceRiffChordLoopTokenAt('Cmaj7 | NOTACHORD | Dm7', 1, 'Am7');
  const after = previewRiffChordLoopTokens(picked);
  if (riffChordLoopGenerateBlocked(after, new Set())) return false;
  return true;
}

export function runRiffGeneratorIntegrationTests(): { name: string; ok: boolean }[] {
  return [
    ['RiffGenerator — family tag resolution (18 VRBs)', testRiffGeneratorFamilyTagResolution],
    ['RiffGenerator — profile completeness (no neutral fallback)', testRiffGeneratorProfileCompleteness],
    ['RiffGenerator — odd-meter overlay gating by family', testOddMeterOverlayGating],
    ['RiffGenerator — Phase 3 chord-loop ack gating', testRiffChordLoopPhase3Gating],
    ['RiffGenerator — boundary swing ramp by family', testRiffBoundarySwingRampByFamily],
    ['RiffGenerator — VRB blend same family', testRiffVrbBlendSameFamily],
    ['RiffGenerator — VRB blend cross-family warn', testRiffVrbBlendCrossFamilyWarn],
    ['RiffGenerator — Phase E song mode + duo integration (18 VRBs)', testRiffVrbSongModeIntegration],
    ['RiffGenerator — Phase A HV honesty receipt', testRiffPhaseAHarmonicVoiceHonestyReceipt],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
