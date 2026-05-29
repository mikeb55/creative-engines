import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

const mockToneStart = jest.fn(() => Promise.resolve());
const mockDrawSchedule = jest.fn((fn) => fn());

jest.mock('tone', () => ({
  start: (...args) => mockToneStart(...args),
  getTransport: () => ({
    scheduleOnce: jest.fn(),
    loop: false,
    loopEnd: 0,
  }),
  now: () => 0,
  Draw: {
    schedule: (...args) => mockDrawSchedule(...args),
  },
}));

const mockInitPlayback = jest.fn(async () => {
  await mockToneStart();
});
const mockPlay = jest.fn(() => Promise.resolve());
const mockStop = jest.fn();

jest.mock('../../../playback/playbackEngine', () => ({
  initPlayback: (...args) => mockInitPlayback(...args),
  play: (...args) => mockPlay(...args),
  stop: (...args) => mockStop(...args),
}));

jest.mock('../../../playback/musicXmlToPlaybackSequence', () => ({
  parseXmlToPlaybackSequence: jest.fn(() => ({
    notes: [{ pitch: 60, startBeat: 0, duration: 1, barIndex: 1 }],
    bpm: 120,
    beatsPerBar: 4,
    totalBars: 1,
  })),
}));

import MartinoAudioPlayer from '../MartinoAudioPlayer.jsx';

const SAMPLE_XML = '<score-partwise><part id="P1"><measure number="1"/></part></score-partwise>';

describe('MartinoAudioPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with controls disabled when xmlString is null', () => {
    const { getByRole, getByText } = render(
      <MartinoAudioPlayer xmlString={null} barTelemetry={null} />
    );
    expect(getByRole('button', { name: /play/i })).toBeDisabled();
    expect(getByText(/no audio available/i)).toBeInTheDocument();
  });

  it('Play button calls Tone.start() then playbackEngine.play()', async () => {
    const { getByRole } = render(<MartinoAudioPlayer xmlString={SAMPLE_XML} barTelemetry={[]} />);
    await act(async () => {
      getByRole('button', { name: /play/i }).click();
    });
    await waitFor(() => expect(mockToneStart).toHaveBeenCalled());
    await waitFor(() => expect(mockInitPlayback).toHaveBeenCalled());
    await waitFor(() => expect(mockPlay).toHaveBeenCalledTimes(1));
  });

  it('Stop button calls playbackEngine.stop()', async () => {
    const { getByRole } = render(<MartinoAudioPlayer xmlString={SAMPLE_XML} barTelemetry={[]} />);
    await act(async () => {
      getByRole('button', { name: /stop/i }).click();
    });
    expect(mockStop).toHaveBeenCalled();
  });

  it('Loop toggle sets looping state passed to play()', async () => {
    const { getByRole } = render(<MartinoAudioPlayer xmlString={SAMPLE_XML} barTelemetry={[]} />);
    await act(async () => {
      getByRole('checkbox', { name: /loop/i }).click();
    });
    await act(async () => {
      getByRole('button', { name: /play/i }).click();
    });
    await waitFor(() =>
      expect(mockPlay).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function),
        expect.objectContaining({ loop: true })
      )
    );
  });

  it('does not create duplicate PolySynth (play called once on double play click)', async () => {
    const { getByRole } = render(<MartinoAudioPlayer xmlString={SAMPLE_XML} barTelemetry={[]} />);
    const playBtn = getByRole('button', { name: /play/i });
    await act(async () => {
      playBtn.click();
    });
    await waitFor(() => expect(mockPlay).toHaveBeenCalledTimes(1));
    expect(playBtn).toBeDisabled();
  });
});
