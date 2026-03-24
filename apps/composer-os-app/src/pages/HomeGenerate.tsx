import { useState, useEffect } from 'react';
import { api } from '../services/api';

type GenResult = {
  success?: boolean;
  filename?: string;
  filepath?: string;
  validation?: {
    integrityPassed?: boolean;
    behaviourGatesPassed?: boolean;
    mxValidationPassed?: boolean;
    readiness?: { release?: number; mx?: number; shareable?: boolean };
    errors?: string[];
  };
  runManifest?: {
    seed?: number;
    presetId?: string;
    activeModules?: string[];
    timestamp?: string;
  };
};

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
  const [result, setResult] = useState<GenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<string | null>(null);

  useEffect(() => {
    api.getPresets().then((r) => setPresets(r.presets)).catch(() => {});
    api.getStyleModules().then((r) => setModules(r.modules)).catch(() => {});
    api.getOutputDirectory().then((r) => setOutputDir(r.path)).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = (await api.generate({
        presetId,
        styleStack: { ...styleStack, weights: { primary: 1, secondary: styleStack.weights.secondary ?? 0, colour: styleStack.weights.colour ?? 0 } },
        seed,
        locks,
      })) as GenResult;
      setResult(r);
      onResult(r as Record<string, unknown>);
      api.getOutputDirectory().then((o) => setOutputDir(o.path)).catch(() => {});
    } catch (e) {
      setError(String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const openFolder = () => {
    api.openOutputFolder().catch((e) => setError(String(e)));
  };

  const v = result?.validation;
  const rm = result?.runManifest;

  return (
    <section>
      <h2>Generate</h2>

      {outputDir && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', wordBreak: 'break-all' }}>
          Output folder: <strong style={{ color: 'var(--text)' }}>{outputDir}</strong>
        </p>
      )}

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

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={generate} disabled={loading}>{loading ? 'Generating…' : 'Generate'}</button>
        <button className="secondary" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>New seed</button>
        <button className="secondary" type="button" onClick={openFolder}>Open output folder</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid var(--error)', padding: '1rem', borderRadius: 8, marginBottom: '1rem' }}>
          <strong>Generation failed</strong>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0 }}>Result</h3>
          <p><strong>{result.success ? 'Success' : 'Failed'}</strong></p>
          {result.filepath && (
            <p style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
              <span style={{ color: 'var(--text-muted)' }}>Full path:</span><br />
              {result.filepath}
            </p>
          )}
          {result.filename && <p style={{ fontSize: '0.9rem' }}><span style={{ color: 'var(--text-muted)' }}>File:</span> {result.filename}</p>}
          {rm?.timestamp && <p style={{ fontSize: '0.9rem' }}><span style={{ color: 'var(--text-muted)' }}>Time:</span> {rm.timestamp}</p>}
          {rm?.presetId && <p style={{ fontSize: '0.9rem' }}><span style={{ color: 'var(--text-muted)' }}>Preset:</span> {rm.presetId}</p>}
          {rm?.activeModules?.length ? (
            <p style={{ fontSize: '0.9rem' }}><span style={{ color: 'var(--text-muted)' }}>Style stack:</span> {rm.activeModules.join(', ')}</p>
          ) : null}
          {v && (
            <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Gates:</span>{' '}
              Score {v.integrityPassed ? '✓' : '✗'} · Export {v.behaviourGatesPassed ? '✓' : '✗'} · MX {v.mxValidationPassed ? '✓' : '✗'}
            </div>
          )}
          {v?.readiness && (
            <p style={{ fontSize: '0.9rem' }}>
              Readiness: Release {v.readiness.release ?? '-'} / MX {v.readiness.mx ?? '-'}
              {v.readiness.shareable !== undefined && (
                <span> · {v.readiness.shareable ? 'Shareable' : 'Not shareable'}</span>
              )}
            </p>
          )}
          {v?.errors && v.errors.length > 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--error)' }}>{v.errors.join('; ')}</p>
          )}
          <button type="button" onClick={openFolder} style={{ marginTop: '0.75rem' }}>Open output folder</button>
        </div>
      )}
    </section>
  );
}
