/**
 * Central path system — single source of truth for all engine outputs.
 * Eliminates scattered paths, last_export.txt, and path guessing.
 */

import * as path from 'path';
import * as fs from 'fs';

export const ROOT = path.resolve(__dirname, '..', '..');

export const PATHS = {
  outputs: path.join(ROOT, 'outputs'),
  baseline: path.join(ROOT, 'outputs', 'baseline'),
  wyble: path.join(ROOT, 'outputs', 'wyble'),
  counterpoint: path.join(ROOT, 'outputs', 'counterpoint'),
  ellington: path.join(ROOT, 'outputs', 'ellington'),
};

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
