import React from 'react';
import {
  CONTRAPUNTAL_SPECIES,
  CONTRAPUNTAL_STYLE_PRESETS,
  useContrapuntal,
} from '../context/ContrapuntalContext';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

const RULE_ROWS = [
  { key: 'avoidParallelFifths', label: 'Avoid parallel fifths' },
  { key: 'avoidParallelOctaves', label: 'Avoid parallel octaves' },
  { key: 'contraryMotionPreference', label: 'Contrary motion preference' },
  { key: 'noVoiceCrossing', label: 'No voice crossing' },
  { key: 'resolveLeadingTone', label: 'Resolve leading tone' },
  { key: 'dissonanceWeakBeatsOnly', label: 'Dissonance on weak beats only' },
];

export function ContrapuntalPanel() {
  const {
    state,
    setVoiceCount,
    setSpeciesForPair,
    setRule,
    setCantusSource,
    setCantusCustom,
    setDirectionBias,
    setStylePreset,
  } = useContrapuntal();

  return (
    <section style={panelStyle} aria-label="Contrapuntal controls">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Contrapuntal</h3>

      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Voice count</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              className={state.voiceCount === n ? '' : 'secondary'}
              onClick={() => setVoiceCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Species (per voice pair)</span>
        {state.speciesPairs.map((pair) => (
          <label
            key={pair.pairKey}
            style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.35rem' }}
          >
            V{pair.voiceA}–V{pair.voiceB}
            <select
              value={pair.species}
              onChange={(e) => setSpeciesForPair(pair.pairKey, e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 2 }}
            >
              {CONTRAPUNTAL_SPECIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.hint}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <fieldset
        style={{
          border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
          borderRadius: 6,
          margin: '0 0 0.5rem',
          padding: '0.4rem 0.5rem',
        }}
      >
        <legend style={{ fontSize: '0.8rem', padding: '0 4px' }}>Cantus firmus</legend>
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 4 }}>
          Source
          <select
            value={state.cantusSource}
            onChange={(e) => setCantusSource(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 2 }}
          >
            <option value="active_section">Active section melody</option>
            <option value="custom">Custom entry</option>
          </select>
        </label>
        {state.cantusSource === 'custom' && (
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 4 }}>
            Notes (space-separated)
            <input
              type="text"
              value={state.cantusCustom}
              onChange={(e) => setCantusCustom(e.target.value)}
              placeholder="C D E F G"
              style={{ display: 'block', width: '100%', marginTop: 2, boxSizing: 'border-box' }}
            />
          </label>
        )}
        <label style={{ display: 'block', fontSize: '0.75rem' }}>
          Direction bias
          <select
            value={state.directionBias}
            onChange={(e) => setDirectionBias(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 2 }}
          >
            <option value="ascending">Ascending</option>
            <option value="descending">Descending</option>
            <option value="arch">Arch</option>
            <option value="free">Free</option>
          </select>
        </label>
      </fieldset>

      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Rules</span>
        {RULE_ROWS.map(({ key, label }) => (
          <label
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', marginBottom: 2 }}
          >
            <input
              type="checkbox"
              checked={!!state.rules[key]}
              onChange={(e) => setRule(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>

      <label style={{ display: 'block', fontSize: '0.8rem' }}>
        Style preset
        <select
          value={state.stylePreset}
          onChange={(e) => setStylePreset(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        >
          {CONTRAPUNTAL_STYLE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
