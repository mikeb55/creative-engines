/**
 * Harmony Lab inside the Ensemble workspace.
 * @vitest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playbackSequenceFromMusicXml } from '../src/score/playbackSequenceFromMusicXml';
import { compileHarmonyLab, HARMONY_LAB_PRESETS, runHarmonyLab } from '@composer-os/core/orchestrate/harmonyLab';
import type { E2EnsembleId } from '@composer-os/core/orchestrate/ensembleTemplates';
import type { HarmonyLabKind, HarmonyLabSettings } from '@composer-os/core/orchestrate/harmonyLab';
import { BigBandProvider } from '@renderer/context/BigBandContext';
import { StringQuartetProvider } from '@renderer/context/StringQuartetContext';
import { ContrapuntalProvider } from '@renderer/context/ContrapuntalContext';

const harmonyLab = vi.fn();

vi.mock('../src/services/api', () => ({
  isDesktopIpc: () => false,
  api: {
    harmonyLab: (...args: unknown[]) => harmonyLab(...args),
  },
}));

import { EnsembleWorkspace } from '@renderer/pages/EnsembleWorkspace';

function mount() {
  return render(
    <BigBandProvider>
      <StringQuartetProvider>
        <ContrapuntalProvider>
          <EnsembleWorkspace />
        </ContrapuntalProvider>
      </StringQuartetProvider>
    </BigBandProvider>,
  );
}

describe('Harmony Lab GUI', () => {
  beforeEach(() => {
    window.localStorage.clear();
    harmonyLab.mockReset();
  });

  it('renders the three tabs and the existing ensemble panels', () => {
    mount();
    expect(screen.getByTestId('harmony-lab-tab-polychord').getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByTestId('harmony-lab-tab-triad-pair'));
    expect(screen.getByTestId('harmony-lab-triad-controls')).toBeTruthy();
    expect(screen.queryByTestId('harmony-lab-polychord-controls')).toBeNull();
    fireEvent.click(screen.getByTestId('harmony-lab-tab-dyad-pair'));
    expect(screen.getByTestId('harmony-lab-dyad-controls')).toBeTruthy();
    expect(screen.queryByLabelText('Parent transformation')).toBeNull();
    expect(screen.getByRole('button', { name: /Big Band/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /String Quartet/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Contrapuntal/ })).toBeTruthy();
  });

  it('hides the triadic transform for an augmented triad', () => {
    mount();
    fireEvent.click(screen.getByTestId('harmony-lab-tab-triad-pair'));
    fireEvent.change(screen.getByLabelText('Triad B quality'), { target: { value: 'augmented' } });
    expect(screen.queryByTestId('harmony-lab-transform')).toBeNull();
    expect(screen.getByText(/Augmented and diminished/)).toBeTruthy();
  });

  it('posts each of the nine material and ensemble combinations', async () => {
    mount();
    const kinds: HarmonyLabKind[] = ['polychord', 'triad-pair', 'dyad-pair'];
    const ensembles: E2EnsembleId[] = ['big-band', 'string-quartet', 'ecm-duo'];
    let call = 0;
    for (const kind of kinds) {
      fireEvent.click(screen.getByTestId(`harmony-lab-tab-${kind}`));
      for (const ensemble of ensembles) {
        fireEvent.change(screen.getByTestId('harmony-lab-density'), { target: { value: 'medium' } });
        fireEvent.change(screen.getByTestId('harmony-lab-duration'), { target: { value: 'quarter' } });
        fireEvent.change(screen.getByTestId('harmony-lab-ensemble'), { target: { value: ensemble } });
        if (kind === 'dyad-pair') {
          fireEvent.change(screen.getByTestId('harmony-lab-motion'), { target: { value: 'parallel' } });
        }
        harmonyLab.mockResolvedValueOnce({
          ok: true,
          musicXml: '<score-partwise><part-list><score-part id="P1"></score-part></part-list></score-partwise>',
          midiBase64: Buffer.from('MThd').toString('base64'),
          partIds: ensemble === 'big-band' ? Array.from({ length: 16 }, (_, index) => `p${index}`) : ensemble === 'string-quartet' ? ['vn1', 'vn2', 'va', 'vc'] : ['guitar', 'bass'],
          noteCount: 4,
          summary: `${kind} ${ensemble}`,
          lockStatus: 'Unlocked. No source is loaded.',
          intervalText: kind,
        });
        fireEvent.click(screen.getByTestId('harmony-lab-generate'));
        await waitFor(() => expect(harmonyLab.mock.calls.length).toBe(call + 1));
        const body = harmonyLab.mock.calls[call][0] as HarmonyLabSettings;
        expect(body.kind).toBe(kind);
        expect(body.ensemble).toBe(ensemble);
        const compiled = compileHarmonyLab(body);
        expect(compiled.ok, compiled.ok ? '' : compiled.error).toBe(true);
        if (compiled.ok) expect(compiled.request.ensemble).toBe(ensemble);
        call += 1;
      }
    }
    expect(call).toBe(9);
  });

  it('saves settings and shows notation plus a playback sequence', async () => {
    const produced = runHarmonyLab(HARMONY_LAB_PRESETS[3]);
    expect(produced.ok).toBe(true);
    if (!produced.ok) return;
    harmonyLab.mockResolvedValue(produced);
    mount();
    fireEvent.change(screen.getByTestId('harmony-lab-tempo'), { target: { value: '88' } });
    fireEvent.click(screen.getByTestId('harmony-lab-save'));
    fireEvent.change(screen.getByTestId('harmony-lab-tempo'), { target: { value: '140' } });
    fireEvent.click(screen.getByTestId('harmony-lab-restore'));
    expect((screen.getByTestId('harmony-lab-tempo') as HTMLInputElement).value).toBe('88');
    fireEvent.click(screen.getByTestId('harmony-lab-generate'));
    expect(await screen.findByTestId('harmony-lab-result')).toBeTruthy();
    expect(screen.getByTestId('score-preview')).toBeTruthy();
    expect(screen.getByTestId('score-audition-play')).toBeTruthy();
    expect((screen.getByTestId('score-audition-play') as HTMLButtonElement).disabled).toBe(false);
    const sequence = playbackSequenceFromMusicXml(produced.musicXml);
    expect(sequence.ok).toBe(true);
    if (!sequence.ok || !sequence.sequence) return;
    expect(sequence.sequence.notes.length).toBeGreaterThan(0);
    expect(screen.getByTestId('harmony-lab-lock-status').textContent).toMatch(/Unlocked/);
  });
});
