import React from 'react';
import {
  SQ_DYNAMICS,
  SQ_REGISTERS,
  SQ_STYLE_PRESETS,
  SQ_TECHNIQUES,
  SQ_TEXTURES,
  SQ_VOICING_STYLES,
  useStringQuartet,
} from '../context/StringQuartetContext';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

const TEXTURE_LABELS = {
  homophonic: 'Homophonic',
  melody_accompaniment: 'Melody + Accompaniment',
  contrapuntal: 'Contrapuntal',
  antiphonal: 'Antiphonal',
  unison: 'Unison',
};

const TECHNIQUE_LABELS = {
  arco: 'arco',
  pizzicato: 'pizzicato',
  col_legno: 'col legno',
  sul_ponticello: 'sul ponticello',
  sul_tasto: 'sul tasto',
  harmonics: 'harmonics',
  tremolo: 'tremolo',
  spiccato: 'spiccato',
};

export function StringQuartetPanel() {
  const { state, patchVoice, setVoicingStyle, setTexture, setStylePreset } = useStringQuartet();

  return (
    <section style={panelStyle} aria-label="String quartet ensemble">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>String Quartet</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <label style={{ fontSize: '0.78rem', flex: '1 1 120px' }}>
          Voicing
          <select
            value={state.voicingStyle}
            onChange={(e) => setVoicingStyle(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          >
            {SQ_VOICING_STYLES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '0.78rem', flex: '1 1 160px' }}>
          Texture
          <select
            value={state.texture}
            onChange={(e) => setTexture(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          >
            {SQ_TEXTURES.map((t) => (
              <option key={t} value={t}>
                {TEXTURE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '0.78rem', flex: '1 1 140px' }}>
          Style preset
          <select
            value={state.stylePreset}
            onChange={(e) => setStylePreset(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          >
            {SQ_STYLE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {state.voices.map((v) => (
        <div
          key={v.id}
          style={{
            marginTop: '0.45rem',
            padding: '0.4rem 0.5rem',
            border: '1px solid var(--border-subtle, rgba(128,128,128,0.2))',
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>{v.label}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
              <input
                type="checkbox"
                checked={v.muted}
                onChange={(e) => patchVoice(v.id, { muted: e.target.checked })}
              />
              Mute
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
              <input
                type="checkbox"
                checked={v.solo}
                onChange={(e) => patchVoice(v.id, { solo: e.target.checked })}
              />
              Solo
            </label>
            <label style={{ fontSize: '0.72rem' }}>
              Register
              <select
                value={v.register}
                onChange={(e) => patchVoice(v.id, { register: e.target.value })}
                style={{ display: 'block', marginTop: 2 }}
              >
                {SQ_REGISTERS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: '0.72rem' }}>
              Technique
              <select
                value={v.technique}
                onChange={(e) => patchVoice(v.id, { technique: e.target.value })}
                style={{ display: 'block', marginTop: 2, minWidth: 120 }}
              >
                {SQ_TECHNIQUES.map((t) => (
                  <option key={t} value={t}>
                    {TECHNIQUE_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: '0.72rem' }}>
              Dynamic
              <select
                value={v.dynamic}
                onChange={(e) => patchVoice(v.id, { dynamic: e.target.value })}
                style={{ display: 'block', marginTop: 2 }}
              >
                {SQ_DYNAMICS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ))}
    </section>
  );
}
