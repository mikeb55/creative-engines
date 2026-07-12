import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FIX_CATEGORY_EMPTY_STATE,
  FIX_CATEGORY_INFO_TOOLTIP,
  FIX_CATEGORY_LABEL,
  FIX_CATEGORY_ORDER,
  FIX_CATEGORY_SUBTITLE,
  resolveComposerFixCategory,
  type ComposerFixCategory,
} from '../constants/composerFixCategories';
import { buildWriterRecipeCardModel } from '../utils/writerRecipeCardModel';

export type FixCategoryComposerOption = { id: string; label: string };

export type FixCategoryFilterChip = ComposerFixCategory | 'all';

const FILTER_CHIPS: { id: FixCategoryFilterChip; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'standard-force', label: 'Resolved' },
  { id: 'already-clear', label: 'Confirmed clean' },
  { id: 'idiomatic-bias', label: 'Open' },
  { id: 'custom', label: 'Special handling' },
  { id: 'unclassified', label: 'Not tagged yet' },
];

function composerOneLiner(id: string): string {
  return buildWriterRecipeCardModel(id)?.oneLine ?? 'Song Mode harmonic voice.';
}

export type FixCategoryBrowserProps = {
  composers: readonly FixCategoryComposerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenGenerate: (id: string) => void;
  isActive: boolean;
};

export function FixCategoryBrowser({
  composers,
  selectedId,
  onSelect,
  onOpenGenerate,
  isActive,
}: FixCategoryBrowserProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<FixCategoryFilterChip>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [isActive]);

  const composerById = useMemo(() => new Map(composers.map((c) => [c.id, c])), [composers]);

  const matchesSearch = useCallback(
    (c: FixCategoryComposerOption) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    },
    [query],
  );

  const filteredComposers = useMemo(() => {
    const base = composers.filter(matchesSearch);
    if (chip === 'all') return base;
    return base
      .filter((c) => resolveComposerFixCategory(c.id) === chip)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [chip, composers, matchesSearch]);

  const groupedSections = useMemo(() => {
    if (chip !== 'all') {
      return [
        {
          category: chip as ComposerFixCategory,
          label: `${FIX_CATEGORY_LABEL[chip as ComposerFixCategory]} (${filteredComposers.length})`,
          items: filteredComposers,
        },
      ];
    }

    const sections: { category: ComposerFixCategory; label: string; items: FixCategoryComposerOption[] }[] = [];
    for (const category of FIX_CATEGORY_ORDER) {
      const items = filteredComposers
        .filter((c) => resolveComposerFixCategory(c.id) === category)
        .sort((a, b) => a.label.localeCompare(b.label));
      if (items.length > 0) {
        sections.push({
          category,
          label: `${FIX_CATEGORY_LABEL[category]} (${items.length})`,
          items,
        });
      }
    }
    return sections;
  }, [chip, filteredComposers]);

  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('');
      }
      if (e.key === 'Enter' && selectedId) {
        const inRoot = rootRef.current?.contains(document.activeElement);
        if (inRoot) {
          e.preventDefault();
          onOpenGenerate(selectedId);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, onOpenGenerate, selectedId]);

  const selectedComposer = selectedId ? composerById.get(selectedId) : null;

  const handleSelect = (id: string) => {
    onSelect(id);
  };

  const handleDoubleClick = (id: string) => {
    handleSelect(id);
    onOpenGenerate(id);
  };

  return (
    <div
      ref={rootRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 11.5rem)',
        minHeight: 420,
        maxHeight: 720,
        overflow: 'hidden',
      }}
    >
      <div style={{ flexShrink: 0, marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>How pieces end</h2>
          <button
            type="button"
            title={FIX_CATEGORY_INFO_TOOLTIP}
            aria-label={FIX_CATEGORY_INFO_TOOLTIP}
            style={{
              border: '1px solid var(--border)',
              background: 'transparent',
              borderRadius: '50%',
              width: 22,
              height: 22,
              fontSize: '0.75rem',
              lineHeight: 1,
              cursor: 'help',
              color: 'var(--text-muted)',
              padding: 0,
              flexShrink: 0,
            }}
          >
            i
          </button>
        </div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {FIX_CATEGORY_SUBTITLE}
        </p>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search composers… (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search composers"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '0.5rem 0.65rem',
            fontSize: '0.95rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg-panel, transparent)',
          }}
        />
        <div
          role="toolbar"
          aria-label="How pieces end filters"
          style={{
            display: 'flex',
            gap: '0.35rem',
            marginTop: '0.5rem',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            paddingBottom: 2,
          }}
        >
          {FILTER_CHIPS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setChip(f.id)}
              aria-pressed={chip === f.id}
              style={{
                flexShrink: 0,
                padding: '0.28rem 0.55rem',
                fontSize: '0.78rem',
                borderRadius: 999,
                border: chip === f.id ? '1px solid var(--accent, #6ae)' : '1px solid var(--border)',
                background: chip === f.id ? 'rgba(100,160,255,0.14)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div
        role="listbox"
        aria-label="Composers by how pieces end"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '0.35rem 0',
          marginBottom: '0.5rem',
        }}
      >
        {groupedSections.length === 0 ||
        (chip !== 'all' && filteredComposers.length === 0) ? (
          <p style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            {FIX_CATEGORY_EMPTY_STATE}
          </p>
        ) : (
          groupedSections.map((section) => (
            <div key={section.category}>
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  background: 'var(--bg, #fff)',
                  borderBottom: '1px solid var(--border-subtle, rgba(128,128,128,0.2))',
                }}
              >
                {section.label}
              </div>
              {section.items.map((c) => {
                const category = resolveComposerFixCategory(c.id);
                const isSelected = selectedId === c.id;
                const showDesc = isSelected || hoveredId === c.id;
                return (
                  <div
                    key={c.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(c.id)}
                    onDoubleClick={() => handleDoubleClick(c.id)}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId((prev) => (prev === c.id ? null : prev))}
                    style={{
                      padding: '0.45rem 0.75rem',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(100,160,255,0.16)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent, #6ae)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ flex: 1, fontWeight: isSelected ? 600 : 400, fontSize: '0.92rem' }}>
                        {c.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '0.1rem 0.4rem',
                          borderRadius: 4,
                          border: '1px solid var(--border-subtle, rgba(128,128,128,0.3))',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {FIX_CATEGORY_LABEL[category]}
                      </span>
                    </div>
                    {showDesc ? (
                      <p
                        style={{
                          margin: '0.25rem 0 0',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.35,
                        }}
                      >
                        {composerOneLiner(c.id)}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {selectedComposer ? (
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          Selected: <strong style={{ color: 'var(--text)' }}>{selectedComposer.label}</strong>
          {' · '}
          {FIX_CATEGORY_LABEL[resolveComposerFixCategory(selectedComposer.id)]}
          {' · '}
          double-click or Enter → Generate
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          Select a composer to preview how pieces end.
        </p>
      )}
    </div>
  );
}