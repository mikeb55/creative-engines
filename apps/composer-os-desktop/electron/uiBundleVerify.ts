/**
 * Composer OS UI bundle identity verification (filesystem stamp next to index.html).
 * Must match apps/composer-os-app build output.
 */
import * as fs from 'fs';
import * as path from 'path';

export type ComposerOsUiStamp = {
  productId: string;
  productName: string;
  appShellVersion: string;
  buildTimestamp: string;
  gitCommit: string;
  supportedPages: string[];
};

export type UiBundleVerifyOk = {
  ok: true;
  stamp: ComposerOsUiStamp;
  resolvedPath: string;
};

export type UiBundleVerifyFail = {
  ok: false;
  reason: string;
  resolvedPath: string;
  foundProductId?: string;
  foundProductName?: string;
};

export type UiBundleVerifyResult = UiBundleVerifyOk | UiBundleVerifyFail;

const FORBIDDEN_PAGE_NAMES = new Set(['hybrid', 'projects', 'score']);

export function verifyComposerOsUiStamp(raw: unknown): UiBundleVerifyResult {
  if (raw === null || typeof raw !== 'object') {
    return {
      ok: false,
      reason: 'UI stamp file is missing or invalid JSON.',
      resolvedPath: '',
    };
  }
  const o = raw as Record<string, unknown>;
  const productId = o.productId;
  const productName = o.productName;
  const appShellVersion = o.appShellVersion;
  const buildTimestamp = o.buildTimestamp;
  const gitCommit = o.gitCommit;
  const supportedPages = o.supportedPages;

  if (productId !== 'composer-os') {
    return {
      ok: false,
      reason: `Invalid productId in UI bundle stamp (expected composer-os).`,
      resolvedPath: '',
      foundProductId: typeof productId === 'string' ? productId : undefined,
      foundProductName: typeof productName === 'string' ? productName : undefined,
    };
  }
  if (productName !== 'Composer OS') {
    return {
      ok: false,
      reason: `Invalid productName in UI bundle stamp (expected Composer OS).`,
      resolvedPath: '',
      foundProductId: String(productId),
      foundProductName: typeof productName === 'string' ? productName : undefined,
    };
  }
  if (typeof appShellVersion !== 'string' || !appShellVersion.trim()) {
    return {
      ok: false,
      reason: 'UI bundle stamp missing appShellVersion.',
      resolvedPath: '',
      foundProductId: 'composer-os',
    };
  }
  if (typeof buildTimestamp !== 'string' || !buildTimestamp.trim()) {
    return {
      ok: false,
      reason: 'UI bundle stamp missing buildTimestamp.',
      resolvedPath: '',
      foundProductId: 'composer-os',
    };
  }
  if (typeof gitCommit !== 'string') {
    return {
      ok: false,
      reason: 'UI bundle stamp gitCommit must be a string.',
      resolvedPath: '',
      foundProductId: 'composer-os',
    };
  }
  if (!Array.isArray(supportedPages) || supportedPages.length === 0) {
    return {
      ok: false,
      reason: 'UI bundle stamp supportedPages must be a non-empty array.',
      resolvedPath: '',
      foundProductId: 'composer-os',
    };
  }
  for (const p of supportedPages) {
    if (typeof p !== 'string' || !p.trim()) {
      return {
        ok: false,
        reason: 'UI bundle stamp supportedPages must contain only non-empty strings.',
        resolvedPath: '',
        foundProductId: 'composer-os',
      };
    }
    const norm = p.trim().toLowerCase();
    if (FORBIDDEN_PAGE_NAMES.has(norm)) {
      return {
        ok: false,
        reason: `Forbidden legacy page "${p.trim()}" listed in UI bundle stamp (Hybrid / Projects / Score are not Composer OS).`,
        resolvedPath: '',
        foundProductId: 'composer-os',
      };
    }
  }

  const stamp: ComposerOsUiStamp = {
    productId: 'composer-os',
    productName: 'Composer OS',
    appShellVersion,
    buildTimestamp,
    gitCommit,
    supportedPages: supportedPages.map((s) => (typeof s === 'string' ? s.trim() : '')),
  };
  return { ok: true, stamp, resolvedPath: '' };
}

export function readUiBundleStampFile(uiDir: string): unknown | null {
  const stampPath = path.join(uiDir, 'composer-os-ui-stamp.json');
  if (!fs.existsSync(stampPath)) return null;
  try {
    const text = fs.readFileSync(stampPath, 'utf-8');
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function verifyUiBundleAtPath(uiDir: string): UiBundleVerifyResult {
  const resolvedPath = path.resolve(uiDir);
  if (!fs.existsSync(resolvedPath)) {
    return {
      ok: false,
      reason: `UI directory does not exist: ${resolvedPath}`,
      resolvedPath,
    };
  }
  const raw = readUiBundleStampFile(resolvedPath);
  if (raw === null) {
    return {
      ok: false,
      reason: 'composer-os-ui-stamp.json is missing or unreadable (stale or wrong UI bundle).',
      resolvedPath,
    };
  }
  const result = verifyComposerOsUiStamp(raw);
  if (!result.ok) {
    return {
      ...result,
      resolvedPath,
    };
  }
  return { ok: true, stamp: result.stamp, resolvedPath };
}
