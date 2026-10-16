export type { PlaybackNote, PlaybackSequence } from './playbackTypes';
export { parseXmlToPlaybackSequence } from './musicXmlToPlaybackSequence';
export { initPlayback, pause, play, sequenceFromTimedNotes, stop, type PlayOptions } from './playbackEngine';
export {
  auditionFromGenerateResult,
  playAuditionSequence,
  resolveAuditionPlaybackFilepath,
  type AuditionFromGenerateResultOptions,
  type AuditionGenerateResult,
  type AuditionOutcome,
  type AuditionStatus,
} from './auditionFromGenerateResult';
