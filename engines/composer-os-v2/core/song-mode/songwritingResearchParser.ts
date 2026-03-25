/**
 * Parse Songwriting.md into structured rule lists (bullets only; no prose retention in API).
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  AuthorResearchBlock,
  AuthorRuleId,
  ClassicalResearchBlock,
  ClassicalSongRuleId,
  ParsedSongwritingResearch,
  SongwriterResearchBlock,
  SongwriterRuleId,
} from './songwritingResearchTypes';

const SONGWRITER_HEADINGS: Array<{ re: RegExp; id: SongwriterRuleId; name: string }> = [
  { re: /^###\s+Burt Bacharach$/i, id: 'bacharach', name: 'Burt Bacharach' },
  { re: /^###\s+Stevie Wonder$/i, id: 'stevie_wonder', name: 'Stevie Wonder' },
  { re: /^###\s+The Beatles/i, id: 'beatles', name: 'The Beatles' },
  { re: /^###\s+Joni Mitchell$/i, id: 'joni_mitchell', name: 'Joni Mitchell' },
  { re: /^###\s+Donald Fagen/i, id: 'donald_fagen', name: 'Donald Fagen' },
  { re: /^###\s+Bob Dylan$/i, id: 'bob_dylan', name: 'Bob Dylan' },
  { re: /^###\s+Paul Simon$/i, id: 'paul_simon', name: 'Paul Simon' },
  { re: /^###\s+Jeff Tweedy$/i, id: 'jeff_tweedy', name: 'Jeff Tweedy' },
  { re: /^###\s+Carole King$/i, id: 'carole_king', name: 'Carole King' },
  { re: /^###\s+Smokey Robinson$/i, id: 'smokey_robinson', name: 'Smokey Robinson' },
  { re: /^###\s+Randy Newman$/i, id: 'randy_newman', name: 'Randy Newman' },
  { re: /^###\s+Richard Thompson$/i, id: 'richard_thompson', name: 'Richard Thompson' },
  { re: /^###\s+Max Martin$/i, id: 'max_martin', name: 'Max Martin' },
];

const AUTHOR_HEADINGS: Array<{ re: RegExp; id: AuthorRuleId; name: string }> = [
  { re: /^###\s+Jimmy Webb/i, id: 'jimmy_webb', name: 'Jimmy Webb' },
  { re: /^###\s+Pat Pattison/i, id: 'pat_pattison', name: 'Pat Pattison' },
  { re: /^###\s+Jack Perricone/i, id: 'jack_perricone', name: 'Jack Perricone' },
];

const CLASSICAL_HEADINGS: Array<{ re: RegExp; id: ClassicalSongRuleId; name: string }> = [
  { re: /^###\s+Franz Schubert/i, id: 'schubert', name: 'Franz Schubert' },
  { re: /^###\s+Robert Schumann/i, id: 'schumann', name: 'Robert Schumann' },
  { re: /^###\s+Gabriel Faur/i, id: 'faure', name: 'Gabriel Fauré' },
];

function stripCitations(line: string): string {
  return line.replace(/\s*\[web:\d+\]/g, '').trim();
}

function normalizeBullet(line: string): string | null {
  const t = line.trim();
  if (!t.startsWith('-')) return null;
  const rest = stripCitations(t.slice(1).trim());
  return rest.length > 0 ? rest : null;
}

function normalizeNumberedRule(line: string): string | null {
  const t = line.trim();
  const m = /^(\d+)\.\s+(.+)$/.exec(t);
  if (!m) return null;
  return stripCitations(m[2]).trim() || null;
}

function collectEngineRulesUnderHeading(lines: string[], startIdx: number): { rules: string[]; endIdx: number } {
  const rules: string[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.startsWith('### ') && i > startIdx) break;
    if (raw.startsWith('## ') && i > startIdx) break;
    if (/^####\s+ENGINE RULES/i.test(raw) || /^###\s+ENGINE RULES/i.test(raw)) {
      i++;
      while (i < lines.length) {
        const L = lines[i];
        if (L.startsWith('### ') || L.startsWith('## ') || L.startsWith('---')) break;
        if (L.startsWith('####') && !/^####\s+ENGINE RULES/i.test(L)) break;
        const b = normalizeBullet(L) ?? normalizeNumberedRule(L);
        if (b) rules.push(b);
        i++;
      }
      return { rules, endIdx: i };
    }
    i++;
  }
  return { rules, endIdx: startIdx };
}

function parseSongwriterBlocks(lines: string[]): Partial<Record<SongwriterRuleId, SongwriterResearchBlock>> {
  const out: Partial<Record<SongwriterRuleId, SongwriterResearchBlock>> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    for (const h of SONGWRITER_HEADINGS) {
      if (h.re.test(line)) {
        const { rules, endIdx } = collectEngineRulesUnderHeading(lines, i);
        out[h.id] = { songwriterId: h.id, displayName: h.name, engineRuleLines: rules };
        i = endIdx - 1;
        break;
      }
    }
  }
  return out;
}

function parseAuthorBlocks(lines: string[]): Partial<Record<AuthorRuleId, AuthorResearchBlock>> {
  const out: Partial<Record<AuthorRuleId, AuthorResearchBlock>> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    for (const h of AUTHOR_HEADINGS) {
      if (h.re.test(line)) {
        const { rules, endIdx } = collectEngineRulesUnderHeading(lines, i);
        out[h.id] = { authorId: h.id, displayName: h.name, engineRuleLines: rules };
        i = endIdx - 1;
        break;
      }
    }
  }
  return out;
}

function parseClassicalBlocks(lines: string[]): Partial<Record<ClassicalSongRuleId, ClassicalResearchBlock>> {
  const out: Partial<Record<ClassicalSongRuleId, ClassicalResearchBlock>> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    for (const h of CLASSICAL_HEADINGS) {
      if (h.re.test(line)) {
        const { rules, endIdx } = collectEngineRulesUnderHeading(lines, i);
        out[h.id] = { classicalId: h.id, displayName: h.name, engineRuleLines: rules };
        i = endIdx - 1;
        break;
      }
    }
  }
  return out;
}

function sliceBetweenSectionHeaders(lines: string[], startIdx: number, endIdx: number): string[] {
  return lines.slice(startIdx, endIdx);
}

function findSectionLineIndex(lines: string[], re: RegExp): number {
  const i = lines.findIndex((L) => re.test(L));
  return i;
}

/** First `ENGINE RULES` block in a section slice; stops at next `## SECTION`. */
function parseEngineRulesInRange(sectionLines: string[]): string[] {
  const rules: string[] = [];
  let i = 0;
  while (i < sectionLines.length) {
    const L = sectionLines[i];
    if (/ENGINE RULES/i.test(L)) {
      i++;
      while (i < sectionLines.length) {
        const L2 = sectionLines[i];
        if (L2.startsWith('## SECTION')) break;
        const b = normalizeBullet(L2) ?? normalizeNumberedRule(L2);
        if (b) rules.push(b);
        i++;
      }
      break;
    }
    i++;
  }
  return rules;
}

