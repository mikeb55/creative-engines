import { useState, useEffect, useCallback } from 'react';
import { api, displayOutputPath, type OutputDirectoryResponse } from '../services/api';
import { useStyleModules, STYLE_MODULES_UNAVAILABLE_MSG } from '../hooks/useStyleModules';
import { StyleBlendControls, type StyleBlendState } from '../components/StyleBlendControls';
import { mapCoreUiToGenerationFields } from '../utils/buildGenerateRequestBody';
import {
  describeOutputKind,
  EXPERIMENTAL_HELP,
  getModeUx,
  labelCreativeLevel,
} from '../utils/generateUiCopy';

const MODE_OPTIONS: { id: string; label: string }[] = [
  { id: 'guitar_bass_duo', label: 'Guitar–Bass Duo' },
  { id: 'song_mode', label: 'Song Mode' },
  { id: 'ecm_chamber', label: 'ECM Chamber' },
  { id: 'big_band', label: 'Big Band' },
  { id: 'string_quartet', label: 'String Quartet' },
];

const SONGWRITER_OPTIONS: { id: string; label: string }[] = [
  { id: 'bacharach', label: 'Bacharach' },
  { id: 'beatles', label: 'Beatles' },
  { id: 'stevie_wonder', label: 'Stevie Wonder' },
  { id: 'joni_mitchell', label: 'Joni Mitchell' },
  { id: 'donald_fagen', label: 'Donald Fagen' },
  { id: 'paul_simon', label: 'Paul Simon' },
  { id: 'carole_king', label: 'Carole King' },
];

const ARRANGER_OPTIONS: { id: string; label: string }[] = [
  { id: 'ellington', label: 'Duke Ellington' },
  { id: 'basie', label: 'Count Basie' },
  { id: 'thad', label: 'Thad Jones' },
  { id: 'schneider', label: 'Maria Schneider' },
];

const ERA_OPTIONS: { id: string; label: string }[] = [
  { id: 'swing', label: 'Swing' },
  { id: 'bebop', label: 'Bebop' },
  { id: 'post_bop', label: 'Post-bop' },
  { id: 'contemporary', label: 'Contemporary' },
];

const ENSEMBLE_OPTIONS: { id: string; label: string }[] = [
  { id: 'full_band', label: 'Full' },
  { id: 'medium_band', label: 'Medium' },
  { id: 'small_band', label: 'Small' },
  { id: 'reeds_only', label: 'Reeds' },
  { id: 'brass_only', label: 'Brass' },
  { id: 'custom', label: 'Custom' },
];

function modeLabelForPreset(id: string): string {
  return MODE_OPTIONS.find((m) => m.id === id)?.label ?? id;
}

