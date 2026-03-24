import { useState, useEffect } from 'react';
import { api, displayOutputPath } from '../services/api';

export function Outputs({ refreshTrigger }: { refreshTrigger?: number }) {
  const [outputs, setOutputs] = useState<Array<{ filename: string; filepath: string; timestamp: string; presetId: string; styleStack: string[]; seed: number; validation?: Record<string, unknown> }>>([]);
  const [loading, setLoading] = useState(true);
  const [outputDir, setOutputDir] = useState<{ path: string; displayPath?: string } | null>(null);

  const load = () => {
    setLoading(true);
    api.getOutputs().then((r) => {
      setOutputs(r.outputs);
      setLoading(false);
    }).catch(() => setLoading(false));
    api.getOutputDirectory().then((r) => setOutputDir(r)).catch(() => {});
  };

  useEffect(() => { load(); }, [refreshTrigger]);

  const openFolder = () => {
    api.openOutputFolder().catch(() => {});
  };

  return (
    <section>
      <h2>Outputs</h2>
      {outputDir && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', wordBreak: 'break-word' }}>
          Folder: <strong style={{ color: 'var(--text)' }}>{displayOutputPath(outputDir)}</strong>
        </p>
      )}
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Generated MusicXML files and validation summaries.
      </p>

      <button className="secondary" onClick={load} disabled={loading} style={{ marginBottom: '1rem' }}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>
      <button onClick={openFolder} style={{ marginLeft: '0.5rem', marginBottom: '1rem' }}>
        Open Output Folder
      </button>

      {outputs.length === 0 && !loading && (
        <p style={{ color: 'var(--text-muted)' }}>No outputs yet. Generate a composition first.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {outputs.map((o) => (
          <div
            key={o.filepath}
            style={{
              background: 'var(--bg-panel)',
              padding: '1rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontWeight: 600 }}>{o.filename}</div>
            <div style={{ fontSize: 0.85, color: 'var(--text-muted)', marginTop: 0.3 }}>{o.filepath}</div>
            <div style={{ fontSize: 0.85, marginTop: 0.5 }}>
              {o.timestamp} · {o.presetId} · seed {o.seed}
            </div>
            {o.styleStack?.length ? (
              <div style={{ fontSize: 0.85, color: 'var(--text-muted)' }}>Styles: {o.styleStack.join(', ')}</div>
            ) : null}
            {o.validation && (
              <div style={{ marginTop: 0.5, fontSize: 0.85 }}>
                <span style={{ color: (o.validation.shareable as boolean) ? 'var(--success)' : 'var(--error)' }}>
                  {(o.validation.shareable as boolean) ? '✓ Shareable' : '✗ Not shareable'}
                </span>
                {' · '}
                Release {(o.validation.readinessRelease as number) ?? '-'} / MX {(o.validation.readinessMx as number) ?? '-'}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
