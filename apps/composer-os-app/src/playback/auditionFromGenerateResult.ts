import { parseXmlToPlaybackSequence } from './musicXmlToPlaybackSequence';
import { initPlayback, play } from './playbackEngine';
import type { PlaybackSequence } from './playbackTypes';

export type AuditionGenerateResult = {
  success?: boolean;
  error?: string;
  xml?: string;
  filepath?: string;
  ensembleMusicXmlFilepath?: string;
  requestEcho?: { bpm?: number };
  runManifest?: {
    seed?: number;
    songwriterStyle?: string;
    presetId?: string;
  };
};

export type AuditionStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'no_notes'
  | 'failed';

export type AuditionFromGenerateResultOptions = {
  bpm?: number;
  timeSig?: string;
  composerId?: string;
  seed?: number;
  autoPlay?: boolean;
  onBeat?: (beat: number) => void;
  onSequence?: (seq: PlaybackSequence | null) => void;
  onStatus?: (status: AuditionStatus, detail?: string) => void;
};

export type AuditionOutcome = {
  status: AuditionStatus;
  sequence: PlaybackSequence | null;
  filepath?: string;
  detail?: string;
  loadedXml?: string;
};

export function resolveAuditionPlaybackFilepath(r: AuditionGenerateResult): string | undefined {
  const ens =
    typeof r.ensembleMusicXmlFilepath === 'string' ? r.ensembleMusicXmlFilepath.trim() : '';
  if (ens) return ens;
  const fp = typeof r.filepath === 'string' ? r.filepath.trim() : '';
  return fp || undefined;
}

export async function playAuditionSequence(
  seq: PlaybackSequence,
  onBeat: (beat: number) => void
): Promise<void> {
  if (!seq.notes?.length) {
    console.warn('[playback] no notes in sequence (parse mismatch or empty score)');
    return;
  }
  await initPlayback();
  await play(seq, onBeat);
}

async function loadXmlForAudition(
  result: AuditionGenerateResult,
  filepath: string | undefined
): Promise<string | null> {
  if (
    filepath &&
    typeof window !== 'undefined' &&
    window.composerOsDesktop?.invokeApi
  ) {
    try {
      const xml = await window.composerOsDesktop.invokeApi('composer-os-api:read-file', {
        path: filepath,
      });
      return typeof xml === 'string' ? xml : null;
    } catch (e) {
      console.warn('[playback] desktop read-file failed:', filepath, e);
      return null;
    }
  }
  if (typeof result.xml === 'string' && result.xml.trim().length > 0) {
    return result.xml;
  }
  return null;
}

export async function auditionFromGenerateResult(
  result: AuditionGenerateResult,
  options: AuditionFromGenerateResultOptions = {}
): Promise<AuditionOutcome> {
  const filepath = resolveAuditionPlaybackFilepath(result);
  const composerId =
    options.composerId ??
    result.runManifest?.songwriterStyle ??
    'unknown';
  const seed = options.seed ?? result.runManifest?.seed;
  const bpm = options.bpm ?? result.requestEcho?.bpm ?? 120;
  const timeSig = options.timeSig ?? '4/4';

  options.onStatus?.('loading');

  const xml = await loadXmlForAudition(result, filepath);
  if (!xml) {
    const detail = result.error ?? 'No MusicXML available for playback';
    options.onStatus?.('failed', detail);
    return { status: 'failed', sequence: null, filepath, detail };
  }

  const seq = parseXmlToPlaybackSequence(xml, bpm, timeSig);
  options.onSequence?.(seq);

  if (!seq.notes.length) {
    console.warn('[audition] No playable notes', { composerId, seed, filepath });
    options.onStatus?.('no_notes', 'No playable notes');
    return { status: 'no_notes', sequence: seq, filepath, detail: 'No playable notes', loadedXml: xml };
  }

  if (options.autoPlay) {
    const onBeat = options.onBeat ?? (() => undefined);
    await playAuditionSequence(seq, onBeat);
    options.onStatus?.('playing');
    return { status: 'playing', sequence: seq, filepath, loadedXml: xml };
  }

  options.onStatus?.('ready');
  return { status: 'ready', sequence: seq, filepath, loadedXml: xml };
}