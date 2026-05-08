import { useEffect, useMemo, useState } from 'react';
import { parseChordProgressionInputWithBarCount } from '../utils/chordProgressionClient';
import { buildReharmPreviewContextFromBars } from '../utils/buildReharmPreviewContext';
import { executeReharm } from '@composer-os/core/harmony/reharmController';
import { buildReharmLensConfig } from '@composer-os/core/harmony/reharmLensConfig';
import type { ReharmResult } from '@composer-os/core/harmony/reharmSequenceTypes';

const ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** Minimum lens ids for preview — labels from {@link buildReharmLensConfig}. */
const REHARM_PANEL_LENS_IDS: readonly string[] = [
  'antonio_carlos_jobim',
  'bill_evans',
  'wayne_shorter',
  'thelonious_monk',
  'donald_fagen',
  'radiohead',
  'philip_glass',
  'bernard_herrmann',
  'duke_ellington',
  'maria_schneider',
  'gil_evans',
];

function formatSubstitute(rootPc: number, chordTypeId: string): string {
  const r = ROOT_NAMES[((rootPc % 12) + 12) % 12]!;
  return `${r}${chordTypeId}`;
}

export type ReharmPanelProps = {
  chordProgressionText: string;
  songFormBars: number;
  baseSeed: number;
  songwriterStyleId: string;
};

