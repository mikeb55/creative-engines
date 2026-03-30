import { useState, useEffect, useCallback, useRef } from 'react';
import { api, displayOutputPath, type OutputDirectoryResponse } from '../services/api';
import { mapCoreUiToGenerationFields } from '../utils/buildGenerateRequestBody';
import {
  describeOutputKind,
  EXPERIMENTAL_HELP,
  getModeUx,
  labelCreativeLevel,
} from '../utils/generateUiCopy';
import {
  APP_PRESET_REGISTRY,
  mergePresetsWithRegistry,
  type AppPresetCard,
} from '../constants/composerOsPresetUi';
import { parseChordProgressionInput, parseChordProgressionInputWithBarCount } from '../utils/chordProgressionClient';

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

/** Internal default for Big Band style pairing when only arranger/era are exposed in UI. */
const BIG_BAND_DEFAULT_SONGWRITER_STYLE = 'donald_fagen';

/** Fixed style stack for MusicXML modes (duo / ECM) — not user-configurable in this UI. */
const DEFAULT_SCORE_STYLE_STACK = {
  primary: 'barry_harris' as const,
  styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
};

const MINIMAL_STYLE_STACK = {
  primary: 'barry_harris' as const,
  styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
};

/** Must stay aligned with `StyleProfile` in `engines/composer-os-v2/core/song-mode/songModeStyleProfile.ts`. */
const SONG_MODE_STYLE_OPTIONS = ['STYLE_ECM', 'STYLE_SHORTER_POST_BOP', 'STYLE_BEBOP_LITE'] as const;
type SongModeStyleProfile = (typeof SONG_MODE_STYLE_OPTIONS)[number];

