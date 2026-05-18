/**
 * Pure helpers for VRB composer tooltip text (tests + title fallback).
 */

import type { SqComposerOption } from './sqToBbWorkflowUi';

export function formatVrbTooltipTitle(option: SqComposerOption): string {
  if (!option.description) return option.label;
  const family = option.family ? ` · ${option.family}` : '';
  const sigma = option.sigma > 0 ? ` · σ ${option.sigma}` : '';
  return `${option.label}${family}${sigma} — ${option.description}`;
}

export function vrbTooltipBodyLines(option: SqComposerOption): {
  label: string;
  familyTag: string | null;
  sigmaLabel: string | null;
  description: string;
} {
  return {
    label: option.label,
    familyTag: option.family,
    sigmaLabel: option.sigma > 0 ? `σ ${option.sigma}` : null,
    description: option.description,
  };
}
