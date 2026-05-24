/**
 * V62 — Slonimsky UI/boundary goldens (fixtures + verify helpers).
 * UI state → GenerateRequest mappers and HomeGenerate wiring only.
 */

import * as fs from 'fs';
import * as path from 'path';
import { slonimskyGbdWriterPresets } from '../../../apps/composer-os-app/src/types/slonimskyGbdState';
import type { SlonimskyMacroState, SlonimskySourcePreset } from '../../../apps/composer-os-app/src/types/slonimskyMacroState';
import { slonimskySongModeWriterPresets } from '../../../apps/composer-os-app/src/types/slonimskySongModeState';
import { chromaticStrengthToWybleChromaticismLevel } from '../core/slonimsky/slonimskyPatternService';
import { THESAURUS_REGISTRY, type ThesaurusPattern } from '../core/slonimsky/thesaurusRegistry';

const GOLDENS_DIR = path.join(__dirname, 'slonimskyUiGoldens');
const REPO_ROOT = path.resolve(__dirname, '../../..');
const HOME_GENERATE = path.join(REPO_ROOT, 'apps/composer-os-app/src/pages/HomeGenerate.tsx');
const SONG_MODE_PANEL = path.join(
  REPO_ROOT,
  'apps/composer-os-app/src/components/slonimsky/SlonimskySongModePanel.tsx'
);
const GBD_PANEL = path.join(REPO_ROOT, 'apps/composer-os-app/src/components/slonimsky/SlonimskyGbdPanel.tsx');

const SLONIMSKY_GBD_STUB_WRITER_IDS = [] as const;

const SLONIMSKY_SONG_MODE_STUB_WRITER_IDS = [] as const;

export function loadUiGolden<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(GOLDENS_DIR, fileName), 'utf8')) as T;
}

type SongModeWriterGolden = {
  writerId: string;
  firstPresetLabel: string;
  macro: SlonimskyMacroState;
  stubWriter?: boolean;
};

type SongModeWritersGolden = {
  id: string;
  writers: SongModeWriterGolden[];
};

type GbdWriterGolden = {
  writerId: string;
  firstPresetLabel: string;
  macro: SlonimskyMacroState;
};

type GbdWritersGolden = {
  id: string;
  stubWriters: GbdWriterGolden[];
};

type Lane3PresetGolden = {
  presetId: string;
  homeGenerateMustContain: string[];
};

type Lane3WiringGolden = {
  id: string;
  presets: Lane3PresetGolden[];
};

type EtudeSurfacesGolden = {
  id: string;
  wybleChromaticism: { chromaticStrength: 'off' | 'subtle' | 'prominent'; chromaticismLevel: number }[];
  slonimskyCellFamilies: { flavor: SlonimskySourcePreset; patternId: string }[];
};

/** Mirror {@link slonimskyPatternIdForCellFamily} — engine-only (smoke-safe). */
function scoreFlavor(pattern: ThesaurusPattern, flavor: SlonimskySourcePreset): number {
  const name = pattern.name.toLowerCase();
  let score = 0;
  if (flavor === 'chromatic') {
    if (name.includes('chromatic') || pattern.section === 'semitone_progression') score += 4;
    if (pattern.tensionLevel >= 2) score += 1;
  }
  if (flavor === 'lyrical') {
    if (pattern.tensionLevel === 1) score += 3;
    if (pattern.symmetryType === 'equalDivision' && pattern.defaultLength >= 4) score += 2;
    if (pattern.playerAffinity.includes('ecm')) score += 1;
  }
  if (flavor === 'angular') {
    if (pattern.symmetryType === 'asymmetric') score += 3;
    if (pattern.tensionLevel >= 3) score += 2;
    if (name.includes('asym') || name.includes('expanding')) score += 1;
  }
  if (flavor === 'symmetric') {
    if (pattern.symmetryType === 'equalDivision') score += 3;
    if (pattern.tensionLevel === 2) score += 1;
    if (pattern.baseDivision != null) score += 1;
  }
  if (flavor === 'riff') {
    if (pattern.defaultLength <= 4) score += 2;
    if (pattern.tensionLevel >= 2 && pattern.symmetryType === 'equalDivision') score += 2;
    if (name.includes('cell') || name.includes('cycle')) score += 1;
  }
  return score;
}

