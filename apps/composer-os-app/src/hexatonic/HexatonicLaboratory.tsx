import React, { useMemo, useState } from 'react';
import {
  ADVANCED_STATUS,
  EXPLORER_STATUS,
  analyzeCoreCandidate,
  blankBlindAnswer,
  blankCoreLaboratoryReview,
  blindExcerptMusicXml,
  blindListeningEvidence,
  buildBlindAudition,
  commitBlindAnswer,
  CORE_CANDIDATES,
  CORE_CONTEXT_IDS,
  CORE_LABORATORY_STATUS,
  constructionsForPitchClasses,
  commonToneNeighbours,
  coreCandidateAuditionMusicXml,
  discloseBlindItem,
  listAdvancedColours,
  listExplorerCatalogue,
  listHexatonicScalars,
  listHexatonicWpsPairs,
  matchCataloguePair,
  namedNeighbours,
  openGuitarVoicings,
  moveBlindCursor,
  nearestCatalogueReading,
  type BlindComposeAnswer,
  type BlindDisposition,
  type BlindDistinctAnswer,
  type CollectionTier,
  type CoreLaboratoryReview,
  type LaboratoryAnswer,
  triadMotionAuditionMusicXml,
  type LaboratoryDecision,
  type NeighbourRow,
} from '@composer-os/core/hexatonic';
import { api } from '../services/api';
import { ScoreAudition } from '../score/ScoreAudition';
import { ScorePreview } from '../score/ScorePreview';
import { storeHexatonicHandoff } from '../bhl/bhlHexatonicHandoff';
import { storePracticeHandoff, type PracticeHandoff } from '../practice/practiceHandoff';
import type { ScaleRegistryId } from '../practice/scaleExplorer';
import { maskFromPitchClasses } from '../practice/scaleGlossary';

const ANSWERS: LaboratoryAnswer[] = ['UNDECIDED', 'YES', 'NO'];
const DECISIONS: LaboratoryDecision[] = ['UNDECIDED', 'KEEP', 'REFINE', 'REJECT'];
const DISTINCT: BlindDistinctAnswer[] = ['UNDECIDED', 'YES', 'NO', 'UNSURE'];
const COMPOSE: BlindComposeAnswer[] = ['UNDECIDED', 'YES', 'MAYBE', 'NO'];
const DISPOSITIONS: BlindDisposition[] = ['UNDECIDED', 'ACCEPT', 'REFINE', 'REJECT', 'KEEP_PROVISIONAL'];

function nearestLine(id: string, ids: readonly string[], shared: number, candidateForte: string): string {
  const nearest = nearestCatalogueReading(id);
  const tie = nearest.tiedIds.length > 1 ? ` Tied: ${nearest.tiedIds.join(', ')}.` : '';
  return `${ids.join(', ')} · shared ${shared} · ${nearest.kind} Forte ${nearest.forte} (candidate ${candidateForte}) · ${nearest.spelling.join(' ')} · ${nearest.leftRole} ${nearest.left.join(' ')} / ${nearest.rightRole} ${nearest.right.join(' ')}.${tie} Pitch-class difference only. No audible difference is claimed.`;
}