function parseSection4To7(lines: string[]): {
  hooksAndStructure: string[];
  melodySystems: string[];
  harmonySystems: string[];
  lyricProsody: string[];
} {
  const i4 = findSectionLineIndex(lines, /^## SECTION 4/i);
  const i5 = findSectionLineIndex(lines, /^## SECTION 5/i);
  const i6 = findSectionLineIndex(lines, /^## SECTION 6/i);
  const i7 = findSectionLineIndex(lines, /^## SECTION 7/i);
  const i8 = findSectionLineIndex(lines, /^## SECTION 8/i);
  const hooksAndStructure =
    i4 >= 0 && i5 > i4 ? parseEngineRulesInRange(sliceBetweenSectionHeaders(lines, i4, i5)) : [];
  const melodySystems =
    i5 >= 0 && i6 > i5 ? parseEngineRulesInRange(sliceBetweenSectionHeaders(lines, i5, i6)) : [];
  const harmonySystems =
    i6 >= 0 && i7 > i6 ? parseEngineRulesInRange(sliceBetweenSectionHeaders(lines, i6, i7)) : [];
  const lyricProsody =
    i7 >= 0 && i8 > i7 ? parseEngineRulesInRange(sliceBetweenSectionHeaders(lines, i7, i8)) : [];
  return { hooksAndStructure, melodySystems, harmonySystems, lyricProsody };
}

function parseMinimumViable(lines: string[]): string[] {
  const i9 = findSectionLineIndex(lines, /^## SECTION 9/i);
  if (i9 < 0) return [];
  const rules: string[] = [];
  for (let i = i9 + 1; i < lines.length; i++) {
    const L = lines[i];
    if (L.startsWith('## ') && i > i9) break;
    const b = normalizeBullet(L);
    if (b) rules.push(b);
  }
  return rules;
}

export function parseSongwritingResearchMarkdown(raw: string): ParsedSongwritingResearch {
  const errors: string[] = [];
  if (!raw || raw.trim().length < 80) {
    return {
      ok: false,
      errors: ['research markdown empty or too short'],
      songwriters: {},
      authors: {},
      classical: {},
      hooksAndStructure: [],
      melodySystems: [],
      harmonySystems: [],
      lyricProsody: [],
      minimumViableEngine: [],
      stats: {
        songwriterRuleLines: 0,
        authorRuleLines: 0,
        classicalRuleLines: 0,
        hooksAndStructureLines: 0,
        melodySystemsLines: 0,
        harmonySystemsLines: 0,
        lyricProsodyLines: 0,
        minimumViableLines: 0,
      },
    };
  }
  if (!raw.includes('SECTION 1') || !raw.includes('ENGINE RULES')) {
    errors.push('missing expected SECTION 1 or ENGINE RULES markers');
  }

  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const songwriters = parseSongwriterBlocks(lines);
  const authors = parseAuthorBlocks(lines);
  const classical = parseClassicalBlocks(lines);
  const { hooksAndStructure, melodySystems, harmonySystems, lyricProsody } = parseSection4To7(lines);
  const minimumViableEngine = parseMinimumViable(lines);

  const songwriterRuleLines = Object.values(songwriters).reduce(
    (a, c) => a + (c?.engineRuleLines.length ?? 0),
    0
  );
  const authorRuleLines = Object.values(authors).reduce((a, c) => a + (c?.engineRuleLines.length ?? 0), 0);
  const classicalRuleLines = Object.values(classical).reduce(
    (a, c) => a + (c?.engineRuleLines.length ?? 0),
    0
  );

  const ok =
    errors.length === 0 &&
    songwriterRuleLines >= 12 &&
    authorRuleLines >= 3 &&
    classicalRuleLines >= 3 &&
    hooksAndStructure.length >= 8 &&
    melodySystems.length >= 5 &&
    harmonySystems.length >= 5 &&
    lyricProsody.length >= 5;

  if (!ok && errors.length === 0) {
    errors.push('parsed rule counts below expected minimum (file may be truncated or malformed)');
  }

  return {
    ok,
    errors,
    songwriters,
    authors,
    classical,
    hooksAndStructure,
    melodySystems,
    harmonySystems,
    lyricProsody,
    minimumViableEngine,
    stats: {
      songwriterRuleLines,
      authorRuleLines,
      classicalRuleLines,
      hooksAndStructureLines: hooksAndStructure.length,
      melodySystemsLines: melodySystems.length,
      harmonySystemsLines: harmonySystems.length,
      lyricProsodyLines: lyricProsody.length,
      minimumViableLines: minimumViableEngine.length,
    },
  };
}

export function getDefaultSongwritingResearchPath(): string {
  return path.join(__dirname, 'data', 'Songwriting.md');
}

export function loadSongwritingResearchFromPath(filePath: string): ParsedSongwritingResearch {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return parseSongwritingResearchMarkdown(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errors: [`failed to read research file: ${msg}`],
      songwriters: {},
      authors: {},
      classical: {},
      hooksAndStructure: [],
      melodySystems: [],
      harmonySystems: [],
      lyricProsody: [],
      minimumViableEngine: [],
      stats: {
        songwriterRuleLines: 0,
        authorRuleLines: 0,
        classicalRuleLines: 0,
        hooksAndStructureLines: 0,
        melodySystemsLines: 0,
        harmonySystemsLines: 0,
        lyricProsodyLines: 0,
        minimumViableLines: 0,
      },
    };
  }
}

export function loadSongwritingResearchFromEnvOrDefault(): ParsedSongwritingResearch {
  const override = process.env.COMPOSER_OS_SONGWRITING_RESEARCH;
  const p = override && override.length > 0 ? override : getDefaultSongwritingResearchPath();
  return loadSongwritingResearchFromPath(p);
}
