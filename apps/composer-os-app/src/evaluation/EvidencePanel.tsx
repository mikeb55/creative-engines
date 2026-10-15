import React from 'react';
import {
  findingsFor,
  observationText,
  onsetText,
  type DashboardFinding,
  type EvidenceSection,
} from './evaluationEvidence';

export function EvidencePanel({
  testId,
  intro,
  sections,
  findings,
  unsupported,
  selectedId,
  onSelect,
}: {
  testId: string;
  intro: string;
  sections: readonly EvidenceSection[];
  findings: readonly DashboardFinding[];
  unsupported?: readonly string[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = findings.find((finding) => finding.id === selectedId) ?? null;
  return (
    <div data-testid={testId}>
      <p>{intro}</p>
      {unsupported && unsupported.length > 0 && (
        <p data-testid="evaluation-unsupported">
          Limited or experimental metrics, not computed: {unsupported.join(', ')}
        </p>
      )}
      {sections.map((section) => {
        const rows = findingsFor(findings, section.metricIds);
        return (
          <section key={section.title}>
            <h4>{section.title}</h4>
            {rows.length === 0 && <p>No findings for this metric on the loaded score.</p>}
            {rows.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Finding</th><th>Metric</th><th>Bar</th><th>Instrument</th><th>Onset</th><th>Events</th><th>Evidence</th><th>Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((finding) => (
                    <tr
                      key={finding.id}
                      data-testid="evaluation-structural-finding"
                      data-finding-id={finding.id}
                      data-metric-id={finding.metricId}
                      data-bars={finding.bars.join(',')}
                      data-events={finding.eventIds.join(' ')}
                      data-observations={observationText(finding.observations)}
                      data-confidence={finding.confidence}
                      onClick={() => onSelect(finding.id)}
                    >
                      <td>{finding.id}</td>
                      <td>{finding.metricId}</td>
                      <td>{finding.bars.join(', ')}</td>
                      <td>{finding.instrument ?? ''}</td>
                      <td>{onsetText(finding.onsetInBar)}</td>
                      <td>{finding.eventIds.join(', ')}</td>
                      <td>{observationText(finding.observations)}</td>
                      <td>{finding.limitation ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
      {selected && (
        <p data-testid="evaluation-structural-selected">
          {selected.id} metric {selected.metricId} bar {selected.bars.join(', ') || 'none'} instrument {selected.instrument ?? 'ensemble'} onset {onsetText(selected.onsetInBar) || 'none'} events {selected.eventIds.join(', ') || 'none'}
        </p>
      )}
      <p data-testid="evaluation-notation-limit">Notation highlighting is not available. The table locates the bar, instrument, onset, and event ids.</p>
    </div>
  );
}
