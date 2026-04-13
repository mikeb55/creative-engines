import React, { useState, useEffect, useCallback } from 'react';
import { HomeGenerate } from './pages/HomeGenerate';
import { Presets } from './pages/Presets';
import { Outputs } from './pages/Outputs';
import { DiagnosticsPanel, type LastGenerationSummary } from './components/DiagnosticsPanel';
import { api } from './services/api';

type Tab = 'home' | 'presets' | 'style' | 'outputs' | 'composer-engines';

function ComposerEngines() {
  const [wsTitle, setWsTitle] = React.useState('');
  const [wsCustomChords, setWsCustomChords] = React.useState('');
  const [wsResult, setWsResult] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [monkTitle, setMonkTitle] = React.useState('');
  const [monkResult, setMonkResult] = React.useState('');
  const [monkLoading, setMonkLoading] = React.useState(false);

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2>Composer Engines</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Dedicated deterministic composer models.
      </p>
      <div style={{ 
        border: '1px solid var(--border)', 
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1rem',
        maxWidth: '480px'
      }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>
          Wayne Shorter
        </h3>
        <p style={{ 
          fontSize: '13px', 
          color: 'var(--text-muted)',
          margin: '0 0 1rem'
        }}>
          Instrumental composition engine. Asymmetrical 
          form, motivic development, harmonic ambiguity.
          Outputs a single-staff lead sheet with chord symbols.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Composition title"
              value={wsTitle}
              onChange={e => setWsTitle(e.target.value)}
              style={{ flex: 1, padding: '0.3rem' }}
            />
            <button
              disabled={!wsTitle || loading}
              onClick={() => {
                setLoading(true);
                const trimmed = wsCustomChords.trim();
                (api as any).generateWayneShorter({
                  title: wsTitle,
                  seed: Math.floor(Math.random() * 1e9),
                  ...(trimmed.length > 0 ? { custom_chords: trimmed } : {}),
                }).then((r: any) => {
                  setLoading(false);
                  setWsResult(r?.path ?? '');
                  setWsTitle('');
                }).catch((e: any) => {
                  setLoading(false);
                  setWsResult('Error: ' + String(e?.message ?? e));
                });
              }}
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '13px' }}>
            <span>Custom chords</span>
            <input
              type="text"
              placeholder="Chords (optional): Dm7, Ebmaj7, Cm7, F7"
              value={wsCustomChords}
              onChange={e => setWsCustomChords(e.target.value)}
              style={{ width: '100%', padding: '0.3rem', boxSizing: 'border-box' }}
            />
          </label>
        </div>
        {wsResult && (
          <div style={{ 
            marginTop: '0.75rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <button
              onClick={async () => {
                if (!wsResult) {
                  alert('No file path — generate a score first');
                  return;
                }
                const result = await (window.composerOsDesktop as any)
                  ?.showItemInFolder(wsResult);
                if (!result?.ok) {
                  alert('Could not open folder: ' +
                    (result?.error ?? 'unknown error'));
                }
              }}
            >
              Open in folder
            </button>
            <button onClick={() => setWsResult('')}>
              Clear
            </button>
          </div>
        )}
      </div>
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1rem',
        maxWidth: '480px'
      }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>
          Thelonious Monk
        </h3>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          margin: '0 0 1rem'
        }}>
          Blues-rooted composition engine. Tritone leaps,
          flat 9 dominants, rhythmic displacement,
          chromatic neighbour harmony.
          Outputs a single-staff lead sheet.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Composition title"
            value={monkTitle}
            onChange={e => setMonkTitle(e.target.value)}
            style={{ flex: 1, padding: '0.3rem' }}
          />
          <button
            disabled={!monkTitle || monkLoading}
            onClick={() => {
              setMonkLoading(true);
              (api as any).generateMonk({
                title: monkTitle,
                seed: Math.floor(Math.random() * 1e9)
              }).then((r: any) => {
                setMonkLoading(false);
                if (r?.path) {
                  setMonkResult(r.path);
                  setMonkTitle('');
                } else {
                  setMonkResult('');
                  alert('Monk generation failed: no path returned');
                }
              }).catch((e: any) => {
                setMonkLoading(false);
                setMonkResult('Error: ' +
                  String(e?.message ?? e));
              });
            }}
          >
            {monkLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
        {monkResult && (
          <div style={{
            marginTop: '0.75rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <button onClick={async () => {
              if (!monkResult || monkResult.startsWith('Error')) {
                alert('No valid file path: ' + monkResult);
                return;
              }
              const result = await (window.composerOsDesktop as any)
                ?.showItemInFolder(monkResult);
              if (!result?.ok) {
                alert('Could not open folder: ' +
                  (result?.error ?? 'unknown'));
              }
            }}>
              Open in folder
            </button>
            <button onClick={() => setMonkResult('')}>
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function parseEmbeddedUiStamp(): {
  appShellVersion: string;
  buildTimestamp: string;
  gitCommit: string;
} | null {
  try {
    const raw = import.meta.env.VITE_COMPOSER_OS_UI_STAMP_JSON;
    if (!raw) return null;
    const o = JSON.parse(raw as string) as {
      appShellVersion?: string;
      buildTimestamp?: string;
      gitCommit?: string;
    };
    if (!o.appShellVersion || !o.buildTimestamp) return null;
    return {
      appShellVersion: o.appShellVersion,
      buildTimestamp: o.buildTimestamp,
      gitCommit: typeof o.gitCommit === 'string' ? o.gitCommit : '',
    };
  } catch {
    return null;
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [refreshOutputs, setRefreshOutputs] = useState(0);
  const [lastGeneration, setLastGeneration] = useState<LastGenerationSummary>({ status: 'none' });
  const [desktopVersion, setDesktopVersion] = useState<string | null>(null);
  const embeddedStamp = parseEmbeddedUiStamp();

  useEffect(() => {
    if (window.composerOsDesktop?.getDesktopMeta) {
      void window.composerOsDesktop.getDesktopMeta().then((m) => {
        setDesktopVersion(m.version);
        document.title = `Composer OS - v${m.version}`;
      });
    } else if (embeddedStamp) {
      document.title = `Composer OS - v${embeddedStamp.appShellVersion}`;
    }
  }, [embeddedStamp]);

  const onResult = useCallback(
    (payload: {
      record: Record<string, unknown>;
      summary: { status: 'success' | 'failed'; shareable?: boolean; at?: string };
    }) => {
      setRefreshOutputs((n) => n + 1);
      window.dispatchEvent(new CustomEvent('composer-os:outputs-changed'));
      setLastGeneration({
        status: payload.summary.status === 'success' ? 'success' : 'failed',
        shareable: payload.summary.shareable,
        at: payload.summary.at,
      });
    },
    []
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          {desktopVersion ? `Composer OS - v${desktopVersion}` : 'Composer OS'}
        </h1>
        {embeddedStamp && (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            UI bundle · v{embeddedStamp.appShellVersion} · {embeddedStamp.buildTimestamp}
            {embeddedStamp.gitCommit ? ` · ${embeddedStamp.gitCommit.slice(0, 7)}` : ''}
          </p>
        )}
        <nav style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          {(['home', 'presets', 'outputs'] as const).map((t) => (
            <button
              key={t}
              className={tab === t ? '' : 'secondary'}
              onClick={() => setTab(t)}
            >
              {t === 'home' ? 'Generate' : t === 'presets' ? 'Presets' : 'Outputs'}
            </button>
          ))}
          <button
            className={tab === 'composer-engines' ? 'active' : ''}
            onClick={() => setTab('composer-engines')}
          >
            Composer Engines
          </button>
        </nav>
      </header>

      <DiagnosticsPanel lastGeneration={lastGeneration} />

      {tab === 'home' && <HomeGenerate onResult={onResult} />}
      {tab === 'presets' && <Presets />}
      {tab === 'outputs' && <Outputs refreshTrigger={refreshOutputs} />}
      {tab === 'composer-engines' && (
        <ComposerEngines />
      )}
    </div>
  );
}
