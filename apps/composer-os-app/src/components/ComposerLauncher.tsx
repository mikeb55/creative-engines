import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { buildWriterRecipeCardModel } from '../utils/writerRecipeCardModel';
import { AuditionDock } from './AuditionDock';

export type ComposerOption = { id: string; label: string };

export type ComposerTier = 'premium' | 'strong' | 'experimental' | 'library';

export type ComposerFilterChip =
  | 'pinned'
  | 'recent'
  | 'premium'
  | 'strong'
  | 'experimental'
  | 'library'
  | 'all';

const PINNED_STORAGE_KEY = 'composerOS_pinnedComposers';
const RECENT_STORAGE_KEY = 'composerOS_recentComposers';
const MAX_RECENT = 5;

/** Tier assignment lists — ids not listed default to library. */
export const COMPOSER_TIERS: Record<Exclude<ComposerTier, never>, readonly string[]> = {
  premium: [
    'frank_zappa',
    'brian_wilson',
    'bacharach',
    'radiohead',
    'wayne_shorter',
    'debussy',
    'pat_metheny',
    'sonic_youth',
    'joni_mitchell',
    'monk',
    'charlie_parker',
    'barry_harris',
    'bill_evans',
    'andrew_hill',
    'donald_fagen',
    'ecm_chamber',
    'herbie_hancock',
    'jobim',
    'sondheim',
    'kate_bush',
    'james_brown',
    'stevie_wonder',
    'strayhorn',
    'beatles',
    'fripp',
  ],
  strong: [
    'thad_jones',
    'count_basie',
    'miles_davis',
    'maria_schneider',
    'kenny_wheeler',
    'jan_garbarek',
    'claus_ogerman',
    'don_sebesky',
    'duke_ellington',
    'henry_threadgill',
    'charles_mingus',
    'gil_evans',
    'carla_bley',
    'bill_holman',
    'oliver_nelson',
    'bob_brookmeyer',
    'sammy_nestico',
    'clare_fischer',
    'quincy_jones_bb',
    'jim_hall',
    'john_coltrane',
    'steve_reich',
    'satie',
    'arvo_part',
    'cole_porter',
    'gershwin',
    'prince',
    'bela_bartok',
    'alban_berg',
    'messiaen',
    'eberhard_weber',
    'lalo_schifrin',
    'fela_kuti',
    'mccoy_tyner',
  ],
  experimental: [
    'crumb',
    'shostakovich',
    'lachenmann',
    'ligeti',
    'turtle_island',
    'dutilleux',
    'ravel',
    'ornette_coleman',
    'beethoven_sq',
    'bartok_sq',
    'messiaen_sq',
    'david_gilmour',
    'larry_carlton',
    'hendrix',
    'weather_report',
    'mahavishnu',
  ],
  library: [
    'bach',
    'beethoven',
    'mahler',
    'prokofiev',
    'schubert',
    'stravinsky',
    'bob_dylan',
    'paul_simon',
    'carole_king',
    'max_martin',
    'randy_newman',
    'richard_thompson',
    'jeff_lynne',
    'paul_mccartney',
    'kurt_weill',
    'kendrick_lamar',
    'xtc',
    'blur',
    'pavement',
    'arcade_fire',
  ],
};

const TIER_ALIAS: Record<string, string> = {
  monk: 'thelonious_monk',
  jobim: 'antonio_carlos_jobim',
  sondheim: 'stephen_sondheim',
  strayhorn: 'billy_strayhorn',
  crumb: 'crumb_black_angels',
  bela_bartok: 'bartok',
  beethoven_sq: 'beethoven_late',
  bartok_sq: 'sq_vrb_bartok',
  messiaen_sq: 'sq_vrb_messiaen',
  quincy_jones_bb: 'quincy_jones_film',
};

const TIER_ORDER: ComposerTier[] = ['premium', 'strong', 'experimental', 'library'];

const TIER_HEADERS: Record<ComposerTier, string> = {
  premium: '★★★ Premium',
  strong: '★★ Strong',
  experimental: '★ Experimental',
  library: '뿯½ Library',
};

const TIER_BADGE: Record<ComposerTier, string> = {
  premium: 'Premium',
  strong: 'Strong',
  experimental: 'Experimental',
  library: 'Library',
};

