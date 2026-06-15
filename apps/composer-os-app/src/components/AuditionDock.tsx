import { useCallback, useEffect, useRef, useState } from 'react';
import { pause, stop } from '../playback';
import {
  auditionFromGenerateResult,
  playAuditionSequence,
  type AuditionGenerateResult,
  type AuditionStatus,
} from '../playback/auditionFromGenerateResult';
import type { PlaybackSequence } from '../playback';
import { api } from '../services/api';
import { buildAuditionGenerateRequest } from '../utils/buildAuditionGenerateRequest';

export type AuditionDockProps = {
  composerId: string | null;
  composerLabel: string | null;
  onOpenFullControls: (id: string) => void;
};

const STATUS_LABEL: Record<AuditionStatus, string> = {
  idle: 'Ready to listen',
  loading: 'Generating',
  ready: 'Ready',
  playing: 'Playing',
  paused: 'Paused',
  no_notes: 'No playable notes',
  failed: 'Failed',
};

const focusRing: React.CSSProperties = {
  outline: '2px solid var(--accent, #6ae)',
  outlineOffset: 2,
};

export function AuditionDock({ composerId, composerLabel, onOpenFullControls }: AuditionDockProps) {
  const [status, setStatus] = useState<AuditionStatus>('idle');
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [trustLine, setTrustLine] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [playbackSeq, setPlaybackSeq] = useState<PlaybackSequence | null>(null);
  const activeComposerRef = useRef<string | null>(null);
  const listenGenRef = useRef(0);

  const haltPlayback = useCallback(() => {
    stop();
    setIsPlaying(false);
    if (status === 'playing') setStatus('idle');
  }, [status]);

  useEffect(() => {
    if (composerId && composerId !== activeComposerRef.current && (isPlaying || isListening)) {
      haltPlayback();
      setStatus('idle');
      setStatusDetail(null);
    }
    activeComposerRef.current = composerId;
  }, [composerId, haltPlayback, isListening, isPlaying]);

  const handleListen = useCallback(async () => {
    if (!composerId) return;
    const gen = ++listenGenRef.current;
    haltPlayback();
    setIsListening(true);
    setStatus('loading');
    setStatusDetail(`Generating ${composerLabel ?? composerId}`);
    setTrustLine(null);

    try {
      const body = buildAuditionGenerateRequest(composerId);
      const result = (await api.generate(body)) as AuditionGenerateResult;
      if (gen !== listenGenRef.current) return;

      if (!result.success) {
        const err = result.error ?? 'Generation failed';
        setStatus('failed');
        setStatusDetail(err);
        setTrustLine(`seed ${body.seed} · ${composerId}`);
        return;
      }

      const outcome = await auditionFromGenerateResult(result, {
        composerId,
        seed: body.seed,
        autoPlay: true,
        onBeat: () => undefined,
        onSequence: (seq) => {
          setPlaybackSeq(seq);
        },
        onStatus: (s, detail) => {
          setStatus(s);
          if (detail) setStatusDetail(detail);
        },
      });
      if (gen !== listenGenRef.current) return;

      const seed = result.runManifest?.seed ?? body.seed;
      const path = outcome.filepath ?? result.filepath ?? 'inline xml';
      setTrustLine(`seed ${seed} · ${composerId} · ${path}`);

      if (outcome.status === 'playing') {
        setIsPlaying(true);
      } else if (outcome.status === 'no_notes') {
        setIsPlaying(false);
        setStatusDetail('No playable notes');
      } else if (outcome.status === 'failed') {
        setIsPlaying(false);
        setStatusDetail(outcome.detail ?? 'Failed');
      }
    } catch (e) {
      if (gen !== listenGenRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      setStatus('failed');
      setStatusDetail(msg);
      setIsPlaying(false);
    } finally {
      if (gen === listenGenRef.current) setIsListening(false);
    }
  }, [composerId, composerLabel, haltPlayback]);

  const handlePlay = useCallback(async () => {
    if (!playbackSeq?.notes?.length) {
      setStatus('no_notes');
      setStatusDetail('No playable notes');
      return;
    }
    haltPlayback();
    await playAuditionSequence(playbackSeq, () => undefined);
    setIsPlaying(true);
    setStatus('playing');
  }, [haltPlayback, playbackSeq]);

  const handlePause = useCallback(() => {
    pause();
    setIsPlaying(false);
    setStatus('paused');
  }, []);

  const handleStop = useCallback(() => {
    haltPlayback();
    setStatus('idle');
    setStatusDetail(null);
  }, [haltPlayback]);

  const statusText =
    status === 'loading' && composerLabel
      ? `Generating ${composerLabel}`
      : statusDetail ?? STATUS_LABEL[status];

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.65rem 0.75rem',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-panel, rgba(128,128,128,0.06))',
        marginTop: '0.35rem',
      }}
      data-testid="audition-dock"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ minWidth: 0 }}>
          {composerLabel ? (
            <div
              style={{
                fontWeight: 600,
                fontSize: '0.92rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {composerLabel}
            </div>
          ) : (
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Select a composer</span>
          )}
        </div>
        <button
          type="button"
          disabled={!composerId || isListening}
          onClick={() => void handleListen()}
          aria-label={composerLabel ? `Listen to ${composerLabel}` : 'Listen to selected composer'}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusRing)}
          onBlur={(e) => {
            e.currentTarget.style.outline = '';
            e.currentTarget.style.outlineOffset = '';
          }}
        >
          {isListening ? 'Generating…' : 'Listen'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="secondary"
          disabled={!playbackSeq?.notes?.length || isPlaying}
          onClick={() => void handlePlay()}
          aria-label="Play audition"
          onFocus={(e) => Object.assign(e.currentTarget.style, focusRing)}
          onBlur={(e) => {
            e.currentTarget.style.outline = '';
            e.currentTarget.style.outlineOffset = '';
          }}
        >
          Play
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!isPlaying}
          onClick={handlePause}
          aria-label="Pause audition"
          onFocus={(e) => Object.assign(e.currentTarget.style, focusRing)}
          onBlur={(e) => {
            e.currentTarget.style.outline = '';
            e.currentTarget.style.outlineOffset = '';
          }}
        >
          Pause
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!isPlaying && status !== 'paused'}
          onClick={handleStop}
          aria-label="Stop audition"
          onFocus={(e) => Object.assign(e.currentTarget.style, focusRing)}
          onBlur={(e) => {
            e.currentTarget.style.outline = '';
            e.currentTarget.style.outlineOffset = '';
          }}
        >
          Stop
        </button>
        {composerId ? (
          <button
            type="button"
            className="secondary"
            style={{ marginLeft: 'auto', fontSize: '0.82rem' }}
            onClick={() => onOpenFullControls(composerId)}
            aria-label="Open full generate controls"
            onFocus={(e) => Object.assign(e.currentTarget.style, focusRing)}
            onBlur={(e) => {
              e.currentTarget.style.outline = '';
              e.currentTarget.style.outlineOffset = '';
            }}
          >
            Open full controls
          </button>
        ) : null}
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minHeight: '1.2rem' }}
      >
        <strong style={{ color: 'var(--text)' }}>{STATUS_LABEL[status]}:</strong> {statusText}
      </div>
      {trustLine ? (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{trustLine}</div>
      ) : null}
    </div>
  );
}