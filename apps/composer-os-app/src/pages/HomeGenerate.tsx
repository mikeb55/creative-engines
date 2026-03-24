import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function HomeGenerate({ onResult }: { onResult: (r: Record<string, unknown>) => void }) {
  const [presetId, setPresetId] = useState('guitar_bass_duo');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [presets, setPresets] = useState<{ id: string; name: string; supported: boolean }[]>([]);
  const [styleStack, setStyleStack] = useState({ primary: 'barry_harris', weights: { primary: 1 } });
  const [modules, setModules] = useState<{ id: string; name: string }[]>([]);
  const [locks, setLocks] = useState({
    melody: false, bass: false, harmony: false, rhythm: false, sectionA: false, sectionB: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPresets().then((r) => setPresets(r.presets));
    api.getStyleModules().then((r) => setModules(r.modules));
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.generate({
        presetId,
        styleStack: { ...styleStack, weights: { primary: 1, secondary: styleStack.weights.secondary ?? 0, colour: styleStack.weights.colour ?? 0 } },
        seed,
        locks,
      });
      setResult(r);
      onResult(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>Generate</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>Preset</label>
        <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
          {presets.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.supported}>{p.name}{!p.supported ? ' (coming soon)' : ''}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>Style Stack — Primary</label>
        <select
          value={styleStack.primary}
          onChange={(e) => setStyleStack((s) => ({ ...s, primary: e.target.value }))}
        >
          {modules.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>Seed</label>
        <input
          type="number"
          value={seed}
          onChange={(e) => setSeed(Number(e.target.value) || 0)}
          style={{ width: 160 }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 0.9 }}>Locks</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, marginTop: 0.3 }}>
          {(['melody', 'bass', 'harmony', 'rhythm', 'sectionA', 'sectionB'] as const).map((k) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <input
                type="checkbox"
                checked={locks[k]}
                onChange={(e) => setLocks((s) => ({ ...s, [k]: e.target.checked }))}
              />
              <span style={{ fontSize: 0.9 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={generate} disabled={loading}>{loading ? 'Generating…' : 'Generate'}</button>
        <button className="secondary" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>New seed</button>
      </div>

      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      {result && (
        <div style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
          <h3>Result</h3>
          <p>{(result as { success?: boolean }).success ? 'Success' : 'Failed'}</p>
          {(result as { filename?: string }).filename && <p>File: {(result as { filename?: string }).filename}</p>}
          {(result as { validation?: { readiness?: { release?: number; mx?: number } } }).validation && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Readiness: Release {(result as { validation?: { readiness?: { release?: number; mx?: number } } }).validation?.readiness?.release ?? '-'} / MX {(result as { validation?: { readiness?: { mx?: number } } }).validation?.readiness?.mx ?? '-'}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
