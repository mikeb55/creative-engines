import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { StringQuartetTritonicColour } from '../../../../../engines/composer-os-v2/core/string-quartet/stringQuartetMusicContextTypes';
import type { StringQuartetTextureArchetype } from '../../../../../engines/composer-os-v2/core/string-quartet/stringQuartetMusicContextTypes';
import { STRING_QUARTET_TEXTURE_ARCHETYPES } from '../../../../../engines/composer-os-v2/core/string-quartet/stringQuartetMusicContextTypes';
import type { TritonicBehaviourBiases } from '../../../../../engines/composer-os-v2/core/tritonic/tritonicBehaviourBiases';
import { NEUTRAL_TRITONIC_BEHAVIOUR_BIAS } from '../../../../../engines/composer-os-v2/core/tritonic/tritonicBehaviourBiases';

export type SqRealisationReceiptPayload = {
  voiceCrossingCount?: number;
  lowRegisterCrowdingCount?: number;
  outerVoiceParallelsCount?: number;
  meanLeapPerPart?: Record<string, number>;
  lineSmoothnessScore?: Record<string, number>;
  registralBalanceScore?: number;
  harmonicCompletenessScore?: number;
  textureStabilityScore?: number;
};

const TEXTURE_META: Record<
  StringQuartetTextureArchetype,
  { title: string; description: string; helper: string }
> = {
  chorale: {
    title: 'Chorale',
    description: 'Blended sustained harmony',
    helper: 'Four voices breathe as one vertical blend with minimal rhythmic contrast.',
  },
  arco_melody_accompaniment: {
    title: 'Arco melody + accompaniment',
    description: 'Melody led, inner voices support',
    helper: 'Violin I carries the line while inner parts fill harmonic gaps in arco support.',
  },
  pad_suspension: {
    title: 'Pad suspension',
    description: 'Long tones, atmospheric harmonic field',
    helper: 'Suspended colours hang over the bar grid; Tritonic float may colour the upper field.',
  },
  pizzicato_pulse: {
    title: 'Pizzicato pulse',
    description: 'Rhythmic articulation, lower three voices',
    helper: 'Short articulated attacks in the lower three; violin I may still sing above the pulse.',
  },
  tremolo_wash: {
    title: 'Tremolo wash',
    description: 'Unstable shimmer, energy over chord spelling',
    helper: 'Register shimmer and sustained tremolo energy matter more than crisp chord spelling.',
  },
  contrapuntal_weave: {
    title: 'Contrapuntal weave',
    description: 'Independent moving lines, implied harmony',
    helper: 'Each part keeps its own contour; harmony emerges from the crossing lines.',
  },
  duet_support: {
    title: 'Duet support',
    description: 'Two foreground voices, two anchors',
    helper: 'Two voices converse in front while viola and cello anchor register and rhythm.',
  },
};

const BIAS_FIELDS: { key: keyof TritonicBehaviourBiases; label: string }[] = [
  { key: 'tension', label: 'Tension' },
  { key: 'resolutionDelay', label: 'Resolution delay' },
  { key: 'density', label: 'Density' },
  { key: 'registralSpread', label: 'Registral spread' },
  { key: 'contourBias', label: 'Contour bias' },
  { key: 'cadenceAvoidance', label: 'Cadence avoidance' },
  { key: 'rhythmicDisplacement', label: 'Rhythmic displacement' },
  { key: 'anchorAdhesion', label: 'Anchor adhesion' },
  { key: 'motifSingability', label: 'Motif singability' },
];

export function defaultSqBiasesForColour(colour: StringQuartetTritonicColour): TritonicBehaviourBiases {
  const base = BIAS_FIELDS.reduce(
    (acc, { key }) => {
      acc[key] = NEUTRAL_TRITONIC_BEHAVIOUR_BIAS;
      return acc;
    },
    {} as TritonicBehaviourBiases,
  );
  if (colour === 'active') {
    return { ...base, tension: 0.65, density: 0.6, registralSpread: 0.7 };
  }
  if (colour === 'subtle') {
    return { ...base, tension: 0.45, registralSpread: 0.55 };
  }
  return base;
}

