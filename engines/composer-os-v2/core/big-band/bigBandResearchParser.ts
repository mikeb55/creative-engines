/**
 * Parse BigBandResearch.md into structured rule lists (no prose retention in memory API).
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  BigBandComposerId,
  BigBandEraId,
  ComposerResearchBlock,
  EraResearchBlock,
  ParsedBigBandResearch,
} from './bigBandResearchTypes';

const COMPOSER_HEADINGS: Array<{ re: RegExp; id: BigBandComposerId; name: string }> = [
  { re: /^###\s+Duke Ellington$/i, id: 'ellington', name: 'Duke Ellington' },
  { re: /^###\s+Count Basie$/i, id: 'basie', name: 'Count Basie' },
  { re: /^###\s+Thad Jones$/i, id: 'thad', name: 'Thad Jones' },
  { re: /^###\s+Maria Schneider$/i, id: 'schneider', name: 'Maria Schneider' },
];

const ERA_HEADINGS: Array<{ re: RegExp; id: BigBandEraId; name: string }> = [
  { re: /^###\s+Swing Era\b/i, id: 'swing', name: 'Swing Era' },
  { re: /^###\s+Bebop Big Band/i, id: 'bebop', name: 'Bebop Big Band' },
  { re: /^###\s+Post[-\u2011]bop/i, id: 'post_bop', name: 'Post-bop / Thad Jones era' },
  { re: /^###\s+Contemporary orchestral/i, id: 'contemporary', name: 'Contemporary orchestral jazz' },
];

function stripCitations(line: string): string {
  return line.replace(/\s*\[web:\d+\]/g, '').trim();
}

function isEngineRulesBlock(line: string): boolean {
  const n = line.toLowerCase();
  return (
    n.includes('engine rules') ||
    /^####\s*8\.\s*engine rules/i.test(line) ||
    /^####\s*8\.\s*engine rules/i.test(line)
  );
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
  // Look for ENGINE RULES subsection
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.startsWith('### ') && i > startIdx) break;
    if (raw.startsWith('## ') && i > startIdx) break;
    if (isEngineRulesBlock(raw) || /^####\s*8\./i.test(raw)) {
      i++;
      while (i < lines.length) {
        const L = lines[i];
        if (L.startsWith('###') || L.startsWith('##') || L.startsWith('---')) break;
        if (L.startsWith('####') && !isEngineRulesBlock(L)) break;
        const b = normalizeBullet(L);
        if (b) rules.push(b);
        i++;
      }
      return { rules, endIdx: i };
    }
    i++;
  }
  return { rules, endIdx: startIdx };
}

function parseComposerBlocks(lines: string[]): Partial<Record<BigBandComposerId, ComposerResearchBlock>> {
  const out: Partial<Record<BigBandComposerId, ComposerResearchBlock>> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    for (const h of COMPOSER_HEADINGS) {
      if (h.re.test(line)) {
        const { rules, endIdx } = collectEngineRulesUnderHeading(lines, i);
        out[h.id] = { composerId: h.id, displayName: h.name, engineRuleLines: rules };
        i = endIdx - 1;
        break;
      }
    }
  }
  return out;
}

function parseEraBlocks(lines: string[]): Partial<Record<BigBandEraId, EraResearchBlock>> {
  const out: Partial<Record<BigBandEraId, EraResearchBlock>> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    for (const h of ERA_HEADINGS) {
      if (h.re.test(line)) {
        const { rules, endIdx } = collectEngineRulesUnderHeading(lines, i);
        out[h.id] = { eraId: h.id, displayName: h.name, engineRuleLines: rules };
        i = endIdx - 1;
        break;
      }
    }
  }
  return out;
}

function parseFoundations(lines: string[]): string[] {
  const rules: string[] = [];
  let inSection = false;
  let inEngine = false;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (L.startsWith('## SECTION 3')) {
      inSection = true;
      continue;
    }
    if (inSection && L.startsWith('## SECTION 4')) break;
    if (!inSection) continue;
    if (/ENGINE RULES \(Foundations\)/i.test(L)) {
      inEngine = true;
      continue;
    }
    if (inEngine) {
      if (L.startsWith('## SECTION')) break;
      const b = normalizeBullet(L) ?? normalizeNumberedRule(L);
      if (b) rules.push(b);
    }
  }
  return rules;
}

function parseFunctionalSection(lines: string[], header: RegExp): string[] {
  const rules: string[] = [];
  let capture = false;
  for (const L of lines) {
    if (header.test(L)) {
      capture = true;
      continue;
    }
    if (capture) {
      if (L.startsWith('## SECTION')) break;
      if (L.startsWith('### ') && !header.test(L) && /ENGINE RULES/i.test(L)) break;
      const b = normalizeBullet(L) ?? normalizeNumberedRule(L);
      if (b) rules.push(b);
    }
  }
  return rules;
}

export function parseBigBandResearchMarkdown(raw: string): ParsedBigBandResearch {
  const errors: string[] = [];
  if (!raw || raw.trim().length < 50) {
    return {
      ok: false,
      errors: ['research markdown empty or too short'],
      composers: {},
      eras: {},
      foundations: [],
      functional: { shout: [], riff: [], soli: [] },
      stats: {
        composerRuleLines: 0,
        eraRuleLines: 0,
        foundationLines: 0,
        shoutLines: 0,
        riffLines: 0,
        soliLines: 0,
      },
    };
  }
  if (!raw.includes('SECTION 1') || !raw.includes('ENGINE RULES')) {
    errors.push('missing expected SECTION 1 or ENGINE RULES markers');
  }

  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const composers = parseComposerBlocks(lines);
  const eras = parseEraBlocks(lines);
  const foundations = parseFoundations(lines);
  const shout = parseFunctionalSection(lines, /ENGINE RULES — Shout chorus/i);
  const riff = parseFunctionalSection(lines, /ENGINE RULES — Riff writing/i);
  const soli = parseFunctionalSection(lines, /ENGINE RULES — Soli writing/i);

  const composerRuleLines = Object.values(composers).reduce((a, c) => a + (c?.engineRuleLines.length ?? 0), 0);
  const eraRuleLines = Object.values(eras).reduce((a, e) => a + (e?.engineRuleLines.length ?? 0), 0);

  const ok = errors.length === 0 && composerRuleLines >= 4 && eraRuleLines >= 4 && foundations.length >= 3;

  if (!ok && errors.length === 0) {
    errors.push('parsed rule counts below expected minimum (file may be truncated or malformed)');
  }

  return {
    ok,
    errors,
    composers,
    eras,
    foundations,
    functional: { shout, riff, soli },
    stats: {
      composerRuleLines,
      eraRuleLines,
      foundationLines: foundations.length,
      shoutLines: shout.length,
      riffLines: riff.length,
      soliLines: soli.length,
    },
  };
}

/** Default bundled path: core/big-band/data/BigBandResearch.md */
export function getDefaultBigBandResearchPath(): string {
  return path.join(__dirname, 'data', 'BigBandResearch.md');
}

export function loadBigBandResearchFromPath(filePath: string): ParsedBigBandResearch {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return parseBigBandResearchMarkdown(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errors: [`failed to read research file: ${msg}`],
      composers: {},
      eras: {},
      foundations: [],
      functional: { shout: [], riff: [], soli: [] },
      stats: {
        composerRuleLines: 0,
        eraRuleLines: 0,
        foundationLines: 0,
        shoutLines: 0,
        riffLines: 0,
        soliLines: 0,
      },
    };
  }
}

export function loadBigBandResearchFromEnvOrDefault(): ParsedBigBandResearch {
  const override = process.env.COMPOSER_OS_BIG_BAND_RESEARCH;
  if (override && override.length > 0) {
    return loadBigBandResearchFromPath(override);
  }
  const dir = process.env.COMPOSER_OS_RESEARCH_DIR;
  if (dir && dir.length > 0) {
    const candidate = path.join(dir, 'BigBandResearch.md');
    try {
      if (fs.existsSync(candidate)) {
        return loadBigBandResearchFromPath(candidate);
      }
    } catch {
      /* fall through */
    }
  }
  return loadBigBandResearchFromPath(getDefaultBigBandResearchPath());
}
