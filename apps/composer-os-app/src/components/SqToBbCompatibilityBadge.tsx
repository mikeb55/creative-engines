import type { CSSProperties } from 'react';
import {
  SQ_TO_BB_COMPATIBILITY_BADGE_LABEL,
  type SqToBbEraBbCompatibility,
} from '../types/sqToBbWorkflowUi';

const BADGE_DOT: Record<SqToBbEraBbCompatibility, string> = {
  natural: 'rgb(22, 163, 74)',
  unconventional: 'rgb(180, 83, 9)',
  mismatch: 'rgb(185, 28, 28)',
};

const row: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: '0.78rem',
  color: 'var(--text-muted)',
  marginLeft: 8,
  maxWidth: 280,
  lineHeight: 1.35,
};

export function SqToBbCompatibilityBadge({ level }: { level: SqToBbEraBbCompatibility }) {
  return (
    <span
      style={row}
      role="status"
      aria-label={`Era and BB style compatibility: ${SQ_TO_BB_COMPATIBILITY_BADGE_LABEL[level]}`}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: BADGE_DOT[level],
          flexShrink: 0,
        }}
      />
      {SQ_TO_BB_COMPATIBILITY_BADGE_LABEL[level]}
    </span>
  );
}
