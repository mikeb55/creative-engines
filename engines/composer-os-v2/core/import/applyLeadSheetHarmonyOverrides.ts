/**
 * V97 — per-bar user harmony overrides on leadsheet import timeline (advisory MIDI path).
 */

import { normalizeChordToken } from '../harmony/chordProgressionParser';
import {
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  type MosaicImportTimeline,
} from './mosaicImportTimeline';

export type LeadSheetHarmonyProvenanceBar = 'inferred-advisory' | 'user-override' | 'explicit';

export type LeadSheetHarmonyOverridesByBar = Record<number, string>;

export function sanitizeLeadSheetHarmonyOverridesByBar(
  raw: LeadSheetHarmonyOverridesByBar | undefined,
  maxBar: number
): LeadSheetHarmonyOverridesByBar | undefined {
  if (!raw || maxBar < 1) return undefined;
  const out: LeadSheetHarmonyOverridesByBar = {};
  for (const [key, value] of Object.entries(raw)) {
    const bar = Number(key);
    if (!Number.isInteger(bar) || bar < 1 || bar > maxBar) continue;
    if (typeof value !== 'string') continue;
    const symbol = normalizeChordToken(value.trim());
    if (!symbol) continue;
    out[bar] = symbol;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function applyLeadSheetHarmonyOverrides(
  timeline: MosaicImportTimeline,
  overridesByBar: LeadSheetHarmonyOverridesByBar
): MosaicImportTimeline {
  const sanitized = sanitizeLeadSheetHarmonyOverridesByBar(overridesByBar, timeline.bars);
  if (!sanitized) return timeline;

  const byBar = new Map(timeline.harmonyByBar.map((h) => [h.bar, { ...h }]));
  for (const [bar, symbol] of Object.entries(sanitized)) {
    const barNum = Number(bar);
    byBar.set(barNum, {
      bar: barNum,
      chordSymbol: symbol,
      confidence: IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
      fieldOrigin: 'user-override',
    });
  }

  const harmonyByBar = Array.from(byBar.values()).sort((a, b) => a.bar - b.bar);
  return { ...timeline, harmonyByBar };
}

export function buildLeadSheetHarmonyDisplayByBar(timeline: MosaicImportTimeline): {
  confidenceByBar: number[];
  provenanceByBar: LeadSheetHarmonyProvenanceBar[];
} {
  const byBar = new Map(timeline.harmonyByBar.map((h) => [h.bar, h]));
  const confidenceByBar: number[] = [];
  const provenanceByBar: LeadSheetHarmonyProvenanceBar[] = [];

  for (let bar = 1; bar <= timeline.bars; bar++) {
    const entry = byBar.get(bar);
    if (entry?.fieldOrigin === 'user-override') {
      provenanceByBar.push('user-override');
      confidenceByBar.push(entry.confidence);
      continue;
    }
    if (timeline.sourceFormat === 'midi') {
      provenanceByBar.push('inferred-advisory');
      confidenceByBar.push(entry?.confidence ?? 0);
      continue;
    }
    if (entry?.fieldOrigin === 'explicit') {
      provenanceByBar.push('explicit');
      confidenceByBar.push(entry.confidence);
      continue;
    }
    provenanceByBar.push('explicit');
    confidenceByBar.push(entry?.confidence ?? 0);
  }

  return { confidenceByBar, provenanceByBar };
}
