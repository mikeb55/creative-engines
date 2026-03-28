/**
 * Structured parse of a single chord symbol for locked custom harmony.
 * Display text stays verbatim in `originalText`; structured fields support MusicXML / analysis.
 */

export interface LockedChordDegreeToken {
  raw: string;
}

export interface LockedChordSemantics {
  originalText: string;
  rootLetter: string;
  rootAlter: number;
  bassLetter?: string;
  bassAlter?: number;
  /** Suffix after root in the harmony portion (before slash), e.g. maj9, 7(#11), alt */
  qualityAndExtensionsText: string;
  /** Parenthesized alterations, e.g. (#11), (b9) */
  degrees: LockedChordDegreeToken[];
  /** Set when the symbol could not be split into a standard root + remainder (export may still use originalText). */
  parseWarning?: string;
}

const ROOT_RE = /^([A-Ga-g])([#b]?)/;

function parseBassStepAlter(bassPart: string): { letter: string; alter: number } | undefined {
  const m = bassPart.trim().match(/^([A-Ga-g])([#b]?)$/);
  if (!m) return undefined;
  const letter = m[1].toUpperCase();
  let alter = 0;
  if (m[2] === '#') alter = 1;
  else if (m[2] === 'b') alter = -1;
  return { letter, alter };
}

/**
 * Best-effort structural parse. On failure, `parseWarning` is set and roots default conservatively;
 * callers must still prefer `originalText` for display when harmony is locked.
 */
export function parseLockedChordSemantics(raw: string): LockedChordSemantics {
  const originalText = raw.trim().replace(/\s+/g, ' ');
  const slash = originalText.indexOf('/');
  const harmonyPart = slash >= 0 ? originalText.slice(0, slash).trim() : originalText;
  const bassPart = slash >= 0 ? originalText.slice(slash + 1).trim() : undefined;

  const hm = harmonyPart.match(ROOT_RE);
  if (!hm) {
    return {
      originalText,
      rootLetter: 'C',
      rootAlter: 0,
      qualityAndExtensionsText: harmonyPart,
      degrees: [],
      parseWarning: 'Could not parse leading root letter',
    };
  }

  const rootLetter = hm[1].toUpperCase();
  let rootAlter = 0;
  if (hm[2] === '#') rootAlter = 1;
  else if (hm[2] === 'b') rootAlter = -1;

  let rest = harmonyPart.slice(hm[0].length).trim();
  const dup = rest.match(ROOT_RE);
  if (dup) {
    const sl = dup[1].toUpperCase();
    const sa = dup[2] === '#' ? 1 : dup[2] === 'b' ? -1 : 0;
    if (sl === rootLetter && sa === rootAlter) {
      rest = rest.slice(dup[0].length).trim();
    }
  }

  const degrees: LockedChordDegreeToken[] = [];
  const paren = rest.matchAll(/\(([^)]+)\)/g);
  for (const x of paren) {
    degrees.push({ raw: x[1].trim() });
  }

  let bassLetter: string | undefined;
  let bassAlter: number | undefined;
  if (bassPart) {
    const ba = parseBassStepAlter(bassPart);
    if (ba) {
      bassLetter = ba.letter;
      bassAlter = ba.alter;
    } else {
      return {
        originalText,
        rootLetter,
        rootAlter,
        qualityAndExtensionsText: rest,
        degrees,
        parseWarning: `Non-standard slash bass spelling: ${bassPart}`,
      };
    }
  }

  return {
    originalText,
    rootLetter,
    rootAlter,
    bassLetter,
    bassAlter,
    qualityAndExtensionsText: rest,
    degrees,
  };
}
