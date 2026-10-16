// @vitest-environment jsdom
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const WWH = '/Users/user/Documents/WWH/wrong-turning.musicxml';
const GENERATED = '/Users/user/Downloads/BHL-Composer/scratch/BHL-from-scratch-seed4400-16bars.musicxml';

const isDesktop = vi.hoisted(() => ({ value: true }));
const bhlDefaults = vi.hoisted(() => vi.fn());
const bhlScratch = vi.hoisted(() => vi.fn());
const bhlOpen = vi.hoisted(() => vi.fn());
const openFileDefaultApp = vi.hoisted(() => vi.fn());
const showItemInFolder = vi.hoisted(() => vi.fn());

vi.mock('../src/services/api', () => ({
  isDesktopIpc: () => isDesktop.value,
  api: {
    bhlCatalog: vi.fn(async () => ({ ok: false })),
    bhlDefaults: (...args: unknown[]) => bhlDefaults(...args),
    bhlScratch: (...args: unknown[]) => bhlScratch(...args),
    bhlOpen: (...args: unknown[]) => bhlOpen(...args),
  },
}));

import { BhlComposerPage } from '../src/bhl/BhlComposerPage';

function scratchResult(sourcePath = GENERATED) {
  return {
    ok: true,
    sourcePath,
    xml: '<score-partwise/>',
    span: { from: 1, to: 16 },
    sections: [{ mark: 'A', role: 'statement', from: 1, to: 16 }],
  };
}

async function createScore() {
  fireEvent.change(screen.getByTestId('bhl-mode'), { target: { value: 'scratch' } });
  fireEvent.click(screen.getByTestId('bhl-scratch-create'));
  await waitFor(() => expect(screen.getByTestId('bhl-scratch-path').textContent).toBe(GENERATED));
}

describe('BHL scratch Open File', () => {
  beforeEach(() => {
    isDesktop.value = true;
    bhlOpen.mockReset();
    bhlDefaults.mockReset();
    bhlScratch.mockReset();
    openFileDefaultApp.mockReset();
    showItemInFolder.mockReset();
    bhlDefaults.mockResolvedValue({
      ok: true,
      sourcePath: WWH,
      exportDir: '/tmp/bhl',
      span: { from: 33, to: 40 },
    });
    bhlScratch.mockResolvedValue(scratchResult());
    openFileDefaultApp.mockResolvedValue({ ok: true });
    showItemInFolder.mockResolvedValue({ ok: true });
    window.composerOsDesktop = {
      mode: 'desktop',
      productName: 'Composer OS Desktop',
      openFileDefaultApp,
      showItemInFolder,
    } as Window['composerOsDesktop'];
  });

  it('opens and reveals the generated MusicXML, not the previous WWH import path', async () => {
    render(<BhlComposerPage />);
    await waitFor(() => expect((screen.getByTestId('bhl-source') as HTMLInputElement).value).toBe(WWH));
    expect(screen.queryByTestId('bhl-scratch-open-file')).toBeNull();

    await createScore();
    fireEvent.change(screen.getByTestId('bhl-source'), { target: { value: WWH } });

    fireEvent.click(screen.getByTestId('bhl-scratch-open-file'));
    await waitFor(() => expect(openFileDefaultApp).toHaveBeenCalledWith(GENERATED));
    expect(openFileDefaultApp).not.toHaveBeenCalledWith(WWH);
    expect(bhlOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('bhl-scratch-reveal'));
    await waitFor(() => expect(showItemInFolder).toHaveBeenCalledWith(GENERATED));
    expect(showItemInFolder).not.toHaveBeenCalledWith(WWH);
  });

  it('keeps the generated path when Wrong Turning defaults arrive after create', async () => {
    let releaseDefaults: (value: unknown) => void = () => undefined;
    bhlDefaults.mockReturnValue(new Promise((resolve) => {
      releaseDefaults = resolve;
    }));
    render(<BhlComposerPage />);
    await createScore();
    await act(async () => {
      releaseDefaults({
        ok: true,
        sourcePath: WWH,
        exportDir: '/tmp/bhl-exports',
        span: { from: 33, to: 40 },
      });
      await Promise.resolve();
    });
    expect(screen.getByTestId('bhl-scratch-path').textContent).toBe(GENERATED);
    expect((screen.getByTestId('bhl-source') as HTMLInputElement).value).toBe(GENERATED);
    expect(screen.queryByDisplayValue(WWH)).toBeNull();
  });

  it('reports a missing file and an open failure', async () => {
    render(<BhlComposerPage />);
    await waitFor(() => expect((screen.getByTestId('bhl-source') as HTMLInputElement).value).toBe(WWH));
    await createScore();

    openFileDefaultApp.mockResolvedValueOnce({ ok: false, error: 'File not found: ' + GENERATED });
    fireEvent.click(screen.getByTestId('bhl-scratch-open-file'));
    await waitFor(() => expect(screen.getByTestId('bhl-error').textContent).toContain(`Could not open ${GENERATED}`));
    expect(screen.getByTestId('bhl-error').textContent).toContain('File not found');

    showItemInFolder.mockResolvedValueOnce({ ok: false, error: 'path not found' });
    fireEvent.click(screen.getByTestId('bhl-scratch-reveal'));
    await waitFor(() => expect(screen.getByTestId('bhl-error').textContent).toBe(`File not found: ${GENERATED}`));
  });

  it('says when the desktop bridge is missing', async () => {
    isDesktop.value = false;
    render(<BhlComposerPage />);
    await createScore();
    fireEvent.click(screen.getByTestId('bhl-scratch-open-file'));
    await waitFor(() => expect(screen.getByTestId('bhl-error').textContent).toMatch(/desktop app/));
    fireEvent.click(screen.getByTestId('bhl-scratch-reveal'));
    await waitFor(() => expect(screen.getByTestId('bhl-error').textContent).toMatch(/Finder/));
    expect(openFileDefaultApp).not.toHaveBeenCalled();
    expect(showItemInFolder).not.toHaveBeenCalled();
  });
});

describe('existing file-open IPC', () => {
  const ipc = fs.readFileSync(
    path.resolve(__dirname, '../../composer-os-desktop/electron/ipcEntry.ts'),
    'utf8',
  );

  it('opens with the default app and reveals with Finder after a missing-file check', () => {
    const open = ipc.slice(ipc.indexOf("ipcMain.handle('composer-os-api:open-file-default-app'"));
    expect(open).toContain('shell.openPath');
    expect(open).toContain('File not found:');
    const reveal = ipc.slice(ipc.indexOf("ipcMain.handle('show-item-in-folder'"));
    expect(reveal).toContain('shell.showItemInFolder');
    expect(reveal).toContain("error: 'path not found'");
    expect(reveal.slice(0, reveal.indexOf('});'))).not.toContain('explorer.exe');
  });
});
