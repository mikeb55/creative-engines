/**
 * Phase 4H — Seed 77241 release export (notation + metadata only).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { applySeed77241ReleaseExport, harmonySymbolForBar48 } from '../core/export/musicXmlRelease77241';
import { buildHarmonicContextSpellingMap } from '../core/export/musicXmlNoteFragment';
import { soundingLine } from '../core/orchestrate/orchestrate';
import { runGeneralPianoV1Tests } from './generalPianoV1.test';
import { runOrchestralVariedRepeat48Tests } from './orchestralVariedRepeat48.test';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, '.tmp-piano-24bar-original-test/Seed77241-48bar-varied-repeat.musicxml');
const RELEASE = path.join(ROOT, '.tmp-piano-24bar-original-test/Seed77241-48bar-release.musicxml');

const FP_PARTS = [
  'vn1', 'vn2', 'va', 'vc', 'db', 'fl1', 'ob1', 'cl1', 'cl2', 'bn1', 'bn2',
  'hn1', 'hn2', 'hn3', 'hn4', 'tp1', 'tbn1', 'tbn2', 'hp',
] as const;

function soundingFingerprint(xml: string): string {
  const bits: string[] = [];
  for (const partId of FP_PARTS) {
    for (const n of soundingLine(xml, partId)) {
      bits.push(`${partId}:${n.onset}:${n.duration}:${n.midi}`);
    }
  }
  return bits.sort().join('|');
}

function partMeasureCount(xml: string, partId: string): number {
  const m = xml.match(new RegExp(`<part id="${partId}">([\\s\\S]*?)(?=<part id=|</score-partwise>)`));
  if (!m) return 0;
  return (m[1]!.match(/<measure\b/g) ?? []).length;
}

export function runRelease4h77241Tests(): { name: string; ok: boolean; detail?: string }[] {
  const rows: { name: string; ok: boolean; detail?: string }[] = [];
  if (!fs.existsSync(SOURCE)) {
    rows.push({ name: 'source varied-repeat export present', ok: false, detail: SOURCE });
    return rows;
  }

  const sourceXml = fs.readFileSync(SOURCE, 'utf8');
  const sourceFp = soundingFingerprint(sourceXml);
  const released = applySeed77241ReleaseExport(sourceXml);
  fs.mkdirSync(path.dirname(RELEASE), { recursive: true });
  fs.writeFileSync(RELEASE, released, 'utf8');

  rows.push({ name: 'release file written', ok: fs.existsSync(RELEASE), detail: RELEASE });
  rows.push({
    name: 'sounding events unchanged',
    ok: soundingFingerprint(released) === sourceFp,
  });

  rows.push({
    name: '48 bars vn1',
    ok: partMeasureCount(released, 'vn1') === 48,
    detail: String(partMeasureCount(released, 'vn1')),
  });

  rows.push({
    name: 'work title',
    ok: released.includes('<work-title>Seed 77241</work-title>'),
  });
  rows.push({
    name: 'composer Mike Bryant',
    ok: released.includes('<creator type="composer">Mike Bryant</creator>'),
  });

  const tempoOk = /<per-minute>72<\/per-minute>/.test(released) && /tempo="72"/.test(released);
  rows.push({ name: 'tempo 72 preserved', ok: tempoOk });

  const rehearsalMarks = (released.match(/<rehearsal>[A-F]<\/rehearsal>/g) ?? []).length;
  rows.push({ name: 'six rehearsal marks', ok: rehearsalMarks === 6, detail: String(rehearsalMarks) });

  const finalBars = released.match(/<measure number="48">[\s\S]*?<\/measure>/g) ?? [];
  const barlineCount = finalBars.filter((m) => m.includes('light-heavy')).length;
  const partCount = (released.match(/<part id="/g) ?? []).length;
  rows.push({
    name: 'final light-heavy barline each part',
    ok: barlineCount === partCount && barlineCount > 0,
    detail: `${barlineCount}/${partCount}`,
  });

  const dbMap = buildHarmonicContextSpellingMap(harmonySymbolForBar48(13));
  rows.push({ name: 'Dbmaj7 bar13 spelling map', ok: dbMap[1] === 'Db' || dbMap[3] === 'F', detail: JSON.stringify(dbMap) });

  const ob13 = released.match(/<part id="ob1">[\s\S]*?<measure number="13">([\s\S]*?)<\/measure>/)?.[1] ?? '';
  rows.push({
    name: 'bar13 G#→Ab spelling',
    ok: ob13.includes('<step>A</step><alter>-1</alter>') && !ob13.includes('<step>G</step><alter>1</alter>'),
  });

  const transposeBlocks = released.match(/<transpose>[\s\S]*?<\/transpose>/g) ?? [];
  rows.push({
    name: 'transpose metadata present',
    ok: transposeBlocks.length >= 10,
    detail: String(transposeBlocks.length),
  });

  rows.push({
    name: 'part abbreviations',
    ok: released.includes('<part-abbreviation>Vln. I</part-abbreviation>') && released.includes('<part-abbreviation>Cl. 1</part-abbreviation>'),
  });

  rows.push({
    name: 'instrument-sound ids',
    ok: released.includes('instrument-sound>strings.violin</instrument-sound>'),
  });

  try {
    execSync(`xmllint --noout "${RELEASE}"`, { stdio: 'pipe' });
    rows.push({ name: 'xmllint well-formed', ok: true });
  } catch {
    rows.push({ name: 'xmllint well-formed', ok: false, detail: 'xmllint missing or invalid' });
  }

  return rows;
}

if (process.argv[1]?.includes('release4h77241.test')) {
  const suites: { name: string; ok: boolean; detail?: string }[] = [];
  suites.push(...runRelease4h77241Tests());
  suites.push(...runOrchestralVariedRepeat48Tests());
  suites.push(...runGeneralPianoV1Tests());

  for (const item of suites) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  const failed = suites.filter((i) => !i.ok);
  console.log(`${suites.length - failed.length}/${suites.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
