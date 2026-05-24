import type { SlonimskyHarmonicVoiceMode } from '../constants/slonimskyHarmonicVoices';
import { slonimskyHarmonicVoiceOptionsForMode } from '../constants/slonimskyHarmonicVoices';
import {
  SLONIMSKY_FLAVOR_DISPLAY,
  SLONIMSKY_FLAVOR_ORDER,
  SLONIMSKY_FLAVOR_GENRE_HINT,
  SLONIMSKY_FLAVOR_SHORT_TOOLTIP,
  SLONIMSKY_KNOB_TOOLTIP,
} from '../constants/slonimskyUxCopy';
import type { SlonimskyMacroState } from '../types/slonimskyMacroState';
import {
  isSlonimskyGenericVoiceWarning,
  SLONIMSKY_GENERIC_VOICE_OPTION_SUFFIX,
  slonimskyGbdWriterWarningBody,
  slonimskySongModeWriterWarningBody,
} from '../constants/slonimskyHarmonicVoices';

function clampKnob(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

function formatKnob(n: number): string {
  const v = clampKnob(n);
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

export function SlonimskyUniversalPanel({
  state,
  onChange,
  disabled = false,
  embedded = false,
  harmonicOnly = false,
  hideHarmonicVoice = false,
  harmonicVoiceMode = 'other',
  harmonicVoiceId = null,
  onHarmonicVoiceChange,
}: {
  state: SlonimskyMacroState;
  onChange: (next: SlonimskyMacroState) => void;
  disabled?: boolean;
  embedded?: boolean;
  /** Harmonic voice selector only (e.g. GBD). */
  harmonicOnly?: boolean;
  /** When true, omit harmonic voice dropdown (e.g. voice lives on {@link SlonimskyGbdPanel}). */
  hideHarmonicVoice?: boolean;
  harmonicVoiceMode?: SlonimskyHarmonicVoiceMode;
  harmonicVoiceId?: string | null;
  onHarmonicVoiceChange?: (id: string | null) => void;
}) {
  const patch = (partial: Partial<SlonimskyMacroState>) => onChange({ ...state, ...partial });
  const voiceOptions = slonimskyHarmonicVoiceOptionsForMode(harmonicVoiceMode);
  const showMacro = !harmonicOnly;
  const showHarmonicVoice = !hideHarmonicVoice && onHarmonicVoiceChange && voiceOptions.length > 0;

  function harmonicVoiceWarningBody(id: string): string {
    const gbd = slonimskyGbdWriterWarningBody(id);
    if (gbd) return gbd;
    return slonimskySongModeWriterWarningBody(id);
  }

  return (
    <div
      style={
        embedded
          ? { marginBottom: '0.65rem' }
          : {
              marginTop: '0.75rem',
              marginBottom: '1rem',
              padding: '0.85rem 1rem',
              maxWidth: 720,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-panel, rgba(0,0,0,0.12))',
            }
      }
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.35rem',
          marginBottom: '0.65rem',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Slonimsky</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Macro → chromatic / blend / duo intent
        </span>
      </div>

      {showMacro ? (
      <div style={{ marginBottom: '0.75rem' }}>
        <span
          style={{
            display: 'block',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            marginBottom: 6,
            letterSpacing: '0.02em',
          }}
        >
          Flavor
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {SLONIMSKY_FLAVOR_ORDER.map((id) => {
            const on = state.sourcePreset === id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                title={`${SLONIMSKY_FLAVOR_SHORT_TOOLTIP[id]} — ${SLONIMSKY_FLAVOR_GENRE_HINT[id]}`}
                onClick={() => patch({ sourcePreset: id })}
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
                {SLONIMSKY_FLAVOR_DISPLAY[id]}
              </button>
            );
          })}
        </div>
      </div>
      ) : null}

      {showHarmonicVoice ? (
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              marginBottom: 6,
            }}
          >
            Harmonic Voice
          </label>
          <select
            value={harmonicVoiceId ?? ''}
            disabled={disabled}
            onChange={(e) => onHarmonicVoiceChange(e.target.value ? e.target.value : null)}
            style={{
              width: '100%',
              maxWidth: 320,
              padding: '0.45rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
              color: 'var(--text)',
            }}
          >
            <option value="">None (engine auto-resolves)</option>
            {voiceOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
                {v.genericVoiceWarning ? SLONIMSKY_GENERIC_VOICE_OPTION_SUFFIX : ''}
              </option>
            ))}
          </select>
          {harmonicVoiceId != null && isSlonimskyGenericVoiceWarning(harmonicVoiceId) ? (
            <p
              style={{
                margin: '0.35rem 0 0',
                fontSize: '0.72rem',
                color: 'rgb(180, 120, 20)',
              }}
            >
              {harmonicVoiceWarningBody(harmonicVoiceId)}
            </p>
          ) : null}
        </div>
      ) : null}

      {showMacro ? (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.65rem 1rem',
        }}
      >
        {(['motion', 'tension', 'variation'] as const).map((key) => (
          <label key={key} style={{ display: 'block', fontSize: '0.82rem' }}>
            <span
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
                color: 'var(--text-muted)',
                fontSize: '0.72rem',
              }}
              title={SLONIMSKY_KNOB_TOOLTIP[key]}
            >
              <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {formatKnob(state[key])}
              </span>
            </span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              disabled={disabled}
              value={clampKnob(state[key])}
              onChange={(e) => patch({ [key]: clampKnob(Number(e.target.value)) })}
              style={{ width: '100%' }}
              aria-label={`${key} (-1 to +1)`}
              title={SLONIMSKY_KNOB_TOOLTIP[key]}
            />
          </label>
        ))}
      </div>
      ) : null}
    </div>
  );
}
