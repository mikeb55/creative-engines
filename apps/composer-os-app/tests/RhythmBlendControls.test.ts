/**
 * Rhythm blend UI helpers + smoke render (not in composer smoke suite).
 */
import React from 'react';
import { create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import type { AfrobeatPresetRef, RebetikoPresetRef, RhythmEngineId } from '../src/components/RhythmBlendControls.types';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getDefaultAfrobeatPreset(p: AfrobeatPresetRef[]): AfrobeatPresetRef {
  if (!p.length) throw new Error('No afrobeat presets');
  return p[0];
}
function getDefaultRebetikoPreset(p: RebetikoPresetRef[]): RebetikoPresetRef {
  if (!p.length) throw new Error('No rebetiko presets');
  return p[0];
}
function getDefaultPresetForEngine(
  engine: RhythmEngineId,
  a: AfrobeatPresetRef[],
  r: RebetikoPresetRef[]
): AfrobeatPresetRef | RebetikoPresetRef {
  return engine === 'afrobeat' ? getDefaultAfrobeatPreset(a) : getDefaultRebetikoPreset(r);
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

const SAMPLE_AFRO: AfrobeatPresetRef[] = [
  { engine: 'afrobeat', presetId: 'straight', label: 'A', meter: '4/4', gridSteps: 16 },
];

const SAMPLE_REB: RebetikoPresetRef[] = [
  {
    engine: 'rebetiko',
    presetId: 'hasapiko_4_4',
    label: 'G',
    meter: '4/4',
    groups: [2, 2, 2, 2],
    gridSteps: 16,
  },
];

describe('RhythmBlendControls helpers', () => {
  it('slugify normalises titles', () => {
    expect(slugify('  Hello World!!  ')).toBe('hello-world');
  });

  it('getDefaultPresetForEngine returns afrobeat', () => {
    expect(getDefaultPresetForEngine('afrobeat', SAMPLE_AFRO, SAMPLE_REB).presetId).toBe('straight');
  });

  it('getDefaultPresetForEngine returns rebetiko', () => {
    expect(getDefaultPresetForEngine('rebetiko', SAMPLE_AFRO, SAMPLE_REB).presetId).toBe('hasapiko_4_4');
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
        afrobeatPresets: SAMPLE_AFRO,
        rebetikoPresets: SAMPLE_REB,
        exportSongFormToMusicXml: () => '<?xml version="1.0"?><score-partwise/>',
        exportBlendedScoreToMusicXml: () => '<?xml version="1.0"?><score-partwise/>',
      })
    );
    expect(tree.toJSON()).toBeTruthy();
  });
});
