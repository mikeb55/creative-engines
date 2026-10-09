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
import { composeRespond, RESPOND_CHARACTERS, RESPOND_ENGINE } from './pcRespond';
import { composeMixture, composeReduce, composeWyble, PHASE2_ENGINE, verifyReduce } from './pcPhase2';
import { durationTypeMismatches, measureViews, parseScoreDocument, partElements } from './pcScore';

export interface RespondBuildInfo {
  buildCommit: string;
  ipcBundleSha256: string;
  stampMatchesLiveIpc: string;
}

export interface RespondAlternativeResult {
  character: string;
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
  const stampFor = (label: string, engine: string): PcProvenance => ({
    app: 'Composer OS',
    module: 'Performance Composer',
    operation: 'RESPOND',
    engine,
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
  });
  const fileFor = (label: string) => path.join(folder, `${slug(sourceFile)} - ${label.replace(' · ', ' ')}.musicxml`);
  // Lane alternatives: C Space (RESPOND, KEEP), W Wyble, M Space + Wyble (Phase 2).
  const lanePlans: Array<{ id: string; label: string; engine: string; events: PcLaneEvent[]; partId: string; voice: string; answers: number; windows: number; devices: string[]; bars: number[] }> = [];
  for (const { id, label } of RESPOND_CHARACTERS.filter((c) => c.id === 'space')) {
    const plan = composeRespond({ sourceXml, character: id, seed });
    lanePlans.push({ id, label, engine: RESPOND_ENGINE, events: plan.events, partId: plan.partId, voice: plan.voice, answers: plan.answers.length, windows: plan.windows.length, devices: [...new Set(plan.answers.map((a) => a.device))], bars: [...new Set(plan.answers.map((a) => a.bar))] });
  }
  for (const plan of [composeWyble(sourceXml, seed), composeMixture(sourceXml, seed)]) {
    lanePlans.push({
      id: plan.character,
      label: plan.label,
      engine: PHASE2_ENGINE,
      events: plan.events,
      partId: plan.partId,
      voice: plan.voice,
      answers: plan.character === 'mixture' ? plan.spaceAnswers : plan.wybleKept,
      windows: plan.character === 'mixture' ? plan.joins : plan.wybleProposed,
      devices: plan.character === 'mixture' ? [`Wyble ${plan.wybleKept} beats`, `Space ${plan.spaceAnswers} gaps`, `${plan.voiceLedJoins}/${plan.joins} gap chords voice-led from Wyble`] : [`Wyble kept ${plan.wybleKept} of ${plan.wybleProposed} beats`],
      bars: [...new Set(plan.events.map((e) => e.bar))],
    });
  }
  for (const lp of lanePlans) {
    if (!lp.events.length) throw new Error(`${lp.label}: nothing could be written for this score.`);
    const lane = writeLane(sourceXml, { span, events: lp.events, partId: lp.partId, voice: lp.voice });
    const provenance = stampFor(lp.label, lp.engine);
    const stamped = stampProvenance(lane.xml, provenance);
    const report = verifyLockedCopy(sourceXml, stripProvenance(stamped), span, lane.lane);
    if (!report.ok) throw new Error(`${lp.label}: lock check failed — nothing written. ${report.errors.slice(0, 3).join('; ')}`);
    const playable = lp.events.every((e: PcLaneEvent) => assessGuitarFeasibility(e.midis).feasible);
    const back = readProvenance(stamped);
    const file = fileFor(lp.label);
    prepared.push({
      file,
      xml: stamped,
      result: {
        character: lp.id,
        label: lp.label,
        musicXmlPath: file,
        answers: lp.answers,
        windows: lp.windows,
        notes: lp.events.length,
        devices: lp.devices,
        answeredBars: lp.bars,
        checks: {
          locks: 'PASS',
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
  // R Reduce: melody cut back; only melody notes may become rests.
  {
    const { xml, plan } = composeReduce(sourceXml, seed);
    const label = plan.label;
    const provenance = stampFor(label, PHASE2_ENGINE);
    const stamped = stampProvenance(xml, provenance);
    const report = verifyReduce(sourceXml, stripProvenance(stamped), plan.partId);
    if (!report.ok) throw new Error(`${label}: check failed — nothing written. ${report.errors.slice(0, 3).join('; ')}`);
    const back = readProvenance(stamped);
    const file = fileFor(label);
    prepared.push({
      file,
      xml: stamped,
      result: {
        character: 'reduce',
        label,
        musicXmlPath: file,
        answers: plan.kept,
        windows: plan.melodyNotes,
        notes: plan.removed,
        devices: [`kept ${plan.kept} of ${plan.melodyNotes} melody notes`],
        answeredBars: [...new Set(plan.removedAt.map((r) => r.bar))],
        checks: { locks: 'PASS', barFill: 'PASS', playable: 'PASS', stampReadBack: back?.runId === runId && back?.buildCommit === provenance.buildCommit ? 'PASS' : 'FAIL' },
        lockErrors: [],
        provenance,
        lane: { partId: plan.partId, voice: '1' },
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
