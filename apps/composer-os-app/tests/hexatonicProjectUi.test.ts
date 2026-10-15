/**
 * Hexatonic project reopen restores the stored phrase.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { captureHexatonicProject, generateHexatonicPhrase, hexatonicEventIdentity } from '@composer-os/core/hexatonic';

const holder = vi.hoisted(() => ({ project: null as unknown }));

vi.mock('../src/services/api', () => ({
  api: {
    hexatonicSaveProject: vi.fn(async () => ({ ok: true, path: '/tmp/Hexatonic Projects/maj9-session.hexatonic.json', bytes: 10 })),
    hexatonicOpenProject: vi.fn(async () => ({ ok: true, path: '/tmp/Hexatonic Projects/maj9-session.hexatonic.json', project: holder.project })),
  },
}));

describe('hexatonic project reopen', () => {
  it('restores the saved events and does not replace the diagnostic note', async () => {
    const phrase = generateHexatonicPhrase({ seed: 4, centre: 2, method: 'M-NEAR', wpsId: 'maj9' });
    const captured = captureHexatonicProject({
      id: 'maj9-session',
      family: 'wps-pair',
      wpsId: 'maj9',
      centre: 2,
      seed: 4,
      method: 'M-NEAR',
      phrase,
    });
    if (!captured.project) throw new Error(captured.errors.join('; '));
    captured.project.phrase.bmef = { ...captured.project.phrase.bmef, note: 'STORED-NOT-REGENERATED' };
    holder.project = captured.project;
    const stored = captured.project;
    const { HexatonicEnginePage } = await import('../src/hexatonic/HexatonicEnginePage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(HexatonicEnginePage));
    });
    const path = tree.root.findAll((node) => node.props?.['data-testid'] === 'hexatonic-project-path')[0];
    await act(async () => {
      path.props.onChange({ target: { value: '/tmp/Hexatonic Projects/maj9-session.hexatonic.json' } });
    });
    const open = tree.root.findAll((node) => node.props?.['data-testid'] === 'hexatonic-open-project')[0];
    await act(async () => {
      open.props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain('STORED-NOT-REGENERATED');
    expect(rendered).toContain(hexatonicEventIdentity(stored.phrase));
    expect(rendered).toContain('WPS_VAULT_TONALITIES:maj9');
    expect(rendered).toContain('Restored maj9-session');
  });
});
