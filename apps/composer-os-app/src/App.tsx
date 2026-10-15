import React, { useState, useEffect, useCallback } from 'react';
import { HomeGenerate } from './pages/HomeGenerate';
import { Presets } from './pages/Presets';
import { Outputs } from './pages/Outputs';
import { UserGuide } from './pages/UserGuide';
import { ComposerCredits } from './pages/ComposerCredits';
import { SlonimskyEtudes } from './pages/SlonimskyEtudes';
import { PentatonicEnginePage } from './pentatonic/PentatonicEnginePage';
import { HexatonicEnginePage } from './hexatonic/HexatonicEnginePage';
import { BhlComposerPage } from './bhl/BhlComposerPage';
import { WwhPerformanceV8 } from './pages/WwhPerformanceV8';
import { RiffGenPage } from './pages/RiffGenPage';
import { ArrangerTab } from './components/Arranger/ArrangerTab';
import {
  ensureHashRoute,
  navigateToRoute,
  PRIMARY_NAV_ROUTES,
  routeFromLocation,
  routeNavLabel,
  type AppRouteId,
} from './router/appRouter';
import { DiagnosticsPanel, type LastGenerationSummary } from './components/DiagnosticsPanel';
import { api } from './services/api';
import { CompositionSongProvider } from '@renderer/context/CompositionSongContext';
import { DrumSelectionProvider } from '@renderer/context/DrumSelectionContext';
import { FillSchedulerProvider } from '@renderer/context/FillSchedulerContext';
import { FzFingerprintProvider } from '@renderer/context/FzFingerprintContext';
import { VrbProfileProvider } from '@renderer/context/VrbProfileContext';
import { DeferredQueueIndicator } from '@renderer/components/DeferredQueueIndicator';
import { VrbStatusIndicator } from '@renderer/components/VrbStatusIndicator';
import { StructureWorkspace } from '@renderer/pages/StructureWorkspace';
import { EnsembleWorkspace } from '@renderer/pages/EnsembleWorkspace';
import { BigBandProvider } from '@renderer/context/BigBandContext';
import { StringQuartetProvider } from '@renderer/context/StringQuartetContext';
import { BigBandDrumSync } from '@renderer/components/BigBandDrumSync';
import { ContrapuntalProvider } from '@renderer/context/ContrapuntalContext';
import { LastGenerateProvider } from '@renderer/context/LastGenerateContext';
import { GridWorkspace } from '@renderer/pages/GridWorkspace';

type Tab = AppRouteId;

