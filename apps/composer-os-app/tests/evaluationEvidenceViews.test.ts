/**
 * Harmonic and rhythm views show receipt numbers.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { apiEvaluateMusicalScore } from '@composer-os/app-api/evaluationApp';
import { observationText } from '../src/evaluation/evaluationEvidence';
import { EvaluationDashboardPage } from '../src/evaluation/EvaluationDashboardPage';

const xml = fs.readFileSync(
  path.resolve(__dirname, '../../../engines/composer-os-v2/tests/musical-evaluation/fixtures/c2-duo.musicxml'),
  'utf8',
);

function find(tree: ReturnType<typeof create>, testId: string) {
  return tree.root.findAll((node) => node.props?.['data-testid'] === testId)[0];
}

describe('evaluation evidence views', () => {
  it('shows technical, harmonic and rhythm rows that match the receipt', async () => {
    const receipt = apiEvaluateMusicalScore({
      label: 'c2-duo',
      xml,
      declared: { label: 'C pentatonic', family: 'pentatonic', pitchClasses: [0, 2, 4, 7, 9] },
    });
    expect(receipt.ok).toBe(true);
    if (!receipt.ok) return;
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(EvaluationDashboardPage, {
        transport: { evaluate: async (body) => apiEvaluateMusicalScore(body) as unknown as Record<string, unknown> },
      }));
    });
    await act(async () => {
      find(tree!, 'evaluation-xml').props.onChange({ target: { value: xml } });
      find(tree!, 'evaluation-field-label').props.onChange({ target: { value: 'C pentatonic' } });
      find(tree!, 'evaluation-field-pcs').props.onChange({ target: { value: '0,2,4,7,9' } });
    });
    await act(async () => {
      await find(tree!, 'evaluation-run').props.onClick();
    });
    expect(find(tree!, 'evaluation-summary-parse').props['data-status']).toBe(receipt.receipt.technical[0]!.summary.parse);

    await act(async () => {
      find(tree!, 'evaluation-view-harmonic').props.onClick();
    });
    const harmonicRows = tree!.root.findAll((node) => node.props?.['data-testid'] === 'evaluation-structural-finding');
    const outside = receipt.receipt.structural[0]!.findings.find((finding) => finding.metricId === 'field-membership' && finding.observations.pitchClass === 6);
    const outsideRow = harmonicRows.find((node) => node.props['data-observations'] === observationText(outside!.observations));
    expect(outsideRow).toBeTruthy();
    expect(outsideRow!.props['data-bars']).toBe('2');
    expect(String(outsideRow!.props['data-events']).length).toBeGreaterThan(0);
    await act(async () => {
      outsideRow!.props.onClick();
    });
    expect(find(tree!, 'evaluation-structural-selected').children.join('')).toMatch(/bar 2/);

    await act(async () => {
      find(tree!, 'evaluation-view-rhythm').props.onClick();
    });
    const rhythmRows = tree!.root.findAll((node) => node.props?.['data-testid'] === 'evaluation-structural-finding');
    const density = receipt.receipt.structural[0]!.findings.find((finding) => finding.metricId === 'note-density' && finding.instrument === 'Electric Guitar' && finding.bars[0] === 1);
    const densityRow = rhythmRows.find((node) => node.props['data-metric-id'] === 'note-density' && node.props['data-observations'] === observationText(density!.observations) && node.props['data-bars'] === '1');
    expect(densityRow).toBeTruthy();
    expect(String(densityRow!.props['data-observations'])).toContain('attacks=2');
    expect(find(tree!, 'evaluation-unsupported').children.join('')).toMatch(/syncopation-longuet-higgins-lee/);
    const role = rhythmRows.find((node) => node.props['data-metric-id'] === 'role-indicator');
    expect(role!.props['data-confidence']).toBe('limited');
    expect(JSON.stringify(tree!.toJSON())).not.toMatch(/musicalQualityScore/);
  });
});