function ensembleLabel(id: string): string {
  return ENSEMBLE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function nextVariationIdToken(current: string): string {
  const t = current.trim();
  const m = /^v-(\d+)$/.exec(t);
  if (m) return `v-${Number(m[1]) + 1}`;
  return `v-${Date.now().toString(36)}`;
}

function newVariationIdToken(): string {
  return `v-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

type GenResult = {
  success?: boolean;
  /** API exception path (desktop/HTTP) */
  error?: string;
  filename?: string;
  filepath?: string;
  harmonySource?: 'builtin' | 'custom';
  customChordProgressionSummary?: string;
  progressionMode?: 'builtin' | 'custom';
  chordProgressionInputRaw?: string;
  parsedCustomProgressionBars?: string[];
  chordProgressionParseFailed?: boolean;
  builtInHarmonyFallbackOccurred?: boolean;
  validation?: {
    integrityPassed?: boolean;
    behaviourGatesPassed?: boolean;
    mxValidationPassed?: boolean;
    strictBarMathPassed?: boolean;
    exportRoundTripPassed?: boolean;
    instrumentMetadataPassed?: boolean;
    readiness?: { release?: number; mx?: number; shareable?: boolean };
    errors?: string[];
  };
  runManifest?: {
    seed?: number;
    presetId?: string;
    activeModules?: string[];
    timestamp?: string;
    scoreTitle?: string;
    variationId?: string;
    creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
    experimentalCreativeLabel?: string;
  };
  scoreTitle?: string;
  requestEcho?: {
    tonalCenter?: string;
    bpm?: number;
    totalBars?: number;
    variationId?: string;
    creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
    stylePairing?: { songwriterStyle: string; arrangerStyle: string; era?: string };
    ensembleConfigId?: string;
    primarySongwriterStyle?: string;
  };
  stylePairingReceipt?: {
    summary: string;
    confidenceScore: number;
    experimentalFlag: boolean;
    songwriterStyle: string;
    arrangerStyle: string;
    era: string | null;
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
  const [ecmMode, setEcmMode] = useState<'ECM_METHENY_QUARTET' | 'ECM_SCHNEIDER_CHAMBER'>(
    'ECM_METHENY_QUARTET'
  );
  /** Legacy numeric seed when `variationId` is empty; otherwise echoed for receipts. */
  const [baseSeed, setBaseSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [variationId, setVariationId] = useState('v-1');
  const [tonalCenter, setTonalCenter] = useState('');
  const [bpm, setBpm] = useState(120);
  const [totalBars, setTotalBars] = useState(32);
  const [creativeControlLevel, setCreativeControlLevel] = useState<
    'stable' | 'balanced' | 'surprise'
  >('stable');
  const [songwriterStyle, setSongwriterStyle] = useState('beatles');
  const [arrangerStyle, setArrangerStyle] = useState('ellington');
  const [era, setEra] = useState('post_bop');
  const [ensembleConfigId, setEnsembleConfigId] = useState('full_band');
  /** Optional work title for MusicXML / score (default comes from the engine when empty). */
  const [scoreTitle, setScoreTitle] = useState('');
  const [harmonyMode, setHarmonyMode] = useState<'builtin' | 'custom'>('builtin');
  const [chordProgressionText, setChordProgressionText] = useState('');
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
    api.getOutputDirectory().then((r) => setOutputDir(r)).catch(() => {});
  }, []);

  useEffect(() => {
    if (modules.length > 0 && !modules.some((m) => m.id === styleStack.primary)) {
      setStyleStack((s) => ({ ...s, primary: modules[0].id }));
    }
  }, [modules, styleStack.primary]);

  const needsScoreStyle =
    presetId === 'guitar_bass_duo' || presetId === 'ecm_chamber';

  const showStylePairing = presetId === 'song_mode' || presetId === 'big_band';
  const showEnsemble = presetId === 'big_band';

  const generate = useCallback(
    async (opts?: { seedOverride?: number; variationOverride?: string }) => {
      if (needsScoreStyle && (modulesError || modules.length === 0)) {
        setError(STYLE_MODULES_UNAVAILABLE_MSG);
        return;
      }
      const seed = opts?.seedOverride ?? baseSeed;
      const vid = opts?.variationOverride ?? variationId;
      setLoading(true);
      setError(null);
      notifyGenPhase('running');
      try {
        const coreFields = mapCoreUiToGenerationFields({
          presetId,
          seed,
          tonalCenter,
          bpm,
          totalBars,
          variationId: vid,
          creativeControlLevel,
          stylePairing: showStylePairing
            ? { songwriterStyle: songwriterStyle, arrangerStyle: arrangerStyle, era }
            : undefined,
          ensembleConfigId: showEnsemble ? ensembleConfigId : undefined,
          primarySongwriterStyle: presetId === 'song_mode' ? songwriterStyle : undefined,
        });
        const r = (await api.generate({
          ...coreFields,
          styleStack: needsScoreStyle
            ? {
                primary: styleStack.primary,
                secondary: styleStack.secondary || undefined,
                colour: styleStack.colour || undefined,
                styleBlend,
              }
            : {
                primary: 'barry_harris',
                styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
              },
          locks: needsScoreStyle ? locks : undefined,
          title: scoreTitle.trim() || undefined,
          ...(presetId === 'guitar_bass_duo'
            ? {
                harmonyMode,
                ...(harmonyMode === 'custom' ? { chordProgressionText: chordProgressionText } : {}),
              }
            : {}),
          ...(presetId === 'ecm_chamber' ? { ecmMode } : {}),
        })) as GenResult;
        setResult(r);
        const ok = !!r.success;
        if (!ok) {
          const errMsg =
            (r as { error?: string }).error ??
            (r.validation?.errors?.length ? r.validation.errors.join(' ') : undefined);
          if (errMsg) setError(errMsg);
          else if (!r.success) setError('Generation failed.');
        }
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
    },
    [
      baseSeed,
      variationId,
      tonalCenter,
      bpm,
      totalBars,
      creativeControlLevel,
      songwriterStyle,
      arrangerStyle,
      era,
      ensembleConfigId,
      presetId,
      styleStack.primary,
      styleStack.secondary,
      styleStack.colour,
      styleBlend,
      locks,
      scoreTitle,
      needsScoreStyle,
      showStylePairing,
      showEnsemble,
      modulesError,
      modules.length,
      onResult,
      harmonyMode,
      chordProgressionText,
      ecmMode,
    ]
  );

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
  const productKind = (result as { productKind?: string } | null)?.productKind;
  const passed = result
    ? productKind && productKind !== 'musicxml'
      ? !!result.success && !(v?.errors?.length)
      : !!v?.integrityPassed &&
        !!v?.behaviourGatesPassed &&
        !!v?.mxValidationPassed &&
        !!v?.strictBarMathPassed &&
        !!v?.exportRoundTripPassed &&
        !!v?.instrumentMetadataPassed &&
        !!result.success
    : false;

  const receiptOk = result && !error && result.success && passed;
  const receiptFail = result && (!result.success || !passed);
  const showBigReceipt = result || error;

  const moduleSelectDisabled =
    needsScoreStyle && (!!modulesError || modules.length === 0 || modulesLoading);

  const modeUx = getModeUx(presetId);
  const summaryPresetId = result?.runManifest?.presetId ?? presetId;
  const outputKindDesc = result ? describeOutputKind(summaryPresetId) : null;
  const echo = result?.requestEcho;

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

      {needsScoreStyle && modulesError && (
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

      {needsScoreStyle && modules.length > 0 && !modulesError && (
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '0.75rem',
            lineHeight: 1.45,
          }}
        >
          Style modules: {modules.map((m) => m.name).join(' · ')}
        </p>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Mode
        </label>
        <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
          {MODE_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {modeUx && (
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
              marginTop: '0.45rem',
              marginBottom: 0,
              lineHeight: 1.45,
              maxWidth: 560,
            }}
          >
            {modeUx.hint}
          </p>
        )}
      </div>

      {modeUx && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            maxWidth: 600,
            fontSize: '0.9rem',
            lineHeight: 1.5,
            color: 'var(--text)',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>About this mode</p>
          <p style={{ margin: '0 0 0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>What it does:</span> {modeUx.whatItDoes}
          </p>
          <p style={{ margin: '0 0 0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Best for:</span> {modeUx.bestFor}
          </p>
          <p style={{ margin: 0 }}>
            <span style={{ color: 'var(--text-muted)' }}>Output:</span> {modeUx.output}
          </p>
          {presetId === 'ecm_chamber' && (
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Metheny</strong> leans modal and melodic;{' '}
              <strong style={{ color: 'var(--text)' }}>Schneider / Wheeler</strong> leans expansive clouds and
              swells — pick the flavour below.
            </p>
          )}
          {(presetId === 'song_mode' || presetId === 'big_band') && (
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Style pairing</strong> blends songwriter habits with
              arranger habits for colour — it guides the plan; it does not replace the core engine.
            </p>
          )}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Key / tonal centre
        </label>
        <input
          type="text"
          value={tonalCenter}
          onChange={(e) => setTonalCenter(e.target.value)}
          placeholder="e.g. C major, F#m"
          disabled={loading}
          style={{
            maxWidth: 320,
            padding: '0.45rem 0.6rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-input, var(--bg))',
            color: 'var(--text)',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Tempo (BPM)
          </label>
          <input
            type="number"
            min={20}
            max={400}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10) || 0)}
            disabled={loading}
            style={{
              width: 120,
              padding: '0.45rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
              color: 'var(--text)',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Total bars
          </label>
          <input
            type="number"
            min={8}
            max={512}
            value={totalBars}
            onChange={(e) => setTotalBars(parseInt(e.target.value, 10) || 0)}
            disabled={loading}
            style={{
              width: 120,
              padding: '0.45rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
              color: 'var(--text)',
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Variation
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <code
            style={{
              fontSize: '0.95rem',
              padding: '0.35rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-panel)',
            }}
          >
            {variationId.trim() || '(none)'}
          </code>
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => {
              const next = newVariationIdToken();
              setVariationId(next);
              setBaseSeed(Math.floor(Math.random() * 1e9));
            }}
          >
            New Variation
          </button>
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => setVariationId((v) => nextVariationIdToken(v))}
          >
            Next Variation
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <span style={{ display: 'block', marginBottom: 0.35, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Creative level
        </span>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.4rem', maxWidth: 520 }}>
          How much the engine nudges the variation — not the form of the piece.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.9rem' }}>
          <input
            type="radio"
            name="creativeLevel"
            checked={creativeControlLevel === 'stable'}
            onChange={() => setCreativeControlLevel('stable')}
          />
          Stable
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.9rem' }}>
          <input
            type="radio"
            name="creativeLevel"
            checked={creativeControlLevel === 'balanced'}
            onChange={() => setCreativeControlLevel('balanced')}
          />
          Balanced
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
          <input
            type="radio"
            name="creativeLevel"
            checked={creativeControlLevel === 'surprise'}
            onChange={() => setCreativeControlLevel('surprise')}
          />
          Surprise
        </label>
      </div>

      {showEnsemble && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Ensemble size (Big Band)
          </label>
          <select
            value={ensembleConfigId}
            onChange={(e) => setEnsembleConfigId(e.target.value)}
            disabled={loading}
          >
            {ENSEMBLE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {showStylePairing && (
        <div style={{ marginBottom: '1rem', maxWidth: 520 }}>
          <span style={{ display: 'block', marginBottom: 0.35, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Style pairing
          </span>
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Songwriter
            </label>
            <select
              value={songwriterStyle}
              onChange={(e) => setSongwriterStyle(e.target.value)}
              disabled={loading}
            >
              {SONGWRITER_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Arranger
            </label>
            <select
              value={arrangerStyle}
              onChange={(e) => setArrangerStyle(e.target.value)}
              disabled={loading}
            >
              {ARRANGER_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Era
            </label>
            <select value={era} onChange={(e) => setEra(e.target.value)} disabled={loading}>
              {ERA_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {presetId === 'ecm_chamber' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            ECM chamber mode
          </label>
          <select
            value={ecmMode}
            onChange={(e) =>
              setEcmMode(e.target.value as 'ECM_METHENY_QUARTET' | 'ECM_SCHNEIDER_CHAMBER')
            }
          >
            <option value="ECM_METHENY_QUARTET">Metheny-style quartet (modal, single-line focus)</option>
            <option value="ECM_SCHNEIDER_CHAMBER">Schneider / Wheeler chamber (clouds, swells)</option>
          </select>
        </div>
      )}

      {needsScoreStyle && (
        <>
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
        </>
      )}

      {presetId === 'guitar_bass_duo' && (
        <div style={{ marginBottom: '1rem', maxWidth: 520 }}>
          <span style={{ display: 'block', marginBottom: 0.35, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Harmony
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.9rem' }}>
            <input
              type="radio"
              name="harmonyMode"
              checked={harmonyMode === 'builtin'}
              onChange={() => setHarmonyMode('builtin')}
            />
            Built-in progression
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem' }}>
            <input
              type="radio"
              name="harmonyMode"
              checked={harmonyMode === 'custom'}
              onChange={() => setHarmonyMode('custom')}
            />
            Custom chord progression
          </label>
          {harmonyMode === 'custom' && (
            <>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.95rem' }}>
                Chord Progression
              </label>
              <textarea
                value={chordProgressionText}
                onChange={(e) => setChordProgressionText(e.target.value)}
                placeholder="Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt"
                rows={3}
                disabled={moduleSelectDisabled}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.6rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input, var(--bg))',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.45 }}>
                Example: Dm9 | G13 | Cmaj9 | A7alt
                <br />
                Slash chords: D/F# | G/B | Cmaj7/E
                <br />
                Exactly 8 bars, separated by | .
              </p>
            </>
          )}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Score title (optional)
        </label>
        <input
          type="text"
          value={scoreTitle}
          onChange={(e) => setScoreTitle(e.target.value)}
          placeholder="e.g. My duo sketch — or leave blank for a default title"
          disabled={loading}
          style={{
            width: '100%',
            maxWidth: 520,
            padding: '0.45rem 0.6rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-input, var(--bg))',
            color: 'var(--text)',
          }}
        />
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 520 }}>
        <strong style={{ color: 'var(--text)' }}>New Variation</strong> assigns a fresh variation id;{' '}
        <strong style={{ color: 'var(--text)' }}>Next Variation</strong> steps the id (then use Generate).
      </p>

      {needsScoreStyle && (
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
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => void generate()}
          disabled={loading || (needsScoreStyle && (!!modulesError || modules.length === 0))}
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
        <button
          className="secondary"
          type="button"
          disabled={loading || (needsScoreStyle && (!!modulesError || modules.length === 0))}
          onClick={() => {
            const next = newVariationIdToken();
            setVariationId(next);
            setBaseSeed(Math.floor(Math.random() * 1e9));
            void generate({ variationOverride: next });
          }}
        >
          Try Another
        </button>
        <button
          className="secondary"
          type="button"
          disabled={loading || (needsScoreStyle && (!!modulesError || modules.length === 0))}
          onClick={() => {
            setBaseSeed(42);
            setVariationId('demo-42');
            void generate({ seedOverride: 42, variationOverride: 'demo-42' });
          }}
        >
          Demo (fixed variation)
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

          {(result as { planningNotice?: string })?.planningNotice && (
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 0 }}>
              {(result as { planningNotice?: string }).planningNotice}
            </p>
          )}

          {result && outputKindDesc && (
            <div
              style={{
                marginTop: '0.75rem',
                marginBottom: '1rem',
                padding: '0.9rem 1rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'rgba(0,0,0,0.12)',
                fontSize: '0.9rem',
                lineHeight: 1.45,
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Result summary</h4>
              <p style={{ margin: '0 0 0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Output type:</span>{' '}
                <strong>{outputKindDesc.headline}</strong>
                <span style={{ color: 'var(--text-muted)' }}> — {outputKindDesc.subtitle}</span>
              </p>
              <p style={{ margin: '0.5rem 0 0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mode:</span> {modeLabelForPreset(summaryPresetId)}
              </p>
              {(echo?.variationId ?? rm?.variationId) != null &&
                String(echo?.variationId ?? rm?.variationId).trim() !== '' && (
                  <p style={{ margin: '0.25rem 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Variation:</span>{' '}
                    {echo?.variationId ?? rm?.variationId}
                  </p>
                )}
              {echo?.tonalCenter?.trim() ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Key / tonal centre:</span> {echo.tonalCenter}
                </p>
              ) : null}
              {echo?.bpm != null && echo.bpm > 0 ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tempo:</span> {echo.bpm} BPM
                </p>
              ) : null}
              {echo?.totalBars != null && echo.totalBars > 0 ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total bars:</span> {echo.totalBars}
                </p>
              ) : null}
              {(echo?.stylePairing || result.stylePairingReceipt) && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Style pairing:</span>{' '}
                  {result.stylePairingReceipt
                    ? result.stylePairingReceipt.summary
                    : echo?.stylePairing
                      ? `${echo.stylePairing.songwriterStyle} × ${echo.stylePairing.arrangerStyle}${
                          echo.stylePairing.era ? ` · ${echo.stylePairing.era}` : ''
                        }`
                      : null}
                </p>
              )}
              {echo?.ensembleConfigId ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ensemble size:</span>{' '}
                  {ensembleLabel(echo.ensembleConfigId)}
                </p>
              ) : null}
              {(echo?.creativeControlLevel ?? rm?.creativeControlLevel) != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Creative level:</span>{' '}
                  {labelCreativeLevel(
                    (echo?.creativeControlLevel ?? rm?.creativeControlLevel) as
                      | 'stable'
                      | 'balanced'
                      | 'surprise'
                  )}
                </p>
              )}
              {result.stylePairingReceipt?.confidenceScore != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Confidence:</span>{' '}
                  {result.stylePairingReceipt.confidenceScore.toFixed(2)} (style pairing)
                </p>
              )}
              {result.stylePairingReceipt?.experimentalFlag && (
                <p style={{ margin: '0.35rem 0 0' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      marginRight: 8,
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: 'rgba(234,179,8,0.2)',
                      border: '1px solid rgba(234,179,8,0.5)',
                      color: 'var(--text)',
                    }}
                  >
                    Experimental
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{EXPERIMENTAL_HELP}</span>
                </p>
              )}
              {!result.stylePairingReceipt?.experimentalFlag && rm?.experimentalCreativeLabel && (
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Creative note:</span> {rm.experimentalCreativeLabel}
                </p>
              )}
              {result.filepath && (
                <p style={{ margin: '0.5rem 0 0', wordBreak: 'break-word' }}>
                  <span style={{ color: 'var(--text-muted)' }}>File path:</span> {result.filepath}
                </p>
              )}
              {v?.readiness?.mx != null && result.stylePairingReceipt?.confidenceScore == null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Readiness (MX):</span> {v.readiness.mx}
                </p>
              )}
            </div>
          )}

          {(result as { composerOsVersion?: string })?.composerOsVersion && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
              Engine version: {(result as { composerOsVersion?: string }).composerOsVersion}
            </p>
          )}

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
              {(result.scoreTitle ?? rm?.scoreTitle) && (
                <p style={{ fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Score title:</span>{' '}
                  {result.scoreTitle ?? rm?.scoreTitle}
                </p>
              )}
              {rm?.presetId === 'guitar_bass_duo' &&
                (result.harmonySource ||
                  result.progressionMode ||
                  result.chordProgressionParseFailed) && (
                  <p style={{ fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Harmony:</span>{' '}
                    {result.chordProgressionParseFailed
                      ? 'Custom progression (invalid — not applied)'
                      : result.harmonySource === 'custom' || result.progressionMode === 'custom'
                        ? 'Custom progression'
                        : 'Built-in progression'}
                    {result.customChordProgressionSummary ? (
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.85rem',
                          marginTop: 4,
                          wordBreak: 'break-word',
                        }}
                      >
                        {result.customChordProgressionSummary}
                      </span>
                    ) : result.chordProgressionInputRaw ? (
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.85rem',
                          marginTop: 4,
                          wordBreak: 'break-word',
                        }}
                      >
                        {result.chordProgressionInputRaw}
                      </span>
                    ) : null}
                    {result.builtInHarmonyFallbackOccurred ? (
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          marginTop: 4,
                          color: 'var(--text-muted)',
                        }}
                      >
                        Warning: built-in fallback flag set (unexpected)
                      </span>
                    ) : null}
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
                  Score {v.integrityPassed ? '✓' : '✗'} · Bar math {v.strictBarMathPassed ? '✓' : '✗'} · Behaviour{' '}
                  {v.behaviourGatesPassed ? '✓' : '✗'} · MX {v.mxValidationPassed ? '✓' : '✗'} · Round-trip{' '}
                  {v.exportRoundTripPassed ? '✓' : '✗'} · Bass metadata {v.instrumentMetadataPassed ? '✓' : '✗'}
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
