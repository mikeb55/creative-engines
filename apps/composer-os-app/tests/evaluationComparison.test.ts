/**
 * Candidate comparison view.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { apiCompareMusicalScores } from '@composer-os/app-api/evaluationApp';
import { EvaluationDashboardPage } from '../src/evaluation/EvaluationDashboardPage';

const original = fs.readFileSync(
  path.resolve(__dirname, '../../../engines/composer-os-v2/tests/musical-evaluation/fixtures/c2-duo.musicxml'),
  'utf8',
);
const revised = original.replace('<step>F</step><alter>1</alter>', '<step>G</step>');
const third = original.replace('<step>D</step>', '<step>E</step>');

function find(tree: ReturnType<typeof create>, testId: string) {
  return tree.root.findAll((node) => node.props?.['data-testid'] === testId)[0];
}

describe('candidate comparison', () => {
  it('shows bar-level differences for three scores and does not rank them', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(EvaluationDashboardPage, {
        transport: {
          evaluate: async () => ({ ok: false, error: 'not used' }),
          compare: async (body) => apiCompareMusicalScores(body) as unknown as Record<string, unknown>,
        },
      }));
    });
    await act(async () => {
      find(tree!, 'evaluation-view-comparison').props.onClick();
    });
    expect(find(tree!, 'evaluation-comparison-notice').children.join('')).toMatch(/do not rank/);
    await act(async () => {
      find(tree!, 'evaluation-add-candidate').props.onClick();
    });
    await act(async () => {
      find(tree!, 'evaluation-candidate-xml-0').props.onChange({ target: { value: original } });
      find(tree!, 'evaluation-candidate-intention-0').props.onChange({ target: { value: 'sparse duo' } });
      find(tree!, 'evaluation-candidate-xml-1').props.onChange({ target: { value: revised } });
      find(tree!, 'evaluation-candidate-xml-2').props.onChange({ target: { value: third } });
    });
    await act(async () => {
      await find(tree!, 'evaluation-compare').props.onClick();
    });
    const rows = tree!.root.findAll((node) => node.props?.['data-testid'] === 'evaluation-difference');
    expect(rows.some((node) => node.props['data-bar'] === 2)).toBe(true);
    expect(find(tree!, 'evaluation-rank').children.join('')).toMatch(/Rank null/);
    const text = JSON.stringify(tree!.toJSON());
    expect(text).not.toMatch(/Best candidate|musicalQualityScore|quality order/);
    expect(text).toMatch(/sparse duo/);
    expect(text).toMatch(/Section-level analysis is not available/);
    const direct = apiCompareMusicalScores({
      scores: [
        { label: 'original', xml: original },
        { label: 'candidate-a', xml: revised },
        { label: 'candidate-b', xml: third },
      ],
    });
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    const removed = direct.receipt.comparison?.differences.find((row) => row.left === 'original' && row.right === 'candidate-a' && row.change === 'only-in-left');
    expect(rows.some((node) => node.props['data-event'] === removed?.eventId)).toBe(true);
  });
});