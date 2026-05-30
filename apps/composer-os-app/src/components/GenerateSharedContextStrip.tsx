import type { CSSProperties } from 'react';

const cell: CSSProperties = {
  flex: '1 1 140px',
  minWidth: 120,
  padding: '0.5rem 0.65rem',
  borderRadius: 6,
  border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
  background: 'var(--bg)',
};

const label: CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 4,
};

export function GenerateSharedContextStrip(props: {
  harmony: string;
  time: string;
  seed: number;
  onRerollSeed?: () => void;
  exportIntegrity: 'pass' | 'fail' | 'pending' | 'unknown';
  tritonicFloatOver?: string | null;
  seedDisabled?: boolean;
}) {
  const integrityColor =
    props.exportIntegrity === 'pass'
      ? 'var(--success, #22c55e)'
      : props.exportIntegrity === 'fail'
        ? 'var(--error, #ef4444)'
        : 'var(--text-muted)';

  const integrityLabel =
    props.exportIntegrity === 'pass'
      ? 'Passed'
      : props.exportIntegrity === 'fail'
        ? 'Failed'
        : props.exportIntegrity === 'pending'
          ? 'Awaiting run'
          : '—';

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        role="region"
        aria-label="Shared generate context"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.65rem 0.75rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-panel)',
        }}
      >
        <div style={cell}>
          <span style={label}>Harmony</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text)', wordBreak: 'break-word' }}>
            {props.harmony || '—'}
          </span>
        </div>
        <div style={cell}>
          <span style={label}>Time</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{props.time || '—'}</span>
        </div>
        <div style={cell}>
          <span style={label}>Seed</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <code
              style={{
                fontSize: '0.82rem',
                padding: '0.15rem 0.35rem',
                borderRadius: 4,
                border: '1px solid var(--border)',
              }}
            >
              {props.seed}
            </code>
            {props.onRerollSeed ? (
              <button
                type="button"
                className="secondary"
                disabled={props.seedDisabled}
                onClick={props.onRerollSeed}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.45rem' }}
              >
                Reroll
              </button>
            ) : null}
          </span>
        </div>
        <div style={cell}>
          <span style={label}>Export integrity</span>
          <span style={{ fontSize: '0.85rem', color: integrityColor, fontWeight: 600 }}>
            {integrityLabel}
          </span>
        </div>
      </div>
      {props.tritonicFloatOver ? (
        <p
          role="note"
          style={{
            margin: '0.45rem 0 0',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            maxWidth: 640,
          }}
        >
          Float over: <strong style={{ color: 'var(--text)' }}>{props.tritonicFloatOver}</strong>
        </p>
      ) : null}
    </div>
  );
}
