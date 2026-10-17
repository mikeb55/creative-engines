/**
 * Evaluation Orchestration tab shows Stage B evidence.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { apiEvaluateMusicalScore } from '@composer-os/app-api/evaluationApp';
import { EvaluationDashboardPage } from '../src/evaluation/EvaluationDashboardPage';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="Tpt"><part-name>Trumpet</part-name></score-part>
    <score-part id="Fl"><part-name>Flute</part-name></score-part>
  </part-list>
  <part id="Tpt"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <direction><direction-type><dynamics><f/></dynamics></direction-type></direction>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
  <part id="Fl"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`;

function find(tree: ReturnType<typeof create>, testId: string) {
  return tree.root.findAll((node) => node.props?.['data-testid'] === testId)[0];
}

describe('evaluation orchestration tab', () => {
  it('keeps the earlier views and shows orchestration evidence', async () => {
    const receipt = apiEvaluateMusicalScore({ label: 'stage-b', xml });
    expect(receipt.ok).toBe(true);
    if (!receipt.ok) return;
    expect(receipt.receipt.orchestration?.musicalQualityScore).toBeNull();
    expect(receipt.receipt.orchestration?.musicallyApproved).toBe(false);
    expect(receipt.receipt.technical[0]?.summary.parse).toBe('pass');
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(EvaluationDashboardPage, {
        transport: { evaluate: async (body) => apiEvaluateMusicalScore(body) as unknown as Record<string, unknown> },
      }));
    });
    expect(find(tree!, 'evaluation-view-technical')).toBeTruthy();
    expect(find(tree!, 'evaluation-view-harmonic')).toBeTruthy();
    expect(find(tree!, 'evaluation-view-rhythm')).toBeTruthy();
    expect(find(tree!, 'evaluation-view-comparison')).toBeTruthy();
    expect(find(tree!, 'evaluation-view-review')).toBeTruthy();
    expect(find(tree!, 'evaluation-view-coherence')).toBeTruthy();
    expect(find(tree!, 'evaluation-view-orchestration')).toBeTruthy();
    await act(async () => {
      find(tree!, 'evaluation-xml').props.onChange({ target: { value: xml } });
    });
    await act(async () => {
      await find(tree!, 'evaluation-run').props.onClick();
    });
    expect(find(tree!, 'evaluation-summary-parse').props['data-status']).toBe('pass');
    await act(async () => {
      find(tree!, 'evaluation-view-orchestration').props.onClick();
    });
    expect(find(tree!, 'evaluation-orchestration-not-approved').children.join('')).toMatch(/Not musically approved/);
    expect(find(tree!, 'evaluation-orchestration-score').children.join('')).toMatch(/null/);
    const balance = tree!.root.findAll((node) => node.props?.['data-testid'] === 'evaluation-orchestration-balance-row');
    expect(balance.length).toBe(1);
    expect(balance[0]!.props['data-bar']).toBe(1);
    const rendered = JSON.stringify(tree!.toJSON());
    expect(rendered).toMatch(/loud/);
    expect(rendered).toMatch(/Rimsky-Korsakov/);
    expect(rendered).toMatch(/They do not rewrite the score/);
  });
});
