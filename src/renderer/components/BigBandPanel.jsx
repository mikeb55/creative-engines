import React from 'react';
import { BIG_BAND_STYLE_OPTIONS, useBigBand } from '../context/BigBandContext';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

const SECTION_META = [
  { key: 'trumpets', title: 'Trumpets' },
  { key: 'trombones', title: 'Trombones' },
  { key: 'saxes', title: 'Saxes' },
  { key: 'rhythm', title: 'Rhythm' },
];

function SectionBlock({
  sectionKey,
  title,
  section,
  spreadOptions,
  registerOptions,
  onPatchSection,
  onPatchVoice,
}) {
  return (
    <div
      style={{
        marginTop: '0.5rem',
        padding: '0.45rem 0.5rem',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.2))',
        borderRadius: 6,
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600 }}>
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={(e) => onPatchSection(sectionKey, { enabled: e.target.checked })}
        />
        {title}
      </label>
      {section.enabled && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.45rem' }}>
            <label style={{ fontSize: '0.75rem' }}>
              Spread
              <select
                value={section.spread}
                onChange={(e) => onPatchSection(sectionKey, { spread: e.target.value })}
                style={{ display: 'block', marginTop: 2, minWidth: 100 }}
              >
                {spreadOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: '0.75rem' }}>
              Register
              <select
                value={section.register}
                onChange={(e) => onPatchSection(sectionKey, { register: e.target.value })}
                style={{ display: 'block', marginTop: 2, minWidth: 90 }}
              >
                {registerOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul style={{ listStyle: 'none', margin: '0.45rem 0 0', padding: 0 }}>
            {section.voices.map((v) => (
              <li
                key={v.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.75rem',
                  padding: '0.2rem 0',
                  borderTop: '1px solid var(--border-subtle, rgba(128,128,128,0.12))',
                }}
              >
                <span style={{ minWidth: 88 }}>{v.label}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={v.muted}
                    onChange={(e) => onPatchVoice(sectionKey, v.id, { muted: e.target.checked })}
                  />
                  Mute
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={v.solo}
                    onChange={(e) => onPatchVoice(sectionKey, v.id, { solo: e.target.checked })}
                  />
                  Solo
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function BigBandPanel() {
  const {
    config,
    spreadOptions,
    registerOptions,
    setStyleId,
    patchSection,
    patchVoice,
    setSoliMode,
    setShoutChorus,
  } = useBigBand();

  return (
    <section style={panelStyle} aria-label="Big band ensemble">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Big Band</h3>
      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
        Style
        <select
          value={config.styleId}
          onChange={(e) => setStyleId(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        >
          {BIG_BAND_STYLE_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
          <input
            type="checkbox"
            checked={config.soliMode}
            onChange={(e) => setSoliMode(e.target.checked)}
          />
          Soli mode
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
          <input
            type="checkbox"
            checked={config.shoutChorus}
            onChange={(e) => setShoutChorus(e.target.checked)}
          />
          Shout chorus (fff / spread)
        </label>
      </div>
      {SECTION_META.map(({ key, title }) => (
        <SectionBlock
          key={key}
          sectionKey={key}
          title={title}
          section={config.sections[key]}
          spreadOptions={spreadOptions}
          registerOptions={registerOptions}
          onPatchSection={patchSection}
          onPatchVoice={patchVoice}
        />
      ))}
    </section>
  );
}
