/**
 * Eval-only: derive per-section / per-phrase diagnostic rows from existing manifest JSON
 * (`songModeSectionShapingDiagnostics`, rhythm overlays, Fagen diagnostics, motif summary).
 * Does not change manifests — read-only parsing for CLI reports.
 */

export interface SectionShapingEvalRow {
  section: string;
  phraseType: string;
  cadenceBar: string;
  anticipationCount: string;
  motifTransform: string;
}

function str(v: unknown): string {
  if (v == null) return '-';
  if (typeof v === 'string') return v.length ? v : '-';
  if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
  return '-';
}

function readMotifTransform(j: Record<string, unknown>): string {
  const m = j.motifDevelopmentSummary;
  if (!m || typeof m !== 'object' || Array.isArray(m)) {
    const vt = j.variationType;
    return typeof vt === 'string' && vt.length ? vt : '-';
  }
  const o = m as Record<string, unknown>;
  const ts = o.transformationSummary;
  if (Array.isArray(ts)) {
    const parts = ts.filter((x): x is string => typeof x === 'string');
    if (parts.length) return parts.join('; ').slice(0, 160);
  }
  const vt = o.variationType;
  return typeof vt === 'string' && vt.length ? vt : '-';
}

function readFagen(j: Record<string, unknown>): Record<string, unknown> | null {
  const fd = j.fagenKeysCompMusicalDiagnostics;
  return fd && typeof fd === 'object' && !Array.isArray(fd) ? (fd as Record<string, unknown>) : null;
}

function phraseOverlayForIndex(j: Record<string, unknown>, phraseIndex: number): {
  phraseType: string;
  anticipationCount: number;
} {
  const arr = j.songModeRhythmOverlayByPhrase;
  if (!Array.isArray(arr)) return { phraseType: '-', anticipationCount: 0 };
  const row = arr.find(
    (x) => x && typeof x === 'object' && (x as Record<string, unknown>).phraseIndex === phraseIndex
  ) as Record<string, unknown> | undefined;
  if (!row) return { phraseType: '-', anticipationCount: 0 };
  const summary = typeof row.rhythmIntentSummary === 'string' ? row.rhythmIntentSummary.trim() : '';
  const ri = row.rhythmIntent;
  let phraseType = summary;
  if (!phraseType && ri && typeof ri === 'object' && !Array.isArray(ri)) {
    const r = ri as Record<string, unknown>;
    const parts = [r.entryBias, r.groupingBias, r.densityShape].filter(
      (x) => typeof x === 'string'
    ) as string[];
    phraseType = parts.join('/');
  }
  const overlays = row.appliedOverlays;
  let n = Array.isArray(overlays) ? overlays.length : 0;
  if (ri && typeof ri === 'object' && !Array.isArray(ri) && (ri as Record<string, unknown>).entryBias === 'late') {
    n += 1;
  }
  return { phraseType: phraseType || '-', anticipationCount: n };
}

function sectionLabels(j: Record<string, unknown>): string[] {
  const ss = j.songSectionSummary;
  if (Array.isArray(ss) && ss.length > 0) {
    const lab = ss.filter((x): x is string => typeof x === 'string');
    if (lab.length) return lab;
  }
  return ['opening_a', 'bridge_b', 'return_a_prime', 'closing'];
}

function cadenceBarForRow(
  sectionLower: string,
  rowIndex: number,
  pivot: number | null,
  totalRows: number
): string {
  if (pivot == null) return '-';
  const isReturnSlot =
    sectionLower.includes('return') ||
    sectionLower.includes('a_prime') ||
    rowIndex === Math.min(2, totalRows - 1);
  if (isReturnSlot) return String(pivot);
  return '-';
}

/**
 * Build rows aligned to form sections / phrase indices using only manifest JSON fields.
 */
export function extractSectionShapingEvalRowsFromManifestRoot(j: Record<string, unknown>): SectionShapingEvalRow[] {
  const labels = sectionLabels(j);
  const n = Math.max(labels.length, 4);
  const fd = readFagen(j);
  const patternFam = typeof fd?.rhythmPatternFamily === 'string' ? fd.rhythmPatternFamily : '';
  const sig = fd?.signatureMoment;
  let pivot: number | null = null;
  if (sig && typeof sig === 'object' && !Array.isArray(sig)) {
    const s = sig as Record<string, unknown>;
    if (s.applied === true && typeof s.pivotBar === 'number') pivot = s.pivotBar;
  }

  const motif = readMotifTransform(j);

  const rows: SectionShapingEvalRow[] = [];
  for (let i = 0; i < n; i++) {
    const section = labels[i] ?? `phrase_${i}`;
    const { phraseType: phRaw, anticipationCount: antN } = phraseOverlayForIndex(j, i);
    let phraseType = phRaw;
    if (phraseType === '-' && patternFam) phraseType = patternFam;

    const secLow = section.toLowerCase();
    const cad = cadenceBarForRow(secLow, i, pivot, n);

    rows.push({
      section,
      phraseType,
      cadenceBar: cad,
      anticipationCount: String(antN),
      /** Global run-level motif line (repeated per section so A/B columns align row-by-row). */
      motifTransform: motif,
    });
  }
  return rows;
}

