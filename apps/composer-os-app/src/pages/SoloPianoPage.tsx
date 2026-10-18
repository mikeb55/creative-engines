import { useMemo, useRef, useState } from 'react';
import { api, isDesktopIpc } from '../services/api';
import { SoloPianoV11Panel } from './SoloPianoV11Panel';
import {
  applyFullV11Demonstration,
  buildSoloPianoComposeBody,
  cycleMeterRows,
  defaultV11Fields,
  formRequestIdentity,
  parseSoloPianoConfig,
  serializeSoloPianoConfig,
  uniformMeterRows,
  type BarCount,
  type PieceId,
  type SoloPianoFormState,
  type TonalCentre,
} from './soloPianoV11Editor';

type ComposeResult = {
  ok: boolean;
  code?: string;
  error?: string;
  fieldErrors?: { field: string; message: string }[];
  filepath?: string;
  midiFilepath?: string;
  outputDirectory?: string;
  elapsedSeconds?: number;
  soundingAttacks?: number;
  seedEffect?: string;
  bars?: number;
  tempo?: number;
  title?: string;
  innerVoice?: boolean;
  pedalEventCount?: number;
  validation?: { oracleOk?: boolean; errors?: string[] };
  requestFingerprint?: string;
};

const FIXTURE_SEED_BEHAVIOUR = 'Seed parity changes some note events.';
const COFFEE_SEED_BEHAVIOUR = 'Seed changes do not change its notes. It is a fixed composition.';
const GENERAL_SEED_BEHAVIOUR =
  'Seed changes the opening rhythm, contour and left-hand figuration. The same seed and inputs repeat.';

const CYCLE_C = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'Cmaj7'] as const;
const CYCLE_A = ['Am7', 'Dm7', 'E7', 'Am7', 'Fmaj7', 'Cmaj7', 'Dm7', 'E7'] as const;

function defaultHarmony(bars: BarCount, centre: TonalCentre): string[] {
  const source = centre === 'Am' ? CYCLE_A : CYCLE_C;
  const out: string[] = [];
  for (let index = 0; index < bars; index += 1) out.push(source[index % source.length]!);
  const tonic = centre === 'Am' ? 'Am7' : 'Cmaj7';
  out[0] = tonic;
  const returnIndex = bars === 8 ? 6 : bars === 16 ? 12 : 20;
  out[returnIndex] = tonic;
  out[bars - 2] = tonic;
  out[bars - 1] = tonic;
  return out;
}

function resizeHarmony(current: string[], bars: BarCount, centre: TonalCentre): string[] {
  const fallback = defaultHarmony(bars, centre);
  const next = current.slice(0, bars);
  while (next.length < bars) next.push(fallback[next.length] ?? 'Cmaj7');
  return next;
}

function fileNameOf(filepath: string): string {
  const trimmed = filepath.replace(/[/\\]+$/, '');
  const split = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  return split >= 0 ? trimmed.slice(split + 1) : trimmed;
}

function triggerBrowserFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function downloadWrittenFile(filepath: string): Promise<void> {
  const name = fileNameOf(filepath);
  if (isDesktopIpc() && window.composerOsDesktop?.invokeApi) {
    const res = (await window.composerOsDesktop.invokeApi('composer-os-api:read-file-binary', {
      path: filepath,
    })) as { base64: string; fileName?: string };
    const binary = atob(res.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    triggerBrowserFileDownload(new Blob([bytes]), res.fileName?.trim() || name);
    return;
  }
  const response = await fetch(`/api/download-file?path=${encodeURIComponent(filepath)}`);
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      /* use raw */
    }
    throw new Error(message || `Download failed (${response.status})`);
  }
  triggerBrowserFileDownload(await response.blob(), name);
}

