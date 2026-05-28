/**
 * Martino Linear generate pipeline.
 *
 * MUSICXML IMPORT CONTRACT (post-generate display):
 * - Result viewer expects GenResult: { success, filepath, productKind, validation, runManifest, error? }
 * - Grid/playback: read XML from filepath via composer-os-api:read-file (desktop) or r.xml
 * - parseXmlToGridData(xml, bpm, timeSig) → { notes, voices, bpm, beatsPerBar, totalBars }
 * - parseXmlToPlaybackSequence(xml, bpm, timeSig) for transport
 * - FretboardPanel: optional FretboardNote[] from grid notes + frets { from, to } for LFV window
 */

import { parseChord } from '@engine/chordParser.js';
import { convert_progression } from '@engine/martinoConvert.js';
import { buildTuneConfig } from '@engine/martinoTuneConfig.js';

/** @typedef {Record<string, unknown>} MartinoBridgeResult */

/**
 * @param {string} text
 */
export function parseMartinoChords(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, error: 'No chords provided.', chords: [] };
  const tokens = raw.split(/[\s|,\n;/]+/).map((t) => t.trim()).filter(Boolean);
  const invalid = [];
  const chords = [];
  for (const t of tokens) {
    const p = parseChord(t);
    if (!p) invalid.push(t);
    else chords.push(t);
  }
  if (invalid.length) {
    return { ok: false, error: `Invalid chord symbol(s): ${invalid.join(', ')}`, chords: [] };
  }
  return { ok: true, error: '', chords };
}

/**
 * @param {string[]} chords
 * @param {'low'|'medium'|'high'} defaultTension
 * @param {Record<number, 'low'|'medium'|'high'>} overrides
 */
export function buildConversionTable(chords, defaultTension = 'low', overrides = {}) {
  const chordList = Array.isArray(chords)
    ? chords
    : parseMartinoChords(typeof chords === 'string' ? chords : '').chords;
  const tensionMap = {};
  chordList.forEach((_, i) => {
    if (overrides[i]) tensionMap[i] = overrides[i];
  });
  return convert_progression(chordList, tensionMap).map((row, i) => ({
    index: i,
    chord: chordList[i],
    minorRoot: row.minorRoot,
    rule: row.bookRule,
    tension: overrides[i] ?? (row.bookRule.includes('dominant') ? defaultTension : '—'),
  }));
}

/**
 * @param {object} params
 */
export function buildMartinoTuneConfig(params) {
  const {
    section,
    chords,
    martinoConfig,
  } = params;
  const tune =
    typeof martinoConfig?.tune === 'string' ? martinoConfig.tune.trim() : '';
  return buildTuneConfig(section, {
    ...martinoConfig,
    ...(tune ? { tune } : {}),
    progression: chords,
  });
}

/**
 * Desktop IPC generate with preflight.
 * @param {Record<string, unknown>} tuneConfig
 */
export async function runMartinoGenerate(tuneConfig) {
  const desktop = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
  if (!desktop?.martino?.generate) {
    return {
      ok: false,
      stderrExcerpt:
        'Martino engine not available. Check that Python 3.8+ is installed and py is on your PATH.',
    };
  }
  return desktop.martino.generate(tuneConfig);
}

/**
 * @param {object} bridgeResult
 * @param {string} xml
 * @param {Array<{index:number,chord:string,minorRoot:string,rule:string,tension:string}>} conversions
 * @param {boolean} explainMode
 */
/** @type {Record<string, { label: string, tooltip: string }>} */
export const MARTINO_RULE_DISPLAY = {
  'minor-direct': {
    label: 'Direct minor',
    tooltip: 'This chord is already minor — used as-is',
  },
  'dominant-p5-above': {
    label: 'Dominant resolves up a fifth',
    tooltip: 'G7 shares its minor centre with the Dm7 before it',
  },
  'minor-of-third-after-dominant': {
    label: 'Minor of the third (post-dominant)',
    tooltip: 'Cmaj7 is heard through its relative Em',
  },
  'relative-minor-maj7-line': {
    label: 'Relative minor',
    tooltip: 'Cmaj7 is heard through its relative Am',
  },
  'relative-minor': {
    label: 'Relative minor',
    tooltip: 'Cmaj7 is heard through its relative Am',
  },
};

/** @param {string} rule */
export function formatMartinoRuleDisplay(rule) {
  const entry = MARTINO_RULE_DISPLAY[rule];
  return entry ? entry.label : rule;
}

