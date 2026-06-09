import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { MosaicImportWorkflow } from './useMosaicImportWorkflow';

export type ComposerOption = { id: string; label: string };

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

const warningStyle: CSSProperties = {
  margin: '0.45rem 0 0',
  fontSize: '0.8rem',
  color: '#a16207',
};

const helperStyle: CSSProperties = {
  margin: '0.25rem 0 0',
  fontSize: '0.78rem',
  color: 'var(--text-muted)',
};

function strengthLabel(strength: number): string {
  if (strength <= 0.05) return 'Preserve harmony';
  if (strength >= 0.95) return 'Full reharmonisation';
  if (strength >= 0.45 && strength <= 0.55) return 'Blend';
  return strength < 0.5 ? 'Preserve harmony' : 'Full reharmonisation';
}

const bhModeStyle: CSSProperties = {
  margin: '0.55rem 0 0',
  padding: '0.55rem 0.65rem',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'rgba(91, 141, 239, 0.08)',
};

const bhModeTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text)',
};

const bhModeDescStyle: CSSProperties = {
  ...helperStyle,
  margin: '0.25rem 0 0',
};

export interface MosaicStyleTransferConfigProps {
  workflow: MosaicImportWorkflow;
  composerOptions: readonly ComposerOption[];
  defaultTargetComposer?: string;
}

export function MosaicStyleTransferConfig({
  workflow,
  composerOptions,
  defaultTargetComposer,
}: MosaicStyleTransferConfigProps) {
  const { state, actions } = workflow;
  const cfg = state.styleTransferConfig;
  const [composerFilter, setComposerFilter] = useState('');

  useEffect(() => {
    if (!cfg.targetComposer.trim() && defaultTargetComposer?.trim()) {
      actions.setStyleTransferConfig({ targetComposer: defaultTargetComposer.trim() });
    }
  }, [actions, cfg.targetComposer, defaultTargetComposer]);

  const filteredComposers = useMemo(() => {
    const q = composerFilter.trim().toLowerCase();
    if (!q) return composerOptions;
    return composerOptions.filter(
      (o) => o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
    );
  }, [composerFilter, composerOptions]);

  const selectedInList = composerOptions.some((o) => o.id === cfg.targetComposer);
  const isBarryHarrisChordMelody = cfg.targetComposer === 'barry_harris';

  return (
    <div
      data-testid="mosaic-style-transfer-config"
      style={{
        marginTop: '0.65rem',
        padding: '0.65rem 0.75rem',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
    >
      <p style={{ margin: '0 0 0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
        Style-transfer settings
      </p>

      <div style={rowStyle}>
        <label style={labelStyle} htmlFor="mosaic-style-transfer-composer-search">
          Target composer
        </label>
        <input
          id="mosaic-style-transfer-composer-search"
          type="search"
          placeholder="Filter composers…"
          value={composerFilter}
          data-testid="mosaic-style-transfer-composer-filter"
          onChange={(e) => setComposerFilter(e.target.value)}
          style={{ flex: '1 1 8rem', minWidth: '8rem', maxWidth: '14rem' }}
        />
        <select
          id="mosaic-style-transfer-composer"
          value={cfg.targetComposer}
          data-testid="mosaic-style-transfer-composer-select"
          onChange={(e) => actions.setStyleTransferConfig({ targetComposer: e.target.value })}
          style={{ flex: '1 1 10rem', minWidth: '10rem' }}
        >
          {!selectedInList && cfg.targetComposer ? (
            <option value={cfg.targetComposer}>{cfg.targetComposer}</option>
          ) : null}
          {filteredComposers.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isBarryHarrisChordMelody ? (
        <div
          data-testid="mosaic-bh-chord-melody-mode"
          style={bhModeStyle}
          role="status"
        >
          <p style={bhModeTitleStyle}>Barry Harris Chord-Melody</p>
          <p style={bhModeDescStyle}>
            Harmonise your melody using the 6th-diminished scale of chords.
          </p>
        </div>
      ) : null}

      <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 0.75rem' }}>
          <span style={labelStyle}>Strength</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={cfg.strength}
            data-testid="mosaic-style-transfer-strength-slider"
            onChange={(e) => actions.setStyleTransferConfig({ strength: Number(e.target.value) })}
            style={{ flex: '1 1 8rem' }}
          />
          <span
            data-testid="mosaic-style-transfer-strength-value"
            style={{ minWidth: '4.5rem', color: 'var(--text)' }}
          >
            {cfg.strength.toFixed(2)}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{strengthLabel(cfg.strength)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>0 — Preserve harmony</span>
          <span>0.5 — Blend</span>
          <span>1.0 — Full reharmonisation</span>
        </div>
      </div>

      <div style={rowStyle}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={cfg.preserveMelody}
            data-testid="mosaic-style-transfer-preserve-melody"
            onChange={(e) => actions.setStyleTransferConfig({ preserveMelody: e.target.checked })}
          />
          <span style={{ color: 'var(--text)' }}>Preserve melody</span>
        </label>
      </div>
      {!cfg.preserveMelody ? (
        <p style={warningStyle} data-testid="mosaic-style-transfer-melody-warning" role="status">
          Melody may be altered — the imported tune is no longer guaranteed.
        </p>
      ) : null}

      <div style={rowStyle}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={cfg.reorchestrate}
            data-testid="mosaic-style-transfer-reorchestrate"
            onChange={(e) => actions.setStyleTransferConfig({ reorchestrate: e.target.checked })}
            style={{ marginTop: '0.15rem' }}
          />
          <span style={{ color: 'var(--text)' }}>
            Reorchestrate
            <span style={{ ...helperStyle, display: 'block' }}>
              Apply ensemble voicing (BB/SQ) to the new harmony.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
