/**
 * Writes practice files under Documents/Composer OS Exports/Practice Studio/
 * through the existing desktop save. The browser downloads the same text.
 * Open File and Open in Finder use the existing desktop bridge.
 */

export const PRACTICE_EXPORT_DIR = 'Composer OS Exports/Practice Studio';

export type PracticeWriteResult =
  | { ok: true; mode: 'desktop'; fullPath: string }
  | { ok: true; mode: 'browser'; filename: string }
  | { ok: false; error: string };

function safeName(name: string, extension: string): string {
  const stem = name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'practice';
  return `${stem}.${extension}`;
}

function downloadText(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function writePracticeFile(name: string, extension: 'musicxml' | 'json', contents: string): Promise<PracticeWriteResult> {
  if (!contents.trim()) return { ok: false, error: 'Nothing to export.' };
  const filename = safeName(name, extension);
  const relativePath = `${PRACTICE_EXPORT_DIR}/${filename}`;
  const bridge = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
  if (bridge?.saveExportFile) {
    const saved = await bridge.saveExportFile({ relativePath, contents });
    if (saved?.ok && saved.fullPath) return { ok: true, mode: 'desktop', fullPath: saved.fullPath };
    return { ok: false, error: saved?.error || 'Could not write the practice file.' };
  }
  const mime = extension === 'json' ? 'application/json;charset=utf-8' : 'application/vnd.recordare.musicxml+xml;charset=utf-8';
  downloadText(filename, contents, mime);
  return { ok: true, mode: 'browser', filename };
}

export async function openPracticeFile(fullPath: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!fullPath) return { ok: false, error: 'Open File runs in the Composer OS desktop app after a file has been written.' };
  const open = window.composerOsDesktop?.openFileDefaultApp;
  if (!open) return { ok: false, error: 'Open File runs in the Composer OS desktop app.' };
  const opened = await open(fullPath);
  if (!opened.ok) return { ok: false, error: opened.error || `Could not open ${fullPath}.` };
  return { ok: true };
}

export async function revealPracticeFile(fullPath: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!fullPath) return { ok: false, error: 'Open in Finder runs in the Composer OS desktop app after a file has been written.' };
  const reveal = window.composerOsDesktop?.showItemInFolder;
  if (!reveal) return { ok: false, error: 'Open in Finder runs in the Composer OS desktop app.' };
  const revealed = await reveal(fullPath);
  if (!revealed?.ok) return { ok: false, error: revealed?.error || `Could not reveal ${fullPath}.` };
  return { ok: true };
}
