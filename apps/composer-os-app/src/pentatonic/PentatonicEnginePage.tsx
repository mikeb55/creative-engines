import { useRef, useState } from 'react';
import {
  PENTATONIC_NOTE_CHOICES,
  recommendPentatonicsFromRegion,
  recommendPentatonicPath,
  type PentatonicEngineResult,
  type PentatonicPathResult,
  type PentatonicRecommendation,
  type PentatonicRegionInput,
} from '@composer-os/core/pentatonic';
import { PentatonicPassagePanel } from './PentatonicPassagePanel';
import { PentatonicScorePanel } from './PentatonicScorePanel';
import { PentatonicWorkflowPanel } from './PentatonicWorkflowPanel';
import {
  emptyPassageRow,
  cleanPentatonicForm,
  emptyPentatonicForm,
  examplePentatonicForm,
  pentatonicFormIsDirty,
  pentatonicFormSnapshot,
  resolvePentatonicPassage,
  resolvePentatonicRegion,
  type PentatonicFormState,
  type PentatonicInheritedContext,
} from './resolvePentatonicForm';

const DISPOSITION_LABEL: Record<NonNullable<PentatonicEngineResult['disposition']>, string> = {
  RECOMMEND: 'RECOMMEND',
  RETAIN_CURRENT: 'RETAIN CURRENT',
  NO_PENTATONIC_INTERVENTION: 'NO PENTATONIC INTERVENTION',
  INSUFFICIENT_CONTEXT: 'INSUFFICIENT CONTEXT',
  NO_FEASIBLE_CANDIDATE: 'NO FEASIBLE CANDIDATE',
};

function toggleNote(notes: string[], note: string): string[] {
  return notes.includes(note) ? notes.filter((item) => item !== note) : [...notes, note];
}

