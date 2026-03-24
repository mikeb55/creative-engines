import { useState } from 'react';
import { HomeGenerate } from './pages/HomeGenerate';
import { Presets } from './pages/Presets';
import { StyleStack } from './pages/StyleStack';
import { Outputs } from './pages/Outputs';
import { DiagnosticsPanel, type LastGenerationSummary } from './components/DiagnosticsPanel';

type Tab = 'home' | 'presets' | 'style' | 'outputs';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [refreshOutputs, setRefreshOutputs] = useState(0);
  const [lastGeneration, setLastGeneration] = useState<LastGenerationSummary>({ status: 'none' });

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
