/**
 * Long-Line Practice Lab — reusable core (Phase 2D).
 * Seedable lines, harmonic context, MusicXML intake, MusicXML export. No UI.
 */

export {
  LONG_LINE_PRACTICE_VERSION,
  LONG_LINE_PROFILES,
  type LongLineEvent,
  type LongLineExportBarMeta,
  type LongLineExportedScore,
  type LongLineExportRequest,
  type LongLineHarmonyBar,
  type LongLineHarmonyCandidate,
  type LongLineHarmonyRequest,
  type LongLineHarmonyResult,
  type LongLineHarmonyStatus,
  type LongLineMeter,
  type LongLineMusicXmlBarContext,
  type LongLineMusicXmlContext,
  type LongLineMusicXmlGenerateRequest,
  type LongLineMusicXmlGenerateResult,
  type LongLineMusicXmlRange,
  type LongLineProfile,
  type LongLineRegister,
  type LongLineRequest,
  type LongLineResult,
  type LongLineSourceMelodyEvent,
  type LongLineTimedBassEvent,
} from './types';

export { longLineMeterSpanQuarters, isSameLongLineMeter } from './meter';

export {
  generateLongLine,
  defaultLongLineRegister,
  midisInRegister,
  longLineEventSignature,
} from './generateLongLine';

export { generateLongLinesOverHarmony, eventsRespectHarmonyFields } from './harmonicContext';

export {
  extractLongLineMusicXmlContext,
  generateLongLinesFromMusicXml,
  resolveHarmonyMark,
} from './musicXmlContext';

export {
  exportLongLinePracticeScores,
  exportLongLineScoresFromMusicXmlResult,
  fillBarEvents,
  bassEventsForBar,
  assertNoTabStaff,
  buildLongLineExportScoreForTests,
  longLineExportVersion,
} from './exportMusicXml';
