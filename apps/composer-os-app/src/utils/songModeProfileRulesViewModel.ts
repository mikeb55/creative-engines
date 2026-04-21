export type SongModeProfileRuleDiagnosticsUi = {
  styleProfile?: string;
  primarySongwriterStyleId?: string;
  secondarySongwriterStyleId?: string | null;
  authorOverlayId?: string | null;
  classicalOverlayId?: string | null;
  styleFingerprint?: string;
  resolvedRuleIds?: string[];
  songwriterCompProfileId?: string;
  bacharachSongModeRuleBundleId?: string;
  behaviourSourceIds?: string[];
};

export type SongModeProfileRuleRows = {
  profileRows: Array<{ label: string; value: string }>;
  ruleSetRows: Array<{ label: string; value: string }>;
  behaviourSourceRows: Array<{ label: string; value: string }>;
};

function printable(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export function buildSongModeProfileRuleRows(
  diag: SongModeProfileRuleDiagnosticsUi | undefined
): SongModeProfileRuleRows {
  if (!diag) return { profileRows: [], ruleSetRows: [], behaviourSourceRows: [] };
  const profileRows: SongModeProfileRuleRows['profileRows'] = [];
  const ruleSetRows: SongModeProfileRuleRows['ruleSetRows'] = [];
  const behaviourSourceRows: SongModeProfileRuleRows['behaviourSourceRows'] = [];

  const styleProfile = printable(diag.styleProfile);
  const primary = printable(diag.primarySongwriterStyleId);
  const secondary = printable(diag.secondarySongwriterStyleId ?? undefined);
  const author = printable(diag.authorOverlayId ?? undefined);
  const classical = printable(diag.classicalOverlayId ?? undefined);
  const fingerprint = printable(diag.styleFingerprint);
  const compProfile = printable(diag.songwriterCompProfileId);
  const bacharachBundle = printable(diag.bacharachSongModeRuleBundleId);
  const rules = (diag.resolvedRuleIds ?? []).filter((v) => printable(v) != null);
  const behaviourSources = (diag.behaviourSourceIds ?? []).filter((v) => printable(v) != null);

  if (styleProfile) profileRows.push({ label: 'Style profile', value: styleProfile });
  if (primary) profileRows.push({ label: 'Primary songwriter style', value: primary });
  if (secondary) profileRows.push({ label: 'Secondary songwriter style', value: secondary });
  if (author) profileRows.push({ label: 'Author overlay', value: author });
  if (classical) profileRows.push({ label: 'Classical overlay', value: classical });
  if (fingerprint) profileRows.push({ label: 'Style fingerprint', value: fingerprint });

  if (compProfile) ruleSetRows.push({ label: 'Songwriter comp profile', value: compProfile });
  if (bacharachBundle) ruleSetRows.push({ label: 'Bacharach rule bundle', value: bacharachBundle });
  if (rules.length > 0) ruleSetRows.push({ label: 'Resolved rules', value: rules.join(', ') });

  if (behaviourSources.length > 0) {
    behaviourSourceRows.push({ label: 'Active behaviour sources', value: behaviourSources.join(', ') });
  }

  return { profileRows, ruleSetRows, behaviourSourceRows };
}
