/**
 * Composer OS V2 — Build compiled song + lead sheet contract from section plans (scaffold level).
 */

import { applySongwritingRules } from './applySongwritingRules';
import { resolveAuthorOverlay } from './authorOverlayResolver';
import { planChorusMetadata } from './chorusPlanner';
import { planHookMetadata } from './hookPlanner';
import { applyMotifAuthorityLayerToLeadMelody } from '../motif/sectionRecallEnforcer';
import { buildThemeGenome } from '../motif/themeGenomeBuilder';
import { scoreMotifSimilarity } from '../motif/motifSimilarityScorer';
import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import { buildFormSections } from '../composer/formController';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { flattenChordPlanToHarmonyBars, planLeadMelody } from './leadMelodyPlanner';
import { planMelodyBehaviour } from './melodyBehaviourPlanner';
import { resolveBeatlesChordPoolId } from './beatlesSlice';
import { resolveFelaKutiChordPoolId } from './felaKutiSlice';
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
import { chordSlotsForSectionHarmonicRhythm, type HarmonicRhythmProfile } from './songSectionPlanner';
import {
  createEraNormalizerDebugCounters,
  normalizeChordSymbolsForEra,
  type EraId,
} from '../harmony/eraChordNormalizer';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

declare module './songCompilationTypes' {
  interface SectionChordPlan {
    /** Serialized Wayne Shorter pool row tags when applicable; empty when untagged / non-Wayne. */
    chosenRowTags?: string[];
  }
}

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

/** Row-level tags for Frank Zappa pools (same scaffolding as Fagen + named vocabulary buckets). */
export interface FrankZappaRowTags {
  tension: 'low' | 'medium' | 'high';
  motion: 'chromatic' | 'stepwise' | 'functional' | 'slash';
  cadential: boolean;
  pedal: boolean;
  pool: '7alt' | 'm7b5' | 'maj7#11' | 'tritone_rooted' | 'doo_wop_clash';
  /** Row contract + runtime guard: no ii–V–I cadential chains in rolling triples. */
  noIiVi: true;
}

export interface FrankZappaChordPoolRow {
  chords: string[];
  tags: FrankZappaRowTags;
}

/** Joni Mitchell — open-tuning modal rows (drone colour + harmonic family bucket). */
export interface JoniMitchellRowTags {
  /** Open-string / pedal resonance emphasis (annotation + row biasing). */
  drone: boolean;
  pool: 'tonic' | 'subdominant' | 'dominant_sus' | 'polymodal';
  /** Row contract + runtime guard: no ii–V–I cadential chains in rolling triples. */
  noIiVi: true;
}

export interface JoniMitchellChordPoolRow {
  chords: string[];
  tags: JoniMitchellRowTags;
}

/** Plain chord row or tagged row (Wayne Shorter / Donald Fagen / Frank Zappa / Joni Mitchell). */
export type ChordPoolRow =
  | string[]
  | WayneShorterChordPoolRow
  | DonaldFagenChordPoolRow
  | FrankZappaChordPoolRow
  | JoniMitchellChordPoolRow;

function chordSymbolsFromPoolRow(row: ChordPoolRow): string[] {
  return Array.isArray(row) ? row : row.chords;
}

interface EraProfile {
  rhythmBias: number;
  harmonyDensityBias: number;
  syncopationBias: number;
  tempoTargetBpm: [number, number];
  preferredExtensions: string[];
  avoidedExtensions: string[];
  harmonicRhythm: HarmonicRhythmProfile;
  functionalStrength: 'strong' | 'medium' | 'weak';
}

function resolveEraProfile(era: string | undefined): EraProfile {
  const k = era?.trim().toLowerCase().replace(/-/g, '_');
  switch (k) {
    case 'swing':
      return {
        rhythmBias: -0.05,
        harmonyDensityBias: -0.15,
        syncopationBias: -0.1,
        tempoTargetBpm: [120, 220],
        preferredExtensions: ['6', 'maj6', '6/9', '7', '9', '7b9'],
        avoidedExtensions: ['7alt', '#11', 'quartal'],
        harmonicRhythm: 'medium',
        functionalStrength: 'strong',
      };
    case 'bebop':
      return {
        rhythmBias: 0.25,
        harmonyDensityBias: 0.2,
        syncopationBias: 0.25,
        tempoTargetBpm: [160, 300],
        preferredExtensions: ['7b9', '7#9', '7#11', '7b13', 'dim7', 'm7b5', 'maj7', '13'],
        avoidedExtensions: ['sus4', 'quartal', 'add9'],
        harmonicRhythm: 'fast',
        functionalStrength: 'strong',
      };
    case 'post_bop':
      return {
        rhythmBias: 0.15,
        harmonyDensityBias: 0.2,
        syncopationBias: 0.15,
        tempoTargetBpm: [60, 280],
        preferredExtensions: ['maj7#11', '7alt', '7sus', 'quartal', 'mMaj7', 'm7b5'],
        avoidedExtensions: ['6', 'maj6'],
        harmonicRhythm: 'variable',
        functionalStrength: 'medium',
      };
    case 'cool_jazz':
      return {
        rhythmBias: -0.15,
        harmonyDensityBias: -0.1,
        syncopationBias: -0.15,
        tempoTargetBpm: [90, 160],
        preferredExtensions: ['maj7', '6/9', 'm7', 'add9', 'maj7#11', 'mMaj7'],
        avoidedExtensions: ['7alt', '7b9', '7#9'],
        harmonicRhythm: 'slow',
        functionalStrength: 'medium',
      };
    case 'hard_bop':
      return {
        rhythmBias: 0.2,
        harmonyDensityBias: 0.15,
        syncopationBias: 0.2,
        tempoTargetBpm: [110, 220],
        preferredExtensions: ['7b9', '7#9', '7#11', '7b13', 'sus4', 'm7', '13'],
        avoidedExtensions: ['quartal', 'add9', 'mMaj7'],
        harmonicRhythm: 'fast',
        functionalStrength: 'strong',
      };
    case 'fusion':
      return {
        rhythmBias: 0.1,
        harmonyDensityBias: 0.1,
        syncopationBias: 0.05,
        tempoTargetBpm: [90, 200],
        preferredExtensions: ['m7', 'm9', 'm11', '7sus', 'maj7#11', '6/9'],
        avoidedExtensions: ['dim7', '7b9', 'bebop vocab'],
        harmonicRhythm: 'slow',
        functionalStrength: 'weak',
      };
    case 'contemporary':
      return {
        rhythmBias: 0,
        harmonyDensityBias: 0,
        syncopationBias: 0,
        tempoTargetBpm: [60, 280],
        preferredExtensions: [],
        avoidedExtensions: [],
        harmonicRhythm: 'variable',
        functionalStrength: 'medium',
      };
    default:
      return {
        rhythmBias: 0,
        harmonyDensityBias: 0,
        syncopationBias: 0,
        tempoTargetBpm: [60, 280],
        preferredExtensions: [],
        avoidedExtensions: [],
        harmonicRhythm: 'variable',
        functionalStrength: 'medium',
      };
  }
}

