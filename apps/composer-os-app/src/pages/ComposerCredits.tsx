import React, { useEffect, useState } from 'react';

function parseEmbeddedUiStamp(): {
  appShellVersion: string;
  buildTimestamp: string;
  gitCommit: string;
  stableTitle: string | null;
  devTitle: string | null;
} | null {
  try {
    const raw = import.meta.env.VITE_COMPOSER_OS_UI_STAMP_JSON;
    if (!raw) return null;
    const o = JSON.parse(raw as string) as {
      appShellVersion?: string;
      buildTimestamp?: string;
      gitCommit?: string;
      releaseIdentity?: {
        stable?: { windowTitle?: string };
        dev?: { windowTitle?: string };
      };
    };
    if (!o.appShellVersion || !o.buildTimestamp) return null;
    const stableTitle = o.releaseIdentity?.stable?.windowTitle;
    const devTitle = o.releaseIdentity?.dev?.windowTitle;
    return {
      appShellVersion: o.appShellVersion,
      buildTimestamp: o.buildTimestamp,
      gitCommit: typeof o.gitCommit === 'string' ? o.gitCommit : '',
      stableTitle: typeof stableTitle === 'string' ? stableTitle : null,
      devTitle: typeof devTitle === 'string' ? devTitle : null,
    };
  } catch {
    return null;
  }
}

/**
 * Credits / how Composer OS is developed — same view in web app and Electron desktop (shared bundle).
 */
export function ComposerCredits() {
  const stamp = parseEmbeddedUiStamp();
  const [desktopTitle, setDesktopTitle] = useState<string | null>(null);
  const [desktopGit, setDesktopGit] = useState<string | null>(null);
  useEffect(() => {
    if (!window.composerOsDesktop?.getDesktopMeta) return;
    void window.composerOsDesktop.getDesktopMeta().then((meta) => {
      setDesktopTitle(meta.displayTitle ?? null);
      setDesktopGit(meta.gitCommit ?? null);
    });
  }, []);
  const section: React.CSSProperties = { marginBottom: '1.5rem' };
  const h2: React.CSSProperties = { fontSize: '1.1rem', margin: '0 0 0.5rem' };
  const p: React.CSSProperties = { margin: '0.35rem 0', lineHeight: 1.5, color: 'var(--text-muted)' };
  const table: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  };
  const thtd: React.CSSProperties = {
    border: '1px solid var(--border)',
    padding: '0.4rem 0.5rem',
    textAlign: 'left',
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <h2 style={{ marginTop: 0 }}>Credits &amp; development</h2>
      <p style={p}>
        The <strong>Composer OS</strong> desktop program is the Electron wrapper around this same interface — one codebase for
        browser and Windows app. What you see here is how the project is built and which tools sit behind it.
      </p>

      <section style={section}>
        <h3 style={h2}>Build fingerprint (packaged UI)</h3>
        {stamp ? (
          <>
            <p style={p}>
              <strong>Release:</strong> {desktopTitle ?? stamp.stableTitle ?? 'Composer OS'}
            </p>
            <p style={p}>
              <strong>Git build stamp:</strong> {desktopGit || stamp.gitCommit || '—'}
            </p>
            <p style={p}>
              <strong>UI bundle:</strong> package {stamp.appShellVersion} · {stamp.buildTimestamp}
            </p>
            {stamp.stableTitle && stamp.devTitle && (
              <p style={p}>
                STABLE {stamp.stableTitle}. DEV {stamp.devTitle}.
              </p>
            )}
          </>
        ) : (
          <p style={p}>
            No embedded stamp (typical in local <code style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>npm run dev</code>
            ). Packaged desktop builds inject{' '}
            <code style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>VITE_COMPOSER_OS_UI_STAMP_JSON</code>.
          </p>
        )}
      </section>

      <section style={section}>
        <h3 style={h2}>Tooling split (repo)</h3>
        <p style={p}>Same breakdown as the project README — roles for day-to-day development:</p>
        <table style={table}>
          <thead>
            <tr>
              <th style={thtd}>Tool</th>
              <th style={thtd}>Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={thtd}>
                <strong>Cursor</strong>
              </td>
              <td style={thtd}>Repo edits, TypeScript slices, wiring, commits</td>
            </tr>
            <tr>
              <td style={thtd}>
                <strong>Claude Code</strong>
              </td>
              <td style={thtd}>Terminal / npm runs, parallel audits when the IDE is busy</td>
            </tr>
            <tr>
              <td style={thtd}>
                <strong>Perplexity</strong>
              </td>
              <td style={thtd}>External research, library comparisons, publishing quirks</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={section}>
        <h3 style={h2}>Where the engine lives</h3>
        <p style={p}>
          Core pipeline is TypeScript under <code style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>engines/composer-os-v2/</code>
          , shared by the app API and desktop IPC. Quality gate before merge:{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>npm run test:composer-smoke</code> (see{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>CLAUDE.md</code>).
        </p>
      </section>
    </div>
  );
}