function BlindSession({
  review,
  setReview,
}: {
  review: CoreLaboratoryReview;
  setReview: React.Dispatch<React.SetStateAction<CoreLaboratoryReview>>;
}) {
  const blind = review.blind;
  const [excerpt, setExcerpt] = useState(0);
  const session = blind?.sessions[blind.cursor.session];
  const item = session?.items[blind.cursor.item];
  const code = item?.code ?? '';
  const answer = (code && blind?.answers[code]) || blankBlindAnswer();
  const xml = useMemo(() => (blind && code ? blindExcerptMusicXml(blind, code, excerpt) : ''), [blind, code, excerpt]);
  if (!blind || !session || !item) return null;
  const revealed = answer.saved;
  const disclosure = revealed ? discloseBlindItem(blind, code) : { code, revealed: false as const, label: '' };
  const evidence = blindListeningEvidence(blind);

  const stage = (patch: Partial<typeof answer>) => {
    if (!review.blind) return;
    const next = { ...answer, ...patch, saved: false };
    setReview({
      ...review,
      artisticApproval: false,
      blind: { ...review.blind, answers: { ...review.blind.answers, [code]: next } },
    });
  };

  const saveAnswer = () => {
    if (answer.distinct === 'UNDECIDED' || answer.compose === 'UNDECIDED') return;
    setReview((current) => commitBlindAnswer(current, code, { ...answer, saved: true }));
    setExcerpt(0);
  };

  const afterReveal = (patch: Partial<typeof answer>) => {
    const next = { ...answer, ...patch, saved: true };
    setReview((current) => commitBlindAnswer(current, code, next));
  };

  const move = (delta: number) => {
    setExcerpt(0);
    setReview((current) => (current.blind ? { ...current, artisticApproval: false, blind: moveBlindCursor(current.blind, delta) } : current));
  };

  return (
    <div data-testid="hex-blind-panel" style={{ display: 'grid', gap: '0.45rem' }}>
      <p style={{ margin: 0 }}>
        Blind session {blind.cursor.session + 1} of 4. Code <span data-testid="hex-blind-code">{code}</span>. {revealed ? 'Identity is shown.' : 'Identity stays hidden until this answer is saved.'}
      </p>
      <label htmlFor="hex-blind-seed">
        Shuffle seed
        <input
          id="hex-blind-seed"
          data-testid="hex-blind-seed"
          type="number"
          min={0}
          max={2147483647}
          value={blind.seed}
          onChange={(event) => {
            const seed = Number(event.target.value);
            if (!Number.isInteger(seed) || seed < 0) return;
            setExcerpt(0);
            setReview((current) => ({ ...current, artisticApproval: false, blind: buildBlindAudition(seed) }));
          }}
        />
      </label>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {CORE_CONTEXT_IDS.map((context, index) => (
          <button key={context} type="button" data-testid={`hex-blind-excerpt-${index}`} onClick={() => setExcerpt(index)} disabled={excerpt === index}>
            Excerpt {index + 1}
          </button>
        ))}
      </div>
      <ScoreAudition musicXml={xml} label={`${code} · excerpt ${excerpt + 1}`} />
      {revealed ? (
        <>
          <p data-testid="hex-blind-identity" style={{ margin: 0 }}>{disclosure.label}</p>
          <ScorePreview musicXml={xml} />
          <label htmlFor="hex-blind-guitar">
            Guitar play-through note
            <input
              id="hex-blind-guitar"
              data-testid="hex-blind-guitar"
              value={answer.guitarPlaythrough}
              onChange={(event) => afterReveal({ guitarPlaythrough: event.target.value })}
            />
          </label>
          <p style={{ margin: 0 }}>
            {item.kind === 'primary'
              ? 'ACCEPT writes KEEP for this pair. KEEP PROVISIONAL leaves it provisional.'
              : 'A repeat or a concealed reference does not admit a pair.'}
          </p>
          <label htmlFor="hex-blind-disposition">
            Disposition
            <select
              id="hex-blind-disposition"
              data-testid="hex-blind-disposition"
              value={answer.disposition}
              onChange={(event) => afterReveal({ disposition: event.target.value as BlindDisposition })}
            >
              {DISPOSITIONS.map((disposition) => (
                <option key={disposition} value={disposition}>{disposition}</option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <p data-testid="hex-blind-hidden" style={{ margin: 0 }}>Identity hidden. Notation stays hidden.</p>
      )}
      <label htmlFor="hex-blind-distinct">
        Distinct
        <select id="hex-blind-distinct" data-testid="hex-blind-distinct" value={answer.distinct} onChange={(event) => stage({ distinct: event.target.value as BlindDistinctAnswer })} disabled={revealed}>
          {DISTINCT.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label htmlFor="hex-blind-compose">
        Would compose with it
        <select id="hex-blind-compose" data-testid="hex-blind-compose" value={answer.compose} onChange={(event) => stage({ compose: event.target.value as BlindComposeAnswer })} disabled={revealed}>
          {COMPOSE.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label htmlFor="hex-blind-colour">
        Colour
        <input id="hex-blind-colour" data-testid="hex-blind-colour" value={answer.colour} onChange={(event) => (revealed ? afterReveal({ colour: event.target.value }) : stage({ colour: event.target.value }))} />
      </label>
      {revealed ? null : (
        <button type="button" data-testid="hex-blind-save-answer" onClick={saveAnswer}>Save listening answer</button>
      )}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button type="button" data-testid="hex-blind-prev" onClick={() => move(-1)}>Previous</button>
        <button type="button" data-testid="hex-blind-next" onClick={() => move(1)}>Next</button>
      </div>
      <p data-testid="hex-blind-evidence" style={{ margin: 0 }}>{evidence.text} Automatic judgement: no.</p>
    </div>
  );
}

export function HexatonicLaboratory() {
  const analyses = useMemo(() => CORE_CANDIDATES.map((row) => analyzeCoreCandidate(row.id)), []);
  const [mode, setMode] = useState<'detail' | 'blind'>('detail');
  const [selected, setSelected] = useState(CORE_CANDIDATES[0]!.id);
  const [tier, setTier] = useState<CollectionTier>('advanced');
  const [browserId, setBrowserId] = useState(listAdvancedColours()[0]!.id);
  const [constructionId, setConstructionId] = useState('');
  const [triadSide, setTriadSide] = useState<'left' | 'right'>('left');
  const [neighbourKey, setNeighbourKey] = useState<string | null>(null);
  const [review, setReview] = useState<CoreLaboratoryReview>(() => blankCoreLaboratoryReview());
  const [practiceError, setPracticeError] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [path, setPath] = useState('');
  const analysis = analyses.find((row) => row.candidate.id === selected) ?? analyses[0]!;
  const entry = review.candidates[analysis.candidate.id]!;

  const patch = (next: Partial<typeof entry>) => {
    setReview({
      ...review,
      artisticApproval: false,
      candidates: {
        ...review.candidates,
        [analysis.candidate.id]: { ...entry, ...next },
      },
    });
  };

  const onSave = () => {
    void api
      .hexatonicSaveLaboratory({ review, path: path || undefined, overwrite: true })
      .then((raw) => {
        const row = raw as { ok: true; path: string } | { ok: false; error: string };
        if (!row.ok) throw new Error(row.error);
        setPath(row.path);
        setStatus(`Saved ${row.path}`);
      })
      .catch((caught: unknown) => setStatus(caught instanceof Error ? caught.message : String(caught)));
  };

  const onOpen = () => {
    if (!path.trim()) return;
    void api
      .hexatonicOpenLaboratory({ path })
      .then((raw) => {
        const row = raw as { ok: true; path: string; review: CoreLaboratoryReview } | { ok: false; error: string };
        if (!row.ok) throw new Error(row.error);
        setReview({ ...row.review, artisticApproval: false });
        setPath(row.path);
        setStatus(`Opened ${row.path}`);
      })
      .catch((caught: unknown) => setStatus(caught instanceof Error ? caught.message : String(caught)));
  };

  const enterBlind = () => {
    setMode('blind');
    setReview((current) => (current.blind ? { ...current, artisticApproval: false } : { ...current, artisticApproval: false, blind: buildBlindAudition(440) }));
  };

  const sideNotes = triadSide === 'left' ? analysis.candidate.leftSpelling : analysis.candidate.rightSpelling;
  const sideQuality = triadSide === 'left' ? analysis.candidate.leftQuality : analysis.candidate.rightQuality;
  const otherPcs = triadSide === 'left' ? analysis.rightPitchClasses : analysis.leftPitchClasses;
  const named = useMemo(
    () => namedNeighbours({ quality: sideQuality, notes: [sideNotes[0], sideNotes[1], sideNotes[2]] }),
    [sideQuality, sideNotes],
  );
  const extraTones = useMemo(
    () => (Array.isArray(named) ? commonToneNeighbours({ quality: sideQuality, notes: [sideNotes[0], sideNotes[1], sideNotes[2]] }) : []),
    [named, sideQuality, sideNotes],
  );
  const neighbourRows: NeighbourRow[] = Array.isArray(named) ? [...named, ...(Array.isArray(extraTones) ? extraTones : [])] : [];
  const neighbour = neighbourRows.find((row) => `${row.operation ?? 'common'}:${row.target.quality}:${row.target.rootPc}` === neighbourKey) ?? null;
  const neighbourMatch = neighbour ? matchCataloguePair(neighbour.target.pitchClasses, otherPcs) : null;
  const neighbourXml = useMemo(
    () => (neighbour ? triadMotionAuditionMusicXml(sideNotes, neighbour.target.notes, `${neighbour.operation ?? 'common-tone'} ${neighbour.target.notes.join(' ')}`) : ''),
    [neighbour, sideNotes],
  );
  const browser = useMemo(() => {
    if (mode !== 'detail') return null;
    const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const spell = (pitchClass: number) => names[((pitchClass % 12) + 12) % 12] ?? String(pitchClass);
    const options = tier === 'established'
      ? [
          ...listHexatonicScalars().map((row) => ({
            id: row.id,
            label: row.id,
            pcs: row.pitchClasses,
            family: 'scalar' as const,
            status: 'catalogue',
            left: row.triadReading?.[0]?.spelling,
            right: row.triadReading?.[1]?.spelling,
            compose: true,
          })),
          ...listHexatonicWpsPairs().map((row) => ({
            id: row.id,
            label: `${row.parentSymbol} · ${row.harrisLabel}`,
            pcs: row.pitchClasses,
            family: 'wps' as const,
            status: 'catalogue',
            left: row.resolution.spelling,
            right: row.tension.spelling,
            compose: true,
          })),
        ]
      : tier === 'provisional'
        ? analyses.map((row) => ({
            id: row.candidate.id,
            label: row.candidate.label,
            pcs: row.union,
            family: 'provisional' as const,
            status: CORE_LABORATORY_STATUS,
            left: row.candidate.leftSpelling,
            right: row.candidate.rightSpelling,
            compose: true,
          }))
        : tier === 'advanced'
          ? listAdvancedColours().map((row) => ({
              id: row.id,
              label: row.label,
              pcs: row.pitchClasses,
              family: 'advanced' as const,
              status: ADVANCED_STATUS,
              left: row.leftSpelling,
              right: row.rightSpelling,
              compose: true,
            }))
          : listExplorerCatalogue().map((row) => ({
              id: row.forte,
              label: `${row.forte}${row.suspendedQuartalOnly ? ' · sus/quartal only' : ''} · ${row.tier}`,
              pcs: row.prime,
              family: 'explorer' as const,
              status: row.status,
              left: undefined,
              right: undefined,
              compose: row.tier !== 'explorer',
              catalogueIds: row.catalogueIds,
              rowTier: row.tier,
            }));
    const current = options.find((row) => row.id === browserId) ?? options[0];
    if (!current) return null;
    const linked = constructionsForPitchClasses(current.pcs);
    const builds = [
      ...(current.left && current.right ? [{ id: 'tertian', label: 'tertian reading', left: current.left, right: current.right, links: [] as { family: string; id: string }[] }] : []),
      ...linked.slice(0, 8).map((row) => ({ id: row.id, label: `${row.leftKind}+${row.rightKind}`, left: row.leftSpelling, right: row.rightSpelling, links: row.links })),
    ];
    const build = builds.find((row) => row.id === constructionId) ?? builds[0];
    const previewLeft = build?.left ?? current.pcs.slice(0, 3).map(spell);
    const previewRight = build?.right ?? current.pcs.slice(3).map(spell);
    const guitar = openGuitarVoicings(previewLeft.map((token) => names.indexOf(token)).filter((pitchClass) => pitchClass >= 0));
    return { options, current, builds, build, previewLeft, previewRight, guitar, linkedCount: linked.length };
  }, [analyses, browserId, constructionId, mode, tier]);
  const browserXml = browser
    ? triadMotionAuditionMusicXml(browser.previewLeft, browser.previewRight, browser.current.label, browser.current.status)
    : '';
  const xml = mode === 'detail' ? coreCandidateAuditionMusicXml(analysis.candidate.id) : '';

  return (
    <section data-testid="hexatonic-laboratory" style={{ display: 'grid', gap: '0.5rem' }}>
      <h3 style={{ margin: 0 }}>Core triad-pair laboratory</h3>
      <p data-testid="hexatonic-laboratory-status" style={{ margin: 0 }}>
        {CORE_LABORATORY_STATUS}. Twelve candidates. None is admitted.
      </p>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button type="button" data-testid="hex-lab-mode-detail" onClick={() => setMode('detail')}>Detail view</button>
        <button type="button" data-testid="hex-lab-mode-blind" onClick={enterBlind}>Blind audition</button>
      </div>
      {mode === 'blind' ? <BlindSession review={review} setReview={setReview} /> : (
        <>
          <label htmlFor="hexatonic-laboratory-candidate">
            Candidate
            <select
              id="hexatonic-laboratory-candidate"
              data-testid="hexatonic-laboratory-candidate"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {CORE_CANDIDATES.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <dl data-testid="hexatonic-laboratory-analysis" style={{ display: 'grid', gridTemplateColumns: '12rem 1fr', gap: '0.2rem 0.6rem', margin: 0 }}>
            <dt>Triads</dt>
            <dd style={{ margin: 0 }}>{analysis.candidate.leftSpelling.join(' ')} / {analysis.candidate.rightSpelling.join(' ')}</dd>
            <dt>Union</dt>
            <dd style={{ margin: 0 }}>{analysis.unionSpelling.join(' ')} · {analysis.forte}</dd>
            <dt>Common tones</dt>
            <dd style={{ margin: 0 }}>{analysis.commonTones}</dd>
            <dt>Interleaves</dt>
            <dd style={{ margin: 0 }}>{analysis.interleaves ? 'yes' : 'no'}</dd>
            <dt>Other splits</dt>
            <dd style={{ margin: 0 }}>{analysis.alternateConstructions}</dd>
            <dt>Voice-leading</dt>
            <dd style={{ margin: 0 }}>{analysis.minVoiceLeading} semitones</dd>
            <dt>Nearest catalogue</dt>
            <dd style={{ margin: 0 }} data-testid="hexatonic-laboratory-nearest">{nearestLine(analysis.candidate.id, analysis.nearestCatalogueIds, analysis.sharedWithNearest, analysis.forte)}</dd>
            <dt>WPS on that colour</dt>
            <dd style={{ margin: 0 }}>{analysis.wpsIdsOnNearest.join(', ') || 'none'}</dd>
            <dt>BHL</dt>
            <dd style={{ margin: 0 }}>{analysis.bhlNote}</dd>
            <dt>Provenance</dt>
            <dd style={{ margin: 0 }}>{analysis.candidate.provenance}{analysis.candidate.vaultNote ? ` · ${analysis.candidate.vaultNote}` : ''}</dd>
            <dt>Guitar transpositions</dt>
            <dd style={{ margin: 0 }}>{analysis.guitarTranspositions.map((row) => `T${row.semitones} (${row.openStrings} open)`).join(' · ')}</dd>
            <dt>Inversions within 4 frets</dt>
            <dd style={{ margin: 0 }}>{analysis.inversions.filter((row) => row.withinFourFrets).map((row) => `${row.triad} ${row.inversion}`).join(' · ') || 'none found'}</dd>
            <dt>Dyads</dt>
            <dd style={{ margin: 0 }}>{analysis.dyadsAvailable ? 'a four-fret dyad exists' : 'no four-fret dyad found'}</dd>
            <dt>Bass pedals</dt>
            <dd style={{ margin: 0 }}>{analysis.bassPedals.join(' · ')}</dd>
          </dl>
          <section data-testid="hex-neighbours" style={{ display: 'grid', gap: '0.4rem' }}>
            <h4 style={{ margin: 0 }}>Neighbours</h4>
            <p style={{ margin: 0 }}>P, L, and R are the consonant neo-Riemannian group. H, N, and S are named consonant operations. Diminished and augmented triads are not given those names.</p>
            <label htmlFor="hex-neighbour-side">
              Triad
              <select
                id="hex-neighbour-side"
                data-testid="hex-neighbour-side"
                value={triadSide}
                onChange={(event) => {
                  setTriadSide(event.target.value as 'left' | 'right');
                  setNeighbourKey(null);
                }}
              >
                <option value="left">{analysis.candidate.leftSpelling.join(' ')} {analysis.candidate.leftQuality}</option>
                <option value="right">{analysis.candidate.rightSpelling.join(' ')} {analysis.candidate.rightQuality}</option>
              </select>
            </label>
            {Array.isArray(named) ? (
              <ul data-testid="hex-neighbour-list" style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {neighbourRows.map((row) => {
                  const key = `${row.operation ?? 'common'}:${row.target.quality}:${row.target.rootPc}`;
                  const moving = row.motions.filter((motion) => !motion.retained).map((motion) => `${motion.fromSpelling} ${motion.direction} ${Math.abs(motion.semitones)} → ${motion.toSpelling}`).join(', ');
                  return (
                    <li key={key}>
                      <button type="button" data-testid={`hex-neighbour-${key}`} onClick={() => setNeighbourKey(key)}>
                        {row.operation ?? 'common-tone'} · {row.target.notes.join(' ')} {row.target.quality}
                      </button>
                      <span> shared {row.sharedPitchClasses.length}; {moving || 'held'}; {row.voiceLeading} semitones; {row.inversions.map((inversion) => inversion.figure).join(' ')}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p data-testid="hex-neighbour-unsupported" style={{ margin: 0 }}>{named.reason}</p>
            )}
            {neighbour ? (
              <div data-testid="hex-neighbour-detail" style={{ display: 'grid', gap: '0.35rem' }}>
                <p style={{ margin: 0 }}>{neighbour.explanation} Status stays {CORE_LABORATORY_STATUS}.</p>
                <p style={{ margin: 0 }}>Inversions {neighbour.inversions.map((inversion) => `${inversion.figure} bass ${inversion.bass}`).join(' · ')}</p>
                <button
                  type="button"
                  data-testid="hex-neighbour-compose"
                  disabled={!neighbourMatch}
                  onClick={() => {
                    if (!neighbourMatch) return;
                    storeHexatonicHandoff(neighbourMatch);
                    window.location.hash = '#/bhl';
                  }}
                >
                  {neighbourMatch ? `Use in BHL Composer · ${neighbourMatch.family} ${neighbourMatch.id}` : 'Not a registered BHL colour'}
                </button>
                <ScoreAudition musicXml={neighbourXml} label={`${neighbour.operation ?? 'common-tone'} · ${CORE_LABORATORY_STATUS}`} />
                <ScorePreview musicXml={neighbourXml} />
              </div>
            ) : null}
          </section>
          {browser ? (
            <section data-testid="hex-collection-browser" style={{ display: 'grid', gap: '0.4rem' }}>
              <h4 style={{ margin: 0 }}>Collections</h4>
              <label htmlFor="hex-collection-filter">
                Filter
                <select
                  id="hex-collection-filter"
                  data-testid="hex-collection-filter"
                  value={tier}
                  onChange={(event) => {
                    const next = event.target.value as CollectionTier;
                    setTier(next);
                    setBrowserId('');
                    setConstructionId('');
                  }}
                >
                  <option value="established">Established collections</option>
                  <option value="provisional">Provisional Core candidates</option>
                  <option value="advanced">Advanced unauditioned</option>
                  <option value="explorer">Complete computed Explorer</option>
                </select>
              </label>
              <label htmlFor="hex-collection-entry">
                Entry
                <select
                  id="hex-collection-entry"
                  data-testid="hex-collection-entry"
                  value={browser.current.id}
                  onChange={(event) => {
                    setBrowserId(event.target.value);
                    setConstructionId('');
                    if (tier === 'provisional') setSelected(event.target.value);
                  }}
                >
                  {browser.options.map((row) => (
                    <option key={row.id} value={row.id}>{row.label}</option>
                  ))}
                </select>
              </label>
              <p data-testid="hex-collection-status" style={{ margin: 0 }}>{browser.current.status}. Human approval: no. {EXPLORER_STATUS === browser.current.status ? 'Mathematical entry only.' : ''}</p>
              <label htmlFor="hex-construction">
                Construction
                <select
                  id="hex-construction"
                  data-testid="hex-construction"
                  value={browser.build?.id ?? ''}
                  onChange={(event) => setConstructionId(event.target.value)}
                >
                  {browser.builds.map((row) => (
                    <option key={row.id} value={row.id}>{row.label} · {row.left.join(' ')} / {row.right.join(' ')}</option>
                  ))}
                </select>
              </label>
              <p style={{ margin: 0 }}>
                {browser.linkedCount
                  ? `Alternate sus/quartal constructions link to an existing colour. ${browser.build?.links.map((link) => `${link.family} ${link.id}`).join(', ') || 'Shown construction is the tertian reading.'}`
                  : 'No sus/quartal pair reproduces this exact pitch-class set.'}
              </p>
              <p data-testid="hex-guitar-voicings" style={{ margin: 0 }}>
                Guitar voicings, playability not verified: {browser.guitar.map((row) => `frets ${row.frets.map((fret) => (fret === null ? '-' : fret)).join(' ')} (${row.openStrings} open)`).join(' · ') || 'none in a four-fret span'}
              </p>
              <button
                type="button"
                data-testid="hex-collection-compose"
                disabled={!browser.current.compose || browser.current.family === 'explorer'}
                onClick={() => {
                  if (!browser.current.compose || browser.current.family === 'explorer') return;
                  storeHexatonicHandoff({ family: browser.current.family, id: browser.current.id, referencePc: 0 });
                  window.location.hash = '#/bhl';
                }}
              >
                {browser.current.compose && browser.current.family !== 'explorer' ? 'Compose with this colour' : 'Explorer stays out of the composer'}
              </button>
              <button
                type="button"
                data-testid="hex-practice-handoff"
                onClick={() => {
                  const family = browser.current.family;
                  const registry: ScaleRegistryId | null =
                    family === 'scalar'
                      ? 'hexatonic-scalar'
                      : family === 'wps'
                        ? 'hexatonic-wps'
                        : family === 'provisional'
                          ? 'hexatonic-provisional'
                          : family === 'advanced'
                            ? 'hexatonic-advanced'
                            : null;
                  const payload: PracticeHandoff = {
                    source: 'hexatonic',
                    label: browser.current.label,
                    musicXml: browserXml || null,
                    collectionId: registry ? browser.current.id : null,
                    registry,
                    referencePc: 0,
                    status: browser.current.status,
                    seed: null,
                    mask: maskFromPitchClasses(browser.current.pcs),
                    tuningId: null,
                  };
                  const sent = storePracticeHandoff(payload);
                  if (!sent.ok) {
                    setPracticeError(sent.error);
                    return;
                  }
                  setPracticeError('');
                  window.location.hash = '#/practice';
                }}
              >
                Practice this collection
              </button>
              {practiceError ? <p data-testid="hex-practice-error">{practiceError}</p> : null}
              <ScoreAudition musicXml={browserXml} label={`${browser.current.label} · ${browser.current.status}`} />
              <ScorePreview musicXml={browserXml} />
            </section>
          ) : null}
          <fieldset style={{ display: 'grid', gap: '0.35rem' }}>
            <legend>Human review</legend>
            {(['distinct', 'useful', 'guitarPlayable'] as const).map((field) => (
              <label key={field} htmlFor={`hex-lab-${field}`}>
                {field}
                <select id={`hex-lab-${field}`} data-testid={`hex-lab-${field}`} value={entry[field]} onChange={(event) => patch({ [field]: event.target.value as LaboratoryAnswer })}>
                  {ANSWERS.map((answer) => (
                    <option key={answer} value={answer}>{answer}</option>
                  ))}
                </select>
              </label>
            ))}
            <label htmlFor="hex-lab-colour">
              Colour and comments
              <input id="hex-lab-colour" data-testid="hex-lab-colour" value={entry.colour} onChange={(event) => patch({ colour: event.target.value })} />
            </label>
            <label htmlFor="hex-lab-decision">
              Decision
              <select id="hex-lab-decision" data-testid="hex-lab-decision" value={entry.decision} onChange={(event) => patch({ decision: event.target.value as LaboratoryDecision })}>
                {DECISIONS.map((decision) => (
                  <option key={decision} value={decision}>{decision}</option>
                ))}
              </select>
            </label>
          </fieldset>
          <p style={{ margin: 0 }}>
            In-app playback and preview do not approve the candidate. Status stays {CORE_LABORATORY_STATUS}.
          </p>
          <button
            type="button"
            data-testid="hex-lab-compose"
            onClick={() => {
              storeHexatonicHandoff({ family: 'provisional', id: analysis.candidate.id, referencePc: 0 });
              window.location.hash = '#/bhl';
            }}
          >
            Compose with this pair
          </button>
          <ScoreAudition musicXml={xml} label={`${analysis.candidate.label} · ${CORE_LABORATORY_STATUS}`} />
          <ScorePreview musicXml={xml} />
          <textarea data-testid="hexatonic-laboratory-xml" readOnly rows={4} value={xml} />
        </>
      )}
      <label htmlFor="hex-lab-path">
        Review file
        <input id="hex-lab-path" data-testid="hex-lab-path" value={path} onChange={(event) => setPath(event.target.value)} />
      </label>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button type="button" data-testid="hex-lab-save" onClick={onSave}>Save review</button>
        <button type="button" data-testid="hex-lab-open" onClick={onOpen}>Open review</button>
      </div>
      {status ? <p data-testid="hex-lab-message" style={{ margin: 0 }}>{status}</p> : null}
    </section>
  );
}
