/**
 * Composer OS V2 — Build compiled song + lead sheet contract from section plans (scaffold level).
 */

import { applySongwritingRules } from './applySongwritingRules';
import { resolveAuthorOverlay } from './authorOverlayResolver';
import { planChorusMetadata } from './chorusPlanner';
import { planHookMetadata } from './hookPlanner';
import { planLeadMelody } from './leadMelodyPlanner';
import { planMelodyBehaviour } from './melodyBehaviourPlanner';
import { planProsodyPlaceholders } from './prosodyPlanner';
import type { CompiledSong, SectionChordPlan } from './songCompilationTypes';
import type { LeadSheetContract, LeadSheetChordSymbol, LeadSheetLyricPlaceholder } from './leadSheetContract';
import { loadSongwritingResearchFromPath, loadSongwritingResearchFromEnvOrDefault } from './songwritingResearchParser';
import type { SongHook } from './songHookTypes';
import type { SongSectionKind, SongSectionPlan, SongVoiceType } from './songModeTypes';
import { DEFAULT_SONG_VOICE_TYPE } from './songModeTypes';
import { resolveSongwritingStyles } from './songwriterStyleResolver';
import type { AuthorRuleId, ClassicalSongRuleId, SongwriterRuleId } from './songwritingResearchTypes';
import type { StylePairingInput } from '../style-pairing/stylePairingTypes';
import { resolveStylePairing } from '../style-pairing/stylePairingResolver';
import { getSingerRangeProfile } from './singerRangeProfiles';
import { validateMelodyAgainstSingerRange } from './singerRangeValidation';
function intensityForKind(kind: SongSectionKind): SectionChordPlan['intensity'] {
  switch (kind) {
    case 'verse':
      return 'low';
    case 'pre_chorus':
      return 'medium';
    case 'chorus':
      return 'high';
    case 'bridge':
      return 'contrast';
    default:
      return 'medium';
  }
}

/** Simple scaffold chords per section role (C major-ish, planning only). */
function chordSymbolsForSection(kind: SongSectionKind, _seed: number): string[] {
  switch (kind) {
    case 'verse':
      return ['Cmaj7', 'Am7', 'Fmaj7', 'G7'];
    case 'pre_chorus':
      return ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'];
    case 'chorus':
      return ['Cmaj7', 'G7', 'Am7', 'Fmaj7'];
    case 'bridge':
      return ['Am7', 'Fmaj7', 'Dm7', 'G7'];
    default:
      return ['Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7'];
  }
}

export function buildSongHook(seed: number): SongHook {
  return {
    id: `hook_${(seed >>> 0) % 900_000 + 100_000}`,
    contourHint: seed % 2 === 0 ? 'arch' : 'ascending',
    rhythmHint: seed % 3 === 0 ? 'syncopated' : 'straight',
    repetitionPriority: Math.min(0.95, 0.55 + (seed % 40) / 100),
  };
}

export function buildSectionChordPlans(sections: SongSectionPlan[], seed: number): SectionChordPlan[] {
  return sections.map((s) => ({
    sectionOrder: s.order,
    sectionKind: s.kind,
    intensity: intensityForKind(s.kind),
    chordSymbols: chordSymbolsForSection(s.kind, seed + s.order * 31),
  }));
}

export interface BuildCompiledSongParams {
  seed: number;
  title: string;
  sections: SongSectionPlan[];
  voiceType?: SongVoiceType;
  researchPathOverride?: string;
  primarySongwriterStyle?: SongwriterRuleId | string | null;
  secondarySongwriterStyle?: SongwriterRuleId | string | null;
  authorOverlay?: AuthorRuleId | null;
  classicalOverlay?: ClassicalSongRuleId | null;
  /** Optional songwriter ↔ arranger pairing (metadata + light contrast nudge). */
  stylePairing?: StylePairingInput | null;
}

