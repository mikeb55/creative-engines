/**
 * Browser-safe hexatonic project text. Paths stay in hexatonicProjectFile.ts.
 */

import { validateHexatonicProject, type HexatonicProjectV1, type HexatonicProjectValidation } from './hexatonicProject';

export function saveHexatonicProjectText(project: HexatonicProjectV1): { text: string } | { error: string } {
  const checked = validateHexatonicProject(project);
  if (!checked.ok || !checked.project) return { error: checked.errors.join('; ') || 'invalid project' };
  return { text: JSON.stringify(checked.project, null, 2) };
}

export function loadHexatonicProjectText(text: string): HexatonicProjectValidation {
  if (text.includes('\0')) return { ok: false, errors: ['project text is unsafe'] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
  return validateHexatonicProject(parsed);
}

export type { HexatonicProjectV1, HexatonicProjectValidation };
