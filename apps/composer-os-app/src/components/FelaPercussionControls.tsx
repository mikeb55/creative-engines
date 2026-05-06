/**
 * Song Mode — Fela Kuti percussion feel + 16-step pattern preview (display-only).
 */

import { Fragment, useMemo } from 'react';
import { createAfrobeatRhythmEngine } from '@composer-os/core/percussion/afrobeatRhythmEngine';
import {
  felaPercussionFeelTagFromTonyAllenFeel,
  resolveFelaPercussionTonyAllenFeel,
} from '@composer-os/core/song-mode/felaKutiSlice';

export type FelaPercussionFeelMode = 'auto' | 'straight' | 'swing' | 'afrobeat';

const FEEL_OPTIONS: { mode: FelaPercussionFeelMode; label: string }[] = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'straight', label: 'fk:straight' },
  { mode: 'swing', label: 'fk:swing' },
  { mode: 'afrobeat', label: 'fk:afrobeat' },
];

const ROWS: { key: keyof import('@composer-os/core/percussion/afrobeatRhythmEngine').DrumPattern; label: string }[] =
  [
    { key: 'kick', label: 'Kick' },
    { key: 'snare', label: 'Snare' },
    { key: 'hiHat', label: 'Hi-hat' },
    { key: 'bell', label: 'Bell' },
    { key: 'conga', label: 'Conga' },
  ];

export function FelaPercussionControls(props: {
  feelMode: FelaPercussionFeelMode;
  onFeelModeChange: (m: FelaPercussionFeelMode) => void;
  disabled?: boolean;
}) {
  const engine = useMemo(() => createAfrobeatRhythmEngine(), []);
  const effectiveFeel = resolveFelaPercussionTonyAllenFeel({
    felaPercussionFeelOverride: props.feelMode === 'auto' ? undefined : props.feelMode,
    felaKutiContext: 'zombie_1977',
  });
  const pattern = useMemo(() => engine.selectPattern(effectiveFeel), [engine, effectiveFeel]);
  const tag = felaPercussionFeelTagFromTonyAllenFeel(effectiveFeel);

  return (
    <div
      style={{
        marginBottom: '0.65rem',
        padding: '0.55rem 0.65rem',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
        borderRadius: 6,
        maxWidth: 560,
      }}
    >
      <span style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Fela Kuti — percussion feel
      </span>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Auto follows posture→feel mapping (same defaults as the engine). Manual overrides send{' '}
        <strong style={{ color: 'var(--text)' }}>felaPercussionFeelOverride</strong> on Generate.
      </p>
      <div
        role="group"
        aria-label="Percussion feel"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.55rem' }}
      >
        {FEEL_OPTIONS.map(({ mode, label }) => {
          const active = props.feelMode === mode;
          return (
            <button
              key={mode}
              type="button"
              disabled={props.disabled}
              onClick={() => props.onFeelModeChange(mode)}
              style={{
                padding: '0.25rem 0.45rem',
                fontSize: '0.78rem',
                borderRadius: 4,
                border: `1px solid ${active ? 'var(--accent, #6366f1)' : 'var(--border-subtle, rgba(128,128,128,0.35))'}`,
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: 'var(--text)',
                cursor: props.disabled ? 'default' : 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p style={{ margin: '0 0 0.45rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        Effective tag: <strong style={{ color: 'var(--text)' }}>{tag}</strong>
        {props.feelMode === 'auto' ? ' · preview assumes default posture zombie_1977' : ''}
      </p>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>Pattern preview (16 steps)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '72px repeat(16, minmax(0, 1fr))', gap: '3px 4px', alignItems: 'center' }}>
        <span />
        {Array.from({ length: 16 }, (_, i) => (
          <span key={`h-${i}`} style={{ textAlign: 'center', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            {i + 1}
          </span>
        ))}
        {ROWS.map((row) => (
          <Fragment key={row.key}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{row.label}</span>
            {pattern[row.key].map((cell, i) => (
              <div
                key={`${row.key}-${i}`}
                title={`${row.label} step ${i + 1}`}
                style={{
                  height: 14,
                  borderRadius: 2,
                  background: cell ? 'var(--accent, #6366f1)' : 'rgba(128,128,128,0.15)',
                }}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
