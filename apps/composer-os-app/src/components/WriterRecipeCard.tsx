import type { CSSProperties } from 'react';
import { buildWriterRecipeCardModel, formatDevicePillLabel } from '../utils/writerRecipeCardModel';

const pillStyle: CSSProperties = {
  display: 'inline-block',
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  padding: '0.12rem 0.42rem',
  borderRadius: 999,
  border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
  background: 'rgba(99, 102, 241, 0.1)',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
};

/**
 * Inline recipe summary for a songwriter style — data from engine profiles, melody devices, and rule registry.
 */
export function WriterRecipeCard({ writerId }: { writerId: string }) {
  const model = buildWriterRecipeCardModel(writerId);
  if (!model) return null;
  return (
    <div
      role="region"
      aria-label={`Writer recipe — ${model.displayName}`}
      style={{
        marginTop: '0.45rem',
        padding: '0.5rem 0.65rem',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
        borderRadius: 6,
        maxWidth: 520,
        background: 'var(--panel-subtle, rgba(128,128,128,0.06))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{model.displayName}</span>
        <span
          title="Era bucket"
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'lowercase',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
            padding: '0.1rem 0.45rem',
            borderRadius: 4,
          }}
        >
          {model.eraLabel}
        </span>
      </div>
      <p
        style={{
          margin: '0.4rem 0 0.35rem',
          fontSize: '0.78rem',
          lineHeight: 1.45,
          color: 'var(--text-muted)',
        }}
      >
        {model.oneLine}
      </p>
      {model.devices.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {model.devices.map((d) => (
            <span key={d} style={pillStyle}>
              {formatDevicePillLabel(d)}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Melody device tags use defaults until this writer has a MELODY_PROFILES row.
        </p>
      )}
    </div>
  );
}
