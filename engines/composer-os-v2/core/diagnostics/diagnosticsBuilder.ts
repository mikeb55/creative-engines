/**
 * Map validation / readiness signals into short user-facing messages.
 */

import type { DiagnosticLine, DiagnosticsBundle, DiagnosticTone } from './diagnosticsTypes';

function line(tone: DiagnosticTone, message: string, code?: string): DiagnosticLine {
  return { tone, message, code };
}

export interface BuildDiagnosticsInput {
  presetId?: string;
  validationErrors: string[];
  integrityPassed?: boolean;
  behaviourGatesPassed?: boolean;
  readinessRelease?: number;
  readinessMx?: number;
  shareable?: boolean;
}

export function buildDiagnosticsBundle(input: BuildDiagnosticsInput): DiagnosticsBundle {
  const lines: DiagnosticLine[] = [];

  if (input.readinessRelease != null && input.readinessMx != null) {
    const avg = (input.readinessRelease + input.readinessMx) / 2;
    if (avg >= 0.85) lines.push(line('positive', 'Strong export and validation readiness'));
    else if (avg >= 0.65) lines.push(line('neutral', 'Good enough for iteration — some gates could tighten'));
    else lines.push(line('warning', 'Readiness below ideal — review errors before sharing'));
  }

  if (input.shareable === true) {
    lines.push(line('positive', 'Shareable: release + MusicXML gates aligned'));
  } else if (input.shareable === false) {
    lines.push(line('warning', 'Not shareable yet — fix blocking issues'));
  }

  if (input.integrityPassed === false) {
    lines.push(line('warning', 'Score integrity check failed — bar math or symbols may be off'));
  }
  if (input.behaviourGatesPassed === false) {
    lines.push(line('warning', 'Musical behaviour gates flagged an issue (texture, motif, or style)'));
  }

  for (const e of input.validationErrors) {
    const lower = e.toLowerCase();
    if (lower.includes('chorus') && lower.includes('required')) {
      lines.push(line('warning', 'Song form: chorus is required for this mode'));
    } else if (lower.includes('shout') || lower.includes('big band')) {
      lines.push(line('warning', 'Big band: shout or contrast may be weak in the plan'));
    } else if (lower.includes('density')) {
      lines.push(line('warning', 'Density: section may be overloaded or too uniform'));
    } else if (lower.includes('hook')) {
      lines.push(line('warning', 'Hook return or placement needs attention'));
    } else if (lower.includes('contrast')) {
      lines.push(line('warning', 'Section contrast could be stronger'));
    } else if (e.length > 0) {
      lines.push(line('neutral', e.length > 120 ? `${e.slice(0, 117)}…` : e));
    }
  }

  if (input.presetId === 'big_band' && lines.every((l) => !l.message.includes('Big band'))) {
    lines.push(line('neutral', 'Big band plan ready — full ensemble scoring not in this build'));
  }

  const summary =
    lines.length === 0
      ? 'All checks OK'
      : lines.some((l) => l.tone === 'warning')
        ? 'Needs attention'
        : 'Looks good';

  return { lines, summary };
}
