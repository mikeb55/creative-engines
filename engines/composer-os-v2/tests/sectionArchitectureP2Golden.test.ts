/**
 * V65 P2 golden — per-section tuning, Slonimsky cell families, and ensemble section profiles.
 * Off smoke until V65 closeout.
 */

import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import {
  getEffectiveContextForBar,
  getEffectiveTuningProfileForBar,
  getSectionArchitectureDensityScalar,
  getSlonimskyCellSetsForBar,
} from '../core/section-architecture/effectiveContextForBar';
import type { Song } from '../core/section-architecture/sectionArchitectureTypes';

const CHORDS_16 = Array.from({ length: 16 }, () => 'Dm7');

function syTuningSong(): Song {
  return {
    schemaVersion: 1,
    id: 'v65_p2_sy_tuning',
    title: 'V65 P2 SY Tuning',
    totalBars: 16,
    globalDefaults: { tempo: 96, meter: '4/4', defaultDensity: 'moderate' },
    sections: [
      {
        id: 'intro',
        label: 'Intro',
        type: 'intro',
        barRange: { startBar: 1, endBar: 4 },
        energy: 0.22,
        instrumentOverrides: [{ tuningProfile: { instrumentType: 'guitarA', tuningId: 'sy_aaddgg' } }],
      },
      {
        id: 'verse',
        label: 'Verse',
        type: 'verse',
        barRange: { startBar: 5, endBar: 10 },
        energy: 0.5,
        instrumentOverrides: [{ tuningProfile: { instrumentType: 'guitarA', tuningId: 'sy_aaddgg' } }],
      },
      {
        id: 'bridge',
        label: 'Bridge',
        type: 'bridge',
        barRange: { startBar: 11, endBar: 16 },
        energy: 0.78,
        transitionIn: { bars: 2, interpolateRegister: true },
        instrumentOverrides: [{ tuningProfile: { instrumentType: 'guitarA', tuningId: 'sy_eebddg' } }],
      },
    ],
    localOverrides: [],
  };
}

function slonimskyCellSong(): Song {
  return {
    schemaVersion: 1,
    id: 'v65_p2_slonimsky_cells',
    title: 'V65 P2 Slonimsky Cells',
    totalBars: 16,
    globalDefaults: { tempo: 108, meter: '4/4', defaultDensity: 'moderate' },
    sections: [
      {
        id: 'intro',
        label: 'Intro',
        type: 'intro',
        barRange: { startBar: 1, endBar: 4 },
        pitchProfile: { cellSets: ['pentatonic_scales'], chromaticBudget: 0.25 },
      },
      {
        id: 'verse',
        label: 'Verse',
        type: 'verse',
        barRange: { startBar: 5, endBar: 10 },
        pitchProfile: { cellSets: ['ditone_progression'], allowedOutsideLevel: 2, chromaticBudget: 0.75 },
      },
      {
        id: 'bridge',
        label: 'Bridge',
        type: 'bridge',
        barRange: { startBar: 11, endBar: 16 },
        pitchProfile: { cellSets: ['semitone_progression'], allowedOutsideLevel: 2, chromaticBudget: 0.9 },
      },
    ],
    localOverrides: [],
  };
}

function bigBandSectionSong(): Song {
  return {
    schemaVersion: 1,
    id: 'v65_p2_bb_sections',
    title: 'V65 P2 Big Band Sections',
    totalBars: 16,
    globalDefaults: { tempo: 132, meter: '4/4', defaultDensity: 'moderate' },
    sections: [
      {
        id: 'a',
        label: 'A',
        type: 'intro',
        barRange: { startBar: 1, endBar: 5 },
        energy: 0.2,
        voicingProfile: { maxSpreadSemitones: 18 },
      },
      {
        id: 'b',
        label: 'B',
        type: 'chorus',
        barRange: { startBar: 6, endBar: 10 },
        energy: 0.9,
        rhythmProfile: { antiMetric: true },
        voicingProfile: { minSpreadSemitones: 36 },
      },
      {
        id: 'c',
        label: 'C',
        type: 'outro',
        barRange: { startBar: 11, endBar: 16 },
        energy: 0.45,
        voicingProfile: { maxSpreadSemitones: 24 },
      },
    ],
    localOverrides: [],
  };
}

