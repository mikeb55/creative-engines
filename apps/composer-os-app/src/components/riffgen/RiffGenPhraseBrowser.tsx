import { useEffect, useMemo, useState } from 'react';

type PhraseRow = Record<string, unknown>;

const EXPANDED_STORAGE_KEY = 'riffgen-phrase-browser-expanded';

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function loadExpandedCategories(): Set<string> {
  try {
    const raw = sessionStorage.getItem(EXPANDED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string' && x.length > 0));
  } catch {
    return new Set();
  }
}

function persistExpandedCategories(expanded: Set<string>): void {
  try {
    sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...expanded].sort()));
  } catch {
    /* ignore quota / private mode */
  }
}

export function RiffGenPhraseBrowser({
  phrases,
  registeredCategories = [],
}: {
  phrases: PhraseRow[];
  /** Schema category ids (incl. empty stubs) from corpus stats. */
  registeredCategories?: string[];
}) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of registeredCategories) {
      if (c) set.add(c);
    }
    for (const p of phrases) {
      const c = asString(p.category);
      if (c) set.add(c);
    }
    return ['', ...[...set].sort()];
  }, [phrases, registeredCategories]);

  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => loadExpandedCategories());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return phrases.filter((p) => {
      if (category && asString(p.category) !== category) return false;
      if (needsReviewOnly) {
        const cur = p.curation as { needsReview?: boolean } | undefined;
        if (!cur?.needsReview) return false;
      }
      if (!q) return true;
      const id = asString(p.id).toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.map(String).join(' ').toLowerCase() : '';
      return id.includes(q) || tags.includes(q);
    });
  }, [phrases, category, query, needsReviewOnly]);

  const groups = useMemo(() => {
    const map = new Map<string, PhraseRow[]>();
    // Seed registered categories so empty stubs still appear as collapsed accordion rows.
    const seed =
      category && category.length > 0
        ? registeredCategories.filter((c) => c === category)
        : registeredCategories.length > 0
          ? registeredCategories
          : [];
    for (const c of seed) {
      if (!map.has(c)) map.set(c, []);
    }
    for (const p of filtered) {
      const c = asString(p.category) || 'uncategorized';
      const list = map.get(c);
      if (list) list.push(p);
      else map.set(c, [p]);
    }
    // When text-filtering, hide empty non-matching groups (no phrases survived filter).
    const q = query.trim();
    const entries = [...map.entries()].filter(([, rows]) => {
      if (!q) return true;
      return rows.length > 0;
    });
    return entries.sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, registeredCategories, category, query]);

  const filterActive = query.trim().length > 0;

  useEffect(() => {
    persistExpandedCategories(expanded);
  }, [expanded]);

  const selected = filtered.find((p) => asString(p.id) === selectedId) ?? null;

  function isGroupOpen(cat: string): boolean {
    if (filterActive) return true;
    return expanded.has(cat);
  }

  function toggleGroup(cat: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

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
        <label style={{ fontSize: '0.85rem', alignSelf: 'center', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={needsReviewOnly}
            onChange={(e) => setNeedsReviewOnly(e.target.checked)}
          />
          Needs review only
        </label>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          {filtered.length} / {phrases.length}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div
          style={{
            margin: 0,
            padding: 0,
            maxHeight: 420,
            overflow: 'auto',
            border: '1px solid var(--border)',
            fontSize: '0.8rem',
          }}
        >
          {groups.length === 0 ? (
            <p style={{ margin: '0.75rem', color: 'var(--text-muted)' }}>No phrases match</p>
          ) : (
            groups.map(([cat, rows]) => {
              const open = isGroupOpen(cat);
              return (
                <div key={cat}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(cat)}
                    aria-expanded={open}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textAlign: 'left',
                      padding: '0.45rem 0.55rem',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--surface-2, #2a2a2a)',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <span aria-hidden="true" style={{ width: '1rem' }}>
                      {open ? '▾' : '▸'}
                    </span>
                    <span>
                      {cat} ({rows.length})
                    </span>
                  </button>
                  {open ? (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {rows.map((p) => {
                        const id = asString(p.id);
                        const active = id === selectedId;
                        const curation = p.curation as
                          | { needsReview?: boolean; reasons?: string[] }
                          | undefined;
                        const needsReview = curation?.needsReview === true;
                        const meterQ =
                          curation?.reasons?.includes('meter_mismatch_file') === true ||
                          curation?.reasons?.includes('meter_mismatch_phrase') === true;
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(id)}
                              style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.4rem 0.5rem 0.4rem 1.6rem',
                                border: 'none',
                                borderBottom: '1px solid var(--border)',
                                background: active
                                  ? 'var(--surface-2, #333)'
                                  : needsReview
                                    ? 'rgba(234, 179, 8, 0.08)'
                                    : 'transparent',
                                color: 'inherit',
                                cursor: 'pointer',
                                borderLeft: needsReview
                                  ? meterQ
                                    ? '3px solid rgba(239, 68, 68, 0.85)'
                                    : '3px solid rgba(234, 179, 8, 0.85)'
                                  : '3px solid transparent',
                              }}
                            >
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                <span>{id}</span>
                                {needsReview ? (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      letterSpacing: '0.02em',
                                      padding: '0.05rem 0.35rem',
                                      borderRadius: 3,
                                      background: meterQ
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : 'rgba(234, 179, 8, 0.22)',
                                      border: meterQ
                                        ? '1px solid rgba(239, 68, 68, 0.5)'
                                        : '1px solid rgba(234, 179, 8, 0.5)',
                                    }}
                                  >
                                    {meterQ ? 'METER QUARANTINE' : 'NEEDS REVIEW'}
                                  </span>
                                ) : null}
                              </div>
                              <div style={{ color: 'var(--text-muted)' }}>
                                {asNumber(p.barCount)} bars · {asString(p.phraseStartType)}→
                                {asString(p.phraseEndType)}
                                {needsReview && curation?.reasons?.length
                                  ? ` · ${curation.reasons.join(', ')}`
                                  : ''}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div style={{ fontSize: '0.85rem' }}>
          {!selected ? (
            <p style={{ color: 'var(--text-muted)' }}>Select a phrase</p>
          ) : (
            <>
              <h4 style={{ margin: '0 0 0.5rem' }}>{asString(selected.id)}</h4>
              {(() => {
                const curation = selected.curation as
                  | { needsReview?: boolean; reasons?: string[] }
                  | undefined;
                if (!curation?.needsReview) return null;
                const meterQ =
                  curation.reasons?.includes('meter_mismatch_file') ||
                  curation.reasons?.includes('meter_mismatch_phrase');
                return (
                  <p
                    role="status"
                    style={{
                      margin: '0 0 0.5rem',
                      padding: '0.45rem 0.55rem',
                      borderRadius: 4,
                      fontSize: '0.82rem',
                      border: meterQ
                        ? '1px solid rgba(239, 68, 68, 0.5)'
                        : '1px solid rgba(234, 179, 8, 0.5)',
                      background: meterQ
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(234, 179, 8, 0.12)',
                    }}
                  >
                    {meterQ
                      ? 'Meter quarantine — file has mid-run time-signature change; stamped meter may be wrong.'
                      : 'Needs review — single-bar leftover and/or mid-run MAX_PHRASE_BARS chop.'}
                    {curation.reasons?.length ? (
                      <span style={{ display: 'block', marginTop: 4, opacity: 0.85 }}>
                        Reasons: {curation.reasons.join(', ')}
                      </span>
                    ) : null}
                  </p>
                );
              })()}
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
