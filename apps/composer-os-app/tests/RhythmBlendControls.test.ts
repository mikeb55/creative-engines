/**
 * Rhythm blend UI helpers + smoke render (not in composer smoke suite).
 */
import React from 'react';
import { create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type {
  BrazilianPresetRef,
  CubanPresetRef,
  FelaKutiPresetRef,
  GreekRebetikoPresetRef,
  SecondLinePresetRef,
  RhythmBlendEngineId,
} from '../src/components/RhythmBlendControls.types';
import type { RhythmBlendStarterBundles } from '../src/components/RhythmBlendControls.types';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SAMPLE_FELA: FelaKutiPresetRef[] = [
  { engine: 'felaKuti', presetId: 'straight', label: 'A', meter: '4/4', gridSteps: 16 },
];

const SAMPLE_GRE: GreekRebetikoPresetRef[] = [
  {
    engine: 'greekRebetiko',
    presetId: 'hasapiko_4_4',
    label: 'G',
    meter: '4/4',
    groups: [2, 2, 2, 2],
    gridSteps: 16,
  },
];

const SAMPLE_BR: BrazilianPresetRef[] = [
  {
    engine: 'brazilian',
    presetId: 'bossa-nova-basic',
    label: 'B',
    meterSignature: '2/4',
    gridSteps: 16,
  },
];

const SAMPLE_SL: SecondLinePresetRef[] = [
  {
    engine: 'secondLine',
    presetId: 'second-line-basic',
    label: 'SL',
    meterSignature: '4/4',
    gridSteps: 16,
  },
];

const SAMPLE_CU: CubanPresetRef[] = [
  {
    engine: 'cuban',
    presetId: 'son-clave-3-2',
    label: 'CU',
    meterSignature: '4/4',
    gridSteps: 16,
    claveDirection: '3-2',
  },
];

const BUNDLES: RhythmBlendStarterBundles = {
  felaKuti: SAMPLE_FELA,
  greekRebetiko: SAMPLE_GRE,
  brazilian: SAMPLE_BR,
  secondLine: SAMPLE_SL,
  cuban: SAMPLE_CU,
};

function presetsForEngine(engine: RhythmBlendEngineId, b: RhythmBlendStarterBundles) {
  switch (engine) {
    case 'felaKuti':
      return b.felaKuti;
    case 'greekRebetiko':
      return b.greekRebetiko;
    case 'brazilian':
      return b.brazilian;
    case 'secondLine':
      return b.secondLine;
    case 'cuban':
      return b.cuban;
    default: {
      const _n: never = engine;
      return _n;
    }
  }
}

function downloadMusicXml(filename: string, xml: string) {
  const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

describe('RhythmBlendControls helpers', () => {
  it('slugify normalises titles', () => {
    expect(slugify('  Hello World!!  ')).toBe('hello-world');
  });

  it('presetsForEngine returns five engines', () => {
    expect(presetsForEngine('brazilian', BUNDLES)[0]?.presetId).toBe('bossa-nova-basic');
    expect(presetsForEngine('cuban', BUNDLES)[0]?.presetId).toBe('son-clave-3-2');
  });

  it('downloadMusicXml no-throw', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const createElement = vi.fn(() => ({ href: '', download: '', click, remove }));
    vi.stubGlobal('document', {
      createElement,
      body: { appendChild },
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
    expect(() => downloadMusicXml('x.musicxml', '<score/>')).not.toThrow();
    expect(click).toHaveBeenCalled();
  });
});

describe('RhythmBlendControls', () => {
  it('renders without error', async () => {
    (globalThis as { window?: unknown }).window = {
      ...((globalThis as { window?: unknown }).window as object),
      crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    };
    const { RhythmBlendControls } = await import('../src/components/RhythmBlendControls');
    let tree: ReturnType<typeof create>;
    tree = create(
      React.createElement(RhythmBlendControls, {
        starterBundles: BUNDLES,
        exportSongFormToMusicXml: () => '<?xml version="1.0"?><score-partwise/>',
        exportBlendedScoreToMusicXml: () => '<?xml version="1.0"?><score-partwise/>',
      })
    );
    expect(tree.toJSON()).toBeTruthy();
  });
});
