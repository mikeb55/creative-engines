import { useMemo } from 'react';
import { chromaticStrengthToOutsideLevel } from '@composer-os/core/slonimsky/slonimskyPatternService';
import type { GenerateRequest } from '@composer-os/app-api/appApiTypes';
import type { SlonimskyMacroState } from '../../types/slonimskyMacroState';
import {
  SLONIMSKY_GBD_WRITERS,
  slonimskyGbdWriterPresets,
  type SlonimskyGbdWriterId,
} from '../../types/slonimskyGbdState';
import {
  SLONIMSKY_FLAVOR_DISPLAY,
  SLONIMSKY_FLAVOR_LONG_DESCRIPTION,
  SLONIMSKY_GBD_WRITER_ONE_LINER,
} from '../../constants/slonimskyUxCopy';
import {
  isSlonimskyGenericVoiceWarning,
  SLONIMSKY_GENERIC_VOICE_OPTION_SUFFIX,
  slonimskyGbdWriterWarningBody,
} from '../../constants/slonimskyHarmonicVoices';

export type GbdChromaticStrength = NonNullable<GenerateRequest['chromaticStrength']>;

const CHROMATIC_OPTIONS: { value: GbdChromaticStrength; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'prominent', label: 'Prominent' },
];

const OUTSIDE_LEVEL_OPTIONS: { value: GbdChromaticStrength; label: string }[] = [
  { value: 'off', label: '0' },
  { value: 'subtle', label: '1' },
  { value: 'prominent', label: '2' },
];

const WRITER_LABELS: Record<SlonimskyGbdWriterId, string> = {
  nile_rodgers: 'Nile Rodgers',
  eddie_van_halen: 'Eddie Van Halen',
  larry_carlton: 'Larry Carlton',
  david_gilmour: 'David Gilmour',
  hendrix: 'Jimi Hendrix',
  fripp: 'Robert Fripp',
  wes_montgomery: 'Wes Montgomery',
  joe_pass: 'Joe Pass',
  allan_holdsworth: 'Allan Holdsworth',
  scott_henderson: 'Scott Henderson',
};

function isGbdWriter(id: string): id is SlonimskyGbdWriterId {
  return (SLONIMSKY_GBD_WRITERS as readonly string[]).includes(id);
}

export function outsideLevelLabel(cs: GbdChromaticStrength): string {
  const level = chromaticStrengthToOutsideLevel(cs);
  if (level === 0) return 'allowedOutsideLevel 0 — chord-tone anchors';
  if (level === 1) return 'allowedOutsideLevel 1 — light outside';
  return 'allowedOutsideLevel 2 — full intervallic patterns';
}

type SlonimskyGbdPanelChromaticOnlyProps = {
  chromaticOnly: true;
  panelTitle?: string;
  chromaticStrength: GbdChromaticStrength;
  onChromaticStrengthChange: (v: GbdChromaticStrength) => void;
  /** Numeric 0 | 1 | 2 labels (riff generator). */
  outsideLevelNumericLabels?: boolean;
  disabled?: boolean;
};

type SlonimskyGbdPanelFullProps = {
  chromaticOnly?: false;
  writerId: SlonimskyGbdWriterId;
  onWriterIdChange: (id: SlonimskyGbdWriterId) => void;
  state: SlonimskyMacroState;
  onChange: (s: SlonimskyMacroState) => void;
  chromaticStrength: GbdChromaticStrength;
  onChromaticStrengthChange: (v: GbdChromaticStrength) => void;
  disabled?: boolean;
};

export type SlonimskyGbdPanelProps = SlonimskyGbdPanelChromaticOnlyProps | SlonimskyGbdPanelFullProps;

