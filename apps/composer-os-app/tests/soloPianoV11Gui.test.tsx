// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestFingerprint } from '@composer-os/core/piano/pianoV11Windows';
import { canonicalDemonstrationRequest } from '../src/pages/soloPianoV11Editor';

const composePiano = vi.fn();

vi.mock('../src/services/api', () => ({
  isDesktopIpc: () => false,
  api: {
    composePiano: (...args: unknown[]) => composePiano(...args),
    openOutputFolder: vi.fn(async () => ({ success: true })),
  },
}));

import { SoloPianoPage } from '../src/pages/SoloPianoPage';

function loadDemonstration() {
  fireEvent.click(screen.getByTestId('solo-piano-v11-load-demo'));
}

describe('Solo Piano V1.1 editor', () => {
  beforeEach(() => {
    composePiano.mockReset();
    composePiano.mockResolvedValue({
      ok: true,
      bars: 24,
      tempo: 48,
      elapsedSeconds: 103.75,
      soundingAttacks: 223,
      filepath: '/tmp/gui-demonstration.musicxml',
      midiFilepath: '/tmp/gui-demonstration.mid',
      validation: { oracleOk: true, errors: [] },
    });
  });

  it('shows the demonstration fields and submits that request', async () => {
    render(<SoloPianoPage />);
    fireEvent.change(screen.getByTestId('solo-piano-piece'), { target: { value: 'general' } });
    fireEvent.click(screen.getByTestId('solo-piano-v11-advanced'));
    loadDemonstration();
    expect((screen.getByTestId('solo-piano-chord-21') as HTMLInputElement).value).toBe('Fmaj7');
    expect((screen.getByTestId('solo-piano-bars') as HTMLSelectElement).value).toBe('24');
    expect((screen.getByTestId('solo-piano-tempo') as HTMLInputElement).value).toBe('48');
    expect(screen.getByTestId('solo-piano-v11-phrase-regions').querySelectorAll('li')).toHaveLength(12);
    expect(screen.getByTestId('solo-piano-v11-windows-rh').querySelectorAll('fieldset').length).toBeGreaterThan(0);
    expect(screen.getByTestId('solo-piano-v11-windows-lh').querySelectorAll('fieldset').length).toBeGreaterThan(0);
    expect(screen.getByTestId('solo-piano-v11-continuation-3').textContent).toMatch(/Crosses into bar/);
    expect(screen.getByText(/Source chord context: bar 21 Fmaj7/)).toBeTruthy();
    expect(screen.getByText(/Upper parent members: Eb, G, Bb/)).toBeTruthy();
    const fingerprint = screen.getByTestId('solo-piano-v11-fingerprint').textContent;
    expect(fingerprint).toContain(requestFingerprint(canonicalDemonstrationRequest()));
    fireEvent.click(screen.getByTestId('solo-piano-generate'));
    await waitFor(() => expect(composePiano).toHaveBeenCalledTimes(1));
    expect(composePiano.mock.calls[0][0]).toEqual(canonicalDemonstrationRequest());
    expect((screen.getByTestId('solo-piano-v11-stage-d') as HTMLSelectElement).value).toBe('off');
    expect((await screen.findByTestId('solo-piano-result')).textContent).toContain('223 sounding attacks');
    fireEvent.change(screen.getByTestId('solo-piano-v11-stage-d'), { target: { value: 'on' } });
    fireEvent.click(screen.getByTestId('solo-piano-generate'));
    await waitFor(() => expect(composePiano).toHaveBeenCalledTimes(2));
    expect((composePiano.mock.calls[1][0] as { pianoV11: { musicalRefinement?: boolean } }).pianoV11.musicalRefinement).toBe(true);
    fireEvent.change(screen.getByTestId('solo-piano-seed'), { target: { value: '76019' } });
    expect(screen.queryByTestId('solo-piano-result')).toBeNull();
    expect(screen.getByTestId('solo-piano-stale').textContent).toMatch(/Stale Generate result discarded/);
  });

  it('explains invalid fields and restores a saved configuration', async () => {
    render(<SoloPianoPage />);
    fireEvent.change(screen.getByTestId('solo-piano-piece'), { target: { value: 'general' } });
    fireEvent.click(screen.getByTestId('solo-piano-v11-advanced'));
    loadDemonstration();
    const saved = screen.getByTestId('solo-piano-v11-fingerprint').textContent;
    fireEvent.click(screen.getByTestId('solo-piano-v11-save'));
    fireEvent.change(screen.getByLabelText('Metre 1 numerator'), { target: { value: '8' } });
    expect(screen.getByTestId('solo-piano-v11-field-errors').textContent).toContain('pianoV11.meterPlan');
    fireEvent.click(screen.getByTestId('solo-piano-v11-reload'));
    fireEvent.change(screen.getByLabelText('Window 1 offset denominator'), { target: { value: '0' } });
    expect(screen.getByTestId('solo-piano-v11-field-errors').textContent).toContain('pianoV11.rhythmicWindows[0].offset');
    fireEvent.click(screen.getByTestId('solo-piano-v11-reload'));
    fireEvent.change(screen.getByLabelText('Polychord 1 start'), { target: { value: '30' } });
    expect(screen.getByTestId('solo-piano-v11-field-errors').textContent).toContain('pianoV11.polychords');
    fireEvent.click(screen.getByTestId('solo-piano-v11-reload'));
    expect(screen.getByTestId('solo-piano-v11-fingerprint').textContent).toBe(saved);
    expect(screen.queryByTestId('solo-piano-v11-field-errors')).toBeNull();
    fireEvent.change(screen.getByTestId('solo-piano-piece'), { target: { value: 'fixture' } });
    fireEvent.click(screen.getByTestId('solo-piano-generate'));
    await waitFor(() => expect(composePiano).toHaveBeenCalled());
    const body = composePiano.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(body.pianoV11).toBeUndefined();
    expect(body.generalPianoV1).toBeUndefined();
    expect(body.innerVoice).toBe(true);
  });
});
