/**
 * Composer VRB tooltip � hover/focus on wrapped control; title fallback on options.
 */

import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';
import { formatVrbTooltipTitle, vrbTooltipBodyLines } from '../vrbTooltipFormat';
import type { SqComposerOption } from '../sqToBbWorkflowUi';

const wrapStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  maxWidth: '100%',
};

const popupStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 40,
  left: 0,
  top: 'calc(100% + 4px)',
  minWidth: 220,
  maxWidth: 320,
  padding: '0.45rem 0.55rem',
  borderRadius: 6,
  border: '1px solid var(--border, #ccc)',
  background: 'var(--bg-panel, #fff)',
  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
  fontSize: '0.78rem',
  lineHeight: 1.35,
  pointerEvents: 'none',
};

const tagStyle: CSSProperties = {
  display: 'inline-block',
  marginLeft: 6,
  padding: '0 0.35rem',
  borderRadius: 4,
  fontSize: '0.68rem',
  fontWeight: 600,
  textTransform: 'lowercase',
  background: 'rgba(100,116,139,0.15)',
  color: 'var(--text-muted, #555)',
};

export function vrbOptionTitleAttribute(option: SqComposerOption): string | undefined {
  if (!option.description) return option.label;
  return formatVrbTooltipTitle(option);
}

export function VrbTooltipPanel({ option }: { option: SqComposerOption }) {
  if (!option.description) return null;
  const body = vrbTooltipBodyLines(option);
  return (
    <div role="tooltip" style={popupStyle}>
      <div>
        <strong>{body.label}</strong>
        {body.familyTag ? <span style={tagStyle}>{body.familyTag}</span> : null}
        {body.sigmaLabel ? (
          <span style={{ ...tagStyle, marginLeft: 4 }}>{body.sigmaLabel}</span>
        ) : null}
      </div>
      <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #555)' }}>{body.description}</p>
    </div>
  );
}

export function VrbTooltip({
  option,
  children,
}: {
  option: SqComposerOption | undefined;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const title = option ? vrbOptionTitleAttribute(option) : undefined;
  const onShow = useCallback(() => setOpen(true), []);
  const onHide = useCallback(() => setOpen(false), []);

  return (
    <span
      style={wrapStyle}
      title={title}
      onMouseEnter={onShow}
      onMouseLeave={onHide}
      onFocus={onShow}
      onBlur={onHide}
    >
      {children}
      {open && option?.description ? <VrbTooltipPanel option={option} /> : null}
    </span>
  );
}
