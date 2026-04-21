import { buildSongModeReadableSummaryLine, renderSongModeAbTable } from '../scripts/eval/readableEvalSummary';

type TestResult = { name: string; ok: boolean };

export function runSongModeAbInspectHarnessTests(): TestResult[] {
  const out: TestResult[] = [];
  const t = (name: string, ok: boolean) => out.push({ name, ok });

  const a = buildSongModeReadableSummaryLine(
    {
      songModeProfileRuleDiagnostics: {
        styleProfile: 'STYLE_ECM',
        primarySongwriterStyleId: 'bacharach',
        resolvedRuleIds: ['r1', 'r2'],
        behaviourSourceIds: ['s1'],
      },
      songModeSectionShapingDiagnostics: {
        densityDeltaBMinusA: 0.2,
        colourDeltaBMinusA: 0.12,
        openingVsReturnDelta: -0.11,
        returnVariationType: 'evolved_comp',
      },
    },
    'A_bacharach'
  );
  const b = buildSongModeReadableSummaryLine(
    {
      songModeProfileRuleDiagnostics: {
        styleProfile: 'STYLE_ECM',
        primarySongwriterStyleId: 'carole_king',
        resolvedRuleIds: ['r3'],
        behaviourSourceIds: ['s2'],
      },
    },
    'B_neutral'
  );
  const table = renderSongModeAbTable([
    { seed: 97000, arm: 'A_bacharach', summaryLine: a },
    { seed: 97000, arm: 'B_neutral', summaryLine: b },
  ]);

  t('songmode ab harness includes both arms in one seed block', table.includes('A_bacharach') && table.includes('B_neutral'));
  t('songmode ab harness output exposes section/profile summaries', table.includes('profile=') && table.includes('openRet='));

  return out;
}
