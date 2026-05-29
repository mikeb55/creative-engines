/**
 * Bridge iReal Pro parsed charts → Martino chord input strings.
 */

/**
 * Map iReal chord-quality dialect to Martino-compatible suffix.
 * @param {string} raw
 * @returns {string}
 */
export function mapIrealQualityToMartino(raw) {
  let q = String(raw ?? '').trim();
  if (!q) return '';

  if (/^h7$/i.test(q)) return 'm7b5';
  if (/^h/i.test(q)) return 'm7b5';

  if (/^o7$/i.test(q) || /^o$/i.test(q)) return 'dim7';

  q = q.replace(/Δ/g, 'maj');
  q = q.replace(/\^/g, 'maj');

  if (/^-/.test(q)) {
    q = `m${q.slice(1)}`;
  }

  return q;
}

/**
 * @param {string} rootNote
 * @param {string} chordQuality
 * @param {string} [symbol]
 * @returns {string}
 */
export function irealChordSymbolToMartino(rootNote, chordQuality, symbol) {
  const root = String(rootNote ?? '').trim();
  const sym = String(symbol ?? '').trim();
  if (!root && sym) {
    const m = sym.match(/^([A-G](?:#|b|♭|♯)?)(.*)$/i);
    if (m) {
      return irealChordSymbolToMartino(
        m[1].replace('♭', 'b').replace('♯', '#'),
        (m[2] ?? '').trim(),
        sym
      );
    }
    return sym;
  }
  if (!root) return '';

  const quality = mapIrealQualityToMartino(chordQuality);
  const bassMatch = quality.match(/^(.*)\/([A-Ga-g][#b]?)$/);
  const coreQuality = bassMatch ? bassMatch[1] : quality;
  const bass = bassMatch ? `/${bassMatch[2]}` : '';

  if (!coreQuality) return `${root}${bass}`;
  return `${root}${coreQuality}${bass}`;
}

/**
 * @param {{ measures?: Array<Array<{ symbol?: string; rootNote?: string; chordQuality?: string }>> } | null | undefined} parsedChart
 * @returns {string}
 */
export function irealChordToMartino(parsedChart) {
  if (!parsedChart) return '';
  const measures = parsedChart.measures;
  if (!Array.isArray(measures) || measures.length === 0) return '';

  const bars = [];
  for (const bar of measures) {
    const chords = [];
    for (const chord of bar ?? []) {
      const symbol = String(chord?.symbol ?? '').trim();
      if (!symbol || /^n\.?c\.?$/i.test(symbol)) continue;
      const converted = irealChordSymbolToMartino(
        chord?.rootNote ?? '',
        chord?.chordQuality ?? '',
        symbol
      );
      if (converted) chords.push(converted);
    }
    if (chords.length) bars.push(chords.join(' '));
  }
  return bars.join(' | ');
}
