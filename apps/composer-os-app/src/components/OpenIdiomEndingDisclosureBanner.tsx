import type { OpenIdiomEndingDisclosure } from '@composer-os/core/gce/finalBarTensionGate';

/**
 * Chord-loop-trust style banner for intentional open/unresolved terminal endings.
 * Shown only when endingContext is open_idiom and final-bar tension would fail under terminal rules.
 * Not used for ordinary riff loops (endingContext=loop).
 */
export function OpenIdiomEndingDisclosureBanner({
  disclosure,
}: {
  disclosure: OpenIdiomEndingDisclosure | null | undefined;
}) {
  if (!disclosure) return null;

  return (
    <div
      role="status"
      style={{
        marginTop: '0.75rem',
        marginBottom: '0.5rem',
        padding: '0.75rem 0.9rem',
        borderRadius: 8,
        border: '1px solid rgba(234, 179, 8, 0.45)',
        background: 'rgba(234, 179, 8, 0.1)',
        fontSize: '0.85rem',
        lineHeight: 1.45,
        maxWidth: 640,
      }}
    >
      <p style={{ margin: '0 0 0.35rem', fontWeight: 600, color: 'var(--text)' }}>
        Open ending acknowledged
      </p>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>
        {disclosure.summary} Final chord <code>{disclosure.finalChord || '(empty)'}</code> (bar{' '}
        {disclosure.finalBar}, tension {disclosure.tension.toFixed(2)}
        {disclosure.viaOpenIdiomDefault ? '; preference openIdiomDefault' : ''}).
      </p>
    </div>
  );
}