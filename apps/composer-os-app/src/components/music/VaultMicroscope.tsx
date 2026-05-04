'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { buildBeatContextLegalityMap } from '@composer-os/core/harmony/beatContextLegalityMap';
import {
  LayerStateMachine,
  type TensionState,
} from '@composer-os/core/harmony/layerStateMachine';
import type { NoteTag } from '@composer-os/core/harmony/noteTag';
import { selectQuadratonicMelodySpec } from '@composer-os/core/harmony/quadratonicMelodySelector';
import type { GenerationMode } from '@composer-os/core/generation/generationModeProfile';
import type { ScoreNote } from '@composer-os/core/guitar/vaultRiffGenerator';
import { FretboardPanel, type FretboardNote, type NoteLayer } from './FretboardPanel';

export type VaultMicroscopeProps = {
  scoreNotes: ScoreNote[];
  totalBars: number;
  chordTypeId: string;
  rootPc: number;
  mode?: GenerationMode;
  className?: string;
};

const TENSION_BADGE: Record<TensionState, { bg: string; fg: string; label: string }> = {
  resolve: { bg: '#166534', fg: '#ecfdf5', label: 'resolve' },
  primary: { bg: '#1d4ed8', fg: '#eff6ff', label: 'primary' },
  tension: { bg: '#b45309', fg: '#fffbeb', label: 'tension' },
  chaos: { bg: '#b91c1c', fg: '#fef2f2', label: 'chaos' },
  recover: { bg: '#7e22ce', fg: '#faf5ff', label: 'recover' },
};

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function relToAbs(rootPc: number, rel: number): number {
  return normalizePc(rootPc + rel);
}

function globalQuarterStart(n: ScoreNote): number {
  return (n.barIndex - 1) * 4 + n.startBeat;
}

function beatStrengthAtQuarter(globalQuarterBeat: number): 'strong' | 'weak' | 'offbeat' {
  const inBar = globalQuarterBeat % 4;
  const eighthIdx = Math.floor(inBar * 2 + 1e-9) % 8;
  if (eighthIdx === 0 || eighthIdx === 4) return 'strong';
  if (eighthIdx === 2 || eighthIdx === 6) return 'weak';
  return 'offbeat';
}

const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function pcLabel(pc: number): string {
  return PC_NAMES[normalizePc(pc)] ?? String(pc);
}

/** Map scrubber `offbeat` to vault tags that favour offbeat attacks. */
function legalityAlignsBeat(
  tag: NoteTag | undefined,
  now: 'strong' | 'weak' | 'offbeat'
): boolean {
  if (!tag) return false;
  if (now === 'offbeat') {
    return tag.beatLegality === 'syncopated' || tag.beatLegality === 'approachOnly';
  }
  return tag.beatLegality === now;
}

function scoreNoteKey(n: ScoreNote): string {
  return `${n.barIndex}:${n.startBeat}:${n.guitarString}:${n.guitarFret}`;
}

function toFretboardNote(n: ScoreNote, legality: Map<number, NoteTag>): FretboardNote {
  const pc = normalizePc(n.pitch);
  const tag = legality.get(pc);
  return {
    stringIndex: n.guitarString,
    fret: n.guitarFret,
    role: tag?.tonalRole ?? 'chaos',
    beatLegality: tag?.beatLegality,
  };
}

/** Matches scrubber + Tone.Transport: 0.5 beat every 500ms → 60 BPM → 1 quarter = 1s. */
const PLAYBACK_BPM = 60;

