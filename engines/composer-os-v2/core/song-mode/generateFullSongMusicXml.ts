/**
 * Browser-oriented full_song entry: seed + totalBars → MusicXML string.
 * Reuses runSongMode + Mosaic + chorusReturnIdentity + MusicXML exporter.
 * No disk writes. No vocal / MIDI / drums / PDF / Python paths.
 *
 * Optional {@link GenerateFullSongMusicXmlOptions.loopHarmony}:
 * - default (no stretch flag): experimental timed Loop Editor authority
 * - {@link GenerateFullSongMusicXmlOptions.stretchLoopHarmonyToBars}: opt-in
 *   proportional stretch → existing custom_locked bar path (no timed flags)
 */

import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { runGoldenPathOnce } from '../goldenPath/runGoldenPath';
import { applyChorusOpeningMotifRecall } from './chorusReturnIdentity';
import {
  applyMoodDriftToChordPlan,
  resolveFullSongMood,
  type FullSongMood,
} from './fullSongMood';
import {
  expandFullSongLoopHarmonyToSongLength,
  songLengthQuartersFromBars,
  stretchLoopHarmonyToLockedBars,
  validateFullSongLoopHarmony,
  type FullSongLoopHarmonyInput,
  type LoopHarmonyStretchFactor,
} from './fullSongLoopHarmony';
import {
  projectLoopHarmonyTimelineToBarSymbols,
  uniformBarMeterMap,
} from './fullSongLoopHarmonyApply';
import { assertFullSongStyleEligible } from './fullSongStyleEligibility';
import { runSongMode } from './runSongMode';
import { mapSongModeToMosaicSectionPlan } from './songModeToMosaicMapper';
import { createDefaultSongwritingResearch } from './songwritingResearchParser';
import type { ParsedSongwritingResearch } from './songwritingResearchTypes';
import type { SectionChordPlan } from './songCompilationTypes';

const DEFAULT_STYLE = 'beatles';
const DEFAULT_BPM = 120;

export type { FullSongMood };
export type { FullSongLoopHarmonyInput, LoopHarmonyStretchFactor } from './fullSongLoopHarmony';

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
   * Ignored when {@link loopHarmony} is supplied (timeline / stretch bars are authoritative).
   */
  mood?: FullSongMood | string;
  /**
   * Optional timed Loop Editor harmony (multi-chord bars, rests, cross-bar holds).
   * Without {@link stretchLoopHarmonyToBars}: validated, expanded, timed authority.
   * With stretch opt-in: converted to locked bar symbols (no timed path).
   */
  loopHarmony?: FullSongLoopHarmonyInput;
  /**
   * Opt-in proportional stretch of {@link loopHarmony} onto 4/4 locked bars.
   * Requires `loopHarmony`. Does not activate timedLoopHarmonyAuthority.
   * Invalid stretch input rejects before generation (no silent fallback).
   */
  stretchLoopHarmonyToBars?: boolean;
}

export type GenerateFullSongMusicXmlMetadata = {
  /** Set when stretch opt-in succeeded. */
  loopHarmonyStretchFactor?: LoopHarmonyStretchFactor;
  /** True only on the experimental timed loopHarmony path. */
  timedLoopHarmonyAuthority: boolean;
};

export type GenerateFullSongMusicXmlResult = {
  xml: string;
  metadata: GenerateFullSongMusicXmlMetadata;
};

function overwriteChordPlanSymbols(plan: SectionChordPlan[], locked: string[]): void {
  let i = 0;
  for (const section of plan) {
    for (let j = 0; j < section.chordSymbols.length; j++) {
      if (i >= locked.length) return;
      section.chordSymbols[j] = locked[i]!;
      i++;
    }
  }
}

/** Repeat cycle symbols to `bars`, truncating a partial final cycle. */
function tileOrTruncateBarSymbols(cycle: readonly string[], bars: number): string[] {
  if (cycle.length === 0) {
    throw new Error('generateFullSongMusicXml: stretch cycle produced empty barSymbols');
  }
  const out: string[] = [];
  for (let i = 0; i < bars; i++) {
    out.push(cycle[i % cycle.length]!);
  }
  return out;
}

/**
 * Full_song generation with metadata (stretch factor / timed-authority flag).
 */
