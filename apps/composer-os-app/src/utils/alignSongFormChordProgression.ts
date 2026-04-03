/**
 * UI-only: normalize pasted/typed `|`-separated chords to exactly `songFormBars` slots.
 * Empty `raw` returns '' so "no chords" stays valid (e.g. duo built-in harmony).
 */
export function alignChordProgressionToSongFormBars(raw: string, songFormBars: number): string {
  if (!raw.trim()) return '';

  const parts = raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  let aligned: string[];

  if (parts.length >= songFormBars) {
    aligned = parts.slice(0, songFormBars);
  } else {
    aligned = [...parts];
    while (aligned.length < songFormBars) {
      aligned.push(aligned[aligned.length - 1] || 'C');
    }
  }

  return aligned.join(' | ');
}