export function VaultMicroscope({
  scoreNotes,
  totalBars,
  chordTypeId,
  rootPc,
  mode,
  className,
}: VaultMicroscopeProps) {
  const maxBeat = Math.max(0, totalBars * 4);
  const legalityMap = useMemo(
    () => buildBeatContextLegalityMap(chordTypeId, rootPc),
    [chordTypeId, rootPc]
  );

  const quadratonicRows = useMemo(() => {
    const spec = selectQuadratonicMelodySpec(chordTypeId);
    if (!spec) return [];
    const rels = spec.quadratonicPitchClassesFromRoot;
    const seen = new Set<number>();
    const rows: { absPc: number; tag: NoteTag | undefined }[] = [];
    for (const rel of rels) {
      const absPc = relToAbs(rootPc, rel);
      if (seen.has(absPc)) continue;
      seen.add(absPc);
      rows.push({ absPc, tag: legalityMap.get(absPc) });
    }
    return rows.slice(0, 4);
  }, [chordTypeId, rootPc, legalityMap]);

  const allFretboardNotes = useMemo(
    () => scoreNotes.map((n) => toFretboardNote(n, legalityMap)),
    [scoreNotes, legalityMap]
  );

  const scoreNotesScheduleKey = useMemo(
    () =>
      scoreNotes.map((n) => `${n.barIndex}|${n.startBeat}|${n.pitch}|${n.duration}`).join(';'),
    [scoreNotes]
  );

  const lsmRef = useRef(new LayerStateMachine());
  const synthRef = useRef<Tone.PolySynth<Tone.Synth> | null>(null);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [tensionState, setTensionState] = useState<TensionState>('primary');
  const [isPlaying, setIsPlaying] = useState(false);

  const disposeSynth = useCallback(() => {
    synthRef.current?.dispose();
    synthRef.current = null;
  }, []);

  const stopTonePlayback = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.position = 0;
    disposeSynth();
  }, [disposeSynth]);

  const startTonePlayback = useCallback(async () => {
    await Tone.start();
    disposeSynth();
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.position = 0;
    transport.bpm.value = PLAYBACK_BPM;

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.015, decay: 0.12, sustain: 0.25, release: 0.08 },
    }).toDestination();
    synth.volume.value = -14;
    synthRef.current = synth;

    const secondsPerQuarter = 60 / transport.bpm.value;

    for (const n of scoreNotes) {
      if (typeof n.pitch !== 'number' || n.pitch <= 0) continue;
      const startSec = globalQuarterStart(n) * secondsPerQuarter;
      const durSec = Math.max(0.04, n.duration * secondsPerQuarter);
      const noteName = new Tone.Midi(n.pitch).toNote();

      transport.schedule((time) => {
        synth.triggerAttackRelease(noteName, durSec, time);
      }, startSec);
    }

    transport.start();
  }, [scoreNotes, disposeSynth]);

  useEffect(() => {
    stopTonePlayback();
    setIsPlaying(false);
    setCurrentBeat(0);
  }, [scoreNotesScheduleKey, stopTonePlayback]);

  useEffect(() => {
    return () => {
      stopTonePlayback();
    };
  }, [stopTonePlayback]);

  const beatStrengthNow = beatStrengthAtQuarter(currentBeat);
  const allowedLayers = LayerStateMachine.getAllowedLayers(tensionState);

  const { playbackNotes, trailNotes } = useMemo(() => {
    const playing: ScoreNote[] = [];
    const trail: ScoreNote[] = [];
    const playingKeys = new Set<string>();

    for (const n of scoreNotes) {
      const gs = globalQuarterStart(n);
      const ge = gs + n.duration;
      if (gs <= currentBeat && currentBeat < ge) {
        playing.push(n);
        playingKeys.add(scoreNoteKey(n));
      }
    }

    for (const n of scoreNotes) {
      const gs = globalQuarterStart(n);
      if (gs >= currentBeat - 2 && gs < currentBeat && !playingKeys.has(scoreNoteKey(n))) {
        trail.push(n);
      }
    }

    return {
      playbackNotes: playing.map((n) => toFretboardNote(n, legalityMap)),
      trailNotes: trail.map((n) => toFretboardNote(n, legalityMap)),
    };
  }, [scoreNotes, currentBeat, legalityMap]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    stopTonePlayback();
    setCurrentBeat(0);
    lsmRef.current = new LayerStateMachine();
    setTensionState('primary');
  }, [stopTonePlayback]);

  const handlePlayPauseClick = useCallback(async () => {
    const transport = Tone.getTransport();
    if (isPlaying) {
      transport.pause();
      setIsPlaying(false);
      return;
    }
    if (transport.state === 'paused') {
      transport.start();
      setIsPlaying(true);
      return;
    }
    await startTonePlayback();
    setIsPlaying(true);
  }, [isPlaying, startTonePlayback]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setCurrentBeat((prev) => {
        const next = prev + 0.5;
        if (next >= maxBeat) {
          setIsPlaying(false);
          return maxBeat;
        }
        const str = beatStrengthAtQuarter(next);
        lsmRef.current.advance(str);
        setTensionState(lsmRef.current.currentState);
        return next;
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [isPlaying, maxBeat]);

  const badge = TENSION_BADGE[tensionState];

  return (
    <div className={className} style={{ maxWidth: 960 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 240px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #888)' }}>
            Scrub (beats 0–{maxBeat.toFixed(1)})
          </span>
          <input
            type="range"
            min={0}
            max={maxBeat}
            step={0.5}
            value={Math.min(currentBeat, maxBeat)}
            onChange={(e) => {
              const v = Number(e.target.value);
              setCurrentBeat(v);
            }}
            style={{ width: '100%' }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => void handlePlayPauseClick()}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="secondary" onClick={handleStop}>
            Stop
          </button>
        </div>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted, #888)' }}>
          Beat {currentBeat.toFixed(1)} / {maxBeat.toFixed(1)} · strength{' '}
          <strong>{beatStrengthNow}</strong>
          {mode != null ? ` · mode ${mode}` : null}
        </span>
      </div>
      <p style={{ margin: '0 0 0.65rem', fontSize: '0.76rem', color: 'var(--text-muted, #888)' }}>
        Audio preview: Tone.js PolySynth (triangle), Transport at {PLAYBACK_BPM} BPM — same beat clock as the scrubber.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.35rem 0.65rem',
            borderRadius: 8,
            background: badge.bg,
            color: badge.fg,
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {badge.label}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>Layers:</span>
          {([0, 1, 2, 3] as NoteLayer[]).map((layer) => {
            const on = allowedLayers.includes(layer);
            return (
              <span
                key={layer}
                style={{
                  padding: '0.2rem 0.45rem',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: on ? 700 : 500,
                  opacity: on ? 1 : 0.35,
                  border: `1px solid ${on ? 'var(--border, #444)' : 'transparent'}`,
                  background: on ? 'rgba(59,130,246,0.15)' : 'transparent',
                }}
              >
                L{layer}
              </span>
            );
          })}
        </div>
      </div>

      {quadratonicRows.length > 0 && (
        <div style={{ marginBottom: '0.75rem', overflowX: 'auto' }}>
          <table
            style={{
              fontSize: '0.82rem',
              borderCollapse: 'collapse',
              width: '100%',
              maxWidth: 520,
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.35rem', borderBottom: '1px solid var(--border, #444)' }}>
                  Pitch
                </th>
                <th style={{ textAlign: 'left', padding: '0.35rem', borderBottom: '1px solid var(--border, #444)' }}>
                  Role
                </th>
                <th style={{ textAlign: 'left', padding: '0.35rem', borderBottom: '1px solid var(--border, #444)' }}>
                  Vault legality
                </th>
                <th style={{ textAlign: 'left', padding: '0.35rem', borderBottom: '1px solid var(--border, #444)' }}>
                  At {beatStrengthNow}
                </th>
              </tr>
            </thead>
            <tbody>
              {quadratonicRows.map(({ absPc, tag }) => (
                <tr key={absPc}>
                  <td style={{ padding: '0.35rem', borderBottom: '1px solid var(--border, #333)' }}>
                    {pcLabel(absPc)}
                  </td>
                  <td style={{ padding: '0.35rem', borderBottom: '1px solid var(--border, #333)' }}>
                    {tag?.tonalRole ?? '—'}
                  </td>
                  <td style={{ padding: '0.35rem', borderBottom: '1px solid var(--border, #333)' }}>
                    {tag?.beatLegality ?? '—'}
                  </td>
                  <td style={{ padding: '0.35rem', borderBottom: '1px solid var(--border, #333)' }}>
                    {legalityAlignsBeat(tag, beatStrengthNow) ? '●' : '○'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FretboardPanel
        notes={allFretboardNotes}
        activeLayers={allowedLayers}
        playbackBeat={currentBeat}
        playbackNotes={playbackNotes}
        trailNotes={trailNotes}
        darkMode
      />
    </div>
  );
}
