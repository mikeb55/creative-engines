import { useState } from 'react';
import {
  SLONIMSKY_FLAVOR_DISPLAY,
  SLONIMSKY_PIN_AVOID_TOOLTIP,
} from '../../constants/slonimskyUxCopy';
import {
  dualUseFlavorsForCell,
  SLONIMSKY_CELL_FAMILIES,
  type SlonimskyAdvancedOverrides,
} from '../../types/slonimskyAdvancedState';
import type { SlonimskySourcePreset } from '../../types/slonimskyMacroState';
import { SlonimskyZappaAdvancedSection } from './SlonimskyZappaAdvancedSection';
import type {
  ZappaChainDepthUi,
  ZappaEraPresetUi,
  ZappaPhraseCharacterUi,
  ZappaStyleModeUi,
  ZappaSymmetryBiasUi,
} from '../../types/riffGeneratorUi';

const zoneShell = {
  marginTop: '0.35rem',
  padding: '0.65rem 0.75rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'rgba(0, 0, 0, 0.03)',
} as const;

export function SlonimskyAdvancedDrawer({
  overrides,
  onOverridesChange,
  disabled,
  showZappaSection,
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
  overrides: SlonimskyAdvancedOverrides;
  onOverridesChange: (o: SlonimskyAdvancedOverrides) => void;
  disabled?: boolean;
  showZappaSection: boolean;
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
  const [open, setOpen] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState<SlonimskySourcePreset | null>(null);

  const togglePin = (cellId: string) => {
    const pinned = overrides.pinnedCellIds.includes(cellId);
    onOverridesChange({
      pinnedCellIds: pinned
        ? overrides.pinnedCellIds.filter((id) => id !== cellId)
        : [...overrides.pinnedCellIds, cellId],
      forbiddenCellIds: overrides.forbiddenCellIds.filter((id) => id !== cellId),
    });
  };

  const toggleForbid = (cellId: string) => {
    const forbidden = overrides.forbiddenCellIds.includes(cellId);
    onOverridesChange({
      forbiddenCellIds: forbidden
        ? overrides.forbiddenCellIds.filter((id) => id !== cellId)
        : [...overrides.forbiddenCellIds, cellId],
      pinnedCellIds: overrides.pinnedCellIds.filter((id) => id !== cellId),
    });
  };

  return (
    <div style={{ marginBottom: '1rem', maxWidth: 720 }}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: '0.85rem',
          padding: '0.4rem 0.75rem',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: open ? 'rgba(100,160,255,0.1)' : 'transparent',
          color: 'var(--text)',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        Slonimsky advanced {open ? '▾' : '▸'}
      </button>
      {open ? (
        <div style={zoneShell}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
            Cell families — pin (always prefer) or forbid (never use). Metadata via style context keys.
          </div>
          {SLONIMSKY_CELL_FAMILIES.map((family) => {
            const expanded = expandedFamily === family.flavor;
            return (
              <div key={family.flavor} style={{ marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setExpandedFamily(expanded ? null : family.flavor)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle, rgba(128,128,128,0.35))',
                    background: expanded ? 'rgba(100,160,255,0.08)' : 'transparent',
                    color: 'var(--text)',
                    cursor: disabled ? 'default' : 'pointer',
                  }}
                >
                  {expanded ? '▾' : '▸'} {family.label} ({family.cells.length})
                </button>
                {expanded ? (
                  <ul style={{ margin: '0.35rem 0 0', padding: 0, listStyle: 'none' }}>
                    {family.cells.map((cell) => {
                      const pinned = overrides.pinnedCellIds.includes(cell.id);
                      const forbidden = overrides.forbiddenCellIds.includes(cell.id);
                      const dual = dualUseFlavorsForCell(cell.id);
                      const dualHint =
                        dual.length > 0
                          ? `also used in ${dual.map((f) => SLONIMSKY_FLAVOR_DISPLAY[f]).join(', ')}`
                          : undefined;
                      return (
                        <li
                          key={cell.id}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0',
                            fontSize: '0.75rem',
                            borderBottom: '1px solid var(--border-subtle, rgba(128,128,128,0.2))',
                          }}
                        >
                          <span title={cell.name} style={{ flex: '1 1 140px', color: 'var(--text)' }}>
                            {cell.name}
                            <span
                              style={{
                                marginLeft: 6,
                                fontFamily: 'ui-monospace, monospace',
                                color: 'var(--text-muted)',
                                fontSize: '0.68rem',
                              }}
                            >
                              {cell.id.replace(/^p_/, '')}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={disabled}
                            title={SLONIMSKY_PIN_AVOID_TOOLTIP.pin}
                            onClick={() => togglePin(cell.id)}
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: 4,
                              border: pinned
                                ? '1px solid var(--accent, #6ae)'
                                : '1px solid var(--border)',
                              background: pinned ? 'rgba(100,160,255,0.14)' : 'transparent',
                              cursor: disabled ? 'default' : 'pointer',
                            }}
                          >
                            Pin
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            title={SLONIMSKY_PIN_AVOID_TOOLTIP.avoid}
                            onClick={() => toggleForbid(cell.id)}
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: 4,
                              border: forbidden
                                ? '1px solid rgba(239,68,68,0.55)'
                                : '1px solid var(--border)',
                              background: forbidden ? 'rgba(239,68,68,0.1)' : 'transparent',
                              cursor: disabled ? 'default' : 'pointer',
                            }}
                          >
                            Forbid
                          </button>
                          {dualHint ? (
                            <span title={dualHint} style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              ⓘ {dualHint}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
          {showZappaSection ? (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '0.35rem',
                }}
              >
                Frank Zappa — advanced
              </div>
              <SlonimskyZappaAdvancedSection
                disabled={disabled}
                zappaStyleMode={zappaStyleMode}
                zappaEraPreset={zappaEraPreset}
                zappaPhraseCharacter={zappaPhraseCharacter}
                zappaSymmetryBias={zappaSymmetryBias}
                zappaChainDepth={zappaChainDepth}
                onZappaStyleModeChange={onZappaStyleModeChange}
                onZappaEraPresetChange={onZappaEraPresetChange}
                onZappaPhraseCharacterChange={onZappaPhraseCharacterChange}
                onZappaSymmetryBiasChange={onZappaSymmetryBiasChange}
                onZappaChainDepthChange={onZappaChainDepthChange}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
