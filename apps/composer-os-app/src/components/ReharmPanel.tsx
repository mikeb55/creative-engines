import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CompositionContext } from '@composer-os/core/compositionContext';
import { parseChordProgressionInputWithBarCount } from '../utils/chordProgressionClient';
import { buildReharmPreviewContextFromBars } from '../utils/buildReharmPreviewContext';
import { buildReharmPostGenPreviewContext } from '@composer-os/core/harmony/buildReharmPostGenPreviewContext';
import { applyReharmAlternative, executeReharm } from '@composer-os/core/harmony/reharmController';
import { buildReharmLensConfig } from '@composer-os/core/harmony/reharmLensConfig';
import type { AlternativeProgression, ReharmResult } from '@composer-os/core/harmony/reharmSequenceTypes';
import { emotionalDriftOptionLabel, sliderToTargetReharmDrift } from '../utils/reharmDriftUi';
import { barIndexFromPlaybackBeat, clampBarToForm } from '../utils/reharmBarRange';

function useApplyReharm(
  context: CompositionContext | null,
  range: { startBar: number; endBar: number } | null,
  onApplyBars?: (bars: string[]) => void
) {
  return useCallback(
    (alt: AlternativeProgression) => {
      if (!context || !range || !onApplyBars) return;
      const bars = applyReharmAlternative(
        alt,
        Math.min(range.startBar, range.endBar),
        Math.max(range.startBar, range.endBar),
        context
      );
      onApplyBars(bars);
    },
    [context, range, onApplyBars]
  );
}

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
  /** Absolute playback beat from last generate audition (0 = none). */
  playbackBeat?: number;
  /** Beats per bar from last playback sequence; required with playbackBeat for prefill. */
  playbackBeatsPerBar?: number;
  /** Last generate locked progression — enables post-gen export-truth context when length matches form. */
  postGenHarmonyBars?: string[] | null;
  postGenSeed?: number;
  styleTransferWayneHarmonyAuthoritative?: boolean;
  /** Persists full progression after apply (preview-only context splice). */
  onApplyBars?: (bars: string[]) => void;
};

