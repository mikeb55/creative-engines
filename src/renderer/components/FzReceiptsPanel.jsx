import React from 'react';
import { useFzFingerprint } from '../context/FzFingerprintContext';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

export function FzReceiptsPanel() {
  const { receipts, selectedId, expandedId, setExpandedId, selectReceipt, selectedReceipt } =
    useFzFingerprint();

  return (
    <section style={panelStyle} aria-label="FZ fingerprints">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>FZ Receipts (Frank Zappa GCE)</h3>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        15 structural fingerprints — Apply sends <code>fingerprintReceipt</code> on Generate.
      </p>
      <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border-subtle, #333)', borderRadius: 6 }}>
        {receipts.map((r) => {
          const open = expandedId === r.id;
          const active = selectedId === r.id;
          return (
            <div
              key={r.id}
              style={{
                borderBottom: '1px solid var(--border-subtle, rgba(128,128,128,0.15))',
                background: active ? 'rgba(100, 140, 255, 0.1)' : undefined,
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : r.id)}
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>
                  <strong style={{ fontSize: '0.85rem' }}>{r.name}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 8 }}>{r.id}</span>
                </span>
                <span>{open ? '▼' : '▶'}</span>
              </button>
              {open && (
                <div style={{ padding: '0 0.5rem 0.5rem', fontSize: '0.78rem' }}>
                  <p style={{ margin: '0 0 0.35rem', color: 'var(--text-muted)' }}>{r.description}</p>
                  <pre
                    style={{
                      margin: '0 0 0.5rem',
                      padding: '0.35rem',
                      fontSize: '0.68rem',
                      overflow: 'auto',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: 4,
                    }}
                  >
                    {JSON.stringify(r.params, null, 2)}
                  </pre>
                  <button type="button" onClick={() => selectReceipt(r.id)}>
                    Apply
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selectedReceipt && (
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Active: {selectedReceipt.name} ({selectedReceipt.id})
        </p>
      )}
    </section>
  );
}
