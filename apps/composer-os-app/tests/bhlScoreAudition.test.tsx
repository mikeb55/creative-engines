// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const play = vi.fn(async () => undefined);
const stop = vi.fn();
const bhlInspect = vi.fn();
const bhlCandidates = vi.fn();
const bhlCompare = vi.fn();
const renderMusicXML = vi.fn(() => ({}));

vi.mock('../src/playback/playbackEngine', () => ({
  initPlayback: vi.fn(async () => undefined),
  play: (...args: unknown[]) => play(...args),
  pause: vi.fn(),
  stop: (...args: unknown[]) => stop(...args),
}));

vi.mock('@stringsync/vexml', () => ({
  DEFAULT_CONFIG: { WIDTH: 520, SHOW_TABS: true, SHOW_STANDARD_NOTATION: true },
  renderMusicXML: (...args: unknown[]) => renderMusicXML(...args),
}));

vi.mock('vexflow', () => ({
  VexFlow: {
    loadFonts: vi.fn(async () => undefined),
    setFonts: vi.fn(),
  },
}));

vi.mock('../src/services/api', () => ({
  isDesktopIpc: () => false,
  api: {
    bhlCatalog: vi.fn(async () => ({ ok: false })),
    bhlDefaults: vi.fn(async () => ({
      ok: true,
      sourcePath: '/tmp/source.musicxml',
      exportDir: '/tmp/bhl',
      span: { from: 33, to: 40 },
    })),
    bhlInspect: (...args: unknown[]) => bhlInspect(...args),
    bhlCandidates: (...args: unknown[]) => bhlCandidates(...args),
    bhlCompare: (...args: unknown[]) => bhlCompare(...args),
  },
}));

import { BhlComposerPage } from '../src/bhl/BhlComposerPage';

function noteXml(step: string): string {
  return `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>Electric Guitar</part-name></score-part><score-part id="P2"><part-name>Upright Bass</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes><note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration></note></measure></part><part id="P2"><measure number="1"><note><pitch><step>${step}</step><octave>2</octave></pitch><duration>1</duration></note></measure></part></score-partwise>`;
}

const evidence = {
  awaitingComposerVerification: true,
  musicalQualityScore: null,
  events: [],
  motions: [],
  entries: [],
  crossings: [],
  silences: [],
  questions: [],
  barMetres: [],
};

describe('BHL candidate audition', () => {
  beforeEach(() => {
    play.mockClear();
    stop.mockClear();
    renderMusicXML.mockClear();
    bhlInspect.mockResolvedValue({
      ok: true,
      sourcePath: '/tmp/source.musicxml',
      sourceSha256: 'abc',
      guitarPartId: 'P1',
      bassPartId: 'P2',
      guitarName: 'Electric Guitar',
      bassName: 'Upright Bass',
      barCount: 40,
      span: { from: 33, to: 40 },
      metres: [],
      tempo: null,
      rehearsal: [],
      bassEventCount: 1,
      protectedGuitarBars: [],
      plan: { seed: 3340, span: { from: 33, to: 40 }, motif: { pitchClasses: [0] }, regions: [] },
      fieldChoices: {},
      evidence,
    });
    bhlCandidates.mockResolvedValue({
      ok: true,
      candidates: [
        { id: 'c1', label: 'Candidate 1', seed: 1, xml: noteXml('C') },
        { id: 'c2', label: 'Candidate 2', seed: 2, xml: noteXml('D') },
        { id: 'c3', label: 'Candidate 3', seed: 3, xml: noteXml('E') },
      ],
    });
    bhlCompare.mockResolvedValue({
      ok: true,
      left: { guitarAttacks: 1, guitarRests: 0, voices: { '1': 1 }, silences: 0 },
      right: { guitarAttacks: 1, guitarRests: 0, voices: { '1': 1 }, silences: 0 },
      comparison: { notice: 'Stored files differ.' },
    });
  });

  it('auditions the selected candidate and still compares the stored three', async () => {
    render(<BhlComposerPage />);
    await waitFor(() => expect((screen.getByTestId('bhl-source') as HTMLInputElement).value).toBe('/tmp/source.musicxml'));
    const worlds = screen.getByTestId('bhl-world') as HTMLSelectElement;
    expect(Array.from(worlds.options).map((option) => option.value)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    fireEvent.click(screen.getByTestId('bhl-import-lock'));
    await waitFor(() => expect(bhlInspect).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('bhl-candidates-generate'));
    await waitFor(() => expect(screen.getAllByTestId('bhl-candidate')).toHaveLength(3));
    await waitFor(() => expect(renderMusicXML).toHaveBeenCalled());
    expect(String(renderMusicXML.mock.calls.at(-1)?.[0])).toContain('<step>C</step>');
    expect(screen.getByTestId('score-audition').textContent).toContain('Candidate 1');
    expect(screen.getByTestId('score-audition').textContent).toContain('NOT MUSICALLY APPROVED');

    fireEvent.click(screen.getByTestId('score-audition-play'));
    await waitFor(() => expect(play).toHaveBeenCalled());
    stop.mockClear();
    const radios = screen.getAllByTestId('bhl-candidate');
    fireEvent.click(radios[1]!);
    await waitFor(() => expect(String(renderMusicXML.mock.calls.at(-1)?.[0])).toContain('<step>D</step>'));
    expect(stop).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('bhl-compare'));
    await waitFor(() => expect(screen.getByTestId('bhl-compare-text').textContent).toMatch(/Stored files differ/));
    expect(bhlCompare).toHaveBeenCalledWith(expect.objectContaining({
      leftXml: noteXml('D'),
      rightXml: noteXml('C'),
    }));
    expect(screen.getAllByTestId('bhl-candidate')).toHaveLength(3);
  });
});
