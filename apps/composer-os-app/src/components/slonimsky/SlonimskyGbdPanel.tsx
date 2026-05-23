import { chromaticStrengthToOutsideLevel } from '@composer-os/core/slonimsky/slonimskyPatternService';
import type { GenerateRequest } from '@composer-os/app-api/appApiTypes';

export type GbdChromaticStrength = NonNullable<GenerateRequest['chromaticStrength']>;

const OPTIONS: { value: GbdChromaticStrength; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'prominent', label: 'Prominent' },
];

export function outsideLevelLabel(cs: GbdChromaticStrength): string {
  const level = chromaticStrengthToOutsideLevel(cs);
  if (level === 0) return 'allowedOutsideLevel 0 — chord-tone anchors';
  if (level === 1) return 'allowedOutsideLevel 1 — light outside';
  return 'allowedOutsideLevel 2 — full intervallic patterns';
}

export function SlonimskyGbdPanel({
  chromaticStrength,
  onChromaticStrengthChange,
  disabled = false,
}: {
  chromaticStrength: GbdChromaticStrength;
  onChromaticStrengthChange: (v: GbdChromaticStrength) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        marginTop: '0.75rem',
        marginBottom: '1rem',
        padding: '0.85rem 1rem',
        maxWidth: 420,
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-panel, rgba(0,0,0,0.12))',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.55rem' }}>Slonimsky Outside Level</div>
      <label style={{ display: 'block', fontSize: '0.82rem' }}>
        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          Chromatic strength → slonimskyAllowedOutsideOverride
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
          {OPTIONS.map((o) => (
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
