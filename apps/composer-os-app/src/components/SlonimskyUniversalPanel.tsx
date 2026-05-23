import { useMemo, useState } from 'react';
import { THESAURUS_REGISTRY } from '@composer-os/core/slonimsky/thesaurusRegistry';
import type { SlonimskyMacroState, SlonimskySourcePreset } from '../types/slonimskyMacroState';

const FLAVOR_PRESETS: { id: SlonimskySourcePreset; label: string }[] = [
  { id: 'lyrical', label: 'Lyrical' },
  { id: 'angular', label: 'Angular' },
  { id: 'symmetric', label: 'Symmetric' },
  { id: 'chromatic', label: 'Chromatic' },
  { id: 'riff', label: 'Riff' },
];

const KNOB_AXES: { key: 'motion' | 'tension' | 'variation'; label: string }[] = [
  { key: 'motion', label: 'Motion' },
  { key: 'tension', label: 'Tension' },
  { key: 'variation', label: 'Variation' },
];

function clampKnob(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

function formatKnob(n: number): string {
  const v = clampKnob(n);
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

export function SlonimskyUniversalPanel({
  state,
  onChange,
  disabled = false,
  embedded = false,
}: {
  state: SlonimskyMacroState;
  onChange: (next: SlonimskyMacroState) => void;
  disabled?: boolean;
  /** Inside {@link SlonimskyEnsemblePanel} — omit outer card chrome. */
  embedded?: boolean;
}) {
  const cellIds = useMemo(() => THESAURUS_REGISTRY.map((p) => p.id), []);
  const [activeCellIds, setActiveCellIds] = useState<readonly string[]>(() =>
    THESAURUS_REGISTRY.filter((p) => p.inEngine).map((p) => p.id)
  );

  const patch = (partial: Partial<SlonimskyMacroState>) => onChange({ ...state, ...partial });

  const toggleCell = (id: string) => {
    setActiveCellIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div
      style={
        embedded
          ? { marginBottom: '0.65rem' }
          : {
              marginTop: '0.75rem',
              marginBottom: '1rem',
              padding: '0.85rem 1rem',
              maxWidth: 720,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-panel, rgba(0,0,0,0.12))',
            }
      }
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.35rem',
          marginBottom: '0.65rem',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Slonimsky</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Macro → chromatic / blend / duo intent
        </span>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <span
          style={{
            display: 'block',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            marginBottom: 6,
            letterSpacing: '0.02em',
          }}
        >
          Flavor
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {FLAVOR_PRESETS.map((p) => {
            const on = state.sourcePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => patch({ sourcePreset: p.id })}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 999,
                  border: on
                    ? '1px solid var(--accent, #6ae)'
                    : '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
                  background: on ? 'rgba(100,160,255,0.14)' : 'transparent',
                  color: 'var(--text)',
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.65rem 1rem',
          marginBottom: '0.85rem',
        }}
      >
        {KNOB_AXES.map(({ key, label }) => (
          <label key={key} style={{ display: 'block', fontSize: '0.82rem' }}>
            <span
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
                color: 'var(--text-muted)',
                fontSize: '0.72rem',
              }}
            >
              <span>{label}</span>
              <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {formatKnob(state[key])}
              </span>
            </span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              disabled={disabled}
              value={clampKnob(state[key])}
              onChange={(e) => patch({ [key]: clampKnob(Number(e.target.value)) })}
              style={{ width: '100%' }}
              aria-label={`${label} (-1 to +1)`}
            />
          </label>
        ))}
      </div>

      <div>
        <span
          style={{
            display: 'block',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            marginBottom: 6,
            letterSpacing: '0.02em',
          }}
        >
          Bar cells ({activeCellIds.length}/{cellIds.length} on)
        </span>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.25rem',
            maxHeight: 88,
            overflowY: 'auto',
            padding: '0.15rem 0',
          }}
        >
          {cellIds.map((id) => {
            const on = activeCellIds.includes(id);
            const row = THESAURUS_REGISTRY.find((p) => p.id === id);
            const title = row
              ? `${row.name} · Pattern ${row.thesaurusNo}${row.inEngine ? ' · engine' : ''}`
              : id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                title={title}
                aria-pressed={on}
                onClick={() => toggleCell(id)}
                style={{
                  fontSize: '0.65rem',
                  padding: '0.12rem 0.35rem',
                  borderRadius: 4,
                  border: on
                    ? '1px solid var(--accent, #6ae)'
                    : '1px solid var(--border-subtle, rgba(128,128,128,0.28))',
                  background: on ? 'rgba(100,160,255,0.12)' : 'transparent',
                  color: on ? 'var(--text)' : 'var(--text-muted)',
                  cursor: disabled ? 'default' : 'pointer',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {id.replace(/^p_/, '')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
