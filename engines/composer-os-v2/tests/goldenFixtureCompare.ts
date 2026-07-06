// Shared byte-exact golden fixture compare helpers (premium-melody MusicXML oracles).

export function normalizeGoldenFixtureText(text: string): string {
  return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

export function firstByteDiffIndex(expected: string, actual: string): number | null {
  const len = Math.min(expected.length, actual.length);
  for (let i = 0; i < len; i++) {
    if (expected.charCodeAt(i) !== actual.charCodeAt(i)) return i;
  }
  if (expected.length !== actual.length) return len;
  return null;
}
