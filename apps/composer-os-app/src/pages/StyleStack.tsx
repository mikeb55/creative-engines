import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function StyleStack() {
  const [modules, setModules] = useState<{ id: string; name: string }[]>([]);
  const [primary, setPrimary] = useState('barry_harris');
  const [secondary, setSecondary] = useState<string>('');
  const [colour, setColour] = useState<string>('');
  const [wPrimary, setWPrimary] = useState(1);
  const [wSecondary, setWSecondary] = useState(0.5);
  const [wColour, setWColour] = useState(0.3);

  useEffect(() => {
    api.getStyleModules().then((r) => setModules(r.modules));
  }, []);

  return (
    <section>
      <h2>Style Stack</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Primary, secondary, and colour modules with simple weighting.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>Primary</label>
          <select value={primary} onChange={(e) => setPrimary(e.target.value)}>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>weight {wPrimary}</span>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>Secondary</label>
          <select value={secondary} onChange={(e) => setSecondary(e.target.value)}>
            <option value="">—</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>weight {wSecondary}</span>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>Colour</label>
          <select value={colour} onChange={(e) => setColour(e.target.value)}>
            <option value="">—</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>weight {wColour}</span>
        </div>
      </div>
    </section>
  );
}
