/**
 * Martino Linear Expressions — harmonic reduction (book p.51, Nadine pp.55–57).
 */

import { parseChord } from './chordParser.js';

const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** @param {string} name */
function noteToPc(name) {
  const n = String(name).trim();
  const letter = n[0].toUpperCase();
  const acc = n.slice(1);
  let base = PC_NAMES.indexOf(letter);
  if (base < 0) {
    if (letter === 'C' && acc.startsWith('#')) base = 1;
    else if (letter === 'D' && acc.startsWith('b')) base = 1;
    else base = 0;
  }
  if (acc === 'b' || acc === '♭') return (base + 11) % 12;
  if (acc === '#' || acc === '♯') return (base + 1) % 12;
  if (acc === 'bb') return (base + 10) % 12;
  if (acc === '##') return (base + 2) % 12;
  return base;
}

/** @param {number} pc */
function pcToMinorRootName(pc) {
  return `${PC_NAMES[((pc % 12) + 12) % 12]}m`;
}

/** @param {number} pc @param {number} semitones */
function transposePc(pc, semitones) {
  return ((pc + semitones) % 12 + 12) % 12;
}

/**
 * @param {import('./chordParser.js').ParsedChord | null} parsed
 * @param {string} symbol
 */
function classifyMartinoFamily(parsed, symbol) {
  if (!parsed) return { family: 'unknown', layer: 'unknown' };
  const sym = String(symbol);
  const ext = parsed.extensions ?? [];
  const q = parsed.quality;

  if (q === 'dim7') return { family: 'dim7', layer: 'diminished' };
  if (q === 'dim') return { family: 'dim', layer: 'diminished' };
  if (q === 'm7b5') return { family: 'm7b5', layer: 'half-dim' };
  if (q === 'minor' || q === 'min9' || q === 'minMaj7') return { family: 'minor', layer: 'minor' };
  if (q === 'dom7alt') return { family: 'dom7alt', layer: 'dominant' };
  if (q === 'dom7') return { family: 'dom7', layer: 'dominant' };
  if (q === 'aug' || (q === 'maj7' && ext.includes('#5'))) return { family: 'aug', layer: 'augmented' };
  if (q === 'maj6') return { family: 'maj6', layer: 'major' };
  if (q === 'maj7' && ext.includes('#11')) return { family: 'maj7sharp11', layer: 'major' };
  if (q === 'maj7') return { family: 'maj7', layer: 'major' };
  if (q === 'major' || q === 'sus2' || q === 'sus4') return { family: 'major', layer: 'major' };
  return { family: q, layer: 'unknown' };
}

/**
 * @param {string} chordSymbol
 * @param {'low'|'medium'|'high'} [tensionLevel='low']
 * @param {string | null} [prevChordSymbol=null]
 */
export function martino_convert(chordSymbol, tensionLevel = 'low', prevChordSymbol = null) {
  const parsed = parseChord(chordSymbol);
  const prevParsed = prevChordSymbol ? parseChord(prevChordSymbol) : null;
  const { family, layer } = classifyMartinoFamily(parsed, chordSymbol);
  const rootPc = parsed ? noteToPc(parsed.root) : 0;
  let minorPc = rootPc;
  let bookRule = 'unknown';
  let parentDiminished = null;
  const familyDominants = [];

  switch (family) {
    case 'minor':
    case 'min9':
    case 'minMaj7':
      minorPc = rootPc;
      bookRule = 'minor-direct';
      break;
    case 'major':
    case 'maj6':
    case 'maj7sharp11':
      minorPc = transposePc(rootPc, -3);
      bookRule = 'relative-minor';
      break;
    case 'maj7':
      if (prevParsed?.quality === 'dom7' || prevParsed?.quality === 'dom7alt') {
        minorPc = transposePc(rootPc, 4);
        bookRule = 'minor-of-third-after-dominant';
      } else if (prevChordSymbol) {
        minorPc = transposePc(rootPc, -3);
        bookRule = 'relative-minor-maj7-line';
      } else {
        minorPc = transposePc(rootPc, 4);
        bookRule = 'minor-of-third';
      }
      break;
    case 'aug':
      minorPc = transposePc(rootPc, 9);
      bookRule = 'augmented-major-sixth';
      break;
    case 'm7b5':
      minorPc = transposePc(rootPc, 3);
      bookRule = 'half-dim-minor-third-up';
      break;
    case 'dom7':
      if (tensionLevel === 'low') {
        minorPc = transposePc(rootPc, 7);
        bookRule = 'dominant-p5-above';
      } else {
        minorPc = transposePc(rootPc, 1);
        bookRule = 'dominant-b2-above';
      }
      familyDominants.push(pcToMinorRootName(rootPc).replace(/m$/, ''));
      break;
    case 'dom7alt':
      minorPc = transposePc(rootPc, 1);
      bookRule = 'dominant-alt-b2-above';
      familyDominants.push(pcToMinorRootName(rootPc).replace(/m$/, ''));
      break;
    case 'dim7':
      minorPc = transposePc(rootPc, 3);
      bookRule = 'dim7-half-dim-pathway';
      parentDiminished = pcToMinorRootName(rootPc).replace(/m$/, '');
      break;
    case 'dim':
      minorPc = transposePc(rootPc, 3);
      bookRule = 'dim-half-dim-pathway';
      parentDiminished = pcToMinorRootName(rootPc).replace(/m$/, '');
      break;
    default:
      minorPc = transposePc(rootPc, -3);
      bookRule = 'fallback-relative-minor';
  }

  return {
    minorRoot: pcToMinorRootName(minorPc),
    tensionLevel,
    layer,
    parentDiminished,
    familyDominants,
    sourceChord: chordSymbol,
    bookRule,
  };
}

/** @param {string} chordSymbol */
export function get_all_conversions(chordSymbol) {
  return (['low', 'medium', 'high']).map((level) => martino_convert(chordSymbol, /** @type {'low'|'medium'|'high'} */ (level), null));
}

/**
 * @param {string[]} chords
 * @param {Record<number, 'low'|'medium'|'high'>} [tensionMap]
 */
export function convert_progression(chords, tensionMap = {}) {
  return chords.map((chord, index) => {
    const level = tensionMap[index] ?? 'low';
    const prev = index > 0 ? chords[index - 1] : null;
    return martino_convert(chord, level, prev);
  });
}
