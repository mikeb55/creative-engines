/**
 * Riff Generator UI catalog — family tags, VRB registry rows, bar/meter/density options.
 */

import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import {
  RIFF_VRB_EXPECTED_FAMILY,
  resolveRiffFamilyTag,
  type RiffGeneratorVrbId,
} from '../core/riff-generator/riffVrbRegistry';
import type { OddMeterPolicyStyle } from '../core/rhythm/oddMeterEngine';
import {
  RIFF_BAR_STEP_VALUES,
  type RiffBarCount,
  type RiffDensity,
} from '../core/riff-generator/riffTypes';

export type { RiffFamilyTag } from '../core/riff-generator/riffVrbRegistry';
import type { RiffFamilyTag } from '../core/riff-generator/riffVrbRegistry';

export const RIFF_FAMILY_OPTIONS: readonly { id: RiffFamilyTag; label: string }[] = [
  { id: 'funk', label: 'Funk' },
  { id: 'rock', label: 'Rock' },
  { id: 'fusion', label: 'Fusion' },
  { id: 'art_rock', label: 'Art rock' },
] as const;

export { RIFF_BAR_STEP_VALUES, type RiffBarCount } from '../core/riff-generator/riffTypes';

export const RIFF_BAR_COUNT_DEFAULT: RiffBarCount = 2;

export function isRiffBarCount(n: number): n is RiffBarCount {
  return (RIFF_BAR_STEP_VALUES as readonly number[]).includes(n);
}

export function clampRiffBarCount(n: number): RiffBarCount {
  if (isRiffBarCount(n)) return n;
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 4) return 4;
  if (n <= 8) return 8;
  if (n <= 16) return 16;
  return 32;
}

export const RIFF_ODD_METER_PRESETS: readonly {
  id: OddMeterPolicyStyle;
  label: string;
}[] = [
  { id: 'meter5', label: '5/4' },
  { id: 'meter7', label: '7/8' },
  { id: 'meter9', label: '9/8' },
  { id: 'meter10', label: '10/8' },
  { id: 'mahavishnu', label: 'Mahavishnu' },
  { id: 'fripp', label: 'Fripp / 5-4 phase' },
  { id: 'weatherReport', label: 'Weather Report' },
] as const;

export type RiffOddMeterPreset = OddMeterPolicyStyle;

export const RIFF_ODD_METER_NONE = '' as const;
export type RiffOddMeterSelectValue = RiffOddMeterPreset | typeof RIFF_ODD_METER_NONE;

export function riffFamilyShowsMeterPicker(family: RiffFamilyTag): boolean {
  return family === 'fusion' || family === 'art_rock';
}

export type RiffVrbOption = {
  vrbId: string;
  /** Primary display label (canonical voice id title). */
  label: string;
  family: RiffFamilyTag;
  sigma?: number;
};

/** Riff VRBs with `riffProfile` on the voiceRuleBundles registry (canonical ids only). */
const RIFF_VRB_CATALOG: readonly Omit<RiffVrbOption, 'sigma'>[] = [
  { vrbId: 'james_brown', label: 'James Brown', family: 'funk' },
  { vrbId: 'nile_rodgers', label: 'Nile Rodgers', family: 'funk' },
  { vrbId: 'larry_carlton', label: 'Larry Carlton', family: 'funk' },
  { vrbId: 'sly_stone', label: 'Sly Stone', family: 'funk' },
  { vrbId: 'iommi', label: 'Tony Iommi', family: 'rock' },
  { vrbId: 'david_gilmour', label: 'David Gilmour', family: 'rock' },
  { vrbId: 'hendrix', label: 'Jimi Hendrix', family: 'rock' },
  { vrbId: 'led_zeppelin', label: 'Led Zeppelin', family: 'rock' },
  { vrbId: 'weather_report', label: 'Weather Report', family: 'fusion' },
  { vrbId: 'mahavishnu', label: 'Mahavishnu', family: 'fusion' },
  { vrbId: 'verlaine', label: 'Tom Verlaine', family: 'art_rock' },
  { vrbId: 'morello', label: 'Tom Morello', family: 'art_rock' },
  { vrbId: 'fripp', label: 'Robert Fripp', family: 'art_rock' },
  { vrbId: 'frank_zappa', label: 'Frank Zappa', family: 'rock' },
] as const;

/** Families that may show the riff-path solo overlay toggle. */
export function riffFamilyAllowsSoloOverlay(family: RiffFamilyTag): boolean {
  return family === 'fusion' || family === 'art_rock' || family === 'rock' || family === 'funk';
}

