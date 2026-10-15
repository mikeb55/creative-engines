import { parseXmlToPlaybackSequence } from '../playback/musicXmlToPlaybackSequence';
import type { PlaybackSequence } from '../playback/playbackTypes';

/** Printed tempo when the score carries one. The parser itself only receives a number. */
export function tempoFromMusicXml(xml: string, fallback = 120): number {
  const sound = /<sound\b[^>]*\btempo="([0-9]+(?:\.[0-9]+)?)"/i.exec(xml);
  const perMinute = /<per-minute>\s*([0-9]+(?:\.[0-9]+)?)\s*<\/per-minute>/i.exec(xml);
  const raw = sound?.[1] ?? perMinute?.[1];
  const tempo = raw === undefined ? fallback : Number(raw);
  return Number.isFinite(tempo) && tempo > 0 ? tempo : fallback;
}

export type PlaybackLoad =
  | { ok: true; sequence: PlaybackSequence }
  | { ok: false; error: string; sequence: PlaybackSequence | null };

/**
 * Turn MusicXML into the existing playback sequence.
 * Invalid markup returns an error and does not throw.
 */
export function playbackSequenceFromMusicXml(xml: string | null | undefined): PlaybackLoad {
  const source = typeof xml === 'string' ? xml.trim() : '';
  if (!source) {
    return { ok: false, error: 'No MusicXML to play.', sequence: null };
  }
  try {
    const doc = new DOMParser().parseFromString(source, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      return { ok: false, error: 'MusicXML could not be parsed.', sequence: null };
    }
    const sequence = parseXmlToPlaybackSequence(source, tempoFromMusicXml(source), '4/4');
    if (!sequence.notes.length) {
      return { ok: false, error: 'No playable notes in this score.', sequence };
    }
    return { ok: true, sequence };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      sequence: null,
    };
  }
}
