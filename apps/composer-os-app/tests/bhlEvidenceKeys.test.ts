/**
 * Repeated playability questions need distinct React identities.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { BhlEvidencePanel, composerQuestions, type BhlEvidenceView } from '../src/bhl/BhlEvidencePanel';

const PLAYABILITY = 'Playability at tempo is a composer question. This reader does not decide it.';

function evidence(questions: string[]): BhlEvidenceView {
  return {
    awaitingComposerVerification: true,
    musicalQualityScore: null,
    events: [],
    motions: [],
    entries: [],
    crossings: [],
    silences: [],
    questions,
    barMetres: [],
  };
}

describe('BHL evidence question identity', () => {
  it('gives each repeated playability question its own key and mark', async () => {
    const original = evidence([PLAYABILITY, PLAYABILITY]);
    const candidate = evidence([PLAYABILITY]);
    expect(composerQuestions(original, candidate, true).map((row) => row.id)).toEqual(['original:0', 'original:1', 'candidate:0']);
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map((item) => String(item)).join(' '));
    });
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        React.createElement(BhlEvidencePanel, {
          original,
          candidate,
          intentions: [],
          limitations: [],
          comparison: null,
          provisional: true,
        }),
      );
    });
    const selects = tree.root.findAll((node) => node.props?.['data-testid'] === 'bhl-composer-question');
    expect(selects.map((node) => node.props['data-question-id'])).toEqual(['original:0', 'original:1', 'candidate:0']);
    expect(new Set(selects.map((node) => node.props['data-question-id'])).size).toBe(3);
    await act(async () => {
      selects[0]?.props.onChange({ target: { value: 'Accept' } });
    });
    const after = tree.root.findAll((node) => node.props?.['data-testid'] === 'bhl-composer-question');
    expect(after[0]?.props.value).toBe('Accept');
    expect(after[1]?.props.value).toBe('');
    expect(after[2]?.props.value).toBe('');
    expect(errors.join('\n')).not.toMatch(/same key/);
    spy.mockRestore();
  });
});
