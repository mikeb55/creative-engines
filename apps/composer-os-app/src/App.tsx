import { useState, useEffect } from 'react';
import { HomeGenerate } from './pages/HomeGenerate';
import { Presets } from './pages/Presets';
import { StyleStack } from './pages/StyleStack';
import { Outputs } from './pages/Outputs';
import { DiagnosticsPanel, type LastGenerationSummary } from './components/DiagnosticsPanel';

type Tab = 'home' | 'presets' | 'style' | 'outputs';

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
  const embeddedStamp = parseEmbeddedUiStamp();

  useEffect(() => {
    if (embeddedStamp) {
      document.title = `Composer OS · v${embeddedStamp.appShellVersion}`;
    }
  }, [embeddedStamp]);

  const onResult = (payload: {
    record: Record<string, unknown>;
    summary: { status: 'success' | 'failed'; shareable?: boolean; at?: string };
  }) => {
    setRefreshOutputs((n) => n + 1);
    setLastGeneration({
      status: payload.summary.status === 'success' ? 'success' : 'failed',
      shareable: payload.summary.shareable,
      at: payload.summary.at,
    });
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Composer OS</h1>
        {embeddedStamp && (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            UI bundle · v{embeddedStamp.appShellVersion} · {embeddedStamp.buildTimestamp}
            {embeddedStamp.gitCommit ? ` · ${embeddedStamp.gitCommit.slice(0, 7)}` : ''}
          </p>
        )}
        <nav style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          {(['home', 'presets', 'style', 'outputs'] as const).map((t) => (
            <button
              key={t}
              className={tab === t ? '' : 'secondary'}
              onClick={() => setTab(t)}
            >
              {t === 'home' ? 'Generate' : t === 'presets' ? 'Presets' : t === 'style' ? 'Style Stack' : 'Outputs'}
            </button>
          ))}
        </nav>
      </header>

      <DiagnosticsPanel lastGeneration={lastGeneration} />

      {tab === 'home' && <HomeGenerate onResult={onResult} />}
      {tab === 'presets' && <Presets />}
      {tab === 'style' && <StyleStack />}
      {tab === 'outputs' && <Outputs refreshTrigger={refreshOutputs} />}
    </div>
  );
}
