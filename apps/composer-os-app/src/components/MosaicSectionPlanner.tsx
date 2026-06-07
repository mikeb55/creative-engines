/**
 * Mosaic Mode — per-section composer plan + output format (Generate UI).
 */

import type { CSSProperties } from 'react';

export type MosaicPresetRoleUi = 'duo' | 'big_band' | 'string_quartet';

export type MosaicSectionPlanEntry = {
  sectionLabel: string;
  startBar: number;
  endBar: number;
  songwriterStyleId: string;
  timeSignature?: { numerator: number; denominator: number };
  presetRole?: MosaicPresetRoleUi;
};

export type MosaicOutputFormatUi = 'none' | 'melody-bass-chords' | 'lead-sheet';

const COMPOSER_OPTIONS: { id: string; label: string }[] = [
  { id: 'default', label: 'Default (primary songwriter)' },
  { id: 'fripp', label: 'Fripp' },
  { id: 'jack_white', label: 'Jack White' },
  { id: 'wayne_shorter', label: 'Wayne Shorter' },
  { id: 'ecm_chamber', label: 'ECM Chamber' },
  { id: 'sonic_youth', label: 'Sonic Youth' },
];

const PRESET_ROLE_OPTIONS: { id: MosaicPresetRoleUi; label: string }[] = [
  { id: 'duo', label: 'Duo' },
  { id: 'big_band', label: 'Big Band' },
  { id: 'string_quartet', label: 'String Quartet' },
];

const METER_OPTIONS: { id: string; label: string; ts?: { numerator: number; denominator: number } }[] = [
  { id: '', label: 'Optional (inherit)' },
  { id: '4/4', label: '4/4', ts: { numerator: 4, denominator: 4 } },
  { id: '3/4', label: '3/4', ts: { numerator: 3, denominator: 4 } },
  { id: '5/4', label: '5/4', ts: { numerator: 5, denominator: 4 } },
];

function meterIdForSection(section: MosaicSectionPlanEntry): string {
  const ts = section.timeSignature;
  if (!ts) return '';
  if (ts.numerator === 4 && ts.denominator === 4) return '4/4';
  if (ts.numerator === 3 && ts.denominator === 4) return '3/4';
  if (ts.numerator === 5 && ts.denominator === 4) return '5/4';
  return '';
}

function nextSectionDefaults(sections: MosaicSectionPlanEntry[]): Omit<MosaicSectionPlanEntry, 'sectionLabel'> {
  const lastEnd = sections.length > 0 ? Math.max(...sections.map((s) => s.endBar)) : 0;
  const startBar = lastEnd + 1;
  return {
    startBar,
    endBar: startBar + 7,
    songwriterStyleId: 'default',
    presetRole: 'duo',
  };
}

export function MosaicSectionPlanner(props: {
  sections: MosaicSectionPlanEntry[];
  onChange: (sections: MosaicSectionPlanEntry[]) => void;
  outputFormat: MosaicOutputFormatUi;
  onOutputFormatChange: (format: MosaicOutputFormatUi) => void;
  disabled?: boolean;
}) {
  const { sections, onChange, outputFormat, onOutputFormatChange, disabled } = props;

  function updateRow(index: number, patch: Partial<MosaicSectionPlanEntry>) {
    onChange(sections.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function addRow() {
    const defaults = nextSectionDefaults(sections);
    const label = sections.length === 0 ? 'intro' : sections.length === 1 ? 'verse' : 'chorus';
    onChange([...sections, { sectionLabel: label, ...defaults }]);
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '0.35rem 0.45rem',
    borderRadius: 4,
    border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
    background: 'var(--bg-input, var(--bg))',
    color: 'var(--text)',
    fontSize: '0.82rem',
  };

  return (
    <section
      aria-label="Mosaic section planner"
      style={{
        marginBottom: '1rem',
        padding: '0.65rem 0.75rem',
        border: '1px solid var(--border-subtle, rgba(128,128,128,0.25))',
        borderRadius: 8,
        maxWidth: 860,
      }}
    >
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', color: 'var(--text)' }}>Mosaic sections</h3>
      <p style={{ margin: '0 0 0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Plan 2+ sections with a composer per slice. Sent on Generate when at least two sections are defined.
      </p>

      {sections.length === 0 ? (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No sections yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '0.65rem' }}>
          {sections.map((row, index) => (
            <div
              key={`mosaic-row-${index}-${row.sectionLabel}-${row.startBar}`}
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(72px, 1fr) 64px 64px minmax(120px, 1.2fr) minmax(96px, 0.9fr) minmax(108px, 1fr) auto',
                gap: '0.35rem',
                alignItems: 'end',
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Label
                <input
                  type="text"
                  value={row.sectionLabel}
                  disabled={disabled}
                  onChange={(e) => updateRow(index, { sectionLabel: e.target.value })}
                  style={inputStyle}
                  placeholder="intro"
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Start
                <input
                  type="number"
                  min={1}
                  value={row.startBar}
                  disabled={disabled}
                  onChange={(e) => updateRow(index, { startBar: Math.max(1, Number(e.target.value) || 1) })}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                End
                <input
                  type="number"
                  min={1}
                  value={row.endBar}
                  disabled={disabled}
                  onChange={(e) => updateRow(index, { endBar: Math.max(1, Number(e.target.value) || 1) })}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Composer
                <select
                  value={row.songwriterStyleId || 'default'}
                  disabled={disabled}
                  onChange={(e) => updateRow(index, { songwriterStyleId: e.target.value })}
                  style={inputStyle}
                >
                  {COMPOSER_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Meter
                <select
                  value={meterIdForSection(row)}
                  disabled={disabled}
                  onChange={(e) => {
                    const opt = METER_OPTIONS.find((m) => m.id === e.target.value);
                    updateRow(index, { timeSignature: opt?.ts });
                  }}
                  style={inputStyle}
                >
                  {METER_OPTIONS.map((m) => (
                    <option key={m.id || 'inherit'} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Preset
                <select
                  value={row.presetRole ?? 'duo'}
                  disabled={disabled}
                  onChange={(e) => updateRow(index, { presetRole: e.target.value as MosaicPresetRoleUi })}
                  style={inputStyle}
                >
                  {PRESET_ROLE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="secondary"
                disabled={disabled}
                onClick={() => removeRow(index)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', alignSelf: 'end' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          alignItems: 'center',
          paddingTop: '0.35rem',
          borderTop: '1px solid var(--border-subtle, rgba(128,128,128,0.2))',
        }}
      >
        <button type="button" className="secondary" disabled={disabled} onClick={addRow}>
          Add section
        </button>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
          }}
        >
          Output format
          <select
            value={outputFormat}
            disabled={disabled}
            onChange={(e) => onOutputFormatChange(e.target.value as MosaicOutputFormatUi)}
            style={{ ...inputStyle, width: 'auto', minWidth: 160 }}
          >
            <option value="none">None</option>
            <option value="melody-bass-chords">Melody + bass + chords</option>
            <option value="lead-sheet">Lead sheet</option>
          </select>
        </label>
      </div>
    </section>
  );
}
