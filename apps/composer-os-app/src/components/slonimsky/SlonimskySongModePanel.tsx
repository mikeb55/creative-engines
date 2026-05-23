import { useMemo, useState } from 'react';
import {
  SLONIMSKY_SONG_MODE_WRITERS,
  type SlonimskyMacroState,
  type SlonimskySongModeWriterId,
  type SlonimskySourcePreset,
} from '../../types/slonimskyMacroState';
import {
  SLONIMSKY_SECTION_LABELS,
  slonimskySongModeWriterPresets,
  type SlonimskySectionLabel,
  type SlonimskySectionOverrides,
} from '../../types/slonimskySongModeState';

const WRITER_LABELS: Record<SlonimskySongModeWriterId, string> = {
  pat_metheny: 'Pat Metheny',
  frank_zappa: 'Frank Zappa',
  sonic_youth: 'Sonic Youth',
  joni_mitchell: 'Joni Mitchell',
  radiohead: 'Radiohead',
};

function isSongModeWriter(id: string): id is SlonimskySongModeWriterId {
  return (SLONIMSKY_SONG_MODE_WRITERS as readonly string[]).includes(id);
}

export function SlonimskySongModePanel({
  writerId,
  onWriterIdChange,
  state,
  onChange,
  sectionOverrides,
  onSectionOverridesChange,
  disabled = false,
}: {
  writerId: SlonimskySongModeWriterId;
  onWriterIdChange: (id: SlonimskySongModeWriterId) => void;
  state: SlonimskyMacroState;
  onChange: (s: SlonimskyMacroState) => void;
  sectionOverrides: SlonimskySectionOverrides;
  onSectionOverridesChange: (o: SlonimskySectionOverrides) => void;
  disabled?: boolean;
}) {
  const presets = useMemo(() => slonimskySongModeWriterPresets(writerId), [writerId]);
  const [activeSection, setActiveSection] = useState<SlonimskySectionLabel>('verse');
  const activePresetId = useMemo(() => {
    const match = presets.find(
      (p) =>
        p.macro.sourcePreset === state.sourcePreset &&
        p.macro.motion === state.motion &&
        p.macro.tension === state.tension &&
        p.macro.variation === state.variation
    );
    return match?.id ?? null;
  }, [presets, state]);

  const sectionOverride = sectionOverrides[activeSection];

  const pinSection = () => {
    onSectionOverridesChange({
      ...sectionOverrides,
      [activeSection]: { ...sectionOverride, pin: state.sourcePreset },
    });
  };

  const toggleAvoidFlavor = (flavor: SlonimskySourcePreset) => {
    const prev = sectionOverride?.avoid ?? [];
    const next = prev.includes(flavor) ? prev.filter((f) => f !== flavor) : [...prev, flavor];
    onSectionOverridesChange({
      ...sectionOverrides,
      [activeSection]: { ...sectionOverride, avoid: next.length ? next : undefined },
    });
  };

  return (
    <div
      style={{
        marginTop: '0.5rem',
        marginBottom: '1rem',
        padding: '0.85rem 1rem',
        maxWidth: 720,
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-panel, rgba(0,0,0,0.1))',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.55rem' }}>
        Song Mode — Slonimsky presets
      </div>

      <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.65rem' }}>
        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          Writer (Z9 allowlist)
        </span>
        <select
          value={writerId}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            if (!isSongModeWriter(v)) return;
            onWriterIdChange(v);
            const first = slonimskySongModeWriterPresets(v)[0];
            if (first) onChange(first.macro);
          }}
          style={{
            width: '100%',
            maxWidth: 280,
            padding: '0.45rem 0.6rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-input, var(--bg))',
            color: 'var(--text)',
          }}
        >
          {SLONIMSKY_SONG_MODE_WRITERS.map((id) => (
            <option key={id} value={id}>
              {WRITER_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      <div style={{ marginBottom: '0.75rem' }}>
        <span
          style={{
            display: 'block',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}
        >
          Writer preset
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {presets.map((p) => {
            const on = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(p.macro)}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 999,
                  border: on
                    ? '1px solid var(--accent, #6ae)'
                    : '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
                  background: on ? 'rgba(100,160,255,0.14)' : 'transparent',
                  color: 'var(--text)',
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span
          style={{
            display: 'block',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}
        >
          Section pin / avoid
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
          {SLONIMSKY_SECTION_LABELS.map((label) => {
            const on = activeSection === label;
            const hasPin = !!sectionOverrides[label]?.pin;
            const avoidN = sectionOverrides[label]?.avoid?.length ?? 0;
            return (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={() => setActiveSection(label)}
                title={
                  hasPin || avoidN
                    ? `pin=${sectionOverrides[label]?.pin ?? '—'} avoid=${avoidN}`
                    : undefined
                }
                style={{
                  fontSize: '0.75rem',
                  padding: '0.18rem 0.5rem',
                  borderRadius: 999,
                  border: on
                    ? '1px solid var(--accent, #6ae)'
                    : '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
                  background: on ? 'rgba(100,160,255,0.12)' : 'transparent',
                  color: 'var(--text)',
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {label}
                {hasPin ? ' ·P' : ''}
                {avoidN > 0 ? ` ·A${avoidN}` : ''}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            onClick={pinSection}
            style={{ fontSize: '0.78rem' }}
          >
            Pin {state.sourcePreset} → {activeSection}
          </button>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Avoid flavor:</span>
          {(['lyrical', 'angular', 'symmetric', 'chromatic', 'riff'] as SlonimskySourcePreset[]).map((f) => {
            const on = sectionOverride?.avoid?.includes(f);
            return (
              <button
                key={f}
                type="button"
                disabled={disabled}
                onClick={() => toggleAvoidFlavor(f)}
                aria-pressed={on}
                style={{
                  fontSize: '0.68rem',
                  padding: '0.12rem 0.35rem',
                  borderRadius: 4,
                  border: on
                    ? '1px solid rgba(220,80,80,0.7)'
                    : '1px solid var(--border-subtle, rgba(128,128,128,0.28))',
                  background: on ? 'rgba(220,80,80,0.12)' : 'transparent',
                  color: 'var(--text)',
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
        {sectionOverride?.pin || sectionOverride?.avoid?.length ? (
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {activeSection}: pin={sectionOverride.pin ?? '—'} · avoid=
            {sectionOverride.avoid?.join(', ') || '—'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
