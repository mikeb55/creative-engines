/**
 * Provenance report for one compiled plan.
 */

import type { CompiledPerformance } from './compilePerformancePlan';
import type { ExecutionReceipt, PerformancePlan } from './performancePlanTypes';
import type { SourceIndex } from './sourceIndexAdapter';

function guitarUseLines(receipt: ExecutionReceipt): string {
  const rows = receipt.sourceMap.filter((row) => row.player === 'guitar');
  if (!rows.length) return 'Guitar bar uses: none';
  const label = (use: ExecutionReceipt['sourceMap'][number]['use']): string => {
    if (use === 'chord_melody') return 'existing chord melody';
    if (use === 'none') return 'performer-directed or tacet';
    return 'original guitar';
  };
  const runs: string[] = [];
  let start = rows[0]!.outputBar;
  let end = start;
  let use = rows[0]!.use;
  const flush = (): void => {
    runs.push(start === end ? `${label(use)} ${start}` : `${label(use)} ${start}–${end}`);
  };
  for (const row of rows.slice(1)) {
    if (row.use === use && row.outputBar === end + 1) end = row.outputBar;
    else {
      flush();
      start = row.outputBar;
      end = row.outputBar;
      use = row.use;
    }
  }
  flush();
  return `Guitar bar uses: ${runs.join('; ')}`;
}

export function describePlan(index: SourceIndex, plan: PerformancePlan, compiled: CompiledPerformance): string {
  const receipt = compiled.receipt;
  const primary = receipt.sourceMap.filter((row) => row.player === 'guitar' && row.use === 'primary');
  const open = receipt.materials.filter((row) => row.status === 'PERFORMER_UNREALIZED');
  const rests = receipt.materials.filter((row) => row.status === 'REST_REALIZED');
  return [
    `# ${plan.id}`,
    '',
    `Compiler: \`${receipt.compilerVersion}\``,
    `Source SHA-256: \`${receipt.sourceSha256}\``,
    `Plan SHA-256: \`${receipt.planSha256}\``,
    `Score: ${index.title} · ${index.measures.length} source bars`,
    `Playback status: ${receipt.playbackStatus}`,
    '',
    '## Sections',
    '',
    ...receipt.sections.map(
      (section) =>
        `- \`${section.id}\` output bars ${section.firstOutputBar}–${section.firstOutputBar + section.barCount - 1} (${section.barCount}) duration ${section.durationQ.n}/${section.durationQ.d}${
          section.cueTimes.length ? ` cues ${section.cueTimes.map((cue) => cue.cueId).join(', ')}` : ''
        }`
    ),
    '',
    '## Materials',
    '',
    ...receipt.materials.map((row) => `- \`${row.sectionId}\` ${row.player}: ${row.status}`),
    '',
    `Primary guitar bars realised: ${primary.length}`,
    `Chord-melody guitar bars: ${receipt.sourceMap.filter((row) => row.player === 'guitar' && row.use === 'chord_melody').length}`,
    guitarUseLines(receipt),
    `Performer-unrealised lanes: ${open.length}`,
    `Tacet lanes: ${rests.length}`,
    '',
    '## Products',
    '',
    ...Object.entries(receipt.products).map(([name, product]) => `- ${name}: ${product.bars} bars · ${product.sectionIds.join(', ')}`),
    '',
    '## Warnings',
    '',
    ...(receipt.warnings.length ? receipt.warnings.map((warning) => `- ${warning.code} \`${warning.sectionId}\`: ${warning.message}`) : ['- none']),
    '',
    '## Notes',
    '',
    ...plan.notes.map((note) => `- ${note}`),
    '',
  ].join('\n');
}
