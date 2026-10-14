/**
 * Save → reload → reopen restores the harmonic world.
 * The world control stays mounted when the lock is cleared by a browser reload.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const catalog = {
  ok: true,
  catalog: {
    profiles: [],
    pentatonic: [],
    colours: [{ id: 'suspended_pentatonic', name: 'Suspended Pentatonic', intervals: [0, 2, 5, 7, 10] }],
    relationships: [{ id: 'home', label: 'HOME', offset: 0 }],
    referenceNotes: ['C', 'D'],
    notWired: [],
  },
};

const inspect = {
  ok: true as const,
  sourcePath: '/tmp/wrong-turning.musicxml',
  sourceSha256: 'abc',
  guitarPartId: 'P1',
  bassPartId: 'P2',
  guitarName: 'Electric Guitar',
  bassName: 'Upright Bass',
  barCount: 40,
  span: { from: 33, to: 40 },
  metres: [],
  tempo: { beatUnit: 'quarter', perMinute: '120', statedAtBar: 1 },
  rehearsal: [],
  bassEventCount: 4,
  protectedGuitarBars: [],
  plan: { seed: 3340, span: { from: 33, to: 40 }, motif: { pitchClasses: [9, 10, 7] }, regions: [] },
  fieldChoices: {},
  evidence: {
    awaitingComposerVerification: true as const,
    musicalQualityScore: null,
    events: [],
    motions: [],
    entries: [],
    crossings: [],
    silences: [],
    questions: [],
    barMetres: [],
  },
};

let saved: Record<string, unknown> | null = null;

vi.mock('../src/services/api', () => ({
  isDesktopIpc: () => false,
  api: {
    bhlCatalog: vi.fn(async () => catalog),
    bhlDefaults: vi.fn(async () => ({
      ok: true,
      sourcePath: '/tmp/wrong-turning.musicxml',
      exportDir: '/tmp',
      span: { from: 33, to: 40 },
    })),
    bhlInspect: vi.fn(async () => inspect),
    bhlCandidates: vi.fn(async () => ({
      ok: true,
      candidates: [{ id: 'cand-1', label: 'A', xml: '<score-partwise/>' }],
    })),
    bhlSaveProject: vi.fn(async (body: { project: Record<string, unknown> }) => {
      saved = body.project;
      return { ok: true, path: '/tmp/bhl-batch-e-gui-9101.bhl.json' };
    }),
    bhlOpenProject: vi.fn(async () => ({ ok: true, project: saved })),
  },
}));

function byId(tree: ReturnType<typeof create>, testId: string) {
  return tree.root.findAll((node) => node.props?.['data-testid'] === testId)[0];
}

async function flush(tree: ReturnType<typeof create>) {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  void tree;
}

describe('BHL save reload reopen', () => {
  beforeEach(() => {
    saved = null;
  });

  it('keeps the harmonic world control after reload and restores the saved world on reopen', async () => {
    const { BhlComposerPage } = await import('../src/bhl/BhlComposerPage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(BhlComposerPage));
    });
    await flush(tree);
    const world = byId(tree, 'bhl-world');
    expect(world).toBeTruthy();
    await act(async () => {
      world.props.onChange({ target: { value: 'E' } });
    });
    await act(async () => {
      byId(tree, 'bhl-import-lock').props.onClick();
    });
    await flush(tree);
    await act(async () => {
      byId(tree, 'bhl-candidates-generate').props.onClick();
    });
    await flush(tree);
    await act(async () => {
      byId(tree, 'bhl-save-project').props.onClick();
    });
    await flush(tree);
    expect(saved?.world).toBe('E');
    const projectPath = '/tmp/bhl-batch-e-gui-9101.bhl.json';

    tree.unmount();
    await act(async () => {
      tree = create(React.createElement(BhlComposerPage));
    });
    await flush(tree);
    expect(byId(tree, 'bhl-world')).toBeTruthy();
    expect(byId(tree, 'bhl-world').props.value).toBe('A');

    await act(async () => {
      byId(tree, 'bhl-project-path').props.onChange({ target: { value: projectPath } });
    });
    await act(async () => {
      byId(tree, 'bhl-open-project').props.onClick();
    });
    await flush(tree);
    expect(byId(tree, 'bhl-world').props.value).toBe('E');
    expect(String(byId(tree, 'bhl-status').props.children)).toMatch(/Harmonic world E restored/);
  });
});
