import React, { useMemo, useState } from 'react';
import {
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
  coreCandidateAuditionMusicXml,
  discloseBlindItem,
  moveBlindCursor,
  nearestCatalogueReading,
  type BlindComposeAnswer,
  type BlindDisposition,
  type BlindDistinctAnswer,
  type CoreLaboratoryReview,
  type LaboratoryAnswer,
  type LaboratoryDecision,
} from '@composer-os/core/hexatonic';
import { api } from '../services/api';
import { ScoreAudition } from '../score/ScoreAudition';
import { ScorePreview } from '../score/ScorePreview';

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
  const [review, setReview] = useState<CoreLaboratoryReview>(() => blankCoreLaboratoryReview());
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
