import React, { useState } from 'react';
import {
  descriptiveMetricChanges,
  pairChanges,
  retainedSignatures,
  type ComparisonDifference,
  type DashboardFinding,
} from './evaluationEvidence';

interface Slot {
  label: string;
  xml: string;
  intention: string;
}

interface Identity {
  sha256: string;
  parseError: string | null;
  parts: Array<{ id: string; name: string; role: string }>;
  bars: number[];
  events: Array<{ id: string; bar: number; instrument: string; onset: string; signature: string; rest: boolean }>;
}

interface Compared {
  identities: Identity[];
  intentions: Array<{ label: string; note: string }>;
  receipt: {
    scores: Array<{ label: string; sha256: string }>;
    technical: Array<{ label: string; summary: Record<string, string> }>;
    structural: Array<{ label: string; findings: DashboardFinding[] }>;
    comparison: {
      notice: string;
      differences: ComparisonDifference[];
      rank: null;
      musicalQualityScore: null;
    } | null;
  };
}

const EMPTY: Slot[] = [
  { label: 'original', xml: '', intention: '' },
  { label: 'candidate-a', xml: '', intention: '' },
];

export function ComparisonPanel({
  loadedXml,
  loadedLabel,
  compare,
  onCompared,
}: {
  loadedXml: string;
  loadedLabel: string;
  compare: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onCompared?: (result: Compared) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Compared | null>(null);

  function patch(index: number, patchSlot: Partial<Slot>) {
    setSlots((current) => current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patchSlot } : slot)));
  }

  async function onCompare() {
    setBusy(true);
    setError('');
    try {
      const response = await compare({
        scores: slots.map((slot) => ({ label: slot.label, xml: slot.xml, intention: slot.intention })),
      });
      if (response.ok !== true) {
        setResult(null);
        setError(typeof response.error === 'string' ? response.error : 'Comparison failed.');
        return;
      }
      const compared = response as unknown as Compared;
      setResult(compared);
      onCompared?.(compared);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Comparison failed.');
    } finally {
      setBusy(false);
    }
  }

  const labels = result?.receipt.scores.map((score) => score.label) ?? [];
  const differences = result?.receipt.comparison?.differences ?? [];
  const pairs: Array<[string, string]> = [];
  for (let left = 0; left < labels.length; left += 1) {
    for (let right = left + 1; right < labels.length; right += 1) pairs.push([labels[left]!, labels[right]!]);
  }
  const changes = result
    ? descriptiveMetricChanges(result.receipt.structural.map((column) => ({ label: column.label, findings: column.findings })))
    : [];

  return (
    <div data-testid="evaluation-comparison">
      <p data-testid="evaluation-comparison-notice">
        Differences identify events. They do not rank the scores. No candidate is marked superior.
      </p>
      {slots.map((slot, index) => (
        <fieldset key={index} data-testid="evaluation-candidate-slot">
          <legend>Score {index + 1}</legend>
          <label>
            Label
            <input data-testid={`evaluation-candidate-label-${index}`} value={slot.label} onChange={(event) => patch(index, { label: event.target.value })} />
          </label>
          <label>
            Intention
            <input data-testid={`evaluation-candidate-intention-${index}`} value={slot.intention} onChange={(event) => patch(index, { intention: event.target.value })} />
          </label>
          <textarea data-testid={`evaluation-candidate-xml-${index}`} rows={4} value={slot.xml} onChange={(event) => patch(index, { xml: event.target.value })} />
        </fieldset>
      ))}
      <button type="button" data-testid="evaluation-use-loaded" onClick={() => patch(0, { xml: loadedXml, label: loadedLabel || 'original' })}>
        Use loaded score as score 1
      </button>
      {slots.length < 3 && (
        <button type="button" data-testid="evaluation-add-candidate" onClick={() => setSlots((current) => [...current, { label: 'candidate-b', xml: '', intention: '' }])}>
          Add third score
        </button>
      )}
      <button type="button" data-testid="evaluation-compare" disabled={busy} onClick={() => void onCompare()}>
        {busy ? 'Comparing…' : 'Compare scores'}
      </button>
      {error && <p data-testid="evaluation-comparison-error" role="alert">{error}</p>}
      {result && (
        <>
          <p data-testid="evaluation-rank">{result.receipt.comparison?.notice} Rank {String(result.receipt.comparison?.rank)}.</p>
          <div data-testid="evaluation-side-by-side" style={{ display: 'grid', gridTemplateColumns: `repeat(${result.identities.length}, minmax(12rem, 1fr))`, gap: '0.75rem' }}>
            {result.identities.map((identity, index) => (
              <article key={result.receipt.scores[index]?.label ?? index} data-testid="evaluation-compare-column">
                <h4>{result.receipt.scores[index]?.label}</h4>
                <p>SHA-256 {identity.sha256}</p>
                <p data-testid="evaluation-compare-intention">Intention: {result.intentions[index]?.note || 'none recorded'}</p>
                <p>Bars {identity.bars.join(', ') || 'none'}</p>
                <p>Parse {result.receipt.technical[index]?.summary.parse}</p>
                {identity.parseError && <p>{identity.parseError}</p>}
                <p>{identity.parts.map((part) => `${part.name} (${part.role})`).join(', ') || 'no parts'}</p>
              </article>
            ))}
          </div>
          {pairs.map(([left, right]) => {
            const rows = pairChanges(differences, left, right);
            const removed = rows.filter((row) => row.change === 'only-in-left');
            const added = rows.filter((row) => row.change === 'only-in-right');
            const leftIdentity = result.identities[labels.indexOf(left)];
            const retained = retainedSignatures(leftIdentity?.events ?? [], removed.map((row) => row.signature));
            return (
              <section key={`${left}:${right}`}>
                <h4>{left} beside {right}</h4>
                <p data-testid="evaluation-change-counts">Removed {removed.length}. Added {added.length}. Retained notes {retained.length}. Section-level analysis is not available, so these are bar-level events.</p>
                <table data-testid="evaluation-difference-table">
                  <thead>
                    <tr><th>Change</th><th>Bar</th><th>Onset</th><th>Instrument</th><th>Event</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${row.change}:${row.signature}`} data-testid="evaluation-difference" data-bar={row.bar} data-change={row.change} data-event={row.eventId}>
                        <td>{row.change === 'only-in-left' ? `only in ${left}` : `only in ${right}`}</td>
                        <td>{row.bar}</td>
                        <td>{row.onset}</td>
                        <td>{row.instrument ?? ''}</td>
                        <td>{row.eventId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
          <h4>Descriptive metric changes</h4>
          {changes.length === 0 && <p data-testid="evaluation-metric-changes-empty">No displayed density, contour, interval, or pitch-class row differs.</p>}
          {changes.length > 0 && (
            <table data-testid="evaluation-metric-changes">
              <thead>
                <tr><th>Metric</th><th>Bar</th><th>Instrument</th>{labels.map((label) => <th key={label}>{label}</th>)}</tr>
              </thead>
              <tbody>
                {changes.map((change) => (
                  <tr key={`${change.metricId}:${change.bar}:${change.instrument}`} data-testid="evaluation-metric-change">
                    <td>{change.metricId}</td>
                    <td>{change.bar}</td>
                    <td>{change.instrument}</td>
                    {change.values.map((value) => <td key={value.label}>{value.text}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
