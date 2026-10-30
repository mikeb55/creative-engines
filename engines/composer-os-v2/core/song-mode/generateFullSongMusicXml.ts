/**
 * Browser-oriented full_song entry: seed + totalBars → MusicXML string.
 * Reuses runSongMode + Mosaic + chorusReturnIdentity + MusicXML exporter.
 * No disk writes. No vocal / MIDI / drums / PDF / Python paths.
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { runGoldenPathOnce } from '../goldenPath/runGoldenPath';
import { applyChorusOpeningMotifRecall } from './chorusReturnIdentity';
import {
  applyMoodDriftToChordPlan,
  resolveFullSongMood,
  type FullSongMood,
} from './fullSongMood';
import { runSongMode } from './runSongMode';
import { mapSongModeToMosaicSectionPlan } from './songModeToMosaicMapper';
import { createDefaultSongwritingResearch } from './songwritingResearchParser';
import type { ParsedSongwritingResearch } from './songwritingResearchTypes';

const DEFAULT_STYLE = 'beatles';
const DEFAULT_BPM = 120;

export type { FullSongMood };

export interface GenerateFullSongMusicXmlOptions {
  /** Optional score title. */
  title?: string;
  /** Primary songwriter style id (default beatles). */
  primarySongwriterStyle?: string;
  /** Explicit research; defaults to createDefaultSongwritingResearch() (no Songwriting.md FS). */
  research?: ParsedSongwritingResearch;
  /** Tempo for MusicXML export (default 120). */
  bpm?: number;
  /**
   * Optional expressive mood — maps onto existing EmotionalDrift reharm ranking.
   * Omitted / `neutral` preserves baseline harmony. Supported: darker, brighter,
   * more-suspended, more-unstable, more-cinematic (+ aliases dark/bright/suspended/unstable/cinematic).
   */
  mood?: FullSongMood | string;
}

/**
 * Pure full_song generation: returns MusicXML text only.
 */
export function generateFullSongMusicXml(
  seed: number,
  totalBars: number = 32,
  options: GenerateFullSongMusicXmlOptions = {}
): string {
  if (!Number.isFinite(seed)) {
    throw new Error('generateFullSongMusicXml: seed must be finite number');
  }
  const bars = Math.floor(totalBars);
  if (!Number.isFinite(bars) || bars < 1) {
    throw new Error('generateFullSongMusicXml: totalBars must be positive integer');
  }

  const style =
    typeof options.primarySongwriterStyle === 'string' && options.primarySongwriterStyle.trim() !== ''
      ? options.primarySongwriterStyle.trim()
      : DEFAULT_STYLE;
  const title =
    typeof options.title === 'string' && options.title.trim() !== ''
      ? options.title.trim()
      : `Full Song (${bars} bars)`;
  const research = options.research ?? createDefaultSongwritingResearch();
  const bpm =
    typeof options.bpm === 'number' && Number.isFinite(options.bpm) && options.bpm > 0
      ? options.bpm
      : DEFAULT_BPM;

  const sm = runSongMode({
    seed: Math.floor(seed),
    title,
    totalBars: bars,
    songFormTemplate: 'full_song',
    primarySongwriterStyle: style,
    researchOverride: research,
  });

  const moodDrift = resolveFullSongMood(options.mood);
  if (moodDrift) {
    sm.compiledSong.chordPlan = applyMoodDriftToChordPlan(
      sm.compiledSong.chordPlan,
      Math.floor(seed),
      moodDrift
    );
  }

  const locked = sm.compiledSong.chordPlan.flatMap((p) => p.chordSymbols);
  if (locked.length !== bars) {
    throw new Error(
      `generateFullSongMusicXml: chord bar count ${locked.length} !== totalBars ${bars}`
    );
  }

  const mosaicPlan = mapSongModeToMosaicSectionPlan(sm.compiledSong, {
    songwriterStyleId: style,
  });
  if (mosaicPlan.length < 2) {
    throw new Error('generateFullSongMusicXml: mosaic plan too short');
  }

  const result = runGoldenPathOnce(Math.floor(seed), {
    presetId: 'guitar_bass_duo',
    scoreTitle: title,
    totalBars: bars,
    longFormEnabled: true,
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: locked,
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    mosaicSectionPlan: mosaicPlan,
    mosaicOutputFormat: 'melody-bass-chords',
    primarySongwriterStyle: style,
    songModeHookFirstIdentity: true,
  });

  if (!result.success || !result.score) {
    throw new Error(
      `generateFullSongMusicXml: golden path failed: ${(result.errors ?? []).join('; ') || 'no score'}`
    );
  }

  const score = applyChorusOpeningMotifRecall(result.score, mosaicPlan, { openingBars: 3 });
  const xml = exportScoreModelToMusicXml(score, { bpm }).xml ?? '';
  if (!xml.includes('<score-partwise') && !xml.includes('<score-timewise')) {
    throw new Error('generateFullSongMusicXml: MusicXML missing score root');
  }
  return xml;
}
