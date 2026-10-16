/**
 * Musical Evaluation Dashboard.
 * Displays V3.1-B receipts. Does not analyse MusicXML itself and does not score artistic quality.
 */
import React, { useEffect, useState } from 'react';
import { api, isDesktopIpc } from '../services/api';
import { ComparisonPanel } from './ComparisonPanel';
import { EvidencePanel } from './EvidencePanel';
import { ReviewPanel } from './ReviewPanel';
import { takeEvaluationHandoff } from '../bhl/bhlHexatonicHandoff';
import { HARMONIC_SECTIONS, RHYTHM_SECTIONS, type DashboardFinding } from './evaluationEvidence';

export const EVALUATION_VIEWS = [
  { id: 'technical', label: '1 Technical Integrity' },
  { id: 'harmonic', label: '2 Harmonic and Melodic Analysis' },
  { id: 'rhythm', label: '3 Rhythm, Form and Interaction' },
  { id: 'comparison', label: '4 Candidate Comparison' },
  { id: 'review', label: '5 BMEF Human Review' },
  { id: 'coherence', label: '6 Coherence' },
] as const;

export type EvaluationViewId = (typeof EVALUATION_VIEWS)[number]['id'];

export interface EvaluationTransport {
  evaluate(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  compare?(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  createReview?(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  saveReview?(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  openReview?(body: Record<string, unknown>): Promise<Record<string, unknown>>;
}

type IdentityEvent = {
  id: string;
  bar: number;
  partId: string;
  instrument: string;
  voice: string;
  onset: string;
  rest: boolean;
};

type TechnicalFinding = {
  id: string;
  check: string;
  status: string;
  bar: number | null;
  instrument: string | null;
  partId: string | null;
  voice: string | null;
  eventIds: string[];
  observation: string;
  onsetInBar: { n: number; d: number } | null;
};

type Loaded = {
  identity: {
    sha256: string;
    parseError: string | null;
    parts: Array<{ id: string; name: string; role: string }>;
    bars: number[];
    eventCount: number;
    events: IdentityEvent[];
  };
  receipt: {
    receiptSha256: string;
    technical: Array<{ summary: Record<string, string>; findings: TechnicalFinding[] }>;
    structural: Array<{ findings: DashboardFinding[] }>;
    unsupportedMetrics: string[];
    humanJudgement: null;
    bmef: { machineRatings: null; machineDecision: null };
  };
};

type CoherenceView = {
  version?: string;
  musicalQualityScore: null;
  musicallyApproved?: false;
  discovered?: string[];
  notes?: string[];
  hooks?: Array<{ hookId: string; firstBar: number; returns: Array<{ bar: number; identity: string; similarity: number }> }>;
  independence?: { pairs?: Array<{ pair: [string, string]; motion: { parallel: number }; parallelPerfectRuns: Array<{ startBar: number; length: number; interval: string }> }>; notes?: string[] } | null;
  absences?: Array<{ cellId: string; fromBar: number; toBar: number }>;
};

function CoherencePanel({ receipt }: { receipt?: { coherence?: CoherenceView | null } }) {
  const coherence = receipt?.coherence ?? null;
  return (
    <div data-testid="evaluation-view-panel-coherence">
      <h3>Coherence</h3>
      <p data-testid="evaluation-not-approved">Not musically approved</p>
      <p>These counts describe returns, motion, and absence. They do not decide the music.</p>
      {!coherence && <p data-testid="evaluation-coherence-empty">Load a score to see coherence evidence.</p>}
      {coherence && (
        <>
          <p data-testid="evaluation-coherence-score">musicalQualityScore {String(coherence.musicalQualityScore)}</p>
          <p>Discovered cells: {coherence.discovered?.join(', ') || 'none'}</p>
          {(coherence.notes ?? []).map((note) => (
            <p key={note} data-testid="evaluation-coherence-note">{note}</p>
          ))}
          {(coherence.hooks ?? []).map((hook) => (
            <p key={hook.hookId}>
              {hook.hookId} first appears in bar {hook.firstBar}. Returns: {hook.returns.map((item) => `bar ${item.bar} ${item.identity}`).join(', ') || 'none'}.
            </p>
          ))}
          {(coherence.absences ?? []).map((absence) => (
            <p key={`${absence.cellId}-${absence.fromBar}`}>
              {absence.cellId} is absent from bar {absence.fromBar} to bar {absence.toBar}.
            </p>
          ))}
        </>
      )}
    </div>
  );
}

const CHECK_LABELS: Record<string, string> = {
  parse: 'Parse and structural integrity',
  'measure-duration': 'Measure duration',
  'part-voice': 'Instrument information',
  'pitch-range': 'Sounding range',
  'source-lock': 'Source and bass lock',
  'guitar-feasibility': 'Guitar feasibility',
  reimport: 'Reimport',
};

function onsetText(onset: { n: number; d: number } | null): string {
  if (!onset) return '';
  return `${onset.n}/${onset.d}`;
}

async function defaultTransportEvaluate(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.evaluateMusicalScore(body);
}

async function defaultTransportCompare(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.compareMusicalScores(body);
}

async function defaultCreateReview(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.createHumanReview(body);
}

async function defaultSaveReview(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.saveHumanReview(body);
}

async function defaultOpenReview(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.openHumanReview(body);
}

export function EvaluationDashboardPage({ transport }: { transport?: EvaluationTransport }) {
  const evaluate = transport?.evaluate ?? defaultTransportEvaluate;
  const compare = transport?.compare ?? defaultTransportCompare;
  const createReview = transport?.createReview ?? defaultCreateReview;
  const saveReview = transport?.saveReview ?? defaultSaveReview;
  const openReview = transport?.openReview ?? defaultOpenReview;
  const [comparison, setComparison] = useState<{ labels: string[]; differenceCount: number; differences: unknown[] } | null>(null);
  const [label, setLabel] = useState('score');
  const [xml, setXml] = useState('');
  const [baselineXml, setBaselineXml] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldFamily, setFieldFamily] = useState('pentatonic');
  const [fieldPcs, setFieldPcs] = useState('');
  const [view, setView] = useState<EvaluationViewId>('technical');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<string>('');
  const [handoffNote, setHandoffNote] = useState('');

  useEffect(() => {
    const handoff = takeEvaluationHandoff();
    if (!handoff) return;
    setXml(handoff.xml);
    setLabel(handoff.label);
    setFieldLabel(handoff.fieldLabel);
    setFieldFamily(handoff.fieldFamily || 'hexatonic');
    setFieldPcs(handoff.fieldPcs);
    setHandoffNote(handoff.provisional ? `${handoff.status}. This hand-off does not accept the music.` : 'Technical evidence only. No artistic score.');
    if (handoff.view === 'coherence') setView('coherence');
  }, []);

  async function readDesktopFile(): Promise<void> {
    if (!isDesktopIpc() || !window.composerOsDesktop?.invokeApi) {
      setError('Choose a MusicXML file with the file control, or paste the score.');
      return;
    }
    const picked = (await window.composerOsDesktop.invokeApi('composer-os-api:pick-leadsheet-file', {})) as {
      ok?: boolean;
      filepath?: string;
      canceled?: boolean;
    };
    if (!picked.ok || !picked.filepath) return;
    const text = await window.composerOsDesktop.invokeApi('composer-os-api:read-file', { path: picked.filepath });
    if (typeof text !== 'string' || !text.trim()) {
      setError('The chosen file had no MusicXML text. The file was not modified.');
      return;
    }
    setXml(text);
    const name = picked.filepath.split(/[/\\]/).pop() ?? 'score';
    setLabel(name);
    setError('');
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setXml(String(reader.result ?? ''));
      setLabel(file.name);
      setError('');
    };
    reader.onerror = () => setError('That file could not be read. The file was not modified.');
    reader.readAsText(file);
  }

  async function onEvaluate() {
    setBusy(true);
    setError('');
    setSelectedFinding('');
    try {
      const pitchClasses = fieldPcs.split(/[^0-9-]+/).filter(Boolean).map((item) => Number(item));
      const declared = fieldLabel.trim() && pitchClasses.length
        ? { label: fieldLabel.trim(), family: fieldFamily, pitchClasses }
        : undefined;
      const result = await evaluate({
        label,
        xml,
        baselineXml: baselineXml.trim() ? baselineXml : undefined,
        declared,
      });
      if (result.ok !== true) {
        setLoaded(null);
        setError(typeof result.error === 'string' ? result.error : 'The score could not be evaluated.');
        return;
      }
      setLoaded(result as unknown as Loaded);
    } catch (err) {
      setLoaded(null);
      setError(err instanceof Error ? err.message : 'The score could not be evaluated.');
    } finally {
      setBusy(false);
    }
  }

  const technical = loaded?.receipt.technical[0];
  const structural = loaded?.receipt.structural[0]?.findings ?? [];
  const selected = technical?.findings.find((finding) => finding.id === selectedFinding) ?? null;

  return (
    <section data-testid="evaluation-dashboard">
      <h2 style={{ marginTop: 0 }}>Musical Evaluation</h2>
      {handoffNote ? <p data-testid="evaluation-handoff">{handoffNote}</p> : null}
      <p data-testid="evaluation-notice" style={{ marginTop: 0 }}>
        Technical pass and fail describe the file. They are not a musical judgement. This page does not write the score and does not assign an artistic-quality score.
      </p>
      <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '52rem' }}>
        <label htmlFor="evaluation-label">
          Score label
          <input id="evaluation-label" data-testid="evaluation-label" value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label htmlFor="evaluation-file">
          MusicXML file
          <input
            id="evaluation-file"
            data-testid="evaluation-file"
            type="file"
            accept=".musicxml,.xml,application/xml,text/xml"
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </label>
        <button type="button" data-testid="evaluation-pick-desktop" onClick={() => void readDesktopFile()}>
          Choose existing score
        </button>
        <label htmlFor="evaluation-xml">
          MusicXML
          <textarea id="evaluation-xml" data-testid="evaluation-xml" value={xml} rows={6} onChange={(event) => setXml(event.target.value)} />
        </label>
        <label htmlFor="evaluation-field-label">
          Declared field label
          <input id="evaluation-field-label" data-testid="evaluation-field-label" value={fieldLabel} onChange={(event) => setFieldLabel(event.target.value)} />
        </label>
        <label htmlFor="evaluation-field-family">
          Declared field family
          <select id="evaluation-field-family" data-testid="evaluation-field-family" value={fieldFamily} onChange={(event) => setFieldFamily(event.target.value)}>
            <option value="pentatonic">pentatonic</option>
            <option value="hexatonic">hexatonic</option>
            <option value="bhl">bhl</option>
            <option value="wps">wps</option>
            <option value="other">other</option>
          </select>
        </label>
        <label htmlFor="evaluation-field-pcs">
          Declared pitch classes
          <input id="evaluation-field-pcs" data-testid="evaluation-field-pcs" value={fieldPcs} onChange={(event) => setFieldPcs(event.target.value)} />
        </label>
        <label htmlFor="evaluation-baseline">
          Lock baseline MusicXML (optional)
          <textarea id="evaluation-baseline" data-testid="evaluation-baseline" value={baselineXml} rows={3} onChange={(event) => setBaselineXml(event.target.value)} />
        </label>
        <button type="button" data-testid="evaluation-run" disabled={busy} onClick={() => void onEvaluate()}>
          {busy ? 'Loading score…' : 'Load score'}
        </button>
      </div>
      {busy && <p data-testid="evaluation-loading">Loading score…</p>}
      {error && <p data-testid="evaluation-error" role="alert">{error}</p>}
      {!loaded && !busy && !error && (
        <p data-testid="evaluation-empty">No score loaded. Import MusicXML to read its identity and technical findings. The source file stays unchanged.</p>
      )}
      {loaded && (
        <div data-testid="evaluation-identity">
          <h3>Score identity</h3>
          <p data-testid="evaluation-sha256">SHA-256 {loaded.identity.sha256}</p>
          <p data-testid="evaluation-receipt-sha">Receipt {loaded.receipt.receiptSha256}</p>
          {loaded.identity.parseError && <p data-testid="evaluation-parse-error">{loaded.identity.parseError}</p>}
          <p data-testid="evaluation-bar-count">Bars {loaded.identity.bars.join(', ') || 'none'} · Events {loaded.identity.eventCount}</p>
          <table data-testid="evaluation-parts">
            <thead>
              <tr><th>Part</th><th>Name</th><th>Role</th></tr>
            </thead>
            <tbody>
              {loaded.identity.parts.map((part) => (
                <tr key={part.id} data-testid="evaluation-part" data-part-id={part.id}>
                  <td>{part.id}</td><td>{part.name}</td><td>{part.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav data-testid="evaluation-views" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '1rem 0' }}>
        {EVALUATION_VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`evaluation-view-${item.id}`}
            aria-pressed={view === item.id}
            className={view === item.id ? '' : 'secondary'}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {view === 'technical' && (
        <div data-testid="evaluation-view-panel-technical">
          <h3>Technical Integrity</h3>
          <p>Pass and fail are file checks. A reported row is an unsupported or uncertain construct, not a musical error.</p>
          {!technical && <p data-testid="evaluation-technical-empty">Load a score to see technical findings.</p>}
          {technical && (
            <>
              <ul data-testid="evaluation-technical-summary">
                {Object.entries(technical.summary).map(([check, status]) => (
                  <li key={check} data-testid={`evaluation-summary-${check}`} data-status={status}>
                    {CHECK_LABELS[check] ?? check}: {status}
                  </li>
                ))}
              </ul>
              <table data-testid="evaluation-technical-findings">
                <thead>
                  <tr>
                    <th>Finding</th><th>Check</th><th>Status</th><th>Bar</th><th>Instrument</th><th>Onset</th><th>Events</th><th>Observation</th>
                  </tr>
                </thead>
                <tbody>
                  {technical.findings.map((finding) => (
                    <tr
                      key={finding.id}
                      data-testid="evaluation-finding"
                      data-finding-id={finding.id}
                      data-bar={finding.bar ?? ''}
                      data-events={finding.eventIds.join(' ')}
                      onClick={() => setSelectedFinding(finding.id)}
                    >
                      <td>{finding.id}</td>
                      <td>{finding.check}</td>
                      <td>{finding.status}</td>
                      <td>{finding.bar ?? ''}</td>
                      <td>{finding.instrument ?? ''}</td>
                      <td>{onsetText(finding.onsetInBar)}</td>
                      <td>{finding.eventIds.join(', ')}</td>
                      <td>{finding.observation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selected && (
                <p data-testid="evaluation-selected-finding">
                  {selected.id} bar {selected.bar ?? 'none'} part {selected.partId ?? 'none'} events {selected.eventIds.join(', ') || 'none'}
                </p>
              )}
              <p data-testid="evaluation-notation-note">Notation highlighting is not available. This table is the evidence location.</p>
            </>
          )}
        </div>
      )}
      {view === 'harmonic' && (
        <div data-testid="evaluation-view-panel-harmonic">
          <h3>Harmonic and Melodic Analysis</h3>
          <EvidencePanel
            testId="evaluation-harmonic-evidence"
            intro="Collections, membership, motion, contour, intervals, tessitura, and motifs are descriptions. Outside a declared field is not an error. Conventional major and minor labels are not applied."
            sections={HARMONIC_SECTIONS}
            findings={structural}
            selectedId={selectedFinding}
            onSelect={setSelectedFinding}
          />
        </div>
      )}
      {view === 'rhythm' && (
        <div data-testid="evaluation-view-panel-rhythm">
          <h3>Rhythm, Form and Interaction</h3>
          <EvidencePanel
            testId="evaluation-rhythm-evidence"
            intro="Density and silence are counted per instrument before any duo relationship. Limited rows are experimental hints, not musical roles."
            sections={RHYTHM_SECTIONS}
            findings={structural}
            unsupported={loaded?.receipt.unsupportedMetrics}
            selectedId={selectedFinding}
            onSelect={setSelectedFinding}
          />
        </div>
      )}
      {view === 'comparison' && (
        <div data-testid="evaluation-view-panel-comparison">
          <h3>Candidate Comparison</h3>
          <ComparisonPanel
            loadedXml={xml}
            loadedLabel={label}
            compare={compare}
            onCompared={(result) => setComparison({
              labels: result.receipt.scores.map((score) => score.label),
              differenceCount: result.receipt.comparison?.differences.length ?? 0,
              differences: result.receipt.comparison?.differences ?? [],
            })}
          />
        </div>
      )}
      {view === 'coherence' && (
        <CoherencePanel receipt={loaded?.receipt as { coherence?: CoherenceView | null } | undefined} />
      )}
      {view === 'review' && (
        <div data-testid="evaluation-view-panel-review">
          <h3>BMEF Human Review</h3>
          <ReviewPanel
            label={label}
            receipt={loaded ? loaded.receipt as unknown as Record<string, unknown> : null}
            comparison={comparison}
            createReview={createReview}
            saveReview={saveReview}
            openReview={openReview}
          />
        </div>
      )}
    </section>
  );
}
