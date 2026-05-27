import React, { useMemo, useState } from 'react';
import { midiToPitchName } from '../lib/gridMusicXml.js';
import { useLastGenerate } from '../context/LastGenerateContext';

const VOICE_COLORS = [
  '#6b8cff',
  '#ff8c6b',
  '#6bffb8',
  '#ffb86b',
  '#c86bff',
  '#ff6bcb',
  '#8cff6b',
  '#6bffff',
];

const ZOOM_X = [
  { id: 'bar', label: 'Bar', beatsPerCell: null },
  { id: 'beat', label: 'Beat', beatsPerCell: 1 },
  { id: '8th', label: '8th', beatsPerCell: 0.5 },
  { id: '16th', label: '16th', beatsPerCell: 0.25 },
];

const ZOOM_Y = [
  { id: 'full', label: 'Full range' },
  { id: '2oct', label: '2 octaves' },
  { id: '1oct', label: '1 octave' },
];

const MIDI_MIN = 12;
const MIDI_MAX = 108;
const CELL_H = 14;
const LABEL_W = 44;

function colorForVoice(voiceId, voices) {
  const idx = voices.findIndex((v) => v.id === voiceId);
  return VOICE_COLORS[(idx >= 0 ? idx : 0) % VOICE_COLORS.length];
}

