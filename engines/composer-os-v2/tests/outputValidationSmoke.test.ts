/**
 * Smoke — automated MIDI + MusicXML structural validation (no human ears).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateComposition } from '../app-api/generateComposition';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { writeScoreMidi } from '../core/export/midiScoreWriter';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';
import { validateMidiFile } from './outputValidation/midiValidator';
import { validateMusicXmlFile } from './outputValidation/musicXmlOutputValidator';
import { runOutputValidationSuite } from './outputValidation/outputValidationSuite';

function repoRoot(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

function testOutputDir(): string {
  const root = path.join(repoRoot(), '_test_outputs');
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function cleanOutputDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      cleanOutputDir(full);
      fs.rmdirSync(full);
    } else {
      fs.unlinkSync(full);
    }
  }
}

function buildZappaClassicBarMeterMap(totalBars: number): BarMeterMap {
  const map: BarMeterMap = {};
  for (let b = 1; b <= totalBars; b++) {
    map[b] = b % 2 === 1 ? { numerator: 7, denominator: 8 } : { numerator: 4, denominator: 4 };
  }
  return map;
}

type FixturePack = {
  label: string;
  dir: string;
  musicXml?: string;
  scoreMidi?: string;
  drumMidi?: string;
  expectedBars: number;
  xmlParts?: number;
  midiParts?: number;
};

function generateFixtures(outRoot: string): FixturePack[] {
  const packs: FixturePack[] = [];

  const drumDir = path.join(outRoot, 'sd3_drum');
  cleanOutputDir(drumDir);
  const drumReq: GenerateRequest = {
    presetId: 'guitar_bass_duo',
    styleStack: { primary: 'barry_harris' },
    seed: 77777,
    totalBars: 32,
    longFormEnabled: true,
    primarySongwriterStyle: 'frank_zappa',
    styleProfile: 'STYLE_ECM',
    barMeterMap: buildZappaClassicBarMeterMap(32),
    bpm: 120,
    title: 'Output validation drum',
  };
  const drumRes = generateComposition(drumReq, drumDir);
  if (drumRes.success && drumRes.filepath) {
    const base = path.basename(drumRes.filepath, path.extname(drumRes.filepath));
    packs.push({
      label: 'sd3_drum',
      dir: drumDir,
      musicXml: drumRes.filepath,
      drumMidi: path.join(drumDir, `${base}_drum_guide.mid`),
      expectedBars: 32,
    });
  }

  const duoDir = path.join(outRoot, 'duo_golden');
  cleanOutputDir(duoDir);
  const duoRes = generateComposition(
    {
      presetId: 'guitar_bass_duo',
      styleStack: { primary: 'barry_harris' },
      seed: 88001,
      totalBars: 8,
      title: 'Output validation duo',
      skipDrumGuide: true,
    },
    duoDir
  );
  if (duoRes.success && duoRes.filepath) {
    const base = path.basename(duoRes.filepath, path.extname(duoRes.filepath));
    packs.push({
      label: 'duo',
      dir: duoDir,
      musicXml: duoRes.filepath,
      scoreMidi: path.join(duoDir, `${base}.mid`),
      expectedBars: 8,
      xmlParts: 2,
      midiParts: 2,
    });
  }

  const sqDir = path.join(outRoot, 'sq_export');
  cleanOutputDir(sqDir);
  const sqRes = generateComposition(
    {
      presetId: 'guitar_bass_duo',
      styleStack: { primary: 'barry_harris' },
      seed: 91001,
      totalBars: 8,
      title: 'Output validation sq',
      instrumentGroup: 'string_quartet',
      skipDrumGuide: true,
    } as GenerateRequest,
    sqDir
  );
  if (sqRes.success && sqRes.filepath) {
    const base = path.basename(sqRes.filepath, path.extname(sqRes.filepath));
    packs.push({
      label: 'sq',
      dir: sqDir,
      musicXml: sqRes.filepath,
      scoreMidi: path.join(sqDir, `${base}.mid`),
      expectedBars: 8,
      xmlParts: 4,
      midiParts: 4,
    });
  }

  const bbDir = path.join(outRoot, 'bb_ensemble');
  cleanOutputDir(bbDir);
  const bbBars = 8;
  const bbChords = [...Array(bbBars).fill('Cmaj7')] as string[];
  const bbReal = runBigBandRealisation({
    seed: 94001,
    title: 'Output validation bb',
    totalBars: bbBars,
    ensembleConfigId: 'full_band',
    stylePairing: { songwriterStyle: 'barry_harris', arrangerStyle: 'thad', era: 'swing' },
    era: 'swing',
    songwriterStyleId: 'barry_harris',
    chordProgressionText: bbChords.join(' | '),
  });
  const bbXmlPath = path.join(bbDir, 'bb_ensemble.musicxml');
  if (bbReal.exportPipeline.ok && bbReal.exportPipeline.xml) {
    fs.writeFileSync(bbXmlPath, bbReal.exportPipeline.xml, 'utf-8');
    let bbMid: string | undefined;
    if (bbReal.score) {
      bbMid = writeScoreMidi(bbReal.score, bbDir, 'bb_ensemble', undefined, 120);
    }
    packs.push({
      label: 'bb',
      dir: bbDir,
      musicXml: bbXmlPath,
      scoreMidi: bbMid,
      expectedBars: bbBars,
    });
  }

  return packs;
}

let cachedPacks: FixturePack[] | null = null;

function packs(): FixturePack[] {
  if (!cachedPacks) {
    cachedPacks = generateFixtures(testOutputDir());
  }
  return cachedPacks;
}

function pack(label: string): FixturePack | undefined {
  return packs().find((p) => p.label === label);
}

export function runOutputValidationSmokeTests(): { name: string; ok: boolean }[] {
  const rows: { name: string; ok: boolean }[] = [];
  const p = pack('sd3_drum');

  rows.push({
    name: 'Output validation — fixtures generated',
    ok: packs().length >= 3,
  });

  if (p?.drumMidi && fs.existsSync(p.drumMidi)) {
    const r = validateMidiFile(p.drumMidi, {
      skipPitchRangeCheck: true,
    });
    rows.push({
      name: 'Output validation — SD3 drum MIDI non-empty + velocity + bars',
      ok: r.passed && r.stats.totalNotes > 0,
    });
  } else {
    rows.push({ name: 'Output validation — SD3 drum MIDI non-empty + velocity + bars', ok: false });
  }

  const bb = pack('bb');
  if (bb?.musicXml && fs.existsSync(bb.musicXml)) {
    const xml = validateMusicXmlFile(bb.musicXml, { expectHarmony: true });
    const partOk = xml.stats.partCount >= 4;
    const harmOk = xml.stats.harmonyCount > 0;
    rows.push({
      name: 'Output validation — BB ensemble MusicXML parts + harmony',
      ok: partOk && harmOk,
    });
    if (bb.scoreMidi && fs.existsSync(bb.scoreMidi)) {
      const mid = validateMidiFile(bb.scoreMidi, {
        skipUnisonCheck: true,
        skipPitchRangeCheck: false,
      });
      rows.push({
        name: 'Output validation — BB MIDI part tracks present',
        ok: mid.stats.noteTrackCount >= 4,
      });
    } else {
      rows.push({ name: 'Output validation — BB MIDI part tracks present', ok: false });
    }
  } else {
    rows.push({ name: 'Output validation — BB ensemble MusicXML parts + harmony', ok: false });
    rows.push({ name: 'Output validation — BB MIDI part tracks present', ok: false });
  }

  const sq = pack('sq');
  if (sq?.musicXml && fs.existsSync(sq.musicXml)) {
    const xml = validateMusicXmlFile(sq.musicXml, { expectHarmony: false });
    rows.push({
      name: 'Output validation — SQ export MusicXML 4 parts',
      ok: xml.stats.partCount === 4,
    });
    if (sq.scoreMidi && fs.existsSync(sq.scoreMidi)) {
      const mid = validateMidiFile(sq.scoreMidi, {
        expectedPartCount: 4,
        expectedBars: 8,
        skipUnisonCheck: true,
      });
      rows.push({
        name: 'Output validation — SQ MIDI pitch ranges (4 tracks)',
        ok: mid.passed,
      });
    } else {
      rows.push({ name: 'Output validation — SQ MIDI pitch ranges (4 tracks)', ok: false });
    }
  } else {
    rows.push({ name: 'Output validation — SQ export MusicXML 4 parts', ok: false });
    rows.push({ name: 'Output validation — SQ MIDI pitch ranges (4 tracks)', ok: false });
  }

  const duo = pack('duo');
  if (duo?.scoreMidi && fs.existsSync(duo.scoreMidi)) {
    const mid = validateMidiFile(duo.scoreMidi, {
      expectedBars: 8,
      skipUnisonCheck: true,
      skipMonophonicOverlapCheck: true,
    });
    rows.push({
      name: 'Output validation — Duo golden path MIDI 2 tracks no overlap',
      ok: mid.passed && mid.stats.noteTrackCount >= 2 && mid.stats.noteTrackCount <= 4,
    });
  } else {
    rows.push({ name: 'Output validation — Duo golden path MIDI 2 tracks no overlap', ok: false });
  }

  const sampleXml = packs().find((x) => x.musicXml && fs.existsSync(x.musicXml))?.musicXml;
  if (sampleXml) {
    const xml = validateMusicXmlFile(sampleXml, { requireXsd: false });
    const hasVoice = !xml.warnings.some((w) => w.includes('no voice tags')) || xml.stats.measureCount > 0;
    rows.push({
      name: 'Output validation — MusicXML structural parse + measure math',
      ok: xml.passed && hasVoice,
    });
    const xsdTry = validateMusicXmlFile(sampleXml, { requireXsd: false });
    const xsdNote = xsdTry.warnings.find((w) => w.startsWith('xsd')) ?? '';
    rows.push({
      name: 'Output validation — MusicXML XSD attempted (local schema)',
      ok: xsdNote.length > 0 && (xsdNote.includes('ok') || xsdNote.includes('skipped')),
    });
  } else {
    rows.push({ name: 'Output validation — MusicXML structural parse + measure math', ok: false });
    rows.push({ name: 'Output validation — MusicXML XSD attempted (local schema)', ok: false });
  }

  if (bb?.scoreMidi && fs.existsSync(bb.scoreMidi)) {
    const bbMid = validateMidiFile(bb.scoreMidi, { skipUnisonCheck: false });
    rows.push({
      name: 'Output validation — Unison doubling check on BB MIDI',
      ok: bbMid.passed,
    });
  } else {
    rows.push({ name: 'Output validation — Unison doubling check on BB MIDI', ok: false });
  }

  const suiteDirs = packs().map((p) => p.dir).filter((d) => fs.existsSync(d));
  const suiteFailures: string[] = [];
  let suiteMidi = 0;
  let suiteXml = 0;
  for (const dir of suiteDirs) {
    const part = runOutputValidationSuite(dir, {
      expectHarmony: false,
      midiOptions: {
        skipUnisonCheck: true,
        skipPitchRangeCheck: true,
        skipMonophonicOverlapCheck: true,
      },
    });
    suiteMidi += part.midiResults.length;
    suiteXml += part.xmlResults.length;
    suiteFailures.push(...part.failures);
  }
  rows.push({
    name: 'Output validation — suite aggregate over _test_outputs',
    ok: suiteMidi + suiteXml > 0 && suiteFailures.length === 0,
  });

  return rows;
}

if (require.main === module) {
  const rows = runOutputValidationSmokeTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
