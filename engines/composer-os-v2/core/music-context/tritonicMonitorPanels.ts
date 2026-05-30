/**
 * V1.5p9 — MusicContext → Tritonic Harmonic Float + Melodic Trace monitor.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { MusicContext } from './musicContextTypes';
import type { TritonicMusicalDiagnostics } from '../tritonic/tritonicDiagnostics';
import type { TritonicStateMachine } from '../tritonic/tritonicStateMachine';
import {
  buildTritonicMonitorSnapshot,
  type TritonicMonitorSnapshot,
} from '../tritonic/tritonicMonitorSnapshot';
import { buildTritonicDictionary } from '../tritonic/tritonicCell';
import {
  realiseTritonic,
  type TritonicRealisationMode,
} from '../tritonic/tritonicRealisation';
import { tritonicDiagnosticsReceiptFields } from '../tritonic/tritonicDiagnostics';
import { projectedStrandMidisFromCells } from '../tritonic/tritonicStrands';
import { scheduleTritonicTimeline } from '../tritonic/tritonicTimeline';

export const TRITONIC_MONITOR_SOURCE_ENGINE_IDS = new Set([
  'tritonic',
  'vault_tritonic',
  'wyble_tritonic',
]);

const TRITONIC_RECEIPT_KINDS = new Set([
  'tritonic_melody_complete',
  'tritonic_vault_realisation_complete',
  'wyble_tritonic_realisation_complete',
]);

export type TritonicMonitorView = {
  engineId: string;
  snapshot: TritonicMonitorSnapshot | null;
  hasReceipt: boolean;
};

function sourceEngineId(ctx: MusicContext): string {
  return String(ctx.provenance?.sourceEngineId ?? '').trim();
}

export function resolveTritonicMonitorEngineId(ctx: MusicContext): string {
  const id = sourceEngineId(ctx);
  if (id === 'vault_tritonic') return id;
  if (TRITONIC_MONITOR_SOURCE_ENGINE_IDS.has(id)) {
    if (
      id === 'tritonic' &&
      ctx.receipts.some((r) => r.kind === 'tritonic_vault_realisation_complete')
    ) {
      return 'vault_tritonic';
    }
    return id;
  }
  if (ctx.receipts.some((r) => TRITONIC_RECEIPT_KINDS.has(r.kind))) {
    if (ctx.receipts.some((r) => r.kind === 'tritonic_vault_realisation_complete')) {
      return 'vault_tritonic';
    }
    if (ctx.receipts.some((r) => r.kind === 'wyble_tritonic_realisation_complete')) {
      return 'wyble_tritonic';
    }
    return 'tritonic';
  }
  return id;
}

export function shouldShowTritonicMonitor(ctx: MusicContext | null | undefined): boolean {
  if (!ctx?.harmony?.bars?.length) return false;
  const resolved = resolveTritonicMonitorEngineId(ctx);
  return TRITONIC_MONITOR_SOURCE_ENGINE_IDS.has(resolved);
}

function parsePhraseState(raw: unknown): TritonicStateMachine | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as TritonicStateMachine;
  if (typeof o.resolutionEligibility !== 'number') return null;
  return o;
}

function parseDiagnostics(payload: Record<string, unknown>): TritonicMusicalDiagnostics | null {
  const dist = payload.rhythmicOffsetDistribution;
  if (
    typeof payload.unresolvedToneCount !== 'number' ||
    typeof payload.contourVariety !== 'number' ||
    typeof payload.cadenceStrength !== 'number' ||
    !dist ||
    typeof dist !== 'object'
  ) {
    return null;
  }
  const d = dist as { downbeat?: number; weak?: number; offbeat?: number };
  return {
    unresolvedToneCount: payload.unresolvedToneCount,
    contourVariety: payload.contourVariety,
    cadenceStrength: payload.cadenceStrength,
    rhythmicOffsetDistribution: {
      downbeat: d.downbeat ?? 0,
      weak: d.weak ?? 0,
      offbeat: d.offbeat ?? 0,
    },
  };
}

function findTritonicReceipt(ctx: MusicContext) {
  return ctx.receipts.find((r) => TRITONIC_RECEIPT_KINDS.has(r.kind));
}

/** Rebuild monitor snapshot from receipt + harmony when monitorSnapshot not stored (legacy). */
function synthesizeSnapshotFromMusicContext(ctx: MusicContext): TritonicMonitorSnapshot | null {
  const receipt = findTritonicReceipt(ctx);
  const payload = (receipt?.payload ?? {}) as Record<string, unknown>;
  const stored = payload.monitorSnapshot as TritonicMonitorSnapshot | undefined;
  if (stored?.columns?.length) return stored;

  const phraseState = parsePhraseState(payload.phraseState);
  const diagnostics = parseDiagnostics(payload);
  if (!phraseState || !diagnostics) return null;

  const anchorBars = ctx.harmony.bars.map((b) => normalizeChordSymbol(String(b ?? '')));
  const mode = String(payload.mode ?? 'ecm') as TritonicRealisationMode;
  const dict = buildTritonicDictionary();
  const result = realiseTritonic({
    mode,
    cells: dict.cells,
    behaviourOptions: { oddityScore: 0.35, delayedResolution: true, melodyPriority: false },
  });
  const cells = result.phrases.flat().slice(0, anchorBars.length);
  while (cells.length < anchorBars.length && cells.length > 0) {
    cells.push(cells[cells.length - 1]!);
  }
  const timeline = scheduleTritonicTimeline(cells, mode, { barCount: anchorBars.length });
  const strandMidis = projectedStrandMidisFromCells(cells);

  return buildTritonicMonitorSnapshot({
    timeline,
    cells,
    anchorBars,
    harmonyBars: anchorBars,
    phraseState,
    diagnostics,
    mode,
    phraseCount: mode === 'sq' ? 2 : 1,
  });
}

export function buildTritonicMonitorViewFromMusicContext(ctx: MusicContext): TritonicMonitorView {
  const engineId = resolveTritonicMonitorEngineId(ctx);
  const receipt = findTritonicReceipt(ctx);
  const payload = (receipt?.payload ?? {}) as Record<string, unknown>;
  const stored = payload.monitorSnapshot as TritonicMonitorSnapshot | undefined;
  const snapshot =
    stored?.columns?.length ? stored : synthesizeSnapshotFromMusicContext(ctx);

  return {
    engineId,
    snapshot,
    hasReceipt: !!receipt,
  };
}
