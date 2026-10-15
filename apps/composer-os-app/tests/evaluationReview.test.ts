/**
 * Human BMEF review entry, save, and reopen.
 */
import React from 'react';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { apiCreateHumanReview, apiEvaluateMusicalScore, apiOpenHumanReview, apiSaveHumanReview } from '@composer-os/app-api/evaluationApp';
import { EvaluationDashboardPage } from '../src/evaluation/EvaluationDashboardPage';

const xml = fs.readFileSync(
  path.resolve(__dirname, '../../../engines/composer-os-v2/tests/musical-evaluation/fixtures/c2-duo.musicxml'),
  'utf8',
);
const libraryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-review-ui-'));

function find(tree: ReturnType<typeof create>, testId: string) {
  return tree.root.findAll((node) => node.props?.['data-testid'] === testId)[0];
}

describe('BMEF human review', () => {
  it('starts blank, stores a human rating, and does not approve the music', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(EvaluationDashboardPage, {
        transport: {
          evaluate: async (body) => apiEvaluateMusicalScore(body) as unknown as Record<string, unknown>,
          createReview: async (body) => apiCreateHumanReview(body) as unknown as Record<string, unknown>,
          saveReview: async (body) => apiSaveHumanReview({ ...body, libraryRoot, overwrite: true }) as unknown as Record<string, unknown>,
          openReview: async (body) => apiOpenHumanReview({ ...body, libraryRoot }) as unknown as Record<string, unknown>,
        },
      }));
    });
    await act(async () => {
      find(tree!, 'evaluation-xml').props.onChange({ target: { value: xml } });
    });
    await act(async () => {
      await find(tree!, 'evaluation-run').props.onClick();
    });
    await act(async () => {
      find(tree!, 'evaluation-view-review').props.onClick();
    });
    await act(async () => {
      await find(tree!, 'evaluation-review-start').props.onClick();
    });
    expect(find(tree!, 'evaluation-rating-U2').props.value).toBe('');
    expect(find(tree!, 'evaluation-gate-G3').props.value).toBe('');
    expect(find(tree!, 'evaluation-decision').children.join('')).toMatch(/none/);
    expect(find(tree!, 'evaluation-e2').children.join('')).toMatch(/E2 is missing/);
    expect(find(tree!, 'evaluation-e3').children.join('')).toMatch(/E3 is missing/);
    expect(find(tree!, 'evaluation-weight-U1').children.join('')).toMatch(/15 proposed/);
    expect(find(tree!, 'evaluation-machine-score').children.join('')).toMatch(/Artistic score null/);
    const receiptText = find(tree!, 'evaluation-review-receipt').children.join('');
    await act(async () => {
      find(tree!, 'evaluation-rating-U2').props.onChange({ target: { value: '8' } });
      find(tree!, 'evaluation-notes-U2').props.onChange({ target: { value: 'human note' } });
      find(tree!, 'evaluation-refs-U2').props.onChange({ target: { value: 'H1' } });
    });
    await act(async () => {
      await find(tree!, 'evaluation-review-save').props.onClick();
    });
    const saved = find(tree!, 'evaluation-saved-path').children.join('');
    expect(saved).toMatch(/\.evaluation\.json$/);
    await act(async () => {
      find(tree!, 'evaluation-rating-U2').props.onChange({ target: { value: '' } });
    });
    await act(async () => {
      await find(tree!, 'evaluation-review-open').props.onClick();
    });
    expect(find(tree!, 'evaluation-rating-U2').props.value).toBe(8);
    expect(find(tree!, 'evaluation-notes-U2').props.value).toBe('human note');
    expect(find(tree!, 'evaluation-decision').children.join('')).toMatch(/none/);
    expect(find(tree!, 'evaluation-review-receipt').children.join('')).toBe(receiptText);
    expect(JSON.stringify(tree!.toJSON())).not.toMatch(/musicalQualityScore/);
  });
});