const FILTER_CHIPS: { id: ComposerFilterChip; label: string }[] = [
  { id: 'pinned', label: 'Pinned' },
  { id: 'recent', label: 'Recent' },
  { id: 'premium', label: 'Premium' },
  { id: 'strong', label: 'Strong' },
  { id: 'experimental', label: 'Experimental' },
  { id: 'library', label: 'Library' },
  { id: 'all', label: 'All' },
];

function readStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  } catch {
    return [];
  }
}

function writeStringArray(key: string, values: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* ignore quota */
  }
}

function normalizeTierLookupId(id: string): string {
  return TIER_ALIAS[id] ?? id;
}

function buildTierLookup(): Map<string, ComposerTier> {
  const map = new Map<string, ComposerTier>();
  for (const tier of TIER_ORDER) {
    for (const rawId of COMPOSER_TIERS[tier]) {
      const canonical = normalizeTierLookupId(rawId);
      map.set(canonical, tier);
      map.set(rawId, tier);
    }
  }
  return map;
}

const TIER_LOOKUP = buildTierLookup();

export function resolveComposerTier(id: string): ComposerTier {
  return TIER_LOOKUP.get(id) ?? TIER_LOOKUP.get(normalizeTierLookupId(id)) ?? 'library';
}

function composerOneLiner(id: string): string {
  return buildWriterRecipeCardModel(id)?.oneLine ?? 'Song Mode harmonic voice.';
}

