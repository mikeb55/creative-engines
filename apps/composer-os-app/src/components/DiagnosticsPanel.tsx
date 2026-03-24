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
  const [provenance, setProvenance] = useState<Awaited<
    ReturnType<NonNullable<Window['composerOsDesktop']>['getUiProvenance']>
  > | null>(null);
  const [desktopMeta, setDesktopMeta] = useState<Awaited<
    ReturnType<NonNullable<Window['composerOsDesktop']>['getDesktopMeta']>
  > | null>(null);

  const load = () => {
    fetchDiagnostics().then((d) => {
      setDiag(d);
      setBackendOk(!!d?.backendReachable);
    });
    if (typeof window !== 'undefined' && window.composerOsDesktop) {
      window.composerOsDesktop.getDesktopMeta().then((m) => {
        setPackaged(m.packaged);
        setDesktopMeta(m);
      });
      window.composerOsDesktop.getUiProvenance().then((p) => setProvenance(p));
    } else {
      setPackaged(false);
      setProvenance(null);
      setDesktopMeta(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const modeLabel = packaged === true ? 'Packaged' : packaged === false ? 'Development' : '—';
  const surfaceLabel =
    typeof window !== 'undefined' && window.composerOsDesktop ? 'Desktop' : 'Browser';

  const uiDesktopMismatch =
    provenance &&
    provenance.desktopVersion &&
    provenance.uiAppShellVersion &&
    provenance.desktopVersion !== provenance.uiAppShellVersion;

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
          {provenance && (
            <>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>Product:</strong> {provenance.productName}
                {!provenance.verified && (
                  <span style={{ color: 'var(--error)', marginLeft: 6 }}>(UI bundle not verified)</span>
                )}
              </p>
              <p style={{ margin: '0.25rem 0', wordBreak: 'break-word' }}>
                <strong style={{ color: 'var(--text)' }}>App ID:</strong> {provenance.appId}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>Desktop integration:</strong>{' '}
                {provenance.desktopMode === 'ipc' ? 'IPC (no localhost HTTP)' : '—'}
              </p>
              {desktopMeta?.exePath && (
                <p style={{ margin: '0.25rem 0', wordBreak: 'break-all' }}>
                  <strong style={{ color: 'var(--text)' }}>Executable:</strong> {desktopMeta.exePath}
                </p>
              )}
              <p style={{ margin: '0.25rem 0', wordBreak: 'break-word' }}>
                <strong style={{ color: 'var(--text)' }}>Desktop app version:</strong> {provenance.desktopVersion}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>UI bundle version:</strong>{' '}
                {provenance.uiAppShellVersion ?? '—'}
              </p>
              {uiDesktopMismatch && (
                <p
                  style={{
                    margin: '0.5rem 0',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 6,
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid var(--error)',
                    color: 'var(--error)',
                  }}
                >
                  <strong>UI / Desktop version mismatch</strong> — rebuild the desktop app (copy UI) so the bundled UI
                  matches the Electron shell version.
                </p>
              )}
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>UI bundle productId:</strong>{' '}
                {provenance.uiProductId ?? '—'}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>UI build time:</strong>{' '}
                {provenance.uiBuildTimestamp ?? '—'}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>UI git commit:</strong>{' '}
                {provenance.uiGitCommit
                  ? provenance.uiGitCommit.length > 12
                    ? `${provenance.uiGitCommit.slice(0, 12)}…`
                    : provenance.uiGitCommit
                  : '—'}
              </p>
              <p style={{ margin: '0.25rem 0', wordBreak: 'break-word' }}>
                <strong style={{ color: 'var(--text)' }}>Resolved UI path (desktop):</strong>{' '}
                {provenance.uiBundlePath || '—'}
              </p>
            </>
          )}
          {diag && (
            <>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>API transport:</strong>{' '}
                {diag.desktopTransport === 'ipc'
                  ? 'IPC (desktop)'
                  : diag.desktopTransport === 'http'
                    ? 'HTTP (web dev server)'
                    : '—'}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>Active port:</strong>{' '}
                {diag.desktopTransport === 'ipc' ? '— (not used)' : diag.activePort}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong style={{ color: 'var(--text)' }}>App mode:</strong> {surfaceLabel} · {modeLabel}
              </p>
              <p style={{ margin: '0.25rem 0', wordBreak: 'break-word' }}>
                <strong style={{ color: 'var(--text)' }}>Active output directory:</strong>{' '}
                {provenance?.outputDirectory || diag.outputDirectoryDisplay || diag.outputDirectory}
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
