import { migrateLegacySongwriterValue } from '../types/styleProfile';

export const SONG_MODE_DUO_ARRANGEMENT_COMPOSERS = new Set<string>([
  'debussy',
  'messiaen',
  'steve_reich',
]);

export type AuditionGenerateRequest = {
  presetId: string;
  seed: number;
  creativeControlLevel: 'stable' | 'balanced' | 'surprise';
  primarySongwriterStyle: string;
  totalBars: number;
  bpm: number;
  tonalCenter: string;
};

function resolveCanonicalComposerId(rawId: string): string {
  const trimmed = rawId.trim();
  if (!trimmed) return 'bill_evans';
  const migrated = migrateLegacySongwriterValue(trimmed);
  return migrated.harmonic?.voiceId ?? migrated.rhythm?.engineId ?? trimmed;
}

export function resolveAuditionPresetForComposer(composerId: string): 'song_mode' {
  const canonical = resolveCanonicalComposerId(composerId);
  if (SONG_MODE_DUO_ARRANGEMENT_COMPOSERS.has(canonical)) {
    return 'song_mode';
  }
  return 'song_mode';
}

export function buildAuditionGenerateRequest(
  composerId: string,
  seed?: number
): AuditionGenerateRequest {
  const primarySongwriterStyle = resolveCanonicalComposerId(composerId);
  const presetId = resolveAuditionPresetForComposer(primarySongwriterStyle);
  return {
    presetId,
    seed: seed ?? Math.floor(Math.random() * 1e9),
    creativeControlLevel: 'balanced',
    primarySongwriterStyle,
    totalBars: 32,
    bpm: 120,
    tonalCenter: 'C',
  };
}