export function buildCompiledSong(params: BuildCompiledSongParams): CompiledSong {
  const voiceType = params.voiceType ?? DEFAULT_SONG_VOICE_TYPE;
  const research = params.researchPathOverride
    ? loadSongwritingResearchFromPath(params.researchPathOverride)
    : loadSongwritingResearchFromEnvOrDefault();
  const resolution = resolveSongwritingStyles({
    primary: params.primarySongwriterStyle ?? undefined,
    secondary: params.secondarySongwriterStyle ?? undefined,
    authorOverlay: params.authorOverlay ?? undefined,
    classicalOverlay: params.classicalOverlay ?? undefined,
  });
  const hookPlan = planHookMetadata(params.seed, params.sections, resolution.primaryId);
  const chorusPlan = planChorusMetadata(params.sections, resolution.primaryId);
  const melodyBehaviour = planMelodyBehaviour(params.seed, resolution.primaryId);
  const authorOverlay = resolveAuthorOverlay(params.authorOverlay ?? undefined);
  const stylePairingResolution =
    params.stylePairing != null
      ? resolveStylePairing({ ...params.stylePairing, seed: params.seed })
      : null;
  const hook = buildSongHook(params.seed);
  const chordPlan = buildSectionChordPlans(params.sections, params.seed);
  const sectionSummary = params.sections.map((s) => s.kind);
  const base: CompiledSong = {
    id: `song_${params.seed}_${params.title.replace(/\s+/g, '_').slice(0, 32)}`,
    title: params.title,
    voiceType,
    hook,
    sectionSummary,
    chordPlan,
    melodyFirst: true,
    hookFirst: true,
    leadSheetReady: true,
  };
  const withRules = applySongwritingRules({
    compiled: base,
    research,
    resolution,
    hookPlan,
    chorusPlan,
    melodyBehaviour,
    authorOverlay,
    stylePairingResolution,
  });

  const leadMelodyPlan = planLeadMelody({
    seed: params.seed,
    sections: params.sections,
    chordPlan: withRules.chordPlan,
    hookPlan,
    chorusPlan,
    hook: withRules.hook,
    voiceType,
  });

  const singerProfile = getSingerRangeProfile(voiceType);
  const singerRangeValidation = validateMelodyAgainstSingerRange(leadMelodyPlan, singerProfile);

  const prosodyPlaceholderPlan = planProsodyPlaceholders(
    leadMelodyPlan,
    withRules.songwriting?.authorOverlayBehaviour ?? null,
    params.seed
  );

  return {
    ...withRules,
    leadMelodyPlan,
    singerRangeValidation,
    prosodyPlaceholderPlan,
  };
}

/** Flatten chord plan into lead-sheet chord track with measure numbers (1-based). */
export function buildLeadSheetContractFromCompiled(song: CompiledSong): LeadSheetContract {
  const chords: LeadSheetChordSymbol[] = [];
  const lyrics: LeadSheetLyricPlaceholder[] = [];
  let measureBase = 1;
  const formSections: LeadSheetContract['formSummary']['sections'] = [];

  for (const block of song.chordPlan) {
    const barStart = measureBase;
    let m = measureBase;
    for (let i = 0; i < block.chordSymbols.length; i++) {
      chords.push({
        measure: m,
        beat: 0,
        chord: block.chordSymbols[i],
        durationInBeats: 4,
      });
      if (i === 0) {
        lyrics.push({ measure: m, beat: 0, placeholderId: `lyric_sec_${block.sectionOrder}` });
      }
      m += 1;
    }
    const barEnd = m - 1;
    formSections.push({
      label: `${block.sectionKind}_${block.sectionOrder}`,
      barStart,
      barEnd,
      role: block.sectionKind,
    });
    measureBase = barEnd + 1;
  }

  const profile = getSingerRangeProfile(song.voiceType);
  const melodyEvents =
    song.leadMelodyPlan?.notes.map((n) => ({
      measure: n.measure,
      beat: n.beat,
      duration: n.duration,
      pitch: n.midi,
    })) ?? [];

  const contract: LeadSheetContract = {
    title: song.title,
    vocalMelody: {
      events: melodyEvents,
      voiceType: song.voiceType,
      adaptedRange: [...profile.comfortRangeMidi] as [number, number],
      singerProfileId: song.voiceType,
      eventCount: melodyEvents.length,
    },
    chordSymbols: chords,
    lyricPlaceholders: lyrics,
    formSummary: { sections: formSections },
    prosodySlots:
      song.prosodyPlaceholderPlan?.lines.map((l) => ({
        phraseId: l.phraseId,
        syllableCount: l.syllableSlots.reduce((a, b) => a + b, 0),
        stressSummary: l.stressPattern.slice(0, 8).join(''),
        emotionalTag: l.emotionalContourTag,
      })) ?? [],
    voiceMetadata: {
      singerProfileId: song.voiceType,
      comfortRangeMidi: [...profile.comfortRangeMidi] as [number, number],
      singerRangeOk: song.singerRangeValidation?.ok ?? false,
    },
  };
  if (song.songwriting) {
    contract.songwritingHints = {
      primaryStyleId: song.songwriting.resolvedStyle.primaryId,
      hookTypesPriority: [...song.hook.hookTypePriorityOrder ?? song.songwriting.hookPlan.hookTypePriorityOrder],
      prosodyStabilityTags: song.songwriting.lyricProsody.stableUnstableTagging ? 'stable_heavy' : 'balanced',
    };
  }
  return contract;
}

export function summaryStringForManifest(song: CompiledSong): string {
  return `hook=${song.hook.id};sections=${song.sectionSummary.join(',')}`;
}

/** Flatten scaffold chords to exactly 8 bars for Guitar–Bass Duo custom golden path (`|`-separated). */
export function buildChordProgressionTextForDuoFromCompiledSong(song: CompiledSong): string {
  const chords: string[] = [];
  for (const block of song.chordPlan) {
    for (const c of block.chordSymbols) {
      chords.push(c);
    }
  }
  const pad = 8;
  if (chords.length === 0) {
    return Array(pad).fill('Cmaj7').join('|');
  }
  const out = chords.slice(0, pad);
  while (out.length < pad) {
    out.push(out[out.length - 1]!);
  }
  return out.join('|');
}
