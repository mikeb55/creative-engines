/**
 * Chord symbol handling for MusicXML harmony export.
 * Root lives in <root>; <kind text="…"> must be suffix-only so readers (e.g. Sibelius)
 * do not concatenate root + full symbol into duplicate letters (DDmin9, GG13).
 * The <kind> element must also contain valid MusicXML enumerated body text (e.g. minor-ninth);
 * the jazz label stays in the `text` attribute only.
 *
 * Display suffixes are normalized here only (lead-sheet style), not in harmony generation.
 */

export {
  ChordRootAndKindText,
  MusicXmlHarmonyParts,
  musicXmlKindContentFromKindText,
  formatChordKindSuffixForDisplay,
  parseChordRootAndMusicXmlKindText,
  parseChordForMusicXmlHarmony,
  formatChordSymbolForDisplay,
  buildHarmonyXmlLine,
} from '../../../core/chordSymbolMusicXml';

import { normalizeChordToken } from '../harmony/chordProgressionParser';
import { formatChordSymbolForDisplay } from '../../../core/chordSymbolMusicXml';

function unescapeXmlAttr(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Reconstruct a chord string from a single exported `<harmony>...</harmony>` block (same shape as musicxmlExporter).
 * Used to verify written MusicXML matches the score without silent reconstruction.
 */
export function chordStringFromMusicXmlHarmonyBlock(block: string): string | null {
  const rootStep = block.match(/<root-step>([A-G])<\/root-step>/)?.[1];
  if (!rootStep) return null;
  const rootAlter = parseInt(block.match(/<root-alter>(-?\d+)<\/root-alter>/)?.[1] ?? '0', 10);
  const kindMatch = block.match(/<kind text="([^"]*)"/);
  const kindRaw = kindMatch ? unescapeXmlAttr(kindMatch[1]) : '';
  const bassStep = block.match(/<bass-step>([A-G])<\/bass-step>/)?.[1];
  const bassAlter = parseInt(block.match(/<bass-alter>(-?\d+)<\/bass-alter>/)?.[1] ?? '0', 10);
  let acc = '';
  if (rootAlter === 1) acc = '#';
  else if (rootAlter === -1) acc = 'b';
  let s = `${rootStep}${acc}${kindRaw}`;
  if (bassStep) {
    let ba = '';
    if (bassAlter === 1) ba = '#';
    else if (bassAlter === -1) ba = 'b';
    s += `/${bassStep}${ba}`;
  }
  return s;
}

/** First `<part>` in score-partwise XML — one `<harmony>` chord string per measure number (Sibelius / export truth). */
export function extractHarmoniesFromFirstPartXml(xml: string): Map<number, string> {
  const parts = xml.match(/<part id="[^"]+"[\s\S]*?<\/part>/g) ?? [];
  const firstPart = parts[0];
  if (!firstPart) return new Map();
  const measures = firstPart.match(/<measure[^>]*>[\s\S]*?<\/measure>/g) ?? [];
  const map = new Map<number, string>();
  for (const mb of measures) {
    const numMatch = mb.match(/<measure[^>]*number="(\d+)"/);
    const num = numMatch ? parseInt(numMatch[1], 10) : -1;
    const harmonyMatch = mb.match(/<harmony[^>]*>[\s\S]*?<\/harmony>/);
    if (!harmonyMatch || num < 1) continue;
    const chordStr = chordStringFromMusicXmlHarmonyBlock(harmonyMatch[0]);
    if (chordStr) map.set(num, chordStr);
  }
  return map;
}

/** Lead-sheet–canonical equality for pipeline truth (score vs XML vs user input). */
export function chordSymbolsEqualForPipelineTruth(a: string, b: string): boolean {
  return (
    normalizeChordToken(formatChordSymbolForDisplay(a)) ===
    normalizeChordToken(formatChordSymbolForDisplay(b))
  );
}
