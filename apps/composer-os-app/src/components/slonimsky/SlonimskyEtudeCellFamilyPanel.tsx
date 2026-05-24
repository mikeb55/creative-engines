import { SLONIMSKY_CELL_FAMILIES } from '../../types/slonimskyAdvancedState';
import type { SlonimskySourcePreset } from '../../types/slonimskyMacroState';

export function SlonimskyEtudeCellFamilyPanel({
  cellFamily,
  onCellFamilyChange,
  disabled = false,
}: {
  cellFamily: SlonimskySourcePreset;
  onCellFamilyChange: (flavor: SlonimskySourcePreset) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        marginTop: '0.5rem',
        marginBottom: '1rem',
        padding: '0.85rem 1rem',
        maxWidth: 420,
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-panel, rgba(0,0,0,0.12))',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.55rem' }}>
        Slonimsky Etude — cell family
      </div>
      <label style={{ display: 'block', fontSize: '0.82rem' }}>
        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          Cell family → catalogue pattern id
        </span>
        <select
          value={cellFamily}
          disabled={disabled}
          onChange={(e) => onCellFamilyChange(e.target.value as SlonimskySourcePreset)}
          style={{
            width: '100%',
            maxWidth: 280,
            padding: '0.45rem 0.6rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-input, var(--bg))',
            color: 'var(--text)',
          }}
        >
          {SLONIMSKY_CELL_FAMILIES.map((f) => (
            <option key={f.flavor} value={f.flavor}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
