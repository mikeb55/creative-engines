import { useState, useEffect } from 'react';
import { useStyleModules } from '../hooks/useStyleModules';
import { StyleBlendControls, type StyleBlendState } from '../components/StyleBlendControls';

export function StyleStack() {
  const { modules, error: modulesError, loading, reload } = useStyleModules();
  const [primary, setPrimary] = useState('barry_harris');
  const [secondary, setSecondary] = useState<string>('');
  const [colour, setColour] = useState<string>('');
  const [styleBlend, setStyleBlend] = useState<StyleBlendState>({
    primary: 'strong',
    secondary: 'medium',
    colour: 'subtle',
  });

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
        Primary, optional secondary and colour modules, and <strong>Style Blend</strong> for how strongly each layer
        speaks. The same choices appear on Generate; run generation from there.
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
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Primary
          </label>
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
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Secondary (optional)
          </label>
          <select value={secondary} disabled={selectDisabled} onChange={(e) => setSecondary(e.target.value)}>
            <option value="">—</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Colour (optional)
          </label>
          <select value={colour} disabled={selectDisabled} onChange={(e) => setColour(e.target.value)}>
            <option value="">—</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <StyleBlendControls
          blend={styleBlend}
          onChange={setStyleBlend}
          hasSecondary={!!secondary.trim()}
          hasColour={!!colour.trim()}
          disabled={selectDisabled}
        />
      </div>
    </section>
  );
}
