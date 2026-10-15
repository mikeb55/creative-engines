/**
 * Hexatonic desktop MusicXML export writes a real file and leaves existing files alone.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateHexatonicPhrase, hexatonicScoreMatchesPhrase, readHexatonicScore } from '../../../engines/composer-os-v2/core/hexatonic';
import {
  hexatonicExportDirectory,
  writeHexatonicDesktopMusicXml,
} from '../electron/hexatonicDesktopExport';
import { pentatonicExportDirectory } from '../electron/pentatonicDesktopExport';

describe('hexatonic desktop MusicXML export', () => {
  it('writes a real file, keeps the pitches, and refuses to overwrite', async () => {
    const documentsDir = mkdtempSync(path.join(tmpdir(), 'hexatonic-export-'));
    try {
      const phrase = generateHexatonicPhrase({ seed: 4, centre: 0, method: 'M-DEG', scalarId: 'hex_major_omit_seventh' });
      const now = new Date('2026-10-15T18:40:00.000Z');
      const written = await writeHexatonicDesktopMusicXml({
        documentsDir,
        xml: phrase.musicXml,
        label: phrase.homeId,
        now,
      });
      expect(existsSync(written.fullPath)).toBe(true);
      expect(statSync(written.fullPath).size).toBe(written.bytes);
      expect(written.fullPath.startsWith(hexatonicExportDirectory(documentsDir))).toBe(true);
      expect(written.fullPath.includes('Pentatonic Engine')).toBe(false);
      const onDisk = readFileSync(written.fullPath, 'utf8');
      expect(onDisk).toBe(phrase.musicXml);
      expect(hexatonicScoreMatchesPhrase(phrase, onDisk)).toBe(true);
      const reading = readHexatonicScore(onDisk);
      expect(reading.words.some((word) => word === 'INSIDE')).toBe(true);
      expect(reading.words.some((word) => word === 'OUTSIDE')).toBe(true);
      expect(reading.words.some((word) => word === 'RETURN')).toBe(true);
      expect(reading.words.some((word) => word.includes('hex_major_omit_seventh'))).toBe(true);
      const original = readFileSync(written.fullPath);
      const again = await writeHexatonicDesktopMusicXml({
        documentsDir,
        xml: phrase.musicXml,
        label: phrase.homeId,
        now,
      });
      expect(again.fullPath).not.toBe(written.fullPath);
      expect(readFileSync(written.fullPath)).toEqual(original);
    } finally {
      rmSync(documentsDir, { recursive: true, force: true });
    }
  });

  it('rejects unsafe labels and does not write into the pentatonic folder', async () => {
    const documentsDir = mkdtempSync(path.join(tmpdir(), 'hexatonic-export-safe-'));
    try {
      const xml = generateHexatonicPhrase({ seed: 1, centre: 0, scalarId: 'hex_minor_primary' }).musicXml;
      await expect(writeHexatonicDesktopMusicXml({ documentsDir, xml, label: '../escape' })).rejects.toThrow(/unsafe path/);
      await expect(writeHexatonicDesktopMusicXml({ documentsDir, xml, label: '/tmp/escape' })).rejects.toThrow(/unsafe path/);
      const planted = path.join(pentatonicExportDirectory(documentsDir), 'planted.musicxml');
      mkdirSync(path.dirname(planted), { recursive: true });
      writeFileSync(planted, 'keep');
      await expect(writeHexatonicDesktopMusicXml({ documentsDir, xml: '', label: 'silence' })).rejects.toThrow(/without notes or rests/);
      expect(readFileSync(planted, 'utf8')).toBe('keep');
      expect(existsSync(path.join(hexatonicExportDirectory(documentsDir), 'planted.musicxml'))).toBe(false);
    } finally {
      rmSync(documentsDir, { recursive: true, force: true });
    }
  });

  it('registers hexatonic IPC without replacing the pentatonic channels', () => {
    const ipc = readFileSync(path.join(__dirname, '../electron/ipcEntry.ts'), 'utf8');
    const api = readFileSync(path.join(__dirname, '../../composer-os-app/src/services/api.ts'), 'utf8');
    expect(ipc).toContain("ipcMain.handle('composer-os-api:hexatonic-write-musicxml'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:hexatonic-project-save'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:hexatonic-project-open'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:hexatonic-open-musescore'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:pentatonic-write-musicxml'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:pentatonic-project-save'");
    expect(ipc).toContain('apiBhlCandidates');
    expect(api).toContain('composer-os-api:hexatonic-project-save');
    expect(api).toContain('composer-os-api:pentatonic-project-save');
    const channels = ipc.match(/ipcMain\.handle\('composer-os-api:[^']+'/g) ?? [];
    const unique = new Set(channels);
    expect(unique.size).toBe(channels.length);
  });
});
