import type { CSSProperties } from 'react';
import type { MosaicImportWorkflow, MosaicVariationConfigState } from './useMosaicImportWorkflow';

const rowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.5rem 0.75rem',
  marginTop: '0.5rem',
  fontSize: '0.85rem',
};

const labelStyle: CSSProperties = {
  color: 'var(--text-muted)',
  minWidth: '7.5rem',
};

const MODE_OPTIONS: { value: MosaicVariationConfigState['mode']; label: string }[] = [
  { value: 'harmonic', label: 'Harmonic' },
  { value: 'melodic', label: 'Melodic' },
  { value: 'rhythmic', label: 'Rhythmic' },
  { value: 'full', label: 'Full' },
];

export interface MosaicVariationConfigProps {
  workflow: MosaicImportWorkflow;
}

export function MosaicVariationConfig({ workflow }: MosaicVariationConfigProps) {
  const { state, actions } = workflow;
  const cfg = state.variationConfig;

  return (
    <div
      data-testid="mosaic-variation-config"
      style={{
        marginTop: '0.65rem',
        padding: '0.65rem 0.75rem',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
    >
      <p style={{ margin: '0 0 0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
        Variation settings
      </p>

      <div style={rowStyle}>
        <span style={labelStyle}>Count</span>
        <input
          type="range"
          min={2}
          max={8}
          step={1}
          value={cfg.count}
          data-testid="mosaic-variation-count-slider"
          onChange={(e) => actions.setVariationConfig({ count: Number(e.target.value) })}
        />
        <input
          type="number"
          min={2}
          max={8}
          step={1}
          value={cfg.count}
          data-testid="mosaic-variation-count-input"
          style={{ width: '3.25rem' }}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) {
              actions.setVariationConfig({ count: Math.min(8, Math.max(2, Math.round(n))) });
            }
          }}
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle} htmlFor="mosaic-variation-mode">
          Mode
        </label>
        <select
          id="mosaic-variation-mode"
          value={cfg.mode}
          data-testid="mosaic-variation-mode-select"
          onChange={(e) =>
            actions.setVariationConfig({
              mode: e.target.value as MosaicVariationConfigState['mode'],
            })
          }
        >
          {MODE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div style={rowStyle}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={cfg.preserveHarmony}
            data-testid="mosaic-variation-preserve-harmony"
            onChange={(e) => actions.setVariationConfig({ preserveHarmony: e.target.checked })}
          />
          <span style={{ color: 'var(--text)' }}>Preserve import harmony</span>
        </label>
      </div>
    </div>
  );
}
