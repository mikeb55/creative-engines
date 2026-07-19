import { useMemo, useState } from 'react';

type PhraseRow = Record<string, unknown>;

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function RiffGenPhraseBrowser({ phrases }: { phrases: PhraseRow[] }) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of phrases) {
      const c = asString(p.category);
      if (c) set.add(c);
    }
    return ['', ...[...set].sort()];
  }, [phrases]);

  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return phrases.filter((p) => {
      if (category && asString(p.category) !== category) return false;
      if (!q) return true;
      const id = asString(p.id).toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.map(String).join(' ').toLowerCase() : '';
      return id.includes(q) || tags.includes(q);
    });
  }, [phrases, category, query]);

  const selected = filtered.find((p) => asString(p.id) === selectedId) ?? null;

  return (
    <section
      style={{
        padding: '1rem',
        border: '1px solid var(--border)',
        borderRadius: 4,
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>Phrase browser</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.85rem' }}>
          Category{' '}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c || 'all'} value={c}>
                {c || 'All'}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '0.85rem', flex: '1 1 200px' }}>
          Filter{' '}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="id or tag"
            style={{ width: '100%', maxWidth: 280 }}
          />
        </label>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          {filtered.length} / {phrases.length}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            maxHeight: 420,
            overflow: 'auto',
            border: '1px solid var(--border)',
            fontSize: '0.8rem',
          }}
        >
          {filtered.map((p) => {
            const id = asString(p.id);
            const active = id === selectedId;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.4rem 0.5rem',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    background: active ? 'var(--surface-2, #333)' : 'transparent',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <div>{id}</div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {asString(p.category)} · {asNumber(p.barCount)} bars · {asString(p.phraseStartType)}→
                    {asString(p.phraseEndType)}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div style={{ fontSize: '0.85rem' }}>
          {!selected ? (
            <p style={{ color: 'var(--text-muted)' }}>Select a phrase</p>
          ) : (
            <>
              <h4 style={{ margin: '0 0 0.5rem' }}>{asString(selected.id)}</h4>
              <p style={{ margin: '0 0 0.5rem' }}>
                {asString(selected.category)} · bars {asNumber(selected.barCount)} · start{' '}
                {asString(selected.phraseStartType)} · end {asString(selected.phraseEndType)}
              </p>
              <p style={{ margin: '0 0 0.5rem' }}>
                register {asNumber(selected.registerLow)}–{asNumber(selected.registerHigh)} (center{' '}
                {asNumber(selected.registerCenter)}) · chromaticity {asNumber(selected.chromaticityScore)}
              </p>
              <p style={{ margin: '0 0 0.5rem' }}>
                tags:{' '}
                {Array.isArray(selected.tags) && selected.tags.length
                  ? selected.tags.map(String).join(', ')
                  : '—'}
              </p>
              <p style={{ margin: '0 0 0.5rem' }}>
                intervals:{' '}
                {Array.isArray(selected.intervalSequence)
                  ? selected.intervalSequence.map(String).join(' ')
                  : '—'}
              </p>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                noteEvents:{' '}
                {Array.isArray(selected.noteEvents) ? selected.noteEvents.length : 0} (read-only
                preview)
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}