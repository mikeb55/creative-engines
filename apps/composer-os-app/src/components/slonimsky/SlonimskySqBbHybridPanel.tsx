import type { CSSProperties, ReactNode } from 'react';
import type {
  SlonimskySqBbHybridState,
  SqBbEnsembleRelationship,
  SqBbForegroundOwner,
} from '../../types/slonimskySqBbHybridState';

/** Matches {@link SqToBbWorkflowPanel} zone/bar chrome — not a second workflow surface. */
const zoneShell: CSSProperties = {
  marginBottom: '1rem',
  padding: '0.75rem 0.85rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'rgba(0, 0, 0, 0.03)',
};

const zoneTitle: CSSProperties = {
  margin: '0 0 0.65rem',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

function HybridZone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={zoneShell}>
      <div style={zoneTitle}>{title}</div>
      {children}
    </div>
  );
}

function clampKnob(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

function formatKnob(n: number): string {
  const v = clampKnob(n);
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

function PresetChips<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: '0.65rem' }}>
      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {options.map((p) => {
          const on = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p.id)}
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
  );
}

function KnobField({
  label,
  leftHint,
  rightHint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  leftHint: string;
  rightHint: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.65rem' }}>
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
          color: 'var(--text-muted)',
          fontSize: '0.72rem',
        }}
      >
        <span>{label}</span>
        <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{formatKnob(value)}</span>
      </span>
      <input
        type="range"
        min={-1}
        max={1}
        step={0.01}
        disabled={disabled}
        value={clampKnob(value)}
        onChange={(e) => onChange(clampKnob(Number(e.target.value)))}
        style={{ width: '100%' }}
      />
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          marginTop: 2,
        }}
      >
        <span>{leftHint}</span>
        <span>{rightHint}</span>
      </span>
    </label>
  );
}

const RELATIONSHIP_OPTIONS: { id: SqBbEnsembleRelationship; label: string }[] = [
  { id: 'conversation', label: 'Conversation' },
  { id: 'contrast', label: 'Contrast' },
  { id: 'unison', label: 'Unison' },
  { id: 'call_and_response', label: 'Call & response' },
];

const FOREGROUND_OPTIONS: { id: SqBbForegroundOwner; label: string }[] = [
  { id: 'sq', label: 'SQ' },
  { id: 'bb', label: 'BB' },
  { id: 'alternating', label: 'Alternating' },
];

export function SlonimskySqBbHybridPanel({
  state,
  onChange,
  onRoute,
  routed,
  disabled = false,
}: {
  state: SlonimskySqBbHybridState;
  onChange: (s: SlonimskySqBbHybridState) => void;
  onRoute: () => void;
  routed?: boolean;
  disabled?: boolean;
}) {
  const patch = (partial: Partial<SlonimskySqBbHybridState>) => onChange({ ...state, ...partial });

  return (
    <div style={{ marginBottom: '0.75rem', maxWidth: 720 }}>
      <HybridZone title="SQ + BB — Slonimsky hybrid">
        <PresetChips
          label="Ensemble relationship"
          options={RELATIONSHIP_OPTIONS}
          value={state.ensembleRelationship}
          onChange={(ensembleRelationship) => patch({ ensembleRelationship })}
          disabled={disabled}
        />
        <PresetChips
          label="Foreground owner"
          options={FOREGROUND_OPTIONS}
          value={state.foregroundOwner}
          onChange={(foregroundOwner) => patch({ foregroundOwner })}
          disabled={disabled}
        />
        <KnobField
          label="Density split"
          leftHint="SQ dominant"
          rightHint="BB dominant"
          value={state.densitySplit}
          onChange={(densitySplit) => patch({ densitySplit })}
          disabled={disabled}
        />
        <KnobField
          label="Register carve"
          leftHint="SQ high · BB low"
          rightHint="SQ low · BB high"
          value={state.registerCarve}
          onChange={(registerCarve) => patch({ registerCarve })}
          disabled={disabled}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={onRoute}
          style={{
            fontSize: '0.82rem',
            padding: '0.45rem 0.85rem',
            borderRadius: 6,
            border: '1px solid var(--accent, #6ae)',
            background: routed ? 'rgba(100,160,255,0.18)' : 'rgba(100,160,255,0.08)',
            color: 'var(--text)',
            cursor: disabled ? 'default' : 'pointer',
          }}
        >
          {routed ? 'Routed to generate payload' : 'Route hybrid → generate'}
        </button>
      </HybridZone>
    </div>
  );
}
