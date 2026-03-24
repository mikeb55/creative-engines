import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function Presets() {
  const [presets, setPresets] = useState<{ id: string; name: string; description: string; supported: boolean }[]>([]);
  useEffect(() => {
    api.getPresets().then((r) => setPresets(r.presets));
  }, []);

  return (
    <section>
      <h2>Presets</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Choose a preset to define instrumentation and default settings.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {presets.map((p) => (
          <div
            key={p.id}
            style={{
              background: 'var(--bg-panel)',
              padding: '1rem',
              borderRadius: 8,
              border: `1px solid ${p.supported ? 'var(--border)' : 'var(--border)'}`,
              opacity: p.supported ? 1 : 0.7,
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem' }}>{p.name} {!p.supported && '(coming soon)'}</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