function songModeStyleProfileFromSelectValue(v: string): SongModeStyleProfile | null {
  for (const o of SONG_MODE_STYLE_OPTIONS) {
    if (o === v) return o;
  }
  return null;
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
    warnings?: string[];
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
    styleProfile?: SongModeStyleProfile;
    c4Strength?: 'light' | 'medium' | 'strong';
    blendStrength?: 'light' | 'medium' | 'strong';
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
  const [baseSeed, setBaseSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [variationId, setVariationId] = useState('v-1');
  const [tonalCenter, setTonalCenter] = useState('');
  const [bpm, setBpm] = useState(120);
  const [totalBars, setTotalBars] = useState(32);
  const [creativeControlLevel, setCreativeControlLevel] = useState<
    'stable' | 'balanced' | 'surprise'
  >('stable');
  const [variationEnabled, setVariationEnabled] = useState(false);
  const [songwriterStyle, setSongwriterStyle] = useState('donald_fagen');
  const [arrangerStyle, setArrangerStyle] = useState('thad');
  const [songModeStyleProfile, setSongModeStyleProfile] = useState<SongModeStyleProfile>('STYLE_ECM');
  const [intentGroove, setIntentGroove] = useState(0.5);
  const [intentSpace, setIntentSpace] = useState(0.5);
  const [intentExpression, setIntentExpression] = useState(0.5);
  const [intentSurprise, setIntentSurprise] = useState(0.5);
  const [era, setEra] = useState('post_bop');
  const [ensembleConfigId, setEnsembleConfigId] = useState('full_band');
  const [scoreTitle, setScoreTitle] = useState('');
  /** Guitar–Bass Duo: optional chord line — 8 bars (tiled to 32 in long-form) or 32 bars (locked). When non-empty, engine uses custom harmony. */
  const [chordProgressionText, setChordProgressionText] = useState('');
  const [c4Strength, setC4Strength] = useState<'light' | 'medium' | 'strong'>('medium');
  const [blendStrength, setBlendStrength] = useState<'light' | 'medium' | 'strong'>('medium');
  const [funkGroove, setFunkGroove] = useState(false);
  const [riffStyle, setRiffStyle] = useState<'metheny' | 'scofield' | 'funk' | 'neutral'>('neutral');
  const [riffDensity, setRiffDensity] = useState<'sparse' | 'medium' | 'dense'>('medium');
  const [riffGrid, setRiffGrid] = useState<'eighth' | 'sixteenth'>('eighth');
  const [riffLineMode, setRiffLineMode] = useState<
    'single_line' | 'guitar_bass' | 'octave_double'
  >('single_line');
  const [riffBass, setRiffBass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<OutputDirectoryResponse | null>(null);
  /** Same merge as Presets tab — single source of truth with engine `getPresets()`. */
  const [modePresets, setModePresets] = useState<AppPresetCard[]>(() => [...APP_PRESET_REGISTRY]);
  const desktopTruthDumpEnabled = useRef(false);

  useEffect(() => {
    const d = window.composerOsDesktop;
    if (d?.mode === 'desktop' && typeof d.getRuntimeBuildInfo === 'function') {
      void d.getRuntimeBuildInfo().then((r) => {
        console.log('[Composer OS] runtime build info (renderer)', r);
        desktopTruthDumpEnabled.current = !!(r as { truthDumpEnabled?: boolean }).truthDumpEnabled;
      });
    }
  }, []);

  useEffect(() => {
    api.getOutputDirectory().then((r) => setOutputDir(r)).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .getPresets()
      .then((r) => setModePresets(mergePresetsWithRegistry(r.presets)))
      .catch(() => setModePresets([...APP_PRESET_REGISTRY]));
  }, []);

  function modeLabelForPreset(id: string): string {
    return modePresets.find((m) => m.id === id)?.name ?? id;
  }

  useEffect(() => {
    if (presetId === 'riff_generator') {
      setTotalBars((tb) => (tb >= 1 && tb <= 4 ? tb : 2));
    } else {
      setTotalBars((tb) => (tb >= 8 ? tb : 32));
    }
  }, [presetId]);

  const isScorePreset =
    presetId === 'guitar_bass_duo' || presetId === 'ecm_chamber' || presetId === 'riff_generator';

  const generate = useCallback(
    async (opts?: { seedOverride?: number; variationOverride?: string }) => {
      const seed = opts?.seedOverride ?? baseSeed;
      const vid = opts?.variationOverride ?? variationId;
      setLoading(true);
      setError(null);
      notifyGenPhase('running');
      try {
        const stylePairingSong =
          presetId === 'song_mode'
            ? { songwriterStyle: songwriterStyle, arrangerStyle: arrangerStyle, era }
            : undefined;
        const stylePairingBigBand =
          presetId === 'big_band'
            ? {
                songwriterStyle: BIG_BAND_DEFAULT_SONGWRITER_STYLE,
                arrangerStyle: arrangerStyle,
                era,
              }
            : undefined;

        const tonalTrim = tonalCenter.trim();
        const chordTrim = chordProgressionText.trim();
        /**
         * Song Mode: users often paste the 32-bar line into "Tonal centre" instead of "Chord progression".
         * If we only read `chordProgressionText`, the API gets a long string in `tonalCenter` and no
         * `chordProgressionText` → engine falls back to built-in duo32 (Dmin9/G13/…).
         */
        const songChordLine = presetId === 'song_mode' ? chordTrim || tonalTrim : chordTrim;

        const coreFields = mapCoreUiToGenerationFields({
          presetId,
          seed,
          tonalCenter:
            presetId === 'song_mode' && chordTrim === '' && tonalTrim !== '' ? '' : tonalCenter,
          bpm,
          totalBars,
          variationId: vid,
          creativeControlLevel,
          stylePairing: stylePairingSong ?? stylePairingBigBand,
          ensembleConfigId: presetId === 'big_band' ? ensembleConfigId : undefined,
          primarySongwriterStyle: presetId === 'song_mode' ? songwriterStyle : undefined,
        });
        /** Duo long-form: 32-bar paste must preflight as 32 (engine matches runGoldenPath try-32-then-8). */
        let duoHarmonyFields: {
          harmonyMode: 'custom' | 'custom_locked';
          chordProgressionText: string;
          totalBars?: number;
          longFormEnabled?: boolean;
        } | null = null;
        if (presetId === 'guitar_bass_duo' && chordTrim) {
          const p32 = parseChordProgressionInputWithBarCount(chordTrim, 32);
          if (p32.ok) {
            duoHarmonyFields = {
              harmonyMode: 'custom_locked',
              chordProgressionText: chordTrim,
              totalBars: 32,
              longFormEnabled: true,
            };
          } else {
            const p8 = parseChordProgressionInput(chordTrim);
            if (!p8.ok) {
              setError(p8.error);
              setLoading(false);
              notifyGenPhase('failed');
              onResult({
                record: {},
                summary: { status: 'failed', at: new Date().toISOString() },
              });
              return;
            }
            duoHarmonyFields = { harmonyMode: 'custom', chordProgressionText: chordTrim };
          }
        }
        if (presetId === 'song_mode' && songChordLine) {
          const parsed32 = parseChordProgressionInputWithBarCount(songChordLine, 32);
          if (!parsed32.ok) {
            setError(parsed32.error);
            setLoading(false);
            notifyGenPhase('failed');
            onResult({
              record: {},
              summary: { status: 'failed', at: new Date().toISOString() },
            });
            return;
          }
        }
        const generatePayload = {
          ...coreFields,
          variationEnabled: variationEnabled,
          styleStack: isScorePreset ? DEFAULT_SCORE_STYLE_STACK : MINIMAL_STYLE_STACK,
          title: scoreTitle.trim() || undefined,
          ...(presetId === 'ecm_chamber' ? { ecmMode } : {}),
          ...(presetId === 'guitar_bass_duo' || presetId === 'song_mode'
            ? { c4Strength: c4Strength, blendStrength: blendStrength, songModeJamesBrownFunkOverlay: funkGroove }
            : {}),
          ...(duoHarmonyFields ? duoHarmonyFields : {}),
          ...(presetId === 'song_mode' && songChordLine
            ? {
                harmonyMode: 'custom_locked' as const,
                chordProgressionText: songChordLine,
                totalBars: 32,
                longFormEnabled: true,
              }
            : {}),
          ...(presetId === 'riff_generator'
            ? {
                riffStyle,
                riffDensity,
                riffGrid,
                riffLineMode,
                riffBass,
                ...(chordTrim ? { chordProgressionText: chordTrim } : {}),
              }
            : {}),
          ...(presetId === 'song_mode'
            ? {
                styleProfile: songModeStyleProfile,
                intent: {
                  groove: intentGroove,
                  space: intentSpace,
                  expression: intentExpression,
                  surprise: intentSurprise,
                  pattern: 0.5,
                },
              }
            : {}),
        };

        if (presetId === 'song_mode' && songChordLine.length > 0) {
          const gp = generatePayload as { chordProgressionText?: string };
          const out = typeof gp.chordProgressionText === 'string' ? gp.chordProgressionText.trim() : '';
          if (out !== songChordLine) {
            throw new Error(
              'Composer OS: chord progression did not reach the generate request (internal payload mismatch).'
            );
          }
        }
        if (presetId === 'song_mode') {
          const userOfferedHarmony = chordTrim.length > 0 || tonalTrim.length > 0;
          const gp = generatePayload as { chordProgressionText?: string };
          const out = typeof gp.chordProgressionText === 'string' ? gp.chordProgressionText.trim() : '';
          if (userOfferedHarmony && out.length === 0) {
            throw new Error(
              'Composer OS: you entered chord text but it was not sent to the engine. Use the Chord progression field for Song Mode, or rebuild the app if this persists.'
            );
          }
        }

        if (presetId === 'song_mode' && songChordLine.length > 0) {
          console.log('[Composer OS] outgoing harmony text:', songChordLine.slice(0, 50));
        }
        if (desktopTruthDumpEnabled.current && presetId === 'song_mode') {
          console.log('[composer-os truth] HomeGenerate UI harmony (trimmed)', songChordLine.slice(0, 2000));
          console.log(
            '[composer-os truth] HomeGenerate request payload',
            JSON.stringify(generatePayload, null, 2)
          );
        }
        const r = (await api.generate(generatePayload)) as GenResult;
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
      variationEnabled,
      songwriterStyle,
      arrangerStyle,
      era,
      ensembleConfigId,
      presetId,
      scoreTitle,
      chordProgressionText,
      ecmMode,
      riffStyle,
      riffDensity,
      riffGrid,
      riffLineMode,
      riffBass,
      songModeStyleProfile,
      intentGroove,
      intentSpace,
      intentExpression,
      intentSurprise,
      c4Strength,
      blendStrength,
      funkGroove,
      onResult,
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
            Outputs are saved under the preset folders (e.g. Guitar-Bass Duos) below this location.
          </span>
        </p>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Mode
        </label>
        <select value={presetId} onChange={(e) => setPresetId(e.target.value)} disabled={loading}>
          {modePresets.map((m) => (
            <option key={m.id} value={m.id} disabled={!m.supported}>
              {m.name}
              {!m.supported ? ' (coming soon)' : ''}
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
              <strong style={{ color: 'var(--text)' }}>Style pairing</strong> blends songwriter and arranger
              habits for colour — guidance for the plan, not a second engine.
            </p>
          )}
          {presetId === 'string_quartet' && (
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Quartet planning focuses on texture, form, and four-voice roles (no user style stack on this
              screen).
            </p>
          )}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Tonal centre / key
        </label>
        {presetId === 'song_mode' && (
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              margin: '0 0 0.5rem',
              lineHeight: 1.45,
            }}
          >
            Short key label only (e.g. <code>C</code>). Paste your <strong style={{ color: 'var(--text)' }}>full
            32-bar chord progression</strong> in <strong style={{ color: 'var(--text)' }}>Chord progression</strong>{' '}
            below — not here.
          </p>
        )}
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

      {(presetId === 'guitar_bass_duo' || presetId === 'riff_generator' || presetId === 'song_mode') && (
        <div style={{ marginBottom: '1rem', maxWidth: 640 }}>
          <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
            {presetId === 'song_mode' ? 'Chord progression (32 bars)' : 'Chord progression (optional)'}
          </label>
          {presetId === 'guitar_bass_duo' ? (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.5rem',
                lineHeight: 1.45,
              }}
            >
              Custom harmony: exactly <strong style={{ color: 'var(--text)' }}>8</strong> chords. Separate bars
              with <code>|</code>, <code>,</code>, <code>;</code>, or (without pipe in the line) spaced{' '}
              <code>/</code>. Slash chords like <code>D/F#</code> stay one symbol. Leave empty for the built-in
              study progression (e.g. Dm9 … A7alt).
            </p>
          ) : presetId === 'riff_generator' ? (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.5rem',
                lineHeight: 1.45,
              }}
            >
              One chord or a <strong style={{ color: 'var(--text)' }}>2–4</strong> chord loop — same separators
              as duo when you use more than one chord. Leave empty for a default vamp.
            </p>
          ) : (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.5rem',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: 'var(--text)' }}>Exactly 32</strong> chords for locked harmony. Separate
              bars with <code>|</code>, <code>,</code>, or <code>;</code>. Slash chords (e.g.{' '}
              <code>E7(#11)/G#</code>) are one symbol per bar.
            </p>
          )}
          <textarea
            value={chordProgressionText}
            onChange={(e) => setChordProgressionText(e.target.value)}
            disabled={loading}
            placeholder={
              presetId === 'guitar_bass_duo'
                ? 'Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt'
                : presetId === 'song_mode'
                  ? 'Cmaj9 | E7(#11)/G# | Am9 | D7(b9) | … (32 chords total)'
                  : 'Am7 | D7 | Gmaj7 |'
            }
            rows={presetId === 'song_mode' ? 6 : 3}
            style={{
              width: '100%',
              maxWidth: 600,
              padding: '0.5rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
            }}
          />
        </div>
      )}

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
            {presetId === 'riff_generator' ? 'Riff length (bars)' : 'Number of bars'}
          </label>
          <input
            type="number"
            min={presetId === 'riff_generator' ? 1 : 8}
            max={presetId === 'riff_generator' ? 4 : 512}
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

      {(presetId === 'guitar_bass_duo' || presetId === 'song_mode') && (
        <>
          <div style={{ marginBottom: '1rem', maxWidth: 280 }}>
            <label
              htmlFor="composer-os-hook-rhythm-strength"
              style={{
                display: 'block',
                marginBottom: '0.35rem',
                color: 'var(--text)',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Hook Rhythm Strength
            </label>
            <select
              id="composer-os-hook-rhythm-strength"
              value={c4Strength}
              onChange={(e) => setC4Strength(e.target.value as 'light' | 'medium' | 'strong')}
              disabled={loading}
              style={{
                width: '100%',
                maxWidth: 260,
                padding: '0.45rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
              }}
            >
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem', maxWidth: 280 }}>
            <label
              htmlFor="composer-os-blend-strength"
              style={{
                display: 'block',
                marginBottom: '0.35rem',
                color: 'var(--text)',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Blend Strength
            </label>
            <select
              id="composer-os-blend-strength"
              value={blendStrength}
              onChange={(e) => setBlendStrength(e.target.value as 'light' | 'medium' | 'strong')}
              disabled={loading}
              style={{
                width: '100%',
                maxWidth: 260,
                padding: '0.45rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
              }}
            >
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
            </select>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Funk Groove</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={funkGroove}
                onChange={(e) => setFunkGroove(e.target.checked)}
              />
              Enable James Brown funk overlay
            </label>
          </div>
        </>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <span
          style={{
            display: 'block',
            marginBottom: '0.35rem',
            color: 'var(--text)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          Feel
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.9rem' }}>
          <input
            type="radio"
            name="creativeLevel"
            checked={creativeControlLevel === 'surprise'}
            onChange={() => setCreativeControlLevel('surprise')}
          />
          Surprise
        </label>
        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Variation
          </label>
          <select
            value={variationEnabled ? 'on' : 'off'}
            onChange={(e) => setVariationEnabled(e.target.value === 'on')}
          >
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
          Title (optional)
        </label>
        <input
          type="text"
          value={scoreTitle}
          onChange={(e) => setScoreTitle(e.target.value)}
          placeholder="e.g. My sketch — or leave blank for a default title"
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

      {presetId === 'riff_generator' && (
        <div style={{ marginBottom: '1rem', maxWidth: 560 }}>
          <span style={{ display: 'block', marginBottom: 0.35, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Riff options
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', marginBottom: '0.65rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Style
              </label>
              <select
                value={riffStyle}
                onChange={(e) => setRiffStyle(e.target.value as typeof riffStyle)}
                disabled={loading}
              >
                <option value="metheny">Metheny</option>
                <option value="scofield">Scofield</option>
                <option value="funk">Funk</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Density
              </label>
              <select
                value={riffDensity}
                onChange={(e) => setRiffDensity(e.target.value as typeof riffDensity)}
                disabled={loading}
              >
                <option value="sparse">Sparse</option>
                <option value="medium">Medium</option>
                <option value="dense">Dense</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Grid
              </label>
              <select
                value={riffGrid}
                onChange={(e) => setRiffGrid(e.target.value as typeof riffGrid)}
                disabled={loading}
              >
                <option value="eighth">Eighth notes</option>
                <option value="sixteenth">Sixteenth notes</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Line mode
              </label>
              <select
                value={riffLineMode}
                onChange={(e) => setRiffLineMode(e.target.value as typeof riffLineMode)}
                disabled={loading}
              >
                <option value="single_line">Single line</option>
                <option value="guitar_bass">Guitar + bass</option>
                <option value="octave_double">Octave / double-stop</option>
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={riffBass}
              onChange={(e) => setRiffBass(e.target.checked)}
              disabled={loading || riffLineMode === 'octave_double'}
            />
            Bass (acoustic bass voice, GM 33) — ignored in octave mode
          </label>
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
            disabled={loading}
          >
            <option value="ECM_METHENY_QUARTET">Metheny (modal, single-line focus)</option>
            <option value="ECM_SCHNEIDER_CHAMBER">Schneider / Wheeler (clouds, swells)</option>
          </select>
        </div>
      )}

      {presetId === 'song_mode' && (
        <div style={{ marginBottom: '1rem', maxWidth: 520 }}>
          <div style={{ marginBottom: '0.65rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Style
            </label>
            <select
              value={songModeStyleProfile}
              onChange={(e) => {
                const next = songModeStyleProfileFromSelectValue(e.target.value);
                if (next) setSongModeStyleProfile(next);
              }}
              disabled={loading}
            >
              {SONG_MODE_STYLE_OPTIONS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '0.65rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Groove</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intentGroove}
              onChange={(e) => setIntentGroove(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', maxWidth: 360 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(intentGroove * 100)}%</span>
          </div>
          <div style={{ marginBottom: '0.65rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Space</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intentSpace}
              onChange={(e) => setIntentSpace(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', maxWidth: 360 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(intentSpace * 100)}%</span>
          </div>
          <div style={{ marginBottom: '0.65rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Expression</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intentExpression}
              onChange={(e) => setIntentExpression(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', maxWidth: 360 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(intentExpression * 100)}%</span>
          </div>
          <div style={{ marginBottom: '0.65rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Surprise</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={intentSurprise}
              onChange={(e) => setIntentSurprise(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', maxWidth: 360 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{Math.round(intentSurprise * 100)}%</span>
          </div>
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

      {presetId === 'big_band' && (
        <div style={{ marginBottom: '1rem', maxWidth: 520 }}>
          <span style={{ display: 'block', marginBottom: 0.35, color: 'var(--text-muted)', fontSize: 0.9 }}>
            Big band pairing
          </span>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
            Arranger and era drive the plan; ensemble size sets the horn footprint.
          </p>
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
          <div style={{ marginBottom: '0.65rem' }}>
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
          <div>
            <label style={{ display: 'block', marginBottom: 0.3, color: 'var(--text-muted)', fontSize: 0.9 }}>
              Ensemble size
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
        </div>
      )}

      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 520 }}>
        <strong style={{ color: 'var(--text)' }}>New Variation</strong> picks a fresh id;{' '}
        <strong style={{ color: 'var(--text)' }}>Next Variation</strong> steps the id (then Generate).
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => void generate()} disabled={loading}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
        <button
          className="secondary"
          type="button"
          disabled={loading}
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
          disabled={loading}
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
                <span style={{ color: 'var(--text-muted)' }}>Mode:</span>{' '}
                <strong>{modeLabelForPreset(summaryPresetId)}</strong>
              </p>
              <p style={{ margin: '0.35rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Output type:</span>{' '}
                <strong>{outputKindDesc.headline}</strong>
                <span style={{ color: 'var(--text-muted)' }}> — {outputKindDesc.subtitle}</span>
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
                  <span style={{ color: 'var(--text-muted)' }}>Tonal centre:</span> {echo.tonalCenter}
                </p>
              ) : null}
              {echo?.bpm != null && echo.bpm > 0 ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tempo:</span> {echo.bpm} BPM
                </p>
              ) : null}
              {echo?.totalBars != null && echo.totalBars > 0 ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bars:</span> {echo.totalBars}
                </p>
              ) : null}
              {echo?.styleProfile ? (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Style profile:</span> {echo.styleProfile}
                </p>
              ) : null}
              {(echo?.stylePairing || result.stylePairingReceipt) && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pairing:</span>{' '}
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
                  <span style={{ color: 'var(--text-muted)' }}>Ensemble:</span>{' '}
                  {ensembleLabel(echo.ensembleConfigId)}
                </p>
              ) : null}
              {(echo?.creativeControlLevel ?? rm?.creativeControlLevel) != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Creative control:</span>{' '}
                  {labelCreativeLevel(
                    (echo?.creativeControlLevel ?? rm?.creativeControlLevel) as
                      | 'stable'
                      | 'balanced'
                      | 'surprise'
                  )}
                </p>
              )}
              {echo?.c4Strength != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hook rhythm strength:</span>{' '}
                  {echo.c4Strength === 'light'
                    ? 'Light'
                    : echo.c4Strength === 'strong'
                      ? 'Strong'
                      : 'Medium'}
                </p>
              )}
              {echo?.blendStrength != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Blend strength:</span>{' '}
                  {echo.blendStrength === 'light'
                    ? 'Light'
                    : echo.blendStrength === 'strong'
                      ? 'Strong'
                      : 'Medium'}
                </p>
              )}
              {result.stylePairingReceipt?.confidenceScore != null && (
                <p style={{ margin: '0.25rem 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Confidence:</span>{' '}
                  {result.stylePairingReceipt.confidenceScore.toFixed(2)} (pairing)
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
                  <span style={{ color: 'var(--text-muted)' }}>Output path:</span> {result.filepath}
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
                <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>File:</span> {result.filename}
                </p>
              )}
              {(result.scoreTitle ?? rm?.scoreTitle) && (
                <p style={{ fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Title:</span>{' '}
                  {result.scoreTitle ?? rm?.scoreTitle}
                </p>
              )}
              {rm?.activeModules?.length ? (
                <p style={{ fontSize: '0.85rem', margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Engine modules:</span>{' '}
                  {rm.activeModules.join(' · ')}
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
              {v?.warnings && v.warnings.length > 0 && (
                <div
                  style={{
                    fontSize: '0.9rem',
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: 8,
                    background: 'rgba(234,179,8,0.12)',
                    border: '1px solid rgba(234,179,8,0.45)',
                    color: 'var(--text)',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Phrase quality (warnings)</strong>
                  <span style={{ lineHeight: 1.45 }}>{v.warnings.slice(0, 3).join('; ')}{v.warnings.length > 3 ? ` … (+${v.warnings.length - 3} more)` : ''}</span>
                </div>
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
