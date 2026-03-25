/**
 * Songwriter style profiles — planning weights (no prose).
 */

import type { SongwriterRuleId } from './songwritingResearchTypes';

export interface SongwriterStyleProfile {
  id: SongwriterRuleId;
  /** 0–1 — emphasis on continuous line vs riff-like cells. */
  lineVsCellEmphasis: number;
  /** 0–1 — harmonic colour vs diatonic simplicity. */
  harmonyColourBias: number;
  /** 0–1 — form regularity (high = template pop). */
  formRegularity: number;
  /** 0–1 — lyric/prosody influence on phrasing. */
  prosodyInfluence: number;
  /** 0–1 — hook repetition / return strength. */
  hookRepetitionBias: number;
}

export const SONGWRITER_STYLE_PROFILES: Record<SongwriterRuleId, SongwriterStyleProfile> = {
  bacharach: {
    id: 'bacharach',
    lineVsCellEmphasis: 0.75,
    harmonyColourBias: 0.85,
    formRegularity: 0.35,
    prosodyInfluence: 0.5,
    hookRepetitionBias: 0.55,
  },
  stevie_wonder: {
    id: 'stevie_wonder',
    lineVsCellEmphasis: 0.65,
    harmonyColourBias: 0.8,
    formRegularity: 0.65,
    prosodyInfluence: 0.45,
    hookRepetitionBias: 0.7,
  },
  beatles: {
    id: 'beatles',
    lineVsCellEmphasis: 0.55,
    harmonyColourBias: 0.6,
    formRegularity: 0.7,
    prosodyInfluence: 0.55,
    hookRepetitionBias: 0.65,
  },
  joni_mitchell: {
    id: 'joni_mitchell',
    lineVsCellEmphasis: 0.7,
    harmonyColourBias: 0.75,
    formRegularity: 0.4,
    prosodyInfluence: 0.9,
    hookRepetitionBias: 0.4,
  },
  donald_fagen: {
    id: 'donald_fagen',
    lineVsCellEmphasis: 0.6,
    harmonyColourBias: 0.9,
    formRegularity: 0.55,
    prosodyInfluence: 0.5,
    hookRepetitionBias: 0.45,
  },
  bob_dylan: {
    id: 'bob_dylan',
    lineVsCellEmphasis: 0.35,
    harmonyColourBias: 0.25,
    formRegularity: 0.3,
    prosodyInfluence: 0.95,
    hookRepetitionBias: 0.25,
  },
  paul_simon: {
    id: 'paul_simon',
    lineVsCellEmphasis: 0.58,
    harmonyColourBias: 0.55,
    formRegularity: 0.62,
    prosodyInfluence: 0.65,
    hookRepetitionBias: 0.55,
  },
  jeff_tweedy: {
    id: 'jeff_tweedy',
    lineVsCellEmphasis: 0.45,
    harmonyColourBias: 0.35,
    formRegularity: 0.6,
    prosodyInfluence: 0.7,
    hookRepetitionBias: 0.4,
  },
  carole_king: {
    id: 'carole_king',
    lineVsCellEmphasis: 0.55,
    harmonyColourBias: 0.5,
    formRegularity: 0.75,
    prosodyInfluence: 0.6,
    hookRepetitionBias: 0.85,
  },
  smokey_robinson: {
    id: 'smokey_robinson',
    lineVsCellEmphasis: 0.5,
    harmonyColourBias: 0.45,
    formRegularity: 0.72,
    prosodyInfluence: 0.55,
    hookRepetitionBias: 0.88,
  },
  randy_newman: {
    id: 'randy_newman',
    lineVsCellEmphasis: 0.4,
    harmonyColourBias: 0.75,
    formRegularity: 0.45,
    prosodyInfluence: 0.85,
    hookRepetitionBias: 0.35,
  },
  richard_thompson: {
    id: 'richard_thompson',
    lineVsCellEmphasis: 0.52,
    harmonyColourBias: 0.55,
    formRegularity: 0.48,
    prosodyInfluence: 0.72,
    hookRepetitionBias: 0.42,
  },
  max_martin: {
    id: 'max_martin',
    lineVsCellEmphasis: 0.42,
    harmonyColourBias: 0.4,
    formRegularity: 0.92,
    prosodyInfluence: 0.45,
    hookRepetitionBias: 0.95,
  },
};

export const DEFAULT_PRIMARY_SONGWRITER_STYLE: SongwriterRuleId = 'beatles';

const ALIASES: Record<string, SongwriterRuleId> = {
  bacharach: 'bacharach',
  stevie: 'stevie_wonder',
  stevie_wonder: 'stevie_wonder',
  beatles: 'beatles',
  joni: 'joni_mitchell',
  joni_mitchell: 'joni_mitchell',
  fagen: 'donald_fagen',
  donald_fagen: 'donald_fagen',
  dylan: 'bob_dylan',
  bob_dylan: 'bob_dylan',
  simon: 'paul_simon',
  paul_simon: 'paul_simon',
  tweedy: 'jeff_tweedy',
  jeff_tweedy: 'jeff_tweedy',
  king: 'carole_king',
  carole_king: 'carole_king',
  smokey: 'smokey_robinson',
  smokey_robinson: 'smokey_robinson',
  newman: 'randy_newman',
  randy_newman: 'randy_newman',
  thompson: 'richard_thompson',
  richard_thompson: 'richard_thompson',
  max_martin: 'max_martin',
};

export function normalizeSongwriterStyleKey(raw: string | undefined | null): SongwriterRuleId | null {
  if (raw == null || raw === '') return null;
  const k = raw.trim().toLowerCase();
  return ALIASES[k] ?? null;
}
