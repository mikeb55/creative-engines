// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const play = vi.fn(async () => undefined);
const stop = vi.fn();
const pause = vi.fn();
const initPlayback = vi.fn(async () => undefined);
const renderMusicXML = vi.fn();

vi.mock('../src/playback/playbackEngine', () => ({
  initPlayback: (...args: unknown[]) => initPlayback(...args),
  play: (...args: unknown[]) => play(...args),
  pause: (...args: unknown[]) => pause(...args),
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

import { CORE_CANDIDATES, listBlindCatalogueIds } from '@composer-os/core/hexatonic';
import { ScoreAudition } from '../src/score/ScoreAudition';
import { ScorePreview } from '../src/score/ScorePreview';
import { HexatonicLaboratory } from '../src/hexatonic/HexatonicLaboratory';

const NOTE_XML = `<?xml version="1.0"?>
<score-partwise>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
  </measure></part>
</score-partwise>`;

const OTHER_XML = NOTE_XML.replace('C', 'D');

const DUO_XML = `<?xml version="1.0"?>
<score-partwise>
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions></attributes>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note>
  </measure></part>
  <part id="P2"><measure number="1">
    <note><pitch><step>E</step><octave>2</octave></pitch><duration>1</duration></note>
  </measure></part>
</score-partwise>`;

describe('ScoreAudition', () => {
  beforeEach(() => {
    play.mockReset();
    play.mockImplementation(async () => undefined);
    stop.mockReset();
    pause.mockReset();
    initPlayback.mockReset();
    initPlayback.mockImplementation(async () => undefined);
  });

  it('plays, stops, and replays through the shared engine', async () => {
    render(<ScoreAudition musicXml={NOTE_XML} label="Probe" />);
    fireEvent.click(screen.getByTestId('score-audition-play'));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    const sequence = play.mock.calls[0]?.[0] as { notes: unknown[] };
    expect(sequence.notes.length).toBeGreaterThan(0);
    expect(initPlayback).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('score-audition-status').textContent).toBe('Playing'));
    expect((screen.getByTestId('score-audition-stop') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId('score-audition-stop'));
    expect(stop).toHaveBeenCalled();
    expect(screen.getByTestId('score-audition-status').textContent).toBe('Ready');
    fireEvent.click(screen.getByTestId('score-audition-replay'));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  });

  it('stops when the score changes and when the player unmounts', async () => {
    const view = render(<ScoreAudition musicXml={NOTE_XML} label="Probe" />);
    fireEvent.click(screen.getByTestId('score-audition-play'));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    stop.mockClear();
    view.rerender(<ScoreAudition musicXml={OTHER_XML} label="Probe" />);
    expect(stop).toHaveBeenCalled();
    stop.mockClear();
    view.unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('reports a hung audio context instead of staying Ready', async () => {
    initPlayback.mockImplementation(() => new Promise(() => undefined));
    render(<ScoreAudition musicXml={NOTE_XML} label="Probe" />);
    fireEvent.click(screen.getByTestId('score-audition-play'));
    await waitFor(() => expect(screen.getByTestId('score-audition-status').textContent).toMatch(/did not start/i), { timeout: 4000 });
    expect((screen.getByTestId('score-audition-stop') as HTMLButtonElement).disabled).toBe(true);
    expect(play).not.toHaveBeenCalled();
  });

  it('shows a parse error and does not start playback', async () => {
    render(<ScoreAudition musicXml="<score-partwise><note></score>" label="Broken" />);
    fireEvent.click(screen.getByTestId('score-audition-play'));
    await waitFor(() => expect(screen.getByTestId('score-audition-status').textContent).toMatch(/could not be parsed/i));
    expect(play).not.toHaveBeenCalled();
  });
});

describe('ScorePreview', () => {
  beforeEach(() => {
    renderMusicXML.mockReset();
    renderMusicXML.mockImplementation(() => ({}));
  });

  it('draws standard guitar and bass staves and leaves the MusicXML unchanged', async () => {
    render(<ScorePreview musicXml={DUO_XML} />);
    await waitFor(() => expect(renderMusicXML).toHaveBeenCalled());
    const [xml, , options] = renderMusicXML.mock.calls[0] as [string, HTMLElement, { config: { SHOW_TABS: boolean; SHOW_STANDARD_NOTATION: boolean } }];
    expect(xml).toBe(DUO_XML.trim());
    expect(xml).toContain('Electric Guitar');
    expect(xml).toContain('Upright Bass');
    expect(options.config.SHOW_TABS).toBe(false);
    expect(options.config.SHOW_STANDARD_NOTATION).toBe(true);
    expect(screen.getByTestId('score-preview-scroll')).toBeTruthy();
  });

  it('reports an unsupported render without rewriting the score', async () => {
    renderMusicXML.mockImplementation(() => {
      throw new Error('tuplet not supported');
    });
    render(<ScorePreview musicXml={DUO_XML} />);
    await waitFor(() => expect(screen.getByTestId('score-preview-error').textContent).toMatch(/tuplet not supported/));
    expect(screen.getByTestId('score-preview-error').textContent).toMatch(/not changed/);
  });
});

describe('HexatonicLaboratory audition', () => {
  beforeEach(() => {
    renderMusicXML.mockReset();
    renderMusicXML.mockImplementation(() => ({}));
  });

  it('keeps twelve provisional candidates and does not mark KEEP', async () => {
    render(<HexatonicLaboratory />);
    expect(screen.getByTestId('hexatonic-laboratory-status').textContent).toContain('PROVISIONAL — NOT MUSICALLY APPROVED');
    expect(screen.getByTestId('hexatonic-laboratory-candidate').querySelectorAll('option')).toHaveLength(12);
    expect((screen.getByTestId('hex-lab-decision') as HTMLSelectElement).value).toBe('UNDECIDED');
    expect(screen.getByTestId('score-audition')).toBeTruthy();
    await waitFor(() => expect(renderMusicXML).toHaveBeenCalled());
    const xml = String(renderMusicXML.mock.calls[0]?.[0]);
    expect(xml).toContain('Electric Guitar');
    expect(xml).toContain('Upright Bass');
    fireEvent.change(screen.getByTestId('hex-lab-decision'), { target: { value: 'REFINE' } });
    expect((screen.getByTestId('hex-lab-decision') as HTMLSelectElement).value).toBe('REFINE');
  });

  it('hides pair identity until the blind answer is saved', () => {
    render(<HexatonicLaboratory />);
    fireEvent.click(screen.getByTestId('hex-lab-mode-blind'));
    const panel = screen.getByTestId('hex-blind-panel');
    expect(screen.queryByTestId('hexatonic-laboratory-candidate')).toBeNull();
    expect(screen.queryByTestId('score-preview')).toBeNull();
    expect(screen.getAllByTestId('score-audition')).toHaveLength(1);
    expect(screen.getByTestId('hex-blind-hidden')).toBeTruthy();
    const hidden = panel.textContent ?? '';
    for (const candidate of CORE_CANDIDATES) {
      expect(hidden.includes(candidate.label)).toBe(false);
      expect(hidden.includes(candidate.id)).toBe(false);
    }
    for (const id of listBlindCatalogueIds()) {
      expect(hidden.includes(id)).toBe(false);
    }
    fireEvent.change(screen.getByTestId('hex-blind-distinct'), { target: { value: 'YES' } });
    fireEvent.change(screen.getByTestId('hex-blind-compose'), { target: { value: 'MAYBE' } });
    fireEvent.click(screen.getByTestId('hex-blind-save-answer'));
    expect(screen.getByTestId('hex-blind-identity').textContent?.length).toBeGreaterThan(0);
    expect(screen.getByTestId('score-preview')).toBeTruthy();
    expect(screen.getAllByTestId('score-audition')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('hex-lab-mode-detail'));
    expect(screen.getByTestId('hexatonic-laboratory-candidate')).toBeTruthy();
    expect(screen.queryByTestId('hex-blind-panel')).toBeNull();
  });
});