function aggregateShapingLine(j: Record<string, unknown>): string {
  const d = j.songModeSectionShapingDiagnostics;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return '_no `songModeSectionShapingDiagnostics`_';
  const o = d as Record<string, unknown>;
  const parts = [
    `dB-A=${str(o.densityDeltaBMinusA)}`,
    `cB-A=${str(o.colourDeltaBMinusA)}`,
    `openRet=${str(o.openingVsReturnDelta)}`,
    `returnVar=${str(o.returnVariationType)}`,
    `slices=${Array.isArray(o.contributingSlices) ? (o.contributingSlices as unknown[]).length : 0}`,
  ];
  return parts.join(' ');
}

export function formatSectionShapingTableMarkdown(armLabel: string, seed: number, j: Record<string, unknown>): string {
  const agg = aggregateShapingLine(j);
  const rows = extractSectionShapingEvalRowsFromManifestRoot(j);
  const lines: string[] = [
    `#### ${armLabel} (seed ${seed})`,
    '',
    `_aggregate:_ ${agg}`,
    '',
    '| section | phraseType | cadenceBar | anticipationCount | motifTransform |',
    '|---------|------------|------------|-------------------|----------------|',
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.section} | ${r.phraseType} | ${r.cadenceBar} | ${r.anticipationCount} | ${r.motifTransform} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

function parseManifestRoot(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    return j && typeof j === 'object' && !Array.isArray(j) ? j : null;
  } catch {
    return null;
  }
}

/**
 * Wide comparison table: same section column, A/B columns field-by-field (aligned for diff).
 */
export function formatSectionShapingAbWideMarkdown(args: {
  seed: number;
  labelA: string;
  rawA: string | null;
  labelB: string;
  rawB: string | null;
}): string {
  const { seed, labelA, labelB, rawA, rawB } = args;
  const ja = parseManifestRoot(rawA);
  const jb = parseManifestRoot(rawB);
  if (!ja && !jb) {
    return `### Seed ${seed} — section shaping diagnostics\n\n_no manifests for ${labelA} / ${labelB}._\n\n`;
  }

  const aggA = ja ? aggregateShapingLine(ja) : '—';
  const aggB = jb ? aggregateShapingLine(jb) : '—';

  const rowsA = ja ? extractSectionShapingEvalRowsFromManifestRoot(ja) : [];
  const rowsB = jb ? extractSectionShapingEvalRowsFromManifestRoot(jb) : [];

  const keys = [...new Set([...rowsA.map((r) => r.section), ...rowsB.map((r) => r.section)])];
  if (keys.length === 0) {
    keys.push('opening_a', 'bridge_b', 'return_a_prime', 'closing');
  }

  const mapA = new Map(rowsA.map((r) => [r.section, r]));
  const mapB = new Map(rowsB.map((r) => [r.section, r]));

  const lines: string[] = [
    `### Seed ${seed} — songModeSectionShapingDiagnostics (A/B)`,
    '',
    '| field | aggregate |',
    '|-------|-----------|',
    `| ${labelA} | ${aggA} |`,
    `| ${labelB} | ${aggB} |`,
    '',
    `| section | ${labelA} phraseType | ${labelB} phraseType | ${labelA} cadenceBar | ${labelB} cadenceBar | ${labelA} anticipationCount | ${labelB} anticipationCount | ${labelA} motifTransform | ${labelB} motifTransform |`,
    '|---------|------------------|------------------|----------------|----------------|----------------------|----------------------|----------------------|----------------------|',
  ];

  for (const sec of keys) {
    const a = mapA.get(sec);
    const b = mapB.get(sec);
    lines.push(
      `| ${sec} | ${a?.phraseType ?? '—'} | ${b?.phraseType ?? '—'} | ${a?.cadenceBar ?? '—'} | ${b?.cadenceBar ?? '—'} | ${a?.anticipationCount ?? '—'} | ${b?.anticipationCount ?? '—'} | ${a?.motifTransform ?? '—'} | ${b?.motifTransform ?? '—'} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function buildBatchSectionShapingAbMarkdown(args: {
  seeds: number[];
  rows: Array<{ seed: number; arm: string; manifestRaw: string | null }>;
  armA: string;
  armB: string;
  labelA?: string;
  labelB?: string;
}): string {
  const { seeds, rows, armA, armB } = args;
  const labelA = args.labelA ?? armA;
  const labelB = args.labelB ?? armB;

  const blocks: string[] = [
    '## Section shaping diagnostics (manifest JSON)',
    '',
    'Per-section rows derive from `songModeRhythmOverlayByPhrase`, `fagenKeysCompMusicalDiagnostics`, `motifDevelopmentSummary` / `variationType`, and cadence pivot when present. Aggregate line echoes `songModeSectionShapingDiagnostics`.',
    '',
  ];

  for (const seed of seeds) {
    const ra = rows.find((r) => r.seed === seed && r.arm === armA);
    const rb = rows.find((r) => r.seed === seed && r.arm === armB);
    blocks.push(
      formatSectionShapingAbWideMarkdown({
        seed,
        labelA,
        labelB,
        rawA: ra?.manifestRaw ?? null,
        rawB: rb?.manifestRaw ?? null,
      })
    );
  }

  return blocks.join('\n');
}