function NoteChips(props: {
  legend: string;
  notes: string[];
  onChange: (notes: string[]) => void;
  helpId?: string;
}) {
  return (
    <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
      <legend style={{ padding: '0 0.25rem', fontSize: '0.85rem' }}>{props.legend}</legend>
      <div role="group" aria-describedby={props.helpId} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {PENTATONIC_NOTE_CHOICES.map((note) => {
          const on = props.notes.includes(note);
          return (
            <button
              key={note}
              type="button"
              className={on ? '' : 'secondary'}
              aria-pressed={on}
              onClick={() => props.onChange(toggleNote(props.notes, note))}
              style={{ padding: '0.25rem 0.5rem', minWidth: '2.4rem' }}
            >
              {note}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RecommendationCard(props: { item: PentatonicRecommendation; heading: string }) {
  const item = props.item;
  return (
    <article
      data-testid="pentatonic-card"
      style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', background: 'var(--bg-panel)' }}
    >
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>
        {props.heading}: {item.transposedName}
      </h3>
      <p style={{ margin: '0.2rem 0' }}>{item.displaySpelling.join(' ')}</p>
      <p style={{ margin: '0.2rem 0' }}>{item.musicalFunction}</p>
      {item.homeRelationshipLabel ? <p style={{ margin: '0.2rem 0' }}>HOME relationship: {item.homeRelationshipLabel}</p> : null}
      <p style={{ margin: '0.2rem 0' }}>{item.explanation}</p>
      {item.commonTones.length > 0 ? <p style={{ margin: '0.2rem 0' }}>Common tones: {item.commonTones.join(' ')}</p> : null}
      {item.cautions.length > 0 ? <p style={{ margin: '0.2rem 0' }}>Cautions: {item.cautions.join(' ')}</p> : null}
      <details>
        <summary>Details</summary>
        <p>Heuristic score {item.totalScore}. Not a confidence percentage.</p>
        <ul>
          {item.componentScores.map((component) => (
            <li key={component.id}>
              {component.label}: {component.score} (weight {component.weight}). {component.evidence}
            </li>
          ))}
        </ul>
        <p>
          Protected notes: {item.constraintStatus.protectedNotes}. Strict melody: {item.constraintStatus.strictMelody}.
        </p>
        {item.alternativeInterpretations.length > 0 ? (
          <p>
            Also understood as{' '}
            {item.alternativeInterpretations
              .map((alt) =>
                alt.homeRelationshipLabel ? `${alt.transposedName} (${alt.homeRelationshipLabel})` : `${alt.transposedName} (registry listing)`
              )
              .join('; ')}
            .
          </p>
        ) : null}
      </details>
    </article>
  );
}

export function PentatonicEnginePage(props: {
  inherited?: PentatonicInheritedContext | null;
  recommendFn?: (region: PentatonicRegionInput) => PentatonicEngineResult | Promise<PentatonicEngineResult>;
  pathRecommendFn?: typeof recommendPentatonicPath;
}) {
  const inherited = props.inherited ?? null;
  const recommendFn = props.recommendFn ?? recommendPentatonicsFromRegion;
  const pathRecommendFn = props.pathRecommendFn ?? recommendPentatonicPath;
  const [form, setForm] = useState<PentatonicFormState>(() => emptyPentatonicForm(inherited));
  const [pageEpoch, setPageEpoch] = useState(0);
  const [analysis, setAnalysis] = useState<{ result: PentatonicEngineResult; snapshot: string } | null>(null);
  const [pathAnalysis, setPathAnalysis] = useState<{ result: PentatonicPathResult; snapshot: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const patch = (partial: Partial<PentatonicFormState>) => setForm((current) => ({ ...current, ...partial }));
  const snapshot = pentatonicFormSnapshot(form, inherited);
  const stale = Boolean(analysis && analysis.snapshot !== snapshot);
  const pathStale = Boolean(pathAnalysis && pathAnalysis.snapshot !== snapshot);

  const onRecommend = () => {
    const id = ++requestRef.current;
    const requested = resolvePentatonicRegion(form, inherited);
    const requestedSnapshot = pentatonicFormSnapshot(form, inherited);
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(() => recommendFn(requested))
      .then((result) => {
        if (id !== requestRef.current) return;
        setAnalysis({ result, snapshot: requestedSnapshot });
      })
      .catch((caught: unknown) => {
        if (id !== requestRef.current) return;
        setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => {
        if (id === requestRef.current) setLoading(false);
      });
  };

  const onExample = () => {
    if (pentatonicFormIsDirty(form)) {
      const confirmed = globalThis.confirm?.('Replace the current Pentatonic inputs with the example?');
      if (!confirmed) return;
    }
    setForm(examplePentatonicForm());
  };

  const onFindPath = () => {
    const id = ++requestRef.current;
    const requestedSnapshot = pentatonicFormSnapshot(form, inherited);
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(() => pathRecommendFn(resolvePentatonicPassage(form)))
      .then((result) => {
        if (id !== requestRef.current) return;
        setPathAnalysis({ result, snapshot: requestedSnapshot });
      })
      .catch((caught: unknown) => {
        if (id !== requestRef.current) return;
        setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => {
        if (id === requestRef.current) setLoading(false);
      });
  };

  const onReset = () => {
    requestRef.current += 1;
    setForm(cleanPentatonicForm());
    setAnalysis(null);
    setPathAnalysis(null);
    setError(null);
    setLoading(false);
    setPageEpoch((epoch) => epoch + 1);
  };

  const onResetPassage = () => {
    patch({ analysisMode: 'passage', evidenceProfile: 'default', passageRows: [emptyPassageRow()] });
    setPathAnalysis(null);
  };

  const result = analysis?.result ?? null;

  return (
    <section aria-labelledby="pentatonic-heading">
      <h2 id="pentatonic-heading" style={{ marginBottom: '0.25rem' }}>
        Pentatonic Engine
      </h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
        Analyse, plan, transform, generate, compare, then export. Silence is a real result. A pentatonic resource is a colour, not a claim that every note belongs to it.
      </p>
      <PentatonicWorkflowPanel key={pageEpoch} />
      <details>
        <summary>Region and passage tools</summary>
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
      <label htmlFor="pentatonic-analysis-mode">
        Mode
        <select
          id="pentatonic-analysis-mode"
          value={form.analysisMode}
          onChange={(event) => patch({ analysisMode: event.target.value as PentatonicFormState['analysisMode'] })}
        >
          <option value="region">Region</option>
          <option value="passage">Passage</option>
          <option value="score">Whole score</option>
        </select>
      </label>
      {inherited?.tonalCentreRoot || inherited?.harmonyBars?.length || inherited?.melodyNotes?.length ? (
        <p data-testid="pentatonic-inherited" style={{ fontSize: '0.85rem' }}>
          Inherited Composer OS context:{' '}
          {inherited.tonalCentreRoot ? `${inherited.tonalCentreRoot} ${inherited.tonalCentreMode ?? ''}`.trim() : 'no tonal centre'}
          {inherited.harmonyBars?.length ? ` · harmony ${inherited.harmonyBars.join(' | ')}` : ''}
          {inherited.melodyNotes?.length ? ` · melody ${inherited.melodyNotes.join(' ')}` : ''}
        </p>
      ) : null}

      <button type="button" className="secondary" data-testid="pentatonic-reset" onClick={onReset}>
        Reset Pentatonic Inputs
      </button>

      {form.analysisMode === 'score' ? (
        <PentatonicScorePanel key={pageEpoch} />
      ) : (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <label htmlFor="pentatonic-tonal-root">
          Tonal centre
          <select
            id="pentatonic-tonal-root"
            aria-describedby="pentatonic-help-tonal"
            value={form.useInheritedTonalCentre && inherited?.tonalCentreRoot ? inherited.tonalCentreRoot : form.tonalCentreRoot}
            disabled={Boolean(form.useInheritedTonalCentre && inherited?.tonalCentreRoot)}
            onChange={(event) => patch({ tonalCentreRoot: event.target.value, useInheritedTonalCentre: false })}
          >
            {PENTATONIC_NOTE_CHOICES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>
        <p id="pentatonic-help-tonal" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Tonal centre is the general harmonic reference. It is not the HOME collection.
        </p>
        <label htmlFor="pentatonic-mode">
          Mode
          <select
            id="pentatonic-mode"
            value={form.useInheritedTonalCentre && inherited?.tonalCentreMode ? inherited.tonalCentreMode : form.tonalCentreMode}
            disabled={Boolean(form.useInheritedTonalCentre && inherited?.tonalCentreRoot)}
            onChange={(event) =>
              patch({ tonalCentreMode: event.target.value === 'minor' ? 'minor' : 'major', useInheritedTonalCentre: false })
            }
          >
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </label>
        {inherited?.tonalCentreRoot ? (
          <label>
            <input
              type="checkbox"
              checked={form.useInheritedTonalCentre}
              onChange={(event) => patch({ useInheritedTonalCentre: event.target.checked })}
            />{' '}
            Use inherited tonal centre
          </label>
        ) : null}

        <label htmlFor="pentatonic-home-archetype">
          HOME archetype
          <select
            id="pentatonic-home-archetype"
            aria-describedby="pentatonic-help-home"
            value={form.homeArchetypeId}
            onChange={(event) => patch({ homeArchetypeId: event.target.value })}
          >
            <option value="">None</option>
            <option value="major_pentatonic">Major Pentatonic</option>
            <option value="minor_pentatonic">Minor Pentatonic</option>
          </select>
        </label>
        <label htmlFor="pentatonic-home-ref">
          HOME reference note
          <select id="pentatonic-home-ref" value={form.homeReference} onChange={(event) => patch({ homeReference: event.target.value })}>
            {PENTATONIC_NOTE_CHOICES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>
        <p id="pentatonic-help-home" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          HOME collection is the pentatonic resource colour relationships are calculated from.
        </p>

        <label htmlFor="pentatonic-current-mode">
          Current collection
          <select
            id="pentatonic-current-mode"
            aria-describedby="pentatonic-help-current"
            value={form.currentMode}
            onChange={(event) => patch({ currentMode: event.target.value as PentatonicFormState['currentMode'] })}
          >
            <option value="none">None</option>
            <option value="registry">Registry archetype</option>
            <option value="notes">Five notes</option>
          </select>
        </label>
        <p id="pentatonic-help-current" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Current collection is the pentatonic resource already in use. Leave it empty if there is none. Five notes that
          match no registry pentatonic stay a custom non-registry current collection. They are not stored as a registry
          archetype.
        </p>
        {form.currentMode === 'registry' ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label htmlFor="pentatonic-current-archetype">
              Archetype
              <select
                id="pentatonic-current-archetype"
                value={form.currentArchetypeId}
                onChange={(event) => patch({ currentArchetypeId: event.target.value })}
              >
                <option value="minor_pentatonic">Minor Pentatonic</option>
                <option value="major_pentatonic">Major Pentatonic</option>
              </select>
            </label>
            <label htmlFor="pentatonic-current-ref">
              Reference
              <select
                id="pentatonic-current-ref"
                value={form.currentReference}
                onChange={(event) => patch({ currentReference: event.target.value })}
              >
                {PENTATONIC_NOTE_CHOICES.map((note) => (
                  <option key={note} value={note}>
                    {note}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        {form.currentMode === 'notes' ? (
          <NoteChips legend="Current five notes" notes={form.currentNotes} onChange={(currentNotes) => patch({ currentNotes })} />
        ) : null}

        <label htmlFor="pentatonic-harmony">
          Harmony for this region
          <input
            id="pentatonic-harmony"
            value={form.harmonyText}
            placeholder="Am(add9)"
            onChange={(event) => patch({ harmonyText: event.target.value, useInheritedHarmony: false })}
          />
        </label>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          One chord, for example Am(add9). Separate identical bars with |. Different chords are not averaged.
        </p>
        {inherited?.harmonyBars?.length ? (
          <label>
            <input
              type="checkbox"
              checked={form.useInheritedHarmony}
              onChange={(event) => patch({ useInheritedHarmony: event.target.checked })}
            />{' '}
            Use inherited harmony
          </label>
        ) : null}

        <NoteChips
          legend="Melody"
          notes={form.useInheritedMelody && form.melodyNotes.length === 0 && inherited?.melodyNotes ? [...inherited.melodyNotes] : form.melodyNotes}
          onChange={(melodyNotes) => patch({ melodyNotes, useInheritedMelody: false })}
        />
        <NoteChips legend="Bass" notes={form.bassNotes} onChange={(bassNotes) => patch({ bassNotes })} />
        <NoteChips legend="Held / important notes" notes={form.heldNotes} onChange={(heldNotes) => patch({ heldNotes })} />

        <label htmlFor="pentatonic-purpose">
          Purpose
          <select
            id="pentatonic-purpose"
            value={form.purpose}
            onChange={(event) => patch({ purpose: event.target.value as PentatonicFormState['purpose'] })}
          >
            <option value="">None</option>
            <option value="lyrical_answer">Lyrical answer</option>
            <option value="continuity">Continuity</option>
            <option value="colour">Colour</option>
            <option value="tension">Tension</option>
            <option value="restraint">Restraint</option>
          </select>
        </label>
        <label htmlFor="pentatonic-colour">
          Colour / tension preference
          <select
            id="pentatonic-colour"
            value={form.colourTension}
            onChange={(event) => patch({ colourTension: event.target.value as PentatonicFormState['colourTension'] })}
          >
            <option value="">None</option>
            <option value="home">Home</option>
            <option value="suspended">Suspended colour</option>
            <option value="major_7">Major 7 colour</option>
            <option value="brighter">Brighter major</option>
          </select>
        </label>
        <label htmlFor="pentatonic-depth">
          Resource depth
          <select
            id="pentatonic-depth"
            value={form.depth}
            onChange={(event) => patch({ depth: event.target.value as PentatonicFormState['depth'] })}
          >
            <option value="near">Near — tonal centre and HOME relationships</option>
            <option value="home_wheel">HOME wheel only</option>
            <option value="chromatic">All transpositions</option>
          </select>
        </label>
        <label htmlFor="pentatonic-strict">
          <input
            id="pentatonic-strict"
            type="checkbox"
            checked={form.strictMelody}
            aria-describedby="pentatonic-help-strict"
            onChange={(event) => patch({ strictMelody: event.target.checked })}
          />{' '}
          Strict melody membership
        </label>
        <p id="pentatonic-help-strict" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Strict melody membership requires every supplied melody note to belong to the collection.
        </p>

        <details>
          <summary>Protected, target, and caution notes</summary>
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
            <NoteChips
              legend="Protected collection members"
              notes={form.protectedNotes}
              helpId="pentatonic-help-protected"
              onChange={(protectedNotes) => patch({ protectedNotes })}
            />
            <p id="pentatonic-help-protected" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Protected notes are notes every recommended collection must contain. This does not lock a score against editing.
            </p>
            <NoteChips legend="Target notes" notes={form.targetNotes} onChange={(targetNotes) => patch({ targetNotes })} />
            <NoteChips legend="Caution notes" notes={form.cautionNotes} onChange={(cautionNotes) => patch({ cautionNotes })} />
          </div>
        </details>

        {form.analysisMode === 'region' ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" data-testid="pentatonic-recommend" onClick={onRecommend} disabled={loading}>
              {loading ? 'Recommending…' : 'Recommend'}
            </button>
            <button type="button" className="secondary" data-testid="pentatonic-example" onClick={onExample}>
              Load Example
            </button>
          </div>
        ) : (
          <PentatonicPassagePanel
            form={form}
            patch={patch}
            result={pathAnalysis?.result ?? null}
            stale={pathStale}
            loading={loading}
            onFind={onFindPath}
            onReset={onResetPassage}
          />
        )}
      </div>
      )}

      {error ? (
        <p role="alert" data-testid="pentatonic-error">
          {error}
        </p>
      ) : null}
      {stale ? (
        <p data-testid="pentatonic-stale" style={{ color: 'var(--text-muted)' }}>
          Inputs changed. This result is stale.
        </p>
      ) : null}

      {result?.kind === 'validation' ? (
        <div role="alert" data-testid="pentatonic-validation">
          <h3>Check the inputs</h3>
          <ul>
            {result.validationErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result?.kind === 'analysis' && result.disposition ? (
        <div data-testid="pentatonic-result" aria-live="polite" style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
          <h3 data-testid="pentatonic-disposition" style={{ marginBottom: 0 }}>
            {DISPOSITION_LABEL[result.disposition]}
          </h3>
          <p>{result.explanation}</p>
          {result.retained ? <RecommendationCard heading="Retained" item={result.retained} /> : null}
          {result.recommendations.map((item) => (
            <RecommendationCard key={item.canonicalId} heading="Recommendation" item={item} />
          ))}
          {result.alternatives.length > 0 ? <h3 style={{ marginBottom: 0 }}>Alternatives</h3> : null}
          {result.alternatives.map((item) => (
            <RecommendationCard key={item.canonicalId} heading="Alternative" item={item} />
          ))}
          {result.constraintFailures.length > 0 ? (
            <details>
              <summary>Collections blocked by hard constraints</summary>
              <ul>
                {result.constraintFailures.map((failure) => (
                  <li key={failure.canonicalId}>
                    {failure.name}: {failure.reasons.join(' ')}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <details>
            <summary>Registry and evaluator</summary>
            <p>
              Registry {result.registryVersion}. Evaluator {result.evaluatorVersion}. Relationship scoring{' '}
              {result.relationshipScoringVersion}. Configuration {result.configurationId}.
            </p>
            <p>{result.limitations.join(' ')}</p>
          </details>
        </div>
      ) : null}
        </div>
      </details>
    </section>
  );
}
