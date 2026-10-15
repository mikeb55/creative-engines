import React, { useMemo, useState } from 'react';
import {
  analyzeCoreCandidate,
  blankCoreLaboratoryReview,
  CORE_CANDIDATES,
  CORE_LABORATORY_STATUS,
  coreCandidateAuditionMusicXml,
  type CoreLaboratoryReview,
  type LaboratoryAnswer,
  type LaboratoryDecision,
} from '@composer-os/core/hexatonic';
import { api } from '../services/api';

const ANSWERS: LaboratoryAnswer[] = ['UNDECIDED', 'YES', 'NO'];
const DECISIONS: LaboratoryDecision[] = ['UNDECIDED', 'KEEP', 'REFINE', 'REJECT'];

export function HexatonicLaboratory() {
  const analyses = useMemo(() => CORE_CANDIDATES.map((row) => analyzeCoreCandidate(row.id)), []);
  const [selected, setSelected] = useState(CORE_CANDIDATES[0]!.id);
  const [review, setReview] = useState<CoreLaboratoryReview>(() => blankCoreLaboratoryReview());
  const [status, setStatus] = useState<string | null>(null);
  const [path, setPath] = useState('');
  const analysis = analyses.find((row) => row.candidate.id === selected) ?? analyses[0]!;
  const entry = review.candidates[analysis.candidate.id]!;

  const patch = (next: Partial<typeof entry>) => {
    setReview({
      ...review,
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
        setReview(row.review);
        setPath(row.path);
        setStatus(`Opened ${row.path}`);
      })
      .catch((caught: unknown) => setStatus(caught instanceof Error ? caught.message : String(caught)));
  };

  const xml = coreCandidateAuditionMusicXml(analysis.candidate.id);

  return (
    <section data-testid="hexatonic-laboratory" style={{ display: 'grid', gap: '0.5rem' }}>
      <h3 style={{ margin: 0 }}>Core triad-pair laboratory</h3>
      <p data-testid="hexatonic-laboratory-status" style={{ margin: 0 }}>
        {CORE_LABORATORY_STATUS}. Twelve candidates. None is admitted.
      </p>
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
        <dd style={{ margin: 0 }}>{analysis.nearestCatalogueIds.join(', ')} · shared {analysis.sharedWithNearest}</dd>
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
          Colour
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
      <p style={{ margin: 0 }}>Audition MusicXML is notation only. Export does not approve the candidate.</p>
      <textarea data-testid="hexatonic-laboratory-xml" readOnly rows={4} value={xml} />
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
