/**
 * Phase 2 — Style Pairings enablement settings (override layer only).
 * Does not change STYLE_PAIRINGS.defaultEnabled; toggles write setPairingOverride.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  PAIRING_ENABLEMENT_CHANGED_EVENT,
  listStylePairingEnablementRows,
  resetAllPairingOverrides,
  resetPairingOverride,
  setPairingOverride,
} from '../../preferences/pairingEnablementOverride';

type Row = ReturnType<typeof listStylePairingEnablementRows>[number];

export function RiffGenStylePairingsPanel() {
  const [rows, setRows] = useState<Row[]>(() => listStylePairingEnablementRows());

  const refresh = useCallback(() => {
    setRows(listStylePairingEnablementRows());
  }, []);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(PAIRING_ENABLEMENT_CHANGED_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(PAIRING_ENABLEMENT_CHANGED_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [refresh]);

  const onToggle = (id: string, enabled: boolean) => {
    setPairingOverride(id, enabled);
    refresh();
  };

  const onResetRow = (id: string) => {
    resetPairingOverride(id);
    refresh();
  };

  const onResetAll = () => {
    resetAllPairingOverrides();
    refresh();
  };

  return (
    <section
      data-testid="riffgen-style-pairings-panel"
      style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        border: '1px solid var(--border)',
        borderRadius: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>Style Pairings</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Enable phrase-motif seed per pairing. Toggle = user override; Reset restores manifest
            default (currently off for all 12).
          </p>
        </div>
        <button type="button" onClick={onResetAll} data-testid="pairing-reset-all">
          Reset all to defaults
        </button>
      </div>

      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}
        data-testid="pairing-enablement-table"
      >
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>Enabled</th>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>Label</th>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>VRB</th>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>Motif category</th>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>Override</th>
            <th scope="col" style={{ textAlign: 'right', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>Reset</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} data-pairing-id={row.id}>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={'Enable ' + row.label}
                  checked={row.enabled}
                  data-testid={'pairing-toggle-' + row.id}
                  onChange={(e) => onToggle(row.id, e.target.checked)}
                />
              </td>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>{row.label}</td>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}><code>{row.vrbId}</code></td>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}><code>{row.motifCategory}</code></td>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                {row.override === undefined ? 'default' : row.override ? 'force on' : 'force off'}
              </td>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                <button
                  type="button"
                  disabled={row.override === undefined}
                  data-testid={'pairing-reset-' + row.id}
                  onClick={() => onResetRow(row.id)}
                >
                  Reset to default
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}