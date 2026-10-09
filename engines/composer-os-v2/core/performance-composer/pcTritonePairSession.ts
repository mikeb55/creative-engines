/**
 * Performance Composer — one TRITONE PAIR run from one source score (app button and stamped CLI share this).
 * Writes the MusicXML and its one-page field map only after every lock and playability check passes.
 * The source file is read only.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readProvenance, stampProvenance, stripProvenance, provenanceLine, type PcProvenance } from './pcProvenance';
import { durationTypeMismatches, measureViews, parseScoreDocument, partElements } from './pcScore';
import { composeTritonePair, TRITONE_PAIR_ENGINE, TRITONE_PAIR_LABEL } from './pcTritonePair';
import { fieldMapMarkdown, tritonePairStats, verifyTritonePair, writeTritonePair, type TpStats } from './pcTritonePairWrite';
import type { RespondBuildInfo } from './pcRespondSession';

export interface TritonePairRunResult {
  ok: true;
  runId: string;
  clickedAt: string;
  piece: string;
  sourceFile: string;
  sourceSha256: string;
  seed: number;
  build: RespondBuildInfo;
  folder: string;
  musicXmlPath: string;
  fieldMapPath: string;
  fields: { home: string; mirror: string };
  sections: Array<{ bars: string; idea: string }>;
  checks: { bassLocked: 'PASS'; guitarFrameLocked: 'PASS'; barFill: 'PASS'; playable: 'PASS'; stampReadBack: 'PASS' | 'FAIL' };
  stats: TpStats;
  musicalAcceptance: 'NOT VERIFIED — your playing decides';
}

function stampTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** "01-Black-Aura-Duo-Leadsheet-V1.1.musicxml" → "Black Aura". */
export function pieceName(sourceFile: string): string {
  return (
    sourceFile
      .replace(/\.(musicxml|xml)$/i, '')
      .replace(/^\d+[-_ ]*/, '')
      .replace(/[-_ ]*Duo[-_ ]*Leadsheet.*$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim() || 'Score'
  );
}

export function runTritonePairSession(options: { sourcePath: string; outRoot: string; build: RespondBuildInfo; seed?: number; now?: Date }): TritonePairRunResult {
  const sourceXml = readFileSync(options.sourcePath, 'utf8');
  const sourceSha256 = createHash('sha256').update(sourceXml).digest('hex');
  const doc = parseScoreDocument(sourceXml);
  const parts = partElements(doc);
  if (parts.length < 2) throw new Error('Tritone Pair needs a guitar part and a bass part. Nothing was written.');
  const bad = durationTypeMismatches(doc);
  if (bad.checked && bad.mismatched / bad.checked >= 0.5) {
    const b = bad.examples[0]!;
    throw new Error(
      `This MusicXML's note lengths disagree with its note values (part ${b.part}, bar ${b.bar}: duration ${b.duration} written as ${b.type}). ` +
        'Re-export it from MuseScore or Sibelius and try again. Nothing was written.'
    );
  }
  const now = options.now ?? new Date();
  const seed = Number.isFinite(options.seed) ? Math.trunc(options.seed!) : now.getTime() % 2147483647;
  const sourceFile = path.basename(options.sourcePath);
  const piece = pieceName(sourceFile);
  const runId = `TRITONE-PAIR-${stampTime(now)}-${(options.build.buildCommit || 'nobuild').slice(0, 7)}-s${seed}`;
  const folder = path.join(options.outRoot, runId);
  if (existsSync(folder)) throw new Error(`Run folder already exists: ${folder}`);

  const plan = composeTritonePair(sourceXml, seed);
  const xml = writeTritonePair(sourceXml, plan);
  const bars = measureViews(parts[0]!).length;
  const provenance: PcProvenance = {
    app: 'Composer OS',
    module: 'Performance Composer',
    operation: 'TRITONE PAIR',
    engine: TRITONE_PAIR_ENGINE,
    alternative: `${piece} ${TRITONE_PAIR_LABEL}`,
    runId,
    clickedAt: now.toISOString(),
    buildCommit: options.build.buildCommit || 'not available',
    ipcBundleSha256: options.build.ipcBundleSha256 || 'not available',
    stampMatchesLiveIpc: options.build.stampMatchesLiveIpc || 'unknown',
    sourceFile,
    sourceSha256,
    bars: `1–${bars}`,
    seed,
  };
  const stamped = stampProvenance(xml, provenance);
  const report = verifyTritonePair(sourceXml, stripProvenance(stamped), plan);
  if (!report.ok) throw new Error(`${TRITONE_PAIR_LABEL}: lock check failed — nothing written. ${report.errors.slice(0, 3).join('; ')}`);
  if (!plan.fret.ok) throw new Error(`${TRITONE_PAIR_LABEL}: not playable — nothing written.`);
  const back = readProvenance(stamped);
  const line = provenanceLine(provenance);
  const map = fieldMapMarkdown(plan, { piece, stampLine: line, sourceFile, checks: report });

  mkdirSync(folder, { recursive: true });
  const musicXmlPath = path.join(folder, `${piece} ${TRITONE_PAIR_LABEL}.musicxml`);
  const fieldMapPath = path.join(folder, `${piece} ${TRITONE_PAIR_LABEL} - Field Map.md`);
  writeFileSync(musicXmlPath, stamped, 'utf8');
  writeFileSync(fieldMapPath, map, 'utf8');

  const sections: TritonePairRunResult['sections'] = [];
  for (const b of plan.bars) {
    const last = sections[sections.length - 1];
    const idea = b.role;
    if (last && last.idea === idea) last.bars = `${last.bars.split('–')[0]}–${b.bar}`;
    else sections.push({ bars: String(b.bar), idea });
  }
  const result: TritonePairRunResult = {
    ok: true,
    runId,
    clickedAt: now.toISOString(),
    piece,
    sourceFile,
    sourceSha256,
    seed,
    build: options.build,
    folder,
    musicXmlPath,
    fieldMapPath,
    fields: { home: `${plan.home.rootName} minor pentatonic (${plan.home.names.join(' ')})`, mirror: `${plan.mirror.rootName} minor pentatonic (${plan.mirror.names.join(' ')})` },
    sections,
    checks: {
      bassLocked: 'PASS',
      guitarFrameLocked: 'PASS',
      barFill: 'PASS',
      playable: 'PASS',
      stampReadBack: back?.runId === runId && back?.buildCommit === provenance.buildCommit ? 'PASS' : 'FAIL',
    },
    stats: tritonePairStats(plan),
    musicalAcceptance: 'NOT VERIFIED — your playing decides',
  };
  writeFileSync(path.join(folder, 'provenance.json'), JSON.stringify({ line, ...result }, null, 2), 'utf8');
  return result;
}
