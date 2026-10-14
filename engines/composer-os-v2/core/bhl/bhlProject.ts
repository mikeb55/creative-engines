/**
 * BHL Batch B — versioned project files on disk.
 * Component state is not the store.
 */

import fs from 'node:fs';
import path from 'node:path';
import { sha256Buffer } from './bhlIngest';
import type { BhlSpan } from './bhlTypes';
import type { BhlWorldId } from './bhlWorlds';

export const BHL_PROJECT_FORMAT = 'bhl-project';
export const BHL_PROJECT_VERSION = 1;

export interface BhlProjectCandidate {
  id: string;
  seed: number;
  label: string;
  parentId: string | null;
  settings: Record<string, unknown>;
  xml: string;
  xmlSha256: string;
  evidenceSummary: Record<string, unknown>;
  notes: string;
  decision: string;
}

export interface BhlProjectV1 {
  format: typeof BHL_PROJECT_FORMAT;
  version: typeof BHL_PROJECT_VERSION;
  id: string;
  title: string;
  savedAt: string;
  notes: string;
  mode: 'import' | 'scratch';
  source: {
    path: string | null;
    sha256: string;
    /** Present for a from-scratch score so reopen does not need the album. */
    xml?: string;
  };
  span: BhlSpan;
  world: BhlWorldId | null;
  settings: Record<string, unknown>;
  candidates: BhlProjectCandidate[];
  selectedCandidateId: string | null;
}

export interface BhlProjectValidation {
  ok: boolean;
  errors: string[];
  project?: BhlProjectV1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireString(row: Record<string, unknown>, key: string, errors: string[], label: string): string {
  const value = row[key];
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label}.${key} must be a non-empty string`);
    return '';
  }
  return value;
}

export function validateBhlProject(raw: unknown): BhlProjectValidation {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['project must be an object'] };
  if (raw.format !== BHL_PROJECT_FORMAT) errors.push('format must be bhl-project');
  if (raw.version !== BHL_PROJECT_VERSION) errors.push(`version must be ${BHL_PROJECT_VERSION}`);
  const id = requireString(raw, 'id', errors, 'project');
  const title = requireString(raw, 'title', errors, 'project');
  const savedAt = requireString(raw, 'savedAt', errors, 'project');
  if (raw.mode !== 'import' && raw.mode !== 'scratch') errors.push('mode must be import or scratch');
  if (!isRecord(raw.source)) errors.push('source must be an object');
  else if (typeof raw.source.sha256 !== 'string' || raw.source.sha256.length < 32) errors.push('source.sha256 is missing');
  if (!isRecord(raw.span)) errors.push('span must be { from, to }');
  else if (!Number.isInteger(raw.span.from) || !Number.isInteger(raw.span.to) || Number(raw.span.from) < 1 || Number(raw.span.to) < Number(raw.span.from)) {
    errors.push('span bars are invalid');
  }
  if (raw.world !== null && (typeof raw.world !== 'string' || !['A', 'B', 'C', 'D', 'E', 'F'].includes(raw.world))) {
    errors.push('world must be A–F or null');
  }
  if (!isRecord(raw.settings)) errors.push('settings must be an object');
  if (!Array.isArray(raw.candidates)) errors.push('candidates must be a list');
  const candidates: BhlProjectCandidate[] = [];
  if (Array.isArray(raw.candidates)) {
    raw.candidates.forEach((item, index) => {
      if (!isRecord(item)) {
        errors.push(`candidates[${index}] must be an object`);
        return;
      }
      const candidateId = requireString(item, 'id', errors, `candidates[${index}]`);
      const xml = requireString(item, 'xml', errors, `candidates[${index}]`);
      if (xml && !xml.includes('<score-partwise') && !xml.includes('<score-timewise')) {
        errors.push(`candidates[${index}].xml is not MusicXML`);
      }
      if (!Number.isInteger(item.seed)) errors.push(`candidates[${index}].seed must be an integer`);
      if (typeof item.xmlSha256 === 'string' && xml) {
        const live = sha256Buffer(Buffer.from(xml, 'utf8'));
        if (live !== item.xmlSha256) errors.push(`candidates[${index}] xml does not match xmlSha256`);
      } else errors.push(`candidates[${index}].xmlSha256 is missing`);
      if (!isRecord(item.settings) || !isRecord(item.evidenceSummary)) {
        errors.push(`candidates[${index}] settings and evidenceSummary must be objects`);
      }
      if (errors.length) return;
      candidates.push({
        id: candidateId,
        seed: item.seed as number,
        label: typeof item.label === 'string' ? item.label : candidateId,
        parentId: typeof item.parentId === 'string' ? item.parentId : null,
        settings: item.settings as Record<string, unknown>,
        xml,
        xmlSha256: item.xmlSha256 as string,
        evidenceSummary: item.evidenceSummary as Record<string, unknown>,
        notes: typeof item.notes === 'string' ? item.notes : '',
        decision: typeof item.decision === 'string' ? item.decision : '',
      });
    });
  }
  if (raw.selectedCandidateId != null && typeof raw.selectedCandidateId !== 'string') {
    errors.push('selectedCandidateId must be a string or null');
  }
  if (errors.length) return { ok: false, errors };
  const project: BhlProjectV1 = {
    format: BHL_PROJECT_FORMAT,
    version: BHL_PROJECT_VERSION,
    id,
    title,
    savedAt,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    mode: raw.mode as 'import' | 'scratch',
    source: {
      path: isRecord(raw.source) && typeof raw.source.path === 'string' ? raw.source.path : null,
      sha256: (raw.source as { sha256: string }).sha256,
      ...(isRecord(raw.source) && typeof raw.source.xml === 'string' ? { xml: raw.source.xml } : {}),
    },
    span: { from: (raw.span as { from: number }).from, to: (raw.span as { to: number }).to },
    world: (raw.world as BhlWorldId | null) ?? null,
    settings: raw.settings as Record<string, unknown>,
    candidates,
    selectedCandidateId: typeof raw.selectedCandidateId === 'string' ? raw.selectedCandidateId : null,
  };
  return { ok: true, errors: [], project };
}

export function saveBhlProject(filePath: string, project: BhlProjectV1, overwrite = false): { path: string; bytes: number } {
  const checked = validateBhlProject(project);
  if (!checked.ok || !checked.project) throw new Error(checked.errors.join('; ') || 'invalid project');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && !overwrite) {
    throw new Error(`project already exists: ${filePath}`);
  }
  const body = JSON.stringify(checked.project, null, 2);
  fs.writeFileSync(filePath, body, { flag: overwrite ? 'w' : 'wx' });
  return { path: filePath, bytes: Buffer.byteLength(body) };
}

export function loadBhlProject(filePath: string): BhlProjectValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
  return validateBhlProject(parsed);
}