export function deriveSqStatusChips(payload: SqRealisationReceiptPayload | undefined) {
  if (!payload) {
    return {
      smoothLines: 'Mixed' as const,
      spacing: 'Stable' as const,
      crossings: 'Clean' as const,
    };
  }
  const smoothVals = payload.lineSmoothnessScore
    ? Object.values(payload.lineSmoothnessScore)
    : [];
  const avgSmooth =
    smoothVals.length > 0 ? smoothVals.reduce((a, b) => a + b, 0) / smoothVals.length : 0.5;
  const smoothLines = avgSmooth >= 0.7 ? 'Good' : avgSmooth >= 0.4 ? 'Mixed' : 'Rough';
  const spacing =
    (payload.lowRegisterCrowdingCount ?? 0) === 0 && (payload.registralBalanceScore ?? 1) >= 0.5
      ? 'Stable'
      : 'Crowded';
  const crossings =
    (payload.voiceCrossingCount ?? 0) === 0 && (payload.outerVoiceParallelsCount ?? 0) === 0
      ? 'Clean'
      : 'Needs attention';
  return { smoothLines, spacing, crossings } as const;
}

function chipStyle(tone: 'good' | 'warn' | 'neutral'): CSSProperties {
  const palette =
    tone === 'good'
      ? { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.45)', color: '#86efac' }
      : tone === 'warn'
        ? { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.45)', color: '#fde047' }
        : { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)', color: 'var(--text)' };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '0.25rem 0.55rem',
    borderRadius: 999,
    fontSize: '0.78rem',
    fontWeight: 600,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.color,
  };
}

function chipTone(label: string): 'good' | 'warn' | 'neutral' {
  if (label === 'Good' || label === 'Stable' || label === 'Clean') return 'good';
  if (label === 'Rough' || label === 'Crowded' || label === 'Needs attention') return 'warn';
  return 'neutral';
}

