/**
 * V87 Commit 2c — Bill Evans golden-master (FROZEN, seed 90301).
 * Byte-exact characterization of Bill Evans premium-melody rhythm + expression + pitch
 * on native lyrical benchmark BE_Benchmark_LyricalBallad.musicxml.
 * FROZEN — regenerate only in a commit whose stated purpose is changing Bill Evans output.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import type { ImportMelodyNote } from '../core/import/mosaicImportTimeline';
import type { Articulation, NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';
import type { PremiumMelodyDurationAccentKind } from '../core/premium-melody/enrichMelodyExpression';

export const BE_GOLDEN_SEED = 90301;
export const BE_GOLDEN_FIXTURE_NAME = 'BE_Benchmark_LyricalBallad.musicxml';
export const BE_GOLDEN_PROFILE = 'be_jazz_ballad_v1 (FROZEN 2c)';

const GOLDEN_DIR = path.join(__dirname, 'golden');
const JSON_FIXTURE = path.join(GOLDEN_DIR, 'be-lyrical-seed90301.golden.json');
const XML_FIXTURE = path.join(GOLDEN_DIR, 'be-lyrical-seed90301.golden.musicxml');

const BENCHMARK_FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'bill-evans',
  'test-fixtures',
  BE_GOLDEN_FIXTURE_NAME
);

export type BeGoldenMelodyEvent = {
  bar: number;
  onset: string;
  duration: string;
  pitch: number;
  articulation: Articulation | null;
  velocity: number | null;
  accent: PremiumMelodyDurationAccentKind;
};

export type BeGoldenJsonPayload = {
  seed: number;
  fixture: string;
  profile: string;
  noteCount: number;
  events: BeGoldenMelodyEvent[];
};

function beat4dp(value: number): string {
  return value.toFixed(4);
}

export function normalizeMusicXmlLf(xml: string): string {
  return xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function guitarVoice1ExpressiveFromScore(score: ScoreModel): ImportMelodyNote[] {
  const part = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!part) return [];
  const out: ImportMelodyNote[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if ((n.voice ?? 1) !== 1) continue;
      out.push({
        bar: m.index,
        onsetBeat: n.startBeat,
        durationBeats: n.duration,
        midiPitch: n.pitch,
        confidence: 1,
        fieldOrigin: 'explicit',
        ...(n.articulation ? { articulation: n.articulation } : {}),
        ...(n.velocity != null ? { velocity: n.velocity } : {}),
        ...(n.durationAccent ? { durationAccent: n.durationAccent } : {}),
      });
    }
  }
  return out.sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch);
}

function toGoldenEvent(note: ImportMelodyNote & { durationAccent?: PremiumMelodyDurationAccentKind }): BeGoldenMelodyEvent {
  return {
    bar: note.bar,
    onset: beat4dp(note.onsetBeat),
    duration: beat4dp(note.durationBeats),
    pitch: note.midiPitch,
    articulation: note.articulation ?? null,
    velocity: note.velocity ?? null,
    accent: note.durationAccent ?? 'none',
  };
}

export function buildBeGoldenJsonPayload(score: ScoreModel): BeGoldenJsonPayload {
  const notes = guitarVoice1ExpressiveFromScore(score);
  return {
    seed: BE_GOLDEN_SEED,
    fixture: BE_GOLDEN_FIXTURE_NAME,
    profile: BE_GOLDEN_PROFILE,
    noteCount: notes.length,
    events: notes.map(toGoldenEvent),
  };
}

export function serializeBeGoldenJson(payload: BeGoldenJsonPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function runBeGoldenPath(): { score: ScoreModel; xml: string } {
  if (!fs.existsSync(BENCHMARK_FIXTURE)) {
    throw new Error(`Bill Evans benchmark fixture missing: ${BENCHMARK_FIXTURE}`);
  }
  const ir = musicXmlToImportTimeline(fs.readFileSync(BENCHMARK_FIXTURE, 'utf8'));
  const locked = importTimelineToLockedHarmony(ir);
  const totalBars = Math.max(locked.length, ir.bars, 8);

  const gp = runGoldenPathOnce(BE_GOLDEN_SEED, {
    presetId: 'guitar_bass_duo',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: [...locked],
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    totalBars,
    importTimeline: ir,
    styleTransfer: true,
    targetComposer: 'bill_evans',
    styleTransferStrength: 1,
    preserveMelody: true,
    reorchestrate: false,
    suppressWybleVoiceLayoutForTest: true,
  });

  const generationOk =
    gp.score != null &&
    gp.score.parts.length > 0 &&
    (gp.xml?.length ?? 0) > 0 &&
    !gp.errors.some((e) => /DESKTOP SONG MODE HARMONY|authority check/i.test(e));

  if (!generationOk || !gp.xml || !gp.score) {
    throw new Error(`Bill Evans golden path failed: ${gp.errors[0] ?? 'no xml/score'}`);
  }

  return { score: gp.score, xml: normalizeMusicXmlLf(gp.xml) };
}

export function buildBeGoldenSnapshot(): { jsonText: string; xmlText: string } {
  const { score, xml } = runBeGoldenPath();
  return {
    jsonText: serializeBeGoldenJson(buildBeGoldenJsonPayload(score)),
    xmlText: xml.endsWith('\n') ? xml : `${xml}\n`,
  };
}

export function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function diffBeGoldenEvents(
  expected: BeGoldenMelodyEvent[],
  actual: BeGoldenMelodyEvent[]
): string[] {
  const lines: string[] = [];
  const maxLen = Math.max(expected.length, actual.length);
  for (let i = 0; i < maxLen; i++) {
    const exp = expected[i];
    const act = actual[i];
    if (!exp) {
      lines.push(`+ event[${i}]: ${JSON.stringify(act)}`);
      continue;
    }
    if (!act) {
      lines.push(`- event[${i}]: ${JSON.stringify(exp)}`);
      continue;
    }
    const keys: (keyof BeGoldenMelodyEvent)[] = [
      'bar', 'onset', 'duration', 'pitch', 'articulation', 'velocity', 'accent',
    ];
    for (const key of keys) {
      if (exp[key] !== act[key]) {
        lines.push(`event[${i}].${key}: expected=${JSON.stringify(exp[key])} actual=${JSON.stringify(act[key])}`);
      }
    }
  }
  return lines;
}

function firstByteDiffIndex(expected: string, actual: string): number | null {
  const len = Math.min(expected.length, actual.length);
  for (let i = 0; i < len; i++) {
    if (expected.charCodeAt(i) !== actual.charCodeAt(i)) return i;
  }
  if (expected.length !== actual.length) return len;
  return null;
}

export function writeBeGoldenFixtures(): void {
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  const { jsonText, xmlText } = buildBeGoldenSnapshot();
  fs.writeFileSync(JSON_FIXTURE, jsonText, 'utf8');
  fs.writeFileSync(XML_FIXTURE, xmlText, 'utf8');
  console.log(`Wrote ${JSON_FIXTURE} (${jsonText.length} bytes)`);
  console.log(`Wrote ${XML_FIXTURE} (${xmlText.length} bytes)`);
  console.log(`JSON sha256: ${sha256Hex(jsonText)}`);
  console.log(`XML sha256: ${sha256Hex(xmlText)}`);
}

export function runbeGoldenMasterTests(): { name: string; ok: boolean; detail?: string }[] {
  const results: { name: string; ok: boolean; detail?: string }[] = [];

  if (!fs.existsSync(JSON_FIXTURE) || !fs.existsSync(XML_FIXTURE)) {
    return [{
      name: 'beGoldenMaster - fixtures present',
      ok: false,
      detail: `missing ${!fs.existsSync(JSON_FIXTURE) ? JSON_FIXTURE : XML_FIXTURE}`,
    }];
  }

  let snapshot: { jsonText: string; xmlText: string };
  try {
    snapshot = buildBeGoldenSnapshot();
  } catch (e) {
    return [{
      name: 'beGoldenMaster - regenerate seed 90301',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    }];
  }

  const expectedJson = fs.readFileSync(JSON_FIXTURE, 'utf8');
  const expectedXml = fs.readFileSync(XML_FIXTURE, 'utf8');
  const jsonHash = sha256Hex(snapshot.jsonText);
  const xmlHash = sha256Hex(snapshot.xmlText);

  const jsonOk = snapshot.jsonText === expectedJson;
  if (jsonOk) {
    results.push({
      name: `beGoldenMaster - JSON byte-exact seed 90301 (sha256 ${jsonHash.slice(0, 12)}...)`,
      ok: true,
    });
  } else {
    let expectedPayload: BeGoldenJsonPayload;
    let actualPayload: BeGoldenJsonPayload;
    try {
      expectedPayload = JSON.parse(expectedJson) as BeGoldenJsonPayload;
      actualPayload = JSON.parse(snapshot.jsonText) as BeGoldenJsonPayload;
    } catch {
      expectedPayload = { seed: BE_GOLDEN_SEED, fixture: '', profile: '', noteCount: 0, events: [] };
      actualPayload = expectedPayload;
    }
    const eventDiff = diffBeGoldenEvents(expectedPayload.events ?? [], actualPayload.events ?? []);
    const preview = eventDiff.slice(0, 16).join('\n');
    results.push({
      name: `beGoldenMaster - JSON byte-exact seed 90301`,
      ok: false,
      detail: `sha256 expected=${sha256Hex(expectedJson).slice(0, 12)} actual=${jsonHash.slice(0, 12)}${
        eventDiff.length ? `\n${preview}${eventDiff.length > 16 ? `\n...+${eventDiff.length - 16} more` : ''}` : ''
      }`,
    });
  }

  const xmlOk = snapshot.xmlText === expectedXml;
  if (xmlOk) {
    results.push({
      name: `beGoldenMaster - MusicXML byte-exact seed 90301 (sha256 ${xmlHash.slice(0, 12)}...)`,
      ok: true,
    });
  } else {
    const idx = firstByteDiffIndex(expectedXml, snapshot.xmlText);
    const ctxStr =
      idx != null
        ? `\nfirst diff @ byte ${idx}\nexpected: ${JSON.stringify(expectedXml.slice(Math.max(0, idx - 40), idx + 40))}\nactual:   ${JSON.stringify(snapshot.xmlText.slice(Math.max(0, idx - 40), idx + 40))}`
        : '';
    results.push({
      name: `beGoldenMaster - MusicXML byte-exact seed 90301`,
      ok: false,
      detail: `sha256 expected=${sha256Hex(expectedXml).slice(0, 12)} actual=${xmlHash.slice(0, 12)}${ctxStr}`,
    });
  }

  return results;
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'write-fixtures') {
    writeBeGoldenFixtures();
    process.exit(0);
  }
  if (cmd === 'run') {
    const rows = runbeGoldenMasterTests();
    for (const row of rows) {
      console.log(`${row.ok ? 'PASS' : 'FAIL'}: ${row.name}${row.detail ? `\n  ${row.detail}` : ''}`);
    }
    process.exit(rows.every((r) => r.ok) ? 0 : 1);
  }
  console.error('Usage: npx tsx beGoldenMaster.test.ts write-fixtures | run');
  process.exit(1);
}
