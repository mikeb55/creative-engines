import React, { useState } from 'react';
import { api } from '../services/api';

type PieceId = 'fixture' | 'coffee-run';

type ComposeResult = {
  ok: boolean;
  code?: string;
  error?: string;
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
};

const FIXTURE_SEED_BEHAVIOUR = 'Seed parity changes some note events.';
const COFFEE_SEED_BEHAVIOUR = 'Seed changes do not change its notes. It is a fixed composition.';

export function SoloPianoPage() {
  const [piece, setPiece] = useState<PieceId>('fixture');
  const [seed, setSeed] = useState(76018);
  const [innerVoice, setInnerVoice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [folderMessage, setFolderMessage] = useState('');

  async function compose() {
    setBusy(true);
    setError('');
    setFolderMessage('');
    const body: Record<string, unknown> = {
      pianoCompositionV1: true,
      seed,
      innerVoice,
    };
    if (piece === 'coffee-run') body.filmCue = 'coffee-run-variation';
    try {
      const next = await api.composePiano(body);
      setResult(next);
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

  const seedBehaviour = piece === 'coffee-run' ? COFFEE_SEED_BEHAVIOUR : FIXTURE_SEED_BEHAVIOUR;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '46rem' }}>
      <h2 style={{ marginTop: 0 }}>Solo Piano</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Two fixed pieces from the existing piano writer. MusicXML and MIDI are written to the Composer OS output folder.
      </p>

      <label htmlFor="solo-piano-piece" style={{ display: 'block', marginTop: '1rem' }}>
        Piece
      </label>
      <select
        id="solo-piano-piece"
        data-testid="solo-piano-piece"
        value={piece}
        onChange={(event) => setPiece(event.target.value as PieceId)}
        style={{ marginTop: '0.35rem', minWidth: '22rem' }}
      >
        <option value="fixture">Piano V1 fixture — 8 bars</option>
        <option value="coffee-run">Coffee Run — Variation — 24 bars</option>
      </select>

      <p data-testid="solo-piano-seed-behaviour" style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
        {seedBehaviour}
      </p>

      <label htmlFor="solo-piano-seed" style={{ display: 'block', marginTop: '1rem' }}>
        Seed
      </label>
      <input
        id="solo-piano-seed"
        data-testid="solo-piano-seed"
        type="number"
        step={1}
        value={seed}
        onChange={(event) => setSeed(event.target.valueAsNumber)}
        style={{ marginTop: '0.35rem', width: '10rem' }}
      />

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
        <input
          data-testid="solo-piano-inner-voice"
          type="checkbox"
          checked={innerVoice}
          onChange={(event) => setInnerVoice(event.target.checked)}
        />
        RH inner voice
      </label>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" data-testid="solo-piano-generate" onClick={() => void compose()} disabled={busy}>
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
          data-testid="solo-piano-open-folder"
          onClick={() => void openFolder()}
          disabled={busy || !result?.outputDirectory}
        >
          Open output folder
        </button>
      </div>

      {error && (
        <p data-testid="solo-piano-error" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}
      {folderMessage && <p style={{ color: 'var(--error)' }}>{folderMessage}</p>}

      {result && (
        <section data-testid="solo-piano-result" style={{ marginTop: '1.25rem' }}>
          <h3 style={{ marginBottom: '0.35rem' }}>Validation</h3>
          <p style={{ margin: 0 }}>
            {result.ok ? 'ok' : 'failed'}
            {result.code ? ` · ${result.code}` : ''}
            {typeof result.bars === 'number' ? ` · ${result.bars} bars` : ''}
            {typeof result.tempo === 'number' ? ` · quarter = ${result.tempo}` : ''}
            {typeof result.elapsedSeconds === 'number' ? ` · ${result.elapsedSeconds}s` : ''}
            {typeof result.soundingAttacks === 'number' ? ` · ${result.soundingAttacks} sounding attacks` : ''}
            {typeof result.pedalEventCount === 'number' ? ` · ${result.pedalEventCount} pedal events` : ''}
          </p>
          {result.validation?.oracleOk && <p style={{ margin: '0.35rem 0 0' }}>MusicXML oracle passed.</p>}
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
