import { useState, useEffect } from 'react';
import { useStyleModules } from '../hooks/useStyleModules';

export function StyleStack() {
  const { modules, error: modulesError, loading, reload } = useStyleModules();
  const [primary, setPrimary] = useState('barry_harris');
  const [secondary, setSecondary] = useState<string>('');
  const [colour, setColour] = useState<string>('');
  const [wPrimary, setWPrimary] = useState(1);
  const [wSecondary, setWSecondary] = useState(0.5);
  const [wColour, setWColour] = useState(0.3);

  useEffect(() => {
    if (modules.length > 0 && !modules.some((m) => m.id === primary)) {
      setPrimary(modules[0].id);
    }
  }, [modules, primary]);

  const selectDisabled = !!modulesError || modules.length === 0 || loading;

  return (
    <section>
      <h2>Style Stack</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Primary, secondary, and colour modules with simple weighting. Selection matches the Generate tab; use Generate to
        run the pipeline.
      </p>

      {modulesError && (
        <div
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid var(--error)',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            marginBottom: '1rem',
            fontSize: '0.95rem',
          }}
        >
          {modulesError}
          <button type="button" className="secondary" style={{ marginLeft: '0.75rem' }} onClick={reload}>
            Retry
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>Primary</label>
          <select value={primary} disabled={selectDisabled} onChange={(e) => setPrimary(e.target.value)}>
            {modules.length === 0 ? (
              <option value={primary}>{loading ? 'Loading…' : '—'}</option>
            ) : (
              modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))
            )}
          </select>
          <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>weight {wPrimary}</span>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>Secondary</label>
          <select value={secondary} disabled={selectDisabled} onChange={(e) => setSecondary(e.target.value)}>
            <option value="">—</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>weight {wSecondary}</span>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>Colour</label>
          <select value={colour} disabled={selectDisabled} onChange={(e) => setColour(e.target.value)}>
            <option value="">—</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>weight {wColour}</span>
        </div>
      </div>
    </section>
  );
}
