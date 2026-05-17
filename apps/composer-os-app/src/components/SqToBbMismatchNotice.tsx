import type { CSSProperties } from 'react';

const noticeBox: CSSProperties = {
  marginTop: '0.65rem',
  padding: '0.55rem 0.65rem',
  borderRadius: 6,
  border: '1px solid rgba(239, 68, 68, 0.35)',
  background: 'rgba(239, 68, 68, 0.08)',
  fontSize: '0.82rem',
  lineHeight: 1.45,
  color: 'var(--text)',
};

const STILL_GENERATE_SUFFIX = 'You can still generate.';

export function SqToBbMismatchNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const body = message.endsWith(STILL_GENERATE_SUFFIX)
    ? message.slice(0, -STILL_GENERATE_SUFFIX.length).trimEnd()
    : message;

  return (
    <div role="status" style={noticeBox} aria-label="Era and BB style strong mismatch advisory">
      <p style={{ margin: '0 0 0.5rem' }}>
        <span aria-hidden style={{ marginRight: 6 }}>
          [!]
        </span>
        {body}
      </p>
      <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)' }}>{STILL_GENERATE_SUFFIX}</p>
      <button type="button" className="secondary" onClick={onDismiss} style={{ fontSize: '0.78rem' }}>
        Dismiss
      </button>
    </div>
  );
}
