import type { StyleBlendColour, StyleBlendPrimary, StyleBlendSecondary } from '../services/styleBlendTypes';

export type StyleBlendState = {
  primary: StyleBlendPrimary;
  secondary: StyleBlendSecondary;
  colour: StyleBlendColour;
};

type Props = {
  blend: StyleBlendState;
  onChange: (b: StyleBlendState) => void;
  hasSecondary: boolean;
  hasColour: boolean;
  disabled: boolean;
};

export function StyleBlendControls({ blend, onChange, hasSecondary, hasColour, disabled }: Props) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <span style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Style Blend
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <span style={{ minWidth: 88, color: 'var(--text-muted)' }}>Primary</span>
          <select
            value={blend.primary}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...blend, primary: e.target.value as StyleBlendPrimary })
            }
          >
            <option value="strong">Strong</option>
            <option value="medium">Medium</option>
            <option value="light">Light</option>
          </select>
        </label>
        {hasSecondary ? (
          <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ minWidth: 88, color: 'var(--text-muted)' }}>Secondary</span>
            <select
              value={blend.secondary}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...blend, secondary: e.target.value as StyleBlendSecondary })
              }
            >
              <option value="off">Off</option>
              <option value="light">Light</option>
              <option value="medium">Medium</option>
            </select>
          </label>
        ) : null}
        {hasColour ? (
          <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ minWidth: 88, color: 'var(--text-muted)' }}>Colour</span>
            <select
              value={blend.colour}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...blend, colour: e.target.value as StyleBlendColour })
              }
            >
              <option value="off">Off</option>
              <option value="subtle">Subtle</option>
              <option value="present">Present</option>
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
