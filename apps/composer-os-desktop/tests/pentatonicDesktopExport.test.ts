/**
 * Pentatonic desktop MusicXML export writes a real file and leaves existing files alone.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzePentatonicScore } from '../../../engines/composer-os-v2/core/pentatonic/analyzeScore';
import { importPentatonicScoreFromMusicXml } from '../../../engines/composer-os-v2/core/pentatonic/musicXmlScore';
import { generatePracticeExample } from '../../../engines/composer-os-v2/core/pentatonic/practiceFacade';
import {
  writePentatonicDesktopMusicXml,
  pentatonicExportDirectory,
} from '../electron/pentatonicDesktopExport';

const REST_ONLY = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
<note><rest/><duration>4</duration><voice>1</voice><type>whole</type></note></measure></part></score-partwise>`;

function snapshot(xml: string) {
  const imported = importPentatonicScoreFromMusicXml(xml);
  const analysed = analyzePentatonicScore(xml);
  const region = analysed.regions[0];
  return {
    attacks: imported.events.map((event) => event.soundingAttacks),
    rests: imported.events.map((event) => Boolean(event.melodyRest)),
    metre: imported.events.map((event) => [event.timeBeats, event.timeBeatType]),
    collection: region?.explicitCollection
      ? `${region.explicitCollection.archetypeId}@${region.explicitCollection.referenceNote}`
      : null,
    spelling: imported.events.flatMap((event) => event.melodyNotes ?? []),
  };
}

describe('pentatonic desktop MusicXML export', () => {
  it('writes a real file, reimports the collection, and refuses to overwrite', async () => {
    const documentsDir = mkdtempSync(path.join(tmpdir(), 'pentatonic-export-'));
    try {
      const example = generatePracticeExample({
        fieldId: 'blue_pentatonic',
        centre: 'A',
        motif: 'C D Eb',
        category: 'HOME_CONTINUITY',
        difficulty: 'SPARSE',
        variation: 0,
      });
      const before = snapshot(example.musicXml);
      expect(before.collection).toBe('blue_pentatonic@A');
      expect(before.spelling.some((note) => note.includes('Eb'))).toBe(true);
      expect(before.attacks.flat().length).toBeGreaterThan(0);
      expect(example.musicXml.includes('<rest')).toBe(true);

      const now = new Date('2026-10-15T13:04:05.000Z');
      const written = await writePentatonicDesktopMusicXml({
        documentsDir,
        xml: example.musicXml,
        label: 'A Blue Pentatonic',
        now,
      });
      expect(existsSync(written.fullPath)).toBe(true);
      expect(statSync(written.fullPath).size).toBeGreaterThan(0);
      expect(written.bytes).toBe(statSync(written.fullPath).size);
      expect(written.fullPath.startsWith(pentatonicExportDirectory(documentsDir))).toBe(true);
      const onDisk = readFileSync(written.fullPath, 'utf8');
      expect(onDisk).toBe(example.musicXml);
      expect(onDisk.includes('<score-partwise')).toBe(true);
      expect(snapshot(onDisk)).toEqual(before);

      const original = readFileSync(written.fullPath);
      const again = await writePentatonicDesktopMusicXml({
        documentsDir,
        xml: example.musicXml.replace('blue_pentatonic@A', 'blue_pentatonic@C'),
        label: 'A Blue Pentatonic',
        now,
      });
      expect(again.fullPath).not.toBe(written.fullPath);
      expect(readFileSync(written.fullPath)).toEqual(original);
      expect(readFileSync(again.fullPath, 'utf8').includes('blue_pentatonic@C')).toBe(true);
    } finally {
      rmSync(documentsDir, { recursive: true, force: true });
    }
  });

  it('writes rest-only MusicXML and rejects unsafe labels', async () => {
    const documentsDir = mkdtempSync(path.join(tmpdir(), 'pentatonic-export-rest-'));
    try {
      const written = await writePentatonicDesktopMusicXml({
        documentsDir,
        xml: REST_ONLY,
        label: 'silence',
        now: new Date('2026-10-15T13:04:05.000Z'),
      });
      expect(statSync(written.fullPath).size).toBeGreaterThan(0);
      expect(readFileSync(written.fullPath, 'utf8')).toContain('<rest');

      const escape = path.join(documentsDir, 'escape.musicxml');
      await expect(
        writePentatonicDesktopMusicXml({ documentsDir, xml: REST_ONLY, label: '../escape' })
      ).rejects.toThrow(/unsafe path/);
      await expect(
        writePentatonicDesktopMusicXml({ documentsDir, xml: REST_ONLY, label: '/tmp/escape' })
      ).rejects.toThrow(/unsafe path/);
      expect(existsSync(escape)).toBe(false);

      const planted = path.join(pentatonicExportDirectory(documentsDir), 'planted.musicxml');
      mkdirSync(path.dirname(planted), { recursive: true });
      writeFileSync(planted, 'keep');
      await expect(writePentatonicDesktopMusicXml({ documentsDir, xml: '', label: 'silence' })).rejects.toThrow(
        /without notes or rests/
      );
      expect(readFileSync(planted, 'utf8')).toBe('keep');
    } finally {
      rmSync(documentsDir, { recursive: true, force: true });
    }
  });

  it('keeps the desktop IPC handler on the shared writer', () => {
    const ipc = readFileSync(path.join(__dirname, '../electron/ipcEntry.ts'), 'utf8');
    const preload = readFileSync(path.join(__dirname, '../electron/preload.ts'), 'utf8');
    expect(ipc).toContain("ipcMain.handle('composer-os-api:pentatonic-write-musicxml'");
    expect(ipc).toContain('writePentatonicDesktopMusicXml');
    expect(preload).toContain('invokeApi');
    expect(ipc).not.toContain('Refusing to write MusicXML without pitched notes.');
  });
});
