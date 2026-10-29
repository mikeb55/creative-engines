/**
 * MORPH M3 IdentityKernel V0.3 — declare + assert only.
 * No transforms, generation, or UI wiring.
 */

import fs from 'node:fs';
import {
  countBars,
  guitarBarsStreamFingerprint,
  sha256File,
  sha256Text,
} from './wwhDualPartTransform';

export type IdentityKernelCell = {
  id: string;
  bars: readonly number[];
  patternId?: string;
};

export type IdentityKernelWindow = {
  from: number;
  to: number;
};

/** Minimal reusable M3 REIMAGINE identity contract. */
export type IdentityKernel = {
  sourcePath: string;
  sourceSha: string;
  mode: 'M3';
  /** Signature motifs (1–5). */
  cells: readonly IdentityKernelCell[];
  anchorBars: readonly number[];
  recognitionWindows: readonly IdentityKernelWindow[];
  returnBars: readonly number[];
  protectedGuitarBars: readonly number[];
  lockBass?: boolean;
};

export type IdentityKernelFingerprints = {
  sourceSha: string;
  barCount: number;
  cells: Record<string, string>;
  anchors: string;
  recognition: string;
  returns: string;
  protected: string;
};

export type IdentityKernelAssertResult =
  | {
      ok: true;
      failures: readonly [];
      fingerprints: IdentityKernelFingerprints;
      requiredProtectedBars: readonly number[];
    }
  | {
      ok: false;
      failures: readonly string[];
      fingerprints: IdentityKernelFingerprints | null;
      requiredProtectedBars: readonly number[];
    };

function sortedUnique(bars: Iterable<number>): number[] {
  return [...new Set(bars)].sort((a, b) => a - b);
}

function failBar(label: string, bar: number, barCount: number): string {
  return `${label}: bar ${bar} out of score (1–${barCount})`;
}

function validateBarsInScore(
  label: string,
  bars: readonly number[],
  barCount: number,
  failures: string[],
): void {
  for (const bar of bars) {
    if (!Number.isInteger(bar) || bar < 1 || bar > barCount) {
      failures.push(failBar(label, bar, barCount));
    }
  }
}

/**
 * Validate declared M3 identity kernel against source MusicXML.
 * Returns deterministic guitar-stream fingerprints and explicit failure strings.
 */
