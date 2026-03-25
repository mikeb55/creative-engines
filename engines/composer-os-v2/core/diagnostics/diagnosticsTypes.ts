/**
 * Human-readable diagnostics lines for UI.
 */

export type DiagnosticTone = 'positive' | 'neutral' | 'warning';

export interface DiagnosticLine {
  tone: DiagnosticTone;
  message: string;
  code?: string;
}

export interface DiagnosticsBundle {
  lines: DiagnosticLine[];
  summary: string;
}