export function GridView() {
  const { gridData, playbackBeat, isPlaying } = useLastGenerate();
  const [zoomX, setZoomX] = useState('beat');
  const [zoomY, setZoomY] = useState('full');
  const [hiddenVoices, setHiddenVoices] = useState(() => new Set());
  const [hover, setHover] = useState(null);

  const voices = gridData?.voices ?? [];
  const beatsPerBar = gridData?.beatsPerBar ?? 4;
  const totalBars = gridData?.totalBars ?? 0;

  const visibleNotes = useMemo(() => {
    if (!gridData?.notes) return [];
    return gridData.notes.filter((n) => !hiddenVoices.has(n.voiceId));
  }, [gridData, hiddenVoices]);

  const totalBeats = Math.max(beatsPerBar * totalBars, beatsPerBar);

  const zoomXDef = ZOOM_X.find((z) => z.id === zoomX) ?? ZOOM_X[1];
  const beatsPerCell =
    zoomXDef.id === 'bar' ? beatsPerBar : (zoomXDef.beatsPerCell ?? 1);
  const numCols = Math.max(1, Math.ceil(totalBeats / beatsPerCell));
  const cellW = zoomX === 'bar' ? 48 : zoomX === 'beat' ? 28 : zoomX === '8th' ? 18 : 12;

  const pitchRange = useMemo(() => {
    if (!visibleNotes.length) return { low: 60, high: 72 };
    let low = 127;
    let high = 0;
    for (const n of visibleNotes) {
      low = Math.min(low, n.pitch);
      high = Math.max(high, n.pitch);
    }
    return { low, high };
  }, [visibleNotes]);

  const { midiLow, midiHigh, rowCount } = useMemo(() => {
    if (zoomY === 'full') {
      return { midiLow: MIDI_MIN, midiHigh: MIDI_MAX, rowCount: MIDI_MAX - MIDI_MIN + 1 };
    }
    const mid = Math.round((pitchRange.low + pitchRange.high) / 2);
    const half = zoomY === '1oct' ? 6 : 12;
    const lo = Math.max(MIDI_MIN, mid - half);
    const hi = Math.min(MIDI_MAX, mid + half);
    return { midiLow: lo, midiHigh: hi, rowCount: hi - lo + 1 };
  }, [zoomY, pitchRange]);

  const gridW = numCols * cellW;
  const gridH = rowCount * CELL_H;

  const playheadX =
    totalBeats > 0 ? (playbackBeat / beatsPerCell) * cellW : 0;

  if (!gridData?.notes?.length) {
    return (
      <section aria-label="Grid view">
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generate to populate</p>
        <div
          style={{
            marginTop: '0.5rem',
            height: 200,
            border: '1px dashed var(--border-subtle, #444)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
          }}
        >
          Empty grid — run Generate on the Home tab
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Grid view">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-end' }}>
        <label style={{ fontSize: '0.75rem' }}>
          Zoom X
          <select value={zoomX} onChange={(e) => setZoomX(e.target.value)} style={{ display: 'block', marginTop: 2 }}>
            {ZOOM_X.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '0.75rem' }}>
          Zoom Y
          <select value={zoomY} onChange={(e) => setZoomY(e.target.value)} style={{ display: 'block', marginTop: 2 }}>
            {ZOOM_Y.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Voices</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {voices.map((v) => {
            const on = !hiddenVoices.has(v.id);
            return (
              <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => {
                    setHiddenVoices((prev) => {
                      const next = new Set(prev);
                      if (on) next.add(v.id);
                      else next.delete(v.id);
                      return next;
                    });
                  }}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: colorForVoice(v.id, voices),
                    display: 'inline-block',
                  }}
                />
                {v.name}
              </label>
            );
          })}
        </div>
      </div>

      {hover && (
        <p style={{ fontSize: '0.72rem', margin: '0 0 0.35rem', color: 'var(--text-muted)' }}>
          {hover.voiceName} · {midiToPitchName(hover.pitch)} · beat {hover.absoluteBeat.toFixed(2)} · dur{' '}
          {hover.duration.toFixed(2)}
        </p>
      )}

      <div
        style={{
          overflow: 'auto',
          maxHeight: 'calc(100vh - 16rem)',
          border: '1px solid var(--border-subtle, #333)',
          borderRadius: 8,
        }}
      >
        <div style={{ display: 'flex' }}>
          <div style={{ width: LABEL_W, flexShrink: 0, paddingTop: 18 }}>
            {Array.from({ length: rowCount }, (_, i) => {
              const midi = midiHigh - i;
              return (
                <div
                  key={midi}
                  style={{
                    height: CELL_H,
                    fontSize: '0.6rem',
                    lineHeight: `${CELL_H}px`,
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    paddingRight: 4,
                  }}
                >
                  {midi % 12 === 0 ? midiToPitchName(midi) : ''}
                </div>
              );
            })}
          </div>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                height: 18,
                width: gridW,
                display: 'grid',
                gridTemplateColumns: `repeat(${numCols}, ${cellW}px)`,
                fontSize: '0.55rem',
                color: 'var(--text-muted)',
              }}
            >
              {Array.from({ length: numCols }, (_, col) => (
                <div key={col} style={{ textAlign: 'center', overflow: 'hidden' }}>
                  {zoomX === 'bar' ? col + 1 : ''}
                </div>
              ))}
            </div>
            <div
              style={{
                position: 'relative',
                width: gridW,
                height: gridH,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 13px, rgba(128,128,128,0.08) 13px, rgba(128,128,128,0.08) 14px)',
              }}
            >
              {visibleNotes.map((n, idx) => {
                if (n.pitch < midiLow || n.pitch > midiHigh) return null;
                const row = midiHigh - n.pitch;
                const colStart = n.absoluteBeat / beatsPerCell;
                const colW = Math.max(2, (n.duration / beatsPerCell) * cellW);
                return (
                  <div
                    key={`${n.voiceId}-${n.absoluteBeat}-${n.pitch}-${idx}`}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(null)}
                    title={`${n.voiceName} ${midiToPitchName(n.pitch)}`}
                    style={{
                      position: 'absolute',
                      left: colStart * cellW,
                      top: row * CELL_H + 1,
                      width: colW,
                      height: CELL_H - 2,
                      borderRadius: 2,
                      background: colorForVoice(n.voiceId, voices),
                      opacity: 0.85,
                      pointerEvents: 'auto',
                    }}
                  />
                );
              })}
              {(isPlaying || playbackBeat > 0) && (
                <div
                  style={{
                    position: 'absolute',
                    left: playheadX,
                    top: 0,
                    width: 2,
                    height: gridH,
                    background: '#ff4444',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