function ComposerEngines() {
  const [wsTitle, setWsTitle] = React.useState('');
  const [wsCustomChords, setWsCustomChords] = React.useState('');
  const [wsSongForm, setWsSongForm] = useState('aaba');
  const [wsResult, setWsResult] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [monkTitle, setMonkTitle] = React.useState('');
  const [monkCustomChords, setMonkCustomChords] = React.useState('');
  const [monkResult, setMonkResult] = React.useState('');
  const [monkLoading, setMonkLoading] = React.useState(false);
  const [cpTitle, setCpTitle] = useState('');
  const [cpCustomChords, setCpCustomChords] = useState('');
  const [cpSongForm, setCpSongForm] = useState('aaba');
  const [cpResult, setCpResult] = useState<string | null>(null);
  const [cpLoading, setCpLoading] = useState(false);

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
                  song_form: wsSongForm,
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
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8, display: 'block' }}>Song form</label>
          <select
            value={wsSongForm}
            onChange={e => setWsSongForm(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          >
            <option value="aaba">AABA — 32 bars (A A' B A'')</option>
            <option value="abac">ABAC — 32 bars (A B A' C)</option>
            <option value="aba">ABA — 24 bars (A B A')</option>
            <option value="ab">AB — 16 bars (A B)</option>
            <option value="blues12">Blues (12 bars)</option>
            <option value="blues24">Blues (24 bars)</option>
            <option value="aab">AAB — 24 bars (A A' B)</option>
            <option value="abcb">ABCB — 32 bars (A B C B')</option>
          </select>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                const trimmed = monkCustomChords.trim();
                (api as any).generateMonk({
                  title: monkTitle,
                  seed: Math.floor(Math.random() * 1e9),
                  ...(trimmed.length > 0 ? { custom_chords: trimmed } : {}),
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
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '13px' }}>
            <span>Custom chords</span>
            <input
              type="text"
              placeholder="Chords (optional): Bb7, Eb7, F7"
              value={monkCustomChords}
              onChange={e => setMonkCustomChords(e.target.value)}
              style={{ width: '100%', padding: '0.3rem', boxSizing: 'border-box' }}
            />
          </label>
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
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1rem',
        maxWidth: '480px'
      }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>
          Charlie Parker
        </h3>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          margin: '0 0 1rem'
        }}>
          Bebop melody engine. Eighth-note line construction,
          approach/enclosure vocabulary, ii-V-I and turnaround
          awareness. Outputs a single-staff lead sheet.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Composition title"
              value={cpTitle}
              onChange={e => setCpTitle(e.target.value)}
              style={{ flex: 1, padding: '0.3rem' }}
            />
            <button
              disabled={!cpTitle || cpLoading}
              onClick={() => {
                setCpLoading(true);
                const trimmed = cpCustomChords.trim();
                (api as any).generateCharliePark({
                  title: cpTitle,
                  seed: Math.floor(Math.random() * 1e9),
                  song_form: cpSongForm,
                  ...(trimmed.length > 0 ? { custom_chords: trimmed } : {}),
                }).then((r: any) => {
                  setCpLoading(false);
                  setCpResult(r?.path ?? '');
                  setCpTitle('');
                }).catch((e: any) => {
                  setCpLoading(false);
                  setCpResult('Error: ' + String(e?.message ?? e));
                });
              }}
            >
              {cpLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '13px' }}>
            <span>Custom chords</span>
            <input
              type="text"
              placeholder="Chords (optional): Dm7, Ebmaj7, Cm7, F7"
              value={cpCustomChords}
              onChange={e => setCpCustomChords(e.target.value)}
              style={{ width: '100%', padding: '0.3rem', boxSizing: 'border-box' }}
            />
          </label>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8, display: 'block' }}>Song form</label>
          <select
            value={cpSongForm}
            onChange={e => setCpSongForm(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          >
            <option value="aaba">AABA — 32 bars (A A' B A'')</option>
            <option value="abac">ABAC — 32 bars (A B A' C)</option>
            <option value="aba">ABA — 24 bars (A B A')</option>
            <option value="ab">AB — 16 bars (A B)</option>
            <option value="blues12">Blues (12 bars)</option>
            <option value="blues24">Blues (24 bars)</option>
            <option value="aab">AAB — 24 bars (A A' B)</option>
            <option value="abcb">ABCB — 32 bars (A B C B')</option>
          </select>
        </div>
        {cpResult && (
          <div style={{
            marginTop: '0.75rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <button
              onClick={async () => {
                if (!cpResult) {
                  alert('No file path — generate a score first');
                  return;
                }
                const result = await (window.composerOsDesktop as any)
                  ?.showItemInFolder(cpResult);
                if (!result?.ok) {
                  alert('Could not open folder: ' +
                    (result?.error ?? 'unknown error'));
                }
              }}
            >
              Open in folder
            </button>
            <button onClick={() => setCpResult(null)}>
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
  const [tab, setTab] = useState<Tab>(() => ensureHashRoute());
  const [refreshOutputs, setRefreshOutputs] = useState(0);
  const [lastGeneration, setLastGeneration] = useState<LastGenerationSummary>({ status: 'none' });
  const [desktopVersion, setDesktopVersion] = useState<string | null>(null);
  const embeddedStamp = parseEmbeddedUiStamp();

  const goToTab = useCallback((next: Tab) => {
    navigateToRoute(next);
    setTab(next);
  }, []);

  useEffect(() => {
    const syncRoute = () => setTab(routeFromLocation());
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

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
    <CompositionSongProvider>
    <LastGenerateProvider>
    <DrumSelectionProvider>
    <FillSchedulerProvider>
    <BigBandProvider>
    <StringQuartetProvider>
    <ContrapuntalProvider>
    <FzFingerprintProvider>
    <VrbProfileProvider>
    <BigBandDrumSync />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <VrbStatusIndicator onNavigate={() => goToTab('structure')} />
        </div>
        <nav style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {PRIMARY_NAV_ROUTES.map((t) => (
            <button
              key={t}
              className={tab === t ? '' : 'secondary'}
              onClick={() => goToTab(t)}
            >
              {routeNavLabel(t)}
            </button>
          ))}
          <button
            className={tab === 'composer-engines' ? '' : 'secondary'}
            onClick={() => goToTab('composer-engines')}
          >
            Composer Engines
          </button>
          <button
            className={tab === 'pentatonic' ? '' : 'secondary'}
            onClick={() => goToTab('pentatonic')}
            type="button"
          >
            Pentatonic
          </button>
          <button
            className={tab === 'hexatonic' ? '' : 'secondary'}
            onClick={() => goToTab('hexatonic')}
            type="button"
          >
            Hexatonic
          </button>
          <button
            className={tab === 'bhl' ? '' : 'secondary'}
            onClick={() => goToTab('bhl')}
            type="button"
          >
            BHL
          </button>
          <button
            className={tab === 'slonimsky-etudes' ? '' : 'secondary'}
            onClick={() => goToTab('slonimsky-etudes')}
            type="button"
          >
            Slonimsky Etudes
          </button>
          <button
            className={tab === 'wwh-v8' ? '' : 'secondary'}
            onClick={() => goToTab('wwh-v8')}
            type="button"
            title="Performance Composer"
          >
            Performance Composer
          </button>
          <button
            className={tab === 'guide' ? '' : 'secondary'}
            onClick={() => goToTab('guide')}
            type="button"
            title="How to use Composer OS"
          >
            Help
          </button>
          <button
            className={tab === 'credits' ? '' : 'secondary'}
            onClick={() => goToTab('credits')}
            type="button"
            title="Credits and how Composer OS is developed"
          >
            Credits
          </button>
        </nav>
      </header>

      <DiagnosticsPanel lastGeneration={lastGeneration} />
      <DeferredQueueIndicator />

      {tab === 'home' && <HomeGenerate onResult={onResult} />}
      {tab === 'arranger' && <ArrangerTab />}
      {tab === 'structure' && <StructureWorkspace />}
      {tab === 'ensemble' && <EnsembleWorkspace />}
      {tab === 'grid' && <GridWorkspace />}
      {tab === 'presets' && <Presets />}
      {tab === 'outputs' && <Outputs refreshTrigger={refreshOutputs} />}
      {tab === 'riffgen' && <RiffGenPage />}
      {tab === 'composer-engines' && (
        <ComposerEngines />
      )}
      {tab === 'pentatonic' && <PentatonicEnginePage />}
      {tab === 'hexatonic' && <HexatonicEnginePage />}
      {tab === 'bhl' && <BhlComposerPage />}
      {tab === 'wwh-v8' && <WwhPerformanceV8 />}
      {tab === 'slonimsky-etudes' && <SlonimskyEtudes />}
      {tab === 'guide' && <UserGuide />}
      {tab === 'credits' && <ComposerCredits />}
    </div>
    </VrbProfileProvider>
    </FzFingerprintProvider>
    </ContrapuntalProvider>
    </StringQuartetProvider>
    </BigBandProvider>
    </FillSchedulerProvider>
    </DrumSelectionProvider>
    </LastGenerateProvider>
    </CompositionSongProvider>
  );
}