function StandaloneEnginesSection() {
  const [open, setOpen] = useState(false);
  const [wsTitle, setWsTitle] = useState('');
  const [wsCustomChords, setWsCustomChords] = useState('');
  const [wsSongForm, setWsSongForm] = useState('aaba');
  const [wsResult, setWsResult] = useState('');
  const [wsLoading, setWsLoading] = useState(false);
  const [monkTitle, setMonkTitle] = useState('');
  const [monkCustomChords, setMonkCustomChords] = useState('');
  const [monkResult, setMonkResult] = useState('');
  const [monkLoading, setMonkLoading] = useState(false);
  const [cpTitle, setCpTitle] = useState('');
  const [cpCustomChords, setCpCustomChords] = useState('');
  const [cpSongForm, setCpSongForm] = useState('aaba');
  const [cpResult, setCpResult] = useState<string | null>(null);
  const [cpLoading, setCpLoading] = useState(false);

  const songFormSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
      <option value="aaba">AABA — 32 bars</option>
      <option value="abac">ABAC — 32 bars</option>
      <option value="aba">ABA — 24 bars</option>
      <option value="ab">AB — 16 bars</option>
      <option value="blues12">Blues (12 bars)</option>
      <option value="blues24">Blues (24 bars)</option>
      <option value="aab">AAB — 24 bars</option>
      <option value="abcb">ABCB — 32 bars</option>
    </select>
  );

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      style={{
        flexShrink: 0,
        marginTop: '0.5rem',
        padding: '0.65rem 0.75rem',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-panel, rgba(128,128,128,0.04))',
      }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Standalone Engines</summary>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.65rem 0 0.5rem' }}>
        Legacy Python lead-sheet engines — Wayne Shorter, Monk, Charlie Parker.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem' }}>
          <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>Wayne Shorter</h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
            Instrumental composition — asymmetrical form, motivic development.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              placeholder="Composition title"
              value={wsTitle}
              onChange={(e) => setWsTitle(e.target.value)}
              style={{ flex: 1, padding: '0.3rem' }}
            />
            <button
              disabled={!wsTitle || wsLoading}
              onClick={() => {
                setWsLoading(true);
                const trimmed = wsCustomChords.trim();
                (api as { generateWayneShorter?: (p: Record<string, unknown>) => Promise<{ path?: string }> })
                  .generateWayneShorter?.({
                    title: wsTitle,
                    seed: Math.floor(Math.random() * 1e9),
                    song_form: wsSongForm,
                    ...(trimmed.length > 0 ? { custom_chords: trimmed } : {}),
                  })
                  .then((r) => {
                    setWsLoading(false);
                    setWsResult(r?.path ?? '');
                    setWsTitle('');
                  })
                  .catch((e: unknown) => {
                    setWsLoading(false);
                    setWsResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
                  });
              }}
            >
              {wsLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          <input
            type="text"
            placeholder="Custom chords (optional)"
            value={wsCustomChords}
            onChange={(e) => setWsCustomChords(e.target.value)}
            style={{ width: '100%', padding: '0.3rem', boxSizing: 'border-box', marginBottom: '0.35rem' }}
          />
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Song form</label>
          {songFormSelect(wsSongForm, setWsSongForm)}
          {wsResult ? (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setWsResult('')}>
                Clear
              </button>
            </div>
          ) : null}
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem' }}>
          <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>Thelonious Monk</h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
            Blues-rooted — tritone leaps, flat-9 dominants, chromatic neighbours.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              placeholder="Composition title"
              value={monkTitle}
              onChange={(e) => setMonkTitle(e.target.value)}
              style={{ flex: 1, padding: '0.3rem' }}
            />
            <button
              disabled={!monkTitle || monkLoading}
              onClick={() => {
                setMonkLoading(true);
                const trimmed = monkCustomChords.trim();
                (api as { generateMonk?: (p: Record<string, unknown>) => Promise<{ path?: string }> })
                  .generateMonk?.({
                    title: monkTitle,
                    seed: Math.floor(Math.random() * 1e9),
                    ...(trimmed.length > 0 ? { custom_chords: trimmed } : {}),
                  })
                  .then((r) => {
                    setMonkLoading(false);
                    if (r?.path) {
                      setMonkResult(r.path);
                      setMonkTitle('');
                    } else {
                      setMonkResult('');
                    }
                  })
                  .catch((e: unknown) => {
                    setMonkLoading(false);
                    setMonkResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
                  });
              }}
            >
              {monkLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          <input
            type="text"
            placeholder="Custom chords (optional)"
            value={monkCustomChords}
            onChange={(e) => setMonkCustomChords(e.target.value)}
            style={{ width: '100%', padding: '0.3rem', boxSizing: 'border-box' }}
          />
          {monkResult ? (
            <div style={{ marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setMonkResult('')}>
                Clear
              </button>
            </div>
          ) : null}
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem' }}>
          <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>Charlie Parker</h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
            Bebop melody — approach/enclosure, ii–V–I awareness.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              placeholder="Composition title"
              value={cpTitle}
              onChange={(e) => setCpTitle(e.target.value)}
              style={{ flex: 1, padding: '0.3rem' }}
            />
            <button
              disabled={!cpTitle || cpLoading}
              onClick={() => {
                setCpLoading(true);
                const trimmed = cpCustomChords.trim();
                (api as { generateCharliePark?: (p: Record<string, unknown>) => Promise<{ path?: string }> })
                  .generateCharliePark?.({
                    title: cpTitle,
                    seed: Math.floor(Math.random() * 1e9),
                    song_form: cpSongForm,
                    ...(trimmed.length > 0 ? { custom_chords: trimmed } : {}),
                  })
                  .then((r) => {
                    setCpLoading(false);
                    setCpResult(r?.path ?? '');
                    setCpTitle('');
                  })
                  .catch((e: unknown) => {
                    setCpLoading(false);
                    setCpResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
                  });
              }}
            >
              {cpLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          <input
            type="text"
            placeholder="Custom chords (optional)"
            value={cpCustomChords}
            onChange={(e) => setCpCustomChords(e.target.value)}
            style={{ width: '100%', padding: '0.3rem', boxSizing: 'border-box', marginBottom: '0.35rem' }}
          />
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Song form</label>
          {songFormSelect(cpSongForm, setCpSongForm)}
          {cpResult ? (
            <div style={{ marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setCpResult(null)}>
                Clear
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </details>
  );
}

export type ComposerLauncherProps = {
  composers: readonly ComposerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenGenerate: (id: string) => void;
  onGenerateNow: (id: string) => void;
  /** Tab is visible — autofocus search on open. */
  isActive: boolean;
  onRecordRecent: (id: string) => void;
};

export function ComposerLauncher({
  composers,
  selectedId,
  onSelect,
  onOpenGenerate,
  isActive,
  onRecordRecent,
}: ComposerLauncherProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<ComposerFilterChip>('all');
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readStringArray(PINNED_STORAGE_KEY));
  const [recentIds, setRecentIds] = useState<string[]>(() => readStringArray(RECENT_STORAGE_KEY));
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [isActive]);

  const persistPinned = useCallback((next: string[]) => {
    setPinnedIds(next);
    writeStringArray(PINNED_STORAGE_KEY, next);
  }, []);

  const togglePin = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = pinnedIds.includes(id) ? pinnedIds.filter((x) => x !== id) : [...pinnedIds, id];
      persistPinned(next);
    },
    [pinnedIds, persistPinned],
  );

  const composerById = useMemo(() => new Map(composers.map((c) => [c.id, c])), [composers]);

  const matchesSearch = useCallback(
    (c: ComposerOption) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    },
    [query],
  );

  const filteredComposers = useMemo(() => {
    const base = composers.filter(matchesSearch);
    if (chip === 'pinned') {
      return pinnedIds.map((id) => composerById.get(id)).filter((c): c is ComposerOption => Boolean(c));
    }
    if (chip === 'recent') {
      return recentIds.map((id) => composerById.get(id)).filter((c): c is ComposerOption => Boolean(c));
    }
    if (chip === 'premium' || chip === 'strong' || chip === 'experimental' || chip === 'library') {
      return base
        .filter((c) => resolveComposerTier(c.id) === chip)
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return base;
  }, [chip, composers, composerById, matchesSearch, pinnedIds, recentIds]);

  const groupedSections = useMemo(() => {
    if (chip === 'pinned' || chip === 'recent') {
      return [{ tier: null as ComposerTier | null, label: chip === 'pinned' ? 'Pinned' : 'Recent', items: filteredComposers }];
    }

    const pinnedSet = new Set(pinnedIds);
    const sections: { tier: ComposerTier | null; label: string; items: ComposerOption[] }[] = [];

    if (chip === 'all' && pinnedIds.length > 0) {
      const pinnedItems = pinnedIds
        .map((id) => composerById.get(id))
        .filter((c): c is ComposerOption => Boolean(c) && matchesSearch(c));
      if (pinnedItems.length > 0) {
        sections.push({ tier: null, label: '★ Pinned', items: pinnedItems.sort((a, b) => a.label.localeCompare(b.label)) });
      }
    }

    for (const tier of TIER_ORDER) {
      if (chip !== 'all' && chip !== tier) continue;
      const items = filteredComposers
        .filter((c) => resolveComposerTier(c.id) === tier)
        .filter((c) => !(chip === 'all' && pinnedSet.has(c.id)))
        .sort((a, b) => a.label.localeCompare(b.label));
      if (items.length > 0) {
        sections.push({ tier, label: `${TIER_HEADERS[tier]} (${items.length})`, items });
      }
    }

    return sections;
  }, [chip, composerById, filteredComposers, matchesSearch, pinnedIds]);

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
          onRecordRecent(selectedId);
          onOpenGenerate(selectedId);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, onOpenGenerate, onRecordRecent, selectedId]);

  const selectedComposer = selectedId ? composerById.get(selectedId) : null;

  const handleSelect = (id: string) => {
    onSelect(id);
    const nextRecent = [id, ...recentIds.filter((x) => x !== id)].slice(0, MAX_RECENT);
    setRecentIds(nextRecent);
    writeStringArray(RECENT_STORAGE_KEY, nextRecent);
    onRecordRecent(id);
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
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem' }}>Composers</h2>
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
          aria-label="Composer filters"
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
        aria-label="Composer list"
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
        {groupedSections.length === 0 ? (
          <p style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>No composers match.</p>
        ) : (
          groupedSections.map((section) => (
            <div key={section.label}>
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
                const tier = resolveComposerTier(c.id);
                const isSelected = selectedId === c.id;
                const isPinned = pinnedIds.includes(c.id);
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
                      <button
                        type="button"
                        aria-label={isPinned ? 'Unpin composer' : 'Pin composer'}
                        onClick={(e) => togglePin(c.id, e)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.95rem',
                          lineHeight: 1,
                          color: isPinned ? '#e6b422' : 'var(--text-muted)',
                        }}
                      >
                        ★
                      </button>
                      <span style={{ flex: 1, fontWeight: isSelected ? 600 : 400, fontSize: '0.92rem' }}>{c.label}</span>
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
                        {TIER_BADGE[tier]}
                      </span>
                    </div>
                    {showDesc ? (
                      <p
                        style={{
                          margin: '0.25rem 0 0 1.4rem',
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

      <StandaloneEnginesSection />

      <AuditionDock
        composerId={selectedId}
        composerLabel={selectedComposer?.label ?? null}
        onOpenFullControls={onOpenGenerate}
      />
    </div>
  );
}
