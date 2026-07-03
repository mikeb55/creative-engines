/** 1-based bar index from absolute playback beat (0 = start of bar 1). */
export function barIndexFromPlaybackBeat(playbackBeat: number, beatsPerBar: number): number {
  if (!Number.isFinite(playbackBeat) || playbackBeat <= 0) return 1;
  const bpb = Number.isFinite(beatsPerBar) && beatsPerBar > 0 ? beatsPerBar : 4;
  return Math.floor(playbackBeat / bpb) + 1;
}

export function clampBarToForm(bar: number, songFormBars: number): number {
  const tb = Math.max(1, Math.floor(songFormBars));
  return Math.min(tb, Math.max(1, Math.floor(bar)));
}
