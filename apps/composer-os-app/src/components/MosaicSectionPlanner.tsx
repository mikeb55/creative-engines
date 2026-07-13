/**
 * Mosaic Mode — per-section composer plan + output format (Generate UI).
 */

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MosaicImportTimeline } from '@composer-os/core/import/mosaicImportTimeline';
import {
  listMosaicSectionPlanPresets,
  type MosaicSectionPlanPreset,
} from '@composer-os/core/mosaic-mode/mosaicSectionPlanPresets';
import { MosaicSectionTimeline } from './MosaicSectionTimeline';
import {
  clampMeterDenominator,
  clampMeterNumerator,
  computeMosaicPlannerWarnings,
  computeTimelineBlocks,
  normalizeTimeSignature,
  planHasContent,
  readSectionMeterParts,
  resolvePlannerTotalBars,
  suggestSectionsFromImport,
  VALID_METER_DENOMINATORS,
  warningSummaryCounts,
  warningsForSection,
} from './mosaicSectionPlannerUtils';

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
  { id: 'verlaine', label: 'Verlaine' },
  { id: 'marr', label: 'Marr' },
  { id: 'sq_vrb_bartok', label: 'Bartok (SQ VRB)' },
];

const BB_COMPOSER_IDS = new Set(['default', 'verlaine', 'marr', 'wayne_shorter', 'ecm_chamber']);
const SQ_COMPOSER_IDS = new Set(['default', 'sq_vrb_bartok', 'verlaine', 'marr', 'wayne_shorter', 'ecm_chamber']);

function composersForPresetRole(role: MosaicPresetRoleUi | undefined): typeof COMPOSER_OPTIONS {
  const r = role ?? 'duo';
  if (r === 'big_band') return COMPOSER_OPTIONS.filter((o) => BB_COMPOSER_IDS.has(o.id));
  if (r === 'string_quartet') return COMPOSER_OPTIONS.filter((o) => SQ_COMPOSER_IDS.has(o.id));
  return COMPOSER_OPTIONS;
}

function hasMixedPresetSections(sections: MosaicSectionPlanEntry[]): boolean {
  return sections.some((s) => (s.presetRole ?? 'duo') !== 'duo');
}

const PRESET_ROLE_OPTIONS: { id: MosaicPresetRoleUi; label: string }[] = [
  { id: 'duo', label: 'Duo' },
  { id: 'big_band', label: 'Big Band' },
  { id: 'string_quartet', label: 'String Quartet' },
];

