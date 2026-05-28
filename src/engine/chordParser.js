/**
 * Lightweight chord symbol parser (V68 P3 + V69 Martino extensions).
 * @typedef {object} ParsedChord
 * @property {string} root
 * @property {string} quality
 * @property {string} [bass]
 * @property {string[]} [extensions]
 */

const ROOT_RE = /^([A-G](?:#|b)?)/i;

const EXT_TOKEN_RE = /^(#11|b9|#9|b13|#5|b5|add9|add11|add13|9|11|13|6|alt|7alt)/i;

/**
 * @param {string} suffix
 * @returns {{ quality: string, extensions: string[], remainder: string }}
 */
function parseHarmonySuffix(suffix) {
  let s = suffix;
  let quality = 'major';
  const extensions = [];

  const dim7 = s.match(/^(?:dim7|°7|o7)/i);
  if (dim7) {
    quality = 'dim7';
    s = s.slice(dim7[0].length);
  } else {
    const dim = s.match(/^(?:dim|°|o)(?!7)/i);
    if (dim) {
      quality = 'dim';
      s = s.slice(dim[0].length);
    }
  }

  if (quality === 'major') {
    const halfDim = s.match(/^(?:m7b5|min7b5|ø7?|half-?dim)/i);
    if (halfDim) {
      quality = 'm7b5';
      s = s.slice(halfDim[0].length);
    }
  }

  if (quality === 'major') {
    const aug = s.match(/^(?:aug|\+)/i);
    if (aug) {
      quality = 'aug';
      s = s.slice(aug[0].length);
    }
  }

  if (quality === 'major') {
    const minMaj = s.match(/^(?:min(?:or)?(?:maj|Maj|M)|m(?:M|Maj))(?:7|Δ)?/i);
    if (minMaj) {
      quality = 'minMaj7';
      s = s.slice(minMaj[0].length);
    } else if (/^sus2/i.test(s)) {
      quality = 'sus2';
      s = s.slice(4);
    } else if (/^sus4/i.test(s)) {
      quality = 'sus4';
      s = s.slice(4);
    } else {
      const min9 = s.match(/^(?:min(?:or)?9|m9|-9)/i);
      if (min9) {
        quality = 'min9';
        s = s.slice(min9[0].length);
      } else {
        const minor = s.match(/^(?:min(?:or)?|m(?!aj|M)|-)(?:7|11|13|6)?/i);
        if (minor) {
          quality = 'minor';
          s = s.slice(minor[0].length);
        } else {
          const maj7 = s.match(/^(?:maj|M|Δ)7/i);
          if (maj7) {
            quality = 'maj7';
            s = s.slice(maj7[0].length);
          } else {
            const maj6 = s.match(/^(?:maj|M|Δ)?6/i);
            if (maj6) {
              quality = 'maj6';
              s = s.slice(maj6[0].length);
            } else {
              const major = s.match(/^(?:maj|M|Δ)(?:9|11|13)?/i);
              if (major) {
                quality = 'major';
                s = s.slice(major[0].length);
              } else {
                const domAlt = s.match(/^7alt/i);
                if (domAlt) {
                  quality = 'dom7alt';
                  s = s.slice(domAlt[0].length);
                } else {
                  const dom = s.match(/^(?:7|9|11|13|dom7?)/i);
                  if (dom) {
                    quality = 'dom7';
                    s = s.slice(dom[0].length);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  while (s.length > 0) {
    const extMatch = s.match(EXT_TOKEN_RE);
    if (!extMatch) break;
    const token = extMatch[1];
    if (token === 'alt' || token === '7alt') {
      if (quality === 'dom7') quality = 'dom7alt';
    } else if ((token === '#9' || token === 'b9' || token === '#5' || token === 'b5') && quality === 'dom7') {
      quality = 'dom7alt';
    }
    extensions.push(token);
    s = s.slice(extMatch[0].length);
  }

  return { quality, extensions, remainder: s };
}

/**
 * @param {string} symbol
 * @returns {ParsedChord | null}
 */
export function parseChord(symbol) {
  if (symbol == null) return null;
  const raw = String(symbol).trim();
  if (!raw) return null;

  const slashIdx = raw.indexOf('/');
  const harmonyPart = slashIdx >= 0 ? raw.slice(0, slashIdx).trim() : raw;
  const bassPart = slashIdx >= 0 ? raw.slice(slashIdx + 1).trim() : '';

  const rootMatch = harmonyPart.match(ROOT_RE);
  if (!rootMatch) return null;

  const root = normalizeRoot(rootMatch[1]);
  const suffix = harmonyPart.slice(rootMatch[0].length);
  const { quality, extensions, remainder } = parseHarmonySuffix(suffix);

  if (remainder.length > 0) return null;

  /** @type {ParsedChord} */
  const out = { root, quality };
  if (bassPart) {
    const bassRoot = bassPart.match(ROOT_RE);
    if (bassRoot) out.bass = normalizeRoot(bassRoot[1]);
  }
  if (extensions.length) out.extensions = extensions;
  return out;
}

/** @param {string} root */
function normalizeRoot(root) {
  const letter = root[0].toUpperCase();
  const acc = root.slice(1);
  if (acc === 'b' || acc === '♭') return `${letter}b`;
  if (acc === '#' || acc === '♯') return `${letter}#`;
  return letter;
}