export function ReharmPanel({ chordProgressionText, songFormBars, baseSeed, songwriterStyleId }: ReharmPanelProps) {
  const [startBar, setStartBar] = useState(1);
  const [endBar, setEndBar] = useState(() => Math.min(8, Math.max(1, songFormBars)));
  const [selectedLens, setSelectedLens] = useState<Set<string>>(new Set());
  const [seedInput, setSeedInput] = useState('');
  const [result, setResult] = useState<ReharmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(
    () => parseChordProgressionInputWithBarCount(chordProgressionText.trim(), songFormBars),
    [chordProgressionText, songFormBars]
  );

  const previewContext = useMemo(() => {
    if (!parsed.ok) return null;
    try {
      return buildReharmPreviewContextFromBars(baseSeed, parsed.bars, {
        songwriterStyleId: songwriterStyleId.trim() || undefined,
        chordProgressionInputRaw: chordProgressionText.trim(),
      });
    } catch {
      return null;
    }
  }, [parsed, baseSeed, songwriterStyleId, chordProgressionText]);

  useEffect(() => {
    setStartBar((sb) => Math.min(Math.max(sb, 1), songFormBars));
    setEndBar((eb) => Math.min(Math.max(eb, 1), songFormBars));
  }, [songFormBars]);

  function toggleLens(id: string) {
    setSelectedLens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  function runReharm() {
    setError(null);
    setResult(null);
    if (!previewContext) {
      setError(parsed.ok ? 'Could not build harmony preview context.' : parsed.error);
      return;
    }
    const lensIds = [...selectedLens];
    if (lensIds.length === 0) {
      setError('Select 1–3 lenses.');
      return;
    }
    const sb = Math.min(startBar, endBar);
    const eb = Math.max(startBar, endBar);
    const seedTrim = seedInput.trim();
    const seedParsed =
      seedTrim === '' ? undefined : Number(seedTrim);
    if (seedTrim !== '' && (!Number.isFinite(seedParsed!) || seedParsed === undefined)) {
      setError('Seed must be a number.');
      return;
    }

    try {
      const out = executeReharm({
        context: previewContext,
        startBar: sb,
        endBar: eb,
        lensIds,
        seed: seedParsed,
      });
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const parseIssue = !parsed.ok ? parsed.error : null;

  return (
    <div style={{ marginTop: '0.85rem' }}>
      {parseIssue && (
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', color: '#ca8a04' }}>{parseIssue}</p>
      )}
      {!parseIssue && !previewContext && (
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Enter a progression matching the song form bar count to preview reharm.
        </p>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'flex-end',
          marginBottom: '0.65rem',
        }}
      >
        <div>
          <label htmlFor="co-reharm-start" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Start bar
          </label>
          <input
            id="co-reharm-start"
            type="number"
            min={1}
            max={songFormBars}
            value={startBar}
            onChange={(e) => setStartBar(Math.max(1, Math.min(songFormBars, Number(e.target.value) || 1)))}
            style={{
              width: 72,
              boxSizing: 'border-box',
              padding: '0.4rem 0.45rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
        </div>
        <div>
          <label htmlFor="co-reharm-end" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            End bar
          </label>
          <input
            id="co-reharm-end"
            type="number"
            min={1}
            max={songFormBars}
            value={endBar}
            onChange={(e) => setEndBar(Math.max(1, Math.min(songFormBars, Number(e.target.value) || 1)))}
            style={{
              width: 72,
              boxSizing: 'border-box',
              padding: '0.4rem 0.45rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
        </div>
        <div>
          <label htmlFor="co-reharm-seed" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Seed (optional)
          </label>
          <input
            id="co-reharm-seed"
            type="text"
            inputMode="numeric"
            placeholder={`default ${baseSeed}`}
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            autoComplete="off"
            style={{
              width: 120,
              boxSizing: 'border-box',
              padding: '0.4rem 0.45rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
        </div>
        <button type="button" onClick={runReharm} disabled={!previewContext}>
          Reharm
        </button>
      </div>

      <fieldset
        style={{
          margin: '0 0 0.75rem',
          padding: '0.5rem 0.65rem',
          borderRadius: 6,
          border: '1px solid var(--border)',
        }}
      >
        <legend style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Lenses (max 3)</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem 1rem' }}>
          {REHARM_PANEL_LENS_IDS.map((id) => {
            const cfg = buildReharmLensConfig(id);
            const checked = selectedLens.has(id);
            const disabled = !checked && selectedLens.size >= 3;
            return (
              <label
                key={id}
                style={{
                  fontSize: '0.82rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleLens(id)}
                  style={{ marginRight: 6 }}
                />
                {cfg.displayName}
              </label>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', color: '#dc2626' }}>{error}</p>
      )}

      {result && (
        <div style={{ overflowX: 'auto' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Seed used: <strong style={{ color: 'var(--text)' }}>{result.seed}</strong>
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {result.alternatives.map((alt) => (
              <div
                key={alt.lensId}
                style={{
                  flex: '1 1 220px',
                  minWidth: 200,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.6rem',
                  background: 'var(--bg)',
                }}
              >
                <div style={{ marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.88rem' }}>
                  {buildReharmLensConfig(alt.lensId).displayName}
                </div>
                <div style={{ marginBottom: '0.45rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  GCE (preview){' '}
                  <strong style={{ color: 'var(--text)' }}>
                    {alt.gceScore !== undefined ? alt.gceScore.toFixed(1) : '—'}
                  </strong>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.2rem 0.35rem 0.2rem 0' }}>Bar</th>
                      <th style={{ padding: '0.2rem 0.35rem' }}>Original</th>
                      <th style={{ padding: '0.2rem 0.35rem' }}>Substitute</th>
                      <th style={{ padding: '0.2rem 0' }}>Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alt.bars.map((row) => {
                      const dim =
                        row.mappingNull || row.strategy === 'passthrough' || row.strategy === 'identity';
                      const sub =
                        row.mappingNull || row.strategy === 'passthrough'
                          ? '—'
                          : formatSubstitute(row.substituteRootPc, row.substituteChordTypeId);
                      return (
                        <tr
                          key={`${alt.lensId}-${row.barIndex}`}
                          style={{
                            opacity: dim ? 0.5 : 1,
                            borderBottom: '1px solid rgba(128,128,128,0.15)',
                          }}
                        >
                          <td style={{ padding: '0.15rem 0.35rem 0.15rem 0' }}>{row.barIndex}</td>
                          <td style={{ padding: '0.15rem 0.35rem' }}>{row.originalSymbol}</td>
                          <td style={{ padding: '0.15rem 0.35rem' }}>{sub}</td>
                          <td style={{ padding: '0.15rem 0' }}>{row.strategy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
