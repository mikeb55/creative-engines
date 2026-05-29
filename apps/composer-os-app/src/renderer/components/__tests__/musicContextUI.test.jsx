import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import {
  SharedMusicContextToggle,
} from '../SharedMusicContextToggle.jsx';

const MOCK_CONTEXT = {
  schemaVersion: '1.0',
  seed: 1,
  presetId: 'riff_generator',
  key: { root: 'D', mode: 'minor' },
  meter: { beats: 4, beatType: 4 },
  bpm: 100,
  totalBars: 2,
  harmony: { bars: ['Dm7', 'G7'], checksum: 'abc', source: 'generated' },
  receipts: [],
};

function ToggleHarness({ initialContext = null, initialActive = false }) {
  const [sharedMusicContext] = useState(initialContext);
  const [active, setActive] = useState(initialActive);
  return (
    <SharedMusicContextToggle
      sharedMusicContext={sharedMusicContext}
      active={active}
      onToggle={() => setActive((v) => !v)}
    />
  );
}

describe('SharedMusicContextToggle', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  it('sharedMusicContext null on initial render — toggle not visible', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<ToggleHarness initialContext={null} />);
    });
    expect(container.querySelector('[data-testid="shared-music-context-toggle"]')).toBeNull();
  });

  it('"Use shared context" button not visible when sharedMusicContext is null', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<ToggleHarness />);
    });
    expect(container.textContent).not.toContain('Use shared context');
  });

  it('"Use shared context" button visible when sharedMusicContext is set', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<ToggleHarness initialContext={MOCK_CONTEXT} />);
    });
    expect(container.textContent).toContain('Use shared context');
  });

  it('clicking button toggles active state', async () => {
    await act(async () => {
      ReactDOM.createRoot(container).render(<ToggleHarness initialContext={MOCK_CONTEXT} />);
    });
    const btn = container.querySelector('[data-testid="shared-music-context-toggle"]');
    expect(btn).toBeTruthy();
    expect(container.textContent).toContain('Use shared context');
    await act(async () => {
      btn.click();
    });
    expect(container.textContent).toContain('✓ Using shared context');
    await act(async () => {
      btn.click();
    });
    expect(container.textContent).toContain('Use shared context');
  });
});