export function ReharmPanel({
  chordProgressionText,
  songFormBars,
  baseSeed,
  songwriterStyleId,
  playbackBeat = 0,
  playbackBeatsPerBar,
  postGenHarmonyBars = null,
  postGenSeed,
  styleTransferWayneHarmonyAuthoritative,
  onApplyBars,
}: ReharmPanelProps) {
  const [startBar, setStartBar] = useState(1);
  const [endBar, setEndBar] = useState(() => Math.min(8, Math.max(1, songFormBars)));
  const [rangeUserEdited, setRangeUserEdited] = useState(false);
  const [selectedLens, setSelectedLens] = useState<Set<string>>(new Set());
  const [seedInput, setSeedInput] = useState('');
  const [driftSlider, setDriftSlider] = useState(0.5);
  const [result, setResult] = useState<ReharmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usePostGenHarmony = useMemo(
    () =>
      Array.isArray(postGenHarmonyBars) &&
      postGenHarmonyBars.length > 0 &&
      postGenHarmonyBars.length === songFormBars,
    [postGenHarmonyBars, songFormBars]
  );

  const parsed = useMemo(() => {
    if (usePostGenHarmony && postGenHarmonyBars) {
      return { ok: true as const, bars: [...postGenHarmonyBars] };
    }
    return parseChordProgressionInputWithBarCount(chordProgressionText.trim(), songFormBars);
  }, [usePostGenHarmony, postGenHarmonyBars, chordProgressionText, songFormBars]);

  const previewContext = useMemo(() => {
    if (!parsed.ok) return null;
    const sid = songwriterStyleId.trim() || undefined;
    try {
      if (usePostGenHarmony) {
        return buildReharmPostGenPreviewContext(postGenSeed ?? baseSeed, parsed.bars, {
          songwriterStyleId: sid,
          styleTransferWayneHarmonyAuthoritative,
        });
      }
      return buildReharmPreviewContextFromBars(baseSeed, parsed.bars, {
        songwriterStyleId: sid,
        chordProgressionInputRaw: chordProgressionText.trim(),
      });
    } catch {
      return null;
    }
  }, [
    parsed,
    usePostGenHarmony,
    postGenSeed,
    baseSeed,
    songwriterStyleId,
    styleTransferWayneHarmonyAuthoritative,
    chordProgressionText,
  ]);

  useEffect(() => {
    setStartBar((sb) => Math.min(Math.max(sb, 1), songFormBars));
    setEndBar((eb) => Math.min(Math.max(eb, 1), songFormBars));
  }, [songFormBars]);

  const playbackBarHint = useMemo(() => {
    if (playbackBeat <= 0 || playbackBeatsPerBar == null || playbackBeatsPerBar <= 0) return null;
    return clampBarToForm(barIndexFromPlaybackBeat(playbackBeat, playbackBeatsPerBar), songFormBars);
  }, [playbackBeat, playbackBeatsPerBar, songFormBars]);

  useEffect(() => {
    if (playbackBarHint == null || rangeUserEdited) return;
    setStartBar(playbackBarHint);
    setEndBar(playbackBarHint);
  }, [playbackBarHint, rangeUserEdited]);

  function applyPlaybackBarToRange() {
    if (playbackBarHint == null) return;
    setStartBar(playbackBarHint);
    setEndBar(playbackBarHint);
    setRangeUserEdited(false);
  }

  function onStartBarChange(next: number) {
    setRangeUserEdited(true);
    setStartBar(Math.max(1, Math.min(songFormBars, next)));
  }

  function onEndBarChange(next: number) {
    setRangeUserEdited(true);
    setEndBar(Math.max(1, Math.min(songFormBars, next)));
  }

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
      const drift = sliderToTargetReharmDrift(driftSlider);
      const out = executeReharm({
        context: previewContext,
        startBar: sb,
        endBar: eb,
        lensIds,
        seed: seedParsed,
        drift,
      });
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const parseIssue = !parsed.ok ? parsed.error : null;

  const applyRange = result ? { startBar: result.startBar, endBar: result.endBar } : null;
  const handleApplyAlternative = useApplyReharm(previewContext, applyRange, onApplyBars);
  const targetDrift = sliderToTargetReharmDrift(driftSlider);

  return (
    <div style={{ marginTop: '0.85rem' }}>
      {usePostGenHarmony ? (
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Harmony source: <strong style={{ color: 'var(--text)' }}>last generate</strong> (slice precompute / export truth)
        </p>
      ) : null}
      {!usePostGenHarmony && parseIssue && (
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', color: '#ca8a04' }}>{parseIssue}</p>
      )}
      {!usePostGenHarmony && !parseIssue && !previewContext && (
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
            onChange={(e) => onStartBarChange(Number(e.target.value) || 1)}
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
            onChange={(e) => onEndBarChange(Number(e.target.value) || 1)}
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

      {playbackBarHint != null ? (
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Playback bar: <strong style={{ color: 'var(--text)' }}>{playbackBarHint}</strong>
          {rangeUserEdited ? (
            <>
              {' · '}
              <button type="button" className="secondary" style={{ fontSize: '0.78rem', padding: '0.15rem 0.4rem' }} onClick={applyPlaybackBarToRange}>
                Use playback bar
              </button>
            </>
          ) : (
            ' · range prefilled from playback'
          )}
        </p>
      ) : null}

      <div style={{ marginBottom: '0.65rem', maxWidth: 360 }}>
        <label
          htmlFor="co-reharm-drift-slider"
          style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          Drift proximity (targets {emotionalDriftOptionLabel(targetDrift)})
        </label>
        <input
          id="co-reharm-drift-slider"
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={driftSlider}
          onChange={(e) => {
            const raw = Number(e.target.value);
            setDriftSlider(Math.min(1, Math.max(0, Math.round(raw * 10) / 10)));
          }}
          style={{ width: '100%' }}
        />
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {driftSlider.toFixed(1)} · engine drift: <strong style={{ color: 'var(--text)' }}>{targetDrift}</strong>
        </p>
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
            {' · '}
            Drift: <strong style={{ color: 'var(--text)' }}>{emotionalDriftOptionLabel(targetDrift)}</strong>
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
                <div style={{ marginBottom: '0.45rem' }}>
                  <button
                    type="button"
                    disabled={!result || !previewContext || !onApplyBars}
                    onClick={() => handleApplyAlternative(alt)}
                  >
                    Apply
                  </button>
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
