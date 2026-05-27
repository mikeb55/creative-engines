import React, { useMemo } from 'react';
import { useCompositionSong } from '../context/CompositionSongContext';
import {
  getUiOverride,
  isValidAdditiveMeterInput,
  parseAdditiveBeatGroups,
  parseMeterParts,
  readSectionMeter,
} from '../lib/compositionSongUi';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

function beatGroupsForSection(section, song, numerator) {
  const stored = getUiOverride(song, section.id, 'beatGrouping');
  if (Array.isArray(stored) && stored.length) return stored;
  const additiveRaw = getUiOverride(song, section.id, 'additiveMeter');
  if (typeof additiveRaw === 'string' && additiveRaw.trim()) {
    const parsed = parseAdditiveBeatGroups(additiveRaw);
    if (parsed.length) return parsed;
  }
  const compound = getUiOverride(song, section.id, 'compoundMeter');
  if (compound === true || compound === 'compound') {
    if (numerator % 3 === 0 && numerator >= 6) return Array(numerator / 3).fill(3);
  }
  return Array(Math.max(1, numerator)).fill(1);
}

export function MeterEditor() {
  const { song, activeSection, patchSection } = useCompositionSong();

  if (!activeSection) {
    return (
      <section style={panelStyle}>
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Meter</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select a section above.</p>
      </section>
    );
  }

  const meterLabel = readSectionMeter(activeSection, song);
  const { numerator, denominator } = parseMeterParts(meterLabel);
  const compound =
    getUiOverride(song, activeSection.id, 'compoundMeter') === true ||
    getUiOverride(song, activeSection.id, 'compoundMeter') === 'compound';
  const additiveRaw = getUiOverride(song, activeSection.id, 'additiveMeter') ?? '';
  const metricMod = getUiOverride(song, activeSection.id, 'metricModulation') ?? '';
  const beatGroups = useMemo(
    () => beatGroupsForSection(activeSection, song, numerator),
    [activeSection, song, numerator]
  );

  const modulationParts = String(metricMod).match(/^(\d+)\s*:\s*(\d+)$/);
  const modSource = modulationParts ? modulationParts[1] : '—';
  const modTarget = modulationParts ? modulationParts[2] : '—';

  const persistMeter = (num, den, extra = {}) => {
    patchSection(activeSection.id, {
      meter: `${num}/${den}`,
      ...extra,
    });
  };

  return (
    <section style={panelStyle} aria-label="Meter editor">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>
        Meter — {activeSection.label}
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
          Numerator
          <input
            type="number"
            min={1}
            max={32}
            value={numerator}
            onChange={(e) => {
              const num = Math.max(1, Math.min(32, Number(e.target.value) || 4));
              persistMeter(num, denominator);
            }}
            style={{ width: 64, marginTop: 4 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
          Denominator
          <select
            value={denominator}
            onChange={(e) => persistMeter(numerator, Number(e.target.value))}
            style={{ marginTop: 4 }}
          >
            {[2, 4, 8, 16].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
          <input
            type="checkbox"
            checked={compound}
            onChange={(e) =>
              patchSection(activeSection.id, {
                compoundMeter: e.target.checked ? 'compound' : 'simple',
              })
            }
          />
          Compound
        </label>
      </div>
      <label style={{ display: 'block', marginTop: '0.65rem', fontSize: '0.8rem' }}>
        Additive grouping (e.g. 3+3+2)
        <input
          type="text"
          value={additiveRaw}
          placeholder="3+3+2"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw && !/^[\d+\s]*$/.test(raw)) return;
            if (!isValidAdditiveMeterInput(raw, numerator)) return;
            const groups = parseAdditiveBeatGroups(raw);
            patchSection(activeSection.id, {
              additiveMeter: raw,
              beatGrouping: groups.length ? groups : undefined,
            });
          }}
          style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
        />
      </label>
      <div style={{ marginTop: '0.65rem' }}>
        <div style={{ fontSize: '0.8rem', marginBottom: 4 }}>Beat grouping preview</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {beatGroups.map((beats, gi) =>
            Array.from({ length: beats }).map((_, bi) => (
              <span
                key={`${gi}-${bi}`}
                title={`Group ${gi + 1}`}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: 'var(--accent, #6b8cff)',
                  display: 'inline-block',
                }}
              />
            ))
          )}
        </div>
      </div>
      <label style={{ display: 'block', marginTop: '0.65rem', fontSize: '0.8rem' }}>
        Metric modulation ratio (e.g. 3:2)
        <input
          type="text"
          value={metricMod}
          placeholder="3:2"
          onChange={(e) =>
            patchSection(activeSection.id, { metricModulation: e.target.value.trim() })
          }
          style={{ width: 120, marginTop: 4, marginRight: 8 }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          source pulse {modSource} → target {modTarget}
        </span>
      </label>
    </section>
  );
}
