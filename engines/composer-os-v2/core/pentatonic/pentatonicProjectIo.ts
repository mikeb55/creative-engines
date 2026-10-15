/**
 * Browser-safe project text. File paths stay in pentatonicProjectFile.ts.
 */

import { validatePentatonicProject, type PentatonicProjectV1, type PentatonicProjectValidation } from './pentatonicProject';

export function savePentatonicProjectText(project: PentatonicProjectV1): { text: string } | { error: string } {
  const checked = validatePentatonicProject(project);
  if (!checked.ok || !checked.project) return { error: checked.errors.join('; ') || 'invalid project' };
  return { text: JSON.stringify(checked.project, null, 2) };
}

export function loadPentatonicProjectText(text: string): PentatonicProjectValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
  return validatePentatonicProject(parsed);
}

export type { PentatonicProjectV1, PentatonicProjectValidation };