function primaryFlavorForPattern(pattern: ThesaurusPattern): SlonimskySourcePreset {
  const flavors: SlonimskySourcePreset[] = ['lyrical', 'angular', 'symmetric', 'chromatic', 'riff'];
  let best: SlonimskySourcePreset = 'lyrical';
  let bestScore = -1;
  for (const f of flavors) {
    const s = scoreFlavor(pattern, f);
    if (s > bestScore) {
      bestScore = s;
      best = f;
    }
  }
  return best;
}

function slonimskyPatternIdForCellFamilySmoke(flavor: SlonimskySourcePreset): string {
  const primary = THESAURUS_REGISTRY.filter((p) => p.inEngine && primaryFlavorForPattern(p) === flavor);
  const id = primary[0]?.id;
  if (id) return id;
  const engine = THESAURUS_REGISTRY.filter((p) => p.inEngine);
  let best = engine[0]!;
  let bestScore = -1;
  for (const p of engine) {
    const s = scoreFlavor(p, flavor);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best.id;
}

function macroMatches(a: SlonimskyMacroState, b: SlonimskyMacroState): boolean {
  return (
    a.sourcePreset === b.sourcePreset &&
    a.motion === b.motion &&
    a.tension === b.tension &&
    a.variation === b.variation
  );
}

export function verifySongModeWritersV62Golden(): boolean {
  const fx = loadUiGolden<SongModeWritersGolden>('songModeWritersV62.json');
  const panelSrc = fs.readFileSync(SONG_MODE_PANEL, 'utf8');
  for (const row of fx.writers) {
    const presets = slonimskySongModeWriterPresets(row.writerId as never);
    const first = presets.find((p) => p.label === row.firstPresetLabel);
    if (!first || !macroMatches(first.macro, row.macro)) return false;
    if (!panelSrc.includes(row.writerId)) return false;
    if (
      row.stubWriter !== undefined &&
      (SLONIMSKY_SONG_MODE_STUB_WRITER_IDS as readonly string[]).includes(row.writerId) !== row.stubWriter
    ) {
      return false;
    }
  }
  return fx.writers.length === 7;
}

export function verifyGbdWritersV62Golden(): boolean {
  const fx = loadUiGolden<GbdWritersGolden>('gbdWritersV62.json');
  const panelSrc = fs.readFileSync(GBD_PANEL, 'utf8');
  for (const row of fx.stubWriters) {
    if (!(SLONIMSKY_GBD_STUB_WRITER_IDS as readonly string[]).includes(row.writerId)) return false;
    const presets = slonimskyGbdWriterPresets(row.writerId as never);
    const first = presets.find((p) => p.label === row.firstPresetLabel);
    if (!first || !macroMatches(first.macro, row.macro)) return false;
    if (!panelSrc.includes(row.writerId)) return false;
  }
  return fx.stubWriters.length === 0;
}

export function verifyLane3PresetWiringGolden(): boolean {
  const fx = loadUiGolden<Lane3WiringGolden>('lane3PresetWiring.json');
  const home = fs.readFileSync(HOME_GENERATE, 'utf8');
  for (const row of fx.presets) {
    for (const needle of row.homeGenerateMustContain) {
      if (!home.includes(needle)) return false;
    }
  }
  return fx.presets.length === 5;
}

export function verifyEtudeSurfacesGolden(): boolean {
  const fx = loadUiGolden<EtudeSurfacesGolden>('etudeSurfaces.json');
  for (const row of fx.wybleChromaticism) {
    if (chromaticStrengthToWybleChromaticismLevel(row.chromaticStrength) !== row.chromaticismLevel) {
      return false;
    }
  }
  for (const row of fx.slonimskyCellFamilies) {
    const id = slonimskyPatternIdForCellFamilySmoke(row.flavor);
    if (id !== row.patternId || !id.startsWith('p_')) return false;
  }
  const home = fs.readFileSync(HOME_GENERATE, 'utf8');
  return (
    home.includes('SlonimskyEtudeCellFamilyPanel') &&
    home.includes('slonimskyPatternIdForCellFamily')
  );
}
