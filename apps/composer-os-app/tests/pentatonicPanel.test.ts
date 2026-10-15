/**
 * Pentatonic Engine GUI — form mapping, reachability, and real-engine parity.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { listPentatonicColourResources, lyricalAnswerExampleRegion, recommendPentatonicsFromRegion } from '@composer-os/core/pentatonic';
import { colourPitchClasses, colourSpelling } from '../src/pentatonic/PentatonicColourRegistry';
import { hashForRoute, routeFromLocation, routeNavLabel } from '../src/router/appRouter';
import {
  cleanPentatonicForm,
  emptyPentatonicForm,
  examplePentatonicForm,
  resolvePentatonicRegion,
  type PentatonicInheritedContext,
} from '../src/pentatonic/resolvePentatonicForm';
import type { PentatonicEngineResult } from '@composer-os/core/pentatonic';

function findButton(tree: ReturnType<typeof create>, testId: string) {
  return tree.root.findAll((node) => node.props?.['data-testid'] === testId)[0];
}

function textOf(tree: ReturnType<typeof create>): string {
  return JSON.stringify(tree.toJSON());
}

describe('pentatonic route', () => {
  it('is reachable from the hash router', () => {
    expect(routeFromLocation({ hash: '#/pentatonic', pathname: '/index.html' })).toBe('pentatonic');
    expect(hashForRoute('pentatonic')).toBe('#/pentatonic');
    expect(routeNavLabel('pentatonic')).toBe('Pentatonic');
  });
});

describe('pentatonic form mapping', () => {
  it('uses inherited context unless a local override is set', () => {
    const inherited: PentatonicInheritedContext = {
      tonalCentreRoot: 'Eb',
      tonalCentreMode: 'major',
      harmonyBars: ['Ebmaj7'],
      melodyNotes: ['Eb', 'G', 'Bb'],
    };
    const frozen = JSON.stringify(inherited);
    const form = emptyPentatonicForm(inherited);
    const used = resolvePentatonicRegion(form, inherited);
    expect(used.tonalCentre).toEqual({ root: 'Eb', mode: 'major' });
    expect(used.harmonyBars).toEqual(['Ebmaj7']);
    expect(used.melodyNotes).toEqual(['Eb', 'G', 'Bb']);
    const local = resolvePentatonicRegion(
      { ...form, useInheritedTonalCentre: false, tonalCentreRoot: 'A', tonalCentreMode: 'minor', harmonyText: 'Am7' },
      inherited
    );
    expect(local.tonalCentre.root).toBe('A');
    expect(local.harmonyBars).toEqual(['Am7']);
    expect(JSON.stringify(inherited)).toBe(frozen);
  });

  it('maps the example form onto the headless example region', () => {
    const region = resolvePentatonicRegion(examplePentatonicForm(), null);
    const example = lyricalAnswerExampleRegion();
    expect(region.tonalCentre).toEqual(example.tonalCentre);
    expect(region.home).toEqual(example.home);
    expect(region.harmonyBars).toEqual(example.harmonyBars);
    expect(region.melodyNotes).toEqual(example.melodyNotes);
    expect(region.bassNotes).toEqual(example.bassNotes);
    expect(region.purpose).toBe(example.purpose);
  });
});

describe('PentatonicEnginePage', () => {
  it('recommends with the real engine and matches a headless call', async () => {
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage));
    });
    await act(async () => {
      findButton(tree, 'pentatonic-example').props.onClick();
    });
    await act(async () => {
      findButton(tree, 'pentatonic-recommend').props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    const rendered = textOf(tree);
    expect(rendered).toContain('RECOMMEND');
    expect(rendered).toContain('A Minor Pentatonic');
    const cards = tree.root.findAll((node) => node.props?.['data-testid'] === 'pentatonic-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(3);
    const headless = recommendPentatonicsFromRegion(resolvePentatonicRegion(examplePentatonicForm(), null));
    expect(headless.disposition).toBe('RECOMMEND');
    expect(rendered).toContain(headless.recommendations[0]?.transposedName);
    expect(rendered).toContain(headless.explanation.slice(0, 40));
  });

  it('renders every disposition without extra cards', async () => {
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    const dispositions: PentatonicEngineResult['disposition'][] = [
      'RECOMMEND',
      'RETAIN_CURRENT',
      'NO_PENTATONIC_INTERVENTION',
      'INSUFFICIENT_CONTEXT',
      'NO_FEASIBLE_CANDIDATE',
    ];
    for (const disposition of dispositions) {
      const payload: PentatonicEngineResult = {
        kind: 'analysis',
        validationErrors: [],
        disposition,
        explanation: `Explanation for ${disposition}`,
        recommendations:
          disposition === 'RECOMMEND'
            ? [
                {
                  canonicalPitchSet: [0, 2, 4, 7, 9],
                  canonicalId: '0,2,4,7,9',
                  transposedName: 'C Major Pentatonic',
                  displaySpelling: ['C', 'D', 'E', 'G', 'A'],
                  archetypeId: 'major_pentatonic',
                  archetypeDisplayName: 'Major Pentatonic',
                  musicalFunction: 'Tonal-centre major pentatonic',
                  homeRelationshipId: null,
                  homeRelationshipLabel: null,
                  alternativeInterpretations: [],
                  totalScore: 0.8,
                  componentScores: [],
                  commonTones: ['C'],
                  cautions: [],
                  constraintStatus: { protectedNotes: 'not_applicable', strictMelody: 'not_applicable' },
                  explanation: 'Melody shares C.',
                  isCurrent: false,
                  isPinned: false,
                },
              ]
            : [],
        alternatives: [],
        retained:
          disposition === 'RETAIN_CURRENT'
            ? {
                canonicalPitchSet: [9, 0, 2, 4, 7],
                canonicalId: '0,2,4,7,9',
                transposedName: 'A Minor Pentatonic',
                displaySpelling: ['A', 'C', 'D', 'E', 'G'],
                archetypeId: 'minor_pentatonic',
                archetypeDisplayName: 'Minor Pentatonic',
                musicalFunction: 'Home continuity',
                homeRelationshipId: 'home',
                homeRelationshipLabel: 'HOME',
                alternativeInterpretations: [],
                totalScore: 0.9,
                componentScores: [],
                commonTones: ['A'],
                cautions: [],
                constraintStatus: { protectedNotes: 'not_applicable', strictMelody: 'not_applicable' },
                explanation: 'Current collection holds.',
                isCurrent: true,
                isPinned: false,
              }
            : null,
        retention: null,
        limitations: [],
        constraintFailures: [],
        diagnostics: null,
        registryVersion: 'pentatonic-registry-1.0',
        evaluatorVersion: 'pentatonic-evaluator-1.0',
        configurationId: 'pentatonic-config-1.0',
      };
      let tree!: ReturnType<typeof create>;
      await act(async () => {
        tree = create(React.createElement(PentatonicEnginePage, { recommendFn: () => payload }));
      });
      await act(async () => {
        findButton(tree, 'pentatonic-recommend').props.onClick();
        await Promise.resolve();
        await Promise.resolve();
      });
      const rendered = textOf(tree);
      const label =
        disposition === 'RETAIN_CURRENT'
          ? 'RETAIN CURRENT'
          : disposition === 'NO_PENTATONIC_INTERVENTION'
            ? 'NO PENTATONIC INTERVENTION'
            : disposition === 'INSUFFICIENT_CONTEXT'
              ? 'INSUFFICIENT CONTEXT'
              : disposition === 'NO_FEASIBLE_CANDIDATE'
                ? 'NO FEASIBLE CANDIDATE'
                : 'RECOMMEND';
      expect(rendered).toContain(label);
      const cards = tree.root.findAll((node) => node.props?.['data-testid'] === 'pentatonic-card');
      expect(cards.length).toBeLessThanOrEqual(3);
      if (disposition !== 'RECOMMEND' && disposition !== 'RETAIN_CURRENT') expect(cards.length).toBe(0);
    }
  });

  it('marks a result stale after an input change and ignores an older response', async () => {
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    let resolveFirst: ((result: PentatonicEngineResult) => void) | undefined;
    let calls = 0;
    const base = (name: string): PentatonicEngineResult => ({
      kind: 'analysis',
      validationErrors: [],
      disposition: 'INSUFFICIENT_CONTEXT',
      explanation: name,
      recommendations: [],
      alternatives: [],
      retained: null,
      retention: null,
      limitations: [],
      constraintFailures: [],
      diagnostics: null,
      registryVersion: 'pentatonic-registry-1.0',
      evaluatorVersion: 'pentatonic-evaluator-1.0',
      configurationId: 'pentatonic-config-1.0',
    });
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        React.createElement(PentatonicEnginePage, {
          recommendFn: () => {
            calls += 1;
            if (calls === 1) return new Promise((resolve) => {
              resolveFirst = resolve;
            });
            return Promise.resolve(base('second response'));
          },
        })
      );
    });
    await act(async () => {
      findButton(tree, 'pentatonic-recommend').props.onClick();
    });
    await act(async () => {
      findButton(tree, 'pentatonic-recommend').props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(textOf(tree)).toContain('second response');
    await act(async () => {
      resolveFirst?.(base('first response'));
      await Promise.resolve();
    });
    expect(textOf(tree)).toContain('second response');
    expect(textOf(tree)).not.toContain('first response');

    const select = tree.root.findByProps({ id: 'pentatonic-tonal-root' });
    await act(async () => {
      select.props.onChange({ target: { value: 'G' } });
    });
    expect(textOf(tree)).toContain('This result is stale');
  });

  it('shows validation instead of a disposition', async () => {
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage));
    });
    const harmony = tree.root.findByProps({ id: 'pentatonic-harmony' });
    await act(async () => {
      harmony.props.onChange({ target: { value: 'not-a-chord' } });
    });
    const melodyC = tree.root.findAll((node) => node.type === 'button' && node.props.children === 'C')[0];
    await act(async () => {
      melodyC?.props.onClick();
    });
    await act(async () => {
      findButton(tree, 'pentatonic-recommend').props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(textOf(tree)).toContain('Malformed chord');
    expect(textOf(tree)).not.toContain('RECOMMEND');
  });

  it('reset does not require touching inherited context', async () => {
    const inherited: PentatonicInheritedContext = { tonalCentreRoot: 'D', tonalCentreMode: 'major', harmonyBars: ['D'] };
    const frozen = JSON.stringify(inherited);
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage, { inherited }));
    });
    expect(textOf(tree)).toContain('Inherited Composer OS context');
    await act(async () => {
      findButton(tree, 'pentatonic-reset').props.onClick();
    });
    expect(JSON.stringify(inherited)).toBe(frozen);
    expect(textOf(tree)).toContain('D');
    expect(tree.root.findByProps({ id: 'pentatonic-tonal-root' }).props.value).toBe('C');
    expect(tree.root.findByProps({ id: 'pentatonic-harmony' }).props.value).toBe('');
  });

  it('clears every pentatonic input and every displayed result', async () => {
    const inherited: PentatonicInheritedContext = {
      tonalCentreRoot: 'D',
      tonalCentreMode: 'major',
      harmonyBars: ['Dmaj7'],
      melodyNotes: ['D', 'F#', 'A'],
    };
    const frozen = JSON.stringify(inherited);
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    const payload: PentatonicEngineResult = {
      kind: 'analysis',
      validationErrors: [],
      disposition: 'RECOMMEND',
      explanation: 'Keep this sentence out of the reset page.',
      recommendations: [],
      alternatives: [],
      retained: null,
      retention: null,
      limitations: [],
      constraintFailures: [],
      diagnostics: null,
      registryVersion: 'pentatonic-registry-1.0',
      evaluatorVersion: 'pentatonic-evaluator-1.0',
      configurationId: 'pentatonic-config-1.0',
    };
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage, { inherited, recommendFn: () => payload }));
    });
    await act(async () => {
      tree.root.findByProps({ id: 'pentatonic-home-archetype' }).props.onChange({ target: { value: 'minor_pentatonic' } });
      tree.root.findByProps({ id: 'pentatonic-home-ref' }).props.onChange({ target: { value: 'Eb' } });
      tree.root.findByProps({ id: 'pentatonic-current-mode' }).props.onChange({ target: { value: 'registry' } });
      tree.root.findByProps({ id: 'pentatonic-harmony' }).props.onChange({ target: { value: 'Am7 | Dm7' } });
      tree.root.findByProps({ id: 'pentatonic-purpose' }).props.onChange({ target: { value: 'colour' } });
      tree.root.findByProps({ id: 'pentatonic-colour' }).props.onChange({ target: { value: 'brighter' } });
      tree.root.findByProps({ id: 'pentatonic-depth' }).props.onChange({ target: { value: 'chromatic' } });
      tree.root.findByProps({ id: 'pentatonic-strict' }).props.onChange({ target: { checked: true } });
      tree.root.findByProps({ id: 'pentatonic-workflow-mode' }).props.onChange({ target: { value: 'generate' } });
    });
    const melody = tree.root.findAll((node) => node.type === 'button' && node.props.children === 'C' && node.props['aria-pressed'] === false)[0];
    await act(async () => {
      melody?.props.onClick();
    });
    await act(async () => {
      findButton(tree, 'pentatonic-recommend').props.onClick();
      await Promise.resolve();
    });
    expect(textOf(tree)).toContain('Keep this sentence out of the reset page.');
    expect(tree.root.findByProps({ id: 'pentatonic-workflow-mode' }).props.value).toBe('generate');
    await act(async () => {
      findButton(tree, 'pentatonic-reset').props.onClick();
    });
    expect(JSON.stringify(inherited)).toBe(frozen);
    expect(textOf(tree)).toContain('Inherited Composer OS context');
    expect(textOf(tree)).not.toContain('Keep this sentence out of the reset page.');
    expect(tree.root.findByProps({ id: 'pentatonic-home-archetype' }).props.value).toBe('');
    expect(tree.root.findByProps({ id: 'pentatonic-home-ref' }).props.value).toBe('A');
    expect(tree.root.findByProps({ id: 'pentatonic-current-mode' }).props.value).toBe('none');
    expect(tree.root.findByProps({ id: 'pentatonic-harmony' }).props.value).toBe('');
    expect(tree.root.findByProps({ id: 'pentatonic-purpose' }).props.value).toBe('');
    expect(tree.root.findByProps({ id: 'pentatonic-colour' }).props.value).toBe('');
    expect(tree.root.findByProps({ id: 'pentatonic-depth' }).props.value).toBe('near');
    expect(tree.root.findByProps({ id: 'pentatonic-strict' }).props.checked).toBe(false);
    expect(tree.root.findByProps({ id: 'pentatonic-workflow-mode' }).props.value).toBe('analyse');
    expect(textOf(tree)).not.toContain('SELECTED RESOURCE');
    expect(textOf(tree)).not.toContain('RESULT: SILENCE');
    const pressed = tree.root.findAll((node) => node.props?.['aria-pressed'] === true);
    expect(pressed.length).toBe(0);
    expect(cleanPentatonicForm().melodyNotes).toEqual([]);
    expect(cleanPentatonicForm().bassNotes).toEqual([]);
    expect(cleanPentatonicForm().heldNotes).toEqual([]);
    expect(cleanPentatonicForm().protectedNotes).toEqual([]);
    expect(cleanPentatonicForm().targetNotes).toEqual([]);
    expect(cleanPentatonicForm().cautionNotes).toEqual([]);
    expect(cleanPentatonicForm().strictMelody).toBe(false);
  });

  it('does not load an example over dirty inputs when confirmation is declined', async () => {
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    vi.stubGlobal('confirm', () => false);
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage));
    });
    const harmony = tree.root.findByProps({ id: 'pentatonic-harmony' });
    await act(async () => {
      harmony.props.onChange({ target: { value: 'Dm7' } });
    });
    await act(async () => {
      findButton(tree, 'pentatonic-example').props.onClick();
    });
    expect(tree.root.findByProps({ id: 'pentatonic-harmony' }).props.value).toBe('Dm7');
    vi.unstubAllGlobals();
  });

  it('loads Orbit A, finds a path, and marks the path stale after an edit', async () => {
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    const pathRecommendFn = vi.fn(() => ({
      kind: 'analysis' as const,
      validationErrors: [],
      disposition: 'PATH' as const,
      pathEngineVersion: 'pentatonic-path-1.0',
      configVersion: 'pentatonic-path-config-1.0',
      evaluatorVersion: 'pentatonic-evaluator-1.0',
      registryVersion: 'pentatonic-registry-1.0',
      relationshipScoringVersion: 'pentatonic-relationship-scoring-1.0',
      sourceEventCount: 9,
      events: [],
      segments: [],
      switchCount: 1,
      distinctResources: 2,
      noneEventCount: 0,
      noneSegmentCount: 0,
      totalPathCost: 2.79,
      costBreakdown: null,
      bestStaticPathCost: 3.15,
      bestStaticStateId: '0,3,5,7,10',
      bestStaticStateName: 'C Minor Pentatonic',
      alternatives: [],
      diagnostics: [],
      limitations: [],
      explanation: '1–8  C Minor Pentatonic SUSPENDED',
    }));
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage, { pathRecommendFn }));
    });
    const mode = tree.root.findByProps({ id: 'pentatonic-analysis-mode' });
    await act(async () => {
      mode.props.onChange({ target: { value: 'passage' } });
    });
    expect(tree.root.findAll((node) => node.props?.['data-testid'] === 'pentatonic-recommend').length).toBe(0);
    await act(async () => {
      findButton(tree, 'pentatonic-orbit-a').props.onClick();
    });
    expect(textOf(tree)).toContain('Fmaj7#11');
    expect(textOf(tree)).toContain('wwh-duo-1.1');
    await act(async () => {
      findButton(tree, 'pentatonic-find-path').props.onClick();
      await Promise.resolve();
    });
    expect(pathRecommendFn).toHaveBeenCalled();
    expect(pathRecommendFn.mock.calls[0]?.[0].events[0]?.sourceLabel).toBe('1');
    expect(pathRecommendFn.mock.calls[0]?.[0].events[0]?.bassRest).toBe(true);
    expect(pathRecommendFn.mock.calls[0]?.[0].events[6]?.chordSymbol).toBe('Abmaj7');
    expect(pathRecommendFn.mock.calls[0]?.[0].events[7]?.chordSymbol).toBe('Gbmaj7');
    expect(pathRecommendFn.mock.calls[0]?.[0].evidenceProfile).toBe('wwh-duo-1.1');
    expect(textOf(tree)).toContain('1–8  C Minor Pentatonic SUSPENDED');
    expect(textOf(tree)).toContain('Heuristic path cost');
    const label = tree.root.findAll((node) => node.props?.['aria-label'] === 'Source label 1')[0];
    await act(async () => {
      label.props.onChange({ target: { value: 'pickup' } });
    });
    expect(textOf(tree)).toContain('This path is stale');
    await act(async () => {
      findButton(tree, 'pentatonic-reset-passage').props.onClick();
    });
    expect(textOf(tree)).not.toContain('Fmaj7#11');
  });
});

describe('pentatonic workflow', () => {
  it('offers analyse, transform, and generate with M-DEG and sparse defaults', async () => {
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage));
    });
    const workflow = tree.root.findByProps({ id: 'pentatonic-workflow-mode' });
    expect(workflow.props.value).toBe('analyse');
    expect(textOf(tree)).toContain('Transform Motif');
    expect(textOf(tree)).toContain('Generate Phrase');
    expect(textOf(tree)).toContain('Plan / AUTO COLOR');
    expect(textOf(tree)).toContain('Compare');
    expect(textOf(tree)).toContain('Export');
    await act(async () => {
      workflow.props.onChange({ target: { value: 'transform' } });
    });
    expect(tree.root.findByProps({ id: 'pentatonic-workflow-method' }).props.value).toBe('M-DEG');
    expect(textOf(tree)).toContain('pentatonic-degree pattern');
    await act(async () => {
      workflow.props.onChange({ target: { value: 'generate' } });
    });
    expect(tree.root.findByProps({ id: 'pentatonic-workflow-activity' }).props.value).toBe('SPARSE');
    expect(textOf(tree)).toContain('No phrase / silence');
    expect(textOf(tree)).toContain('Development');
    expect(tree.root.findByProps({ id: 'pentatonic-analysis-mode' })).toBeTruthy();
  });
});

describe('pentatonic whole score', () => {
  it('loads MusicXML and shows a region map without hiding passage mode', async () => {
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    const xml = `<?xml version="1.0"?><score-partwise><work><work-title>Orbit</work-title></work><part-list><score-part id="P1"><part-name>Electric Guitar</part-name><score-instrument id="a"><instrument-name>Electric Guitar</instrument-name></score-instrument></score-part><score-part id="P2"><part-name>Upright Bass</part-name><score-instrument id="b"><instrument-name>Upright Bass</instrument-name></score-instrument></score-part></part-list><part id="P1"><measure number="1"><note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note></measure></part><part id="P2"><measure number="1"><note><rest/><duration>1</duration><voice>1</voice></note></measure></part></score-partwise>`;
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage));
    });
    const mode = tree.root.findByProps({ id: 'pentatonic-analysis-mode' });
    await act(async () => {
      mode.props.onChange({ target: { value: 'score' } });
    });
    expect(textOf(tree)).toContain('Whole score');
    expect(tree.root.findAll((node) => node.props?.['data-testid'] === 'pentatonic-recommend').length).toBe(0);
    const input = tree.root.findByProps({ id: 'pentatonic-score-file' });
    await act(async () => {
      input.props.onChange({ target: { files: [{ name: 'orbit-tiny.musicxml', text: async () => xml }] } });
      await Promise.resolve();
    });
    expect(textOf(tree)).toContain('orbit-tiny.musicxml');
    await act(async () => {
      findButton(tree, 'pentatonic-analyse-score').props.onClick();
    });
    for (let attempt = 0; attempt < 40 && !textOf(tree).includes('pentatonic-score-map'); attempt += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    }
    expect(textOf(tree)).toContain('pentatonic-score-map');
    expect(textOf(tree)).toContain('pentatonic-path-config-1.4');
    expect(textOf(tree)).toContain('pentatonic-friction');
    expect(textOf(tree)).toContain('Chromatic friction');
    expect(textOf(tree)).toContain('Electric Guitar');
    await act(async () => {
      mode.props.onChange({ target: { value: 'passage' } });
    });
    expect(textOf(tree)).toContain('pentatonic-passage');
  });
});

describe('AUTO COLOR', () => {
  it('resets with the pentatonic page and leaves the source score untouched', async () => {
    const source = '<?xml version="1.0"?><score-partwise><work><work-title>Locked</work-title></work></score-partwise>';
    const frozen = source;
    const inherited = { tonalCentreRoot: 'D', tonalCentreMode: 'major' as const, harmonyBars: ['Dmaj7'] };
    const inheritedFrozen = JSON.stringify(inherited);
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage, { inherited }));
    });
    await act(async () => {
      tree.root.findByProps({ id: 'pentatonic-workflow-mode' }).props.onChange({ target: { value: 'auto-color' } });
    });
    await act(async () => {
      findButton(tree, 'pentatonic-auto-intention-RETAIN_MOTIF').props.onClick();
    });
    await act(async () => {
      tree.root.findByProps({ id: 'pentatonic-auto-form' }).props.onChange({ target: { value: 'continuation' } });
    });
    await act(async () => {
      findButton(tree, 'pentatonic-auto-color-plan').props.onClick();
    });
    const planned = textOf(tree);
    expect(planned).toContain('INTENTION:');
    expect(planned).toContain('RETAIN_MOTIF');
    expect(planned).toContain('FORM CONTEXT:');
    expect(planned).toContain('OPERATOR:');
    expect(planned).toContain('CELL_LINEAGE');
    expect(planned).not.toContain('Heuristic score');
    expect(source).toBe(frozen);
    await act(async () => {
      findButton(tree, 'pentatonic-reset').props.onClick();
    });
    expect(textOf(tree)).not.toContain('CELL_LINEAGE');
    expect(tree.root.findByProps({ id: 'pentatonic-workflow-mode' }).props.value).toBe('analyse');
    expect(source).toBe(frozen);
    expect(JSON.stringify(inherited)).toBe(inheritedFrozen);
  });
});

describe('pentatonic colour registry on the path page', () => {
  it('shows all 20 collections and sends each one to path operations', async () => {
    const resources = listPentatonicColourResources();
    expect(resources.map((item) => item.id)).toHaveLength(20);
    const { PentatonicEnginePage } = await import('../src/pentatonic/PentatonicEnginePage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(PentatonicEnginePage));
    });
    const rendered = textOf(tree);
    const row = (id: string) =>
      tree.root.findAll((node) => node.props?.['data-testid'] === 'pentatonic-colour-row' && node.props?.['data-colour-id'] === id)[0];
    for (const resource of resources) {
      expect(rendered).toContain(resource.displayName);
      expect(JSON.stringify(row(resource.id)?.findByProps({ 'data-testid': 'pentatonic-colour-intervals' }).children)).toContain(
        resource.intervals.join(' '),
      );
    }
    const spellingOf = (id: string) => JSON.stringify(row(id)?.findByProps({ 'data-testid': 'pentatonic-colour-spelling' }).children);
    const classesOf = (id: string) => JSON.stringify(row(id)?.findByProps({ 'data-testid': 'pentatonic-colour-pitch-classes' }).children);
    for (const id of ['suspended_pentatonic', 'hirajoshi', 'kumoi', 'remote_altered', 'whole_tone_pentachord']) {
      const resource = resources.find((item) => item.id === id);
      expect(resource?.pathArchetypeId).toBeNull();
      expect(spellingOf(id)).toContain(colourSpelling('C', resource!));
      expect(classesOf(id)).toContain(colourPitchClasses('C', resource!.intervals).join(' '));
      expect(row(id)?.findAll((node) => node.props?.['data-testid'] === 'pentatonic-colour-use-path')).toHaveLength(1);
    }
    expect(tree.root.findAll((node) => node.props?.['data-testid'] === 'pentatonic-colour-use-path')).toHaveLength(20);
    expect(tree.root.findAll((node) => node.props?.['data-testid'] === 'pentatonic-colour-limitation')).toHaveLength(0);
    expect(tree.root.findByProps({ id: 'pentatonic-home-archetype' }).props.value).toBe('');
    expect(tree.root.findAll((node) => node.props?.id === 'pentatonic-current-archetype')).toHaveLength(0);

    await act(async () => {
      tree.root.findByProps({ id: 'pentatonic-colour-reference' }).props.onChange({ target: { value: 'D' } });
    });
    const suspended = resources.find((item) => item.id === 'suspended_pentatonic')!;
    expect(spellingOf('suspended_pentatonic')).toContain(colourSpelling('D', suspended));
    expect(classesOf('suspended_pentatonic')).toContain(colourPitchClasses('D', suspended.intervals).join(' '));
    expect(classesOf('suspended_pentatonic')).toContain('"D"');
    expect(tree.root.findByProps({ id: 'pentatonic-home-archetype' }).props.value).toBe('');

    const useMajor = tree.root.findAll(
      (node) => node.props?.['data-testid'] === 'pentatonic-colour-use-path' && node.props?.['data-colour-id'] === 'major_pentatonic',
    )[0];
    await act(async () => {
      useMajor?.props.onClick();
    });
    const selection = tree.root.findByProps({ 'data-testid': 'pentatonic-colour-path-selection' });
    expect(selection.children).toEqual([
      'Manual path collection: ',
      'D',
      ' ',
      'Major Pentatonic',
      '. Transform and Generate use it when Manual resource is selected.',
    ]);
    await act(async () => {
      tree.root.findByProps({ id: 'pentatonic-workflow-mode' }).props.onChange({ target: { value: 'transform' } });
    });
    expect(tree.root.findByProps({ id: 'pentatonic-workflow-resource' }).props.value).toBe('manual');
    expect(tree.root.findByProps({ id: 'pentatonic-workflow-archetype' }).props.value).toBe('major_pentatonic');
    expect(tree.root.findByProps({ id: 'pentatonic-workflow-reference' }).props.value).toBe('D');
    expect(tree.root.findByProps({ id: 'pentatonic-home-archetype' }).props.value).toBe('');
    const options = tree.root
      .findByProps({ id: 'pentatonic-workflow-archetype' })
      .findAllByType('option')
      .map((node) => node.props.value);
    expect(options).toEqual(resources.map((item) => item.id));
    await act(async () => {
      findButton(tree, 'pentatonic-colour-generate-path').props.onClick();
    });
    expect(textOf(tree)).toContain('"major_pentatonic"," @ ","D"');
    const hirajoshi = tree.root.findAll(
      (node) => node.props?.['data-testid'] === 'pentatonic-colour-use-path' && node.props?.['data-colour-id'] === 'hirajoshi',
    )[0];
    await act(async () => {
      hirajoshi?.props.onClick();
    });
    expect(tree.root.findByProps({ id: 'pentatonic-workflow-archetype' }).props.value).toBe('hirajoshi');
    await act(async () => {
      findButton(tree, 'pentatonic-colour-generate-path').props.onClick();
    });
    expect(textOf(tree)).toContain('"hirajoshi"," @ "');
    const candidates = tree.root.findAll((node) => node.props?.['data-testid'] === 'pentatonic-colour-route-candidate');
    expect(candidates.length).toBeGreaterThan(1);
    await act(async () => {
      candidates[1]?.props.onClick();
    });
    expect(tree.root.findByProps({ 'data-testid': 'pentatonic-colour-path-selection' }).children?.join('')).toContain(
      tree.root.findByProps({ id: 'pentatonic-workflow-reference' }).props.value,
    );
  });
});
