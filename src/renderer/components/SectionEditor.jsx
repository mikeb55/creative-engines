import React, { useRef, useState } from 'react';
import { useCompositionSong } from '../context/CompositionSongContext';
import { readSectionRowSummary } from '../lib/compositionSongUi';
import {
  GBD_SECTION_OPTIONS,
  GBD_TYPE_COLORS,
  gbdLabelForSectionType,
  sectionBarCount,
  sectionTypeForGbdLabel,
} from '../lib/sectionGbdUi';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto auto',
  gap: '0.35rem 0.5rem',
  alignItems: 'center',
  padding: '0.35rem 0',
  borderBottom: '1px solid var(--border-subtle, rgba(128,128,128,0.2))',
};

function GbdFlowView({ sections, totalBars, activeSectionId, onSelect }) {
  const total = Math.max(1, totalBars);
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ fontSize: '0.8rem', marginBottom: 4 }}>GBD flow</div>
      <div style={{ display: 'flex', height: 28, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-subtle, #333)' }}>
        {sections.map((section) => {
          const bars = sectionBarCount(section);
          const widthPct = (bars / total) * 100;
          const colors = GBD_TYPE_COLORS[section.type] ?? GBD_TYPE_COLORS.verse;
          const active = section.id === activeSectionId;
          return (
            <button
              key={section.id}
              type="button"
              title={`${section.label} · ${gbdLabelForSectionType(section.type)} · ${bars} bars`}
              onClick={() => onSelect(section.id)}
              style={{
                flex: `0 0 ${widthPct}%`,
                minWidth: 12,
                border: active ? `2px solid ${colors.border}` : `1px solid ${colors.border}`,
                background: colors.bg,
                cursor: 'pointer',
                padding: 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function SectionEditor() {
  const {
    song,
    activeSectionId,
    activeSection,
    setActiveSectionId,
    renameSection,
    addSection,
    deleteSection,
    moveSection,
    patchSection,
  } = useCompositionSong();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const deleteGuardRef = useRef(false);

  const requestDeleteSection = (sectionId) => {
    if (deleteGuardRef.current) return;
    deleteGuardRef.current = true;
    window.setTimeout(() => {
      deleteGuardRef.current = false;
    }, 400);
    deleteSection(sectionId);
  };

  const startRename = (section) => {
    setEditingId(section.id);
    setEditName(section.label);
  };

  const commitRename = (sectionId) => {
    renameSection(sectionId, editName);
    setEditingId(null);
  };

  return (
    <section style={panelStyle} aria-label="Section editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Sections</h3>
        <button type="button" onClick={addSection}>
          Add Section
        </button>
      </div>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>
        {song.totalBars} bars · click row to select active section
      </p>
      <div>
        {song.sections.map((section, index) => {
          const { meter, tempo, feel, key } = readSectionRowSummary(section, song);
          const selected = section.id === activeSectionId;
          const typeColors = GBD_TYPE_COLORS[section.type] ?? GBD_TYPE_COLORS.verse;
          return (
            <div
              key={section.id}
              style={{
                ...rowStyle,
                background: selected ? 'rgba(100, 140, 255, 0.12)' : typeColors.bg,
                borderLeft: `3px solid ${typeColors.border}`,
                cursor: 'pointer',
              }}
              onClick={() => setActiveSectionId(section.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActiveSectionId(section.id);
              }}
            >
              <div>
                {editingId === section.id ? (
                  <input
                    type="text"
                    value={editName}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitRename(section.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(section.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{ width: '100%', maxWidth: 160 }}
                  />
                ) : (
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: '0.1rem 0.25rem', fontWeight: selected ? 600 : 400 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(section);
                    }}
                    title="Click to rename"
                  >
                    {section.label}
                  </button>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)', marginTop: 2 }}>
                  {gbdLabelForSectionType(section.type)} · {meter} · {tempo} bpm · {feel} · {key}
                </div>
              </div>
              <label
                style={{ fontSize: '0.72rem' }}
                onClick={(e) => e.stopPropagation()}
              >
                Type
                <select
                  value={gbdLabelForSectionType(section.type)}
                  onChange={(e) =>
                    patchSection(section.id, { type: sectionTypeForGbdLabel(e.target.value) })
                  }
                  style={{ display: 'block', marginTop: 2, maxWidth: 110 }}
                >
                  {GBD_SECTION_OPTIONS.map((o) => (
                    <option key={o.label} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="secondary"
                  disabled={index === 0}
                  title="Move up"
                  onClick={() => moveSection(section.id, 'up')}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={index === song.sections.length - 1}
                  title="Move down"
                  onClick={() => moveSection(section.id, 'down')}
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                className="secondary"
                disabled={song.sections.length <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  requestDeleteSection(section.id);
                }}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
      {activeSection && (
        <div
          style={{
            marginTop: '0.65rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.65rem',
            fontSize: '0.8rem',
          }}
        >
          {(() => {
            const row = readSectionRowSummary(activeSection, song);
            return (
              <>
          <label>
            Feel
            <select
              value={row.feel}
              onChange={(e) => patchSection(activeSection.id, { feel: e.target.value })}
              style={{ display: 'block', marginTop: 4 }}
            >
              {['straight', 'swing', 'latin', 'odd', 'ballad'].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            Key
            <select
              value={row.key}
              onChange={(e) => patchSection(activeSection.id, { key: e.target.value })}
              style={{ display: 'block', marginTop: 4 }}
            >
              {['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tempo
            <input
              type="number"
              min={40}
              max={300}
              value={row.tempo}
              onChange={(e) =>
                patchSection(activeSection.id, {
                  tempo: Math.max(40, Math.min(300, Number(e.target.value) || 120)),
                })
              }
              style={{ display: 'block', marginTop: 4, width: 72 }}
            />
          </label>
              </>
            );
          })()}
        </div>
      )}
      <GbdFlowView
        sections={song.sections}
        totalBars={song.totalBars}
        activeSectionId={activeSectionId}
        onSelect={setActiveSectionId}
      />
    </section>
  );
}