export function generateFullSongMusicXmlResult(
  seed: number,
  totalBars: number = 32,
  options: GenerateFullSongMusicXmlOptions = {}
): GenerateFullSongMusicXmlResult {
  if (!Number.isFinite(seed)) {
    throw new Error('generateFullSongMusicXml: seed must be finite number');
  }
  const bars = Math.floor(totalBars);
  if (!Number.isFinite(bars) || bars < 1) {
    throw new Error('generateFullSongMusicXml: totalBars must be positive integer');
  }

  const styleRaw =
    typeof options.primarySongwriterStyle === 'string' && options.primarySongwriterStyle.trim() !== ''
      ? options.primarySongwriterStyle.trim()
      : DEFAULT_STYLE;
  /** Reject stand-in / library-only styles before Song Mode or golden-path work. */
  const style = assertFullSongStyleEligible(styleRaw);
  const title =
    typeof options.title === 'string' && options.title.trim() !== ''
      ? options.title.trim()
      : `Full Song (${bars} bars)`;
  const research = options.research ?? createDefaultSongwritingResearch();
  const bpm =
    typeof options.bpm === 'number' && Number.isFinite(options.bpm) && options.bpm > 0
      ? options.bpm
      : DEFAULT_BPM;

  const stretchOptIn = options.stretchLoopHarmonyToBars === true;
  if (stretchOptIn && options.loopHarmony === undefined) {
    throw new Error(
      'generateFullSongMusicXml: stretchLoopHarmonyToBars requires loopHarmony (no silent fallback)'
    );
  }

  let loopTimeline: ReturnType<typeof expandFullSongLoopHarmonyToSongLength> | null = null;
  let loopMeter = options.loopHarmony?.meter;
  let loopSongLen: number | null = null;
  let locked: string[];
  let stretchFactor: LoopHarmonyStretchFactor | undefined;
  let useTimedLoopAuthority = false;

  if (options.loopHarmony !== undefined && stretchOptIn) {
    const stretch = stretchLoopHarmonyToLockedBars(options.loopHarmony);
    if (!stretch.ok) {
      throw new Error(`generateFullSongMusicXml: invalid stretch loopHarmony: ${stretch.error}`);
    }
    stretchFactor = stretch.factor;
    locked = tileOrTruncateBarSymbols(stretch.barSymbols, bars);
    if (locked.length !== bars) {
      throw new Error(
        `generateFullSongMusicXml: stretch bar tile ${locked.length} !== totalBars ${bars}`
      );
    }
  } else if (options.loopHarmony !== undefined) {
    const loopCheck = validateFullSongLoopHarmony(options.loopHarmony);
    if (!loopCheck.ok) {
      throw new Error(`generateFullSongMusicXml: invalid loopHarmony: ${loopCheck.error}`);
    }
    loopMeter = loopCheck.input.meter;
    loopSongLen = songLengthQuartersFromBars(loopCheck.input.meter, bars);
    loopTimeline = expandFullSongLoopHarmonyToSongLength(loopCheck.input, loopSongLen);
    /** Scaffold for custom_locked wire only — pitches/export restamped from timeline. */
    locked = projectLoopHarmonyTimelineToBarSymbols(loopTimeline, loopCheck.input.meter, bars);
    if (locked.length !== bars) {
      throw new Error(
        `generateFullSongMusicXml: loopHarmony bar projection ${locked.length} !== totalBars ${bars}`
      );
    }
    useTimedLoopAuthority = true;
  } else {
    locked = [];
  }

  const sm = runSongMode({
    seed: Math.floor(seed),
    title,
    totalBars: bars,
    songFormTemplate: 'full_song',
    primarySongwriterStyle: style,
    researchOverride: research,
  });

  if (options.loopHarmony !== undefined) {
    overwriteChordPlanSymbols(sm.compiledSong.chordPlan, locked);
  } else {
    const moodDrift = resolveFullSongMood(options.mood);
    if (moodDrift) {
      sm.compiledSong.chordPlan = applyMoodDriftToChordPlan(
        sm.compiledSong.chordPlan,
        Math.floor(seed),
        moodDrift
      );
    }
    locked = sm.compiledSong.chordPlan.flatMap((p) => p.chordSymbols);
  }

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
    ...(useTimedLoopAuthority && loopTimeline && loopMeter && loopSongLen != null
      ? {
          timedLoopHarmonyAuthority: true,
          timedLoopHarmony: {
            timeline: loopTimeline,
            meter: loopMeter,
            songLengthQuarters: loopSongLen,
          },
          barMeterMap: uniformBarMeterMap(loopMeter, bars),
        }
      : {}),
  });

  if (!result.success || !result.score) {
    throw new Error(
      `generateFullSongMusicXml: golden path failed: ${(result.errors ?? []).join('; ') || 'no score'}`
    );
  }

  /**
   * Chorus motif recall can rewrite pitches after onset realization — skip on timed
   * loopHarmony so rest/boundary/slash authority from duo generation stays intact.
   * Stretch → locked bars keeps normal chorus recall.
   */
  const score = useTimedLoopAuthority
    ? result.score
    : applyChorusOpeningMotifRecall(result.score, mosaicPlan, { openingBars: 3 });

  const xml = exportScoreModelToMusicXml(score, { bpm }).xml ?? '';
  if (!xml.includes('<score-partwise') && !xml.includes('<score-timewise')) {
    throw new Error('generateFullSongMusicXml: MusicXML missing score root');
  }

  const timedFlagOnScore =
    (result.score as { generationMetadata?: { timedLoopHarmonyAuthority?: boolean } })
      .generationMetadata?.timedLoopHarmonyAuthority === true;
  if (stretchOptIn && (useTimedLoopAuthority || timedFlagOnScore)) {
    throw new Error(
      'generateFullSongMusicXml: stretch path must not activate timedLoopHarmonyAuthority'
    );
  }

  return {
    xml,
    metadata: {
      ...(stretchFactor !== undefined ? { loopHarmonyStretchFactor: stretchFactor } : {}),
      timedLoopHarmonyAuthority: useTimedLoopAuthority,
    },
  };
}

/**
 * Pure full_song generation: returns MusicXML text only.
 */
export function generateFullSongMusicXml(
  seed: number,
  totalBars: number = 32,
  options: GenerateFullSongMusicXmlOptions = {}
): string {
  return generateFullSongMusicXmlResult(seed, totalBars, options).xml;
}
