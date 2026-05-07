import { getOutputPath, type RhythmOutputEngine } from './outputPaths';

function downloadBlob(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type SaveRhythmExportResult =
  | { ok: true; mode: 'desktop'; displayPath: string }
  | { ok: true; mode: 'browser'; displayPath: string }
  | { ok: false; error: string };

/**
 * Desktop: writes under Documents via IPC. Browser: triggers download (legacy).
 * `displayPath` is suitable for user-facing copy (forward slashes).
 */
export async function saveRhythmExportFile(
  engine: RhythmOutputEngine,
  filename: string,
  xml: string
): Promise<SaveRhythmExportResult> {
  const relativePath = getOutputPath(engine, filename);
  const bridge = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
  if (bridge?.saveExportFile) {
    const res = await bridge.saveExportFile({ relativePath, contents: xml });
    if (res && typeof res === 'object' && 'ok' in res && res.ok) {
      return { ok: true, mode: 'desktop', displayPath: relativePath.replace(/\\/g, '/') };
    }
    const err =
      res && typeof res === 'object' && 'error' in res && typeof (res as { error?: string }).error === 'string'
        ? (res as { error: string }).error
        : 'save failed';
    return { ok: false, error: err };
  }
  downloadBlob(filename, xml);
  return { ok: true, mode: 'browser', displayPath: relativePath.replace(/\\/g, '/') };
}
