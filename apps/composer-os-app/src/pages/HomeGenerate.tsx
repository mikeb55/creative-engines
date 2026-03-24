import { useState, useEffect } from 'react';
import { api, displayOutputPath, type OutputDirectoryResponse } from '../services/api';
import { useStyleModules, STYLE_MODULES_UNAVAILABLE_MSG } from '../hooks/useStyleModules';
import { StyleBlendControls, type StyleBlendState } from '../components/StyleBlendControls';

type GenResult = {
  success?: boolean;
  filename?: string;
  filepath?: string;
  manifestPath?: string;
  validation?: {
    integrityPassed?: boolean;
    behaviourGatesPassed?: boolean;
    mxValidationPassed?: boolean;
    readiness?: { release?: number; mx?: number; shareable?: boolean };
    errors?: string[];
  };
  runManifest?: {
    seed?: number;
    presetId?: string;
    activeModules?: string[];
    timestamp?: string;
  };
};

function notifyGenPhase(phase: 'running' | 'succeeded' | 'failed' | 'idle'): void {
  window.composerOsDesktop?.notifyGenerationPhase(phase);
}

function labelForModuleId(
  id: string,
  modules: { id: string; name: string }[]
): string {
  return modules.find((m) => m.id === id)?.name ?? id;
}

export function HomeGenerate({
  onResult,
}: {
  onResult: (r: {
    record: Record<string, unknown>;
    summary: { status: 'success' | 'failed'; shareable?: boolean; at?: string };
  }) => void;
}) {
  const [presetId, setPresetId] = useState('guitar_bass_duo');
  /** Hidden variation value sent to the engine (not shown as a raw number). */
  const [variationSeed, setVariationSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [presets, setPresets] = useState<{ id: string; name: string; supported: boolean }[]>([]);
  const [styleStack, setStyleStack] = useState({
    primary: 'barry_harris',
    secondary: '' as string,
    colour: '' as string,
  });
  const [styleBlend, setStyleBlend] = useState<StyleBlendState>({
    primary: 'strong',
    secondary: 'medium',
    colour: 'subtle',
  });
  const { modules, error: modulesError, loading: modulesLoading, reload: reloadModules } = useStyleModules();
  const [locks, setLocks] = useState({
    melody: false,
    bass: false,
    harmony: false,
    rhythm: false,
    sectionA: false,
    sectionB: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<OutputDirectoryResponse | null>(null);

  useEffect(() => {
    api.getPresets().then((r) => setPresets(r.presets)).catch(() => {});
    api.getOutputDirectory().then((r) => setOutputDir(r)).catch(() => {});
  }, []);

  useEffect(() => {
    if (modules.length > 0 && !modules.some((m) => m.id === styleStack.primary)) {
      setStyleStack((s) => ({ ...s, primary: modules[0].id }));
    }
  }, [modules, styleStack.primary]);

  const generate = async () => {
    if (modulesError || modules.length === 0) {
      setError(STYLE_MODULES_UNAVAILABLE_MSG);
      return;
    }
    setLoading(true);
    setError(null);
    notifyGenPhase('running');
    try {
      const r = (await api.generate({
        presetId,
        styleStack: {
          primary: styleStack.primary,
          secondary: styleStack.secondary || undefined,
          colour: styleStack.colour || undefined,
          styleBlend,
        },
        seed: variationSeed,
        locks,
      })) as GenResult;
      setResult(r);
      const ok = !!r.success;
      notifyGenPhase(ok ? 'succeeded' : 'failed');
      const shareable = r.validation?.readiness?.shareable;
      const at = new Date().toISOString();
      onResult({
        record: r as Record<string, unknown>,
        summary: { status: ok ? 'success' : 'failed', shareable, at },
      });
      api.getOutputDirectory().then((o) => setOutputDir(o)).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setResult(null);
      notifyGenPhase('failed');
      onResult({
        record: {},
        summary: { status: 'failed', at: new Date().toISOString() },
      });
    } finally {
      setLoading(false);
    }
  };

  function dirnameOnly(fp: string): string {
    const p = fp.replace(/[/\\]+$/, '');
    const li = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
    return li >= 0 ? p.slice(0, li) : p;
  }

  const openFolder = async (folderPath?: string) => {
    setError(null);
    try {
      const r = await api.openOutputFolder(folderPath ? { path: folderPath } : {});
      if (!r.success && r.message) {
        setError(r.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const v = result?.validation;
  const rm = result?.runManifest;
  const passed =
    result &&
    !!v?.integrityPassed &&
    !!v?.behaviourGatesPassed &&
    !!v?.mxValidationPassed &&
    !!result.success;

  const receiptOk = result && !error && result.success && passed;
  const receiptFail = result && (!result.success || !passed);
  const showBigReceipt = result || error;

  const moduleSelectDisabled = !!modulesError || modules.length === 0 || modulesLoading;

  return (
    <section>
      <h2>Generate</h2>

      {outputDir && (
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '1rem',
            wordBreak: 'break-word',
          }}
        >
          Library folder:{' '}
          <strong style={{ color: 'var(--text)' }}>{displayOutputPath(outputDir)}</strong>
          <span style={{ display: 'block', marginTop: 6, fontSize: '0.8rem' }}>
            Files are saved in preset subfolders (e.g. Guitar-Bass Duos) under this location.
          </span>
        </p>
      )}

      {modulesError && (
        <div
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid var(--error)',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            marginBottom: '1rem',
            fontSize: '0.95rem',
          }}
        >
          {modulesError}
          <button type="button" className="secondary" style={{ marginLeft: '0.75rem' }} onClick={reloadModules}>
            Retry
          </button>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Preset
        </label>
        <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
          {presets.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.supported}>
              {p.name}
              {!p.supported ? ' (coming soon)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Style stack — Primary
        </label>
        <select
          value={styleStack.primary}
          disabled={moduleSelectDisabled}
          onChange={(e) => setStyleStack((s) => ({ ...s, primary: e.target.value }))}
        >
          {modules.length === 0 ? (
            <option value={styleStack.primary}>{modulesLoading ? 'Loading…' : '—'}</option>
          ) : (
            modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Secondary (optional)
        </label>
        <select
          value={styleStack.secondary}
          disabled={moduleSelectDisabled}
          onChange={(e) => setStyleStack((s) => ({ ...s, secondary: e.target.value }))}
        >
          <option value="">—</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Colour (optional)
        </label>
        <select
          value={styleStack.colour}
          disabled={moduleSelectDisabled}
          onChange={(e) => setStyleStack((s) => ({ ...s, colour: e.target.value }))}
        >
          <option value="">—</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <StyleBlendControls
        blend={styleBlend}
        onChange={setStyleBlend}
        hasSecondary={!!styleStack.secondary?.trim()}
        hasColour={!!styleStack.colour?.trim()}
        disabled={moduleSelectDisabled}
      />

      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 520 }}>
        Use <strong style={{ color: 'var(--text)' }}>Try Another</strong> before generating if you want a different musical idea.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 0.9 }}>Locks</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, marginTop: 0.3 }}>
          {(['melody', 'bass', 'harmony', 'rhythm', 'sectionA', 'sectionB'] as const).map((k) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <input
                type="checkbox"
                checked={locks[k]}
                onChange={(e) => setLocks((s) => ({ ...s, [k]: e.target.checked }))}
              />
              <span style={{ fontSize: 0.9 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={generate} disabled={loading || !!modulesError || modules.length === 0}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
        <button className="secondary" type="button" onClick={() => setVariationSeed(Math.floor(Math.random() * 1e9))}>
          Try Another
        </button>
        <button className="secondary" type="button" onClick={() => openFolder()}>
          Open library folder
        </button>
      </div>

      {showBigReceipt && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1.25rem',
            borderRadius: 10,
            border: `3px solid ${
              error || receiptFail ? 'var(--error)' : receiptOk ? 'var(--success)' : 'var(--border)'
            }`,
            background: error || receiptFail ? 'rgba(239,68,68,0.08)' : 'var(--bg-panel)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Generation receipt</h3>

          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid var(--error)',
                padding: '1rem',
                borderRadius: 8,
                marginBottom: '1rem',
              }}
            >
              <strong>Something went wrong</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {result && (
            <>
              <p style={{ fontSize: '1rem', margin: '0.25rem 0' }}>
                <strong>{receiptOk ? 'Passed' : 'Failed'}</strong>
                {receiptOk ? ' — your files are ready below.' : ' — see validation details.'}
              </p>
              {result.filename && (
                <p style={{ fontSize: '0.95rem', margin: '0.5rem 0 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>File name:</span> {result.filename}
                </p>
              )}
              {result.filepath && (
                <p style={{ fontSize: '0.9rem', wordBreak: 'break-word', margin: '0.35rem 0 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Full path:</span>
                  <br />
                  {result.filepath}
                </p>
              )}
              {result.manifestPath && (
                <p style={{ fontSize: '0.9rem', wordBreak: 'break-word', margin: '0.35rem 0 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Manifest:</span>
                  <br />
                  {result.manifestPath}
                </p>
              )}
              {rm?.presetId && (
                <p style={{ fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Preset:</span> {rm.presetId}
                </p>
              )}
              {rm?.activeModules?.length ? (
                <p style={{ fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Style stack (applied):</span>{' '}
                  {rm.activeModules.map((id) => labelForModuleId(id, modules)).join(' · ')}
                </p>
              ) : null}
              {rm?.timestamp && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                  {rm.timestamp}
                </p>
              )}
              {v && (
                <div style={{ fontSize: '0.9rem', marginTop: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Validation gates:</span>{' '}
                  Score {v.integrityPassed ? '✓' : '✗'} · Export {v.behaviourGatesPassed ? '✓' : '✗'} · MX{' '}
                  {v.mxValidationPassed ? '✓' : '✗'}
                </div>
              )}
              {v?.readiness && (
                <p style={{ fontSize: '0.95rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Readiness score:</span> Release{' '}
                  {v.readiness.release ?? '-'} ·{' '}
                  <span style={{ color: 'var(--text-muted)' }}>MX readiness:</span> {v.readiness.mx ?? '-'}
                  {v.readiness.shareable !== undefined && (
                    <span>
                      {' '}
                      · {v.readiness.shareable ? 'Shareable' : 'Not shareable'}
                    </span>
                  )}
                </p>
              )}
              {v?.errors && v.errors.length > 0 && (
                <p style={{ fontSize: '0.9rem', color: 'var(--error)', marginTop: '0.5rem' }}>
                  {v.errors.join('; ')}
                </p>
              )}
            </>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="secondary" onClick={() => openFolder()}>
              Open library folder
            </button>
            <button
              type="button"
              onClick={() => result?.filepath && openFolder(dirnameOnly(result.filepath))}
            >
              Open this file&apos;s folder
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
