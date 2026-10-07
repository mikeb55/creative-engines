import { useState } from 'react';
import { AUTO_COLOR_GUI_INTENTIONS, autoColorContextFromAnalysis, planAutoColor, type AutoColorPlan, type DuoRole, type FormFunction, type MusicalIntention, PENTATONIC_NOTE_CHOICES } from '@composer-os/core/pentatonic';
import {
  DEV4C_ACTIVITIES,
  DEV4C_DEFAULT_METHOD,
  DEV4C_PURPOSES,
  activityLabel,
  analysePentatonicMusicXml,
  collectionForRegion,
  generatePentatonicPhrase,
  homeCollection,
  manualCollection,
  methodDescription,
  purposeLabel,
  transformPentatonicMotif,
  type Dev4cActivity,
  type Dev4cPurpose,
  type MusicianAnalysis,
  type PentatonicCandidateView,
  type PentatonicGenerateResult,
  type PentatonicTransformResult,
} from '@composer-os/core/pentatonic/dev4cWorkflow';
import { initPlayback, play, stop } from '../playback/playbackEngine';
import { parseXmlToPlaybackSequence } from '../playback/musicXmlToPlaybackSequence';

function downloadXml(filename: string, xml: string): void {
  const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function ColourBlock(props: {
  selectedResource: string;
  resourceNotes: string;
  actualNotes: string;
  outsideResourceNotes: string;
}) {
  return (
    <div data-testid="pentatonic-workflow-colour">
      <p style={{ margin: '0.2rem 0' }}>SELECTED RESOURCE: {props.selectedResource}</p>
      <p style={{ margin: '0.2rem 0' }}>RESOURCE NOTES: {props.resourceNotes}</p>
      <p style={{ margin: '0.2rem 0' }}>ACTUAL GENERATED NOTES: {props.actualNotes}</p>
      <p style={{ margin: '0.2rem 0' }}>OUTSIDE-RESOURCE NOTES: {props.outsideResourceNotes}</p>
    </div>
  );
}

function GceBlock(props: { candidate: PentatonicCandidateView }) {
  if (props.candidate.silence || props.candidate.gceOverall === null) return null;
  return (
    <details>
      <summary>GCE evaluation</summary>
      <p style={{ margin: '0.2rem 0' }}>Overall {props.candidate.gceOverall.toFixed(2)}. Advisory. A higher score is not an automatic choice.</p>
      <ul>
        {props.candidate.gceCategories.map((row) => (
          <li key={row.category}>
            {row.category}: {row.score.toFixed(2)}
          </li>
        ))}
      </ul>
      {props.candidate.gceWarnings.length > 0 ? <p>Warnings: {props.candidate.gceWarnings.join(' ')}</p> : null}
    </details>
  );
}

export function PentatonicWorkflowPanel() {
  const [mode, setMode] = useState<'analyse' | 'transform' | 'generate' | 'auto-color'>('analyse');
  const [fileName, setFileName] = useState('');
  const [xml, setXml] = useState('');
  const [reading, setReading] = useState<MusicianAnalysis | null>(null);
  const [regionIndex, setRegionIndex] = useState(0);
  const [resourceMode, setResourceMode] = useState<'auto' | 'manual'>('auto');
  const [manualArchetype, setManualArchetype] = useState<'major_pentatonic' | 'minor_pentatonic'>('major_pentatonic');
  const [manualRef, setManualRef] = useState<string>(PENTATONIC_NOTE_CHOICES[0]);
  const [method, setMethod] = useState<'M-DEG' | 'M-NEAR'>(DEV4C_DEFAULT_METHOD);
  const [purpose, setPurpose] = useState<Dev4cPurpose>('MOTIF');
  const [activity, setActivity] = useState<Dev4cActivity>('SPARSE');
  const [transform, setTransform] = useState<PentatonicTransformResult | null>(null);
  const [generated, setGenerated] = useState<PentatonicGenerateResult | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoIntentions, setAutoIntentions] = useState<MusicalIntention[]>([]);
  const [autoForm, setAutoForm] = useState<FormFunction>('unknown');
  const [autoRole, setAutoRole] = useState<DuoRole>('UNKNOWN');
  const [autoResource, setAutoResource] = useState<'major_pentatonic' | 'minor_pentatonic' | 'none'>('major_pentatonic');
  const [autoGrounded, setAutoGrounded] = useState(false);
  const [autoPlan, setAutoPlan] = useState<AutoColorPlan | null>(null);

  const region = reading?.analysis.regions[regionIndex] ?? null;

  const onFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    setReading(null);
    setTransform(null);
    setGenerated(null);
    setChosen(null);
    setAutoPlan(null);
    Promise.resolve(file.text())
      .then((text) => {
        setFileName(file.name);
        setXml(text);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  };

  const onAnalyse = () => {
    if (!xml) {
      setError('Load a MusicXML score first.');
      return;
    }
    setBusy(true);
    setError(null);
    const source = xml;
    Promise.resolve()
      .then(() => analysePentatonicMusicXml(source, { sourceFile: fileName }))
      .then((result) => {
        setReading(result);
        setRegionIndex(0);
        setTransform(null);
        setGenerated(null);
        setChosen(null);
        const context = autoColorContextFromAnalysis(result.analysis);
        setAutoForm(context.formFunction ?? 'unknown');
        setAutoRole(context.duoRole ?? 'UNKNOWN');
        setAutoResource(context.pathIsNone ? 'none' : context.currentResourceId === 'minor_pentatonic' ? 'minor_pentatonic' : 'major_pentatonic');
        setAutoGrounded(context.grounding?.present === true);
        setAutoPlan(null);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const manualCollectionChoice = () => (resourceMode === 'manual' ? manualCollection(manualArchetype, manualRef) : null);

  const onTransform = () => {
    if (!reading || !region) {
      setError('Analyse a score first.');
      return;
    }
    const target = manualCollectionChoice() ?? collectionForRegion(region) ?? homeCollection(reading.analysis);
    if (!target) {
      setError('This region is NONE. Choose a manual resource or another region.');
      return;
    }
    setBusy(true);
    setError(null);
    Promise.resolve()
      .then(() =>
        transformPentatonicMotif({
          xml,
          analysis: reading.analysis,
          region,
          target,
          method,
        })
      )
      .then((result) => {
        setTransform(result);
        setGenerated(null);
        setChosen('transform');
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const onGenerate = () => {
    if (!reading || !region) {
      setError('Analyse a score first.');
      return;
    }
    setBusy(true);
    setError(null);
    const manual = manualCollectionChoice();
    Promise.resolve()
      .then(() =>
        generatePentatonicPhrase({
          xml,
          analysis: reading.analysis,
          region,
          purpose,
          activity,
          ...(manual ? { collection: manual } : {}),
        })
      )
      .then((result) => {
        setGenerated(result);
        setTransform(null);
        setChosen(null);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const hear = (musicXml: string, silence: boolean) => {
    if (silence) return;
    Promise.resolve()
      .then(async () => {
        await initPlayback();
        await play(parseXmlToPlaybackSequence(musicXml), () => undefined);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  };

  const exportXml = (musicXml: string, label: string) => {
    const safe = (fileName || 'pentatonic').replace(/\.musicxml$/i, '');
    downloadXml(`${safe}-${label}.musicxml`, musicXml);
  };

  const toggleIntention = (intention: MusicalIntention) => {
    setAutoPlan(null);
    setAutoIntentions((current) => {
      if (current.includes(intention)) return current.filter((item) => item !== intention);
      if (current.length >= 3) return current;
      return [...current, intention];
    });
  };

  const onAutoColor = () => {
    setAutoPlan(
      planAutoColor({
        intentions: autoIntentions,
        formFunction: autoForm,
        duoRole: autoRole,
        pathIsNone: autoResource === 'none',
        currentResourceId: autoResource === 'none' ? null : autoResource,
        homeResourceId: autoResource === 'none' ? null : autoResource,
        homeKnown: autoResource !== 'none',
        fieldIsHome: autoResource !== 'none',
        hasMotif: autoResource !== 'none',
        lineageIdentity: autoResource === 'none' ? 'absent' : 'clear',
        holdCredible: true,
        quartalAvailable: autoResource !== 'none',
        density: 'sparse',
        grounding: autoGrounded
          ? { present: true, bassPedal: true, bassOstinato: false, sustainedTone: true, motifIdentity: true, explicitAnchor: false }
          : { present: false, bassPedal: false, bassOstinato: false, sustainedTone: false, motifIdentity: false, explicitAnchor: false },
      })
    );
  };

  const FORM_CHOICES: FormFunction[] = ['opening', 'continuation', 'development', 'climax', 'release', 'ending', 'unknown'];
  const ROLE_CHOICES: DuoRole[] = [
    'GUITAR_LEADS',
    'BASS_LEADS',
    'GUITAR_RESPONDS',
    'BASS_RESPONDS',
    'COUNTERPOINT',
    'SHARED_FIELD',
    'GUITAR_SUPPORTS',
    'BASS_SUPPORTS',
    'SPACE',
    'UNKNOWN',
  ];

  return (
    <div data-testid="pentatonic-workflow" style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
      <label htmlFor="pentatonic-workflow-mode">
        Mode
        <select
          id="pentatonic-workflow-mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as 'analyse' | 'transform' | 'generate' | 'auto-color')}
        >
          <option value="analyse">Analyse</option>
          <option value="transform">Transform Motif</option>
          <option value="generate">Generate Phrase</option>
          <option value="auto-color">AUTO COLOR</option>
        </select>
      </label>
      <label htmlFor="pentatonic-workflow-file">
        MusicXML
        <input
          id="pentatonic-workflow-file"
          data-testid="pentatonic-workflow-file"
          type="file"
          accept=".musicxml,.xml,application/xml,text/xml"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {fileName ? <p style={{ margin: 0 }}>File: {fileName}</p> : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" data-testid="pentatonic-workflow-analyse" onClick={onAnalyse} disabled={busy || !xml}>
          {busy && mode === 'analyse' ? 'Analysing…' : 'Analyse'}
        </button>
        {mode === 'transform' ? (
          <button type="button" data-testid="pentatonic-workflow-transform" onClick={onTransform} disabled={busy || !reading}>
            Transform
          </button>
        ) : null}
        {mode === 'generate' ? (
          <button type="button" data-testid="pentatonic-workflow-generate" onClick={onGenerate} disabled={busy || !reading}>
            Generate
          </button>
        ) : null}
        {mode === 'auto-color' ? (
          <button type="button" data-testid="pentatonic-auto-color-plan" onClick={onAutoColor} disabled={autoIntentions.length === 0}>
            Plan
          </button>
        ) : null}
      </div>

      {reading ? (
        <div data-testid="pentatonic-workflow-reading" style={{ display: 'grid', gap: '0.35rem' }}>
          <p style={{ margin: 0 }} data-testid="pentatonic-workflow-centre">
            CENTRE: {reading.centre}
          </p>
          <p style={{ margin: 0 }} data-testid="pentatonic-workflow-home">
            HOME: {reading.home}
            {reading.home === 'not established' ? ` (${reading.homeStatus})` : ''}
          </p>
          <p style={{ margin: 0 }}>NONE regions: {reading.noneCount}</p>
          <div data-testid="pentatonic-workflow-regions" style={{ display: 'grid', gap: '0.25rem' }}>
            {reading.regions.map((row) => (
              <p key={`${row.measureRangeLabel}-${row.collectionName}`} style={{ margin: 0 }} data-testid="pentatonic-workflow-region-row">
                {row.measureRangeLabel} — {row.collectionName}
                {row.none ? '' : ` — ${row.colour}`}
              </p>
            ))}
          </div>
          <label htmlFor="pentatonic-workflow-region">
            Region
            <select
              id="pentatonic-workflow-region"
              value={String(regionIndex)}
              onChange={(event) => setRegionIndex(Number(event.target.value))}
            >
              {reading.regions.map((row, index) => (
                <option key={`${row.measureRangeLabel}-${index}`} value={index}>
                  {row.measureRangeLabel} {row.collectionName}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {mode === 'transform' || mode === 'generate' ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="pentatonic-workflow-resource">
            Pentatonic resource
            <select
              id="pentatonic-workflow-resource"
              value={resourceMode}
              onChange={(event) => setResourceMode(event.target.value === 'manual' ? 'manual' : 'auto')}
            >
              <option value="auto">Auto / path recommendation</option>
              <option value="manual">Manual resource</option>
            </select>
          </label>
          {resourceMode === 'manual' ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label htmlFor="pentatonic-workflow-archetype">
                Collection
                <select
                  id="pentatonic-workflow-archetype"
                  value={manualArchetype}
                  onChange={(event) =>
                    setManualArchetype(event.target.value === 'minor_pentatonic' ? 'minor_pentatonic' : 'major_pentatonic')
                  }
                >
                  <option value="major_pentatonic">Major Pentatonic</option>
                  <option value="minor_pentatonic">Minor Pentatonic</option>
                </select>
              </label>
              <label htmlFor="pentatonic-workflow-reference">
                Reference
                <select id="pentatonic-workflow-reference" value={manualRef} onChange={(event) => setManualRef(event.target.value)}>
                  {PENTATONIC_NOTE_CHOICES.map((note) => (
                    <option key={note} value={note}>
                      {note}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'transform' ? (
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <label htmlFor="pentatonic-workflow-method">
            Transformation method
            <select
              id="pentatonic-workflow-method"
              value={method}
              onChange={(event) => setMethod(event.target.value === 'M-NEAR' ? 'M-NEAR' : 'M-DEG')}
            >
              <option value="M-DEG">M-DEG</option>
              <option value="M-NEAR">M-NEAR</option>
            </select>
          </label>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{methodDescription(method)}</p>
          {transform ? (
            <div data-testid="pentatonic-workflow-transform-result">
              <p data-testid="pentatonic-workflow-pitch-change" style={{ margin: '0.2rem 0' }}>
                PITCH CHANGE: {transform.pitchChange}
              </p>
              <ColourBlock
                selectedResource={transform.selectedResource}
                resourceNotes={transform.resourceNotes}
                actualNotes={transform.actualNotes}
                outsideResourceNotes={transform.outsideResourceNotes}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" data-testid="pentatonic-workflow-hear" onClick={() => hear(transform.musicXml, false)}>
                  Audition
                </button>
                <button
                  type="button"
                  data-testid="pentatonic-workflow-export"
                  onClick={() => exportXml(transform.musicXml, transform.method)}
                >
                  Export MusicXML
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'generate' ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="pentatonic-workflow-purpose">
            Purpose
            <select
              id="pentatonic-workflow-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value as Dev4cPurpose)}
            >
              {DEV4C_PURPOSES.map((item) => (
                <option key={item} value={item}>
                  {purposeLabel(item)}
                </option>
              ))}
            </select>
          </label>
          {purpose !== 'NO_PHRASE' ? (
            <label htmlFor="pentatonic-workflow-activity">
              Activity
              <select
                id="pentatonic-workflow-activity"
                value={activity}
                onChange={(event) => setActivity(event.target.value as Dev4cActivity)}
              >
                {DEV4C_ACTIVITIES.map((item) => (
                  <option key={item} value={item}>
                    {activityLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p style={{ margin: 0 }}>No phrase leaves the bar silent. That is a result, not a failed generation.</p>
          )}
          {generated?.notice ? <p data-testid="pentatonic-workflow-notice">{generated.notice}</p> : null}
          {generated?.candidates.map((candidate) => (
            <article
              key={candidate.letter}
              data-testid="pentatonic-workflow-candidate"
              style={{
                border: chosen === candidate.letter ? '2px solid var(--text)' : '1px solid var(--border)',
                borderRadius: 8,
                padding: '0.6rem',
              }}
            >
              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>
                {candidate.letter}
                {candidate.silence ? '' : ` — ${candidate.purposeLabel} — ${candidate.activityLabel}`}
              </h3>
              {candidate.silence ? (
                <p data-testid="pentatonic-workflow-silence" style={{ margin: '0.2rem 0' }}>
                  {candidate.resultLabel}
                </p>
              ) : (
                <p style={{ margin: '0.2rem 0' }}>
                  Purpose: {candidate.purposeLabel}. Resource: {candidate.selectedResource}.
                </p>
              )}
              <ColourBlock
                selectedResource={candidate.selectedResource}
                resourceNotes={candidate.resourceNotes}
                actualNotes={candidate.actualNotes}
                outsideResourceNotes={candidate.outsideResourceNotes}
              />
              {candidate.scaleLike ? <p style={{ margin: '0.2rem 0' }}>SCALE-LIKE MOTION: {candidate.scaleLike}</p> : null}
              <GceBlock candidate={candidate} />
              <button type="button" onClick={() => setChosen(candidate.letter)}>
                {chosen === candidate.letter ? 'Chosen' : `Choose ${candidate.letter}`}
              </button>
            </article>
          ))}
          {generated && chosen ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                data-testid="pentatonic-workflow-hear"
                onClick={() => {
                  const candidate = generated.candidates.find((item) => item.letter === chosen);
                  if (candidate) hear(candidate.musicXml, candidate.silence);
                }}
              >
                Audition
              </button>
              <button
                type="button"
                data-testid="pentatonic-workflow-export"
                onClick={() => {
                  const candidate = generated.candidates.find((item) => item.letter === chosen);
                  if (candidate) exportXml(candidate.musicXml, candidate.letter);
                }}
              >
                Export MusicXML
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'auto-color' ? (
        <div data-testid="pentatonic-auto-color" style={{ display: 'grid', gap: '0.45rem' }}>
          <div role="group" aria-label="Intentions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {AUTO_COLOR_GUI_INTENTIONS.map(([intention, label]) => {
              const on = autoIntentions.includes(intention);
              return (
                <button
                  key={intention}
                  type="button"
                  className={on ? '' : 'secondary'}
                  aria-pressed={on}
                  data-testid={`pentatonic-auto-intention-${intention}`}
                  onClick={() => toggleIntention(intention)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label htmlFor="pentatonic-auto-form">
              Form
              <select
                id="pentatonic-auto-form"
                value={autoForm}
                onChange={(event) => {
                  setAutoPlan(null);
                  setAutoForm(event.target.value as FormFunction);
                }}
              >
                {FORM_CHOICES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="pentatonic-auto-role">
              Duo
              <select
                id="pentatonic-auto-role"
                value={autoRole}
                onChange={(event) => {
                  setAutoPlan(null);
                  setAutoRole(event.target.value as DuoRole);
                }}
              >
                {ROLE_CHOICES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="pentatonic-auto-resource">
              Current field
              <select
                id="pentatonic-auto-resource"
                value={autoResource}
                onChange={(event) => {
                  setAutoPlan(null);
                  const value = event.target.value;
                  setAutoResource(value === 'minor_pentatonic' || value === 'none' ? value : 'major_pentatonic');
                }}
              >
                <option value="major_pentatonic">Major Pentatonic</option>
                <option value="minor_pentatonic">Minor Pentatonic</option>
                <option value="none">NONE</option>
              </select>
            </label>
            <label htmlFor="pentatonic-auto-ground">
              <input
                id="pentatonic-auto-ground"
                type="checkbox"
                checked={autoGrounded}
                onChange={(event) => {
                  setAutoPlan(null);
                  setAutoGrounded(event.target.checked);
                }}
              />{' '}
              Grounding
            </label>
          </div>
          {autoPlan ? (
            <div data-testid="pentatonic-auto-color-plan-result" style={{ display: 'grid', gap: '0.2rem' }}>
              <p style={{ margin: 0 }}>INTENTION: {autoPlan.intentions.join(' + ') || 'none'}</p>
              <p style={{ margin: 0 }}>FORM CONTEXT: {autoPlan.formFunction}</p>
              <p style={{ margin: 0 }}>DUO CONTEXT: {autoPlan.duoRole}</p>
              <p style={{ margin: 0 }}>PLAN: {autoPlan.outcome}</p>
              <p style={{ margin: 0 }}>SELECTED RESOURCE: {autoPlan.selectedResource}</p>
              <p style={{ margin: 0 }}>OPERATOR: {autoPlan.operator}</p>
              <p style={{ margin: 0 }}>RETURN / RESOLUTION: {autoPlan.returnBehaviour}</p>
              <p style={{ margin: 0 }}>SILENCE DECISION: {autoPlan.silencePreference}</p>
              <p style={{ margin: 0 }}>RATIONALE: {autoPlan.rationale}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" data-testid="pentatonic-workflow-error">
          {error}
        </p>
      ) : null}
      <button type="button" className="secondary" onClick={() => stop()} style={{ justifySelf: 'start' }}>
        Stop audition
      </button>
    </div>
  );
}
