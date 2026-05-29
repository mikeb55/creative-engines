import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const mockRenderMusicXML = jest.fn();

jest.mock('@stringsync/vexml', () => ({
  DEFAULT_CONFIG: { WIDTH: 520, SHOW_TABS: true, SHOW_STANDARD_NOTATION: true },
  renderMusicXML: (...args) => mockRenderMusicXML(...args),
}));

jest.mock('vexflow', () => ({
  VexFlow: {
    loadFonts: jest.fn(() => Promise.resolve()),
    setFonts: jest.fn(),
  },
}));

import MartinoScorePanel from '../MartinoScorePanel.jsx';

const MINIMAL_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe('MartinoScorePanel', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockRenderMusicXML.mockReset();
    mockRenderMusicXML.mockImplementation(() => ({}));
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('renders "Score unavailable" when xmlString is null', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<MartinoScorePanel xmlString={null} />);
    });
    expect(container.textContent).toContain('Score unavailable');
  });

  it('renders "Score unavailable" when xmlString is empty string', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<MartinoScorePanel xmlString="" />);
    });
    expect(container.textContent).toContain('Score unavailable');
  });

  it('renders container div when xmlString is a valid minimal MusicXML string', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<MartinoScorePanel xmlString={MINIMAL_XML} />);
      await flushPromises();
    });
    expect(container.querySelector('[data-testid="martino-score-container"]')).toBeTruthy();
    expect(mockRenderMusicXML).toHaveBeenCalled();
  });

  it('renders score-error div when vexml throws', async () => {
    mockRenderMusicXML.mockImplementation(() => {
      throw new Error('boom');
    });
    await act(async () => {
      ReactDOM.createRoot(container).render(<MartinoScorePanel xmlString={MINIMAL_XML} />);
      await flushPromises();
    });
    const err = container.querySelector('.score-error');
    expect(err).toBeTruthy();
    expect(err.textContent).toContain('Score render failed: boom');
  });
});
