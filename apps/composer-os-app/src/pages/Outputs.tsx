import { useState, useEffect, useCallback } from 'react';
import { api, displayOutputPath } from '../services/api';

type OutputRow = {
  filename: string;
  filepath: string;
  presetFolderLabel: string;
  timestamp: string;
  presetId: string;
  modeLabel?: string;
  outputTypeLabel?: string;
  presetDisplayName?: string;
  variationId?: string;
  styleStack: string[];
  seed: number;
  artifactKind?: string;
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
  const [folderError, setFolderError] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<{
    path: string;
    displayPath?: string;
    presetFolders?: Record<string, string>;
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getOutputs()
      .then((r) => setOutputs(r.outputs as OutputRow[]))
      .catch(() => setOutputs([]))
      .finally(() => setLoading(false));
    api.getOutputDirectory().then((r) => setOutputDir(r)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [refreshTrigger, load]);

  useEffect(() => {
    const onChanged = () => load();
    window.addEventListener('composer-os:outputs-changed', onChanged);
    return () => window.removeEventListener('composer-os:outputs-changed', onChanged);
  }, [load]);

  const openLibraryFolder = async () => {
    setFolderError(null);
    try {
      const r = await api.openOutputFolder();
      if (!r.success && r.message) setFolderError(r.message);
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : String(e));
    }
  };

  const openFileFolder = async (filepath: string) => {
    setFolderError(null);
    try {
      const r = await api.openOutputFolder({ path: dirnameOnly(filepath) });
      if (!r.success && r.message) setFolderError(r.message);
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : String(e));
    }
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
        Newest first — each row shows mode, output type, and path; filename is secondary.
      </p>

      <button className="secondary" onClick={load} disabled={loading} style={{ marginBottom: '1rem' }}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>
      <button onClick={openLibraryFolder} style={{ marginLeft: '0.5rem', marginBottom: '1rem' }}>
        Open library folder
      </button>

      {folderError && (
        <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '1rem' }}>{folderError}</p>
      )}

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
            <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>
              {o.modeLabel ?? o.presetDisplayName ?? o.presetId}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginTop: 6 }}>
              <strong>Output:</strong> {o.outputTypeLabel ?? '—'}
            </div>
            {o.variationId ? (
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4 }}>
                <strong>Variation:</strong> {o.variationId}
              </div>
            ) : null}
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <strong>Preset:</strong> {o.presetDisplayName ?? o.presetId}
            </div>
            {o.presetFolderLabel ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Mode folder: {o.presetFolderLabel}
              </div>
            ) : null}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <strong>Time:</strong> {o.timestamp || '—'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, wordBreak: 'break-all' }}>
              <strong>Path:</strong> {o.filepath}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, opacity: 0.9 }}>
              File: {o.filename}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: 6 }}>
              Seed {o.seed} · {o.presetId}
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
