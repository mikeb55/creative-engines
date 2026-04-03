/**
 * Chord symbol → MusicXML &lt;harmony&gt; (shared with Composer OS export rules).
 * Re-exports parsing + degree helpers from core; `buildHarmonyXmlLine` uses unified {@link ChordSemantics}.
 */

export * from './chordSymbolMusicXmlCore';
export { buildChordSemantics, buildHarmonyXmlLine, parseRootNotation, type ChordSemantics } from './chordSemantics';
