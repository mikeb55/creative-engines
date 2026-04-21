import { buildSongModeProfileRuleRows, type SongModeProfileRuleDiagnosticsUi } from './songModeProfileRulesViewModel';
import { buildSongModeSectionSourceRows } from './songModeSectionSourcesViewModel';

type SongModeShapeUi = {
  densityDeltaBMinusA?: number | null;
  colourDeltaBMinusA?: number | null;
  openingVsReturnDelta?: number | null;
  returnVariationType?: string | null;
  returnVariationSummary?: string | null;
};

type SongModeRunUi = {
  label: string;
  summaryLine?: string;
  profile?: SongModeProfileRuleDiagnosticsUi;
  shape?: SongModeShapeUi;
  sectionDescriptors?: Array<{
    sliceId: string;
    densityBiasByRole?: Partial<Record<'OPENING' | 'BRIDGE_LIFT' | 'RETURN' | 'WHOLE' | 'OUTRO', number>>;
    registerBiasByRole?: Partial<Record<'OPENING' | 'BRIDGE_LIFT' | 'RETURN' | 'WHOLE' | 'OUTRO', number>>;
    harmonicColourBiasByRole?: Partial<Record<'OPENING' | 'BRIDGE_LIFT' | 'RETURN' | 'WHOLE' | 'OUTRO', number>>;
    returnVariationType?: string;
  }>;
};

function fmt(v: number | null | undefined): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return '-';
  return `${v >= 0 ? '+' : ''}${v.toFixed(3)}`;
}

export function buildSongModeCompareInsights(a: SongModeRunUi, b: SongModeRunUi): string[] {
  const lines: string[] = [];
  const ad = a.shape?.densityDeltaBMinusA;
  const bd = b.shape?.densityDeltaBMinusA;
  if (typeof ad === 'number' && typeof bd === 'number' && Math.abs(ad - bd) >= 0.03) {
    lines.push(`${bd > ad ? b.label : a.label} shows stronger B-vs-A density contrast.`);
  }
  const ao = Math.abs(a.shape?.openingVsReturnDelta ?? 0);
  const bo = Math.abs(b.shape?.openingVsReturnDelta ?? 0);
  if (Math.abs(ao - bo) >= 0.05) {
    lines.push(`${bo > ao ? b.label : a.label} shows clearer opening-vs-return separation.`);
  }
  const arv = a.shape?.returnVariationType ?? '';
  const brv = b.shape?.returnVariationType ?? '';
  if (arv !== brv && (arv || brv)) {
    lines.push(`Return behavior differs: ${a.label}=${arv || '-'} vs ${b.label}=${brv || '-'}.`);
  }
  const as = new Set((a.profile?.behaviourSourceIds ?? []).filter((x) => !!x));
  const bs = new Set((b.profile?.behaviourSourceIds ?? []).filter((x) => !!x));
  if (as.size !== bs.size) {
    lines.push(`${bs.size > as.size ? b.label : a.label} uses a broader behaviour-source mix.`);
  }
  if (lines.length === 0) lines.push('Runs are broadly similar on core contrast/return/source cues.');
  return lines;
}

export function buildSongModeCompareCardRows(run: SongModeRunUi): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (run.summaryLine) rows.push({ label: 'Summary', value: run.summaryLine });
  const shape = run.shape;
  if (shape) {
    rows.push({ label: 'densityDeltaBMinusA', value: fmt(shape.densityDeltaBMinusA) });
    rows.push({ label: 'colourDeltaBMinusA', value: fmt(shape.colourDeltaBMinusA) });
    rows.push({ label: 'openingVsReturnDelta', value: fmt(shape.openingVsReturnDelta) });
    rows.push({ label: 'returnVariationType', value: shape.returnVariationType ?? '-' });
    if (shape.returnVariationSummary) rows.push({ label: 'returnVariationSummary', value: shape.returnVariationSummary });
  }
  const profileRows = buildSongModeProfileRuleRows(run.profile);
  rows.push(...profileRows.profileRows, ...profileRows.ruleSetRows, ...profileRows.behaviourSourceRows);
  const sectionRows = buildSongModeSectionSourceRows(run.sectionDescriptors);
  if (sectionRows.length > 0) {
    rows.push({
      label: 'Section source/slate cues',
      value: sectionRows.map((r) => `${r.sectionLabel}: ${r.sources.join('|')} [${r.tags.join('|')}]`).join(' ; '),
    });
  }
  return rows;
}
