/**
 * Parse / import outcomes for reference intelligence.
 */

import type { ReferencePiece } from './referencePieceTypes';

export interface ReferenceImportResult {
  ok: boolean;
  piece?: ReferencePiece;
  errors: string[];
  /** Non-fatal issues (partial import). */
  warnings: string[];
}

export function emptyImportFailure(errors: string[], warnings: string[] = []): ReferenceImportResult {
  return { ok: false, errors, warnings };
}

export function importSuccess(piece: ReferencePiece, warnings: string[] = []): ReferenceImportResult {
  return { ok: true, piece, errors: [], warnings };
}
