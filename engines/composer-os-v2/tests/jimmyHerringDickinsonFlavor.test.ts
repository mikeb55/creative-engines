/**
 * Jimmy Herring Dickinson flavor — opt-in gate + post-process transforms.
 */
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  applyJimmyHerringDickinsonFlavor,
  isDickinsonFlavorEnabled,
  RIFF_DICKINSON_FLAVOR_ENV,
} from '../core/riff-generator/jimmyHerringDickinsonFlavor';
import * as crypto from 'crypto';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import type { NoteEvent } from '../core/score-model/scoreModelTypes';

function buildJh(seed: number) {
  const style = 'metheny' as const;
  const profile = resolveRiffGeneratorProfile({
    vrbId: 'jimmy_herring',
    style,
    grid: 'sixteenth',
    density: 'dense',
  });
  return buildRiffScoreModel({
    seed,
    bars: 8,
    density: 'dense',
    style,
    grid: 'sixteenth',
    lineMode: 'single_line',
    bassEnabled: false,
    vrbId: 'jimmy_herring',
    chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
    bpm: 112,
    title: 'dickinson-unit',
    riffProfile: profile,
  });
}

function xmlSha(score: import('../core/score-model/scoreModelTypes').ScoreModel): string {
  const exp = exportScoreModelToMusicXml(score);
  if (!exp.success || !exp.xml) throw new Error('xml fail');
  return crypto.createHash('sha256').update(exp.xml, 'utf8').digest('hex');
}

function countMotif(score: import('../core/score-model/scoreModelTypes').ScoreModel, tag: string): number {
  let n = 0;
  const g = score.parts.find((p) => p.id === 'guitar');
  for (const m of g?.measures ?? []) {
    for (const e of m.events) {
      if (e.kind === 'note' && (e as NoteEvent).motifRef === tag) n++;
    }
  }
  return n;
}

export function runJimmyHerringDickinsonFlavorTests(): Array<{ ok: boolean; name: string }> {
  const rows: Array<{ ok: boolean; name: string }> = [];
  delete process.env[RIFF_DICKINSON_FLAVOR_ENV];

  rows.push({
    ok: isDickinsonFlavorEnabled({ vrbId: 'jimmy_herring' }) === false,
    name: 'Dickinson default OFF for JH',
  });
  rows.push({
    ok: isDickinsonFlavorEnabled({ vrbId: 'jimmy_herring', dickinsonFlavor: true }) === true,
    name: 'Dickinson param ON for JH',
  });
  rows.push({
    ok: isDickinsonFlavorEnabled({ vrbId: 'hendrix', dickinsonFlavor: true }) === false,
    name: 'Dickinson ignored for non-JH',
  });

  const off = buildJh(62);
  const offHash = xmlSha(off.score);
  const appliedOff = applyJimmyHerringDickinsonFlavor(off.score, {
    seed: 62,
    vrbId: 'jimmy_herring',
    dickinsonFlavor: false,
  });
  rows.push({
    ok: appliedOff === false && xmlSha(off.score) === offHash,
    name: 'flavor OFF is no-op (xml stable)',
  });

  const on = buildJh(62);
  const before = xmlSha(on.score);
  const applied = applyJimmyHerringDickinsonFlavor(on.score, {
    seed: 62,
    vrbId: 'jimmy_herring',
    dickinsonFlavor: true,
  });
  const after = xmlSha(on.score);
  const pickups = countMotif(on.score, 'dickinson_pickup');
  const ornaments = countMotif(on.score, 'dickinson_ornament');
  const fills = countMotif(on.score, 'dickinson_fill');
  rows.push({
    ok: applied === true && after !== before,
    name: 'flavor ON mutates JH xml',
  });
  rows.push({
    ok: pickups + ornaments + fills > 0,
    name: 'flavor ON emits dickinson motifRefs (pickup/ornament/fill)',
  });

  const other = buildJh(62);
  // rebuild as hendrix-shaped call: apply with hendrix id must no-op
  const hBuilt = buildRiffScoreModel({
    seed: 62,
    bars: 8,
    density: 'dense',
    style: 'metheny',
    grid: 'sixteenth',
    lineMode: 'single_line',
    bassEnabled: false,
    vrbId: 'hendrix',
    chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
    bpm: 112,
    title: 'hendrix-ctrl',
    riffProfile: resolveRiffGeneratorProfile({
      vrbId: 'hendrix',
      style: 'metheny',
      grid: 'sixteenth',
      density: 'dense',
    }),
  });
  const hBefore = xmlSha(hBuilt.score);
  const hApplied = applyJimmyHerringDickinsonFlavor(hBuilt.score, {
    seed: 62,
    vrbId: 'hendrix',
    dickinsonFlavor: true,
  });
  rows.push({
    ok: hApplied === false && xmlSha(hBuilt.score) === hBefore,
    name: 'flavor ON does not touch hendrix',
  });

  void other;
  return rows;
}

if (typeof require !== 'undefined' && require.main === module) {
  const rows = runJimmyHerringDickinsonFlavorTests();
  for (const r of rows) console.log(r.ok ? 'PASS' : 'FAIL', r.name);
  process.exit(rows.some((r) => !r.ok) ? 1 : 0);
}