/**
 * Performance Composer 1B — one RESPOND run: three alternatives from one source score.
 * Each alternative is lock-verified before it is stamped and written. A failed check writes nothing.
 * The source file is read only.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { writeLane, verifyLockedCopy, type PcLaneEvent } from './pcLane';
import { stampProvenance, stripProvenance, readProvenance, provenanceLine, type PcProvenance } from './pcProvenance';
import { composeRespond, RESPOND_CHARACTERS, RESPOND_ENGINE, type RespondCharacter } from './pcRespond';
import { durationTypeMismatches, measureViews, parseScoreDocument, partElements } from './pcScore';

export interface RespondBuildInfo {
  buildCommit: string;
  ipcBundleSha256: string;
  stampMatchesLiveIpc: string;
}

export interface RespondAlternativeResult {
  character: RespondCharacter;
  label: string;
  musicXmlPath: string;
  answers: number;
  windows: number;
  notes: number;
  devices: string[];
  answeredBars: number[];
  checks: { locks: 'PASS' | 'FAIL'; barFill: 'PASS' | 'FAIL'; playable: 'PASS' | 'FAIL'; stampReadBack: 'PASS' | 'FAIL' };
  lockErrors: string[];
  provenance: PcProvenance;
  lane: { partId: string; voice: string; regrid?: number; staff?: string };
}

export interface RespondRunResult {
  ok: true;
  runId: string;
  clickedAt: string;
  sourceFile: string;
  sourceSha256: string;
  bars: string;
  seed: number;
  build: RespondBuildInfo;
  folder: string;
  alternatives: RespondAlternativeResult[];
  musicalAcceptance: 'NOT VERIFIED — your audition decides';
}

function slug(s: string): string {
  return s.replace(/\.(musicxml|xml)$/i, '').replace(/[^A-Za-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'score';
}

function stampTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function runRespondSession(options: {
  sourcePath: string;
  outRoot: string;
  build: RespondBuildInfo;
  seed?: number;
  now?: Date;
}): RespondRunResult {
  const sourceXml = readFileSync(options.sourcePath, 'utf8');
  const sourceSha256 = createHash('sha256').update(sourceXml).digest('hex');
  const doc = parseScoreDocument(sourceXml);
  const parts = partElements(doc);
  if (!parts.length) throw new Error('This MusicXML has no parts.');
  // A file whose note lengths and note values disagree throughout has a wrong timing unit; refuse it.
  const bad = durationTypeMismatches(doc);
  if (bad.checked && bad.mismatched / bad.checked >= 0.5) {
    const b = bad.examples[0]!;
    throw new Error(
      `This MusicXML's note lengths disagree with its note values (part ${b.part}, bar ${b.bar}: duration ${b.duration} written as ${b.type}). ` +
        'Re-export it from MuseScore or Sibelius and try again. Nothing was written.'
    );
  }
  const barCount = measureViews(parts[0]!).length;
  const span = { from: 1, to: barCount };
  const now = options.now ?? new Date();
  const seed = options.seed ?? (now.getTime() % 2147483647);
  const runId = `RESPOND-${stampTime(now)}-${(options.build.buildCommit || 'nobuild').slice(0, 7)}`;
  const folder = path.join(options.outRoot, runId);
  if (existsSync(folder)) throw new Error(`Run folder already exists: ${folder}`);
  const sourceFile = path.basename(options.sourcePath);

  const prepared: Array<{ file: string; xml: string; result: RespondAlternativeResult }> = [];
  for (const { id, label } of RESPOND_CHARACTERS) {
    const plan = composeRespond({ sourceXml, character: id, seed });
    if (!plan.events.length) throw new Error(`${label}: no gap in this score could take an answer.`);
    const lane = writeLane(sourceXml, { span, events: plan.events, partId: plan.partId, voice: plan.voice });
    const provenance: PcProvenance = {
      app: 'Composer OS',
      module: 'Performance Composer',
      operation: 'RESPOND',
      engine: RESPOND_ENGINE,
      alternative: label,
      runId,
      clickedAt: now.toISOString(),
      buildCommit: options.build.buildCommit || 'not available',
      ipcBundleSha256: options.build.ipcBundleSha256 || 'not available',
      stampMatchesLiveIpc: options.build.stampMatchesLiveIpc || 'unknown',
      sourceFile,
      sourceSha256,
      bars: `1–${barCount}`,
      seed,
    };
    const stamped = stampProvenance(lane.xml, provenance);
    const report = verifyLockedCopy(sourceXml, stripProvenance(stamped), span, lane.lane);
    if (!report.ok) throw new Error(`${label}: lock check failed — nothing written. ${report.errors.slice(0, 3).join('; ')}`);
    const playable = plan.events.every((e: PcLaneEvent) => assessGuitarFeasibility(e.midis).feasible);
    const back = readProvenance(stamped);
    const file = path.join(folder, `${slug(sourceFile)} - RESPOND ${label.replace(' · ', ' ')}.musicxml`);
    prepared.push({
      file,
      xml: stamped,
      result: {
        character: id,
        label,
        musicXmlPath: file,
        answers: plan.answers.length,
        windows: plan.windows.length,
        notes: plan.events.length,
        devices: [...new Set(plan.answers.map((a) => a.device))],
        answeredBars: [...new Set(plan.answers.map((a) => a.bar))],
        checks: {
          locks: report.ok ? 'PASS' : 'FAIL',
          barFill: report.checks.laneBarFill ? 'PASS' : 'FAIL',
          playable: playable ? 'PASS' : 'FAIL',
          stampReadBack: back?.runId === runId && back?.buildCommit === provenance.buildCommit ? 'PASS' : 'FAIL',
        },
        lockErrors: report.errors,
        provenance,
        lane: lane.lane,
      },
    });
  }
  mkdirSync(folder, { recursive: true });
  for (const p of prepared) writeFileSync(p.file, p.xml, 'utf8');
  const result: RespondRunResult = {
    ok: true,
    runId,
    clickedAt: now.toISOString(),
    sourceFile,
    sourceSha256,
    bars: `1–${barCount}`,
    seed,
    build: options.build,
    folder,
    alternatives: prepared.map((p) => p.result),
    musicalAcceptance: 'NOT VERIFIED — your audition decides',
  };
  writeFileSync(path.join(folder, 'provenance.json'), JSON.stringify({ line: prepared.map((p) => provenanceLine(p.result.provenance)), ...result }, null, 2), 'utf8');
  return result;
}
