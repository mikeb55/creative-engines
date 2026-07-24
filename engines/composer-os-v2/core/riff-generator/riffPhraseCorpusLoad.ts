/**
 * Phase 1.5 — read-only load of derived phrases.jsonl + audit.csv.
 * No GPX open. No melody-path imports.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  RIFF_PHRASE_CATEGORIES,
  type RiffPhraseCategory,
  type RiffPhraseEntry,
  type RiffPhraseIngestAuditRow,
} from './riffPhraseLibraryTypes';
import {
  validateRiffPhraseEntry,
  validateRiffPhraseIngestAuditRow,
} from './riffPhraseLibraryValidate';

/**
 * Source-tree fallback only. Bundled desktop `__dirname` is `resources/`, where
 * four `..` segments escape the repo (`C:\Dev\data\...`). Prefer
 * {@link resolveRiffPhraseCorpusDerivedRoot}.
 */
export const RIFF_PHRASE_CORPUS_DERIVED_ROOT = path.resolve(
  __dirname,
  '../../../../data/riff-phrase-corpus/derived'
);

const DERIVED_REL = path.join('data', 'riff-phrase-corpus', 'derived');
const PACKAGED_REL = path.join('riff-phrase-corpus', 'derived');

function derivedLooksPresent(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, 'phrases.jsonl')) && fs.existsSync(path.join(dir, 'audit.csv'))
  );
}

/**
 * Resolve derived corpus dir for QA API / IPC.
 * Order: explicit override → env → COMPOSER_OS_REPO_ROOT → packaged resources →
 * walk from cwd/`__dirname` → legacy `__dirname` relatives.
 */
export function resolveRiffPhraseCorpusDerivedRoot(override?: string): string {
  if (override && override.trim()) return path.resolve(override);

  const envDerived = process.env.COMPOSER_OS_RIFF_PHRASE_DERIVED?.trim();
  if (envDerived) {
    const p = path.resolve(envDerived);
    if (derivedLooksPresent(p)) return p;
  }

  const candidates: string[] = [];
  const repoEnv = process.env.COMPOSER_OS_REPO_ROOT?.trim();
  if (repoEnv) candidates.push(path.join(path.resolve(repoEnv), DERIVED_REL));

  const resourcesPath = typeof process.resourcesPath === 'string' ? process.resourcesPath : '';
  if (resourcesPath) {
    candidates.push(path.join(resourcesPath, PACKAGED_REL));
    candidates.push(path.join(resourcesPath, DERIVED_REL));
  }

  for (const start of [process.cwd(), __dirname]) {
    let dir = path.resolve(start);
    for (let i = 0; i < 10; i++) {
      candidates.push(path.join(dir, DERIVED_REL));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  // Unbundled source (4-up) and bundled resources/ next to repo (3-up).
  candidates.push(RIFF_PHRASE_CORPUS_DERIVED_ROOT);
  candidates.push(path.resolve(__dirname, '../../../data/riff-phrase-corpus/derived'));

  for (const c of candidates) {
    if (derivedLooksPresent(c)) return c;
  }

  // Soft-fail path for clear missing-file error message.
  if (repoEnv) return path.join(path.resolve(repoEnv), DERIVED_REL);
  if (resourcesPath) return path.join(resourcesPath, PACKAGED_REL);
  return RIFF_PHRASE_CORPUS_DERIVED_ROOT;
}

export interface RiffPhraseCorpusCategoryStats {
  files: number;
  phrases: number;
  barsIn: number;
  parseOk: number;
  parseFail: number;
  tieFixups: number;
  droppedOrnaments: number;
  meterMismatch: number;
}

export interface RiffPhraseCorpusStats {
  byCategory: Record<string, RiffPhraseCorpusCategoryStats>;
  barCountHist: Record<string, number>;
  startTypeHist: Record<string, number>;
  endTypeHist: Record<string, number>;
  meterMismatchFiles: string[];
  needsReviewCount: number;
  meterQuarantinePhraseCount: number;
  totals: {
    files: number;
    parseOk: number;
    phrases: number;
    phrasesInvalidSkipped: number;
    tieFixups: number;
    droppedOrnaments: number;
    auditPhrasesOutSum: number;
  };
}

export interface RiffPhraseCorpusResponse {
  version: 1;
  ok: boolean;
  error?: string;
  source: {
    phrasesPath: string;
    auditPath: string;
    derivedRoot: string;
    loadedAt: string;
    phrasesExists: boolean;
    auditExists: boolean;
  };
  phrases: RiffPhraseEntry[];
  audit: RiffPhraseIngestAuditRow[];
  stats: RiffPhraseCorpusStats;
}

function emptyCategoryStats(): RiffPhraseCorpusCategoryStats {
  return {
    files: 0,
    phrases: 0,
    barsIn: 0,
    parseOk: 0,
    parseFail: 0,
    tieFixups: 0,
    droppedOrnaments: 0,
    meterMismatch: 0,
  };
}

function parseAuditCsv(text: string): RiffPhraseIngestAuditRow[] {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]!);
  const rows: RiffPhraseIngestAuditRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]!);
    const raw: Record<string, unknown> = {};
    header.forEach((h, idx) => {
      raw[h] = parts[idx] ?? '';
    });
    const coerced = {
      file: String(raw.file ?? ''),
      parseOk: String(raw.parseOk) === 'true',
      trackCount: Number(raw.trackCount) || 0,
      voiceCount: Number(raw.voiceCount) || 0,
      barsIn: Number(raw.barsIn) || 0,
      phrasesOut: Number(raw.phrasesOut) || 0,
      droppedOrnaments: Number(raw.droppedOrnaments) || 0,
      tieFixups: Number(raw.tieFixups) || 0,
      meterMismatch: String(raw.meterMismatch) === 'true',
      hash: String(raw.hash ?? ''),
      notes: raw.notes ? String(raw.notes) : undefined,
    };
    const check = validateRiffPhraseIngestAuditRow(coerced);
    if (check.ok) rows.push(check.row);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (ch === ',' && !inQ) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

