import { useState, useEffect } from 'react';
import { fetchDiagnostics, type DiagnosticsResponse } from '../services/api';

export type LastGenerationSummary = {
  status: 'none' | 'success' | 'failed';
  shareable?: boolean;
  at?: string;
};

export function DiagnosticsPanel({ lastGeneration }: { lastGeneration: LastGenerationSummary }) {
  const [open, setOpen] = useState(false);
  const [diag, setDiag] = useState<DiagnosticsResponse | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [packaged, setPackaged] = useState<boolean | null>(null);

  const load = () => {
    fetchDiagnostics().then((d) => {
      setDiag(d);
      setBackendOk(!!d?.backendReachable);
    });
    if (typeof window !== 'undefined' && window.composerOsDesktop) {
      window.composerOsDesktop.getDesktopMeta().then((m) => setPackaged(m.packaged));
    } else {
      setPackaged(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const modeLabel = packaged === true ? 'Packaged' : packaged === false ? 'Development' : '—';
  const surfaceLabel =
    typeof window !== 'undefined' && window.composerOsDesktop ? 'Desktop' : 'Browser';

  return (
    <div
      style={{
        marginBottom: '1.25rem',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-panel)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="secondary"
        style={{
          width: '100%',
          textAlign: 'left',
          borderRadius: 0,
          border: 'none',
          padding: '0.65rem 1rem',
          background: 'transparent',
          color: 'var(--text)',
          cursor: 'pointer',
        }}
      >
        {open ? '▼' : '▶'} Diagnostics
      </button>
      {open && (
        <div style={{ padding: '0 1rem 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <p style={{ margin: '0.25rem 0' }}>
            <strong style={{ color: 'var(--text)' }}>Backend connected:</strong>{' '}
            {backendOk === null ? '…' : backendOk ? 'Yes' : 'No'}
          </p>
          {diag && (
            <>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>Active port:</strong> {diag.activePort}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>App mode:</strong> {surfaceLabel} · {modeLabel}
              </p>
              <p style={{ margin: '0.25rem 0', wordBreak: 'break-word' }}>
                <strong style={{ color: 'var(--text)' }}>Output folder:</strong>{' '}
                {diag.outputDirectoryDisplay || diag.outputDirectory}
                {!diag.outputDirectoryWritable && (
                  <span style={{ color: 'var(--error)', marginLeft: 6 }}>(not writable)</span>
                )}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>Version:</strong> {diag.version}
              </p>
              <p style={{ margin: '0.25rem 0', wordBreak: 'break-word' }}>
                <strong style={{ color: 'var(--text)' }}>Style modules:</strong>{' '}
                {diag.styleModules?.length
                  ? diag.styleModules.map((m) => m.name).join(', ')
                  : '—'}
              </p>
            </>
          )}
          <p style={{ margin: '0.25rem 0' }}>
            <strong style={{ color: 'var(--text)' }}>Last generation:</strong>{' '}
            {lastGeneration.status === 'none'
              ? 'None yet'
              : lastGeneration.status === 'success'
                ? 'Succeeded'
                : 'Failed'}
            {lastGeneration.at ? ` · ${lastGeneration.at}` : ''}
          </p>
          {lastGeneration.shareable !== undefined && lastGeneration.status !== 'none' && (
            <p style={{ margin: '0.25rem 0' }}>
              <strong style={{ color: 'var(--text)' }}>Shareable:</strong>{' '}
              {lastGeneration.shareable ? 'Yes' : 'No'}
            </p>
          )}
          <button type="button" className="secondary" style={{ marginTop: '0.5rem' }} onClick={load}>
            Refresh diagnostics
          </button>
        </div>
      )}
    </div>
  );
}