function OutsideLevelSection({
  chromaticStrength,
  onChromaticStrengthChange,
  disabled,
  numericLabels,
}: {
  chromaticStrength: GbdChromaticStrength;
  onChromaticStrengthChange: (v: GbdChromaticStrength) => void;
  disabled?: boolean;
  numericLabels?: boolean;
}) {
  const options = numericLabels ? OUTSIDE_LEVEL_OPTIONS : CHROMATIC_OPTIONS;
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.45rem' }}>Outside level</div>
      <label style={{ display: 'block', fontSize: '0.82rem' }}>
        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          {numericLabels
            ? 'Outside level (0–2) → slonimskyAllowedOutsideOverride'
            : 'Chromatic strength → slonimskyAllowedOutsideOverride'}
        </span>
        <select
          value={chromaticStrength}
          disabled={disabled}
          onChange={(e) => onChromaticStrengthChange(e.target.value as GbdChromaticStrength)}
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
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <p style={{ margin: '0.45rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        {outsideLevelLabel(chromaticStrength)}
      </p>
    </div>
  );
}

export function SlonimskyGbdPanel(props: SlonimskyGbdPanelProps) {
  if (props.chromaticOnly) {
    return (
      <div
        style={{
          marginTop: '0.5rem',
          marginBottom: '1rem',
          padding: '0.85rem 1rem',
          maxWidth: 420,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--bg-panel, rgba(0,0,0,0.12))',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.55rem' }}>
          {props.panelTitle ?? 'Slonimsky Outside Level'}
        </div>
        <OutsideLevelSection
          chromaticStrength={props.chromaticStrength}
          onChromaticStrengthChange={props.onChromaticStrengthChange}
          disabled={props.disabled}
          numericLabels={props.outsideLevelNumericLabels}
        />
      </div>
    );
  }

  const { writerId, onWriterIdChange, state, onChange, chromaticStrength, onChromaticStrengthChange, disabled } =
    props;
  const presets = useMemo(() => slonimskyGbdWriterPresets(writerId), [writerId]);
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
        Guitar–Bass Duo — Slonimsky presets
      </div>

      <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.65rem' }}>
        <span
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          <span>Voice</span>
          <span
            aria-label={`Selected voice: ${WRITER_LABELS[writerId]}`}
            style={{
              fontSize: '0.78rem',
              padding: '0.15rem 0.55rem',
              borderRadius: 999,
              border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
              background: 'rgba(100,160,255,0.1)',
              color: 'var(--text)',
            }}
          >
            {WRITER_LABELS[writerId]}
            {isSlonimskyGenericVoiceWarning(writerId) ? (
              <span style={{ color: 'rgb(180, 120, 20)' }} title={slonimskyGbdWriterWarningBody(writerId)}>
                {' '}
                ⚠
              </span>
            ) : null}
          </span>
        </span>
        <select
          value={writerId}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            if (!isGbdWriter(v)) return;
            onWriterIdChange(v);
            const first = slonimskyGbdWriterPresets(v)[0];
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
          {SLONIMSKY_GBD_WRITERS.map((id) => (
            <option key={id} value={id} title={SLONIMSKY_GBD_WRITER_ONE_LINER[id]}>
              {WRITER_LABELS[id]}
              {isSlonimskyGenericVoiceWarning(id) ? SLONIMSKY_GENERIC_VOICE_OPTION_SUFFIX : ''}
            </option>
          ))}
        </select>
        {isSlonimskyGenericVoiceWarning(writerId) ? (
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.72rem',
              color: 'rgb(180, 120, 20)',
            }}
          >
            {slonimskyGbdWriterWarningBody(writerId)}
          </p>
        ) : null}
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
          Voice preset
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {presets.map((p) => {
            const on = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                title={SLONIMSKY_FLAVOR_LONG_DESCRIPTION[p.macro.sourcePreset]}
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
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          Active flavor: {SLONIMSKY_FLAVOR_DISPLAY[state.sourcePreset]}
        </p>
      </div>

      <OutsideLevelSection
        chromaticStrength={chromaticStrength}
        onChromaticStrengthChange={onChromaticStrengthChange}
        disabled={disabled}
      />
    </div>
  );
}
