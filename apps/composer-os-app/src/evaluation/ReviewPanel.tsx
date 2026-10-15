import React, { useState } from 'react';

interface Rating {
  criterion: string;
  name: string;
  weight: number;
  weightStatus: string;
  layer: string;
  rating: number | null;
  evidence: string | null;
  confidence: string | null;
  bars: string;
  notes: string;
  evidenceRefs: string[];
}

interface ReviewRecord {
  weightNotice: string;
  source: { label: string; sha256: string };
  receiptSha256: string;
  metricVersions: string[];
  gates: Record<'G1' | 'G2' | 'G3' | 'G4', 'pass' | 'fail' | null>;
  ratings: Rating[];
  decision: string | null;
  notes: string;
  outstandingChecks: string[];
  e2Available: false;
  e3Available: false;
  e2Notice: string;
  e3Notice: string;
  machineArtisticScore: null;
  machineDecision: null;
  coreTotal: null;
  moduleTotal: null;
  combinedTotal: null;
  comparison: { labels: string[]; differenceCount: number; rank: null } | null;
}

const GATES = ['G1', 'G2', 'G3', 'G4'] as const;
const DECISIONS = ['ACCEPT', 'REFINE', 'REJECT', 'FORK'] as const;

export function ReviewPanel({
  label,
  receipt,
  comparison,
  createReview,
  saveReview,
  openReview,
}: {
  label: string;
  receipt: Record<string, unknown> | null;
  comparison: { labels: string[]; differenceCount: number; differences: unknown[] } | null;
  createReview: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  saveReview: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  openReview: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
}) {
  const [record, setRecord] = useState<ReviewRecord | null>(null);
  const [fileName, setFileName] = useState('review');
  const [openPath, setOpenPath] = useState('');
  const [savedPath, setSavedPath] = useState('');
  const [error, setError] = useState('');

  async function start() {
    if (!receipt) {
      setError('Load a score before a human review.');
      return;
    }
    setError('');
    const result = await createReview({ label, receipt, comparison });
    if (result.ok !== true) {
      setError(typeof result.error === 'string' ? result.error : 'Human review could not be started.');
      return;
    }
    setRecord(result.record as ReviewRecord);
  }

  function patchRating(criterion: string, patch: Partial<Rating>) {
    setRecord((current) => current && ({
      ...current,
      ratings: current.ratings.map((rating) => (rating.criterion === criterion ? { ...rating, ...patch } : rating)),
      machineArtisticScore: null,
      machineDecision: null,
      coreTotal: null,
      moduleTotal: null,
      combinedTotal: null,
    }));
  }

  async function save() {
    if (!record) return;
    setError('');
    const result = await saveReview({ record, fileName, overwrite: true });
    if (result.ok !== true) {
      setError(typeof result.error === 'string' ? result.error : 'The review could not be saved.');
      return;
    }
    setSavedPath(String(result.path ?? ''));
    setOpenPath(String(result.path ?? ''));
    if (result.record) setRecord(result.record as ReviewRecord);
  }

  async function reopen() {
    setError('');
    const result = await openReview({ path: openPath });
    if (result.ok !== true) {
      setError(typeof result.error === 'string' ? result.error : 'The review could not be opened.');
      return;
    }
    setRecord(result.record as ReviewRecord);
  }

  return (
    <div data-testid="evaluation-review">
      <p data-testid="evaluation-review-notice">Only a person can enter an artistic rating or an approval decision. Weights and thresholds are proposed. No automatic artistic score is produced.</p>
      <button type="button" data-testid="evaluation-review-start" onClick={() => void start()}>Start human review</button>
      {error && <p data-testid="evaluation-review-error" role="alert">{error}</p>}
      {record && (
        <>
          <p data-testid="evaluation-review-source">Source {record.source.label} {record.source.sha256}</p>
          <p data-testid="evaluation-review-receipt">Receipt {record.receiptSha256}</p>
          <p data-testid="evaluation-review-metrics">{record.metricVersions.join(' ')}</p>
          <p data-testid="evaluation-weight-notice">{record.weightNotice}</p>
          <p data-testid="evaluation-e2">{record.e2Notice}</p>
          <p data-testid="evaluation-e3">{record.e3Notice}</p>
          <p data-testid="evaluation-machine-score">Artistic score {String(record.machineArtisticScore)}. Decision from the machine {String(record.machineDecision)}. Core total {String(record.coreTotal)}.</p>
          {record.comparison && (
            <p data-testid="evaluation-review-comparison">Comparison {record.comparison.labels.join(', ')} differences {record.comparison.differenceCount} rank {String(record.comparison.rank)}</p>
          )}
          <table data-testid="evaluation-gates">
            <tbody>
              {GATES.map((gate) => (
                <tr key={gate}>
                  <th>{gate}</th>
                  <td>
                    <select
                      data-testid={`evaluation-gate-${gate}`}
                      value={record.gates[gate] ?? ''}
                      onChange={(event) => setRecord({ ...record, gates: { ...record.gates, [gate]: event.target.value || null } })}
                    >
                      <option value="">unset</option>
                      <option value="pass">pass</option>
                      <option value="fail">fail</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <table data-testid="evaluation-ratings">
            <thead>
              <tr><th>Criterion</th><th>Weight</th><th>Rating</th><th>Evidence</th><th>Bars</th><th>Notes</th><th>Finding ids</th></tr>
            </thead>
            <tbody>
              {record.ratings.map((rating) => (
                <tr key={rating.criterion} data-testid="evaluation-rating" data-criterion={rating.criterion}>
                  <td>{rating.criterion} {rating.name}</td>
                  <td data-testid={`evaluation-weight-${rating.criterion}`}>{rating.weight} {rating.weightStatus}</td>
                  <td>
                    <input
                      data-testid={`evaluation-rating-${rating.criterion}`}
                      value={rating.rating ?? ''}
                      onChange={(event) => patchRating(rating.criterion, { rating: event.target.value === '' ? null : Number(event.target.value) })}
                    />
                  </td>
                  <td>
                    <select data-testid={`evaluation-evidence-${rating.criterion}`} value={rating.evidence ?? ''} onChange={(event) => patchRating(rating.criterion, { evidence: event.target.value || null })}>
                      <option value="">unset</option>
                      <option value="E1">E1</option>
                      <option value="E2">E2</option>
                      <option value="E3">E3</option>
                      <option value="A">A</option>
                    </select>
                  </td>
                  <td><input data-testid={`evaluation-bars-${rating.criterion}`} value={rating.bars} onChange={(event) => patchRating(rating.criterion, { bars: event.target.value })} /></td>
                  <td><input data-testid={`evaluation-notes-${rating.criterion}`} value={rating.notes} onChange={(event) => patchRating(rating.criterion, { notes: event.target.value })} /></td>
                  <td><input data-testid={`evaluation-refs-${rating.criterion}`} value={rating.evidenceRefs.join(', ')} onChange={(event) => patchRating(rating.criterion, { evidenceRefs: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p data-testid="evaluation-decision">Human decision {record.decision ?? 'none'}.</p>
          <div>
            {DECISIONS.map((decision) => (
              <button key={decision} type="button" data-testid={`evaluation-decision-${decision}`} aria-pressed={record.decision === decision} onClick={() => setRecord({ ...record, decision })}>
                {decision}
              </button>
            ))}
          </div>
          <label>
            Outstanding checks
            <textarea data-testid="evaluation-outstanding" value={record.outstandingChecks.join('\n')} onChange={(event) => setRecord({ ...record, outstandingChecks: event.target.value.split('\n').filter(Boolean) })} />
          </label>
          <label>
            Record name
            <input data-testid="evaluation-record-name" value={fileName} onChange={(event) => setFileName(event.target.value)} />
          </label>
          <button type="button" data-testid="evaluation-review-save" onClick={() => void save()}>Save review</button>
          {savedPath && <p data-testid="evaluation-saved-path">{savedPath}</p>}
          <label>
            Open record
            <input data-testid="evaluation-open-path" value={openPath} onChange={(event) => setOpenPath(event.target.value)} />
          </label>
          <button type="button" data-testid="evaluation-review-open" onClick={() => void reopen()}>Open review</button>
        </>
      )}
    </div>
  );
}
