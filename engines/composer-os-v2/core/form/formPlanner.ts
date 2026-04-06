/**
 * Phase 19 — Form Layer: deterministic section layouts for golden-path planning.
 * Roles (statement | contrast | development | return) are assigned downstream via planSectionRoles.
 */

export type FormId =
  | 'aaba'
  | 'abac'
  | 'aba'
  | 'ab'
  | 'blues12'
  | 'blues24'
  | 'through3'
  | 'through4'
  | 'through5'
  | 'aab'
  | 'abcb'
  | 'abacab';

export interface FormSection {
  label: string;
  startBar: number;
  length: number;
}

const AABA: FormSection[] = [
  { label: 'A', startBar: 1, length: 8 },
  { label: "A'", startBar: 9, length: 8 },
  { label: 'B', startBar: 17, length: 8 },
  { label: "A''", startBar: 25, length: 8 },
];

export function resolveFormSections(formId: FormId): FormSection[] {
  switch (formId) {
    case 'aaba':
      return [...AABA];
    case 'abac':
      return [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 8 },
        { label: "A'", startBar: 17, length: 8 },
        { label: 'C', startBar: 25, length: 8 },
      ];
    case 'aba':
      return [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 8 },
        { label: "A'", startBar: 17, length: 8 },
      ];
    case 'ab':
      return [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 8 },
      ];
    case 'blues12':
      return [{ label: 'A', startBar: 1, length: 12 }];
    case 'blues24':
      return [
        { label: 'A', startBar: 1, length: 12 },
        { label: "A'", startBar: 13, length: 12 },
      ];
    case 'through3':
      return [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 8 },
        { label: 'C', startBar: 17, length: 8 },
      ];
    case 'through4':
      return [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 8 },
        { label: 'C', startBar: 17, length: 8 },
        { label: 'D', startBar: 25, length: 8 },
      ];
    case 'through5':
      return [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 8 },
        { label: 'C', startBar: 17, length: 8 },
        { label: 'D', startBar: 25, length: 8 },
        { label: 'E', startBar: 33, length: 8 },
      ];
    case 'aab':
      return [
        { label: 'A', startBar: 1, length: 8 },
        { label: "A'", startBar: 9, length: 8 },
        { label: 'B', startBar: 17, length: 8 },
      ];
    case 'abcb':
      return [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 8 },
        { label: 'C', startBar: 17, length: 8 },
        { label: "B'", startBar: 25, length: 8 },
      ];
    case 'abacab':
      return [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 8 },
        { label: "A'", startBar: 17, length: 8 },
        { label: 'C', startBar: 25, length: 8 },
        { label: "A''", startBar: 33, length: 8 },
        { label: "B'", startBar: 41, length: 8 },
      ];
    default:
      return [...AABA];
  }
}
