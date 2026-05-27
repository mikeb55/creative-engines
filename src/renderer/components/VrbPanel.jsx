import React from 'react';
import { useVrbProfile } from '../context/VrbProfileContext';

const panelStyle = {
  border: '1px solid var(--border, #444)',
  borderRadius: 8,
  padding: '0.65rem 0.75rem',
  marginBottom: '0.75rem',
};

function SliderRow({ label, min, max, step, value, onChange, unit = '' }) {
  return (
    <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '0.45rem' }}>
      {label}: {value}
      {unit}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', display: 'block', marginTop: 4 }}
      />
    </label>
  );
}

export function VrbPanel() {
  const { presets, presetId, locked, setLocked, sliders, applyPreset, updateSlider, resetToPreset } =
    useVrbProfile();

  if (!sliders) return null;

  return (
    <section style={panelStyle} aria-label="ECM VRB">
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>ECM VRB</h3>
      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
        Preset
        <select
          value={presetId}
          onChange={(e) => applyPreset(e.target.value, true)}
          style={{ width: '100%', marginTop: 4 }}
        >
          <option value="__off__">— Off —</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>{sliders.character}</p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
        <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
        Lock to Preset
      </label>
      <SliderRow
        label="Room size"
        min={0}
        max={1}
        step={0.01}
        value={sliders.roomSize}
        onChange={(v) => updateSlider('roomSize', v)}
      />
      <SliderRow
        label="Decay"
        min={0.1}
        max={8}
        step={0.1}
        value={Math.max(0.1, sliders.decay)}
        unit=" s"
        onChange={(v) => updateSlider('decay', v)}
      />
      <SliderRow
        label="Predelay"
        min={0}
        max={80}
        step={1}
        value={sliders.predelay}
        unit=" ms"
        onChange={(v) => updateSlider('predelay', v)}
      />
      <SliderRow
        label="Damping"
        min={0}
        max={1}
        step={0.01}
        value={sliders.damping}
        onChange={(v) => updateSlider('damping', v)}
      />
      <SliderRow
        label="Diffusion"
        min={0}
        max={1}
        step={0.01}
        value={sliders.diffusion}
        onChange={(v) => updateSlider('diffusion', v)}
      />
      <button type="button" className="secondary" onClick={resetToPreset}>
        Reset to preset
      </button>
    </section>
  );
}