function MosaicSectionMeterField(props: {
  section: MosaicSectionPlanEntry;
  disabled?: boolean;
  inputStyle: CSSProperties;
  onCommit: (patch: Partial<MosaicSectionPlanEntry>) => void;
}) {
  const { section, disabled, inputStyle, onCommit } = props;
  const meter = readSectionMeterParts(section);

  const commitMeter = (numerator: number, denominator: number) => {
    onCommit({ timeSignature: normalizeTimeSignature(numerator, denominator) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={meter.inherits}
          disabled={disabled}
          data-testid="mosaic-meter-inherit"
          title="Use chart/project default meter for this section"
          onChange={(e) => {
            if (e.target.checked) {
              onCommit({ timeSignature: undefined });
            } else {
              onCommit({ timeSignature: { numerator: 4, denominator: 4 } });
            }
          }}
        />
        Inherit
      </label>
      {!meter.inherits ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            min={1}
            max={32}
            aria-label="Meter numerator"
            data-testid="mosaic-meter-numerator"
            title="Numerator 1–32"
            value={meter.numerator}
            disabled={disabled}
            onChange={(e) => {
              const v = clampMeterNumerator(e.target.value, meter.numerator);
              commitMeter(v, meter.denominator);
            }}
            onBlur={(e) => {
              const v = clampMeterNumerator(e.target.value, meter.numerator);
              if (v !== meter.numerator) commitMeter(v, meter.denominator);
            }}
            style={{ ...inputStyle, width: '100%', minWidth: 0 }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/</span>
          <select
            aria-label="Meter denominator"
            data-testid="mosaic-meter-denominator"
            title="Denominator: 2, 4, 8, or 16"
            value={meter.denominator}
            disabled={disabled}
            onChange={(e) => {
              const v = clampMeterDenominator(e.target.value, meter.denominator);
              commitMeter(meter.numerator, v);
            }}
            style={{ ...inputStyle, width: '100%', minWidth: 0 }}
          >
            {VALID_METER_DENOMINATORS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
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

function badgeStyle(level: 'error' | 'warning' | 'info'): CSSProperties {
  const palette = {
    error: { bg: 'rgba(220,38,38,0.14)', fg: '#b91c1c', border: 'rgba(220,38,38,0.35)' },
    warning: { bg: 'rgba(217,119,6,0.14)', fg: '#b45309', border: 'rgba(217,119,6,0.35)' },
    info: { bg: 'rgba(59,130,246,0.12)', fg: '#1d4ed8', border: 'rgba(59,130,246,0.3)' },
  }[level];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.68rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 999,
    background: palette.bg,
    color: palette.fg,
    border: `1px solid ${palette.border}`,
    whiteSpace: 'nowrap',
  };
}

function MosaicWarningBadge(props: { level: 'error' | 'warning' | 'info'; message: string }) {
  const prefix = props.level === 'error' ? '!' : props.level === 'warning' ? '⚠' : 'i';
  return (
    <span style={badgeStyle(props.level)} title={props.message} data-warning-level={props.level}>
      {prefix} {props.message}
    </span>
  );
}

const MOSAIC_SECTION_PLAN_PRESETS = listMosaicSectionPlanPresets();

export function MosaicSectionPlanner(props: {
  sections: MosaicSectionPlanEntry[];
  onChange: (sections: MosaicSectionPlanEntry[]) => void;
  outputFormat: MosaicOutputFormatUi;
  onOutputFormatChange: (format: MosaicOutputFormatUi) => void;
  importTimeline?: MosaicImportTimeline | null;
  plannerTotalBars?: number;
  onTotalBarsChange?: (totalBars: number) => void;
  disabled?: boolean;
}) {
  const {
    sections,
    onChange,
    outputFormat,
    onOutputFormatChange,
    importTimeline,
    plannerTotalBars,
    onTotalBarsChange,
    disabled,
  } = props;
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState('');

  const totalBars = resolvePlannerTotalBars(sections, importTimeline, plannerTotalBars);
  const timelineBlocks = useMemo(
    () => computeTimelineBlocks(sections, totalBars),
    [sections, totalBars],
  );
  const warnings = useMemo(
    () => computeMosaicPlannerWarnings(sections, totalBars, outputFormat),
    [sections, totalBars, outputFormat],
  );
  const summary = warningSummaryCounts(warnings);
  const globalWarnings = warnings.filter((w) => w.sectionIndex === undefined);

  function updateRow(index: number, patch: Partial<MosaicSectionPlanEntry>) {
    onChange(
      sections.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if ('timeSignature' in patch && patch.timeSignature === undefined) {
          delete next.timeSignature;
        }
        if (patch.presetRole && patch.presetRole !== 'duo') {
          const allowed = composersForPresetRole(patch.presetRole).map((o) => o.id);
          if (!allowed.includes(next.songwriterStyleId)) {
            next.songwriterStyleId = 'default';
          }
        }
        return next;
      }),
    );
  }

  function removeRow(index: number) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function addRow() {
    const defaults = nextSectionDefaults(sections);
    const label = sections.length === 0 ? 'intro' : sections.length === 1 ? 'verse' : 'chorus';
    onChange([...sections, { sectionLabel: label, ...defaults }]);
  }

  function handleSuggestFromImport() {
    if (!importTimeline) return;
    const suggested = suggestSectionsFromImport(importTimeline);
    if (suggested.length === 0) return;
    if (planHasContent(sections)) {
      const ok = window.confirm(
        'Replace the current section plan with suggestions from the import? This cannot be undone except by editing manually.',
      );
      if (!ok) return;
    }
    onChange(suggested);
  }

  function applySectionPlanPreset(preset: MosaicSectionPlanPreset) {
    if (planHasContent(sections)) {
      const ok = window.confirm(
        `Replace the current section plan with "${preset.name}"? This cannot be undone except by editing manually.`,
      );
      if (!ok) return false;
    }
    onChange(preset.plan.map((entry) => ({ ...entry })) as MosaicSectionPlanEntry[]);
    onTotalBarsChange?.(preset.totalBars);
    return true;
  }

  function handlePresetSelectChange(presetId: string) {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = MOSAIC_SECTION_PLAN_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    applySectionPlanPreset(preset);
  }

  function handleLoadSectionPlanPreset() {
    if (!selectedPresetId) return;
    const preset = MOSAIC_SECTION_PLAN_PRESETS.find((entry) => entry.id === selectedPresetId);
    if (!preset) return;
    applySectionPlanPreset(preset);
  }

  function scrollToSection(sectionIndex: number) {
    setHighlightedIndex(sectionIndex);
    const el = rowRefs.current[sectionIndex];
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        {' '}
        <strong style={{ fontWeight: 600 }}>Meter:</strong> Inherit uses the chart/project default (usually 4/4).
        Uncheck Inherit to set a custom signature per section (e.g. 7/8, 11/8, 13/16).
        Exotic meters may have soft rhythm/export limits on non-duo sections.
        {hasMixedPresetSections(sections) ? (
          <>
            {' '}
            Mixed-preset export combines sections into one score (duo + Big Band + String Quartet parts).
          </>
        ) : null}
      </p>

      {MOSAIC_SECTION_PLAN_PRESETS.length > 0 ? (
        <div style={{ marginBottom: '0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'flex-end' }}>
          <label style={{ fontSize: '0.78rem' }}>
            Section plan preset
            <select
              value={selectedPresetId}
              disabled={disabled}
              data-testid="mosaic-section-plan-preset-select"
              onChange={(e) => handlePresetSelectChange(e.target.value)}
              style={{ ...inputStyle, display: 'block', marginTop: 2, minWidth: 220 }}
            >
              <option value="">— choose preset —</option>
              {MOSAIC_SECTION_PLAN_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.totalBars} bars)
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary"
            disabled={disabled || !selectedPresetId}
            data-testid="mosaic-load-section-plan-preset"
            onClick={handleLoadSectionPlanPreset}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
          >
            Load preset
          </button>
        </div>
      ) : null}

      {importTimeline ? (
        <div style={{ marginBottom: '0.55rem' }}>
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            data-testid="mosaic-suggest-from-import"
            onClick={handleSuggestFromImport}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
          >
            Suggest sections from import
          </button>
          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {importTimeline.bars} bars from {importTimeline.sourceFormat}
          </span>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div
          data-testid="mosaic-planner-warning-summary"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
            marginBottom: '0.5rem',
            alignItems: 'center',
          }}
        >
          {summary.error > 0 ? (
            <MosaicWarningBadge level="error" message={`${summary.error} error${summary.error === 1 ? '' : 's'}`} />
          ) : null}
          {summary.warning > 0 ? (
            <MosaicWarningBadge
              level="warning"
              message={`${summary.warning} warning${summary.warning === 1 ? '' : 's'}`}
            />
          ) : null}
          {summary.info > 0 ? (
            <MosaicWarningBadge level="info" message={`${summary.info} info`} />
          ) : null}
          {globalWarnings.map((w) => (
            <MosaicWarningBadge key={w.id} level={w.level} message={w.message} />
          ))}
        </div>
      ) : null}

      {sections.length > 0 ? (
        <MosaicSectionTimeline
          blocks={timelineBlocks}
          totalBars={totalBars}
          highlightedIndex={highlightedIndex}
          onBlockClick={scrollToSection}
        />
      ) : null}

      {sections.length === 0 ? (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No sections yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '0.65rem' }}>
          {sections.map((row, index) => {
            const rowWarnings = warningsForSection(warnings, index);
            const isHighlighted = highlightedIndex === index;
            return (
              <div
                key={`mosaic-row-${index}-${row.sectionLabel}-${row.startBar}`}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                data-testid={`mosaic-section-row-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(72px, 1fr) 64px 64px minmax(120px, 1.2fr) minmax(120px, 1fr) minmax(96px, 0.9fr) auto',
                  gap: '0.35rem',
                  alignItems: 'end',
                  padding: '0.25rem',
                  borderRadius: 6,
                  background: isHighlighted ? 'rgba(59,130,246,0.08)' : 'transparent',
                  outline: isHighlighted ? '1px solid rgba(59,130,246,0.35)' : 'none',
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
                    {composersForPresetRole(row.presetRole).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Meter
                  <MosaicSectionMeterField
                    section={row}
                    disabled={disabled}
                    inputStyle={inputStyle}
                    onCommit={(patch) => updateRow(index, patch)}
                  />
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
                {rowWarnings.length > 0 ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.3rem',
                    }}
                  >
                    {rowWarnings.map((w) => (
                      <MosaicWarningBadge key={w.id} level={w.level} message={w.message} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
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
            <option value="lead-sheet" disabled={hasMixedPresetSections(sections)}>
              Lead sheet{hasMixedPresetSections(sections) ? ' (duo-only)' : ''}
            </option>
          </select>
        </label>
      </div>
    </section>
  );
}
