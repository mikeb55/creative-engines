// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const play = vi.fn(async () => undefined);
const stop = vi.fn();

vi.mock('../src/playback/playbackEngine', () => ({
  initPlayback: vi.fn(async () => undefined),
  play: (...args: unknown[]) => play(...args),
  pause: vi.fn(),
  stop: (...args: unknown[]) => stop(...args),
}));

vi.mock('../src/services/api', () => ({
  api: {
    generate: vi.fn(async () => ({
      success: true,
      xml: `<?xml version="1.0"?><score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`,
      requestEcho: { bpm: 120 },
      runManifest: { seed: 3, songwriterStyle: 'bill_evans' },
    })),
  },
}));

import { AuditionDock } from '../src/components/AuditionDock';

describe('AuditionDock', () => {
  it('still listens through the shared playback engine', async () => {
    render(<AuditionDock composerId="bill_evans" composerLabel="Bill Evans" onOpenFullControls={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Listen to Bill Evans' }));
    await waitFor(() => expect(play).toHaveBeenCalled());
    const sequence = play.mock.calls[0]?.[0] as { notes: unknown[] };
    expect(sequence.notes.length).toBeGreaterThan(0);
    await waitFor(() => {
      const button = screen.getByRole('button', { name: 'Stop audition' });
      expect(button.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Stop audition' }));
    expect(stop).toHaveBeenCalled();
  });
});
