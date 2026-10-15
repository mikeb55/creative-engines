/**
 * Pentatonic Export MusicXML: desktop IPC writes a path; browser keeps the download.
 */
import { describe, expect, it, vi } from 'vitest';
import { exportPentatonicMusicXml, PENTATONIC_WRITE_MUSICXML_CHANNEL } from '../src/pentatonic/exportPentatonicMusicXml';

const xml = '<score-partwise><note><pitch></pitch><rest/></note></score-partwise>';

describe('exportPentatonicMusicXml', () => {
  it('asks desktop IPC to write the file and reports the saved path', async () => {
    const invokeApi = vi.fn(async () => ({ ok: true, fullPath: '/Users/user/Documents/Composer OS Exports/Pentatonic Engine/out.musicxml' }));
    const download = vi.fn();
    const saved = await exportPentatonicMusicXml({
      xml,
      label: 'M-DEG',
      fileName: 'piece.musicxml',
      invokeApi,
      download,
    });
    expect(invokeApi).toHaveBeenCalledWith(PENTATONIC_WRITE_MUSICXML_CHANNEL, { xml, label: 'M-DEG' });
    expect(download).not.toHaveBeenCalled();
    expect(saved).toEqual({
      mode: 'desktop',
      fullPath: '/Users/user/Documents/Composer OS Exports/Pentatonic Engine/out.musicxml',
    });
  });

  it('surfaces a desktop write failure instead of a silent download', async () => {
    const download = vi.fn();
    await expect(
      exportPentatonicMusicXml({
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
    const saved = await exportPentatonicMusicXml({
      xml,
      label: 'M-DEG',
      fileName: 'piece.musicxml',
      invokeApi: null,
      download,
    });
    expect(download).toHaveBeenCalledWith('piece-M-DEG.musicxml', xml);
    expect(saved).toEqual({ mode: 'browser', filename: 'piece-M-DEG.musicxml' });
  });
});
