import type { FretboardRealization } from '../guitar/fretboardRealization';
import { buildGuitarGripLibrary } from '../guitar/guitarGripLibrary';
import { selectQuadratonicMelodySpec } from '../harmony/quadratonicMelodySelector';
import { TONALITY_VAULT_DATABASE } from '../harmony/tonalityVaultDatabase';
import type { ParsedChord, ParsedChart, ParsedSection } from './parsedChart';

const VAULT_TYPE_IDS = new Set(TONALITY_VAULT_DATABASE.map((row) => row.chordType));

const ROOT_TO_PC: Record<string, number> = {
  c: 0,
  'c#': 1,
  db: 1,
  d: 2,
  'd#': 3,
  eb: 3,
  e: 4,
  f: 5,
  'f#': 6,
  gb: 6,
  g: 7,
  'g#': 8,
  ab: 8,
  a: 9,
  'a#': 10,
  bb: 10,
  b: 11,
};

/** Normalise iReal-style extensions for stable matching (Δ, ^, -, M7/M9 major rules). */
export function normalizeChordQualityForMapping(raw: string): string {
  let s = raw.trim();
  if (!s) return '';
  s = s.replace(/^M(\d)/g, 'maj$1');
  if (s === 'M') {
    s = 'major';
  }
  s = s.replace(/mM7/gi, 'minmaj7');
  s = s.replace(/mM9/gi, 'minmaj9');
  s = s.replace(/-M7/gi, 'minmaj7');
  s = s.replace(/-M9/gi, 'minmaj9');
  s = s.toLowerCase();
  s = s.replace(/\s+/g, '');
  s = s.replace(/Δ/g, 'maj');
  s = s.replace(/\^/g, 'maj');
  if (s.startsWith('-')) {
    s = `m${s.slice(1)}`;
  }
  s = s.replace(/^maj#11#9$/, 'maj7#11#9');
  s = s.replace(/^maj#11$/, 'maj7#11');
  /* Unambiguous major-seven sharp-five (avoid min7#5 collision after lowercasing). */
  s = s.replace(/^m7#5$/i, 'maj7#5');
  return s;
}

export function parseRootNoteToPc(rootNote: string): number | null {
  const key = rootNote.trim().toLowerCase();
  if (!key) return null;
  const pc = ROOT_TO_PC[key];
  return pc === undefined ? null : pc;
}

type Rule = { match: (s: string) => boolean; vaultId: string };

/**
 * Longest / most specific qualities first. Only returns ids present in {@link TONALITY_VAULT_DATABASE}.
 */
const QUALITY_RULES: Rule[] = [
  { match: (s) => s === 'maj7#11#9', vaultId: 'Maj7#11#9' },
  { match: (s) => s === 'minmaj13#11#9', vaultId: 'minMaj13#11#9' },
  /** iReal `^7b5` → `maj7b5`; vault has no maj7b5 — treat as lydian major (`Maj7#11`). */
  { match: (s) => s === 'maj7b5', vaultId: 'Maj7#11' },
  { match: (s) => s === 'maj7#11', vaultId: 'Maj7#11' },
  /** `^7#5`, `maj7#5`, `M7#5` (via normalize); `m7#5` rewritten to `maj7#5` above. */
  { match: (s) => s === 'maj7#5', vaultId: 'Maj7#5' },
  { match: (s) => s === 'maj9', vaultId: 'Maj9' },
  { match: (s) => s === 'maj7' || s === 'maj', vaultId: 'Maj7' },
  { match: (s) => s === 'major', vaultId: 'Maj7' },
  { match: (s) => s === 'minmaj9', vaultId: 'minMaj9' },
  { match: (s) => s === 'minmaj7', vaultId: 'minMaj9' },
  { match: (s) => s === 'min11' || s === 'm11', vaultId: 'min11' },
  {
    match: (s) => s === 'm7b5' || s === 'ø' || s === 'ø7' || s === 'h7',
    vaultId: 'min7b5',
  },
  { match: (s) => s === 'min9' || s === 'm9', vaultId: 'min9' },
  { match: (s) => s === 'min7' || s === 'm7', vaultId: 'min9' },
  { match: (s) => s === 'min' || s === 'm', vaultId: 'min9' },
  { match: (s) => s === '-', vaultId: 'min9' },
  { match: (s) => s === '13#11' || s === '7#11', vaultId: '13#11#9' },
  { match: (s) => s === '13b9' || s === '7b9', vaultId: '13b9' },
  { match: (s) => s === '7#9#5' || s === '7alt', vaultId: '7#9#5' },
  { match: (s) => s === 'dom7' || s === '7', vaultId: '13#11#9' },
  { match: (s) => s === 'dim' || s === 'dim7' || s === 'o' || s === 'o7', vaultId: 'dim7b13' },
  { match: (s) => s === 'susb9' || s === '7susb9', vaultId: 'sus-b9' },
  { match: (s) => s === 'sus' || s === 'sus4' || s === 'sus2', vaultId: 'sus9' },
];

function mapNormalisedQualityToVaultId(normalised: string): string | null {
  if (normalised === '') {
    return 'Maj7';
  }
  for (const { match, vaultId } of QUALITY_RULES) {
    if (match(normalised) && VAULT_TYPE_IDS.has(vaultId)) {
      return vaultId;
    }
  }
  return null;
}

/**
 * Map a parsed chord symbol to a Tonality Vault **`chordType`** id + absolute **root PC** (C = 0 … B = 11).
 */
export function mapChordToVaultType(chord: ParsedChord): { vaultChordTypeId: string; rootPc: number } | null {
  const rootPc = parseRootNoteToPc(chord.rootNote);
  if (rootPc === null) {
    return null;
  }
  const q = normalizeChordQualityForMapping(chord.chordQuality);
  const vaultChordTypeId = mapNormalisedQualityToVaultId(q);
  if (vaultChordTypeId === null) {
    return null;
  }
  return { vaultChordTypeId, rootPc };
}

function normalizeRootForDisplay(rootLower: string): string {
  if (rootLower.length <= 1) return rootLower.toUpperCase();
  return rootLower[0]!.toUpperCase() + rootLower.slice(1);
}

/**
 * Split a single chord symbol into **`rootNote`** (Vault **`parseRootNoteToPc`** form, lowercase) + **`chordQuality`** (remainder).
 */
function parseChordSymbolComponents(symbol: string): { rootNote: string; chordQuality: string } | null {
  const s = symbol.trim();
  if (!s) return null;
  const m = /^([A-Ga-g])([#b]?)(.*)$/.exec(s);
  if (!m) return null;
  const rootNote = (m[1]! + (m[2] ?? '')).toLowerCase();
  const chordQuality = (m[3] ?? '').trim();
  if (parseRootNoteToPc(rootNote) === null) return null;
  return { rootNote, chordQuality };
}

function absPc(rootPc: number, rel: number): number {
  return ((rootPc + rel) % 12 + 12) % 12;
}

export type ChordInspectorResult = {
  inputSymbol: string;
  rootNote: string;
  rootPc: number;
  vaultChordTypeId: string;
  melodicTriad: number[];
  primaryTensionNote: number;
  quadratonicPitchClasses: number[];
  guitarGrips: FretboardRealization[];
};

/**
 * Parse **`rootNote` + `chordQuality`** (e.g. `Cmaj7`, `F#min9`, `Bb7#11`), map to the Vault, then expose
 * quadratonic spec + guitar grips. Returns **`null`** if the symbol cannot be split, is not a valid root, or does not map.
 */
export function inspectChordSymbol(input: string, tuningId?: string): ChordInspectorResult | null {
  const parsed = parseChordSymbolComponents(input);
  if (!parsed) return null;

  const chord: ParsedChord = {
    symbol: input.trim(),
    rootNote: parsed.rootNote,
    chordQuality: parsed.chordQuality,
    duration: 1,
    barIndex: 0,
    beatIndex: 0,
  };

  const mapped = mapChordToVaultType(chord);
  if (!mapped) return null;

  const spec = selectQuadratonicMelodySpec(mapped.vaultChordTypeId);
  if (!spec) return null;

  const { vaultChordTypeId, rootPc } = mapped;
  const melodicTriad = spec.melodicTriad.map((t) => absPc(rootPc, t.pitchClassFromRoot));
  const primaryTensionNote = absPc(rootPc, spec.primaryTension.pitchClassFromRoot);
  const quadratonicPitchClasses = spec.quadratonicPitchClassesFromRoot.map((pc) => absPc(rootPc, pc));

  const guitarGrips = buildGuitarGripLibrary(vaultChordTypeId, rootPc, tuningId ?? 'standard');

  return {
    inputSymbol: input.trim(),
    rootNote: normalizeRootForDisplay(parsed.rootNote),
    rootPc,
    vaultChordTypeId,
    melodicTriad,
    primaryTensionNote,
    quadratonicPitchClasses,
    guitarGrips,
  };
}

/**
 * Plain-text lead sheet: **`|`** barlines, chords in a bar separated by spaces (e.g. `Cmaj7 Dm7 | G7 | Cmaj7`).
 */
export function parseChordProgressionText(
  text: string,
  key: string,
  timeSignature: { num: number; den: number },
  tempo: number
): ParsedChart {
  const rawBars = text.split('|');
  const measures: ParsedChord[][] = [];

  for (let barIndex = 0; barIndex < rawBars.length; barIndex++) {
    const seg = rawBars[barIndex] ?? '';
    const tokens = seg.trim().split(/\s+/).filter((t) => t.length > 0);
    const row: ParsedChord[] = [];

    for (let beatIndex = 0; beatIndex < tokens.length; beatIndex++) {
      const symbol = tokens[beatIndex]!.trim();
      if (/^n\.?c\.?$/i.test(symbol)) {
        row.push({
          symbol: 'N.C.',
          rootNote: '',
          chordQuality: '',
          duration: 1,
          barIndex,
          beatIndex,
        });
        continue;
      }
      const parsed = parseChordSymbolComponents(symbol);
      if (parsed) {
        row.push({
          symbol,
          rootNote: parsed.rootNote,
          chordQuality: parsed.chordQuality,
          duration: 1,
          barIndex,
          beatIndex,
        });
      } else {
        row.push({
          symbol,
          rootNote: '',
          chordQuality: '',
          duration: 1,
          barIndex,
          beatIndex,
        });
      }
    }
    measures.push(row);
  }

  const barCount = measures.length;
  const sections: ParsedSection[] =
    barCount <= 0 ? [] : [{ label: 'A', startBar: 0, endBar: barCount - 1 }];

  const t = Number(tempo);
  return {
    title: '',
    composer: '',
    key: key.trim() !== '' ? key.trim() : null,
    timeSignature,
    barMeterMap: {},
    repeatMarkers: [],
    tempo: Number.isFinite(t) ? t : null,
    style: null,
    sections,
    measures,
    repeats: [],
  };
}
