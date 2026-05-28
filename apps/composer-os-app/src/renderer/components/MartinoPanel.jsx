import { useMemo } from 'react';
import { parseMartinoChords, buildConversionTable } from '../../lib/martinoGeneratePipeline.js';

const ACTIVITIES = [
  { id: 'A1_LINEAR_CORE', label: 'A1 LINEAR CORE', hint: 'ascending · burning' },
  { id: 'A2_DIAGONAL_BRIDGE', label: 'A2 DIAGONAL BRIDGE', hint: 'descending · melodic · recommended for Beatrice-style changes' },
  { id: 'A3_PIVOT_CELL', label: 'A3 PIVOT CELL', hint: 'arch · melodic' },
  { id: 'A4_ANCHOR_ARP', label: 'A4 ANCHOR ARP', hint: 'wave · ballad · most LFV violations — use with care' },
  { id: 'A5_FREE_MIX', label: 'A5 FREE MIX', hint: 'ascending · burning' },
];

const chip = (active) => ({
  padding: '0.25rem 0.55rem',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: active ? 'var(--accent, #3d6)' : 'var(--bg-input, var(--bg))',
  color: active ? '#fff' : 'var(--text)',
  cursor: 'pointer',
  fontSize: '0.82rem',
});

export default function MartinoPanel({
  tuneName,
  setTuneName,
  chordSource,
  setChordSource,
  manualChords,
  setManualChords,
  sectionLabel,
  sectionBarCount,
  sectionMeter,
  sectionKey,
  sectionChords = '',
  dominantTensionDefault,
  setDominantTensionDefault,
  tensionOverrides,
  setTensionOverride,
  activeActivity,
  setActiveActivity,
  secondaryActivities,
  toggleSecondary,
  mode,
  setMode,
  choruses,
  setChoruses,
  noteDensity,
  setNoteDensity,
  lfvMin,
  setLfvMin,
  lfvMax,
  setLfvMax,
  explainMode,
  setExplainMode,
  onLoadBeatrice,
  onLoadOrbit,
  disabled,
}) {
  const chordText = chordSource === 'section' ? sectionChords : manualChords;
  const parsed = useMemo(() => parseMartinoChords(chordText), [chordSource, manualChords, sectionChords]);

  const conversionRows = useMemo(() => {
    if (!parsed.ok || !parsed.chords.length) return [];
    return buildConversionTable(parsed.chords, dominantTensionDefault, tensionOverrides);
  }, [parsed, dominantTensionDefault, tensionOverrides]);

  return (
    <div style={{ marginBottom: '1rem', maxWidth: 720 }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Martino Linear</h3>

      <div style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="martino-tune-name" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          Tune name (optional)
        </label>
        <input
          id="martino-tune-name"
          type="text"
          value={tuneName}
          onChange={(e) => setTuneName(e.target.value)}
          placeholder="e.g. Orbit, Nadine, My Progression"
          disabled={disabled}
          style={{ display: 'block', width: '100%', padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)' }}
        />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Chord source</div>
        <label style={{ marginRight: 12 }}>
          <input type="radio" checked={chordSource === 'section'} onChange={() => setChordSource('section')} disabled={disabled} /> Active section
        </label>
        <label>
          <input type="radio" checked={chordSource === 'manual'} onChange={() => setChordSource('manual')} disabled={disabled} /> Manual entry
        </label>
        {chordSource === 'section' ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
            {sectionLabel || 'Untitled'} · {sectionBarCount || 0} bars · {sectionMeter || '4/4'} · {sectionKey || 'F'}
          </p>
        ) : (
          <input
            type="text"
            value={manualChords}
            onChange={(e) => setManualChords(e.target.value)}
            placeholder="Dm7 G7 Cmaj7 Cmaj7"
            disabled={disabled}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)' }}
          />
        )}
        {chordSource === 'manual' && !parsed.ok && manualChords.trim() && (
          <p style={{ color: '#c55', fontSize: '0.82rem', margin: '0.35rem 0 0' }}>{parsed.error}</p>
        )}
      </div>

      {conversionRows.length > 0 && (
        <div style={{ marginBottom: '0.75rem', overflowX: 'auto' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Minor conversion lane</div>
          <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Chord</th>
                <th align="left">Minor target</th>
                <th align="left">Rule</th>
                <th align="left">Tension</th>
              </tr>
            </thead>
            <tbody>
              {conversionRows.map((row) => {
                const isDom = row.rule.includes('dominant');
                return (
                  <tr key={row.index}>
                    <td>{row.chord}</td>
                    <td>{row.minorRoot}</td>
                    <td>{row.rule}</td>
                    <td>
                      {isDom ? (
                        <span>
                          {(['low', 'medium', 'high']).map((t) => (
                            <button
                              key={t}
                              type="button"
                              style={{ ...chip((tensionOverrides[row.index] ?? dominantTensionDefault) === t), marginRight: 4 }}
                              onClick={() => setTensionOverride(row.index, t)}
                              disabled={disabled}
                            >
                              {t}
                            </button>
                          ))}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Activity</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ACTIVITIES.map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.hint}
              style={chip(activeActivity === a.id)}
              onClick={() => setActiveActivity(a.id)}
              disabled={disabled}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Secondary (optional)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {ACTIVITIES.filter((a) => a.id !== activeActivity).map((a) => (
            <button
              key={a.id}
              type="button"
              style={chip(secondaryActivities.includes(a.id))}
              onClick={() => toggleSecondary(a.id)}
              disabled={disabled}
            >
              {a.id.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ marginRight: 12 }}>
          <input type="radio" checked={mode === 'teaching'} onChange={() => setMode('teaching')} disabled={disabled} /> Teaching
        </label>
        <label>
          <input type="radio" checked={mode === 'performance'} onChange={() => setMode('performance')} disabled={disabled} /> Performance
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
        <label>
          Choruses{' '}
          <select value={choruses} onChange={(e) => setChoruses(Number(e.target.value))} disabled={disabled}>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </label>
        <label>
          Density{' '}
          <select value={noteDensity} onChange={(e) => setNoteDensity(e.target.value)} disabled={disabled}>
            <option value="eighth">Eighths</option>
            <option value="swing_eighth">Swing eighths</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
        <label>
          LFV min <input type="number" min={0} max={24} value={lfvMin} onChange={(e) => setLfvMin(Number(e.target.value))} disabled={disabled} style={{ width: 48 }} />
        </label>
        <label>
          max <input type="number" min={0} max={24} value={lfvMax} onChange={(e) => setLfvMax(Number(e.target.value))} disabled={disabled} style={{ width: 48 }} />
        </label>
        <label>
          <input type="checkbox" checked={explainMode} onChange={(e) => setExplainMode(e.target.checked)} disabled={disabled} /> Explain mode
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onLoadBeatrice} disabled={disabled} style={chip(false)}>Beatrice</button>
        <button type="button" onClick={onLoadOrbit} disabled={disabled} style={chip(false)}>Orbit</button>
      </div>
    </div>
  );
}
