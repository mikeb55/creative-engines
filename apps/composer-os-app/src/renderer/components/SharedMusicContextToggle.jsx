/**
 * V90a — toggle shared MusicContext handoff (Wyble / Martino panels).
 * V90c — stale + hop-limit warnings.
 */
export function SharedMusicContextReadyBadge() {
  return (
    <p
      data-testid="shared-music-context-ready"
      style={{
        margin: '0.5rem 0 0',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
      }}
    >
      ✓ Context ready — chords + motif available to other engines
    </p>
  );
}

const warningStyle = {
  margin: '0.35rem 0 0',
  fontSize: '0.82rem',
  color: 'var(--warning, #b45309)',
};

export function SharedMusicContextToggle({
  sharedMusicContext,
  active,
  onToggle,
  disabled = false,
  isStale = false,
  hopCount = 0,
}) {
  if (!sharedMusicContext) return null;
  return (
    <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
      <button
        type="button"
        className={active ? undefined : 'secondary'}
        data-testid="shared-music-context-toggle"
        onClick={onToggle}
        disabled={disabled}
      >
        {active ? '✓ Using shared context' : 'Use shared context'}
      </button>
      {isStale ? (
        <p data-testid="shared-music-context-stale-warning" style={warningStyle} role="status">
          ⚠ Context may be stale — regenerate to refresh
        </p>
      ) : null}
      {hopCount >= 3 ? (
        <p data-testid="shared-music-context-hop-limit" style={{ ...warningStyle, color: 'var(--error, #ef4444)' }} role="alert">
          ⛔ Hop limit reached — refresh context before continuing
        </p>
      ) : hopCount >= 2 ? (
        <p data-testid="shared-music-context-hop-warning" style={warningStyle} role="status">
          ⚠ Context has passed through {hopCount} engines — verify before use
        </p>
      ) : null}
    </div>
  );
}