export function SoloPianoPage() {
  const [piece, setPiece] = useState<PieceId>('fixture');
  const [seed, setSeed] = useState(76018);
  const [innerVoice, setInnerVoice] = useState(true);
  const [bars, setBars] = useState<BarCount>(8);
  const [tempo, setTempo] = useState(64);
  const [tonalCentre, setTonalCentre] = useState<TonalCentre>('C');
  const [harmony, setHarmony] = useState<string[]>(() => defaultHarmony(8, 'C'));
  const [advanced, setAdvanced] = useState(false);
  const [v11, setV11] = useState(() => defaultV11Fields(8));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [staleNote, setStaleNote] = useState('');
  const [configText, setConfigText] = useState('');
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [folderMessage, setFolderMessage] = useState('');
  const resultRef = useRef<ComposeResult | null>(null);
  resultRef.current = result;

  const form: SoloPianoFormState = {
    piece,
    seed,
    innerVoice,
    bars,
    tempo,
    tonalCentre,
    harmony,
    advanced,
    ...v11,
  };
  const built = useMemo(() => buildSoloPianoComposeBody(form), [
    piece, seed, innerVoice, bars, tempo, tonalCentre, harmony, advanced, v11,
  ]);
  const identity = formRequestIdentity(form);

  function discardResult() {
    if (resultRef.current) setStaleNote('Stale Generate result discarded. The request changed.');
    setResult(null);
  }

  function applyForm(next: SoloPianoFormState) {
    setPiece(next.piece);
    setSeed(next.seed);
    setInnerVoice(next.innerVoice);
    setBars(next.bars);
    setTempo(next.tempo);
    setTonalCentre(next.tonalCentre);
    setHarmony(next.harmony);
    setAdvanced(next.advanced);
    setV11({
      phraseDevelopment: next.phraseDevelopment,
      musicalRefinement: next.musicalRefinement,
      polychordMode: next.polychordMode,
      upperRoot: next.upperRoot,
      upperQuality: next.upperQuality,
      lowerRoot: next.lowerRoot,
      lowerQuality: next.lowerQuality,
      meterMode: next.meterMode,
      uniformMeter: next.uniformMeter,
      polyrhythm: next.polyrhythm,
      useExplicitWindows: next.useExplicitWindows,
      meterRows: next.meterRows,
      windows: next.windows,
      polychordRegions: next.polychordRegions,
    });
    discardResult();
  }

  async function compose() {
    setBusy(true);
    setError('');
    setFolderMessage('');
    const request = buildSoloPianoComposeBody(form);
    if (!request.ok) {
      setResult(null);
      setError(request.error);
      setBusy(false);
      return;
    }
    try {
      const next = await api.composePiano(request.body);
      setStaleNote('');
      setResult({ ...next, requestFingerprint: formRequestIdentity(form) });
      if (!next.ok) setError(next.error || 'Piano composition failed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResult(null);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function openFolder() {
    setFolderMessage('');
    try {
      const opened = await api.openOutputFolder(
        result?.outputDirectory ? { path: result.outputDirectory } : undefined
      );
      if (!opened.success) setFolderMessage(opened.message || 'Could not open the output folder.');
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function download(filepath: string | undefined) {
    if (!filepath) return;
    setFolderMessage('');
    try {
      await downloadWrittenFile(filepath);
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : String(err));
    }
  }

  const advancedError = piece === 'general' && advanced && !built.ok ? built.error : '';
  const seedBehaviour = piece === 'coffee-run'
    ? COFFEE_SEED_BEHAVIOUR
    : piece === 'general'
      ? GENERAL_SEED_BEHAVIOUR
      : FIXTURE_SEED_BEHAVIOUR;
  const validationErrors = [
    ...(result?.error ? [result.error] : []),
    ...(result?.fieldErrors?.map((item) => `${item.field}: ${item.message}`) ?? []),
    ...(result?.validation?.errors ?? []),
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: advanced ? '72rem' : '46rem' }}>
      <h2 style={{ marginTop: 0 }}>Solo Piano</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Piano V1 fixture, Coffee Run — Variation, and General Piano Composition V1. MusicXML and MIDI are written to the Composer OS output folder.
      </p>

      <label htmlFor="solo-piano-piece" style={{ display: 'block', marginTop: '1rem' }}>
        Piece
      </label>
      <select
        id="solo-piano-piece"
        data-testid="solo-piano-piece"
        value={piece}
        onChange={(event) => {
          setPiece(event.target.value as PieceId);
          discardResult();
        }}
        style={{ marginTop: '0.35rem', minWidth: '22rem' }}
      >
        <option value="fixture">Piano V1 fixture — 8 bars</option>
        <option value="coffee-run">Coffee Run — Variation — 24 bars</option>
        <option value="general">General Piano Composition V1</option>
      </select>

      <p data-testid="solo-piano-seed-behaviour" style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
        {seedBehaviour}
      </p>

      {piece === 'general' && (
        <div data-testid="solo-piano-general-controls">
          <label htmlFor="solo-piano-bars" style={{ display: 'block', marginTop: '1rem' }}>
            Bars
          </label>
          <select
            id="solo-piano-bars"
            data-testid="solo-piano-bars"
            value={bars}
            onChange={(event) => {
              const next = Number(event.target.value) as BarCount;
              setBars(next);
              setHarmony((current) => resizeHarmony(current, next, tonalCentre));
              setV11((current) => ({
                ...current,
                ...(current.meterMode === 'cycle' ? { meterRows: cycleMeterRows(next) } : {}),
                ...(current.meterMode === 'uniform' ? { meterRows: uniformMeterRows(next, current.uniformMeter) } : {}),
              }));
              discardResult();
            }}
            style={{ marginTop: '0.35rem', minWidth: '8rem' }}
          >
            <option value={8}>8</option>
            <option value={16}>16</option>
            <option value={24}>24</option>
          </select>

          <label htmlFor="solo-piano-tempo" style={{ display: 'block', marginTop: '1rem' }}>
            Tempo (48–120)
          </label>
          <input
            id="solo-piano-tempo"
            data-testid="solo-piano-tempo"
            type="number"
            min={48}
            max={120}
            step={1}
            value={Number.isFinite(tempo) ? tempo : ''}
            onChange={(event) => {
              setTempo(event.target.valueAsNumber);
              discardResult();
            }}
            style={{ marginTop: '0.35rem', width: '8rem' }}
          />

          <p data-testid="solo-piano-metre" style={{ marginTop: '1rem', marginBottom: 0 }}>
            {advanced && v11.meterMode !== 'legacy'
              ? 'Metre: Piano V1.1 plan below. General Piano V1 stays 4/4 until advanced mode is on.'
              : 'Metre: 4/4. Fixed for General Piano Composition V1.'}
          </p>

          <label htmlFor="solo-piano-centre" style={{ display: 'block', marginTop: '1rem' }}>
            Tonal centre
          </label>
          <select
            id="solo-piano-centre"
            data-testid="solo-piano-centre"
            value={tonalCentre}
            onChange={(event) => {
              setTonalCentre(event.target.value as TonalCentre);
              discardResult();
            }}
            style={{ marginTop: '0.35rem', minWidth: '12rem' }}
          >
            <option value="C">C major</option>
            <option value="Am">A minor</option>
          </select>

          <fieldset style={{ marginTop: '1rem', border: '1px solid var(--border, #444)', padding: '0.75rem' }}>
            <legend>Chord progression — one chord per bar</legend>
            <div data-testid="solo-piano-harmony" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.5rem' }}>
              {harmony.map((symbol, index) => (
                <label key={index} style={{ display: 'block' }}>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bar {index + 1}</span>
                  <input
                    aria-label={`Bar ${index + 1} chord`}
                    data-testid={`solo-piano-chord-${index + 1}`}
                    value={symbol}
                    onChange={(event) => {
                      const value = event.target.value;
                      setHarmony((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
                      discardResult();
                    }}
                    style={{ width: '100%', marginTop: '0.2rem' }}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
            <input
              data-testid="solo-piano-v11-advanced"
              type="checkbox"
              checked={advanced}
              onChange={(event) => {
                setAdvanced(event.target.checked);
                discardResult();
              }}
            />
            Piano V1.1 advanced
          </label>
          {advanced && (
            <SoloPianoV11Panel
              form={form}
              identity={identity}
              fieldErrors={built.ok ? [] : built.fieldErrors}
              configText={configText}
              onForm={(next) => applyForm({ ...form, ...next, piece, seed, innerVoice, bars, tempo, tonalCentre, harmony, advanced })}
              onLoadDemonstration={() => {
                const next = applyFullV11Demonstration(form);
                applyForm(next);
                setConfigText(serializeSoloPianoConfig(next));
                setError('');
                setStaleNote('');
              }}
              onConfigText={setConfigText}
              onSave={() => setConfigText(serializeSoloPianoConfig(form))}
              onReload={() => {
                const parsed = parseSoloPianoConfig(configText);
                if (!parsed.ok) {
                  setError(parsed.error);
                  return;
                }
                applyForm(parsed.form);
                setError('');
              }}
            />
          )}
        </div>
      )}

      <label htmlFor="solo-piano-seed" style={{ display: 'block', marginTop: '1rem' }}>
        Seed
      </label>
      <input
        id="solo-piano-seed"
        data-testid="solo-piano-seed"
        type="number"
        step={1}
        value={Number.isFinite(seed) ? seed : ''}
        onChange={(event) => {
          setSeed(event.target.valueAsNumber);
          discardResult();
        }}
        style={{ marginTop: '0.35rem', width: '10rem' }}
      />

      {piece !== 'general' && (
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
          <input
            data-testid="solo-piano-inner-voice"
            type="checkbox"
            checked={innerVoice}
            onChange={(event) => {
              setInnerVoice(event.target.checked);
              discardResult();
            }}
          />
          RH inner voice
        </label>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" data-testid="solo-piano-generate" onClick={() => void compose()} disabled={busy || advancedError !== ''}>
          {busy ? 'Generating…' : 'Generate'}
        </button>
        <button
          type="button"
          className="secondary"
          data-testid="solo-piano-regenerate"
          onClick={() => void compose()}
          disabled={busy}
        >
          Regenerate
        </button>
        <button
          type="button"
          className="secondary"
          data-testid="solo-piano-download-xml"
          onClick={() => void download(result?.filepath)}
          disabled={busy || !result?.ok || !result.filepath}
        >
          Download MusicXML
        </button>
        <button
          type="button"
          className="secondary"
          data-testid="solo-piano-download-midi"
          onClick={() => void download(result?.midiFilepath)}
          disabled={busy || !result?.ok || !result.midiFilepath}
        >
          Download MIDI
        </button>
        <button
          type="button"
          className="secondary"
          data-testid="solo-piano-open-folder"
          onClick={() => void openFolder()}
          disabled={busy || !result?.outputDirectory}
        >
          Open output folder
        </button>
      </div>

      {staleNote && (
        <p data-testid="solo-piano-stale" style={{ color: 'var(--text-muted)' }}>{staleNote}</p>
      )}
      {error && (
        <p data-testid="solo-piano-error" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}
      {folderMessage && <p data-testid="solo-piano-folder-message" style={{ color: 'var(--error)' }}>{folderMessage}</p>}

      {result && (
        <section data-testid="solo-piano-result" style={{ marginTop: '1.25rem' }}>
          <h3 style={{ marginBottom: '0.35rem' }}>Validation</h3>
          <p data-testid="solo-piano-validation-status" style={{ margin: 0 }}>
            {result.ok ? 'ok' : 'failed'}
            {result.code ? ` · ${result.code}` : ''}
            {typeof result.bars === 'number' ? ` · ${result.bars} bars` : ''}
            {typeof result.tempo === 'number' ? ` · quarter = ${result.tempo}` : ''}
            {typeof result.elapsedSeconds === 'number' ? ` · ${result.elapsedSeconds}s` : ''}
            {typeof result.soundingAttacks === 'number' ? ` · ${result.soundingAttacks} sounding attacks` : ''}
            {result.requestFingerprint ? ` · fingerprint ${result.requestFingerprint}` : ''}
            {typeof result.pedalEventCount === 'number' ? ` · ${result.pedalEventCount} pedal events` : ''}
          </p>
          {result.validation?.oracleOk && <p style={{ margin: '0.35rem 0 0' }}>MusicXML oracle passed.</p>}
          {validationErrors.length > 0 ? (
            <ul data-testid="solo-piano-validation-errors" style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
              {validationErrors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p data-testid="solo-piano-validation-errors" style={{ margin: '0.35rem 0 0' }}>No validation errors.</p>
          )}
          {result.seedEffect && <p style={{ margin: '0.35rem 0 0' }}>{result.seedEffect}</p>}
          {result.title && <p style={{ margin: '0.35rem 0 0' }}>{result.title}</p>}
          {result.filepath && (
            <p style={{ margin: '0.75rem 0 0', wordBreak: 'break-all' }}>
              <span style={{ color: 'var(--text-muted)' }}>MusicXML </span>
              <span data-testid="solo-piano-xml-path">{result.filepath}</span>
            </p>
          )}
          {result.midiFilepath && (
            <p style={{ margin: '0.35rem 0 0', wordBreak: 'break-all' }}>
              <span style={{ color: 'var(--text-muted)' }}>MIDI </span>
              <span data-testid="solo-piano-midi-path">{result.midiFilepath}</span>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
