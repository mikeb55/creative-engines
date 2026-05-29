/**
 * V90a — toggle shared MusicContext handoff (Wyble / Martino panels).
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

export function SharedMusicContextToggle({ sharedMusicContext, active, onToggle, disabled = false }) {
  if (!sharedMusicContext) return null;
  return (
    <button
      type="button"
      className={active ? undefined : 'secondary'}
      data-testid="shared-music-context-toggle"
      onClick={onToggle}
      disabled={disabled}
      style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}
    >
      {active ? '✓ Using shared context' : 'Use shared context'}
    </button>
  );
}