function intervalSignature(score: ScoreModel, start: number, end: number): string {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const pitches: number[] = [];
  for (let bar = start; bar <= end; bar++) {
    const m = guitar?.measures.find((x) => x.index === bar);
    for (const e of m?.events ?? []) {
      if (e.kind === 'note' && (e.voice ?? 1) === 1) pitches.push(e.pitch);
    }
  }
  const intervals = new Set<number>();
  for (let i = 1; i < pitches.length; i++) {
    intervals.add(Math.abs(pitches[i]! - pitches[i - 1]!) % 12);
  }
  return [...intervals].sort((a, b) => a - b).join(',');
}

function testSyTuning81001(): boolean {
  const song = syTuningSong();
  const r = runGoldenPathOnce(81001, {
    presetId: 'guitar_bass_duo',
    totalBars: 16,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'sonic_youth',
    styleProfile: 'STYLE_SONIC_YOUTH',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS_16,
    parsedChordBars: CHORDS_16,
    song,
  });
  if (!r.score || !r.context?.generationMetadata?.sectionArchitectureWired) return false;
  if (getEffectiveTuningProfileForBar(2, r.context, 'guitar')?.tuningId !== 'sy_aaddgg') return false;
  if (getEffectiveTuningProfileForBar(12, r.context, 'guitar')?.tuningId !== 'sy_eebddg') return false;
  return r.score.sectionArchitectureTuningByBarByPartId?.[12]?.guitar === 'sy_eebddg';
}

function testSlonimskyCells81002(): boolean {
  const song = slonimskyCellSong();
  const r = runGoldenPathOnce(81002, {
    presetId: 'guitar_bass_duo',
    totalBars: 16,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'sonic_youth',
    styleProfile: 'STYLE_SONIC_YOUTH',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: CHORDS_16,
    parsedChordBars: CHORDS_16,
    song,
  });
  if (!r.score || !r.context?.generationMetadata?.sectionArchitectureWired) return false;
  if (getSlonimskyCellSetsForBar(6, r.context)?.[0] !== 'ditone_progression') return false;
  if (getSlonimskyCellSetsForBar(12, r.context)?.[0] !== 'semitone_progression') return false;
  const receipts = r.context.generationMetadata.slonimskySongModeCellReceipts?.join('\n') ?? '';
  if (!receipts.includes('cellSet=ditone_progression') || !receipts.includes('cellSet=semitone_progression')) {
    return false;
  }
  return intervalSignature(r.score, 5, 10) !== intervalSignature(r.score, 11, 16);
}

function testBigBandSections81003(): boolean {
  const song = bigBandSectionSong();
  const r = runBigBandRealisation({
    seed: 81003,
    title: 'V65 P2 Big Band Golden',
    totalBars: 16,
    chordProgressionText: CHORDS_16.join('|'),
    song,
  });
  const ctx = r.planning.sectionArchitectureContext;
  if (!ctx?.generationMetadata?.sectionArchitectureWired) return false;
  const a = getEffectiveContextForBar(2, ctx);
  const b = getEffectiveContextForBar(7, ctx);
  if (!a || !b) return false;
  const densityA = getSectionArchitectureDensityScalar(2, ctx) ?? 0;
  const densityB = getSectionArchitectureDensityScalar(7, ctx) ?? 0;
  if (densityB <= densityA + 0.2) return false;
  if ((b.voicing.minSpreadSemitones ?? 0) <= (a.voicing.maxSpreadSemitones ?? 99)) return false;
  const scoreA = r.score.sectionArchitectureProfileByBar?.[2];
  const scoreB = r.score.sectionArchitectureProfileByBar?.[7];
  return scoreA?.density === 'sparse' && scoreB?.density === 'dense' && scoreB.minSpreadSemitones === 36;
}

export function runSectionArchitectureP2GoldenTests(): { name: string; ok: boolean }[] {
  return [
    ['V65 P2 — Song Mode SY per-section tuning seed 81001', testSyTuning81001],
    ['V65 P2 — Song Mode per-section Slonimsky cellSets seed 81002', testSlonimskyCells81002],
    ['V65 P2 — Big Band section density + voicing seed 81003', testBigBandSections81003],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
