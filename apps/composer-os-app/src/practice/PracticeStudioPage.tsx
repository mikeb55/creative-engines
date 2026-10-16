import { useCallback, useMemo, useState } from 'react';
import { FretboardPanel, type FretboardCell, type FretboardNote } from '../components/music/FretboardPanel';
import { ScoreAudition } from '../score/ScoreAudition';
import { ScorePreview } from '../score/ScorePreview';
import { PENTATONIC_NOTE_CHOICES } from '@composer-os/core/pentatonic/pitch';
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
  FRET_MAX,
  PRACTICE_FRET_MAX_VISIBLE,
  PRACTICE_FRET_MIN,
  SCALE_FRET_WINDOW,
  STANDARD_TUNING_ID,
  buildPracticeFretboard,
  inspectFretCell,
  practiceTuningChoices,
  romanPosition,
} from './practiceFretboard';
import { glossaryNamesForMask, transposeMask } from './scaleGlossary';
import {
  PRACTICE_EXERCISE_BAR_COUNTS,
  PRACTICE_EXERCISE_FAMILIES,
  PRACTICE_EXERCISE_METRES,
  PRACTICE_STUDIO_DIFFICULTIES,
  generatePracticeExercise,
  nextPracticeSeed,
  type PracticeExercise,
  type PracticeExerciseBarCount,
  type PracticeExerciseFamily,
  type PracticeExerciseMetreId,
  type PracticeStudioDifficulty,
} from './practiceExerciseGenerator';
import { practiceExerciseToMusicXml, withPracticeTempo } from './practiceExerciseMusicXml';
import { openPracticeFile, revealPracticeFile, writePracticeFile } from './practiceExport';
import { readPracticeSession, sealPracticeSession } from './practiceSession';

const TUNING_CHOICES = practiceTuningChoices();
const ZONE_LABELS: Record<string, string> = {
  jazz_sophisticated: 'Jazz / sophisticated',
  sonic_youth_noise: 'Sonic Youth / noise',
  joni_mitchell: 'Joni Mitchell',
  hybrid_harmonic: 'Hybrid / harmonic',
  other: 'Other catalogued tunings',
};

const FIELD_STYLE = { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '13px' } as const;

