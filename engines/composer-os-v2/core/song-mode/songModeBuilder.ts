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

/** Row-level tags for Wayne Shorter pools (foundation for future contextual selection). */
export interface WayneShorterRowTags {
  tension: 'low' | 'medium' | 'high';
  motion: 'static' | 'stepwise' | 'chromatic' | 'leap';
  cadential: boolean;
  pedal: boolean;
}

export interface WayneShorterChordPoolRow {
  chords: string[];
  tags: WayneShorterRowTags;
}

/** Row-level tags for Donald Fagen pools (Steely Dan–flavoured harmony scaffolding). */
export interface DonaldFagenRowTags {
  tension: 'low' | 'medium' | 'high';
  motion: 'chromatic' | 'stepwise' | 'functional' | 'slash';
  cadential: boolean;
  pedal: boolean;
}

export interface DonaldFagenChordPoolRow {
  chords: string[];
  tags: DonaldFagenRowTags;
}

/** Plain chord row or tagged row (Wayne Shorter / Donald Fagen). */
export type ChordPoolRow = string[] | WayneShorterChordPoolRow | DonaldFagenChordPoolRow;

function chordSymbolsFromPoolRow(row: ChordPoolRow): string[] {
  return Array.isArray(row) ? row : row.chords;
}

function resolveEraHarmonyDensityBias(era: string | undefined): number {
  const k = era?.trim().toLowerCase().replace(/-/g, '_');
  switch (k) {
    case 'swing':
      return -0.1;
    case 'bebop':
      return 0.15;
    case 'post_bop':
      return 0.2;
    case 'cool_jazz':
      return -0.05;
    case 'hard_bop':
      return 0.1;
    case 'fusion':
      return 0.1;
    case 'contemporary':
      return 0;
    default:
      return 0;
  }
}

