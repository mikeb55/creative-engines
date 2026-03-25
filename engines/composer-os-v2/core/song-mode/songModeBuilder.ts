/**
 * Composer OS V2 — Build compiled song + lead sheet contract from section plans (scaffold level).
 */

import type { CompiledSong, SectionChordPlan } from './songCompilationTypes';
import type { LeadSheetContract, LeadSheetChordSymbol, LeadSheetLyricPlaceholder } from './leadSheetContract';
import type { SongHook } from './songHookTypes';
import type { SongSectionKind, SongSectionPlan, SongVoiceType } from './songModeTypes';
import { DEFAULT_SONG_VOICE_TYPE } from './songModeTypes';
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

export function buildCompiledSong(params: {
  seed: number;
  title: string;
  sections: SongSectionPlan[];
  voiceType?: SongVoiceType;
}): CompiledSong {
  const voiceType = params.voiceType ?? DEFAULT_SONG_VOICE_TYPE;
  const hook = buildSongHook(params.seed);
  const chordPlan = buildSectionChordPlans(params.sections, params.seed);
  const sectionSummary = params.sections.map((s) => s.kind);
  return {
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

  return {
    title: song.title,
    vocalMelody: {
      events: [],
      voiceType: song.voiceType,
      adaptedRange: [60, 72],
    },
    chordSymbols: chords,
    lyricPlaceholders: lyrics,
    formSummary: { sections: formSections },
  };
}

export function summaryStringForManifest(song: CompiledSong): string {
  return `hook=${song.hook.id};sections=${song.sectionSummary.join(',')}`;
}
