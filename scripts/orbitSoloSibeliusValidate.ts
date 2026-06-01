/**
 * Pre-Sibelius validation for Orbit solo MusicXML exports.
 * Run: npx tsx --tsconfig tsconfig.json scripts/orbitSoloSibeliusValidate.ts [--fix]
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  hardenSoloMusicXmlForSibelius,
  countPitchElements,
} from '../engines/composer-os-v2/core/solo/soloSibeliusHardening';
import { validateMusicXmlHarmonyRoots } from '../engines/composer-os-v2/core/solo/soloMusicContextExport';

const OUT_DIR =
  process.env.ORBIT_SOLO_OUT_DIR ??
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-Solos';

const FILES = [
  'solo_01_tritonic.musicxml',
  'solo_02_vault_triad_pairs.musicxml',
  'solo_03_martino_linear.musicxml',
  'solo_04_zappa.musicxml',
];

const MIDI_MIN = 60;
const MIDI_MAX = 91;
const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pitchToMidi(step: string, alter: string | undefined, octave: number): number {
  return (octave + 1) * 12 + (STEP[step.toUpperCase()] ?? 0) + (alter ? parseInt(alter, 10) : 0);
}

function pitchMidisInXml(xml: string): number[] {
  const midis: number[] = [];
  for (const m of xml.matchAll(
    /<pitch><step>([A-G])<\/step>(?:<alter>(-?\d+)<\/alter>)?<octave>(\d+)<\/octave><\/pitch>/g,
  )) {
    midis.push(pitchToMidi(m[1]!, m[2], parseInt(m[3]!, 10)));
  }
  for (const m of xml.matchAll(/<note>([\s\S]*?)<\/note>/g)) {
    const b = m[1]!;
    if (/<rest/.test(b)) continue;
    const step = b.match(/<step>([A-G])<\/step>/)?.[1];
    const octaveStr = b.match(/<octave>(\d+)<\/octave>/)?.[1];
    if (!step || !octaveStr) continue;
    const alter = b.match(/<alter>(-?\d+)<\/alter>/)?.[1];
    midis.push(pitchToMidi(step, alter, parseInt(octaveStr, 10)));
  }
  return midis;
}

function parseMeasures(xml: string) {
  const part = xml.match(/<part id="[^"]+"[\s\S]*?<\/part>/)?.[0] ?? '';
  return [...part.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)].map((m) => ({
    number: parseInt(m[1]!, 10),
    body: m[2]!,
  }));
}

function barLengthDiv(body: string): number {
  const div = parseInt(body.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '480', 10);
  const beats = parseInt(body.match(/<beats>(\d+)<\/beats>/)?.[1] ?? '4', 10);
  const beatType = parseInt(body.match(/<beat-type>(\d+)<\/beat-type>/)?.[1] ?? '4', 10);
  return (div * beats * 4) / beatType;
}

function validateFile(filename: string, fix: boolean) {
  const filepath = path.join(OUT_DIR, filename);
  let xml = fs.readFileSync(filepath, 'utf-8');
  const notesBefore = countPitchElements(xml);
  const issues: { check: number; msg: string }[] = [];

  for (const m of xml.matchAll(/<root-step>([^<]*)<\/root-step>/g)) {
    const t = m[1]!.trim();
    if (t.length !== 1 || !'ABCDEFG'.includes(t.toUpperCase())) {
      issues.push({ check: 1, msg: `invalid root-step ${JSON.stringify(t)}` });
    }
  }
  for (const m of xml.matchAll(/<root-alter>(-?\d+)<\/root-alter>/g)) {
    const v = parseInt(m[1]!, 10);
    if (![-1, 0, 1].includes(v)) issues.push({ check: 1, msg: `invalid root-alter ${v}` });
  }
  for (const msg of validateMusicXmlHarmonyRoots(xml)) issues.push({ check: 1, msg });

  for (const midi of pitchMidisInXml(xml)) {
    if (midi < MIDI_MIN || midi > MIDI_MAX) {
      issues.push({ check: 2, msg: `MIDI ${midi} out of ${MIDI_MIN}–${MIDI_MAX}` });
    }
  }

  const measures = parseMeasures(xml);
  let silentRun = 0;
  let silentStart = 0;
  for (const meas of measures) {
    const barLen = barLengthDiv(meas.body);
    const notes = [...meas.body.matchAll(/<note>([\s\S]*?)<\/note>/g)].map((n) => n[1]!);
    const pitched = notes.filter((b) => !/<rest/.test(b) && /<pitch/.test(b));
    const isNc = /N\.?C\.?/i.test(meas.body);
    const wholeSilent = pitched.length === 0;
    if (wholeSilent && !isNc) {
      if (silentRun === 0) silentStart = meas.number;
      silentRun += 1;
    } else {
      if (silentRun > 2) {
        issues.push({ check: 3, msg: `${silentRun} consecutive silent bars from ${silentStart}` });
      }
      silentRun = 0;
    }

    let pos = 0;
    for (const b of notes) {
      const isChord = /<chord\/>/.test(b);
      const dur = parseInt(b.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0', 10);
      if (dur <= 0) issues.push({ check: 4, msg: `bar ${meas.number}: zero duration` });
      if (!isChord && dur > barLen + 1) {
        issues.push({ check: 4, msg: `bar ${meas.number}: single note duration ${dur} > ${barLen}` });
      }
      if (!isChord) {
        pos += dur;
        if (pos > barLen + 1) {
          issues.push({ check: 4, msg: `bar ${meas.number}: voice timeline ${pos} > ${barLen}` });
        }
      }
    }
  }
  if (silentRun > 2) {
    issues.push({ check: 3, msg: `${silentRun} consecutive silent bars from ${silentStart}` });
  }

  const fixes: string[] = [];
  if (fix && issues.length > 0) {
    const hardened = hardenSoloMusicXmlForSibelius(xml);
    xml = hardened.xml;
    if (hardened.pitchClamps > 0) fixes.push(`CHECK 2: clamped ${hardened.pitchClamps} pitch(es)`);
    if (hardened.harmonyFixes > 0) fixes.push(`CHECK 1: fixed ${hardened.harmonyFixes} harmony root(s)`);
    if (hardened.silenceFills > 0) fixes.push(`CHECK 3: filled ${hardened.silenceFills} silent bar(s)`);
    fs.writeFileSync(filepath, xml, 'utf-8');
  }

  const final = hardenSoloMusicXmlForSibelius(xml);
  const notesAfter = countPitchElements(final.xml);

  return {
    filename,
    notesBefore,
    notesAfter,
    issuesBefore: issues.length,
    issuesByCheck: {
      1: issues.filter((i) => i.check === 1).length,
      2: issues.filter((i) => i.check === 2).length,
      3: issues.filter((i) => i.check === 3).length,
      4: issues.filter((i) => i.check === 4).length,
    },
    fixes,
    exportIntegrityPassed: final.exportIntegrityPassed,
    exportIntegrityErrors: final.exportIntegrityErrors,
    sampleIssues: issues.slice(0, 5),
  };
}

const fix = process.argv.includes('--fix');
const results = FILES.map((f) => validateFile(f, fix));
console.log(JSON.stringify({ outDir: OUT_DIR, fix, results }, null, 2));
