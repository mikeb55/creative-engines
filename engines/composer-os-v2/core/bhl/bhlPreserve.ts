/**
 * BHL iteration 1 orchestration: ingest locks, copy bytes, verify both.
 */

import fs from 'node:fs';
import { copyBhlSourceLossless, type BhlCopyResult } from './bhlCopy';
import { ingestBhlSource, lockSpecOf } from './bhlIngest';
import type { BhlLockMap, BhlLockReport, BhlSpan } from './bhlTypes';
import { verifyBhlLocks, verifyRecordedSourceSha } from './bhlVerify';

export interface BhlPreserveRequest {
  sourcePath: string;
  outputPath: string;
  permittedOutputDir: string;
  span: BhlSpan;
  protectedGuitarBars?: readonly number[];
  readOnlyRoots?: readonly string[];
  bassPartId?: string;
  guitarPartId?: string;
}

export interface BhlPreserveResult {
  lock: BhlLockMap;
  copy: BhlCopyResult;
  verification: BhlLockReport;
}

export function preserveBhlSource(request: BhlPreserveRequest): BhlPreserveResult {
  const lock = ingestBhlSource(request);
  verifyRecordedSourceSha(request.sourcePath, lock.sourceSha256);
  const copy = copyBhlSourceLossless(request);
  verifyRecordedSourceSha(request.sourcePath, lock.sourceSha256);
  if (copy.sourceSha256 !== lock.sourceSha256 || copy.outputSha256 !== lock.sourceSha256) {
    throw new Error('preserve hash mismatch');
  }
  const sourceXml = fs.readFileSync(request.sourcePath);
  const outputXml = fs.readFileSync(copy.outputPath);
  if (!outputXml.equals(sourceXml)) throw new Error('preserve output bytes differ');
  const verification = verifyBhlLocks(sourceXml.toString('utf8'), outputXml.toString('utf8'), lockSpecOf(lock));
  if (!verification.ok || !verification.reimports) {
    throw new Error(`preserve lock verification failed: ${verification.errors.join('; ')}`);
  }
  return { lock, copy, verification };
}
