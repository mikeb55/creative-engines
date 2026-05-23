import type { SlonimskyHarmonicVoiceMode } from '../../constants/slonimskyHarmonicVoices';
import type { SlonimskyMacroState } from '../../types/slonimskyMacroState';
import type {
  BigBandSlonimskyMiddleState,
  BigBandSlonimskyEnsemblePreset,
  BigBandSlonimskySectionRole,
  StringQuartetSlonimskyMiddleState,
  StringQuartetSlonimskyEnsemblePreset,
  StringQuartetSlonimskyTextureRole,
} from '../../types/slonimskyEnsembleState';
import { SlonimskyUniversalPanel } from '../SlonimskyUniversalPanel';

function clampKnob(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

function formatKnob(n: number): string {
  const v = clampKnob(n);
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

function KnobField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'block', fontSize: '0.82rem' }}>
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
    </label>
  );
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

const BB_SECTION_ROLES: { id: BigBandSlonimskySectionRole; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'support', label: 'Support' },
  { id: 'counter', label: 'Counter' },
];

const BB_ENSEMBLE_PRESETS: { id: BigBandSlonimskyEnsemblePreset; label: string }[] = [
  { id: 'orchestral', label: 'Orchestral' },
  { id: 'funk', label: 'Funk' },
  { id: 'bebop', label: 'Bebop' },
  { id: 'fusion', label: 'Fusion' },
];

const SQ_TEXTURE_ROLES: { id: StringQuartetSlonimskyTextureRole; label: string }[] = [
  { id: 'melody', label: 'Melody' },
  { id: 'accompaniment', label: 'Accompaniment' },
  { id: 'counterpoint', label: 'Counterpoint' },
];

const SQ_ENSEMBLE_PRESETS: { id: StringQuartetSlonimskyEnsemblePreset; label: string }[] = [
  { id: 'romantic', label: 'Romantic' },
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'baroque', label: 'Baroque' },
];

function BigBandMiddleLayer({
  state,
  onChange,
  disabled,
}: {
  state: BigBandSlonimskyMiddleState;
  onChange: (s: BigBandSlonimskyMiddleState) => void;
  disabled?: boolean;
}) {
  const patch = (p: Partial<BigBandSlonimskyMiddleState>) => onChange({ ...state, ...p });
  return (
    <div
      style={{
        marginTop: '0.85rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle, rgba(128,128,128,0.28))',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.55rem' }}>Big Band — section Slonimsky</div>
      <PresetChips
        label="Section role"
        options={BB_SECTION_ROLES}
        value={state.sectionRole}
        onChange={(sectionRole) => patch({ sectionRole })}
        disabled={disabled}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.65rem 1rem',
          marginBottom: '0.75rem',
        }}
      >
        <KnobField
          label="Cohesion"
          value={state.cohesion}
          onChange={(cohesion) => patch({ cohesion })}
          disabled={disabled}
        />
        <KnobField
          label="Harmonic grip"
          value={state.harmonicGrip}
          onChange={(harmonicGrip) => patch({ harmonicGrip })}
          disabled={disabled}
        />
      </div>
      <PresetChips
        label="Preset vocabulary"
        options={BB_ENSEMBLE_PRESETS}
        value={state.ensemblePreset}
        onChange={(ensemblePreset) => patch({ ensemblePreset })}
        disabled={disabled}
      />
    </div>
  );
}

