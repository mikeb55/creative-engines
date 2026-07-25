/**
 * Style Pairings — single-select (radio). Default: None.
 * Selecting one pairing force-on clears any previous selection.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  PAIRING_ENABLEMENT_CHANGED_EVENT,
  getExclusiveSelectedPairingId,
  listStylePairingEnablementRows,
  selectExclusiveStylePairing,
} from '../../preferences/pairingEnablementOverride';

type Row = ReturnType<typeof listStylePairingEnablementRows>[number];

export function RiffGenStylePairingsPanel() {
  const [rows, setRows] = useState<Row[]>(() => listStylePairingEnablementRows());
  const [selectedId, setSelectedId] = useState<string | null>(() => getExclusiveSelectedPairingId());

  const refresh = useCallback(() => {
    setRows(listStylePairingEnablementRows());
    setSelectedId(getExclusiveSelectedPairingId());
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

  const onSelect = (id: string | null) => {
    selectExclusiveStylePairing(id);
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
            Pick at most one phrase-motif pairing (single-select). Default is None — VRB dropdown
            stays independent; motif seed applies only when a pairing is selected here (or via the
            generate checkbox for that VRB).
          </p>
        </div>
        <button type="button" onClick={() => onSelect(null)} data-testid="pairing-reset-all">
          Clear to None
        </button>
      </div>

      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}
        data-testid="pairing-enablement-table"
        role="radiogroup"
        aria-label="Style pairing selection"
      >
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>Active</th>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>Label</th>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>VRB</th>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>Motif category</th>
            <th scope="col" style={{ textAlign: 'left', padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>State</th>
          </tr>
        </thead>
        <tbody>
          <tr data-pairing-id="__none__" data-testid="pairing-row-none">
            <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>
              <input
                type="radio"
                name="riffgen-style-pairing"
                aria-label="None — no style pairing"
                checked={selectedId === null}
                data-testid="pairing-toggle-none"
                onChange={() => onSelect(null)}
              />
            </td>
            <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>None</td>
            <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>—</td>
            <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>—</td>
            <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {selectedId === null ? 'default' : ''}
            </td>
          </tr>
          {rows.map((row) => (
            <tr key={row.id} data-pairing-id={row.id}>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>
                <input
                  type="radio"
                  name="riffgen-style-pairing"
                  aria-label={'Select ' + row.label}
                  checked={selectedId === row.id}
                  data-testid={'pairing-toggle-' + row.id}
                  onChange={() => onSelect(row.id)}
                />
              </td>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}>{row.label}</td>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}><code>{row.vrbId}</code></td>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)' }}><code>{row.motifCategory}</code></td>
              <td style={{ padding: '0.35rem 0.4rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                {selectedId === row.id ? 'selected' : 'off'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}