function seededUnit(seed: number): number {
  let s = seed >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function chordComplexityScore(chord: string): number {
  const c = chord.toLowerCase();
  let score = 0;
  if (c.includes('alt')) score += 2.2;
  if (c.includes('b9') || c.includes('#9')) score += 1.4;
  if (c.includes('#11')) score += 1.2;
  if (c.includes('13sus') || c.includes('7sus')) score += 1.1;
  if (c.includes('13')) score += 0.8;
  if (c.includes('11')) score += 0.7;
  if (c.includes('maj9') || c.includes('m9')) score += 0.5;
  if (c.includes('maj7') || c.includes('m7')) score -= 0.35;
  if (c.includes('6/9') || c.includes('6')) score -= 0.45;
  return score;
}

function rowComplexityScore(row: ChordPoolRow): number {
  const chords = chordSymbolsFromPoolRow(row);
  if (chords.length === 0) return 0;
  const total = chords.reduce((sum, chord) => sum + chordComplexityScore(chord), 0);
  return total / chords.length;
}

function pickChordPoolRowIndex(sectionPool: ChordPoolRow[], seed: number, harmonyDensityBias: number): number {
  if (sectionPool.length <= 1) return 0;
  const roll = seededUnit(seed);
  if (harmonyDensityBias <= 0.1 && harmonyDensityBias >= -0.05) {
    return Math.floor(roll * sectionPool.length);
  }

  const scores = sectionPool.map((row) => rowComplexityScore(row));
  const wantsDense = harmonyDensityBias > 0.1;
  const weighted = scores.map((score) => {
    const preference = wantsDense ? score : -score;
    return Math.max(0.15, Math.exp(preference * 0.9));
  });
  const sum = weighted.reduce((a, b) => a + b, 0);
  let cursor = roll * sum;
  for (let i = 0; i < weighted.length; i++) {
    cursor -= weighted[i]!;
    if (cursor <= 0) return i;
  }
  return weighted.length - 1;
}

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

const SONGWRITER_CHORD_POOLS: Record<
  string,
  {
    verse: ChordPoolRow[];
    chorus: ChordPoolRow[];
    bridge: ChordPoolRow[];
    pre_chorus: ChordPoolRow[];
  }
> = {
  donald_fagen: {
    verse: [
      {
        chords: ['Gmaj7', 'F#7#9', 'Fmaj7', 'E7#9', 'Ebmaj7', 'D7#9', 'Dbmaj7', 'C13sus4'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Cmaj7#11', 'E7#9b13', 'Amaj9', 'D13sus4', 'Gmaj7#11', 'B7#9', 'Emaj9', 'A13sus4'],
        tags: {
          tension: 'high',
          motion: 'functional',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Bb6/9', 'A/C#', 'Gm11', 'F/A', 'Ebmaj7', 'D7#9', 'Cm9', 'F13sus4'],
        tags: {
          tension: 'medium',
          motion: 'slash',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Dm9', 'Fmaj7/A', 'G13', 'A7#9', 'Dm11', 'Bbmaj7', 'C13sus4', 'A7b13'],
        tags: {
          tension: 'medium',
          motion: 'functional',
          cadential: true,
          pedal: false,
        },
      },
    ],
    chorus: [
      {
        chords: ['Gmaj9', 'Am11', 'D13sus4', 'Gmaj7#11', 'Em9', 'A13', 'D9sus4', 'Gmaj6/9'],
        tags: {
          tension: 'medium',
          motion: 'functional',
          cadential: true,
          pedal: false,
        },
      },
      {
        chords: ['Cmaj7', 'Eb7#9', 'Abmaj7#11', 'B7#9', 'Emaj7', 'G7#9', 'Cmaj9', 'D13sus4'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Amaj9', 'G#7#9', 'Gmaj7', 'F#7#9', 'Fmaj7#11', 'E7b13', 'Ebmaj9', 'D13'],
        tags: {
          tension: 'high',
          motion: 'slash',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Fmaj7#11', 'E7#9', 'Am9', 'D13sus4', 'Gmaj6/9', 'F#7alt', 'Bm9', 'E13sus4'],
        tags: {
          tension: 'medium',
          motion: 'functional',
          cadential: true,
          pedal: false,
        },
      },
    ],
    bridge: [
      {
        chords: ['Cmaj7#11', 'E7#9', 'Amaj9', 'C#7#9', 'F#maj7', 'A7#9', 'Dmaj9', 'F#7#9'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Bbmaj7', 'G7#9b13', 'Cm9', 'Eb7#9', 'Abmaj7#11', 'B7#9', 'Emaj9', 'G#7#9'],
        tags: {
          tension: 'high',
          motion: 'functional',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Fmaj7/A', 'G13', 'Am9', 'D7#9b13', 'Gmaj7#11', 'B7#9', 'Em9', 'A13sus4'],
        tags: {
          tension: 'medium',
          motion: 'slash',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Ebmaj7', 'C7#9', 'Fm9', 'Ab7#9b13', 'Dbmaj7#11', 'E7#9', 'Abmaj9', 'B7#9'],
        tags: {
          tension: 'high',
          motion: 'functional',
          cadential: true,
          pedal: false,
        },
      },
    ],
    pre_chorus: [
      {
        chords: ['Am9', 'D13sus4', 'Gmaj7#11', 'B7#9', 'Em9', 'A7#9b13', 'Dmaj9', 'F#7#9'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Dm9', 'G13sus4', 'Cmaj7#11', 'E7#9', 'Am9', 'D7#9b13', 'Gmaj9', 'B7#9'],
        tags: {
          tension: 'high',
          motion: 'functional',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Gm9', 'C13sus4', 'Fmaj7#11', 'A7#9', 'Dm9', 'G7#9b13', 'Cmaj9', 'E7#9'],
        tags: {
          tension: 'medium',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Cm9', 'F13sus4', 'Bbmaj7#11', 'D7#9', 'Gm9', 'C7#9b13', 'Fmaj9', 'A7#9'],
        tags: {
          tension: 'high',
          motion: 'functional',
          cadential: true,
          pedal: false,
        },
      },
    ],
  },
  bacharach: {
    verse: [
      ['Cmaj9', 'Dm9', 'G13', 'Cmaj7/E'],
      ['Fmaj9', 'Gm9', 'C7b9', 'Fmaj7/A'],
      ['Am9', 'D7b9', 'Gmaj9', 'B7b13'],
      ['Cmaj7', 'Em7', 'A7b9', 'Dm9'],
    ],
    chorus: [
      ['Cmaj9', 'Am9', 'D9', 'Fm9'],
      ['Bbmaj9', 'Cm9', 'F13', 'Am9'],
      ['Dmaj9', 'Dmaj7/C#', 'Bm9', 'E7b9'],
      ['Gm9', 'C13', 'Fmaj9', 'Fmaj7/A'],
    ],
    bridge: [
      ['Ebmaj9', 'Fm9', 'Bb13', 'Ebmaj7/G'],
      ['Amaj9', 'Bm9', 'E13', 'Amaj7/C#'],
      ['Cmaj7', 'Em7', 'Am9', 'D7b9'],
      ['Fmaj7', 'Bm7b5', 'E7b9', 'Am9'],
    ],
    pre_chorus: [
      ['Dm9', 'G9sus4', 'Cmaj9', 'E7b9'],
      ['Gm9', 'C13', 'Fmaj9', 'A7b9'],
      ['Em9', 'A13', 'Dm9', 'G13'],
      ['Am9', 'D7b9', 'G13', 'Cmaj7/E'],
    ],
  },
  barry_harris: {
    verse: [
      ['C6', 'Ddim7', 'C6/E', 'Ddim7/F'],
      ['C6/G', 'Ddim7/Ab', 'G7b9', 'C6'],
      ['Cm6', 'Ddim7', 'Cm6/Eb', 'G7b9'],
      ['Dm6', 'Edim7', 'G7b9', 'C6'],
    ],
    chorus: [
      ['C6', 'Ddim7', 'Em7b5', 'A7b9'],
      ['Dm6', 'Edim7', 'G7b9', 'C6'],
      ['F6', 'Gdim7', 'F6/A', 'G7b9'],
      ['C6/E', 'F#dim7', 'G7b9', 'C6'],
    ],
    bridge: [
      ['Fm6', 'Gdim7', 'Cm6/G', 'G7b9'],
      ['C6', 'C6/B', 'A7b9', 'Dm6'],
      ['Gm6', 'Adim7', 'Gm6/Bb', 'G7b9'],
      ['Fm7b5', 'B7b9', 'Em6', 'A7b9'],
    ],
    pre_chorus: [
      ['C6/A', 'Ddim7/Ab', 'G7b9', 'C6'],
      ['Cm6', 'Ab7', 'G7b9', 'Cm6'],
      ['C6', 'Ddim7', 'G7b5', 'C6'],
      ['Dm6', 'G7b9', 'C6', 'Ddim7'],
    ],
  },
  ecm_chamber: {
    verse: [
      ['Cmaj7#11', 'Em9', 'Asus2', 'Gmaj9'],
      ['Bm9sus4', 'Em11', 'Cmaj7#11', 'Dadd9'],
      ['Em9', 'Gmaj7#11', 'Dadd9/F#', 'Cmaj7#11'],
      ['Gmaj9', 'D5', 'Em9', 'Cmaj7#11'],
    ],
    chorus: [
      ['Fmaj7#11', 'Cmaj7#11/G', 'Dm11', 'G7sus4'],
      ['Em9', 'Cmaj7#11', 'Gmaj9', 'Dmaj9'],
      ['Dmaj9', 'Cmaj7#11', 'Gmaj9', 'Em9'],
      ['Cmaj7#11', 'Em9', 'Dmaj9', 'Cmaj7#11'],
    ],
    bridge: [
      ['D5', 'Gmaj7#11/D', 'Aadd9/D', 'D5'],
      ['Em9', 'Bm9', 'Cmaj7#11', 'Gmaj7#11'],
      ['Bm9', 'Aadd9', 'Gmaj7#11', 'Dmaj9'],
      ['Fmaj7#11/G', 'Em9', 'Dadd9/A', 'Gmaj7#11'],
    ],
    pre_chorus: [
      ['Em9', 'Dmaj9', 'Cmaj7#11', 'Dadd9/A'],
      ['Gmaj9', 'D5', 'Em9', 'Dmaj9'],
      ['Bm9sus4', 'Cmaj7#11', 'Em9', 'Dadd9'],
      ['Em9', 'D5', 'Cmaj7#11', 'Em9'],
    ],
  },
  wayne_shorter: {
    verse: [
      {
        chords: [
          'Dm9',
          'Ebmaj7#11',
          'Abmaj9',
          'Bb13sus',
          'Cm11',
          'Db7alt',
          'Fmmaj7',
          'A7alt',
        ],
        tags: {
          tension: 'medium',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: [
          'Em11',
          'Fmaj7#11',
          'Bbmaj9',
          'C13sus',
          'Dm9',
          'Eb7alt',
          'Abmaj7#11',
          'G7alt',
        ],
        tags: {
          tension: 'medium',
          motion: 'stepwise',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: [
          'Am11',
          'Bbmaj7#11',
          'Ebmaj9',
          'F13sus',
          'Gm9',
          'Ab13sus',
          'Dbmaj7#11',
          'Bb7alt',
        ],
        tags: {
          tension: 'high',
          motion: 'leap',
          cadential: false,
          pedal: true,
        },
      },
      {
        chords: [
          'Gbmaj7#11',
          'Em11',
          'A7alt',
          'Dmaj9',
          'Cm11',
          'F7alt',
          'Bbmaj7#11',
          'Eb13sus',
        ],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
    ],
    chorus: [
      {
        chords: [
          'Cm9',
          'Bbmaj7#11',
          'Ebmaj9',
          'Dm11',
          'G7alt',
          'Cmaj7#11',
          'Fm11',
          'Bb13sus',
        ],
        tags: {
          tension: 'high',
          motion: 'stepwise',
          cadential: true,
          pedal: false,
        },
      },
      {
        chords: [
          'Am11',
          'Abmaj7#11',
          'Dbmaj9',
          'Gm11',
          'C7alt',
          'Fmmaj7',
          'Eb13sus',
          'Bb7alt',
        ],
        tags: {
          tension: 'medium',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: [
          'Fm11',
          'E7alt',
          'Amaj7#11',
          'Bm9',
          'E13sus',
          'Ebmaj7#11',
          'Abmaj9',
          'Db7alt',
        ],
        tags: {
          tension: 'high',
          motion: 'leap',
          cadential: true,
          pedal: false,
        },
      },
      {
        chords: [
          'Bm11',
          'Bb7alt',
          'Ebmaj7#11',
          'Fm9',
          'Ab13sus',
          'Gmaj7#11',
          'Cm11',
          'F7alt',
        ],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: true,
          pedal: false,
        },
      },
    ],
    bridge: [
      {
        chords: ['Gbmaj7#11', 'Em11', 'A7alt', 'Dmaj9', 'Cm11', 'F7alt', 'Bbmaj7#11', 'Eb13sus'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Fmmaj7', 'E7alt', 'Amaj7#11', 'Bm9', 'Bb7alt', 'Ebmaj7#11', 'Abmaj9', 'Db7alt'],
        tags: {
          tension: 'high',
          motion: 'leap',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Cm11', 'B7alt', 'Emaj7#11', 'F#m9', 'Bb13sus', 'Abmaj7#11', 'Dbmaj9', 'G7alt'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: true,
        },
      },
      {
        chords: ['Bm11', 'Bb7alt', 'Ebmaj7#11', 'Fm9', 'Ab13sus', 'Gmaj7#11', 'Cm11', 'F7alt'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: true,
          pedal: false,
        },
      },
    ],
    pre_chorus: [
      {
        chords: ['Am11', 'Ab7alt', 'Dbmaj7#11', 'Bbm9', 'Eb13sus', 'Dbmaj7#11', 'Gb7alt', 'Bmaj7#11'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Dm11', 'Db7alt', 'Gbmaj7#11', 'Ebm9', 'Ab13sus', 'Gbmaj7#11', 'B7alt', 'Emaj7#11'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Gm11', 'F#7alt', 'Bmaj7#11', 'G#m9', 'C#13sus', 'Bmaj7#11', 'E7alt', 'Amaj7#11'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
        },
      },
      {
        chords: ['Em11', 'Eb7alt', 'Abmaj7#11', 'Fm9', 'Bb13sus', 'Abmaj7#11', 'Db7alt', 'Gbmaj7#11'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: true,
          pedal: false,
        },
      },
    ],
  },
  pat_metheny: {
    verse: [
      ['Gmaj9', 'Dadd9', 'Aadd9', 'Esus4', 'Cmaj7#11', 'Gmaj9', 'Dadd9/F#', 'Aadd9'],
      ['Amaj9', 'Eadd9', 'Badd9', 'F#sus4', 'Dmaj7#11', 'Amaj9', 'Eadd9/G#', 'Badd9'],
      ['Dmaj9', 'Aadd9', 'Eadd9', 'Bsus4', 'Gmaj7#11', 'Dmaj9', 'Aadd9/C#', 'Eadd9'],
      ['Cmaj9', 'Gadd9', 'Dadd9', 'Asus4', 'Fmaj7#11', 'Cmaj9', 'Gadd9/B', 'Dadd9'],
    ],
    chorus: [
      ['Gmaj7#11', 'F#m9', 'Bm9', 'Em9', 'Amaj9', 'D13sus4', 'Gmaj9', 'Dadd9'],
      ['Amaj7#11', 'G#m9', 'C#m9', 'F#m9', 'Bmaj9', 'E13sus4', 'Amaj9', 'Eadd9'],
      ['Dmaj7#11', 'C#m9', 'F#m9', 'Bm9', 'Emaj9', 'A13sus4', 'Dmaj9', 'Aadd9'],
      ['Cmaj7#11', 'Bm9', 'Em9', 'Am9', 'Dmaj9', 'G13sus4', 'Cmaj9', 'Gadd9'],
    ],
    bridge: [
      ['Dadd9/A', 'Gadd9/A', 'Aadd9', 'Dadd9/A', 'Gmaj9/A', 'Fmaj7#11/A', 'Aadd9', 'Esus4/A'],
      ['Eadd9/B', 'Aadd9/B', 'Badd9', 'Eadd9/B', 'Amaj9/B', 'Gmaj7#11/B', 'Badd9', 'F#sus4/B'],
      ['Gadd9/D', 'Cadd9/D', 'Dadd9', 'Gadd9/D', 'Cmaj9/D', 'Bbmaj7#11/D', 'Dadd9', 'Asus4/D'],
      ['Aadd9/E', 'Dadd9/E', 'Eadd9', 'Aadd9/E', 'Dmaj9/E', 'Cmaj7#11/E', 'Eadd9', 'Bsus4/E'],
    ],
    pre_chorus: [
      ['F#m9', 'Bm9', 'Em9', 'A13sus4', 'Dmaj9', 'G#m9', 'C#m9', 'F#13sus4'],
      ['G#m9', 'C#m9', 'F#m9', 'B13sus4', 'Emaj9', 'A#m9', 'D#m9', 'G#13sus4'],
      ['Bm9', 'Em9', 'Am9', 'D13sus4', 'Gmaj9', 'C#m9', 'F#m9', 'B13sus4'],
      ['Am9', 'Dm9', 'Gm9', 'C13sus4', 'Fmaj9', 'Bm9', 'Em9', 'A13sus4'],
    ],
  },
  bill_evans: {
    verse: [
      ['Cmaj9', 'Am9', 'Dm9', 'G13'],
      ['Fmaj9', 'Dm9', 'Gm9', 'C13'],
      ['Gmaj9', 'Em9', 'Am9', 'D13'],
    ],
    chorus: [
      ['Cmaj7', 'Fmaj7', 'Bm7b5', 'E7alt'],
      ['Gmaj7', 'Cmaj7', 'F#m7b5', 'B7alt'],
    ],
    bridge: [
      ['Dm9', 'G13', 'Cmaj9', 'Fmaj7#11'],
      ['Am9', 'D13', 'Gmaj9', 'Cmaj7#11'],
    ],
    pre_chorus: [
      ['Dm9', 'G9sus', 'Cmaj9', 'Am9'],
    ],
  },
};

function chordSymbolsForSection(
  kind: SongSectionKind,
  seed: number,
  songwriterId?: string,
  harmonyDensityBias: number = 0
): string[] {
  const pool = SONGWRITER_CHORD_POOLS[songwriterId ?? ''];
  if (pool) {
    const sectionPool =
      kind === 'verse'
        ? pool.verse
        : kind === 'chorus'
          ? pool.chorus
          : kind === 'bridge'
            ? pool.bridge
            : kind === 'pre_chorus'
              ? pool.pre_chorus
              : pool.verse;
    const idx = pickChordPoolRowIndex(sectionPool, Math.abs(seed), harmonyDensityBias);
    const raw = sectionPool[idx] ?? pool.verse[0];
    return raw != null ? chordSymbolsFromPoolRow(raw) : ['Cmaj7', 'Am7', 'Fmaj7', 'G7'];
  }

  // Fallback: original hardcoded progressions
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

export function buildSectionChordPlans(
  sections: SongSectionPlan[],
  seed: number,
  songwriterId?: string,
  harmonyDensityBias: number = 0
): SectionChordPlan[] {
  /** Ordinal within verse / chorus so repeated sections (e.g. V-C-V-C×2) do not reuse the same pool row — `(order * 31)` aligns mod short pools when orders differ by 4. */
  let verseOrdinal = 0;
  let chorusOrdinal = 0;
  return sections.map((s) => {
    let ordinalBias = 0;
    if (s.kind === 'verse') ordinalBias = verseOrdinal++ * 997;
    else if (s.kind === 'chorus') ordinalBias = chorusOrdinal++ * 997;
    return {
      sectionOrder: s.order,
      sectionKind: s.kind,
      intensity: intensityForKind(s.kind),
      chordSymbols: chordSymbolsForSection(
        s.kind,
        seed + s.order * 31 + ordinalBias,
        songwriterId,
        harmonyDensityBias
      ),
    };
  });
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
  const eraHarmonyDensityBias = resolveEraHarmonyDensityBias(params.stylePairing?.era);
  const hook = buildSongHook(params.seed);
  const chordPlan = buildSectionChordPlans(
    params.sections,
    params.seed,
    resolution.primaryId,
    eraHarmonyDensityBias
  );
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
