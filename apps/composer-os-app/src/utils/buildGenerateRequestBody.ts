/**
 * Pure mapping from UI state → `/generate` JSON body (tests assert field names match engine contract).
 */

export type CreativeStability = 'stable' | 'balanced' | 'surprise';

export interface CoreGenerationUiState {
  tonalCenter: string;
  bpm: number;
  totalBars: number;
  variationId: string;
  seed: number;
  creativeControlLevel: CreativeStability;
  presetId: string;
  /** Song Mode / Big Band: dual pairing */
  stylePairing?: { songwriterStyle: string; arrangerStyle: string; era?: string };
  ensembleConfigId?: string;
  /** Song Mode primary songwriter lane */
  primarySongwriterStyle?: string;
}

/** Maps UI labels to GenerateRequest fields (tonalCenter, bpm, totalBars, variationId, stylePairing, ensemble, creativeControl). */
export function mapCoreUiToGenerationFields(
  u: CoreGenerationUiState
): Record<string, unknown> {
  const vid = u.variationId.trim();
  const out: Record<string, unknown> = {
    presetId: u.presetId,
    seed: u.seed,
    creativeControlLevel: u.creativeControlLevel,
  };
  const tc = u.tonalCenter.trim();
  if (tc) out.tonalCenter = tc;
  if (Number.isFinite(u.bpm) && u.bpm > 0) out.bpm = u.bpm;
  if (Number.isFinite(u.totalBars) && u.totalBars > 0) out.totalBars = Math.floor(u.totalBars);
  if (vid) out.variationId = vid;
  if (u.stylePairing) out.stylePairing = u.stylePairing;
  if (u.ensembleConfigId) out.ensembleConfigId = u.ensembleConfigId;
  if (u.primarySongwriterStyle?.trim()) out.primarySongwriterStyle = u.primarySongwriterStyle.trim();
  return out;
}
