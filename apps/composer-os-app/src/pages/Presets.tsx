import { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  APP_PRESET_REGISTRY,
  EXPECTED_APP_PRESET_COUNT,
  mergePresetsWithRegistry,
} from '../constants/composerOsPresetUi';

const STALE_API_HINT =
  'The preset API returned fewer entries than expected or omitted Riff Generator. Showing the full in-app registry; reinstall or rebuild the desktop app if generation fails for a preset.';

export function Presets() {
  const [presets, setPresets] = useState(() => [...APP_PRESET_REGISTRY]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [registryWarning, setRegistryWarning] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    setRegistryWarning(null);
    api
      .getPresets()
      .then((r) => {
        const list = r.presets ?? [];
        setPresets(mergePresetsWithRegistry(list));
        if (list.length === 0) {
          setRegistryWarning(STALE_API_HINT);
        } else if (
          list.length !== EXPECTED_APP_PRESET_COUNT ||
          !list.some((p) => p.id === 'riff_generator')
        ) {
          setRegistryWarning(STALE_API_HINT);
        }
      })
      .catch(() => {
        setPresets([...APP_PRESET_REGISTRY]);
        setLoadError('Could not reach the Composer OS preset API — showing the built-in preset list.');
      });
  }, []);

  return (
    <section>
      <h2>Presets</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Composer OS presets. The full list is always shown; live names/descriptions are used when the app API is
        available.
      </p>
      {loadError && (
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
          {loadError}
        </div>
      )}
      {registryWarning && (
        <div
          style={{
            background: 'rgba(234,179,8,0.12)',
            border: '1px solid rgba(234,179,8,0.5)',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            marginBottom: '1rem',
            fontSize: '0.95rem',
            color: 'var(--text)',
          }}
        >
          {registryWarning}
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