function normalizeEraId(era: string | undefined): EraId | null {
  if (!era) return null;
  const k = era.trim().toLowerCase().replace(/-/g, '_');
  if (
    k === 'swing' ||
    k === 'bebop' ||
    k === 'cool_jazz' ||
    k === 'hard_bop' ||
    k === 'post_bop' ||
    k === 'fusion' ||
    k === 'contemporary'
  ) {
    return k;
  }
  return null;
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

function extensionAffinityWeight(row: ChordPoolRow, eraProfile: EraProfile): number {
  const chords = chordSymbolsFromPoolRow(row);
  if (chords.length === 0) return 1;
  const lowered = chords.map((c) => c.toLowerCase());
  const preferred = eraProfile.preferredExtensions;
  const avoided = eraProfile.avoidedExtensions;
  const preferredHits =
    preferred.length > 0
      ? preferred.filter((token) => lowered.some((c) => c.includes(token.toLowerCase()))).length /
        preferred.length
      : 0;
  const avoidedHits =
    avoided.length > 0
      ? avoided.filter((token) => lowered.some((c) => c.includes(token.toLowerCase()))).length /
        avoided.length
      : 0;
  const boost = preferredHits > 0 ? 1 + 0.3 * preferredHits : 1;
  const penalty = avoidedHits > 0 ? 1 - 0.3 * avoidedHits : 1;
  return Math.max(0.15, boost * penalty);
}

/** Wayne pools only; `intro` surrogate = `pre_chorus` here (no dedicated SongSectionKind). */
function wayneChordPoolBiasMultiplier(
  row: ChordPoolRow,
  sectionKind: SongSectionKind | undefined,
  songwriterId: string | undefined
): number {
  if (songwriterId !== 'wayne_shorter' || sectionKind === undefined) return 1;
  if (Array.isArray(row) || !('tags' in row)) return 1;
  const tags = row.tags as WayneShorterRowTags;

  const openingLike = sectionKind === 'verse' || sectionKind === 'pre_chorus';
  const peakLike = sectionKind === 'chorus' || sectionKind === 'bridge';

  if (openingLike) {
    if (tags.pedal === true || tags.tension === 'low') return 1.5;
    return 1;
  }
  if (peakLike) {
    const emphasize =
      tags.tension === 'high' ||
      tags.tension === 'medium' ||
      tags.motion === 'chromatic' ||
      tags.motion === 'leap';
    if (emphasize) return 1.5;
    return 1;
  }
  return 1;
}

function chosenRowTagsFromPoolRow(row: ChordPoolRow | undefined): string[] {
  if (row == null || Array.isArray(row) || !('tags' in row)) return [];
  const t = row.tags as
    | WayneShorterRowTags
    | DonaldFagenRowTags
    | FrankZappaRowTags
    | JoniMitchellRowTags;
  const out: string[] = [];
  if ('tension' in t && (t as WayneShorterRowTags).tension) {
    out.push(`tension:${(t as WayneShorterRowTags).tension}`);
  }
  if ('motion' in t && (t as WayneShorterRowTags).motion) {
    out.push(`motion:${(t as WayneShorterRowTags).motion}`);
  }
  if ('cadential' in t && t.cadential) out.push('cadential');
  if ('pedal' in t && t.pedal) out.push('pedal');
  if ('drone' in t && typeof (t as JoniMitchellRowTags).drone === 'boolean') {
    out.push(`drone:${(t as JoniMitchellRowTags).drone ? 'true' : 'false'}`);
  }
  if ('pool' in t && typeof (t as { pool?: string }).pool === 'string') {
    out.push(`pool:${(t as { pool: string }).pool}`);
  }
  if ('noIiVi' in t && (t as { noIiVi?: boolean }).noIiVi === true) {
    out.push('no_ii_v_i');
  }
  return out;
}

function pickChordPoolRowIndex(
  sectionPool: ChordPoolRow[],
  seed: number,
  eraProfile: EraProfile,
  songwriterId?: string,
  sectionKind?: SongSectionKind
): number {
  if (sectionPool.length <= 1) return 0;
  const roll = seededUnit(seed);
  const harmonyDensityBias = eraProfile.harmonyDensityBias;

  let weights: number[];
  if (harmonyDensityBias <= 0.1 && harmonyDensityBias >= -0.05) {
    weights = sectionPool.map(() => 1);
  } else {
    const scores = sectionPool.map((row) => rowComplexityScore(row));
    const wantsDense = harmonyDensityBias > 0.1;
    weights = scores.map((score, idx) => {
      const preference = wantsDense ? score : -score;
      const base = Math.max(0.15, Math.exp(preference * 0.9));
      const affinity = extensionAffinityWeight(sectionPool[idx]!, eraProfile);
      return Math.max(0.15, base * affinity);
    });
  }

  const biased = weights.map((w, idx) =>
    w * wayneChordPoolBiasMultiplier(sectionPool[idx]!, sectionKind, songwriterId)
  );

  const sum = biased.reduce((a, b) => a + b, 0);
  let cursor = roll * sum;
  for (let i = 0; i < biased.length; i++) {
    cursor -= biased[i]!;
    if (cursor <= 0) return i;
  }
  return biased.length - 1;
}

function applyHarmonicRhythmToRow(
  chords: string[],
  harmonicRhythm: HarmonicRhythmProfile,
  seed: number
): string[] {
  if (chords.length !== 4) return [...chords];
  const slotMode = chordSlotsForSectionHarmonicRhythm(harmonicRhythm);
  if (slotMode === 4) return [...chords];
  if (slotMode === 1) {
    const anchor = chords[Math.abs(seed) % chords.length]!;
    return [anchor, anchor, anchor, anchor];
  }
  const a = chords[0]!;
  const b = chords[1]!;
  const c = chords[3]!;
  return seed % 2 === 0 ? [a, b, b, c] : [a, a, b, c];
}

const ROOT_AT_START_POOL = /^([A-G](?:#|b)?)/i;

const PC_TO_SHARP_POOL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpNamePool(pc: number): string {
  return PC_TO_SHARP_POOL[((pc % 12) + 12) % 12]!;
}

function harmonyHeadSymbol(sym: string): string {
  const hp = parseChordSymbol(sym).harmonyPart;
  return hp.includes('/') ? hp.slice(0, hp.indexOf('/')) : hp;
}

function harmonyRootPcPool(sym: string): number | undefined {
  const head = harmonyHeadSymbol(sym);
  const m = head.trim().match(ROOT_AT_START_POOL);
  return m?.[1] ? noteNameToPitchClass(m[1]) : undefined;
}

function isIiMinorSeventhLike(sym: string): boolean {
  const head = harmonyHeadSymbol(sym);
  const tl = head.toLowerCase();
  if (/maj|dim|ø|aug|sus|alt|quartal/.test(tl)) return false;
  if (/m7b5|half\s*-?\s*dim/.test(tl)) return false;
  return /\bm(?!aj)|min/.test(tl);
}

function isVDominantSeventhFamily(sym: string): boolean {
  const head = harmonyHeadSymbol(sym);
  const tl = head.toLowerCase();
  if (/maj7|mmaj|dim|ø|aug/.test(tl)) return false;
  if (/\bm(?!aj)/.test(tl)) return false;
  return /\b7|9|11|13|alt/.test(tl) || /([^a-z]|^)7([^a-z0-9]|$)/.test(tl);
}

function isIMajorTonicLike(sym: string): boolean {
  const head = harmonyHeadSymbol(sym);
  const tl = head.toLowerCase();
  if (/\bm(?!aj)|dim|ø/.test(tl)) return false;
  if (/alt|sus/.test(tl)) return false;
  return (
    /^[a-g][#b]?$/i.test(head.trim()) ||
    /\bmaj|Δ|6|add/.test(tl) ||
    (!/\b7\b/.test(tl) && !/\bm/.test(tl))
  );
}

function isMajorKeyIiViTriple(a: string, b: string, c: string): boolean {
  const ra = harmonyRootPcPool(a);
  const rb = harmonyRootPcPool(b);
  const rc = harmonyRootPcPool(c);
  if (ra === undefined || rb === undefined || rc === undefined) return false;
  if ((rb - ra + 12) % 12 !== 5) return false;
  if ((rc - rb + 12) % 12 !== 5) return false;
  return isIiMinorSeventhLike(a) && isVDominantSeventhFamily(b) && isIMajorTonicLike(c);
}

/** Blocks rolling major-key ii–V–I cadences for Frank Zappa / Bartók chord scaffolding (post rhythm shaping). */
export function breakFrankZappaIiViProgressions(chords: readonly string[], seed: number): string[] {
  if (chords.length < 3) return [...chords];
  const out = [...chords];
  let salt = seed >>> 0;
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 10) {
    changed = false;
    for (let i = 0; i <= out.length - 3; i++) {
      const a = out[i]!;
      const b = out[i + 1]!;
      const c = out[i + 2]!;
      if (!isMajorKeyIiViTriple(a, b, c)) continue;
      const rb = harmonyRootPcPool(b);
      const rc = harmonyRootPcPool(c);
      if (rb === undefined) continue;
      salt = (salt * 1664525 + 1013904223) >>> 0;
      const mode = salt % 3;
      if (mode === 0) {
        out[i + 1] = `${pitchClassToSharpNamePool((rb + 6) % 12)}7alt`;
      } else if (mode === 1 && rc !== undefined) {
        out[i + 2] = `${pitchClassToSharpNamePool(rc)}maj7#11`;
      } else {
        out[i + 1] = `${pitchClassToSharpNamePool(rb)}7sus4`;
      }
      changed = true;
    }
  }
  return out;
}

/**
 * True when any rolling three-bar window reads as a textbook major-key ii–V–I using the same classifier as
 * {@link breakFrankZappaIiViProgressions} (Song Mode pool scaffolding guard).
 */
export function frankZappaIiViRollingTriplePresent(bars: readonly string[]): boolean {
  if (bars.length < 3) return false;
  for (let i = 0; i <= bars.length - 3; i++) {
    if (isMajorKeyIiViTriple(bars[i]!, bars[i + 1]!, bars[i + 2]!)) return true;
  }
  return false;
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
  stevie_wonder: {
    verse: [
      ['Dm7', 'G7(13)', 'Cmaj7', 'F7sus4', 'Em7(9)', 'A7(b9)', 'D7(#5)', 'G7sus4'],
      ['Am7', 'D7(13)', 'Gmaj7', 'C7sus4', 'Bm7(9)', 'E7(b5)', 'A7sus4', 'D7(b9)'],
      ['Gm7', 'C9sus4', 'Fmaj7', 'Bb7(13)', 'Am7(9)', 'D7(b5)', 'G13', 'C7(#5)'],
      ['Fmaj7', 'Bb7sus4', 'Ebm7(9)', 'Ab13', 'Dbmaj7', 'C7(13)', 'Fm7', 'Bb7(b9)'],
    ],
    chorus: [
      ['Cmaj7', 'Am7(9)', 'D7(13)', 'G7sus4', 'C6/9', 'F#m7b5', 'B7(#5)', 'E7sus4'],
      ['Bbmaj7', 'Gm7', 'C7(13)', 'F9sus4', 'Bb13', 'Eb7(b5)', 'Ab9', 'Dbmaj7'],
      ['Gmaj7', 'Em7(9)', 'A7sus4', 'D7(#5)', 'G13', 'Cm7(9)', 'F7(b9)', 'Bb7sus4'],
      ['Ebmaj7', 'Cm7', 'F7(13)', 'Bb7sus4', 'Eb9', 'Am7b5', 'D7(b9)', 'G7(13)'],
    ],
    bridge: [
      ['D7(9)', 'Eb7(9b5)', 'D7(9)', 'C#7(b5)', 'C7(9sus4)', 'B7(#5)', 'Bbm7(9)', 'A7(13)'],
      ['G7(9)', 'Ab7(9b5)', 'G7(9)', 'F#7(b5)', 'F7(9sus4)', 'E7(#5)', 'Ebm7(9)', 'D7(13)'],
      ['C7(9)', 'Db7(9b5)', 'C7(9)', 'B7(b5)', 'Bb9sus4', 'A7(#5)', 'Am7(9)', 'G7sus4'],
      ['F7(9)', 'Gb7(9b5)', 'F7(9)', 'E7(b5)', 'Eb9sus4', 'D7(#5)', 'Dm7(9)', 'C7(13)'],
    ],
    pre_chorus: [
      ['Am7(9)', 'D7(13)', 'G7sus4', 'Cmaj9', 'Fm7', 'Bb7(b9)', 'Eb13', 'Ab7sus4'],
      ['Dm7', 'G7(#5)', 'Cmaj7', 'F7sus4', 'Bm7b5', 'E7(9b5)', 'A13', 'D7sus4'],
      ['Gm7(9)', 'C7(13)', 'Fmaj7', 'Bb7sus4', 'Ebm7(9)', 'Ab7(b5)', 'Db9', 'Gbmaj7'],
      ['Em7', 'A7sus4', 'D7(13)', 'G7(b9)', 'Cm7(9)', 'F7(#5)', 'Bb9sus4', 'Eb7(13)'],
    ],
  },
  radiohead: {
    verse: [
      ['Am', 'Dbmaj7', 'Eb6', 'Fm'],
      ['Cm', 'Abmaj7', 'Fm', 'Gm'],
      ['Dm', 'Bb', 'Fmaj7', 'Gm'],
      ['Em', 'Cmaj7', 'Am', 'Dm'],
    ],
    chorus: [
      ['F', 'Dm', 'Bbm', 'C'],
      ['G', 'Em', 'Cm', 'Dm'],
      ['Ebmaj7', 'Cm', 'Ab', 'Bb'],
      ['Am', 'Fmaj7', 'Dm', 'Gm'],
    ],
    bridge: [
      ['Fm', 'Dbmaj7', 'Eb', 'Bb'],
      ['Gm', 'Eb', 'Bb', 'Fm'],
      ['Bm', 'G', 'D', 'A'],
      ['Cm', 'Ab', 'Eb', 'Fm'],
    ],
    pre_chorus: [
      ['Am', 'Dm', 'G', 'C'],
      ['Bm', 'Em', 'A', 'D'],
      ['Cm', 'Fm', 'Bb', 'Eb'],
      ['Em', 'Am', 'D', 'G'],
    ],
  },
  /**
   * Joni Mitchell — modal sus/add9/6(9) pools (Dorian / Aeolian / Mixolydian bias; non-functional).
   * TONIC / SUBDOMINANT / DOMINANT(sus) / POLYMODAL families; `drone` marks open-string pedal character.
   * Rolling ii–V–I triples broken in {@link chordSymbolsForSection} (same guard as Frank Zappa).
   * Numeric tuning fingerings live in slice metadata (`joniMitchellTuningPatternByBar`), not here.
   */
  joni_mitchell: {
    verse: [
      {
        chords: ['Dsus2', 'Dadd9', 'G6', 'Em7'],
        tags: { drone: true, pool: 'tonic', noIiVi: true },
      },
      {
        chords: ['D6/9', 'Dmaj7add9', 'Gsus2', 'Em9'],
        tags: { drone: true, pool: 'tonic', noIiVi: true },
      },
      {
        chords: ['Gadd9', 'Cadd9', 'Cmaj7add9', 'Am(sus2)'],
        tags: { drone: true, pool: 'tonic', noIiVi: true },
      },
      {
        chords: ['Gadd9', 'Gsus4', 'Fmaj7add9', 'Dmadd9'],
        tags: { drone: false, pool: 'subdominant', noIiVi: true },
      },
      {
        chords: ['Bbmaj7', 'Bbsus2', 'Em7', 'Cadd9'],
        tags: { drone: false, pool: 'subdominant', noIiVi: true },
      },
      {
        chords: ['Asus4', 'E7sus4', 'G7sus4', 'A9sus4'],
        tags: { drone: false, pool: 'dominant_sus', noIiVi: true },
      },
      {
        chords: ['Dsus4add9', 'Gadd4add9', 'C6/9', 'Bm7'],
        tags: { drone: true, pool: 'polymodal', noIiVi: true },
      },
    ],
    chorus: [
      {
        chords: ['Dadd9', 'G6/9', 'Cmaj7add9', 'Em9'],
        tags: { drone: true, pool: 'tonic', noIiVi: true },
      },
      {
        chords: ['Gsus2', 'Gadd9', 'Am7', 'Em7'],
        tags: { drone: true, pool: 'tonic', noIiVi: true },
      },
      {
        chords: ['Fadd2', 'Bbmaj7', 'Dmadd9', 'Gadd9'],
        tags: { drone: false, pool: 'subdominant', noIiVi: true },
      },
      {
        chords: ['Asus4', 'A7sus4', 'Esus4', 'B7sus4'],
        tags: { drone: false, pool: 'dominant_sus', noIiVi: true },
      },
      {
        chords: ['F/G', 'D/C', 'Bm9', 'C6/9'],
        tags: { drone: false, pool: 'polymodal', noIiVi: true },
      },
    ],
    bridge: [
      {
        chords: ['Bm7', 'Em7', 'Dsus2', 'Gsus2'],
        tags: { drone: true, pool: 'tonic', noIiVi: true },
      },
      {
        chords: ['Cmaj7sus2', 'Fmaj7add9', 'Bbsus2', 'Em9'],
        tags: { drone: false, pool: 'subdominant', noIiVi: true },
      },
      {
        chords: ['A5add9', 'Dsus4add9', 'Gadd4add9', 'Bm9'],
        tags: { drone: true, pool: 'polymodal', noIiVi: true },
      },
      {
        chords: ['E7sus4', 'A9sus4', 'G7sus4', 'Dadd9'],
        tags: { drone: false, pool: 'dominant_sus', noIiVi: true },
      },
    ],
    pre_chorus: [
      {
        chords: ['Gsus2', 'Cadd9', 'D6/9', 'Em7'],
        tags: { drone: true, pool: 'tonic', noIiVi: true },
      },
      {
        chords: ['Asus4', 'Esus4', 'Dmadd9', 'Gadd9'],
        tags: { drone: false, pool: 'subdominant', noIiVi: true },
      },
      {
        chords: ['F/G', 'C6/9', 'Am(sus2)', 'Dsus2'],
        tags: { drone: true, pool: 'polymodal', noIiVi: true },
      },
      {
        chords: ['B7sus4', 'E7sus4', 'A7sus4', 'G7sus4'],
        tags: { drone: false, pool: 'dominant_sus', noIiVi: true },
      },
    ],
  },
  james_brown: {
    verse: [
      ['E9', 'E9', 'E9', 'E9'],
      ['E9', 'E9', 'D7', 'D7'],
      ['F9', 'F9', 'F9', 'F9'],
      ['Bb9', 'Bb9', 'Bb9', 'Bb9'],
    ],
    chorus: [
      ['E9', 'E9', 'E9', 'E9'],
      ['A9', 'A9', 'A9', 'A9'],
      ['E9', 'E9', 'D7', 'D7'],
      ['Bb9', 'Bb9', 'G7', 'G7'],
    ],
    bridge: [
      ['D7', 'G7', 'D7', 'D7'],
      ['E9', 'A9', 'E9', 'E9'],
    ],
    pre_chorus: [
      ['E9', 'E9', 'E9', 'E9'],
      ['E9', 'E9', 'D7', 'D7'],
      ['F9', 'F9', 'F9', 'F9'],
      ['Bb9', 'Bb9', 'Bb9', 'Bb9'],
    ],
  },
  brian_wilson: {
    verse: [
      ['Cmaj7', 'Cadd9', 'Am7', 'Fmaj7'],
      ['Gmaj7', 'Bm7b5', 'E7', 'Am7'],
      ['Fmaj7', 'Fm6', 'C/E', 'Dm7'],
      ['Bbmaj7', 'Gm7', 'C6', 'Fmaj7'],
      ['C', 'A7', 'Dm7', 'Gsus2'],
      ['Dm7', 'G7', 'Cmaj7', 'Am7'],
      ['F', 'Fm', 'Bb', 'Ebmaj7'],
      ['G', 'Em7', 'Am7', 'D7'],
    ],
    chorus: [
      ['Cmaj9', 'Am7', 'Fmaj7', 'G7'],
      ['Fmaj7', 'Dm7', 'Bb', 'C'],
      ['Gmaj7', 'Em7', 'Am7', 'D7'],
      ['C6', 'A7', 'Dm7', 'G7'],
      ['Abmaj7', 'Fm7', 'Bb', 'Ebmaj7'],
      ['Dmaj7', 'Bm7b5', 'E7', 'A7'],
      ['G', 'Gaug', 'C/G', 'F/G'],
      ['Bbmaj7', 'Gm7', 'C7', 'Fadd9'],
    ],
    bridge: [
      ['Am7', 'Adim7', 'Abmaj7', 'Gm7'],
      ['Cmaj7', 'Caug', 'F/C', 'Dm7'],
      ['Bm7b5', 'E7', 'Am9', 'Fmaj7'],
      ['Gdim7', 'G7', 'Cmaj9', 'Am9'],
      ['Dmaj7', 'F#m7b5', 'B7', 'Em9'],
      ['Bb', 'Gm', 'C', 'F'],
      ['Ebmaj7', 'Cm7', 'Ab', 'Bb'],
      ['F#dim7', 'B7', 'Em7', 'A7'],
    ],
    pre_chorus: [
      ['Fmaj7', 'F#dim7', 'G7', 'Cmaj7'],
      ['Dm7', 'G7', 'C/E', 'Am7'],
      ['Bbmaj7', 'Gm7', 'C9', 'F6'],
      ['Em7', 'A7', 'Dmaj7', 'Bm7'],
    ],
  },
  sonic_youth: {
    verse: [
      ['Emadd9', 'Emadd9/D', 'Gsus2', 'Asus4'],
      ['Asus4', 'Emadd9', 'Emadd9/D', 'Gsus2'],
    ],
    chorus: [
      ['Cmaj7#11', 'Cmaj7#11/G', 'F#7sus4', 'B7alt'],
      ['F#7sus4', 'B7alt', 'Emadd9', 'Cmaj7#11'],
    ],
    bridge: [
      ['Emadd9', 'G/E', 'Dsus4/A', 'A7sus4'],
      ['A7sus4', 'Cadd9', 'Bbmaj7#11', 'Asus2'],
    ],
    pre_chorus: [
      ['Cadd9', 'Bbmaj7#11', 'Asus2', 'Emadd9'],
      ['Emadd9', 'Cadd9', 'Bbmaj7#11', 'Asus2'],
    ],
  },
  frank_zappa: {
    verse: [
      {
        chords: ['Db7alt', 'G7alt', 'C#7alt', 'F#7alt', 'B7alt', 'F7alt', 'Bb7alt', 'E7alt'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: '7alt',
          noIiVi: true,
        },
      },
      {
        chords: ['Bm7b5', 'Em7b5', 'Am7b5', 'Dm7b5', 'Gm7b5', 'Cm7b5', 'Fm7b5', 'Bbm7b5'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'm7b5',
          noIiVi: true,
        },
      },
      {
        chords: ['Cmaj7#11', 'Gmaj7#11', 'Dmaj7#11', 'Amaj7#11', 'Emaj7#11', 'Bmaj7#11', 'F#maj7#11', 'Dbmaj7#11'],
        tags: {
          tension: 'medium',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'maj7#11',
          noIiVi: true,
        },
      },
      {
        chords: ['G7alt/Db', 'Db7alt/G', 'Cmaj7#11/F#', 'F#7alt/C', 'Bb7alt/E', 'E7alt/Bb', 'Abmaj7#11/D', 'D7alt/Ab'],
        tags: {
          tension: 'high',
          motion: 'slash',
          cadential: false,
          pedal: true,
          pool: 'tritone_rooted',
          noIiVi: true,
        },
      },
      {
        chords: ['C', 'Db7alt', 'F', 'G7alt', 'Bb', 'E7alt', 'Eb', 'A7alt'],
        tags: {
          tension: 'medium',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'doo_wop_clash',
          noIiVi: true,
        },
      },
    ],
    chorus: [
      {
        chords: ['Ab7alt', 'D7alt', 'G7alt', 'C#7alt', 'F#7alt', 'B7alt', 'E7alt', 'A7alt'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: '7alt',
          noIiVi: true,
        },
      },
      {
        chords: ['F#m7b5', 'Bm7b5', 'Em7b5', 'Am7b5', 'Dm7b5', 'Gm7b5', 'Cm7b5', 'F#m7b5'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'm7b5',
          noIiVi: true,
        },
      },
      {
        chords: ['Ebmaj7#11', 'Abmaj7#11', 'Dbmaj7#11', 'Gbmaj7#11', 'Bmaj7#11', 'Emaj7#11', 'Amaj7#11', 'Dmaj7#11'],
        tags: {
          tension: 'medium',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'maj7#11',
          noIiVi: true,
        },
      },
      {
        chords: ['A7alt/Eb', 'Eb7alt/A', 'Dmaj7#11/Ab', 'Ab7alt/D', 'G7alt/Db', 'Db7alt/G', 'F#maj7#11/C', 'C7alt/F#'],
        tags: {
          tension: 'high',
          motion: 'slash',
          cadential: false,
          pedal: true,
          pool: 'tritone_rooted',
          noIiVi: true,
        },
      },
      {
        chords: ['G', 'Ab7alt', 'C', 'D7alt', 'F', 'B7alt', 'Bb', 'F#7alt'],
        tags: {
          tension: 'medium',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'doo_wop_clash',
          noIiVi: true,
        },
      },
    ],
    bridge: [
      {
        chords: ['Gb7alt', 'Cb7alt', 'F7alt', 'Bb7alt', 'Eb7alt', 'Ab7alt', 'Db7alt', 'G7alt'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: '7alt',
          noIiVi: true,
        },
      },
      {
        chords: ['Ebm7b5', 'Abm7b5', 'Dbm7b5', 'Gbm7b5', 'Bm7b5', 'Em7b5', 'Am7b5', 'Dm7b5'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'm7b5',
          noIiVi: true,
        },
      },
      {
        chords: ['Gbmaj7#11', 'Cbmaj7#11', 'Fbmaj7#11', 'Bmaj7#11', 'Fmaj7#11', 'Bbmaj7#11', 'Ebmaj7#11', 'Abmaj7#11'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'maj7#11',
          noIiVi: true,
        },
      },
      {
        chords: ['Bb7alt/F', 'F7alt/Bb', 'Ebmaj7#11/A', 'A7alt/Eb', 'Abmaj7#11/D', 'D7alt/Ab', 'Gbmaj7#11/C', 'C7alt/Gb'],
        tags: {
          tension: 'high',
          motion: 'slash',
          cadential: false,
          pedal: true,
          pool: 'tritone_rooted',
          noIiVi: true,
        },
      },
      {
        chords: ['Db', 'G7alt', 'Gb', 'C7alt', 'Bb', 'F#7alt', 'Ab', 'D7alt'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'doo_wop_clash',
          noIiVi: true,
        },
      },
    ],
    pre_chorus: [
      {
        chords: ['Gb7alt', 'C7alt', 'F#7alt', 'B7alt', 'E7alt', 'A7alt', 'D7alt', 'G7alt'],
        tags: {
          tension: 'high',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: '7alt',
          noIiVi: true,
        },
      },
      {
        chords: ['Cm7b5', 'Fm7b5', 'Bbm7b5', 'Ebm7b5', 'Abm7b5', 'Dbm7b5', 'Gbm7b5', 'Bm7b5'],
        tags: {
          tension: 'medium',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'm7b5',
          noIiVi: true,
        },
      },
      {
        chords: ['Bbmaj7#11', 'Fmaj7#11', 'Cmaj7#11', 'Gmaj7#11', 'Dmaj7#11', 'Amaj7#11', 'Emaj7#11', 'Bmaj7#11'],
        tags: {
          tension: 'medium',
          motion: 'stepwise',
          cadential: false,
          pedal: false,
          pool: 'maj7#11',
          noIiVi: true,
        },
      },
      {
        chords: ['F7alt/B', 'B7alt/F', 'Ebmaj7#11/A', 'A7alt/Eb', 'Dmaj7#11/G', 'G7alt/D', 'Cbmaj7#11/F', 'F7alt/Cb'],
        tags: {
          tension: 'high',
          motion: 'slash',
          cadential: false,
          pedal: true,
          pool: 'tritone_rooted',
          noIiVi: true,
        },
      },
      {
        chords: ['Eb', 'F#7alt', 'Ab', 'G7alt', 'Db', 'A7alt', 'Gb', 'B7alt'],
        tags: {
          tension: 'medium',
          motion: 'chromatic',
          cadential: false,
          pedal: false,
          pool: 'doo_wop_clash',
          noIiVi: true,
        },
      },
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
  debussy: {
    verse: [
      ['Cmaj9', 'F#aug', 'G9', 'C6/9'],
      ['Dm7', 'G13', 'Cmaj7#5', 'A7sus4'],
      ['Bbmaj7', 'E7(b5#5)', 'Am9', 'D9(no11)'],
    ],
    chorus: [
      ['Ebmaj7', 'Gbaug', 'Fm7', 'Bb13'],
      ['Gmaj9', 'E7sus4', 'Am6', 'D7(#5)'],
    ],
    bridge: [
      ['Fmaj7#11', 'B7alt', 'Em9', 'A13'],
      ['Gm11', 'C9(no11)', 'F6/9', 'Dbmaj7(#5)'],
    ],
    pre_chorus: [
      ['Em7', 'A9', 'Dm(add2)', 'G7sus4'],
    ],
  },
  cole_porter: {
    verse: [
      ['Cmaj9', 'C#dim7', 'Dm7', 'G7'],
      ['Fmaj7', 'Fm7', 'Bb7', 'Ebmaj7'],
      ['Am7', 'Adim7', 'Dm7', 'G7'],
      ['Em7', 'Ebdim7', 'Dm7', 'G7'],
    ],
    chorus: [
      ['C6', 'Cm7', 'F7', 'Fm6'],
      ['Abmaj7', 'Gm7', 'C7', 'Fmaj7'],
      ['Dm7', 'G7', 'Em7', 'A7'],
    ],
    bridge: [
      ['Fm7', 'Bb7', 'Ebmaj7', 'Edim7'],
      ['Dm7b5', 'G7', 'Cmaj7', 'C7'],
      ['Gmaj7', 'G#dim7', 'Am7', 'D7'],
    ],
    pre_chorus: [
      ['Em7', 'A7', 'Dm7', 'G7'],
      ['Bm7b5', 'E7', 'Am7', 'D7'],
    ],
  },
  bartok_mikrokosmos: {
    verse: [
      ['Am(add9)', 'Fquartal', 'Dm(add9)', 'Gquartal'],
      ['Em11', 'Cmaj7#11', 'Am(add9)', 'B7alt'],
    ],
    chorus: [
      ['Fm11', 'Dbmaj7#11', 'Cm11', 'G7alt'],
      ['Gm11', 'Ebmaj7(add9)', 'Bbmaj7#11', 'Fm11'],
    ],
    bridge: [
      ['Bm11', 'Equartal', 'Gmaj7#11', 'C7(b9,b13)'],
      ['Am11', 'Fmaj7#11', 'Dm(add9)', 'E7alt'],
    ],
    pre_chorus: [
      ['Dm(add9)', 'Gquartal', 'Cmaj7#11', 'Am11'],
    ],
  },
  bartok_string_quartet: {
    verse: [
      ['Cm11', 'Abadd9', 'Ebmaj7', 'Fm11'],
      ['Gm11', 'Ebmaj7(add9)', 'Bbmaj7#11', 'Fm11'],
    ],
    chorus: [
      ['Dm11', 'Bbmaj7(add9)', 'Gm11', 'C7alt'],
      ['Am11', 'Fmaj7#11', 'Dm11', 'G7(b9)'],
    ],
    bridge: [
      ['Bm7(b5)', 'Equartal', 'Am11', 'D7alt'],
      ['Fm11', 'Dbmaj7', 'Cm11', 'Bb7alt'],
    ],
    pre_chorus: [
      ['Gm11', 'Cm11', 'Abmaj7', 'Ebmaj7(add9)'],
    ],
  },
  bartok_music_for_strings: {
    verse: [
      ['Dm11', 'G7(b9,b13)', 'Cmaj7#11', 'Am11'],
      ['Bbmaj7#11', 'Eb9(b13)', 'Abmaj7', 'Fm11'],
    ],
    chorus: [
      ['Em11', 'A7alt', 'Dmaj7#11', 'Bm11'],
      ['Gm11', 'C7alt', 'Fm11', 'Bbmaj7#11'],
    ],
    bridge: [
      ['Bm11', 'Equartal', 'Am(add9)', 'D7alt'],
      ['Cm11', 'Abmaj7', 'Fm11', 'G7alt'],
    ],
    pre_chorus: [
      ['Am11', 'Dm11', 'Gquartal', 'Cmaj7#11'],
    ],
  },
  gershwin_song_aaba: {
    verse: [
      ['Cmaj7', 'Dm7', 'G7(9)', 'C6/9'],
      ['Am7', 'D7b9', 'Gaug', 'G7#5#9'],
    ],
    chorus: [
      ['Fmaj7', 'Fm6', 'Em7b5', 'A7b9'],
      ['Bb6/9', 'Bdim7', 'C6', 'Cmaj7'],
    ],
    bridge: [
      ['E7', 'E7b9', 'Am7', 'Am6'],
      ['Abdim7', 'G13', 'Cmaj7', 'Gaug'],
    ],
    pre_chorus: [
      ['Dm7', 'G13', 'Em7b5', 'A7#5#9'],
    ],
  },
  gershwin_rhapsody: {
    verse: [
      ['Ebmaj7', 'Edim7', 'Fm7', 'Bb7(9)'],
      ['Abmaj7', 'Ao7', 'Bb7b9', 'Eb6'],
    ],
    chorus: [
      ['Gm7', 'C7#5#9', 'Fm7', 'Bb7b9'],
      ['Ebmaj7', 'C7alt', 'Fm9', 'Bb13'],
    ],
    bridge: [
      ['Am7b5', 'D7b9', 'Gm7', 'C7alt'],
      ['F#dim7', 'B7', 'Em7', 'A7'],
    ],
    pre_chorus: [
      ['Cm7', 'F9', 'Bbmaj7', 'Bb7#11'],
    ],
  },
  gershwin_rhythm_changes: {
    verse: [
      ['Bbmaj7', 'G7', 'Cm7', 'F7'],
      ['Bbmaj7', 'Bb7', 'Ebmaj7', 'Eo7'],
    ],
    chorus: [
      ['Bbmaj7', 'Bo7', 'Cm7', 'F7'],
      ['Fm7', 'Bb7', 'Ebmaj7', 'Ab7'],
    ],
    bridge: [
      ['Dm7', 'G7', 'Cm7', 'F7'],
      ['Fm7', 'Bb7', 'Ebmaj7', 'Edim7'],
    ],
    pre_chorus: [
      ['Cm7', 'F7', 'Bbmaj7', 'G7'],
    ],
  },
  /** Triads only — slice strips extensions; pools stay tertian triads for planner scaffold. */
  arvo_part_fur_alina: {
    verse: [
      ['Am', 'F', 'C', 'G'],
      ['Dm', 'G', 'C', 'Am'],
    ],
    chorus: [
      ['F', 'C', 'G', 'Am'],
      ['C', 'G', 'Am', 'F'],
    ],
    bridge: [
      ['Em', 'Am', 'Dm', 'G'],
      ['Am', 'Dm', 'G', 'C'],
    ],
    pre_chorus: [
      ['G', 'Am', 'F', 'C'],
    ],
  },
  arvo_part_spiegel: {
    verse: [
      ['C', 'G', 'Am', 'Em'],
      ['Am', 'Em', 'F', 'C'],
    ],
    chorus: [
      ['F', 'C', 'G', 'Am'],
      ['Dm', 'Am', 'G', 'C'],
    ],
    bridge: [
      ['Em', 'Am', 'Dm', 'G'],
      ['Am', 'G', 'F', 'C'],
    ],
    pre_chorus: [
      ['G', 'C', 'Am', 'Em'],
    ],
  },
  arvo_part_fratres: {
    verse: [
      ['Am', 'Am', 'G', 'Am'],
      ['Dm', 'Am', 'G', 'Am'],
    ],
    chorus: [
      ['Am', 'G', 'F', 'Am'],
      ['Dm', 'Am', 'G', 'Am'],
    ],
    bridge: [
      ['Em', 'Am', 'Dm', 'G'],
      ['Am', 'Am', 'G', 'Dm'],
    ],
    pre_chorus: [
      ['G', 'Am', 'F', 'Am'],
    ],
  },
  /** Anti-functional scaffold — slice strips dominants / breaks ii–V rolling triples (`satieSlice.ts`). */
  satie_gymnopedie: {
    verse: [
      ['Am', 'F/A', 'C/G', 'Em'],
      ['Dm', 'Bb/F', 'C', 'G/B'],
    ],
    chorus: [
      ['F', 'C/E', 'Dm', 'Am'],
      ['G', 'Em', 'F/C', 'Am'],
    ],
    bridge: [
      ['Em', 'Am/C', 'Dm', 'G'],
      ['Am', 'F', 'C', 'E/B'],
    ],
    pre_chorus: [
      ['C/G', 'Am', 'F', 'Dm'],
    ],
  },
  satie_gnossienne: {
    verse: [
      ['Fsus4', 'Bsus4', 'Esus4', 'Asus4'],
      ['Gsus4', 'Csus4', 'Fsus4', 'Bsus4'],
    ],
    chorus: [
      ['Csus4', 'Fsus4', 'Bbsus4', 'Esus4'],
      ['Dsus4', 'Gsus4', 'Csus4', 'Fsus4'],
    ],
    bridge: [
      ['Am', 'Dm/A', 'Gm', 'C/E'],
      ['Fm', 'Bb/F', 'Eb', 'Ab/Eb'],
    ],
    pre_chorus: [
      ['Gsus4', 'Csus4', 'Fsus4', 'Bsus4'],
    ],
  },
  satie_poire: {
    verse: [
      ['Amadd9', 'Fmaj7', 'C6', 'Gadd9'],
      ['Dmadd9', 'G', 'C', 'F/A'],
    ],
    chorus: [
      ['C6', 'Amadd9', 'Fmaj9', 'G6'],
      ['Bb', 'F/A', 'Gmadd9', 'C/E'],
    ],
    bridge: [
      ['Em7', 'Amadd9', 'Dm', 'G/B'],
      ['Fm', 'Ab/Eb', 'Ebadd9', 'Bb/F'],
    ],
    pre_chorus: [
      ['Gadd9', 'Em', 'Amadd9', 'Fmaj7'],
    ],
  },
  miles_davis_modal_1959: {
    verse: [
      ['Dm7', 'Dm7', 'Ebmaj7', 'Dm7'],
      ['Em7', 'A7', 'Dm7', 'Gm7'],
    ],
    chorus: [
      ['Bbmaj7', 'Am7', 'Gm7', 'C7'],
      ['Ebmaj7', 'Dm7', 'Cm7', 'F7'],
    ],
    bridge: [
      ['Fm7', 'Bb7', 'Ebmaj7', 'Dm7b5'],
      ['Gm7', 'C7', 'Fm7', 'Bb7'],
    ],
    pre_chorus: [
      ['Am7', 'Dm7', 'Gm7', 'C7'],
    ],
  },
  miles_davis_quintet_1965: {
    verse: [
      ['Em7', 'F7alt', 'Bbmaj7', 'Am7'],
      ['Dm7', 'G7alt', 'Cm7', 'F7(#11)'],
    ],
    chorus: [
      ['Ebmaj7(#11)', 'Dm7', 'Gm7', 'C7alt'],
      ['Abmaj7', 'Gm7', 'Fm7', 'Bb7'],
    ],
    bridge: [
      ['Bm7b5', 'E7alt', 'Am7', 'D7alt'],
      ['Fm7', 'Bb7', 'Ebmaj7', 'Ab7'],
    ],
    pre_chorus: [
      ['Am7', 'D7alt', 'Gm7', 'C7sus4'],
    ],
  },
  miles_davis_electric_1970: {
    verse: [
      ['E7(#9)', 'E7sus4', 'Am7', 'D7(#9)'],
      ['Bm7', 'E7sus4', 'A7(#9)', 'D7sus4'],
    ],
    chorus: [
      ['Gm7', 'C7(#9)', 'Fm7', 'Bb7sus4'],
      ['Dm7', 'G7sus4', 'Cm7', 'F7(#9)'],
    ],
    bridge: [
      ['Am7', 'D7(#9)', 'Gm7', 'C7sus4'],
      ['Fm7', 'Bb7(#9)', 'Ebmaj7', 'Ab7sus4'],
    ],
    pre_chorus: [
      ['Em7', 'A7(#9)', 'Dm7', 'G7sus4'],
    ],
  },
  /** Beatles tier 0 — I / ii / ii7 / IV / V / V7 / vi + blues I7·IV7, II7, touches iv·bVII·bVI (`beatlesSlice`). */
  beatles_merseybeat_1962: {
    verse: [
      ['C', 'Dm', 'G7', 'C'],
      ['C', 'Dm7', 'G7', 'C'],
      ['Am', 'Dm', 'G7', 'C'],
      ['F', 'F7', 'C', 'G7'],
      ['C', 'C7', 'F', 'G7'],
      ['C', 'Am', 'F', 'G7'],
      ['D7', 'G7', 'C', 'Am'],
      ['F', 'Fm', 'C', 'G7'],
      ['Bb', 'F', 'C', 'G7'],
      ['Ab', 'Bb', 'F', 'C'],
      ['D7', 'G7', 'C', 'G7'],
    ],
    chorus: [
      ['C', 'G7', 'Am', 'F'],
      ['F', 'G7', 'C', 'C7'],
      ['C', 'A7', 'Dm', 'G7'],
      ['C', 'F', 'C', 'G7'],
    ],
    bridge: [
      ['Fm', 'Bb7', 'C', 'G7'],
      ['D7', 'G7', 'C', 'E7'],
      ['Bb', 'F', 'G7', 'C'],
    ],
    pre_chorus: [
      ['Am', 'Dm', 'G7', 'C'],
      ['Dm', 'G7', 'C', 'Am'],
    ],
  },
  /** Beatles tier 1 — tier 0 + bIII·bVI·bVII primaries, iv, I–bVII–IV loops, II / bII colour. */
  beatles_rubber_soul_1965: {
    verse: [
      ['C', 'Bb', 'F', 'C'],
      ['C', 'Bb', 'F', 'Bb'],
      ['Eb', 'Bb', 'F', 'C'],
      ['Ab', 'Eb', 'Bb', 'F'],
      ['Am', 'F', 'Dm', 'G7'],
      ['Fm', 'Bb', 'Eb', 'Ab'],
      ['Bb', 'F', 'C', 'G7'],
      ['C', 'G', 'Bb', 'F'],
      ['Dm', 'G7', 'C', 'Eb'],
      ['D7', 'G7', 'C', 'Bb'],
    ],
    chorus: [
      ['C', 'Bb', 'F', 'G7'],
      ['Am', 'Dm', 'G', 'C'],
      ['F', 'Bb', 'C', 'Bb'],
      ['Eb', 'Bb', 'Ab', 'Eb'],
      ['C', 'Bb', 'F', 'C'],
    ],
    bridge: [
      ['Gm', 'C7', 'Fm', 'Bb7'],
      ['Eb', 'Bb', 'F', 'Dm'],
      ['Db7', 'G7', 'C', 'Am'],
      ['Bb', 'Eb', 'Ab', 'F'],
    ],
    pre_chorus: [
      ['Dm', 'G7', 'C', 'Am'],
      ['F', 'Bb', 'Eb', 'Bb'],
    ],
  },
  /** Beatles tier 2 — flat-side network, chromatic mediants, double-plagal, vi / VI / bIII poles. */
  beatles_abbey_road_1968: {
    verse: [
      ['C', 'Ab', 'Eb', 'Bb'],
      ['C', 'Ab', 'F', 'C'],
      ['Am', 'Eb', 'Ab', 'C'],
      ['Am', 'F', 'Dm', 'Bb'],
      ['A', 'Ab', 'Eb', 'C'],
      ['Eb', 'Bb', 'F', 'C'],
      ['C', 'Bb', 'F', 'C'],
      ['Am', 'Eb', 'F', 'C'],
      ['Cm', 'Ab', 'Eb', 'Bb'],
    ],
    chorus: [
      ['F', 'Bb', 'C', 'Am'],
      ['Dm', 'Bb', 'F', 'C'],
      ['Ab', 'Eb', 'Bb', 'F'],
      ['C', 'Ab', 'Eb', 'Ab'],
      ['Eb', 'C', 'Ab', 'F'],
    ],
    bridge: [
      ['Fm', 'Bb7', 'Eb', 'Ab'],
      ['Dm', 'G7', 'C', 'F'],
      ['Bb', 'Eb', 'Ab', 'C'],
      ['Gm', 'Eb', 'Bb', 'F'],
    ],
    pre_chorus: [
      ['Am', 'Dm', 'Bb', 'G7'],
      ['Cm', 'Ab', 'Eb', 'Bb'],
    ],
  },
  /** Fela Kuti tier 0 — long-form vamps: **Im7**, **bVII7**, **IV7**; optional **bIIImaj7** colour; no V–I cadential rows. */
  fela_kuti_zombie_1977: {
    verse: [
      ['Am7', 'Am7', 'G7', 'G7'],
      ['Am7', 'G7', 'Am7', 'G7'],
      ['Am7', 'Am7', 'Am7', 'G7'],
      ['Am7', 'D7', 'G7', 'Am7'],
    ],
    chorus: [
      ['Am7', 'G7', 'Am7', 'G7'],
      ['Am7', 'Am7', 'G7', 'D7'],
    ],
    bridge: [
      ['Am7', 'Cmaj7', 'Am7', 'G7'],
      ['G7', 'Am7', 'G7', 'Am7'],
    ],
    pre_chorus: [
      ['Am7', 'G7', 'Am7', 'G7'],
    ],
  },
  /** Fela Kuti tier 1 — call/response grid — quicker alternation **Im7 ↔ bVII7**, **IV7** pivots. */
  fela_kuti_water_no_get_enemy: {
    verse: [
      ['Am7', 'G7', 'Am7', 'G7'],
      ['Am7', 'D7', 'Am7', 'G7'],
      ['Am7', 'G7', 'D7', 'G7'],
    ],
    chorus: [
      ['Am7', 'G7', 'D7', 'Am7'],
      ['Am7', 'Am7', 'G7', 'G7'],
    ],
    bridge: [
      ['Am7', 'Cmaj7', 'G7', 'Am7'],
      ['D7', 'G7', 'Am7', 'G7'],
    ],
    pre_chorus: [
      ['Am7', 'G7', 'Am7', 'D7'],
    ],
  },
  /** Fela Kuti tier 2 — layered horns / metric stress — dense **bVII7** · **IV7** circulation. */
  fela_kuti_lady_1972: {
    verse: [
      ['Am7', 'G7', 'D7', 'G7'],
      ['Am7', 'Am7', 'G7', 'D7'],
      ['G7', 'Am7', 'G7', 'D7'],
      ['Am7', 'G7', 'Am7', 'D7'],
    ],
    chorus: [
      ['G7', 'Am7', 'G7', 'Am7'],
      ['Am7', 'D7', 'G7', 'Am7'],
    ],
    bridge: [
      ['Am7', 'Cmaj7', 'Am7', 'G7'],
      ['D7', 'Am7', 'G7', 'D7'],
    ],
    pre_chorus: [
      ['Am7', 'G7', 'D7', 'Am7'],
    ],
  },
  prince_purple_rain: {
    verse: [
      ['Am9', 'Dm9', 'G13', 'Cmaj9'],
      ['Fm9', 'Bb13', 'Ebmaj9', 'Ab6/9'],
    ],
    chorus: [
      ['Dm9', 'G13', 'Cmaj9', 'A9sus4'],
      ['Gm9', 'C13', 'Fmaj9', 'Bb9sus4'],
    ],
    bridge: [
      ['Bm9', 'E13', 'Amaj9', 'D13'],
      ['Cm9', 'F13', 'Bbmaj9', 'Eb13'],
    ],
    pre_chorus: [
      ['Em9', 'A13', 'Dm9', 'G13'],
    ],
  },
  prince_sign_o_times: {
    verse: [
      ['Dm9', 'G13', 'Cmaj9', 'Bb9'],
      ['Am9', 'D13', 'Gm9', 'C13'],
    ],
    chorus: [
      ['Fm9', 'Bb13', 'Ebmaj9', 'Ab13'],
      ['Em9', 'A13', 'Dmaj9', 'G13'],
    ],
    bridge: [
      ['Bbm9', 'Eb13', 'Abmaj9', 'Db13'],
      ['Am9', 'D13', 'Gmaj9', 'C13'],
    ],
    pre_chorus: [
      ['Cm9', 'F13', 'Bbmaj9', 'Eb9'],
    ],
  },
  prince_kiss: {
    verse: [
      ['Cmaj9', 'Am9', 'Dm9', 'G13'],
      ['Bbmaj9', 'Gm9', 'Cm9', 'F13'],
    ],
    chorus: [
      ['Fmaj9', 'Dm9', 'Gm9', 'C13'],
      ['Abmaj9', 'Fm9', 'Bbm9', 'Eb13'],
    ],
    bridge: [
      ['D9sus4', 'G13', 'Cmaj9', 'A9'],
      ['Gm9', 'C13', 'Fmaj9', 'Bb13'],
    ],
    pre_chorus: [
      ['Em9', 'A13', 'Dm9', 'G9sus4'],
    ],
  },
  duke_ellington: {
    verse: [
      ['Cmaj9(#11)', 'A7(b9#5)', 'Dm9', 'G13'],
      ['Fmaj13(#11)', 'F#dim7', 'Gm9', 'C13'],
    ],
    chorus: [
      ['Cmaj9(#11)', 'Fmaj9(#11)', 'Bm7b5', 'E7(b9)'],
      ['Gmaj9(#11)', 'C13', 'F#m7b5', 'B13'],
    ],
    bridge: [
      ['Dm9', 'G13', 'Cmaj9(#11)', 'Ebdim7'],
      ['Am9', 'D13', 'Gmaj9(#11)', 'Cmaj9(#11)'],
    ],
    pre_chorus: [
      ['Dm9', 'G13', 'Cmaj9(#11)', 'Am9'],
    ],
  },
  maria_schneider: {
    verse: [
      ['Cmaj7(#11)', 'Fmaj7(#11)', 'Bbmaj13(#11)', 'G7(b9,#11,13)'],
      ['Dm9', 'G13', 'Cmaj9(#11)', 'A7alt'],
    ],
    chorus: [
      ['Ebmaj7(add9)', 'Bbmaj7(#11)', 'Gm11', 'C9(#11)'],
      ['Fmaj13(#11)', 'Dm7(b6)', 'Em7(b6)', 'Am(maj7)'],
    ],
    bridge: [
      ['Bm7(b6)', 'E7alt', 'Amaj7(#11)', 'Dmaj9(#11)'],
      ['Gm11', 'C13', 'Fmaj7(#11)', 'Bb6/9(#11)'],
    ],
    pre_chorus: [
      ['Am11', 'Dm9', 'Gmaj7(add9)', 'Cmaj7(#11)'],
    ],
  },
};

function sectionChordPoolRows(
  kind: SongSectionKind,
  songwriterId: string | undefined
): ChordPoolRow[] | undefined {
  const pool = SONGWRITER_CHORD_POOLS[songwriterId ?? ''];
  if (!pool) return undefined;
  return kind === 'verse'
    ? pool.verse
    : kind === 'chorus'
      ? pool.chorus
      : kind === 'bridge'
        ? pool.bridge
        : kind === 'pre_chorus'
          ? pool.pre_chorus
          : pool.verse;
}

/** Row tags already imply chromatic motion or peak tension — no forced slot swap. */
function chordPlanRowHasChromOrHighTension(tags: string[]): boolean {
  return tags.includes('motion:chromatic') || tags.includes('tension:high');
}

/** Among Wayne tagged pool rows, pick maximal `tags.tension` (seed tie-break among ties). */
function pickHighestTensionWayneRow(sectionPool: ChordPoolRow[], seed: number): WayneShorterChordPoolRow | undefined {
  const tagged: WayneShorterChordPoolRow[] = [];
  for (const r of sectionPool) {
    if (!Array.isArray(r) && 'tags' in r && 'chords' in r) tagged.push(r as WayneShorterChordPoolRow);
  }
  if (tagged.length === 0) return undefined;
  const rank = (t: WayneShorterRowTags['tension']) => (t === 'high' ? 2 : t === 'medium' ? 1 : 0);
  let best = rank(tagged[0]!.tags.tension);
  for (const row of tagged) best = Math.max(best, rank(row.tags.tension));
  const cand = tagged.filter((row) => rank(row.tags.tension) === best);
  return cand[Math.abs(seed) % cand.length];
}

function chordSymbolsForSection(
  kind: SongSectionKind,
  seed: number,
  songwriterId?: string,
  eraProfile?: EraProfile
): { chordSymbols: string[]; chosenRowTags: string[] } {
  let resolvedPoolId = songwriterId ?? '';
  if (songwriterId === 'miles_davis') {
    const tier = Math.abs(seed) % 3;
    resolvedPoolId =
      tier === 0 ? 'miles_davis_modal_1959' : tier === 1 ? 'miles_davis_quintet_1965' : 'miles_davis_electric_1970';
  }
  if (songwriterId === 'bartok') {
    const tier = Math.abs(seed) % 3;
    resolvedPoolId =
      tier === 0 ? 'bartok_mikrokosmos' : tier === 1 ? 'bartok_string_quartet' : 'bartok_music_for_strings';
  }
  if (songwriterId === 'gershwin') {
    const tier = Math.abs(seed) % 3;
    resolvedPoolId =
      tier === 0 ? 'gershwin_song_aaba' : tier === 1 ? 'gershwin_rhapsody' : 'gershwin_rhythm_changes';
  }
  if (songwriterId === 'arvo_part') {
    const tier = Math.abs(seed) % 3;
    resolvedPoolId =
      tier === 0 ? 'arvo_part_fur_alina' : tier === 1 ? 'arvo_part_spiegel' : 'arvo_part_fratres';
  }
  if (songwriterId === 'satie') {
    const tier = Math.abs(seed) % 3;
    resolvedPoolId =
      tier === 0 ? 'satie_gymnopedie' : tier === 1 ? 'satie_gnossienne' : 'satie_poire';
  }
  if (songwriterId === 'prince') {
    const tier = Math.abs(seed) % 3;
    resolvedPoolId =
      tier === 0 ? 'prince_purple_rain' : tier === 1 ? 'prince_sign_o_times' : 'prince_kiss';
  }
  if (songwriterId === 'beatles') {
    resolvedPoolId = resolveBeatlesChordPoolId(seed);
  }
  if (songwriterId === 'fela_kuti') {
    resolvedPoolId = resolveFelaKutiChordPoolId(seed);
  }
  const pool = SONGWRITER_CHORD_POOLS[resolvedPoolId];
  if (pool) {
    const sectionPool = sectionChordPoolRows(kind, resolvedPoolId)!;
    const profile = eraProfile ?? resolveEraProfile(undefined);
    const idx = pickChordPoolRowIndex(sectionPool, Math.abs(seed), profile, resolvedPoolId, kind);
    const raw = sectionPool[idx] ?? pool.verse[0];
    const chosenRowTags = chosenRowTagsFromPoolRow(raw);
    if (raw == null) {
      return { chordSymbols: ['Cmaj7', 'Am7', 'Fmaj7', 'G7'], chosenRowTags: [] };
    }
    let chordSymbols = applyHarmonicRhythmToRow(
      chordSymbolsFromPoolRow(raw),
      profile.harmonicRhythm,
      seed
    );
    if (
      songwriterId === 'frank_zappa' ||
      songwriterId === 'joni_mitchell' ||
      songwriterId === 'bartok' ||
      songwriterId === 'gershwin' ||
      songwriterId === 'satie'
    ) {
      chordSymbols = breakFrankZappaIiViProgressions(chordSymbols, seed);
    }
    return { chordSymbols, chosenRowTags };
  }

  // Fallback: original hardcoded progressions
  switch (kind) {
    case 'verse':
      return { chordSymbols: ['Cmaj7', 'Am7', 'Fmaj7', 'G7'], chosenRowTags: [] };
    case 'pre_chorus':
      return { chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'], chosenRowTags: [] };
    case 'chorus':
      return { chordSymbols: ['Cmaj7', 'G7', 'Am7', 'Fmaj7'], chosenRowTags: [] };
    case 'bridge':
      return { chordSymbols: ['Am7', 'Fmaj7', 'Dm7', 'G7'], chosenRowTags: [] };
    default:
      return { chordSymbols: ['Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7'], chosenRowTags: [] };
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
  eraProfile?: EraProfile,
  eraId?: EraId | null,
  voiceBundle?: VoiceRuleBundle | null
): SectionChordPlan[] {
  const debugCounters = eraId ? createEraNormalizerDebugCounters(eraId) : undefined;
  /** Ordinal within verse / chorus so repeated sections (e.g. V-C-V-C×2) do not reuse the same pool row — `(order * 31)` aligns mod short pools when orders differ by 4. */
  let verseOrdinal = 0;
  let chorusOrdinal = 0;
  const planned = sections.map((s) => {
    let ordinalBias = 0;
    if (s.kind === 'verse') ordinalBias = verseOrdinal++ * 997;
    else if (s.kind === 'chorus') ordinalBias = chorusOrdinal++ * 997;
    const secSeed = seed + s.order * 31 + ordinalBias;
    let row = chordSymbolsForSection(s.kind, secSeed, songwriterId, eraProfile);

    if (
      songwriterId === 'wayne_shorter' &&
      (s.kind === 'chorus' || s.kind === 'bridge') &&
      !chordPlanRowHasChromOrHighTension(row.chosenRowTags)
    ) {
      const sectionPool = sectionChordPoolRows(s.kind, songwriterId);
      const profile = eraProfile ?? resolveEraProfile(undefined);
      const bestRow = sectionPool ? pickHighestTensionWayneRow(sectionPool, secSeed) : undefined;
      const n = row.chordSymbols.length;
      if (bestRow && n > 2) {
        const inner = n - 2;
        const replaceAt = 1 + (Math.abs(secSeed * 1103515245 + s.order * 12345) % inner);
        const sourceChords = applyHarmonicRhythmToRow(
          chordSymbolsFromPoolRow(bestRow),
          profile.harmonicRhythm,
          secSeed
        );
        const srcLen = sourceChords.length;
        if (replaceAt < n && srcLen > 0) {
          const symIdx = replaceAt < srcLen ? replaceAt : replaceAt % srcLen;
          const next = [...row.chordSymbols];
          next[replaceAt] = sourceChords[symIdx]!;
          row = {
            chordSymbols: next,
            chosenRowTags: [...row.chosenRowTags, 'forced_disruption'],
          };
        }
      }
    }

    return {
      sectionOrder: s.order,
      sectionKind: s.kind,
      intensity: intensityForKind(s.kind),
      chordSymbols: row.chordSymbols,
      chosenRowTags: row.chosenRowTags,
    };
  });
  if (!eraId) return planned;

  // Implementation plan:
  // - insertion point is here: chords are generated and harmonic-rhythm-shaped,
  //   but voicing/export has not started yet.
  // - normalize symbols per era without changing root/bass/function family.
  return planned.map((section, idx) => ({
    ...section,
    chordSymbols: normalizeChordSymbolsForEra(section.chordSymbols, eraId, {
      previousChordSymbol: planned[idx - 1]?.chordSymbols.slice(-1)[0],
      nextChordSymbol: planned[idx + 1]?.chordSymbols[0],
      debug: process.env.COMPOSER_OS_ERA_CHORD_DEBUG === '1',
      debugCounters,
      voiceBundle: voiceBundle ?? undefined,
    }),
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
  /** Phase 2+3a — harmonic voice id (shadows motif/theme policy when set). */
  harmonicVoice?: string | null;
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
  const eraProfile = resolveEraProfile(params.stylePairing?.era);
  const eraId = normalizeEraId(params.stylePairing?.era);
  const hook = buildSongHook(params.seed);
  const voiceBundleForCompile =
    params.harmonicVoice != null && String(params.harmonicVoice).trim() !== ''
      ? getVoiceRuleBundle(String(params.harmonicVoice).trim())
      : null;
  const chordPlan = buildSectionChordPlans(
    params.sections,
    params.seed,
    resolution.primaryId,
    eraProfile,
    eraId,
    voiceBundleForCompile
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

  let formSectionsForMal: ReturnType<typeof buildFormSections> | undefined;
  if (voiceBundleForCompile) {
    let bar = 1;
    const sectionsForm = params.sections.map((sec, i) => {
      const len = withRules.chordPlan[i]?.chordSymbols.length ?? 0;
      const row = { label: sec.kind, startBar: bar, length: len };
      bar += len;
      return row;
    });
    const tbSong = withRules.chordPlan.reduce((s, p) => s + p.chordSymbols.length, 0);
    formSectionsForMal = buildFormSections({ totalBars: tbSong, sections: sectionsForm }, voiceBundleForCompile);
  }

  const melodyBehaviourForLead =
    withRules.songwriting?.melodyBehaviour ?? planMelodyBehaviour(params.seed, resolution.primaryId);
  const themeVoiceKey =
    params.harmonicVoice != null && String(params.harmonicVoice).trim() !== ''
      ? String(params.harmonicVoice).trim()
      : resolution.primaryId;
  const themeGenome = buildThemeGenome(themeVoiceKey, params.seed, undefined, voiceBundleForCompile);
  const leadMelodyPlanRaw = planLeadMelody({
    seed: params.seed,
    sections: params.sections,
    chordPlan: withRules.chordPlan,
    hookPlan,
    chorusPlan,
    hook: withRules.hook,
    voiceType,
    melodyBehaviour: melodyBehaviourForLead,
    harmonyBars: flattenChordPlanToHarmonyBars(withRules.chordPlan),
  });
  const mal = applyMotifAuthorityLayerToLeadMelody(
    leadMelodyPlanRaw,
    themeGenome,
    params.sections,
    withRules.chordPlan,
    scoreMotifSimilarity,
    formSectionsForMal
  );
  const comfortMidi = getSingerRangeProfile(voiceType).comfortRangeMidi;
  const leadMelodyPlan = {
    ...mal.plan,
    notes: mal.plan.notes.map((n) => ({
      ...n,
      midi: Math.min(comfortMidi[1], Math.max(comfortMidi[0], n.midi)),
    })),
  };

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
    themeGenome,
    motifAuthoritySummary: mal.summary,
    motifAuthorityReceipts: mal.receipts,
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