export function StringQuartetGeneratePanel(props: {
  textureArchetype: StringQuartetTextureArchetype;
  onTextureArchetypeChange: (v: StringQuartetTextureArchetype) => void;
  tonalCenter: string;
  onTonalCenterChange: (v: string) => void;
  bpm: number;
  onBpmChange: (v: number) => void;
  tritonicColour: StringQuartetTritonicColour;
  onTritonicColourChange: (v: StringQuartetTritonicColour) => void;
  behaviourBiases: TritonicBehaviourBiases;
  onBehaviourBiasChange: (key: keyof TritonicBehaviourBiases, value: number) => void;
  behaviourDisclosureOpen: boolean;
  onBehaviourDisclosureToggle: () => void;
  seed: number;
  onVariation: () => void;
  advancedOpen: boolean;
  onAdvancedToggle: () => void;
  resultReceipt?: SqRealisationReceiptPayload;
  disabled?: boolean;
}) {
  const {
    textureArchetype,
    onTextureArchetypeChange,
    tonalCenter,
    onTonalCenterChange,
    bpm,
    onBpmChange,
    tritonicColour,
    onTritonicColourChange,
    behaviourBiases,
    onBehaviourBiasChange,
    behaviourDisclosureOpen,
    onBehaviourDisclosureToggle,
    seed,
    onVariation,
    advancedOpen,
    onAdvancedToggle,
    resultReceipt,
    disabled = false,
  } = props;

  const helper = TEXTURE_META[textureArchetype].helper;
  const statusChips = useMemo(() => deriveSqStatusChips(resultReceipt), [resultReceipt]);

  return (
    <div
      style={{
        marginBottom: '1.25rem',
        padding: '1rem 1.1rem',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        maxWidth: 720,
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>String Quartet</h3>

      <div style={{ marginBottom: '0.85rem' }}>
        <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
          Texture archetype
        </span>
        <div
          role="radiogroup"
          aria-label="String quartet texture archetype"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
            gap: 8,
          }}
        >
          {STRING_QUARTET_TEXTURE_ARCHETYPES.map((id) => {
            const meta = TEXTURE_META[id];
            const selected = textureArchetype === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onTextureArchetypeChange(id)}
                style={{
                  textAlign: 'left',
                  padding: '0.55rem 0.65rem',
                  borderRadius: 8,
                  border: selected ? '2px solid var(--accent, #6366f1)' : '1px solid var(--border)',
                  background: selected ? 'rgba(99,102,241,0.12)' : 'var(--bg-input, var(--bg))',
                  color: 'var(--text)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  minHeight: 72,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 4 }}>{meta.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                  {meta.description}
                </div>
              </button>
            );
          })}
        </div>
        <p style={{ margin: '0.55rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          {helper}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
        <label style={{ display: 'block', minWidth: 160 }}>
          <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            Key / tonal centre
          </span>
          <input
            type="text"
            value={tonalCenter}
            onChange={(e) => onTonalCenterChange(e.target.value)}
            placeholder="C"
            disabled={disabled}
            style={{
              width: '100%',
              padding: '0.45rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
              color: 'var(--text)',
            }}
          />
        </label>
        <label style={{ display: 'block', minWidth: 120 }}>
          <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            Tempo (BPM)
          </span>
          <input
            type="number"
            min={20}
            max={300}
            value={bpm}
            onChange={(e) => onBpmChange(parseInt(e.target.value, 10) || 0)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '0.45rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
              color: 'var(--text)',
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '0.85rem' }}>
        <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
          Tritonic colour
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {(['none', 'subtle', 'active'] as const).map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => onTritonicColourChange(c)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 999,
                border:
                  tritonicColour === c
                    ? '2px solid var(--accent, #6366f1)'
                    : '1px solid var(--border)',
                background:
                  tritonicColour === c ? 'rgba(99,102,241,0.12)' : 'var(--bg-input, var(--bg))',
                color: 'var(--text)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textTransform: 'capitalize',
                fontSize: '0.82rem',
              }}
            >
              {c}
            </button>
          ))}
          {tritonicColour !== 'none' ? (
            <button
              type="button"
              className="secondary"
              disabled={disabled}
              onClick={onBehaviourDisclosureToggle}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem' }}
            >
              Edit behaviour {behaviourDisclosureOpen ? '▲' : '▼'}
            </button>
          ) : null}
        </div>
        {tritonicColour !== 'none' && behaviourDisclosureOpen ? (
          <div
            style={{
              marginTop: 8,
              padding: '0.65rem 0.75rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
            }}
          >
            {BIAS_FIELDS.map(({ key, label }) => (
              <label key={key} style={{ display: 'block', marginBottom: 8, fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>{label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{behaviourBiases[key].toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={behaviourBiases[key]}
                  disabled={disabled}
                  onChange={(e) => onBehaviourBiasChange(key, parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Seed{' '}
          <code
            style={{
              marginLeft: 4,
              padding: '0.2rem 0.45rem',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          >
            {seed}
          </code>
        </label>
        <button type="button" className="secondary" disabled={disabled} onClick={onVariation}>
          Variation
        </button>
      </div>

      {resultReceipt ? (
        <div style={{ marginBottom: '0.85rem' }}>
          <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            Realisation status
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={chipStyle(chipTone(statusChips.smoothLines))}>
              Smooth lines: {statusChips.smoothLines}
            </span>
            <span style={chipStyle(chipTone(statusChips.spacing))}>Spacing: {statusChips.spacing}</span>
            <span style={chipStyle(chipTone(statusChips.crossings))}>
              Crossings &amp; parallels: {statusChips.crossings}
            </span>
          </div>
        </div>
      ) : null}

      <details
        open={advancedOpen}
        onToggle={(e) => {
          if (e.currentTarget.open !== advancedOpen) {
            onAdvancedToggle();
          }
        }}
      >
        <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
          Advanced diagnostics
        </summary>
        <div style={{ marginTop: '0.65rem', fontSize: '0.78rem', lineHeight: 1.5 }}>
          {resultReceipt ? (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              <li>voiceCrossingCount: {resultReceipt.voiceCrossingCount ?? 0}</li>
              <li>lowRegisterCrowdingCount: {resultReceipt.lowRegisterCrowdingCount ?? 0}</li>
              <li>outerVoiceParallelsCount: {resultReceipt.outerVoiceParallelsCount ?? 0}</li>
              <li>
                meanLeapPerPart:{' '}
                {resultReceipt.meanLeapPerPart
                  ? Object.entries(resultReceipt.meanLeapPerPart)
                      .map(([k, v]) => `${k}=${v.toFixed(2)}`)
                      .join(', ')
                  : '—'}
              </li>
              <li>
                lineSmoothnessScore:{' '}
                {resultReceipt.lineSmoothnessScore
                  ? Object.entries(resultReceipt.lineSmoothnessScore)
                      .map(([k, v]) => `${k}=${v.toFixed(2)}`)
                      .join(', ')
                  : '—'}
              </li>
              <li>registralBalanceScore: {(resultReceipt.registralBalanceScore ?? 0).toFixed(2)}</li>
              <li>harmonicCompletenessScore: {(resultReceipt.harmonicCompletenessScore ?? 0).toFixed(2)}</li>
              <li>textureStabilityScore: {(resultReceipt.textureStabilityScore ?? 0).toFixed(2)}</li>
            </ul>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Generate once to populate full diagnostic fields.
            </p>
          )}
          {tritonicColour !== 'none' && advancedOpen ? (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Tritonic behaviour biases</div>
              {BIAS_FIELDS.map(({ key, label }) => (
                <label key={`adv-${key}`} style={{ display: 'block', marginBottom: 8 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>{label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{behaviourBiases[key].toFixed(2)}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={behaviourBiases[key]}
                    disabled={disabled}
                    onChange={(e) => onBehaviourBiasChange(key, parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
