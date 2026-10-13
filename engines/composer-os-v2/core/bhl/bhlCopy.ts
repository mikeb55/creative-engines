/**
 * BHL iteration 1 — byte copy of the source MusicXML.
 * Does not parse, reserialize, stamp provenance, or write notes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { sha256Buffer, sha256File } from './bhlIngest';

/** Album tree stays read-only even if a caller marks it as an output directory. */
export const BHL_ALBUM_ROOT = process.env.WWH_ALBUM_ROOT ?? '/Users/user/Documents/DEVS/ECM-Album-Nov-2027';

export type BhlExportRejectReason = 'overwrites-source' | 'outside-permitted-output' | 'read-only-root';

export class BhlExportRejected extends Error {
  readonly reason: BhlExportRejectReason;

  constructor(reason: BhlExportRejectReason, message: string) {
    super(message);
    this.name = 'BhlExportRejected';
    this.reason = reason;
  }
}

export interface BhlCopyRequest {
  sourcePath: string;
  outputPath: string;
  permittedOutputDir: string;
  readOnlyRoots?: readonly string[];
}

export interface BhlCopyResult {
  sourcePath: string;
  outputPath: string;
  sourceSha256: string;
  outputSha256: string;
  byteLength: number;
}

function canonical(filePath: string): string {
  const resolved = path.resolve(filePath);
  try {
    return fs.realpathSync(resolved);
  } catch {
    const parent = path.dirname(resolved);
    try {
      return path.join(fs.realpathSync(parent), path.basename(resolved));
    } catch {
      return resolved;
    }
  }
}

function isInside(parent: string, child: string): boolean {
  const root = canonical(parent);
  const target = canonical(child);
  if (target === root) return true;
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function assertBhlExportPath(request: BhlCopyRequest): void {
  const source = canonical(request.sourcePath);
  const output = canonical(request.outputPath);
  if (output === source) {
    throw new BhlExportRejected('overwrites-source', `refusing to export over source ${source}`);
  }
  const readOnly = [BHL_ALBUM_ROOT, ...(request.readOnlyRoots ?? [])];
  for (const root of readOnly) {
    if (!root) continue;
    if (isInside(root, output)) {
      throw new BhlExportRejected('read-only-root', `refusing to write inside read-only root ${canonical(root)}`);
    }
  }
  if (!isInside(request.permittedOutputDir, output) || output === canonical(request.permittedOutputDir)) {
    throw new BhlExportRejected(
      'outside-permitted-output',
      `refusing to write ${output} outside ${canonical(request.permittedOutputDir)}`,
    );
  }
}

/** Copy source bytes. Provenance is not inserted. The source file is not opened for write. */
export function copyBhlSourceLossless(request: BhlCopyRequest): BhlCopyResult {
  assertBhlExportPath(request);
  const bytes = fs.readFileSync(request.sourcePath);
  const sourceSha256 = sha256Buffer(bytes);
  const outputPath = canonical(request.outputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);
  const outputSha256 = sha256File(outputPath);
  if (outputSha256 !== sourceSha256) {
    throw new Error(`lossless copy hash mismatch ${outputSha256} != ${sourceSha256}`);
  }
  if (!fs.readFileSync(outputPath).equals(bytes)) {
    throw new Error('lossless copy bytes differ from source');
  }
  return {
    sourcePath: request.sourcePath,
    outputPath,
    sourceSha256,
    outputSha256,
    byteLength: bytes.length,
  };
}
