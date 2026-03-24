import { useState, useEffect } from 'react';
import { api, displayOutputPath } from '../services/api';

type OutputRow = {
  filename: string;
  filepath: string;
  presetFolderLabel: string;
  timestamp: string;
  presetId: string;
  styleStack: string[];
  seed: number;
  validation?: Record<string, unknown>;
};

function dirnameOnly(fp: string): string {
  const p = fp.replace(/[/\\]+$/, '');
  const li = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return li >= 0 ? p.slice(0, li) : p;
}

export function Outputs({ refreshTrigger }: { refreshTrigger?: number }) {
  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [outputDir, setOutputDir] = useState<{
    path: string;
    displayPath?: string;
    presetFolders?: Record<string, string>;
  } | null>(null);

  const load = () => {
    setLoading(true);
    api
      .getOutputs()
      .then((r) => setOutputs(r.outputs as OutputRow[]))
      .catch(() => setOutputs([]))
      .finally(() => setLoading(false));
    api.getOutputDirectory().then((r) => setOutputDir(r)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  const openLibraryFolder = () => {
    api.openOutputFolder().catch(() => {});
  };

  const openFileFolder = (filepath: string) => {
    api.openOutputFolder({ path: dirnameOnly(filepath) }).catch(() => {});
  };

  return (
    <section>
      <h2>Outputs</h2>
      {outputDir && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', wordBreak: 'break-word' }}>
          Library folder:{' '}
          <strong style={{ color: 'var(--text)' }}>{displayOutputPath(outputDir)}</strong>
        </p>
      )}
      {outputDir?.presetFolders && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Preset folders:{' '}
          {Object.entries(outputDir.presetFolders).map(([id, name]) => (
            <span key={id} style={{ marginRight: '0.75rem' }}>
              <code style={{ fontSize: '0.85rem' }}>{name}</code>
            </span>
          ))}
        </p>
      )}
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Generated MusicXML files and validation summaries (newest first).
      </p>

      <button className="secondary" onClick={load} disabled={loading} style={{ marginBottom: '1rem' }}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>
      <button onClick={openLibraryFolder} style={{ marginLeft: '0.5rem', marginBottom: '1rem' }}>
        Open library folder
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
            {o.presetFolderLabel ? (
              <div style={{ fontSize: 0.85, color: 'var(--text-muted)', marginTop: 4 }}>
                Folder: {o.presetFolderLabel}
              </div>
            ) : null}
            <div style={{ fontSize: 0.85, color: 'var(--text-muted)', marginTop: 0.3 }}>{o.filepath}</div>
            <div style={{ fontSize: 0.85, marginTop: 0.5 }}>
              {o.timestamp} · {o.presetId}
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
            <button type="button" className="secondary" style={{ marginTop: '0.75rem' }} onClick={() => openFileFolder(o.filepath)}>
              Open this file&apos;s folder
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