function buildStats(
  phrases: RiffPhraseEntry[],
  audit: RiffPhraseIngestAuditRow[]
): RiffPhraseCorpusStats {
  const byCategory: Record<string, RiffPhraseCorpusCategoryStats> = {};
  for (const c of RIFF_PHRASE_CATEGORIES) {
    byCategory[c] = emptyCategoryStats();
  }

  const barCountHist: Record<string, number> = {};
  const startTypeHist: Record<string, number> = {};
  const endTypeHist: Record<string, number> = {};
  const meterMismatchFiles: string[] = [];
  let needsReviewCount = 0;
  let meterQuarantinePhraseCount = 0;

  for (const row of audit) {
    const cat = row.file.split(/[/\\]/)[0] || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = emptyCategoryStats();
    const s = byCategory[cat]!;
    s.files += 1;
    if (row.parseOk) s.parseOk += 1;
    else s.parseFail += 1;
    s.barsIn += row.barsIn;
    s.tieFixups += row.tieFixups;
    s.droppedOrnaments += row.droppedOrnaments;
    if (row.meterMismatch) {
      s.meterMismatch += 1;
      meterMismatchFiles.push(row.file);
    }
  }

  for (const p of phrases) {
    if (!byCategory[p.category]) byCategory[p.category] = emptyCategoryStats();
    byCategory[p.category]!.phrases += 1;
    const bk = String(p.barCount);
    barCountHist[bk] = (barCountHist[bk] ?? 0) + 1;
    startTypeHist[p.phraseStartType] = (startTypeHist[p.phraseStartType] ?? 0) + 1;
    endTypeHist[p.phraseEndType] = (endTypeHist[p.phraseEndType] ?? 0) + 1;
    if (p.curation?.needsReview) {
      needsReviewCount += 1;
      if (
        p.curation.reasons.includes('meter_mismatch_file') ||
        p.curation.reasons.includes('meter_mismatch_phrase')
      ) {
        meterQuarantinePhraseCount += 1;
      }
    }
  }

  const auditPhrasesOutSum = audit.reduce((n, r) => n + r.phrasesOut, 0);

  return {
    byCategory,
    barCountHist,
    startTypeHist,
    endTypeHist,
    meterMismatchFiles,
    needsReviewCount,
    meterQuarantinePhraseCount,
    totals: {
      files: audit.length,
      parseOk: audit.filter((r) => r.parseOk).length,
      phrases: phrases.length,
      phrasesInvalidSkipped: 0,
      tieFixups: audit.reduce((n, r) => n + r.tieFixups, 0),
      droppedOrnaments: audit.reduce((n, r) => n + r.droppedOrnaments, 0),
      auditPhrasesOutSum,
    },
  };
}

/**
 * Load derived corpus for RiffGen QA UI. Soft-fails with ok:false if files missing.
 */
export function loadRiffPhraseCorpus(opts?: { derivedRoot?: string }): RiffPhraseCorpusResponse {
  const derivedRoot = resolveRiffPhraseCorpusDerivedRoot(opts?.derivedRoot);
  const phrasesPath = path.join(derivedRoot, 'phrases.jsonl');
  const auditPath = path.join(derivedRoot, 'audit.csv');
  const phrasesExists = fs.existsSync(phrasesPath);
  const auditExists = fs.existsSync(auditPath);
  const loadedAt = new Date().toISOString();
  const source = {
    phrasesPath,
    auditPath,
    derivedRoot,
    loadedAt,
    phrasesExists,
    auditExists,
  };

  if (!phrasesExists || !auditExists) {
    return {
      version: 1,
      ok: false,
      error: !phrasesExists && !auditExists
        ? 'phrases.jsonl and audit.csv missing — run ingest first'
        : !phrasesExists
          ? 'phrases.jsonl missing'
          : 'audit.csv missing',
      source,
      phrases: [],
      audit: [],
      stats: buildStats([], []),
    };
  }

  const phrases: RiffPhraseEntry[] = [];
  let phrasesInvalidSkipped = 0;
  const rawLines = fs.readFileSync(phrasesPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const line of rawLines) {
    if (!line.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      phrasesInvalidSkipped += 1;
      continue;
    }
    const check = validateRiffPhraseEntry(parsed);
    if (check.ok) phrases.push(check.entry);
    else phrasesInvalidSkipped += 1;
  }

  const audit = parseAuditCsv(fs.readFileSync(auditPath, 'utf8'));
  const stats = buildStats(phrases, audit);
  stats.totals.phrasesInvalidSkipped = phrasesInvalidSkipped;

  return {
    version: 1,
    ok: true,
    source,
    phrases,
    audit,
    stats,
  };
}

export function isRiffPhraseCategoryId(v: string): v is RiffPhraseCategory {
  return (RIFF_PHRASE_CATEGORIES as readonly string[]).includes(v);
}