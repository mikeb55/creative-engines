import { useEffect, useMemo, useState } from 'react';
import {
  RIFF_CHORD_FALLBACK_OPTIONS,
  countRiffChordLoopUnresolved,
  previewRiffChordLoopTokens,
  replaceRiffChordLoopTokenAt,
  riffChordLoopGenerateBlocked,
  riffChordTokenAckKey,
  riffChordTokenGateKind,
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

function tokenTitle(t: RiffChordTokenPreview, gate: string, accepted: boolean): string {
  const base = `Typed: ${t.token}, Interpreted: ${t.usedSymbol}, Status: ${STATUS_LABEL[t.status]}`;
  if (gate === 'none') return base;
  if (accepted) return `${base} (accepted)`;
  return `${base} — click to resolve`;
}

/**
 * Phase 2+3 chord-loop trust — inline badges, preflight, ack gating.
 * Soft Accept acks rewrite without editing text; hard Pick rewrites token; Edit focuses field.
 * Empty value → no tokens → ungated.
 */
export function RiffChordLoopTokenStrip({
  value,
  onChange,
  softAcks,
  onSoftAcksChange,
  onRequestEdit,
  onBlockedChange,
  disabled,
}: {
  value: string;
  /** Required for hard Pick rewrite. */
  onChange?: (next: string) => void;
  softAcks: ReadonlySet<string>;
  onSoftAcksChange: (next: Set<string>) => void;
  /** Focus / scroll chord loop input for Edit. */
  onRequestEdit?: () => void;
  onBlockedChange?: (blocked: boolean) => void;
  disabled?: boolean;
}) {
  const tokens = useMemo(() => previewRiffChordLoopTokens(value), [value]);
  const summary = useMemo(() => summarizeRiffChordTokenPreviews(tokens), [tokens]);
  const unresolved = useMemo(
    () => countRiffChordLoopUnresolved(tokens, softAcks),
    [tokens, softAcks]
  );
  const blocked = useMemo(
    () => riffChordLoopGenerateBlocked(tokens, softAcks),
    [tokens, softAcks]
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pickCustom, setPickCustom] = useState('');

  useEffect(() => {
    onBlockedChange?.(blocked);
  }, [blocked, onBlockedChange]);

  useEffect(() => {
    setOpenIndex(null);
    setPickCustom('');
  }, [value]);

  if (tokens.length === 0) return null;

  const acceptSoft = (index: number, t: RiffChordTokenPreview) => {
    const next = new Set(softAcks);
    next.add(riffChordTokenAckKey({ index, token: t.token, usedSymbol: t.usedSymbol }));
    onSoftAcksChange(next);
    setOpenIndex(null);
  };

  const pickFallback = (index: number, symbol: string) => {
    if (!onChange) return;
    const next = replaceRiffChordLoopTokenAt(value, index, symbol);
    onChange(next);
    setOpenIndex(null);
    setPickCustom('');
  };

  return (
    <div style={{ marginTop: '0.45rem', opacity: disabled ? 0.65 : 1, maxWidth: 640 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
        {tokens.map((t, i) => {
          const st = STATUS_STYLE[t.status];
          const gate = riffChordTokenGateKind(t.status);
          const softOk =
            gate !== 'soft' ||
            softAcks.has(riffChordTokenAckKey({ index: i, token: t.token, usedSymbol: t.usedSymbol }));
          const resolved = gate === 'none' || (gate === 'soft' && softOk);
          const clickable = !disabled && gate !== 'none' && !(gate === 'soft' && softOk);
          const open = openIndex === i;

          return (
            <span key={`${i}:${t.token}:${t.status}`} style={{ position: 'relative' }}>
              <button
                type="button"
                title={tokenTitle(t, gate, softOk && gate === 'soft')}
                disabled={disabled || gate === 'none' || (gate === 'soft' && softOk)}
                onClick={() => {
                  if (!clickable) return;
                  setOpenIndex(open ? null : i);
                  setPickCustom('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '0.15rem 0.45rem',
                  borderRadius: 4,
                  fontSize: '0.78rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  border: st.border,
                  background: softOk && gate === 'soft' ? 'rgba(34, 197, 94, 0.12)' : st.background,
                  textDecoration:
                    t.status === 'invalid' || t.status === 'unsupported' ? 'underline wavy' : undefined,
                  textUnderlineOffset: 3,
                  cursor: clickable ? 'pointer' : gate === 'none' ? 'default' : 'default',
                  color: 'inherit',
                  opacity: resolved && gate === 'soft' ? 0.9 : 1,
                }}
              >
                {t.token}
                {t.status !== 'valid' ? (
                  <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>
                    → {t.usedSymbol}
                    {gate === 'soft' && softOk ? ' ✓' : ''}
                  </span>
                ) : null}
              </button>
              {open && !disabled ? (
                <div
                  role="dialog"
                  aria-label={`Resolve chord token ${t.token}`}
                  style={{
                    position: 'absolute',
                    zIndex: 20,
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    minWidth: 200,
                    padding: '0.5rem 0.55rem',
                    borderRadius: 6,
                    border: '1px solid var(--border, #444)',
                    background: 'var(--bg-elevated, var(--bg, #1a1a1a))',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    fontSize: '0.78rem',
                  }}
                >
                  <p style={{ margin: '0 0 0.4rem', color: 'var(--text-muted)' }}>
                    {gate === 'soft'
                      ? `Accept rewrite ${t.token} → ${t.usedSymbol}?`
                      : `Unsupported — pick fallback or edit`}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {gate === 'soft' ? (
                      <button
                        type="button"
                        onClick={() => acceptSoft(i, t)}
                        style={{ fontSize: '0.78rem', padding: '0.2rem 0.45rem' }}
                      >
                        Accept
                      </button>
                    ) : (
                      <>
                        {RIFF_CHORD_FALLBACK_OPTIONS.map((sym) => (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => pickFallback(i, sym)}
                            disabled={!onChange}
                            style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}
                          >
                            {sym}
                          </button>
                        ))}
                        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                          <input
                            type="text"
                            value={pickCustom}
                            onChange={(e) => setPickCustom(e.target.value)}
                            placeholder="Custom"
                            disabled={!onChange}
                            style={{
                              width: 72,
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.3rem',
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && pickCustom.trim()) {
                                pickFallback(i, pickCustom.trim());
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={!onChange || !pickCustom.trim()}
                            onClick={() => pickFallback(i, pickCustom.trim())}
                            style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}
                          >
                            Pick
                          </button>
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenIndex(null);
                        onRequestEdit?.();
                      }}
                      style={{ fontSize: '0.78rem', padding: '0.2rem 0.45rem' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
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
        {blocked
          ? ` — Generate blocked (${unresolved.total} unresolved: ${unresolved.soft} soft / ${unresolved.hard} hard)`
          : unresolved.total === 0 && summary.needReview === 0
            ? ''
            : ' — ready'}
      </p>
    </div>
  );
}
