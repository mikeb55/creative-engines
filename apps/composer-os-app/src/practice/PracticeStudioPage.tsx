import { useMemo, useState } from 'react';
import { FretboardPanel } from '../components/music/FretboardPanel';
import { navigateToRoute } from '../router/appRouter';
import {
  CHROMATIC_MASK_COUNT,
  CHROMATIC_SET_MASK,
  EMPTY_SET_MASK,
  MATHEMATICAL_SET_STATUS,
  TONIC_FIXED_MASK_COUNT,
  explorerRowLabel,
  filterScaleExplorer,
  getScaleExplorerEntry,
  pageScaleExplorer,
  scaleExplorerFamilies,
  scaleExplorerStatuses,
  type ScaleExplorerView,
} from './scaleExplorer';
import {
  SCALE_FRET_WINDOW,
  STANDARD_TUNING_LABEL,
  standardTuningPitchClassMarkers,
} from './standardFretMarkers';

const FIELD_STYLE = { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '13px' } as const;

export function PracticeStudioPage() {
  const [view, setView] = useState<ScaleExplorerView>('all');
  const [cardinality, setCardinality] = useState<string>('');
  const [family, setFamily] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedMask, setSelectedMask] = useState(EMPTY_SET_MASK);

  const families = useMemo(() => scaleExplorerFamilies(), []);
  const statuses = useMemo(() => scaleExplorerStatuses(), []);
  const filtered = useMemo(
    () =>
      filterScaleExplorer({
        view,
        cardinality: cardinality === '' ? null : Number(cardinality),
        family: family || null,
        status: status || null,
        search,
      }),
    [view, cardinality, family, status, search]
  );
  const paged = pageScaleExplorer(filtered, page);
  const selected = getScaleExplorerEntry(selectedMask);
  const selectedVisible = filtered.some((entry) => entry.mask === selectedMask);
  const markers = standardTuningPitchClassMarkers(selected.pitchClasses);
  const pages = ['#/pentatonic', '#/hexatonic'] as const;

  return (
    <div data-testid="practice-studio">
      <h2 style={{ marginTop: 0 }}>Practice &amp; Scales Studio</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Read-only scale inspection. Mathematical pitch-class sets stay unnamed unless a registry already names them.
      </p>

      <section aria-labelledby="scale-explorer-heading" style={{ marginTop: '1rem' }}>
        <h3 id="scale-explorer-heading" style={{ marginBottom: '0.35rem' }}>Scale Explorer</h3>
        <p data-testid="explorer-count" style={{ fontSize: '0.85rem' }}>
          {view === 'all'
            ? `${CHROMATIC_MASK_COUNT} pitch-class sets, including the empty set and the chromatic set.`
            : `${TONIC_FIXED_MASK_COUNT} tonic-fixed sets. Pitch class 0 is included. The empty set is excluded. The chromatic set is included.`}
          {` ${filtered.length} match the filters.`}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '0.75rem 0' }}>
          <label style={FIELD_STYLE}>
            View
            <select
              aria-label="Explorer view"
              value={view}
              onChange={(event) => {
                const next = event.target.value as ScaleExplorerView;
                setView(next);
                setPage(0);
                if (next === 'tonic-fixed' && selectedMask === EMPTY_SET_MASK) setSelectedMask(1);
              }}
            >
              <option value="all">All pitch-class sets</option>
              <option value="tonic-fixed">Tonic-fixed collections</option>
            </select>
          </label>
          <label style={FIELD_STYLE}>
            Cardinality
            <select
              aria-label="Pitch-class cardinality"
              value={cardinality}
              onChange={(event) => {
                setCardinality(event.target.value);
                setPage(0);
              }}
            >
              <option value="">Any</option>
              {Array.from({ length: 13 }, (_, size) => (
                <option key={size} value={String(size)}>{size}</option>
              ))}
            </select>
          </label>
          <label style={FIELD_STYLE}>
            Family
            <select
              aria-label="Collection family"
              value={family}
              onChange={(event) => {
                setFamily(event.target.value);
                setPage(0);
              }}
            >
              <option value="">Any</option>
              {families.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label style={FIELD_STYLE}>
            Status
            <select
              aria-label="Curation status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
            >
              <option value="">Any</option>
              {statuses.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label style={{ ...FIELD_STYLE, flex: '1 1 12rem' }}>
            Search
            <input
              aria-label="Search pitch classes, identifier, or name"
              value={search}
              placeholder="Pitch classes, id, or name"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        <ul data-testid="explorer-page" style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '16rem', overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
          {paged.rows.map((entry) => {
            const active = entry.mask === selectedMask;
            return (
              <li key={entry.mask}>
                <button
                  type="button"
                  data-testid={`explorer-mask-${entry.mask}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setSelectedMask(entry.mask)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.35rem 0.6rem',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    background: active ? 'var(--border)' : 'transparent',
                    color: 'inherit',
                  }}
                >
                  <span style={{ fontFamily: 'ui-monospace, monospace' }}>{entry.mask}</span>
                  {' · '}
                  {explorerRowLabel(entry)}
                  {entry.registrations.length === 0 ? ` · ${MATHEMATICAL_SET_STATUS}` : ''}
                </button>
              </li>
            );
          })}
        </ul>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
          <button type="button" className="secondary" disabled={paged.page === 0} onClick={() => setPage(paged.page - 1)}>
            Previous
          </button>
          <span data-testid="explorer-page-label" style={{ fontSize: '0.85rem' }}>
            Page {paged.page + 1} of {paged.pageCount}
          </span>
          <button type="button" className="secondary" disabled={paged.page >= paged.pageCount - 1} onClick={() => setPage(paged.page + 1)}>
            Next
          </button>
        </div>
      </section>

      <section aria-labelledby="scale-detail-heading" data-testid="scale-detail" style={{ marginTop: '1.25rem' }}>
        <h3 id="scale-detail-heading">Scale details</h3>
        {!selectedVisible && (
          <p style={{ fontSize: '0.85rem' }}>The selected set is outside the current filters. The detail stays on that set.</p>
        )}
        <dl style={{ display: 'grid', gridTemplateColumns: '9rem 1fr', gap: '0.35rem 0.75rem', fontSize: '0.9rem' }}>
          <dt>Pitch classes</dt>
          <dd style={{ margin: 0 }}>{selected.pitchClassId || '—'}</dd>
          <dt>Spelling</dt>
          <dd style={{ margin: 0 }}>{selected.intervalsFromC.map((interval) => interval.spelling).join(' ') || '—'}</dd>
          <dt>Cardinality</dt>
          <dd style={{ margin: 0 }}>{selected.cardinality}</dd>
          <dt>12-bit mask</dt>
          <dd style={{ margin: 0 }}>{selected.mask}</dd>
          <dt>Tonic-fixed</dt>
          <dd style={{ margin: 0 }}>{selected.tonicFixed ? 'Yes. Pitch class 0 is in the set.' : 'No. Pitch class 0 is not in the set.'}</dd>
          <dt>Intervals from C</dt>
          <dd style={{ margin: 0 }}>
            {selected.intervalsFromC.length === 0
              ? 'None'
              : selected.intervalsFromC.map((interval) => `${interval.semitones} ${interval.spelling}`).join(', ')}
          </dd>
          <dt>Forte class</dt>
          <dd style={{ margin: 0 }}>
            {selected.forte
              ? `${selected.forte.forte} · ${selected.forte.status}. Class label for this six-note set. Not a scale name.`
              : 'None. Forte labels are limited to the existing six-note table.'}
          </dd>
        </dl>
        <h4 style={{ marginBottom: '0.35rem' }}>Registered collections</h4>
        {selected.registrations.length === 0 ? (
          <p data-testid="mathematical-set-note">{MATHEMATICAL_SET_STATUS}. Computed pitch-class subset. No musical name.</p>
        ) : (
          <ul style={{ paddingLeft: '1.1rem' }}>
            {selected.registrations.map((registration) => (
              <li key={`${registration.registry}:${registration.id}`}>
                <strong>{registration.displayName}</strong>
                {` · ${registration.id} · ${registration.registry} · family ${registration.family} · status ${registration.status ?? 'none on this row'}`}
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{registration.provenance}</div>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {pages.map((hash) => {
            const route = hash === '#/pentatonic' ? 'pentatonic' : 'hexatonic';
            const linked = selected.registrations.some((registration) => registration.pageHash === hash);
            if (!linked) return null;
            return (
              <button key={hash} type="button" className="secondary" onClick={() => navigateToRoute(route)}>
                {route === 'pentatonic' ? 'Open Pentatonic page' : 'Open Hexatonic page'}
              </button>
            );
          })}
        </div>
        {selected.mask === CHROMATIC_SET_MASK && (
          <p style={{ fontSize: '0.85rem' }}>Chromatic set. Mask 4095. No registered name on this set.</p>
        )}
      </section>

      <section aria-labelledby="fretboard-heading" data-testid="fretboard-preview" style={{ marginTop: '1.25rem' }}>
        <h3 id="fretboard-heading">Guitar fretboard preview</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Standard tuning {STANDARD_TUNING_LABEL}. Frets {SCALE_FRET_WINDOW.from}–{SCALE_FRET_WINDOW.to}.
          Dots mark every fret whose pitch class is in the selected set.
          The dot colour is the fretboard panel marker. It is not a scale degree, a CAGED shape, or a fingering.
          Read-only.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <FretboardPanel
            notes={markers}
            tuning={['E2', 'A2', 'D3', 'G3', 'B3', 'E4']}
            frets={SCALE_FRET_WINDOW}
            positionLock
            darkMode
          />
        </div>
        <p data-testid="fret-marker-count" style={{ fontSize: '0.85rem' }}>{markers.length} fret markers.</p>
      </section>

      <section aria-labelledby="practice-generator-heading" data-testid="practice-generator" style={{ marginTop: '1.25rem' }}>
        <h3 id="practice-generator-heading">Practice Generator</h3>
        <p>Unavailable. Exercise generation is not part of this checkpoint.</p>
      </section>

      <section aria-labelledby="practice-session-heading" data-testid="practice-session" style={{ marginTop: '1.25rem' }}>
        <h3 id="practice-session-heading">Practice Session</h3>
        <p>Unavailable. Sessions, metronome, and saved practice history are not part of this checkpoint.</p>
      </section>
    </div>
  );
}
