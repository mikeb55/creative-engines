import {
  buildEcmReadableSummaryLine,
  buildSongModeReadableSummaryLine,
  renderSongModeAbTable,
} from '../scripts/eval/readableEvalSummary';

type TestResult = { name: string; ok: boolean };

export function runEvalReadableSummaryTests(): TestResult[] {
  const out: TestResult[] = [];
  const t = (name: string, ok: boolean) => out.push({ name, ok });

  const song = buildSongModeReadableSummaryLine(
    {
      songModeDiagnosticsSummary: {
        profile: 'profile=STYLE_ECM primary=bacharach secondary=-',
        rules: 'rules=6 comp=bacharach_core bundle=bacharach_v1',
        sectionShape: 'dB-A=0.2 cB-A=0.1 openRet=-0.1 return=evolved_comp',
        sectionSources: ['OPENING:s1', 'RETURN:s2'],
      },
    },
    'songmode arm=A seed=1'
  );
  t('readable summary songmode line includes profile/rules/shape/src', song.includes('profile=') && song.includes('rules=') && song.includes('src='));

  const ecm = buildEcmReadableSummaryLine({
    seed: 50021,
    totalBars: 24,
    ecmTextureScore: 7.34,
    gapGlobal: 0.61,
    spaceBarsRatio: 0.42,
    doubleDenseRatio: 0.18,
  });
  t('readable summary ecm line includes compact score fields', ecm.includes('score=7.34') && ecm.includes('space=0.42'));

  const table = renderSongModeAbTable([
    { seed: 1, arm: 'A', summaryLine: 's1' },
    { seed: 1, arm: 'B', summaryLine: 's2' },
  ]);
  t('songmode ab table renders header and rows', table.includes('seed\tarm\tsummary') && table.includes('\n1\tA\ts1'));

  return out;
}
