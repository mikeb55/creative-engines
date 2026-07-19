import type { RiffChordLoopDisclosure } from '@composer-os/core/riff-generator/riffChordLoop';
import { riffChordLoopDisclosureHasIssues } from '@composer-os/core/riff-generator/riffChordLoop';

function formatBars(bars: number[]): string {
  if (bars.length === 0) return '';
  if (bars.length <= 8) return bars.join(', ');
  return `${bars.slice(0, 6).join(', ')}, … (+${bars.length - 6})`;
}

/**
 * Phase 1 chord-loop trust banner — post-generate only.
 * Shows typed → used when normalizeChordLoop substituted or filled Am7 for null parses.
 */
export function RiffChordLoopDisclosureBanner({
  disclosure,
}: {
  disclosure: RiffChordLoopDisclosure | null | undefined;
}) {
  if (!riffChordLoopDisclosureHasIssues(disclosure) || !disclosure) return null;

  const n = disclosure.substitutions.length;
  const m = disclosure.unsupported.length;
  const rows = [...disclosure.unsupported, ...disclosure.substitutions];

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
      <p style={{ margin: '0 0 0.45rem', fontWeight: 600, color: 'var(--text)' }}>
        Generated with {n} reviewed substitution{n === 1 ? '' : 's'} / {m} unsupported token
        {m === 1 ? '' : 's'}
      </p>
      <ul style={{ margin: 0, paddingLeft: '1.15rem' }}>
        {rows.map((row) => (
          <li key={`${row.kind}:${row.originalToken}:${row.usedSymbol}`} style={{ marginBottom: 4 }}>
            <code>{row.originalToken}</code>
            {' → '}
            <code>{row.usedSymbol}</code>
            <span style={{ color: 'var(--text-muted)' }}>
              {' '}
              ({row.kind}
              {row.bars.length ? `; bar${row.bars.length === 1 ? '' : 's'} ${formatBars(row.bars)}` : ''})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}