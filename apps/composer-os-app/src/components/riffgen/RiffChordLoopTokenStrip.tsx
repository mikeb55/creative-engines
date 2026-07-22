import { useMemo } from 'react';
import {
  previewRiffChordLoopTokens,
  summarizeRiffChordTokenPreviews,
  type RiffChordTokenPreview,
  type RiffChordTokenUiStatus,
} from '@composer-os/core/riff-generator/riffChordLoop';

const STATUS_LABEL: Record<RiffChordTokenUiStatus, string> = {
  valid: 'valid',
  normalized: 'normalized',
  unsupported: 'unsupported',
  invalid: 'invalid',
};

const STATUS_STYLE: Record<RiffChordTokenUiStatus, { border: string; background: string }> = {
  valid: { border: '1px solid rgba(34, 197, 94, 0.55)', background: 'rgba(34, 197, 94, 0.12)' },
  normalized: { border: '1px solid rgba(234, 179, 8, 0.55)', background: 'rgba(234, 179, 8, 0.14)' },
  unsupported: { border: '1px solid rgba(249, 115, 22, 0.55)', background: 'rgba(249, 115, 22, 0.14)' },
  invalid: { border: '1px solid rgba(239, 68, 68, 0.55)', background: 'rgba(239, 68, 68, 0.14)' },
};

function tokenTitle(t: RiffChordTokenPreview): string {
  return `Typed: ${t.token}, Interpreted: ${t.usedSymbol}, Status: ${STATUS_LABEL[t.status]}`;
}

/**
 * Phase 2 chord-loop trust — inline per-token badges + preflight summary.
 * UI-only; does not change Am7 fallback / normalizeChordLoopWithDisclosure.
 */
export function RiffChordLoopTokenStrip({
  value,
  disabled,
}: {
  value: string;
  disabled?: boolean;
}) {
  const tokens = useMemo(() => previewRiffChordLoopTokens(value), [value]);
  const summary = useMemo(() => summarizeRiffChordTokenPreviews(tokens), [tokens]);

  if (tokens.length === 0) return null;

  return (
    <div style={{ marginTop: '0.45rem', opacity: disabled ? 0.65 : 1, maxWidth: 640 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
        {tokens.map((t, i) => {
          const st = STATUS_STYLE[t.status];
          return (
            <span
              key={`${i}:${t.token}:${t.status}`}
              title={tokenTitle(t)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '0.15rem 0.45rem',
                borderRadius: 4,
                fontSize: '0.78rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                borderBottom: t.status === 'valid' ? st.border : `2px solid ${st.border.includes('rgba') ? st.border.replace('1px solid ', '') : 'currentColor'}`,
                border: st.border,
                background: st.background,
                textDecoration: t.status === 'invalid' || t.status === 'unsupported' ? 'underline wavy' : undefined,
                textUnderlineOffset: 3,
                cursor: 'help',
              }}
            >
              {t.token}
              {t.status !== 'valid' ? (
                <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>→ {t.usedSymbol}</span>
              ) : null}
            </span>
          );
        })}
      </div>
      <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {summary.total} token{summary.total === 1 ? '' : 's'}: {summary.valid} valid, {summary.normalized}{' '}
        normalized, {summary.needReview} need review
        {summary.unsupported || summary.invalid
          ? ` (${summary.unsupported} unsupported / ${summary.invalid} invalid)`
          : ''}
      </p>
    </div>
  );
}