function sigmaForVrb(vrbId: string): number | undefined {
  const b = getVoiceRuleBundle(vrbId);
  return typeof b.sigma === 'number' ? b.sigma : undefined;
}

export const RIFF_VRB_OPTIONS: readonly RiffVrbOption[] = RIFF_VRB_CATALOG.map((row) => {
  const id = row.vrbId as RiffGeneratorVrbId;
  const bundleFamily = resolveRiffFamilyTag(id) ?? RIFF_VRB_EXPECTED_FAMILY[id];
  return {
    ...row,
    family: bundleFamily,
    sigma: sigmaForVrb(row.vrbId),
  };
});

export function riffVrbOptionsForFamily(family: RiffFamilyTag): readonly RiffVrbOption[] {
  return RIFF_VRB_OPTIONS.filter((o) => o.family === family);
}

export function riffVrbOptionById(vrbId: string): RiffVrbOption | undefined {
  return RIFF_VRB_OPTIONS.find((o) => o.vrbId === vrbId);
}

export function defaultRiffVrbIdForFamily(family: RiffFamilyTag): string {
  return riffVrbOptionsForFamily(family)[0]?.vrbId ?? 'nile_rodgers';
}

export type RiffDensityUiId = RiffDensity;

export const RIFF_DENSITY_UI_OPTIONS: readonly { id: RiffDensityUiId; label: string }[] = [
  { id: 'sparse', label: 'Sparse' },
  { id: 'medium', label: 'Medium' },
  { id: 'dense', label: 'Busy' },
] as const;

export { applyRiffDensityToSilenceStyleClass, riffDensityStyleClass } from '../core/riff-generator/riffDensityPolicy';

/** Friendly labels for `evaluateRiffMusicality` `failedRules` rule ids. */
export const RIFF_MUSICALITY_RULE_LABELS: Readonly<Record<string, string>> = {
  anchorStrength: 'Needs a stronger downbeat',
  loopIdentityScore: 'Riff lacks repetition coherence',
  syncopationBalance: 'Rhythm too square / too random',
  registerCoherence: 'Notes out of register',
  intervalIdentityScore: "Intervals don't match style",
  barToBarMutationBudget: 'Too much variation bar-to-bar',
  silencePatternScore: 'Silence pattern off for this style',
  cadentialReset: 'Phrase ending needs reset',
  contourShape: 'Contour arc weak for this family',
};

export function riffGateLabelsFromFailedRules(
  failedRules: string[],
  gateFailures?: import('../core/riff-generator/riffMusicalityGate').GateFailure[]
): string[] {
  if (gateFailures?.length) {
    return gateFailures.map((f) => {
      const base = f.friendlyLabel || RIFF_MUSICALITY_RULE_LABELS[f.ruleId] || f.ruleId;
      if (f.profileField && f.profileValue !== undefined && f.profileValue !== '') {
        return `${base} → ${f.profileField} (${f.profileValue})`;
      }
      if (f.profileField) return `${base} → ${f.profileField}`;
      return base;
    });
  }
  const labels: string[] = [];
  for (const line of failedRules) {
    const id = line.split(':')[0]?.trim() ?? '';
    const label = RIFF_MUSICALITY_RULE_LABELS[id];
    if (label) labels.push(label);
    else if (id.startsWith('pitchStreak')) labels.push('Pitch streak policy');
  }
  return [...new Set(labels)];
}

export type RiffVrbUiIndicators = {
  allowPitchStreak: boolean;
  processLoopLabel?: string;
  killSwitchLabel?: string;
  counterpartLabel?: string;
};

export function riffVrbUiIndicators(vrbId: string): RiffVrbUiIndicators {
  const b = getVoiceRuleBundle(vrbId);
  const rp = b.riffProfile;
  const out: RiffVrbUiIndicators = {
    allowPitchStreak: rp?.allowPitchStreak !== false,
  };
  if (rp?.processLoopPolicy) {
    const pl = rp.processLoopPolicy;
    out.processLoopLabel = `Process loop · ${pl.baseCellRepeatCount} cells · ${pl.dynamicCurve}`;
  }
  if (rp?.killSwitchPattern) {
    out.killSwitchLabel = `Kill-switch gate · ${rp.killSwitchPattern.subdivision} · loop ${rp.killSwitchPattern.loopLength}`;
  }
  if (rp?.counterpartVoicePolicy) {
    const cv = rp.counterpartVoicePolicy;
    out.counterpartLabel = `Counterpart · ${cv.harmonyRole} · ${cv.rhythmicOffsetBias}`;
  }
  return out;
}
