/**
 * Generate receipt UI helpers — export-integrity badge, mixed-preset badge, XML download.
 */

import type { MixedPresetEcho } from '@composer-os/app-api/appApiTypes';

export type ExportIntegrityBadge = 'pass' | 'fail' | 'pending' | 'unknown';

/**
 * Export-integrity strip badge — decoupled from general generate failure.
 * Pass/fail only when run succeeded; errors and !success → unknown (not fail).
 */
export function resolveExportIntegrityBadge(opts: {
  loading: boolean;
  hasError: boolean;
  success?: boolean;
  exportIntegrityPassed?: boolean;
}): ExportIntegrityBadge {
  if (opts.loading) return 'pending';
  if (opts.hasError) return 'unknown';
  if (opts.success !== true) return 'unknown';
  if (opts.exportIntegrityPassed === true) return 'pass';
  if (opts.exportIntegrityPassed === false) return 'fail';
  return 'unknown';
}

export function hasDownloadableGenerateXml(result: {
  success?: boolean;
  xml?: string;
} | null | undefined): boolean {
  return !!(result?.success && typeof result.xml === 'string' && result.xml.trim().length > 0);
}

export function sanitizeGenerateXmlBasename(raw: string): string {
  return (
    raw
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/^\.+|\.+$/g, '') || 'composition'
  );
}

/** Suggested download filename (with .musicxml extension). */
export function buildGenerateXmlDownloadName(opts: {
  outputLabel?: string;
  filename?: string;
  seed?: number;
}): string {
  const fromFilename = opts.filename?.trim();
  if (fromFilename) {
    const base = fromFilename.replace(/\.(musicxml|xml)$/i, '');
    return `${sanitizeGenerateXmlBasename(base)}.musicxml`;
  }
  const label = opts.outputLabel?.trim();
  if (label) {
    const seedSuffix = opts.seed != null ? `_${opts.seed}` : '';
    return `${sanitizeGenerateXmlBasename(label)}${seedSuffix}.musicxml`;
  }
  const seedSuffix = opts.seed != null ? `_${opts.seed}` : '';
  return `composition${seedSuffix}.musicxml`;
}

export type MixedPresetBadgeView = {
  headline: string;
  rolesLine: string;
  integrityPass: boolean;
};

export function buildMixedPresetBadgeView(echo: MixedPresetEcho): MixedPresetBadgeView {
  const integrityPass = echo.exportIntegrityPassed;
  const headline = `Mixed-preset: ${echo.sections.length} sections — integrity ${integrityPass ? 'pass' : 'fail'}`;
  const roles = [...new Set(echo.sections.map((s) => s.presetRole.replace(/_/g, ' ')))].join(' · ');
  return {
    headline,
    rolesLine: roles,
    integrityPass,
  };
}

/** Trigger browser download of MusicXML (web mode). */
export function triggerBrowserXmlDownload(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}