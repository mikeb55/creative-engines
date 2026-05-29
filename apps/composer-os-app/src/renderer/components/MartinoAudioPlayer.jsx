import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { initPlayback, play, stop } from '../../playback/playbackEngine';
import { parseXmlToPlaybackSequence } from '../../playback/musicXmlToPlaybackSequence';

const DEFAULT_BPM = 120;
const DEFAULT_TIME_SIG = '4/4';

function barFromBeat(beat, beatsPerBar) {
  return Math.floor(beat / Math.max(1, beatsPerBar)) + 1;
}

export default function MartinoAudioPlayer({ xmlString, barTelemetry }) {
  const [looping, setLooping] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentBar, setCurrentBar] = useState(null);
  const loopRef = useRef(false);
  const seqRef = useRef(null);

  const telemetryBars = Array.isArray(barTelemetry)
    ? barTelemetry.map((row) => Number(row?.bar)).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  useEffect(() => {
    loopRef.current = looping;
  }, [looping]);

  useEffect(() => {
    return () => {
      stop();
      setPlaying(false);
      setCurrentBar(null);
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (!xmlString || !String(xmlString).trim()) return;
    await initPlayback();
    const seq = parseXmlToPlaybackSequence(xmlString, DEFAULT_BPM, DEFAULT_TIME_SIG);
    seqRef.current = seq;
    if (!seq.notes.length) return;

    setPlaying(true);
    setCurrentBar(1);
    await play(
      seq,
      (beat) => {
        const bar = barFromBeat(beat, seq.beatsPerBar);
        Tone.Draw.schedule(() => {
          setCurrentBar(bar);
        }, Tone.now());
      },
      { loop: loopRef.current }
    );
    if (!loopRef.current) {
      const transport = Tone.getTransport();
      const secondsPerQuarter = 60 / seq.bpm;
      let maxEndQuarter = 0;
      for (const n of seq.notes) {
        const end = (n.barIndex - 1) * seq.beatsPerBar + n.startBeat + n.duration;
        maxEndQuarter = Math.max(maxEndQuarter, end);
      }
      const endSec = maxEndQuarter * secondsPerQuarter + 0.05;
      transport.scheduleOnce(() => {
        setPlaying(false);
        setCurrentBar(null);
      }, endSec);
    }
  }, [xmlString]);

  const handleStop = useCallback(() => {
    stop();
    setPlaying(false);
    setCurrentBar(null);
  }, []);

  const disabled = !xmlString || !String(xmlString).trim();

  return (
    <div style={{ marginTop: '0.65rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          className="secondary"
          disabled={disabled || playing}
          onClick={() => void handlePlay()}
        >
          Play
        </button>
        <button type="button" className="secondary" disabled={disabled} onClick={handleStop}>
          Stop
        </button>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.85rem',
            color: disabled ? 'var(--text-muted)' : 'var(--text)',
          }}
        >
          <input
            type="checkbox"
            disabled={disabled}
            checked={looping}
            onChange={(e) => setLooping(e.target.checked)}
          />
          Loop
        </label>
        {currentBar != null && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Bar {currentBar}
            {telemetryBars.includes(currentBar) ? ' · telemetry' : ''}
          </span>
        )}
      </div>
      {disabled && (
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          No audio available
        </p>
      )}
    </div>
  );
}
