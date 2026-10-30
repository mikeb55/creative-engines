/**
 * Node-only Songwriting.md filesystem loaders.
 * Browser / in-memory callers must inject ParsedSongwritingResearch (see createDefaultSongwritingResearch).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  createDefaultSongwritingResearch,
  parseSongwritingResearchMarkdown,
} from './songwritingResearchParser';
import type { ParsedSongwritingResearch } from './songwritingResearchTypes';

export function getDefaultSongwritingResearchPath(): string {
  return path.join(__dirname, 'data', 'Songwriting.md');
}

export function loadSongwritingResearchFromPath(filePath: string): ParsedSongwritingResearch {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[songwritingResearch] failed to read ${filePath}: ${msg}; using default songwriting rules`);
    return createDefaultSongwritingResearch();
  }
  try {
    const parsed = parseSongwritingResearchMarkdown(raw);
    if (!parsed.ok) {
      console.warn(
        `[songwritingResearch] parse quality check failed for ${filePath}; using default songwriting rules`
      );
      return createDefaultSongwritingResearch();
    }
    return parsed;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[songwritingResearch] parse threw (${filePath}): ${msg}; using default songwriting rules`);
    return createDefaultSongwritingResearch();
  }
}

export function loadSongwritingResearchFromEnvOrDefault(): ParsedSongwritingResearch {
  const override = process.env.COMPOSER_OS_SONGWRITING_RESEARCH;
  if (override && override.length > 0) {
    return loadSongwritingResearchFromPath(override);
  }
  const dir = process.env.COMPOSER_OS_RESEARCH_DIR;
  if (dir && dir.length > 0) {
    const candidate = path.join(dir, 'Songwriting.md');
    try {
      if (fs.existsSync(candidate)) {
        return loadSongwritingResearchFromPath(candidate);
      }
    } catch {
      /* fall through */
    }
  }
  return loadSongwritingResearchFromPath(getDefaultSongwritingResearchPath());
}
