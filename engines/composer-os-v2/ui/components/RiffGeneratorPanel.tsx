import { useMemo, type CSSProperties } from 'react';
import type { RiffDensity, RiffGridMode, RiffLineMode } from '../../core/riff-generator/riffTypes';
import {
  RIFF_BAR_STEP_VALUES,
  RIFF_DENSITY_UI_OPTIONS,
  RIFF_FAMILY_OPTIONS,
  RIFF_ODD_METER_NONE,
  RIFF_ODD_METER_PRESETS,
  riffFamilyShowsMeterPicker,
  riffVrbOptionById,
  riffVrbOptionsForFamily,
  riffVrbUiIndicators,
  type RiffBarCount,
  type RiffFamilyTag,
  type RiffOddMeterSelectValue,
  clampRiffBarCount,
  defaultRiffVrbIdForFamily,
} from '../riffGeneratorUi';

const labelMuted: CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
};
const controlStyle: CSSProperties = {
  padding: '0.45rem 0.6rem',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-input, var(--bg))',
  color: 'var(--text)',
};
const zoneShell: CSSProperties = {
  marginBottom: '1rem',
  maxWidth: 620,
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
const flexWrap: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem' };
const badgeStyle: CSSProperties = {
  fontSize: '0.78rem',
  padding: '0.2rem 0.45rem',
  borderRadius: 4,
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
};

export type RiffGeneratorPanelProps = {
  loading?: boolean;
  family: RiffFamilyTag;
  vrbId: string;
  bars: RiffBarCount;
  oddMeterPreset: RiffOddMeterSelectValue;
  density: RiffDensity;
  riffGrid: RiffGridMode;
  riffLineMode: RiffLineMode;
  riffBass: boolean;
  barLocks: boolean[];
  gateMessages: string[];
  canRegenerateMutate: boolean;
  onFamilyChange: (family: RiffFamilyTag) => void;
  onVrbIdChange: (vrbId: string) => void;
  onBarsChange: (bars: RiffBarCount) => void;
  onOddMeterPresetChange: (preset: RiffOddMeterSelectValue) => void;
  onDensityChange: (density: RiffDensity) => void;
  onRiffGridChange: (grid: RiffGridMode) => void;
  onRiffLineModeChange: (mode: RiffLineMode) => void;
  onRiffBassChange: (enabled: boolean) => void;
  onBarLockChange: (barIndex: number, locked: boolean) => void;
  onRegenerate: () => void;
  onMutate: () => void;
};

export function RiffGeneratorPanel({
  loading = false,
  family,
  vrbId,
  bars,
  oddMeterPreset,
  density,
  riffGrid,
  riffLineMode,
  riffBass,
  barLocks,
  gateMessages,
  canRegenerateMutate,
  onFamilyChange,
  onVrbIdChange,
  onBarsChange,
  onOddMeterPresetChange,
  onDensityChange,
  onRiffGridChange,
  onRiffLineModeChange,
  onRiffBassChange,
  onBarLockChange,
  onRegenerate,
  onMutate,
}: RiffGeneratorPanelProps) {
  const vrbOptions = useMemo(() => riffVrbOptionsForFamily(family), [family]);
  const selectedVrb = riffVrbOptionById(vrbId);
  const showMeter = riffFamilyShowsMeterPicker(family);
  const vrbUi = useMemo(() => riffVrbUiIndicators(vrbId), [vrbId]);
  const barIndex = RIFF_BAR_STEP_VALUES.indexOf(bars);

  return (
    <section style={zoneShell} aria-label="Riff generator options">
      <h3 style={zoneTitle}>Riff generator</h3>

      <div style={flexWrap}>
        <div>
          <label style={labelMuted}>Family</label>
          <select
            style={controlStyle}
            value={family}
            disabled={loading}
            onChange={(e) => {
              const next = e.target.value as RiffFamilyTag;
              onFamilyChange(next);
              onVrbIdChange(defaultRiffVrbIdForFamily(next));
              if (!riffFamilyShowsMeterPicker(next)) onOddMeterPresetChange(RIFF_ODD_METER_NONE);
            }}
          >
            {RIFF_FAMILY_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelMuted}>Voice / VRB</label>
          <select
            style={{ ...controlStyle, minWidth: 168 }}
            value={vrbId}
            disabled={loading}
            onChange={(e) => onVrbIdChange(e.target.value)}
            title={selectedVrb?.sigma != null ? `σ ${selectedVrb.sigma}` : undefined}
          >
            {vrbOptions.map((o) => (
              <option key={o.vrbId} value={o.vrbId}>
                {o.label}
                {o.sigma != null ? ` (σ${o.sigma})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(vrbUi.processLoopLabel || vrbUi.killSwitchLabel || vrbUi.counterpartLabel) && (
        <div style={{ ...flexWrap, marginTop: '0.5rem' }}>
          {vrbUi.processLoopLabel ? <span style={badgeStyle}>{vrbUi.processLoopLabel}</span> : null}
          {vrbUi.killSwitchLabel ? <span style={badgeStyle}>{vrbUi.killSwitchLabel}</span> : null}
          {vrbUi.counterpartLabel ? <span style={badgeStyle}>{vrbUi.counterpartLabel}</span> : null}
        </div>
      )}

      <div style={{ ...flexWrap, marginTop: '0.65rem' }}>
        <div>
          <label style={labelMuted}>Loop length (bars)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              disabled={loading || barIndex <= 0}
              onClick={() => onBarsChange(RIFF_BAR_STEP_VALUES[Math.max(0, barIndex - 1)]!)}
              style={controlStyle}
              aria-label="Shorter loop"
            >
              −
            </button>
            <span style={{ minWidth: 48, textAlign: 'center', fontWeight: 600 }}>{bars}</span>
            <button
              type="button"
              disabled={loading || barIndex >= RIFF_BAR_STEP_VALUES.length - 1}
              onClick={() =>
                onBarsChange(RIFF_BAR_STEP_VALUES[Math.min(RIFF_BAR_STEP_VALUES.length - 1, barIndex + 1)]!)
              }
              style={controlStyle}
              aria-label="Longer loop"
            >
              +
            </button>
            <select
              style={controlStyle}
              value={bars}
              disabled={loading}
              onChange={(e) => onBarsChange(clampRiffBarCount(Number(e.target.value)))}
              aria-label="Bar count preset"
            >
              {RIFF_BAR_STEP_VALUES.map((n) => (
                <option key={n} value={n}>
                  {n} bars
                </option>
              ))}
            </select>
          </div>
        </div>

        {showMeter ? (
          <div>
            <label style={labelMuted}>Meter template</label>
            <select
              style={controlStyle}
              value={oddMeterPreset}
              disabled={loading}
              onChange={(e) => onOddMeterPresetChange(e.target.value as RiffOddMeterSelectValue)}
            >
              <option value={RIFF_ODD_METER_NONE}>4/4 (default)</option>
              {RIFF_ODD_METER_PRESETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label style={labelMuted}>Density</label>
          <select
            style={controlStyle}
            value={density}
            disabled={loading}
            onChange={(e) => onDensityChange(e.target.value as RiffDensity)}
          >
            {RIFF_DENSITY_UI_OPTIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelMuted}>Grid</label>
          <select
            style={controlStyle}
            value={riffGrid}
            disabled={loading}
            onChange={(e) => onRiffGridChange(e.target.value as RiffGridMode)}
          >
            <option value="eighth">Eighth notes</option>
            <option value="sixteenth">Sixteenth notes</option>
          </select>
        </div>

        <div>
          <label style={labelMuted}>Line mode</label>
          <select
            style={controlStyle}
            value={riffLineMode}
            disabled={loading}
            onChange={(e) => onRiffLineModeChange(e.target.value as RiffLineMode)}
          >
            <option value="single_line">Single line</option>
            <option value="guitar_bass">Guitar + bass</option>
            <option value="octave_double">Octave / double-stop</option>
          </select>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', marginTop: '0.65rem' }}>
        <input
          type="checkbox"
          checked={riffBass}
          onChange={(e) => onRiffBassChange(e.target.checked)}
          disabled={loading || riffLineMode === 'octave_double'}
        />
        Bass (acoustic bass voice, GM 33) — ignored in octave mode
      </label>

      <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)' }}>
        <h4 style={{ ...zoneTitle, marginBottom: '0.45rem' }}>Lock / mutate</h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
            gap: 6,
            maxWidth: 560,
            marginBottom: '0.65rem',
          }}
        >
          {Array.from({ length: bars }, (_, i) => (
            <label
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>Bar {i + 1}</span>
              <input
                type="checkbox"
                checked={barLocks[i] === true}
                disabled={loading}
                aria-label={`Lock bar ${i + 1}`}
                onChange={(e) => onBarLockChange(i, e.target.checked)}
              />
              <span>{barLocks[i] ? 'Lock' : 'Open'}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            style={controlStyle}
            disabled={loading || !canRegenerateMutate}
            onClick={onRegenerate}
            title={canRegenerateMutate ? 'Re-run riff engine on unlocked bars' : 'Generate a riff first'}
          >
            Regenerate
          </button>
          <button
            type="button"
            style={controlStyle}
            disabled={loading || !canRegenerateMutate}
            onClick={onMutate}
            title={canRegenerateMutate ? 'Apply VRB variation operators on unlocked bars' : 'Generate a riff first'}
          >
            Mutate
          </button>
        </div>
        {gateMessages.length > 0 ? (
          <ul style={{ margin: '0.55rem 0 0', paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--text)' }}>
            {gateMessages.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