/** @param {string} rule */
export function martinoRuleTooltip(rule) {
  const entry = MARTINO_RULE_DISPLAY[rule];
  return entry?.tooltip ?? '';
}

/** @type {Record<string, { label: string, code: string }>} */
export const MARTINO_ACTIVITY_LABELS = {
  A1_LINEAR_CORE: { label: 'Opening Line', code: 'A1 — Linear Core' },
  A2_DIAGONAL_BRIDGE: { label: 'Bridge', code: 'A2 — Diagonal Bridge' },
  A3_PIVOT_CELL: { label: 'Pivot', code: 'A3 — Pivot Cell' },
  A4_ANCHOR_ARP: { label: 'Anchor', code: 'A4 — Anchor Arp' },
  A5_FREE_MIX: { label: 'Free Mix', code: 'A5 — Free Mix' },
};

/** @param {string} activityId */
export function martinoActivityHumanLabel(activityId) {
  return MARTINO_ACTIVITY_LABELS[activityId]?.label ?? activityId.replace(/_/g, ' ');
}

/** @param {string} activityId */
export function martinoActivityCodeTooltip(activityId) {
  return MARTINO_ACTIVITY_LABELS[activityId]?.code ?? activityId;
}

/** @param {string} fp */
function basenameOnly(fp) {
  const p = String(fp || '').replace(/[/\\]+$/, '');
  const li = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return li >= 0 ? p.slice(li + 1) : p;
}

/** @param {string} dir */
function formatDirectionLabel(dir) {
  const d = String(dir || '').trim().toLowerCase();
  if (d === 'ascending') return 'ascending';
  if (d === 'descending') return 'descending';
  if (d === 'pivot') return 'pivot';
  return d || '—';
}

/**
 * @param {Record<string, unknown> | null | undefined} provenance
 * @param {{ tuneName?: string, outputPath?: string }} opts
 */
export function buildMartinoResultSummary(provenance, opts = {}) {
  const plan = Array.isArray(provenance?.phrasePlan) ? provenance.phrasePlan : [];
  const sorted = [...plan].sort((a, b) => Number(a.bar) - Number(b.bar));
  const firstFour = sorted.filter((row) => Number(row.bar) >= 1 && Number(row.bar) <= 4);
  const directionPhrase = firstFour.length
    ? firstFour.map((row) => formatDirectionLabel(String(row.direction_vector ?? ''))).join(' · ')
    : '—';
  const dcrWinner = provenance?.dcr_winner != null ? String(provenance.dcr_winner) : '—';
  const activityIds = [];
  for (const row of sorted) {
    const act = String(row.activity ?? '');
    if (act && !activityIds.includes(act)) activityIds.push(act);
  }
  const activitiesUsed = activityIds.length
    ? activityIds.map((id) => martinoActivityHumanLabel(id)).join(', ')
    : '—';
  const overallRaw = Number(provenance?.martinoGceOverall);
  const overallScore = Number.isFinite(overallRaw) ? (overallRaw * 10).toFixed(1) : '—';
  const gateFailed = provenance?.gce_gate_failed === true;
  const outputPath = String(opts.outputPath ?? provenance?.outputPath ?? '');
  return {
    tuneName: String(opts.tuneName ?? 'Tune').trim() || 'Tune',
    lineCharacter: `${dcrWinner} variant · ${directionPhrase}`,
    activitiesUsed,
    overallScore,
    filename: outputPath ? basenameOnly(outputPath) : '—',
    gateFailed,
    outputDir: outputPath,
  };
}

export function buildExplainLines(bridgeResult, conversions, explainMode) {
  if (!explainMode) return [];
  const lines = [];
  const mapText = String(bridgeResult.activityMapText || '');
  const primary = mapText.match(/PRIMARY_ACTIVITY=([^\n]+)/)?.[1] || 'A1_LINEAR_CORE';
  (Array.isArray(conversions) ? conversions : []).forEach((row, i) => {
    const lfvFlag = Array.isArray(bridgeResult.lfvFlags)
      ? bridgeResult.lfvFlags.some((f) => f.index === i)
      : false;
    lines.push(
      `Bar ${i + 1}: ${row.chord}→${row.minorRoot} · ${primary} · LFV ${lfvFlag ? '⚠ flagged' : '✓'}`
    );
  });
  return lines;
}
