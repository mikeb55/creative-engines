/**
 * Desktop Hexatonic MusicXML writer.
 * Files land only under Documents/Composer OS Exports/Hexatonic Engine.
 * Existing files are left untouched (`wx`).
 */
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const HEXATONIC_EXPORT_DIR_PARTS = ['Composer OS Exports', 'Hexatonic Engine'] as const;

export function rejectUnsafeHexatonicLabel(label: string): void {
  if (typeof label !== 'string' || label.includes('\0') || label.includes('..') || label.includes('/') || label.includes('\\')) {
    throw new Error('unsafe path');
  }
  if (path.win32.isAbsolute(label) || path.posix.isAbsolute(label)) {
    throw new Error('unsafe path');
  }
}

export function hexatonicExportFileLabel(label: string): string {
  rejectUnsafeHexatonicLabel(label);
  const safe = label.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return safe || 'collection';
}

export function hexatonicExportDirectory(documentsDir: string): string {
  if (!documentsDir || documentsDir.includes('\0')) throw new Error('unsafe path');
  const root = path.resolve(documentsDir);
  const dir = path.resolve(root, ...HEXATONIC_EXPORT_DIR_PARTS);
  const relative = path.relative(root, dir);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('unsafe path');
  return dir;
}

export function assertHexatonicMusicXml(xml: string): void {
  if (!xml || xml.includes('\0')) throw new Error('Refusing to write MusicXML without notes or rests.');
  const score = xml.includes('<score-partwise') || xml.includes('<score-timewise');
  const body = xml.includes('<pitch>') || xml.includes('<rest');
  if (!score || !body) throw new Error('Refusing to write MusicXML without notes or rests.');
}

export async function writeHexatonicDesktopMusicXml(args: {
  documentsDir: string;
  xml: string;
  label: string;
  now?: Date;
}): Promise<{ fullPath: string; bytes: number }> {
  assertHexatonicMusicXml(args.xml);
  const label = hexatonicExportFileLabel(args.label);
  const dir = hexatonicExportDirectory(args.documentsDir);
  await mkdir(dir, { recursive: true });
  const stamp = (args.now ?? new Date()).toISOString().replace(/[:.]/g, '-');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const name = `Hexatonic-${label}-${stamp}${attempt === 0 ? '' : `-${attempt}`}.musicxml`;
    const full = path.resolve(dir, name);
    const relative = path.relative(dir, full);
    if (relative.startsWith('..') || path.isAbsolute(relative) || path.dirname(relative) !== '.') {
      throw new Error('unsafe path');
    }
    try {
      await writeFile(full, args.xml, { encoding: 'utf8', flag: 'wx' });
      const info = await stat(full);
      if (info.size <= 0) throw new Error('MusicXML file is empty.');
      return { fullPath: full, bytes: info.size };
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: string }).code) : '';
      if (code === 'EEXIST') continue;
      throw error;
    }
  }
  throw new Error('Could not find a free MusicXML name.');
}
