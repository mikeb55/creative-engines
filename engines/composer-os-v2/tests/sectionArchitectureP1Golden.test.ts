/**
 * V65 P1 golden — section architecture wired at generate time (off smoke until V65 closeout).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { Song } from '../core/section-architecture/sectionArchitectureTypes';
import {
  getEffectiveContextForBar,
  getSectionArchitectureDensityScalar,
  instrumentOverrideForBar,
} from '../core/section-architecture/effectiveContextForBar';
import { runSmokeRows } from './smokeRowSafe';

const CHORDS_16 = Array.from({ length: 16 }, () => 'Dm7');

export function sonicYouthFiveSectionSong(): Song {
  return {
    schemaVersion: 1,
    id: 'sy_five_section_golden',
    title: 'SY Five Section Golden',
    totalBars: 16,
    globalDefaults: { tempo: 96, meter: '4/4', defaultDensity: 'moderate' },
    sections: [
      {
        id: 'intro',
        label: 'Intro',
        type: 'intro',
        barRange: { startBar: 1, endBar: 3 },
        pitchProfile: { registerFloor: 48, registerCeiling: 58, chromaticBudget: 0.75 },
        energy: 0.12,
        instrumentOverrides: [{ density: 'sparse', riffMode: 'noise_drone' }],
      },
      {
        id: 'verse',
        label: 'Verse',
        type: 'verse',
        barRange: { startBar: 4, endBar: 6 },
        pitchProfile: { registerFloor: 52, registerCeiling: 68, chromaticBudget: 0.35 },
        energy: 0.45,
        instrumentOverrides: [{ density: 'moderate', riffMode: 'motorik' }],
      },
      {
        id: 'chorus',
        label: 'Chorus',
        type: 'chorus',
        barRange: { startBar: 7, endBar: 10 },
        pitchProfile: { registerFloor: 55, registerCeiling: 76, chromaticBudget: 0.5 },
        energy: 0.92,
        instrumentOverrides: [{ density: 'dense', riffMode: 'wall_of_sound' }],
      },
      {
        id: 'bridge',
        label: 'Bridge',
        type: 'bridge',
        barRange: { startBar: 11, endBar: 13 },
        pitchProfile: { registerFloor: 62, registerCeiling: 84, chromaticBudget: 0.88 },
        energy: 0.72,
        instrumentOverrides: [{ riffMode: 'slonimsky_cells' }],
        transitionIn: { bars: 1, interpolateDensity: true },
      },
      {
        id: 'outro',
        label: 'Outro',
        type: 'outro',
        barRange: { startBar: 14, endBar: 16 },
        pitchProfile: { registerFloor: 45, registerCeiling: 55, chromaticBudget: 0.18 },
        energy: 0.08,
        instrumentOverrides: [{ density: 'sparse', riffMode: 'sparse_drone' }],
        transitionIn: { bars: 1, interpolateDensity: true },
      },
    ],
    localOverrides: [],
  };
}

export function gbdThreeSectionSong(): Song {
  return {
    schemaVersion: 1,
    id: 'gbd_three_section_golden',
    title: 'GBD Three Section Golden',
    totalBars: 16,
    globalDefaults: { tempo: 110, meter: '4/4', defaultDensity: 'moderate' },
    sections: [
      {
        id: 'a',
        label: 'A',
        type: 'verse',
        barRange: { startBar: 1, endBar: 5 },
        energy: 0.22,
        instrumentOverrides: [
          { tuningProfile: { instrumentType: 'guitar' }, density: 'sparse', riffMode: 'groove_sparse' },
          { tuningProfile: { instrumentType: 'bass' }, density: 'sparse', riffMode: 'groove_sparse' },
        ],
      },
      {
        id: 'b',
        label: 'B',
        type: 'chorus',
        barRange: { startBar: 6, endBar: 10 },
        energy: 0.88,
        instrumentOverrides: [
          { tuningProfile: { instrumentType: 'guitar' }, density: 'dense', riffMode: 'groove_dense' },
          { tuningProfile: { instrumentType: 'bass' }, density: 'dense', riffMode: 'groove_dense' },
        ],
      },
      {
        id: 'c',
        label: 'C',
        type: 'bridge',
        barRange: { startBar: 11, endBar: 16 },
        energy: 0.5,
        instrumentOverrides: [
          { tuningProfile: { instrumentType: 'guitar' }, density: 'moderate', riffMode: 'motorik' },
          { tuningProfile: { instrumentType: 'bass' }, density: 'moderate', riffMode: 'motorik' },
        ],
      },
    ],
    localOverrides: [],
  };
}

function guitarNoteStats(score: ScoreModel | undefined, bar: number): { count: number; maxPitch: number } {
  const guitar = score?.parts.find((p) => p.id === 'guitar');
  const m = guitar?.measures.find((x) => x.index === bar);
  if (!m) return { count: 0, maxPitch: 0 };
  const pitches: number[] = [];
  for (const e of m.events) {
    if (e.kind === 'note') pitches.push(e.pitch);
    if (e.kind === 'chord') pitches.push(...e.pitches);
  }
  return { count: pitches.length, maxPitch: pitches.length ? Math.max(...pitches) : 0 };
}

function testSongModeSyFiveSection80001(): boolean {
  const song = sonicYouthFiveSectionSong();
  const r = runGoldenPathOnce(80001, {
    presetId: 'guitar_bass_duo',
    totalBars: 16,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'sonic_youth',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS_16,
    parsedChordBars: CHORDS_16,
    song,
  });
  if (!r.score || !r.context?.generationMetadata?.sectionArchitectureWired) return false;
  if (r.context.form.sections.length !== 5) return false;

  const introCtx = getEffectiveContextForBar(2, r.context);
  const chorusCtx = getEffectiveContextForBar(8, r.context);
  const bridgeCtx = getEffectiveContextForBar(12, r.context);
  if (!introCtx || !chorusCtx || !bridgeCtx) return false;

  const introScalar = getSectionArchitectureDensityScalar(2, r.context, 'guitar') ?? 0;
  const chorusScalar = getSectionArchitectureDensityScalar(8, r.context, 'guitar') ?? 0;
  if (chorusScalar <= introScalar + 0.15) return false;
  if ((chorusCtx.energy ?? 0) <= (introCtx.energy ?? 1)) return false;
  if ((bridgeCtx.pitch?.registerCeiling ?? 0) <= (introCtx.pitch?.registerCeiling ?? 127)) return false;

  const introBar = guitarNoteStats(r.score, 2);
  const bridgeBar = guitarNoteStats(r.score, 12);
  if (bridgeBar.maxPitch <= introBar.maxPitch) return false;

  return true;
}

function testGbdThreeSection80002(): boolean {
  const song = gbdThreeSectionSong();
  const r = runGoldenPathOnce(80002, {
    presetId: 'guitar_bass_duo',
    totalBars: 16,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS_16,
    parsedChordBars: CHORDS_16,
    song,
  });
  if (!r.score || !r.context?.generationMetadata?.sectionArchitectureWired) return false;
  if (r.context.form.sections.length !== 3) return false;

  const densityA = getSectionArchitectureDensityScalar(2, r.context, 'guitar') ?? 0;
  const densityB = getSectionArchitectureDensityScalar(7, r.context, 'guitar') ?? 0;
  if (densityB <= densityA + 0.2) return false;

  const guitarOvA = instrumentOverrideForBar(2, r.context, 'guitar');
  const guitarOvB = instrumentOverrideForBar(7, r.context, 'guitar');
  const bassOvA = instrumentOverrideForBar(2, r.context, 'bass');
  const bassOvB = instrumentOverrideForBar(7, r.context, 'bass');
  if (!guitarOvA?.riffMode || !guitarOvB?.riffMode) return false;
  if (guitarOvA.riffMode === guitarOvB.riffMode) return false;
  if (guitarOvA.density === guitarOvB.density) return false;
  if (!bassOvA?.riffMode || !bassOvB?.riffMode) return false;
  if (bassOvA.riffMode === bassOvB.riffMode) return false;

  return true;
}

export function runSectionArchitectureP1GoldenTests(): { name: string; ok: boolean }[] {
  return runSmokeRows([
    [
      'V65 P1 — Song Mode SY 5-section seed 80001 (pitch + density per section)',
      testSongModeSyFiveSection80001,
    ],
    ['V65 P1 — GBD 3-section seed 80002 (riffMode + density)', testGbdThreeSection80002],
  ]);
}
