/**
 * Same FNV-style mix as `computeHarmonyChecksum` in core/harmony/harmonyContext.ts.
 * Duplicated here so the pentatonic module does not import the harmony timeline stack.
 * Tests assert byte-for-byte parity with that function.
 */
export function pentatonicHarmonyChecksum(bars: readonly string[]): string {
  const s = bars.join('\u0001');
  let h = 2166136261 >>> 0;
  let g = 3590594269 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h ^= c;
    h = Math.imul(h, 16777619) >>> 0;
    g ^= c + (i & 0xff);
    g = Math.imul(g, 2246822519) >>> 0;
  }
  return `${h.toString(16).padStart(8, '0')}${g.toString(16).padStart(8, '0')}${s.length.toString(16).padStart(8, '0')}`;
}
