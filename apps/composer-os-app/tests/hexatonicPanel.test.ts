/**
 * Hexatonic workspace — collection choice, real generation, MusicXML export.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { generateHexatonicPhrase, listHexatonicScalars, listHexatonicWpsPairs } from '@composer-os/core/hexatonic';
import { listPentatonicColourResources } from '@composer-os/core/pentatonic';
import { hashForRoute, routeFromLocation, routeNavLabel } from '../src/router/appRouter';
import { exportHexatonicMusicXml, HEXATONIC_WRITE_MUSICXML_CHANNEL } from '../src/hexatonic/exportHexatonicMusicXml';
import { listHexatonicWorkspacePairs, listHexatonicWorkspaceScalars } from '../src/hexatonic/hexatonicWorkspaceModel';

const xml = '<score-partwise><note><pitch></pitch><rest/></note></score-partwise>';

function findButton(tree: ReturnType<typeof create>, testId: string) {
  return tree.root.findAll((node) => node.props?.['data-testid'] === testId)[0];
}

function textOf(tree: ReturnType<typeof create>): string {
  return JSON.stringify(tree.toJSON());
}

describe('hexatonic route', () => {
  it('is reachable beside the pentatonic page', () => {
    expect(routeFromLocation({ hash: '#/hexatonic', pathname: '/index.html' })).toBe('hexatonic');
    expect(hashForRoute('hexatonic')).toBe('#/hexatonic');
    expect(routeNavLabel('hexatonic')).toBe('Hexatonic');
    expect(routeFromLocation({ hash: '#/pentatonic', pathname: '/hexatonic' })).toBe('pentatonic');
  });
});

describe('hexatonic vocabulary', () => {
  it('lists the 11 scalar collections and 16 WPS pairs without a six-note Ritsu name', () => {
    expect(listHexatonicWorkspaceScalars()).toHaveLength(11);
    expect(listHexatonicWorkspacePairs()).toHaveLength(16);
    expect(listHexatonicScalars()).toHaveLength(11);
    expect(listHexatonicWpsPairs()).toHaveLength(16);
    expect(listPentatonicColourResources()).toHaveLength(20);
    const labels = listHexatonicWorkspaceScalars().map((row) => row.label).join(' ');
    expect(labels).toContain('Western six-note claim');
    expect(labels).not.toMatch(/Ritsu/);
  });
});

describe('exportHexatonicMusicXml', () => {
  it('asks desktop IPC to write the file and reports the saved path', async () => {
    const invokeApi = vi.fn(async () => ({ ok: true, fullPath: '/Users/user/Documents/Composer OS Exports/Hexatonic Engine/out.musicxml' }));
    const download = vi.fn();
    const saved = await exportHexatonicMusicXml({
      xml,
      label: 'hex_major_omit_seventh',
      fileName: 'piece.musicxml',
      invokeApi,
      download,
    });
    expect(invokeApi).toHaveBeenCalledWith(HEXATONIC_WRITE_MUSICXML_CHANNEL, { xml, label: 'hex_major_omit_seventh' });
    expect(download).not.toHaveBeenCalled();
    expect(saved).toEqual({
      mode: 'desktop',
      fullPath: '/Users/user/Documents/Composer OS Exports/Hexatonic Engine/out.musicxml',
    });
  });

  it('surfaces a desktop write failure instead of a silent download', async () => {
    const download = vi.fn();
    await expect(
      exportHexatonicMusicXml({
        xml,
        label: 'A',
        fileName: 'piece',
        invokeApi: async () => ({ ok: false, error: 'unsafe path' }),
        download,
      })
    ).rejects.toThrow(/unsafe path/);
    expect(download).not.toHaveBeenCalled();
  });

  it('keeps the browser download when no desktop bridge is present', async () => {
    const download = vi.fn();
    const saved = await exportHexatonicMusicXml({
      xml,
      label: 'hex_major_omit_seventh',
      fileName: 'piece.musicxml',
      invokeApi: null,
      download,
    });
    expect(download).toHaveBeenCalledWith('piece-hex_major_omit_seventh.musicxml', xml);
    expect(saved).toEqual({ mode: 'browser', filename: 'piece-hex_major_omit_seventh.musicxml' });
  });
});

describe('HexatonicEnginePage', () => {
  it('generates with the production phrase API and separates music from diagnostics', async () => {
    const { HexatonicEnginePage } = await import('../src/hexatonic/HexatonicEnginePage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(HexatonicEnginePage));
    });
    const renderedBefore = textOf(tree);
    expect(renderedBefore).toContain('Major, omit seventh');
    expect(renderedBefore).toContain('C D E F G A');
    expect(renderedBefore).not.toMatch(/Ritsu/);
    await act(async () => {
      findButton(tree, 'hexatonic-generate').props.onClick();
    });
    const rendered = textOf(tree);
    const headless = generateHexatonicPhrase({ seed: 1, centre: 0, method: 'M-DEG', scalarId: 'hex_major_omit_seventh' });
    expect(rendered).toContain('1:inside 2:inside 3:outside 4:outside 5:return 6:return');
    expect(rendered).toContain('INSIDE');
    expect(rendered).toContain('OUTSIDE');
    expect(rendered).toContain('RETURN');
    expect(rendered).toContain('Guitar');
    expect(rendered).toContain('Bass');
    expect(rendered).toContain('artisticApproval: false');
    expect(rendered).toContain('NOT VERIFIED');
    expect(rendered).toContain('Technical diagnostics');
    expect(rendered).toContain('Phrase preview');
    expect(rendered).toContain(headless.provenance);
    expect(rendered).toContain('Not artistically approved');
    expect(rendered).not.toContain('artisticApproval: true');
    expect(rendered).not.toContain('MUSICALLY APPROVED');
  });

  it('exports the generated MusicXML through the desktop channel when the bridge is present', async () => {
    const invokeApi = vi.fn(async () => ({ ok: true, fullPath: '/tmp/hexatonic-out.musicxml' }));
    const previous = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { composerOsDesktop: { invokeApi } };
    const { HexatonicEnginePage } = await import('../src/hexatonic/HexatonicEnginePage');
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(HexatonicEnginePage));
    });
    await act(async () => {
      findButton(tree, 'hexatonic-generate').props.onClick();
    });
    await act(async () => {
      findButton(tree, 'hexatonic-export').props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(invokeApi).toHaveBeenCalledWith(
      HEXATONIC_WRITE_MUSICXML_CHANNEL,
      expect.objectContaining({ label: 'hex_major_omit_seventh' })
    );
    const payload = invokeApi.mock.calls[0]?.[1] as { xml: string };
    expect(payload.xml).toContain('<score-partwise');
    expect(payload.xml).not.toMatch(/<staff-type>\s*tab\s*<\/staff-type>/i);
    expect(textOf(tree)).toContain('/tmp/hexatonic-out.musicxml');
    (globalThis as { window?: unknown }).window = previous;
  });
});
