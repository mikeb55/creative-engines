/**
 * Chord symbol → MusicXML <harmony> (shared with Composer OS export rules).
 * `<kind text="…">` is suffix-only (e.g. m7, maj7) so readers do not duplicate the root letter.
 */

export interface ChordRootAndKindText {
  rootStep: string;
  rootAlter: number;
  /** Suffix only, e.g. min9, 13, maj9, 7alt */
  kindText: string;
}

const DEFAULT_MUSICXML_KIND_CONTENT = 'major';

/**
 * Maps lead-sheet kind suffix (same string as `<kind text="…">`) to MusicXML &lt;kind&gt; element body.
 */
export function musicXmlKindContentFromKindText(kindText: string): string {
  const raw = kindText.trim();
  if (raw === '') return DEFAULT_MUSICXML_KIND_CONTENT;

  const key = raw.toLowerCase().replace(/\s+/g, '');

  const exact: Record<string, string> = {
    m: 'minor',
    min: 'minor',
    minor: 'minor',
    maj: 'major',
    major: 'major',
    dim: 'diminished',
    aug: 'augmented',
    '+': 'augmented',
    o: 'diminished',
    '7': 'dominant',
    '9': 'dominant-ninth',
    '11': 'dominant-11th',
    '13': 'dominant-13th',
    '7alt': 'dominant',
    maj7: 'major-seventh',
    maj9: 'major-ninth',
    maj11: 'major-11th',
    maj13: 'major-13th',
    m7: 'minor-seventh',
    min7: 'minor-seventh',
    m9: 'minor-ninth',
    min9: 'minor-ninth',
    m11: 'minor-11th',
    m13: 'minor-13th',
    m7b5: 'half-diminished',
    dim7: 'diminished-seventh',
    sus: 'suspended-fourth',
    sus2: 'suspended-second',
    sus4: 'suspended-fourth',
    '6': 'major-sixth',
    m6: 'minor-sixth',
  };

  if (exact[key]) return exact[key];

  if (key.startsWith('maj')) return 'major-seventh';
  if (key.includes('alt')) return 'dominant';
  if (/13/.test(key)) return 'dominant-13th';
  if (/11/.test(key)) return 'dominant-11th';
  if (/9/.test(key)) return key.startsWith('m') || key.includes('min') ? 'minor-ninth' : 'dominant-ninth';
  if (/7/.test(key)) return 'dominant';
  if (key.startsWith('m') && !key.startsWith('maj')) return 'minor';

  return DEFAULT_MUSICXML_KIND_CONTENT;
}

/** MusicXML harmony: harmonic root/kind on the upper structure; slash bass in `<bass>`. */
export interface MusicXmlHarmonyParts extends ChordRootAndKindText {
  bassStep?: string;
  bassAlter?: number;
}

export function formatChordKindSuffixForDisplay(rawSuffix: string): string {
  let s = rawSuffix.trim();
  if (s.length === 0) return '';

  s = s.replace(/major(\d+)/gi, 'maj$1');
  s = s.replace(/minor/gi, 'm');
  s = s.replace(/major/gi, '');
  s = s.replace(/min(?=\d)/gi, 'm');

  return s;
}

export function parseChordRootAndMusicXmlKindText(
  chord: string,
  opts?: { literalKind?: boolean }
): ChordRootAndKindText {
  const t = chord.trim();
  const m = t.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) {
    return {
      rootStep: 'C',
      rootAlter: 0,
      kindText: t.length > 0 ? formatChordKindSuffixForDisplay(t) : '',
    };
  }
  const letter = m[1].toUpperCase();
  let alter = 0;
  if (m[2] === '#') alter = 1;
  else if (m[2] === 'b') alter = -1;
  let suffix = (m[3] ?? '').trim();

  const dup = suffix.match(/^([A-Ga-g])([#b]?)/);
  if (dup) {
    const sl = dup[1].toUpperCase();
    const sa = dup[2] === '#' ? 1 : dup[2] === 'b' ? -1 : 0;
    if (sl === letter && sa === alter) {
      suffix = suffix.slice(dup[0].length).trim();
    }
  }

  const kindText =
    suffix.length > 0
      ? opts?.literalKind
        ? suffix
        : formatChordKindSuffixForDisplay(suffix)
      : '';
  return { rootStep: letter, rootAlter: alter, kindText };
}

export function parseChordForMusicXmlHarmony(
  chord: string,
  opts?: { literalKind?: boolean }
): MusicXmlHarmonyParts {
  const t = chord.trim();
  const slash = t.indexOf('/');
  const harmonyPart = slash >= 0 ? t.slice(0, slash).trim() : t;
  const bassPart = slash >= 0 ? t.slice(slash + 1).trim() : undefined;
  const base = parseChordRootAndMusicXmlKindText(harmonyPart, opts);
  if (!bassPart) {
    return base;
  }
  const bm = bassPart.match(/^([A-Ga-g])([#b]?)$/);
  if (!bm) {
    return { ...base, kindText: `${base.kindText}/${bassPart}` };
  }
  const letter = bm[1].toUpperCase();
  let bassAlter = 0;
  if (bm[2] === '#') bassAlter = 1;
  else if (bm[2] === 'b') bassAlter = -1;
  return {
    rootStep: base.rootStep,
    rootAlter: base.rootAlter,
    kindText: base.kindText,
    bassStep: letter,
    bassAlter,
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function alterToAccidental(alter: number): string {
  if (alter === 1) return '#';
  if (alter === -1) return 'b';
  return '';
}

/** Lead-sheet display string (root + suffix + optional slash bass). */
export function formatChordSymbolForDisplay(chord: string): string {
  const p = parseChordForMusicXmlHarmony(chord);
  const root = `${p.rootStep}${alterToAccidental(p.rootAlter)}`;
  const kind = p.kindText ?? '';
  if (p.bassStep !== undefined) {
    const bass = `${p.bassStep}${alterToAccidental(p.bassAlter ?? 0)}`;
    return `${root}${kind}/${bass}`;
  }
  return `${root}${kind}`;
}

/**
 * One line of MusicXML: `<harmony>…</harmony>` at beat 1. Optional `<staff>` for multi-staff parts.
 */
export function buildHarmonyXmlLine(
  chordSymbol: string,
  opts?: { staffNumber?: number; literalKind?: boolean }
): string {
  const { rootStep, rootAlter, kindText, bassStep, bassAlter } = parseChordForMusicXmlHarmony(chordSymbol, {
    literalKind: opts?.literalKind,
  });
  const kindContent = musicXmlKindContentFromKindText(kindText);
  const alterEl = rootAlter !== 0 ? `<root-alter>${rootAlter}</root-alter>` : '';
  const bassAlterEl =
    bassStep !== undefined && bassAlter !== undefined && bassAlter !== 0 ? `<bass-alter>${bassAlter}</bass-alter>` : '';
  const bassEl =
    bassStep !== undefined ? `<bass><bass-step>${bassStep}</bass-step>${bassAlterEl}</bass>` : '';
  const staffEl =
    opts?.staffNumber !== undefined ? `<staff>${opts.staffNumber}</staff>` : '';
  return `    <harmony>${staffEl}<root><root-step>${rootStep}</root-step>${alterEl}</root><kind text="${escapeXml(
    kindText
  )}">${escapeXml(kindContent)}</kind>${bassEl}</harmony>
`;
}
