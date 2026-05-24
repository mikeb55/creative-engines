/**
 * V63 S6 — Promoted voices UI/boundary + distinctness goldens (smoke tier).
 */

import * as fs from 'fs';
import * as path from 'path';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { slonimskyGbdWriterPresets } from '../../../apps/composer-os-app/src/types/slonimskyGbdState';
import type { SlonimskyMacroState } from '../../../apps/composer-os-app/src/types/slonimskyMacroState';
import { slonimskySongModeWriterPresets } from '../../../apps/composer-os-app/src/types/slonimskySongModeState';
import { runMccoyTynerHarmonyGoldenTests } from './mccoyTynerHarmonyGolden.test';
import { runWesMontgomeryGbdGoldenTests } from './wesMontgomeryGbdGolden.test';
import { runJoePassGbdGoldenTests } from './joePassGbdGolden.test';
import { runHoldsworthHendersonGbdGoldenTests } from './holdsworthHendersonGbdGolden.test';
import { runSonicYouthDistinctGoldenTests } from './sonicYouthDistinctGolden.test';
import { loadUiGolden } from './slonimskyUiGolden';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const APP_SRC = path.join(REPO_ROOT, 'apps/composer-os-app/src');
const GOLDENS_DIR = path.join(__dirname, 'slonimskyUiGoldens');

type PromotedVoiceUiBoundaryRow = {
  voiceId: string;
  mode: 'song_mode_writer' | 'song_mode_harmonic_voice' | 'gbd_harmonic_voice';
  panelRelPath: string;
  firstPresetLabel: string;
  macro: SlonimskyMacroState;
  harmonicVoiceMode?: 'song_mode' | 'gbd';
  distinctFixture: string;
};

type PromotedVoicesV63UiBoundaryGolden = {
  id: string;
  voices: PromotedVoiceUiBoundaryRow[];
};

function macroMatches(a: SlonimskyMacroState, b: SlonimskyMacroState): boolean {
  return (
    a.sourcePreset === b.sourcePreset &&
    a.motion === b.motion &&
    a.tension === b.tension &&
    a.variation === b.variation
  );
}

function isConfirmedHarmonicVoiceBundle(id: string): boolean {
  return getVoiceRuleBundle(id).voiceId !== 'neutral';
}

function slonimskyHarmonicVoiceOptionsForMode(mode: 'song_mode' | 'gbd'): string[] {
  const constantsSrc = fs.readFileSync(
    path.join(APP_SRC, 'constants/slonimskyHarmonicVoices.ts'),
    'utf8'
  );
  const listName = mode === 'gbd' ? 'GBD_VOICE_IDS' : 'SONG_MODE_VOICE_IDS';
  const match = constantsSrc.match(new RegExp(`${listName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`));
  if (!match) return [];
  return [...match[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

function verifyPromotedVoiceUiBoundary(row: PromotedVoiceUiBoundaryRow): boolean {
  const panelSrc = fs.readFileSync(path.join(APP_SRC, row.panelRelPath), 'utf8');
  if (!panelSrc.includes(row.voiceId)) return false;
  if (!fs.existsSync(path.join(GOLDENS_DIR, row.distinctFixture))) return false;

  const constantsSrc = fs.readFileSync(
    path.join(APP_SRC, 'constants/slonimskyHarmonicVoices.ts'),
    'utf8'
  );
  if (constantsSrc.includes('SONIC_YOUTH_OPTION')) return false;
  if (constantsSrc.includes(`SLONIMSKY_SONG_MODE_STUB_WRITER_IDS = ['${row.voiceId}']`)) return false;
  if (constantsSrc.includes(`SLONIMSKY_GBD_STUB_WRITER_IDS = ['${row.voiceId}']`)) return false;

  if (row.mode === 'song_mode_writer') {
    const presets = slonimskySongModeWriterPresets(row.voiceId as never);
    const first = presets.find((p) => p.label === row.firstPresetLabel);
    if (!first || !macroMatches(first.macro, row.macro)) return false;
    return !constantsSrc.includes(`SLONIMSKY_SONG_MODE_STUB_WRITER_IDS = ['${row.voiceId}']`);
  }

  if (row.mode === 'song_mode_harmonic_voice' || row.mode === 'gbd_harmonic_voice') {
    if (!isConfirmedHarmonicVoiceBundle(row.voiceId)) return false;
    const mode = row.harmonicVoiceMode ?? 'gbd';
    const roster = slonimskyHarmonicVoiceOptionsForMode(mode);
    if (!roster.includes(row.voiceId)) return false;
    const presets =
      row.mode === 'gbd_harmonic_voice'
        ? slonimskyGbdWriterPresets(row.voiceId as never)
        : slonimskySongModeWriterPresets(row.voiceId as never);
    const first = presets.find((p) => p.label === row.firstPresetLabel);
    if (!first || !macroMatches(first.macro, row.macro)) return false;
  }

  return true;
}

export function runV63PromotedVoicesUiBoundaryTests(): { name: string; ok: boolean }[] {
  const fx = loadUiGolden<PromotedVoicesV63UiBoundaryGolden>('promotedVoicesV63UiBoundary.json');
  return fx.voices.map((row) => ({
    name: `v63-ui — ${row.voiceId} promoted (no ⚠, fixture ${row.distinctFixture})`,
    ok: verifyPromotedVoiceUiBoundary(row),
  }));
}

export function runV63PromotedVoicesDistinctGoldenTests(): { name: string; ok: boolean }[] {
  return [
    ...runMccoyTynerHarmonyGoldenTests(),
    ...runWesMontgomeryGbdGoldenTests(),
    ...runJoePassGbdGoldenTests(),
    ...runHoldsworthHendersonGbdGoldenTests(),
    ...runSonicYouthDistinctGoldenTests(),
  ];
}

export function runV63PromotedVoicesGoldenTests(): { name: string; ok: boolean }[] {
  return [...runV63PromotedVoicesUiBoundaryTests(), ...runV63PromotedVoicesDistinctGoldenTests()];
}

if (require.main === module) {
  const results = runV63PromotedVoicesGoldenTests();
  for (const r of results) {
    console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
