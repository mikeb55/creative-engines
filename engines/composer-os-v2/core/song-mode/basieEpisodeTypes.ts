/**
 * Count Basie Song Mode — episode texture labels (`cb:*` slice receipts reference these).
 */

export type BasieEpisodeType = 'riff_head' | 'solo_background' | 'shout' | 'tag';

export interface BasieEpisodeSegment {
  kind: BasieEpisodeType;
  startBar: number;
  endBar: number;
}

export interface BasieEpisodePlan {
  segments: BasieEpisodeSegment[];
  /** Head / riff harmonic anchor (stem for shout reuse receipts). */
  riffAnchorSymbol: string;
  shoutStartBar: number;
  tagStartBar: number;
}
