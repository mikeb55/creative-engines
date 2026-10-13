export type {
  BhlLockMap,
  BhlLockReport,
  BhlLockSpec,
  BhlMetreLock,
  BhlSoundingBass,
  BhlSourceEvent,
  BhlSpan,
  BhlTempoLock,
  BhlTextKind,
  BhlTextLock,
} from './bhlTypes';
export { extractBhlSnapshot, ingestBhlSource, lockSpecOf, sha256Buffer, sha256File } from './bhlIngest';
export {
  BHL_ALBUM_ROOT,
  BhlExportRejected,
  assertBhlExportPath,
  copyBhlSourceLossless,
  type BhlCopyRequest,
  type BhlCopyResult,
  type BhlExportRejectReason,
} from './bhlCopy';
export { verifyBhlLocks, verifyRecordedSourceSha } from './bhlVerify';
export { preserveBhlSource, type BhlPreserveRequest, type BhlPreserveResult } from './bhlPreserve';
export {
  BHL_EXCLUDED_VAULT_TYPES,
  chooseVaultChord,
  deriveBhlPhrasePlan,
  listBhlFieldChoices,
  bhlPitchClassName,
  evaluateBhlPredicates,
  neighborCell,
  type BhlDialogue,
  type BhlDensity,
  type BhlFieldChoice,
  type BhlFieldSnap,
  type BhlGuitarEvent,
  type BhlMotifSource,
  type BhlPhrasePlan,
  type BhlPhraseRegion,
  type BhlPhraseRole,
  type BhlPitchTransform,
  type BhlPredicateResult,
} from './bhlPhrase';
export type { BhlRhythmTransform } from './bhlRhythm';
export {
  detectMechanicalOnsets,
  legalAnswerSlots,
  planPhraseOnsets,
  readBassBars,
  type BhlBassBar,
  type BhlMechanicalHit,
  type BhlOnsetPlan,
} from './bhlRhythm';
export { generateBhlGuitar, type BhlGeneratedGuitar, type BhlLiquidTrace } from './bhlGenerate';
export { outsideSpanIdentical, replaceBhlGuitar, type BhlHarmonyChange } from './bhlWrite';
export { composeBhlGuitar, type BhlComposeRequest, type BhlComposeResult } from './bhlCompose';
