/**
 * Gate explanation tooltip — ⓘ icon with hover popup; title fallback.
 */

import { useCallback, useState, type CSSProperties } from 'react';
import { GATE_EXPLANATIONS, type GateKey } from '../gateTooltips';

export type { GateKey } from '../gateTooltips';
export { GATE_EXPLANATIONS } from '../gateTooltips';

const wrapStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  marginLeft: 4,
  verticalAlign: 'middle',
};

const iconStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 14,
  height: 14,
  borderRadius: '50%',
  border: '1px solid var(--border, #bbb)',
  fontSize: '0.62rem',
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'help',
  color: 'var(--text-muted, #666)',
  background: 'rgba(100,116,139,0.08)',
};

const popupStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 40,
  left: 0,
  top: 'calc(100% + 4px)',
  minWidth: 180,
  maxWidth: 280,
  padding: '0.4rem 0.5rem',
  borderRadius: 6,
  border: '1px solid var(--border, #ccc)',
  background: 'var(--bg-panel, #fff)',
  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
  fontSize: '0.75rem',
  lineHeight: 1.35,
  whiteSpace: 'normal',
  pointerEvents: 'none',
};

export function GateTooltip({ gateKey, label }: { gateKey: GateKey; label: string }) {
  const [open, setOpen] = useState(false);
  const explanation = GATE_EXPLANATIONS[gateKey];
  const onShow = useCallback(() => setOpen(true), []);
  const onHide = useCallback(() => setOpen(false), []);

  return (
    <span style={wrapStyle}>
      <span style={{ fontSize: 'inherit' }}>{label}</span>
      <span
        role="img"
        aria-label={`${label}: ${explanation}`}
        title={explanation}
        style={iconStyle}
        onMouseEnter={onShow}
        onMouseLeave={onHide}
        onFocus={onShow}
        onBlur={onHide}
        tabIndex={0}
      >
        ⓘ
      </span>
      {open ? (
        <span role="tooltip" style={popupStyle} title={explanation}>
          {explanation}
        </span>
      ) : null}
    </span>
  );
}
