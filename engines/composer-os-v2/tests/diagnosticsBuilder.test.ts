/**
 * Human-readable diagnostics builder.
 */

import { buildDiagnosticsBundle } from '../core/diagnostics/diagnosticsBuilder';

export function runDiagnosticsBuilderTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const good = buildDiagnosticsBundle({
    validationErrors: [],
    integrityPassed: true,
    behaviourGatesPassed: true,
    readinessRelease: 0.9,
    readinessMx: 0.9,
    shareable: true,
  });
  out.push({
    ok: good.lines.some((l) => l.message.includes('Strong')) && good.summary.length > 0,
    name: 'diagnostics: positive readiness produces friendly line',
  });

  const bad = buildDiagnosticsBundle({
    presetId: 'big_band',
    validationErrors: ['Big band: density overload in shout slice'],
    integrityPassed: true,
    readinessRelease: 0.5,
    readinessMx: 0.5,
    shareable: false,
  });
  out.push({
    ok: bad.lines.some((l) => l.tone === 'warning'),
    name: 'diagnostics: warnings for low readiness and friction',
  });

  const song = buildDiagnosticsBundle({
    validationErrors: ['Song Mode: chorus is required'],
  });
  out.push({
    ok: song.lines.some((l) => l.message.includes('chorus')),
    name: 'diagnostics: maps chorus error to readable hook',
  });

  return out;
}
