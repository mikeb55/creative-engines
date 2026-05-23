import type { CSSProperties } from 'react';
import {
  ZAPPA_CHAIN_DEPTH_OPTIONS,
  ZAPPA_ERA_PRESET_OPTIONS,
  ZAPPA_PHRASE_CHARACTER_OPTIONS,
  ZAPPA_SYMMETRY_BIAS_OPTIONS,
  type ZappaChainDepthUi,
  type ZappaEraPresetUi,
  type ZappaPhraseCharacterUi,
  type ZappaStyleModeUi,
  type ZappaSymmetryBiasUi,
} from '../../types/riffGeneratorUi';

const labelMuted: CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
};
const controlStyle: CSSProperties = {
  padding: '0.45rem 0.6rem',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-input, var(--bg))',
  color: 'var(--text)',
  width: '100%',
  maxWidth: 520,
};

export function SlonimskyZappaAdvancedSection({
  disabled,
  zappaStyleMode,
  zappaEraPreset,
  zappaPhraseCharacter,
  zappaSymmetryBias,
  zappaChainDepth,
  onZappaStyleModeChange,
  onZappaEraPresetChange,
  onZappaPhraseCharacterChange,
  onZappaSymmetryBiasChange,
  onZappaChainDepthChange,
}: {
  disabled?: boolean;
  zappaStyleMode: ZappaStyleModeUi;
  zappaEraPreset: ZappaEraPresetUi;
  zappaPhraseCharacter: ZappaPhraseCharacterUi;
  zappaSymmetryBias: ZappaSymmetryBiasUi;
  zappaChainDepth: ZappaChainDepthUi;
  onZappaStyleModeChange: (mode: ZappaStyleModeUi) => void;
  onZappaEraPresetChange: (era: ZappaEraPresetUi) => void;
  onZappaPhraseCharacterChange: (phrase: ZappaPhraseCharacterUi) => void;
  onZappaSymmetryBiasChange: (bias: ZappaSymmetryBiasUi) => void;
  onZappaChainDepthChange: (depth: ZappaChainDepthUi) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: '0.55rem', marginTop: '0.55rem' }}>
      <div>
        <label style={labelMuted} htmlFor="co-slonimsky-zappa-style-mode">
          Zappa style mode
        </label>
        <select
          id="co-slonimsky-zappa-style-mode"
          style={controlStyle}
          value={zappaStyleMode}
          disabled={disabled}
          onChange={(e) => onZappaStyleModeChange(e.target.value as ZappaStyleModeUi)}
        >
          <option value="compositional">Compositional — structured, meter-disrupted, fragmented</option>
          <option value="bluesrockFerocious">
            Blues-Rock Ferocity — modal, dense, fret-burning pedal vamps
          </option>
        </select>
      </div>
      <div>
        <label style={labelMuted} htmlFor="co-slonimsky-zappa-era">
          Era preset (rhythmic cells)
        </label>
        <select
          id="co-slonimsky-zappa-era"
          style={controlStyle}
          value={zappaEraPreset}
          disabled={disabled}
          onChange={(e) => onZappaEraPresetChange(e.target.value as ZappaEraPresetUi)}
        >
          {ZAPPA_ERA_PRESET_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelMuted} htmlFor="co-slonimsky-zappa-phrase">
          Phrase character
        </label>
        <select
          id="co-slonimsky-zappa-phrase"
          style={controlStyle}
          value={zappaPhraseCharacter}
          disabled={disabled}
          onChange={(e) => onZappaPhraseCharacterChange(e.target.value as ZappaPhraseCharacterUi)}
        >
          {ZAPPA_PHRASE_CHARACTER_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelMuted} htmlFor="co-slonimsky-zappa-symmetry">
          Symmetry / tritone bias
        </label>
        <select
          id="co-slonimsky-zappa-symmetry"
          style={controlStyle}
          value={zappaSymmetryBias}
          disabled={disabled}
          onChange={(e) => onZappaSymmetryBiasChange(e.target.value as ZappaSymmetryBiasUi)}
        >
          {ZAPPA_SYMMETRY_BIAS_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelMuted} htmlFor="co-slonimsky-zappa-chain">
          Cell chain depth
        </label>
        <select
          id="co-slonimsky-zappa-chain"
          style={controlStyle}
          value={zappaChainDepth}
          disabled={disabled}
          onChange={(e) => onZappaChainDepthChange(Number(e.target.value) as ZappaChainDepthUi)}
        >
          {ZAPPA_CHAIN_DEPTH_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
