import React, { useMemo, useState } from 'react';
import { SLONIMSKY_PATTERNS, getSlonimskyPatternById, previewPatternNoteNames } from '../../engine/slonimskyPatterns';
import { useCompositionSong } from '../context/CompositionSongContext';
import { getUiOverride, keyLabelToPc, patchSectionUi } from '../lib/compositionSongUi';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

const TUNING_OPTIONS = [
  { id: '12tet', label: 'Equal temperament (12-TET)' },
  { id: 'just', label: 'Just intonation' },
  { id: 'pythagorean', label: 'Pythagorean' },
  { id: '24tet', label: 'Quarter-tone (24-TET)' },
  { id: 'user', label: 'User-defined (cents offsets per degree)' },
];

const KEY_OPTIONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function TuningPanel() {
  const { song, activeSection, patchSection } = useCompositionSong();
  const [previewId, setPreviewId] = useState(null);

  if (!activeSection) {
    return (
      <section style={panelStyle}>
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Tuning / Slonimsky</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select a section above.</p>
      </section>
    );
  }

  const tuningSystemId = getUiOverride(song, activeSection.id, 'tuningSystemId') ?? '12tet';
  const userCents = getUiOverride(song, activeSection.id, 'userCents');
  const cents =
    Array.isArray(userCents) && userCents.length === 12
      ? userCents
      : Array(12).fill(0);
  const keyLabel = getUiOverride(song, activeSection.id, 'key') ?? 'C';
  const slonimskyId = getUiOverride(song, activeSection.id, 'slonimskyPatternId');
  const previewPattern = previewId ? getSlonimskyPatternById(previewId) : null;
  const previewNotes = useMemo(() => {
    if (!previewPattern) return '';
    return previewPatternNoteNames(previewPattern, keyLabelToPc(keyLabel));
  }, [previewPattern, keyLabel]);

  return (
    <section style={panelStyle} aria-label="Tuning and Slonimsky">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>
        Tuning / Slonimsky — {activeSection.label}
      </h3>
      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
        Tuning system
        <select
          value={tuningSystemId}
          onChange={(e) => patchSection(activeSection.id, { tuningSystemId: e.target.value })}
          style={{ width: '100%', marginTop: 4 }}
        >
          {TUNING_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {tuningSystemId === 'user' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.35rem',
            marginBottom: '0.65rem',
          }}
        >
          {cents.map((c, i) => (
            <label key={i} style={{ fontSize: '0.7rem' }}>
              deg {i + 1}
              <input
                type="number"
                min={0}
                max={99}
                value={c}
                onChange={(e) => {
                  const next = [...cents];
                  next[i] = Math.max(0, Math.min(99, Number(e.target.value) || 0));
                  patchSection(activeSection.id, { userCents: next });
                }}
                style={{ width: '100%', marginTop: 2 }}
              />
            </label>
          ))}
        </div>
      )}
      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
        Section key (preview root)
        <select
          value={keyLabel}
          onChange={(e) => patchSection(activeSection.id, { key: e.target.value })}
          style={{ marginTop: 4 }}
        >
          {KEY_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <h4 style={{ margin: '0.5rem 0 0.35rem', fontSize: '0.85rem' }}>Slonimsky patterns</h4>
      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-subtle, #333)', borderRadius: 6 }}>
        {SLONIMSKY_PATTERNS.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: 8,
              padding: '0.35rem 0.5rem',
              borderBottom: '1px solid var(--border-subtle, rgba(128,128,128,0.15))',
              background: slonimskyId === p.id ? 'rgba(100, 140, 255, 0.1)' : undefined,
            }}
          >
            <div>
              <strong style={{ fontSize: '0.85rem' }}>{p.name}</strong>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.intervalSummary}</div>
            </div>
            <button type="button" className="secondary" onClick={() => setPreviewId(p.id)}>
              Preview
            </button>
            <button
              type="button"
              onClick={() => patchSection(activeSection.id, { slonimskyPatternId: p.id })}
            >
              Apply
            </button>
          </div>
        ))}
      </div>
      {previewNotes && (
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Preview: {previewNotes}
        </p>
      )}
      {slonimskyId && (
        <p style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
          Active seed: {getSlonimskyPatternById(slonimskyId)?.name ?? slonimskyId}
        </p>
      )}
    </section>
  );
}
