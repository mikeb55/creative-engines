import React, { useMemo, useState } from 'react';
import { DRUM_PRESETS } from '../../engine/drumPresets.js';
import { useDrumSelection } from '../context/DrumSelectionContext';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

const ROW_LABELS = ['kick', 'snare', 'hat', 'ride'];

function PatternGrid({ pattern }) {
  if (!pattern) return null;
  const lanes = [pattern.kicks, pattern.snares, pattern.hats, pattern.ride];
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ fontSize: '0.8rem', marginBottom: 4 }}>Active pattern (16th-note grid)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(16, 1fr)', gap: 2, fontSize: '0.65rem' }}>
        <div />
        {Array.from({ length: 16 }, (_, i) => (
          <div key={`h-${i}`} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            {i + 1}
          </div>
        ))}
        {lanes.map((hits, li) => (
          <React.Fragment key={ROW_LABELS[li]}>
            <div style={{ textTransform: 'uppercase', color: 'var(--text-muted)' }}>{ROW_LABELS[li]}</div>
            {Array.from({ length: 16 }, (_, col) => {
              const on = hits.includes(col);
              return (
                <div
                  key={`${ROW_LABELS[li]}-${col}`}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    maxWidth: 18,
                    borderRadius: 3,
                    background: on ? 'var(--accent, #6b8cff)' : 'var(--border-subtle, rgba(128,128,128,0.2))',
                  }}
                  title={on ? 'hit' : 'rest'}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
        {pattern.description}
      </p>
    </div>
  );
}

export function DrummerPanel() {
  const {
    drummerModules,
    drummerId,
    drummer,
    patternName,
    activePattern,
    presetId,
    selectDrummer,
    selectPattern,
    loadPreset,
  } = useDrumSelection();

  const [feelFilter, setFeelFilter] = useState('');

  const feelTags = useMemo(() => {
    const set = new Set();
    for (const p of DRUM_PRESETS) {
      for (const t of p.tags) set.add(t);
    }
    return [...set].sort();
  }, []);

  const filteredPresets = useMemo(() => {
    if (!feelFilter) return DRUM_PRESETS;
    return DRUM_PRESETS.filter((p) => p.tags.includes(feelFilter));
  }, [feelFilter]);

  return (
    <section style={panelStyle} aria-label="Drummer panel">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Drummers</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.65rem' }}>
        {drummerModules.map((m) => (
          <button
            key={m.drummerId}
            type="button"
            className={drummerId === m.drummerId ? '' : 'secondary'}
            onClick={() => selectDrummer(m.drummerId)}
          >
            {m.name}
          </button>
        ))}
      </div>
      {drummer && (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {drummer.description}
        </p>
      )}

      <h4 style={{ margin: '0.5rem 0 0.35rem', fontSize: '0.85rem' }}>Patterns</h4>
      <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border-subtle, #333)', borderRadius: 6 }}>
        {drummer?.patterns.map((p) => {
          const on = p.name === patternName;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => selectPattern(p.name)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.35rem 0.5rem',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle, rgba(128,128,128,0.15))',
                background: on ? 'rgba(100, 140, 255, 0.12)' : 'transparent',
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              <strong style={{ fontSize: '0.85rem' }}>{p.name}</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                {p.feel} · {p.meter}
              </span>
            </button>
          );
        })}
      </div>

      <h4 style={{ margin: '0.65rem 0 0.35rem', fontSize: '0.85rem' }}>Named presets</h4>
      <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>
        Filter by feel tag
        <select
          value={feelFilter}
          onChange={(e) => setFeelFilter(e.target.value)}
          style={{ display: 'block', marginTop: 4, width: '100%', maxWidth: 220 }}
        >
          <option value="">All</option>
          {feelTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border-subtle, #333)', borderRadius: 6 }}>
        {filteredPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => loadPreset(preset)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.35rem 0.5rem',
              border: 'none',
              borderBottom: '1px solid var(--border-subtle, rgba(128,128,128,0.15))',
              background: presetId === preset.id ? 'rgba(100, 140, 255, 0.12)' : 'transparent',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            <strong style={{ fontSize: '0.85rem' }}>{preset.name}</strong>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{preset.tags.join(' · ')}</div>
          </button>
        ))}
      </div>

      <PatternGrid pattern={activePattern} />
    </section>
  );
}
