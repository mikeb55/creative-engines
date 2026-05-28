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
  return buildTuneConfig(section, {
    ...martinoConfig,
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
