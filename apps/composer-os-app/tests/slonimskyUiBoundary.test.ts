/**
 * V61 U9 — Slonimsky UI boundary vitest (mapper + lightweight render checks).
 */

import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { SlonimskyUniversalPanel } from '../src/components/SlonimskyUniversalPanel';
import { SlonimskySongModePanel } from '../src/components/slonimsky/SlonimskySongModePanel';
import { DEFAULT_SLONIMSKY_MACRO_STATE } from '../src/types/slonimskyMacroState';
import { slonimskyUiExtrasFromAdvanced } from '../src/types/slonimskyAdvancedState';
import { isConfirmedHarmonicVoiceBundle } from '../src/constants/slonimskyHarmonicVoices';

describe('slonimsky-ui boundary', () => {
  it('sonic_youth passes dedicated harmonicVoice in payload extras', () => {
    const out = slonimskyUiExtrasFromAdvanced(
      { pinnedCellIds: [], forbiddenCellIds: [] },
      'sonic_youth'
    );
    expect(out.harmonicVoice).toBe('sonic_youth');
    expect(isConfirmedHarmonicVoiceBundle('sonic_youth')).toBe(true);
  });

  it('sonic_youth selected in song mode writer panel has no generic warning badge', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        React.createElement(SlonimskySongModePanel, {
          writerId: 'sonic_youth',
          onWriterIdChange: () => undefined,
          state: DEFAULT_SLONIMSKY_MACRO_STATE,
          onChange: () => undefined,
          sectionOverrides: {},
          onSectionOverridesChange: () => undefined,
        })
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain('no dedicated VRB bundle');
    expect(json).not.toContain('⚠ generic voice');
  });

  it('sonic_youth selected in universal panel has no generic warning badge', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        React.createElement(SlonimskyUniversalPanel, {
          state: DEFAULT_SLONIMSKY_MACRO_STATE,
          onChange: () => undefined,
          harmonicVoiceMode: 'song_mode',
          harmonicVoiceId: 'sonic_youth',
          onHarmonicVoiceChange: () => undefined,
        })
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain('no dedicated VRB bundle');
  });

  it('SlonimskyAdvancedDrawer is mounted from HomeGenerate', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/pages/HomeGenerate.tsx'), 'utf8');
    expect(src).toContain('SlonimskyAdvancedDrawer');
    expect(src).not.toMatch(/RiffGeneratorPanel[\s\S]*zappaAdvancedOpen/);
  });
});
