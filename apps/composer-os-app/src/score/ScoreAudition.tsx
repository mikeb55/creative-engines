import { useCallback, useEffect, useRef, useState } from 'react';
import { initPlayback, play, stop } from '../playback/playbackEngine';
import { playbackSequenceFromMusicXml } from './playbackSequenceFromMusicXml';

export type ScoreAuditionProps = {
  musicXml: string | null | undefined;
  label: string;
  loop?: boolean;
  repeat?: number;
  metronome?: boolean;
  /** Increment to start the current score on the shared Tone.js transport. */
  playRequest?: number;
  onSound?: (midi: number, barIndex: number, startBeat: number) => void;
};

type Phase = 'idle' | 'playing' | 'failed';

function haltEngine(): void {
  try {
    stop();
  } catch {
    // A test renderer or a locked audio device has no Tone transport. The page stays up.
  }
}

/** Resume the audio context inside the click, before MusicXML parsing or Transport setup. */
function unlockAudio(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Audio context did not start. Playback needs a browser that can resume audio.'));
    }, 2500);
    initPlayback().then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * One MusicXML audition on the shared Tone.js transport.
 * A second play, a new score, or unmount stops the previous run.
 */
export function ScoreAudition({ musicXml, label, loop = false, repeat = 1, metronome = false, playRequest = 0, onSound }: ScoreAuditionProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [detail, setDetail] = useState<string | null>(null);
  const generation = useRef(0);
  const startRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    generation.current += 1;
    haltEngine();
    setPhase('idle');
    setDetail(null);
    return () => {
      generation.current += 1;
      haltEngine();
    };
  }, [musicXml]);

  const start = useCallback(async () => {
    const token = generation.current + 1;
    generation.current = token;
    setDetail(null);
    try {
      await unlockAudio();
      if (token !== generation.current) return;
      haltEngine();
      const loaded = playbackSequenceFromMusicXml(musicXml);
      if (token !== generation.current) return;
      if (!loaded.ok || !loaded.sequence) {
        setPhase('failed');
        setDetail(loaded.error);
        return;
      }
      setPhase('playing');
      setDetail(null);
      await play(loaded.sequence, () => undefined, {
        loop,
        repeat,
        metronome,
        onSound,
        onEnded: () => {
          if (token !== generation.current) return;
          setPhase('idle');
          setDetail(null);
        },
      });
      if (token !== generation.current) haltEngine();
    } catch (error) {
      if (token !== generation.current) return;
      haltEngine();
      setPhase('failed');
      setDetail(error instanceof Error ? error.message : String(error));
    }
  }, [musicXml, loop, repeat, metronome, onSound]);

  startRef.current = start;

  useEffect(() => {
    if (!playRequest) return;
    const timer = window.setTimeout(() => {
      void startRef.current();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [playRequest]);

  const halt = useCallback(() => {
    generation.current += 1;
    haltEngine();
    setPhase('idle');
    setDetail(null);
  }, []);

  const disabled = !musicXml || !String(musicXml).trim();

  return (
    <div data-testid="score-audition" style={{ display: 'grid', gap: '0.35rem' }}>
      <div style={{ fontSize: '0.85rem' }}>{label}</div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button type="button" data-testid="score-audition-play" disabled={disabled || phase === 'playing'} onClick={() => void start()}>
          Play
        </button>
        <button type="button" data-testid="score-audition-stop" disabled={phase !== 'playing'} onClick={halt}>
          Stop
        </button>
        <button type="button" data-testid="score-audition-replay" disabled={disabled} onClick={() => void start()}>
          Replay
        </button>
      </div>
      <p role="status" data-testid="score-audition-status" style={{ margin: 0, fontSize: '0.82rem', color: phase === 'failed' ? '#e88' : 'var(--text-muted)' }}>
        {phase === 'playing' ? 'Playing' : phase === 'failed' ? detail : 'Ready'}
      </p>
    </div>
  );
}
