import React, { useMemo, useState } from 'react';

const MODES = [
  { id: 'standard', label: 'Staff' },
  { id: 'grid', label: 'Grid' },
  { id: 'text', label: 'Text' },
  { id: 'hybrid', label: 'Hybrid' },
];

const ROW_LABELS = ['kick', 'snare', 'hat', 'ride'];
const LANE_KEYS = ['kicks', 'snares', 'hats', 'ride'];
const STAFF_LINES = { kick: 4, snare: 2, hat: 0, ride: 1 };

function PatternGrid({ pattern, compact = false }) {
  if (!pattern) return null;
  const lanes = LANE_KEYS.map((k) => pattern[k] ?? []);
  return (
    <div style={{ marginTop: compact ? 0 : '0.35rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px repeat(16, 1fr)',
          gap: 2,
          fontSize: '0.6rem',
        }}
      >
        <div />
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            {i + 1}
          </div>
        ))}
        {lanes.map((hits, li) => (
          <React.Fragment key={ROW_LABELS[li]}>
            <div style={{ textTransform: 'uppercase', color: 'var(--text-muted)' }}>{ROW_LABELS[li]}</div>
            {Array.from({ length: 16 }, (_, col) => (
              <div
                key={col}
                style={{
                  aspectRatio: '1',
                  maxWidth: compact ? 14 : 18,
                  borderRadius: 2,
                  background: hits.includes(col)
                    ? 'var(--accent, #6b8cff)'
                    : 'var(--border-subtle, rgba(128,128,128,0.2))',
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function StaffNotation({ pattern }) {
  if (!pattern) return null;
  const lineHeight = 10;
  const height = lineHeight * 5;
  return (
    <div style={{ position: 'relative', height, marginBottom: 8, borderBottom: '1px solid var(--border-subtle, #444)' }}>
      {[0, 1, 2, 3, 4].map((line) => (
        <div
          key={line}
          style={{
            position: 'absolute',
            left: 40,
            right: 0,
            top: line * lineHeight,
            borderTop: '1px solid rgba(180,180,180,0.35)',
          }}
        />
      ))}
      {ROW_LABELS.map((label, li) => {
        const hits = pattern[LANE_KEYS[li]] ?? [];
        const y = STAFF_LINES[label] * lineHeight;
        return hits.map((col) => (
          <div
            key={`${label}-${col}`}
            title={`${label} @ ${col + 1}`}
            style={{
              position: 'absolute',
              left: 40 + (col / 16) * (100 - 10) + '%',
              top: y - 4,
              width: 8,
              height: 8,
              borderRadius: label === 'hat' ? 0 : '50%',
              transform: label === 'hat' ? 'rotate(45deg)' : undefined,
              background: 'var(--accent, #6b8cff)',
            }}
          />
        ));
      })}
    </div>
  );
}

function TextNotation({ pattern }) {
  const lines = useMemo(() => {
    if (!pattern) return [];
    return ROW_LABELS.map((label, li) => {
      const hits = new Set(pattern[LANE_KEYS[li]] ?? []);
      const chars = Array.from({ length: 16 }, (_, i) => {
        if (!hits.has(i)) return '.';
        const ch = label === 'kick' ? 'K' : label === 'snare' ? 'S' : label === 'hat' ? 'H' : 'R';
        return ch;
      });
      return `${label.toUpperCase().padEnd(5)} ${chars.join(' ')}`;
    });
  }, [pattern]);

  return (
    <pre
      style={{
        fontSize: '0.68rem',
        margin: 0,
        fontFamily: 'ui-monospace, monospace',
        color: 'var(--text-muted)',
        overflowX: 'auto',
      }}
    >
      {lines.join('\n')}
    </pre>
  );
}

export function DrumStaffDisplay({ pattern }) {
  const [mode, setMode] = useState('grid');

  if (!pattern) return null;

  return (
    <div style={{ marginTop: '0.65rem' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={mode === m.id ? '' : 'secondary'}
            onClick={() => setMode(m.id)}
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'standard' && <StaffNotation pattern={pattern} />}
      {mode === 'grid' && <PatternGrid pattern={pattern} />}
      {mode === 'text' && <TextNotation pattern={pattern} />}
      {mode === 'hybrid' && (
        <>
          <StaffNotation pattern={pattern} />
          <PatternGrid pattern={pattern} compact />
        </>
      )}
    </div>
  );
}