export function assertIdentityKernel(
  sourceXml: string,
  kernel: IdentityKernel,
): IdentityKernelAssertResult {
  const failures: string[] = [];

  if (kernel.mode !== 'M3') {
    failures.push(`mode: expected 'M3', got ${JSON.stringify(kernel.mode)}`);
  }
  if (!kernel.sourcePath || typeof kernel.sourcePath !== 'string') {
    failures.push('sourcePath: required non-empty string');
  }
  if (!kernel.sourceSha || typeof kernel.sourceSha !== 'string') {
    failures.push('sourceSha: required non-empty string');
  }

  let barCount = 0;
  let xmlSha = '';
  try {
    barCount = countBars(sourceXml);
    xmlSha = sha256Text(sourceXml);
  } catch (err) {
    failures.push(`sourceXml: ${err instanceof Error ? err.message : String(err)}`);
    return {
      ok: false,
      failures,
      fingerprints: null,
      requiredProtectedBars: [],
    };
  }

  if (kernel.sourceSha && kernel.sourceSha !== xmlSha) {
    failures.push(
      `sourceSha: mismatch vs sourceXml (declared ${kernel.sourceSha}, actual ${xmlSha})`,
    );
  }

  if (kernel.sourcePath && fs.existsSync(kernel.sourcePath)) {
    try {
      const fileSha = sha256File(kernel.sourcePath);
      if (fileSha !== xmlSha) {
        failures.push(
          `sourcePath: file SHA ${fileSha} ≠ sourceXml SHA ${xmlSha}`,
        );
      }
      if (kernel.sourceSha && fileSha !== kernel.sourceSha) {
        failures.push(
          `sourceSha: mismatch vs sourcePath file (declared ${kernel.sourceSha}, file ${fileSha})`,
        );
      }
    } catch (err) {
      failures.push(
        `sourcePath: cannot hash (${err instanceof Error ? err.message : String(err)})`,
      );
    }
  }

  const cells = kernel.cells ?? [];
  if (cells.length < 1 || cells.length > 5) {
    failures.push(`cells: need 1–5, got ${cells.length}`);
  }

  const cellIds = new Set<string>();
  const cellBarsAll: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const label = `cells[${i}]`;
    if (!cell?.id || typeof cell.id !== 'string') {
      failures.push(`${label}: id required`);
    } else if (cellIds.has(cell.id)) {
      failures.push(`${label}: duplicate id '${cell.id}'`);
    } else {
      cellIds.add(cell.id);
    }
    const bars = cell?.bars ?? [];
    if (!Array.isArray(bars) || bars.length < 1) {
      failures.push(`${label}: bars must be non-empty`);
    } else {
      validateBarsInScore(`${label}.bars`, bars, barCount, failures);
      cellBarsAll.push(...bars);
    }
  }

  const anchorBars = kernel.anchorBars ?? [];
  validateBarsInScore('anchorBars', anchorBars, barCount, failures);

  const windows = kernel.recognitionWindows ?? [];
  if (windows.length < 1) {
    failures.push('recognitionWindows: need ≥1 window');
  }
  const recognitionBars: number[] = [];
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i]!;
    const label = `recognitionWindows[${i}]`;
    if (!w || !Number.isInteger(w.from) || !Number.isInteger(w.to)) {
      failures.push(`${label}: from/to must be integers`);
      continue;
    }
    if (w.from > w.to) {
      failures.push(`${label}: from (${w.from}) > to (${w.to})`);
    }
    if (w.from < 1 || w.from > barCount) {
      failures.push(failBar(`${label}.from`, w.from, barCount));
    }
    if (w.to < 1 || w.to > barCount) {
      failures.push(failBar(`${label}.to`, w.to, barCount));
    }
    if (w.from <= w.to && w.from >= 1 && w.to <= barCount) {
      for (let b = w.from; b <= w.to; b++) recognitionBars.push(b);
    }
  }

  const returnBars = kernel.returnBars ?? [];
  if (returnBars.length < 1) {
    failures.push('returnBars: need ≥1 bar');
  }
  validateBarsInScore('returnBars', returnBars, barCount, failures);

  const protectedGuitarBars = kernel.protectedGuitarBars ?? [];
  validateBarsInScore('protectedGuitarBars', protectedGuitarBars, barCount, failures);

  if (kernel.lockBass !== undefined && typeof kernel.lockBass !== 'boolean') {
    failures.push('lockBass: must be boolean when present');
  }

  const requiredProtectedBars = sortedUnique([...cellBarsAll, ...anchorBars]);
  const protectedSet = new Set(protectedGuitarBars);
  for (const bar of requiredProtectedBars) {
    if (!protectedSet.has(bar)) {
      failures.push(
        `protectedGuitarBars: missing required identity bar ${bar} (cells∪anchorBars)`,
      );
    }
  }

  const cellFingerprints: Record<string, string> = {};
  for (const cell of cells) {
    if (!cell?.id || !cell.bars?.length) continue;
    const inRange = cell.bars.every(
      (b) => Number.isInteger(b) && b >= 1 && b <= barCount,
    );
    if (!inRange) continue;
    cellFingerprints[cell.id] = guitarBarsStreamFingerprint(sourceXml, cell.bars);
  }

  const fingerprints: IdentityKernelFingerprints = {
    sourceSha: xmlSha,
    barCount,
    cells: cellFingerprints,
    anchors: guitarBarsStreamFingerprint(sourceXml, sortedUnique(anchorBars)),
    recognition: guitarBarsStreamFingerprint(sourceXml, sortedUnique(recognitionBars)),
    returns: guitarBarsStreamFingerprint(sourceXml, sortedUnique(returnBars)),
    protected: guitarBarsStreamFingerprint(sourceXml, sortedUnique(protectedGuitarBars)),
  };

  if (failures.length) {
    return {
      ok: false,
      failures,
      fingerprints,
      requiredProtectedBars,
    };
  }

  return {
    ok: true,
    failures: [],
    fingerprints,
    requiredProtectedBars,
  };
}
