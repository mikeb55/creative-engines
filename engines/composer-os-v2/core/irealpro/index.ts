export type { ParsedChord, ParsedChart, ParsedRepeatMarker, ParsedSection } from './parsedChart';
export { parseIRealProInput } from './irealProAdapter';
export { inspectChordToMusicXml, vaultRiffScoreNotesToMusicXml } from './chordInspectorMusicXml';
export type { InspectChordToMusicXmlOptions } from './chordInspectorMusicXml';
export {
  inspectChordSymbol,
  mapChordToVaultType,
  parseChordProgressionText,
} from './chordSymbolMapper';
export type { ChordInspectorResult } from './chordSymbolMapper';
export type { GenerateFromIRealOptions, IRealVaultOutput, VaultGenerationOptions } from './irealVaultPipeline';
export type { ChorusTensionProgression, PhraseContourTag, VaultHookIdentity } from './vaultChorusPhraseDiagnostics';
export {
  effectiveMeterForBar,
  generateFromIReal,
  generateVaultFromParsedChart,
  TRIAD_PAIR_CHORUS_ROTATION,
} from './irealVaultPipeline';
export type { EmotionalDrift } from '../harmony/reharmCandidateEngine';
export { remixSeed } from '../remix/deterministicVaultRemix';
export {
  deriveVaultRngRoot,
  mixUint32,
  remixVaultSeed,
  suggestVaultSeedFromChart,
} from '../remix/vaultSeedMix';
