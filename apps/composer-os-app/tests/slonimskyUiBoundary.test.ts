/**
 * V61 U9 — Slonimsky UI boundary vitest (mapper + lightweight render checks).
 */

import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { SlonimskyUniversalPanel } from '../src/components/SlonimskyUniversalPanel';
import { DEFAULT_SLONIMSKY_MACRO_STATE } from '../src/types/slonimskyMacroState';
import { slonimskyUiExtrasFromAdvanced } from '../src/types/slonimskyAdvancedState';

describe('slonimsky-ui boundary', () => {
  it('sonic_youth shows warning and omits harmonicVoice in payload extras', () => {
    const out = slonimskyUiExtrasFromAdvanced(
      { pinnedCellIds: [], forbiddenCellIds: [] },
      'sonic_youth'
    );
    expect(out.harmonicVoice).toBeUndefined();
    expect(out.styleGenerationContextKeys).toContain('slonimsky:harmonic_voice=sonic_youth_generic');
  });

  it('sonic_youth warning badge renders when selected in universal panel', async () => {
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
    expect(json).toContain('generic voice');
    expect(json).toContain('no dedicated VRB bundle');
  });

  it('SlonimskyAdvancedDrawer is mounted from HomeGenerate', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/pages/HomeGenerate.tsx'), 'utf8');
    expect(src).toContain('SlonimskyAdvancedDrawer');
    expect(src).not.toMatch(/RiffGeneratorPanel[\s\S]*zappaAdvancedOpen/);
  });
});
