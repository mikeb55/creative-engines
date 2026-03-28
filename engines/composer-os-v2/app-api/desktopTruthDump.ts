/**
 * Desktop-only (COMPOSER_OS_DESKTOP_IPC + COMPOSER_OS_TRUTH_DUMP): per-generation JSON + main-process logs
 * for Song Mode harmony debugging — proves first divergence vs pasted progression.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GenerateRequest } from './appApiTypes';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { getChordForBar } from '../core/harmony/harmonyResolution';
import { extractHarmoniesFromFirstPartXml } from '../core/export/chordSymbolMusicXml';
import type { GoldenPathResult } from '../core/goldenPath/runGoldenPath';

export function isDesktopTruthDumpEnabled(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env?.COMPOSER_OS_DESKTOP_IPC === '1' &&
    process.env?.COMPOSER_OS_TRUTH_DUMP === '1'
  );
}

function collectScoreChordsByBarIndex(score: ScoreModel): Map<number, string> {
  const map = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.chord && !map.has(m.index)) {
        map.set(m.index, m.chord);
      }
    }
  }
  return map;
}

export interface SongModeTruthDumpParams {
  runId: string;
  songModeOutputDir: string;
  req: GenerateRequest;
  harmonyModeForRun: 'builtin' | 'custom' | 'custom_locked';
  rawCustomHarmony: string;
  lockedHarmonyBarsAuthoritative: string[] | undefined;
  gp: GoldenPathResult;
}

export function writeSongModeDesktopTruthDump(p: SongModeTruthDumpParams): {
  dumpDir: string;
  paths: { request: string; resolvedHarmonyBars: string; first4bars: string };
} {
  const dumpDir = path.join(p.songModeOutputDir, 'truth-dumps', p.runId);
  fs.mkdirSync(dumpDir, { recursive: true });

  const ctx = p.gp.context;
  const tb = ctx.form.totalBars;
  const locked = ctx.lockedHarmonyBarsRaw;
  const parsedBars = ctx.generationMetadata.parsedCustomProgressionBars;

  let ipcBody: unknown = undefined;
  try {
    const raw = process.env.COMPOSER_OS_IPC_GENERATE_BODY_JSON;
    if (raw) ipcBody = JSON.parse(raw) as unknown;
  } catch {
    ipcBody = { parseError: true };
  }

  const requestPayload = {
    runId: p.runId,
    ipcPayload: ipcBody,
    normalizedApiGenerateRequest: p.req,
  };
  const requestPath = path.join(dumpDir, 'request.json');
  fs.writeFileSync(requestPath, JSON.stringify(requestPayload, null, 2), 'utf-8');

  const resolvedHarmony = {
    runId: p.runId,
    harmonyModeForRun: p.harmonyModeForRun,
    totalBars: tb,
    longFormEnabled: p.req.longFormEnabled ?? true,
    lockedHarmonyBarsRaw: locked ?? null,
    parsedBarsSnapshot: parsedBars ?? null,
    generationMetadata: {
      harmonySource: ctx.generationMetadata.harmonySource,
      customHarmonyLocked: ctx.generationMetadata.customHarmonyLocked,
      chordProgressionInputRaw: ctx.generationMetadata.chordProgressionInputRaw,
      builtInHarmonyFallbackOccurred: ctx.generationMetadata.builtInHarmonyFallbackOccurred,
    },
  };
  const resolvedPath = path.join(dumpDir, 'resolved-harmony-bars.json');
  fs.writeFileSync(resolvedPath, JSON.stringify(resolvedHarmony, null, 2), 'utf-8');

  const scoreMap = p.gp.score ? collectScoreChordsByBarIndex(p.gp.score) : new Map();
  const xml = p.gp.xml ?? '';
  const xmlHarm = xml ? extractHarmoniesFromFirstPartXml(xml) : new Map<number, string>();

  const bars14 = [1, 2, 3, 4].map((bar) => ({
    bar,
    getChordForBar: getChordForBar(bar, ctx),
    scoreChord: scoreMap.get(bar) ?? null,
    musicXmlHarmony: xmlHarm.get(bar) ?? null,
  }));

  const first4 = {
    runId: p.runId,
    incomingUiHarmonyChars: p.rawCustomHarmony.length,
    incomingUiHarmonyPreview: p.rawCustomHarmony.slice(0, 200),
    harmonyModeForRun: p.harmonyModeForRun,
    totalBars: tb,
    longFormEnabled: p.req.longFormEnabled ?? true,
    lockedHarmonyBarsRawFirst4: locked?.slice(0, 4) ?? null,
    parsedBarsFirst4: parsedBars?.slice(0, 4) ?? null,
    bars1to4: bars14,
    goldenPathSuccess: p.gp.success,
  };
  const first4Path = path.join(dumpDir, 'first4bars.json');
  fs.writeFileSync(first4Path, JSON.stringify(first4, null, 2), 'utf-8');

  // Main-process console (Electron): compact line for quick grep
  console.log(
    `[composer-os truth-dump] ${p.runId} dir=${dumpDir} mode=${p.harmonyModeForRun} bars1-4:`,
    bars14.map((b) => `${b.bar}:${b.getChordForBar}`).join(' | ')
  );

  return {
    dumpDir,
    paths: { request: requestPath, resolvedHarmonyBars: resolvedPath, first4bars: first4Path },
  };
}

export function logSongModeTruthDumpConsole(params: SongModeTruthDumpParams): void {
  if (!isDesktopTruthDumpEnabled()) return;
  const ctx = params.gp.context;
  const tb = ctx.form.totalBars;
  const locked = ctx.lockedHarmonyBarsRaw;
  console.log('[composer-os truth] runSongStructure inputs', {
    runId: params.runId,
    uiHarmonyChars: params.rawCustomHarmony.length,
    harmonyModeForRun: params.harmonyModeForRun,
    totalBars: tb,
    longFormEnabled: params.req.longFormEnabled ?? true,
    lockedLen: locked?.length ?? 0,
    lockedFirst4: locked?.slice(0, 4),
    parsedFirst4: ctx.generationMetadata.parsedCustomProgressionBars?.slice(0, 4),
  });
  for (let b = 1; b <= 4; b++) {
    console.log(`[composer-os truth] getChordForBar(${b})`, getChordForBar(b, ctx));
  }
}