export function PracticeStudioPage() {
  const [view, setView] = useState<ScaleExplorerView>('all');
  const [cardinality, setCardinality] = useState<string>('');
  const [family, setFamily] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedMask, setSelectedMask] = useState(EMPTY_SET_MASK);
  const [rootPc, setRootPc] = useState(0);
  const [tuningId, setTuningId] = useState(STANDARD_TUNING_ID);
  const [labelMode, setLabelMode] = useState<'pitch' | 'interval'>('pitch');
  const [fretFrom, setFretFrom] = useState<number>(SCALE_FRET_WINDOW.from);
  const [fretTo, setFretTo] = useState<number>(SCALE_FRET_WINDOW.to);
  const [position, setPosition] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<FretboardCell | null>(null);
  const [exerciseFamily, setExerciseFamily] = useState<PracticeExerciseFamily>('scale-pathways');
  const [exerciseDifficulty, setExerciseDifficulty] = useState<PracticeStudioDifficulty>('beginner');
  const [exerciseBars, setExerciseBars] = useState<PracticeExerciseBarCount>(4);
  const [exerciseMetre, setExerciseMetre] = useState<PracticeExerciseMetreId>('4/4');
  const [exerciseTempo, setExerciseTempo] = useState(96);
  const [exerciseSeed, setExerciseSeed] = useState(1);
  const [exercise, setExercise] = useState<PracticeExercise | null>(null);
  const [scoreXml, setScoreXml] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loop, setLoop] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [metronome, setMetronome] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionStatus, setSessionStatus] = useState('');
  const [writtenPath, setWrittenPath] = useState<string | null>(null);
  const [playbackNotes, setPlaybackNotes] = useState<FretboardNote[]>([]);

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
  const glossaryNames = glossaryNamesForMask(selected.mask);
  const selectedVisible = filtered.some((entry) => entry.mask === selectedMask);
  const board = useMemo(
    () =>
      buildPracticeFretboard({
        pitchClasses: selected.pitchClasses,
        rootPc,
        tuningId,
        fretFrom,
        fretTo,
        position,
        labelMode,
      }),
    [selected.pitchClasses, rootPc, tuningId, fretFrom, fretTo, position, labelMode]
  );
  const inspection = useMemo(
    () =>
      selectedCell
        ? inspectFretCell(
            board.tuning,
            selectedCell,
            board.rootPc,
            board.soundingPitchClasses,
            board.fretWindowValid ? { from: board.fretFrom, to: board.fretTo } : null
          )
        : null,
    [selectedCell, board]
  );
  const onFretClick = useCallback((cell: FretboardCell) => {
    setSelectedCell(cell);
  }, []);
  const runExercise = useCallback(
    (seed: number) => {
      setExerciseSeed(seed);
      const next = generatePracticeExercise({
          entry: selected,
          rootPc,
          family: exerciseFamily,
          difficulty: exerciseDifficulty,
          bars: exerciseBars,
          metreId: exerciseMetre,
          tempoBpm: exerciseTempo,
          seed,
          tuning: {
            requestedId: board.tuning.requestedId,
            tuningId: board.tuning.tuningId,
            standardSolver: board.tuning.standardSolver,
            openMidi: board.tuning.openMidi,
            limitation: board.tuning.limitation,
          },
          position,
        });
      setExercise(next);
      setPlaybackNotes([]);
      setExportError(null);
      if (!next.available) {
        setScoreXml(null);
        return;
      }
      try {
        setScoreXml(practiceExerciseToMusicXml(next));
      } catch (error) {
        setScoreXml(null);
        setExportError(error instanceof Error ? error.message : String(error));
      }
    },
    [selected, rootPc, exerciseFamily, exerciseDifficulty, exerciseBars, exerciseMetre, exerciseTempo, board.tuning, position]
  );
  const pages = ['#/pentatonic', '#/hexatonic'] as const;
  const tuningZones = ['jazz_sophisticated', 'sonic_youth_noise', 'joni_mitchell', 'hybrid_harmonic', 'other'] as const;

  return (
    <div data-testid="practice-studio">
      <h2 style={{ marginTop: 0 }}>Practice &amp; Scales Studio</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Scale inspection on the guitar fretboard. Mathematical pitch-class sets stay unnamed unless a registry already names them.
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
              ? `${selected.forte.forte} · ${selected.forte.status}. Hexachord catalogue label. Not a scale name.`
              : 'No hexachord catalogue label on this cardinality.'}
          </dd>
          <dt>Computed Forte</dt>
          <dd style={{ margin: 0 }} data-testid="computed-forte">
            {`${selected.math.computedForte.number}${selected.math.computedForte.inversion ? ` ${selected.math.computedForte.inversion}` : ''}${selected.math.computedForte.z ? ' · Z-related' : ''}. Interval vector ${selected.math.intervalVector.join('')}.`}
          </dd>
          <dt>Steps</dt>
          <dd style={{ margin: 0 }}>{selected.math.stepPattern ? selected.math.stepPattern.join('-') : 'No tonic-fixed step pattern.'}</dd>
          <dt>Rahn prime mask</dt>
          <dd style={{ margin: 0 }}>{selected.math.primeMaskRahn}</dd>
          <dt>Forte prime mask</dt>
          <dd style={{ margin: 0 }}>{selected.math.primeMaskForte}</dd>
          <dt>Transposition class</dt>
          <dd style={{ margin: 0 }}>{selected.math.tnClassMask}</dd>
          <dt>Zeitler / Tonal number</dt>
          <dd style={{ margin: 0 }} data-testid="root-msb-number">
            {`${selected.math.rootMsbNumber}. Root is the high bit. This is not the Ian Ring id.`}
          </dd>
          <dt>Ian Ring</dt>
          <dd style={{ margin: 0 }}>
            {selected.math.ianRing ? (
              <a data-testid="ian-ring-link" href={selected.math.ianRing.url} target="_blank" rel="noreferrer">
                {selected.math.ianRing.url}
              </a>
            ) : (
              'No page. Ian Ring publishes links for tonic-fixed sets only.'
            )}
          </dd>
        </dl>
        {selected.math.modeMasks.length > 0 && (
          <p style={{ fontSize: '0.85rem' }} data-testid="mode-masks">
            {`Modes, each member moved to pitch class 0: ${selected.math.modeMasks.join(', ')}. Transposition is separate. T1 is mask ${transposeMask(selected.mask, 1)}.`}
          </p>
        )}
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
        {glossaryNames.length > 0 && (
          <div data-testid="glossary-names">
            <h4 style={{ marginBottom: '0.35rem' }}>Glossary names</h4>
            <ul style={{ paddingLeft: '1.1rem' }}>
              {glossaryNames.map((record) => (
                <li key={record.primaryName}>
                  <strong>{record.primaryName}</strong>
                  {record.aliases.length > 0 ? ` · also ${record.aliases.join(', ')}` : ''}
                  {` · ${record.kind} · ${record.licenceBasis} · ${record.sourceUrl}`}
                  {record.conflicts ? <div style={{ fontSize: '0.82rem' }}>{record.conflicts}</div> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
        {selected.mask === CHROMATIC_SET_MASK && (
          <p style={{ fontSize: '0.85rem' }}>Chromatic set. Mask 4095. A glossary name is a dictionary label, not an approval.</p>
        )}
      </section>

      <section aria-labelledby="fretboard-heading" data-testid="fretboard-preview" style={{ marginTop: '1.25rem' }}>
        <h3 id="fretboard-heading">Guitar fretboard</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {board.tuning.label}. Open strings {board.tuning.strings.join(' ')}.
          Green dots are the selected root. Amber dots are the other pitch classes in the set.
          A dot is a pitch-class location. It is not a CAGED shape and it is not a fingering.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '0.75rem 0' }}>
          <label style={FIELD_STYLE}>
            Root
            <select
              aria-label="Fretboard root"
              value={String(rootPc)}
              onChange={(event) => setRootPc(Number(event.target.value))}
            >
              {PENTATONIC_NOTE_CHOICES.map((name, index) => (
                <option key={name} value={String(index)}>{name}</option>
              ))}
            </select>
          </label>
          <label style={{ ...FIELD_STYLE, flex: '1 1 14rem' }}>
            Tuning
            <select
              aria-label="Guitar tuning"
              value={tuningId}
              onChange={(event) => setTuningId(event.target.value)}
            >
              {tuningZones.map((zone) => {
                const group = TUNING_CHOICES.filter((choice) => choice.zone === zone);
                if (group.length === 0) return null;
                return (
                  <optgroup key={zone} label={ZONE_LABELS[zone]}>
                    {group.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label} ({choice.stringsLabel})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </label>
          <label style={FIELD_STYLE}>
            Dot labels
            <select
              aria-label="Fretboard label mode"
              value={labelMode}
              onChange={(event) => setLabelMode(event.target.value as 'pitch' | 'interval')}
            >
              <option value="pitch">Pitch names</option>
              <option value="interval">Intervals from root</option>
            </select>
          </label>
          <label style={FIELD_STYLE}>
            Fret from
            <input
              aria-label="Fret range start"
              type="number"
              min={PRACTICE_FRET_MIN}
              max={PRACTICE_FRET_MAX_VISIBLE}
              value={fretFrom}
              onChange={(event) => setFretFrom(Number(event.target.value))}
              style={{ width: '4.5rem' }}
            />
          </label>
          <label style={FIELD_STYLE}>
            Fret to
            <input
              aria-label="Fret range end"
              type="number"
              min={PRACTICE_FRET_MIN}
              max={PRACTICE_FRET_MAX_VISIBLE}
              value={fretTo}
              onChange={(event) => setFretTo(Number(event.target.value))}
              style={{ width: '4.5rem' }}
            />
          </label>
          <label style={FIELD_STYLE}>
            Position filter
            <select
              aria-label="Position filter"
              value={position === null ? '' : String(position)}
              disabled={!board.tuning.standardSolver}
              onChange={(event) => {
                const value = event.target.value;
                setPosition(value === '' ? null : Number(value));
              }}
            >
              <option value="">Off</option>
              {Array.from({ length: FRET_MAX + 1 }, (_, fret) => (
                <option key={fret} value={String(fret)}>
                  {fret === 0 ? 'Open strings (position 0)' : `Lowest fret ${romanPosition(fret)}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        {board.limitation && (
          <p data-testid="fretboard-limitation" style={{ fontSize: '0.85rem' }}>{board.limitation}</p>
        )}
        <p data-testid="position-status" style={{ fontSize: '0.85rem' }}>{board.positionStatus}</p>
        <p data-testid="fingering-status" style={{ fontSize: '0.85rem' }}>{board.fingeringStatus}</p>
        <p data-testid="sounding-pitch-classes" style={{ fontSize: '0.85rem' }}>
          Sounding pitch classes {board.soundingPitchClassId || '—'}. Root {board.rootSpelling}.
        </p>
        <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
          <FretboardPanel
            notes={board.notes}
            tuning={[...board.tuning.strings]}
            frets={board.fretWindowValid ? { from: board.fretFrom, to: board.fretTo } : SCALE_FRET_WINDOW}
            positionLock
            darkMode
            onFretClick={onFretClick}
            playbackNotes={playbackNotes}
          />
        </div>
        <p data-testid="fret-marker-count" style={{ fontSize: '0.85rem' }}>{board.notes.length} fret markers.</p>
        <div data-testid="fret-inspection" style={{ fontSize: '0.9rem', marginTop: '0.75rem' }}>
          <h4 style={{ marginBottom: '0.35rem' }}>Fret inspection</h4>
          {!inspection && <p>Click a fret. The readout shows that cell’s sounding pitch and its interval from the root.</p>}
          {inspection && (
            <dl style={{ display: 'grid', gridTemplateColumns: '11rem 1fr', gap: '0.35rem 0.75rem' }}>
              <dt>Cell</dt>
              <dd style={{ margin: 0 }}>String index {inspection.stringIndex}, fret {inspection.fret}</dd>
              <dt>Sounding pitch</dt>
              <dd style={{ margin: 0 }}>{inspection.scientific} · MIDI {inspection.midi} · pitch class {inspection.pitchClass}</dd>
              <dt>Interval from root</dt>
              <dd style={{ margin: 0 }}>{inspection.intervalSemitones} semitones from {board.rootSpelling}</dd>
              <dt>Selected set</dt>
              <dd style={{ margin: 0 }}>{inspection.inSelectedSet ? 'In the selected set.' : 'Outside the selected set.'}</dd>
              <dt>Visible range</dt>
              <dd style={{ margin: 0 }}>{inspection.visible ? 'Inside the fret window.' : 'Outside the fret window.'}</dd>
              <dt>Guitar range</dt>
              <dd style={{ margin: 0 }}>
                {inspection.inGuitarRange ? 'Inside guitarRange().' : 'Outside guitarRange(). Not a playable note.'}
              </dd>
              <dt>Possible positions</dt>
              <dd style={{ margin: 0 }}>
                {inspection.possiblePositions.length === 0
                  ? 'None. Open strings and frets above 15 are not a fretted position window.'
                  : inspection.possiblePositions.map((fret) => romanPosition(fret)).join(', ')}
              </dd>
              <dt>Fingering</dt>
              <dd style={{ margin: 0 }}>{inspection.fingering}</dd>
            </dl>
          )}
        </div>
      </section>

      <section aria-labelledby="practice-generator-heading" data-testid="practice-generator" style={{ marginTop: '1.25rem' }}>
        <h3 id="practice-generator-heading">Practice Generator</h3>
        <p style={{ fontSize: '0.9rem' }}>
          Exercises use the selected explorer scale and root. Generate writes the score used for playback and export.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '0.75rem 0' }}>
          <label style={FIELD_STYLE}>
            Exercise family
            <select
              aria-label="Exercise family"
              value={exerciseFamily}
              onChange={(event) => setExerciseFamily(event.target.value as PracticeExerciseFamily)}
            >
              {PRACTICE_EXERCISE_FAMILIES.map((family) => (
                <option key={family.id} value={family.id}>{family.label}</option>
              ))}
            </select>
          </label>
          <label style={FIELD_STYLE}>
            Difficulty
            <select
              aria-label="Exercise difficulty"
              value={exerciseDifficulty}
              onChange={(event) => setExerciseDifficulty(event.target.value as PracticeStudioDifficulty)}
            >
              {PRACTICE_STUDIO_DIFFICULTIES.map((difficulty) => (
                <option key={difficulty.id} value={difficulty.id}>{difficulty.label}</option>
              ))}
            </select>
          </label>
          <label style={FIELD_STYLE}>
            Bars
            <select
              aria-label="Exercise bars"
              value={String(exerciseBars)}
              onChange={(event) => setExerciseBars(Number(event.target.value) as PracticeExerciseBarCount)}
            >
              {PRACTICE_EXERCISE_BAR_COUNTS.map((count) => (
                <option key={count} value={String(count)}>{count}</option>
              ))}
            </select>
          </label>
          <label style={FIELD_STYLE}>
            Metre
            <select
              aria-label="Exercise metre"
              value={exerciseMetre}
              onChange={(event) => setExerciseMetre(event.target.value as PracticeExerciseMetreId)}
            >
              {PRACTICE_EXERCISE_METRES.map((metre) => (
                <option key={metre.id} value={metre.id}>{metre.id}</option>
              ))}
            </select>
          </label>
          <label style={FIELD_STYLE}>
            Tempo
            <input
              aria-label="Exercise tempo"
              type="number"
              min={40}
              max={240}
              step={1}
              value={exerciseTempo}
              onChange={(event) => {
              const bpm = Number(event.target.value);
              setExerciseTempo(bpm);
              setExercise((current) => (current ? { ...current, tempoBpm: bpm } : current));
              setScoreXml((current) => (current ? withPracticeTempo(current, bpm) : current));
            }}
            />
          </label>
          <label style={FIELD_STYLE}>
            Seed
            <input
              aria-label="Exercise seed"
              type="number"
              step={1}
              value={exerciseSeed}
              onChange={(event) => setExerciseSeed(Number(event.target.value))}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" data-testid="generate-exercise" onClick={() => runExercise(exerciseSeed)}>
            Generate
          </button>
          <button type="button" data-testid="generate-another" onClick={() => runExercise(nextPracticeSeed(exerciseSeed))}>
            Generate another
          </button>
        </div>
        <div data-testid="exercise-result" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
          {!exercise && <p>Generate an exercise from the current scale, root, and controls.</p>}
          {exercise && (
            <dl style={{ display: 'grid', gridTemplateColumns: '11rem 1fr', gap: '0.35rem 0.75rem' }}>
              <dt>Title</dt>
              <dd style={{ margin: 0 }}>{exercise.title}</dd>
              <dt>Type</dt>
              <dd style={{ margin: 0 }}>{exercise.familyLabel}{exercise.detail ? ` · ${exercise.detail}` : ''}</dd>
              <dt>Scale</dt>
              <dd style={{ margin: 0 }}>
                {exercise.scale.name} · mask {exercise.scale.mask} · sounding {exercise.scale.soundingPitchClassId || 'empty'} · root {exercise.scale.rootSpelling}
              </dd>
              <dt>Status</dt>
              <dd style={{ margin: 0 }}>{exercise.scale.status}</dd>
              <dt>Parameters</dt>
              <dd style={{ margin: 0 }}>
                {exercise.difficulty} · {exercise.practiceDifficulty} · {exercise.bars} bars · {exercise.metreId} · {exercise.tempoBpm} bpm · seed {exercise.seed}
              </dd>
              <dt>Pitch sequence</dt>
              <dd style={{ margin: 0 }}>{exercise.pitchSequence || '—'}</dd>
              <dt>Rhythm</dt>
              <dd style={{ margin: 0 }}>{exercise.rhythmSummary || '—'}</dd>
              <dt>Guitar</dt>
              <dd style={{ margin: 0 }}>{exercise.guitarNotes.join(' ') || '—'}</dd>
              <dt>Validation</dt>
              <dd style={{ margin: 0 }}>
                {exercise.available && exercise.validationErrors.length === 0
                  ? 'No validation errors.'
                  : exercise.validationErrors.join(' ')}
                {exercise.unavailableReason ? ` ${exercise.unavailableReason}` : ''}
              </dd>
            </dl>
          )}
        </div>
      </section>

      <section aria-labelledby="practice-session-heading" data-testid="practice-session" style={{ marginTop: '1.25rem' }}>
        <h3 id="practice-session-heading">Practice Session</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Playback uses the shared Tone.js transport. The metronome clicks on that transport and is not written into the score.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '0.75rem 0' }}>
          <label style={FIELD_STYLE}>
            Loop
            <input aria-label="Loop exercise" type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} />
          </label>
          <label style={FIELD_STYLE}>
            Repeat
            <input
              aria-label="Repeat count"
              type="number"
              min={1}
              max={16}
              step={1}
              value={repeatCount}
              disabled={loop}
              onChange={(event) => setRepeatCount(Math.max(1, Number(event.target.value) || 1))}
              style={{ width: '4.5rem' }}
            />
          </label>
          <label style={FIELD_STYLE}>
            Metronome
            <input aria-label="Metronome" type="checkbox" checked={metronome} onChange={(event) => setMetronome(event.target.checked)} />
          </label>
        </div>
        <ScorePreview musicXml={scoreXml} />
        <ScoreAudition
          musicXml={scoreXml}
          label={exercise?.title ?? 'Exercise'}
          loop={loop}
          repeat={repeatCount}
          metronome={metronome}
          onSound={(midi) => {
            const hit = board.locations.find((location) => location.midi === midi)
              ?? board.locations.find((location) => location.midi % 12 === ((midi % 12) + 12) % 12);
            setPlaybackNotes(hit ? [{ stringIndex: hit.stringIndex, fret: hit.fret, role: 'triadRoot' }] : []);
          }}
        />
        {exportError && (
          <p data-testid="practice-export-error" style={{ color: '#e88' }}>{exportError}</p>
        )}
        <label style={{ ...FIELD_STYLE, marginTop: '0.75rem' }}>
          Notes
          <textarea aria-label="Session notes" value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} rows={2} />
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <button
            type="button"
            data-testid="save-practice-session"
            onClick={() => {
              if (!exercise || !scoreXml) {
                setSessionStatus('Generate an exercise before saving a session.');
                return;
              }
              void (async () => {
                const sealed = await sealPracticeSession({
                  id: `practice-${exercise.seed}`,
                  title: exercise.title,
                  savedAt: new Date().toISOString(),
                  notes: sessionNotes,
                  sourceSha256: null,
                  scale: {
                    mask: exercise.scale.mask,
                    rootPc: exercise.scale.rootPc,
                    status: exercise.scale.status,
                    name: exercise.scale.name,
                  },
                  guitar: {
                    tuningId: exercise.tuningId,
                    openMidi: [...board.tuning.openMidi],
                    fretFrom,
                    fretTo,
                  },
                  exercise: {
                    family: exercise.family,
                    difficulty: exercise.difficulty,
                    seed: exercise.seed,
                    bars: exercise.bars,
                    metreId: exercise.metreId,
                    tempoBpm: exercise.tempoBpm,
                    loop,
                    repeat: repeatCount,
                    metronome,
                  },
                  musicXml: scoreXml,
                });
                const written = await writePracticeFile(sealed.id, 'json', JSON.stringify(sealed, null, 2));
                if (!written.ok) {
                  setSessionStatus(written.error);
                  return;
                }
                if (written.mode === 'desktop') setWrittenPath(written.fullPath);
                setSessionStatus(written.mode === 'desktop' ? `Saved ${written.fullPath}` : `Downloaded ${written.filename}`);
              })();
            }}
          >
            Save session
          </button>
          <button
            type="button"
            data-testid="export-practice-musicxml"
            onClick={() => {
              if (!scoreXml || !exercise) {
                setExportError('Generate an exercise before exporting MusicXML.');
                return;
              }
              void (async () => {
                const written = await writePracticeFile(exercise.title, 'musicxml', scoreXml);
                if (!written.ok) {
                  setExportError(written.error);
                  return;
                }
                setExportError(null);
                if (written.mode === 'desktop') setWrittenPath(written.fullPath);
                setSessionStatus(written.mode === 'desktop' ? `Exported ${written.fullPath}` : `Downloaded ${written.filename}`);
              })();
            }}
          >
            Export MusicXML
          </button>
          <button type="button" onClick={() => { void openPracticeFile(writtenPath).then((result) => setSessionStatus(result.ok ? `Opened ${writtenPath}` : result.error)); }}>
            Open File
          </button>
          <button type="button" onClick={() => { void revealPracticeFile(writtenPath).then((result) => setSessionStatus(result.ok ? `Revealed ${writtenPath}` : result.error)); }}>
            Open in Finder
          </button>
          <label style={FIELD_STYLE}>
            Reopen session
            <input
              aria-label="Reopen practice session"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void file.text().then(async (text) => {
                  try {
                    const session = await readPracticeSession(text);
                    setSelectedMask(session.scale.mask);
                    setRootPc(session.scale.rootPc);
                    setTuningId(session.guitar.tuningId);
                    setFretFrom(session.guitar.fretFrom);
                    setFretTo(session.guitar.fretTo);
                    setExerciseTempo(session.exercise.tempoBpm);
                    setLoop(session.exercise.loop);
                    setRepeatCount(session.exercise.repeat);
                    setMetronome(session.exercise.metronome);
                    setSessionNotes(session.notes);
                    setScoreXml(session.musicXml);
                    setExercise(null);
                    setSessionStatus(`Reopened ${session.title}. The exercise was not regenerated.`);
                  } catch (error) {
                    setSessionStatus(error instanceof Error ? error.message : String(error));
                  }
                });
              }}
            />
          </label>
        </div>
        <p data-testid="practice-session-status" style={{ fontSize: '0.85rem' }}>{sessionStatus}</p>
      </section>
    </div>
  );
}