function StringQuartetMiddleLayer({
  state,
  onChange,
  disabled,
  ensembleCellReceipts,
}: {
  state: StringQuartetSlonimskyMiddleState;
  onChange: (s: StringQuartetSlonimskyMiddleState) => void;
  disabled?: boolean;
  ensembleCellReceipts?: string[];
}) {
  const patch = (p: Partial<StringQuartetSlonimskyMiddleState>) => onChange({ ...state, ...p });
  return (
    <div
      style={{
        marginTop: '0.85rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle, rgba(128,128,128,0.28))',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.55rem' }}>
        String Quartet — texture Slonimsky
      </div>
      <PresetChips
        label="Texture role"
        options={SQ_TEXTURE_ROLES}
        value={state.textureRole}
        onChange={(textureRole) => patch({ textureRole })}
        disabled={disabled}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.65rem 1rem',
          marginBottom: '0.75rem',
        }}
      >
        <KnobField
          label="Voice independence"
          value={state.voiceIndependence}
          onChange={(voiceIndependence) => patch({ voiceIndependence })}
          disabled={disabled}
        />
        <KnobField
          label="Register spread"
          value={state.registerSpread}
          onChange={(registerSpread) => patch({ registerSpread })}
          disabled={disabled}
        />
      </div>
      <PresetChips
        label="Preset vocabulary"
        options={SQ_ENSEMBLE_PRESETS}
        value={state.ensemblePreset}
        onChange={(ensemblePreset) => patch({ ensemblePreset })}
        disabled={disabled}
      />
      <div style={{ marginTop: '0.65rem' }}>
        <span
          style={{
            display: 'block',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            marginBottom: 6,
            letterSpacing: '0.02em',
          }}
        >
          slonimskyEnsembleCellReceipts (manifest)
        </span>
        {ensembleCellReceipts && ensembleCellReceipts.length > 0 ? (
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.1rem',
              fontSize: '0.68rem',
              fontFamily: 'ui-monospace, monospace',
              color: 'var(--text-muted)',
              maxHeight: 96,
              overflowY: 'auto',
            }}
          >
            {ensembleCellReceipts.map((line) => (
              <li key={line} style={{ marginBottom: 2 }}>
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Run Generate with MusicXML export to echo z11:sq cell receipts here.
          </p>
        )}
      </div>
    </div>
  );
}

export function SlonimskyEnsemblePanel(
  props:
    | {
        mode: 'big_band';
        macro: SlonimskyMacroState;
        onMacroChange: (s: SlonimskyMacroState) => void;
        middle: BigBandSlonimskyMiddleState;
        onMiddleChange: (s: BigBandSlonimskyMiddleState) => void;
        harmonicVoiceId?: string | null;
        onHarmonicVoiceChange?: (id: string | null) => void;
        disabled?: boolean;
      }
    | {
        mode: 'string_quartet';
        macro: SlonimskyMacroState;
        onMacroChange: (s: SlonimskyMacroState) => void;
        middle: StringQuartetSlonimskyMiddleState;
        onMiddleChange: (s: StringQuartetSlonimskyMiddleState) => void;
        harmonicVoiceId?: string | null;
        onHarmonicVoiceChange?: (id: string | null) => void;
        disabled?: boolean;
        ensembleCellReceipts?: string[];
      }
) {
  const { mode, macro, onMacroChange, disabled } = props;
  const harmonicVoiceMode: SlonimskyHarmonicVoiceMode = mode === 'big_band' ? 'big_band' : 'string_quartet';
  return (
    <div
      style={{
        marginTop: '0.75rem',
        marginBottom: '1rem',
        padding: '0.85rem 1rem',
        maxWidth: 720,
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-panel, rgba(0,0,0,0.12))',
      }}
    >
      <SlonimskyUniversalPanel
        state={macro}
        onChange={onMacroChange}
        disabled={disabled}
        embedded
        harmonicVoiceMode={harmonicVoiceMode}
        harmonicVoiceId={props.harmonicVoiceId}
        onHarmonicVoiceChange={props.onHarmonicVoiceChange}
      />
      {mode === 'big_band' ? (
        <BigBandMiddleLayer
          state={props.middle}
          onChange={props.onMiddleChange}
          disabled={disabled}
        />
      ) : (
        <StringQuartetMiddleLayer
          state={props.middle}
          onChange={props.onMiddleChange}
          disabled={disabled}
          ensembleCellReceipts={props.ensembleCellReceipts}
        />
      )}
    </div>
  );
}
