import { useState, useEffect } from 'react';
import { api } from '../services/api';

const PRESETS_UNAVAILABLE = 'Presets could not be loaded — check backend';

export function Presets() {
  const [presets, setPresets] = useState<{ id: string; name: string; description: string; supported: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .getPresets()
      .then((r) => {
        const list = r.presets ?? [];
        setPresets(list);
        if (list.length === 0) setError(PRESETS_UNAVAILABLE);
      })
      .catch(() => {
        setPresets([]);
        setError(PRESETS_UNAVAILABLE);
      });
  }, []);

  return (
    <section>
      <h2>Presets</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Composer OS presets (from the app API). Only supported presets can be used on Generate.
      </p>
      {error && (
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
          {error}
        </div>
      )}
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
