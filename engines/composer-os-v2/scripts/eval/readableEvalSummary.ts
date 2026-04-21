/**
 * Compact human-readable eval summaries across Song Mode / ECM / Wyble.
 * Intended for batch logs and quick A/B inspection (not UI payloads).
 */

type SongModeDiagSummary = {
  profile?: string;
  rules?: string;
  sectionShape?: string;
  sectionSources?: string[];
};

type WybleReceiptLike = {
  wybleConsumptionMode?: string;
  wybleConsumptionSummary?: string;
};

export type EvalManifestLike = {
  styleProfile?: string;
  songModeDiagnosticsSummary?: SongModeDiagSummary;
  songModeProfileRuleDiagnostics?: {
    styleProfile?: string;
    primarySongwriterStyleId?: string;
    resolvedRuleIds?: string[];
    behaviourSourceIds?: string[];
  };
  songModeSectionShapingDiagnostics?: {
    densityDeltaBMinusA?: number;
    colourDeltaBMinusA?: number;
    openingVsReturnDelta?: number;
    returnVariationType?: string;
  };
  wybleConsumptionReceipt?: WybleReceiptLike;
};

function compact(s: string | undefined, max = 80): string {
  if (!s) return '-';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function buildSongModeReadableSummaryLine(manifest: EvalManifestLike, tag: string): string {
  const summary = manifest.songModeDiagnosticsSummary;
  const profile =
    summary?.profile ??
    `profile=${manifest.songModeProfileRuleDiagnostics?.styleProfile ?? manifest.styleProfile ?? '-'}`;
  const rules =
    summary?.rules ??
    `rules=${manifest.songModeProfileRuleDiagnostics?.resolvedRuleIds?.length ?? 0} sources=${manifest.songModeProfileRuleDiagnostics?.behaviourSourceIds?.length ?? 0}`;
  const shape =
    summary?.sectionShape ??
    `dB-A=${manifest.songModeSectionShapingDiagnostics?.densityDeltaBMinusA ?? 'n/a'} cB-A=${manifest.songModeSectionShapingDiagnostics?.colourDeltaBMinusA ?? 'n/a'} openRet=${manifest.songModeSectionShapingDiagnostics?.openingVsReturnDelta ?? 'n/a'} return=${manifest.songModeSectionShapingDiagnostics?.returnVariationType ?? '-'}`;
  const src = summary?.sectionSources?.slice(0, 2).join(', ') ?? '-';
  return `${tag} | ${compact(profile)} | ${compact(rules)} | ${compact(shape)} | src=${compact(src, 60)}`;
}

export function buildEcmReadableSummaryLine(args: {
  seed: number;
  totalBars: number;
  ecmTextureScore: number;
  gapGlobal: number | null;
  spaceBarsRatio: number;
  doubleDenseRatio: number;
}): string {
  return `ecm seed=${args.seed} bars=${args.totalBars} score=${args.ecmTextureScore.toFixed(2)} gap=${
    args.gapGlobal == null ? 'n/a' : args.gapGlobal.toFixed(2)
  } space=${args.spaceBarsRatio.toFixed(2)} dense2=${args.doubleDenseRatio.toFixed(2)}`;
}

export function buildWybleReadableSummaryLine(manifest: EvalManifestLike, tag: string): string {
  const r = manifest.wybleConsumptionReceipt;
  const mode = r?.wybleConsumptionMode ?? 'none';
  const summary = compact(r?.wybleConsumptionSummary, 72);
  return `${tag} | wyble=${mode} | ${summary}`;
}

export type SongModeAbRow = {
  seed: number;
  arm: string;
  summaryLine: string;
};

export function renderSongModeAbTable(rows: SongModeAbRow[]): string {
  const head = 'seed\tarm\tsummary';
  const body = rows.map((r) => `${r.seed}\t${r.arm}\t${r.summaryLine}`);
  return [head, ...body].join('\n');
}
