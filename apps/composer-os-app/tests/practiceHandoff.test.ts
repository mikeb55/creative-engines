import React from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADVANCED_STATUS, CORE_CANDIDATES, CORE_LABORATORY_STATUS, listAdvancedColours } from '@composer-os/core/hexatonic';
import { PracticeStudioPage } from '../src/practice/PracticeStudioPage';
import { storeHexatonicHandoff, takeHexatonicHandoff } from '../src/bhl/bhlHexatonicHandoff';
import {
  findPracticeRegistration,
  practiceBhlHandoff,
  storePracticeHandoff,
  takePracticeHandoff,
  type PracticeHandoff,
} from '../src/practice/practiceHandoff';
import { getScaleExplorerEntry, listScaleExplorerEntries } from '../src/practice/scaleExplorer';
import { pitchClassesOfMask, transposeMask } from '../src/practice/scaleGlossary';

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    },
  });
});

function base(overrides: Partial<PracticeHandoff> = {}): PracticeHandoff {
  return {
    source: 'generate',
    label: 'Generate',
    musicXml: '<score-partwise></score-partwise>',
    collectionId: null,
    registry: null,
    referencePc: null,
    status: null,
    seed: 7,
    mask: null,
    tuningId: 'standard',
    ...overrides,
  };
}

describe('practice handoff', () => {
  beforeEach(() => {
    globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
  });

  it('keeps the generate score text and does not keep a second copy in the caller', async () => {
    const payload = base();
    const sent = storePracticeHandoff(payload);
    expect(sent.ok).toBe(true);
    payload.musicXml = '<score-partwise>changed</score-partwise>';
    const taken = takePracticeHandoff();
    expect(taken?.ok).toBe(true);
    if (!taken?.ok) return;
    expect(taken.handoff.musicXml).toBe('<score-partwise></score-partwise>');
    await Promise.resolve();
    expect(takePracticeHandoff()).toBeNull();
  });

  it('rejects a composition path and an unknown source', () => {
    const file = storePracticeHandoff(base({ musicXml: '/tmp/piece.wwh' }));
    expect(file.ok).toBe(false);
    const source = storePracticeHandoff(base({ source: 'wwh' as PracticeHandoff['source'] }));
    expect(source.ok).toBe(false);
    if (!source.ok) expect(source.error).toContain('Unsupported practice source');
    expect(memory.size).toBe(0);
  });

  it('transfers a pentatonic colour at the selected root', () => {
    const found = findPracticeRegistration('pentatonic-colour', 'major_pentatonic');
    expect(found).not.toBeNull();
    if (!found) return;
    const sent = storePracticeHandoff(
      base({
        source: 'pentatonic',
        label: 'Major pentatonic',
        musicXml: null,
        collectionId: 'major_pentatonic',
        registry: 'pentatonic-colour',
        referencePc: 2,
        status: null,
        mask: null,
      }),
    );
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.handoff.mask).toBe(transposeMask(found.mask, 2));
    expect(pitchClassesOfMask(sent.handoff.mask ?? 0)).toEqual(
      pitchClassesOfMask(transposeMask(found.mask, 2)),
    );
    expect(sent.handoff.status).toBe(found.registration.status);
  });

  it('keeps the named scale and applies the inbound root', () => {
    const sent = storePracticeHandoff(
      base({
        source: 'pentatonic',
        label: 'Major pentatonic',
        musicXml: null,
        collectionId: 'major_pentatonic',
        registry: 'pentatonic-colour',
        referencePc: 2,
        status: null,
        mask: null,
      }),
    );
    expect(sent.ok).toBe(true);
    globalThis.cancelAnimationFrame = () => {};
    let renderer: ReturnType<typeof create> | null = null;
    act(() => {
      renderer = create(React.createElement(PracticeStudioPage));
    });
    const text = JSON.stringify(renderer?.toJSON());
    expect(text).toContain('Major Pentatonic');
    expect(text).toContain('2,4,6,9,11');
    expect(text).not.toContain('D D ');
  });

  it('keeps provisional and advanced statuses', () => {
    const provisional = CORE_CANDIDATES[0];
    expect(provisional).toBeTruthy();
    const promoted = storePracticeHandoff(
      base({
        source: 'hexatonic',
        label: provisional.label,
        musicXml: null,
        collectionId: provisional.id,
        registry: 'hexatonic-provisional',
        referencePc: 0,
        status: 'approved',
        mask: null,
      }),
    );
    expect(promoted.ok).toBe(false);
    const kept = storePracticeHandoff(
      base({
        source: 'hexatonic',
        label: provisional.label,
        musicXml: null,
        collectionId: provisional.id,
        registry: 'hexatonic-provisional',
        referencePc: 0,
        status: CORE_LABORATORY_STATUS,
        mask: null,
      }),
    );
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect(kept.handoff.status).toBe(CORE_LABORATORY_STATUS);

    const advanced = listAdvancedColours()[0];
    expect(advanced).toBeTruthy();
    const advancedSent = storePracticeHandoff(
      base({
        source: 'hexatonic',
        label: advanced.label,
        musicXml: null,
        collectionId: advanced.id,
        registry: 'hexatonic-advanced',
        referencePc: 5,
        status: ADVANCED_STATUS,
        mask: null,
      }),
    );
    expect(advancedSent.ok).toBe(true);
    if (!advancedSent.ok) return;
    expect(advancedSent.handoff.status).toBe(ADVANCED_STATUS);
    const found = findPracticeRegistration('hexatonic-advanced', advanced.id);
    expect(advancedSent.handoff.mask).toBe(transposeMask(found?.mask ?? -1, 5));
  });

  it('restores the handoff on the practice page', () => {
    const sent = storePracticeHandoff(base({ label: 'Restored score', seed: 11 }));
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    let renderer: ReturnType<typeof create> | null = null;
    act(() => {
      renderer = create(React.createElement(PracticeStudioPage));
    });
    const text = JSON.stringify(renderer?.toJSON());
    expect(text).toContain('practice-handoff');
    expect(text).toContain('Restored score');
    expect(text).toContain('tuning standard');
    expect(text).toContain('source file unchanged');
  });

  it('offers BHL only when the composer resolves the same sounding set', () => {
    expect(practiceBhlHandoff(getScaleExplorerEntry(1709), 9)).toBeNull();
    const match = listScaleExplorerEntries().find((entry) => practiceBhlHandoff(entry, 0));
    expect(match).toBeTruthy();
    const payload = practiceBhlHandoff(match!, 0);
    expect(payload?.referencePc).toBe(0);
    storeHexatonicHandoff(payload!);
    expect(takeHexatonicHandoff()).toEqual(payload);
    const tree = create(React.createElement(PracticeStudioPage));
    expect(JSON.stringify(tree.toJSON())).not.toContain('develop-in-bhl');
  });
});
